import { Star, ShoppingCart, Shield, Check } from 'lucide-react';
import type { Product } from '@/types';
import { useCart } from '@/context/CartContext';
import { getCategoryFallback, handleImageError } from '@/lib/imageFallback';

interface ProductCardProps {
  product: Product;
  onClick: () => void;
}

const conditionColors: Record<string, string> = {
  'Like New': 'bg-emerald-100 text-emerald-700',
  Excellent: 'bg-teal-100 text-teal-700',
  Good: 'bg-blue-100 text-blue-700',
  Fair: 'bg-amber-100 text-amber-700',
};

export default function ProductCard({ product, onClick }: ProductCardProps) {
  const { addToCart } = useCart();
  const isSoldOut = Boolean((product as any)?.is_sold_out || (product as any)?.isSoldOut || (product as any)?.status === 'sold_out');
  const discount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product);
  };

  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-xl hover:shadow-gray-200/60 hover:border-gray-300 transition-all duration-300 cursor-pointer hover:-translate-y-1"
    >
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        <img
          src={product.image || getCategoryFallback(product.category, product.name)}
          alt={product.name}
          loading="lazy"
          onError={(e) => handleImageError(e, product.category, product.name)}
          className={`w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-500 ${isSoldOut ? 'opacity-50' : ''}`}
        />
        {isSoldOut ? (
          <span className="absolute top-3 left-3 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-md">
            SOLD OUT
          </span>
        ) : discount > 0 ? (
          <span className="absolute top-3 left-3 bg-emerald-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-md">
            -{discount}%
          </span>
        ) : null}
        <span className={`absolute top-3 right-3 text-xs font-semibold px-2.5 py-1 rounded-full ${conditionColors[product.condition]}`}>
          {product.condition}
        </span>
      </div>

      <div className="p-4">
        <div className="flex items-center gap-1 mb-1.5">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span className="text-xs font-medium text-gray-600">{product.rating}</span>
          <span className="text-xs text-gray-400">({product.reviews})</span>
          <span className="ml-auto text-xs font-medium text-gray-400">{product.brand}</span>
        </div>

        <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-2 line-clamp-2 group-hover:text-emerald-600 transition-colors">
          {product.name}
        </h3>

        <div className="flex items-center gap-1.5 mb-3 text-xs text-gray-500">
          <Shield className="w-3.5 h-3.5 text-emerald-500" />
          <span>{product.warrantyMonths}mo warranty</span>
          {product.stock <= 5 && (
            <span className="text-amber-600 font-medium ml-auto">Only {product.stock} left</span>
          )}
        </div>

        <div className="flex items-end justify-between gap-2">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-gray-900">${product.price}</span>
              <span className="text-xs text-gray-400 line-through">${product.originalPrice}</span>
            </div>
          </div>
          <button
            onClick={handleAdd}
            disabled={isSoldOut}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all active:scale-95 ${
              isSoldOut
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-900 hover:bg-emerald-600 text-white'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            {isSoldOut ? 'Sold Out' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}
