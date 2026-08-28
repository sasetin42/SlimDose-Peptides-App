import React, { useState, useEffect, useMemo } from 'react';
import {
  Layout,
  Home,
  MessageCircle,
  Shield,
  Search,
  Save,
  RotateCcw,
  Upload,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Monitor,
  Sparkles,
  Phone,
  Mail,
  Instagram,
  Loader2,
  Trash2,
  Clock,
  Send,
  Lock,
  Eye,
  EyeOff,
  Server,
  Key,
} from 'lucide-react';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { useImageUpload } from '../hooks/useImageUpload';
import { fireToast } from './ToastNotification';
import { sendTransactionalEmail, generateSmtpTestEmailHtml, getStoredTemplateByKey } from '../services/emailService';
import { renderEmailTemplate } from '../utils/emailRenderer';
import { LiveEmailViewerModal } from './LiveEmailViewerModal';

type SettingsTab = 'general' | 'community' | 'homepage' | 'notice' | 'seo' | 'smtp';

interface SiteSettingsManagerProps {
  onNavigateToEmailTemplates?: () => void;
}

const SiteSettingsManager: React.FC<SiteSettingsManagerProps> = ({ onNavigateToEmailTemplates }) => {
  const { siteSettings, loading, updateSiteSettings, refetch } = useSiteSettings();
  const { uploadImage, uploading } = useImageUpload('site-assets');

  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [isSaving, setIsSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');

  // SMTP Diagnostics State
  const [showPassword, setShowPassword] = useState(false);
  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Live Email Delivery Inspector Modal State
  const [isLiveViewerOpen, setIsLiveViewerOpen] = useState(false);
  const [liveViewerData, setLiveViewerData] = useState({
    recipientEmail: '',
    senderEmail: '',
    senderName: '',
    subject: '',
    htmlContent: '',
    provider: '',
    host: '',
    port: 465,
    referenceId: '',
  });

  // Main Form Data State
  const [formData, setFormData] = useState({
    // General & Branding
    site_name: '',
    site_description: '',
    currency: 'PHP',
    currency_code: 'PHP',
    operating_hours: 'Monday - Friday: 9:00 AM - 6:00 PM PHT',
    support_email: 'support@slimdose.ph',
    support_phone: '+63 977 813 2630',
    contact_phone: '+63 977 813 2630',
    contact_whatsapp: '+63 977 813 2630',
    contact_inquiry_text: 'For inquiries regarding bulk purchases, custom peptide synthesis, or laboratory test verification, please reach out to our support team.',
    // Social & Community Links
    community_telegram_url: '',
    support_telegram_url: '',
    instagram_url: '',
    facebook_url: '',
    // Homepage Hero
    hero_badge_text: '',
    hero_title_prefix: '',
    hero_title_highlight: '',
    hero_title_suffix: '',
    hero_subtext: '',
    hero_tagline: '',
    hero_description: '',
    hero_accent_color: '#3C6CA8',
    // Important Notice Modal
    notice_title: '',
    notice_subtitle: '',
    notice_disclaimer_p1: '',
    notice_disclaimer_p2: '',
    notice_consult_text: '',
    notice_warning_pill: '',
    notice_order_days: '',
    notice_cutoff_time: '',
    notice_courier: '',
    notice_weekend_orders: '',
    notice_agree_button_text: '',
    // SEO & Meta
    meta_title: '',
    meta_description: '',
    meta_keywords: '',
    // SMTP & Email Notification Settings
    smtp_enabled: 'true',
    smtp_provider: 'smtp',
    smtp_host: 'smtp.gmail.com',
    smtp_port: '465',
    smtp_secure: 'true',
    smtp_user: 'orders@slimdose.ph',
    smtp_pass: '',
    smtp_from_email: 'orders@slimdose.ph',
    smtp_from_name: 'SlimDose Peptides',
    smtp_admin_email: 'admin@slimdose.ph',
    smtp_send_order_receipt: 'true',
    smtp_send_admin_alert: 'true',
    smtp_send_status_update: 'true',
  });

  // Track initial state to detect unsaved changes
  const [initialData, setInitialData] = useState<typeof formData | null>(null);

  useEffect(() => {
    if (siteSettings) {
      const synced = {
        site_name: siteSettings.site_name || 'SlimDose Peptides',
        site_description: siteSettings.site_description || '',
        currency: siteSettings.currency || 'PHP',
        currency_code: siteSettings.currency_code || 'PHP',
        operating_hours: siteSettings.operating_hours || 'Monday - Friday: 9:00 AM - 6:00 PM PHT',
        support_email: siteSettings.support_email || 'support@slimdose.ph',
        support_phone: siteSettings.support_phone || '+63 977 813 2630',
        contact_phone: siteSettings.contact_phone || '+63 977 813 2630',
        contact_whatsapp: siteSettings.contact_whatsapp || '+63 977 813 2630',
        contact_inquiry_text: siteSettings.contact_inquiry_text || 'For inquiries regarding bulk purchases, custom peptide synthesis, or laboratory test verification, please reach out to our support team.',
        community_telegram_url: siteSettings.community_telegram_url || 'https://t.me/+fGtShIUkbB84YzZl',
        support_telegram_url: siteSettings.support_telegram_url || 'https://telegram.me/slimdose_mnl',
        instagram_url: siteSettings.instagram_url || '',
        facebook_url: siteSettings.facebook_url || '',
        hero_badge_text: siteSettings.hero_badge_text || 'Premium Peptide Solutions',
        hero_title_prefix: siteSettings.hero_title_prefix || 'Premium',
        hero_title_highlight: siteSettings.hero_title_highlight || 'Peptides',
        hero_title_suffix: siteSettings.hero_title_suffix || '& Essentials',
        hero_subtext: siteSettings.hero_subtext || 'From the Lab to You — Simplifying Science, One Dose at a Time.',
        hero_tagline: siteSettings.hero_tagline || 'Quality-tested products. Reliable performance. Trusted by our community.',
        hero_description: siteSettings.hero_description || 'SlimDose Peptides is your all-in-one destination for high-quality peptides, peptide pens, and the essential accessories you need for a smooth and confident wellness routine.',
        hero_accent_color: siteSettings.hero_accent_color || '#3C6CA8',
        notice_title: siteSettings.notice_title || 'Important Notice',
        notice_subtitle: siteSettings.notice_subtitle || 'Please read carefully before continuing',
        notice_disclaimer_p1: siteSettings.notice_disclaimer_p1 || 'Sold strictly for research purposes only, not FDA-approved, and are not intended to diagnose, treat, cure, or prevent any disease.',
        notice_disclaimer_p2: siteSettings.notice_disclaimer_p2 || 'Improper handling or use may carry risks, including possible side effects, adverse reactions, contamination, or ineffective results.',
        notice_consult_text: siteSettings.notice_consult_text || 'Always consult a licensed healthcare professional for health-related decisions.',
        notice_warning_pill: siteSettings.notice_warning_pill || '✕ NO MEET UPS · NO PICK UPS · NO RUSH ORDERS',
        notice_order_days: siteSettings.notice_order_days || 'Monday - Friday',
        notice_cutoff_time: siteSettings.notice_cutoff_time || '5:00 PM Daily',
        notice_courier: siteSettings.notice_courier || 'Next Day via J&T',
        notice_weekend_orders: siteSettings.notice_weekend_orders || 'Processed Mondays',
        notice_agree_button_text: siteSettings.notice_agree_button_text || 'I Understand & Agree',
        meta_title: siteSettings.meta_title || 'SlimDose Peptides — High Purity Research Solutions',
        meta_description: siteSettings.meta_description || 'Premium research peptides with third-party COA verification and nationwide delivery across the Philippines.',
        meta_keywords: siteSettings.meta_keywords || 'peptides, slimdose, research peptides, peptide calculator, laboratory tested',
        // SMTP Synced
        smtp_enabled: siteSettings.smtp_enabled || 'true',
        smtp_provider: siteSettings.smtp_provider || 'hostinger',
        smtp_host: siteSettings.smtp_host || 'smtp.hostinger.com',
        smtp_port: siteSettings.smtp_port || '465',
        smtp_secure: siteSettings.smtp_secure || 'true',
        smtp_user: siteSettings.smtp_user || 'info@slimdoseph.com',
        smtp_pass: siteSettings.smtp_pass || '+f9NVWT>g',
        smtp_from_email: siteSettings.smtp_from_email || 'info@slimdoseph.com',
        smtp_from_name: siteSettings.smtp_from_name || 'SlimDose Peptides',
        smtp_admin_email: siteSettings.smtp_admin_email || 'info@slimdoseph.com',
        smtp_send_order_receipt: siteSettings.smtp_send_order_receipt || 'true',
        smtp_send_admin_alert: siteSettings.smtp_send_admin_alert || 'true',
        smtp_send_status_update: siteSettings.smtp_send_status_update || 'true',
      };

      setFormData(synced);
      setInitialData(synced);
      setTestEmailRecipient(synced.smtp_admin_email || synced.support_email || 'admin@slimdose.ph');
      setLogoPreview(siteSettings.site_logo || '/assets/logo.jpeg');
    }
  }, [siteSettings]);

  const handleProviderPreset = (provider: string) => {
    if (provider === 'hostinger') {
      setFormData((prev) => ({
        ...prev,
        smtp_provider: 'hostinger',
        smtp_host: 'smtp.hostinger.com',
        smtp_port: '465',
        smtp_secure: 'true',
        smtp_user: prev.smtp_user && prev.smtp_user.includes('@') ? prev.smtp_user : 'info@slimdoseph.com',
        smtp_from_email: prev.smtp_from_email && prev.smtp_from_email.includes('@') ? prev.smtp_from_email : 'info@slimdoseph.com',
        smtp_from_name: 'SlimDose Peptides',
        smtp_admin_email: prev.smtp_admin_email && prev.smtp_admin_email.includes('@') ? prev.smtp_admin_email : 'info@slimdoseph.com',
      }));
      fireToast('Applied Hostinger Business Email preset (smtp.hostinger.com:465 SSL)', 'info');
    } else if (provider === 'gmail') {
      setFormData((prev) => ({
        ...prev,
        smtp_provider: 'gmail',
        smtp_host: 'smtp.gmail.com',
        smtp_port: '465',
        smtp_secure: 'true',
      }));
      fireToast('Applied Gmail / Google Workspace SMTP preset', 'info');
    } else if (provider === 'brevo') {
      setFormData((prev) => ({
        ...prev,
        smtp_provider: 'brevo',
        smtp_host: 'smtp-relay.brevo.com',
        smtp_port: '587',
        smtp_secure: 'false',
      }));
      fireToast('Applied Brevo / Sendinblue SMTP preset', 'info');
    } else if (provider === 'sendgrid') {
      setFormData((prev) => ({
        ...prev,
        smtp_provider: 'sendgrid',
        smtp_host: 'smtp.sendgrid.net',
        smtp_port: '587',
        smtp_secure: 'false',
      }));
      fireToast('Applied SendGrid SMTP preset', 'info');
    } else if (provider === 'resend') {
      setFormData((prev) => ({
        ...prev,
        smtp_provider: 'resend',
        smtp_host: 'smtp.resend.com',
        smtp_port: '465',
        smtp_secure: 'true',
      }));
      fireToast('Applied Resend SMTP preset', 'info');
    } else {
      setFormData((prev) => ({
        ...prev,
        smtp_provider: 'smtp',
      }));
      fireToast('Custom SMTP configuration selected', 'info');
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailRecipient || !testEmailRecipient.includes('@')) {
      fireToast('Please enter a valid recipient email address', 'warning');
      return;
    }

    try {
      setIsSendingTest(true);
      setTestResult(null);

      const smtpConfig = {
        enabled: formData.smtp_enabled === 'true',
        provider: formData.smtp_provider,
        host: formData.smtp_host,
        port: parseInt(formData.smtp_port, 10) || 465,
        secure: formData.smtp_secure === 'true',
        user: formData.smtp_user,
        pass: formData.smtp_pass,
        fromEmail: formData.smtp_from_email,
        fromName: formData.smtp_from_name,
        adminEmail: formData.smtp_admin_email,
        sendOrderReceipt: formData.smtp_send_order_receipt === 'true',
        sendAdminAlert: formData.smtp_send_admin_alert === 'true',
        sendStatusUpdate: formData.smtp_send_status_update === 'true',
      };

      const verifyCode = `HD-${Date.now().toString(36).toUpperCase().slice(-6)}`;
      const timestamp = new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' });

      // ── Use Email Template Studio 'order-confirmed' template as the test ───────
      // This proves the full template pipeline works AND looks professional.
      const studioTemplate = getStoredTemplateByKey('order-confirmed');
      let testHtml: string;
      let testSubject: string;

      if (studioTemplate && studioTemplate.html_content) {
        // Render with sample SMTP verification data injected into template variables
        testHtml = renderEmailTemplate(studioTemplate.html_content, {
          customer_name: 'SMTP Test Recipient',
          customer_email: testEmailRecipient,
          order_number: verifyCode,
          order_id: verifyCode,
          order_status: '✅ SMTP Verified',
          items_summary: `• Hostinger SMTP Relay — smtp.hostinger.com:465 (SSL/TLS)\n• Sender: ${formData.smtp_from_email || 'info@slimdoseph.com'}\n• Recipient: ${testEmailRecipient}\n• Ref: ${verifyCode}\n• Dispatched: ${timestamp} (PHT)`,
          subtotal: '0.00',
          shipping_fee: '0.00',
          discount: '0.00',
          promo_code: verifyCode,
          total_price: '0.00',
          payment_method: 'SMTP Configuration Test',
          shipping_address: `Delivered to: ${testEmailRecipient}`,
          shipping_provider: 'Hostinger Business Email',
          tracking_number: verifyCode,
          tracking_url: 'https://slimdoseph.com',
          site_url: 'https://slimdoseph.com',
          support_email: formData.smtp_from_email || 'info@slimdoseph.com',
        });
        testSubject = `✅ [SlimDose] SMTP Connection Verified — ${verifyCode}`;
      } else {
        // Fallback to branded diagnostic template if no studio template found
        testHtml = generateSmtpTestEmailHtml(smtpConfig, testEmailRecipient);
        testSubject = `[SlimDose] SMTP Verification Test (${formData.smtp_provider.toUpperCase()}) — ${testEmailRecipient}`;
      }

      // Populate Live Outbound Inspector & Open
      setLiveViewerData({
        recipientEmail: testEmailRecipient,
        senderEmail: formData.smtp_from_email || 'info@slimdoseph.com',
        senderName: formData.smtp_from_name || 'SlimDose Peptides',
        subject: testSubject,
        htmlContent: testHtml,
        provider: formData.smtp_provider.toUpperCase(),
        host: formData.smtp_host || 'smtp.hostinger.com',
        port: parseInt(formData.smtp_port, 10) || 465,
        referenceId: verifyCode,
      });
      setIsLiveViewerOpen(true);

      const res = await sendTransactionalEmail({
        to: testEmailRecipient,
        subject: testSubject,
        html: testHtml,
        fromEmail: formData.smtp_from_email,
        fromName: formData.smtp_from_name,
        smtpConfig,
        isTest: true,
      });

      if (res.success) {
        setTestResult({
          success: true,
          message: `✅ Professional test email dispatched to ${testEmailRecipient} via ${res.providerUsed || formData.smtp_provider.toUpperCase()}! Check your Inbox (and Spam/Promotions). Ref: ${res.messageId || verifyCode}`,
        });
        setLiveViewerData((prev) => ({ ...prev, referenceId: res.messageId || prev.referenceId }));
        fireToast(`Test email sent to ${testEmailRecipient}! Check your inbox 📬`, 'success');
      } else {
        const errorMsg = res.error || 'Failed to dispatch test email. Please verify SMTP host, port, username, and password.';
        setTestResult({
          success: false,
          message: `❌ Transmission Failed: ${errorMsg}`,
        });
        fireToast(`SMTP Error: ${errorMsg}`, 'error');
      }
    } catch (err: any) {
      console.error('Test email failure:', err);
      const errorMsg = err.message || 'Error communicating with SMTP relay.';
      setTestResult({
        success: false,
        message: `❌ Delivery Error: ${errorMsg}`,
      });
      fireToast(`SMTP Failure: ${errorMsg}`, 'error');
    } finally {
      setIsSendingTest(false);
    }
  };

  const hasUnsavedChanges = useMemo(() => {
    if (!initialData) return !!logoFile;
    const isFieldsChanged = JSON.stringify(formData) !== JSON.stringify(initialData);
    return isFieldsChanged || !!logoFile;
  }, [formData, initialData, logoFile]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        fireToast('Logo file must be smaller than 5MB', 'error');
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setLogoPreview(uploadEvent.target?.result as string);
      };
      reader.readAsDataURL(file);
      fireToast('Logo preview loaded', 'info');
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview('/assets/logo.jpeg');
    fireToast('Logo reset to default', 'info');
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      let logoUrl = logoPreview;

      if (logoFile) {
        const uploadedUrl = await uploadImage(logoFile);
        if (uploadedUrl) {
          logoUrl = uploadedUrl;
        }
      }

      const updatedSettings = {
        ...formData,
        site_logo: logoUrl,
      };

      await updateSiteSettings(updatedSettings);

      setLogoFile(null);
      setLogoPreview(logoUrl);
      setInitialData(formData);
      await refetch();
      fireToast('Site settings updated & synchronized live! 🎉', 'success');
    } catch (error: any) {
      console.error('Error saving site settings:', error);
      fireToast(`Failed to save settings: ${error.message || 'Unknown error'}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetHomepageDefaults = () => {
    if (window.confirm('Reset homepage hero copy to default values?')) {
      setFormData((prev) => ({
        ...prev,
        hero_badge_text: 'Premium Peptide Solutions',
        hero_title_prefix: 'Premium',
        hero_title_highlight: 'Peptides',
        hero_title_suffix: '& Essentials',
        hero_subtext: 'From the Lab to You — Simplifying Science, One Dose at a Time.',
        hero_tagline: 'Quality-tested products. Reliable performance. Trusted by our community.',
        hero_description:
          'SlimDose Peptides is your all-in-one destination for high-quality peptides, peptide pens, and the essential accessories you need for a smooth and confident wellness routine.',
        hero_accent_color: '#3C6CA8',
      }));
      fireToast('Homepage defaults restored in form', 'info');
    }
  };

  const handleResetNoticeDefaults = () => {
    if (window.confirm('Reset research notice disclaimer to default terms?')) {
      setFormData((prev) => ({
        ...prev,
        notice_title: 'Important Notice',
        notice_subtitle: 'Please read carefully before continuing',
        notice_disclaimer_p1:
          'Sold strictly for research purposes only, not FDA-approved, and are not intended to diagnose, treat, cure, or prevent any disease.',
        notice_disclaimer_p2:
          'Improper handling or use may carry risks, including possible side effects, adverse reactions, contamination, or ineffective results.',
        notice_consult_text:
          'Always consult a licensed healthcare professional for health-related decisions.',
        notice_warning_pill: '✕ NO MEET UPS · NO PICK UPS · NO RUSH ORDERS',
        notice_order_days: 'Monday - Friday',
        notice_cutoff_time: '5:00 PM Daily',
        notice_courier: 'Next Day via J&T',
        notice_weekend_orders: 'Processed Mondays',
        notice_agree_button_text: 'I Understand & Agree',
      }));
      fireToast('Notice defaults restored in form', 'info');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <Loader2 className="w-8 h-8 text-[#3C6CA8] animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Loading site configuration &amp; assets...</p>
      </div>
    );
  }

  const tabs = [
    { id: 'general', label: 'General & Branding', icon: Layout },
    { id: 'community', label: 'Channels & Support', icon: MessageCircle },
    { id: 'homepage', label: 'Homepage Hero & Copy', icon: Home },
    { id: 'notice', label: 'Research Notice Modal', icon: Shield },
    { id: 'seo', label: 'SEO & Metadata', icon: Search },
    { id: 'smtp', label: 'SMTP & Email System', icon: Mail },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 text-left max-w-5xl mx-auto pb-12 font-inter">
      {/* ── Top Header Banner ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#3C6CA8]/10 border border-[#3C6CA8]/20 flex items-center justify-center text-[#3C6CA8] shrink-0 shadow-2xs">
            <Layout className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Site Settings &amp; Store Configuration
              </h1>
              {hasUnsavedChanges && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 animate-pulse">
                  <AlertCircle className="w-3 h-3" /> Unsaved Changes
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Manage store branding, telegram community links, homepage hero copy, and SMTP transactional mail.
            </p>
          </div>
        </div>

        {/* Header Action Button */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || uploading}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#3C6CA8] hover:bg-[#315A8E] active:bg-[#264874] text-white text-xs font-black transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Settings</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Segmented Tab Navigation ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar scroll-smooth">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as SettingsTab)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 border ${
                isActive
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs dark:bg-white dark:text-slate-900 dark:border-white'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200/90 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400 dark:text-[#3C6CA8]' : 'text-slate-400'}`} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: General & Branding ── */}
      {activeTab === 'general' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200/90 dark:border-slate-800 p-4 sm:p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layout className="w-4 h-4 text-[#3C6CA8]" />
                  Store Identity &amp; Branding
                </h2>
                <p className="text-xs text-slate-400">Core store identity, logo graphics, and currency parameters.</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-[#3C6CA8] rounded-full border border-blue-100 dark:border-blue-900/50">
                Active Brand
              </span>
            </div>

            {/* Logo Upload Row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60">
              <div className="relative group shrink-0">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-center p-2">
                  <img
                    src={logoPreview || '/assets/logo.jpeg'}
                    alt="Brand Logo Preview"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/assets/logo.jpeg';
                    }}
                  />
                </div>
              </div>

              <div className="flex-1 space-y-1.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black text-slate-900 dark:text-white">Store Logo Mark</span>
                  <span className="text-[10px] font-bold text-slate-400">(PNG, SVG, or JPG · Max 5MB)</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  This logo renders across the storefront navbar header, invoice receipts, order summaries, and email templates.
                </p>
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <label htmlFor="sitesettingsmanager-file-upload" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-300 dark:border-slate-700 cursor-pointer transition-all shadow-2xs">
                    <Upload className="w-3.5 h-3.5 text-[#3C6CA8]" />
                    <span>Upload New Logo</span>
                    <input id="sitesettingsmanager-file-upload" name="file_upload" type="file" accept="image/*" onChange={handleLogoChange} className="hidden"/>
                  </label>
                  {logoPreview !== '/assets/logo.jpeg' && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Store / Business Name *
                </label>
                <input
                  type="text"
                  name="site_name"
                  value={formData.site_name}
                  onChange={handleInputChange}
                  placeholder="e.g. SlimDose Peptides"
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] outline-none"
                  autoComplete="off"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Operating Hours / Support Schedule
                </label>
                <input
                  type="text"
                  name="operating_hours"
                  value={formData.operating_hours}
                  onChange={handleInputChange}
                  placeholder="e.g. Mon - Fri: 9:00 AM - 6:00 PM"
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] outline-none"
                  autoComplete="off"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Store Motto &amp; Short Description
                </label>
                <textarea
                  name="site_description"
                  value={formData.site_description}
                  onChange={handleInputChange}
                  rows={2}
                  placeholder="Brief description displayed in browser previews, social embeds, and footer..."
                  className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] outline-none resize-none"
                  autoComplete="off"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Currency Symbol
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="currency"
                    value={formData.currency}
                    onChange={handleInputChange}
                    placeholder="₱"
                    className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] outline-none"
                    autoComplete="off"
                  />
                  <span className="absolute right-3 top-2.5 text-[11px] font-mono text-slate-400">Prefix</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  ISO Currency Code
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="currency_code"
                    value={formData.currency_code}
                    onChange={handleInputChange}
                    placeholder="PHP"
                    className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] outline-none"
                    autoComplete="off"
                  />
                  <span className="absolute right-3 top-2.5 text-[11px] font-mono text-slate-400">ISO 4217</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: Channels & Support ── */}
      {activeTab === 'community' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200/90 dark:border-slate-800 p-4 sm:p-6 space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-[#3C6CA8]" />
                Customer Support &amp; Social Channels
              </h2>
              <p className="text-xs text-slate-400">Direct client contact points, Telegram community groups, and official channels.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Support Email Address
                </label>
                <input
                  type="email"
                  name="support_email"
                  value={formData.support_email}
                  onChange={handleInputChange}
                  placeholder="support@slimdose.ph"
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none"
                  autoComplete="off"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Support Phone / Hotline
                </label>
                <input
                  type="text"
                  name="support_phone"
                  value={formData.support_phone}
                  onChange={handleInputChange}
                  placeholder="+63 977 813 2630"
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none"
                  autoComplete="off"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Telegram Community Group Link
                </label>
                <input
                  type="url"
                  name="community_telegram_url"
                  value={formData.community_telegram_url}
                  onChange={handleInputChange}
                  placeholder="https://t.me/+fGtShIUkbB84YzZl"
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none"
                  autoComplete="off"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Direct Telegram Support Link
                </label>
                <input
                  type="url"
                  name="support_telegram_url"
                  value={formData.support_telegram_url}
                  onChange={handleInputChange}
                  placeholder="https://telegram.me/slimdose_mnl"
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none"
                  autoComplete="off"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Instagram Profile Link
                </label>
                <input
                  type="url"
                  name="instagram_url"
                  value={formData.instagram_url}
                  onChange={handleInputChange}
                  placeholder="https://instagram.com/slimdose"
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none"
                  autoComplete="off"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Facebook Page Link
                </label>
                <input
                  type="url"
                  name="facebook_url"
                  value={formData.facebook_url}
                  onChange={handleInputChange}
                  placeholder="https://facebook.com/slimdoseph"
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none"
                  autoComplete="off"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: Homepage Hero & Copy ── */}
      {activeTab === 'homepage' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200/90 dark:border-slate-800 p-4 sm:p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Home className="w-4 h-4 text-[#3C6CA8]" />
                  Homepage Hero &amp; Headlines
                </h2>
                <p className="text-xs text-slate-400">Configure main headline copy, badge tagline, and accent colors.</p>
              </div>
              <button
                type="button"
                onClick={handleResetHomepageDefaults}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Defaults</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Title Prefix
                </label>
                <input
                  type="text"
                  name="hero_title_prefix"
                  value={formData.hero_title_prefix}
                  onChange={handleInputChange}
                  placeholder="Premium"
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none"
                  autoComplete="off"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Title Highlight
                </label>
                <input
                  type="text"
                  name="hero_title_highlight"
                  value={formData.hero_title_highlight}
                  onChange={handleInputChange}
                  placeholder="Peptides"
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none"
                  autoComplete="off"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Title Suffix
                </label>
                <input
                  type="text"
                  name="hero_title_suffix"
                  value={formData.hero_title_suffix}
                  onChange={handleInputChange}
                  placeholder="& Essentials"
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none"
                  autoComplete="off"
                />
              </div>

              <div className="sm:col-span-3 space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Badge Pill Text
                </label>
                <input
                  type="text"
                  name="hero_badge_text"
                  value={formData.hero_badge_text}
                  onChange={handleInputChange}
                  placeholder="Premium Peptide Solutions"
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none"
                  autoComplete="off"
                />
              </div>

              <div className="sm:col-span-3 space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Hero Subtitle Copy
                </label>
                <textarea
                  name="hero_subtext"
                  value={formData.hero_subtext}
                  onChange={handleInputChange}
                  rows={2}
                  placeholder="From the Lab to You — Simplifying Science, One Dose at a Time."
                  className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none resize-none"
                  autoComplete="off"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: Research Notice Modal ── */}
      {activeTab === 'notice' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200/90 dark:border-slate-800 p-4 sm:p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#3C6CA8]" />
                  Research Notice &amp; Compliance Modal
                </h2>
                <p className="text-xs text-slate-400">Manage required disclaimers, operating days, cutoff times, and fulfillment warnings.</p>
              </div>
              <button
                type="button"
                onClick={handleResetNoticeDefaults}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Defaults</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Notice Modal Title
                </label>
                <input
                  type="text"
                  name="notice_title"
                  value={formData.notice_title}
                  onChange={handleInputChange}
                  placeholder="Important Notice"
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none"
                  autoComplete="off"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Notice Subtitle
                </label>
                <input
                  type="text"
                  name="notice_subtitle"
                  value={formData.notice_subtitle}
                  onChange={handleInputChange}
                  placeholder="Please read carefully before continuing"
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none"
                  autoComplete="off"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Primary Legal Disclaimer Paragraph
                </label>
                <textarea
                  name="notice_disclaimer_p1"
                  value={formData.notice_disclaimer_p1}
                  onChange={handleInputChange}
                  rows={2}
                  placeholder="Sold strictly for research purposes only, not FDA-approved..."
                  className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none resize-none"
                  autoComplete="off"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Order Processing Days
                </label>
                <input
                  type="text"
                  name="notice_order_days"
                  value={formData.notice_order_days}
                  onChange={handleInputChange}
                  placeholder="Monday - Friday"
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none"
                  autoComplete="off"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Daily Cutoff Time
                </label>
                <input
                  type="text"
                  name="notice_cutoff_time"
                  value={formData.notice_cutoff_time}
                  onChange={handleInputChange}
                  placeholder="5:00 PM Daily"
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none"
                  autoComplete="off"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 5: SEO & Metadata ── */}
      {activeTab === 'seo' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200/90 dark:border-slate-800 p-4 sm:p-6 space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Search className="w-4 h-4 text-[#3C6CA8]" />
                Search Engine Optimization &amp; Meta Tags
              </h2>
              <p className="text-xs text-slate-400">Configure global metadata tags for Google search results and link previews.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Meta Title
                </label>
                <input
                  type="text"
                  name="meta_title"
                  value={formData.meta_title}
                  onChange={handleInputChange}
                  placeholder="SlimDose Peptides — High Purity Research Solutions"
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none"
                  autoComplete="off"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Meta Description
                </label>
                <textarea
                  name="meta_description"
                  value={formData.meta_description}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Premium research peptides with third-party COA verification and nationwide delivery..."
                  className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none resize-none"
                  autoComplete="off"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Meta Keywords
                </label>
                <input
                  type="text"
                  name="meta_keywords"
                  value={formData.meta_keywords}
                  onChange={handleInputChange}
                  placeholder="peptides, slimdose, research peptides, peptide calculator, laboratory tested"
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none"
                  autoComplete="off"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 6: SMTP Relay & Email Service (Complete Implementation matching User Design) ── */}
      {activeTab === 'smtp' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200/90 dark:border-slate-800 p-4 sm:p-6 space-y-6">
            {/* SMTP Header & Master Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center text-[#3C6CA8] shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                    SMTP Relay &amp; Email Service
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Configure your outbound SMTP credentials for transactional receipts and customer order notifications.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    if (onNavigateToEmailTemplates) {
                      onNavigateToEmailTemplates();
                    } else {
                      window.location.hash = 'email-templates';
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-[#3C6CA8] dark:text-blue-300 border border-blue-200/80 dark:border-blue-900/50 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Open Email Template Studio</span>
                </button>

                {/* Master Email Toggle Switch */}
                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/60 p-2 sm:px-3 rounded-xl border border-slate-200/70 dark:border-slate-700">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Email Dispatch System:
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        smtp_enabled: prev.smtp_enabled === 'true' ? 'false' : 'true',
                      }))
                    }
                    className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      formData.smtp_enabled === 'true'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {formData.smtp_enabled === 'true' ? 'ACTIVE / ENABLED' : 'DISABLED'}
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Provider Presets */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Quick Provider Presets
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {[
                  { id: 'hostinger', label: 'Hostinger Email', desc: 'smtp.hostinger.com (465)' },
                  { id: 'smtp', label: 'Custom SMTP', desc: 'Custom Host & Port' },
                  { id: 'gmail', label: 'Gmail / Google', desc: 'smtp.gmail.com (SSL 465)' },
                  { id: 'brevo', label: 'Brevo', desc: 'smtp-relay.brevo.com' },
                  { id: 'resend', label: 'Resend', desc: 'smtp.resend.com' },
                  { id: 'sendgrid', label: 'SendGrid', desc: 'smtp.sendgrid.net' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleProviderPreset(p.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      formData.smtp_provider === p.id
                        ? 'border-[#3C6CA8] bg-blue-50/60 dark:bg-slate-800 ring-2 ring-[#3C6CA8]/20'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300'
                    }`}
                  >
                    <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                      {p.label}
                    </span>
                    <span className="text-[10px] text-slate-400 truncate mt-1">
                      {p.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* SMTP Server Connection Credentials */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="space-y-1 sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  SMTP Host Server
                </label>
                <input
                  type="text"
                  name="smtp_host"
                  value={formData.smtp_host}
                  onChange={handleInputChange}
                  placeholder="e.g. smtp.sendgrid.net or smtp.gmail.com"
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none font-mono"
                  autoComplete="off"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Port &amp; Security
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="smtp_port"
                    value={formData.smtp_port}
                    onChange={handleInputChange}
                    placeholder="587"
                    className="w-20 px-3 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none font-mono"
                    autoComplete="off"
                  />
                  <select
                    name="smtp_secure"
                    value={formData.smtp_secure}
                    onChange={handleInputChange}
                    className="flex-1 px-2.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none"
                  >
                    <option value="false">STARTTLS (Port 587)</option>
                    <option value="true">SSL / TLS (Port 465)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Authentication Credentials */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#3C6CA8]" />
                  <span>SMTP Username / API User</span>
                </label>
                <input
                  type="text"
                  name="smtp_user"
                  value={formData.smtp_user}
                  onChange={handleInputChange}
                  placeholder="orders@slimdose.ph or apikey"
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none font-mono"
                  autoComplete="off"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#3C6CA8]" />
                    <span>SMTP Password / App Password / API Key</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[10px] text-slate-400 hover:text-[#3C6CA8] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showPassword ? 'Hide' : 'Reveal'}</span>
                  </button>
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="smtp_pass"
                  value={formData.smtp_pass}
                  onChange={handleInputChange}
                  placeholder="••••••••••••••••"
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none font-mono"
                  autoComplete="new-password"
                />
              </div>
            </div>

            {/* Sender Identity & Notification Destinations */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Sender Display Name
                </label>
                <input
                  type="text"
                  name="smtp_from_name"
                  value={formData.smtp_from_name}
                  onChange={handleInputChange}
                  placeholder="SlimDose Peptides"
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none"
                  autoComplete="off"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  From Email Address
                </label>
                <input
                  type="email"
                  name="smtp_from_email"
                  value={formData.smtp_from_email}
                  onChange={handleInputChange}
                  placeholder="orders@slimdose.ph"
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none font-mono"
                  autoComplete="off"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Admin Alert Recipient Email
                </label>
                <input
                  type="email"
                  name="smtp_admin_email"
                  value={formData.smtp_admin_email}
                  onChange={handleInputChange}
                  placeholder="admin@slimdose.ph"
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none font-mono"
                  autoComplete="off"
                />
              </div>
            </div>

            {/* Notification Rules Toggles */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
                Automated Transactional Triggers
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    key: 'smtp_send_order_receipt',
                    title: 'Customer Order Receipt',
                    desc: 'Send branded HTML confirmation email upon customer checkout',
                  },
                  {
                    key: 'smtp_send_admin_alert',
                    title: 'Admin New Order Alert',
                    desc: 'Send instant notification to store managers when new order is placed',
                  },
                  {
                    key: 'smtp_send_status_update',
                    title: 'Shipping & Tracking Update',
                    desc: 'Send email with J&T/Maxim tracking number when order ships',
                  },
                ].map((item) => {
                  const isChecked = (formData as any)[item.key] === 'true';
                  return (
                    <div
                      key={item.key}
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          [item.key]: isChecked ? 'false' : 'true',
                        }))
                      }
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                        isChecked
                          ? 'border-[#3C6CA8]/50 bg-blue-50/40 dark:bg-slate-800/90'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 opacity-75'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-0.5 w-4 h-4 rounded text-[#3C6CA8] focus:ring-[#3C6CA8]"
                      />
                      <div>
                        <p className="text-xs font-extrabold text-slate-900 dark:text-white">
                          {item.title}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Live Test Email Sender Card */}
            <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-5 sm:p-6 text-white border border-blue-800/40 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-amber-400 font-extrabold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>SMTP Connection &amp; Relay Diagnostics</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">
                    Send a Live Verification Email
                  </h3>
                  <p className="text-xs text-blue-200/90 mt-0.5">
                    Test your active configuration by sending a sample branded transactional email right now.
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="email"
                    value={testEmailRecipient}
                    onChange={(e) => setTestEmailRecipient(e.target.value)}
                    placeholder="recipient@example.com"
                    className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800/90 border border-blue-700/50 text-white placeholder-slate-400 focus:ring-2 focus:ring-amber-400 outline-none w-full sm:w-64"
                  />
                  <button
                    type="button"
                    onClick={handleSendTestEmail}
                    disabled={isSendingTest}
                    className="px-4 py-2 rounded-xl bg-[#3C6CA8] hover:bg-[#315A8E] active:bg-[#264874] text-white text-xs font-black transition-all flex items-center justify-center gap-2 shrink-0 shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {isSendingTest ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Dispatching...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Test</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Rich Test Result Details Box */}
              {testResult && (
                <div
                  className={`p-4 rounded-xl text-xs space-y-2 border transition-all ${
                    testResult.success
                      ? 'bg-emerald-950/80 border-emerald-700/80 text-emerald-100 shadow-md'
                      : 'bg-rose-950/80 border-rose-700/80 text-rose-100 shadow-md'
                  }`}
                >
                  <div className="flex items-center gap-2.5 font-bold">
                    {testResult.success ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                    )}
                    <span className="text-sm font-black tracking-tight">{testResult.message}</span>
                  </div>

                  {testResult.success ? (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-800/60 text-[11px] text-emerald-200/90 font-medium">
                        <div className="bg-emerald-900/50 p-2 rounded-lg border border-emerald-700/40">
                          <span className="block text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Recipient</span>
                          <span className="font-mono truncate block font-bold text-white">{testEmailRecipient}</span>
                        </div>
                        <div className="bg-emerald-900/50 p-2 rounded-lg border border-emerald-700/40">
                          <span className="block text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Relay Provider</span>
                          <span className="font-bold uppercase text-amber-300">{formData.smtp_provider}</span>
                        </div>
                        <div className="bg-emerald-900/50 p-2 rounded-lg border border-emerald-700/40">
                          <span className="block text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Host &amp; Port</span>
                          <span className="font-mono truncate block text-slate-200">{formData.smtp_host}:{formData.smtp_port}</span>
                        </div>
                        <div className="bg-emerald-900/50 p-2 rounded-lg border border-emerald-700/40">
                          <span className="block text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Time (PHT)</span>
                          <span className="text-slate-200">{new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                        </div>
                      </div>

                      <div className="pt-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setIsLiveViewerOpen(true)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-800/80 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>View Live Render &amp; Transmission Log</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="pt-2 border-t border-rose-800/60 space-y-2">
                      <p className="text-[11px] text-rose-200">
                        <strong>Troubleshooting Checklist:</strong>
                      </p>
                      <ul className="list-disc list-inside text-[11px] text-rose-200/90 space-y-0.5 ml-1">
                        <li>Ensure <strong>Host</strong> is <code className="text-white bg-rose-900/60 px-1 py-0.5 rounded">smtp.hostinger.com</code></li>
                        <li>Ensure <strong>Port</strong> is <code className="text-white bg-rose-900/60 px-1 py-0.5 rounded">465</code> (SSL/TLS enabled)</li>
                        <li>Ensure <strong>Username</strong> matches full mailbox email (<code className="text-white bg-rose-900/60 px-1 py-0.5 rounded">info@slimdoseph.com</code>)</li>
                        <li>Confirm the password matches your Hostinger Webmail login exactly</li>
                      </ul>
                      <div className="pt-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setIsLiveViewerOpen(true)}
                          className="px-3 py-1.5 rounded-lg bg-rose-900 hover:bg-rose-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>Inspect Outbound Payload &amp; Headers</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Live Realtime Outbound Email Delivery Inspector Modal */}
      <LiveEmailViewerModal
        isOpen={isLiveViewerOpen}
        onClose={() => setIsLiveViewerOpen(false)}
        recipientEmail={liveViewerData.recipientEmail}
        senderEmail={liveViewerData.senderEmail}
        senderName={liveViewerData.senderName}
        subject={liveViewerData.subject}
        htmlContent={liveViewerData.htmlContent}
        provider={liveViewerData.provider}
        host={liveViewerData.host}
        port={liveViewerData.port}
        referenceId={liveViewerData.referenceId}
        isSending={isSendingTest}
      />
    </div>
  );
};

export default SiteSettingsManager;
