import React from 'react';
import { SiteSettings } from '../../types';
import { Building2, Mail, Phone, MapPin, ShieldCheck, MessageSquare, Send, Globe, Users } from 'lucide-react';

interface Props {
  formData: Partial<SiteSettings>;
  onChange: (updates: Partial<SiteSettings>) => void;
}

export const CompanyContactSettings: React.FC<Props> = ({ formData, onChange }) => {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
          <Building2 className="w-5 h-5 text-emerald-600" />
          Company & Legal Profile
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Manage your registered business identity, tax numbers, legal jurisdiction, and corporate details.
        </p>
      </div>

      {/* Legal Identity Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <h3 className="text-base font-semibold text-slate-900">Corporate & Tax Registration</h3>
          </div>
          <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-medium">
            Official Records
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Registered Legal Entity Name
            </label>
            <input
              type="text"
              value={formData.company_legal_name || ''}
              onChange={(e) => onChange({ company_legal_name: e.target.value })}
              placeholder="e.g., SlimDose Health Solutions Inc."
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              DTI / SEC Registration Number
            </label>
            <input
              type="text"
              value={formData.company_registration_no || ''}
              onChange={(e) => onChange({ company_registration_no: e.target.value })}
              placeholder="e.g., CS2024098765"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Taxpayer Identification Number (TIN)
            </label>
            <input
              type="text"
              value={formData.company_tin || ''}
              onChange={(e) => onChange({ company_tin: e.target.value })}
              placeholder="e.g., 009-876-543-00000"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              FDA LTO / Medical Distributor License
            </label>
            <input
              type="text"
              value={formData.fda_lto_number || ''}
              onChange={(e) => onChange({ fda_lto_number: e.target.value })}
              placeholder="e.g., CDRR-NCR-DI/W-123456"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            Registered Business Address
          </label>
          <textarea
            rows={2}
            value={formData.company_registered_address || ''}
            onChange={(e) => onChange({ company_registered_address: e.target.value })}
            placeholder="Complete street address, Building, Unit/Floor, City, Metro Manila, Philippines"
            className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition resize-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Operating Hours / Support Availability
            </label>
            <input
              type="text"
              value={formData.business_hours || ''}
              onChange={(e) => onChange({ business_hours: e.target.value })}
              placeholder="e.g., Mon - Sat: 9:00 AM - 6:00 PM PHT"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Primary Hotline / Phone
            </label>
            <input
              type="text"
              value={formData.contact_phone || ''}
              onChange={(e) => onChange({ contact_phone: e.target.value })}
              placeholder="e.g., +63 917 123 4567"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Primary Contact Email
            </label>
            <input
              type="email"
              value={formData.contact_email || ''}
              onChange={(e) => onChange({ contact_email: e.target.value })}
              placeholder="support@slimdose.ph"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition"
            />
          </div>
        </div>
      </div>

      {/* Multi-Channel Department Routing */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <Users className="w-4 h-4 text-emerald-600" />
            <h3 className="text-base font-semibold text-slate-900">Multi-Channel Department Routing</h3>
          </div>
          <span className="text-xs text-slate-500">
            Route inbound communications to specialized department inboxes
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-emerald-600" />
              Sales & Consultation Inquiries
            </label>
            <input
              type="email"
              value={formData.sales_email || ''}
              onChange={(e) => onChange({ sales_email: e.target.value })}
              placeholder="sales@slimdose.ph"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-emerald-600" />
              Billing & Official Receipts Email
            </label>
            <input
              type="email"
              value={formData.billing_email || ''}
              onChange={(e) => onChange({ billing_email: e.target.value })}
              placeholder="billing@slimdose.ph"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-emerald-600" />
              Doctor & Prescription Desk Email
            </label>
            <input
              type="email"
              value={formData.medical_support_email || ''}
              onChange={(e) => onChange({ medical_support_email: e.target.value })}
              placeholder="medical@slimdose.ph"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-emerald-600" />
              Legal & Compliance Escalations
            </label>
            <input
              type="email"
              value={formData.compliance_email || ''}
              onChange={(e) => onChange({ compliance_email: e.target.value })}
              placeholder="legal@slimdose.ph"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition"
            />
          </div>
        </div>
      </div>

      {/* Social & Messaging Channels */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            <h3 className="text-base font-semibold text-slate-900">Direct Messaging & Social Channels</h3>
          </div>
          <span className="text-xs text-slate-500">
            Rendered in patient header, footer, and consultation confirmations
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-sky-500" />
              Telegram Support Handle
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm">@</span>
              <input
                type="text"
                value={(formData.telegram_handle || '').replace(/^@/, '')}
                onChange={(e) => onChange({ telegram_handle: `@${e.target.value.replace(/^@/, '')}` })}
                placeholder="SlimDosePH"
                className="w-full pl-8 pr-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-500" />
              WhatsApp Business Hotline
            </label>
            <input
              type="text"
              value={formData.whatsapp_number || ''}
              onChange={(e) => onChange({ whatsapp_number: e.target.value })}
              placeholder="+63 917 123 4567"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-indigo-500" />
              Facebook Page / Messenger URL
            </label>
            <input
              type="text"
              value={formData.facebook_url || ''}
              onChange={(e) => onChange({ facebook_url: e.target.value })}
              placeholder="https://m.me/slimdoseph"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
