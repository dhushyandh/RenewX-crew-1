import { useState, useMemo } from 'react';
import type { Product } from '@/types';
import { staticCategories, iconMap } from '@/components/CategoryPills';
import { Grid3x3 } from 'lucide-react';

interface CategoriesScreenProps {
  products: Product[];
  onProductPress: (p: Product) => void;
}

export default function CategoriesScreen({ products, onProductPress }: CategoriesScreenProps) {
  const [selected, setSelected] = useState('All');
  const filtered = useMemo(
    () => (selected === 'All' ? products : products.filter((p) => p.category === selected)),
    [selected, products]
  );

  return (
    <div className="flex flex-col h-full bg-[#f8f7f2]">
      <div className="px-4 py-3 bg-white border-b border-[#e6e2d8]">
        <h1 className="text-xl font-bold text-gray-900">Categories</h1>
      </div>
      <div className="flex-1 overflow-y-auto pb-20">
        <div className="flex flex-wrap gap-2.5 px-4 py-3">
          {staticCategories.map((cat) => {
            const Icon = iconMap[cat.icon] || Grid3x3;
            const isActive = selected === cat.name;
            const count =
              cat.name === 'All'
                ? products.length
                : products.filter((p) => p.category === cat.name).length;
            return (
              <button
                key={cat.name}
                onClick={() => setSelected(cat.name)}
                className={`flex flex-col items-center gap-1.5 py-4 px-2 rounded-2xl border w-[31.5%] transition-all active:scale-95 ${
                  isActive ? 'bg-black border-black text-white' : 'bg-white border-[#e5e1d8]'
                }`}
              >
                <Icon className={`w-6 h-6 ${isActive ? 'text-[#ffc400]' : 'text-black'}`} />
                <span
                  className={`text-xs font-semibold ${
                    isActive ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  {cat.name}
                </span>
                <span
                  className={`text-[10px] ${isActive ? 'text-white/80' : 'text-gray-400'}`}
                >
                  {count} items
                </span>
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-3 px-4">
          {filtered.map((p) => (
            <div
              key={p._uuid || p.id}
              onClick={() => onProductPress(p)}
              className="bg-white rounded-2xl overflow-hidden border border-[#e5e1d8] mb-4 active:scale-[0.98] transition-transform cursor-pointer"
            >
              <div className="aspect-square bg-[#f7f5ec]">
                <img
                  src={p.image}
                  alt={p.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="p-3">
                <span className="text-[10px] text-gray-400">{p.brand}</span>
                <h3 className="text-xs font-bold text-gray-900 line-clamp-2 leading-4 mb-1.5">
                  {p.name}
                </h3>
                <span className="text-base font-black text-gray-900">${p.price}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
