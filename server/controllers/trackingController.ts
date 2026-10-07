import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { OrderModel } from '../models/Order';
import { TradeInModel } from '../models/TradeIn';
import { ProductModel } from '../models/Product';

export interface FormattedUniversalOrder {
  id: string;
  display_id: string;
  type: 'order';
  status: string;
  status_label: string;
  status_color: string;
  status_bg: string;
  customer: {
    name: string;
    phone: string;
    email?: string;
    address: string;
    pincode: string;
    full_address: string;
  };
  time: {
    placed_at: string;
    formatted_date: string;
    formatted_time: string;
    estimated_delivery: string;
  };
  items: Array<{
    product_id?: string;
    product_name: string;
    quantity: number;
    price: number;
    specs?: string;
    image_url?: string;
  }>;
  financial: {
    subtotal: number;
    savings: number;
    total: number;
    currency: string;
    payment_method: string;
    payment_status: string;
  };
  logistics: {
    courier?: string;
    courier_phone?: string;
    tracking_number?: string;
    estimated_delivery?: string;
  };
  raw_order: any;
}

export interface FormattedUniversalSell {
  id: string;
  display_id: string;
  type: 'sell_request';
  status: string;
  status_label: string;
  status_color: string;
  status_bg: string;
  customer: {
    name: string;
    phone: string;
    email?: string;
    address: string;
    pincode: string;
    full_address: string;
  };
  time: {
    created_at: string;
    formatted_date: string;
    formatted_time: string;
    updated_at: string;
  };
  device: {
    category: string;
    brand: string;
    model: string;
    storage: string;
    condition: any;
    photos: string[];
  };
  valuation: {
    valuation_amount: number;
    approved_amount?: number;
    expected_price?: number;
    admin_note?: string;
  };
  logistics: {
    executive_name?: string;
    executive_phone?: string;
    address: string;
    pincode: string;
  };
  raw_trade_in: any;
}

