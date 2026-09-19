import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  message: string;
  title?: string;
  type?: ToastType;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextValue {
  show: (options: ToastOptions | string) => void;
  success: (message: string, title?: string, options?: Partial<ToastOptions>) => void;
  error: (message: string, title?: string, options?: Partial<ToastOptions>) => void;
  warning: (message: string, title?: string, options?: Partial<ToastOptions>) => void;
  info: (message: string, title?: string, options?: Partial<ToastOptions>) => void;
  hide: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const THEMES: Record<
  ToastType,
  {
    icon: React.ComponentType<{ className?: string; size?: number }>;
    accentColor: string;
    bgClass: string;
    borderClass: string;
    textAccentClass: string;
    iconBgClass: string;
    defaultTitle: string;
  }
> = {
  success: {
    icon: CheckCircle2,
    accentColor: '#10b981',
    bgClass: 'bg-[#091512]/95',
    borderClass: 'border-emerald-500/40 shadow-emerald-950/40',
    textAccentClass: 'text-emerald-400',
    iconBgClass: 'bg-emerald-500/20 text-emerald-400',
    defaultTitle: 'Success',
  },
  error: {
    icon: AlertCircle,
    accentColor: '#ef4444',
    bgClass: 'bg-[#18090a]/95',
    borderClass: 'border-rose-500/40 shadow-rose-950/40',
    textAccentClass: 'text-rose-400',
    iconBgClass: 'bg-rose-500/20 text-rose-400',
    defaultTitle: 'Action Failed',
  },
  warning: {
    icon: AlertTriangle,
    accentColor: '#f59e0b',
    bgClass: 'bg-[#1a1306]/95',
    borderClass: 'border-amber-500/40 shadow-amber-950/40',
    textAccentClass: 'text-amber-400',
    iconBgClass: 'bg-amber-500/20 text-amber-400',
    defaultTitle: 'Attention',
  },
  info: {
    icon: Info,
    accentColor: '#0ea5e9',
    bgClass: 'bg-[#081520]/95',
    borderClass: 'border-sky-500/40 shadow-sky-950/40',
    textAccentClass: 'text-sky-400',
    iconBgClass: 'bg-sky-500/20 text-sky-400',
    defaultTitle: 'Notice',
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<(ToastOptions & { id: number }) | null>(null);
  const timerRef = useRef<number | null>(null);

  const hide = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setToast(null);
  }, []);

  const show = useCallback(
    (opts: ToastOptions | string) => {
      const normalized: ToastOptions = typeof opts === 'string' ? { message: opts } : opts;
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }

      const id = Date.now();
      setToast({ ...normalized, id });

      const duration = normalized.duration || 3800;
      timerRef.current = window.setTimeout(() => {
        hide();
      }, duration);
    },
    [hide]
  );

  const success = useCallback(
    (message: string, title?: string, options?: Partial<ToastOptions>) => {
      show({ message, title, type: 'success', ...options });
    },
    [show]
  );

  const error = useCallback(
    (message: string, title?: string, options?: Partial<ToastOptions>) => {
      show({ message, title, type: 'error', ...options });
    },
    [show]
  );

  const warning = useCallback(
    (message: string, title?: string, options?: Partial<ToastOptions>) => {
      show({ message, title, type: 'warning', ...options });
    },
    [show]
  );

  const info = useCallback(
    (message: string, title?: string, options?: Partial<ToastOptions>) => {
      show({ message, title, type: 'info', ...options });
    },
    [show]
  );

  const currentTheme = toast ? THEMES[toast.type || 'info'] : THEMES.info;
  const IconComponent = currentTheme.icon;
  const title = toast?.title || currentTheme.defaultTitle;
  const durationMs = toast?.duration || 3800;

  return (
    <ToastContext.Provider value={{ show, success, error, warning, info, hide }}>
      {children}

      {toast && (
        <div
          key={toast.id}
          className="fixed top-5 left-1/2 -translate-x-1/2 z-[99999] w-[92vw] max-w-[440px] pointer-events-auto transition-all animate-in fade-in slide-in-from-top-4 duration-300"
          style={{ animation: 'toastSlideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
        >
          <div
            className={`relative flex items-center gap-3.5 px-4 py-3.5 rounded-2xl border backdrop-blur-xl shadow-2xl overflow-hidden ${currentTheme.bgClass} ${currentTheme.borderClass}`}
          >
            {/* Left Accent Bar */}
            <div
              className="absolute left-0 top-0 bottom-0 w-1"
              style={{ backgroundColor: currentTheme.accentColor }}
            />

            {/* Icon Avatar */}
            <div
              className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${currentTheme.iconBgClass}`}
            >
              <IconComponent size={20} />
            </div>

            {/* Text Message */}
            <div className="flex-1 min-w-0 pr-1">
              {title && (
                <div className={`text-xs font-black uppercase tracking-wider mb-0.5 ${currentTheme.textAccentClass}`}>
                  {title}
                </div>
              )}
              <div className="text-sm font-medium text-slate-200 leading-snug break-words">
                {toast.message}
              </div>
            </div>

            {/* Optional Action Button */}
            {toast.action && (
              <button
                onClick={() => {
                  toast.action?.onClick();
                  hide();
                }}
                className="flex-shrink-0 px-2.5 py-1 text-xs font-bold rounded-lg border transition-all hover:scale-105 active:scale-95"
                style={{
                  borderColor: currentTheme.accentColor,
                  color: currentTheme.accentColor,
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                }}
              >
                {toast.action.label}
              </button>
            )}

            {/* Close Cross */}
            <button
              onClick={hide}
              className="flex-shrink-0 text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>

            {/* Bottom Countdown Progress Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-white/10">
              <div
                className="h-full origin-left"
                style={{
                  backgroundColor: currentTheme.accentColor,
                  animation: `toastCountdown ${durationMs}ms linear forwards`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Embedded CSS keyframes for web toast animation */}
      <style>{`
        @keyframes toastSlideDown {
          from {
            opacity: 0;
            transform: translate(-50%, -20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0) scale(1);
          }
        }
        @keyframes toastCountdown {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
