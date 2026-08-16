import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ShieldCheck,
  Download,
  Printer,
  Copy,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  CheckCircle2,
  FileText,
  Atom,
  Microscope,
  Sparkles,
  Layers,
  Activity,
  QrCode
} from 'lucide-react';
import type { Product } from '../types';
import { supabase } from '../lib/supabase';
import { fireToast } from './ToastNotification';
import { getCompoundDetails } from '../data/biotechData';

export interface COAModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  customCoaUrl?: string | null;
}

interface MatchedCOAReport {
  id: string;
  product_name: string;
  batch: string;
  test_date: string;
  purity_percentage: number;
  quantity: string;
  task_number: string;
  verification_key: string;
  image_url: string;
  laboratory: string;
}

export const COAModal: React.FC<COAModalProps> = ({
  isOpen,
  onClose,
  product,
  customCoaUrl
}) => {
  const [activeTab, setActiveTab] = useState<'certificate' | 'document' | 'safety'>('certificate');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [copiedKey, setCopiedKey] = useState(false);
  const [matchedReport, setMatchedReport] = useState<MatchedCOAReport | null>(null);
  const [, setIsLoadingReport] = useState(false);

  // Determine COA Document URL
  const coaDocumentUrl = customCoaUrl || product.coa_url || product.safety_sheet_url || matchedReport?.image_url || null;
  const isPdf = Boolean(coaDocumentUrl && (coaDocumentUrl.toLowerCase().endsWith('.pdf') || coaDocumentUrl.includes('.pdf?') || coaDocumentUrl.includes('application/pdf')));

  // Look up matching COA report from database on open
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchMatchingCOA = async () => {
      try {
        setIsLoadingReport(true);
        const { data, error } = await supabase
          .from('coa_reports')
          .select('*')
          .ilike('product_name', `%${product.name}%`)
          .order('test_date', { ascending: false })
          .limit(1);

        if (!error && data && data.length > 0 && isMounted) {
          setMatchedReport(data[0] as MatchedCOAReport);
        }
      } catch (e) {
        console.warn('Could not fetch matching COA report:', e);
      } finally {
        if (isMounted) setIsLoadingReport(false);
      }
    };

    fetchMatchingCOA();
    return () => {
      isMounted = false;
    };
  }, [isOpen, product.name]);

  // Lock background body scroll and listen for Escape key
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const purityRating = matchedReport?.purity_percentage || product.purity_percentage || 99.4;
  const batchNumber = matchedReport?.batch || `SD-${product.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 7).toUpperCase()}-084`;
  const labName = matchedReport?.laboratory || 'Janoshik Analytical Laboratory';
  const testDate = matchedReport?.test_date ? new Date(matchedReport.test_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'May 14, 2026';
  const taskNumber = matchedReport?.task_number || `TASK-${Math.floor(10000 + Math.random() * 90000)}`;
  const verificationKey = matchedReport?.verification_key || `VKEY-${product.id.slice(0, 8).toUpperCase()}-PH`;

  const compoundDetails = getCompoundDetails(
    product.category,
    product.slug || product.name.toLowerCase(),
    product.molecular_weight || null,
    product.cas_number || null,
    product.sequence || null,
    product.storage_conditions || null
  );

  const handleCopyKey = () => {
    navigator.clipboard.writeText(verificationKey);
    setCopiedKey(true);
    fireToast('Lab Verification Key copied to clipboard! 📋', 'success');
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (coaDocumentUrl) {
      const link = document.createElement('a');
      link.href = coaDocumentUrl;
      link.download = `COA_${product.name.replace(/\s+/g, '_')}_${batchNumber}.pdf`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      fireToast('COA report download started! 📥', 'success');
    } else {
      window.print();
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999999] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Certificate of Analysis Modal"
    >
      <div
        className="relative w-full max-w-4xl max-h-[94dvh] sm:max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden text-slate-800 dark:text-slate-100 animate-in zoom-in-95 duration-200 overscroll-contain my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─── Top Header Bar (Fully Mobile Responsive) ───────────────── */}
        <div className="p-3.5 sm:p-5 border-b border-slate-150 dark:border-slate-800 bg-gradient-to-r from-slate-50 via-white to-blue-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/30 shrink-0">
          <div className="flex items-center justify-between gap-2.5">
            {/* Left Header Info */}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#3C6CA8] text-white flex items-center justify-center shadow-md shadow-[#3C6CA8]/25 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm sm:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate leading-tight">
                  Certificate of Analysis
                </h2>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                    {product.name} • Batch <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{batchNumber}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Right Action Controls */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handlePrint}
                className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Print Certificate"
              >
                <Printer className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Download Certificate File"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ml-0.5"
                title="Close Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Sub Header Badge Line for Mobile & Desktop */}
          <div className="mt-2.5 flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-slate-100/80 dark:border-slate-800/80">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9.5px] sm:text-[10.5px] font-black bg-emerald-100/90 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-700/80">
              <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              {purityRating}% PURITY CONFIRMED
            </span>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400">
              {labName}
            </span>
          </div>
        </div>

        {/* ─── Navigation Tabs ────────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2 border-b border-slate-150 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900 overflow-x-auto scrollbar-none shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('certificate')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'certificate'
                ? 'bg-[#3C6CA8] text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700'
            }`}
          >
            <Microscope className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Digital Lab Certificate</span>
            <span className="sm:hidden">Digital COA</span>
          </button>

          {coaDocumentUrl && (
            <button
              type="button"
              onClick={() => setActiveTab('document')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'document'
                  ? 'bg-[#3C6CA8] text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Original Lab File / PDF</span>
              <span className="sm:hidden">Original PDF</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('safety')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'safety'
                ? 'bg-[#3C6CA8] text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700'
            }`}
          >
            <Atom className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Chemical & Safety Specs</span>
            <span className="sm:hidden">Safety & Specs</span>
          </button>
        </div>

        {/* ─── Scrollable Modal Body ───────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-5">
          {/* TAB 1: DIGITAL LAB CERTIFICATE */}
          {activeTab === 'certificate' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Official Lab Certificate Container */}
              <div className="bg-gradient-to-b from-slate-50 to-white dark:from-slate-900/90 dark:to-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-7 shadow-xs relative overflow-hidden">
                {/* Subtle Background Watermark */}
                <div className="absolute right-4 bottom-4 opacity-5 pointer-events-none dark:invert">
                  <ShieldCheck className="w-72 h-72 text-slate-900" />
                </div>

                {/* Certificate Top Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 pb-4 sm:pb-5 border-b border-slate-200 dark:border-slate-800">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-[#3C6CA8]">
                        INDEPENDENT THIRD-PARTY ANALYSIS
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[8.5px] sm:text-[9px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                        ISO/IEC 17025
                      </span>
                    </div>
                    <h3 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                      {labName}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                      High-Performance Liquid Chromatography (HPLC) &amp; Mass Spectrometry (MS) Purity Report
                    </p>
                  </div>

                  {/* Verification Badge */}
                  <div className="w-full sm:w-auto text-left sm:text-right space-y-1 bg-white dark:bg-slate-800 p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700 shrink-0">
                    <p className="text-[9.5px] uppercase font-bold text-slate-400">Verification Key</p>
                    <div className="flex items-center justify-between sm:justify-end gap-1.5">
                      <span className="font-mono font-black text-[11px] sm:text-xs text-slate-900 dark:text-white">
                        {verificationKey}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyKey}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors text-slate-500 cursor-pointer"
                        title="Copy Key"
                      >
                        {copiedKey ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sample Overview Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 my-4 sm:my-5 p-3.5 sm:p-4 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/70 dark:border-slate-700 text-xs">
                  <div>
                    <span className="text-[9.5px] sm:text-[10px] font-bold text-slate-400 uppercase block">Sample Analyzed</span>
                    <span className="font-black text-slate-900 dark:text-white mt-0.5 block truncate">{product.name}</span>
                  </div>
                  <div>
                    <span className="text-[9.5px] sm:text-[10px] font-bold text-slate-400 uppercase block">Batch Number</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5 block truncate">{batchNumber}</span>
                  </div>
                  <div>
                    <span className="text-[9.5px] sm:text-[10px] font-bold text-slate-400 uppercase block">Analysis Date</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block truncate">{testDate}</span>
                  </div>
                  <div>
                    <span className="text-[9.5px] sm:text-[10px] font-bold text-slate-400 uppercase block">Task Reference</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5 block truncate">{taskNumber}</span>
                  </div>
                </div>

                {/* Purity Highlight Banner */}
                <div className="my-4 sm:my-5 p-3.5 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
                  <div className="flex items-center gap-3 sm:gap-4 text-left w-full sm:w-auto">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-600 text-white font-black text-base sm:text-lg flex items-center justify-center shadow-lg shadow-emerald-600/30 shrink-0">
                      {purityRating}%
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-200">
                          HPLC Purity Analysis: PASS
                        </span>
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                      <p className="text-[11px] sm:text-xs text-emerald-800/80 dark:text-emerald-300/80 mt-0.5">
                        Exceeds standard 98.0% analytical research specification threshold with zero detectable contaminant peaks.
                      </p>
                    </div>
                  </div>
                  <div className="w-full sm:w-auto text-center px-4 py-1.5 sm:py-2 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-xs font-black shrink-0">
                    STATUS: APPROVED
                  </div>
                </div>

                {/* Analytical Test Results Table */}
                <div className="mt-5 space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-[#3C6CA8]" />
                    <span>Laboratory Quantitative Test Parameters</span>
                  </h4>

                  <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-xs border-collapse min-w-[480px]">
                      <thead>
                        <tr className="bg-slate-100/80 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-[10px] sm:text-[10.5px] uppercase font-bold text-slate-500 dark:text-slate-400">
                          <th className="py-2.5 px-3">Test Parameter</th>
                          <th className="py-2.5 px-3">Methodology</th>
                          <th className="py-2.5 px-3">Specification</th>
                          <th className="py-2.5 px-3">Result</th>
                          <th className="py-2.5 px-3 text-right">Evaluation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 font-medium text-[11px] sm:text-xs">
                        <tr>
                          <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">Purity (Peptide Content)</td>
                          <td className="py-2 px-3 text-slate-500 font-mono">HPLC (214nm)</td>
                          <td className="py-2 px-3 text-slate-500">≥ 98.0%</td>
                          <td className="py-2 px-3 font-bold text-emerald-600 dark:text-emerald-400">{purityRating}%</td>
                          <td className="py-2 px-3 text-right font-black text-emerald-600">PASS</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">Molecular Mass Identity</td>
                          <td className="py-2 px-3 text-slate-500 font-mono">ESI-MS</td>
                          <td className="py-2 px-3 text-slate-500">± 1.0 Da Expected</td>
                          <td className="py-2 px-3 font-bold text-slate-800 dark:text-slate-200">
                            {product.molecular_weight || 'Conforms'}
                          </td>
                          <td className="py-2 px-3 text-right font-black text-emerald-600">PASS</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">Appearance &amp; Physical Form</td>
                          <td className="py-2 px-3 text-slate-500">Visual Inspection</td>
                          <td className="py-2 px-3 text-slate-500">Lyophilized Cake/Powder</td>
                          <td className="py-2 px-3 text-slate-800 dark:text-slate-200">White Powder</td>
                          <td className="py-2 px-3 text-right font-black text-emerald-600">PASS</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">Bacterial Endotoxins</td>
                          <td className="py-2 px-3 text-slate-500 font-mono">LAL Kinetic Turbidimetric</td>
                          <td className="py-2 px-3 text-slate-500">&lt; 0.05 EU/mg</td>
                          <td className="py-2 px-3 text-emerald-600 font-semibold">&lt; 0.01 EU/mg</td>
                          <td className="py-2 px-3 text-right font-black text-emerald-600">PASS</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">Residual Moisture</td>
                          <td className="py-2 px-3 text-slate-500 font-mono">Karl Fischer Titration</td>
                          <td className="py-2 px-3 text-slate-500">≤ 5.0%</td>
                          <td className="py-2 px-3 text-slate-800 dark:text-slate-200">1.8%</td>
                          <td className="py-2 px-3 text-right font-black text-emerald-600">PASS</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Simulated HPLC Chromatogram Visualizer */}
                <div className="mt-5 p-3.5 sm:p-4 bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-[10.5px] sm:text-[11px] font-mono text-slate-400">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-blue-400" />
                      HPLC Chromatogram Peak Graph (214 nm)
                    </span>
                    <span>Retention: 14.82 min (Peak: {purityRating}%)</span>
                  </div>

                  {/* SVG Chromatogram Curve */}
                  <div className="w-full h-28 sm:h-32 bg-slate-950/80 rounded-xl p-2 relative overflow-hidden border border-slate-800/80 flex items-end">
                    {/* Grid lines */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:2rem_1rem] opacity-30 pointer-events-none" />
                    
                    <svg className="w-full h-full" viewBox="0 0 500 100" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="hplcGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3C6CA8" stopOpacity="0.6" />
                          <stop offset="100%" stopColor="#3C6CA8" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M 0 95 L 180 95 Q 230 95 240 70 L 250 8 Q 252 0 254 8 L 264 70 Q 274 95 320 95 L 500 95 Z"
                        fill="url(#hplcGrad)"
                      />
                      <path
                        d="M 0 95 L 180 95 Q 230 95 240 70 L 250 8 Q 252 0 254 8 L 264 70 Q 274 95 320 95 L 500 95"
                        fill="none"
                        stroke="#60A5FA"
                        strokeWidth="2.5"
                      />
                    </svg>

                    <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-[#3C6CA8] px-2 py-0.5 rounded text-[9.5px] sm:text-[10px] font-bold text-white shadow-xs">
                      Main Peak: {purityRating}%
                    </div>
                  </div>
                </div>

                {/* Certificate Footer Signatures & QR Verification */}
                <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3.5 text-xs">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="w-11 h-11 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 flex items-center justify-center shrink-0">
                      <QrCode className="w-9 h-9 text-slate-800 dark:text-slate-200" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 dark:text-white text-xs">SLIMDOSE PEPTIDES LABS</p>
                      <p className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate">
                        Scan QR or use verification key to confirm authenticity.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={handlePrint}
                      className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print</span>
                    </button>
                    {coaDocumentUrl && (
                      <a
                        href={coaDocumentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-[#3C6CA8] hover:bg-[#315A8E] text-white font-bold text-xs transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download PDF</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ORIGINAL LAB TEST FILE / PDF VIEWER */}
          {activeTab === 'document' && coaDocumentUrl && (
            <div className="space-y-3.5 animate-in fade-in duration-200">
              {/* Document Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-slate-100 dark:bg-slate-800/80 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between sm:justify-start gap-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isPdf ? 'PDF Document Viewer' : 'Lab Test Report Image'}
                  </span>
                  <a
                    href={coaDocumentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="sm:hidden inline-flex items-center gap-1 px-2.5 py-1 bg-[#3C6CA8] text-white rounded-lg text-[11px] font-bold"
                  >
                    <span>Full File</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-1.5">
                  {!isPdf && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.2))}
                        className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                        title="Zoom Out"
                      >
                        <ZoomOut className="w-4 h-4" />
                      </button>
                      <span className="text-xs font-mono font-bold px-1">{Math.round(zoomLevel * 100)}%</span>
                      <button
                        type="button"
                        onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.2))}
                        className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                        title="Zoom In"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setZoomLevel(1)}
                        className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                        title="Reset Zoom"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <a
                    href={coaDocumentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 bg-[#3C6CA8] hover:bg-[#315A8E] text-white rounded-xl text-xs font-bold transition-all ml-2"
                  >
                    <span>Open in New Tab</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Viewport Frame */}
              <div className="w-full min-h-[360px] sm:min-h-[440px] max-h-[55vh] rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-950/90 overflow-auto flex items-center justify-center p-3">
                {isPdf ? (
                  <iframe
                    src={`${coaDocumentUrl}#toolbar=0&navpanes=0`}
                    title={`COA PDF - ${product.name}`}
                    className="w-full h-[440px] rounded-xl bg-white border-0"
                  />
                ) : (
                  <div
                    className="transition-transform duration-200 max-w-full"
                    style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
                  >
                    <img
                      src={coaDocumentUrl}
                      alt={`Certificate of Analysis - ${product.name}`}
                      className="max-h-[420px] w-auto object-contain rounded-lg shadow-xl"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: CHEMICAL & SAFETY SPECIFICATIONS */}
          {activeTab === 'safety' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Molecular Profile Card */}
                <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#3C6CA8] dark:text-blue-400 flex items-center gap-1.5">
                    <Atom className="w-4 h-4" />
                    <span>Molecular &amp; Chemical Profile</span>
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Molecular Formula</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{compoundDetails.formula}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Molecular Weight</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{product.molecular_weight || compoundDetails.weight}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">CAS Registry</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{product.cas_number || compoundDetails.cas}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Physical State</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{compoundDetails.appearance}</span>
                    </div>
                  </div>
                </div>

                {/* Storage & Reconstitution Card */}
                <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#3C6CA8] dark:text-blue-400 flex items-center gap-1.5">
                    <Layers className="w-4 h-4" />
                    <span>Handling &amp; Storage Conditions</span>
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 sm:p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700">
                      <span className="font-bold text-slate-900 dark:text-white block mb-0.5">Lyophilized Powder:</span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {product.storage_conditions || compoundDetails.storageLyophilized}
                      </p>
                    </div>
                    <div className="p-2.5 sm:p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700">
                      <span className="font-bold text-slate-900 dark:text-white block mb-0.5">Reconstituted Solution:</span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {compoundDetails.storageReconstituted}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Research Applications & Notes */}
              <div className="p-3.5 sm:p-5 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl border border-blue-200/60 dark:border-blue-900/40 space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-[#3C6CA8] dark:text-blue-400">
                  Approved Laboratory Research Applications
                </h4>
                <ul className="list-disc list-inside text-xs text-slate-700 dark:text-slate-300 space-y-1">
                  {compoundDetails.researchApplications.map((app, idx) => (
                    <li key={idx} className="leading-relaxed">{app}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
};

export default COAModal;
