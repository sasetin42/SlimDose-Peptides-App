import React, { useEffect, useState } from 'react';
import { X, Sparkles, ArrowRight, Clock } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

/**
 * Storefront Promo Popup — renders the popup configured in Admin → Popup Manager.
 * Honors: enabled flag, delay seconds, display frequency (once per visitor /
 * every N days / every visit), page filter, close-on-outside-click, and countdown.
 */
const DISMISS_KEY = 'sldp_popup_last_shown';
const SUBSCRIBED_KEY = 'sldp_promo_subscribed';

const PromoPopup: React.FC = () => {
  const location = useLocation();
  const [settings, setSettings] = useState<any>(null);
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [now, setNow] = useState(Date.now());

  // Load popup config (cached in localStorage for instant mount)
  useEffect(() => {
    try {
      const cached = localStorage.getItem('slimdose_popup_settings');
      if (cached) applySettings(JSON.parse(cached));
    } catch {}
    (async () => {
      try {
        const { data } = await supabase.from('site_settings').select('id, value');
        const map: Record<string, string> = {};
        ((data as any[]) || []).forEach((r) => { map[r.id] = r.value; });
        const s = {
          popup_enabled: map.popup_enabled,
          popup_title: map.popup_title,
          popup_description: map.popup_description,
          popup_link: map.popup_link,
          popup_image: map.popup_image,
          popup_countdown_enabled: map.popup_countdown_enabled,
          popup_countdown_ends_at: map.popup_countdown_ends_at,
          popup_delay_seconds: map.popup_delay_seconds,
          popup_display_behavior: map.popup_display_behavior,
          popup_page_filter: map.popup_page_filter,
          popup_close_on_outside_click: map.popup_close_on_outside_click,
        };
        localStorage.setItem('slimdose_popup_settings', JSON.stringify(s));
        applySettings(s);
      } catch {}
    })();
  }, []);

  const applySettings = (s: any) => {
    setSettings(s);
  };

  // Visibility engine: delay + frequency + page filter
  useEffect(() => {
    if (!settings) return;
    if (settings.popup_enabled === 'false') return;
    if (localStorage.getItem(SUBSCRIBED_KEY) === '1') return;

    // Page filter: 'all' or a path substring (e.g. '/products')
    const filter = String(settings.popup_page_filter || 'all');
    if (filter !== 'all' && filter && !location.pathname.includes(filter)) return;

    // Frequency capping
    const behavior = String(settings.popup_display_behavior || 'once_visitor');
    const lastShown = Number(localStorage.getItem(DISMISS_KEY) || 0);
    const elapsedDays = (Date.now() - lastShown) / (24 * 60 * 60 * 1000);
    if (behavior === 'once_visitor' && lastShown > 0) return;
    if (behavior.startsWith('every_') && lastShown > 0) {
      const days = Number(behavior.replace('every_', '').replace('_days', '')) || 1;
      if (elapsedDays < days) return;
    }
    // 'every_visit' → always show

    const delayMs = Math.max(0, Number(settings.popup_delay_seconds ?? 5) || 0) * 1000;
    const t = setTimeout(() => {
      setVisible(true);
      try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
    }, delayMs);
    return () => clearTimeout(t);
  }, [settings, location.pathname]);

  // Countdown ticker
  useEffect(() => {
    if (!visible || settings?.popup_countdown_enabled !== 'true') return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [visible, settings]);

  if (!visible || !settings) return null;

  const dismiss = () => setVisible(false);

  const countdownEnd = settings.popup_countdown_ends_at ? new Date(settings.popup_countdown_ends_at).getTime() : 0;
  const remaining = countdownEnd - now;
  const showCountdown = settings.popup_countdown_enabled === 'true' && remaining > 0;
  const hrs = Math.max(0, Math.floor(remaining / 3600000));
  const mins = Math.max(0, Math.floor((remaining % 3600000) / 60000));
  const secs = Math.max(0, Math.floor((remaining % 60000) / 1000));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return;
    setStatus('submitting');
    try {
      await supabase.from('subscribers').insert([{ email: email.trim().toLowerCase(), source: 'popup' }]);
    } catch {}
    localStorage.setItem(SUBSCRIBED_KEY, '1');
    setStatus('success');
    setTimeout(dismiss, 2500);
  };

  const linkUrl = settings.popup_link && settings.popup_link !== 'none' ? settings.popup_link : '/products';

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (settings.popup_close_on_outside_click !== 'false' && e.target === e.currentTarget) dismiss();
      }}
    >
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 z-10 p-1.5 bg-white/90 dark:bg-slate-800/90 rounded-full text-slate-500 hover:text-slate-800 dark:hover:text-white shadow-sm cursor-pointer"
          aria-label="Close popup"
        >
          <X className="w-4 h-4" />
        </button>

        {settings.popup_image && (
          <img src={settings.popup_image} alt="" className="w-full h-40 object-cover" />
        )}

        <div className="p-6 space-y-4 text-center">
          <div className="w-10 h-10 rounded-2xl bg-[#3C6CA8]/10 text-[#3C6CA8] flex items-center justify-center mx-auto">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white">
            {settings.popup_title || 'Get Exclusive Deals!'}
          </h3>
          {settings.popup_description && (
            <p className="text-sm text-slate-500 dark:text-slate-400">{settings.popup_description}</p>
          )}

          {showCountdown && (
            <div className="flex items-center justify-center gap-1.5">
              {[
                { v: hrs, l: 'HRS' },
                { v: mins, l: 'MIN' },
                { v: secs, l: 'SEC' },
              ].map((u) => (
                <div key={u.l} className="px-2.5 py-1.5 bg-slate-900 text-white rounded-lg text-center min-w-[44px]">
                  <p className="text-sm font-black leading-none">{String(u.v).padStart(2, '0')}</p>
                  <p className="text-[8px] font-bold opacity-70 mt-0.5">{u.l}</p>
                </div>
              ))}
              <Clock className="w-4 h-4 text-slate-400 ml-1" />
            </div>
          )}

          {status === 'success' ? (
            <p className="text-sm font-black text-emerald-600 py-2">🎉 You're in! Check your inbox.</p>
          ) : (
            <form onSubmit={submit} className="flex items-center gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="flex-1 px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-[#3C6CA8]/30"
              />
              <button
                type="submit"
                disabled={status === 'submitting'}
                className="px-4 py-2.5 bg-[#3C6CA8] hover:bg-[#315A8E] text-white rounded-xl text-sm font-black disabled:opacity-50 cursor-pointer flex items-center gap-1"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          <a href={linkUrl} onClick={dismiss} className="block text-[11px] font-bold text-[#3C6CA8] hover:underline">
            Continue browsing →
          </a>
        </div>
      </div>
    </div>
  );
};

export default PromoPopup;
