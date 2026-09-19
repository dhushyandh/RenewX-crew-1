import { useEffect } from 'react';
import { X, Star, ShoppingCart, Shield, Truck, RotateCw, Check } from 'lucide-react';
import type { Product } from '@/types';
import { useCart } from '@/context/CartContext';

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
}

const conditionColors: Record<string, string> = {
  'Like New': 'bg-emerald-100 text-emerald-700',
  Excellent: 'bg-teal-100 text-teal-700',
  Good: 'bg-blue-100 text-blue-700',
  Fair: 'bg-amber-100 text-amber-700',
};

export default function ProductModal({ product, onClose }: ProductModalProps) {
  const { addToCart, setIsCartOpen } = useCart();

  useEffect(() => {
    if (product) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [product]);

  if (!product) return null;

  const discount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);

  const handleAdd = () => {
    addToCart(product);
    onClose();
    setIsCartOpen(true);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="grid md:grid-cols-2 gap-0">
          <div className="relative aspect-square md:aspect-auto bg-gray-50 overflow-hidden rounded-t-3xl md:rounded-l-3xl md:rounded-tr-none">
            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
            {discount > 0 && (
              <span className="absolute top-4 left-4 bg-emerald-600 text-white text-sm font-bold px-3 py-1.5 rounded-full shadow-lg">
                -{discount}%
              </span>
            )}
          </div>

          <div className="p-6 md:p-8 flex flex-col">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <span className="text-sm font-medium text-gray-400">{product.brand}</span>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight mt-0.5">
                  {product.name}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors shrink-0"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-0.5">
                {[1,2,3,4,5].map((n) => (
                  <Star
                    key={n}
                    className={`w-4 h-4 ${n <= Math.round(product.rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`}
                  />
                ))}
              </div>
              <span className="text-sm font-medium text-gray-700">{product.rating}</span>
              <span className="text-sm text-gray-400">({product.reviews} reviews)</span>
              <span className={`ml-auto text-xs font-semibold px-2.5 py-1 rounded-full ${conditionColors[product.condition]}`}>
                {product.condition}
              </span>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed mb-5">
              {product.description}
            </p>

            <div className="space-y-2 mb-5">
              <h4 className="text-sm font-semibold text-gray-900">Key Specifications</h4>
              <div className="grid grid-cols-1 gap-1.5">
                {product.specs.map((spec) => (
                  <div key={spec} className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    {spec}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50">
                <Shield className="w-5 h-5 text-emerald-600" />
                <span className="text-xs font-medium text-gray-700">{product.warrantyMonths}mo warranty</span>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50">
                <Truck className="w-5 h-5 text-emerald-600" />
                <span className="text-xs font-medium text-gray-700">Free shipping</span>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50">
                <RotateCw className="w-5 h-5 text-emerald-600" />
                <span className="text-xs font-medium text-gray-700">14-day returns</span>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50">
                <Check className="w-5 h-5 text-emerald-600" />
                <span className="text-xs font-medium text-gray-700">{product.stock} in stock</span>
              </div>
            </div>

            <div className="mt-auto">
              <div className="flex items-baseline gap-3 mb-4">
                <span className="text-3xl font-bold text-gray-900">${product.price}</span>
                <span className="text-base text-gray-400 line-through">${product.originalPrice}</span>
                <span className="text-sm font-semibold text-emerald-600">
                  Save ${product.originalPrice - product.price}
                </span>
              </div>
              <button
                onClick={handleAdd}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 active:scale-[0.98]"
              >
                <ShoppingCart className="w-5 h-5" />
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
