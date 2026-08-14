import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ShieldCheck, Heart, Truck, CheckCircle2, X, Calendar, Clock, PackageCheck, Sun } from 'lucide-react';
import { useSiteSettings } from '../hooks/useSiteSettings';

const STORAGE_KEY = 'slimdose_notice_acknowledged';

export const ImportantNoticeModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { siteSettings } = useSiteSettings();

  useEffect(() => {
    // Check if user has already acknowledged "I Understand & Agree"
    const acknowledged = localStorage.getItem(STORAGE_KEY);
    if (!acknowledged) {
      setIsOpen(true);
    }
  }, []);

  const handleAgree = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  const noticeTitle = siteSettings?.notice_title || 'Important Notice';
  const noticeSubtitle = siteSettings?.notice_subtitle || 'Please read carefully before continuing';
  const noticeP1 = siteSettings?.notice_disclaimer_p1 || 'Sold strictly for research purposes only, not FDA-approved, and are not intended to diagnose, treat, cure, or prevent any disease.';
  const noticeP2 = siteSettings?.notice_disclaimer_p2 || 'Improper handling or use may carry risks, including possible side effects, adverse reactions, contamination, or ineffective results.';
  const noticeConsult = siteSettings?.notice_consult_text || 'Always consult a licensed healthcare professional for health-related decisions.';
  const noticeWarningPill = siteSettings?.notice_warning_pill || '✕ NO MEET UPS · NO PICK UPS · NO RUSH ORDERS';
  const noticeOrderDays = siteSettings?.notice_order_days || 'Monday - Friday';
  const noticeCutoffTime = siteSettings?.notice_cutoff_time || '5:00 PM Daily';
  const noticeCourier = siteSettings?.notice_courier || 'Next Day via J&T';
  const noticeWeekendOrders = siteSettings?.notice_weekend_orders || 'Processed Mondays';
  const noticeAgreeBtn = siteSettings?.notice_agree_button_text || 'I Understand & Agree';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden z-10 my-auto"
          >
            {/* Top Header Banner */}
            <div className="bg-gradient-to-r from-slate-50 via-blue-50/50 to-slate-50 dark:from-slate-800/80 dark:via-slate-800 dark:to-slate-800/80 p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800/80 flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 min-w-0">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20 shadow-xs">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-heading font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug">
                    {noticeTitle}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                    {noticeSubtitle}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                aria-label="Close Notice"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar text-left">
              {/* Primary Legal Disclaimer */}
              <div className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                <p>{noticeP1}</p>
                <p>{noticeP2}</p>
                <p className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium">
                  <Heart className="w-4 h-4 text-[#3C6CA8] shrink-0" />
                  <span>{noticeConsult}</span>
                </p>
              </div>

              {/* Red Warning Pill Banner */}
              <div className="p-3.5 rounded-2xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50 text-center">
                <p className="text-xs sm:text-sm font-extrabold text-rose-700 dark:text-rose-400 tracking-tight">
                  {noticeWarningPill}
                </p>
              </div>

              {/* Delivery & Order Policy Box */}
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/50 space-y-3 shadow-2xs">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-extrabold text-amber-900 dark:text-amber-200 uppercase tracking-wide border-b border-amber-200/50 dark:border-amber-900/40 pb-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Truck className="w-4 h-4" />
                  </div>
                  <span>Order Today, Deliver Tomorrow Policy</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-amber-200/40 dark:border-amber-900/30">
                    <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-extrabold text-amber-700 dark:text-amber-400 block leading-none mb-0.5">Order Days</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{noticeOrderDays}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-amber-200/40 dark:border-amber-900/30">
                    <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-extrabold text-amber-700 dark:text-amber-400 block leading-none mb-0.5">Cut-off Time</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{noticeCutoffTime}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-amber-200/40 dark:border-amber-900/30">
                    <PackageCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-extrabold text-amber-700 dark:text-amber-400 block leading-none mb-0.5">Courier</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{noticeCourier}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-amber-200/40 dark:border-amber-900/30">
                    <Sun className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-extrabold text-amber-700 dark:text-amber-400 block leading-none mb-0.5">Weekend Orders</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{noticeWeekendOrders}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Action Footer */}
            <div className="p-5 sm:p-6 bg-slate-50/60 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800/80 flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={handleAgree}
                className="w-full py-3.5 px-6 rounded-2xl text-white font-extrabold text-sm sm:text-base tracking-wide shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 bg-gradient-to-r from-[#3C6CA8] via-blue-600 to-[#264874] hover:from-[#315A8E] hover:to-[#1e3a5f] active:scale-[0.99] cursor-pointer"
              >
                <ShieldCheck className="w-5 h-5" />
                <span>{noticeAgreeBtn}</span>
              </button>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium text-center">
                This notice is shown on every visit to the storefront until acknowledged.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
export default ImportantNoticeModal;
