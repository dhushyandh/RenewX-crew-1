import { Response, NextFunction } from 'express';
import { OrderModel } from '../models/Order';
import { ProductModel } from '../models/Product';
import { User } from '../models/User';
import { TradeInPickupModel } from '../models/TradeIn';
import { AuthenticatedRequest } from '../middleware/auth';

export async function getAdminRealtimeAnalytics(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: { message: 'Admin authorization required', code: 'FORBIDDEN' },
      });
      return;
    }

    const period = (req.query.period as string) || 'month'; // 'today' | 'week' | 'month' | 'year' | 'all'

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    let periodStart: Date | null = null;
    if (period === 'today') periodStart = startOfToday;
    else if (period === 'week') periodStart = startOfWeek;
    else if (period === 'month') periodStart = startOfMonth;
    else if (period === 'year') periodStart = startOfYear;

    // Fetch live datasets in parallel for high throughput
    const [allOrders, allProducts, allUsers, allTradeIns] = await Promise.all([
      OrderModel.find().sort({ created_at: -1 }).lean().exec(),
      ProductModel.find().lean().exec(),
      User.find({ role: { $ne: 'admin' } }).select('id email full_name created_at status').lean().exec(),
      TradeInPickupModel ? TradeInPickupModel.find().sort({ created_at: -1 }).lean().exec().catch(() => []) : [],
    ]);

    // Filter orders by period if requested
    const filteredOrders = periodStart
      ? allOrders.filter((o: any) => new Date(o.created_at || 0) >= periodStart!)
      : allOrders;

    // Financial calculations
    const isRevenueOrder = (o: any) =>
      o.status !== 'cancelled' &&
      o.status !== 'failed' &&
      o.payment_status !== 'failed' &&
      o.payment_status !== 'refunded';

    const totalRevenue = filteredOrders
      .filter(isRevenueOrder)
      .reduce((sum: number, o: any) => sum + (Number(o.subtotal || o.total_amount) || 0), 0);

    const allTimeRevenue = allOrders
      .filter(isRevenueOrder)
      .reduce((sum: number, o: any) => sum + (Number(o.subtotal || o.total_amount) || 0), 0);

    const todayOrders = allOrders.filter(
      (o: any) => new Date(o.created_at || 0) >= startOfToday && isRevenueOrder(o)
    );
    const todayRevenue = todayOrders.reduce((sum: number, o: any) => sum + (Number(o.subtotal || o.total_amount) || 0), 0);

    const weekOrders = allOrders.filter(
      (o: any) => new Date(o.created_at || 0) >= startOfWeek && isRevenueOrder(o)
    );
    const weekRevenue = weekOrders.reduce((sum: number, o: any) => sum + (Number(o.subtotal || o.total_amount) || 0), 0);

    const monthOrders = allOrders.filter(
      (o: any) => new Date(o.created_at || 0) >= startOfMonth && isRevenueOrder(o)
    );
    const monthRevenue = monthOrders.reduce((sum: number, o: any) => sum + (Number(o.subtotal || o.total_amount) || 0), 0);

    const totalOrdersCount = filteredOrders.length;
    const avgOrderValue = totalOrdersCount > 0 ? Math.round(totalRevenue / totalOrdersCount) : 0;

    // Order status breakdown
    const orderStatuses: Record<string, number> = {
      pending: 0,
      verified: 0,
      processing: 0,
      shipped: 0,
      out_for_delivery: 0,
      delivered: 0,
      cancelled: 0,
    };
    filteredOrders.forEach((o: any) => {
      const s = o.status || 'pending';
      if (orderStatuses[s] !== undefined) {
        orderStatuses[s]++;
      } else {
        orderStatuses[s] = 1;
      }
    });

    // Payment statuses
    const paymentStatuses: Record<string, number> = {
      paid: 0,
      pending: 0,
      failed: 0,
      refunded: 0,
    };
    filteredOrders.forEach((o: any) => {
      const ps = o.payment_status || 'pending';
      if (paymentStatuses[ps] !== undefined) {
        paymentStatuses[ps]++;
      } else {
        paymentStatuses[ps] = 1;
      }
    });

    // Category distribution from real product catalog & sales
    const categoryCounts: Record<string, { count: number; stock: number; inventoryValue: number; sales: number }> = {};
    allProducts.forEach((p: any) => {
      const cat = p.category || 'Other';
      if (!categoryCounts[cat]) {
        categoryCounts[cat] = { count: 0, stock: 0, inventoryValue: 0, sales: 0 };
      }
      categoryCounts[cat].count++;
      categoryCounts[cat].stock += Number(p.stock || 0);
      categoryCounts[cat].inventoryValue += (Number(p.price) || 0) * (Number(p.stock) || 1);
    });

    // Category sales from real order items
    filteredOrders.forEach((o: any) => {
      if (isRevenueOrder(o) && Array.isArray(o.order_items)) {
        o.order_items.forEach((item: any) => {
          const matchedProd = allProducts.find((p: any) => String(p.id || p._id) === String(item.product_id));
          const cat = matchedProd?.category || 'Smartphones';
          if (!categoryCounts[cat]) {
            categoryCounts[cat] = { count: 0, stock: 0, inventoryValue: 0, sales: 0 };
          }
          categoryCounts[cat].sales += (Number(item.price) || 0) * (Number(item.quantity) || 1);
        });
      }
    });

    const totalCatalogItems = allProducts.length;
    const categoryBreakdown = Object.entries(categoryCounts).map(([category, data]) => {
      const pct = totalCatalogItems > 0 ? Math.round((data.count / totalCatalogItems) * 100) : 0;
      return {
        category,
        count: data.count,
        stock: data.stock,
        inventoryValue: data.inventoryValue,
        sales: data.sales,
        percentage: pct,
      };
    }).sort((a, b) => b.count - a.count);

    // Inventory Health
    const outOfStockCount = allProducts.filter((p: any) => (p.stock || 0) <= 0).length;
    const lowStockCount = allProducts.filter((p: any) => (p.stock || 0) > 0 && (p.stock || 0) <= 3).length;
    const inStockCount = allProducts.filter((p: any) => (p.stock || 0) > 3).length;
    const totalInventoryValue = allProducts.reduce((sum: number, p: any) => sum + (Number(p.price) || 0) * (Number(p.stock) || 0), 0);

    // Trade-In Buyback Stats
    const tradeIns = (allTradeIns as any[]) || [];
    const tradeInPending = tradeIns.filter((t) => t.status === 'requested' || t.status === 'scheduled').length;
    const tradeInInspected = tradeIns.filter((t) => t.status === 'inspected' || t.status === 'completed').length;
    const tradeInTotalPayouts = tradeIns
      .filter((t) => t.status === 'completed')
      .reduce((sum: number, t: any) => sum + (Number(t.approved_amount || t.offered_amount) || 0), 0);

    // Dynamic sales trend based on requested period (real-time data analytics)
    const salesTrend: { date: string; label: string; revenue: number; orders: number }[] = [];
    let previousPeriodRevenue = 0;
    const normPeriod = (period || '7d').toLowerCase();

    if (normPeriod === 'today') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      for (let b = 0; b < 8; b++) {
        const bStart = new Date(startOfDay.getTime() + b * 3 * 3600 * 1000);
        const bEnd = new Date(startOfDay.getTime() + (b + 1) * 3 * 3600 * 1000 - 1);
        const hour = b * 3;
        const hourLabel = hour === 0 ? '12 AM' : hour === 12 ? '12 PM' : hour < 12 ? `${hour} AM` : `${hour - 12} PM`;

        const bOrders = allOrders.filter((o: any) => {
          const oDate = new Date(o.created_at || o.createdAt || 0);
          return oDate >= bStart && oDate <= bEnd;
        });
        const bRev = bOrders
          .filter(isRevenueOrder)
          .reduce((sum: number, o: any) => sum + (Number(o.subtotal || o.total_amount || o.total) || 0), 0);

        salesTrend.push({
          date: bStart.toISOString(),
          label: hourLabel,
          revenue: bRev,
          orders: bOrders.length,
        });
      }

      const startOfYesterday = new Date(startOfDay.getTime() - 24 * 3600 * 1000);
      const endOfYesterday = new Date(startOfDay.getTime() - 1);
      previousPeriodRevenue = allOrders
        .filter((o: any) => {
          const d = new Date(o.created_at || o.createdAt || 0);
          return d >= startOfYesterday && d <= endOfYesterday && isRevenueOrder(o);
        })
        .reduce((sum: number, o: any) => sum + (Number(o.subtotal || o.total_amount || o.total) || 0), 0);

    } else if (normPeriod === '30d' || normPeriod === 'month') {
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
        const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

        const dayOrders = allOrders.filter((o: any) => {
          const oDate = new Date(o.created_at || o.createdAt || 0);
          return oDate >= dayStart && oDate <= dayEnd;
        });
        const dayRev = dayOrders
          .filter(isRevenueOrder)
          .reduce((sum: number, o: any) => sum + (Number(o.subtotal || o.total_amount || o.total) || 0), 0);

        salesTrend.push({
          date: dayStart.toISOString().split('T')[0],
          label: `${d.getDate()} ${d.toLocaleDateString('en-IN', { month: 'short' })}`,
          revenue: dayRev,
          orders: dayOrders.length,
        });
      }

      const p30Start = new Date(now.getTime() - 60 * 24 * 3600 * 1000);
      const p30End = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
      previousPeriodRevenue = allOrders
        .filter((o: any) => {
          const d = new Date(o.created_at || o.createdAt || 0);
          return d >= p30Start && d <= p30End && isRevenueOrder(o);
        })
        .reduce((sum: number, o: any) => sum + (Number(o.subtotal || o.total_amount || o.total) || 0), 0);

    } else if (normPeriod === 'year') {
      for (let m = 11; m >= 0; m--) {
        const mStart = new Date(now.getFullYear(), now.getMonth() - m, 1, 0, 0, 0, 0);
        const mEnd = new Date(now.getFullYear(), now.getMonth() - m + 1, 0, 23, 59, 59, 999);

        const mOrders = allOrders.filter((o: any) => {
          const oDate = new Date(o.created_at || o.createdAt || 0);
          return oDate >= mStart && oDate <= mEnd;
        });
        const mRev = mOrders
          .filter(isRevenueOrder)
          .reduce((sum: number, o: any) => sum + (Number(o.subtotal || o.total_amount || o.total) || 0), 0);

        salesTrend.push({
          date: mStart.toISOString().slice(0, 7),
          label: mStart.toLocaleDateString('en-IN', { month: 'short' }),
          revenue: mRev,
          orders: mOrders.length,
        });
      }

      const pYearStart = new Date(now.getFullYear() - 1, 0, 1);
      const pYearEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      previousPeriodRevenue = allOrders
        .filter((o: any) => {
          const d = new Date(o.created_at || o.createdAt || 0);
          return d >= pYearStart && d <= pYearEnd && isRevenueOrder(o);
        })
        .reduce((sum: number, o: any) => sum + (Number(o.subtotal || o.total_amount || o.total) || 0), 0);

    } else {
      // Default: Last 7 days
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
        const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

        const dayOrders = allOrders.filter((o: any) => {
          const oDate = new Date(o.created_at || o.createdAt || 0);
          return oDate >= dayStart && oDate <= dayEnd;
        });
        const dayRev = dayOrders
          .filter(isRevenueOrder)
          .reduce((sum: number, o: any) => sum + (Number(o.subtotal || o.total_amount || o.total) || 0), 0);

        salesTrend.push({
          date: dayStart.toISOString().split('T')[0],
          label: `${d.toLocaleDateString('en-IN', { weekday: 'short' })} ${d.getDate()}`,
          revenue: dayRev,
          orders: dayOrders.length,
        });
      }

      const p7Start = new Date(now.getTime() - 14 * 24 * 3600 * 1000);
      const p7End = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
      previousPeriodRevenue = allOrders
        .filter((o: any) => {
          const d = new Date(o.created_at || o.createdAt || 0);
          return d >= p7Start && d <= p7End && isRevenueOrder(o);
        })
        .reduce((sum: number, o: any) => sum + (Number(o.subtotal || o.total_amount || o.total) || 0), 0);
    }

    const currentPeriodRevenue = salesTrend.reduce((sum, item) => sum + item.revenue, 0);
    const currentPeriodOrders = salesTrend.reduce((sum, item) => sum + item.orders, 0);
    const growthPercentage =
      previousPeriodRevenue > 0
        ? Math.round(((currentPeriodRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 1000) / 10
        : currentPeriodRevenue > 0
        ? 100
        : 0;

    let peakPoint = salesTrend[0] || { date: '', label: '', revenue: 0, orders: 0 };
    salesTrend.forEach((pt) => {
      if (pt.revenue > peakPoint.revenue) {
        peakPoint = pt;
      }
    });

    // Recent 6 transactions
    const recentTransactions = allOrders.slice(0, 6).map((o: any) => ({
      id: o.id || o._id,
      customerName: o.customer_info?.name || 'Customer',
      customerPhone: o.customer_info?.phone || '',
      amount: o.subtotal || o.total_amount || 0,
      status: o.status,
      paymentStatus: o.payment_status,
      paymentMethod: o.payment_method || 'Online',
      itemsCount: Array.isArray(o.order_items) ? o.order_items.length : 1,
      createdAt: o.created_at || new Date().toISOString(),
    }));

    res.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        period,
        kpis: {
          totalRevenue,
          allTimeRevenue,
          totalOrders: totalOrdersCount,
          allTimeOrders: allOrders.length,
          totalCustomers: allUsers.length,
          avgOrderValue,
          today: { revenue: todayRevenue, orders: todayOrders.length },
          thisWeek: { revenue: weekRevenue, orders: weekOrders.length },
          thisMonth: { revenue: monthRevenue, orders: monthOrders.length },
        },
        orderStatuses,
        paymentStatuses,
        categoryBreakdown,
        inventoryHealth: {
          totalProducts: totalCatalogItems,
          inStock: inStockCount,
          lowStock: lowStockCount,
          outOfStock: outOfStockCount,
          totalInventoryValue,
        },
        tradeInStats: {
          totalRequests: tradeIns.length,
          pending: tradeInPending,
          inspected: tradeInInspected,
          totalPayouts: tradeInTotalPayouts,
        },
        salesTrend,
        periodSummary: {
          period,
          currentRevenue: currentPeriodRevenue,
          previousRevenue: previousPeriodRevenue,
          growthPercentage,
          totalOrders: currentPeriodOrders,
          avgOrderValue: currentPeriodOrders > 0 ? Math.round(currentPeriodRevenue / currentPeriodOrders) : 0,
          peak: peakPoint,
        },
        recentTransactions,
      },
    });
  } catch (error) {
    next(error);
  }
}
