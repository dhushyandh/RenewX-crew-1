import { ShieldCheck, Smartphone } from 'lucide-react';

export default function HeroBanner() {
  return (
    <div className="mx-4 my-3 rounded-[28px] p-5 bg-white border border-[#e7e2d6] relative overflow-hidden shadow-[0_8px_24px_rgba(20,20,20,0.05)]">
      <div className="absolute -right-16 -top-10 w-52 h-52 rounded-full bg-[#fff2a8]"></div>
      <div className="absolute right-0 bottom-0 w-40 h-20 bg-[#ffc400] rounded-tl-[100%] opacity-90"></div>
      <div className="relative z-10 w-[62%]">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-black mb-3">
          <span className="w-2 h-2 rounded-full bg-[#ffc400]"></span> RenewX Crew
        </span>
        <h2 className="text-[25px] font-black text-black leading-[1.05] mb-3">
          Buy. Sell.
          <br />
          Upgrade.
          <br />
          <span className="relative inline-block px-1">
            <span className="absolute inset-x-0 bottom-0 h-3 bg-[#ffc400] -z-10 -rotate-1"></span>
            The Smart Way.
          </span>
        </h2>
        <p className="text-xs text-[#4f4b42] leading-relaxed mb-4">
          Quality checked devices, fair value, and a smarter way to upgrade.
        </p>
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-black">
          <ShieldCheck className="w-4 h-4 text-black" /> Trusted & secure
        </div>
      </div>
      <img
        src="https://images.pexels.com/photos/18311092/pexels-photo-18311092.jpeg?auto=compress&cs=tinysrgb&w=600"
        alt="Featured renewed phone"
        className="absolute right-[-4px] bottom-5 w-[43%] h-44 object-cover rounded-[22px] rotate-6 shadow-xl"
      />
      <div className="absolute right-3 top-3 w-9 h-9 rounded-full bg-black flex items-center justify-center">
        <Smartphone className="w-4 h-4 text-[#ffc400]" />
      </div>
    </div>
  );
}
