import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

/* ─── Individual Toast Item ─────────────────────────────────────────────── */
const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="w-5 h-5 flex-shrink-0" />,
  error:   <XCircle    className="w-5 h-5 flex-shrink-0" />,
  warning: <AlertTriangle className="w-5 h-5 flex-shrink-0" />,
  info:    <Info       className="w-5 h-5 flex-shrink-0" />,
};

const STYLES: Record<ToastType, { wrap: string; icon: string; bar: string }> = {
  success: {
    wrap: 'bg-white border border-green-200 shadow-lg',
    icon: 'text-green-500',
    bar:  'bg-green-400',
  },
  error: {
    wrap: 'bg-white border border-red-200 shadow-lg',
    icon: 'text-red-500',
    bar:  'bg-red-400',
  },
  warning: {
    wrap: 'bg-white border border-amber-200 shadow-lg',
    icon: 'text-amber-500',
    bar:  'bg-amber-400',
  },
  info: {
    wrap: 'bg-white border border-brand-200 shadow-lg',
    icon: 'text-brand-500',
    bar:  'bg-brand-400',
  },
};

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const duration = toast.duration ?? 4000;
  const s = STYLES[toast.type];

  // Mount animation
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  // Auto-dismiss
  useEffect(() => {
    const t = setTimeout(() => dismiss(), duration);
    return () => clearTimeout(t);
  }, [duration]);

  const dismiss = () => {
    setLeaving(true);
    setTimeout(() => onRemove(toast.id), 350);
  };

  return (
    <div
      style={{
        transform: visible && !leaving ? 'translateX(0)' : 'translateX(110%)',
        opacity: leaving ? 0 : 1,
        transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease',
      }}
      className={`relative flex items-start gap-3 w-80 max-w-[calc(100vw-2rem)] rounded-xl px-4 py-3 mb-2 cursor-pointer select-none ${s.wrap}`}
      onClick={dismiss}
      role="alert"
    >
      {/* Icon */}
      <span className={`mt-0.5 ${s.icon}`}>{ICONS[toast.type]}</span>

      {/* Message */}
      <p className="flex-1 text-sm font-medium text-gray-800 leading-snug pr-4">{toast.message}</p>

      {/* Close button */}
      <button
        onClick={(e) => { e.stopPropagation(); dismiss(); }}
        className="absolute top-2.5 right-2.5 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] rounded-b-xl overflow-hidden">
        <div
          className={`h-full ${s.bar} origin-left`}
          style={{
            animation: `toast-progress ${duration}ms linear forwards`,
          }}
        />
      </div>
    </div>
  );
};

/* ─── Provider ───────────────────────────────────────────────────────────── */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration = 4000) => {
    const id = `toast-${++counterRef.current}-${Date.now()}`;
    setToasts(prev => {
      // Keep max 5 toasts
      const next = prev.length >= 5 ? prev.slice(1) : prev;
      return [...next, { id, type, message, duration }];
    });
  }, []);

  const success = useCallback((m: string, d?: number) => showToast(m, 'success', d), [showToast]);
  const error   = useCallback((m: string, d?: number) => showToast(m, 'error', d), [showToast]);
  const warning = useCallback((m: string, d?: number) => showToast(m, 'warning', d), [showToast]);
  const info    = useCallback((m: string, d?: number) => showToast(m, 'info', d), [showToast]);

  // Listen for window toast events from hooks (useCart etc.)
  useEffect(() => {
    const handler = (e: Event) => {
      const { message, type, duration } = (e as CustomEvent).detail ?? {};
      if (message) showToast(message, type ?? 'info', duration);
    };
    window.addEventListener('slimdose:toast', handler);
    return () => window.removeEventListener('slimdose:toast', handler);
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}

      {/* Toast Container — top-right */}
      <div
        className="fixed top-4 right-4 z-[9999] flex flex-col items-end pointer-events-none"
        aria-live="polite"
      >
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onRemove={removeToast} />
          </div>
        ))}
      </div>

      <style>{`
        @keyframes toast-progress {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
};

/* ─── Helper: fire toast from outside React ──────────────────────────────── */
export function fireToast(message: string, type: ToastType = 'info', duration?: number) {
  window.dispatchEvent(new CustomEvent('slimdose:toast', {
    detail: { message, type, duration },
  }));
}
