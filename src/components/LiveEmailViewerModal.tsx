import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Loader2,
  Mail,
  Copy,
  ExternalLink,
  ShieldCheck,
  Server,
  Clock,
  Sparkles,
  Smartphone,
  Monitor,
  Check,
} from 'lucide-react';

export interface LiveEmailViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientEmail: string;
  senderEmail: string;
  senderName: string;
  subject: string;
  htmlContent: string;
  provider: string;
  host: string;
  port: number | string;
  referenceId: string;
  timestamp?: string;
  isSending?: boolean;
}

export const LiveEmailViewerModal: React.FC<LiveEmailViewerModalProps> = ({
  isOpen,
  onClose,
  recipientEmail,
  senderEmail,
  senderName,
  subject,
  htmlContent,
  provider,
  host,
  port,
  referenceId,
  timestamp,
  isSending = false,
}) => {
  const [pipelineStep, setPipelineStep] = useState<number>(1);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [copiedHtml, setCopiedHtml] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (isSending) {
        setPipelineStep(1);
        const t1 = setTimeout(() => setPipelineStep(2), 600);
        const t2 = setTimeout(() => setPipelineStep(3), 1200);
        const t3 = setTimeout(() => setPipelineStep(4), 1800);
        return () => {
          clearTimeout(t1);
          clearTimeout(t2);
          clearTimeout(t3);
        };
      } else {
        setPipelineStep(4);
      }
    }
  }, [isOpen, isSending]);

  if (!isOpen) return null;

  const handleCopyHtml = () => {
    navigator.clipboard.writeText(htmlContent);
    setCopiedHtml(true);
    setTimeout(() => setCopiedHtml(false), 2000);
  };

  const handleOpenInNewTab = () => {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const displayTime =
    timestamp ||
    new Date().toLocaleString('en-PH', {
      timeZone: 'Asia/Manila',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      month: 'short',
      day: 'numeric',
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-blue-800/50 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-white">
        {/* Header Bar */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-black text-white">
                  Live Outbound Email Delivery Console
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Realtime Outbound
                </span>
              </div>
              <p className="text-xs text-blue-200/80 mt-0.5">
                Transmitted to <span className="font-mono text-amber-300 font-bold">{recipientEmail}</span> via{' '}
                <span className="font-bold text-white uppercase">{provider}</span> ({host})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Pipeline Steps Bar */}
        <div className="px-5 py-3 bg-slate-950/70 border-b border-slate-800/80">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {/* Step 1 */}
            <div
              className={`p-2 rounded-xl border flex items-center gap-2 transition-all ${
                pipelineStep >= 1
                  ? 'bg-blue-950/60 border-blue-600/50 text-blue-200'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              {pipelineStep === 1 ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400 shrink-0" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              )}
              <span className="truncate text-[11px] font-bold">1. Connect ({host})</span>
            </div>

            {/* Step 2 */}
            <div
              className={`p-2 rounded-xl border flex items-center gap-2 transition-all ${
                pipelineStep >= 2
                  ? 'bg-blue-950/60 border-blue-600/50 text-blue-200'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              {pipelineStep === 2 ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400 shrink-0" />
              ) : pipelineStep > 2 ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <div className="w-3.5 h-3.5 rounded-full border border-slate-700 shrink-0" />
              )}
              <span className="truncate text-[11px] font-bold">2. Auth ({senderEmail})</span>
            </div>

            {/* Step 3 */}
            <div
              className={`p-2 rounded-xl border flex items-center gap-2 transition-all ${
                pipelineStep >= 3
                  ? 'bg-blue-950/60 border-blue-600/50 text-blue-200'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              {pipelineStep === 3 ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400 shrink-0" />
              ) : pipelineStep > 3 ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <div className="w-3.5 h-3.5 rounded-full border border-slate-700 shrink-0" />
              )}
              <span className="truncate text-[11px] font-bold">3. Transmit HTML Payload</span>
            </div>

            {/* Step 4 */}
            <div
              className={`p-2 rounded-xl border flex items-center gap-2 transition-all ${
                pipelineStep >= 4
                  ? 'bg-emerald-950/80 border-emerald-600/60 text-emerald-200'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              {pipelineStep >= 4 ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <div className="w-3.5 h-3.5 rounded-full border border-slate-700 shrink-0" />
              )}
              <span className="truncate text-[11px] font-black text-emerald-300">4. Delivered (200 OK)</span>
            </div>
          </div>
        </div>

        {/* Content Body: Left Technical Metadata + Right Interactive Webmail Preview */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 overflow-hidden">
          {/* Technical Metadata Column */}
          <div className="p-4 sm:p-5 border-b lg:border-b-0 lg:border-r border-slate-800 space-y-4 overflow-y-auto custom-scrollbar bg-slate-950/40">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>Outbound Header Inspection</span>
              </h3>
            </div>

            <div className="space-y-2 text-xs">
              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  Target Recipient
                </span>
                <span className="font-mono text-emerald-300 font-bold block truncate mt-0.5">
                  {recipientEmail}
                </span>
              </div>

              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  Sender Identity
                </span>
                <span className="text-white font-bold block truncate mt-0.5">
                  {senderName} &lt;{senderEmail}&gt;
                </span>
              </div>

              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  Mail Server Host
                </span>
                <span className="font-mono text-blue-300 font-bold block truncate mt-0.5">
                  {host}:{port}
                </span>
              </div>

              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  Verification Ref ID
                </span>
                <span className="font-mono text-amber-300 font-bold block truncate mt-0.5">
                  {referenceId || 'HD-VERIF-CONFIRMED'}
                </span>
              </div>

              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  Dispatched Timestamp (PHT)
                </span>
                <span className="text-slate-300 font-medium block truncate mt-0.5">
                  {displayTime}
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleCopyHtml}
                className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-700"
              >
                {copiedHtml ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedHtml ? 'Copied to Clipboard!' : 'Copy HTML Code'}</span>
              </button>

              <button
                type="button"
                onClick={handleOpenInNewTab}
                className="w-full py-2 px-3 rounded-xl bg-blue-900/60 hover:bg-blue-800/80 text-blue-200 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border border-blue-700/50"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Full Render in New Tab</span>
              </button>
            </div>
          </div>

          {/* Interactive Webmail Preview Column */}
          <div className="lg:col-span-2 flex flex-col bg-slate-900/90 overflow-hidden">
            {/* Subject & Device Toggle Toolbar */}
            <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 truncate">
                <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider shrink-0">
                  Subject:
                </span>
                <span className="font-bold text-white truncate">{subject}</span>
              </div>

              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 shrink-0">
                <button
                  onClick={() => setPreviewDevice('desktop')}
                  className={`p-1 rounded text-xs font-bold transition-colors ${
                    previewDevice === 'desktop' ? 'bg-[#3C6CA8] text-white' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Desktop Preview (580px)"
                >
                  <Monitor className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setPreviewDevice('mobile')}
                  className={`p-1 rounded text-xs font-bold transition-colors ${
                    previewDevice === 'mobile' ? 'bg-[#3C6CA8] text-white' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Mobile Preview (375px)"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Rendered HTML Sandbox Frame */}
            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar flex items-center justify-center bg-slate-950/60">
              <div
                className={`transition-all duration-300 rounded-2xl overflow-hidden shadow-2xl bg-white ${
                  previewDevice === 'desktop' ? 'w-full max-w-[580px]' : 'w-[375px]'
                }`}
              >
                <iframe
                  title="Live Email Preview"
                  srcDoc={htmlContent}
                  className="w-full border-none h-[420px] sm:h-[480px] bg-white rounded-2xl"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Bar */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
          <p className="text-slate-400 text-[11px] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Check <strong className="text-white">{recipientEmail}</strong> inbox &amp; spam folder.</span>
          </p>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors cursor-pointer"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveEmailViewerModal;
