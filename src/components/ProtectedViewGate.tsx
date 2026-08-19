import React, { useState, useEffect, useRef } from 'react';
import { Lock, Eye, EyeOff, X, ShieldCheck } from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────
const GATE_PASSWORD = '123456#';
const sessionKey = (view: string) => `gate_unlocked_${view}`;

// ─── Types ────────────────────────────────────────────────────────────────────
interface ProtectedViewGateProps {
  viewId: string;
  label: string;
  onUnlock: () => void;
  onCancel: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
const ProtectedViewGate: React.FC<ProtectedViewGateProps> = ({
  viewId,
  label,
  onUnlock,
  onCancel,
}) => {
  const [input, setInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [shaking, setShaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const triggerShake = () => {
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input === GATE_PASSWORD) {
      try { sessionStorage.setItem(sessionKey(viewId), '1'); } catch {}
      onUnlock();
    } else {
      setError('Incorrect password. Try again.');
      setInput('');
      triggerShake();
      inputRef.current?.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
        style={shaking ? { animation: 'shake 0.4s ease-in-out' } : {}}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2e5490] px-6 pt-6 pb-5 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
                <Lock className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-widest text-white/70">
                Protected Section
              </span>
            </div>
            <button
              onClick={onCancel}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              aria-label="Cancel"
            >
              <X className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
          <h2 className="text-lg font-bold leading-tight">{label}</h2>
          <p className="text-xs text-white/60 mt-0.5">Enter your access password to continue.</p>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Password
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                value={input}
                onChange={(e) => { setInput(e.target.value); setError(''); }}
                placeholder="Enter password"
                className={`w-full px-4 py-2.5 pr-10 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 transition-all ${
                  error
                    ? 'border-red-400 bg-red-50 text-red-700 focus:ring-red-300'
                    : 'border-slate-200 bg-slate-50 text-slate-800 focus:ring-[#3C6CA8]/40 focus:border-[#3C6CA8]'
                }`}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {error && (
              <p className="text-xs text-red-500 font-medium">⚠ {error}</p>
            )}
          </div>

          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!input}
              className="flex-1 px-4 py-2.5 rounded-xl bg-[#1e3a5f] text-white text-sm font-semibold hover:bg-[#2e5490] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              Unlock
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-8px); }
          30% { transform: translateX(8px); }
          45% { transform: translateX(-6px); }
          60% { transform: translateX(6px); }
          75% { transform: translateX(-3px); }
          90% { transform: translateX(3px); }
        }
      `}</style>
    </div>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
/**
 * useViewGate — intercepts navigation to a protected view.
 * Returns `request(proceed)` to call instead of directly changing the view,
 * and `node` which mounts the password modal when active.
 */
export function useViewGate(viewId: string, label: string) {
  const [pending, setPending] = useState<(() => void) | null>(null);

  const request = (proceed: () => void) => {
    try {
      if (sessionStorage.getItem(sessionKey(viewId)) === '1') {
        proceed();
        return;
      }
    } catch {}
    setPending(() => proceed);
  };

  const node = pending ? (
    <ProtectedViewGate
      viewId={viewId}
      label={label}
      onUnlock={() => { pending?.(); setPending(null); }}
      onCancel={() => setPending(null)}
    />
  ) : null;

  return { request, node };
}

export default ProtectedViewGate;
