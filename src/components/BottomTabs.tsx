import { Home as HomeIcon, ShoppingBag, Truck, User } from 'lucide-react';

export type Tab = 'home' | 'shop' | 'sell' | 'track' | 'account' | 'cart' | 'admin';

interface BottomTabsProps {
  active: Tab;
  onChange: (t: Tab) => void;
  cartCount?: number;
  isAdmin?: boolean;
}

export default function BottomTabs({ active, onChange }: BottomTabsProps) {
  return (
    <div
      className="relative flex items-center justify-around border-t border-gray-200 bg-white shadow-lg z-30"
      style={{ paddingBottom: 6, paddingTop: 6, height: 62 }}
    >
      {/* 1. Home */}
      <button
        onClick={() => onChange('home')}
        className="flex-1 flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform"
      >
        <HomeIcon
          className={`w-5 h-5 ${active === 'home' ? 'text-black stroke-[2.5]' : 'text-gray-400'}`}
        />
        <span
          className={`text-[10px] ${
            active === 'home' ? 'text-black font-extrabold' : 'text-gray-400 font-semibold'
          }`}
        >
          Home
        </span>
      </button>

      {/* 2. Shop */}
      <button
        onClick={() => onChange('shop')}
        className="flex-1 flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform"
      >
        <ShoppingBag
          className={`w-5 h-5 ${active === 'shop' ? 'text-black stroke-[2.5]' : 'text-gray-400'}`}
        />
        <span
          className={`text-[10px] ${
            active === 'shop' ? 'text-black font-extrabold' : 'text-gray-400 font-semibold'
          }`}
        >
          Shop
        </span>
      </button>

      {/* 3. Sell (Floating Center Elevated Button) */}
      <div className="flex-1 flex flex-col items-center justify-center relative -top-3">
        <button
          onClick={() => onChange('sell')}
          className={`w-13 h-13 rounded-full flex items-center justify-center active:scale-90 transition-transform shadow-md ${
            active === 'sell'
              ? 'bg-[#111827] ring-4 ring-[#ffc400]/40 shadow-yellow-500/30'
              : 'bg-gradient-to-tr from-[#ffb700] to-[#ffd748] ring-4 ring-white shadow-amber-300/50'
          }`}
          style={{ width: 52, height: 52 }}
          title="Sell your device"
        >
          <span
            className={`text-2xl font-black ${
              active === 'sell' ? 'text-[#ffc400]' : 'text-white'
            }`}
          >
            $
          </span>
        </button>
        <span
          className={`text-[10px] font-extrabold mt-0.5 ${
            active === 'sell' ? 'text-black' : 'text-[#f59e0b]'
          }`}
        >
          Sell
        </span>
      </div>

      {/* 4. Track */}
      <button
        onClick={() => onChange('track')}
        className="flex-1 flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform"
      >
        <Truck
          className={`w-5 h-5 ${active === 'track' ? 'text-black stroke-[2.5]' : 'text-gray-400'}`}
        />
        <span
          className={`text-[10px] ${
            active === 'track' ? 'text-black font-extrabold' : 'text-gray-400 font-semibold'
          }`}
        >
          Track
        </span>
      </button>

      {/* 5. Account */}
      <button
        onClick={() => onChange('account')}
        className="flex-1 flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform"
      >
        <div className="relative">
          <User
            className={`w-5 h-5 ${
              active === 'account' ? 'text-black stroke-[2.5]' : 'text-gray-400'
            }`}
          />
        </div>
        <span
          className={`text-[10px] ${
            active === 'account' ? 'text-black font-extrabold' : 'text-gray-400 font-semibold'
          }`}
        >
          Account
        </span>
      </button>
    </div>
  );
}
