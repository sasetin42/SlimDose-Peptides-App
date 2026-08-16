import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit, Trash2, Save, X, ArrowLeft, CreditCard } from 'lucide-react';
import { usePaymentMethods, PaymentMethod } from '../hooks/usePaymentMethods';
import ImageUpload from './ImageUpload';

interface PaymentMethodManagerProps {
  onBack: () => void;
  adminEmail?: string;
  adminRole?: string;
}

const PaymentMethodManager: React.FC<PaymentMethodManagerProps> = ({
  onBack,
  adminEmail = 'admin@slimdose.ph',
  adminRole = 'admin'
}) => {
  const { paymentMethods, addPaymentMethod, updatePaymentMethod, deletePaymentMethod, refetchAll } = usePaymentMethods();
  const [currentView, setCurrentView] = useState<'list' | 'add' | 'edit'>('list');
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    account_number: '',
    account_name: '',
    qr_code_url: '',
    active: true,
    sort_order: 0
  });

  const logAction = async (action: string, details?: any) => {
    try {
      await supabase.from('admin_audit_logs').insert([{
        user_email: adminEmail,
        user_role: adminRole,
        action,
        details
      }]);
    } catch (e) {
      // Non-critical audit log warning
    }
  };

  React.useEffect(() => {
    refetchAll();
  }, []);

  const handleAddMethod = () => {
    const nextSortOrder = Math.max(...paymentMethods.map(m => m.sort_order), 0) + 1;
    setFormData({
      id: '',
      name: '',
      account_number: '',
      account_name: '',
      qr_code_url: '',
      active: true,
      sort_order: nextSortOrder
    });
    setCurrentView('add');
  };

  const handleEditMethod = (method: PaymentMethod) => {
    setEditingMethod(method);
    setFormData({
      id: method.id,
      name: method.name,
      account_number: method.account_number,
      account_name: method.account_name,
      qr_code_url: method.qr_code_url,
      active: method.active,
      sort_order: method.sort_order
    });
    setCurrentView('edit');
  };

  const handleDeleteMethod = async (id: string) => {
    if (confirm('Are you sure you want to delete this payment method?')) {
      const methodToDelete = paymentMethods.find(m => m.id === id);
      try {
        await deletePaymentMethod(id);
        logAction('delete_payment_method', { id, name: methodToDelete?.name });
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to delete payment method');
      }
    }
  };

  const handleSaveMethod = async () => {
    if (!formData.id || !formData.name || !formData.account_number || !formData.account_name) {
      alert('Please fill in all required fields (ID, Name, Account Number, and Account Name)');
      return;
    }

    // QR code is optional - if missing, a placeholder will be used
    // (Database requires NOT NULL, so we use a placeholder image)

    // Validate ID format (kebab-case)
    const idRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
    if (!idRegex.test(formData.id)) {
      alert('Payment method ID must be in kebab-case format (e.g., "gcash", "bank-transfer")');
      return;
    }

    try {
      // Prepare data for saving - ensure qr_code_url is properly formatted
      const saveData = {
        ...formData,
        qr_code_url: formData.qr_code_url?.trim() || '', // Normalize qr_code_url
      };

      console.log('💾 Saving payment method:', {
        id: saveData.id,
        name: saveData.name,
        qr_code_url: saveData.qr_code_url,
        qr_code_url_length: saveData.qr_code_url.length,
      });

      if (editingMethod) {
        await updatePaymentMethod(editingMethod.id, saveData);
        logAction('update_payment_method', { id: editingMethod.id, name: saveData.name, previous: editingMethod, new: saveData });
      } else {
        await addPaymentMethod(saveData);
        logAction('create_payment_method', { id: saveData.id, name: saveData.name, data: saveData });
      }

      console.log('✅ Payment method saved successfully');
      setCurrentView('list');
      setEditingMethod(null);
    } catch (error) {
      console.error('❌ Error saving payment method:', error);
      alert(error instanceof Error ? error.message : 'Failed to save payment method');
    }
  };

  const handleCancel = () => {
    setCurrentView('list');
    setEditingMethod(null);
  };

  const generateIdFromName = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      id: currentView === 'add' ? generateIdFromName(name) : formData.id
    });
  };

  // Form View (Add/Edit)
  if (currentView === 'add' || currentView === 'edit') {
    return (
      <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 font-inter">
        <div className="bg-white dark:bg-slate-900 shadow-xs border-b border-slate-200/80 dark:border-slate-800">
          <div className="max-w-4xl mx-auto px-3 sm:px-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-3.5 sm:py-4">
              <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-1 text-slate-600 dark:text-slate-400 hover:text-[#3C6CA8] transition-colors duration-200 font-bold text-xs sm:text-sm px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back</span>
                </button>
                <div className="h-4 w-[1px] bg-slate-300 dark:bg-slate-700 hidden sm:block" />
                <h1 className="text-base sm:text-xl font-extrabold text-[#232323] dark:text-white truncate">
                  {currentView === 'add' ? 'Add Payment Method' : 'Edit Payment Method'}
                </h1>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleCancel}
                  className="flex-1 sm:flex-none px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                  <span>Cancel</span>
                </button>
                <button
                  onClick={handleSaveMethod}
                  className="flex-1 sm:flex-none px-4 py-2 bg-[#3C6CA8] hover:bg-[#315A8E] text-white rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md text-xs sm:text-sm font-extrabold cursor-pointer active:scale-95"
                >
                  <Save className="h-4 w-4" />
                  <span>Save Method</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/90 dark:border-slate-800 p-4 sm:p-6 md:p-8">
            <div className="space-y-4 sm:space-y-5 text-left">
              <div>
                <label htmlFor="paymentmethodmanager-payment-method-name" className="block text-xs sm:text-sm font-extrabold text-[#232323] dark:text-white mb-1.5">Payment Method Name *</label>
                <input id="paymentmethodmanager-payment-method-name" name="payment_method_name" type="text"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-[#232323] dark:text-white focus:ring-2 focus:ring-[#3C6CA8] focus:border-[#3C6CA8] transition-colors"
                  placeholder="e.g., GCash, Maya, Bank Transfer"
                />
              </div>

              <div>
                <label htmlFor="paymentmethodmanager-method-id" className="block text-xs sm:text-sm font-extrabold text-[#232323] dark:text-white mb-1.5">Method ID *</label>
                <input id="paymentmethodmanager-method-id" name="method_id" type="text"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-[#232323] dark:text-white focus:ring-2 focus:ring-[#3C6CA8] focus:border-[#3C6CA8] transition-colors disabled:bg-slate-100 dark:disabled:bg-slate-800"
                  placeholder="kebab-case-id"
                  disabled={currentView === 'edit'}
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  {currentView === 'edit'
                    ? 'Method ID cannot be changed after creation'
                    : 'Use kebab-case format (e.g., "gcash", "bank-transfer")'
                  }
                </p>
              </div>

              <div>
                <label htmlFor="paymentmethodmanager-account-number-phone" className="block text-xs sm:text-sm font-extrabold text-[#232323] dark:text-white mb-1.5">Account Number / Phone *</label>
                <input id="paymentmethodmanager-account-number-phone" name="account_number_phone" type="text"
                  value={formData.account_number}
                  autoComplete="tel" onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-[#232323] dark:text-white focus:ring-2 focus:ring-[#3C6CA8] focus:border-[#3C6CA8] transition-colors"
                  placeholder="09XX XXX XXXX or Account: 1234-5678-9012"
                />
              </div>

              <div>
                <label htmlFor="paymentmethodmanager-account-name" className="block text-xs sm:text-sm font-extrabold text-[#232323] dark:text-white mb-1.5">Account Name *</label>
                <input id="paymentmethodmanager-account-name" name="account_name" type="text"
                  value={formData.account_name}
                  onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-[#232323] dark:text-white focus:ring-2 focus:ring-[#3C6CA8] focus:border-[#3C6CA8] transition-colors"
                  placeholder="SlimDose Peptides"
                />
              </div>

              <div>
                <label htmlFor="paymentmethodmanager-qr-code-image-optional-upload-" className="block text-xs sm:text-sm font-extrabold text-[#232323] dark:text-white mb-1">
                  QR Code Image (Optional)
                </label>
                <p className="text-[11px] text-slate-500 mb-2">
                  Upload a QR code image or paste an image URL.
                </p>
                <ImageUpload
                  currentImage={formData.qr_code_url || undefined}
                  onImageChange={(imageUrl) => {
                    let newQrCodeUrl: string = '';
                    if (imageUrl) {
                      const trimmed = imageUrl.trim();
                      newQrCodeUrl = trimmed === '' ? '' : trimmed;
                    }

                    setFormData((prev) => ({
                      ...prev,
                      qr_code_url: newQrCodeUrl,
                    }));
                  }}
                  folder="menu-images"
                />
              </div>

              <div>
                <label htmlFor="paymentmethodmanager-qr-code-image-optional-upload-" className="block text-xs sm:text-sm font-extrabold text-[#232323] dark:text-white mb-1.5">Sort Order</label>
                <input id="paymentmethodmanager-qr-code-image-optional-upload-" name="qr_code_image_optional_upload_" type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-[#232323] dark:text-white focus:ring-2 focus:ring-[#3C6CA8] focus:border-[#3C6CA8] transition-colors"
                  placeholder="0"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Lower numbers appear first in the checkout
                </p>
              </div>

              <div className="flex items-center pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input id="paymentmethodmanager-checkbox-2" name="checkbox_2" type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-[#3C6CA8] focus:ring-[#3C6CA8] cursor-pointer"
                  />
                  <span className="text-xs sm:text-sm font-bold text-[#232323] dark:text-white">Active Payment Method</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 font-inter">
      {/* Header Bar */}
      <div className="bg-white dark:bg-slate-900 shadow-xs border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-3 sm:px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-3.5 sm:py-4">
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                onClick={onBack}
                className="flex items-center gap-1 text-slate-600 dark:text-slate-400 hover:text-[#3C6CA8] dark:hover:text-[#6A9BE0] transition-colors shrink-0 cursor-pointer font-bold text-xs sm:text-sm px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Dashboard</span>
              </button>
              <div className="h-4 w-[1px] bg-slate-300 dark:bg-slate-700 hidden sm:block" />
              <h1 className="text-base sm:text-xl font-extrabold text-[#232323] dark:text-white tracking-tight truncate">
                Payment Methods &amp; Gateways
              </h1>
            </div>
            <button
              onClick={handleAddMethod}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-[#3C6CA8] hover:bg-[#315A8E] text-white px-4 py-2 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md border border-[#3C6CA8]/30 text-xs sm:text-sm font-extrabold cursor-pointer active:scale-95 shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>Add Manual Payment Method</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-5">
        {/* Manual Payment Methods List Container */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/90 dark:border-slate-800 overflow-hidden">
          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#3C6CA8]/10 dark:bg-[#3C6CA8]/20 flex items-center justify-center text-[#3C6CA8] dark:text-[#94BBE9]">
                  <CreditCard className="w-4 h-4" />
                </div>
                <h2 className="text-sm sm:text-base font-extrabold text-[#232323] dark:text-white">
                  Manual Bank / e-Wallet Accounts
                </h2>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                {paymentMethods.length} {paymentMethods.length === 1 ? 'Method' : 'Methods'} Configured
              </span>
            </div>

            {paymentMethods.length === 0 ? (
              <div className="text-center py-10">
                <CreditCard className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">No payment methods found</p>
                <button
                  onClick={handleAddMethod}
                  className="bg-[#3C6CA8] hover:bg-[#315A8E] text-white px-4 py-2 rounded-xl transition-all shadow-sm text-xs sm:text-sm font-bold"
                >
                  Add First Payment Method
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {paymentMethods.map((method) => (
                  <div
                    key={method.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-[#3C6CA8]/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-all duration-200 shadow-2xs group"
                  >
                    <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto min-w-0">
                      <div className="flex-shrink-0 relative">
                        <img
                          src={method.qr_code_url}
                          alt={`${method.name} QR Code`}
                          className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl border border-slate-200 dark:border-slate-700 object-cover bg-white p-0.5"
                          onError={(e) => {
                            e.currentTarget.src = 'https://images.pexels.com/photos/8867482/pexels-photo-8867482.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop';
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-sm sm:text-base text-[#232323] dark:text-white truncate">
                            {method.name}
                          </h3>
                        </div>
                        <p className="text-xs sm:text-sm font-mono font-semibold text-[#3C6CA8] dark:text-[#94BBE9] truncate mt-0.5">
                          {method.account_number}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          Account: <span className="font-medium text-slate-700 dark:text-slate-300">{method.account_name}</span>
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          ID: {method.id} • Order: #{method.sort_order}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end sm:justify-start border-t sm:border-t-0 pt-2.5 sm:pt-0 border-slate-100 dark:border-slate-800">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide whitespace-nowrap ${
                        method.active
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                          : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {method.active ? 'Active' : 'Inactive'}
                      </span>

                      <button
                        onClick={() => handleEditMethod(method)}
                        className="p-2 text-[#3C6CA8] hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
                        aria-label="Edit"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteMethod(method.id)}
                        className="p-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors border border-rose-200 dark:border-rose-900/40 cursor-pointer"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodManager;