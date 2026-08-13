import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PromoCode } from '../types';
import {
  mirrorPromoCreate,
  mirrorPromoDelete,
  mirrorPromoSetActive,
  mirrorPromoUpdate,
} from '../lib/convexMirror';
import { Plus, Search, Tag, Trash2, Edit2, CheckCircle, XCircle } from 'lucide-react';

interface PromoCodeManagerProps {
  adminEmail?: string;
  adminRole?: string;
}

const PromoCodeManager: React.FC<PromoCodeManagerProps> = ({
  adminEmail = 'admin@slimdose.ph',
  adminRole = 'admin'
}) => {
    const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCode, setEditingCode] = useState<PromoCode | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<PromoCode>>({
        code: '',
        discount_type: 'fixed',
        discount_value: 0,
        min_purchase_amount: 0,
        usage_limit: undefined,
        active: true
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
            console.warn('Failed to insert audit log:', e);
        }
    };

    useEffect(() => {
        fetchPromoCodes();
    }, []);

    const fetchPromoCodes = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('promo_codes')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching promo codes:', error);
        } else {
            setPromoCodes((data as PromoCode[]) || []);
        }
        setLoading(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const dataToSave = {
                ...formData,
                code: formData.code?.toUpperCase(), // Ensure uppercase
                updated_at: new Date().toISOString()
            };

            if (editingCode) {
                // Update
                const { error } = await supabase
                    .from('promo_codes')
                    .update(dataToSave)
                    .eq('id', editingCode.id);
                if (error) throw error;
                mirrorPromoUpdate(editingCode.id, dataToSave);
                logAction('update_promo_code', { id: editingCode.id, code: dataToSave.code, previous: editingCode, new: dataToSave });
            } else {
                // Create
                const { error } = await supabase
                    .from('promo_codes')
                    .insert([dataToSave]);
                if (error) throw error;
                mirrorPromoCreate(dataToSave);
                logAction('create_promo_code', { code: dataToSave.code, data: dataToSave });
            }

            setIsModalOpen(false);
            setEditingCode(null);
            resetForm();
            fetchPromoCodes();
            alert('Promo code saved successfully!');
        } catch (error: any) {
            console.error('Error saving promo code:', error);
            alert(`Error saving promo code: ${error.message}`);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this promo code?')) return;
        const codeToDelete = promoCodes.find(c => c.id === id);
        try {
            const { error } = await supabase.from('promo_codes').delete().eq('id', id);
            if (error) throw error;
            mirrorPromoDelete(id);
            logAction('delete_promo_code', { id, code: codeToDelete?.code });
            fetchPromoCodes();
        } catch (error: any) {
            alert('Error deleting promo code');
        }
    };

    const toggleActive = async (id: string, currentStatus: boolean) => {
        const promoCode = promoCodes.find(c => c.id === id);
        try {
            const { error } = await supabase
                .from('promo_codes')
                .update({ active: !currentStatus })
                .eq('id', id);
            if (error) throw error;
            mirrorPromoSetActive(id, !currentStatus);
            logAction('toggle_promo_code_active', { id, code: promoCode?.code, active: !currentStatus });
            fetchPromoCodes();
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const resetForm = () => {
        setFormData({
            code: '',
            discount_type: 'fixed',
            discount_value: 0,
            min_purchase_amount: 0,
            usage_limit: undefined,
            active: true
        });
    };

    const openModal = (code?: PromoCode) => {
        if (code) {
            setEditingCode(code);
            setFormData(code);
        } else {
            setEditingCode(null);
            resetForm();
        }
        setIsModalOpen(true);
    };

    const filteredCodes = promoCodes.filter(p =>
        p.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Tag className="w-6 h-6 text-navy-900" />
                    Promo Codes
                </h2>
                <button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 bg-navy-900 text-white px-4 py-2 rounded-lg hover:bg-navy-800 transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    Create New Code
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by code..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-navy-900 focus:border-transparent"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-bold tracking-wider text-left">
                            <tr>
                                <th className="px-6 py-3">Code</th>
                                <th className="px-6 py-3">Discount</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Usage</th>
                                <th className="px-6 py-3">Expiry</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan={6} className="p-8 text-center text-gray-500">Loading...</td></tr>
                            ) : filteredCodes.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center text-gray-500">No promo codes found.</td></tr>
                            ) : (
                                filteredCodes.map(code => (
                                    <tr key={code.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-navy-900">{code.code}</td>
                                        <td className="px-6 py-4">
                                            {code.discount_type === 'percentage'
                                                ? `${code.discount_value}% OFF`
                                                : `₱${code.discount_value.toLocaleString()} OFF`}
                                            {code.min_purchase_amount > 0 &&
                                                <span className="block text-xs text-gray-400">Min: ₱{code.min_purchase_amount.toLocaleString()}</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => toggleActive(code.id, code.active)}
                                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${code.active
                                                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                    }`}>
                                                {code.active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                                {code.active ? 'Active' : 'Inactive'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {code.usage_count} / {code.usage_limit || '∞'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {code.end_date ? new Date(code.end_date).toLocaleDateString() : 'No Expiry'}
                                        </td>
                                        <td className="px-6 py-4 flex justify-end gap-2">
                                            <button onClick={() => openModal(code)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(code.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit/Create Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900">
                                {editingCode ? 'Edit Promo Code' : 'Create Promo Code'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <span className="text-2xl">&times;</span>
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Promo Code</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg uppercase placeholder-gray-400 focus:ring-2 focus:ring-navy-900 focus:border-transparent"
                                    placeholder="e.g. SAVE100"
                                    value={formData.code}
                                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                    <select
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-white"
                                        value={formData.discount_type}
                                        onChange={e => setFormData({ ...formData, discount_type: e.target.value as any })}
                                    >
                                        <option value="fixed">Fixed Amount (₱)</option>
                                        <option value="percentage">Percentage (%)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                                        value={formData.discount_value}
                                        onChange={e => setFormData({ ...formData, discount_value: Number(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Min. Purchase (₱)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                                        value={formData.min_purchase_amount}
                                        onChange={e => setFormData({ ...formData, min_purchase_amount: Number(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Usage Limit</label>
                                    <input
                                        type="number"
                                        min="0"
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                                        placeholder="No limit"
                                        value={formData.usage_limit || ''}
                                        onChange={e => setFormData({ ...formData, usage_limit: e.target.value ? Number(e.target.value) : undefined })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                                <input
                                    type="date"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                                    value={formData.end_date ? formData.end_date.split('T')[0] : ''}
                                    onChange={e => setFormData({ ...formData, end_date: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-navy-900 text-white rounded-lg font-bold hover:bg-navy-800 transition-colors shadow-lg shadow-navy-900/20"
                                >
                                    {editingCode ? 'Update Code' : 'Create Code'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PromoCodeManager;
