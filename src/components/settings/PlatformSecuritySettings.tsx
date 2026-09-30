import React from 'react';
import { SiteSettings } from '../../types';
import { Shield, Lock, AlertTriangle, Clock, EyeOff } from 'lucide-react';

interface Props {
  formData: Partial<SiteSettings>;
  onChange: (updates: Partial<SiteSettings>) => void;
}

export const PlatformSecuritySettings: React.FC<Props> = ({ formData, onChange }) => {
  // Compute dynamic security health score
  const calculateHealthScore = () => {
    let score = 50; // base score with HTTPS & Supabase Auth
    if (formData.security_2fa_required === 'true') score += 20;
    if (formData.enforce_strong_passwords !== 'false') score += 15;
    if (Number(formData.max_login_attempts ?? 5) <= 5) score += 10;
    if (Number(formData.session_timeout_minutes ?? 60) <= 60) score += 5;
    return Math.min(score, 100);
  };

  const healthScore = calculateHealthScore();

  return (
    <div className="space-y-8">
      {/* Header & Health Gauge */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-2xl text-white shadow-md">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Shield className="w-4 h-4" />
            Security & Platform Governance
          </div>
          <h2 className="text-xl font-bold">Platform Access, Lockouts & Security Shield</h2>
          <p className="text-sm text-slate-300 mt-1 max-w-xl">
            Control maintenance windows, multi-factor authentication requirements, session lifespans, and access control.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-white/10 px-5 py-4 rounded-xl backdrop-blur-sm border border-white/10">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <svg className="w-16 h-16 transform -rotate-90">
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="currentColor"
                strokeWidth="6"
                className="text-white/20"
                fill="transparent"
              />
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="currentColor"
                strokeWidth="6"
                className={healthScore >= 80 ? 'text-emerald-400' : 'text-amber-400'}
                strokeDasharray={176}
                strokeDashoffset={176 - (176 * healthScore) / 100}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <span className="absolute text-base font-bold">{healthScore}%</span>
          </div>
          <div>
            <div className="text-xs text-slate-300 font-medium">Security Grade</div>
            <div className="text-base font-bold text-emerald-300">
              {healthScore >= 85 ? 'Grade A+ (Optimal)' : healthScore >= 70 ? 'Grade B (Good)' : 'Needs Hardening'}
            </div>
            <div className="text-[11px] text-slate-400">HIPAA & PhilHealth aligned</div>
          </div>
        </div>
      </div>

      {/* Maintenance Mode Controller */}
      <div className={`bg-white rounded-2xl border p-6 shadow-sm space-y-6 transition ${
        formData.maintenance_mode === 'true' ? 'border-amber-400 ring-4 ring-amber-400/10' : 'border-slate-200/80'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-xl ${formData.maintenance_mode === 'true' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-slate-900">Emergency Maintenance Mode</h3>
                {formData.maintenance_mode === 'true' && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500 text-white animate-pulse">
                    ACTIVE NOW
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                When enabled, visitors will see a maintenance banner/screen. Authenticated admins can still access.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.maintenance_mode === 'true'}
              onChange={(e) => onChange({ maintenance_mode: String(e.target.checked) })}
              className="sr-only peer"
            />
            <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
          </label>
        </div>

        {formData.maintenance_mode === 'true' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Maintenance Notice Title
              </label>
              <input
                type="text"
                value={formData.maintenance_title || ''}
                onChange={(e) => onChange({ maintenance_title: e.target.value })}
                placeholder="Scheduled System Upgrade"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Expected Completion / ETA
              </label>
              <input
                type="text"
                value={formData.maintenance_eta || ''}
                onChange={(e) => onChange({ maintenance_eta: e.target.value })}
                placeholder="e.g., Today at 6:00 PM PHT"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Public Maintenance Message
              </label>
              <textarea
                rows={2}
                value={formData.maintenance_message || ''}
                onChange={(e) => onChange({ maintenance_message: e.target.value })}
                placeholder="We are upgrading our clinical dispensing platform to serve you better. We will be back shortly."
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition resize-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Allowed IP Whitelist (Bypasses Maintenance Screen)
              </label>
              <input
                type="text"
                value={formData.maintenance_allowed_ips || ''}
                onChange={(e) => onChange({ maintenance_allowed_ips: e.target.value })}
                placeholder="Comma separated IPs: e.g., 120.29.112.4, 112.198.88.10"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition font-mono text-xs"
              />
            </div>
          </div>
        )}
      </div>

      {/* Authentication & Session Security */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-emerald-600" />
            <h3 className="text-base font-semibold text-slate-900">Authentication & Access Policies</h3>
          </div>
          <span className="text-xs bg-slate-100 text-slate-700 font-medium px-2.5 py-1 rounded-full">
            Identity Protection
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-start justify-between p-4 rounded-xl border border-slate-200 bg-slate-50/50">
            <div>
              <p className="text-sm font-semibold text-slate-900">Require Two-Factor Auth (2FA) for Admins</p>
              <p className="text-xs text-slate-500 mt-1">
                Mandates 6-digit TOTP / Authenticator code on all administrative logins.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer ml-4">
              <input
                type="checkbox"
                checked={formData.security_2fa_required === 'true'}
                onChange={(e) => onChange({ security_2fa_required: String(e.target.checked) })}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          <div className="flex items-start justify-between p-4 rounded-xl border border-slate-200 bg-slate-50/50">
            <div>
              <p className="text-sm font-semibold text-slate-900">Enforce Strong Password Requirements</p>
              <p className="text-xs text-slate-500 mt-1">
                Minimum 10 characters, upper & lowercase, special symbols, and numbers.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer ml-4">
              <input
                type="checkbox"
                checked={formData.enforce_strong_passwords !== 'false'}
                onChange={(e) => onChange({ enforce_strong_passwords: String(e.target.checked) })}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          <div className="flex items-start justify-between p-4 rounded-xl border border-slate-200 bg-slate-50/50">
            <div>
              <p className="text-sm font-semibold text-slate-900">Allow Guest Checkout & Inquiries</p>
              <p className="text-xs text-slate-500 mt-1">
                Enables new patients to submit preliminary health assessments without prior account creation.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer ml-4">
              <input
                type="checkbox"
                checked={formData.allow_guest_checkout !== 'false'}
                onChange={(e) => onChange({ allow_guest_checkout: String(e.target.checked) })}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          <div className="flex items-start justify-between p-4 rounded-xl border border-slate-200 bg-slate-50/50">
            <div>
              <p className="text-sm font-semibold text-slate-900">Enforce Prescription Upload Validation</p>
              <p className="text-xs text-slate-500 mt-1">
                Blocks GLP-1 shipment until clinical doctor prescription has been uploaded and validated.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer ml-4">
              <input
                type="checkbox"
                checked={formData.require_prescript_upload !== 'false'}
                onChange={(e) => onChange({ require_prescript_upload: String(e.target.checked) })}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Admin Inactivity Session Timeout (Minutes)
            </label>
            <input
              type="number"
              min="10"
              max="480"
              value={formData.session_timeout_minutes ?? '60'}
              onChange={(e) => onChange({ session_timeout_minutes: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition"
            />
            <p className="text-xs text-slate-400 mt-1">Auto log out administrator after inactivity period</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <EyeOff className="w-3.5 h-3.5 text-slate-400" />
              Max Failed Login Attempts Before Lockout
            </label>
            <input
              type="number"
              min="3"
              max="20"
              value={formData.max_login_attempts ?? '5'}
              onChange={(e) => onChange({ max_login_attempts: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition"
            />
            <p className="text-xs text-slate-400 mt-1">Protects against automated brute force credential stuffing</p>
          </div>
        </div>
      </div>
    </div>
  );
};
