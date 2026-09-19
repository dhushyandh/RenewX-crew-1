import { useAuth } from '@/context/AuthContext';
import {
  User,
  Shield,
  LogOut,
  ShoppingBag,
  HelpCircle,
  Phone,
  MessageCircle,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';

interface AccountScreenProps {
  onAdmin: () => void;
  onViewOrders: () => void;
  onShopNow: () => void;
}

export default function AccountScreen({
  onAdmin,
  onViewOrders,
  onShopNow,
}: AccountScreenProps) {
  const { user, profile, isAdmin, signOut } = useAuth();

  return (
    <div className="flex flex-col h-full bg-[#f8fafc]">
      {/* Header */}
      <div className="px-5 py-4 bg-white border-b border-gray-200 shadow-xs">
        <h1 className="text-xl font-black text-gray-900 tracking-tight">Your Account</h1>
        <p className="text-xs text-gray-500 mt-0.5">Profile & store preferences</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-28">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-black text-[#ffc400] font-black text-xl flex items-center justify-center shadow-xs">
            {user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-gray-900 truncate">
                {user?.email?.split('@')[0] || 'User'}
              </h2>
              {isAdmin ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-black text-[#ffc400]">
                  ADMIN
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Customer
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 truncate mt-0.5">{user?.email}</p>
          </div>
        </div>

        {/* Admin Shortcut if Admin */}
        {isAdmin && (
          <div
            onClick={onAdmin}
            className="bg-black text-white rounded-2xl p-4 flex items-center justify-between cursor-pointer active:scale-95 transition-transform shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#ffc400] text-black flex items-center justify-center font-bold">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-black text-white">RenewX Admin Panel</p>
                <p className="text-xs text-gray-400">Manage products, orders & user roles</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[#ffc400]" />
          </div>
        )}

        {/* Navigation Options */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
          <button
            onClick={onViewOrders}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-xs font-bold text-gray-900">Your Orders & Invoices</p>
                <p className="text-[10px] text-gray-400">View past certified purchases</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>

          <button
            onClick={onShopNow}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <HelpCircle className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-xs font-bold text-gray-900">Certified Warranty Check</p>
                <p className="text-[10px] text-gray-400">6-month guarantee policy</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>

          <a
            href="https://wa.me/919876543210"
            target="_blank"
            rel="noreferrer"
            className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <MessageCircle className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="text-xs font-bold text-gray-900">WhatsApp VIP Concierge</p>
                <p className="text-[10px] text-gray-400">Instant technical support</p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-400" />
          </a>
        </div>

        {/* Logout Button */}
        <button
          onClick={signOut}
          className="w-full p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform hover:bg-red-100"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out of RenewX CREW</span>
        </button>
      </div>
    </div>
  );
}
