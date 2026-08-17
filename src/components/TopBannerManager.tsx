import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  Save,
  Loader2,
  Sparkles,
  Eye,
  Palette,
  Link as LinkIcon,
  Clock,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  MoveHorizontal,
  Flame,
  Zap,
  Info,
  Check,
  ChevronRight,
  ExternalLink,
  ArrowLeft
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

interface TopBannerManagerProps {
  onBack?: () => void;
  adminEmail?: string;
  adminRole?: string;
}

const PRESET_COLORS = [
  { name: 'Brand Blue', value: '#3C6CA8', text: '#FFFFFF', border: '#2A4E7A' },
  { name: 'Royal Navy', value: '#1E3A8A', text: '#FFFFFF', border: '#172554' },
  { name: 'Deep Indigo', value: '#312E81', text: '#FFFFFF', border: '#1E1B4B' },
  { name: 'Emerald High Purity', value: '#059669', text: '#FFFFFF', border: '#065F46' },
  { name: 'Amber Gold Flash', value: '#D97706', text: '#FFFFFF', border: '#92400E' },
  { name: 'Crimson Alert', value: '#DC2626', text: '#FFFFFF', border: '#991B1B' },
  { name: 'Dark Carbon', value: '#0F172A', text: '#F8FAFC', border: '#020617' },
  { name: 'Purple Biotech', value: '#7C3AED', text: '#FFFFFF', border: '#5B21B6' }
];

const PRESET_MESSAGES = [
  {
    category: 'Shipping & Logistics',
    label: 'Cold-Chain Free Shipping',
    text: '⚡ FREE cold-chain shipping for Metro Manila orders over ₱5,000! ❄️',
    color: '#3C6CA8'
  },
  {
    category: 'Shipping & Logistics',
    label: 'Nationwide Express Delivery',
    text: '📦 Same-day dispatch for Luzon, Visayas & Mindanao cold-chain parcels 🚚',
    color: '#059669'
  },
  {
    category: 'Promotions & Discounts',
    label: 'Bundle Flash Discount',
    text: '🔥 Save up to 15% OFF with multi-vial peptide bundle tiers today only! 🎯',
    color: '#D97706'
  },
  {
    category: 'Quality & Verification',
    label: 'Third-Party Lab Tested',
    text: '🔬 100% Third-Party HPLC Lab Verified: >99% Purity Guaranteed. View COAs 📄',
    color: '#1E3A8A'
  },
  {
    category: 'Urgent Notices',
    label: 'Stock Restock Notice',
    text: '⚠️ Fresh batch restocked! Limited quantities available for fast-acting peptides ⚡',
    color: '#DC2626'
  }
];

