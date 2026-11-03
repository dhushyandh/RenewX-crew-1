import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export default function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check standalone
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    ) {
      return;
    }

    const lastDismissed = localStorage.getItem('renewx_pwa_dismissed_at');
    if (lastDismissed && Date.now() - parseInt(lastDismissed, 10) < 5 * 24 * 3600 * 1000) {
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      console.log('[PWA] Installed successfully');
      setVisible(false);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    try {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice?.outcome === 'accepted') {
        setVisible(false);
      }
      setDeferredPrompt(null);
    } catch (e) {
      console.warn('Install error:', e);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('renewx_pwa_dismissed_at', Date.now().toString());
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-3 left-3 right-3 max-w-sm mx-auto z-50 bg-slate-900 text-white rounded-2xl p-3 shadow-2xl border border-slate-800 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom duration-300">
      <div className="flex items-center gap-2.5 min-w-0">
        <img src="/icons/icon-192.png" alt="RenewX" className="w-9 h-9 rounded-xl flex-shrink-0" />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-bold truncate">Install RenewX App</p>
            <span className="text-[9px] font-black bg-[#ffc400] text-black px-1.5 py-0.2 rounded">PWA</span>
          </div>
          <p className="text-[10px] text-gray-400 truncate">Fast, lightweight & works offline</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={handleInstall}
          className="bg-[#ffc400] hover:bg-yellow-400 active:scale-95 text-black font-extrabold text-[11px] px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-sm transition-all"
        >
          <Download className="w-3 h-3" />
          <span>Install</span>
        </button>
        <button
          onClick={handleDismiss}
          className="p-1 text-gray-400 hover:text-white transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

