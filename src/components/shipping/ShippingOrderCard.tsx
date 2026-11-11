import React, { useState } from 'react';
import {
  Truck,
  CheckCircle2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ShieldCheck,
  FileText,
  Phone,
  MessageCircle,
  PackageCheck,
  Clock,
  ArrowRight,
} from 'lucide-react';
import type { ShowcaseOrder } from '@/data/showcaseOrders';

interface ShippingOrderCardProps {
  order: ShowcaseOrder;
  isAdmin?: boolean;
  onStatusChange?: (orderId: string, newStatus: string) => void;
  onOpenInvoice?: (order: ShowcaseOrder) => void;
  onTrackWaybill?: (order: ShowcaseOrder) => void;
  onContactCustomer?: (order: ShowcaseOrder) => void;
}

export default function ShippingOrderCard({
  order,
  isAdmin = false,
  onStatusChange,
  onOpenInvoice,
  onTrackWaybill,
  onContactCustomer,
}: ShippingOrderCardProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(order.trackingId || order.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Status Ribbon Styling
  const getRibbonConfig = () => {
    switch (order.status) {
      case 'transit':
        return {
          text: order.statusLabel || 'TRANSIT',
          bg: 'bg-[#FF6B00]',
          border: 'border-[#EA580C]',
          shadow: 'shadow-orange-500/20',
          dotColor: 'bg-[#FF6B00]',
        };
      case 'process':
        return {
          text: order.statusLabel || 'PROCESS',
          bg: 'bg-[#18181B]',
          border: 'border-zinc-800',
          shadow: 'shadow-zinc-900/20',
          dotColor: 'bg-[#18181B]',
        };
      case 'delivered':
        return {
          text: order.statusLabel || 'DELIVERED',
          bg: 'bg-[#16A34A]',
          border: 'border-emerald-600',
          shadow: 'shadow-emerald-500/20',
          dotColor: 'bg-[#16A34A]',
        };
      case 'cancelled':
      default:
        return {
          text: order.statusLabel || 'CANCELLED',
          bg: 'bg-[#EF4444]',
          border: 'border-rose-600',
          shadow: 'shadow-rose-500/20',
          dotColor: 'bg-[#EF4444]',
        };
    }
  };

  const ribbon = getRibbonConfig();

  // Progress Bar Milestones
  // 0: Placed, 1: Processed, 2: Transit (Truck), 3: Delivered
  const activeStep = order.activeStepIndex;

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      className="group relative bg-white rounded-[26px] p-5 border border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_35px_rgba(0,0,0,0.08)] transition-all duration-300 overflow-hidden cursor-pointer select-none"
    >
      {/* 1. Diagonal Corner Ribbon (The Signature UI) */}
      <div className="absolute top-0 right-0 w-28 h-28 overflow-hidden pointer-events-none z-10">
        <div
          className={`absolute top-5 -right-8 w-32 py-1 text-center text-[10px] font-black uppercase tracking-widest text-white shadow-md transform rotate-45 select-none ${ribbon.bg}`}
        >
          {ribbon.text}
        </div>
      </div>

      {/* 2. Top Section: Product Thumbnail & Order ID */}
      <div className="flex items-center gap-3.5 pr-14">
        {/* Device Thumbnail */}
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-50 border border-slate-100/80 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
          <img
            src={order.productImage}
            alt={order.productName}
            className="w-full h-full object-contain filter drop-shadow-xs group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>

        {/* Order Identifier & Title */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-[13px] sm:text-sm font-extrabold text-slate-900 tracking-tight">
              ID: {order.trackingId}
            </h3>
            <button
              onClick={handleCopyId}
              title="Copy ID"
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:scale-95 transition-all"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          <p className="text-xs font-semibold text-slate-500 truncate mt-0.5">
            {order.productName}
          </p>
          {order.productSubtitle && (
            <p className="text-[10px] text-slate-400 truncate hidden sm:block">
              {order.productSubtitle}
            </p>
          )}
        </div>
      </div>

      {/* 3. Middle Section: Visual Delivery Progress Bar with Active Truck 🚚 */}
      <div className="mt-5 mb-4 px-2">
        {/* Floating ETA Label above current step */}
        <div className="flex justify-between items-center mb-1 text-[11px] font-bold">
          <span className="text-transparent select-none">start</span>
          {order.etaText && (
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-50 border border-slate-200/80 text-slate-800 text-[11px] font-black shadow-2xs">
              <Clock className="w-3 h-3 text-[#FF6B00]" />
              <span>{order.etaText}</span>
            </div>
          )}
          <span className="text-transparent select-none">end</span>
        </div>

        {/* Dotted Milestone Stepper */}
        <div className="relative flex items-center justify-between py-2">
          {/* Milestone 0: Placed / Confirmed */}
          <div className="relative z-10 flex flex-col items-center">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                activeStep >= 0
                  ? 'bg-[#FF6B00] text-white shadow-xs'
                  : 'bg-slate-100 border border-slate-300 text-slate-400'
              }`}
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
          </div>

          {/* Dotted Connector 0 -> 1 */}
          <div
            className={`flex-1 h-0 border-b-2 border-dotted mx-1.5 transition-colors ${
              activeStep >= 1 ? 'border-[#FF6B00]' : 'border-slate-200'
            }`}
          />

          {/* Milestone 1: Quality Check & Packed */}
          <div className="relative z-10 flex flex-col items-center">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                activeStep >= 1
                  ? 'bg-[#FF6B00] text-white shadow-xs'
                  : 'bg-slate-100 border border-slate-300 text-slate-400'
              }`}
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
          </div>

          {/* Dotted Connector 1 -> 2 */}
          <div
            className={`flex-1 h-0 border-b-2 border-dotted mx-1.5 transition-colors ${
              activeStep >= 2 ? 'border-[#FF6B00]' : 'border-slate-200'
            }`}
          />

          {/* Milestone 2: In Transit (Truck Node) */}
          <div className="relative z-10 flex flex-col items-center">
            {activeStep === 2 ? (
              // Active Delivery Truck Circle
              <div className="w-8 h-8 rounded-full bg-[#FF6B00] text-white flex items-center justify-center shadow-[0_0_12px_rgba(255,107,0,0.45)] ring-4 ring-orange-100 animate-pulse">
                <Truck className="w-4 h-4 stroke-[2.2]" />
              </div>
            ) : activeStep > 2 ? (
              // Passed transit (delivered)
              <div className="w-6 h-6 rounded-full bg-[#FF6B00] text-white flex items-center justify-center">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            ) : (
              // Still in processing
              <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-400">
                <Truck className="w-3.5 h-3.5 stroke-[2]" />
              </div>
            )}
          </div>

          {/* Dotted Connector 2 -> 3 */}
          <div
            className={`flex-1 h-0 border-b-2 border-dotted mx-1.5 transition-colors ${
              activeStep >= 3 ? 'border-emerald-600' : 'border-slate-200'
            }`}
          />

          {/* Milestone 3: Doorstep Delivered */}
          <div className="relative z-10 flex flex-col items-center">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                activeStep >= 3
                  ? 'bg-emerald-600 text-white shadow-xs ring-4 ring-emerald-100'
                  : 'bg-white border-2 border-slate-300 text-slate-300'
              }`}
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom Section: Route Telemetry & 3D Parcel Box */}
      <div className="relative flex items-end justify-between pt-1">
        {/* Origin & Destination Columns */}
        <div className="grid grid-cols-2 gap-4 max-w-[70%] sm:max-w-[75%]">
          {/* FROM Column */}
          <div>
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
              FROM
            </span>
            <p className="text-xs sm:text-[13px] font-black text-slate-900 truncate mt-0.5">
              {order.fromHub.title}
            </p>
            <p className="text-[11px] font-medium text-slate-400 mt-0.5">
              {order.fromHub.date}
            </p>
          </div>

          {/* TO Column */}
          <div>
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
              TO
            </span>
            <p className="text-xs sm:text-[13px] font-black text-slate-900 truncate mt-0.5">
              {order.toDestination.recipientOrCity}
            </p>
            <p
              className={`text-[11px] font-semibold mt-0.5 ${
                order.status === 'delivered' ? 'text-emerald-600 font-bold' : 'text-slate-500'
              }`}
            >
              {order.toDestination.dateText}
            </p>
          </div>
        </div>

        {/* 3D Parcel Delivery Box Asset */}
        <div className="shrink-0 -mr-3 -mb-3 z-0">
          <img
            src="/images/delivery-box-3d-transparent.png"
            alt="3D Delivery Package"
            className="w-20 h-20 sm:w-24 sm:h-24 object-contain filter drop-shadow-md pointer-events-none select-none group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      </div>

      {/* 5. Expandable Order Actions & Details Drawer */}
      {expanded && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="mt-4 pt-4 border-t border-slate-100 space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {/* Full Address & Courier Info */}
          <div className="bg-slate-50 rounded-2xl p-3.5 text-xs space-y-2 border border-slate-100">
            <div className="flex items-center justify-between text-slate-500">
              <span className="font-semibold text-slate-700">Courier Partner:</span>
              <span className="font-bold text-slate-900">{order.courier.name}</span>
            </div>
            <div className="flex items-center justify-between text-slate-500">
              <span className="font-semibold text-slate-700">Destination:</span>
              <span className="font-medium text-slate-800 text-right max-w-[65%] truncate">
                {order.toDestination.fullAddress}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-500">
              <span className="font-semibold text-slate-700">Total Paid:</span>
              <span className="font-black text-slate-900 text-sm">
                ₹{order.total?.toLocaleString('en-IN') || order.price?.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            {order.courier.trackingUrl && (
              <a
                href={order.courier.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex-1 py-2 px-3 bg-black text-[#ffc400] text-xs font-black rounded-xl text-center flex items-center justify-center gap-1.5 hover:bg-zinc-800 active:scale-98 transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Track Waybill</span>
              </a>
            )}

            {onOpenInvoice && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenInvoice(order);
                }}
                className="py-2 px-3 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 hover:bg-slate-50 active:scale-98 transition-all"
              >
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>Invoice</span>
              </button>
            )}

            {isAdmin && onStatusChange && (
              <div className="flex items-center gap-1.5 ml-auto">
                {order.statusRaw !== 'delivered' && order.statusRaw !== 'cancelled' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const next =
                        order.statusRaw === 'pending' || order.statusRaw === 'processing'
                          ? 'shipped'
                          : 'delivered';
                      onStatusChange(order.id, next);
                    }}
                    className="py-2 px-3 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 active:scale-98 transition-all"
                  >
                    Advance
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Subtle indicator bar */}
      <div className="flex justify-center mt-2.5 -mb-2">
        <div className="w-8 h-1 rounded-full bg-slate-200/60" />
      </div>
    </div>
  );
}

