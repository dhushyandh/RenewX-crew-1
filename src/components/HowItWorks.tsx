import { Search, Wrench, Truck, ShieldCheck } from 'lucide-react';

const steps = [
  { icon: Search, title: 'Browse & Choose', desc: 'Pick from our wide range of certified refurbished electronics, all with clear condition ratings.' },
  { icon: Wrench, title: 'Tested & Restored', desc: 'Every device goes through a 50-point inspection, professional cleaning, and component replacement.' },
  { icon: Truck, title: 'Free Delivery', desc: 'Get your renewed device delivered to your door with free carbon-neutral shipping.' },
  { icon: ShieldCheck, title: 'Warranty & Returns', desc: 'Enjoy up to 12 months warranty and 14-day hassle-free returns on every purchase.' },
];

export default function HowItWorks() {
  return (
    <section id="how" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">How RenewX Works</h2>
          <p className="text-gray-500 text-lg">From testing to your doorstep — a simple, transparent process.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <div key={i} className="relative p-6 rounded-2xl border border-gray-200 hover:border-emerald-300 hover:shadow-lg transition-all group">
              <div className="absolute top-4 right-4 text-5xl font-bold text-gray-100 group-hover:text-emerald-50 transition-colors">
                {i + 1}
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center mb-4 transition-colors">
                <step.icon className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
