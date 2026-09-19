import { useState, useMemo, useEffect, useCallback } from 'react';
import { CartProvider, useCart } from '@/context/CartContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { ProductRow } from '@/lib/supabase';
import type { Product } from '@/types';
import {
  Home as HomeIcon, Grid3x3, ShoppingCart, Search, ArrowLeft, Star,
  ShieldCheck, Truck, RefreshCw, Minus, Plus, Trash2, Leaf, X,
  CheckCircle2, Package, Laptop, Smartphone, Headphones, Watch,
  Camera, Tablet, LogOut, LayoutDashboard,
} from 'lucide-react';
import AuthScreen from '@/screens/AuthScreen';
import AdminPanel from '@/screens/AdminPanel';

type Screen = 'home' | 'categories' | 'cart' | 'detail' | 'search' | 'admin';
type Tab = 'home' | 'categories' | 'cart' | 'admin';

const iconMap: Record<string, typeof Laptop> = {
  Grid3x3, Laptop, Smartphone, Headphones, Watch, Camera, Tablet,
};

const conditionColors: Record<string, string> = {
  'Like New': 'bg-emerald-100 text-emerald-700',
  Excellent: 'bg-teal-100 text-teal-700',
  Good: 'bg-blue-100 text-blue-700',
  Fair: 'bg-amber-100 text-amber-700',
};

const staticCategories = [
  { name: 'All', icon: 'Grid3x3' }, { name: 'Laptops', icon: 'Laptop' },
  { name: 'Phones', icon: 'Smartphone' }, { name: 'Audio', icon: 'Headphones' },
  { name: 'Wearables', icon: 'Watch' }, { name: 'Cameras', icon: 'Camera' },
  { name: 'Tablets', icon: 'Tablet' },
];

function mapRow(row: ProductRow): Product {
  return {
    id: 0, _uuid: row.id, name: row.name, brand: row.brand,
    category: row.category as Product['category'],
    originalPrice: row.original_price, price: row.price,
    condition: row.condition as Product['condition'],
    warrantyMonths: row.warranty_months, image: row.image_url,
    rating: row.rating, reviews: row.reviews, stock: row.stock,
    description: row.description,
    specs: Array.isArray(row.specs) ? row.specs : [],
  };
}

function StatusBar() {
  return (
    <div className="flex items-center justify-between px-6 pt-3 pb-1 bg-white text-black text-xs font-semibold">
      <span>9:41</span>
      <div className="flex items-center gap-1.5">
        <svg width="16" height="10" viewBox="0 0 16 10" fill="currentColor"><rect x="0" y="6" width="3" height="4" rx="0.5"/><rect x="4.5" y="4" width="3" height="6" rx="0.5"/><rect x="9" y="2" width="3" height="8" rx="0.5"/><rect x="13.5" y="0" width="3" height="10" rx="0.5"/></svg>
        <svg width="14" height="10" viewBox="0 0 14 10" fill="currentColor"><path d="M7 9.5a1 1 0 110-2 1 1 0 010 2zM3.5 6.5a4.95 4.95 0 017 0L9.5 5.5a3.5 3.5 0 00-5 0L3.5 6.5zM1.5 4.5a7.78 7.78 0 0111 0L11.5 3.5a6.25 6.25 0 00-9 0L1.5 4.5z"/></svg>
        <div className="flex items-center"><div className="w-6 h-3 border border-black rounded-[3px] relative"><div className="absolute inset-0.5 bg-black rounded-[1px]" style={{width: '75%'}}></div></div><div className="w-0.5 h-1.5 bg-black rounded-r ml-0.5"></div></div>
      </div>
    </div>
  );
}

