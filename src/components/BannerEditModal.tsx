import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Loader2,
  Sparkles,
  Pencil,
  CheckCircle2,
  AlertCircle,
  Eye,
  Palette,
  Link as LinkIcon,
  Clock,
  MoveHorizontal,
  AlignCenter,
  Flame,
  Zap,
  Info
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { fireToast } from './ToastNotification';

export interface BannerData {
  announcement_text: string;
  announcement_active: boolean;
  background_color?: string;
  text_color?: string;
  display_style?: 'marquee' | 'static' | 'pulse';
  link_url?: string;
  link_open_new_tab?: boolean;
  schedule_enabled?: boolean;
  schedule_start?: string;
  schedule_end?: string;
}

interface BannerEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Partial<BannerData>;
  onSaved?: (updated: BannerData) => void;
}

const PRESET_COLORS = [
  { name: 'Brand Blue', value: '#3C6CA8', text: '#FFFFFF' },
  { name: 'Royal Navy', value: '#1E3A8A', text: '#FFFFFF' },
  { name: 'Deep Indigo', value: '#312E81', text: '#FFFFFF' },
  { name: 'Emerald High Purity', value: '#059669', text: '#FFFFFF' },
  { name: 'Amber Gold Flash', value: '#D97706', text: '#FFFFFF' },
  { name: 'Crimson Alert', value: '#DC2626', text: '#FFFFFF' },
  { name: 'Dark Carbon', value: '#0F172A', text: '#F8FAFC' },
  { name: 'Purple Biotech', value: '#7C3AED', text: '#FFFFFF' }
];

