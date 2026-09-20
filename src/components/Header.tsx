import { ShoppingCart, Recycle, Search, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useCart } from '@/context/CartContext';

interface HeaderProps {
  onSearch: (query: string) => void;
  onLogoClick: () => void;
}

export default function Header({ onSearch, onLogoClick }: HeaderProps) {
  const { totalItems, setIsCartOpen } = useCart();
  const [query, setQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <button onClick={onLogoClick} className="flex items-center gap-2.5 shrink-0">
            <img
              src="/images/renewx-crew-logo.png"
              alt="RenewX Crew"
              className="w-10 h-10 rounded-xl object-contain bg-white border border-gray-200 shadow-sm"
            />
            <span className="text-xl font-bold tracking-tight text-gray-900">
              Renew<span className="text-[#ffc400]">X</span>
            </span>
          </button>

          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  onSearch(e.target.value);
                }}
                placeholder="Search renewed electronics..."
                className="w-full pl-10 pr-4 py-2.5 rounded-full bg-gray-100 border border-transparent focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-sm text-gray-900 placeholder:text-gray-400"
              />
            </div>
          </form>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <a href="#products" className="hover:text-emerald-600 transition-colors">Shop</a>
            <a href="#how" className="hover:text-emerald-600 transition-colors">How It Works</a>
            <a href="#warranty" className="hover:text-emerald-600 transition-colors">Warranty</a>
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2.5 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Open cart"
            >
              <ShoppingCart className="w-5 h-5 text-gray-700" />
              {totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-emerald-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 animate-in fade-in zoom-in duration-300">
                  {totalItems}
                </span>
              )}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2.5 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden pb-4 space-y-3">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    onSearch(e.target.value);
                  }}
                  placeholder="Search renewed electronics..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-full bg-gray-100 text-sm text-gray-900"
                />
              </div>
            </form>
            <nav className="flex flex-col gap-3 text-sm font-medium text-gray-600 px-1">
              <a href="#products" onClick={() => setMobileMenuOpen(false)} className="hover:text-emerald-600">Shop</a>
              <a href="#how" onClick={() => setMobileMenuOpen(false)} className="hover:text-emerald-600">How It Works</a>
              <a href="#warranty" onClick={() => setMobileMenuOpen(false)} className="hover:text-emerald-600">Warranty</a>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
