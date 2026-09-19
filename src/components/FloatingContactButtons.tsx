import { Phone, Instagram, MessageCircle } from 'lucide-react';

export default function FloatingContactButtons() {
  return (
    <div className="fixed right-3 bottom-24 z-40 flex flex-col gap-2.5 items-center pointer-events-auto">
      {/* WhatsApp Button */}
      <a
        href="https://wa.me/919876543210?text=Hi%20RenewX%2C%20I%20have%20an%20inquiry%20about%20a%20certified%20device."
        target="_blank"
        rel="noreferrer"
        className="w-11 h-11 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all"
        title="Chat on WhatsApp"
      >
        <MessageCircle className="w-5 h-5 fill-white stroke-none" />
      </a>

      {/* Phone Call Button */}
      <a
        href="tel:+919876543210"
        className="w-11 h-11 rounded-full bg-[#111827] text-[#ffc400] flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all"
        title="Call RenewX Concierge"
      >
        <Phone className="w-5 h-5 fill-[#ffc400] stroke-none" />
      </a>

      {/* Instagram Button */}
      <a
        href="https://instagram.com"
        target="_blank"
        rel="noreferrer"
        className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#f09433] via-[#e6683c] via-[#dc2743] via-[#cc2366] to-[#bc1888] text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all"
        title="Follow us on Instagram"
      >
        <Instagram className="w-5 h-5" />
      </a>
    </div>
  );
}
