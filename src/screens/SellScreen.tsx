import { useState } from 'react';
import {
  Smartphone,
  Laptop,
  Tablet,
  Watch,
  Headphones,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Truck,
  Banknote,
  Search,
  Check,
} from 'lucide-react';

interface SellCategory {
  id: string;
  title: string;
  subtitle: string;
  brands: string;
  icon: typeof Smartphone;
  defaultValuation: number;
}

const SELL_CATEGORIES: SellCategory[] = [
  {
    id: 'phones',
    title: 'Mobile Phones',
    subtitle: 'Smartphones & Flagships',
    brands: 'Apple, Samsung, OnePlus, Google',
    icon: Smartphone,
    defaultValuation: 45000,
  },
  {
    id: 'macbooks',
    title: 'MacBooks',
    subtitle: 'Apple Silicon & Intel',
    brands: 'M3 Pro, M2, Air & Pro',
    icon: Laptop,
    defaultValuation: 68000,
  },
  {
    id: 'laptops',
    title: 'Windows Laptops',
    subtitle: 'Gaming & Ultrabooks',
    brands: 'Dell, HP, Lenovo, ASUS',
    icon: Laptop,
    defaultValuation: 42000,
  },
  {
    id: 'tablets',
    title: 'Tablets & iPads',
    subtitle: 'Pro, Air & Mini',
    brands: 'Apple iPad, Samsung Tab',
    icon: Tablet,
    defaultValuation: 28000,
  },
  {
    id: 'wearables',
    title: 'Smartwatches & Audio',
    subtitle: 'Wearables & Earbuds',
    brands: 'Apple Watch, AirPods, Sony',
    icon: Watch,
    defaultValuation: 16000,
  },
];

const BRAND_MODELS: Record<string, string[]> = {
  phones: [
    'iPhone 15 Pro Max',
    'iPhone 15 Pro',
    'iPhone 15',
    'iPhone 14 Pro Max',
    'iPhone 13',
    'Galaxy S24 Ultra',
    'Galaxy S23',
    'Pixel 8 Pro',
    'OnePlus 12',
  ],
  macbooks: [
    'MacBook Pro 16" (M3 Max)',
    'MacBook Pro 14" (M3 Pro)',
    'MacBook Air 15" (M2)',
    'MacBook Air 13" (M2)',
    'MacBook Pro 14" (M1 Pro)',
  ],
  laptops: [
    'Dell XPS 15',
    'ThinkPad X1 Carbon',
    'HP Spectre x360',
    'ASUS ROG Zephyrus G14',
    'Alienware m16',
  ],
  tablets: [
    'iPad Pro 12.9" (M2)',
    'iPad Air (M1)',
    'iPad 10th Gen',
    'Galaxy Tab S9 Ultra',
    'iPad Mini 6',
  ],
  wearables: [
    'Apple Watch Ultra 2',
    'Apple Watch Series 9',
    'AirPods Max',
    'Sony WH-1000XM5',
    'Galaxy Watch 6 Classic',
  ],
};

