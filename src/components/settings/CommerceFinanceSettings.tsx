import React from 'react';
import { SiteSettings } from '../../types';
import { CreditCard, DollarSign, Receipt, ShieldAlert, Upload, Smartphone } from 'lucide-react';

interface Props {
  formData: Partial<SiteSettings>;
  onChange: (updates: Partial<SiteSettings>) => void;
  onUploadImage?: (field: 'gcash_qr_url' | 'maya_qr_url', file: File) => Promise<void>;
}

export const CommerceFinanceSettings: React.FC<Props> = ({ formData, onChange, onUploadImage }) => {
  const handleQrUpload = async (field: 'gcash_qr_url' | 'maya_qr_url', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (onUploadImage) {
      await onUploadImage(field, file);
    } else {
      // Fallback base64
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onChange({ [field]: event.target.result as string });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
          <CreditCard className="w-5 h-5 text-emerald-600" />
          Payment Links & Financial Configuration
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Configure payment channels (GCash, Maya, Bank), sandbox mode, BIR tax settings, and invoice sequencing.
        </p>
      </div>

      {/* Global Payment Toggle & Mode Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Direct Payment Links Engine</h3>
            <p className="text-sm text-slate-500">
              When enabled, checkout presents direct QR/account instructions and receipt verification uploads.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.payment_links_enabled !== 'false'}
              onChange={(e) => onChange({ payment_links_enabled: String(e.target.checked) })}
              className="sr-only peer"
            />
            <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>

        {/* Sandbox Test Mode Switch */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Payment Sandbox / Test Mode</p>
              <p className="text-xs text-slate-500">
                Allows testing payments with sample reference numbers without debiting real patient accounts.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onChange({ payment_sandbox_mode: formData.payment_sandbox_mode === 'true' ? 'false' : 'true' })}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
              formData.payment_sandbox_mode === 'true'
                ? 'bg-amber-500/10 text-amber-700 border-amber-300'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            {formData.payment_sandbox_mode === 'true' ? 'TEST MODE ACTIVE' : 'LIVE PRODUCTION'}
          </button>
        </div>
      </div>

      {/* GCash Configuration */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-600 font-bold text-sm">
              GC
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">GCash Merchant / QR</h3>
              <p className="text-xs text-slate-500">Primary e-wallet for Philippine patient orders</p>
            </div>
          </div>
          <span className="text-xs bg-blue-50 text-blue-700 font-medium px-2.5 py-1 rounded-full">
            E-Wallet
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              GCash Registered Account Name
            </label>
            <input
              type="text"
              value={formData.gcash_account_name || ''}
              onChange={(e) => onChange({ gcash_account_name: e.target.value })}
              placeholder="e.g., SLIMDOSE HEALTH / SASE CO"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              GCash Mobile Number
            </label>
            <input
              type="text"
              value={formData.gcash_account_number || ''}
              onChange={(e) => onChange({ gcash_account_number: e.target.value })}
              placeholder="0917 123 4567"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            GCash QR Code Image
          </label>
          <div className="flex items-center gap-4">
            {formData.gcash_qr_url ? (
              <img
                src={formData.gcash_qr_url}
                alt="GCash QR"
                className="w-24 h-24 object-contain border border-slate-200 rounded-xl p-1 bg-slate-50"
              />
            ) : (
              <div className="w-24 h-24 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 text-xs">
                <Smartphone className="w-6 h-6 mb-1 text-slate-300" />
                No QR
              </div>
            )}
            <div>
              <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition">
                <Upload className="w-4 h-4" />
                Upload QR Image
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleQrUpload('gcash_qr_url', e)}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-slate-400 mt-1.5">PNG or JPG, clean high resolution scan</p>
            </div>
          </div>
        </div>
      </div>

      {/* Maya Configuration */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/10 flex items-center justify-center text-emerald-600 font-bold text-sm">
              MY
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Maya Merchant / QR</h3>
              <p className="text-xs text-slate-500">PayMaya e-wallet & digital banking QR channel</p>
            </div>
          </div>
          <span className="text-xs bg-emerald-50 text-emerald-700 font-medium px-2.5 py-1 rounded-full">
            E-Wallet
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Maya Account Name
            </label>
            <input
              type="text"
              value={formData.maya_account_name || ''}
              onChange={(e) => onChange({ maya_account_name: e.target.value })}
              placeholder="e.g., SLIMDOSE CLINIC"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Maya Mobile Number
            </label>
            <input
              type="text"
              value={formData.maya_account_number || ''}
              onChange={(e) => onChange({ maya_account_number: e.target.value })}
              placeholder="0918 765 4321"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Maya QR Code Image
          </label>
          <div className="flex items-center gap-4">
            {formData.maya_qr_url ? (
              <img
                src={formData.maya_qr_url}
                alt="Maya QR"
                className="w-24 h-24 object-contain border border-slate-200 rounded-xl p-1 bg-slate-50"
              />
            ) : (
              <div className="w-24 h-24 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 text-xs">
                <Smartphone className="w-6 h-6 mb-1 text-slate-300" />
                No QR
              </div>
            )}
            <div>
              <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition">
                <Upload className="w-4 h-4" />
                Upload QR Image
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleQrUpload('maya_qr_url', e)}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-slate-400 mt-1.5">PNG or JPG, clean high resolution scan</p>
            </div>
          </div>
        </div>
      </div>

      {/* Direct Bank Transfer (BDO, BPI, UnionBank) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <h3 className="text-base font-semibold text-slate-900">Commercial Bank Wire / Transfer</h3>
          </div>
          <span className="text-xs bg-slate-100 text-slate-700 font-medium px-2.5 py-1 rounded-full">
            Direct Bank
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Bank Institution
            </label>
            <input
              type="text"
              value={formData.bank_name || ''}
              onChange={(e) => onChange({ bank_name: e.target.value })}
              placeholder="e.g., BDO Unibank / BPI"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Bank Account Name
            </label>
            <input
              type="text"
              value={formData.bank_account_name || ''}
              onChange={(e) => onChange({ bank_account_name: e.target.value })}
              placeholder="e.g., SlimDose Health Solutions Inc."
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Bank Account Number
            </label>
            <input
              type="text"
              value={formData.bank_account_number || ''}
              onChange={(e) => onChange({ bank_account_number: e.target.value })}
              placeholder="0012 3456 7890"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Bank Payment Instructions & Verification Note
          </label>
          <textarea
            rows={2}
            value={formData.bank_instructions || ''}
            onChange={(e) => onChange({ bank_instructions: e.target.value })}
            placeholder="Please include your Order ID in the transfer remarks/notes. Upload your screenshot confirmation once done."
            className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition resize-none"
          />
        </div>
      </div>

      {/* Tax & Financial Sequencing */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <Receipt className="w-4 h-4 text-emerald-600" />
            <h3 className="text-base font-semibold text-slate-900">Tax Rates & Official Receipt Sequencing</h3>
          </div>
          <span className="text-xs bg-emerald-50 text-emerald-700 font-medium px-2.5 py-1 rounded-full">
            BIR Compliance
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Value-Added Tax (VAT) %
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.tax_rate_percent ?? '12'}
                onChange={(e) => onChange({ tax_rate_percent: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition pr-8"
              />
              <span className="absolute right-3.5 top-2.5 text-slate-400 text-sm">%</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Standard PH VAT rate is 12%</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Invoice Prefix
            </label>
            <input
              type="text"
              value={formData.invoice_prefix || 'SD-INV-'}
              onChange={(e) => onChange({ invoice_prefix: e.target.value })}
              placeholder="SD-INV-"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition font-mono"
            />
            <p className="text-xs text-slate-400 mt-1">e.g. SD-INV-2026-0001</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Official Receipt (OR) Prefix
            </label>
            <input
              type="text"
              value={formData.or_prefix || 'SD-OR-'}
              onChange={(e) => onChange({ or_prefix: e.target.value })}
              placeholder="SD-OR-"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition font-mono"
            />
            <p className="text-xs text-slate-400 mt-1">e.g. SD-OR-2026-0001</p>
          </div>
        </div>

        <div className="pt-2 flex items-center gap-3">
          <input
            type="checkbox"
            id="vat_inclusive"
            checked={formData.vat_inclusive !== 'false'}
            onChange={(e) => onChange({ vat_inclusive: String(e.target.checked) })}
            className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <label htmlFor="vat_inclusive" className="text-sm text-slate-700 font-medium cursor-pointer">
            Prices displayed on site are VAT-inclusive
          </label>
        </div>
      </div>
    </div>
  );
};
