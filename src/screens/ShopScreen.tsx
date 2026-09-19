import { useState, useMemo } from 'react';
import type { Product } from '@/types';
import {
  Search,
  Filter,
  Heart,
  Share2,
  ShoppingBag,
  Star,
  Check,
  Smartphone,
  Menu,
} from 'lucide-react';
import { useCart } from '@/context/CartContext';

interface ShopScreenProps {
  products: Product[];
  onProductPress: (p: Product) => void;
  onCart: () => void;
  onSearch: () => void;
  onAccount?: () => void;
  onAdmin?: () => void;
  isAdmin?: boolean;
}

const CATEGORY_CHIPS = [
  { id: 'All', label: 'All Devices' },
  { id: 'Smartphones', label: 'Smartphones' },
  { id: 'MacBooks', label: 'MacBooks' },
  { id: 'Laptops', label: 'Laptops' },
  { id: 'Audio', label: 'Audio' },
  { id: 'Wearables', label: 'Wearables' },
  { id: 'Cameras', label: 'Cameras' },
  { id: 'Tablets', label: 'Tablets' },
  { id: 'Consoles', label: 'Consoles' },
];

const BRANDS = ['All Brands', 'Apple', 'Samsung', 'Google', 'OnePlus', 'Sony', 'Dell', 'HP', 'Lenovo'];