export const TopBannerManager: React.FC<TopBannerManagerProps> = ({
  onBack,
  adminEmail = 'admin@slimdose.ph',
  adminRole = 'admin'
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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'appearance' | 'schedule'>('content');

  // Load existing banner data from Supabase
  useEffect(() => {
    loadBannerData();
  }, []);

  const loadBannerData = async () => {
    try {
      setLoading(true);

      // Check localStorage first
      try {
        const cached = localStorage.getItem('slimdose_banner_settings');
        if (cached) {
          const parsed = JSON.parse(cached);
          setFormData(prev => ({ ...prev, ...parsed }));
        }
      } catch {}

      const { data, error } = await supabase
        .from('page_contents')
        .select('page_id, content')
        .in('page_id', ['announcement_bar', 'header']);

      let foundContent: any = null;
      if (!error && data && data.length > 0) {
        const barItem = data.find(d => d.page_id === 'announcement_bar' && d.content && (d.content.announcement_text !== undefined || d.content.background_color !== undefined));
        const headerItem = data.find(d => d.page_id === 'header' && d.content && (d.content.announcement_text !== undefined || d.content.background_color !== undefined));
        foundContent = barItem?.content || headerItem?.content || data[0]?.content;
      }

      // Also check site_settings
      const { data: siteSettingsData } = await supabase
        .from('site_settings')
        .select('*')
        .in('id', ['announcement_text', 'announcement_active', 'announcement_bg_color', 'announcement_text_color', 'announcement_style', 'announcement_link_url']);

      if (siteSettingsData && siteSettingsData.length > 0) {
        const textSetting = siteSettingsData.find(s => s.id === 'announcement_text')?.value;
        const activeSetting = siteSettingsData.find(s => s.id === 'announcement_active')?.value;
        const bgSetting = siteSettingsData.find(s => s.id === 'announcement_bg_color')?.value;
        const textColSetting = siteSettingsData.find(s => s.id === 'announcement_text_color')?.value;
        const styleSetting = siteSettingsData.find(s => s.id === 'announcement_style')?.value;
        const linkSetting = siteSettingsData.find(s => s.id === 'announcement_link_url')?.value;

        foundContent = {
          announcement_text: foundContent?.announcement_text ?? (textSetting !== undefined && textSetting !== '' ? textSetting : undefined),
          announcement_active: foundContent?.announcement_active ?? (activeSetting !== undefined ? activeSetting === 'true' || activeSetting === true : undefined),
          background_color: foundContent?.background_color || bgSetting,
          text_color: foundContent?.text_color || textColSetting,
          display_style: foundContent?.display_style || styleSetting,
          link_url: foundContent?.link_url ?? linkSetting,
          link_open_new_tab: foundContent?.link_open_new_tab,
          schedule_enabled: foundContent?.schedule_enabled,
          schedule_start: foundContent?.schedule_start,
          schedule_end: foundContent?.schedule_end
        };
      }

      if (foundContent) {
        setFormData(prev => {
          const updated = {
            ...prev,
            announcement_text: foundContent.announcement_text !== undefined ? foundContent.announcement_text : prev.announcement_text,
            announcement_active: foundContent.announcement_active !== undefined ? (foundContent.announcement_active === true || foundContent.announcement_active === 'true') : prev.announcement_active,
            background_color: foundContent.background_color || prev.background_color,
            text_color: foundContent.text_color || prev.text_color,
            display_style: foundContent.display_style || prev.display_style,
            link_url: foundContent.link_url !== undefined ? foundContent.link_url : '',
            link_open_new_tab: foundContent.link_open_new_tab ?? false,
            schedule_enabled: foundContent.schedule_enabled ?? false,
            schedule_start: foundContent.schedule_start || '',
            schedule_end: foundContent.schedule_end || ''
          };
          try {
            localStorage.setItem('slimdose_banner_settings', JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }
    } catch (err) {
      console.warn('Error loading top banner content:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof BannerData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleApplyPreset = (preset: typeof PRESET_MESSAGES[0]) => {
    setFormData(prev => ({
      ...prev,
      announcement_text: preset.text,
      background_color: preset.color
    }));
    fireToast('Preset message applied to draft! 🎯', 'info');
  };

  const handleResetToDefault = () => {
    setFormData({
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
    fireToast('Reset to SlimDose default banner settings.', 'info');
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);

    try {
      // 1. Save to page_contents for 'announcement_bar'
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

      // 2. Mirror to site_settings
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
        console.warn('site_settings sync warning:', siteErr);
      }

      // 3. Cache locally
      try {
        localStorage.setItem('slimdose_banner_settings', JSON.stringify(formData));
      } catch {}

      // 4. Log Audit Trail
      try {
        await supabase.from('audit_logs').insert([{
          actor_email: adminEmail,
          actor_role: adminRole,
          action: 'UPDATE_TOP_BANNER',
          details: `Updated top announcement banner: "${formData.announcement_text.substring(0, 60)}..." (Active: ${formData.announcement_active}, Style: ${formData.display_style})`
        }]);
      } catch (logErr) {
        console.warn('Audit log error:', logErr);
      }

      // 5. Broadcast instant live sync to active windows/storefront
      window.dispatchEvent(new CustomEvent('headerAnnouncementUpdated', {
        detail: formData
      }));

      fireToast('Top Header Banner published and live! 🚀', 'success');
    } catch (err: any) {
      console.error('Error saving top banner:', err);
      fireToast('Failed to save banner settings. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-[#3C6CA8] mb-2" />
        <span className="ml-3 text-sm font-semibold">Loading Banner Configuration...</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-12 animate-fadeIn">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3.5">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="w-11 h-11 rounded-2xl bg-[#3C6CA8]/10 dark:bg-[#3C6CA8]/20 text-[#3C6CA8] dark:text-blue-400 flex items-center justify-center border border-[#3C6CA8]/20 shadow-xs">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
                Top Header Banner Manager
              </h1>
              <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#3C6CA8] dark:text-blue-400 border border-blue-200 dark:border-blue-900">
                Live Storefront
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Customize text, visibility, visual colors, animations, click routing, and schedules.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#3C6CA8] to-blue-600 hover:from-[#315A8E] hover:to-blue-700 active:scale-95 text-white text-xs font-black transition-all flex items-center gap-2 shadow-md shadow-blue-600/20 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Live...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save &amp; Publish Banner</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Interactive Storefront Live Preview */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-amber-500" />
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Live Storefront Preview
            </h2>
          </div>
          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
            formData.announcement_active
              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
          }`}>
            {formData.announcement_active ? '● Banner Visible to Visitors' : '○ Banner Disabled / Hidden'}
          </span>
        </div>

        {/* Mock Browser Header Frame */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-950/5 dark:bg-slate-950/40">
          <div className="bg-slate-100 dark:bg-slate-950 px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            </div>
            <div className="flex-1 max-w-sm mx-auto bg-white dark:bg-slate-900 px-3 py-1 rounded-lg text-[10px] text-slate-400 text-center font-mono border border-slate-200/60 dark:border-slate-800">
              https://slimdose.ph
            </div>
          </div>

          {/* Actual Rendered Banner in Preview */}
          <div
            className="w-full transition-all duration-300 relative flex items-center justify-center"
            style={{
              backgroundColor: formData.background_color || '#3C6CA8',
              minHeight: '40px',
              padding: '8px 16px'
            }}
          >
            {formData.display_style === 'marquee' ? (
              <div className="announcement-marquee flex items-center justify-center">
                {formData.link_url ? (
                  <a
                    href={formData.link_url}
                    target={formData.link_open_new_tab ? '_blank' : '_self'}
                    rel="noopener noreferrer"
                    className="text-xs sm:text-sm font-medium tracking-wide whitespace-nowrap hover:underline flex items-center gap-1.5"
                    style={{ color: formData.text_color || '#FFFFFF' }}
                  >
                    <span>{formData.announcement_text || '(Empty Announcement Text)'}</span>
                    <ExternalLink className="w-3 h-3 opacity-70" />
                  </a>
                ) : (
                  <span
                    className="text-xs sm:text-sm font-medium tracking-wide whitespace-nowrap"
                    style={{ color: formData.text_color || '#FFFFFF' }}
                  >
                    {formData.announcement_text || '(Empty Announcement Text)'}
                  </span>
                )}
              </div>
            ) : formData.display_style === 'pulse' ? (
              <div className="flex items-center justify-center animate-pulse text-center">
                {formData.link_url ? (
                  <a
                    href={formData.link_url}
                    target={formData.link_open_new_tab ? '_blank' : '_self'}
                    rel="noopener noreferrer"
                    className="text-xs sm:text-sm font-bold tracking-wide hover:underline flex items-center gap-1.5"
                    style={{ color: formData.text_color || '#FFFFFF' }}
                  >
                    <span>{formData.announcement_text || '(Empty Announcement Text)'}</span>
                    <ExternalLink className="w-3 h-3 opacity-70" />
                  </a>
                ) : (
                  <span
                    className="text-xs sm:text-sm font-bold tracking-wide"
                    style={{ color: formData.text_color || '#FFFFFF' }}
                  >
                    {formData.announcement_text || '(Empty Announcement Text)'}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center text-center">
                {formData.link_url ? (
                  <a
                    href={formData.link_url}
                    target={formData.link_open_new_tab ? '_blank' : '_self'}
                    rel="noopener noreferrer"
                    className="text-xs sm:text-sm font-medium tracking-wide hover:underline flex items-center gap-1.5"
                    style={{ color: formData.text_color || '#FFFFFF' }}
                  >
                    <span>{formData.announcement_text || '(Empty Announcement Text)'}</span>
                    <ExternalLink className="w-3 h-3 opacity-70" />
                  </a>
                ) : (
                  <span
                    className="text-xs sm:text-sm font-medium tracking-wide"
                    style={{ color: formData.text_color || '#FFFFFF' }}
                  >
                    {formData.announcement_text || '(Empty Announcement Text)'}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Tabbed Editor Box */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 bg-slate-50/50 dark:bg-slate-950/30 gap-2 overflow-x-auto">
          {[
            { id: 'content', label: '1. Message & Presets', icon: Megaphone },
            { id: 'appearance', label: '2. Colors & Display Style', icon: Palette },
            { id: 'schedule', label: '3. Link Destination & Schedule', icon: Clock }
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  active
                    ? 'border-[#3C6CA8] text-[#3C6CA8] dark:text-blue-400 bg-white dark:bg-slate-900 -mb-[1px]'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-6">
          {/* TAB 1: CONTENT & PRESETS */}
          {activeTab === 'content' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Visibility Switch */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Announcement Banner Visibility
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Toggle this on to show the announcement bar at the very top of all store pages.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.announcement_active}
                    onChange={(e) => handleChange('announcement_active', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3C6CA8]" />
                </label>
              </div>

              {/* Text Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="topbanner-announcement-message" className="text-xs font-black text-slate-800 dark:text-slate-200">
                    Announcement Headline Message
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {formData.announcement_text.length} characters
                  </span>
                </div>
                <textarea
                  id="topbanner-announcement-message"
                  name="announcement_message"
                  rows={2}
                  value={formData.announcement_text}
                  onChange={(e) => handleChange('announcement_text', e.target.value)}
                  placeholder="e.g. ⚡ FREE cold-chain shipping for Metro Manila orders over ₱5,000! ❄️"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none transition-all resize-none"
                />
              </div>

              {/* 1-Click Message Presets */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                    Quick-Apply Announcement Presets
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {PRESET_MESSAGES.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 hover:border-[#3C6CA8] hover:shadow-xs transition-all text-left flex items-start gap-3 cursor-pointer group"
                    >
                      <div
                        className="w-3.5 h-3.5 rounded-full shrink-0 mt-0.5 shadow-xs"
                        style={{ backgroundColor: preset.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-800 dark:text-slate-200 group-hover:text-[#3C6CA8] transition-colors">
                            {preset.label}
                          </span>
                          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">
                            {preset.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                          {preset.text}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: APPEARANCE & STYLING */}
          {activeTab === 'appearance' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Display Animation Style */}
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-800 dark:text-slate-200 block">
                  Motion &amp; Display Animation Style
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      id: 'marquee',
                      name: 'Marquee Scrolling',
                      desc: 'Continuous smooth ticker animation. Best for long notices.',
                      icon: MoveHorizontal
                    },
                    {
                      id: 'static',
                      name: 'Static Centered',
                      desc: 'Clean, stationary centered text. Best for concise headlines.',
                      icon: CheckCircle2
                    },
                    {
                      id: 'pulse',
                      name: 'Pulse Alert Effect',
                      desc: 'Subtle attention-grabbing pulsing animation. Best for urgent flash sales.',
                      icon: Flame
                    }
                  ].map(style => {
                    const Icon = style.icon;
                    const selected = (formData.display_style || 'marquee') === style.id;
                    return (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => handleChange('display_style', style.id)}
                        className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          selected
                            ? 'border-[#3C6CA8] bg-blue-50/60 dark:bg-blue-950/30 ring-2 ring-[#3C6CA8]/20'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Icon className={`w-5 h-5 ${selected ? 'text-[#3C6CA8]' : 'text-slate-400'}`} />
                          {selected && (
                            <span className="w-2 h-2 rounded-full bg-[#3C6CA8]" />
                          )}
                        </div>
                        <div>
                          <span className={`text-xs font-extrabold block ${selected ? 'text-[#3C6CA8] dark:text-blue-400' : 'text-slate-800 dark:text-slate-200'}`}>
                            {style.name}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block leading-tight">
                            {style.desc}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Preset Palette */}
              <div className="space-y-3 pt-2">
                <label className="text-xs font-black text-slate-800 dark:text-slate-200 block">
                  Curated Brand Theme Palettes
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {PRESET_COLORS.map(c => {
                    const isCurrent = formData.background_color?.toLowerCase() === c.value.toLowerCase();
                    return (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => {
                          handleChange('background_color', c.value);
                          handleChange('text_color', c.text);
                        }}
                        className={`p-2.5 rounded-xl border transition-all flex items-center gap-2.5 cursor-pointer text-left ${
                          isCurrent
                            ? 'border-slate-900 dark:border-white shadow-xs scale-[1.02]'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-400'
                        }`}
                      >
                        <div
                          className="w-6 h-6 rounded-lg shrink-0 border border-black/10 shadow-xs flex items-center justify-center"
                          style={{ backgroundColor: c.value }}
                        >
                          {isCurrent && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {c.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Hex Color Pickers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <div className="space-y-1.5">
                  <label htmlFor="topbanner-bg-color-hex" className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Custom Background Color (Hex)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.background_color || '#3C6CA8'}
                      onChange={(e) => handleChange('background_color', e.target.value)}
                      className="w-10 h-10 rounded-xl border border-slate-300 dark:border-slate-700 p-0.5 cursor-pointer bg-transparent"
                    />
                    <input
                      id="topbanner-bg-color-hex"
                      name="background_color_hex"
                      type="text"
                      value={formData.background_color || '#3C6CA8'}
                      onChange={(e) => handleChange('background_color', e.target.value)}
                      className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono text-xs font-bold uppercase text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="topbanner-text-color-hex" className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Custom Text Color (Hex)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.text_color || '#FFFFFF'}
                      onChange={(e) => handleChange('text_color', e.target.value)}
                      className="w-10 h-10 rounded-xl border border-slate-300 dark:border-slate-700 p-0.5 cursor-pointer bg-transparent"
                    />
                    <input
                      id="topbanner-text-color-hex"
                      name="text_color_hex"
                      type="text"
                      value={formData.text_color || '#FFFFFF'}
                      onChange={(e) => handleChange('text_color', e.target.value)}
                      className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono text-xs font-bold uppercase text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LINK & SCHEDULE */}
          {activeTab === 'schedule' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Click Destination URL */}
              <div className="space-y-3 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-[#3C6CA8]" />
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                    Banner Click Destination (Optional)
                  </span>
                </div>
                <input
                  id="topbanner-destination-url"
                  name="destination_url"
                  type="text"
                  value={formData.link_url || ''}
                  onChange={(e) => handleChange('link_url', e.target.value)}
                  placeholder="e.g. /coa or /calculator or /faq or https://external-link.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-medium focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none"
                />
                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={formData.link_open_new_tab || false}
                    onChange={(e) => handleChange('link_open_new_tab', e.target.checked)}
                    className="w-4 h-4 rounded text-[#3C6CA8] focus:ring-[#3C6CA8]"
                  />
                  <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    Open destination link in a new browser tab
                  </span>
                </label>
              </div>

              {/* Automated Schedule & Expiration */}
              <div className="space-y-3 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-500" />
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                      Automated Campaign Schedule &amp; Expiration
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.schedule_enabled || false}
                      onChange={(e) => handleChange('schedule_enabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600" />
                  </label>
                </div>

                {formData.schedule_enabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 animate-fadeIn">
                    <div className="space-y-1.5">
                      <label htmlFor="topbanner-start-date-time" className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">
                        Start Date &amp; Time
                      </label>
                      <input
                        id="topbanner-start-date-time"
                        name="start_date_time"
                        type="datetime-local"
                        value={formData.schedule_start || ''}
                        onChange={(e) => handleChange('schedule_start', e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-medium text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="topbanner-end-expiration-time" className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">
                        End / Expiration Date &amp; Time
                      </label>
                      <input
                        id="topbanner-end-expiration-time"
                        name="end_expiration_time"
                        type="datetime-local"
                        value={formData.schedule_end || ''}
                        onChange={(e) => handleChange('schedule_end', e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-medium text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bottom Action Footer */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={handleResetToDefault}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
            >
              Discard Changes
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-7 py-3 rounded-xl bg-gradient-to-r from-[#3C6CA8] to-blue-600 hover:from-[#315A8E] hover:to-blue-700 text-white text-xs font-black transition-all flex items-center gap-2 shadow-md shadow-blue-600/20 cursor-pointer disabled:opacity-50 active:scale-95"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Live...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save &amp; Publish Top Banner</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TopBannerManager;
