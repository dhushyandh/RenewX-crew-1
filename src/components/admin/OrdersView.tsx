import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  RefreshCw,
  ShoppingBag,
  Truck,
  Phone,
  MessageCircle,
  FileText,
  Printer,
  Copy,
  Check,
  ExternalLink,
  X,
  AlertCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  MapPin,
  CreditCard,
  ChevronRight,
  ShieldCheck,
  Send,
} from 'lucide-react';
import { api } from '@/services/api';
import { supabase } from '@/lib/supabase';
import { getCategoryFallback, handleImageError } from '@/lib/imageFallback';

export interface OrderItem {
  id?: string;
  product_id?: string;
  product_name?: string;
  quantity: number;
  price: number;
  image_url?: string;
}

export interface OrderCustomerInfo {
  name?: string;
  phone?: string;
  address?: string;
  pincode?: string;
  whatsapp_consent?: boolean;
}

export interface AdminOrder {
  id: string;
  _id?: string;
  user_id?: string;
  customer_info?: OrderCustomerInfo;
  customer_name?: string;
  phone?: string;
  address?: string;
  pincode?: string;
  items?: OrderItem[];
  order_items?: OrderItem[];
  subtotal: number;
  total?: number;
  savings?: number;
  status: 'pending' | 'processing' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled' | string;
  payment_method?: 'cod' | 'razorpay' | string;
  payment_status?: 'pending' | 'paid' | 'refunded' | string;
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  courier?: string;
  tracking_number?: string;
  trackingNumber?: string;
  courier_phone?: string;
  estimated_delivery?: string;
  cancellation_reason?: string;
  reason?: string;
  created_at?: string;
  createdAt?: string;
}