export const BannerEditModal: React.FC<BannerEditModalProps> = ({
  isOpen,
  onClose,
  initialData,
  onSaved
}) => {
  const [formData, setFormData] = useState<BannerData>({
    announcement_text: '⚡ FREE cold-chain shipping for Metro Manila orders over ₱5,000! ❄️',
    announcement_active: true,
    background_color: '#3C6CA8',
    text_color: '#FFFFFF',
    display_style: 'marquee',
    link_url: '',
    link_open_new_tab: false,
    schedule_enabled: false,
    schedule_start: '',
    schedule_end: ''
  });

  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'appearance' | 'schedule'>('content');

  // Lock background scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Load initialData when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({
        ...prev,
        ...initialData,
        announcement_text: initialData?.announcement_text || prev.announcement_text,
        announcement_active: initialData?.announcement_active !== undefined ? initialData.announcement_active : prev.announcement_active,
        background_color: initialData?.background_color || prev.background_color || '#3C6CA8',
        text_color: initialData?.text_color || prev.text_color || '#FFFFFF',
        display_style: initialData?.display_style || prev.display_style || 'marquee'
      }));
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleChange = (field: keyof BannerData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // 1. Get current admin session for audit
      const sessionRaw = sessionStorage.getItem('admin_session') || localStorage.getItem('admin_session');
      let adminEmail = 'admin@slimdose.ph';
      let adminRole = 'admin';
      if (sessionRaw) {
        try {
          const parsed = JSON.parse(sessionRaw);
          adminEmail = parsed.email || adminEmail;
          adminRole = parsed.role || adminRole;
        } catch {}
      }

      // 2. Save to page_contents for 'announcement_bar'
      const { error: barErr } = await supabase
        .from('page_contents')
        .upsert({
          page_id: 'announcement_bar',
          content: {
            ...formData,
            updated_at: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        });

      if (barErr) console.warn('announcement_bar page_contents error:', barErr);

      // 3. Mirror to site_settings
      try {
        await supabase.from('site_settings').upsert([
          { id: 'announcement_text', value: formData.announcement_text, type: 'string', updated_at: new Date().toISOString() },
          { id: 'announcement_active', value: String(formData.announcement_active), type: 'boolean', updated_at: new Date().toISOString() },
          { id: 'announcement_bg_color', value: formData.background_color || '#3C6CA8', type: 'string', updated_at: new Date().toISOString() },
          { id: 'announcement_text_color', value: formData.text_color || '#FFFFFF', type: 'string', updated_at: new Date().toISOString() },
          { id: 'announcement_style', value: formData.display_style || 'marquee', type: 'string', updated_at: new Date().toISOString() },
          { id: 'announcement_link_url', value: formData.link_url || '', type: 'string', updated_at: new Date().toISOString() }
        ]);
      } catch (siteErr) {
        console.warn('site_settings mirror error:', siteErr);
      }

      // 4. Cache locally
      try {
        localStorage.setItem('slimdose_banner_settings', JSON.stringify(formData));
      } catch {}

      // 5. Log audit trail
      try {
        await supabase.from('audit_logs').insert([{
          actor_email: adminEmail,
          actor_role: adminRole,
          action: 'UPDATE_TOP_BANNER',
          details: `Updated top announcement banner: "${formData.announcement_text.substring(0, 50)}..." (Active: ${formData.announcement_active})`
        }]);
      } catch (logErr) {
        console.warn('Audit log error:', logErr);
      }

      // 6. Broadcast event for instant zero-reload UI update
      window.dispatchEvent(new CustomEvent('headerAnnouncementUpdated', {
        detail: formData
      }));

      fireToast({
        title: 'Top Banner Saved',
        description: 'Announcement banner updated and broadcast live to all visitors.',
        type: 'success'
      });

      if (onSaved) onSaved(formData);
      onClose();
    } catch (err: any) {
      console.error('Error saving top banner:', err);
      fireToast({
        title: 'Save Failed',
        description: err.message || 'Failed to update announcement banner. Please try again.',
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp">
        
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#3C6CA8]/10 dark:bg-[#3C6CA8]/20 text-[#3C6CA8] dark:text-blue-400 flex items-center justify-center border border-[#3C6CA8]/20 shadow-xs">
              <Pencil className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug">
                  Edit Top Announcement Banner
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                  Admin Only
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Customize announcement copy, live active state, colors, and behavior.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Real-time Interactive Live Preview */}
        <div className="px-5 sm:px-6 py-3.5 bg-slate-100/70 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800 shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-black tracking-wider uppercase text-slate-500 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-amber-500" />
              Live Storefront Preview
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              formData.announcement_active
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
            }`}>
              {formData.announcement_active ? '● Banner Visible' : '○ Banner Hidden'}
            </span>
          </div>

          <div
            className="w-full rounded-xl overflow-hidden shadow-inner flex items-center justify-center relative transition-all duration-300"
            style={{
              backgroundColor: formData.background_color || '#3C6CA8',
              height: '38px'
            }}
          >
            <div className="flex-1 overflow-hidden px-4">
              {formData.display_style === 'marquee' ? (
                <div className="announcement-marquee flex items-center justify-center">
                  <span
                    className="text-xs font-semibold tracking-wide whitespace-nowrap"
                    style={{ color: formData.text_color || '#FFFFFF' }}
                  >
                    {formData.announcement_text || 'Enter announcement message...'}
                  </span>
                </div>
              ) : formData.display_style === 'pulse' ? (
                <div className="flex items-center justify-center animate-pulse">
                  <span
                    className="text-xs font-bold tracking-wide truncate"
                    style={{ color: formData.text_color || '#FFFFFF' }}
                  >
                    {formData.announcement_text || 'Enter announcement message...'}
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-center text-center">
                  <span
                    className="text-xs font-semibold tracking-wide truncate"
                    style={{ color: formData.text_color || '#FFFFFF' }}
                  >
                    {formData.announcement_text || 'Enter announcement message...'}
                  </span>
                </div>
              )}
            </div>

            <div className="pr-3 pl-1 flex items-center">
              <div className="p-0.5 rounded-full bg-white/10 text-white/70">
                <X className="w-3 h-3" />
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-5 sm:px-6 pt-3 pb-1 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('content')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'content'
                ? 'border-[#3C6CA8] text-[#3C6CA8] dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Copy & Details</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('appearance')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'appearance'
                ? 'border-[#3C6CA8] text-[#3C6CA8] dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Style & Palette</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('schedule')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'schedule'
                ? 'border-[#3C6CA8] text-[#3C6CA8] dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Link & Schedule</span>
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 custom-scrollbar">
          
          {/* TAB 1: CONTENT & STATUS */}
          {activeTab === 'content' && (
            <div className="space-y-5 animate-fadeIn">
              
              {/* Active Toggle */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-black text-slate-900 dark:text-white block">
                    Announcement Banner Status
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                    Enable or disable the top header banner across the entire storefront
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.announcement_active}
                    onChange={(e) => handleChange('announcement_active', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3C6CA8]"></div>
                </label>
              </div>

              {/* Announcement Text Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="bannereditmodal-announcement-message-copy" className="text-xs font-black text-slate-800 dark:text-slate-200">
                    Announcement Message Copy
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {formData.announcement_text.length} characters
                  </span>
                </div>
                <textarea
                  id="bannereditmodal-announcement-message-copy"
                  name="announcement_message_copy"
                  rows={3}
                  value={formData.announcement_text}
                  onChange={(e) => handleChange('announcement_text', e.target.value)}
                  placeholder="e.g. ⚡ FREE cold-chain shipping for Metro Manila orders over ₱5,000! ❄️"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] outline-none transition-all resize-none"
                  required
                />
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] font-bold text-slate-400">Quick Emojis:</span>
                  {['⚡', '❄️', '🔥', '✨', '🚚', '🎁', '📢', '🧪', '🔒', '💯'].map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => handleChange('announcement_text', `${formData.announcement_text} ${em}`)}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs transition-colors cursor-pointer"
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Template Presets */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">
                  Quick Message Presets
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { label: 'Cold-Chain Free Shipping', text: '⚡ FREE cold-chain shipping for Metro Manila orders over ₱5,000! ❄️' },
                    { label: 'Nationwide Express Shipping', text: '🚀 Nationwide cold-chain delivery available across Luzon, Visayas & Mindanao!' },
                    { label: 'Certificate of Analysis Live', text: '🧪 99%+ Purity Guaranteed · Third-Party Lab COAs Available for Every Batch!' },
                    { label: 'Weekend Orders Notice', text: '📦 Orders placed on weekends are safely packed & dispatched every Monday!' }
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleChange('announcement_text', preset.text)}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-[#3C6CA8] dark:hover:border-[#3C6CA8] bg-white dark:bg-slate-800/40 text-left transition-all group cursor-pointer shadow-2xs"
                    >
                      <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 block group-hover:text-[#3C6CA8] transition-colors">
                        {preset.label}
                      </span>
                      <span className="text-[10px] text-slate-400 block truncate">
                        {preset.text}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: APPEARANCE & STYLING */}
          {activeTab === 'appearance' && (
            <div className="space-y-5 animate-fadeIn">
              
              {/* Display Style & Animation */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-800 dark:text-slate-200 block">
                  Banner Motion &amp; Display Style
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'marquee', label: 'Marquee Scrolling', desc: 'Smooth horizontal crawl', icon: MoveHorizontal },
                    { id: 'static', label: 'Centered Static', desc: 'Clean centered text', icon: AlignCenter },
                    { id: 'pulse', label: 'Flash Alert', desc: 'Subtle attention pulse', icon: Flame }
                  ].map((style) => {
                    const Icon = style.icon;
                    const isSelected = (formData.display_style || 'marquee') === style.id;
                    return (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => handleChange('display_style', style.id)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                          isSelected
                            ? 'border-[#3C6CA8] bg-blue-50/50 dark:bg-blue-950/30 text-[#3C6CA8] shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <div>
                          <span className="text-xs font-bold block">{style.label}</span>
                          <span className="text-[10px] text-slate-400 block">{style.desc}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Presets */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-800 dark:text-slate-200 block">
                  Background Color Presets
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {PRESET_COLORS.map((preset) => {
                    const isSelected = formData.background_color?.toLowerCase() === preset.value.toLowerCase();
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => {
                          handleChange('background_color', preset.value);
                          handleChange('text_color', preset.text);
                        }}
                        className={`p-2 rounded-xl border flex items-center gap-2.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-slate-900 dark:border-white ring-2 ring-[#3C6CA8]/30 shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div
                          className="w-5 h-5 rounded-lg shrink-0 border border-black/10 shadow-2xs"
                          style={{ backgroundColor: preset.value }}
                        />
                        <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
                          {preset.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Color Codes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1">
                  <label htmlFor="bannereditmodal-custom-background-color-hex" className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Custom Background Color Hex
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.background_color || '#3C6CA8'}
                      onChange={(e) => handleChange('background_color', e.target.value)}
                      className="w-9 h-9 rounded-xl border border-slate-300 dark:border-slate-700 p-0.5 cursor-pointer bg-transparent"
                    />
                    <input
                      id="bannereditmodal-custom-background-color-hex"
                      name="custom_background_color_hex"
                      type="text"
                      value={formData.background_color || '#3C6CA8'}
                      onChange={(e) => handleChange('background_color', e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono text-xs font-semibold uppercase"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="bannereditmodal-custom-text-color-hex" className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Custom Text Color Hex
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.text_color || '#FFFFFF'}
                      onChange={(e) => handleChange('text_color', e.target.value)}
                      className="w-9 h-9 rounded-xl border border-slate-300 dark:border-slate-700 p-0.5 cursor-pointer bg-transparent"
                    />
                    <input
                      id="bannereditmodal-custom-text-color-hex"
                      name="custom_text_color_hex"
                      type="text"
                      value={formData.text_color || '#FFFFFF'}
                      onChange={(e) => handleChange('text_color', e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono text-xs font-semibold uppercase"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LINK & SCHEDULE */}
          {activeTab === 'schedule' && (
            <div className="space-y-5 animate-fadeIn">
              {/* Action Link / Destination */}
              <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-[#3C6CA8]" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Banner Click Destination (Optional)
                  </span>
                </div>
                <input
                  id="bannereditmodal-destination-url-handlechange-link-url-e-t"
                  name="destination_url_handlechange_link_url_e_t"
                  type="text"
                  value={formData.link_url || ''}
                  onChange={(e) => handleChange('link_url', e.target.value)}
                  placeholder="e.g. /coa or /calculator or /contact"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-medium focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none"
                />
                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={formData.link_open_new_tab || false}
                    onChange={(e) => handleChange('link_open_new_tab', e.target.checked)}
                    className="w-4 h-4 rounded text-[#3C6CA8] focus:ring-[#3C6CA8]"
                  />
                  <span className="text-xs text-slate-600 dark:text-slate-300">
                    Open destination link in a new browser tab
                  </span>
                </label>
              </div>

              {/* Automated Expiration / Schedule */}
              <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-500" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Automated Schedule / Expiration
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.schedule_enabled || false}
                    onChange={(e) => handleChange('schedule_enabled', e.target.checked)}
                    className="w-4 h-4 rounded text-[#3C6CA8]"
                  />
                </div>

                {formData.schedule_enabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="space-y-1">
                      <label htmlFor="bannereditmodal-start-date-time" className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">
                        Start Date &amp; Time
                      </label>
                      <input
                        id="bannereditmodal-start-date-time"
                        name="start_date_time"
                        type="datetime-local"
                        value={formData.schedule_start || ''}
                        onChange={(e) => handleChange('schedule_start', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-medium"
                      />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="bannereditmodal-end-expiration-date-time" className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">
                        End / Expiration Date &amp; Time
                      </label>
                      <input
                        id="bannereditmodal-end-expiration-date-time"
                        name="end_expiration_date_time"
                        type="datetime-local"
                        value={formData.schedule_end || ''}
                        onChange={(e) => handleChange('schedule_end', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-medium"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Modal Footer Controls */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-[#3C6CA8] hover:bg-[#315A8E] active:bg-[#264874] text-white text-xs font-black transition-all flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Live...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save &amp; Publish Banner</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BannerEditModal;
