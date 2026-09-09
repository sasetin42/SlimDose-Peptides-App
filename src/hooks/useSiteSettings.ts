import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { SiteSettings } from '../types';
import { mirrorSiteSettingUpsert, mirrorSiteSettingsUpsertMany } from '../lib/convexMirror';

const STORAGE_KEY = 'slimdose_site_settings_v1';
const SETTINGS_UPDATE_EVENT = 'slimdose_site_settings_updated';

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  site_name: 'SlimDose Peptides',
  site_logo: '/assets/logo.jpeg',
  site_description: 'Premium research peptides with third-party COA verification and nationwide delivery across the Philippines.',
  currency: 'PHP',
  currency_code: 'PHP',
  hero_badge_text: 'Premium Peptide Solutions',
  hero_title_prefix: 'Premium',
  hero_title_highlight: 'Peptides',
  hero_title_suffix: '& Essentials',
  hero_subtext: 'From the Lab to You — Simplifying Science, One Dose at a Time.',
  hero_tagline: 'Quality-tested products. Reliable performance. Trusted by our community.',
  hero_description: 'SlimDose Peptides is your all-in-one destination for high-quality peptides, peptide pens, and the essential accessories you need for a smooth and confident wellness routine.',
  hero_accent_color: '#3C6CA8',
  popup_enabled: 'true',
  popup_title: '',
  popup_description: '',
  popup_link: 'none',
  popup_image: '',
  popup_countdown_enabled: 'false',
  popup_countdown_ends_at: '',
  popup_countdown_auto_disable: 'false',
  popup_display_behavior: 'once_visitor',
  popup_page_filter: 'all',
  popup_delay_seconds: '5',
  popup_close_on_outside_click: 'true',
  notice_title: 'Important Notice',
  notice_subtitle: 'Please read carefully before continuing',
  notice_disclaimer_p1: 'Sold strictly for research purposes only, not FDA-approved, and are not intended to diagnose, treat, cure, or prevent any disease.',
  notice_disclaimer_p2: 'Improper handling or use may carry risks, including possible side effects, adverse reactions, contamination, or ineffective results.',
  notice_consult_text: 'Always consult a licensed healthcare professional for health-related decisions.',
  notice_warning_pill: '✕ NO MEET UPS · NO PICK UPS · NO RUSH ORDERS',
  notice_order_days: 'Monday - Friday',
  notice_cutoff_time: '5:00 PM Daily',
  notice_courier: 'Next Day via J&T',
  notice_weekend_orders: 'Processed Mondays',
  notice_agree_button_text: 'I Understand & Agree',
  community_telegram_url: 'https://t.me/+fGtShIUkbB84YzZl',
  support_telegram_url: 'https://telegram.me/slimdose_mnl',
  support_email: 'support@slimdose.ph',
  support_phone: '+63 977 813 2630',
  contact_phone: '+63 977 813 2630',
  contact_whatsapp: '+63 977 813 2630',
  contact_inquiry_text: 'For inquiries regarding bulk purchases, custom peptide synthesis, or laboratory test verification, please reach out to our support team.',
  operating_hours: 'Monday - Friday: 9:00 AM - 6:00 PM PHT',
  instagram_url: '',
  facebook_url: '',
  meta_title: 'SlimDose Peptides — High Purity Research Solutions',
  meta_description: 'Premium research peptides with third-party COA verification and nationwide delivery across the Philippines.',
  meta_keywords: 'peptides, slimdose, research peptides, peptide calculator, laboratory tested',
  // SMTP & Transactional Email Settings
  smtp_enabled: 'true',
  smtp_provider: 'hostinger',
  smtp_host: 'smtp.hostinger.com',
  smtp_port: '465',
  smtp_encryption_type: 'ssl',
  smtp_secure: 'true',
  smtp_auth_required: 'true',
  smtp_user: 'noreply@slimdoseph.com',
  smtp_pass: 'PWqa@7kQ',
  smtp_from_email: 'noreply@slimdoseph.com',
  smtp_from_name: 'SlimDose Peptides',
  smtp_reply_to_email: 'noreply@slimdoseph.com',
  smtp_admin_email: 'noreply@slimdoseph.com',
  smtp_send_order_receipt: 'true',
  smtp_send_admin_alert: 'true',
  smtp_send_status_update: 'true',
  smtp_status: 'disconnected',
  smtp_last_tested_at: '',
  smtp_last_sent_at: '',
  smtp_last_error: '',

  // Extended Branding & Logos
  site_logo_dark: '/assets/logo.jpeg',
  site_logo_light: '/assets/logo.jpeg',
  site_favicon: '/assets/logo.jpeg',
  site_email_logo: '/assets/logo.jpeg',
  site_invoice_logo: '/assets/logo.jpeg',
  site_admin_logo: '/assets/logo.jpeg',
  brand_primary_color: '#3C6CA8',
  brand_secondary_color: '#0B1528',
  brand_accent_color: '#3B82F6',
  brand_font_family: 'Plus Jakarta Sans',

  // Extended General & Regional
  timezone: 'Asia/Manila (PHT)',
  date_format: 'YYYY-MM-DD',
  time_format: '12-hour',
  unit_system: 'metric',
  number_format: 'standard',
  currency_symbol: '₱',

  // Company Information
  company_legal_name: 'SlimDose Philippines Inc.',
  company_trade_name: 'SlimDose Peptides',
  company_tin: '123-456-789-000',
  company_reg_number: 'CS202409871',
  company_address: 'BGC Corporate Center, 30th Street corner 11th Avenue, Bonifacio Global City',
  company_city: 'Taguig City',
  company_province: 'Metro Manila',
  company_postal_code: '1634',
  company_country: 'Philippines',
  company_phone: '+63 977 813 2630',
  company_email: 'contact@slimdoseph.com',
  company_website: 'https://slimdoseph.com',

  // Contact Profiles & Departments
  contact_sales_email: 'sales@slimdoseph.com',
  contact_sales_phone: '+63 977 813 2630',
  contact_billing_email: 'billing@slimdoseph.com',
  contact_tech_email: 'support@slimdoseph.com',
  contact_escalation_email: 'management@slimdoseph.com',

  // Payment Links & Gateway Diagnostics
  payment_links_enabled: 'true',
  payment_test_mode: 'false',
  payment_auto_confirm: 'false',
  payment_receipt_required: 'true',
  custom_checkout_redirect: '',

  // Platform & Access
  maintenance_mode: 'false',
  maintenance_heading: 'System Maintenance in Progress',
  maintenance_message: 'SlimDose is currently undergoing scheduled platform upgrades to serve you better. We will be back shortly.',
  maintenance_eta: 'Estimated: 30 minutes',
  maintenance_ip_whitelist: '127.0.0.1, ::1',
  user_registration_enabled: 'true',
  guest_checkout_enabled: 'true',
  session_timeout_minutes: '60',
  max_upload_size_mb: '10',

  // User & Roles
  default_user_role: 'customer',
  allow_role_switching: 'false',
  require_admin_approval: 'false',

  // Security & Authentication
  security_2fa_required: 'false',
  security_brute_force_protection: 'true',
  security_max_login_attempts: '5',
  security_lockout_duration_mins: '15',
  password_min_length: '8',
  password_require_symbols: 'true',
  password_require_numbers: 'true',
  security_ip_whitelist: '',
  security_ip_blacklist: '',

  // API & Webhooks
  api_enabled: 'true',
  webhook_url: '',
  webhook_secret: '',
  webhook_events: 'order.created,order.paid,order.shipped',

  // Storage & Media
  storage_provider: 'firebase',
  storage_auto_compress: 'true',
  storage_webp_conversion: 'true',
  storage_max_image_dim: '2048',

  // CDN & Caching
  cdn_enabled: 'true',
  cdn_provider: 'cloudflare',
  cdn_domain: 'cdn.slimdoseph.com',
  cdn_cache_ttl: '86400',

  // Database & Backup
  backup_auto_enabled: 'true',
  backup_frequency: 'daily',
  backup_retention_days: '30',
  backup_last_run: '',

  // Tax & Financial Settings
  tax_enabled: 'true',
  tax_rate_percent: '12',
  tax_inclusive: 'true',
  invoice_prefix: 'SD-INV-',
  receipt_prefix: 'SD-OR-',
  invoice_start_number: '1001',
  payment_terms_days: '0',

  // Configuration Snapshots & Auditing
  settings_snapshots_json: '[]',
  audit_logs_json: '[]',
};