export default function SellScreen({ onComplete }: { onComplete?: () => void }) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedCategory, setSelectedCategory] = useState<SellCategory>(SELL_CATEGORIES[0]);
  const [selectedModel, setSelectedModel] = useState('');
  const [storage, setStorage] = useState('256GB');
  const [screenCondition, setScreenCondition] = useState<'flawless' | 'good' | 'scratched'>('flawless');
  const [bodyCondition, setBodyCondition] = useState<'flawless' | 'good' | 'dented'>('flawless');
  const [hasOriginalBox, setHasOriginalBox] = useState(true);
  const [hasOriginalCharger, setHasOriginalCharger] = useState(true);

  // Contact for Step 4
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Calculate quote dynamically
  const calculateValuation = () => {
    let base = selectedCategory.defaultValuation;
    if (selectedModel.includes('Max') || selectedModel.includes('Ultra')) base += 15000;
    if (storage === '512GB') base += 5000;
    if (storage === '1TB') base += 9000;
    if (screenCondition === 'scratched') base -= 4000;
    if (bodyCondition === 'dented') base -= 3500;
    if (!hasOriginalBox) base -= 1000;
    if (!hasOriginalCharger) base -= 1500;
    return Math.max(8000, base);
  };

  const estimatedValue = calculateValuation();

  const handleCategorySelect = (cat: SellCategory) => {
    setSelectedCategory(cat);
    setSelectedModel(BRAND_MODELS[cat.id]?.[0] || '');
    setStep(2);
  };

  const handleSubmitPickup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !address.trim()) {
      alert('Please fill in your name, contact number, and pickup address.');
      return;
    }
    setIsSubmitted(true);
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc]">
      {/* Top Stepper Bar matching Screenshot 2 */}
      <div className="bg-white px-6 py-4 border-b border-gray-200">
        <div className="max-w-md mx-auto flex items-center justify-between relative">
          <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-0.5 bg-gray-200 z-0" />
          {[1, 2, 3, 4].map((num) => {
            const isActive = step === num;
            const isDone = step > num;
            return (
              <button
                key={num}
                onClick={() => {
                  if (num < step) setStep(num as any);
                }}
                className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center font-black text-xs transition-all ${
                  isActive
                    ? 'bg-black text-[#ffc400] ring-4 ring-[#ffc400]/30 shadow-sm'
                    : isDone
                    ? 'bg-[#10b981] text-white shadow-xs'
                    : 'bg-gray-100 text-gray-400 border border-gray-200'
                }`}
              >
                {isDone ? <Check className="w-4 h-4 stroke-[3]" /> : num}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 pb-28">
        {/* STEP 1: Select Category */}
        {step === 1 && (
          <div className="space-y-4 max-w-md mx-auto">
            <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight">
                Step 1: Select Your Device Category
              </h1>
              <p className="text-xs text-gray-500 mt-1">
                Choose the category of electronics you wish to sell.
              </p>
            </div>

            <div className="space-y-3">
              {SELL_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = selectedCategory.id === cat.id;
                return (
                  <div
                    key={cat.id}
                    onClick={() => handleCategorySelect(cat)}
                    className={`p-4 rounded-2xl cursor-pointer transition-all active:scale-[0.98] ${
                      isSelected
                        ? 'bg-[#fffdf0] border-2 border-[#ffc400] shadow-sm'
                        : 'bg-white border border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-11 h-11 rounded-xl bg-black flex items-center justify-center text-[#ffc400] shadow-xs">
                        <Icon className="w-5 h-5 text-[#ffc400]" />
                      </div>
                      <span className="text-xs font-bold text-gray-700 flex items-center gap-1">
                        Select <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>

                    <div className="mt-3">
                      <h3 className="text-base font-black text-gray-900">{cat.title}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{cat.subtitle}</p>
                      <p className="text-[11px] font-bold text-gray-700 mt-2">{cat.brands}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2: Select Model & Storage */}
        {step === 2 && (
          <div className="space-y-4 max-w-md mx-auto">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-black"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Categories
            </button>

            <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight">
                Step 2: Select Your Model
              </h1>
              <p className="text-xs text-gray-500 mt-1">
                Choose the specific {selectedCategory.title.toLowerCase()} variant.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-gray-200 space-y-3">
              <label className="text-xs font-bold text-gray-700 block">Device Model</label>
              <div className="space-y-2">
                {(BRAND_MODELS[selectedCategory.id] || []).map((m) => (
                  <button
                    key={m}
                    onClick={() => setSelectedModel(m)}
                    className={`w-full text-left p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-between ${
                      selectedModel === m
                        ? 'bg-black text-[#ffc400] border-black'
                        : 'bg-gray-50 border-gray-200 text-gray-800 hover:bg-gray-100'
                    }`}
                  >
                    <span>{m}</span>
                    {selectedModel === m && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>

              <label className="text-xs font-bold text-gray-700 block pt-2">
                Storage Capacity
              </label>
              <div className="grid grid-cols-4 gap-2">
                {['128GB', '256GB', '512GB', '1TB'].map((cap) => (
                  <button
                    key={cap}
                    onClick={() => setStorage(cap)}
                    className={`py-2 text-center rounded-xl text-xs font-bold border ${
                      storage === cap
                        ? 'bg-black text-[#ffc400] border-black'
                        : 'bg-white border-gray-200 text-gray-700'
                    }`}
                  >
                    {cap}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setStep(3)}
              disabled={!selectedModel}
              className="w-full py-3.5 rounded-xl bg-black text-[#ffc400] font-black text-sm flex items-center justify-center gap-2 active:scale-95 shadow-sm disabled:opacity-50"
            >
              <span>Continue to Condition Check</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 3: Condition Questionnaire */}
        {step === 3 && (
          <div className="space-y-4 max-w-md mx-auto">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-black"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Model
            </button>

            <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight">
                Step 3: Device Condition
              </h1>
              <p className="text-xs text-gray-500 mt-1">
                Answer these simple questions for an accurate instant cash offer.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-gray-200 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-2">
                  Screen Condition
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'flawless', label: 'Flawless', desc: 'No scratches' },
                    { id: 'good', label: 'Good', desc: 'Light marks' },
                    { id: 'scratched', label: 'Heavy', desc: 'Cracks/Dents' },
                  ].map((cond) => (
                    <button
                      key={cond.id}
                      onClick={() => setScreenCondition(cond.id as any)}
                      className={`p-2.5 rounded-xl border text-center ${
                        screenCondition === cond.id
                          ? 'bg-[#fffdf0] border-[#ffc400] text-black font-bold'
                          : 'bg-white border-gray-200 text-gray-600'
                      }`}
                    >
                      <p className="text-xs font-bold">{cond.label}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{cond.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-2">
                  Body & Edge Condition
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'flawless', label: 'Pristine', desc: 'Zero dents' },
                    { id: 'good', label: 'Minor Wear', desc: 'Few scuffs' },
                    { id: 'dented', label: 'Dented', desc: 'Visible damage' },
                  ].map((cond) => (
                    <button
                      key={cond.id}
                      onClick={() => setBodyCondition(cond.id as any)}
                      className={`p-2.5 rounded-xl border text-center ${
                        bodyCondition === cond.id
                          ? 'bg-[#fffdf0] border-[#ffc400] text-black font-bold'
                          : 'bg-white border-gray-200 text-gray-600'
                      }`}
                    >
                      <p className="text-xs font-bold">{cond.label}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{cond.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-2">
                  Included Accessories
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-gray-200 bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasOriginalBox}
                      onChange={(e) => setHasOriginalBox(e.target.checked)}
                      className="w-4 h-4 rounded text-black accent-black"
                    />
                    <span className="text-xs font-semibold text-gray-800">
                      Original Packaging / Box
                    </span>
                  </label>
                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-gray-200 bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasOriginalCharger}
                      onChange={(e) => setHasOriginalCharger(e.target.checked)}
                      className="w-4 h-4 rounded text-black accent-black"
                    />
                    <span className="text-xs font-semibold text-gray-800">
                      Original Charging Cable & Adapter
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep(4)}
              className="w-full py-3.5 rounded-xl bg-black text-[#ffc400] font-black text-sm flex items-center justify-center gap-2 active:scale-95 shadow-sm"
            >
              <span>Get Instant Valuation Quote</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 4: Valuation Offer & Schedule Pickup */}
        {step === 4 && (
          <div className="space-y-4 max-w-md mx-auto">
            <button
              onClick={() => setStep(3)}
              className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-black"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Condition
            </button>

            {/* Instant Valuation Card */}
            <div className="bg-gradient-to-br from-slate-900 to-black text-white rounded-3xl p-5 border border-slate-800 shadow-xl relative overflow-hidden">
              <div className="absolute right-0 top-0 w-32 h-32 bg-[#ffc400]/10 rounded-full blur-2xl" />
              <span className="px-3 py-1 rounded-full bg-[#ffc400]/20 text-[#ffc400] text-[10px] font-black uppercase tracking-wider">
                Instant Cash Guarantee
              </span>
              <p className="text-xs text-gray-400 mt-2">{selectedModel} · {storage}</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-black text-[#ffc400]">
                  ₹{estimatedValue.toLocaleString('en-IN')}
                </span>
                <span className="text-xs text-emerald-400 font-bold">Guaranteed Price</span>
              </div>
              <p className="text-[11px] text-gray-400 mt-2">
                *Final payout verified upon doorstep technical inspection. Instant UPI transfer at pickup.
              </p>
            </div>

            {/* Guarantees */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white p-3 rounded-2xl border border-gray-200 text-center">
                <Truck className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                <p className="text-[10px] font-bold text-gray-900">Free Pickup</p>
                <p className="text-[9px] text-gray-400">At your doorstep</p>
              </div>
              <div className="bg-white p-3 rounded-2xl border border-gray-200 text-center">
                <Banknote className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                <p className="text-[10px] font-bold text-gray-900">Instant UPI</p>
                <p className="text-[9px] text-gray-400">Paid immediately</p>
              </div>
              <div className="bg-white p-3 rounded-2xl border border-gray-200 text-center">
                <ShieldCheck className="w-5 h-5 text-[#ffc400] mx-auto mb-1" />
                <p className="text-[10px] font-bold text-gray-900">100% Safe</p>
                <p className="text-[9px] text-gray-400">Zero data trace</p>
              </div>
            </div>

            {/* Pickup Form */}
            {isSubmitted ? (
              <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-200 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h3 className="text-base font-black text-emerald-950">
                  Doorstep Pickup Scheduled!
                </h3>
                <p className="text-xs text-emerald-800">
                  Our RenewX Field Representative will reach out to{' '}
                  <span className="font-bold">{phone}</span> to confirm pickup within 2 hours.
                </p>
                <button
                  onClick={() => {
                    setIsSubmitted(false);
                    setStep(1);
                    onComplete?.();
                  }}
                  className="mt-3 px-5 py-2.5 bg-black text-[#ffc400] text-xs font-bold rounded-xl active:scale-95"
                >
                  Sell Another Device
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleSubmitPickup}
                className="bg-white rounded-2xl p-4 border border-gray-200 space-y-3"
              >
                <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                  Pickup & Payment Details
                </h3>

                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">
                    Your Full Name
                  </label>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">
                    Contact Phone Number (For UPI)
                  </label>
                  <input
                    required
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">
                    Doorstep Pickup Address & City
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street, Apartment, Landmark, Pincode"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 outline-none focus:border-black"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-black text-[#ffc400] font-black text-sm active:scale-95 transition-transform shadow-md hover:bg-gray-900 mt-2"
                >
                  Confirm Free Doorstep Pickup
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
