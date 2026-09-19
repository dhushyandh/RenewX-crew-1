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
} from 'lucide-react';

type AdminView = 'dashboard' | 'products' | 'orders';

export default function AdminPanel({ onExit }: { onExit: () => void }) {
  const [view, setView] = useState<AdminView>('dashboard');

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="px-4 py-3 bg-slate-900 flex items-center gap-3">
        <button onClick={onExit} className="w-9 h-9 rounded-full flex items-center justify-center active:bg-white/10">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white">Admin Panel</h1>
          <p className="text-[11px] text-gray-400">RenewX Management</p>
        </div>
      </div>

      <div className="flex border-b border-gray-200 bg-white">
        {(['dashboard', 'products', 'orders'] as AdminView[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`flex-1 py-3 text-xs font-semibold capitalize transition-colors ${
              view === v ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-gray-400'
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pb-4">
        {view === 'dashboard' && <DashboardView />}
        {view === 'products' && <ProductsView />}
        {view === 'orders' && <OrdersView />}
      </div>
    </div>
  );
}

function DashboardView() {
  const [stats, setStats] = useState({ productCount: 0, totalStock: 0, totalValue: 0, orderCount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: products }, { data: orders }] = await Promise.all([
        supabase.from('products').select('price, stock'),
        supabase.from('orders').select('id'),
      ]);

      setStats({
        productCount: products?.length ?? 0,
        totalStock: products?.reduce((s, p) => s + (p.stock || 0), 0) ?? 0,
        totalValue: products?.reduce((s, p) => s + (p.price * (p.stock || 0)), 0) ?? 0,
        orderCount: orders?.length ?? 0,
      });
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Loading...</div>;
  }

  const cards = [
    { label: 'Products', value: stats.productCount, icon: Package, color: 'bg-emerald-500' },
    { label: 'In Stock', value: stats.totalStock, icon: ShoppingBag, color: 'bg-blue-500' },
    { label: 'Inventory Value', value: `$${stats.totalValue.toLocaleString()}`, icon: DollarSign, color: 'bg-amber-500' },
    { label: 'Orders', value: stats.orderCount, icon: TrendingUp, color: 'bg-purple-500' },
  ];

  return (
    <div className="p-4">
      <h2 className="text-base font-bold text-gray-900 mb-3">Overview</h2>
      <div className="grid grid-cols-2 gap-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-2xl p-4 border border-gray-200">
              <div className={`w-9 h-9 rounded-xl ${card.color} flex items-center justify-center mb-3`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <p className="text-xl font-bold text-gray-900">{card.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{card.label}</p>
            </div>
          );
        })}
      </div>

      <h2 className="text-base font-bold text-gray-900 mb-3 mt-6">Quick Actions</h2>
      <div className="space-y-2">
        <div className="bg-white rounded-xl p-4 border border-gray-200 flex items-center gap-3">
          <Package className="w-5 h-5 text-emerald-600" />
          <span className="text-sm text-gray-700">Manage products and inventory</span>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 flex items-center gap-3">
          <ShoppingBag className="w-5 h-5 text-emerald-600" />
          <span className="text-sm text-gray-700">View and update customer orders</span>
        </div>
      </div>
    </div>
  );
}

function ProductsView() {
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

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

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
        <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white border border-gray-200">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="flex-1 bg-transparent text-sm text-gray-900 outline-none"
          />
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center active:scale-95 transition-transform"
        >
          <Plus className="w-5 h-5 text-white" />
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
            <div key={p.id} className="bg-white rounded-2xl p-3 border border-gray-200 flex gap-3">
              <img src={p.image_url} alt={p.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{p.name}</h3>
                    <p className="text-xs text-gray-400">{p.brand} · {p.category}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => { setEditing(p); setShowForm(true); }}
                      className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center active:scale-90 transition-transform"
                    >
                      <Pencil className="w-3.5 h-3.5 text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center active:scale-90 transition-transform"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-sm font-bold text-gray-900">${p.price}</span>
                  <span className="text-xs text-gray-400 line-through">${p.original_price}</span>
                  <span className={`text-xs font-medium ${p.stock <= 5 ? 'text-amber-500' : 'text-gray-400'}`}>
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

const emptyForm = {
  name: '', brand: '', category: 'Laptops', original_price: '', price: '',
  condition: 'Good', warranty_months: '6', image_url: '', stock: '',
  description: '', specs: '',
};

function ProductForm({ product, onClose, onSaved }: {
  product: ProductRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { createProduct, updateProduct } = useProductMutations();
  const [form, setForm] = useState(
    product
      ? {
          name: product.name, brand: product.brand, category: product.category,
          original_price: String(product.original_price), price: String(product.price),
          condition: product.condition, warranty_months: String(product.warranty_months),
          image_url: product.image_url, stock: String(product.stock),
          description: product.description, specs: Array.isArray(product.specs) ? product.specs.join(', ') : '',
        }
      : emptyForm
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = ['Laptops', 'Phones', 'Audio', 'Wearables', 'Cameras', 'Tablets'];
  const conditions = ['Fair', 'Good', 'Excellent', 'Like New'];

  const handleSave = async () => {
    if (!form.name.trim() || !form.brand.trim() || !form.price || !form.image_url.trim()) {
      setError('Please fill in name, brand, price, and image URL.');
      return;
    }

    setSaving(true);
    setError(null);

    const specsArray = form.specs.split(',').map((s) => s.trim()).filter(Boolean);
    const payload = {
      name: form.name.trim(),
      brand: form.brand.trim(),
      category: form.category,
      original_price: parseInt(form.original_price) || parseInt(form.price),
      price: parseInt(form.price),
      condition: form.condition,
      warranty_months: parseInt(form.warranty_months) || 6,
      image_url: form.image_url.trim(),
      stock: parseInt(form.stock) || 0,
      description: form.description.trim() || 'Refurbished product, tested and certified.',
      specs: specsArray,
    };

    try {
      if (product) {
        await updateProduct(product.id, payload);
      } else {
        await createProduct(payload);
      }
      onSaved();
    } catch {
      setError('Could not save product. Please check your permissions and try again.');
    }
    setSaving(false);
  };

  const inputClass = "w-full px-3 py-2.5 rounded-xl bg-white border border-gray-200 text-sm text-gray-900 outline-none focus:border-emerald-500";
  const labelClass = "text-xs font-medium text-gray-500 mb-1.5 block";

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="px-4 py-3 bg-white border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-900">{product ? 'Edit Product' : 'Add Product'}</h2>
        <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center active:bg-gray-100">
          <X className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label className={labelClass}>Product Name</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="MacBook Pro 14" />
        </div>
        <div>
          <label className={labelClass}>Brand</label>
          <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className={inputClass} placeholder="Apple" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Category</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputClass}>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Condition</label>
            <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} className={inputClass}>
              {conditions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Original Price ($)</label>
            <input type="number" value={form.original_price} onChange={(e) => setForm({ ...form, original_price: e.target.value })} className={inputClass} placeholder="1999" />
          </div>
          <div>
            <label className={labelClass}>Sale Price ($)</label>
            <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className={inputClass} placeholder="1449" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Warranty (months)</label>
            <input type="number" value={form.warranty_months} onChange={(e) => setForm({ ...form, warranty_months: e.target.value })} className={inputClass} placeholder="6" />
          </div>
          <div>
            <label className={labelClass}>Stock</label>
            <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className={inputClass} placeholder="10" />
          </div>
        </div>
        <div>
          <label className={labelClass}>Image URL</label>
          <input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className={inputClass} placeholder="https://..." autoCapitalize="none" />
        </div>
        <div>
          <label className={labelClass}>Description</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} rows={3} placeholder="Product description..." />
        </div>
        <div>
          <label className={labelClass}>Specs (comma-separated)</label>
          <input value={form.specs} onChange={(e) => setForm({ ...form, specs: e.target.value })} className={inputClass} placeholder="M3 Pro chip, 18GB RAM, 512GB SSD" />
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>

      <div className="p-4 bg-white border-t border-gray-200">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-3.5 rounded-xl font-semibold text-sm active:scale-[0.98] transition-transform disabled:opacity-50"
        >
          {saving ? <Save className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {product ? 'Save Changes' : 'Add Product'}
        </button>
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
