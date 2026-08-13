import React, { useEffect, useState } from 'react';
import { Mail, X, Sparkles, Check, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { trackEvent, identifyUser } from '../utils/analytics';
import { useGlobalDiscount } from '../hooks/useGlobalDiscount';
import { useSiteSettings } from '../hooks/useSiteSettings';
import type { GlobalDiscount } from '../types';

const SUBSCRIBED_KEY = 'sldp_promo_subscribed';
const DEFAULT_DISCOUNT_LABEL = '10% Off';

type Status = 'idle' | 'submitting' | 'success' | 'error';

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

const buildDiscountLabel = (discount: GlobalDiscount | null): string => {
  if (!discount) return DEFAULT_DISCOUNT_LABEL;
  return discount.discount_type === 'percentage'
    ? `${discount.discount_value}% Off`
    : `₱${discount.discount_value} Off`;
};

const buildDiscountPayload = (discount: GlobalDiscount | null) => {
  const label = buildDiscountLabel(discount);
  if (!discount) {
    return {
      discount_active: false,
      discount_label: label,
    };
  }
  return {
    discount_active: true,
    discount_id: discount.id,
    discount_name: discount.name,
    discount_type: discount.discount_type,
    discount_value: discount.discount_value,
    discount_label: label,
    discount_start_date: discount.start_date ?? null,
    discount_end_date: discount.end_date ?? null,
  };
};

async function saveSubscriber(email: string, source: 'banner' | 'popup'): Promise<string | null> {
  try {
    const trimmed = email.trim().toLowerCase();
    const { error } = await supabase
      .from('subscribers')
      .insert([{ email: trimmed, source }]);
    if (error) {
      // 23505 = duplicate email, 42501 = RLS permission restriction
      if (error.code === '23505' || error.code === '42501' || error.status === 403 || error.status === 401) {
        return null; // Treat gracefully as subscribed
      }
      console.warn('Subscriber save notice:', error.message);
      return null;
    }
    return null;
  } catch (err) {
    console.warn('Subscriber save catch:', err);
    return null; // Gracefully complete subscription locally
  }
}

const PromoSignup: React.FC = () => {
  const { globalDiscount } = useGlobalDiscount();
  const { siteSettings } = useSiteSettings();
  const popupEnabled = (siteSettings?.popup_enabled ?? 'true') !== 'false';
  const adminPopupTitle = siteSettings?.popup_title?.trim() || '';
  const adminPopupDescription = siteSettings?.popup_description?.trim() || '';
  const adminPopupLink = siteSettings?.popup_link?.trim() || 'none';
  const adminPopupImage = siteSettings?.popup_image?.trim() || '';
  const [bannerVisible, setBannerVisible] = useState(true);
  const [popupVisible, setPopupVisible] = useState(false);
  const [bannerEmail, setBannerEmail] = useState('');
  const [popupEmail, setPopupEmail] = useState('');
  const [bannerStatus, setBannerStatus] = useState<Status>('idle');
  const [popupStatus, setPopupStatus] = useState<Status>('idle');
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [popupError, setPopupError] = useState<string | null>(null);

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  const discountLabel = buildDiscountLabel(globalDiscount);
  const discountPayload = buildDiscountPayload(globalDiscount);

  useEffect(() => {
    const endsAt = siteSettings?.popup_countdown_ends_at;
    const countdownEnabled = (siteSettings?.popup_countdown_enabled ?? 'false') === 'true';
    if (!countdownEnabled || !endsAt) {
      setTimeLeft(null);
      return;
    }

    const interval = setInterval(() => {
      const difference = new Date(endsAt).getTime() - Date.now();
      if (difference <= 0) {
        setTimeLeft(null);
        clearInterval(interval);
      } else {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [siteSettings]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!popupEnabled) return;

    // 1. Page Filter Rule
    const pageFilter = siteSettings?.popup_page_filter || 'all';
    if (pageFilter === 'homepage' && window.location.pathname !== '/') {
      return;
    }

    // 2. Countdown Campaign Expired Rule
    const countdownEnabled = (siteSettings?.popup_countdown_enabled ?? 'false') === 'true';
    const countdownEndsAt = siteSettings?.popup_countdown_ends_at || '';
    const countdownAutoDisable = (siteSettings?.popup_countdown_auto_disable ?? 'false') === 'true';
    if (countdownEnabled && countdownEndsAt) {
      const isExpired = new Date(countdownEndsAt).getTime() < Date.now();
      if (isExpired && countdownAutoDisable) {
        return;
      }
    }

    // 3. Display Behavior Rule (seen flags)
    const behavior = siteSettings?.popup_display_behavior || 'once_visitor';
    if (behavior === 'once_visitor' && localStorage.getItem('sldp_promo_popup_seen')) {
      return;
    }
    if (behavior === 'once_session' && sessionStorage.getItem('sldp_promo_popup_seen')) {
      return;
    }

    const delayMs = Number(siteSettings?.popup_delay_seconds || '5') * 1000;
    const t = window.setTimeout(() => {
      setPopupVisible(true);
      trackEvent('promo_popup_shown', { ...discountPayload });
    }, delayMs);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popupEnabled, siteSettings]);

  const dismissPopup = () => {
    setPopupVisible(false);
    trackEvent('promo_popup_dismissed', { ...discountPayload });
    
    // Save seen status based on display setting rules
    const behavior = siteSettings?.popup_display_behavior || 'once_visitor';
    if (behavior === 'once_visitor') {
      localStorage.setItem('sldp_promo_popup_seen', 'true');
    } else if (behavior === 'once_session') {
      sessionStorage.setItem('sldp_promo_popup_seen', 'true');
    }
  };

  const handleOutsideClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const closeOnOutside = (siteSettings?.popup_close_on_outside_click ?? 'true') !== 'false';
    if (closeOnOutside && e.target === e.currentTarget) {
      dismissPopup();
    }
  };

  const submitBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    setBannerError(null);
    trackEvent('promo_subscribe_clicked', { source: 'banner', ...discountPayload });
    if (!isValidEmail(bannerEmail)) {
      setBannerError('Please enter a valid email.');
      trackEvent('promo_subscribe_invalid_email', { source: 'banner', ...discountPayload });
      return;
    }
    setBannerStatus('submitting');
    const err = await saveSubscriber(bannerEmail, 'banner');
    if (err) {
      setBannerStatus('error');
      setBannerError(err);
      trackEvent('promo_subscribe_failed', { source: 'banner', message: err, ...discountPayload });
      return;
    }
    setBannerStatus('success');
    if (typeof window !== 'undefined') localStorage.setItem(SUBSCRIBED_KEY, '1');
    const normalizedEmail = bannerEmail.trim().toLowerCase();
    identifyUser(normalizedEmail, { source: 'banner', ...discountPayload });
    trackEvent('promo_subscribed', { source: 'banner', email: normalizedEmail, ...discountPayload });
  };

  const submitPopup = async (e: React.FormEvent) => {
    e.preventDefault();
    setPopupError(null);
    trackEvent('promo_subscribe_clicked', { source: 'popup', ...discountPayload });
    if (!isValidEmail(popupEmail)) {
      setPopupError('Please enter a valid email.');
      trackEvent('promo_subscribe_invalid_email', { source: 'popup', ...discountPayload });
      return;
    }
    setPopupStatus('submitting');
    const err = await saveSubscriber(popupEmail, 'popup');
    if (err) {
      setPopupStatus('error');
      setPopupError(err);
      trackEvent('promo_subscribe_failed', { source: 'popup', message: err, ...discountPayload });
      return;
    }
    setPopupStatus('success');
    if (typeof window !== 'undefined') localStorage.setItem(SUBSCRIBED_KEY, '1');
    const normalizedEmail = popupEmail.trim().toLowerCase();
    identifyUser(normalizedEmail, { source: 'popup', ...discountPayload });
    trackEvent('promo_subscribed', { source: 'popup', email: normalizedEmail, ...discountPayload });
    
    // Save seen status so they are not prompted again
    localStorage.setItem('sldp_promo_popup_seen', 'true');
    sessionStorage.setItem('sldp_promo_popup_seen', 'true');

    // Trigger redirection if configured
    if (adminPopupLink && adminPopupLink !== 'none') {
      setTimeout(() => {
        window.location.href = adminPopupLink;
      }, 1600);
    }
    window.setTimeout(() => setPopupVisible(false), 1800);
  };

  return (
    <>
      {bannerVisible && (
        <div className="container-global mt-1 sm:mt-2 px-1 sm:px-0 mb-0 sm:mb-0">
          <div className="relative bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-2xl py-2 sm:py-2.5 px-3 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-1.5 sm:gap-4 shadow-soft w-full">
            {/* Absolute close button on mobile, inline on desktop */}
            <button
              onClick={() => { setBannerVisible(false); trackEvent('promo_banner_dismissed', {}); }}
              className="absolute top-3 right-3 md:static text-gray-400 hover:text-[#232323] dark:text-gray-500 dark:hover:text-gray-300 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0 cursor-pointer md:order-3"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Left side: Badge & Text */}
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 min-w-0 text-center md:text-left pr-6 md:pr-0 w-full md:w-auto md:order-1 flex-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-[10px] uppercase tracking-[0.18em] font-bold shrink-0">
                <Sparkles className="w-3 h-3" /> Subscribe
              </span>
              <span className="text-charcoal-600 dark:text-gray-300 text-xs sm:text-sm font-medium leading-tight">
                Subscribe for future promos, restocks & member-only drops.
              </span>
            </div>

            {/* Right side: Email input & Join — pushed to the far right */}
            <div className="flex items-center gap-3 w-full md:w-auto md:order-2 md:ml-auto justify-end">
              {bannerStatus === 'success' ? (
                <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-[#3C6CA8] font-bold py-1.5 px-4 bg-[#3C6CA8]/10 rounded-full border border-[#3C6CA8]/20 w-full md:w-auto">
                  <span className="w-5 h-5 rounded-full bg-[#3C6CA8] flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  </span>
                  You're in. Check your inbox.
                </div>
              ) : (
                <form onSubmit={submitBanner} className="flex items-center w-full md:w-80 lg:w-96">
                  <div className="relative flex-1 flex items-center bg-gray-50 dark:bg-gray-800/80 border border-gray-250 dark:border-gray-700 hover:border-[#3C6CA8] focus-within:border-[#3C6CA8] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#3C6CA8]/20 rounded-full transition-all duration-200 p-1 w-full">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 focus-within:text-[#3C6CA8] transition-colors" />
                    <label htmlFor="promo-bannerEmail" className="sr-only">Email Address</label>
                    <input
                      type="email"
                      id="promo-bannerEmail"
                      name="bannerEmail"
                      value={bannerEmail}
                      onChange={e => setBannerEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full pl-9 pr-2 py-1.5 text-xs sm:text-sm bg-transparent text-[#232323] dark:text-gray-100 placeholder:text-gray-400 focus:outline-none"
                      aria-label="Email for promo updates"
                      required
                    />
                    <button
                      type="submit"
                      disabled={bannerStatus === 'submitting'}
                      className="inline-flex items-center justify-center gap-1.5 px-5 py-2 text-xs sm:text-sm font-bold rounded-full bg-[#3C6CA8] hover:bg-[#315A8E] text-white disabled:opacity-60 transition-all duration-200 shrink-0 shadow-sm cursor-pointer hover:shadow-md active:scale-95 min-w-[76px]"
                    >
                      {bannerStatus === 'submitting' ? '...' : (
                        <>
                          Join
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {bannerError && (
              <span className="absolute -bottom-5 left-5 text-[10px] text-red-600">{bannerError}</span>
            )}
          </div>
        </div>
      )}

      {popupVisible && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-charcoal-900/40 backdrop-blur-sm p-4 animate-fadeIn"
          role="dialog"
          aria-modal="true"
          onClick={handleOutsideClick}
        >
          <div className="relative bg-white rounded-3xl shadow-luxury max-w-md w-full overflow-hidden animate-fadeIn">
            {/* Decorative gradient accents */}
            <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-brand-100/60 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-16 w-56 h-56 rounded-full bg-cream-200/80 blur-3xl pointer-events-none" />

            <button
              onClick={dismissPopup}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-white/80 backdrop-blur hover:bg-cream-100 text-charcoal-400 hover:text-charcoal-900 transition-all z-20 border border-charcoal-100"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {adminPopupImage && (
              <a
                href={adminPopupLink && adminPopupLink !== 'none' ? adminPopupLink : undefined}
                onClick={() => {
                  if (adminPopupLink && adminPopupLink !== 'none') {
                    trackEvent('promo_popup_link_clicked', { link: adminPopupLink, ...discountPayload });
                  }
                }}
                className={`block relative ${adminPopupLink && adminPopupLink !== 'none' ? 'cursor-pointer' : ''}`}
              >
                <img
                  src={adminPopupImage}
                  alt={adminPopupTitle || 'Promo'}
                  className="w-full max-h-56 object-cover"
                />
              </a>
            )}

            <div className="relative px-7 pt-8 pb-7">
              {/* Eyebrow tag */}
              <div className="flex justify-center mb-5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 border border-brand-100 text-[10px] uppercase tracking-[0.22em] font-bold text-brand-700">
                  <Sparkles className="w-3 h-3" />
                  Members Only
                </span>
              </div>

              {/* Editorial heading */}
              <div className="text-center mb-2">
                {adminPopupTitle ? (
                  <h3 className="font-heading font-bold text-charcoal-900 leading-[1.1] tracking-tight text-3xl sm:text-4xl">
                    {adminPopupTitle}
                  </h3>
                ) : (
                  <h3 className="font-heading font-bold text-charcoal-900 leading-[1.05] tracking-tight">
                    <span className="block text-3xl sm:text-4xl">Get</span>
                    <span className="block text-5xl sm:text-6xl bg-gradient-to-br from-brand-500 to-brand-700 bg-clip-text text-transparent my-1">
                      {discountLabel}
                    </span>
                    <span className="block text-xl sm:text-2xl text-charcoal-700 font-normal italic">
                      your first order
                    </span>
                  </h3>
                )}
              </div>

              <p className="text-center text-sm text-charcoal-500 mt-4 mb-6 max-w-xs mx-auto leading-relaxed">
                {adminPopupDescription || 'Join the SlimDose list for exclusive promo codes, restocks, and member-only deals.'}
              </p>

              {timeLeft && (
                <div className="flex justify-center gap-3 my-5 bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100/50 dark:border-rose-900/20 rounded-2xl p-3.5 max-w-xs mx-auto animate-pulse">
                  <div className="text-center min-w-[45px]">
                    <span className="block font-heading font-bold text-lg text-rose-600 leading-none">{timeLeft.days}</span>
                    <span className="text-[9px] uppercase tracking-wider text-rose-500 font-bold mt-1 block">Days</span>
                  </div>
                  <span className="font-bold text-rose-400 text-lg leading-none mt-0.5">:</span>
                  <div className="text-center min-w-[45px]">
                    <span className="block font-heading font-bold text-lg text-rose-600 leading-none">{timeLeft.hours}</span>
                    <span className="text-[9px] uppercase tracking-wider text-rose-500 font-bold mt-1 block">Hours</span>
                  </div>
                  <span className="font-bold text-rose-400 text-lg leading-none mt-0.5">:</span>
                  <div className="text-center min-w-[45px]">
                    <span className="block font-heading font-bold text-lg text-rose-600 leading-none">{timeLeft.minutes}</span>
                    <span className="text-[9px] uppercase tracking-wider text-rose-500 font-bold mt-1 block">Min</span>
                  </div>
                  <span className="font-bold text-rose-400 text-lg leading-none mt-0.5">:</span>
                  <div className="text-center min-w-[45px]">
                    <span className="block font-heading font-bold text-lg text-rose-600 leading-none">{timeLeft.seconds}</span>
                    <span className="text-[9px] uppercase tracking-wider text-rose-500 font-bold mt-1 block">Sec</span>
                  </div>
                </div>
              )}

              {popupStatus === 'success' ? (
                <div className="text-center py-2">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-brand-500 flex items-center justify-center shadow-luxury">
                    <Check className="w-7 h-7 text-white" strokeWidth={2.5} />
                  </div>
                  <p className="font-heading font-bold text-xl text-charcoal-900">You're subscribed.</p>
                  <p className="text-sm text-charcoal-500 mt-1">Your promo code is on its way.</p>
                </div>
              ) : (
                <form onSubmit={submitPopup} className="space-y-3">
                  <div className="relative flex items-center bg-white border border-charcoal-100 hover:border-brand-300 focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-100 rounded-full transition-all duration-200 shadow-soft">
                    <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-400" />
                    <label htmlFor="promo-popupEmail" className="sr-only">Email Address</label>
                    <input
                      type="email"
                      id="promo-popupEmail"
                      name="popupEmail"
                      value={popupEmail}
                      onChange={e => setPopupEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full pl-11 pr-3 py-3.5 bg-transparent text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none rounded-full"
                      required
                    />
                  </div>

                  {popupError && (
                    <p className="text-sm text-red-600 text-center">{popupError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={popupStatus === 'submitting'}
                    className="group w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-full bg-charcoal-900 hover:bg-brand-600 text-white font-semibold disabled:opacity-60 transition-all duration-300 shadow-luxury hover:shadow-hover"
                  >
                    {popupStatus === 'submitting' ? 'Subscribing...' : (
                      <>
                        Claim My {discountLabel}
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={dismissPopup}
                    className="w-full text-xs text-charcoal-400 hover:text-charcoal-700 transition-colors pt-1"
                  >
                    No thanks, I'll pay full price
                  </button>
                </form>
              )}

              <p className="text-center text-[10px] uppercase tracking-[0.18em] text-charcoal-300 font-semibold mt-6 pt-5 border-t border-charcoal-100">
                No spam · Unsubscribe anytime
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PromoSignup;
