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
  { id: 'header', name: '🔝 Header Configuration' },
  { id: 'community', name: '💬 Community & Telegram Link' }
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

      // Also sync community telegram url to site_settings if editing community or contact
      if (formData.telegram_group || formData.community_telegram_url) {
        const linkToSave = formData.community_telegram_url || formData.telegram_group;
        try {
          await supabase.from('site_settings').upsert([
            { id: 'community_telegram_url', value: linkToSave, type: 'string', updated_at: new Date().toISOString() }
          ]);
        } catch {}
      }

      if (formData.support_telegram_url) {
        try {
          await supabase.from('site_settings').upsert([
            { id: 'support_telegram_url', value: formData.support_telegram_url, type: 'string', updated_at: new Date().toISOString() }
          ]);
        } catch {}
      }

      // Sync announcement bar if editing announcement_bar or header
      if (selectedPage === 'announcement_bar' || selectedPage === 'header') {
        try {
          const alternatePage = selectedPage === 'announcement_bar' ? 'header' : 'announcement_bar';
          await supabase.from('page_contents').upsert({
            page_id: alternatePage,
            content: formData,
            updated_at: new Date().toISOString()
          });

          // Mirror to site_settings
          await supabase.from('site_settings').upsert([
            { id: 'announcement_text', value: formData.announcement_text || '', type: 'string', updated_at: new Date().toISOString() },
            { id: 'announcement_active', value: String(formData.announcement_active !== false), type: 'boolean', updated_at: new Date().toISOString() },
            { id: 'announcement_bg_color', value: formData.background_color || '#3C6CA8', type: 'string', updated_at: new Date().toISOString() },
            { id: 'announcement_text_color', value: formData.text_color || '#FFFFFF', type: 'string', updated_at: new Date().toISOString() },
            { id: 'announcement_style', value: formData.display_style || 'marquee', type: 'string', updated_at: new Date().toISOString() }
          ]);

          window.dispatchEvent(new CustomEvent('headerAnnouncementUpdated', { detail: formData }));
        } catch (annErr) {
          console.warn('Failed to sync announcement settings:', annErr);
        }
      }

      // Sync all contact fields if editing contact page
      if (selectedPage === 'contact') {
        try {
          const syncUpdates: { id: string; value: string; type: string; updated_at: string }[] = [];
          if (formData.content) syncUpdates.push({ id: 'contact_inquiry_text', value: formData.content, type: 'string', updated_at: new Date().toISOString() });
          if (formData.email) syncUpdates.push({ id: 'support_email', value: formData.email, type: 'string', updated_at: new Date().toISOString() });
          if (formData.phone) syncUpdates.push({ id: 'support_phone', value: formData.phone, type: 'string', updated_at: new Date().toISOString() });
          if (formData.phone) syncUpdates.push({ id: 'contact_phone', value: formData.phone, type: 'string', updated_at: new Date().toISOString() });
          if (formData.whatsapp) syncUpdates.push({ id: 'contact_whatsapp', value: formData.whatsapp, type: 'string', updated_at: new Date().toISOString() });
          if (formData.hours) syncUpdates.push({ id: 'operating_hours', value: formData.hours, type: 'string', updated_at: new Date().toISOString() });
          
          if (syncUpdates.length > 0) {
            await supabase.from('site_settings').upsert(syncUpdates);
          }
        } catch (syncErr) {
          console.warn('Failed to sync contact settings:', syncErr);
        }
      }

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
              <label htmlFor="pagecontentsmanager-announcement-text" className="block text-xs font-semibold text-gray-600 mb-1">Announcement Text</label>
              <input id="pagecontentsmanager-announcement-text" name="announcement_text" type="text"
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
                <label htmlFor="pagecontentsmanager-badge-text" className="block text-xs font-semibold text-gray-600 mb-1">Badge Text</label>
                <input id="pagecontentsmanager-badge-text" name="badge_text" type="text"
                  value={formData.hero_badge_text ?? ''}
                  onChange={(e) => handleFieldChange('hero_badge_text', e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>
              <div>
                <label htmlFor="pagecontentsmanager-title-prefix" className="block text-xs font-semibold text-gray-600 mb-1">Title Prefix</label>
                <input id="pagecontentsmanager-title-prefix" name="title_prefix" type="text"
                  value={formData.hero_title_prefix ?? ''}
                  onChange={(e) => handleFieldChange('hero_title_prefix', e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>
              <div>
                <label htmlFor="pagecontentsmanager-title-highlight-accent-color" className="block text-xs font-semibold text-gray-600 mb-1">Title Highlight (Accent color)</label>
                <input id="pagecontentsmanager-title-highlight-accent-color" name="title_highlight_accent_color" type="text"
                  value={formData.hero_title_highlight ?? ''}
                  onChange={(e) => handleFieldChange('hero_title_highlight', e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>
              <div>
                <label htmlFor="pagecontentsmanager-title-suffix" className="block text-xs font-semibold text-gray-600 mb-1">Title Suffix</label>
                <input id="pagecontentsmanager-title-suffix" name="title_suffix" type="text"
                  value={formData.hero_title_suffix ?? ''}
                  onChange={(e) => handleFieldChange('hero_title_suffix', e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="pagecontentsmanager-headline-subtext" className="block text-xs font-semibold text-gray-600 mb-1">Headline Subtext</label>
                <input id="pagecontentsmanager-headline-subtext" name="headline_subtext" type="text"
                  value={formData.hero_subtext ?? ''}
                  onChange={(e) => handleFieldChange('hero_subtext', e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>
            </div>
            <div>
              <label htmlFor="pagecontentsmanager-main-description-paragraph" className="block text-xs font-semibold text-gray-600 mb-1">Main Description Paragraph</label>
              <textarea id="pagecontentsmanager-main-description-paragraph" name="main_description_paragraph" rows={3}
                value={formData.hero_description ?? ''}
                onChange={(e) => handleFieldChange('hero_description', e.target.value)}
                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
            <div>
              <label htmlFor="pagecontentsmanager-secondary-tagline" className="block text-xs font-semibold text-gray-600 mb-1">Secondary Tagline</label>
              <input id="pagecontentsmanager-secondary-tagline" name="secondary_tagline" type="text"
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
                <label htmlFor="pagecontentsmanager-page-title-heading" className="block text-xs font-semibold text-gray-600 mb-1">Page Title Heading</label>
                <input id="pagecontentsmanager-page-title-heading" name="page_title_heading" type="text"
                  value={formData.title ?? ''}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold"
                />
              </div>
              {selectedPage === 'about' && (
                <div>
                  <label htmlFor="pagecontentsmanager-page-subtitle" className="block text-xs font-semibold text-gray-600 mb-1">Page Subtitle</label>
                  <input id="pagecontentsmanager-page-subtitle" name="page_subtitle" type="text"
                    value={formData.subtitle ?? ''}
                    onChange={(e) => handleFieldChange('subtitle', e.target.value)}
                    className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>
              )}
            </div>
            
            <div>
              <label htmlFor="pagecontentsmanager-body-text-content-supports-lin" className="block text-xs font-semibold text-gray-600 mb-1">Body Text Content (supports line breaks)</label>
              <textarea id="pagecontentsmanager-body-text-content-supports-lin" name="body_text_content_supports_lin" rows={10}
                value={formData.content ?? ''}
                onChange={(e) => handleFieldChange('content', e.target.value)}
                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono whitespace-pre-wrap"
              />
            </div>

            {selectedPage === 'about' && (
              <div>
                <label htmlFor="pagecontentsmanager-about-us-image-banner-handlefi" className="block text-xs font-semibold text-gray-600 mb-1">About Us Image (Banner)</label>
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
                <label htmlFor="pagecontentsmanager-about-us-image-banner-handlefi" className="block text-xs font-semibold text-gray-600 mb-1">Title Heading</label>
                <input id="pagecontentsmanager-about-us-image-banner-handlefi" name="about_us_image_banner_handlefi" type="text"
                  value={formData.title ?? ''}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold"
                />
              </div>
              <div>
                <label htmlFor="pagecontentsmanager-subtitle" className="block text-xs font-semibold text-gray-600 mb-1">Subtitle</label>
                <input id="pagecontentsmanager-subtitle" name="subtitle" type="text"
                  value={formData.subtitle ?? ''}
                  onChange={(e) => handleFieldChange('subtitle', e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>
            </div>
            <div>
              <label htmlFor="pagecontentsmanager-introductory-text-paragraph" className="block text-xs font-semibold text-gray-600 mb-1">Introductory Text Paragraph</label>
              <textarea id="pagecontentsmanager-introductory-text-paragraph" name="introductory_text_paragraph" rows={3}
                value={formData.content ?? ''}
                onChange={(e) => handleFieldChange('content', e.target.value)}
                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="pagecontentsmanager-support-email" className="block text-xs font-semibold text-gray-600 mb-1">Support Email</label>
                <input id="pagecontentsmanager-support-email" name="support_email" type="email"
                  value={formData.email ?? ''}
                  autoComplete="email" onChange={(e) => handleFieldChange('email', e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>
              <div>
                <label htmlFor="pagecontentsmanager-phone-number-display" className="block text-xs font-semibold text-gray-600 mb-1">Phone Number Display</label>
                <input id="pagecontentsmanager-phone-number-display" name="phone_number_display" type="text"
                  value={formData.phone ?? ''}
                  autoComplete="tel" onChange={(e) => handleFieldChange('phone', e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>
              <div>
                <label htmlFor="pagecontentsmanager-whatsapp-api-number" className="block text-xs font-semibold text-gray-600 mb-1">WhatsApp API Number</label>
                <input id="pagecontentsmanager-whatsapp-api-number" name="whatsapp_api_number" type="text"
                  value={formData.whatsapp ?? ''}
                  onChange={(e) => handleFieldChange('whatsapp', e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  placeholder="e.g. +639778132630"
                />
              </div>
              <div>
                <label htmlFor="pagecontentsmanager-working-hours-description" className="block text-xs font-semibold text-gray-600 mb-1">Working Hours Description</label>
                <input id="pagecontentsmanager-working-hours-description" name="working_hours_description" type="text"
                  value={formData.hours ?? ''}
                  onChange={(e) => handleFieldChange('hours', e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="pagecontentsmanager-telegram-community-group-link" className="block text-xs font-semibold text-gray-600 mb-1">Telegram Community Group Link</label>
                <input id="pagecontentsmanager-telegram-community-group-link" name="telegram_community_group_link" type="url"
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
                <label htmlFor="pagecontentsmanager-faq-page-main-title" className="block text-xs font-semibold text-gray-600 mb-1">FAQ Page Main Title</label>
                <input id="pagecontentsmanager-faq-page-main-title" name="faq_page_main_title" type="text"
                  value={formData.title ?? ''}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold"
                />
              </div>
              <div>
                <label htmlFor="pagecontentsmanager-faq-page-subtitle" className="block text-xs font-semibold text-gray-600 mb-1">FAQ Page Subtitle</label>
                <input id="pagecontentsmanager-faq-page-subtitle" name="faq_page_subtitle" type="text"
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
              <label htmlFor="pagecontentsmanager-footer-about-description-short" className="block text-xs font-semibold text-gray-600 mb-1">Footer About Description (short)</label>
              <textarea id="pagecontentsmanager-footer-about-description-short" name="footer_about_description_short" rows={2}
                value={formData.about_text ?? ''}
                onChange={(e) => handleFieldChange('about_text', e.target.value)}
                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
            <div>
              <label htmlFor="pagecontentsmanager-copyright-line" className="block text-xs font-semibold text-gray-600 mb-1">Copyright Line</label>
              <input id="pagecontentsmanager-copyright-line" name="copyright_line" type="text"
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
              <label htmlFor="pagecontentsmanager-logo-text-brand" className="block text-xs font-semibold text-gray-600 mb-1">Logo Text Brand</label>
              <input id="pagecontentsmanager-logo-text-brand" name="logo_text_brand" type="text"
                value={formData.logo_text ?? ''}
                onChange={(e) => handleFieldChange('logo_text', e.target.value)}
                className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold"
              />
            </div>
          </div>
        );

      case 'community':
        return (
          <div className="space-y-5">
            <div className="border-b pb-3">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span>💬</span> Community & Telegram Discussions Link
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Configure the Telegram invite link used globally in the navigation header, mobile menu, about page, and footer.
              </p>
            </div>

            <div className="p-4 bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-2xl space-y-3">
              <label htmlFor="pagecontentsmanager-primary-telegram-community-gro" className="block text-xs font-bold text-sky-900 dark:text-sky-300">
                Primary Telegram Community / Group Discussion Link (t.me)
              </label>
              <div className="flex gap-2">
                <input id="pagecontentsmanager-primary-telegram-community-gro" name="primary_telegram_community_gro" type="url"
                  value={formData.telegram_group ?? formData.community_telegram_url ?? 'https://t.me/+fGtShIUkbB84YzZl'}
                  onChange={(e) => {
                    handleFieldChange('telegram_group', e.target.value);
                    handleFieldChange('community_telegram_url', e.target.value);
                  }}
                  className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-900 border border-sky-300 dark:border-sky-700 rounded-xl focus:ring-2 focus:ring-[#3C6CA8] outline-none text-sm font-mono text-slate-800 dark:text-white"
                  placeholder="https://t.me/+fGtShIUkbB84YzZl or https://t.me/yourgroup"
                />
                <a
                  href={formData.telegram_group || formData.community_telegram_url || 'https://t.me/+fGtShIUkbB84YzZl'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-colors shrink-0 flex items-center gap-1"
                >
                  <span>Test Link</span>
                </a>
              </div>
              <p className="text-[11px] text-sky-700 dark:text-sky-400">
                💡 Entering a new link here updates the "Community" navbar item, footer link, and about page cards instantly.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="pagecontentsmanager-direct-telegram-support-orders" className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Direct Telegram Support / Orders Link</label>
                <input id="pagecontentsmanager-direct-telegram-support-orders" name="direct_telegram_support_orders" type="url"
                  value={formData.support_telegram_url ?? 'https://t.me/slimdose_mnl'}
                  onChange={(e) => handleFieldChange('support_telegram_url', e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                  placeholder="https://t.me/slimdose_mnl"
                />
              </div>
              <div>
                <label htmlFor="pagecontentsmanager-community-card-headline" className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Community Card Headline</label>
                <input id="pagecontentsmanager-community-card-headline" name="community_card_headline" type="text"
                  value={formData.title ?? 'Telegram Discussions'}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold"
                  placeholder="Telegram Discussions"
                />
              </div>
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
                      <label htmlFor="pagecontentsmanager-meta-title" className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Meta Title</label>
                      <input id="pagecontentsmanager-meta-title" name="meta_title" type="text"
                        value={formData.seo_title ?? ''}
                        onChange={(e) => handleFieldChange('seo_title', e.target.value)}
                        className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        placeholder="Page title displayed in search engines"
                      />
                    </div>
                    <div>
                      <label htmlFor="pagecontentsmanager-meta-description" className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Meta Description</label>
                      <input id="pagecontentsmanager-meta-description" name="meta_description" type="text"
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
