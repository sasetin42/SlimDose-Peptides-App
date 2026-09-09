import React, { useState } from 'react';
import {
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  Trash2,
  Sparkles,
  Palette,
  Type,
  Maximize2,
  Smartphone,
  Mail,
  FileText,
  Shield,
  Sun,
  Moon,
} from 'lucide-react';
import { SiteSettings } from '../../types';

interface BrandingSettingsSectionProps {
  formData: Partial<SiteSettings>;
  onChange: (updates: Partial<SiteSettings>) => void;
  onUploadLogo: (field: keyof SiteSettings, file: File) => Promise<void>;
}

export const BrandingSettingsSection: React.FC<BrandingSettingsSectionProps> = ({
  formData,
  onChange,
  onUploadLogo,
}) => {
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);

  const handleFileSelected = async (field: keyof SiteSettings, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingSlot(field as string);
      await onUploadLogo(field, file);
    } finally {
      setUploadingSlot(null);
    }
  };

  const logoVariants = [
    {
      key: 'site_logo' as keyof SiteSettings,
      title: 'Main Brand Logo',
      desc: 'Default primary logo used in desktop navigation and main header.',
      icon: Sun,
      dim: 'Recommended: 240 × 60px (PNG or SVG, transparent background)',
      current: formData.site_logo || '/assets/logo.jpeg',
    },
    {
      key: 'site_dark_logo' as keyof SiteSettings,
      title: 'Dark Mode Variant Logo',
      desc: 'Optimized high-contrast logo displayed when dark theme is enabled.',
      icon: Moon,
      dim: 'Recommended: 240 × 60px (Light lettering on transparent)',
      current: formData.site_dark_logo || formData.site_logo || '/assets/logo.jpeg',
    },
    {
      key: 'site_light_logo' as keyof SiteSettings,
      title: 'Light Mode Variant Logo',
      desc: 'Optimized dark lettering logo displayed on solid light backgrounds.',
      icon: Sun,
      dim: 'Recommended: 240 × 60px (Dark lettering on transparent)',
      current: formData.site_light_logo || formData.site_logo || '/assets/logo.jpeg',
    },
    {
      key: 'site_mobile_logo' as keyof SiteSettings,
      title: 'Mobile Header Icon / Compact Logo',
      desc: 'Compact emblem or symbol for mobile top navigation bars.',
      icon: Smartphone,
      dim: 'Recommended: 48 × 48px square emblem',
      current: formData.site_mobile_logo || formData.site_logo || '/assets/logo.jpeg',
    },
    {
      key: 'site_favicon_url' as keyof SiteSettings,
      title: 'Browser Favicon / App Icon',
      desc: 'Square icon displayed in browser tabs and home screen bookmarks.',
      icon: GlobeIcon,
      dim: 'Recommended: 32 × 32px or 64 × 64px .ico / .png',
      current: formData.site_favicon_url || '/favicon.ico',
    },
    {
      key: 'site_admin_logo' as keyof SiteSettings,
      title: 'Admin & Invoice Header Logo',
      desc: 'High-res vector or clean bitmap used on receipts and admin portal.',
      icon: FileText,
      dim: 'Square or Wide: 180 × 50px',
      current: formData.site_admin_logo || formData.site_logo || '/assets/logo.jpeg',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Overview Banner */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#3C6CA8]/10 flex items-center justify-center text-[#3C6CA8]">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                Branding & Multi-Variant Logos
              </h2>
              <p className="text-xs text-slate-400">
                Manage all responsive and specialized brand assets across the site, emails, and PDFs.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-blue-50 text-[#3C6CA8]">
            6 Variant Slots
          </span>
        </div>

        {/* Logo Variants Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {logoVariants.map((item) => (
            <div
              key={item.key}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <item.icon className="w-4 h-4 text-[#3C6CA8]" />
                    <h3 className="text-xs font-bold text-slate-900">{item.title}</h3>
                  </div>
                  {formData[item.key] && (
                    <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Set
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">{item.desc}</p>
                <div className="text-[10px] font-mono text-slate-400 mt-1">{item.dim}</div>
              </div>

              {/* Preview & Upload Bar */}
              <div className="flex items-center gap-3 pt-2 border-t border-slate-200">
                <div className="w-14 h-14 rounded-lg bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                  <img
                    src={item.current}
                    alt={item.title}
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-xs">
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    <span>{uploadingSlot === item.key ? 'Uploading...' : 'Upload Image'}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp,image/x-icon"
                      onChange={(e) => handleFileSelected(item.key, e)}
                      disabled={uploadingSlot === item.key}
                      className="hidden"
                    />
                  </label>

                  {formData[item.key] && (
                    <button
                      type="button"
                      onClick={() => onChange({ [item.key]: '' })}
                      className="ml-2 text-rose-500 hover:text-rose-700 p-1.5 text-xs transition"
                      title="Reset to default"
                    >
                      <Trash2 className="w-3.5 h-3.5 inline" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Brand Color Theme Palette */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <Palette className="w-4 h-4 text-[#3C6CA8]" />
            <h3 className="text-sm font-bold text-slate-900">Brand Color Palette (HEX Design Tokens)</h3>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Live CSS Variables</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Primary Brand Accent</label>
            <div className="flex items-center gap-2.5">
              <input
                type="color"
                value={formData.primary_brand_color || '#3C6CA8'}
                onChange={(e) => onChange({ primary_brand_color: e.target.value })}
                className="w-10 h-10 rounded-xl border border-slate-300 p-0.5 cursor-pointer"
              />
              <input
                type="text"
                value={formData.primary_brand_color || '#3C6CA8'}
                onChange={(e) => onChange({ primary_brand_color: e.target.value })}
                className="flex-1 px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 bg-white uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Secondary Accent Color</label>
            <div className="flex items-center gap-2.5">
              <input
                type="color"
                value={formData.secondary_brand_color || '#10B981'}
                onChange={(e) => onChange({ secondary_brand_color: e.target.value })}
                className="w-10 h-10 rounded-xl border border-slate-300 p-0.5 cursor-pointer"
              />
              <input
                type="text"
                value={formData.secondary_brand_color || '#10B981'}
                onChange={(e) => onChange({ secondary_brand_color: e.target.value })}
                className="flex-1 px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 bg-white uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Dark Neutral Tone</label>
            <div className="flex items-center gap-2.5">
              <input
                type="color"
                value={formData.neutral_brand_color || '#0F172A'}
                onChange={(e) => onChange({ neutral_brand_color: e.target.value })}
                className="w-10 h-10 rounded-xl border border-slate-300 p-0.5 cursor-pointer"
              />
              <input
                type="text"
                value={formData.neutral_brand_color || '#0F172A'}
                onChange={(e) => onChange({ neutral_brand_color: e.target.value })}
                className="flex-1 px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 bg-white uppercase"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Typography Configuration */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <Type className="w-4 h-4 text-[#3C6CA8]" />
            <h3 className="text-sm font-bold text-slate-900">Typography Font Family</h3>
          </div>
          <span className="text-[10px] text-slate-400">Web Safe & Google Fonts</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Headings Font Family</label>
            <select
              value={formData.font_family_headings || 'Plus Jakarta Sans'}
              onChange={(e) => onChange({ font_family_headings: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 bg-white outline-none focus:ring-2 focus:ring-[#3C6CA8]/30"
            >
              <option value="Plus Jakarta Sans">Plus Jakarta Sans (Default / Modern Clean)</option>
              <option value="Inter">Inter (SaaS Standard)</option>
              <option value="Outfit">Outfit (Tech Rounded)</option>
              <option value="Montserrat">Montserrat (Geometric Elegance)</option>
              <option value="Playfair Display">Playfair Display (Luxury Editorial)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Body Copy Font Family</label>
            <select
              value={formData.font_family_body || 'Inter'}
              onChange={(e) => onChange({ font_family_body: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 bg-white outline-none focus:ring-2 focus:ring-[#3C6CA8]/30"
            >
              <option value="Inter">Inter (Ultra-legible Body)</option>
              <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
              <option value="Roboto">Roboto</option>
              <option value="Open Sans">Open Sans</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

function GlobeIcon(props: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  );
}