const PIPELINE_STATUSES = [
  { id: 'pending', label: 'Pending', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  { id: 'processing', label: 'Processing', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  { id: 'shipped', label: 'Shipped', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
  { id: 'out_for_delivery', label: 'Out for Delivery', color: 'text-purple-700 bg-purple-50 border-purple-200' },
  { id: 'delivered', label: 'Delivered', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  { id: 'cancelled', label: 'Cancelled', color: 'text-rose-700 bg-rose-50 border-rose-200' },
];

const COURIER_PRESETS = [
  'Blue Dart',
  'Delhivery',
  'DTDC',
  'India Post',
  'Shadowfax',
  'Ekart',
  'XpressBees',
];

const CANCELLATION_REASONS = [
  'Customer requested cancellation',
  'Item out of stock / defect found',
  'Address unserviceable / phone unverified',
  'Duplicate order placed',
  'Payment verification failed',
];

export default function OrdersView() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeModalOrder, setActiveModalOrder] = useState<AdminOrder | null>(null);
  const [invoiceModalOrder, setInvoiceModalOrder] = useState<AdminOrder | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchOrders = useCallback(async () => {
    try {
      // 1. Try Backend API first (returns MongoDB orders with full WhatsApp & courier metadata)
      try {
        const res = await api.orders.getAll();
        if (Array.isArray(res)) {
          setOrders(res);
          return;
        }
      } catch (backendErr) {
        console.warn('[OrdersView] Backend API offline, attempting Supabase fallback:', backendErr);
      }

      // 2. Fallback to Supabase
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders((data as AdminOrder[]) || []);
    } catch (err: any) {
      console.error('Failed to fetch orders:', err);
      showToast(err.message || 'Error loading orders', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  // Filtered orders
  const filteredOrders = orders.filter((order) => {
    const statusMatch = statusFilter === 'all' || order.status === statusFilter;
    if (!statusMatch) return false;

    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const id = String(order.id || order._id || '').toLowerCase();
    const name = (order.customer_info?.name || order.customer_name || '').toLowerCase();
    const phone = (order.customer_info?.phone || order.phone || '').toLowerCase();
    const tracking = (order.tracking_number || order.trackingNumber || '').toLowerCase();
    const pincode = (order.customer_info?.pincode || order.pincode || '').toLowerCase();

    return (
      id.includes(q) ||
      name.includes(q) ||
      phone.includes(q) ||
      tracking.includes(q) ||
      pincode.includes(q)
    );
  });

  const getStatusBadge = (status: string) => {
    const meta = PIPELINE_STATUSES.find((s) => s.id === status);
    if (!meta) {
      return (
        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full capitalize bg-gray-100 text-gray-700 border border-gray-200">
          {status}
        </span>
      );
    }
    return (
      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full capitalize border ${meta.color}`}>
        {meta.label}
      </span>
    );
  };

  const statusCounts = orders.reduce<Record<string, number>>((acc, o) => {
    const st = o.status || 'pending';
    acc[st] = (acc[st] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4 max-w-7xl mx-auto px-4 py-2">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl border text-sm font-semibold flex items-center gap-2.5 transition-all animate-bounce ${
            toastMessage.type === 'success'
              ? 'bg-emerald-900 text-white border-emerald-700'
              : toastMessage.type === 'error'
              ? 'bg-rose-900 text-white border-rose-700'
              : 'bg-slate-900 text-white border-slate-700'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Header & Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-slate-900 tracking-tight">Order Management</h2>
            <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
              {orders.length} Total
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Minimalist MNC e-commerce order fulfillment & WhatsApp notification console
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ID, Customer, Phone, AWB..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all placeholder:text-slate-400 font-medium"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh Orders"
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 active:scale-95 transition-all text-slate-600"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-slate-900' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 border ${
            statusFilter === 'all'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
          }`}
        >
          <span>All Orders</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              statusFilter === 'all' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {orders.length}
          </span>
        </button>

        {PIPELINE_STATUSES.map((st) => {
          const count = statusCounts[st.id] || 0;
          const isActive = statusFilter === st.id;
          return (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 border ${
                isActive
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              <span>{st.label}</span>
              {count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 text-slate-400 gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
          <p className="text-xs font-semibold text-slate-500">Syncing orders telemetry...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-700">No orders found</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            {search
              ? `No orders matching "${search}". Clear your search or try another query.`
              : `No orders currently in "${statusFilter}" state.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {filteredOrders.map((order) => {
            const orderId = String(order.id || order._id || '');
            const shortId = orderId.slice(-8).toUpperCase();
            const dateStr = new Date(order.created_at || order.createdAt || Date.now()).toLocaleDateString(
              'en-IN',
              {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }
            );

            const customerName = order.customer_info?.name || order.customer_name || 'Customer';
            const customerPhone = order.customer_info?.phone || order.phone || '';
            const customerAddress = order.customer_info?.address || order.address || 'Address not provided';
            const customerPincode = order.customer_info?.pincode || order.pincode || '';
            const whatsappConsent = order.customer_info?.whatsapp_consent !== false;

            const items: OrderItem[] = order.order_items || order.items || [];
            const totalAmount = Number(order.subtotal || order.total || 0);
            const savings = Number(order.savings || 0);
            const paymentMethod = String(order.payment_method || 'COD').toUpperCase();
            const paymentStatus = String(order.payment_status || 'pending').toLowerCase();
            const tracking = order.tracking_number || order.trackingNumber || '';
            const courier = order.courier || '';

            return (
              <div
                key={orderId}
                className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 transition-all p-4 shadow-sm space-y-3.5"
              >
                {/* Top Row: Order ID, Date, Status */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                      #{shortId}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400">{dateStr}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {whatsappConsent && (
                      <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <MessageCircle className="w-3 h-3 text-emerald-600" />
                        WhatsApp Opted
                      </span>
                    )}
                    {getStatusBadge(order.status)}
                  </div>
                </div>

                {/* Middle Grid: 3 Clean MNC Columns */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* Column 1: Customer Profile */}
                  <div className="space-y-1.5 pr-2 border-slate-100 md:border-r">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Customer Details
                    </span>
                    <p className="font-bold text-slate-900 text-sm">{customerName}</p>
                    {customerPhone && (
                      <div className="flex items-center gap-2 pt-0.5">
                        <a
                          href={`tel:${customerPhone.replace(/\D/g, '')}`}
                          className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200"
                        >
                          <Phone className="w-3 h-3 text-slate-500" />
                          <span>{customerPhone}</span>
                        </a>

                        <a
                          href={`https://wa.me/${
                            customerPhone.replace(/\D/g, '').startsWith('91')
                              ? customerPhone.replace(/\D/g, '')
                              : `91${customerPhone.replace(/\D/g, '')}`
                          }?text=Hi%20${encodeURIComponent(customerName)},%20regarding%20your%20RenewX%20order%20%23${shortId}...`}
                          target="_blank"
                          rel="noreferrer"
                          title="Open WhatsApp Chat"
                          className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200"
                        >
                          <MessageCircle className="w-3 h-3 text-emerald-600" />
                          <span>Chat</span>
                        </a>
                      </div>
                    )}
                    <div className="flex items-start gap-1 text-slate-500 pt-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <p className="text-[11px] leading-tight line-clamp-2">
                        {customerAddress}
                        {customerPincode && ` - ${customerPincode}`}
                      </p>
                    </div>
                  </div>

                  {/* Column 2: Items Summary */}
                  <div className="space-y-1.5 pr-2 border-slate-100 md:border-r">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Items Ordered ({items.length})
                    </span>
                    <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                      {items.map((it, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <img
                            src={it.image_url || getCategoryFallback('phone', it.product_name)}
                            onError={(e) => handleImageError(e, 'phone', it.product_name)}
                            alt=""
                            className="w-7 h-7 object-contain rounded-md bg-slate-50 border border-slate-200 p-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-800 truncate">
                              {it.product_name || 'Product'}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              Qty: {it.quantity} × ₹{Number(it.price || 0).toLocaleString('en-IN')}
                            </p>
                          </div>
                          <span className="font-bold text-slate-700 text-xs">
                            ₹{(Number(it.price || 0) * (it.quantity || 1)).toLocaleString('en-IN')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Column 3: Financials & Logistics */}
                  <div className="space-y-1.5 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Financial & Fulfillment
                      </span>
                      <div className="flex items-baseline justify-between mt-0.5">
                        <span className="text-xs text-slate-500 font-medium">Grand Total:</span>
                        <span className="text-base font-black text-slate-900">
                          ₹{totalAmount.toLocaleString('en-IN')}
                        </span>
                      </div>
                      {savings > 0 && (
                        <p className="text-[10px] text-emerald-600 font-semibold text-right">
                          Saved ₹{savings.toLocaleString('en-IN')}
                        </p>
                      )}

                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                            paymentMethod === 'RAZORPAY'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {paymentMethod}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border capitalize ${
                            paymentStatus === 'paid'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : paymentStatus === 'refunded'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {paymentStatus}
                        </span>
                      </div>
                    </div>

                    {/* Logistics chip */}
                    {(courier || tracking) && (
                      <div className="pt-1.5 border-t border-slate-100 text-[11px] flex items-center justify-between text-slate-600">
                        <div className="flex items-center gap-1 font-semibold truncate">
                          <Truck className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="truncate">{courier || 'Courier'}</span>
                        </div>
                        {tracking && (
                          <span className="font-mono text-[10px] text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 truncate max-w-[120px]">
                            {tracking}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setInvoiceModalOrder(order)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all active:scale-95"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>Tax Invoice</span>
                  </button>

                  <button
                    onClick={() => setActiveModalOrder(order)}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-black text-white bg-slate-900 hover:bg-black rounded-xl transition-all shadow-sm active:scale-95"
                  >
                    <span>Update Order</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MNC Order Update Modal */}
      {activeModalOrder && (
        <OrderManagementModal
          order={activeModalOrder}
          onClose={() => setActiveModalOrder(null)}
          onSuccess={(updatedOrder) => {
            setOrders((prev) =>
              prev.map((o) => (String(o.id || o._id) === String(updatedOrder.id || updatedOrder._id) ? updatedOrder : o))
            );
            setActiveModalOrder(null);
            showToast(`Order status updated to ${updatedOrder.status.replace(/_/g, ' ')}`);
          }}
        />
      )}

      {/* MNC Tax Invoice Modal */}
      {invoiceModalOrder && (
        <OrderInvoiceModal
          order={invoiceModalOrder}
          onClose={() => setInvoiceModalOrder(null)}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------
// MNC Order Update Modal Component
// -------------------------------------------------------------
function OrderManagementModal({
  order,
  onClose,
  onSuccess,
}: {
  order: AdminOrder;
  onClose: () => void;
  onSuccess: (updated: AdminOrder) => void;
}) {
  const orderId = String(order.id || order._id || '');
  const shortId = orderId.slice(-8).toUpperCase();
  const [selectedStatus, setSelectedStatus] = useState<string>(order.status || 'pending');
  const [courier, setCourier] = useState<string>(order.courier || '');
  const [trackingNumber, setTrackingNumber] = useState<string>(order.tracking_number || order.trackingNumber || '');
  const [courierPhone, setCourierPhone] = useState<string>(order.courier_phone || '');
  const [estimatedDelivery, setEstimatedDelivery] = useState<string>(order.estimated_delivery || '');
  const [reason, setReason] = useState<string>(order.cancellation_reason || order.reason || '');
  const [issueRefund, setIssueRefund] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isPaid = (order.payment_status || '').toLowerCase() === 'paid';
  const totalAmount = Number(order.subtotal || order.total || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const payloadRefund = selectedStatus === 'cancelled' && isPaid ? issueRefund : undefined;

      const updated = await api.orders.updateStatus(
        orderId,
        selectedStatus,
        courier.trim() || undefined,
        trackingNumber.trim() || undefined,
        courierPhone.trim() || undefined,
        estimatedDelivery.trim() || undefined,
        reason.trim() || undefined,
        payloadRefund
      );

      const mergedOrder: AdminOrder = {
        ...order,
        ...(updated || {}),
        status: selectedStatus,
        courier: courier.trim(),
        tracking_number: trackingNumber.trim(),
        courier_phone: courierPhone.trim(),
        estimated_delivery: estimatedDelivery.trim(),
        cancellation_reason: reason.trim(),
        payment_status: selectedStatus === 'cancelled' && isPaid && issueRefund ? 'refunded' : order.payment_status,
      };

      onSuccess(mergedOrder);
    } catch (err: any) {
      console.error('Update status error:', err);
      setErrorMsg(err.message || 'Failed to update order status');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasteTracking = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setTrackingNumber(text.trim());
    } catch {
      // ignore clipboard error
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-slate-900">Manage Order #{shortId}</span>
              <span className="text-xs font-bold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full capitalize">
                Current: {order.status.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Updates will automatically trigger verified WhatsApp updates to the customer.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Stepper Pipeline Status Selector */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
              Fulfillment Pipeline Step
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PIPELINE_STATUSES.filter((s) => s.id !== 'cancelled').map((st) => {
                const isSelected = selectedStatus === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setSelectedStatus(st.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    <p className="text-xs font-black">{st.label}</p>
                    <p
                      className={`text-[10px] mt-0.5 truncate ${
                        isSelected ? 'text-slate-300' : 'text-slate-400'
                      }`}
                    >
                      {st.id === 'pending' && 'Awaiting review'}
                      {st.id === 'processing' && 'Packed & labeled'}
                      {st.id === 'shipped' && 'Handed to courier'}
                      {st.id === 'out_for_delivery' && 'Final delivery mile'}
                      {st.id === 'delivered' && 'Delivered to buyer'}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Cancel Strip */}
            <button
              type="button"
              onClick={() => setSelectedStatus('cancelled')}
              className={`mt-2 w-full p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                selectedStatus === 'cancelled'
                  ? 'border-rose-600 bg-rose-50 text-rose-800'
                  : 'border-slate-200 hover:border-rose-200 bg-white text-slate-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className={`w-4 h-4 ${selectedStatus === 'cancelled' ? 'text-rose-600' : 'text-slate-400'}`} />
                <div className="text-left">
                  <p className="text-xs font-black">Cancel Order & Release Inventory</p>
                  <p className="text-[10px] text-slate-400">Cancels order and sends formal cancellation notice</p>
                </div>
              </div>
              {selectedStatus === 'cancelled' && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-200 text-rose-800">
                  Selected
                </span>
              )}
            </button>
          </div>

          {/* Conditional Courier & Tracking Inputs */}
          {(selectedStatus === 'shipped' || selectedStatus === 'out_for_delivery') && (
            <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-3 animate-in fade-in">
              <div className="flex items-center gap-1.5 text-indigo-900 font-bold text-xs">
                <Truck className="w-4 h-4 text-indigo-600" />
                <span>Courier & Logistics Details</span>
              </div>

              {/* Courier Chips */}
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                  Select Carrier Partner
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {COURIER_PRESETS.map((p) => {
                    const isSelected = courier.toLowerCase() === p.toLowerCase();
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setCourier(p)}
                        className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-all border ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Courier Name
                  </label>
                  <input
                    type="text"
                    value={courier}
                    onChange={(e) => setCourier(e.target.value)}
                    placeholder="e.g. Blue Dart"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold text-slate-500">
                      AWB / Tracking Number
                    </label>
                    <button
                      type="button"
                      onClick={handlePasteTracking}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
                    >
                      <Copy className="w-3 h-3" />
                      Paste
                    </button>
                  </div>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="e.g. BD9823419082IN"
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Delivery Agent Phone (Optional)
                </label>
                <input
                  type="text"
                  value={courierPhone}
                  onChange={(e) => setCourierPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Conditional Cancellation Drawer */}
          {selectedStatus === 'cancelled' && (
            <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200 space-y-3 animate-in fade-in">
              <div className="flex items-center gap-1.5 text-rose-900 font-bold text-xs">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Cancellation Reason (Sent via WhatsApp)</span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {CANCELLATION_REASONS.map((r) => {
                  const isSelected = reason === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setReason(r)}
                      className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-all border ${
                        isSelected
                          ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                          : 'bg-white text-slate-600 border-rose-200 hover:border-rose-300'
                      }`}
                    >
                      {r}
                    </button>
                  );
                })}
              </div>

              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Specific cancellation reason details..."
                className="w-full px-3 py-2 text-xs bg-white border border-rose-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
              />

              {/* Instant Razorpay Refund Option for Paid Orders */}
              {isPaid && (
                <div
                  onClick={() => setIssueRefund(!issueRefund)}
                  className={`cursor-pointer p-3 rounded-xl border flex items-start gap-2.5 transition-all ${
                    issueRefund
                      ? 'bg-emerald-50 border-emerald-300'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={issueRefund}
                    onChange={() => {}}
                    className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      ⚡ Initiate Instant Razorpay Refund (₹{totalAmount.toLocaleString('en-IN')})
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Invokes Razorpay refund API and sends official refund completed WhatsApp notification.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-black text-white bg-slate-900 hover:bg-black rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-70"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Updating Order...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Confirm Status Update</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// MNC Digital Tax Invoice Modal Component
// -------------------------------------------------------------
function OrderInvoiceModal({
  order,
  onClose,
}: {
  order: AdminOrder;
  onClose: () => void;
}) {
  const orderId = String(order.id || order._id || '');
  const shortId = orderId.slice(-8).toUpperCase();
  const invoiceNumber = `RX-INV-${shortId}`;
  const invoiceDate = new Date(order.created_at || order.createdAt || Date.now()).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const customerName = order.customer_info?.name || order.customer_name || 'Customer';
  const customerPhone = order.customer_info?.phone || order.phone || '';
  const customerAddress = order.customer_info?.address || order.address || 'Address not provided';
  const customerPincode = order.customer_info?.pincode || order.pincode || '';

  const items: OrderItem[] = order.order_items || order.items || [];
  const totalAmount = Number(order.subtotal || order.total || 0);
  const savings = Number(order.savings || 0);
  const taxableAmount = Math.round(totalAmount / 1.18);
  const gstAmount = totalAmount - taxableAmount;
  const cgst = Math.round(gstAmount / 2);
  const sgst = gstAmount - cgst;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden print:border-none print:shadow-none animate-in fade-in zoom-in-95 duration-150">
        {/* Top Modal Controls (Hidden in Print) */}
        <div className="px-6 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-700" />
            <span className="text-sm font-black text-slate-900">Tax Invoice {invoiceNumber}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Sheet */}
        <div className="p-8 space-y-6 text-slate-900 print:p-6" id="printable-invoice">
          {/* Header */}
          <div className="flex items-start justify-between border-b pb-6 border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black tracking-tight text-slate-900">RenewX</span>
                <span className="text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white px-2 py-0.5 rounded">
                  Certified Refurbished
                </span>
              </div>
              <p className="text-xs font-bold text-slate-600 mt-1">RenewX Technologies India Pvt. Ltd.</p>
              <p className="text-[11px] text-slate-400">GSTIN: 27AABCR1234F1Z5 | PAN: AABCR1234F</p>
              <p className="text-[11px] text-slate-400">RenewX Tech Hub, MG Road, Bengaluru, KA 560001</p>
            </div>

            <div className="text-right">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400 block">
                Original Tax Invoice
              </span>
              <p className="text-lg font-mono font-black text-slate-900 mt-0.5">{invoiceNumber}</p>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">Date: {invoiceDate}</p>
              <p className="text-[11px] text-slate-400">Order ID: #{shortId}</p>
            </div>
          </div>

          {/* Billed To / Shipped To */}
          <div className="grid grid-cols-2 gap-6 text-xs border-b pb-6 border-slate-200">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Billed To & Delivered To
              </span>
              <p className="font-bold text-slate-900 text-sm">{customerName}</p>
              <p className="text-slate-600 font-semibold mt-0.5">{customerPhone}</p>
              <p className="text-slate-500 mt-0.5 leading-snug">
                {customerAddress}
                {customerPincode && ` - ${customerPincode}`}
              </p>
              <p className="text-slate-400 text-[10px] mt-1">Place of Supply: India</p>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Payment & Fulfillment
              </span>
              <p className="font-bold text-slate-900">
                Method: {String(order.payment_method || 'COD').toUpperCase()}
              </p>
              <p className="text-slate-500 capitalize">
                Status: {order.payment_status || 'Pending'}
              </p>
              {order.razorpay_payment_id && (
                <p className="text-slate-400 text-[10px] font-mono mt-0.5">
                  Ref: {order.razorpay_payment_id}
                </p>
              )}
              {order.courier && (
                <p className="text-slate-500 mt-1">
                  Logistics: <span className="font-semibold">{order.courier}</span>
                </p>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="py-2">Item Description</th>
                  <th className="py-2 text-center">HSN</th>
                  <th className="py-2 text-center">Qty</th>
                  <th className="py-2 text-right">Unit Price</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((it, idx) => (
                  <tr key={idx} className="py-2.5">
                    <td className="py-2.5 pr-2">
                      <p className="font-bold text-slate-900">{it.product_name || 'Refurbished Device'}</p>
                      <p className="text-[10px] text-slate-400">RenewX Certified 32-Point Quality Inspected</p>
                    </td>
                    <td className="py-2.5 text-center text-slate-500 font-mono text-[11px]">8517</td>
                    <td className="py-2.5 text-center font-bold text-slate-700">{it.quantity || 1}</td>
                    <td className="py-2.5 text-right font-medium text-slate-600">
                      ₹{Number(it.price || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 text-right font-black text-slate-900">
                      ₹{(Number(it.price || 0) * (it.quantity || 1)).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tax Breakdown & Grand Total */}
          <div className="border-t border-slate-200 pt-4 flex justify-end">
            <div className="w-64 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Taxable Value:</span>
                <span>₹{taxableAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>CGST (9%):</span>
                <span>₹{cgst.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>SGST (9%):</span>
                <span>₹{sgst.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Express Shipping:</span>
                <span className="font-semibold text-emerald-600">FREE</span>
              </div>
              {savings > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Store Discount:</span>
                  <span>-₹{savings.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-black text-slate-900">
                <span>Grand Total:</span>
                <span>₹{totalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Footer Notes */}
          <div className="border-t border-slate-100 pt-4 text-[10px] text-slate-400 flex items-center justify-between">
            <p>This is a computer generated electronic tax invoice. No physical signature required.</p>
            <p className="font-bold text-slate-500">RenewX Certified Warranty Included (6 Months)</p>
          </div>
        </div>
      </div>
    </div>
  );
}

