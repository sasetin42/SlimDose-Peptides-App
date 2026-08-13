import React, { useEffect, useState } from 'react';
import { Sparkles, Image as ImageIcon, Upload, X, Clock, Eye } from 'lucide-react';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { useImageUpload } from '../hooks/useImageUpload';

const TITLE_MAX = 100;
const DESCRIPTION_MAX = 200;

const LINK_OPTIONS: { value: string; label: string }[] = [
  { value: 'none', label: 'No link' },
  { value: '/', label: 'Shop / Home' },
  { value: '/calculator', label: 'Peptide Calculator' },
  { value: '/peptalk', label: 'Peptalk Articles' },
  { value: '/faq', label: 'FAQ Page' },
  { value: '/coa', label: 'COA Page' },
  { value: '/track-order', label: 'Track Order' },
  { value: 'custom', label: 'Custom URL...' },
];

const isPredefinedLink = (link: string) => LINK_OPTIONS.some(o => o.value === link && o.value !== 'custom');

const PopupManager: React.FC = () => {
  const { siteSettings, loading, updateSiteSettings } = useSiteSettings();
  const { uploadImage, uploading, uploadProgress } = useImageUpload('menu-images');

  const [enabled, setEnabled] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [linkChoice, setLinkChoice] = useState('none');
  const [customLink, setCustomLink] = useState('');
  const [image, setImage] = useState('');
  
  // Advanced settings states
  const [countdownEnabled, setCountdownEnabled] = useState(false);
  const [countdownEndsAt, setCountdownEndsAt] = useState('');
  const [countdownAutoDisable, setCountdownAutoDisable] = useState(false);
  const [displayBehavior, setDisplayBehavior] = useState('once_visitor');
  const [pageFilter, setPageFilter] = useState('all');
  const [delaySeconds, setDelaySeconds] = useState(5);
  const [closeOnOutsideClick, setCloseOnOutsideClick] = useState(true);

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
    
    // Set advanced states
    setCountdownEnabled((siteSettings.popup_countdown_enabled ?? 'false') === 'true');
    setCountdownEndsAt(siteSettings.popup_countdown_ends_at ?? '');
    setCountdownAutoDisable((siteSettings.popup_countdown_auto_disable ?? 'false') === 'true');
    setDisplayBehavior(siteSettings.popup_display_behavior ?? 'once_visitor');
    setPageFilter(siteSettings.popup_page_filter ?? 'all');
    setDelaySeconds(Number(siteSettings.popup_delay_seconds ?? '5'));
    setCloseOnOutsideClick((siteSettings.popup_close_on_outside_click ?? 'true') === 'true');
  }, [siteSettings]);

  const handleFile = async (file: File) => {
    try {
      const url = await uploadImage(file);
      setImage(url);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to upload image');
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
        popup_close_on_outside_click: closeOnOutsideClick ? 'true' : 'false'
      });
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2200);
    } catch (e) {
      alert('Failed to save popup settings.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading popup settings...</div>;
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden max-w-4xl mx-auto">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-[#3C6CA8]" />
            <h2 className="text-xl font-bold text-gray-900">Popup Management Console</h2>
          </div>
          <p className="text-sm text-gray-500">Configure promotional popups, dynamic behavior, target redirects, and countdowns.</p>
        </div>

        {/* Toggle */}
        <button
          type="button"
          onClick={() => setEnabled(v => !v)}
          aria-pressed={enabled}
          aria-label="Enable popup"
          className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#3C6CA8] focus:ring-offset-2 ${
            enabled ? 'bg-[#3C6CA8]' : 'bg-gray-300'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
              enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Basic Details & Media */}
          <div className="space-y-5">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider border-b border-gray-100 pb-2">
              Popup Details & Content
            </h3>
            
            {/* Title */}
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <label className="block text-xs font-bold text-gray-700 uppercase">Title</label>
                <span className="text-[10px] text-gray-400">{title.length}/{TITLE_MAX} characters</span>
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
                placeholder="Special Welcome Offer"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] transition-all outline-none"
              />
            </div>

            {/* Description */}
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <label className="block text-xs font-bold text-gray-700 uppercase">Description</label>
                <span className="text-[10px] text-gray-400">{description.length}/{DESCRIPTION_MAX} characters</span>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, DESCRIPTION_MAX))}
                placeholder="Join our list to receive exclusive restock reminders, first order discounts, and direct batch lab reports."
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] transition-all outline-none resize-none"
              />
            </div>

            {/* Redirect Action Link */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Action Link Redirect</label>
              <select
                value={linkChoice}
                onChange={(e) => setLinkChoice(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] outline-none transition-all"
              >
                {LINK_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {linkChoice === 'custom' && (
                <input
                  type="url"
                  value={customLink}
                  onChange={(e) => setCustomLink(e.target.value)}
                  placeholder="https://example.com or a relative path /products"
                  className="mt-2 w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] outline-none transition-all"
                />
              )}
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Upload Promo Banner Image</label>
              {image ? (
                <div className="relative inline-block group">
                  <img
                    src={image}
                    alt="Popup preview"
                    className="w-44 h-44 object-cover rounded-xl border border-gray-200 shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setImage('')}
                    className="absolute -top-2 -right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow transition-all duration-250 cursor-pointer"
                    aria-label="Remove image"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  className="block border-2 border-dashed border-gray-200 hover:border-[#3C6CA8] rounded-xl p-6 text-center cursor-pointer hover:bg-slate-50/55 transition-all"
                >
                  <input
                    type="file"
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
                      <div className="w-7 h-7 border-3 border-gray-200 border-t-[#3C6CA8] rounded-full animate-spin" />
                      <p className="text-xs text-gray-600">Uploading... {uploadProgress}%</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 text-gray-500">
                      <ImageIcon className="w-7 h-7 text-gray-400" />
                      <p className="text-xs font-semibold text-gray-700">Drag image here or browse files</p>
                      <p className="text-[10px] text-gray-400">Max size: 10mb. Recommended ratio: 16:9 or 1:1.</p>
                    </div>
                  )}
                </label>
              )}
              <input
                type="url"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="Or input direct image link URL"
                className="mt-2.5 w-full px-4 py-2 border border-gray-200 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] outline-none transition-all"
              />
            </div>
          </div>

          {/* Right Column: Advanced Rules & Timers */}
          <div className="space-y-5">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider border-b border-gray-100 pb-2">
              Behavior & Target Settings
            </h3>

            {/* Display Behavior */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Display Behavior</label>
              <select
                value={displayBehavior}
                onChange={(e) => setDisplayBehavior(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] outline-none transition-all"
              >
                <option value="once_visitor">Show once per visitor (uses cookies)</option>
                <option value="once_session">Show once per browser session</option>
                <option value="every_visit">Show on every visit/reload</option>
              </select>
            </div>

            {/* Page Filter */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Target Pages</label>
              <select
                value={pageFilter}
                onChange={(e) => setPageFilter(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] outline-none transition-all"
              >
                <option value="all">Show on all site pages</option>
                <option value="homepage">Show only on the Homepage</option>
              </select>
            </div>

            {/* Show Delay slider */}
            <div>
              <div className="flex justify-between items-baseline mb-1">
                <label className="block text-xs font-bold text-gray-700 uppercase">Trigger Delay</label>
                <span className="text-xs font-semibold text-[#3C6CA8]">{delaySeconds} seconds</span>
              </div>
              <input
                type="range"
                min="3"
                max="10"
                value={delaySeconds}
                onChange={(e) => setDelaySeconds(Number(e.target.value))}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#3C6CA8]"
              />
              <span className="text-[10px] text-gray-400 block mt-0.5">Delay before the popup appears to visitors (3-10s).</span>
            </div>

            {/* Outside Close toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <div>
                <p className="font-bold text-gray-700">Close on Outside Click</p>
                <p className="text-[10px] text-gray-400">Allow users to close by clicking the backdrop.</p>
              </div>
              <button
                type="button"
                onClick={() => setCloseOnOutsideClick(v => !v)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                  closeOnOutsideClick ? 'bg-[#3C6CA8]' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                    closeOnOutsideClick ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Countdown Settings */}
            <div className="p-4 rounded-2xl border border-dashed border-gray-200 bg-slate-50/50 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#3C6CA8]" />
                  <span className="text-xs font-bold text-gray-800 uppercase">Countdown Campaign Timer</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCountdownEnabled(v => !v)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                    countdownEnabled ? 'bg-[#3C6CA8]' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                      countdownEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {countdownEnabled && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Expiration Target Date & Time</label>
                    <input
                      type="datetime-local"
                      value={countdownEndsAt}
                      onChange={(e) => setCountdownEndsAt(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none bg-white focus:ring-1 focus:ring-[#3C6CA8]"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-650 font-medium">Auto-disable popup campaign when timer ends</span>
                    <button
                      type="button"
                      onClick={() => setCountdownAutoDisable(v => !v)}
                      className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                        countdownAutoDisable ? 'bg-[#3C6CA8]' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
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

        {/* Live Preview Wrapper */}
        <div className="mt-6 border-t border-gray-100 pt-6">
          <div className="flex items-center gap-1.5 mb-3 text-sm font-bold text-gray-700">
            <Eye className="w-4 h-4 text-[#3C6CA8]" />
            <span>Interactive Live Preview</span>
          </div>
          
          <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50/50 via-slate-100/30 to-gray-50/50 p-6 flex justify-center">
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden text-center flex flex-col">
              {image ? (
                <img src={image} alt="Promo" className="w-full h-44 object-cover" />
              ) : (
                <div className="w-full h-32 bg-slate-50 flex items-center justify-center text-gray-400 text-xs border-b border-gray-50">
                  No Image Added
                </div>
              )}
              
              <div className="p-5 flex-grow flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-gray-900 text-lg leading-tight">{title || 'Promo Offer'}</h4>
                  <p className="text-xs text-gray-600 mt-2 leading-relaxed">{description || 'Exclusive member deal details.'}</p>
                  
                  {countdownEnabled && countdownEndsAt && (
                    <div className="mt-4 p-2 bg-rose-50 border border-rose-100 rounded-lg inline-flex items-center gap-1.5 text-[10px] text-rose-700 font-bold uppercase tracking-wider mx-auto">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Ends at: {new Date(countdownEndsAt).toLocaleDateString()} {new Date(countdownEndsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="mt-5 w-full py-2.5 rounded-full text-white text-xs font-semibold shadow-sm transition-all"
                  style={{ backgroundColor: '#3C6CA8' }}
                >
                  {linkChoice !== 'none' ? 'Action / Claim Offer' : 'Dismiss'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
          {savedToast && (
            <span className="text-sm text-green-700 font-medium">Settings Saved Successfully ✓</span>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving || uploading}
            className="inline-flex items-center gap-2 bg-[#3C6CA8] hover:bg-[#3C6CA8]/90 text-white font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PopupManager;
