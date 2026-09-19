import { Recycle, Mail, Twitter, Instagram, Facebook } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <Recycle className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white">Renew<span className="text-emerald-400">X</span></span>
            </div>
            <p className="text-sm leading-relaxed">
              Premium refurbished electronics with warranty. Save money, save the planet.
            </p>
            <div className="flex gap-3 mt-4">
              {[Twitter, Instagram, Facebook].map((Icon, i) => (
                <a key={i} href="#" className="w-9 h-9 rounded-full bg-white/10 hover:bg-emerald-600 flex items-center justify-center transition-colors">
                  <Icon className="w-4 h-4 text-white" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Shop</h4>
            <ul className="space-y-2.5 text-sm">
              <li><a href="#products" className="hover:text-emerald-400 transition-colors">Laptops</a></li>
              <li><a href="#products" className="hover:text-emerald-400 transition-colors">Phones</a></li>
              <li><a href="#products" className="hover:text-emerald-400 transition-colors">Audio</a></li>
              <li><a href="#products" className="hover:text-emerald-400 transition-colors">Wearables</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Company</h4>
            <ul className="space-y-2.5 text-sm">
              <li><a href="#how" className="hover:text-emerald-400 transition-colors">How It Works</a></li>
              <li><a href="#warranty" className="hover:text-emerald-400 transition-colors">Warranty</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Sustainability</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Contact</a></li>
            </ul>
          </div>

          <div className="col-span-2 md:col-span-1">
            <h4 className="text-white font-semibold text-sm mb-4">Stay Updated</h4>
            <p className="text-sm mb-3">Get deals on renewed tech delivered to your inbox.</p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="email"
                  placeholder="Email address"
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-white/10 border border-white/10 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <button className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors">
                Join
              </button>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p>© 2026 RenewX. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-emerald-400 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-emerald-400 transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
