import { useState, useMemo } from 'react';
import type { Product } from '@/types';
import { useCart } from '@/context/CartContext';
import { Search, ArrowLeft, X, Plus } from 'lucide-react';

interface SearchScreenProps {
  products: Product[];
  onProductPress: (p: Product) => void;
  onBack: () => void;
}

export default function SearchScreen({ products, onProductPress, onBack }: SearchScreenProps) {
  const [query, setQuery] = useState('');
  const { addToCart } = useCart();
  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q)
    );
  }, [query, products]);

  return (
    <div className="flex flex-col h-full bg-[#f8f7f2]">
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-[#e6e2d8]">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full flex items-center justify-center active:bg-gray-100"
        >
          <ArrowLeft className="w-5 h-5 text-gray-900" />
        </button>
        <div className="flex-1 flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#f8f7f2] border border-[#ece8dc]">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search renewed tech..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="flex-1 bg-transparent text-sm text-gray-900 outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')}>
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto pb-20">
        {query.trim() === '' ? (
          <div className="flex flex-col items-center justify-center h-full px-8 text-center pb-16">
            <Search className="w-12 h-12 text-gray-300" />
            <h2 className="text-base font-bold text-gray-900 mt-4 mb-1">Search for products</h2>
            <p className="text-xs text-gray-400">Find laptops, phones, audio, and more</p>
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-8 text-center pb-16">
            <X className="w-12 h-12 text-gray-300" />
            <h2 className="text-base font-bold text-gray-900 mt-4 mb-1">No results found</h2>
            <p className="text-xs text-gray-400">Try a different search term</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 px-4 py-2">
              {results.length} results for "{query}"
            </p>
            <div className="px-4 space-y-2.5">
              {results.map((item) => (
                <div
                  key={item._uuid || item.id}
                  onClick={() => onProductPress(item)}
                  className="flex gap-3 bg-white rounded-2xl p-3 border border-[#ece8dc] active:scale-[0.98] transition-transform cursor-pointer"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="rounded-xl object-cover bg-[#f7f5ec]"
                    style={{ width: 72, height: 72 }}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] text-gray-400 uppercase font-bold">
                      {item.brand}
                    </span>
                    <h3 className="text-sm font-bold text-gray-900 line-clamp-2 leading-5 mb-2">
                      {item.name}
                    </h3>
                    <div className="flex items-center justify-between">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-base font-black text-gray-900">${item.price}</span>
                        <span className="text-[11px] text-gray-400 line-through">
                          ${item.originalPrice}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(item);
                        }}
                        className="w-8 h-8 rounded-full bg-black flex items-center justify-center active:scale-90 transition-transform"
                      >
                        <Plus className="w-4 h-4 text-[#ffc400]" />
                      </button>
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
