import React, { useEffect, useState, useMemo } from 'react';
import {
  Sparkles,
  Image as ImageIcon,
  Upload,
  X,
  Clock,
  Eye,
  Check,
  CheckCircle2,
  AlertTriangle,
  SlidersHorizontal,
  ExternalLink,
  ShieldAlert,
  Smartphone,
  Monitor,
  Bell,
  FileText,
  MousePointerClick,
  RefreshCw,
  Zap,
  Info,
  Calendar,
  Truck,
  Heart
} from 'lucide-react';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { useImageUpload } from '../hooks/useImageUpload';
import { fireToast } from './ToastNotification';

const TITLE_MAX = 100;
const DESCRIPTION_MAX = 220;

const LINK_OPTIONS: { value: string; label: string }[] = [
  { value: 'none', label: 'No link (Dismiss / Close only)' },
  { value: '/', label: 'Shop Home / Products Catalog' },
  { value: '/calculator', label: 'Peptide Dosage Calculator' },
  { value: '/peptalk', label: 'Peptalk Research Articles' },
  { value: '/faq', label: 'FAQ / Customer Support' },
  { value: '/coa', label: 'Certificate of Analysis (COA)' },
  { value: '/track-order', label: 'Track Order Portal' },
  { value: 'custom', label: 'Custom Destination URL...' },
];

const isPredefinedLink = (link: string) => LINK_OPTIONS.some(o => o.value === link && o.value !== 'custom');

type TabType = 'promo' | 'notice' | 'preview';

