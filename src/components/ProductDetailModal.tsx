import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ShoppingCart,
  Plus,
  Minus,
  Truck,
  ShieldCheck,
  Zap,
  FileText,
  Atom,
  ShieldAlert,
  Droplet,
  Microscope,
  AlertOctagon,
  Shield,
  Download,
  ExternalLink,
  AlertTriangle,
  BookOpen,
  RefreshCw,
  Lightbulb,
  CreditCard,
  Copy,
  QrCode,
  CheckCircle2,
  Info,
  Sparkles,
  Heart,
} from 'lucide-react';
import type { Product, ProductVariation, GlobalDiscount, ProductBundleTier, Protocol } from '../types';
import { resolveProductPricing, pickBundleTier } from '../utils/pricing';
import { getCompoundDetails, getMockCoas, getReferences } from '../data/biotechData';
import { motion, AnimatePresence } from 'framer-motion';
import { fireToast } from './ToastNotification';
import { ProductPeptideCalculator } from './ProductPeptideCalculator';
import { ProductReviews } from './ProductReviews';
import { COAModal } from './COAModal';

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
  onAddToCart: (product: Product, variation: ProductVariation | undefined, quantity: number, priceOverride?: number) => void;
  globalDiscount?: GlobalDiscount | null;
  bundleTiers?: ProductBundleTier[];
  protocols?: Protocol[];
  asPage?: boolean;
}

/* ═══════════════════════════════════════════════════════════════
   BIOTECH RESEARCH-GRADE EXPANDED SECTIONS
   ═══════════════════════════════════════════════════════════════ */

interface COASectionProps {
  productName: string;
  purity: number;
  coaUrl: string | null;
  onQuickView: (imgUrl: string) => void;
}

