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

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  const handleAgree = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsOpen(false);
  };

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
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden z-10 my-auto max-h-[92dvh] flex flex-col"
          >
            {/* Top Header Banner */}
            <div className="bg-gradient-to-r from-slate-50 via-blue-50/40 to-slate-50 dark:from-slate-800/90 dark:via-slate-800 dark:to-slate-800/90 px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20 shadow-2xs">
                  <AlertTriangle className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-base font-heading font-black text-slate-900 dark:text-white tracking-tight leading-tight truncate">
                    {noticeTitle}
                  </h2>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                    {noticeSubtitle}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                aria-label="Close Notice"
              >
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-3.5 sm:p-4 space-y-2.5 overflow-y-auto custom-scrollbar text-left flex-1 text-xs">
              {/* Primary Legal Disclaimer */}
              <div className="space-y-1.5 text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50/80 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="line-clamp-3 sm:line-clamp-none">{noticeP1}</p>
                <p className="line-clamp-2 sm:line-clamp-none text-slate-500 dark:text-slate-400">{noticeP2}</p>
                <div className="flex items-center gap-1.5 text-[#3C6CA8] dark:text-blue-300 font-bold text-[10.5px] sm:text-[11px] pt-0.5 border-t border-slate-200/60 dark:border-slate-700/60 mt-1">
                  <Heart className="w-3 h-3 text-[#3C6CA8] shrink-0" />
                  <span className="truncate">{noticeConsult}</span>
                </div>
              </div>

              {/* Red Warning Pill Banner */}
              <div className="py-1.5 px-2.5 rounded-xl bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 text-center">
                <p className="text-[10.5px] sm:text-xs font-black text-rose-700 dark:text-rose-400 tracking-tight">
                  {noticeWarningPill}
                </p>
              </div>

              {/* Delivery & Order Policy Box */}
              <div className="p-2.5 sm:p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/50 space-y-2 shadow-2xs">
                <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-black text-amber-900 dark:text-amber-200 uppercase tracking-wide">
                  <div className="w-5 h-5 rounded-md bg-amber-500/15 dark:bg-amber-500/25 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Truck className="w-3 h-3" />
                  </div>
                  <span>Order Today, Deliver Tomorrow Policy</span>
                </div>
                
                <div className="grid grid-cols-2 gap-1.5 text-[10.5px] sm:text-xs text-slate-700 dark:text-slate-300">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-white/90 dark:bg-slate-800/90 border border-amber-200/50 dark:border-amber-900/40 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[8.5px] sm:text-[9px] uppercase font-extrabold text-amber-700 dark:text-amber-400 block leading-none">Order Days</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-[10.5px] sm:text-[11px] truncate block">{noticeOrderDays}</span>
                    </div>
                  </div>

                  <div className="p-1.5 sm:p-2 rounded-lg bg-white/90 dark:bg-slate-800/90 border border-amber-200/50 dark:border-amber-900/40 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[8.5px] sm:text-[9px] uppercase font-extrabold text-amber-700 dark:text-amber-400 block leading-none">Cut-off</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-[10.5px] sm:text-[11px] truncate block">{noticeCutoffTime}</span>
                    </div>
                  </div>

                  <div className="p-1.5 sm:p-2 rounded-lg bg-white/90 dark:bg-slate-800/90 border border-amber-200/50 dark:border-amber-900/40 flex items-center gap-2">
                    <PackageCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[8.5px] sm:text-[9px] uppercase font-extrabold text-amber-700 dark:text-amber-400 block leading-none">Courier</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-[10.5px] sm:text-[11px] truncate block">{noticeCourier}</span>
                    </div>
                  </div>

                  <div className="p-1.5 sm:p-2 rounded-lg bg-white/90 dark:bg-slate-800/90 border border-amber-200/50 dark:border-amber-900/40 flex items-center gap-2">
                    <Sun className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[8.5px] sm:text-[9px] uppercase font-extrabold text-amber-700 dark:text-amber-400 block leading-none">Weekends</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-[10.5px] sm:text-[11px] truncate block">{noticeWeekendOrders}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Action Footer */}
            <div className="p-3 sm:p-4 bg-slate-50/80 dark:bg-slate-900/90 border-t border-slate-100 dark:border-slate-800 shrink-0 flex flex-col items-center gap-1.5">
              <button
                type="button"
                onClick={handleAgree}
                className="w-full py-2.5 sm:py-3 px-4 rounded-xl text-white font-black text-xs sm:text-sm tracking-wide shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 bg-gradient-to-r from-[#3C6CA8] via-blue-600 to-[#264874] hover:from-[#315A8E] hover:to-[#1e3a5f] active:scale-[0.99] cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{noticeAgreeBtn}</span>
              </button>
              <p className="text-[9.5px] text-slate-400 dark:text-slate-500 font-medium text-center">
                Shown on initial visit until acknowledged
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
export default ImportantNoticeModal;
