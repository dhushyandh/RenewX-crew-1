import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { supabase } from '@/lib/supabase';
import {
  CheckCircle2,
  ShoppingCart,
  Minus,
  Plus,
  Trash2,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';

export default function CartScreen({ userId }: { userId: string }) {
  const { items, updateQuantity, removeFromCart, clearCart, subtotal, savings, totalItems } =
    useCart();
  const [checkoutDone, setCheckoutDone] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const handleCheckout = async () => {
    if (!window.confirm(`Place order for ${totalItems} items totaling $${subtotal.toFixed(0)}?`))
      return;
    setCheckoutError(null);

    try {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: userId,
          subtotal: Math.round(subtotal),
          savings: Math.round(savings),
          status: 'pending',
        })
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
      <div className="flex flex-col items-center justify-center h-full bg-[#f8f7f2] px-8 text-center">
        <div className="w-20 h-20 rounded-full bg-[#ffc400] flex items-center justify-center mb-6">
          <CheckCircle2 className="w-12 h-12 text-black" />
        </div>
        <h2 className="text-xl font-black text-gray-900 mb-2">Order Confirmed!</h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          Thank you for choosing RenewX Crew. Your order is being processed.
        </p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col h-full bg-[#f8f7f2]">
        <div className="px-6 py-3 bg-white border-b border-[#e6e2d8]">
          <h1 className="text-xl font-bold text-gray-900">Your Cart</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center pb-16">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <ShoppingCart className="w-10 h-10 text-gray-300" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Your cart is empty</h2>
          <p className="text-sm text-gray-400">Browse renewed electronics and start saving.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#f8f7f2]">
      <div className="flex items-baseline justify-between px-6 py-3 bg-white border-b border-[#e6e2d8]">
        <h1 className="text-xl font-bold text-gray-900">Your Cart</h1>
        <span className="text-xs text-gray-400 font-bold">{totalItems} items</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 pb-56">
        {items.map((item) => (
          <div
            key={item._uuid || item.id}
            className="flex gap-3 bg-white rounded-2xl p-3 mb-3 border border-[#ece8dc]"
          >
            <img
              src={item.image}
              alt={item.name}
              className="rounded-xl object-cover bg-[#f7f5ec]"
              style={{ width: 72, height: 72 }}
            />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-gray-900 line-clamp-2 leading-5 mb-1">
                {item.name}
              </h3>
              <span className="text-[11px] text-gray-400">
                {item.brand} · {item.condition}
              </span>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="w-8 h-8 flex items-center justify-center bg-gray-50 active:bg-gray-100"
                  >
                    <Minus className="w-3.5 h-3.5 text-gray-700" />
                  </button>
                  <span className="px-2 text-xs font-bold text-gray-900 min-w-[28px] text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="w-8 h-8 flex items-center justify-center bg-gray-50 active:bg-gray-100"
                  >
                    <Plus className="w-3.5 h-3.5 text-gray-700" />
                  </button>
                </div>
                <span className="text-base font-black text-gray-900">
                  ${(item.price * item.quantity).toFixed(0)}
                </span>
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="p-1 active:scale-90 transition-transform"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-200">
        {checkoutError && (
          <div className="mb-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
            <p className="text-sm text-red-600">{checkoutError}</p>
          </div>
        )}
        {savings > 0 && (
          <div className="flex justify-between mb-2">
            <span className="text-xs font-bold text-emerald-600">You're saving</span>
            <span className="text-xs font-bold text-emerald-600">${savings.toFixed(0)}</span>
          </div>
        )}
        <div className="flex justify-between mb-2">
          <span className="text-xs text-gray-500">Subtotal</span>
          <span className="text-xs font-bold text-gray-900">${subtotal.toFixed(0)}</span>
        </div>
        <div className="flex justify-between mb-3">
          <span className="text-xs text-gray-500">Shipping</span>
          <span className="text-xs font-bold text-emerald-600">Free</span>
        </div>
        <div className="flex justify-between items-center pt-3 border-t border-gray-100 mb-3">
          <span className="text-base font-bold text-gray-900">Total</span>
          <span className="text-xl font-black text-gray-900">${subtotal.toFixed(0)}</span>
        </div>
        <button
          onClick={handleCheckout}
          className="w-full flex items-center justify-center gap-2 bg-black text-[#ffc400] py-4 rounded-full active:scale-95 transition-transform mb-2"
        >
          <span className="text-sm font-bold">Checkout</span>
          <ArrowLeft className="w-4 h-4 rotate-180" />
        </button>
        <div className="flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-[11px] text-gray-400">Secure checkout · Warranty included</span>
        </div>
      </div>
    </div>
  );
}