const CertificateOfAnalysisSection: React.FC<COASectionProps> = ({ productName, purity, coaUrl, onQuickView }) => {
  const records = getMockCoas(productName, purity, coaUrl);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = () => {
    if (scrollRef.current) {
      const scrollLeft = scrollRef.current.scrollLeft;
      const width = scrollRef.current.clientWidth;
      const index = Math.round(scrollLeft / (width * 0.8));
      setActiveIndex(Math.min(Math.max(index, 0), records.length - 1));
    }
  };

  const scrollToCard = (index: number) => {
    if (scrollRef.current) {
      const cardWidth = scrollRef.current.querySelector('div')?.clientWidth || 280;
      scrollRef.current.scrollTo({
        left: index * (cardWidth + 12),
        behavior: 'smooth'
      });
      setActiveIndex(index);
    }
  };

  return (
    <div className="mt-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2 border-b border-gray-100 dark:border-slate-800 pb-3">
        <div>
          <span className="text-[10px] sm:text-xs font-bold tracking-wider text-[#3C6CA8] dark:text-[#3C6CA8] uppercase">Independent Verification</span>
          <h3 className="text-lg sm:text-2xl font-black text-gray-900 dark:text-white mt-0.5">Certificate of Analysis</h3>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 flex-wrap sm:flex-nowrap">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9.5px] sm:text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800 shrink-0">
            <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Third Party Tested
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9.5px] sm:text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800 shrink-0">
            <Atom className="w-3 h-3 text-blue-600 dark:text-blue-400" /> Research Grade
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9.5px] sm:text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-800 shrink-0">
            <Shield className="w-3 h-3 text-violet-600 dark:text-violet-400" /> High Purity Verified
          </span>
        </div>
      </div>

      {/* Desktop Grid & Compact Mobile Slider Carousel */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex md:grid md:grid-cols-3 gap-3 sm:gap-4 md:gap-5 overflow-x-auto pb-3 md:pb-0 snap-x snap-mandatory scrollbar-none -mx-2 px-2 sm:mx-0 sm:px-0"
      >
        {records.map((rec, i) => {
          const radius = 20;
          const circumference = 2 * Math.PI * radius;
          const strokeDashoffset = circumference - (rec.purityPercentage / 100) * circumference;

          return (
            <motion.div
              key={rec.batchNumber}
              className="shrink-0 snap-center w-[82vw] max-w-[295px] sm:w-[310px] md:w-full rounded-2xl border border-gray-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md p-3.5 sm:p-4.5 shadow-sm hover:shadow-md transition-all duration-300 group relative flex flex-col justify-between"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            >
              {/* Batch & Status Badge */}
              <div className="flex items-center justify-between gap-1 mb-2.5">
                <span className="text-[10.5px] sm:text-xs font-mono font-bold text-gray-700 dark:text-slate-300 truncate max-w-[65%]">
                  Batch: {rec.batchNumber}
                </span>
                <span className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                  rec.status === 'Active & Verified' 
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60' 
                    : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400 border border-gray-200 dark:border-slate-700'
                }`}>
                  {rec.status}
                </span>
              </div>

              {/* Compact Purity Ring */}
              <div className="flex items-center gap-3 mb-3 bg-blue-50/50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-blue-100/60 dark:border-slate-700/60">
                <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                  <svg className="w-12 h-12 transform -rotate-90">
                    <circle
                      cx="24"
                      cy="24"
                      r={radius}
                      stroke="rgba(60,108,168,0.15)"
                      strokeWidth="3.5"
                      fill="transparent"
                    />
                    <circle
                      cx="24"
                      cy="24"
                      r={radius}
                      stroke="#3C6CA8"
                      strokeWidth="3.5"
                      fill="transparent"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute text-[10px] font-black text-gray-900 dark:text-white leading-none">
                    {rec.purityPercentage}%
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="text-[9px] sm:text-[9.5px] font-bold text-[#3C6CA8] dark:text-[#6A9BE0] uppercase tracking-wider">
                    Purity Rating
                  </div>
                  <div className="text-xs sm:text-sm font-black text-gray-900 dark:text-white leading-tight">
                    HPLC Confirmed
                  </div>
                </div>
              </div>

              {/* Compact Specifications Grid */}
              <div className="space-y-1.5 text-[11px] sm:text-xs border-t border-gray-100 dark:border-slate-800/80 pt-2 mb-3.5">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-slate-400 font-medium">Tested Variant</span>
                  <span className="font-bold text-gray-800 dark:text-slate-200 truncate ml-2">{rec.variant}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-slate-400 font-medium">Lab Facility</span>
                  <span className="font-bold text-gray-800 dark:text-slate-200 truncate ml-2">{rec.laboratory}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-slate-400 font-medium">Test Date</span>
                  <span className="font-bold text-gray-800 dark:text-slate-200">{rec.testDate}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-slate-400 font-medium">Status</span>
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-extrabold text-[11px]">
                    <ShieldCheck className="w-3.5 h-3.5" /> PASS
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2 mt-auto">
                <button
                  type="button"
                  onClick={() => onQuickView(rec.coaUrl)}
                  className="flex items-center justify-center gap-1 py-2 px-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-[#3C6CA8] transition-colors cursor-pointer"
                >
                  <Microscope className="w-3.5 h-3.5" /> Quick View
                </button>
                <a
                  href={rec.coaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1 py-2 px-2.5 bg-[#3C6CA8] hover:bg-[#315A8E] rounded-xl text-xs font-bold text-white transition-colors shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </a>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Mobile Slider Indicator Dots */}
      <div className="flex md:hidden items-center justify-center gap-1.5 mt-2">
        {records.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => scrollToCard(idx)}
            aria-label={`Go to slide ${idx + 1}`}
            className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
              activeIndex === idx ? 'w-5 bg-[#3C6CA8]' : 'w-1.5 bg-gray-300 dark:bg-slate-700'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

interface CompoundSectionProps {
  product: Product;
  protocols?: Protocol[];
}

const CompoundInformationSection: React.FC<CompoundSectionProps> = ({ product, protocols }) => {
  const details = getCompoundDetails(
    product.category,
    product.slug,
    product.molecular_weight,
    product.cas_number,
    product.sequence,
    product.storage_conditions
  );

  const [activeTab, setActiveTab] = useState<'storage' | 'reconstitute' | 'usage' | 'safety'>('storage');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (details.sequence) {
      navigator.clipboard.writeText(details.sequence);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const TABS = [
    { id: 'storage' as const, label: 'Storage & Stability', icon: ShieldAlert },
    { id: 'reconstitute' as const, label: 'Reconstitution', icon: Droplet },
    { id: 'usage' as const, label: 'Usage Info', icon: Microscope },
    { id: 'safety' as const, label: 'Safety Notes', icon: AlertOctagon }
  ];

  return (
    <div className="mt-8 w-full flex flex-col items-center">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 border-b border-gray-100 dark:border-slate-800 pb-3 w-full gap-2">
        <div className="text-left">
          <span className="text-[10px] sm:text-xs font-bold tracking-wider text-[#3C6CA8] dark:text-[#6A9BE0] uppercase">Chemical Profile &amp; Specifications</span>
          <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mt-0.5">Compound Information</h3>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 shrink-0">
          <Atom className="w-3.5 h-3.5 text-[#3C6CA8]" /> Lab Verified Data
        </span>
      </div>

      {/* 4 Tabs in 2-Column (Mobile) / 4-Column (Desktop) Grid */}
      <div className="w-full bg-slate-100/90 dark:bg-slate-900/90 p-1.5 rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-5 border border-slate-200/80 dark:border-slate-800 shadow-inner">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer text-center ${
                isActive
                  ? 'bg-[#3C6CA8] text-white shadow-sm ring-1 ring-[#3C6CA8]/40'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-[#3C6CA8]'}`} />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content card */}
      <div className="w-full bg-gradient-to-br from-white/90 via-white/50 to-slate-50/60 dark:from-slate-900/70 dark:via-slate-900/40 dark:to-slate-950/60 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 shadow-sm overflow-hidden min-h-[260px] flex flex-col justify-between">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 text-left"
          >
            {activeTab === 'storage' && (
              <>
                <div className="space-y-3 bg-white/70 dark:bg-slate-900/50 p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-800">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#3C6CA8] dark:text-blue-400 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-[#3C6CA8]" /> Lyophilized Powder Storage
                  </h4>
                  <div className="space-y-2.5">
                    <div className="flex flex-col border-b border-gray-100 dark:border-slate-800/80 pb-2">
                      <span className="text-[9.5px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wide">Storage Guidelines</span>
                      <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-slate-100 mt-0.5">{details.storageLyophilized}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9.5px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wide">Recommended Temperature</span>
                      <span className="text-xs sm:text-sm font-extrabold text-[#3C6CA8] dark:text-blue-400 mt-0.5">-20°C (Freezer Storage) for long-term stability</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 bg-white/70 dark:bg-slate-900/50 p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-800">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#3C6CA8] dark:text-blue-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" /> Reconstituted Stability
                  </h4>
                  <div className="space-y-2.5">
                    <div className="flex flex-col border-b border-gray-100 dark:border-slate-800/80 pb-2">
                      <span className="text-[9.5px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wide">Reconstituted Storage</span>
                      <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-slate-100 mt-0.5">{details.storageReconstituted}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9.5px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wide">Stability Limit</span>
                      <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-slate-100 mt-0.5">{details.stability}</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'reconstitute' && (
              <>
                <div className="space-y-3 bg-white/70 dark:bg-slate-900/50 p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-800">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#3C6CA8] dark:text-blue-400 flex items-center gap-1.5">
                    <Droplet className="w-4 h-4 text-blue-500" /> Solvent Selection
                  </h4>
                  <div className="space-y-2.5">
                    <div className="flex flex-col border-b border-gray-100 dark:border-slate-800/80 pb-2">
                      <span className="text-[9.5px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wide">Diluent Agent</span>
                      <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-slate-100 mt-0.5">{details.diluent}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9.5px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wide">Recommended Dilution Volume</span>
                      <span className="text-xs sm:text-sm font-extrabold text-[#3C6CA8] dark:text-blue-400 mt-0.5">{details.reconstituentVolume}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 bg-white/70 dark:bg-slate-900/50 p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-800">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#3C6CA8] dark:text-blue-400 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-500" /> Reconstitution Steps
                  </h4>
                  <div className="space-y-2 bg-gray-50/70 dark:bg-slate-950/40 p-3 rounded-xl border border-gray-100 dark:border-slate-800/85">
                    <p className="text-xs text-gray-700 dark:text-slate-300 leading-relaxed font-medium">
                      {details.mixingInstruction}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2 text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded-lg border border-amber-200/50 w-fit">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Never shake the vial
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'usage' && (
              <>
                <div className="space-y-3 bg-white/70 dark:bg-slate-900/50 p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-800">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#3C6CA8] dark:text-blue-400 flex items-center gap-1.5">
                    <Microscope className="w-4 h-4 text-indigo-500" /> Research Applications
                  </h4>
                  <ul className="space-y-2">
                    {details.researchApplications.map((app, idx) => (
                      <li key={idx} className="text-xs text-gray-700 dark:text-slate-300 flex items-start gap-2 bg-slate-50 dark:bg-slate-950/30 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
                        <span className="text-[#3C6CA8] font-black">•</span>
                        <span>{app}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-3 bg-white/70 dark:bg-slate-900/50 p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-800">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#3C6CA8] dark:text-blue-400 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-emerald-500" /> Research Protocol Specifications
                  </h4>
                  {protocols && protocols.length > 0 ? (
                    <div className="space-y-2 bg-slate-50/70 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
                      <div className="flex justify-between border-b border-gray-100 dark:border-slate-800/80 pb-1.5 text-xs">
                        <span className="text-gray-500 dark:text-slate-400 font-medium">Target Dosage</span>
                        <span className="font-bold text-gray-900 dark:text-slate-100">{protocols[0].dosage}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 dark:border-slate-800/80 pb-1.5 text-xs">
                        <span className="text-gray-500 dark:text-slate-400 font-medium">Frequency</span>
                        <span className="font-bold text-gray-900 dark:text-slate-100">{protocols[0].frequency}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 dark:border-slate-800/80 pb-1.5 text-xs">
                        <span className="text-gray-500 dark:text-slate-400 font-medium">Duration</span>
                        <span className="font-bold text-gray-900 dark:text-slate-100">{protocols[0].duration}</span>
                      </div>
                      {protocols[0].notes && protocols[0].notes.length > 0 && (
                        <div className="pt-1">
                          <span className="text-[9.5px] font-bold text-gray-400 uppercase">Protocol Notes:</span>
                          <p className="text-[11px] text-gray-600 dark:text-slate-300 leading-relaxed mt-0.5 font-medium">
                            {protocols[0].notes[0]}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-950/30 p-3.5 rounded-xl text-center">
                      No customized protocol loaded for this compound. General in vitro protocols apply.
                    </div>
                  )}
                </div>
              </>
            )}

            {activeTab === 'safety' && (
              <>
                <div className="space-y-3 bg-white/70 dark:bg-slate-900/50 p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-800">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#3C6CA8] dark:text-blue-400 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-amber-500" /> Lab Safety Protocols
                  </h4>
                  <ul className="space-y-2">
                    {details.handlingPPE.map((ppe, idx) => (
                      <li key={idx} className="text-xs text-gray-700 dark:text-slate-300 flex items-start gap-2 bg-slate-50 dark:bg-slate-950/30 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
                        <span className="text-amber-500 font-bold">⚠️</span>
                        <span>{ppe}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-3 bg-white/70 dark:bg-slate-900/50 p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-800">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#3C6CA8] dark:text-blue-400 flex items-center gap-1.5">
                    <AlertOctagon className="w-4 h-4 text-rose-500" /> Hazard Classifications
                  </h4>
                  <div className="space-y-2.5 bg-rose-50/30 dark:bg-rose-950/20 p-3 rounded-xl border border-rose-200/40 dark:border-rose-900/40">
                    <div className="flex flex-col pb-1 text-xs">
                      <span className="text-[9.5px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wide">Toxicological Profile</span>
                      <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-slate-100 mt-0.5">{details.toxicology}</span>
                    </div>
                    <div className="text-[10px] font-bold text-rose-700 dark:text-rose-300 uppercase bg-rose-500/10 px-2 py-1.5 rounded-lg leading-relaxed border border-rose-500/20">
                      Not for human or veterinary use. For scientific laboratory research and in vitro diagnostics only.
                    </div>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

interface ReferencesSectionProps {
  category: string;
}

const SourcesReferencesSection: React.FC<ReferencesSectionProps> = ({ category }) => {
  const references = getReferences(category);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  return (
    <div className="mt-8 w-full">
      <div className="flex flex-col items-center text-center mb-4 border-b border-gray-100 dark:border-slate-800 pb-4">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40 mb-3">
          <BookOpen className="w-3 h-3" /> Peer Reviewed Research References
        </span>
        <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mt-1">Research Library</h3>
      </div>

      {/* Grid of References */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left"
      >
        {references.map((ref, idx) => (
          <motion.div
            key={idx}
            variants={itemVariants}
            className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-md rounded-2xl border border-gray-200 dark:border-slate-800 p-5 flex flex-col justify-between hover:shadow-md hover:-translate-y-1.5 transition-all duration-300 group relative overflow-hidden h-full min-h-[220px]"
          >
            {/* Glow border */}
            <div className="absolute inset-0 border border-transparent group-hover:border-blue-500/10 rounded-2xl pointer-events-none transition-all duration-300" />

            <div className="flex flex-col flex-1">
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 tracking-wider uppercase mb-2 block truncate" title={ref.journal}>
                {ref.journal}
              </span>
              <h4 className="text-xs font-bold text-gray-900 dark:text-white leading-snug line-clamp-3 mb-3" title={ref.title}>
                "{ref.title}"
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 line-clamp-2 mb-2 font-medium" title={ref.authors}>
                {ref.authors}
              </p>
            </div>

            <div className="border-t border-gray-100 dark:border-slate-800 pt-3 mt-3 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[9px] text-gray-400 uppercase font-mono">Pub. Year</span>
                <span className="text-xs font-bold text-charcoal-800 dark:text-slate-200">{ref.year}</span>
              </div>
              <a
                href={ref.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-500"
              >
                <span>View Source</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

const ImportantResearchNoticeSection: React.FC = () => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-4 w-full">
      <motion.div
        className="relative rounded-2xl border border-[#3C6CA8]/30 dark:border-[#3C6CA8]/20 bg-[#3C6CA8]/5 dark:bg-[#3C6CA8]/10 p-3 sm:p-4 overflow-hidden shadow-xs text-left"
        initial={{ opacity: 0, scale: 0.98 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
      >
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold tracking-wider uppercase bg-[#3C6CA8]/15 text-[#3C6CA8] dark:bg-[#3C6CA8]/30 dark:text-blue-200 border border-[#3C6CA8]/30">
                Warning
              </span>
              <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold tracking-wider uppercase bg-[#3C6CA8]/10 text-[#3C6CA8] dark:bg-[#3C6CA8]/20 dark:text-blue-300 border border-[#3C6CA8]/20">
                Research Use Only
              </span>
              <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold tracking-wider uppercase bg-[#3C6CA8]/10 text-[#3C6CA8] dark:bg-[#3C6CA8]/20 dark:text-blue-300 border border-[#3C6CA8]/20">
                Compliance Verified
              </span>
            </div>
            
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#3C6CA8] dark:text-blue-400 hover:text-[#315A8E] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3C6CA8] rounded"
            >
              <span>{expanded ? 'Show Less' : 'Read More Details'}</span>
              <span className="text-[9px]">{expanded ? '▲' : '▼'}</span>
            </button>
          </div>

          <h3 className="text-xs sm:text-sm font-black text-gray-900 dark:text-white leading-tight">
            Important Safety &amp; Compliance Notice
          </h3>

          <p className="text-[11px] sm:text-xs text-gray-700 dark:text-slate-300 leading-snug font-medium">
            This product is sold exclusively for laboratory and in vitro research use only. Not for human or veterinary administration.
          </p>

          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="text-[11px] text-gray-600 dark:text-slate-400 leading-relaxed space-y-1.5 border-t border-[#3C6CA8]/20 dark:border-slate-800 pt-2.5 mt-1.5"
            >
              <p>
                • Any research concerning this chemical should only be conducted by qualified scientists in suitable, certified laboratory environments utilizing proper safety equipment (chemical goggles, gloves, lab coats, and certified biosafety cabinets).
              </p>
              <p>
                • Slimdose Peptides makes no warranties, express or implied, as to the applicability of this compound for any specific biological purpose.
              </p>
              <p>
                • By placing an order, the buyer acknowledges the hazards associated with handling these materials and accepts all responsibility for the safe containment, study, and disposal of this compound.
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

const formatShippingWindow = () => {
  const start = new Date();
  start.setDate(start.getDate() + 5);
  const end = new Date();
  end.setDate(end.getDate() + 11);
  const fmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return `${fmt.format(start)} - ${fmt.format(end)}`;
};

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, onClose, onAddToCart, globalDiscount, bundleTiers, protocols, asPage = false }) => {
  const getFirstAvailableVariation = () => {
    if (!product.variations || product.variations.length === 0) return undefined;
    const available = product.variations.find(v => v.stock_quantity > 0);
    return available || product.variations[0];
  };

  const [imageError, setImageError] = useState(false);
  const [selectedVariation, setSelectedVariation] = useState<ProductVariation | undefined>(
    getFirstAvailableVariation()
  );
  const [quantity, setQuantity] = useState(1);
  const [coaPreviewImage, setCoaPreviewImage] = useState<string | null>(null);
  const [isCoaModalOpen, setIsCoaModalOpen] = useState(false);
  const [customModalCoaUrl, setCustomModalCoaUrl] = useState<string | null>(null);
  const [dosingOpen, setDosingOpen] = useState(false);

  // Wishlist / Saved items state for logged in or guest customer
  const [isSaved, setIsSaved] = useState<boolean>(() => {
    try {
      const custRaw = localStorage.getItem('slimdose_customer');
      const custId = custRaw ? JSON.parse(custRaw)?.id : 'guest';
      const stored = JSON.parse(localStorage.getItem(`slimdose_wishlist_${custId}`) || '[]');
      return Array.isArray(stored) && stored.some((item: any) => item.id === product.id || item.productId === product.id);
    } catch {
      return false;
    }
  });

  const handleToggleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const custRaw = localStorage.getItem('slimdose_customer');
      const custId = custRaw ? JSON.parse(custRaw)?.id : 'guest';
      const storageKey = `slimdose_wishlist_${custId}`;
      const currentList: any[] = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      const existsIndex = currentList.findIndex((item: any) => item.id === product.id || item.productId === product.id);
      
      if (existsIndex >= 0) {
        currentList.splice(existsIndex, 1);
        localStorage.setItem(storageKey, JSON.stringify(currentList));
        setIsSaved(false);
        fireToast(`Removed ${product.name} from Saved Items.`, 'info');
      } else {
        const newItem = {
          id: product.id,
          productId: product.id,
          name: product.name,
          variant: selectedVariation?.name || 'Standard Vial',
          price: unitPrice,
          category: product.category || 'Peptides',
          inStock: !isOutOfStock,
          image_url: product.image_url || '/assets/logo.jpeg',
          savedAt: new Date().toISOString()
        };
        currentList.unshift(newItem);
        localStorage.setItem(storageKey, JSON.stringify(currentList));
        setIsSaved(true);
        fireToast(`Saved ${product.name} to your Saved Items! ❤️`, 'success');
      }
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('wishlist_updated'));
    } catch (err) {
      console.error('Error updating saved items:', err);
    }
  };

  const getVialStrengthMg = (): number => {
    if (selectedVariation?.name) {
      const match = selectedVariation.name.match(/(\d+)\s*(?:mg|mcg)/i);
      if (match) return parseInt(match[1], 10);
    }
    return 10;
  };

  // Lock body scroll only when used as overlay
  useEffect(() => {
    if (asPage) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [asPage]);

  const pricing = resolveProductPricing(product, selectedVariation, globalDiscount);
  const unitPrice = pricing.price;
  const baseOriginal = pricing.originalPrice;
  const hasDiscount = pricing.hasDiscount;
  const discountPercent = hasDiscount
    ? Math.round((1 - unitPrice / baseOriginal) * 100)
    : 0;

  const totalPrice = unitPrice * quantity;
  const totalOriginal = baseOriginal * quantity;

  const hasAnyStock = product.variations && product.variations.length > 0
    ? product.variations.some(v => v.stock_quantity > 0)
    : product.stock_quantity > 0;

  const isOutOfStock =
    !product.available ||
    (!product.pre_order_enabled && (
      !hasAnyStock ||
      (selectedVariation ? selectedVariation.stock_quantity === 0 : product.stock_quantity === 0)
    ));

  const tagPool = [product.cas_number, product.sequence, product.molecular_weight]
    .filter((v): v is string => Boolean(v && v.trim()));
  const tags = tagPool.slice(0, 2);

  const incrementQuantity = () => setQuantity(prev => {
    if (product.pre_order_enabled && product.pre_order_max_qty && prev >= product.pre_order_max_qty) {
      return prev;
    }
    return prev + 1;
  });
  const decrementQuantity = () => setQuantity(prev => prev > 1 ? prev - 1 : 1);

  const [addedSuccess, setAddedSuccess] = useState(false);

  const handleAddToCart = () => {
    const priceToUse = pricing.hasGlobalDiscount ? unitPrice : undefined;
    
    // Call props callback
    onAddToCart(product, selectedVariation, quantity, priceToUse);
    
    // Dispatch global custom event for cart listeners
    window.dispatchEvent(
      new CustomEvent('addToCart', {
        detail: { product, variation: selectedVariation, quantity, priceOverride: priceToUse }
      })
    );

    // Show visual confirmation animation on button
    setAddedSuccess(true);
    setTimeout(() => setAddedSuccess(false), 2000);

    // Trigger toast notification confirmation
    if (pricing.hasGlobalDiscount) {
      fireToast(`Added ${quantity}x ${product.name}${selectedVariation ? ` (${selectedVariation.name})` : ''} with ${globalDiscount?.name || 'Storewide Sale'} applied! (Bundle discount disabled) 🛒`, 'success', 4500);
    } else {
      fireToast(`Added ${quantity}x ${product.name}${selectedVariation ? ` (${selectedVariation.name})` : ''} to your cart! 🛒`, 'success', 4000);
    }

    if (!asPage) {
      setTimeout(() => {
        onClose();
      }, 500);
    }
  };

  const sortedTiers = (bundleTiers ?? [])
    .filter((t) => t.active)
    .slice()
    .sort((a, b) => a.min_quantity - b.min_quantity);
  const isBundleEligible = !pricing.hasGlobalDiscount;
  const previewTier = isBundleEligible ? pickBundleTier(sortedTiers, quantity) : null;
  const bundleUnitPrice = previewTier
    ? unitPrice * (1 - Number(previewTier.discount_percentage) / 100)
    : unitPrice;
  const bundleTotal = bundleUnitPrice * quantity;

  const coaUrl = product.coa_url || product.safety_sheet_url || null;

  const formatPrice = (n: number) =>
    `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 0 })}`;

  const variations = product.variations ?? [];
  const shippingWindow = formatShippingWindow();

  const wrapperClass = asPage
    ? 'w-full flex justify-center px-3 sm:px-4 py-6 sm:py-10'
    : 'fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-charcoal-900/40 backdrop-blur-sm animate-fadeIn';
  const cardClass = asPage
    ? 'relative w-full bg-white/60 dark:bg-slate-900/40 backdrop-blur-md shadow-luxury rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col'
    : 'relative w-full sm:max-w-4xl lg:max-w-5xl bg-white/60 dark:bg-slate-900/40 backdrop-blur-md shadow-luxury rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] animate-slideIn border border-charcoal-200 dark:border-slate-800';

  const imageShowcase = (
    <div className="relative group rounded-3xl bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-100 dark:from-slate-900/80 dark:via-blue-950/20 dark:to-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 flex items-center justify-center aspect-[4/3] sm:aspect-[16/11] lg:aspect-[16/11] shadow-lg overflow-hidden transition-all duration-300">
      {/* Modern Background Subtle Radial Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.08)_0,transparent_70%)] pointer-events-none" />
      
      {/* Floating Badges */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[8px] font-extrabold tracking-wide uppercase bg-white/80 dark:bg-slate-900/80 backdrop-blur-md text-[#3C6CA8] dark:text-blue-300 border border-[#3C6CA8]/30 dark:border-blue-800/50 shadow-sm">
        <Atom className="w-2.5 h-2.5 text-[#3C6CA8] animate-spin-slow" /> Research Grade
      </div>

      {hasDiscount && (
        <div className="absolute top-3 right-3 z-10 px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase bg-red-500 text-white shadow-md">
          {discountPercent}% OFF
        </div>
      )}

      {/* Main Image */}
      <img
        src={product.image_url && !imageError ? product.image_url : '/assets/logo.jpeg'}
        alt={product.name}
        className="relative z-0 max-h-full max-w-full object-cover sm:object-contain rounded-2xl group-hover:scale-105 transition-transform duration-500 ease-out drop-shadow-md"
        onError={() => setImageError(true)}
        loading="lazy"
      />
    </div>
  );

  const shippingInfoGrid = (
    <div className="rounded-2xl bg-white/70 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 p-3 sm:p-4 grid grid-cols-3 gap-2 sm:gap-3 text-center shadow-xs">
      <div className="flex flex-col items-center gap-1 group cursor-default">
        <div className="w-8 h-8 rounded-xl bg-[#3C6CA8]/10 dark:bg-[#3C6CA8]/20 flex items-center justify-center text-[#3C6CA8] dark:text-[#94BBE9] group-hover:scale-110 transition-transform duration-200">
          <Truck className="w-4 h-4" />
        </div>
        <p className="text-[10px] sm:text-[11px] text-charcoal-700 dark:text-slate-300 leading-tight font-semibold mt-0.5">{shippingWindow}</p>
        <span className="text-[8.5px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold">Fast Delivery</span>
      </div>
      <div className="flex flex-col items-center gap-1 group cursor-default">
        <div className="w-8 h-8 rounded-xl bg-[#3C6CA8]/10 dark:bg-[#3C6CA8]/20 flex items-center justify-center text-[#3C6CA8] dark:text-[#94BBE9] group-hover:scale-110 transition-transform duration-200">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <p className="text-[10px] sm:text-[11px] text-charcoal-700 dark:text-slate-300 leading-tight font-semibold mt-0.5">
          <span>Transit Protected</span>
        </p>
        <span className="text-[8.5px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold">100% Guaranteed</span>
      </div>
      <div className="flex flex-col items-center gap-1 group cursor-default">
        <div className="w-8 h-8 rounded-xl bg-[#3C6CA8]/10 dark:bg-[#3C6CA8]/20 flex items-center justify-center text-[#3C6CA8] dark:text-[#94BBE9] group-hover:scale-110 transition-transform duration-200">
          <Zap className="w-4 h-4" />
        </div>
        <p className="text-[10px] sm:text-[11px] text-charcoal-700 dark:text-slate-300 leading-tight font-semibold mt-0.5">Priority Dispatch</p>
        <span className="text-[8.5px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold">Direct from Lab</span>
      </div>
    </div>
  );

  const paymentBadges = (
    <div className="border-t border-gray-200/60 dark:border-slate-800/80 pt-3 mt-3 w-full">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 bg-slate-50/60 dark:bg-slate-900/50 p-2.5 px-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60">
        <div className="flex items-center gap-1.5 shrink-0">
          <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-[10.5px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Safe &amp; Secure Checkout
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap justify-center sm:justify-end min-w-0">
          <span className="px-2.5 py-1 rounded-xl bg-blue-50/90 text-[#3C6CA8] border border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60 text-[10px] font-bold inline-flex items-center gap-1 shadow-2xs">
            <QrCode className="w-3.5 h-3.5 text-[#3C6CA8] dark:text-blue-400" /> QR Scan Payment
          </span>
          <div className="flex items-center gap-1">
            <span className="px-2 py-0.5 rounded-md border border-slate-200/80 dark:border-slate-700 text-blue-700 dark:text-blue-300 text-[9.5px] font-extrabold bg-white dark:bg-slate-950 shadow-2xs">GCash</span>
            <span className="px-2 py-0.5 rounded-md border border-slate-200/80 dark:border-slate-700 text-rose-700 dark:text-rose-400 text-[9.5px] font-extrabold bg-white dark:bg-slate-950 shadow-2xs">CIMB</span>
            <span className="px-2 py-0.5 rounded-md border border-slate-200/80 dark:border-slate-700 text-blue-900 dark:text-blue-200 text-[9.5px] font-extrabold bg-white dark:bg-slate-950 shadow-2xs">BDO</span>
          </div>
        </div>
      </div>
    </div>
  );

  const productDetailsRight = (
    <div className="w-full flex flex-col text-left space-y-4">
      <div>
        {product.category && (
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#3C6CA8]/10 dark:bg-blue-950/40 border border-[#3C6CA8]/30 dark:border-blue-800/40 text-[#3C6CA8] dark:text-blue-300 text-[8px] font-extrabold uppercase tracking-wider mb-2 shadow-2xs">
            <span className="w-1 h-1 rounded-full bg-[#3C6CA8] dark:bg-blue-400 animate-pulse" />
            {product.category}
          </div>
        )}
        
        {/* Product Name & Inline Desktop Price */}
        <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-2 mb-2">
          <h2 className="font-heading text-[20px] lg:text-[28px] font-extrabold text-[#232323] dark:text-white tracking-tight leading-snug">
            {product.name}
          </h2>

          <div className="flex items-baseline gap-2.5 flex-shrink-0">
            {hasDiscount && (
              <span className="text-xs sm:text-sm text-gray-400 line-through font-medium">
                {formatPrice(baseOriginal)}
              </span>
            )}
            <span className="inline-flex items-center px-3.5 py-1 rounded-xl bg-blue-50/80 dark:bg-blue-950/50 border border-blue-200/80 dark:border-blue-800/60 text-[20px] lg:text-[24px] font-black text-[#3C6CA8] dark:text-blue-300 shadow-sm leading-none tracking-tight">
              {formatPrice(unitPrice)}
            </span>
          </div>
        </div>

        {/* Description — 12px mobile, 16px desktop font size */}
        <p className="text-[12px] lg:text-[16px] text-gray-600 dark:text-slate-400 leading-relaxed font-normal">
          {product.description}
        </p>
      </div>

      {/* Dosing Guide & Instructions Action Button */}
      <button 
        type="button"
        onClick={() => setDosingOpen(true)}
        className="w-full group relative overflow-hidden rounded-2xl border border-blue-200/80 dark:border-slate-800 bg-gradient-to-r from-blue-50/90 via-slate-50/60 to-blue-50/80 dark:from-slate-900/90 dark:via-slate-900/70 dark:to-blue-950/50 p-3 sm:p-4 text-left shadow-sm hover:shadow-md hover:border-[#3C6CA8] transition-all duration-300 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3C6CA8] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
      >
        <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#3C6CA8]/10 dark:bg-blue-400/10 text-[#3C6CA8] dark:text-blue-400 flex items-center justify-center border border-[#3C6CA8]/20 group-hover:scale-110 transition-transform mt-0.5 sm:mt-0">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
              <span className="text-xs sm:text-sm font-extrabold text-[#232323] dark:text-white uppercase tracking-wider">
                Dosing Guide &amp; Instructions
              </span>
              <span className="px-2 py-0.5 rounded-full text-[8.5px] sm:text-[9px] font-extrabold bg-[#3C6CA8]/10 text-[#3C6CA8] dark:bg-blue-400/20 dark:text-blue-300 uppercase whitespace-nowrap">
                Interactive Protocol
              </span>
            </div>
            <p className="text-[10.5px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-normal">
              Click to view detailed reconstitutions, dosage reference charts &amp; safety instructions
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 dark:bg-slate-800 text-xs font-bold text-[#3C6CA8] dark:text-blue-300 border border-blue-200/60 dark:border-slate-700 shadow-2xs group-hover:bg-[#3C6CA8] group-hover:text-white transition-colors self-start sm:self-auto shrink-0 w-full sm:w-auto">
          <span>Open Guide</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </div>
      </button>


      {/* View Protocol / Guide Button */}
      {product.linked_peptalk_id && (
        <a
          href={`/peptalk/${product.linked_peptalk_id}`}
          className="w-full bg-blue-50 hover:bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 dark:text-blue-300 py-2 rounded-xl font-bold text-[11px] tracking-wide transition-all duration-200 flex items-center justify-center gap-1.5 border border-blue-100 dark:border-blue-900/40 text-center shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3C6CA8] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
        >
          <BookOpen className="w-3.5 h-3.5" />
          View Protocol / Guide
        </a>
      )}

      {/* Pre-Order Banner */}
      {product.pre_order_enabled && (
        <div className="rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 dark:from-blue-950/20 dark:to-indigo-950/20 dark:border-blue-900/50 p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <RefreshCw className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" style={{ animationDuration: '6s' }} />
            <div>
              <h4 className="text-[11px] font-bold text-blue-950 dark:text-blue-200">Pre-Order Option Available</h4>
              <p className="text-[10px] text-blue-700/80 dark:text-blue-300/80 font-medium">Reserve this item for the upcoming biotech research batch.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2 text-[11px] pt-2 border-t border-blue-200/50 dark:border-blue-900/30">
            {product.pre_order_est_arrival && (
              <div>
                <span className="block text-gray-500 dark:text-slate-400 font-medium text-[9px] uppercase">Estimated Arrival</span>
                <span className="font-semibold text-blue-950 dark:text-blue-200">{product.pre_order_est_arrival}</span>
              </div>
            )}
            {product.pre_order_restock_date && (
              <div>
                <span className="block text-gray-500 dark:text-slate-400 font-medium text-[9px] uppercase">Restock Target</span>
                <span className="font-semibold text-blue-950 dark:text-blue-200">
                  {new Date(product.pre_order_restock_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            )}
            {product.pre_order_max_qty && (
              <div className="col-span-2">
                <span className="block text-gray-500 dark:text-slate-400 font-medium text-[9px] uppercase">Reservation Limit</span>
                <span className="font-semibold text-blue-950 dark:text-blue-200">Max {product.pre_order_max_qty} vials per order</span>
              </div>
            )}
            {product.pre_order_note && (
              <div className="col-span-2 bg-blue-100/40 dark:bg-blue-950/40 p-2 rounded-lg text-blue-800 dark:text-blue-300 font-semibold flex items-start gap-1 text-[10px]">
                <Lightbulb className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <span>{product.pre_order_note}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Inclusions (if set product - Ultra-Compact) */}
      {product.inclusions && product.inclusions.length > 0 && (
        <div className="rounded-xl bg-[#3C6CA8]/5 dark:bg-slate-900/80 border border-[#3C6CA8]/30 dark:border-[#3C6CA8]/40 p-2.5 sm:p-3 text-left shadow-2xs">
          <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-[#3C6CA8]/20 dark:border-slate-800">
            <p className="text-[11px] font-extrabold tracking-wider text-[#3C6CA8] dark:text-[#6A9BE0] uppercase flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-[#3C6CA8]" /> Set Includes
            </p>
            <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-[#3C6CA8]/15 text-[#3C6CA8] dark:text-[#94BBE9] border border-[#3C6CA8]/30">
              {product.inclusions.length} Items Included
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
            {product.inclusions.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-1.5 px-2 rounded-lg bg-white/80 dark:bg-slate-900/50 border border-[#3C6CA8]/20 dark:border-slate-800/60 shadow-2xs"
              >
                <div className="flex-shrink-0 w-4 h-4 rounded bg-[#3C6CA8]/15 text-[#3C6CA8] dark:text-blue-400 flex items-center justify-center font-bold text-[9px] border border-[#3C6CA8]/30">
                  ✓
                </div>
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate" title={item}>
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dosage Selector */}
      {variations.length > 0 && (
        <div className="flex items-start sm:items-center gap-4 flex-col sm:flex-row">
          <span className="font-semibold text-charcoal-900 dark:text-white text-base w-24 flex-shrink-0 text-left">Dosage</span>
          <div className="flex flex-wrap gap-2">
            {variations.map((variation) => {
              const outOfStock = variation.stock_quantity === 0;
              const isSelected = selectedVariation?.id === variation.id;
              return (
                <button
                  key={variation.id}
                  onClick={() => !outOfStock && setSelectedVariation(variation)}
                  disabled={outOfStock}
                  className={`px-4 sm:px-5 py-2 rounded-full border text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3C6CA8] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
                    isSelected
                      ? 'bg-[#3C6CA8] text-white border-[#3C6CA8] shadow-sm ring-2 ring-[#3C6CA8]/30'
                      : 'bg-white dark:bg-slate-800 text-charcoal-800 dark:text-slate-200 border-charcoal-200 dark:border-slate-800 hover:border-[#3C6CA8] hover:text-[#3C6CA8]'
                  } ${outOfStock ? 'opacity-40 cursor-not-allowed line-through' : ''}`}
                >
                  {variation.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Quantity + price (Inline Decrement/Increment & Responsive 20px #3C6CA8 Price) */}
      <div className="flex items-center justify-between gap-3 sm:gap-4 py-1">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#232323] dark:text-white text-sm sm:text-base">Quantity</span>
          <div className="inline-flex items-center rounded-full border border-gray-250 dark:border-slate-800 bg-gray-50 dark:bg-slate-850 p-0.5">
            <button
              onClick={decrementQuantity}
              aria-label="Decrease quantity"
              className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-[#232323] dark:text-slate-350 hover:bg-white dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3C6CA8]"
            >
              <Minus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </button>
            <span className="min-w-[1.75rem] text-center font-bold text-[#232323] dark:text-white text-xs sm:text-sm">{quantity}</span>
            <button
              onClick={incrementQuantity}
              aria-label="Increase quantity"
              className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-[#232323] dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3C6CA8]"
            >
              <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </button>
          </div>
        </div>

        {/* Price Details — 20px font size & #3C6CA8 color */}
        <div className="text-right flex-shrink-0">
          {hasDiscount && (
            <div className="text-[11px] text-gray-400 line-through leading-tight">
              {formatPrice(totalOriginal)}
            </div>
          )}
          <div className="text-[20px] font-extrabold text-[#3C6CA8] dark:text-blue-400 leading-tight">
            {formatPrice(totalPrice)}
          </div>
          {hasDiscount && (
            <div className="text-[10px] font-bold text-[#3C6CA8] dark:text-blue-400">{discountPercent}% OFF</div>
          )}
        </div>
      </div>

      {/* Bundle & Save — Automated single-line layout design */}
      {sortedTiers.length > 0 && (() => {
        type Card = { qty: number; percent: number; mostPopular: boolean };
        const cards: Card[] = [
          { qty: 1, percent: 0, mostPopular: false },
          ...sortedTiers.map((t) => ({
            qty: t.min_quantity,
            percent: Number(t.discount_percentage),
            mostPopular: t.most_popular,
          })),
        ];
        return (
          <div className="text-left space-y-2.5 w-full">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-extrabold tracking-wider text-[#232323]/80 dark:text-slate-300 uppercase flex items-center gap-1">
                <Zap className="w-3 h-3 text-[#3C6CA8]" /> Bundle &amp; Save
              </p>
              {pricing.hasGlobalDiscount ? (
                <span className="text-[10px] font-extrabold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200/60 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                  Global Sale Active ({discountPercent}% OFF)
                </span>
              ) : previewTier ? (
                <span className="text-[10px] font-bold text-[#3C6CA8] dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full border border-blue-200/50">
                  {Number(previewTier.discount_percentage)}% Savings Active
                </span>
              ) : null}
            </div>

            {/* Storewide Sale Active Notice (Explains why bundle discounts are disabled) */}
            {pricing.hasGlobalDiscount && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs">
                <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="text-[11px] leading-tight font-medium">
                  <strong className="font-bold text-amber-800 dark:text-amber-300">{globalDiscount?.name || 'Global Sale'} Active:</strong> Storewide discount ({discountPercent}% OFF) is already applied to this product. Bundle tier discounts are disabled to prevent double-discounting.
                </span>
              </div>
            )}
            
            {/* 3-Column Mobile-Responsive Grid Layout */}
            <div className={`grid ${cards.length === 2 ? 'grid-cols-2' : cards.length === 3 ? 'grid-cols-3' : 'grid-cols-3 sm:grid-cols-4'} gap-1.5 sm:gap-2.5`}>
              {cards.map((card, i) => {
                const isSelected = quantity >= card.qty &&
                  (i === cards.length - 1 || quantity < cards[i + 1].qty);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setQuantity(card.qty)}
                    className={`relative rounded-2xl border transition-all duration-300 p-1.5 sm:p-2.5 text-left cursor-pointer flex flex-col justify-between min-h-[86px] sm:min-h-[102px] group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3C6CA8] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
                      isSelected
                        ? 'border-[#3C6CA8] bg-gradient-to-b from-blue-50/90 to-blue-100/50 dark:from-slate-800/90 dark:to-blue-950/40 shadow-sm ring-2 ring-[#3C6CA8]/35'
                        : 'border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/50 hover:border-[#3C6CA8]/60 hover:bg-blue-50/30'
                    } ${pricing.hasGlobalDiscount ? 'opacity-90' : ''}`}
                  >
                    {card.mostPopular && !pricing.hasGlobalDiscount && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 sm:px-2 py-0.2 sm:py-0.5 rounded-full text-[7px] sm:text-[8px] font-black tracking-wider uppercase bg-gradient-to-r from-[#3C6CA8] to-[#2A5288] text-white shadow-sm whitespace-nowrap z-10">
                        Popular
                      </span>
                    )}
                    {pricing.hasGlobalDiscount && card.qty > 1 && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded-full text-[7px] sm:text-[7.5px] font-extrabold tracking-wider uppercase bg-amber-500 text-white shadow-xs whitespace-nowrap z-10">
                        Sale Active
                      </span>
                    )}
                    <div className="h-9 sm:h-12 flex items-end justify-center mb-1">
                      {Array.from({ length: Math.min(card.qty, 3) }).map((_, idx) => (
                        <div
                          key={idx}
                          className="-mx-1 w-4.5 sm:w-6 h-8 sm:h-11 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden shadow-2xs group-hover:scale-105 transition-transform"
                          style={{ zIndex: idx }}
                        >
                          <img
                            src={product.image_url ? product.image_url : '/assets/logo.jpeg'}
                            alt=""
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      ))}
                      {card.qty > 3 && (
                        <span className="ml-0.5 text-[8.5px] sm:text-[9px] font-bold text-slate-500">+{card.qty - 3}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-0.5 mt-auto border-t border-slate-100 dark:border-slate-800/80 pt-1">
                      <span className="text-[9px] sm:text-[10px] font-bold text-[#232323] dark:text-white uppercase tracking-tight truncate">
                        {card.qty} {card.qty === 1 ? 'Vial' : 'Vials'}
                      </span>
                      {pricing.hasGlobalDiscount ? (
                        <span className="text-[8px] sm:text-[9px] font-bold text-amber-600 dark:text-amber-400 shrink-0">
                          {discountPercent}% OFF
                        </span>
                      ) : card.percent > 0 ? (
                        <span className="text-[8.5px] sm:text-[10px] font-extrabold text-[#3C6CA8] dark:text-blue-400 shrink-0">
                          {card.percent}% OFF
                        </span>
                      ) : (
                        <span className="text-[8px] sm:text-[9px] text-slate-400 font-medium shrink-0">Base</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* CoA + Enhanced Add to Cart Button Row */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => {
            setCustomModalCoaUrl(coaUrl);
            setIsCoaModalOpen(true);
          }}
          className="px-4 py-3 rounded-2xl border border-blue-200/80 dark:border-slate-700 bg-white/90 dark:bg-slate-900/80 text-[#232323] dark:text-white text-xs font-black hover:bg-blue-50/80 dark:hover:bg-slate-800 hover:border-[#3C6CA8] hover:text-[#3C6CA8] transition-all duration-200 inline-flex items-center gap-2 shrink-0 cursor-pointer shadow-sm hover:shadow-md active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3C6CA8] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 group"
          title="View Official Certificate of Analysis (COA)"
        >
          <FileText className="w-4 h-4 text-[#3C6CA8] group-hover:scale-110 transition-transform" />
          <span>COA</span>
        </button>

        <button
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          className={`flex-1 py-3 px-6 rounded-2xl text-white text-xs sm:text-sm font-extrabold tracking-wide transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3C6CA8] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
            addedSuccess
              ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 shadow-emerald-500/30 scale-105'
              : 'bg-[#3C6CA8] hover:bg-[#315A8E]'
          }`}
        >
          {isOutOfStock ? (
            'Out of Stock'
          ) : addedSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-white animate-bounce" /> Added to Cart!
            </>
          ) : (
            <>
              Add to Cart <ShoppingCart className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* Payment methods */}
      {paymentBadges}
    </div>
  );

  const biotechSectionsCommon = (
    <>
      <ProductPeptideCalculator initialVialSizeMg={getVialStrengthMg()} />
      <CertificateOfAnalysisSection
        productName={product.name}
        purity={product.purity_percentage}
        coaUrl={coaUrl}
        onQuickView={(imgUrl) => {
          setCustomModalCoaUrl(imgUrl);
          setIsCoaModalOpen(true);
        }}
      />
      <CompoundInformationSection
        product={product}
        protocols={protocols}
      />
    </>
  );

  if (asPage) {
    return (
      <div className="w-full bg-cream-50 dark:bg-slate-950 py-6 sm:py-10">
        <div className="container-global flex flex-col gap-6 sm:gap-8">
          {/* Main 2-column responsive layout card for desktop, stacking nicely on mobile */}
          <div className="w-full bg-white/60 dark:bg-slate-900/40 backdrop-blur-md border border-charcoal-100 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-luxury">
            {/* Desktop 2-column layout */}
            <div className="hidden lg:grid grid-cols-12 gap-8 lg:gap-12 items-start">
              {/* Column 1 (Left): Image showcase, Shipping info grid, Safety Warning notice */}
              <div className="lg:col-span-5 space-y-4">
                {imageShowcase}
                {shippingInfoGrid}
                <ImportantResearchNoticeSection />
              </div>
              
              {/* Column 2 (Right): Product info & Buy controls */}
              <div className="lg:col-span-7">
                {productDetailsRight}
              </div>
            </div>

            {/* Mobile/Tablet Stacked Layout */}
            <div className="block lg:hidden space-y-4">
              {imageShowcase}
              {productDetailsRight}
              {shippingInfoGrid}
              <ImportantResearchNoticeSection />
            </div>
          </div>

          {/* Product Reviews placed above Peptide Dosage Calculator */}
          <div className="w-full space-y-8">
            <ProductReviews productId={product.id} productName={product.name} />
            {biotechSectionsCommon}
          </div>
        </div>

        {/* Dynamic Full COA Interactive Modal */}
        <COAModal
          isOpen={isCoaModalOpen}
          onClose={() => setIsCoaModalOpen(false)}
          product={product}
          customCoaUrl={customModalCoaUrl}
        />
      </div>
    );
  }

  return (
    <div
      className={wrapperClass}
      onClick={onClose}
    >
      <div
        className={cardClass}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-2 sm:pt-3 pb-1 flex-shrink-0">
          <span className="block w-10 h-1.5 rounded-full bg-charcoal-200" />
        </div>

        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 flex items-center gap-1.5">
          <button
            onClick={handleToggleSave}
            type="button"
            aria-label={isSaved ? "Remove from Saved Items" : "Save Item"}
            title={isSaved ? "Saved to Wishlist" : "Save to Wishlist"}
            className={`p-2 rounded-full border transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3C6CA8] ${
              isSaved
                ? 'bg-rose-50 border-rose-200 text-rose-500 hover:bg-rose-100 shadow-xs'
                : 'bg-white/90 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-rose-500 hover:bg-rose-50/50 shadow-2xs'
            }`}
          >
            <Heart className={`w-4.5 h-4.5 ${isSaved ? 'fill-rose-500 text-rose-500 animate-pulse' : 'text-current'}`} />
          </button>

          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-full text-charcoal-400 hover:text-[#3C6CA8] hover:bg-cream-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3C6CA8] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="px-4 sm:px-5 pt-2 pb-4 flex-1 overflow-y-auto">
          {/* Responsive two-column grid inside the modal */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* Left Column: Image, shipping info & payment badges */}
            <div className="md:col-span-5 space-y-3">
              {imageShowcase}
              {shippingInfoGrid}
              {paymentBadges}
            </div>

            {/* Right Column: Info & Actions */}
            <div className="md:col-span-7">
              {productDetailsRight}
            </div>
          </div>

          <div className="mt-8 border-t border-charcoal-200 dark:border-slate-800 pt-8 space-y-8">
            <ProductReviews productId={product.id} productName={product.name} />
            {biotechSectionsCommon}
            <ImportantResearchNoticeSection />
          </div>
        </div>

        {/* Sticky compact action bar */}
        <div
          className="border-t border-charcoal-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 sm:px-5 py-3 flex-shrink-0"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-charcoal-700 dark:text-slate-400 truncate pr-2">{product.name}</span>
            <span className="text-base font-semibold text-charcoal-900 dark:text-white flex-shrink-0">
              {formatPrice(unitPrice)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {variations.length > 0 ? (
              <div className="flex items-center gap-2 flex-shrink min-w-0 overflow-x-auto scrollbar-hide">
                {variations.map((variation) => {
                  const outOfStock = variation.stock_quantity === 0;
                  const isSelected = selectedVariation?.id === variation.id;
                  return (
                    <button
                      key={variation.id}
                      onClick={() => !outOfStock && setSelectedVariation(variation)}
                      disabled={outOfStock}
                      className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-all duration-200 flex-shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3C6CA8] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
                        isSelected
                          ? 'bg-[#3C6CA8] text-white border-[#3C6CA8] shadow-[0_0_10px_rgba(60,108,168,0.35)]'
                          : 'bg-white dark:bg-slate-800 text-charcoal-800 dark:text-slate-200 border-charcoal-200 dark:border-slate-800 hover:border-[#3C6CA8] hover:text-[#3C6CA8]'
                      } ${outOfStock ? 'opacity-40 cursor-not-allowed line-through' : ''}`}
                    >
                      {variation.name}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex-1" />
            )}
            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className={`flex-1 ml-auto py-2.5 px-5 rounded-full text-white text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-w-[7rem] cursor-pointer shadow-md hover:shadow-lg active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3C6CA8] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
                addedSuccess
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 shadow-emerald-500/20'
                  : 'bg-[#3C6CA8] hover:bg-[#315A8E] shadow-blue-500/20'
              }`}
            >
              {isOutOfStock ? 'Unavailable' : addedSuccess ? 'Added!' : 'Add to Cart'}
              {!isOutOfStock && !addedSuccess && <ShoppingCart className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic Full COA Interactive Modal */}
      <COAModal
        isOpen={isCoaModalOpen}
        onClose={() => setIsCoaModalOpen(false)}
        product={product}
        customCoaUrl={customModalCoaUrl}
      />

      {/* Enhanced Dosing Guide & Instructions Popup Modal */}
      {dosingOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[999999] bg-charcoal-900/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn"
          onClick={() => setDosingOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3 }}
            className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-luxury border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800/80 bg-gradient-to-r from-blue-50/90 via-slate-50/50 to-blue-50/70 dark:from-slate-900 dark:via-blue-950/20 dark:to-slate-900">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#3C6CA8] text-white flex items-center justify-center shadow-md">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold text-[#3C6CA8] dark:text-blue-400 uppercase tracking-widest block">
                      Biotech Laboratory Protocol Reference
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      Research Standard
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                    Dosing Guide &amp; Handling Instructions
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setDosingOpen(false)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3C6CA8]"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-left text-xs sm:text-sm">
              {/* Product Info Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-gradient-to-br from-blue-50/60 to-slate-50 dark:from-slate-950 dark:to-blue-950/30 border border-blue-100 dark:border-slate-800 shadow-2xs">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Target Compound</span>
                  <span className="font-mono font-extrabold text-[#3C6CA8] dark:text-blue-300 text-sm mt-0.5">{product.name}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Category</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs mt-0.5">{product.category || 'Peptide Research'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Standard Vial Size</span>
                  <span className="font-mono font-semibold text-slate-700 dark:text-slate-300 text-xs mt-0.5">{getVialStrengthMg()} mg</span>
                </div>
              </div>

              {/* Dosing Guidelines Section */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#3C6CA8] dark:text-blue-400 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" /> Dosing &amp; Protocol Guidelines
                </h4>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 leading-relaxed font-medium text-slate-700 dark:text-slate-300 whitespace-pre-line shadow-2xs">
                  {product.dosing_guide ? (
                    product.dosing_guide
                  ) : (
                    <div className="space-y-2">
                      <p>• <strong>Reconstitution:</strong> Reconstitute lyophilized powder using 1.0 mL to 2.0 mL of Bacteriostatic Water (0.9% Benzyl Alcohol).</p>
                      <p>• <strong>Administration Protocol:</strong> Draw reconstituted liquid into a calibrated U-100 insulin syringe according to target microgram (mcg) dosage requirements.</p>
                      <p>• <strong>Sample Dosage Breakdown:</strong> For a 5mg vial reconstituted with 2mL Bac Water, 10 units (0.1mL) equals 250 mcg.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Reconstitution & Storage Quick Matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 space-y-1.5">
                  <span className="text-[10px] font-extrabold uppercase text-[#3C6CA8] dark:text-blue-400 flex items-center gap-1">
                    <Droplet className="w-3.5 h-3.5" /> Reconstitution Agent
                  </span>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Bacteriostatic Water (0.9% Benzyl Alcohol)</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Slowly drip diluent down the glass vial wall. Gently swirl—never shake.</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 space-y-1.5">
                  <span className="text-[10px] font-extrabold uppercase text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5" /> Storage Stability
                  </span>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Lyophilized: -20°C | Reconstituted: 2°C–8°C</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Reconstituted solutions maintain potency for up to 30 days under refrigeration.</p>
                </div>
              </div>

              {/* Visual Reference Chart Image */}
              {product.dosage_chart_url && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#3C6CA8] dark:text-blue-400 flex items-center gap-1.5">
                    <Microscope className="w-4 h-4" /> Visual Dosage Reference Chart
                  </h4>
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 flex justify-center">
                    <img 
                      src={product.dosage_chart_url} 
                      alt="Dosage Chart" 
                      className="max-h-72 object-contain rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm"
                    />
                  </div>
                </div>
              )}

              {/* Usage Notes & Warnings */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> Laboratory Handling Precautions
                </h4>
                <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/20 text-amber-900 dark:text-amber-300 border border-amber-200/80 dark:border-amber-900/40 leading-relaxed text-xs font-semibold space-y-1">
                  {product.usage_notes ? (
                    <p>{product.usage_notes}</p>
                  ) : (
                    <p>• Handle with sterile technique under biosafety cabinet. For in vitro diagnostic &amp; laboratory scientific research only.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/50 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                SlimDose Research Grade Reference Guide
              </span>
              <button
                onClick={() => setDosingOpen(false)}
                className="px-6 py-2.5 rounded-xl bg-[#3C6CA8] hover:bg-[#315A8E] text-white text-xs font-bold transition-all shadow-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3C6CA8] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
              >
                Close Guide
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ProductDetailModal;
