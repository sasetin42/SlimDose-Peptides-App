import React, { useState, useEffect, useMemo } from 'react';
import {
  Home,
  Shield,
  Search,
  Save,
  Send,
  Lock,
  Building2,
  CreditCard,
  History,
  Sliders,
  Globe,
  Database,
  Layers,
  SlidersHorizontal,
} from 'lucide-react';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { useImageUpload } from '../hooks/useImageUpload';
import { fireToast } from './ToastNotification';
import {
  sendTransactionalEmail,
  testSmtpConnection,
  generateSmtpTestEmailHtml,
  getEmailActivityLogs,
  clearStoredEmailLogs,
  type EmailLogEntry,
} from '../services/emailService';
import { LiveEmailViewerModal } from './LiveEmailViewerModal';

// Subcomponents
import { BrandingSettingsSection } from './settings/BrandingSettingsSection';
import { CompanyContactSettings } from './settings/CompanyContactSettings';
import { CommerceFinanceSettings } from './settings/CommerceFinanceSettings';
import { PlatformSecuritySettings } from './settings/PlatformSecuritySettings';
import { SystemDataSettings } from './settings/SystemDataSettings';
import { AuditLogsSettings } from './settings/AuditLogsSettings';
import { SmtpSettingsSection } from './settings/SmtpSettingsSection';
import { SiteSettings } from '../types';

export type SettingsTab =
  | 'branding'
  | 'general'
  | 'company'
  | 'payments'
  | 'smtp'
  | 'platform'
  | 'system'
  | 'audit'
  | 'homepage'
  | 'notice'
  | 'seo';

interface SiteSettingsManagerProps {
  onNavigateToEmailTemplates?: () => void;
  adminEmail?: string;
  adminRole?: string;
}

interface NavItem {
  id: SettingsTab;
  label: string;
  badge?: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  category: 'Core' | 'Operations' | 'Channels' | 'Security & System';
}

const NAV_ITEMS: NavItem[] = [
  { id: 'branding', label: 'Branding & Multi-Logos', icon: Layers, description: 'Brand identity, 6 logo variants, typography & HEX palette', category: 'Core' },
  { id: 'general', label: 'General & Regional', icon: Sliders, description: 'Site identity, currency, timezone, and regional presets', category: 'Core' },
  { id: 'company', label: 'Company & Legal Profile', icon: Building2, description: 'TIN, DTI/SEC, registered address & multi-department routing', category: 'Operations' },
  { id: 'payments', label: 'Payment Links & Billing', icon: CreditCard, description: 'GCash, Maya, Bank wires, sandbox mode & 12% VAT', category: 'Operations' },
  { id: 'smtp', label: 'Email / SMTP Relay', badge: 'Active', icon: Send, description: 'Hostinger SMTP engine, live diagnostic handshake & templates', category: 'Channels' },
  { id: 'homepage', label: 'Homepage Hero Content', icon: Home, description: 'Headlines, hero badge, value propositions & accent colors', category: 'Channels' },
  { id: 'notice', label: 'Notice & Compliance Modal', icon: Shield, description: 'Research disclaimer, order cutoffs & shipping rules', category: 'Channels' },
  { id: 'seo', label: 'SEO & Google SERP Preview', icon: Globe, description: 'Search engine metadata, OpenGraph tags & live SERP simulator', category: 'Channels' },
  { id: 'platform', label: 'Platform Access & Security', badge: 'A+', icon: Lock, description: 'Maintenance mode, 2FA, session timeout & lockout policies', category: 'Security & System' },
  { id: 'system', label: 'API Keys & Backups', icon: Database, description: 'Developer keys, edge cache invalidation & JSON snapshots', category: 'Security & System' },
  { id: 'audit', label: 'Audit Trail & Logs', icon: History, description: 'Chronological activity log and security incident audit', category: 'Security & System' },
];


