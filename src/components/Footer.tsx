import React from 'react';
import { MessageCircle, Heart, HelpCircle, Calculator, FileText, Truck, ShieldCheck, Lock, Award, ArrowUpRight } from 'lucide-react';
import { useCOAPageSetting } from '../hooks/useCOAPageSetting';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const { coaPageEnabled } = useCOAPageSetting();

  return (
    <footer className="bg-white dark:bg-[#161B26] border-t border-gray-200/80 dark:border-slate-800/80 transition-colors pt-12 pb-8">
      <div className="container-global">
        {/* Top Grid Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pb-10">
          
          {/* Col 1: Brand Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-100 dark:border-slate-700/80 shadow-xs shrink-0">
                <img
                  src="/assets/logo.jpeg"
                  alt="SlimDose Peptides Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-left font-inter">
                <div className="font-bold text-base tracking-tight text-gray-900 dark:text-white">
                  SlimDose Peptides
                </div>
                <div className="text-[10px] text-gray-500 dark:text-slate-400 font-semibold tracking-wider uppercase">
                  Premium Peptide Solutions
                </div>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-gray-600 dark:text-slate-400">
              Delivering research-grade peptide formulations crafted with uncompromising quality, verified purity, and discreet delivery.
            </p>
          </div>

          {/* Col 2: Quick Navigation */}
          <div>
            <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-3.5">
              Quick Navigation
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <a
                  href="/track-order"
                  className="text-gray-600 dark:text-slate-400 hover:text-theme-accent dark:hover:text-blue-400 transition-colors inline-flex items-center gap-2 font-medium"
                >
                  <Truck className="w-3.5 h-3.5" />
                  Track Order
                </a>
              </li>
              <li>
                <a
                  href="/calculator"
                  className="text-gray-600 dark:text-slate-400 hover:text-theme-accent dark:hover:text-blue-400 transition-colors inline-flex items-center gap-2 font-medium"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  Peptide Calculator
                </a>
              </li>
              <li>
                <a
                  href="/faq"
                  className="text-gray-600 dark:text-slate-400 hover:text-theme-accent dark:hover:text-blue-400 transition-colors inline-flex items-center gap-2 font-medium"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  Frequently Asked Questions
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Quality & Assurance */}
          <div>
            <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-3.5">
              Quality & Trust
            </h4>
            <ul className="space-y-2.5 text-xs">
              {coaPageEnabled && (
                <li>
                  <a
                    href="/coa"
                    className="text-gray-600 dark:text-slate-400 hover:text-theme-accent dark:hover:text-blue-400 transition-colors inline-flex items-center gap-2 font-medium"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Lab Tests & COA Reports
                  </a>
                </li>
              )}
              <li>
                <div className="inline-flex items-center gap-2 font-medium text-gray-600 dark:text-slate-400">
                  <Award className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  HPLC & MS Verified 99%+
                </div>
              </li>
              <li>
                <div className="inline-flex items-center gap-2 font-medium text-gray-600 dark:text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  Batch Testing Guarantee
                </div>
              </li>
            </ul>
          </div>

          {/* Col 4: Community & Telegram CTA */}
          <div>
            <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-3.5">
              Community & Support
            </h4>
            <p className="text-xs text-gray-600 dark:text-slate-400 mb-3 leading-relaxed">
              Connect with fellow researchers, get instant updates, and direct support.
            </p>
            <a
              href="https://t.me/+fGtShIUkbB84YzZl"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full px-3.5 py-2 rounded-xl bg-sky-500/10 dark:bg-sky-500/20 text-[#0088cc] dark:text-sky-400 hover:bg-[#0088cc] hover:text-white dark:hover:bg-[#0088cc] dark:hover:text-white font-medium text-xs transition-all shadow-xs border border-sky-200/50 dark:border-sky-800/50 group"
              aria-label="Join our Telegram Community (opens in a new tab)"
            >
              <MessageCircle className="w-3.5 h-3.5 text-[#0088cc] dark:text-sky-400 group-hover:text-white transition-colors shrink-0" />
              <span>Join Community</span>
              <ArrowUpRight className="w-3.5 h-3.5 opacity-70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
            </a>
          </div>

        </div>

        {/* Trust Badges Strip */}
        <div className="border-t border-b border-gray-100 dark:border-slate-800/80 py-3.5 mb-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-gray-600 dark:text-slate-400 font-medium">
              <Award className="w-4 h-4 text-theme-accent dark:text-blue-400 shrink-0" />
              <span>99%+ Purity Lab Tested (COA)</span>
            </div>
            <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-gray-600 dark:text-slate-400 font-medium">
              <Truck className="w-4 h-4 text-theme-accent dark:text-blue-400 shrink-0" />
              <span>Discreet & Fast Shipping</span>
            </div>
            <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-gray-600 dark:text-slate-400 font-medium">
              <Lock className="w-4 h-4 text-theme-accent dark:text-blue-400 shrink-0" />
              <span>Secure & Encrypted Orders</span>
            </div>
          </div>
        </div>

        {/* Disclaimer & Bottom Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
          <p className="text-[11px] text-gray-400 dark:text-slate-500 max-w-2xl leading-relaxed">
            <span className="font-semibold text-gray-500 dark:text-slate-400">Disclaimer:</span> All products sold by SlimDose Peptides are intended strictly for laboratory research and educational purposes. Not for human consumption.
          </p>
          <div className="text-[11px] text-gray-400 dark:text-slate-500 shrink-0 flex items-center gap-1">
            Made with <Heart className="w-3 h-3 text-red-500 fill-red-500" /> © {currentYear} SlimDose Peptides. All rights reserved.
          </div>
        </div>

      </div>
    </footer>
  );
};

export default React.memo(Footer);

