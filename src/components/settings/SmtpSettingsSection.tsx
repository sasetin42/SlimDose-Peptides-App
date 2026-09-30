import React, { useState } from 'react';
import {
  Mail,
  Server,
  Lock,
  Eye,
  EyeOff,
  Check,
  Save,
  Loader2,
  AlertCircle,
  Sparkles,
  Send,
  Radio,
  Clock,
  Trash2,
  CheckCircle2,
  XCircle,
  Globe,
} from 'lucide-react';
import { EmailLogEntry } from '../../services/emailService';

interface Props {
  formData: any;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  handleProviderPreset: (preset: string) => void;
  handleTestConnection: () => Promise<void>;
  handleSendTestEmail: () => Promise<void>;
  onSave: () => Promise<void>;
  isSaving: boolean;
  isTestingConnection: boolean;
  isSendingTest: boolean;
  connectionTestResult: any;
  sendTestResult: any;
  testEmailRecipient: string;
  setTestEmailRecipient: (val: string) => void;
  testEmailSubject: string;
  setTestEmailSubject: (val: string) => void;
  testEmailMessage: string;
  setTestEmailMessage: (val: string) => void;
  activityLogs: EmailLogEntry[];
  onClearLogs: () => void;
  onInspectLog: (log: EmailLogEntry) => void;
  onNavigateToEmailTemplates?: () => void;
}