function cleanIdQuery(rawQuery: string): { original: string; clean: string; prefixHint: 'order' | 'sell' | 'unknown' } {
  const original = String(rawQuery || '').trim();
  let clean = original.replace(/^[#]/, '').trim();

  let prefixHint: 'order' | 'sell' | 'unknown' = 'unknown';

  if (/^(ORD|ORDER|RX)-/i.test(clean)) {
    prefixHint = 'order';
    clean = clean.replace(/^(ORD|ORDER|RX)-/i, '').trim();
  } else if (/^(SELL|SR|REQ|TRADE)-/i.test(clean)) {
    prefixHint = 'sell';
    clean = clean.replace(/^(SELL|SR|REQ|TRADE)-/i, '').trim();
  }

  return { original, clean, prefixHint };
}

async function formatOrderResult(o: any): Promise<FormattedUniversalOrder> {
  const id = String(o._id || o.id);
  const cleanId = id.replace(/[^a-zA-Z0-9]/g, '');
  const display_id = cleanId.length > 8 ? `#ORDER-${cleanId.slice(-6).toUpperCase()}` : `#${cleanId.toUpperCase()}`;

  const rawStatus = String(o.status || 'processing').toLowerCase();
  let status_label = 'Processing';
  let status_color = '#D97706';
  let status_bg = '#FEF3C7';

  if (rawStatus === 'shipped') {
    status_label = 'In Transit';
    status_color = '#2563EB';
    status_bg = '#EFF6FF';
  } else if (rawStatus === 'out_for_delivery') {
    status_label = 'Out for Delivery';
    status_color = '#7C3AED';
    status_bg = '#F5F3FF';
  } else if (rawStatus === 'delivered') {
    status_label = 'Delivered';
    status_color = '#059669';
    status_bg = '#ECFDF5';
  } else if (rawStatus === 'cancelled') {
    status_label = 'Cancelled';
    status_color = '#DC2626';
    status_bg = '#FEE2E2';
  }

  const createdDate = o.created_at ? new Date(o.created_at) : new Date();
  const formatted_date = createdDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const formatted_time = createdDate.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const estDate = o.estimated_delivery
    ? new Date(o.estimated_delivery)
    : new Date(createdDate.getTime() + 4 * 24 * 60 * 60 * 1000);
  const estimated_delivery = `${estDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })}, by 6:00 PM`;

  const cust = o.customer_info || {};
  const full_address = [cust.address, cust.pincode].filter(Boolean).join(', ');

  const rawItems = o.order_items || o.items || [];
  const productIds = rawItems.map((it: any) => it.product_id).filter(Boolean);
  const productMap = new Map<string, any>();
  if (productIds.length > 0) {
    try {
      const prods = await ProductModel.find({ _id: { $in: productIds } }).select('image images name specs').lean();
      for (const p of prods) {
        productMap.set(String(p._id), p);
      }
    } catch {
      // safe fallback
    }
  }

  const items = rawItems.map((it: any) => {
    const prod = it.product_id ? productMap.get(String(it.product_id)) : null;
    const resolvedImage = it.image_url || it.image || prod?.image || (Array.isArray(prod?.images) ? prod.images[0] : '') || '';
    return {
      product_id: it.product_id ? String(it.product_id) : undefined,
      product_name: it.product_name || it.name || prod?.name || 'Certified Device',
      quantity: Number(it.quantity || 1),
      price: Number(it.price || 0),
      specs: it.specs || it.condition || prod?.specs || 'Tested & Certified',
      image_url: resolvedImage,
    };
  });

  return {
    id,
    display_id,
    type: 'order',
    status: rawStatus,
    status_label,
    status_color,
    status_bg,
    customer: {
      name: cust.name || 'RenewX Customer',
      phone: cust.phone || '',
      email: cust.email || '',
      address: cust.address || '',
      pincode: cust.pincode || '',
      full_address,
    },
    time: {
      placed_at: createdDate.toISOString(),
      formatted_date,
      formatted_time,
      estimated_delivery,
    },
    items,
    financial: {
      subtotal: Number(o.subtotal || o.total_amount || 0),
      savings: Number(o.savings || 0),
      total: Number(o.subtotal || o.total_amount || 0),
      currency: 'INR',
      payment_method: o.payment_method ? o.payment_method.toUpperCase() : 'ONLINE / COD',
      payment_status: o.payment_status || 'paid',
    },
    logistics: {
      courier: o.courier || (rawStatus === 'shipped' || rawStatus === 'out_for_delivery' || rawStatus === 'delivered' ? 'BlueDart Express' : undefined),
      courier_phone: o.courier_phone || (o.courier ? '+91 1800 209 1234' : undefined),
      tracking_number: o.tracking_number || (rawStatus === 'shipped' || rawStatus === 'out_for_delivery' || rawStatus === 'delivered' ? `BD-${cleanId.slice(-6).toUpperCase()}` : undefined),
      estimated_delivery,
    },
    raw_order: o,
  };
}

function formatSellResult(sr: any): FormattedUniversalSell {
  const id = String(sr._id || sr.id);
  const cleanId = id.replace(/[^a-zA-Z0-9]/g, '');
  const display_id = cleanId.length > 8 ? `#SELL-${cleanId.slice(-6).toUpperCase()}` : `#${cleanId.toUpperCase()}`;

  const rawStatus = String(sr.status || 'pending').toLowerCase();
  let status_label = 'Under Review';
  let status_color = '#D97706';
  let status_bg = '#FEF3C7';

  if (rawStatus === 'approved') {
    status_label = 'Valuation Approved';
    status_color = '#059669';
    status_bg = '#ECFDF5';
  } else if (rawStatus === 'scheduled') {
    status_label = 'Pickup Scheduled';
    status_color = '#2563EB';
    status_bg = '#EFF6FF';
  } else if (rawStatus === 'picked_up') {
    status_label = 'Device Picked Up';
    status_color = '#7C3AED';
    status_bg = '#F5F3FF';
  } else if (rawStatus === 'inspected') {
    status_label = 'Inspection Passed';
    status_color = '#059669';
    status_bg = '#ECFDF5';
  } else if (rawStatus === 'completed') {
    status_label = 'Paid & Completed';
    status_color = '#059669';
    status_bg = '#ECFDF5';
  } else if (rawStatus === 'cancelled' || rawStatus === 'rejected') {
    status_label = rawStatus === 'rejected' ? 'Declined' : 'Cancelled';
    status_color = '#DC2626';
    status_bg = '#FEE2E2';
  }

  const createdDate = sr.created_at ? new Date(sr.created_at) : new Date();
  const formatted_date = createdDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const formatted_time = createdDate.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const full_address = [sr.address, sr.pincode].filter(Boolean).join(', ');

  return {
    id,
    display_id,
    type: 'sell_request',
    status: rawStatus,
    status_label,
    status_color,
    status_bg,
    customer: {
      name: sr.customer_name || 'Seller',
      phone: sr.customer_phone || '',
      email: sr.customer_email || '',
      address: sr.address || '',
      pincode: sr.pincode || '',
      full_address,
    },
    time: {
      created_at: createdDate.toISOString(),
      formatted_date,
      formatted_time,
      updated_at: sr.updated_at ? new Date(sr.updated_at).toISOString() : createdDate.toISOString(),
    },
    device: {
      category: sr.category || 'Smartphone',
      brand: sr.brand || 'Device',
      model: sr.model || '',
      storage: sr.storage || 'Standard',
      condition: sr.condition || {},
      photos: Array.isArray(sr.photos) ? sr.photos : [],
    },
    valuation: {
      valuation_amount: Number(sr.valuation_amount || sr.expected_price || 0),
      approved_amount: sr.approved_amount ? Number(sr.approved_amount) : undefined,
      expected_price: sr.expected_price ? Number(sr.expected_price) : undefined,
      admin_note: sr.admin_note || '',
    },
    logistics: {
      executive_name: sr.assigned_executive || (rawStatus === 'scheduled' || rawStatus === 'picked_up' ? 'RenewX Inspection Specialist' : undefined),
      executive_phone: sr.executive_phone || (rawStatus === 'scheduled' ? '+91 90801 68778' : undefined),
      address: sr.address || '',
      pincode: sr.pincode || '',
    },
    raw_trade_in: sr,
  };
}

/**
 * Universal lookup controller that searches across Orders and Sell Requests
 * by:
 * - full MongoDB ObjectId
 * - 6-character suffix (e.g. 4B89C3)
 * - formatted ID (e.g. ORD-4B89C3, SELL-4B89D4)
 * - courier tracking number
 * - customer phone number
 */
export async function universalTrackLookup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawParam = String(req.params.query || req.query.q || req.query.id || '').trim();
    if (!rawParam) {
      res.status(400).json({ success: false, error: { message: 'Order ID or Sell Request ID is required', code: 'MISSING_ID' } });
      return;
    }

    const { original, clean, prefixHint } = cleanIdQuery(rawParam);

    // 1. Direct MongoDB ObjectId match
    if (mongoose.Types.ObjectId.isValid(clean)) {
      if (prefixHint !== 'sell') {
        const orderMatch = await OrderModel.findById(clean).lean();
        if (orderMatch) {
          res.json({ success: true, type: 'order', data: formatOrderResult(orderMatch) });
          return;
        }
      }

      if (prefixHint !== 'order') {
        const sellMatch = await TradeInModel.findById(clean).lean();
        if (sellMatch) {
          res.json({ success: true, type: 'sell_request', data: formatSellResult(sellMatch) });
          return;
        }
      }
    }

    // 2. Search by ID suffix or fields
    // Escape regex characters
    const escapedClean = clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    if (prefixHint !== 'sell') {
      // Look up Order by regex on string representation of _id, tracking_number, or phone
      const orderMatch = await OrderModel.findOne({
        $or: [
          { $expr: { $regexMatch: { input: { $toString: '$_id' }, regex: `${escapedClean}$`, options: 'i' } } },
          { $expr: { $regexMatch: { input: { $toString: '$_id' }, regex: escapedClean, options: 'i' } } },
          { tracking_number: { $regex: new RegExp(escapedClean, 'i') } },
          { 'customer_info.phone': { $regex: new RegExp(escapedClean, 'i') } },
        ],
      }).sort({ created_at: -1 }).lean();

      if (orderMatch) {
        const formatted = await formatOrderResult(orderMatch);
        res.json({ success: true, type: 'order', data: formatted });
        return;
      }
    }

    if (prefixHint !== 'order') {
      // Look up TradeIn by regex on string representation of _id or phone
      const sellMatch = await TradeInModel.findOne({
        $or: [
          { $expr: { $regexMatch: { input: { $toString: '$_id' }, regex: `${escapedClean}$`, options: 'i' } } },
          { $expr: { $regexMatch: { input: { $toString: '$_id' }, regex: escapedClean, options: 'i' } } },
          { customer_phone: { $regex: new RegExp(escapedClean, 'i') } },
        ],
      }).sort({ created_at: -1 }).lean();

      if (sellMatch) {
        res.json({ success: true, type: 'sell_request', data: formatSellResult(sellMatch) });
        return;
      }
    }

    // If prefix hint was explicit but failed, or general search failed:
    res.status(404).json({
      success: false,
      error: {
        message: `No order or sell request found matching "${original}". Please check the ID and try again.`,
        code: 'NOT_FOUND',
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Universal order tracking by ID
 */
export async function trackOrderUniversally(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawId = String(req.params.id || req.query.id || '').trim();
    if (!rawId) {
      res.status(400).json({ success: false, error: { message: 'Order ID is required', code: 'MISSING_ID' } });
      return;
    }

    const { clean } = cleanIdQuery(rawId);

    if (mongoose.Types.ObjectId.isValid(clean)) {
      const order = await OrderModel.findById(clean).lean();
      if (order) {
        const formatted = await formatOrderResult(order);
        res.json({ success: true, type: 'order', data: formatted });
        return;
      }
    }

    const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const order = await OrderModel.findOne({
      $or: [
        { $expr: { $regexMatch: { input: { $toString: '$_id' }, regex: `${escaped}$`, options: 'i' } } },
        { tracking_number: { $regex: new RegExp(escaped, 'i') } },
      ],
    }).sort({ created_at: -1 }).lean();

    if (!order) {
      res.status(404).json({ success: false, error: { message: 'Order not found', code: 'NOT_FOUND' } });
      return;
    }

    const formatted = await formatOrderResult(order);
    res.json({ success: true, type: 'order', data: formatted });
  } catch (err) {
    next(err);
  }
}

/**
 * Universal sell request tracking by ID
 */
export async function trackSellRequestUniversally(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawId = String(req.params.id || req.query.id || '').trim();
    if (!rawId) {
      res.status(400).json({ success: false, error: { message: 'Sell Request ID is required', code: 'MISSING_ID' } });
      return;
    }

    const { clean } = cleanIdQuery(rawId);

    if (mongoose.Types.ObjectId.isValid(clean)) {
      const sell = await TradeInModel.findById(clean).lean();
      if (sell) {
        res.json({ success: true, type: 'sell_request', data: formatSellResult(sell) });
        return;
      }
    }

    const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const sell = await TradeInModel.findOne({
      $or: [
        { $expr: { $regexMatch: { input: { $toString: '$_id' }, regex: `${escaped}$`, options: 'i' } } },
      ],
    }).sort({ created_at: -1 }).lean();

    if (!sell) {
      res.status(404).json({ success: false, error: { message: 'Sell request not found', code: 'NOT_FOUND' } });
      return;
    }

    res.json({ success: true, type: 'sell_request', data: formatSellResult(sell) });
  } catch (err) {
    next(err);
  }
}