function HomeHeader({ onSearch, cartCount, onCart, isAdmin, onAdmin, onLogout }: {
  onSearch: () => void; cartCount: number; onCart: () => void; isAdmin: boolean; onAdmin: () => void; onLogout: () => void;
}) {
  return (
    <div className="px-4 py-3 bg-white border-b border-[#e6e2d8] flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-black flex items-center justify-center">
          <Smartphone className="w-5 h-5 text-[#ffc400]" />
        </div>
        <div className="leading-none">
          <span className="block text-[20px] font-black tracking-tight text-black">Renew<span className="text-[#ffc400]">X</span></span>
          <span className="block text-[9px] font-bold tracking-[0.28em] text-black mt-0.5">CREW</span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={onSearch} className="w-10 h-10 rounded-xl border border-[#e5e1d8] flex items-center justify-center active:bg-[#fff8d8]"><Search className="w-5 h-5 text-black" /></button>
        {isAdmin && <button onClick={onAdmin} className="w-10 h-10 rounded-xl border border-[#e5e1d8] flex items-center justify-center active:bg-[#fff8d8]"><LayoutDashboard className="w-5 h-5 text-black" /></button>}
        <button onClick={onCart} className="w-10 h-10 rounded-xl border border-[#e5e1d8] flex items-center justify-center active:bg-[#fff8d8] relative">
          <ShoppingCart className="w-5 h-5 text-black" />
          {cartCount > 0 && <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-[#ffc400] rounded-full text-black text-[10px] font-bold flex items-center justify-center px-1">{cartCount}</span>}
        </button>
        <button onClick={onLogout} className="w-10 h-10 rounded-xl border border-[#e5e1d8] flex items-center justify-center active:bg-[#fff8d8]"><LogOut className="w-5 h-5 text-black" /></button>
      </div>
    </div>
  );
}

function HeroBanner() {
  return (
    <div className="mx-4 my-3 rounded-[28px] p-5 bg-white border border-[#e7e2d6] relative overflow-hidden shadow-[0_8px_24px_rgba(20,20,20,0.05)]">
      <div className="absolute -right-16 -top-10 w-52 h-52 rounded-full bg-[#fff2a8]"></div>
      <div className="absolute right-0 bottom-0 w-40 h-20 bg-[#ffc400] rounded-tl-[100%] opacity-90"></div>
      <div className="relative z-10 w-[62%]">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-black mb-3"><span className="w-2 h-2 rounded-full bg-[#ffc400]"></span> RenewX Crew</span>
        <h2 className="text-[25px] font-black text-black leading-[1.05] mb-3">Buy. Sell.<br />Upgrade.<br /><span className="relative inline-block px-1"><span className="absolute inset-x-0 bottom-0 h-3 bg-[#ffc400] -z-10 -rotate-1"></span>The Smart Way.</span></h2>
        <p className="text-xs text-[#4f4b42] leading-relaxed mb-4">Quality checked devices, fair value, and a smarter way to upgrade.</p>
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-black"><ShieldCheck className="w-4 h-4 text-black" /> Trusted & secure</div>
      </div>
      <img src="https://images.pexels.com/photos/18311092/pexels-photo-18311092.jpeg?auto=compress&cs=tinysrgb&w=600" alt="Featured renewed phone" className="absolute right-[-4px] bottom-5 w-[43%] h-44 object-cover rounded-[22px] rotate-6 shadow-xl" />
      <div className="absolute right-3 top-3 w-9 h-9 rounded-full bg-black flex items-center justify-center"><Smartphone className="w-4 h-4 text-[#ffc400]" /></div>
    </div>
  );
}

function CategoryPills({ active, onChange }: { active: string; onChange: (c: string) => void }) {
  return (
    <div className="py-2">
      <div className="flex gap-2 overflow-x-auto px-4 no-scrollbar">
        {staticCategories.map((cat) => {
          const Icon = iconMap[cat.icon] || Grid3x3;
          const isActive = active === cat.name;
          return (
            <button key={cat.name} onClick={() => onChange(cat.name)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full border whitespace-nowrap transition-all active:scale-95 ${isActive ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-gray-200 text-gray-500'}`}>
              <Icon className="w-3.5 h-3.5" /><span className="text-sm font-medium">{cat.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ProductCardGrid({ product, onPress, onAdd }: { product: Product; onPress: () => void; onAdd: () => void }) {
  const discount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
  const condClass = conditionColors[product.condition] || conditionColors.Good;
  return (
    <div className="bg-white rounded-[20px] overflow-hidden border border-[#ece8dc] mb-3 active:scale-[0.98] transition-transform">
      <div onClick={onPress} className="cursor-pointer relative aspect-square bg-[#f7f5ec]">
        <img src={product.image} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
        {discount > 0 && <div className="absolute top-2.5 left-2.5 bg-black px-2.5 py-1 rounded-full"><span className="text-[#ffc400] text-[11px] font-black">-{discount}%</span></div>}
        <div className={`absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full ${condClass}`}><span className="text-[11px] font-bold">{product.condition}</span></div>
      </div>
      <div className="p-3.5" onClick={onPress}>
        <div className="flex items-center gap-1 mb-1">
          <Star className="w-3 h-3 fill-[#ffc400] text-[#ffc400]" />
          <span className="text-[11px] font-bold text-black">{product.rating}</span>
          <span className="text-[11px] text-[#9b9588]">({product.reviews})</span>
          <span className="text-[11px] text-[#9b9588] ml-auto">{product.brand}</span>
        </div>
        <h3 className="text-[13px] font-bold text-black line-clamp-2 leading-[18px] mb-2">{product.name}</h3>
        <div className="flex items-center gap-1 mb-2.5">
          <ShieldCheck className="w-3 h-3 text-black" />
          <span className="text-[11px] text-[#6b675e]">{product.warrantyMonths}mo warranty</span>
          {product.stock <= 5 && <span className="text-[11px] text-[#c47e00] font-bold ml-auto">Only {product.stock} left</span>}
        </div>
        <div className="flex items-end justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-black text-black">${product.price}</span>
            <span className="text-[11px] text-[#9b9588] line-through">${product.originalPrice}</span>
          </div>
          <button onClick={(e) => { e.stopPropagation(); onAdd(); }} className="flex items-center gap-1 bg-black text-[#ffc400] px-3 py-2 rounded-lg active:scale-95 transition-transform">
            <ShoppingCart className="w-3.5 h-3.5" /><span className="text-[11px] font-bold">Add</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function HomeScreen({ products, onProductPress, onSearch, onCart, isAdmin, onAdmin, onLogout }: {
  products: Product[]; onProductPress: (p: Product) => void; onSearch: () => void; onCart: () => void; isAdmin: boolean; onAdmin: () => void; onLogout: () => void;
}) {
  const { addToCart, totalItems } = useCart();
  const [activeCategory, setActiveCategory] = useState('All');
  const filtered = useMemo(() => activeCategory === 'All' ? products : products.filter((p) => p.category === activeCategory), [activeCategory, products]);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <HomeHeader onSearch={onSearch} cartCount={totalItems} onCart={onCart} isAdmin={isAdmin} onAdmin={onAdmin} onLogout={onLogout} />
      <div className="flex-1 overflow-y-auto pb-20">
        <HeroBanner />
        <div className="flex items-baseline justify-between px-4 mb-1">
          <h2 className="text-xl font-bold text-gray-900">{activeCategory === 'All' ? 'All Products' : activeCategory}</h2>
          <span className="text-sm text-gray-400">{filtered.length} items</span>
        </div>
        <CategoryPills active={activeCategory} onChange={setActiveCategory} />
        <div className="grid grid-cols-2 gap-3 px-4">
          {filtered.map((p) => <ProductCardGrid key={p._uuid || p.id} product={p} onPress={() => onProductPress(p)} onAdd={() => addToCart(p)} />)}
        </div>
      </div>
    </div>
  );
}

function CategoriesScreen({ products, onProductPress }: { products: Product[]; onProductPress: (p: Product) => void }) {
  const [selected, setSelected] = useState('All');
  const filtered = useMemo(() => selected === 'All' ? products : products.filter((p) => p.category === selected), [selected, products]);
  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="px-4 py-3 bg-white"><h1 className="text-2xl font-bold text-gray-900">Categories</h1></div>
      <div className="flex-1 overflow-y-auto pb-20">
        <div className="flex flex-wrap gap-2.5 px-4 py-3">
          {staticCategories.map((cat) => {
            const Icon = iconMap[cat.icon] || Grid3x3;
            const isActive = selected === cat.name;
            const count = cat.name === 'All' ? products.length : products.filter((p) => p.category === cat.name).length;
            return (
              <button key={cat.name} onClick={() => setSelected(cat.name)}
                className={`flex flex-col items-center gap-1.5 py-4 px-2 rounded-2xl border w-[31.5%] transition-all active:scale-95 ${isActive ? 'bg-emerald-600 border-emerald-600' : 'bg-white border-gray-200'}`}>
                <Icon className={`w-6 h-6 ${isActive ? 'text-white' : 'text-emerald-600'}`} />
                <span className={`text-xs font-semibold ${isActive ? 'text-white' : 'text-gray-900'}`}>{cat.name}</span>
                <span className={`text-[10px] ${isActive ? 'text-white/80' : 'text-gray-400'}`}>{count} items</span>
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-3 px-4">
          {filtered.map((p) => (
            <div key={p._uuid || p.id} onClick={() => onProductPress(p)} className="bg-white rounded-2xl overflow-hidden border border-gray-200 mb-4 active:scale-[0.98] transition-transform cursor-pointer">
              <div className="aspect-square bg-gray-50"><img src={p.image} alt={p.name} className="w-full h-full object-cover" loading="lazy" /></div>
              <div className="p-3">
                <span className="text-[10px] text-gray-400">{p.brand}</span>
                <h3 className="text-xs font-semibold text-gray-900 line-clamp-2 leading-4 mb-1.5">{p.name}</h3>
                <span className="text-base font-bold text-gray-900">${p.price}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProductDetailScreen({ product, onBack, onAddToCart, onCart }: { product: Product; onBack: () => void; onAddToCart: () => void; onCart: () => void }) {
  const discount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
  const condClass = conditionColors[product.condition] || conditionColors.Good;
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="relative aspect-square bg-gray-50">
          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
          {discount > 0 && <div className="absolute top-3 left-3 bg-emerald-600 px-3.5 py-1.5 rounded-full"><span className="text-white text-sm font-bold">-{discount}%</span></div>}
          <button onClick={onBack} className="absolute top-12 left-3 w-10 h-10 rounded-full bg-white/90 flex items-center justify-center active:scale-90 transition-transform"><ArrowLeft className="w-5 h-5 text-gray-900" /></button>
        </div>
        <div className="p-6">
          <span className="text-sm text-gray-400 font-medium">{product.brand}</span>
          <h1 className="text-xl font-bold text-gray-900 leading-7 mt-1 mb-3">{product.name}</h1>
          <div className="flex items-center gap-1.5 mb-4">
            <div className="flex gap-0.5">{[1,2,3,4,5].map((n) => <Star key={n} className={`w-4 h-4 ${n <= Math.round(product.rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />)}</div>
            <span className="text-sm font-semibold text-gray-900">{product.rating}</span>
            <span className="text-sm text-gray-400">({product.reviews} reviews)</span>
            <span className={`ml-auto px-2.5 py-1 rounded-full text-[11px] font-semibold ${condClass}`}>{product.condition}</span>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed mb-6">{product.description}</p>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Key Specifications</h3>
          <div className="space-y-2.5 mb-6">
            {product.specs.map((spec, i) => <div key={i} className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /><span className="text-sm text-gray-600">{spec}</span></div>)}
          </div>
          <div className="flex flex-wrap gap-2.5">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 w-[47%]"><ShieldCheck className="w-5 h-5 text-emerald-600" /><span className="text-[11px] font-medium text-gray-900">{product.warrantyMonths}mo warranty</span></div>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 w-[47%]"><Truck className="w-5 h-5 text-emerald-600" /><span className="text-[11px] font-medium text-gray-900">Free shipping</span></div>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 w-[47%]"><RefreshCw className="w-5 h-5 text-emerald-600" /><span className="text-[11px] font-medium text-gray-900">14-day returns</span></div>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 w-[47%]"><Package className="w-5 h-5 text-emerald-600" /><span className="text-[11px] font-medium text-gray-900">{product.stock} in stock</span></div>
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 flex items-center gap-3 px-6 py-3.5 bg-white border-t border-gray-200">
        <div className="flex-1">
          <div className="flex items-baseline gap-2"><span className="text-2xl font-bold text-gray-900">${product.price}</span><span className="text-sm text-gray-400 line-through">${product.originalPrice}</span></div>
          <span className="text-[11px] text-emerald-600 font-semibold">Save ${product.originalPrice - product.price}</span>
        </div>
        <button onClick={() => { onAddToCart(); onCart(); }} className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3.5 rounded-full active:scale-95 transition-transform">
          <ShoppingCart className="w-5 h-5" /><span className="text-sm font-semibold">Add to Cart</span>
        </button>
      </div>
    </div>
  );
}

function CartScreen({ userId }: { userId: string }) {
  const { items, updateQuantity, removeFromCart, clearCart, subtotal, savings, totalItems } = useCart();
  const [checkoutDone, setCheckoutDone] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const handleCheckout = async () => {
    if (!window.confirm(`Place order for ${totalItems} items totaling $${subtotal.toFixed(0)}?`)) return;
    setCheckoutError(null);

    try {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({ user_id: userId, subtotal: Math.round(subtotal), savings: Math.round(savings), status: 'pending' })
        .select()
        .maybeSingle();

      if (orderError || !order) throw new Error('Failed to create order');

      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item._uuid || null,
        product_name: item.name,
        quantity: item.quantity,
        price: item.price,
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) throw new Error('Failed to create order items');

      setCheckoutDone(true);
      clearCart();
      setTimeout(() => setCheckoutDone(false), 3500);
    } catch {
      setCheckoutError('Could not complete checkout. Please try again.');
    }
  };

  if (checkoutDone) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50 px-8 text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-600 flex items-center justify-center mb-6"><CheckCircle2 className="w-12 h-12 text-white" /></div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Order Confirmed!</h2>
        <p className="text-sm text-gray-500 leading-relaxed">Thank you for choosing renewed tech. Your order is being processed.</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col h-full bg-gray-50">
        <div className="px-6 py-3 bg-white"><h1 className="text-2xl font-bold text-gray-900">Your Cart</h1></div>
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center pb-16">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4"><ShoppingCart className="w-10 h-10 text-gray-300" /></div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Your cart is empty</h2>
          <p className="text-sm text-gray-400">Browse renewed electronics and start saving.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex items-baseline gap-2 px-6 py-3 bg-white"><h1 className="text-2xl font-bold text-gray-900">Your Cart</h1><span className="text-sm text-gray-400">{totalItems} items</span></div>
      <div className="flex-1 overflow-y-auto p-4 pb-56">
        {items.map((item) => (
          <div key={item._uuid || item.id} className="flex gap-3 bg-white rounded-2xl p-3 mb-3 border border-gray-200">
            <img src={item.image} alt={item.name} className="rounded-xl object-cover" style={{ width: 72, height: 72 }} />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-5 mb-1">{item.name}</h3>
              <span className="text-[11px] text-gray-400">{item.brand} · {item.condition}</span>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-8 h-8 flex items-center justify-center bg-gray-50 active:bg-gray-100"><Minus className="w-3.5 h-3.5 text-gray-700" /></button>
                  <span className="px-2 text-sm font-medium text-gray-900 min-w-[28px] text-center">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-8 h-8 flex items-center justify-center bg-gray-50 active:bg-gray-100"><Plus className="w-3.5 h-3.5 text-gray-700" /></button>
                </div>
                <span className="text-base font-bold text-gray-900">${(item.price * item.quantity).toFixed(0)}</span>
                <button onClick={() => removeFromCart(item.id)} className="p-1 active:scale-90 transition-transform"><Trash2 className="w-4 h-4 text-red-500" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-200">
        {checkoutError && <div className="mb-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200"><p className="text-sm text-red-600">{checkoutError}</p></div>}
        {savings > 0 && <div className="flex justify-between mb-2"><span className="text-sm font-medium text-emerald-600">You're saving</span><span className="text-sm font-bold text-emerald-600">${savings.toFixed(0)}</span></div>}
        <div className="flex justify-between mb-2"><span className="text-sm text-gray-500">Subtotal</span><span className="text-sm font-semibold text-gray-900">${subtotal.toFixed(0)}</span></div>
        <div className="flex justify-between mb-3"><span className="text-sm text-gray-500">Shipping</span><span className="text-sm font-semibold text-emerald-600">Free</span></div>
        <div className="flex justify-between items-center pt-3 border-t border-gray-100 mb-3"><span className="text-lg font-bold text-gray-900">Total</span><span className="text-xl font-bold text-gray-900">${subtotal.toFixed(0)}</span></div>
        <button onClick={handleCheckout} className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-4 rounded-full active:scale-95 transition-transform mb-2"><span className="text-sm font-semibold">Checkout</span><ArrowLeft className="w-4 h-4 rotate-180" /></button>
        <div className="flex items-center justify-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-gray-400" /><span className="text-[11px] text-gray-400">Secure checkout · Warranty included</span></div>
      </div>
    </div>
  );
}

function SearchScreen({ products, onProductPress, onBack }: { products: Product[]; onProductPress: (p: Product) => void; onBack: () => void }) {
  const [query, setQuery] = useState('');
  const { addToCart } = useCart();
  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q));
  }, [query, products]);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex items-center gap-3 px-4 py-3 bg-white">
        <button onClick={onBack} className="w-10 h-10 rounded-full flex items-center justify-center active:bg-gray-100"><ArrowLeft className="w-5 h-5 text-gray-900" /></button>
        <div className="flex-1 flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-gray-50">
          <Search className="w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search renewed electronics..." value={query} onChange={(e) => setQuery(e.target.value)} autoFocus className="flex-1 bg-transparent text-sm text-gray-900 outline-none" />
          {query && <button onClick={() => setQuery('')}><X className="w-4 h-4 text-gray-400" /></button>}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto pb-20">
        {query.trim() === '' ? (
          <div className="flex flex-col items-center justify-center h-full px-8 text-center pb-16"><Search className="w-12 h-12 text-gray-200" /><h2 className="text-lg font-semibold text-gray-900 mt-4 mb-2">Search for products</h2><p className="text-sm text-gray-400">Find laptops, phones, audio, and more</p></div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-8 text-center pb-16"><X className="w-12 h-12 text-gray-200" /><h2 className="text-lg font-semibold text-gray-900 mt-4 mb-2">No results found</h2><p className="text-sm text-gray-400">Try a different search term</p></div>
        ) : (
          <>
            <p className="text-sm text-gray-400 px-4 py-2">{results.length} results for "{query}"</p>
            <div className="px-4 space-y-2.5">
              {results.map((item) => (
                <div key={item._uuid || item.id} onClick={() => onProductPress(item)} className="flex gap-3 bg-white rounded-2xl p-3 border border-gray-200 active:scale-[0.98] transition-transform cursor-pointer">
                  <img src={item.image} alt={item.name} className="rounded-xl object-cover" style={{ width: 72, height: 72 }} />
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] text-gray-400">{item.brand}</span>
                    <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-5 mb-2">{item.name}</h3>
                    <div className="flex items-center justify-between">
                      <div className="flex items-baseline gap-1.5"><span className="text-base font-bold text-gray-900">${item.price}</span><span className="text-[11px] text-gray-400 line-through">${item.originalPrice}</span></div>
                      <button onClick={(e) => { e.stopPropagation(); addToCart(item); }} className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center active:scale-90 transition-transform"><Plus className="w-4 h-4 text-white" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function BottomTabs({ active, onChange, cartCount, isAdmin }: { active: Tab; onChange: (t: Tab) => void; cartCount: number; isAdmin: boolean }) {
  const tabs: { key: Tab; label: string; icon: typeof HomeIcon }[] = [
    { key: 'home', label: 'Home', icon: HomeIcon },
    { key: 'categories', label: 'Categories', icon: Grid3x3 },
    { key: 'cart', label: 'Cart', icon: ShoppingCart },
    ...(isAdmin ? [{ key: 'admin' as Tab, label: 'Admin', icon: LayoutDashboard }] : []),
  ];

  return (
    <div className="flex items-center justify-around border-t border-gray-200 bg-white" style={{ paddingBottom: 8, paddingTop: 6, height: 60 }}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.key;
        return (
          <button key={tab.key} onClick={() => onChange(tab.key)} className="flex flex-col items-center gap-1 relative">
            <div className="relative">
              <Icon className={`w-6 h-6 ${isActive ? 'text-emerald-600' : 'text-gray-400'}`} />
              {tab.key === 'cart' && cartCount > 0 && <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 bg-emerald-600 rounded-full text-white text-[9px] font-bold flex items-center justify-center px-1">{cartCount}</span>}
            </div>
            <span className={`text-[10px] font-semibold ${isActive ? 'text-emerald-600' : 'text-gray-400'}`}>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function MobileAppContent() {
  const { user, profile, isAdmin, loading, signOut } = useAuth();
  const [screen, setScreen] = useState<Screen>('home');
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const { addToCart, totalItems } = useCart();
  const [products, setProducts] = useState<Product[]>([]);

  const fetchProducts = useCallback(async () => {
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: true });
    if (data) setProducts((data as ProductRow[]).map(mapRow));
  }, []);

  useEffect(() => {
    if (user) fetchProducts();
  }, [user, fetchProducts]);

  const goTab = (tab: Tab) => { setActiveTab(tab); setScreen(tab); };
  const openProduct = (p: Product) => { setSelectedProduct(p); setScreen('detail'); };

  if (loading) {
    return <div className="flex items-center justify-center h-full bg-gray-50"><RefreshCw className="w-8 h-8 text-gray-300 animate-spin" /></div>;
  }

  if (!user) return <AuthScreen />;

  const renderScreen = () => {
    switch (screen) {
      case 'home': return <HomeScreen products={products} onProductPress={openProduct} onSearch={() => setScreen('search')} onCart={() => goTab('cart')} isAdmin={isAdmin} onAdmin={() => goTab('admin')} onLogout={signOut} />;
      case 'categories': return <CategoriesScreen products={products} onProductPress={openProduct} />;
      case 'cart': return <CartScreen userId={user.id} />;
      case 'search': return <SearchScreen products={products} onProductPress={openProduct} onBack={() => goTab('home')} />;
      case 'admin': return isAdmin ? <AdminPanel onExit={() => goTab('home')} /> : <HomeScreen products={products} onProductPress={openProduct} onSearch={() => setScreen('search')} onCart={() => goTab('cart')} isAdmin={isAdmin} onAdmin={() => goTab('admin')} onLogout={signOut} />;
      case 'detail': return selectedProduct ? <ProductDetailScreen product={selectedProduct} onBack={() => goTab('home')} onAddToCart={() => addToCart(selectedProduct)} onCart={() => goTab('cart')} /> : null;
      default: return <HomeScreen products={products} onProductPress={openProduct} onSearch={() => setScreen('search')} onCart={() => goTab('cart')} isAdmin={isAdmin} onAdmin={() => goTab('admin')} onLogout={signOut} />;
    }
  };

  const showTabs = screen === 'home' || screen === 'categories' || screen === 'cart' || (isAdmin && screen === 'admin');

  return (
    <div className="flex flex-col w-full h-full bg-white overflow-hidden relative">
      <StatusBar />
      <div className="flex-1 overflow-hidden relative">{renderScreen()}</div>
      {showTabs && <BottomTabs active={activeTab} onChange={goTab} cartCount={totalItems} isAdmin={isAdmin} />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <div className="min-h-screen bg-gray-200 flex items-center justify-center p-4 md:p-8" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #e5e7eb 0%, #d1d5db 100%)' }}>
          <div className="hidden md:block absolute top-8 left-8 text-gray-500 max-w-xs">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">RenewX Mobile</h1>
            <p className="text-sm text-gray-500">Sign in to shop. The first account created becomes the admin and can manage products from the Admin tab.</p>
          </div>
          <div className="relative bg-black rounded-[3rem] p-2.5 shadow-2xl" style={{ width: '100%', maxWidth: 390, aspectRatio: '390 / 844', maxHeight: 'calc(100vh - 2rem)' }}>
            <div className="relative w-full h-full bg-white rounded-[2.5rem] overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-black rounded-b-2xl z-50"></div>
              <div className="w-full h-full overflow-hidden"><MobileAppContent /></div>
            </div>
          </div>
        </div>
      </CartProvider>
    </AuthProvider>
  );
}