export const SmtpSettingsSection: React.FC<Props> = ({
  formData,
  onChange,
  setFormData,
  handleProviderPreset,
  handleTestConnection,
  handleSendTestEmail,
  onSave,
  isSaving,
  isTestingConnection,
  isSendingTest,
  connectionTestResult,
  sendTestResult,
  testEmailRecipient,
  setTestEmailRecipient,
  testEmailSubject,
  setTestEmailSubject,
  testEmailMessage,
  setTestEmailMessage,
  activityLogs,
  onClearLogs,
  onInspectLog,
  onNavigateToEmailTemplates,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#3C6CA8] shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                SMTP EMAIL INTEGRATION
              </h2>
              <p className="text-xs text-slate-500">
                Manage and configure your email delivery service.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (onNavigateToEmailTemplates) {
                  onNavigateToEmailTemplates();
                } else {
                  window.location.hash = 'email-templates';
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#3C6CA8]" />
              <span>Email Templates Matrix</span>
            </button>
          </div>
        </div>

        {/* 1. REAL-TIME SMTP CONNECTION STATUS CARD */}
        <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Real-Time Connection Status
            </span>

            {/* Status Badges */}
            <div className="flex items-center gap-2">
              {formData.smtp_status === 'connected' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  🟢 Connected & Authenticated
                </span>
              )}
              {formData.smtp_status === 'testing' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300">
                  <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
                  🟡 Testing Handshake...
                </span>
              )}
              {formData.smtp_status === 'sending' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-800 border border-blue-300">
                  <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                  🟡 Dispatching Email...
                </span>
              )}
              {formData.smtp_status === 'auth_failed' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  🔴 Authentication Failed
                </span>
              )}
              {formData.smtp_status === 'config_error' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  🔴 Configuration Error
                </span>
              )}
              {formData.smtp_status === 'sending_failed' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  🔴 Email Sending Failed
                </span>
              )}
              {(!formData.smtp_status || formData.smtp_status === 'disconnected') && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-slate-200 text-slate-700">
                  🔴 Disconnected / Untested
                </span>
              )}
            </div>
          </div>

          {/* Status Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
            <div className="bg-white p-2.5 rounded-xl border border-slate-200">
              <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">SMTP Server</span>
              <span className="font-mono text-slate-900 font-bold block truncate mt-0.5">
                {formData.smtp_host || 'Not Set'}
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200">
              <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Port & Security</span>
              <span className="font-semibold text-slate-900 block truncate mt-0.5">
                Port {formData.smtp_port || '465'} ({formData.smtp_encryption_type === 'ssl' ? 'SSL/TLS' : formData.smtp_encryption_type === 'starttls' ? 'STARTTLS' : 'None'})
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200">
              <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Last Test</span>
              <span className="font-medium text-slate-700 block truncate mt-0.5">
                {formData.smtp_last_tested_at || 'Never'}
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200">
              <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Last Sent</span>
              <span className="font-medium text-slate-700 block truncate mt-0.5">
                {formData.smtp_last_sent_at || 'Never'}
              </span>
            </div>
          </div>

          {/* Last Error Message Display */}
          {formData.smtp_last_error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Last Error: </span>
                <span>{formData.smtp_last_error}</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Presets */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Provider Presets</span>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { id: 'hostinger', name: 'Hostinger (Recommended)', desc: 'Port 465 SSL' },
              { id: 'gmail', name: 'Gmail / Workspace', desc: 'Port 465 SSL' },
              { id: 'brevo', name: 'Brevo', desc: 'Port 587 STARTTLS' },
              { id: 'sendgrid', name: 'SendGrid', desc: 'Port 587' },
              { id: 'smtp', name: 'Custom Relay', desc: 'Manual host/port' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleProviderPreset(p.id)}
                className={`p-2.5 rounded-xl border text-left transition ${
                  formData.smtp_provider === p.id
                    ? 'border-[#3C6CA8] bg-blue-50/70 ring-2 ring-[#3C6CA8]/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="font-bold text-xs text-slate-900">{p.name}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{p.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* SMTP SERVER CONFIGURATION */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-[#3C6CA8]" />
            <span>SMTP Server Configuration</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1 sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700">
                SMTP Host <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="smtp_host"
                value={formData.smtp_host}
                onChange={onChange}
                placeholder="e.g. smtp.hostinger.com"
                className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                SMTP Port <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="smtp_port"
                value={formData.smtp_port}
                onChange={onChange}
                placeholder="465"
                className="w-full px-3 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none font-mono"
              />
            </div>
          </div>

          {/* Encryption Type Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">Encryption Type</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'ssl', label: 'SSL / TLS', desc: 'Port 465 (Recommended)' },
                { id: 'starttls', label: 'STARTTLS', desc: 'Port 587' },
                { id: 'none', label: 'None', desc: 'Unencrypted (Port 25)' },
              ].map((enc) => {
                const isSelected = (formData.smtp_encryption_type || 'ssl') === enc.id;
                return (
                  <button
                    key={enc.id}
                    type="button"
                    onClick={() => {
                      setFormData((prev: any) => ({
                        ...prev,
                        smtp_encryption_type: enc.id,
                        smtp_secure: enc.id === 'ssl' ? 'true' : 'false',
                        smtp_port: enc.id === 'ssl' ? '465' : enc.id === 'starttls' ? '587' : '25',
                      }));
                    }}
                    className={`p-3 rounded-xl border text-left transition ${
                      isSelected
                        ? 'border-[#3C6CA8] bg-blue-50/60 ring-2 ring-[#3C6CA8]/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900">{enc.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#3C6CA8]" />}
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{enc.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Production Relay URL (Optional override for custom serverless or cloud functions) */}
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[#3C6CA8]" />
                <span>Production Relay Endpoint (Optional)</span>
              </label>
              <span className="text-[10px] text-slate-400 font-medium">
                Default: Same-origin Firebase Cloud Function (<code className="text-slate-600">/api/send-email</code>)
              </span>
            </div>
            <input
              type="text"
              name="smtp_relay_url"
              value={formData.smtp_relay_url || ''}
              onChange={onChange}
              placeholder="e.g. https://slimdose-peptides.web.app (or custom backend relay)"
              className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none font-mono"
            />
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Leave blank to automatically use the Firebase Cloud Functions rewrite bridge on <span className="font-semibold text-slate-600">slimdose-peptides.web.app</span>, or provide an external HTTPS relay URL if deployed separately.
            </p>
          </div>
        </div>

        {/* AUTHENTICATION */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#3C6CA8]" />
              <span>Authentication</span>
            </h3>

            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.smtp_auth_required !== 'false'}
                onChange={(e) =>
                  setFormData((prev: any) => ({
                    ...prev,
                    smtp_auth_required: e.target.checked ? 'true' : 'false',
                  }))
                }
                className="w-4 h-4 rounded text-[#3C6CA8] focus:ring-[#3C6CA8]"
              />
              <span className="text-xs font-bold text-slate-700">Authentication Required</span>
            </label>
          </div>

          {formData.smtp_auth_required !== 'false' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  SMTP Username <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="smtp_user"
                  value={formData.smtp_user}
                  onChange={onChange}
                  placeholder="noreply@slimdoseph.com"
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none font-mono"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    SMTP Password <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[10px] text-slate-400 hover:text-[#3C6CA8] font-bold flex items-center gap-1"
                  >
                    {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showPassword ? 'Hide' : 'Reveal'}</span>
                  </button>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="smtp_pass"
                  value={formData.smtp_pass}
                  onChange={onChange}
                  placeholder="••••••••••••••••"
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none font-mono"
                />
              </div>
            </div>
          )}
        </div>

        {/* SENDER INFORMATION */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-[#3C6CA8]" />
            <span>Sender Information</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                From Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="smtp_from_name"
                value={formData.smtp_from_name}
                onChange={onChange}
                placeholder="SlimDose Peptides"
                className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                From Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                name="smtp_from_email"
                value={formData.smtp_from_email}
                onChange={onChange}
                placeholder="noreply@slimdoseph.com"
                className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">Reply-To Email Address</label>
              <input
                type="email"
                name="smtp_reply_to_email"
                value={formData.smtp_reply_to_email}
                onChange={onChange}
                placeholder="support@slimdose.ph"
                className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none font-mono"
              />
            </div>
          </div>
        </div>

        {/* MAIN ACTION BUTTONS: Save & Test Connection */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving || isTestingConnection || isSendingTest}
            className="px-5 py-2.5 rounded-xl bg-[#3C6CA8] hover:bg-[#315A8E] text-white text-xs font-black transition flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving SMTP Configuration...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save SMTP Configuration</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTestingConnection || isSaving || isSendingTest}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isTestingConnection ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                <span>Testing SMTP Connection...</span>
              </>
            ) : (
              <>
                <Radio className="w-4 h-4 text-emerald-400" />
                <span>Test SMTP Connection</span>
              </>
            )}
          </button>
        </div>

        {/* CONNECTION TEST RESULT ACCORDION */}
        {connectionTestResult && (
          <div
            className={`p-4 rounded-xl text-xs space-y-2 border ${
              connectionTestResult.success
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                : 'bg-rose-50/80 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-2 font-black">
              {connectionTestResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600" />
              )}
              <span>{connectionTestResult.message}</span>
            </div>
            {connectionTestResult.details && (
              <pre className="p-2.5 rounded-lg bg-black/5 text-[11px] font-mono overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(connectionTestResult.details, null, 2)}
              </pre>
            )}
          </div>
        )}

        {/* SEND TEST EMAIL */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-[#3C6CA8]" />
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Send Test Email
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                Recipient Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                value={testEmailRecipient}
                onChange={(e) => setTestEmailRecipient(e.target.value)}
                placeholder="recipient@example.com"
                className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">Optional Subject</label>
              <input
                type="text"
                value={testEmailSubject}
                onChange={(e) => setTestEmailSubject(e.target.value)}
                placeholder="[SlimDose] Hostinger SMTP Verification"
                className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">Optional Message</label>
            <textarea
              rows={2}
              value={testEmailMessage}
              onChange={(e) => setTestEmailMessage(e.target.value)}
              placeholder="Optional test message body or instructions..."
              className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none resize-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSendTestEmail}
              disabled={isSendingTest || isSaving}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isSendingTest ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending test email...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Test Email</span>
                </>
              )}
            </button>
          </div>

          {/* Test Email Result Feedback Banner */}
          {sendTestResult && (
            <div
              className={`p-4 rounded-xl text-xs space-y-2 border animate-in fade-in duration-150 ${
                sendTestResult.success
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50/80 border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-2 font-black">
                {sendTestResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>
                  {sendTestResult.success
                    ? 'Test email successfully submitted to the SMTP server.'
                    : 'Test email failed.'}
                </span>
              </div>
              <div className="text-[11px] space-y-1 text-slate-700 font-mono">
                <div><strong>Recipient:</strong> {testEmailRecipient}</div>
                {sendTestResult.provider && <div><strong>SMTP Server:</strong> {sendTestResult.provider}</div>}
                <div><strong>Date & Time:</strong> {sendTestResult.sentAt}</div>
                <div><strong>Status:</strong> {sendTestResult.success ? 'Accepted by SMTP Server' : (sendTestResult.message || 'Failed')}</div>
              </div>
            </div>
          )}
        </div>

        {/* RECENT EMAIL ACTIVITY (SMTP LOGS) */}
        <div className="space-y-3 pt-6 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#3C6CA8]" />
              <span>Recent Email Activity</span>
            </h3>
            {activityLogs.length > 0 && (
              <button
                type="button"
                onClick={onClearLogs}
                className="text-[11px] text-rose-600 hover:underline inline-flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Clear Logs
              </button>
            )}
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
            {activityLogs.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                No recent email activity recorded. Real transactions will appear here.
              </div>
            ) : (
              activityLogs.slice(0, 10).map((log) => {
                const isAccepted = log.status === 'accepted' || log.status === 'sent';
                const isFailed = log.status === 'failed';
                const isSending = log.status === 'sending';
                return (
                  <div
                    key={log.id}
                    onClick={() => onInspectLog(log)}
                    className="p-3 hover:bg-slate-50 transition cursor-pointer flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {isSending && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 shrink-0" />}
                      {isAccepted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                      {isFailed && <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                      <span className="font-semibold text-slate-800 truncate">{log.recipient}</span>
                      <span className="text-slate-400 font-mono text-[11px] truncate max-w-[200px] hidden sm:inline">
                        {log.subject}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isSending
                            ? 'bg-blue-100 text-blue-800'
                            : isAccepted
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {isSending ? 'Sending' : isAccepted ? 'Accepted by SMTP Server' : 'Failed'}
                      </span>
                      <span className="text-slate-400 text-[10px] hidden sm:inline">{log.timestamp}</span>
                      <span className="text-xs text-[#3C6CA8] font-bold hover:underline">View Details</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
