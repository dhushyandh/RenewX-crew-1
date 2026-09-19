import { useState, useEffect } from 'react';
import { Truck, Package, CheckCircle2, Clock, Search, MapPin, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export default function TrackScreen({ onShopNow }: { onShopNow?: () => void }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [trackQuery, setTrackQuery] = useState('');

  useEffect(() => {
    (async () => {
      if (!user) return;
      try {
        const { data } = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        setOrders(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  return (
    <div className="flex flex-col h-full bg-[#f8fafc]">
      {/* Header */}
      <div className="px-5 py-4 bg-white border-b border-gray-200 shadow-xs">
        <h1 className="text-xl font-black text-gray-900 tracking-tight">Order Tracking</h1>
        <p className="text-xs text-gray-500 mt-0.5">Live shipping & trade-in status updates</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-28">
        {/* Track Query Box */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm space-y-3">
          <label className="text-xs font-bold text-gray-700 block">
            Enter Order ID or Waybill Number
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 border border-gray-200">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                value={trackQuery}
                onChange={(e) => setTrackQuery(e.target.value)}
                placeholder="e.g. RNX-89421"
                className="flex-1 bg-transparent text-xs text-gray-900 outline-none"
              />
            </div>
            <button className="px-4 py-2 bg-black text-[#ffc400] text-xs font-bold rounded-xl active:scale-95 transition-transform">
              Track
            </button>
          </div>
        </div>

        {/* Live Status Stages */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black text-gray-900">Standard Delivery Timeline</h3>
                <p className="text-[11px] text-gray-400">Bluedart & Delhivery Express</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
              On Schedule
            </span>
          </div>

          {/* Stepper list */}
          <div className="space-y-4 pl-2 border-l-2 border-[#ffc400] ml-3">
            <div className="relative pl-4">
              <div className="absolute -left-[21px] top-0 w-3 h-3 rounded-full bg-[#ffc400] ring-4 ring-white" />
              <p className="text-xs font-bold text-gray-900">Order Confirmed & Certified</p>
              <p className="text-[10px] text-gray-400">40-point technical hardware audit passed</p>
            </div>
            <div className="relative pl-4">
              <div className="absolute -left-[21px] top-0 w-3 h-3 rounded-full bg-[#ffc400] ring-4 ring-white" />
              <p className="text-xs font-bold text-gray-900">Packed in Tamper-Proof Box</p>
              <p className="text-[10px] text-gray-400">Secured with serial warranty seal</p>
            </div>
            <div className="relative pl-4">
              <div className="absolute -left-[21px] top-0 w-3 h-3 rounded-full bg-blue-500 ring-4 ring-white" />
              <p className="text-xs font-bold text-gray-900">In Transit with Courier</p>
              <p className="text-[10px] text-gray-400">Dispatched via Air Express</p>
            </div>
            <div className="relative pl-4">
              <div className="absolute -left-[21px] top-0 w-3 h-3 rounded-full bg-gray-300 ring-4 ring-white" />
              <p className="text-xs font-bold text-gray-400">Doorstep Delivery</p>
              <p className="text-[10px] text-gray-400">OTP verification upon delivery</p>
            </div>
          </div>
        </div>

        {/* User's Order List */}
        <div>
          <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2.5">
            Your Orders ({orders.length})
          </h3>
          {loading ? (
            <div className="py-6 text-center text-xs text-gray-400">Loading your shipments...</div>
          ) : orders.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center border border-gray-200">
              <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-gray-700">No active shipments found</p>
              <button
                onClick={onShopNow}
                className="mt-3 px-4 py-2 bg-black text-[#ffc400] rounded-xl text-xs font-bold active:scale-95"
              >
                Browse Renewed Tech
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {orders.map((ord) => (
                <div key={ord.id} className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-black text-gray-900">
                      #{ord.id.slice(0, 8)}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      {ord.status || 'Delivered'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>
                      {ord.order_items?.length || 1} {(ord.order_items?.length || 1) === 1 ? 'item' : 'items'}
                    </span>
                    <span className="font-bold text-gray-900">₹{ord.total?.toLocaleString('en-IN') || 0}</span>
                  </div>
                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                    <span>{new Date(ord.created_at).toLocaleDateString('en-IN')}</span>
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Track Verified
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
