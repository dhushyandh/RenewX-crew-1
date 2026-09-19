import { ShieldCheck, Leaf, TrendingDown, ArrowDown } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-emerald-950 to-teal-950 text-white">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-20 w-72 h-72 bg-emerald-500 rounded-full blur-[120px]" />
        <div className="absolute bottom-10 right-20 w-96 h-96 bg-teal-500 rounded-full blur-[150px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-sm font-medium mb-6">
            <Leaf className="w-4 h-4" />
            Certified Refurbished Electronics
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
            Premium Tech,<br />
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              Renewed & Affordable
            </span>
          </h1>
          <p className="text-lg text-gray-300 mb-8 leading-relaxed max-w-xl">
            Shop rigorously tested, professionally refurbished laptops, phones, and more.
            Save up to 40% with a warranty included on every device.
          </p>
          <div className="flex flex-wrap gap-4">
            <a
              href="#products"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-[1.02] active:scale-[0.98]"
            >
              Shop Now
              <ArrowDown className="w-4 h-4" />
            </a>
            <a
              href="#how"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 text-white font-semibold transition-all"
            >
              How It Works
            </a>
          </div>

          <div className="flex flex-wrap gap-6 mt-12 pt-8 border-t border-white/10">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span className="text-sm text-gray-300">Up to 12-month warranty</span>
            </div>
            <div className="flex items-center gap-2.5">
              <TrendingDown className="w-5 h-5 text-emerald-400" />
              <span className="text-sm text-gray-300">Save up to 40%</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Leaf className="w-5 h-5 text-emerald-400" />
              <span className="text-sm text-gray-300">Eco-friendly choice</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
