import { useEffect } from 'react';
import { X, Plus, Minus, Trash2, ShoppingBag, Shield, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useState } from 'react';

export default function CartDrawer() {
  const { items, isCartOpen, setIsCartOpen, updateQuantity, removeFromCart, subtotal, savings, totalItems, clearCart } = useCart();
  const [checkoutDone, setCheckoutDone] = useState(false);

  useEffect(() => {
    if (isCartOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isCartOpen]);

  if (!isCartOpen) return null;

  const handleCheckout = () => {
    setCheckoutDone(true);
    clearCart();
    setTimeout(() => {
      setCheckoutDone(false);
      setIsCartOpen(false);
    }, 2500);
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={() => setIsCartOpen(false)}
      />
      <div className="fixed right-0 top-0 bottom-0 z-[95] w-full max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-gray-900">Your Cart</h2>
            {totalItems > 0 && <span className="text-sm text-gray-400">({totalItems})</span>}
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {checkoutDone ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Order Confirmed!</h3>
            <p className="text-sm text-gray-500">Thank you for choosing renewed tech. Your order is being processed.</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <ShoppingBag className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Your cart is empty</h3>
            <p className="text-sm text-gray-500 mb-6">Browse our renewed electronics and start saving.</p>
            <button
              onClick={() => setIsCartOpen(false)}
              className="px-6 py-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-all"
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3 group">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-50 shrink-0">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-gray-900 leading-snug truncate">{item.name}</h4>
                    <p className="text-xs text-gray-400 mb-2">{item.brand} · {item.condition}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 border border-gray-200 rounded-lg">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-1.5 hover:bg-gray-50 rounded-l-lg transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5 text-gray-600" />
                        </button>
                        <span className="px-2 text-sm font-medium text-gray-900 min-w-[28px] text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-1.5 hover:bg-gray-50 rounded-r-lg transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5 text-gray-600" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900">${(item.price * item.quantity).toFixed(0)}</span>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 p-5 space-y-3">
              {savings > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-emerald-600 font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    You're saving
                  </span>
                  <span className="text-emerald-600 font-bold">${savings.toFixed(0)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-semibold text-gray-900">${subtotal.toFixed(0)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Shipping</span>
                <span className="font-semibold text-emerald-600">Free</span>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <span className="text-base font-bold text-gray-900">Total</span>
                <span className="text-xl font-bold text-gray-900">${subtotal.toFixed(0)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Shield className="w-3.5 h-3.5" />
                Secure checkout · Warranty included
              </div>
              <button
                onClick={handleCheckout}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all shadow-lg shadow-emerald-500/30 active:scale-[0.98]"
              >
                Checkout
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
