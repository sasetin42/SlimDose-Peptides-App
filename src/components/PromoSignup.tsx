import React, { useState } from 'react';
import { Mail, X, Sparkles, Check, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { trackEvent, identifyUser } from '../utils/analytics';
import { useGlobalDiscount } from '../hooks/useGlobalDiscount';
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
  const [bannerVisible, setBannerVisible] = useState(true);
  const [bannerEmail, setBannerEmail] = useState('');
  const [bannerStatus, setBannerStatus] = useState<Status>('idle');
  const [bannerError, setBannerError] = useState<string | null>(null);

  const discountPayload = buildDiscountPayload(globalDiscount);

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

  if (!bannerVisible) return null;

  return (
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
                  autoComplete="email" onChange={(e) => setBannerEmail(e.target.value)}
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
  );
};

export default PromoSignup;
