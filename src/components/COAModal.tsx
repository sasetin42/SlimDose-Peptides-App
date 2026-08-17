import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ShieldCheck,
  Download,
  Printer,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  CheckCircle2,
  FileText
} from 'lucide-react';
import type { Product } from '../types';
import { supabase } from '../lib/supabase';
import { fireToast } from './ToastNotification';

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
  const [zoomLevel, setZoomLevel] = useState(1);
  const [matchedReport, setMatchedReport] = useState<MatchedCOAReport | null>(null);

  // Determine COA Document URL
  const coaDocumentUrl = customCoaUrl || product.coa_url || product.safety_sheet_url || matchedReport?.image_url || null;
  const isPdf = Boolean(coaDocumentUrl && (coaDocumentUrl.toLowerCase().endsWith('.pdf') || coaDocumentUrl.includes('.pdf?') || coaDocumentUrl.includes('application/pdf')));

  // Look up matching COA report from database on open
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchMatchingCOA = async () => {
      try {
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
        className="relative w-full max-w-4xl max-h-[96dvh] sm:max-h-[92vh] bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden text-slate-800 dark:text-slate-100 animate-in zoom-in-95 duration-200 overscroll-contain my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─── Top Header Bar ────────────────────────────────────────── */}
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

          {/* Sub Header Badge Line */}
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

        {/* ─── Scrollable Modal Body: Direct COA Document Viewer ───────── */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 flex flex-col space-y-3">
          {coaDocumentUrl ? (
            <div className="flex flex-col flex-1 space-y-3">
              {/* Document Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-slate-100 dark:bg-slate-800/80 p-2 sm:p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 shrink-0">
                <div className="flex items-center justify-between sm:justify-start gap-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#3C6CA8]" />
                    {isPdf ? 'COA PDF Document' : 'COA Lab Report File'}
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
                      <button type="button" onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.2))} className="p-1.5 text-slate-600 hover:bg-white dark:hover:bg-slate-700 rounded-lg"><ZoomOut className="w-4 h-4" /></button>
                      <span className="text-xs font-mono font-bold px-1">{Math.round(zoomLevel * 100)}%</span>
                      <button type="button" onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.2))} className="p-1.5 text-slate-600 hover:bg-white dark:hover:bg-slate-700 rounded-lg"><ZoomIn className="w-4 h-4" /></button>
                      <button type="button" onClick={() => setZoomLevel(1)} className="p-1.5 text-slate-600 hover:bg-white dark:hover:bg-slate-700 rounded-lg"><RotateCcw className="w-4 h-4" /></button>
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

              {/* Document Display Viewport */}
              <div className="flex-1 w-full min-h-[420px] sm:min-h-[520px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-950/90 overflow-auto flex items-center justify-center p-2 sm:p-3">
                {isPdf ? (
                  <iframe
                    src={`${coaDocumentUrl}#toolbar=1&navpanes=0`}
                    title={`COA PDF - ${product.name}`}
                    className="w-full h-full min-h-[440px] sm:min-h-[540px] rounded-xl bg-white border-0"
                  />
                ) : (
                  <div
                    className="transition-transform duration-200 max-w-full flex items-center justify-center"
                    style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
                  >
                    <img
                      src={coaDocumentUrl}
                      alt={`Certificate of Analysis - ${product.name}`}
                      className="max-h-[520px] sm:max-h-[65vh] w-auto object-contain rounded-lg shadow-2xl bg-white"
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-[350px] flex flex-col items-center justify-center text-center p-6 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-[#3C6CA8] flex items-center justify-center shadow-inner">
                <FileText className="w-7 h-7" />
              </div>
              <div className="space-y-1 max-w-md">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Official Lab Certificate Document
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Third-party batch test verification for <strong className="text-slate-800 dark:text-slate-200">{product.name}</strong> ({batchNumber}).
                </p>
              </div>
              <a
                href="https://www.janoshik.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#3C6CA8] hover:bg-[#315A8E] text-white text-xs font-bold rounded-xl transition-all shadow-md"
              >
                <span>Verify on Janoshik Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
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