export default function ShopScreen({
  products,
  onProductPress,
  onCart,
  onSearch,
  onAccount,
  onAdmin,
  isAdmin,
}: ShopScreenProps) {
  const { addToCart, totalItems } = useCart();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('All Brands');
  const [sortBy, setSortBy] = useState<'featured' | 'low-high' | 'high-low' | 'discount'>('featured');
  const [wishlist, setWishlist] = useState<Record<string | number, boolean>>({});
  const [addedMap, setAddedMap] = useState<Record<string | number, boolean>>({});

  const toggleWishlist = (e: React.MouseEvent, id: string | number) => {
    e.stopPropagation();
    setWishlist((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleShare = async (e: React.MouseEvent, p: Product) => {
    e.stopPropagation();
    if (navigator.share) {
      try {
        await navigator.share({
          title: p.name,
          text: `Check out this certified ${p.name} on RenewX!`,
          url: window.location.href,
        });
      } catch {
        // User cancelled or not supported
      }
    } else {
      await navigator.clipboard?.writeText(window.location.href);
      alert(`Copied link for ${p.name}`);
    }
  };

  const handleAdd = (e: React.MouseEvent, p: Product) => {
    e.stopPropagation();
    addToCart(p);
    const key = p._uuid || p.id;
    setAddedMap((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setAddedMap((prev) => ({ ...prev, [key]: false }));
    }, 1500);
  };

  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Category filter
        if (selectedCategory === 'MacBooks') {
          if (!p.name.toLowerCase().includes('macbook') && p.category !== 'Laptops') return false;
        } else if (selectedCategory === 'Smartphones') {
          if (p.category !== 'Phones' && p.category !== 'Smartphones') return false;
        } else if (selectedCategory !== 'All') {
          if (p.category !== selectedCategory) return false;
        }

        // Brand filter
        if (selectedBrand !== 'All Brands') {
          if (p.brand.toLowerCase() !== selectedBrand.toLowerCase()) return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = p.name.toLowerCase().includes(q);
          const matchBrand = p.brand.toLowerCase().includes(q);
          const matchDesc = p.description?.toLowerCase().includes(q);
          if (!matchName && !matchBrand && !matchDesc) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'low-high') return a.price - b.price;
        if (sortBy === 'high-low') return b.price - a.price;
        if (sortBy === 'discount') {
          const discA = a.originalPrice ? (a.originalPrice - a.price) / a.originalPrice : 0;
          const discB = b.originalPrice ? (b.originalPrice - b.price) / b.originalPrice : 0;
          return discB - discA;
        }
        return 0;
      });
  }, [products, selectedCategory, selectedBrand, searchQuery, sortBy]);

  return (
    <div className="flex flex-col h-full bg-[#f8fafc]">
      {/* Top Header Bar */}
      <div className="px-4 py-3 bg-white border-b border-gray-200 flex items-center justify-between sticky top-0 z-20 shadow-xs">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-black flex items-center justify-center text-[#ffc400] font-black text-sm shadow-sm">
            <Smartphone className="w-4 h-4 text-[#ffc400]" />
          </div>
          <div>
            <div className="flex items-center text-sm font-black text-gray-900 leading-none">
              Renew<span className="text-[#ffc400]">X</span>
            </div>
            <span className="text-[9px] font-black tracking-widest text-gray-500 uppercase">
              CREW
            </span>
          </div>
        </div>

        {/* Header Icons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onSearch}
            className="w-9 h-9 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-600 active:scale-90 transition-transform"
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            onClick={onCart}
            className="w-9 h-9 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-600 relative active:scale-90 transition-transform"
          >
            <ShoppingBag className="w-4 h-4" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#ffc400] text-black font-black text-[9px] rounded-full flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </button>
          <button
            onClick={onAccount}
            className="w-9 h-9 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-sm font-bold text-gray-800 active:scale-90 transition-transform"
          >
            🧑
          </button>
          {isAdmin && (
            <button
              onClick={onAdmin}
              className="w-9 h-9 rounded-full bg-black text-[#ffc400] flex items-center justify-center active:scale-90 transition-transform"
              title="Admin Panel"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-24">
        {/* Category Horizontal Filter Chips */}
        <div className="py-3 px-4 flex gap-2 overflow-x-auto no-scrollbar border-b border-gray-100 bg-white">
          {CATEGORY_CHIPS.map((chip) => {
            const isActive = selectedCategory === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => setSelectedCategory(chip.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all active:scale-95 ${
                  isActive
                    ? 'bg-black text-white shadow-sm'
                    : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-400'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* Search & Filter Controls Container */}
        <div className="p-4">
          <div className="bg-white rounded-2xl p-3 border border-gray-200 shadow-sm space-y-2.5">
            {/* Search Input */}
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200">
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search phones, MacBooks, laptops, consoles..."
                className="flex-1 bg-transparent text-xs text-gray-900 outline-none placeholder:text-gray-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-gray-400 hover:text-gray-700"
                >
                  ×
                </button>
              )}
            </div>

            {/* Filter Sub-Row */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectedCategory('All');
                  setSelectedBrand('All Brands');
                  setSearchQuery('');
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 active:scale-95 transition-transform hover:bg-gray-50"
              >
                <Filter className="w-3.5 h-3.5 text-gray-500" />
                <span>Filters</span>
              </button>

              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 outline-none cursor-pointer hover:bg-gray-50"
              >
                {BRANDS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 outline-none cursor-pointer hover:bg-gray-50"
              >
                <option value="featured">Featured</option>
                <option value="low-high">Price: Low to High</option>
                <option value="high-low">Price: High to Low</option>
                <option value="discount">Biggest Discount</option>
              </select>
            </div>
          </div>
        </div>

        {/* Product Cards Feed matching Screenshot 1 */}
        <div className="px-4 space-y-4">
          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-gray-200 shadow-sm">
              <ShoppingBag className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-700">No matching products found</p>
              <p className="text-xs text-gray-400 mt-1">Try adjusting your filters or search query.</p>
              <button
                onClick={() => {
                  setSelectedCategory('All');
                  setSelectedBrand('All Brands');
                  setSearchQuery('');
                }}
                className="mt-4 px-4 py-2 bg-black text-[#ffc400] text-xs font-bold rounded-xl active:scale-95"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            filteredProducts.map((p) => {
              const key = p._uuid || p.id;
              const isLiked = !!wishlist[key];
              const isAdded = !!addedMap[key];
              const conditionGrade = p.condition === 'Like New' ? 'Grade A+' : `Grade ${p.condition || 'A'}`;
              const discountPercent = p.originalPrice
                ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
                : 0;

              return (
                <div
                  key={key}
                  onClick={() => onProductPress(p)}
                  className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-[0.99]"
                >
                  {/* Upper Card Area: Subtle Cream Background with Photography & Badges */}
                  <div className="bg-[#fffdf0] p-4 relative flex items-center justify-center min-h-[220px]">
                    {/* Grade Pill (Top-Left) */}
                    <div className="absolute top-3.5 left-3.5 px-3 py-1 rounded-full bg-[#fefce8] border border-[#fef08a] shadow-xs">
                      <span className="text-[11px] font-black text-gray-900 tracking-wide">
                        {conditionGrade}
                      </span>
                    </div>

                    {/* Wishlist & Share Squircle Buttons (Top-Right) */}
                    <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5 z-10">
                      <button
                        onClick={(e) => toggleWishlist(e, key)}
                        className="w-8 h-8 rounded-full bg-white/90 shadow-sm border border-gray-200 flex items-center justify-center active:scale-90 transition-transform"
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            isLiked ? 'text-red-500 fill-red-500' : 'text-gray-600'
                          }`}
                        />
                      </button>
                      <button
                        onClick={(e) => handleShare(e, p)}
                        className="w-8 h-8 rounded-full bg-white/90 shadow-sm border border-gray-200 flex items-center justify-center active:scale-90 transition-transform text-gray-600"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Product Image */}
                    <img
                      src={p.image}
                      alt={p.name}
                      className="max-h-44 max-w-full object-contain drop-shadow-sm transition-transform hover:scale-105"
                      loading="lazy"
                    />
                  </div>

                  {/* Lower Card Area: Product Details */}
                  <div className="p-4 bg-white border-t border-gray-100">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                          {p.brand}
                        </p>
                        <h3 className="text-base font-extrabold text-gray-900 tracking-tight truncate mt-0.5">
                          {p.name}
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {p.description || 'Clean Condition'}
                        </p>
                      </div>

                      {/* Star Rating */}
                      <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex-shrink-0">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        <span className="text-[11px] font-extrabold text-amber-900">
                          {p.rating || 4.9}
                        </span>
                      </div>
                    </div>

                    {/* Price & Add Action Row */}
                    <div className="flex items-center justify-between mt-3.5 pt-3 border-t border-gray-100">
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-black text-gray-900">
                            ₹{p.price.toLocaleString('en-IN')}
                          </span>
                          {p.originalPrice && p.originalPrice > p.price && (
                            <span className="text-xs text-gray-400 line-through">
                              ₹{p.originalPrice.toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>
                        {discountPercent > 0 && (
                          <span className="text-[11px] font-black text-emerald-600 block mt-0.5">
                            Save {discountPercent}%
                          </span>
                        )}
                      </div>

                      {/* Rounded Yellow Add Button matching Screenshot */}
                      <button
                        onClick={(e) => handleAdd(e, p)}
                        disabled={isAdded}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#ffc400] text-black font-extrabold text-xs active:scale-95 transition-transform hover:bg-[#ffcd1a] shadow-xs"
                      >
                        {isAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-black stroke-[3]" />
                            <span>Added</span>
                          </>
                        ) : (
                          <>
                            <ShoppingBag className="w-3.5 h-3.5 text-black stroke-[2.5]" />
                            <span>Add</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
