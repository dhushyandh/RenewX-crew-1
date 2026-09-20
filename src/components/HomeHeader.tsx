import { Search, LayoutDashboard, ShoppingCart, LogOut, Smartphone } from 'lucide-react';

interface HomeHeaderProps {
  onSearch: () => void;
  cartCount: number;
  onCart: () => void;
  isAdmin: boolean;
  onAdmin: () => void;
  onLogout: () => void;
}

export default function HomeHeader({
  onSearch,
  cartCount,
  onCart,
  isAdmin,
  onAdmin,
  onLogout,
}: HomeHeaderProps) {
  return (
    <div className="px-4 py-3 bg-white border-b border-[#e6e2d8] flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <img
          src="/images/renewx-crew-logo.png"
          alt="RenewX Crew"
          className="w-10 h-10 rounded-xl object-contain bg-white border border-[#e5e1d8] shadow-sm"
        />
        <div className="leading-none">
          <span className="block text-[20px] font-black tracking-tight text-black">
            Renew<span className="text-[#ffc400]">X</span>
          </span>
          <span className="block text-[9px] font-bold tracking-[0.28em] text-black mt-0.5">
            CREW
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onSearch}
          className="w-10 h-10 rounded-xl border border-[#e5e1d8] flex items-center justify-center active:bg-[#fff8d8]"
        >
          <Search className="w-5 h-5 text-black" />
        </button>
        {isAdmin && (
          <button
            onClick={onAdmin}
            className="w-10 h-10 rounded-xl border border-[#e5e1d8] flex items-center justify-center active:bg-[#fff8d8]"
          >
            <LayoutDashboard className="w-5 h-5 text-black" />
          </button>
        )}
        <button
          onClick={onCart}
          className="w-10 h-10 rounded-xl border border-[#e5e1d8] flex items-center justify-center active:bg-[#fff8d8] relative"
        >
          <ShoppingCart className="w-5 h-5 text-black" />
          {cartCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-[#ffc400] rounded-full text-black text-[10px] font-bold flex items-center justify-center px-1">
              {cartCount}
            </span>
          )}
        </button>
        <button
          onClick={onLogout}
          className="w-10 h-10 rounded-xl border border-[#e5e1d8] flex items-center justify-center active:bg-[#fff8d8]"
        >
          <LogOut className="w-5 h-5 text-black" />
        </button>
      </div>
    </div>
  );
}