export const SiteSettingsManager: React.FC<SiteSettingsManagerProps> = ({
  onNavigateToEmailTemplates,
  adminEmail = 'admin@slimdose.ph',
  adminRole = 'Super Admin',
}) => {
  const { siteSettings, updateSiteSettings, refetch } = useSiteSettings();
  const { uploadImage } = useImageUpload('site-assets');

  const [activeTab, setActiveTab] = useState<SettingsTab>('branding');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // SMTP Real-Time Diagnostics State
  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [testEmailSubject, setTestEmailSubject] = useState('');
  const [testEmailMessage, setTestEmailMessage] = useState('');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<any>(null);
  const [sendTestResult, setSendTestResult] = useState<any>(null);

  // Email Activity Logs State
  const [activityLogs, setActivityLogs] = useState<EmailLogEntry[]>(() => getEmailActivityLogs());

  useEffect(() => {
    const handleLogsUpdate = (e: any) => {
      if (e.detail) {
        setActivityLogs(e.detail);
      } else {
        setActivityLogs(getEmailActivityLogs());
      }
    };
    window.addEventListener('slimdose_email_logs_updated', handleLogsUpdate);
    return () => window.removeEventListener('slimdose_email_logs_updated', handleLogsUpdate);
  }, []);

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
    port: 465 as number | string,
    referenceId: '',
    serverResponse: '' as string | undefined,
    errorMessage: '' as string | undefined,
  });

  // Master Form Data State
  const [formData, setFormData] = useState<Partial<SiteSettings>>({});
  const [initialData, setInitialData] = useState<Partial<SiteSettings> | null>(null);

  // Sync formData from hook
  useEffect(() => {
    if (siteSettings) {
      setFormData(siteSettings);
      setInitialData(siteSettings);
      setTestEmailRecipient(siteSettings.smtp_admin_email || siteSettings.support_email || 'noreply@slimdoseph.com');
    }
  }, [siteSettings]);

  // Handle updates
  const handleUpdates = (updates: Partial<SiteSettings>) => {
    setFormData((prev) => ({
      ...prev,
      ...updates,
    }));
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    handleUpdates({ [name]: value });
  };

  // Detect Unsaved Changes
  const changedFieldsCount = useMemo(() => {
    if (!initialData) return 0;
    let count = 0;
    for (const key in formData) {
      const val1 = (formData as any)[key];
      const val2 = (initialData as any)[key];
      if (val1 !== undefined && val1 !== null && val1 !== val2) {
        count++;
      }
    }
    return count;
  }, [formData, initialData]);

  const hasUnsavedChanges = changedFieldsCount > 0;

  // Presets
  const handleProviderPreset = (provider: string) => {
    if (provider === 'hostinger') {
      handleUpdates({
        smtp_provider: 'hostinger',
        smtp_host: 'smtp.hostinger.com',
        smtp_port: '465',
        smtp_secure: 'true',
        smtp_user: formData.smtp_user?.includes('@') ? formData.smtp_user : 'noreply@slimdoseph.com',
        smtp_pass: formData.smtp_pass || 'PWqa@7kQ',
        smtp_from_email: formData.smtp_from_email?.includes('@') ? formData.smtp_from_email : 'noreply@slimdoseph.com',
        smtp_from_name: 'SlimDose Peptides',
        smtp_admin_email: formData.smtp_admin_email?.includes('@') ? formData.smtp_admin_email : 'noreply@slimdoseph.com',
      });
      fireToast('Applied Hostinger SMTP preset (smtp.hostinger.com:465 SSL)', 'info');
    } else if (provider === 'gmail') {
      handleUpdates({
        smtp_provider: 'gmail',
        smtp_host: 'smtp.gmail.com',
        smtp_port: '465',
        smtp_secure: 'true',
      });
      fireToast('Applied Gmail / Google Workspace SMTP preset', 'info');
    } else if (provider === 'brevo') {
      handleUpdates({
        smtp_provider: 'brevo',
        smtp_host: 'smtp-relay.brevo.com',
        smtp_port: '587',
        smtp_secure: 'false',
      });
      fireToast('Applied Brevo SMTP preset', 'info');
    } else if (provider === 'sendgrid') {
      handleUpdates({
        smtp_provider: 'sendgrid',
        smtp_host: 'smtp.sendgrid.net',
        smtp_port: '587',
        smtp_secure: 'false',
      });
      fireToast('Applied SendGrid SMTP preset', 'info');
    } else {
      handleUpdates({ smtp_provider: 'smtp' });
      fireToast('Custom SMTP configuration selected', 'info');
    }
  };

  // Connection Handshake Test
  const handleTestConnection = async () => {
    if (!formData.smtp_host) {
      fireToast('Please enter an SMTP Host Server', 'warning');
      return;
    }

    try {
      setIsTestingConnection(true);
      setConnectionTestResult(null);
      const timestamp = new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' });

      handleUpdates({ smtp_status: 'testing' });

      const res = await testSmtpConnection({
        enabled: formData.smtp_enabled !== 'false',
        provider: formData.smtp_provider || 'hostinger',
        host: formData.smtp_host,
        port: parseInt(formData.smtp_port || '465', 10) || 465,
        encryptionType: formData.smtp_encryption_type || 'ssl',
        secure: formData.smtp_encryption_type === 'ssl' || formData.smtp_port === '465' || formData.smtp_secure === 'true',
        authRequired: formData.smtp_auth_required !== 'false',
        user: formData.smtp_user,
        pass: formData.smtp_pass,
        relayUrl: formData.smtp_relay_url,
      });

      if (res.success) {
        setConnectionTestResult({
          success: true,
          message: res.message,
          testedAt: timestamp,
          details: res.details,
        });
        handleUpdates({
          smtp_status: 'connected',
          smtp_last_tested_at: timestamp,
          smtp_last_error: '',
        });
        fireToast('SMTP Connection & Handshake Verified! 🟢', 'success');
      } else {
        const isAuthErr = res.code === 'EAUTH' || res.message.toLowerCase().includes('password') || res.message.toLowerCase().includes('auth');
        setConnectionTestResult({
          success: false,
          message: res.message,
          testedAt: timestamp,
          details: res.details,
        });
        handleUpdates({
          smtp_status: isAuthErr ? 'auth_failed' : 'disconnected',
          smtp_last_tested_at: timestamp,
          smtp_last_error: res.message,
        });
        fireToast(`SMTP Connection Failed: ${res.message}`, 'error');
      }
    } catch (err: any) {
      const errMsg = err.message || 'Error executing connection test';
      setConnectionTestResult({
        success: false,
        message: errMsg,
        testedAt: new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' }),
      });
      handleUpdates({
        smtp_status: 'config_error',
        smtp_last_error: errMsg,
      });
      fireToast(`Connection Error: ${errMsg}`, 'error');
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Test Email Dispatch
  const handleSendTestEmail = async () => {
    if (!testEmailRecipient || !testEmailRecipient.includes('@')) {
      fireToast('Please enter a valid recipient email address', 'warning');
      return;
    }

    try {
      setIsSendingTest(true);
      setSendTestResult(null);

      const timestamp = new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
      const subject = testEmailSubject.trim() || `[SlimDose] Hostinger SMTP Verification - ${timestamp}`;

      const htmlContent = generateSmtpTestEmailHtml({
        host: formData.smtp_host || 'smtp.hostinger.com',
        port: parseInt(formData.smtp_port || '465', 10) || 465,
        user: formData.smtp_user || 'noreply@slimdoseph.com',
        customMessage: testEmailMessage.trim() || undefined,
      });

      const res = await sendTransactionalEmail({
        to: testEmailRecipient.trim(),
        subject,
        html: htmlContent,
        fromEmail: formData.smtp_from_email,
        fromName: formData.smtp_from_name,
        replyTo: formData.smtp_reply_to_email,
        isTest: true,
        smtpConfig: {
          enabled: formData.smtp_enabled !== 'false',
          provider: formData.smtp_provider || 'hostinger',
          host: (formData.smtp_host || 'smtp.hostinger.com').trim(),
          port: parseInt(formData.smtp_port || '465', 10) || 465,
          encryptionType: formData.smtp_encryption_type || 'ssl',
          secure: formData.smtp_encryption_type === 'ssl' || formData.smtp_port === '465' || formData.smtp_secure === 'true',
          authRequired: formData.smtp_auth_required !== 'false',
          user: (formData.smtp_user || '').trim(),
          pass: formData.smtp_pass || '',
          fromEmail: formData.smtp_from_email || 'noreply@slimdoseph.com',
          fromName: formData.smtp_from_name || 'SlimDose Peptides',
          replyToEmail: formData.smtp_reply_to_email || formData.smtp_from_email,
          relayUrl: formData.smtp_relay_url,
        },
      });

      if (res.success) {
        setSendTestResult({
          success: true,
          message: `Test email transmitted successfully to ${testEmailRecipient.trim()}`,
          sentAt: timestamp,
          messageId: res.messageId,
          provider: res.providerUsed,
        });
        handleUpdates({
          smtp_status: 'connected',
          smtp_last_sent_at: timestamp,
          smtp_last_error: '',
        });
        fireToast(`Test email sent to ${testEmailRecipient.trim()}! 🚀`, 'success');
      } else {
        const errorMsg = res.error || 'Failed to dispatch test email';
        setSendTestResult({
          success: false,
          message: errorMsg,
          sentAt: timestamp,
        });
        handleUpdates({
          smtp_status: 'sending_failed',
          smtp_last_error: errorMsg,
        });
        fireToast(`Email Transmission Failed: ${errorMsg}`, 'error');
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Error communicating with SMTP relay.';
      setSendTestResult({
        success: false,
        message: errorMsg,
        sentAt: new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' }),
      });
      handleUpdates({
        smtp_status: 'sending_failed',
        smtp_last_error: errorMsg,
      });
      fireToast(`Delivery Error: ${errorMsg}`, 'error');
    } finally {
      setIsSendingTest(false);
    }
  };

  // Master Save Handler
  const handleSaveAll = async () => {
    try {
      setIsSaving(true);
      await updateSiteSettings(formData);
      setInitialData({ ...formData });
      await refetch();
      fireToast('System Configuration Saved & Synchronized Live! 🎉', 'success');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      fireToast(`Failed to save settings: ${error.message || 'Unknown error'}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Discard Changes
  const handleDiscardChanges = () => {
    if (confirm('Discard all unsaved changes and revert to last saved state?')) {
      if (initialData) {
        setFormData({ ...initialData });
        fireToast('All unsaved modifications discarded', 'info');
      }
    }
  };

  // JSON Backup Export
  const handleExportBackup = () => {
    const backupData = {
      version: '2.0-enterprise',
      exported_at: new Date().toISOString(),
      exported_by: adminEmail,
      settings: formData,
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `slimdose_settings_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    fireToast('System backup JSON downloaded', 'success');
  };

  // JSON Backup Import
  const handleImportBackup = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        const importedSettings = json.settings || json;
        if (typeof importedSettings === 'object' && importedSettings !== null) {
          handleUpdates(importedSettings);
          fireToast('Backup snapshot loaded! Click "Save Configuration" to apply.', 'info');
        } else {
          fireToast('Invalid backup file structure', 'error');
        }
      } catch (err: any) {
        fireToast('Failed to parse JSON file', 'error');
      }
    };
    reader.readAsText(file);
  };

  // Inspect Email Log in Live Viewer
  const handleInspectLog = (log: EmailLogEntry) => {
    setLiveViewerData({
      recipientEmail: log.recipient,
      senderEmail: formData.smtp_from_email || 'noreply@slimdoseph.com',
      senderName: formData.smtp_from_name || 'SlimDose Peptides',
      subject: log.subject,
      htmlContent: log.renderedHtml || '<div style="padding:20px;font-family:sans-serif;">No HTML recorded for this event.</div>',
      provider: log.provider || formData.smtp_provider || 'hostinger',
      host: formData.smtp_host || 'smtp.hostinger.com',
      port: parseInt(formData.smtp_port || '465', 10) || 465,
      referenceId: log.messageId || log.id,
      serverResponse: log.serverResponse,
      errorMessage: log.errorMessage,
    });
    setIsLiveViewerOpen(true);
  };

  // Filtered Nav Items based on search
  const filteredNavItems = useMemo(() => {
    if (!searchQuery.trim()) return NAV_ITEMS;
    const q = searchQuery.toLowerCase();
    return NAV_ITEMS.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <div className="space-y-6 pb-24">
      {/* Top Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Enterprise Control Center
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Settings & Configuration</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your corporate identity, multi-channel support, payment links, Hostinger SMTP, and platform security.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-center">
          <div className="text-right hidden sm:block">
            <div className="text-xs text-slate-400">Authenticated Role</div>
            <div className="text-xs font-bold text-slate-800">{adminRole} ({adminEmail})</div>
          </div>
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isSaving}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </div>

      {/* Main Split Layout: Left Navigation + Right Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Navigation Sidebar */}
        <div className="lg:col-span-3 space-y-4">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search settings..."
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl shadow-xs outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
            />
          </div>

          {/* Navigation Menu Cards */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-2 space-y-1">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition cursor-pointer ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-900 font-bold shadow-xs'
                      : 'hover:bg-slate-50 text-slate-600 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <div className="truncate">
                      <div className="text-xs truncate">{item.label}</div>
                      <div className="text-[10px] text-slate-400 font-normal truncate">{item.category}</div>
                    </div>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 ${
                      isActive ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Active Tab Content */}
        <div className="lg:col-span-9 min-h-[600px]">
          {/* TAB 1: Branding & Multi-Logos */}
          {activeTab === 'branding' && (
            <BrandingSettingsSection
              formData={formData}
              onChange={handleUpdates}
              onUploadLogo={async (field, file) => {
                const url = await uploadImage(file);
                if (url) {
                  handleUpdates({ [field]: url });
                  fireToast(`Uploaded logo variant!`, 'success');
                }
              }}
            />
          )}

          {/* TAB 2: General & Regional */}
          {activeTab === 'general' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
                  <Sliders className="w-5 h-5 text-emerald-600" />
                  General & Regional Settings
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Configure site naming, regional currency, timezone, and operating hours.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Site Display Name
                  </label>
                  <input
                    type="text"
                    value={formData.site_name || ''}
                    onChange={(e) => handleUpdates({ site_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Default Currency Code
                  </label>
                  <select
                    value={formData.currency_code || 'PHP'}
                    onChange={(e) => handleUpdates({ currency_code: e.target.value, currency: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition bg-white"
                  >
                    <option value="PHP">PHP - Philippine Peso (₱)</option>
                    <option value="USD">USD - US Dollar ($)</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Site Tagline / Description
                  </label>
                  <textarea
                    rows={2}
                    value={formData.site_description || ''}
                    onChange={(e) => handleUpdates({ site_description: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Primary Hotline / Contact
                  </label>
                  <input
                    type="text"
                    value={formData.contact_phone || ''}
                    onChange={(e) => handleUpdates({ contact_phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Official Support Email
                  </label>
                  <input
                    type="email"
                    value={formData.support_email || ''}
                    onChange={(e) => handleUpdates({ support_email: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Company & Legal */}
          {activeTab === 'company' && (
            <CompanyContactSettings formData={formData} onChange={handleUpdates} />
          )}

          {/* TAB 4: Payments & Billing */}
          {activeTab === 'payments' && (
            <CommerceFinanceSettings
              formData={formData}
              onChange={handleUpdates}
              onUploadImage={async (field, file) => {
                const url = await uploadImage(file);
                if (url) {
                  handleUpdates({ [field]: url });
                  fireToast(`Uploaded QR code image!`, 'success');
                }
              }}
            />
          )}

          {/* TAB 5: Email / SMTP Relay */}
          {activeTab === 'smtp' && (
            <SmtpSettingsSection
              formData={formData}
              onChange={handleInputChange}
              setFormData={setFormData}
              handleProviderPreset={handleProviderPreset}
              handleTestConnection={handleTestConnection}
              handleSendTestEmail={handleSendTestEmail}
              onSave={handleSaveAll}
              isSaving={isSaving}
              isTestingConnection={isTestingConnection}
              isSendingTest={isSendingTest}
              connectionTestResult={connectionTestResult}
              sendTestResult={sendTestResult}
              testEmailRecipient={testEmailRecipient}
              setTestEmailRecipient={setTestEmailRecipient}
              testEmailSubject={testEmailSubject}
              setTestEmailSubject={setTestEmailSubject}
              testEmailMessage={testEmailMessage}
              setTestEmailMessage={setTestEmailMessage}
              activityLogs={activityLogs}
              onClearLogs={() => {
                clearStoredEmailLogs();
                setActivityLogs([]);
                fireToast('Cleared email logs', 'info');
              }}
              onInspectLog={handleInspectLog}
              onNavigateToEmailTemplates={onNavigateToEmailTemplates}
            />
          )}

          {/* TAB 6: Platform Access & Security */}
          {activeTab === 'platform' && (
            <PlatformSecuritySettings formData={formData} onChange={handleUpdates} />
          )}

          {/* TAB 7: System & API Keys */}
          {activeTab === 'system' && (
            <SystemDataSettings
              formData={formData}
              onChange={handleUpdates}
              onExportBackup={handleExportBackup}
              onImportBackup={handleImportBackup}
            />
          )}

          {/* TAB 8: Audit Trail */}
          {activeTab === 'audit' && <AuditLogsSettings />}

          {/* TAB 9: Homepage Hero */}
          {activeTab === 'homepage' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
                  <Home className="w-5 h-5 text-emerald-600" />
                  Homepage Hero Content
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Customize the hero section banner, value badges, and headline accents on the patient landing page.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Hero Badge Text
                  </label>
                  <input
                    type="text"
                    value={formData.hero_badge_text || ''}
                    onChange={(e) => handleUpdates({ hero_badge_text: e.target.value })}
                    placeholder="Premium Peptide Solutions"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Hero Highlight Word
                  </label>
                  <input
                    type="text"
                    value={formData.hero_title_highlight || ''}
                    onChange={(e) => handleUpdates({ hero_title_highlight: e.target.value })}
                    placeholder="Peptides"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Hero Subtitle / Description
                  </label>
                  <textarea
                    rows={3}
                    value={formData.hero_description || ''}
                    onChange={(e) => handleUpdates({ hero_description: e.target.value })}
                    placeholder="SlimDose Peptides is your all-in-one destination for high-quality peptides, peptide pens, and essential accessories..."
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 10: Important Notice Modal */}
          {activeTab === 'notice' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
                  <Shield className="w-5 h-5 text-emerald-600" />
                  Compliance & Important Notice Modal
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Manage the required patient disclaimer modal shown before entering or placing orders.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Notice Title
                  </label>
                  <input
                    type="text"
                    value={formData.notice_title || ''}
                    onChange={(e) => handleUpdates({ notice_title: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Warning Pill Banner
                  </label>
                  <input
                    type="text"
                    value={formData.notice_warning_pill || ''}
                    onChange={(e) => handleUpdates({ notice_warning_pill: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition font-semibold text-rose-700"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Disclaimer Paragraph
                  </label>
                  <textarea
                    rows={3}
                    value={formData.notice_disclaimer_p1 || ''}
                    onChange={(e) => handleUpdates({ notice_disclaimer_p1: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 11: SEO & SERP Preview */}
          {activeTab === 'seo' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
                  <Globe className="w-5 h-5 text-emerald-600" />
                  SEO & Google Search Simulator
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Optimize meta tags and preview real-time appearance on Google SERP results.
                </p>
              </div>

              {/* Live SERP Preview Card */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Google Search Result Preview
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-1 font-mono">
                  <span>https://slimdose.ph</span>
                  <span>›</span>
                  <span className="text-slate-400">home</span>
                </div>
                <div className="text-base font-semibold text-blue-800 hover:underline cursor-pointer">
                  {formData.meta_title || 'SlimDose Peptides — High Purity Research Solutions'}
                </div>
                <div className="text-xs text-slate-600 line-clamp-2 max-w-xl">
                  {formData.meta_description || 'Premium research peptides with third-party COA verification and nationwide delivery across the Philippines.'}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Page Title Tag (Meta Title)
                  </label>
                  <input
                    type="text"
                    value={formData.meta_title || ''}
                    onChange={(e) => handleUpdates({ meta_title: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Meta Description
                  </label>
                  <textarea
                    rows={3}
                    value={formData.meta_description || ''}
                    onChange={(e) => handleUpdates({ meta_description: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition resize-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Meta Keywords (Comma separated)
                  </label>
                  <input
                    type="text"
                    value={formData.meta_keywords || ''}
                    onChange={(e) => handleUpdates({ meta_keywords: e.target.value })}
                    placeholder="peptides, semaglutide, tirzepatide, weight loss, research"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Floating Save Bar */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-6 inset-x-0 z-50 flex justify-center px-4 animate-in slide-in-from-bottom-5 duration-200">
          <div className="bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 px-5 py-3.5 flex items-center justify-between gap-6 max-w-xl w-full">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
              <div>
                <div className="text-xs font-bold">{changedFieldsCount} Unsaved Change{changedFieldsCount > 1 ? 's' : ''}</div>
                <div className="text-[11px] text-slate-400">Save your changes to synchronize across all clients.</div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDiscardChanges}
                disabled={isSaving}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleSaveAll}
                disabled={isSaving}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving...' : 'Save All Changes'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Email Inspector Modal */}
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
        serverResponse={liveViewerData.serverResponse}
        errorMessage={liveViewerData.errorMessage}
      />
    </div>
  );
};

export default SiteSettingsManager;