function getInitialSettings(): SiteSettings {
  try {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          return { ...DEFAULT_SITE_SETTINGS, ...parsed };
        }
      }
    }
  } catch (e) {
    console.warn('[useSiteSettings] Parse warning:', e);
  }
  return DEFAULT_SITE_SETTINGS;
}

let cachedSiteSettings: SiteSettings | null = null;

export const useSiteSettings = () => {
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(() => {
    if (!cachedSiteSettings) {
      cachedSiteSettings = getInitialSettings();
    }
    return cachedSiteSettings;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSiteSettings = async () => {
    try {
      setError(null);
      const { data, error: fetchErr } = await supabase
        .from('site_settings')
        .select('*')
        .order('id');

      if (fetchErr) {
        console.warn('[useSiteSettings] Fetch note:', fetchErr);
      }

      const settingsData = data || [];
      const current = cachedSiteSettings || getInitialSettings();
      const updated: SiteSettings = { ...current };

      if (settingsData.length > 0) {
        settingsData.forEach((item: any) => {
          if (item && item.id && item.value !== undefined) {
            (updated as any)[item.id] = String(item.value);
          }
        });
      }

      cachedSiteSettings = updated;
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        }
      } catch (storageErr) {}

      setSiteSettings(updated);
    } catch (err) {
      console.error('[useSiteSettings] Error fetching site settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch site settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSiteSetting = async (id: string, value: string) => {
    try {
      setError(null);
      const current = siteSettings || DEFAULT_SITE_SETTINGS;
      const updated: SiteSettings = { ...current, [id]: value };

      cachedSiteSettings = updated;
      setSiteSettings(updated);
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          window.dispatchEvent(new CustomEvent(SETTINGS_UPDATE_EVENT, { detail: updated }));
        }
      } catch (storageErr) {}

      const { error: saveErr } = await supabase
        .from('site_settings')
        .upsert([{ id, value, type: 'string', updated_at: new Date().toISOString() }]);

      if (saveErr) {
        console.warn('[useSiteSettings] updateSiteSetting Supabase note:', saveErr);
      }

      mirrorSiteSettingUpsert(id, value);
    } catch (err) {
      console.error('[useSiteSettings] Error updating site setting:', err);
      setError(err instanceof Error ? err.message : 'Failed to update site setting');
      throw err;
    }
  };

  const updateSiteSettings = async (updates: Partial<SiteSettings>) => {
    try {
      setError(null);
      const current = siteSettings || DEFAULT_SITE_SETTINGS;
      const merged: SiteSettings = { ...current, ...updates };

      cachedSiteSettings = merged;
      setSiteSettings(merged);
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          window.dispatchEvent(new CustomEvent(SETTINGS_UPDATE_EVENT, { detail: merged }));
        }
      } catch (storageErr) {}

      const upsertData = Object.entries(updates).map(([key, value]) => ({
        id: key,
        value: String(value ?? ''),
        type: 'string',
        updated_at: new Date().toISOString(),
      }));

      const { error: dbErr } = await supabase
        .from('site_settings')
        .upsert(upsertData);

      if (dbErr) {
        console.warn('[useSiteSettings] updateSiteSettings Supabase note:', dbErr);
      }

      mirrorSiteSettingsUpsertMany(
        upsertData.map((d) => ({ id: d.id, value: d.value, type: d.type })),
      );

      return merged;
    } catch (err) {
      console.error('[useSiteSettings] Error updating site settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to update site settings');
      throw err;
    }
  };

  useEffect(() => {
    fetchSiteSettings();

    const handleSettingsUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<SiteSettings>;
      if (customEvent.detail) {
        setSiteSettings(customEvent.detail);
        cachedSiteSettings = customEvent.detail;
      }
    };

    window.addEventListener(SETTINGS_UPDATE_EVENT, handleSettingsUpdated);
    return () => {
      window.removeEventListener(SETTINGS_UPDATE_EVENT, handleSettingsUpdated);
    };
  }, []);

  return {
    siteSettings,
    loading,
    error,
    updateSiteSetting,
    updateSiteSettings,
    refetch: fetchSiteSettings,
  };
};
export default useSiteSettings;
