import React, { useState, useEffect } from 'react';
import { Save, Loader2, ArrowLeft, Globe } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ImageUpload from './ImageUpload';

interface PageContentsManagerProps {
  onBack: () => void;
  adminEmail: string;
  adminRole: string;
}

const PAGES_LIST = [
  { id: 'announcement_bar', name: '📢 Announcement Bar' },
  { id: 'home', name: '🏠 Home Page Hero' },
  { id: 'about', name: 'ℹ️ About Us Page' },
  { id: 'contact', name: '📞 Contact Us Page' },
  { id: 'shipping_policy', name: '📦 Shipping & Delivery' },
  { id: 'privacy_policy', name: '🔒 Privacy Policy' },
  { id: 'terms_conditions', name: '⚖️ Terms & Conditions' },
  { id: 'faq', name: '❓ FAQ Header' },
  { id: 'footer', name: '🦶 Footer Content' },
  { id: 'header', name: '🔝 Header Configuration' }
];

export const PageContentsManager: React.FC<PageContentsManagerProps> = ({ onBack, adminEmail, adminRole }) => {
  const [selectedPage, setSelectedPage] = useState('home');
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPageContent();
  }, [selectedPage]);

  const loadPageContent = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('page_contents')
        .select('*')
        .eq('page_id', selectedPage)
        .maybeSingle();

      if (!error && data && data.content) {
        setFormData(data.content);
      } else {
        setFormData({});
      }
    } catch (err) {
      console.error('Error loading page content:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (key: string, val: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [key]: val
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);

      const { error } = await supabase
        .from('page_contents')
        .upsert({
          page_id: selectedPage,
          content: formData,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      // Log to audit trail
      try {
        await supabase.from('audit_logs').insert([{
          actor_email: adminEmail,
          actor_role: adminRole,
          action: 'UPDATE_PAGE_CONTENT',
          details: `Updated page content for page: ${selectedPage}`
        }]);
      } catch (logErr) {
        console.warn('Failed to save audit log:', logErr);
      }

      alert('Page content saved successfully! Changes are live.');
    } catch (err) {
      console.error('Error saving page content:', err);
      alert('Failed to save page contents.');
    } finally {
      setSaving(false);
    }
  };

  const renderFormFields = () => {
    switch (selectedPage) {
      case 'announcement_bar':
        return (
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-gray-900 border-b pb-2">Announcement Banner Settings</h4>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="announcement_active"
                checked={formData.announcement_active ?? true}
                onChange={(e) => handleFieldChange('announcement_active', e.target.checked)}
                className="w-4.5 h-4.5 rounded text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="announcement_active" className="text-sm font-semibold text-gray-700 cursor-pointer">
                Enable Announcement Bar on website
              </label>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Announcement Text</label>
              <input
                type="text"
                value={formData.announcement_text ?? ''}
                onChange={(e) => handleFieldChange('announcement_text', e.target.value)}
                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                placeholder="e.g. ⚡ FREE cold-chain shipping for Metro Manila orders over ₱5,000! ❄️"
              />
            </div>
          </div>
        );

      case 'home':
        return (
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-gray-900 border-b pb-2">Hero Section Content</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Badge Text</label>
                <input
                  type="text"
                  value={formData.hero_badge_text ?? ''}
                  onChange={(e) => handleFieldChange('hero_badge_text', e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Title Prefix</label>
                <input
                  type="text"
                  value={formData.hero_title_prefix ?? ''}
                  onChange={(e) => handleFieldChange('hero_title_prefix', e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Title Highlight (Accent color)</label>
                <input
                  type="text"
                  value={formData.hero_title_highlight ?? ''}
                  onChange={(e) => handleFieldChange('hero_title_highlight', e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Title Suffix</label>
                <input
                  type="text"
                  value={formData.hero_title_suffix ?? ''}
                  onChange={(e) => handleFieldChange('hero_title_suffix', e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Headline Subtext</label>
                <input
                  type="text"
                  value={formData.hero_subtext ?? ''}
                  onChange={(e) => handleFieldChange('hero_subtext', e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Main Description Paragraph</label>
              <textarea
                rows={3}
                value={formData.hero_description ?? ''}
                onChange={(e) => handleFieldChange('hero_description', e.target.value)}
                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Secondary Tagline</label>
              <input
                type="text"
                value={formData.hero_tagline ?? ''}
                onChange={(e) => handleFieldChange('hero_tagline', e.target.value)}
                className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
          </div>
        );

      case 'about':
      case 'shipping_policy':
      case 'privacy_policy':
      case 'terms_conditions':
        return (
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-gray-900 border-b pb-2">Page Main Content</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Page Title Heading</label>
                <input
                  type="text"
                  value={formData.title ?? ''}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold"
                />
              </div>
              {selectedPage === 'about' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Page Subtitle</label>
                  <input
                    type="text"
                    value={formData.subtitle ?? ''}
                    onChange={(e) => handleFieldChange('subtitle', e.target.value)}
                    className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Body Text Content (supports line breaks)</label>
              <textarea
                rows={10}
                value={formData.content ?? ''}
                onChange={(e) => handleFieldChange('content', e.target.value)}
                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono whitespace-pre-wrap"
              />
            </div>

            {selectedPage === 'about' && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">About Us Image (Banner)</label>
                <ImageUpload
                  currentImage={formData.banner_url}
                  onImageChange={(url) => handleFieldChange('banner_url', url || '')}
                  folder="page-banners"
                />
              </div>
            )}
          </div>
        );

      case 'contact':
        return (
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-gray-900 border-b pb-2">Contact Page Content</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Title Heading</label>
                <input
                  type="text"
                  value={formData.title ?? ''}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Subtitle</label>
                <input
                  type="text"
                  value={formData.subtitle ?? ''}
                  onChange={(e) => handleFieldChange('subtitle', e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Introductory Text Paragraph</label>
              <textarea
                rows={3}
                value={formData.content ?? ''}
                onChange={(e) => handleFieldChange('content', e.target.value)}
                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Support Email</label>
                <input
                  type="email"
                  value={formData.email ?? ''}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Phone Number Display</label>
                <input
                  type="text"
                  value={formData.phone ?? ''}
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">WhatsApp API Number</label>
                <input
                  type="text"
                  value={formData.whatsapp ?? ''}
                  onChange={(e) => handleFieldChange('whatsapp', e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  placeholder="e.g. +639778132630"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Working Hours Description</label>
                <input
                  type="text"
                  value={formData.hours ?? ''}
                  onChange={(e) => handleFieldChange('hours', e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Telegram Community Group Link</label>
                <input
                  type="url"
                  value={formData.telegram_group ?? ''}
                  onChange={(e) => handleFieldChange('telegram_group', e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>
            </div>
          </div>
        );

      case 'faq':
        return (
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-gray-900 border-b pb-2">FAQ Header Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">FAQ Page Main Title</label>
                <input
                  type="text"
                  value={formData.title ?? ''}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">FAQ Page Subtitle</label>
                <input
                  type="text"
                  value={formData.subtitle ?? ''}
                  onChange={(e) => handleFieldChange('subtitle', e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>
            </div>
          </div>
        );

      case 'footer':
        return (
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-gray-900 border-b pb-2">Footer Static Texts</h4>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Footer About Description (short)</label>
              <textarea
                rows={2}
                value={formData.about_text ?? ''}
                onChange={(e) => handleFieldChange('about_text', e.target.value)}
                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Copyright Line</label>
              <input
                type="text"
                value={formData.copyright ?? ''}
                onChange={(e) => handleFieldChange('copyright', e.target.value)}
                className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
          </div>
        );

      case 'header':
        return (
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-gray-900 border-b pb-2">Header Configuration</h4>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Logo Text Brand</label>
              <input
                type="text"
                value={formData.logo_text ?? ''}
                onChange={(e) => handleFieldChange('logo_text', e.target.value)}
                className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-soft p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b pb-4 mb-6 gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="text-gray-500 hover:text-blue-600 transition-colors flex items-center gap-1 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-xs font-medium">Dashboard</span>
          </button>
          <span className="text-gray-300">/</span>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
            <Globe className="w-5 h-5 text-blue-600" />
            Page Contents Manager
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar select page */}
        <div className="lg:col-span-1 space-y-1.5 bg-gray-50/50 dark:bg-slate-950/20 p-3 rounded-2xl border border-gray-100 dark:border-slate-800/80">
          <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-2">Select Page</span>
          {PAGES_LIST.map((page) => (
            <button
              key={page.id}
              onClick={() => setSelectedPage(page.id)}
              className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
                selectedPage === page.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                  : 'text-gray-650 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {page.name}
            </button>
          ))}
        </div>

        {/* Form container */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="h-60 flex items-center justify-center text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              <span>Fetching Content...</span>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6">
              {renderFormFields()}

              {/* SEO metadata section (for main content pages) */}
              {['home', 'about', 'contact', 'shipping_policy', 'privacy_policy', 'terms_conditions', 'faq'].includes(selectedPage) && (
                <div className="bg-gray-55/30 dark:bg-slate-950/20 border border-gray-100 dark:border-slate-850 p-4 rounded-2xl space-y-4">
                  <h4 className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                    <Globe className="w-4 h-4 text-blue-500" />
                    SEO Search Engine Optimization
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Meta Title</label>
                      <input
                        type="text"
                        value={formData.seo_title ?? ''}
                        onChange={(e) => handleFieldChange('seo_title', e.target.value)}
                        className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        placeholder="Page title displayed in search engines"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Meta Description</label>
                      <input
                        type="text"
                        value={formData.seo_description ?? ''}
                        onChange={(e) => handleFieldChange('seo_description', e.target.value)}
                        className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        placeholder="Search snippet page summary"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={loadPageContent}
                  disabled={saving}
                  className="px-4 py-2.5 border rounded-xl text-xs font-bold hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Discard Changes
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/10 transition-all hover:-translate-y-0.5"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Page Contents</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
