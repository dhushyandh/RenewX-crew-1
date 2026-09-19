import type { Product } from '@/types';
import { Star, ShieldCheck, ShoppingCart } from 'lucide-react';

export const conditionColors: Record<string, string> = {
  'Like New': 'bg-emerald-100 text-emerald-700',
  Excellent: 'bg-teal-100 text-teal-700',
  Good: 'bg-blue-100 text-blue-700',
  Fair: 'bg-amber-100 text-amber-700',
};

interface ProductCardGridProps {
  product: Product;
  onPress: () => void;
  onAdd: () => void;
}

export default function ProductCardGrid({ product, onPress, onAdd }: ProductCardGridProps) {
  const discount = Math.round(
    ((product.originalPrice - product.price) / product.originalPrice) * 100
  );
  const condClass = conditionColors[product.condition] || conditionColors.Good;

  return (
    <div className="bg-white rounded-[20px] overflow-hidden border border-[#ece8dc] mb-3 active:scale-[0.98] transition-transform">
      <div onClick={onPress} className="cursor-pointer relative aspect-square bg-[#f7f5ec]">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {discount > 0 && (
          <div className="absolute top-2.5 left-2.5 bg-black px-2.5 py-1 rounded-full">
            <span className="text-[#ffc400] text-[11px] font-black">-{discount}%</span>
          </div>
        )}
        <div className={`absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full ${condClass}`}>
          <span className="text-[11px] font-bold">{product.condition}</span>
        </div>
      </div>
      <div className="p-3.5" onClick={onPress}>
        <div className="flex items-center gap-1 mb-1">
          <Star className="w-3 h-3 fill-[#ffc400] text-[#ffc400]" />
          <span className="text-[11px] font-bold text-black">{product.rating}</span>
          <span className="text-[11px] text-[#9b9588]">({product.reviews})</span>
          <span className="text-[11px] text-[#9b9588] ml-auto">{product.brand}</span>
        </div>
        <h3 className="text-[13px] font-bold text-black line-clamp-2 leading-[18px] mb-2">
          {product.name}
        </h3>
        <div className="flex items-center gap-1 mb-2.5">
          <ShieldCheck className="w-3 h-3 text-black" />
          <span className="text-[11px] text-[#6b675e]">{product.warrantyMonths}mo warranty</span>
          {product.stock <= 5 && (
            <span className="text-[11px] text-[#c47e00] font-bold ml-auto">
              Only {product.stock} left
            </span>
          )}
        </div>
        <div className="flex items-end justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-black text-black">${product.price}</span>
            <span className="text-[11px] text-[#9b9588] line-through">${product.originalPrice}</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAdd();
            }}
            className="flex items-center gap-1 bg-black text-[#ffc400] px-3 py-2 rounded-lg active:scale-95 transition-transform"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span className="text-[11px] font-bold">Add</span>
          </button>
        </div>
      </div>
    </div>
  );
}