const PopupManager: React.FC = () => {
  const { siteSettings, loading, updateSiteSettings } = useSiteSettings();
  const { uploadImage, uploading, uploadProgress } = useImageUpload('menu-images');

  const [activeTab, setActiveTab] = useState<TabType>('promo');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [previewModalType, setPreviewModalType] = useState<'promo' | 'notice'>('promo');

  // Promo Popup states
  const [enabled, setEnabled] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [linkChoice, setLinkChoice] = useState('none');
  const [customLink, setCustomLink] = useState('');
  const [image, setImage] = useState('');

  // Advanced behavior & countdown states
  const [countdownEnabled, setCountdownEnabled] = useState(false);
  const [countdownEndsAt, setCountdownEndsAt] = useState('');
  const [countdownAutoDisable, setCountdownAutoDisable] = useState(false);
  const [displayBehavior, setDisplayBehavior] = useState('once_visitor');
  const [pageFilter, setPageFilter] = useState('all');
  const [delaySeconds, setDelaySeconds] = useState(5);
  const [closeOnOutsideClick, setCloseOnOutsideClick] = useState(true);

  // Important Notice Entry Modal states
  const [noticeTitle, setNoticeTitle] = useState('Important Notice');
  const [noticeSubtitle, setNoticeSubtitle] = useState('Please read carefully before continuing');
  const [noticeP1, setNoticeP1] = useState('');
  const [noticeP2, setNoticeP2] = useState('');
  const [noticeConsult, setNoticeConsult] = useState('');
  const [noticeWarningPill, setNoticeWarningPill] = useState('');
  const [noticeOrderDays, setNoticeOrderDays] = useState('');
  const [noticeCutoffTime, setNoticeCutoffTime] = useState('');
  const [noticeCourier, setNoticeCourier] = useState('');
  const [noticeWeekendOrders, setNoticeWeekendOrders] = useState('');
  const [noticeAgreeBtn, setNoticeAgreeBtn] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    if (!siteSettings) return;
    setEnabled((siteSettings.popup_enabled ?? 'true') !== 'false');
    setTitle(siteSettings.popup_title ?? '');
    setDescription(siteSettings.popup_description ?? '');
    const link = siteSettings.popup_link ?? 'none';
    if (isPredefinedLink(link) || link === 'none') {
      setLinkChoice(link);
      setCustomLink('');
    } else {
      setLinkChoice('custom');
      setCustomLink(link);
    }
    setImage(siteSettings.popup_image ?? '');

    // Advanced settings
    setCountdownEnabled((siteSettings.popup_countdown_enabled ?? 'false') === 'true');
    setCountdownEndsAt(siteSettings.popup_countdown_ends_at ?? '');
    setCountdownAutoDisable((siteSettings.popup_countdown_auto_disable ?? 'false') === 'true');
    setDisplayBehavior(siteSettings.popup_display_behavior ?? 'once_visitor');
    setPageFilter(siteSettings.popup_page_filter ?? 'all');
    setDelaySeconds(Number(siteSettings.popup_delay_seconds ?? '5'));
    setCloseOnOutsideClick((siteSettings.popup_close_on_outside_click ?? 'true') === 'true');

    // Important Notice Modal values
    setNoticeTitle(siteSettings.notice_title ?? 'Important Notice');
    setNoticeSubtitle(siteSettings.notice_subtitle ?? 'Please read carefully before continuing');
    setNoticeP1(
      siteSettings.notice_disclaimer_p1 ??
        'Sold strictly for research purposes only, not FDA-approved, and are not intended to diagnose, treat, cure, or prevent any disease.'
    );
    setNoticeP2(
      siteSettings.notice_disclaimer_p2 ??
        'Improper handling or use may carry risks, including possible side effects, adverse reactions, contamination, or ineffective results.'
    );
    setNoticeConsult(
      siteSettings.notice_consult_text ?? 'Always consult a licensed healthcare professional for health-related decisions.'
    );
    setNoticeWarningPill(
      siteSettings.notice_warning_pill ?? '✕ NO MEET UPS · NO PICK UPS · NO RUSH ORDERS'
    );
    setNoticeOrderDays(siteSettings.notice_order_days ?? 'Monday - Friday');
    setNoticeCutoffTime(siteSettings.notice_cutoff_time ?? '5:00 PM Daily');
    setNoticeCourier(siteSettings.notice_courier ?? 'Next Day via J&T');
    setNoticeWeekendOrders(siteSettings.notice_weekend_orders ?? 'Processed Mondays');
    setNoticeAgreeBtn(siteSettings.notice_agree_button_text ?? 'I Understand & Agree');
  }, [siteSettings]);

  const handleFile = async (file: File) => {
    try {
      const url = await uploadImage(file);
      if (url) {
        setImage(url);
        fireToast('Image uploaded successfully! 📸', 'success');
      }
    } catch (e: any) {
      fireToast(e?.message || 'Failed to upload image', 'error');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const resolvedLink = linkChoice === 'custom' ? customLink.trim() : linkChoice;
      await updateSiteSettings({
        popup_enabled: enabled ? 'true' : 'false',
        popup_title: title.slice(0, TITLE_MAX),
        popup_description: description.slice(0, DESCRIPTION_MAX),
        popup_link: resolvedLink || 'none',
        popup_image: image,
        popup_countdown_enabled: countdownEnabled ? 'true' : 'false',
        popup_countdown_ends_at: countdownEndsAt,
        popup_countdown_auto_disable: countdownAutoDisable ? 'true' : 'false',
        popup_display_behavior: displayBehavior,
        popup_page_filter: pageFilter,
        popup_delay_seconds: String(delaySeconds),
        popup_close_on_outside_click: closeOnOutsideClick ? 'true' : 'false',
        notice_title: noticeTitle,
        notice_subtitle: noticeSubtitle,
        notice_disclaimer_p1: noticeP1,
        notice_disclaimer_p2: noticeP2,
        notice_consult_text: noticeConsult,
        notice_warning_pill: noticeWarningPill,
        notice_order_days: noticeOrderDays,
        notice_cutoff_time: noticeCutoffTime,
        notice_courier: noticeCourier,
        notice_weekend_orders: noticeWeekendOrders,
        notice_agree_button_text: noticeAgreeBtn,
      });
      setSavedToast(true);
      fireToast('Popup settings saved and broadcasted live! 🚀', 'success');
      setTimeout(() => setSavedToast(false), 2400);
    } catch (e: any) {
      fireToast(e?.message || 'Failed to save popup settings.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Live countdown calculation
  const countdownFormatted = useMemo(() => {
    if (!countdownEnabled || !countdownEndsAt) return null;
    const end = new Date(countdownEndsAt).getTime();
    const now = Date.now();
    const diff = end - now;
    if (diff <= 0) return 'Campaign Expired';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const mins = Math.floor((diff / 1000 / 60) % 60);
    if (days > 0) return `${days}d ${hours}h ${mins}m remaining`;
    return `${hours}h ${mins}m remaining`;
  }, [countdownEnabled, countdownEndsAt]);

  if (loading) {
    return (
      <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="w-8 h-8 border-3 border-[#3C6CA8] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-bold">Loading Popup Management Console...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 w-full max-w-full overflow-hidden">
      {/* Top Header Card with SlimDose Branding */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-all">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#3C6CA8]/10 text-[#3C6CA8] dark:text-blue-400 flex items-center justify-center shrink-0 border border-[#3C6CA8]/20 shadow-xs">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-[#3C6CA8] dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Popup Management Console
                </h2>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-all ${
                    enabled
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                      : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      enabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                    }`}
                  />
                  {enabled ? 'LIVE BROADCASTING' : 'DISABLED'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                Configure promotional banners, regulatory notices, trigger timing, and countdown deals in real-time.
              </p>
            </div>
          </div>

          {/* Quick Actions & Master Toggle */}
          <div className="flex items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Promo Active</span>
              <button
                type="button"
                onClick={() => setEnabled(v => !v)}
                aria-pressed={enabled}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                  enabled ? 'bg-[#3C6CA8]' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition duration-200 ${
                    enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <button
              onClick={handleSave}
              disabled={isSaving || uploading}
              className="inline-flex items-center gap-1.5 bg-[#3C6CA8] hover:bg-[#325a8c] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
            >
              {isSaving ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics & Overview Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#3C6CA8]/10 text-[#3C6CA8] dark:text-blue-400 flex items-center justify-center shrink-0 border border-[#3C6CA8]/20">
            <Bell className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 truncate">Status</p>
            <p className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
              {enabled ? 'Active / Broadcasting' : 'Paused'}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
            <MousePointerClick className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 truncate">Trigger Delay</p>
            <p className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
              {delaySeconds}s · {displayBehavior === 'once_visitor' ? '1x Visitor' : displayBehavior === 'once_session' ? 'Session' : 'Always'}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
            <Clock className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 truncate">Countdown Deal</p>
            <p className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
              {countdownEnabled && countdownEndsAt ? (countdownFormatted || 'Active Timer') : 'Disabled'}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
            <ExternalLink className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 truncate">Action Link</p>
            <p className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
              {linkChoice === 'none' ? 'Dismiss only' : linkChoice === 'custom' ? (customLink || 'Custom URL') : linkChoice}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 p-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('promo')}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'promo'
              ? 'bg-[#3C6CA8] text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Promotional Popup</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('notice')}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'notice'
              ? 'bg-[#3C6CA8] text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-amber-500" />
          <span>Important Notice Entry Modal</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('preview')}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'preview'
              ? 'bg-[#3C6CA8] text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Eye className="w-4 h-4 text-emerald-500" />
          <span>Live Interactive Preview</span>
        </button>
      </div>

      {/* TAB 1: PROMOTIONAL POPUP */}
      {activeTab === 'promo' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 animate-in fade-in duration-150">
          {/* Left Column (7 cols): Content & Media */}
          <div className="lg:col-span-7 space-y-4 sm:space-y-5">
            <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-xs border border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#3C6CA8]" />
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Popup Content & Visual Media
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-[#3C6CA8] bg-[#3C6CA8]/10 px-2 py-0.5 rounded-md">LIVE SYNC</span>
              </div>

              {/* Title Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="popupmanager-heading-title" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Heading Title <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">{title.length}/{TITLE_MAX}</span>
                </div>
                <input id="popupmanager-heading-title" name="heading_title" type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
                  placeholder="e.g. Special Welcome Offer · 15% OFF"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] outline-none transition-all"
                />
              </div>

              {/* Description Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="popupmanager-description-body" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Description Body
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">{description.length}/{DESCRIPTION_MAX}</span>
                </div>
                <textarea id="popupmanager-description-body" name="description_body" rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, DESCRIPTION_MAX))}
                  placeholder="Join our subscriber list to receive exclusive restock reminders, first order discounts, and direct batch lab reports."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] outline-none transition-all leading-relaxed resize-none font-medium"
                />
              </div>

              {/* Action Link Choice */}
              <div>
                <label htmlFor="popupmanager-action-link-redirect-target" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Action Link Redirect Target
                </label>
                <select id="popupmanager-action-link-redirect-target" name="action_link_redirect_target" value={linkChoice}
                  onChange={(e) => setLinkChoice(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white font-medium focus:bg-white focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] outline-none transition-all cursor-pointer"
                >
                  {LINK_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {linkChoice === 'custom' && (
                  <input id="popupmanager-input-1" name="input_1" type="url"
                    value={customLink}
                    onChange={(e) => setCustomLink(e.target.value)}
                    placeholder="https://example.com/promo or relative path /products"
                    className="mt-2 w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] outline-none font-medium"
                  />
                )}
              </div>

              {/* Promo Banner Image Upload & Direct URL */}
              <div>
                <label htmlFor="popupmanager-promo-banner-image-image-setim" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                  Promo Banner Image
                </label>
                {image ? (
                  <div className="relative inline-block group">
                    <img
                      src={image}
                      alt="Popup banner preview"
                      className="w-48 h-32 sm:h-36 object-cover rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setImage('')}
                      className="absolute -top-2 -right-2 p-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
                      title="Remove image"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    className="block border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-[#3C6CA8] dark:hover:border-[#3C6CA8] rounded-2xl p-4 sm:p-5 text-center cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-all"
                  >
                    <input id="popupmanager-file-upload" name="file_upload" type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFile(f);
                        e.target.value = '';
                      }}
                    />
                    {uploading ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-6 h-6 border-2 border-[#3C6CA8] border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-bold">Uploading image... {uploadProgress}%</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-slate-500 dark:text-slate-400">
                        <ImageIcon className="w-8 h-8 text-[#3C6CA8] mb-1" />
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Click to browse or drag & drop image</p>
                        <p className="text-[11px] text-slate-400">PNG, JPG, WebP up to 10MB (Recommended 1:1 or 16:9)</p>
                      </div>
                    )}
                  </label>
                )}
                <div className="relative mt-2">
                  <input id="popupmanager-promo-banner-image-image-setim" name="promo_banner_image_image_setim" type="url"
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    placeholder="Or paste direct image URL (https://...)"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] outline-none font-medium"
                  />
                  {image && (
                    <button
                      type="button"
                      onClick={() => setImage('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (5 cols): Rules, Delay & Countdown */}
          <div className="lg:col-span-5 space-y-4 sm:space-y-5">
            <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-xs border border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#3C6CA8]" />
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Behavior & Trigger Timing
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-slate-400">RULES</span>
              </div>

              {/* Display Behavior */}
              <div>
                <label htmlFor="popupmanager-display-frequency" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Display Frequency
                </label>
                <select id="popupmanager-display-frequency" name="display_frequency" value={displayBehavior}
                  onChange={(e) => setDisplayBehavior(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white font-medium focus:bg-white focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] outline-none transition-all cursor-pointer"
                >
                  <option value="once_visitor">Show once per visitor (cookie based)</option>
                  <option value="once_session">Show once per browser session</option>
                  <option value="every_visit">Show on every visit / page reload</option>
                </select>
              </div>

              {/* Target Page Scope */}
              <div>
                <label htmlFor="popupmanager-target-page-scope" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Target Page Scope
                </label>
                <select id="popupmanager-target-page-scope" name="target_page_scope" value={pageFilter}
                  onChange={(e) => setPageFilter(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white font-medium focus:bg-white focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] outline-none transition-all cursor-pointer"
                >
                  <option value="all">Show across all pages</option>
                  <option value="homepage">Show only on Homepage</option>
                </select>
              </div>

              {/* Trigger Delay Range Slider */}
              <div>
                <div className="flex justify-between items-baseline mb-1.5">
                  <label htmlFor="popupmanager-trigger-delay" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Trigger Delay
                  </label>
                  <span className="text-xs font-extrabold text-[#3C6CA8] bg-[#3C6CA8]/10 dark:bg-[#3C6CA8]/20 px-2.5 py-0.5 rounded-lg border border-[#3C6CA8]/20">
                    {delaySeconds} seconds
                  </span>
                </div>
                <input id="popupmanager-trigger-delay" name="trigger_delay" type="range"
                  min="3"
                  max="10"
                  value={delaySeconds}
                  onChange={(e) => setDelaySeconds(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#3C6CA8]"
                />
                <span className="text-[11px] text-slate-400 block mt-1">
                  Wait time before popup reveals itself after visitor lands (3-10s).
                </span>
              </div>

              {/* Close on Outside Click */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Dismiss on Backdrop Tap</p>
                  <p className="text-[11px] text-slate-400">Allows tapping outside the card to close.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCloseOnOutsideClick(v => !v)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                    closeOnOutsideClick ? 'bg-[#3C6CA8]' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ${
                      closeOnOutsideClick ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Countdown Deal Card */}
              <div className="p-3.5 sm:p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Countdown Deal Timer
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCountdownEnabled(v => !v)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                      countdownEnabled ? 'bg-[#3C6CA8]' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ${
                        countdownEnabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {countdownEnabled && (
                  <div className="space-y-2.5 pt-1 animate-in fade-in duration-150">
                    <div>
                      <label htmlFor="popupmanager-campaign-ends-at-date-time" className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Campaign Ends At (Date & Time)
                      </label>
                      <input id="popupmanager-campaign-ends-at-date-time" name="campaign_ends_at_date_time" type="datetime-local"
                        value={countdownEndsAt}
                        onChange={(e) => setCountdownEndsAt(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] outline-none"
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <span className="text-slate-600 dark:text-slate-400 font-medium">Auto-disable popup when timer ends</span>
                      <button
                        type="button"
                        onClick={() => setCountdownAutoDisable(v => !v)}
                        className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                          countdownAutoDisable ? 'bg-[#3C6CA8]' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-xs transition duration-200 ${
                            countdownAutoDisable ? 'translate-x-3' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: IMPORTANT NOTICE MODAL */}
      {activeTab === 'notice' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-xs border border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 space-y-6 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Entry Notice Modal Disclaimers & Policies
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Configure the mandatory compliance disclaimer and operational rules shown on the initial entry pop-up.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 self-start sm:self-auto">
              SITE-WIDE COMPLIANCE
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
            {/* Left Col: Disclaimers */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800 pb-1.5 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-[#3C6CA8]" /> Header & Regulatory Disclaimers
              </h4>

              <div>
                <label htmlFor="popupmanager-notice-header-title" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Notice Header Title
                </label>
                <input id="popupmanager-notice-header-title" name="notice_header_title" type="text"
                  value={noticeTitle}
                  onChange={(e) => setNoticeTitle(e.target.value)}
                  placeholder="Important Notice"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:bg-white focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] outline-none"
                />
              </div>

              <div>
                <label htmlFor="popupmanager-notice-header-subtitle" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Notice Header Subtitle
                </label>
                <input id="popupmanager-notice-header-subtitle" name="notice_header_subtitle" type="text"
                  value={noticeSubtitle}
                  onChange={(e) => setNoticeSubtitle(e.target.value)}
                  placeholder="Please read carefully before continuing"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-200 focus:bg-white focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] outline-none font-medium"
                />
              </div>

              <div>
                <label htmlFor="popupmanager-disclaimer-paragraph-1-researc" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Disclaimer Paragraph 1 (Research Use)
                </label>
                <textarea id="popupmanager-disclaimer-paragraph-1-researc" name="disclaimer_paragraph_1_researc" rows={3}
                  value={noticeP1}
                  onChange={(e) => setNoticeP1(e.target.value)}
                  placeholder="Sold strictly for research purposes only..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:bg-white focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] outline-none resize-none leading-relaxed font-medium"
                />
              </div>

              <div>
                <label htmlFor="popupmanager-disclaimer-paragraph-2-handlin" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Disclaimer Paragraph 2 (Handling & Risks)
                </label>
                <textarea id="popupmanager-disclaimer-paragraph-2-handlin" name="disclaimer_paragraph_2_handlin" rows={3}
                  value={noticeP2}
                  onChange={(e) => setNoticeP2(e.target.value)}
                  placeholder="Improper handling or use may carry risks..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:bg-white focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] outline-none resize-none leading-relaxed font-medium"
                />
              </div>

              <div>
                <label htmlFor="popupmanager-healthcare-consult-note" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Healthcare Consult Note
                </label>
                <input id="popupmanager-healthcare-consult-note" name="healthcare_consult_note" type="text"
                  value={noticeConsult}
                  onChange={(e) => setNoticeConsult(e.target.value)}
                  placeholder="Always consult a licensed healthcare professional..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:bg-white focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] outline-none font-medium"
                />
              </div>
            </div>

            {/* Right Col: Warnings & Policy Cards */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800 pb-1.5 flex items-center gap-2">
                <Truck className="w-3.5 h-3.5 text-rose-500" /> Warning Banner & Operational Policy
              </h4>

              <div>
                <label htmlFor="popupmanager-red-warning-pill-text" className="block text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-1">
                  Red Warning Pill Text
                </label>
                <input id="popupmanager-red-warning-pill-text" name="red_warning_pill_text" type="text"
                  value={noticeWarningPill}
                  onChange={(e) => setNoticeWarningPill(e.target.value)}
                  placeholder="✕ NO MEET UPS · NO PICK UPS · NO RUSH ORDERS"
                  className="w-full px-3.5 py-2.5 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl text-xs font-extrabold text-rose-800 dark:text-rose-300 focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              {/* Policy Grid */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-3">
                <span className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                  Delivery Policy Key Details
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="popupmanager-order-days" className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Order Days</label>
                    <input id="popupmanager-order-days" name="order_days" type="text"
                      value={noticeOrderDays}
                      onChange={(e) => setNoticeOrderDays(e.target.value)}
                      placeholder="Monday - Friday"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="popupmanager-cut-off-time" className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Cut-off Time</label>
                    <input id="popupmanager-cut-off-time" name="cut_off_time" type="text"
                      value={noticeCutoffTime}
                      onChange={(e) => setNoticeCutoffTime(e.target.value)}
                      placeholder="5:00 PM Daily"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="popupmanager-courier-carrier" className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Courier Carrier</label>
                    <input id="popupmanager-courier-carrier" name="courier_carrier" type="text"
                      value={noticeCourier}
                      onChange={(e) => setNoticeCourier(e.target.value)}
                      placeholder="Next Day via J&T"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="popupmanager-weekend-orders" className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Weekend Orders</label>
                    <input id="popupmanager-weekend-orders" name="weekend_orders" type="text"
                      value={noticeWeekendOrders}
                      onChange={(e) => setNoticeWeekendOrders(e.target.value)}
                      placeholder="Processed Mondays"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="popupmanager-agreement-button-action-text" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Agreement Button Action Text
                </label>
                <input id="popupmanager-agreement-button-action-text" name="agreement_button_action_text" type="text"
                  value={noticeAgreeBtn}
                  onChange={(e) => setNoticeAgreeBtn(e.target.value)}
                  placeholder="I Understand & Agree"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-extrabold text-slate-900 dark:text-white focus:bg-white focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: INTERACTIVE LIVE PREVIEW */}
      {activeTab === 'preview' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-xs border border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 space-y-5 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-[#3C6CA8]" />
                <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Live Viewport Simulator
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Test the live responsive appearance on desktop screens versus mobile phone displays.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              {/* Modal Type Selector */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setPreviewModalType('promo')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    previewModalType === 'promo'
                      ? 'bg-white dark:bg-slate-700 text-[#3C6CA8] dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Promo Popup
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewModalType('notice')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    previewModalType === 'notice'
                      ? 'bg-white dark:bg-slate-700 text-[#3C6CA8] dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Notice Modal
                </button>
              </div>

              {/* Viewport Device Toggle */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={`p-2 rounded-lg transition-all cursor-pointer ${
                    previewDevice === 'desktop'
                      ? 'bg-white dark:bg-slate-700 text-[#3C6CA8] dark:text-blue-400 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                  title="Desktop View"
                >
                  <Monitor className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={`p-2 rounded-lg transition-all cursor-pointer ${
                    previewDevice === 'mobile'
                      ? 'bg-white dark:bg-slate-700 text-[#3C6CA8] dark:text-blue-400 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                  title="Mobile View"
                >
                  <Smartphone className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Simulator Canvas */}
          <div className="bg-slate-950/90 rounded-2xl sm:rounded-3xl p-4 sm:p-8 flex items-center justify-center min-h-[460px] overflow-hidden border border-slate-800">
            {previewModalType === 'promo' ? (
              /* Promo Popup Simulator */
              <div
                className={`bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden text-center transition-all duration-200 border border-slate-200/50 dark:border-slate-700/60 ${
                  previewDevice === 'mobile' ? 'w-[320px] max-w-full' : 'w-full max-w-md'
                }`}
              >
                {image ? (
                  <img src={image} alt="Promo" className="w-full h-44 object-cover" />
                ) : (
                  <div className="w-full h-32 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 text-xs border-b border-slate-200 dark:border-slate-700 font-bold">
                    No image uploaded
                  </div>
                )}

                <div className="p-5 space-y-3">
                  <div>
                    <h4 className="font-black text-slate-900 dark:text-white text-lg sm:text-xl leading-tight">
                      {title || 'Special Welcome Offer'}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed font-medium">
                      {description || 'Join our list for exclusive restock reminders, first order discounts, and direct batch lab reports.'}
                    </p>
                  </div>

                  {countdownEnabled && countdownEndsAt && (
                    <div className="p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl inline-flex items-center gap-1.5 text-[11px] text-amber-800 dark:text-amber-300 font-bold uppercase tracking-wider mx-auto">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>{countdownFormatted || 'Campaign Running'}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    className="w-full py-3 rounded-xl text-white text-xs font-bold shadow-sm bg-[#3C6CA8] hover:bg-[#325a8c] transition-all cursor-pointer"
                  >
                    {linkChoice !== 'none' ? 'Claim Deal / View Offer' : 'Continue to Store'}
                  </button>
                </div>
              </div>
            ) : (
              /* Notice Modal Simulator */
              <div
                className={`bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-5 sm:p-6 text-left transition-all duration-200 max-h-[460px] overflow-y-auto custom-scrollbar border border-slate-200/50 dark:border-slate-700/60 ${
                  previewDevice === 'mobile' ? 'w-[320px] max-w-full' : 'w-full max-w-lg'
                }`}
              >
                <div className="text-center space-y-1 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h4 className="font-black text-slate-900 dark:text-white text-base sm:text-lg">{noticeTitle}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{noticeSubtitle}</p>
                </div>

                <div className="py-3 space-y-2.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  <p>{noticeP1}</p>
                  <p>{noticeP2}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 italic flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-[#3C6CA8] shrink-0" />
                    <span>{noticeConsult}</span>
                  </p>
                </div>

                <div className="my-2 py-2 px-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-center text-xs font-extrabold text-rose-800 dark:text-rose-300">
                  {noticeWarningPill}
                </div>

                <div className="grid grid-cols-2 gap-2 my-3 text-[10px] bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60">
                  <div><span className="text-slate-400 font-bold uppercase">Order Days:</span> <strong className="text-slate-800 dark:text-slate-200 block text-xs mt-0.5">{noticeOrderDays}</strong></div>
                  <div><span className="text-slate-400 font-bold uppercase">Cut-off:</span> <strong className="text-slate-800 dark:text-slate-200 block text-xs mt-0.5">{noticeCutoffTime}</strong></div>
                  <div><span className="text-slate-400 font-bold uppercase">Courier:</span> <strong className="text-slate-800 dark:text-slate-200 block text-xs mt-0.5">{noticeCourier}</strong></div>
                  <div><span className="text-slate-400 font-bold uppercase">Weekends:</span> <strong className="text-slate-800 dark:text-slate-200 block text-xs mt-0.5">{noticeWeekendOrders}</strong></div>
                </div>

                <button
                  type="button"
                  className="w-full py-3 rounded-xl text-white text-xs font-bold bg-[#3C6CA8] hover:bg-[#325a8c] shadow-sm mt-2 transition-all cursor-pointer"
                >
                  {noticeAgreeBtn}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sticky Bottom Save Action Bar */}
      <div className="sticky bottom-4 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 sm:p-4 rounded-2xl sm:rounded-3xl shadow-lg border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {savedToast ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-4 h-4" />
              Settings Saved Successfully
            </span>
          ) : (
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate hidden sm:inline">
              Adjust parameters across tabs, then click Save Settings to broadcast live.
            </span>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving || uploading}
          className="inline-flex items-center gap-2 bg-[#3C6CA8] hover:bg-[#325a8c] text-white font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
        >
          {isSaving ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </div>
    </div>
  );
};

export default PopupManager;
