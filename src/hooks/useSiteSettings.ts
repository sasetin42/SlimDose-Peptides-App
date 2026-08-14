import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { SiteSettings } from '../types';
import { mirrorSiteSettingUpsert, mirrorSiteSettingsUpsertMany } from '../lib/convexMirror';

export const useSiteSettings = () => {
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSiteSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .order('id');

      if (error) throw error;

      const settingsData = data || [];

      // Transform the data into a more usable format
      const settings: SiteSettings = {
        site_name: settingsData.find(s => s.id === 'site_name')?.value || 'SlimDose Peptides',
        site_logo: settingsData.find(s => s.id === 'site_logo')?.value || '/assets/logo.jpeg',
        site_description: settingsData.find(s => s.id === 'site_description')?.value || '',
        currency: settingsData.find(s => s.id === 'currency')?.value || 'PHP',
        currency_code: settingsData.find(s => s.id === 'currency_code')?.value || 'PHP',
        hero_badge_text: settingsData.find(s => s.id === 'hero_badge_text')?.value || 'Premium Peptide Solutions',
        hero_title_prefix: settingsData.find(s => s.id === 'hero_title_prefix')?.value || 'Premium',
        hero_title_highlight: settingsData.find(s => s.id === 'hero_title_highlight')?.value || 'Peptides',
        hero_title_suffix: settingsData.find(s => s.id === 'hero_title_suffix')?.value || '& Essentials',
        hero_subtext: settingsData.find(s => s.id === 'hero_subtext')?.value || 'From the Lab to You — Simplifying Science, One Dose at a Time.',
        hero_tagline: settingsData.find(s => s.id === 'hero_tagline')?.value || 'Quality-tested products. Reliable performance. Trusted by our community.',
        hero_description: settingsData.find(s => s.id === 'hero_description')?.value || 'SlimDose Peptides is your all-in-one destination for high-quality peptides, peptide pens, and the essential accessories you need for a smooth and confident wellness routine.',
        hero_accent_color: settingsData.find(s => s.id === 'hero_accent_color')?.value || 'gold-500',
        popup_enabled: settingsData.find(s => s.id === 'popup_enabled')?.value || 'true',
        popup_title: settingsData.find(s => s.id === 'popup_title')?.value || '',
        popup_description: settingsData.find(s => s.id === 'popup_description')?.value || '',
        popup_link: settingsData.find(s => s.id === 'popup_link')?.value || 'none',
        popup_image: settingsData.find(s => s.id === 'popup_image')?.value || '',
        popup_countdown_enabled: settingsData.find(s => s.id === 'popup_countdown_enabled')?.value || 'false',
        popup_countdown_ends_at: settingsData.find(s => s.id === 'popup_countdown_ends_at')?.value || '',
        popup_countdown_auto_disable: settingsData.find(s => s.id === 'popup_countdown_auto_disable')?.value || 'false',
        popup_display_behavior: settingsData.find(s => s.id === 'popup_display_behavior')?.value || 'once_visitor',
        popup_page_filter: settingsData.find(s => s.id === 'popup_page_filter')?.value || 'all',
        popup_delay_seconds: settingsData.find(s => s.id === 'popup_delay_seconds')?.value || '5',
        popup_close_on_outside_click: settingsData.find(s => s.id === 'popup_close_on_outside_click')?.value || 'true',
        notice_title: settingsData.find(s => s.id === 'notice_title')?.value || 'Important Notice',
        notice_subtitle: settingsData.find(s => s.id === 'notice_subtitle')?.value || 'Please read carefully before continuing',
        notice_disclaimer_p1: settingsData.find(s => s.id === 'notice_disclaimer_p1')?.value || 'Sold strictly for research purposes only, not FDA-approved, and are not intended to diagnose, treat, cure, or prevent any disease.',
        notice_disclaimer_p2: settingsData.find(s => s.id === 'notice_disclaimer_p2')?.value || 'Improper handling or use may carry risks, including possible side effects, adverse reactions, contamination, or ineffective results.',
        notice_consult_text: settingsData.find(s => s.id === 'notice_consult_text')?.value || 'Always consult a licensed healthcare professional for health-related decisions.',
        notice_warning_pill: settingsData.find(s => s.id === 'notice_warning_pill')?.value || '✕ NO MEET UPS · NO PICK UPS · NO RUSH ORDERS',
        notice_order_days: settingsData.find(s => s.id === 'notice_order_days')?.value || 'Monday - Friday',
        notice_cutoff_time: settingsData.find(s => s.id === 'notice_cutoff_time')?.value || '5:00 PM Daily',
        notice_courier: settingsData.find(s => s.id === 'notice_courier')?.value || 'Next Day via J&T',
        notice_weekend_orders: settingsData.find(s => s.id === 'notice_weekend_orders')?.value || 'Processed Mondays',
        notice_agree_button_text: settingsData.find(s => s.id === 'notice_agree_button_text')?.value || 'I Understand & Agree'
      };

      setSiteSettings(settings);
    } catch (err) {
      console.error('Error fetching site settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch site settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSiteSetting = async (id: string, value: string) => {
    try {
      setError(null);

      const { error } = await supabase
        .from('site_settings')
        .update({ value })
        .eq('id', id);

      if (error) throw error;

      mirrorSiteSettingUpsert(id, value);

      // Refresh the settings
      await fetchSiteSettings();
    } catch (err) {
      console.error('Error updating site setting:', err);
      setError(err instanceof Error ? err.message : 'Failed to update site setting');
      throw err;
    }
  };

  const updateSiteSettings = async (updates: Partial<SiteSettings>) => {
    try {
      setError(null);

      const upsertData = Object.entries(updates).map(([key, value]) => ({
        id: key,
        value: String(value),
        type: 'string', // Default type
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('site_settings')
        .upsert(upsertData);

      if (error) throw error;

      mirrorSiteSettingsUpsertMany(
        upsertData.map((d) => ({ id: d.id, value: d.value, type: d.type })),
      );

      // Refresh the settings
      await fetchSiteSettings();
    } catch (err) {
      console.error('Error updating site settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to update site settings');
      throw err;
    }
  };

  useEffect(() => {
    fetchSiteSettings();
  }, []);

  return {
    siteSettings,
    loading,
    error,
    updateSiteSetting,
    updateSiteSettings,
    refetch: fetchSiteSettings
  };
};
