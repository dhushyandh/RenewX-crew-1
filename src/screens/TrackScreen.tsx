import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  QrCode,
  Package,
  RefreshCw,
  X,
  FileText,
  Printer,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import ShippingOrderCard from '@/components/shipping/ShippingOrderCard';
import {
  SHOWCASE_ORDERS,
  getLocalizedShowcaseOrders,
  normalizeOrderToShipping,
  type ShowcaseOrder,
} from '@/data/showcaseOrders';

export default function TrackScreen({ onShopNow }: { onShopNow?: () => void }) {
  const { user } = useAuth();
  const [realOrders, setRealOrders] = useState<ShowcaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'transit' | 'process' | 'delivered'>('all');
  const [invoiceModalOrder, setInvoiceModalOrder] = useState<ShowcaseOrder | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);

  // Fetch real user orders from API / Supabase
  const loadOrders = async () => {
    try {
      setRefreshing(true);
      if (user) {
        // Try backend API first
        try {
          const res = await api.orders.getMyOrders();
          if (Array.isArray(res) && res.length > 0) {
            setRealOrders(res.map((o: any, idx: number) => normalizeOrderToShipping(o, idx, user)));
            return;
          }
        } catch (apiErr) {
          // Fall back to Supabase
          const { data, error } = await supabase
            .from('orders')
            .select('*, order_items(*)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          if (!error && Array.isArray(data) && data.length > 0) {
            setRealOrders(data.map((o: any, idx: number) => normalizeOrderToShipping(o, idx, user)));
            return;
          }
        }
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [user]);

  // Combine real orders with the rich showcase parcels requested by user
  const allOrders = useMemo(() => {
    const localizedShowcase = getLocalizedShowcaseOrders(user);
    if (realOrders.length > 0) {
      // Prioritize real orders first, then append showcase parcels for a rich showcase experience
      return [...realOrders, ...localizedShowcase];
    }
    return localizedShowcase;
  }, [realOrders, user]);

  // Filter & Search Logic
  const filteredOrders = useMemo(() => {
    return allOrders.filter((ord) => {
      // Filter tab
      if (selectedFilter !== 'all' && ord.status !== selectedFilter) {
        return false;
      }
      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        ord.trackingId.toLowerCase().includes(q) ||
        ord.productName.toLowerCase().includes(q) ||
        ord.productSubtitle?.toLowerCase().includes(q) ||
        ord.toDestination.recipientOrCity.toLowerCase().includes(q) ||
        ord.courier.name.toLowerCase().includes(q)
      );
    });
  }, [allOrders, selectedFilter, searchQuery]);

  // Filter Counts
  const counts = useMemo(() => {
    return {
      all: allOrders.length,
      transit: allOrders.filter((o) => o.status === 'transit').length,
      process: allOrders.filter((o) => o.status === 'process').length,
      delivered: allOrders.filter((o) => o.status === 'delivered').length,
    };
  }, [allOrders]);

  return (
    <div className="flex flex-col h-full bg-[#fbfcfd] overflow-hidden">
      {/* 1. Header with Warm Peach / Orange Ambient Glow */}
      <div className="shrink-0 bg-gradient-to-b from-[#FFF2E2] via-[#FFF9F2] to-[#FBFCFD] px-5 pt-6 pb-4 border-b border-orange-100/40">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Top Title Bar */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                My Shipping
              </h1>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                Real-time courier telemetry & certified doorstep delivery
              </p>
            </div>

            {/* Top Right Action: QR / Barcode Scan */}
            <button
              onClick={() => setShowQrModal(true)}
              title="Scan Parcel Waybill"
              className="w-10 h-10 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-center text-slate-800 hover:text-black hover:bg-slate-50 active:scale-95 transition-all"
            >
              <QrCode className="w-5 h-5 stroke-[2.2]" />
            </button>
          </div>

          {/* Search Parcel Input */}
          <div className="relative">
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-100 transition-all">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search your parcel or ID..."
                className="flex-1 bg-transparent text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Horizontal Status Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs font-bold select-none">
            {/* All */}
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-4 py-2 rounded-full shrink-0 flex items-center gap-1.5 transition-all ${
                selectedFilter === 'all'
                  ? 'bg-slate-950 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>All</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  selectedFilter === 'all' ? 'bg-zinc-800 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {counts.all}
              </span>
            </button>

            {/* Transit */}
            <button
              onClick={() => setSelectedFilter('transit')}
              className={`px-4 py-2 rounded-full shrink-0 flex items-center gap-1.5 transition-all ${
                selectedFilter === 'transit'
                  ? 'bg-[#FF6B00] text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>Transit</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  selectedFilter === 'transit'
                    ? 'bg-orange-700 text-white'
                    : 'bg-orange-50 text-orange-700 border border-orange-200/60'
                }`}
              >
                {counts.transit}
              </span>
            </button>

            {/* On Process */}
            <button
              onClick={() => setSelectedFilter('process')}
              className={`px-4 py-2 rounded-full shrink-0 flex items-center gap-1.5 transition-all ${
                selectedFilter === 'process'
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>On Process</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  selectedFilter === 'process' ? 'bg-zinc-800 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {counts.process}
              </span>
            </button>

            {/* Delivered */}
            <button
              onClick={() => setSelectedFilter('delivered')}
              className={`px-4 py-2 rounded-full shrink-0 flex items-center gap-1.5 transition-all ${
                selectedFilter === 'delivered'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>Delivered</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  selectedFilter === 'delivered'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                }`}
              >
                {counts.delivered}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Order Cards Feed */}
      <div className="flex-1 overflow-y-auto px-5 py-5 pb-32">
        <div className="max-w-2xl mx-auto space-y-4">
          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 shadow-sm space-y-3">
              <Package className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-black text-slate-900">No shipments found</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                No orders match your filter criteria or search query.
              </p>
              {onShopNow && (
                <button
                  onClick={onShopNow}
                  className="mt-2 px-5 py-2.5 bg-black text-[#ffc400] text-xs font-black rounded-xl active:scale-95 transition-all"
                >
                  Browse Renewed Tech
                </button>
              )}
            </div>
          ) : (
            filteredOrders.map((ord) => (
              <ShippingOrderCard
                key={ord.id}
                order={ord}
                onOpenInvoice={(o) => setInvoiceModalOrder(o)}
              />
            ))
          )}
        </div>
      </div>

      {/* 3. Invoice Modal */}
      {invoiceModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#FF6B00] flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Tax Invoice & Warranty</h3>
                  <p className="text-[10px] text-slate-400">Order #{invoiceModalOrder.trackingId}</p>
                </div>
              </div>
              <button
                onClick={() => setInvoiceModalOrder(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Invoice Content */}
            <div className="bg-slate-50 rounded-2xl p-4 text-xs space-y-3 border border-slate-100 font-mono">
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="font-bold text-slate-700">RENEWX INDIA TECHNOLOGIES</span>
                <span className="text-[10px] text-slate-500">GST: 29AAACR1234F1Z5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Device:</span>
                <span className="font-bold text-slate-900 text-right">{invoiceModalOrder.productName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Warranty:</span>
                <span className="text-emerald-700 font-bold">
                  {invoiceModalOrder.warrantyMonths} Months Doorstep Warranty
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Delivery Address:</span>
                <span className="text-slate-700 text-right max-w-[60%]">
                  {invoiceModalOrder.toDestination.fullAddress}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-sm">
                <span className="font-black text-slate-900">Total Amount:</span>
                <span className="font-black text-slate-900">
                  ₹{invoiceModalOrder.total?.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Print / Close */}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-black text-[#ffc400] text-xs font-bold rounded-xl flex items-center justify-center gap-2 active:scale-98 transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>Print Invoice</span>
              </button>
              <button
                onClick={() => setInvoiceModalOrder(null)}
                className="py-2.5 px-4 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200 active:scale-98 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. QR Scanner Simulation Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 text-[#FF6B00] mx-auto flex items-center justify-center border border-orange-100">
              <QrCode className="w-8 h-8 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Scan Delivery Barcode</h3>
              <p className="text-xs text-slate-500 mt-1">
                Point your camera at the parcel barcode or waybill label on your RenewX shipping box.
              </p>
            </div>
            <div className="w-full h-44 rounded-2xl bg-slate-950 flex flex-col items-center justify-center text-white relative overflow-hidden">
              <div className="w-36 h-36 border-2 border-orange-400 border-dashed rounded-xl animate-pulse flex items-center justify-center">
                <span className="text-[11px] text-orange-200 font-bold">Scanning...</span>
              </div>
            </div>
            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
