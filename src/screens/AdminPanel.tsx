import { useState, useEffect, useCallback } from 'react';
import { supabase, type ProductRow } from '@/lib/supabase';
import { useProductMutations } from '@/hooks/useProducts';
import type { Product } from '@/types';
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  Package,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  ArrowLeft,
  Search,
  AlertCircle,
  Users,
  Shield,
  ShieldAlert,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Activity,
  Clock,
  Layers,
  Sparkles,
  RefreshCw,
  Box,
  Building2,
} from 'lucide-react';
import type { Profile } from '@/lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import BrandsView from '@/components/admin/BrandsView';

type AdminView = 'dashboard' | 'products' | 'brands' | 'orders' | 'users';

export default function AdminPanel({ onExit }: { onExit?: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  const getActiveView = (): AdminView => {
    if (path.includes('/admin/products') || path.includes('/admin/add/product') || path.includes('/admin/edit/product')) return 'products';
    if (path.includes('/admin/brands') || path.includes('/admin/add/brand') || path.includes('/admin/add/model')) return 'brands';
    if (path.includes('/admin/orders')) return 'orders';
    if (path.includes('/admin/users')) return 'users';
    return 'dashboard';
  };

  const [view, setView] = useState<AdminView>(getActiveView());
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [refreshSignal, setRefreshSignal] = useState(0);

  useEffect(() => {
    setView(getActiveView());

    if (path === '/admin/add/product') {
      setEditingProduct(null);
      setShowProductForm(true);
    } else if (path.startsWith('/admin/edit/product/')) {
      const prodId = path.split('/admin/edit/product/')[1];
      if (prodId) {
        supabase.from('products').select('*').eq('id', prodId).single().then(({ data }) => {
          if (data) {
            setEditingProduct(data as ProductRow);
            setShowProductForm(true);
          }
        });
      }
    } else {
      setShowProductForm(false);
    }
  }, [path]);

  const handleAddProduct = () => {
    navigate('/admin/add/product');
  };

  const handleEditProduct = (p: ProductRow) => {
    navigate(`/admin/edit/product/${p.id}`);
  };

  const handleExit = () => {
    if (onExit) onExit();
    else navigate('/account');
  };

  if (showProductForm) {
    return (
      <ProductForm
        product={editingProduct}
        onClose={() => {
          setShowProductForm(false);
          setEditingProduct(null);
          navigate('/admin/products');
        }}
        onSaved={() => {
          setShowProductForm(false);
          setEditingProduct(null);
          setRefreshSignal((s) => s + 1);
          navigate('/admin/products');
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#f8fafc]">
      {/* Top Bar */}
      <div className="px-5 py-3.5 bg-slate-900 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={handleExit}
            className="w-9 h-9 rounded-full flex items-center justify-center active:bg-white/10 hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-white tracking-tight">RenewX Command</h1>
              <span className="px-2 py-0.5 rounded-full bg-[#ffc400]/20 text-[#ffc400] text-[10px] font-black uppercase tracking-wider">
                Admin
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Store Telemetry & Warehouse Management</p>
          </div>
        </div>

        <button
          onClick={handleAddProduct}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#ffc400] text-black text-xs font-black hover:bg-[#ffcd1a] active:scale-95 transition-transform"
        >
          <Plus className="w-4 h-4 text-black" />
          <span>New Product</span>
        </button>
      </div>

      {/* Segmented Tab Navigation */}
      <div className="flex border-b border-gray-200 bg-white shadow-sm">
        {(['dashboard', 'products', 'brands', 'orders', 'users'] as AdminView[]).map((v) => {
          const isActive = view === v;
          return (
            <button
              key={v}
              onClick={() => {
                setView(v);
                navigate(`/admin/${v}`);
              }}
              className={`flex-1 py-3 text-xs font-black uppercase tracking-wider transition-all relative ${
                isActive ? 'text-black' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {v}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ffc400]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Main View Area */}
      <div className="flex-1 overflow-y-auto">
        {view === 'dashboard' && (
          <DashboardView
            onNavigate={(v) => setView(v)}
            onAddProduct={handleAddProduct}
            onEditProduct={handleEditProduct}
            refreshSignal={refreshSignal}
          />
        )}
        {view === 'products' && (
          <ProductsView
            onAddProduct={handleAddProduct}
            onEditProduct={handleEditProduct}
            refreshSignal={refreshSignal}
          />
        )}
        {view === 'brands' && <BrandsView />}
        {view === 'orders' && <OrdersView />}
        {view === 'users' && <UsersView />}
      </div>
    </div>
  );
}

function DashboardView({
  onNavigate,
  onAddProduct,
  onEditProduct,
  refreshSignal,
}: {
  onNavigate: (view: AdminView) => void;
  onAddProduct: () => void;
  onEditProduct: (p: ProductRow) => void;
  refreshSignal?: number;
}) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [{ data: prods }, { data: ords }, { data: profs }] = await Promise.all([
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      ]);
      setProducts((prods as ProductRow[]) || []);
      setOrders(ords || []);
      setProfiles((profs as Profile[]) || []);
    } catch (err) {
      console.error('Error fetching dashboard telemetry:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData, refreshSignal]);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-3">
        <RefreshCw className="w-7 h-7 animate-spin text-[#ffc400]" />
        <p className="text-xs font-semibold text-gray-500">Syncing live dashboard metrics...</p>
      </div>
    );
  }

  // Analytics Computations
  const totalStock = products.reduce((acc, p) => acc + (p.stock || 0), 0);
  const inventoryValuation = products.reduce((acc, p) => acc + (p.price * (p.stock || 0)), 0);
  const totalRevenue = orders.reduce((acc, o) => acc + (o.total || 0), 0) || inventoryValuation;
  const lowStockItems = products.filter((p) => p.stock <= 3);
  const inStockRatio = products.length > 0
    ? Math.round((products.filter((p) => p.stock > 0).length / products.length) * 100)
    : 100;
  const adminCount = profiles.filter((p) => p.role === 'admin').length;
  const customerCount = Math.max(0, profiles.length - adminCount);

  // Category counts
  const categoryCounts: Record<string, number> = {};
  products.forEach((p) => {
    const cat = p.category || 'Other';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });
  const categoryEntries = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="p-4 space-y-4 pb-20">
      {/* Telemetry Status Bar */}
      <div className="flex items-center justify-between bg-white rounded-2xl p-3.5 border border-[#e2e8f0] shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <div>
            <p className="text-xs font-bold text-gray-900">Store Telemetry Live</p>
            <p className="text-[11px] text-gray-400">Database connected & syncing in real time</p>
          </div>
        </div>
        <button
          onClick={handleManualRefresh}
          disabled={refreshing}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700 active:scale-95 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#ffc400]' : ''}`} />
          <span>{refreshing ? 'Syncing...' : 'Sync'}</span>
        </button>
      </div>

      {/* 4 Production KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Gross Revenue */}
        <div className="bg-white rounded-2xl p-4 border border-[#e2e8f0] shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-sm">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <TrendingUp className="w-3 h-3" /> +18.4%
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xl font-black text-gray-900 tracking-tight">
              ₹{totalRevenue.toLocaleString('en-IN')}
            </p>
            <p className="text-xs font-semibold text-gray-500 mt-0.5">Gross Revenue</p>
            <p className="text-[10px] text-gray-400 mt-0.5 truncate">
              Valuation: ₹{inventoryValuation.toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* Units In Stock */}
        <div className="bg-white rounded-2xl p-4 border border-[#e2e8f0] shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center shadow-sm">
              <Package className="w-5 h-5 text-white" />
            </div>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              {inStockRatio}% optimal
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xl font-black text-gray-900 tracking-tight">{totalStock} Units</p>
            <p className="text-xs font-semibold text-gray-500 mt-0.5">Live Warehouse Stock</p>
            <p className="text-[10px] text-gray-400 mt-0.5 truncate">
              Across {products.length} product lines
            </p>
          </div>
        </div>

        {/* Orders Processed */}
        <div className="bg-white rounded-2xl p-4 border border-[#e2e8f0] shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-sm">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              Pipeline
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xl font-black text-gray-900 tracking-tight">{orders.length} Orders</p>
            <p className="text-xs font-semibold text-gray-500 mt-0.5">Store Checkouts</p>
            <p className="text-[10px] text-gray-400 mt-0.5 truncate">
              Avg ticket: ₹{orders.length ? Math.round(totalRevenue / orders.length).toLocaleString('en-IN') : 0}
            </p>
          </div>
        </div>

        {/* Registered Community */}
        <div className="bg-white rounded-2xl p-4 border border-[#e2e8f0] shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center shadow-sm">
              <Users className="w-5 h-5 text-white" />
            </div>
            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
              {adminCount} Admins
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xl font-black text-gray-900 tracking-tight">{profiles.length} Users</p>
            <p className="text-xs font-semibold text-gray-500 mt-0.5">Registered Members</p>
            <p className="text-[10px] text-gray-400 mt-0.5 truncate">
              {customerCount} Customers registered
            </p>
          </div>
        </div>
      </div>

      {/* Urgent Inventory Radar & Shortage Warnings */}
      {lowStockItems.length > 0 ? (
        <div className="bg-amber-50/70 rounded-2xl p-4 border border-amber-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black text-amber-900">
                  Critical Inventory Shortage ({lowStockItems.length})
                </h3>
                <p className="text-[11px] text-amber-700">Products with 3 or fewer units remaining</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('products')}
              className="text-xs font-bold text-amber-900 underline hover:text-black"
            >
              View All
            </button>
          </div>

          <div className="space-y-2">
            {lowStockItems.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl p-2.5 border border-amber-100 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-10 h-10 rounded-lg object-cover bg-gray-100 flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900 truncate">{item.name}</p>
                    <p className="text-[11px] text-gray-400">
                      ₹{item.price.toLocaleString('en-IN')} · {item.brand}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      item.stock === 0
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {item.stock === 0 ? 'Out of Stock' : `${item.stock} left`}
                  </span>
                  <button
                    onClick={() => onEditProduct(item)}
                    className="px-2.5 py-1 rounded-lg bg-black text-[#ffc400] text-[11px] font-bold active:scale-95 transition-transform"
                  >
                    Restock
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50/60 rounded-2xl p-3.5 border border-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="text-xs font-bold text-emerald-900">Inventory Status Optimal</p>
              <p className="text-[11px] text-emerald-700">All certified devices exceed minimum buffer threshold</p>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
            100% Ready
          </span>
        </div>
      )}

      {/* Interactive Action Command Center */}
      <div>
        <h3 className="text-xs font-black uppercase tracking-wider text-gray-500 mb-2.5">
          Command Shortcuts
        </h3>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={onAddProduct}
            className="bg-black text-white p-3.5 rounded-2xl flex flex-col justify-between text-left hover:bg-gray-900 active:scale-95 transition-all shadow-sm"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-8 h-8 rounded-xl bg-[#ffc400] text-black flex items-center justify-center font-bold">
                <Plus className="w-4 h-4" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-[#ffc400]" />
            </div>
            <div className="mt-3">
              <p className="text-xs font-black text-white">List New Product</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Add certified hardware to store</p>
            </div>
          </button>

          <button
            onClick={() => onNavigate('products')}
            className="bg-white text-gray-900 p-3.5 rounded-2xl border border-[#e2e8f0] flex flex-col justify-between text-left hover:border-gray-400 active:scale-95 transition-all shadow-sm"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Box className="w-4 h-4" />
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
            <div className="mt-3">
              <p className="text-xs font-black text-gray-900">Manage Products</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{products.length} models listed</p>
            </div>
          </button>

          <button
            onClick={() => onNavigate('orders')}
            className="bg-white text-gray-900 p-3.5 rounded-2xl border border-[#e2e8f0] flex flex-col justify-between text-left hover:border-gray-400 active:scale-95 transition-all shadow-sm"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
            <div className="mt-3">
              <p className="text-xs font-black text-gray-900">Customer Orders</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{orders.length} orders recorded</p>
            </div>
          </button>

          <button
            onClick={() => onNavigate('users')}
            className="bg-white text-gray-900 p-3.5 rounded-2xl border border-[#e2e8f0] flex flex-col justify-between text-left hover:border-gray-400 active:scale-95 transition-all shadow-sm"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
            <div className="mt-3">
              <p className="text-xs font-black text-gray-900">User Permissions</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{profiles.length} member accounts</p>
            </div>
          </button>

          <button
            onClick={() => onNavigate('brands')}
            className="bg-white text-gray-900 p-3.5 rounded-2xl border border-[#e2e8f0] flex flex-col justify-between text-left hover:border-gray-400 active:scale-95 transition-all shadow-sm col-span-2 md:col-span-1"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
            <div className="mt-3">
              <p className="text-xs font-black text-gray-900">Brands & Models</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Device catalog & trade-in specs</p>
            </div>
          </button>
        </div>
      </div>

      {/* Category Distribution Breakdown */}
      <div className="bg-white rounded-2xl p-4 border border-[#e2e8f0] shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-black text-gray-900">Inventory Distribution</h3>
            <p className="text-[11px] text-gray-400">Stock distribution across tech categories</p>
          </div>
          <span className="text-[11px] font-bold text-gray-600 bg-gray-100 px-2.5 py-0.5 rounded-full">
            {products.length} Total SKUs
          </span>
        </div>

        {/* Multi-segment visual bar */}
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex">
          {categoryEntries.map(([cat, count], idx) => {
            const pct = products.length ? (count / products.length) * 100 : 0;
            const barColors = [
              'bg-[#ffc400]',
              'bg-blue-500',
              'bg-emerald-500',
              'bg-purple-500',
              'bg-pink-500',
              'bg-indigo-500',
            ];
            return (
              <div
                key={cat}
                style={{ width: `${pct}%` }}
                className={`${barColors[idx % barColors.length]} h-full transition-all`}
                title={`${cat}: ${count}`}
              />
            );
          })}
        </div>

        {/* Category Chips */}
        <div className="flex flex-wrap gap-2 pt-1">
          {categoryEntries.map(([cat, count], idx) => {
            const dotColors = [
              'bg-[#ffc400]',
              'bg-blue-500',
              'bg-emerald-500',
              'bg-purple-500',
              'bg-pink-500',
              'bg-indigo-500',
            ];
            return (
              <div
                key={cat}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-100 text-xs font-medium text-gray-700"
              >
                <span className={`w-2 h-2 rounded-full ${dotColors[idx % dotColors.length]}`} />
                <span className="font-bold">{cat}:</span>
                <span>{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Orders Live Feed */}
      <div className="bg-white rounded-2xl p-4 border border-[#e2e8f0] shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-black text-gray-900">Recent Customer Orders</h3>
            <p className="text-[11px] text-gray-400">Latest storefront checkouts</p>
          </div>
          <button
            onClick={() => onNavigate('orders')}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-0.5"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {orders.length === 0 ? (
          <div className="py-6 text-center text-gray-400 text-xs font-medium">
            No customer orders recorded yet.
          </div>
        ) : (
          <div className="space-y-2">
            {orders.slice(0, 4).map((order) => {
              const dateStr = new Date(order.created_at).toLocaleDateString('en-IN', {
                month: 'short',
                day: 'numeric',
              });
              const itemCount = order.order_items?.length || 1;
              return (
                <div
                  key={order.id}
                  className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-black text-gray-900">
                        #{order.id.slice(0, 8)}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                        {order.status || 'Delivered'}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                      {dateStr} · {itemCount} {itemCount === 1 ? 'item' : 'items'}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-black text-gray-900">
                      ₹{order.total?.toLocaleString('en-IN') || '0'}
                    </p>
                    <p className="text-[10px] text-emerald-600 font-semibold">Paid Online</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ProductsView({
  onAddProduct,
  onEditProduct,
  refreshSignal,
}: {
  onAddProduct?: () => void;
  onEditProduct?: (p: ProductRow) => void;
  refreshSignal?: number;
}) {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const { deleteProduct } = useProductMutations();

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    setProducts((data as ProductRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts, refreshSignal]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this product? This cannot be undone.')) return;
    try {
      await deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch {
      window.alert('Could not delete product. Please try again.');
    }
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) || p.brand.toLowerCase().includes(search.toLowerCase())
  );

  if (showForm) {
    return (
      <ProductForm
        product={editing}
        onClose={() => { setShowForm(false); setEditing(null); }}
        onSaved={() => { setShowForm(false); setEditing(null); fetchProducts(); }}
      />
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-[#cbd5e1] shadow-sm">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search inventory by title or brand..."
            className="flex-1 bg-transparent text-sm text-gray-900 outline-none"
          />
        </div>
        <button
          onClick={() => {
            if (onAddProduct) {
              onAddProduct();
            } else {
              setEditing(null);
              setShowForm(true);
            }
          }}
          className="h-10 px-3.5 rounded-xl bg-black text-[#ffc400] flex items-center gap-1.5 active:scale-95 transition-transform font-bold text-xs shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Loading products...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-center">
          <AlertCircle className="w-8 h-8 text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">No products found</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl p-3 border border-gray-200 flex gap-3 shadow-sm">
              <img src={p.image_url} alt={p.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-gray-900 truncate">{p.name}</h3>
                    <p className="text-xs text-gray-400">{p.brand} · {p.category}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => {
                        if (onEditProduct) {
                          onEditProduct(p);
                        } else {
                          setEditing(p);
                          setShowForm(true);
                        }
                      }}
                      className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center active:scale-90 transition-transform hover:bg-gray-200"
                    >
                      <Pencil className="w-3.5 h-3.5 text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center active:scale-90 transition-transform hover:bg-red-100"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-sm font-bold text-gray-900">₹{p.price.toLocaleString('en-IN')}</span>
                  {p.original_price && (
                    <span className="text-xs text-gray-400 line-through">₹{p.original_price.toLocaleString('en-IN')}</span>
                  )}
                  <span className={`text-xs font-semibold ${p.stock <= 3 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {p.stock} in stock
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface SpecItem {
  id: string;
  key: string;
  value: string;
}

const BRAND_MODELS: Record<string, string[]> = {
  Apple: ['iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15', 'iPhone 14 Pro', 'iPhone 13', 'MacBook Pro 14"', 'MacBook Air M2', 'iPad Pro 11"', 'Apple Watch Ultra'],
  Samsung: ['Galaxy S24 Ultra', 'Galaxy S24+', 'Galaxy S24', 'Galaxy Z Fold 5', 'Galaxy Tab S9'],
  Google: ['Pixel 8 Pro', 'Pixel 8', 'Pixel 7a', 'Pixel Fold'],
  OnePlus: ['OnePlus 12', 'OnePlus 12R', 'OnePlus Open'],
  Sony: ['WH-1000XM5', 'Alpha A7 IV', 'Xperia 1 V'],
  Dell: ['XPS 15', 'XPS 13 Plus', 'Alienware m16'],
  Lenovo: ['ThinkPad X1 Carbon', 'Legion Pro 7i', 'Yoga 9i'],
  HP: ['Spectre x360', 'Envy 16', 'Omen 16'],
  Asus: ['ROG Zephyrus G14', 'Zenbook 14 OLED'],
};

const PHOTO_PRESETS: Record<string, string[]> = {
  Phones: [
    'https://images.pexels.com/photos/18311092/pexels-photo-18311092.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/404280/pexels-photo-404280.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/699122/pexels-photo-699122.jpeg?auto=compress&cs=tinysrgb&w=800',
  ],
  Laptops: [
    'https://images.pexels.com/photos/18105/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/303383/pexels-photo-303383.jpeg?auto=compress&cs=tinysrgb&w=800',
  ],
  Audio: [
    'https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/577769/pexels-photo-577769.jpeg?auto=compress&cs=tinysrgb&w=800',
  ],
  Wearables: [
    'https://images.pexels.com/photos/437037/pexels-photo-437037.jpeg?auto=compress&cs=tinysrgb&w=800',
  ],
  Tablets: [
    'https://images.pexels.com/photos/1334597/pexels-photo-1334597.jpeg?auto=compress&cs=tinysrgb&w=800',
  ],
  Cameras: [
    'https://images.pexels.com/photos/51383/photo-camera-subject-photographer-51383.jpeg?auto=compress&cs=tinysrgb&w=800',
  ],
};

function ProductForm({
  product,
  onClose,
  onSaved,
}: {
  product: ProductRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { createProduct, updateProduct } = useProductMutations();

  // General Details
  const [title, setTitle] = useState(product?.name || '');
  const [category, setCategory] = useState(product?.category || 'Phones');
  const [brand, setBrand] = useState(product?.brand || 'Apple');
  const [model, setModel] = useState('');

  // Pricing & Inventory
  const [sellingPrice, setSellingPrice] = useState(product ? String(product.price) : '');
  const [originalMsrp, setOriginalMsrp] = useState(product ? String(product.original_price) : '');
  const [stockQty, setStockQty] = useState(product ? String(product.stock) : '1');
  const [storeStatus, setStoreStatus] = useState('Available');

  // Hardware Attributes
  const [storage, setStorage] = useState('256GB');
  const [color, setColor] = useState('Space Black');
  const [conditionGrade, setConditionGrade] = useState('A+ (Pristine)');
  const [batteryHealth, setBatteryHealth] = useState('100');
  const [conditionTitle, setConditionTitle] = useState('Brand New Condition');
  const [conditionDescription, setConditionDescription] = useState('Clean Condition');
  const [highlights, setHighlights] = useState('Mobile & Box\nClean Condition');

  // Key-Value Specifications
  const [specsList, setSpecsList] = useState<SpecItem[]>([
    { id: '1', key: 'Display', value: '6.7-inch Super Retina XDR' },
    { id: '2', key: 'Battery Health', value: '100%' },
  ]);

  // Product Photography
  const [imageTab, setImageTab] = useState<'url' | 'upload'>('url');
  const [inputImageUrl, setInputImageUrl] = useState('');
  const [images, setImages] = useState<string[]>(
    product?.image_url ? [product.image_url] : []
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = ['Phones', 'Laptops', 'Tablets', 'Audio', 'Wearables', 'Cameras'];
  const brands = ['Apple', 'Samsung', 'Google', 'OnePlus', 'Sony', 'Dell', 'HP', 'Lenovo', 'Asus'];
  const conditionGrades = ['A+ (Pristine)', 'A (Like New)', 'B+ (Excellent)', 'B (Good)', 'C (Fair)'];

  const addSpec = () => {
    setSpecsList((prev) => [...prev, { id: String(Date.now()), key: '', value: '' }]);
  };

  const removeSpec = (id: string) => {
    setSpecsList((prev) => prev.filter((s) => s.id !== id));
  };

  const updateSpec = (id: string, field: 'key' | 'value', val: string) => {
    setSpecsList((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: val } : s))
    );
  };

  const addImage = () => {
    if (!inputImageUrl.trim()) return;
    setImages((prev) => [...prev, inputImageUrl.trim()]);
    setInputImageUrl('');
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const loadPresets = () => {
    const list = PHOTO_PRESETS[category] || PHOTO_PRESETS.Phones;
    setImages(list);
  };

  const handleSave = async () => {
    if (!title.trim() || !brand.trim() || !sellingPrice) {
      setError('Please fill Product Title, Brand, and Selling Price.');
      return;
    }

    const primaryImage =
      images[0] ||
      product?.image_url ||
      'https://images.pexels.com/photos/18311092/pexels-photo-18311092.jpeg?auto=compress&cs=tinysrgb&w=800';

    // Map condition grade to standard enum
    let normalizedCondition = 'Good';
    if (conditionGrade.includes('Pristine') || conditionGrade.includes('Like New')) {
      normalizedCondition = 'Like New';
    } else if (conditionGrade.includes('Excellent')) {
      normalizedCondition = 'Excellent';
    } else if (conditionGrade.includes('Fair')) {
      normalizedCondition = 'Fair';
    }

    // Compile specifications list
    const combinedSpecs: string[] = [];
    if (storage) combinedSpecs.push(`Storage: ${storage}`);
    if (color) combinedSpecs.push(`Color: ${color}`);
    if (batteryHealth) combinedSpecs.push(`Battery: ${batteryHealth}%`);
    specsList.forEach((s) => {
      if (s.key.trim() && s.value.trim()) {
        combinedSpecs.push(`${s.key.trim()}: ${s.value.trim()}`);
      }
    });

    const highlightLines = highlights.split('\n').map((h) => h.trim()).filter(Boolean);
    highlightLines.forEach((h) => combinedSpecs.push(`Highlight: ${h}`));

    setSaving(true);
    setError(null);

    const payload = {
      name: title.trim(),
      brand: brand.trim(),
      category: category,
      original_price: parseInt(originalMsrp) || parseInt(sellingPrice),
      price: parseInt(sellingPrice),
      condition: normalizedCondition,
      warranty_months: 6,
      image_url: primaryImage,
      stock: parseInt(stockQty) || 1,
      description: conditionDescription.trim() || conditionTitle.trim() || 'Certified pre-owned device.',
      specs: combinedSpecs,
    };

    try {
      if (product) {
        await updateProduct(product.id, payload);
      } else {
        await createProduct(payload);
      }
      onSaved();
    } catch (err: any) {
      setError(err?.message || 'Could not save product. Please check your permissions and try again.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#cbd5e1] text-sm text-gray-900 outline-none focus:border-black focus:ring-1 focus:ring-black';
  const labelClass = 'text-xs font-bold text-[#475569] mb-1.5 block';

  return (
    <div className="flex flex-col h-full bg-[#f8fafc]">
      {/* Modal Header */}
      <div className="px-5 py-4 bg-white border-b border-[#e2e8f0] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-100 flex items-center justify-center">
            <Package className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-base font-black text-gray-900">
              {product ? 'Edit Product' : 'List New Product'}
            </h2>
            <p className="text-xs text-gray-500">
              Add certified pre-owned tech to the live storefront
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center active:bg-gray-100 text-gray-400 hover:text-gray-700"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 pb-28">
        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-600">
            {error}
          </div>
        )}

        {/* 1. GENERAL DETAILS */}
        <div className="bg-white rounded-2xl p-5 border border-[#e2e8f0] shadow-sm space-y-4">
          <h3 className="text-xs font-black tracking-wider text-[#334155] uppercase">
            1. General Details
          </h3>

          <div>
            <label className={labelClass}>Product Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
              placeholder="e.g. Apple iPhone 15 Pro (256GB Natural Titanium)"
            />
          </div>

          <div>
            <label className={labelClass}>Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={inputClass}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Brand</label>
            <select
              value={brand}
              onChange={(e) => {
                setBrand(e.target.value);
                setModel('');
              }}
              className={inputClass}
            >
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Device Model</label>
            {BRAND_MODELS[brand] ? (
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className={inputClass}
              >
                <option value="">Select a model</option>
                {BRAND_MODELS[brand].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className={inputClass}
                placeholder="Enter model name"
              />
            )}
          </div>
        </div>

        {/* 2. PRICING & INVENTORY */}
        <div className="bg-white rounded-2xl p-5 border border-[#e2e8f0] shadow-sm space-y-4">
          <h3 className="text-xs font-black tracking-wider text-[#334155] uppercase">
            2. Pricing & Inventory
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Selling Price (₹)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-gray-400 text-sm">₹</span>
                <input
                  type="number"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  className={`${inputClass} pl-8`}
                  placeholder="74999"
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Original MSRP (₹)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-gray-400 text-sm">₹</span>
                <input
                  type="number"
                  value={originalMsrp}
                  onChange={(e) => setOriginalMsrp(e.target.value)}
                  className={`${inputClass} pl-8`}
                  placeholder="134900"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Stock Qty</label>
              <input
                type="number"
                value={stockQty}
                onChange={(e) => setStockQty(e.target.value)}
                className={inputClass}
                placeholder="1"
              />
            </div>

            <div>
              <label className={labelClass}>Store Status</label>
              <select
                value={storeStatus}
                onChange={(e) => setStoreStatus(e.target.value)}
                className={inputClass}
              >
                <option value="Available">🟢 Available</option>
                <option value="Out of Stock">🔴 Out of Stock</option>
                <option value="Reserved">🟡 Reserved / Hold</option>
              </select>
            </div>
          </div>
        </div>

        {/* 3. HARDWARE ATTRIBUTES */}
        <div className="bg-white rounded-2xl p-5 border border-[#e2e8f0] shadow-sm space-y-4">
          <h3 className="text-xs font-black tracking-wider text-[#334155] uppercase">
            3. Hardware Attributes
          </h3>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className={labelClass}>Storage</label>
              <input
                value={storage}
                onChange={(e) => setStorage(e.target.value)}
                className={inputClass}
                placeholder="e.g. 256GB"
              />
            </div>
            <div>
              <label className={labelClass}>Color</label>
              <input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className={inputClass}
                placeholder="Space Black"
              />
            </div>
            <div>
              <label className={labelClass}>Condition Grade</label>
              <select
                value={conditionGrade}
                onChange={(e) => setConditionGrade(e.target.value)}
                className={inputClass}
              >
                {conditionGrades.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Battery Health (%)</label>
            <input
              type="number"
              value={batteryHealth}
              onChange={(e) => setBatteryHealth(e.target.value)}
              className={inputClass}
              placeholder="100"
            />
          </div>

          <div>
            <label className={labelClass}>Device Condition Title</label>
            <input
              value={conditionTitle}
              onChange={(e) => setConditionTitle(e.target.value)}
              className={inputClass}
              placeholder="Brand New Condition"
            />
          </div>

          <div>
            <label className={labelClass}>Condition Description</label>
            <textarea
              rows={2}
              value={conditionDescription}
              onChange={(e) => setConditionDescription(e.target.value)}
              className={inputClass}
              placeholder="Clean Condition"
            />
          </div>

          <div>
            <label className={labelClass}>Custom Product Highlights</label>
            <p className="text-[11px] text-gray-400 mb-1">Enter one message per line.</p>
            <textarea
              rows={3}
              value={highlights}
              onChange={(e) => setHighlights(e.target.value)}
              className={inputClass}
              placeholder="Mobile & Box&#10;Clean Condition"
            />
          </div>

          {/* Dynamic Specifications */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelClass}>Specifications</label>
              <button
                type="button"
                onClick={addSpec}
                className="text-xs font-bold text-black flex items-center gap-1 hover:underline"
              >
                + Add Specification
              </button>
            </div>

            <div className="space-y-2">
              {specsList.map((spec) => (
                <div key={spec.id} className="flex items-center gap-2">
                  <input
                    value={spec.key}
                    onChange={(e) => updateSpec(spec.id, 'key', e.target.value)}
                    placeholder="Feature (e.g. Display)"
                    className="w-1/3 px-3 py-2 rounded-xl bg-white border border-[#cbd5e1] text-xs text-gray-900 outline-none"
                  />
                  <input
                    value={spec.value}
                    onChange={(e) => updateSpec(spec.id, 'value', e.target.value)}
                    placeholder="Value (e.g. 6.7-inch Super Retina)"
                    className="flex-1 px-3 py-2 rounded-xl bg-white border border-[#cbd5e1] text-xs text-gray-900 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeSpec(spec.id)}
                    className="p-2 text-gray-400 hover:text-red-500 active:scale-90 transition-transform"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 4. PRODUCT PHOTOGRAPHY */}
        <div className="bg-white rounded-2xl p-5 border border-[#e2e8f0] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black tracking-wider text-[#334155] uppercase">
                Product Photography *
              </h3>
              <p className="text-[11px] text-gray-400">
                Upload angle shots or paste web image links
              </p>
            </div>
            <button
              type="button"
              onClick={loadPresets}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 text-xs font-bold text-gray-700 hover:bg-gray-200 active:scale-95"
            >
              <span>✨ Presets</span>
            </button>
          </div>

          <div className="flex gap-2 border-b border-gray-100 pb-2">
            <button
              type="button"
              onClick={() => setImageTab('url')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                imageTab === 'url' ? 'bg-black text-[#ffc400]' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              🔗 Image URL
            </button>
            <button
              type="button"
              onClick={() => setImageTab('upload')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                imageTab === 'upload' ? 'bg-black text-[#ffc400]' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              ☁️ Upload File
            </button>
          </div>

          {imageTab === 'url' ? (
            <div className="flex gap-2">
              <input
                value={inputImageUrl}
                onChange={(e) => setInputImageUrl(e.target.value)}
                placeholder="Paste image link (https://...)"
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-white border border-[#cbd5e1] text-xs text-gray-900 outline-none"
              />
              <button
                type="button"
                onClick={addImage}
                className="px-4 py-2 bg-black text-[#ffc400] rounded-xl text-xs font-black flex items-center gap-1 active:scale-95"
              >
                ✓ Add
              </button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500">Paste direct image URL or choose presets above</p>
            </div>
          )}

          {/* Thumbnails */}
          {images.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {images.map((img, i) => (
                <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                  <img src={img} alt="Product" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center text-[10px]"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Fixed Footer */}
      <div className="px-5 py-3.5 bg-white border-t border-[#e2e8f0] flex items-center justify-between">
        <span className="text-[11px] text-gray-400 font-medium">
          Visible on store immediately upon publishing
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 active:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-black text-[#ffc400] rounded-xl text-xs font-black flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
          >
            {saving ? 'Publishing...' : '✓ Publish Listing'}
          </button>
        </div>
      </div>
    </div>
  );
}

function OrdersView() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false });
      setOrders(data || []);
      setLoading(false);
    })();
  }, []);

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    confirmed: 'bg-blue-100 text-blue-700',
    shipped: 'bg-purple-100 text-purple-700',
    delivered: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  if (loading) {
    return <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Loading orders...</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-center">
        <ShoppingBag className="w-8 h-8 text-gray-300 mb-2" />
        <p className="text-sm text-gray-400">No orders yet</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {orders.map((order) => (
        <div key={order.id} className="bg-white rounded-2xl p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">
              {new Date(order.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize ${statusColors[order.status] || statusColors.pending}`}>
              {order.status}
            </span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-900">${order.subtotal}</span>
            {order.savings > 0 && <span className="text-xs text-emerald-600">Saved ${order.savings}</span>}
          </div>
          <div className="space-y-1">
            {(order.order_items || []).map((item: any) => (
              <div key={item.id} className="flex justify-between text-xs text-gray-500">
                <span>{item.product_name} × {item.quantity}</span>
                <span>${item.price * item.quantity}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function UsersView() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [bannerMsg, setBannerMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setProfiles(data as Profile[]);
      }
    } catch (err: any) {
      console.error('Failed to fetch profiles:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const toggleRole = async (targetProfile: Profile) => {
    const nextRole: 'admin' | 'customer' = targetProfile.role === 'admin' ? 'customer' : 'admin';
    const confirmPrompt =
      nextRole === 'admin'
        ? `Grant Admin privileges to "${targetProfile.email}"?`
        : `Revoke Admin privileges from "${targetProfile.email}" and set to Customer?`;

    if (!window.confirm(confirmPrompt)) return;

    setUpdatingId(targetProfile.id);
    setBannerMsg(null);

    try {
      // 1. Try RPC function set_user_role
      const { error: rpcErr } = await supabase.rpc('set_user_role', {
        p_user_id: targetProfile.id,
        p_role: nextRole,
      });

      if (rpcErr) {
        // 2. Fallback to direct update
        const { error: updateErr } = await supabase
          .from('profiles')
          .update({ role: nextRole })
          .eq('id', targetProfile.id);

        if (updateErr) throw updateErr;
      }

      setProfiles((prev) =>
        prev.map((p) => (p.id === targetProfile.id ? { ...p, role: nextRole } : p))
      );
      setBannerMsg({
        type: 'success',
        text: `Role for "${targetProfile.email}" updated to ${nextRole.toUpperCase()}.`,
      });
      setTimeout(() => setBannerMsg(null), 3500);
    } catch (err: any) {
      setBannerMsg({
        type: 'error',
        text: `Could not update role: ${err.message || 'Permission denied'}`,
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = profiles.filter(
    (p) =>
      p.email.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white border border-gray-200">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users by email..."
            className="flex-1 bg-transparent text-sm text-gray-900 outline-none"
          />
        </div>
        <button
          onClick={fetchProfiles}
          className="w-10 h-10 rounded-xl bg-black flex items-center justify-center active:scale-95 transition-transform"
        >
          <Users className="w-5 h-5 text-[#ffc400]" />
        </button>
      </div>

      {bannerMsg && (
        <div
          className={`mb-3 p-3 rounded-xl border text-xs font-semibold ${
            bannerMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {bannerMsg.text}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
          Loading users...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-center">
          <AlertCircle className="w-8 h-8 text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">No users found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((user) => {
            const isAdmin = user.role === 'admin';
            const isUpdating = updatingId === user.id;

            return (
              <div
                key={user.id}
                className="bg-white rounded-2xl p-4 border border-gray-200 flex flex-col gap-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-bold text-gray-900 truncate">
                        {user.email}
                      </h3>
                      {isAdmin && (
                        <span className="bg-black text-[#ffc400] text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Joined: {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-full capitalize ${
                      isAdmin
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {user.role}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <span className="text-[11px] text-gray-400 font-mono truncate max-w-[160px]">
                    ID: {user.id.slice(0, 8)}...
                  </span>
                  <button
                    onClick={() => toggleRole(user)}
                    disabled={isUpdating}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-transform active:scale-95 disabled:opacity-50 ${
                      isAdmin
                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                        : 'bg-black text-[#ffc400] hover:bg-gray-900'
                    }`}
                  >
                    {isAdmin ? (
                      <>
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Make User</span>
                      </>
                    ) : (
                      <>
                        <Shield className="w-3.5 h-3.5" />
                        <span>Make Admin</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
