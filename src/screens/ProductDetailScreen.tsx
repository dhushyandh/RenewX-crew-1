import type { Product } from '@/types';
import { conditionColors } from '@/components/ProductCardGrid';
import {
  ArrowLeft,
  Star,
  ShieldCheck,
  Truck,
  RefreshCw,
  Package,
  ShoppingCart,
  CheckCircle2,
} from 'lucide-react';

interface ProductDetailScreenProps {
  product: Product;
  onBack: () => void;
  onAddToCart: () => void;
  onCart: () => void;
}

export default function ProductDetailScreen({
  product,
  onBack,
  onAddToCart,
  onCart,
}: ProductDetailScreenProps) {
  const discount = Math.round(
    ((product.originalPrice - product.price) / product.originalPrice) * 100
  );
  const condClass = conditionColors[product.condition] || conditionColors.Good;

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="relative aspect-square bg-[#f7f5ec]">
          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
          {discount > 0 && (
            <div className="absolute top-3 left-3 bg-black px-3.5 py-1.5 rounded-full">
              <span className="text-[#ffc400] text-xs font-black">-{discount}%</span>
            </div>
          )}
          <button
            onClick={onBack}
            className="absolute top-12 left-3 w-10 h-10 rounded-full bg-white/90 border border-gray-200 flex items-center justify-center active:scale-90 transition-transform"
          >
            <ArrowLeft className="w-5 h-5 text-gray-900" />
          </button>
        </div>
        <div className="p-6">
          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">
            {product.brand}
          </span>
          <h1 className="text-xl font-bold text-gray-900 leading-7 mt-1 mb-3">{product.name}</h1>
          <div className="flex items-center gap-1.5 mb-4">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  className={`w-4 h-4 ${
                    n <= Math.round(product.rating)
                      ? 'fill-[#ffc400] text-[#ffc400]'
                      : 'text-gray-200'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm font-semibold text-gray-900">{product.rating}</span>
            <span className="text-sm text-gray-400">({product.reviews} reviews)</span>
            <span className={`ml-auto px-2.5 py-1 rounded-full text-[11px] font-semibold ${condClass}`}>
              {product.condition}
            </span>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed mb-6">{product.description}</p>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Key Specifications</h3>
          <div className="space-y-2.5 mb-6">
            {product.specs.map((spec, i) => (
              <div key={i} className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-sm text-gray-600">{spec}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2.5">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 w-[47%]">
              <ShieldCheck className="w-5 h-5 text-black" />
              <span className="text-[11px] font-bold text-gray-900">
                {product.warrantyMonths}mo warranty
              </span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 w-[47%]">
              <Truck className="w-5 h-5 text-black" />
              <span className="text-[11px] font-bold text-gray-900">Free shipping</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 w-[47%]">
              <RefreshCw className="w-5 h-5 text-black" />
              <span className="text-[11px] font-bold text-gray-900">14-day returns</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 w-[47%]">
              <Package className="w-5 h-5 text-black" />
              <span className="text-[11px] font-bold text-gray-900">{product.stock} in stock</span>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 flex items-center gap-3 px-6 py-3.5 bg-white border-t border-gray-200">
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900">${product.price}</span>
            <span className="text-sm text-gray-400 line-through">${product.originalPrice}</span>
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold">
            Save ${product.originalPrice - product.price}
          </span>
        </div>
        <button
          onClick={() => {
            onAddToCart();
            onCart();
          }}
          className="flex items-center gap-2 bg-black text-[#ffc400] px-6 py-3.5 rounded-full active:scale-95 transition-transform"
        >
          <ShoppingCart className="w-5 h-5" />
          <span className="text-sm font-bold">Add to Cart</span>
        </button>
      </div>
    </div>
  );
}
