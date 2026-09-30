import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus, Edit2, Trash2, X, Package, Gift, RefreshCw, Search, AlertTriangle,
  CheckCircle2, Calendar, Percent, DollarSign, Layers, Eye, EyeOff, Sparkles,
  ArrowLeft, Tag,
} from 'lucide-react';
import {
  listBundles, saveBundle, deleteBundle, setBundleActive, computeBundlePrice,
  isBundleActive, type Bundle, type BundleItem,
} from '../lib/bundles';
import { supabase } from '../lib/supabase';
import { logAdminAction } from '../lib/audit';
import { fireToast } from './ToastNotification';

interface BundleManagerProps {
  onBack: () => void;
  adminEmail?: string;
}

interface ProductOption {
  id: string;
  name: string;
  base_price: number;
}

interface BundleDraft {
  id?: string;
  name: string;
  description: string;
  image_url: string;
  items: BundleItem[];
  discount_type: 'fixed' | 'percentage';
  discount_value: number;
  start_date: string;
  end_date: string;
  active: boolean;
  featured: boolean;
  customer_visible: boolean;
}

const emptyDraft = (): BundleDraft => ({
  name: '',
  description: '',
  image_url: '',
  items: [],
  discount_type: 'percentage',
  discount_value: 10,
  start_date: '',
  end_date: '',
  active: true,
  featured: false,
  customer_visible: true,
});

const peso = (n: number) => `₱${Number(n || 0).toLocaleString('en-PH', { maximumFractionDigits: 2 })}`;

const BundleManager: React.FC<BundleManagerProps> = ({ onBack, adminEmail = 'admin@slimdose.ph' }) => {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draft, setDraft] = useState<BundleDraft>(emptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [bundleToDelete, setBundleToDelete] = useState<Bundle | null>(null);
  const [itemPickerId, setItemPickerId] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [bundleRows, productRes] = await Promise.all([
        listBundles(false),
        supabase.from('products').select('id, name, base_price').order('name', { ascending: true }),
      ]);
      setBundles(bundleRows);
      setProducts(((productRes as any).data || []) as ProductOption[]);
    } catch (err) {
      console.error('BundleManager load failed:', err);
      fireToast('Failed to load bundles', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const openCreate = () => {
    setEditingId(null);
    setDraft(emptyDraft());
    setItemPickerId('');
    setIsModalOpen(true);
  };

  const openEdit = (b: Bundle) => {
    setEditingId(b.id || null);
    setDraft({
      id: b.id,
      name: b.name || '',
      description: b.description || '',
      image_url: b.image_url || '',
      items: (b.items || []).map((i) => ({ ...i })),
      discount_type: b.discount_type || 'percentage',
      discount_value: Number(b.discount_value || 0),
      start_date: (b.start_date || '').slice(0, 10),
      end_date: (b.end_date || '').slice(0, 10),
      active: b.active !== false,
      featured: b.featured === true,
      customer_visible: b.customer_visible !== false,
    });
    setItemPickerId('');
    setIsModalOpen(true);
  };

  const pricing = useMemo(
    () => computeBundlePrice(draft.items, draft.discount_type, Number(draft.discount_value) || 0),
    [draft.items, draft.discount_type, draft.discount_value]
  );

  const addItem = () => {
    const p = products.find((x) => x.id === itemPickerId);
    if (!p) {
      fireToast('Select a product to add first.', 'warning');
      return;
    }
    if (draft.items.some((i) => i.product_id === p.id)) {
      fireToast('That product is already in the bundle.', 'warning');
      return;
    }
    setDraft((d) => ({
      ...d,
      items: [...d.items, { product_id: p.id, product_name: p.name, quantity: 1, unit_price: Number(p.base_price) || 0 }],
    }));
    setItemPickerId('');
  };

  const handleSave = async () => {
    if (!draft.name.trim()) {
      fireToast('Bundle name is required.', 'warning');
      return;
    }
    if (!pricing.valid) {
      fireToast(pricing.error || 'Bundle pricing is invalid.', 'warning');
      return;
    }
    setIsSaving(true);
    try {
      const payload: Bundle = {
        id: draft.id,
        name: draft.name.trim(),
        slug: draft.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
        description: draft.description.trim(),
        image_url: draft.image_url.trim() || null,
        items: draft.items,
        discount_type: draft.discount_type,
        discount_value: Number(draft.discount_value) || 0,
        original_total: pricing.originalTotal,
        bundle_price: pricing.bundlePrice,
        start_date: draft.start_date ? new Date(draft.start_date).toISOString() : null,
        end_date: draft.end_date ? new Date(`${draft.end_date}T23:59:59`).toISOString() : null,
        active: draft.active,
        featured: draft.featured,
        customer_visible: draft.customer_visible,
      };
      const res = await saveBundle(payload, adminEmail);
      if (!res.success) throw new Error(res.error || 'Failed to save bundle');
      logAdminAction(editingId ? 'update_bundle' : 'create_bundle', {
        module: 'bundles',
        record_id: res.id || draft.id,
        details: `${payload.name} — ${payload.items.length} item(s), ${peso(payload.bundle_price)}`,
      });
      fireToast(`Bundle "${payload.name}" ${editingId ? 'updated' : 'created'}!`, 'success');
      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      fireToast(err?.message || 'Failed to save bundle', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (b: Bundle) => {
    const next = !b.active;
    const ok = await setBundleActive(b.id!, next);
    if (ok) {
      logAdminAction('toggle_bundle_active', { module: 'bundles', record_id: b.id, details: `${b.name} → ${next ? 'active' : 'inactive'}` });
      setBundles((prev) => prev.map((x) => (x.id === b.id ? { ...x, active: next } : x)));
      fireToast(`Bundle "${b.name}" is now ${next ? 'ACTIVE' : 'INACTIVE'}.`, 'info');
    } else {
      fireToast('Failed to update bundle status.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!bundleToDelete?.id) return;
    try {
      const ok = await deleteBundle(bundleToDelete.id);
      if (!ok) throw new Error('Delete failed');
      logAdminAction('delete_bundle', { module: 'bundles', record_id: bundleToDelete.id, details: bundleToDelete.name });
      fireToast(`Bundle "${bundleToDelete.name}" deleted.`, 'success');
      setBundleToDelete(null);
      await loadData();
    } catch (err: any) {
      fireToast(err?.message || 'Failed to delete bundle', 'error');
    }
  };

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return bundles;
    return bundles.filter(
      (b) => b.name.toLowerCase().includes(q) || b.items.some((i) => i.product_name.toLowerCase().includes(q))
    );
  }, [bundles, searchTerm]);

  const stats = useMemo(() => {
    const active = bundles.filter(isBundleActive).length;
    const featured = bundles.filter((b) => b.featured).length;
    const avgSavings = bundles.length
      ? Math.round(bundles.reduce((s, b) => s + (b.original_total > 0 ? ((b.original_total - b.bundle_price) / b.original_total) * 100 : 0), 0) / bundles.length)
      : 0;
    return { total: bundles.length, active, featured, avgSavings };
  }, [bundles]);

  const savingsPct = (b: Bundle) =>
    b.original_total > 0 ? Math.round(((b.original_total - b.bundle_price) / b.original_total) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5 font-inter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-3.5 min-w-0">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-all cursor-pointer"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-12 h-12 rounded-2xl bg-[#3C6CA8]/10 dark:bg-[#3C6CA8]/20 border border-[#3C6CA8]/25 text-[#3C6CA8] dark:text-[#94BBE9] flex items-center justify-center shrink-0">
            <Gift className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-black text-[#232323] dark:text-white tracking-tight">Bundles &amp; Kits</h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Multi-product offers with fixed or percentage discounts, availability windows, and stock checks
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-all cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openCreate}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-[#3C6CA8] hover:bg-[#315A8E] text-white px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black shadow-md shadow-[#3C6CA8]/20 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create Bundle</span>
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Bundles', value: stats.total, icon: Layers, color: 'text-[#3C6CA8]' },
          { label: 'Currently Active', value: stats.active, icon: CheckCircle2, color: 'text-emerald-600' },
          { label: 'Featured', value: stats.featured, icon: Sparkles, color: 'text-amber-600' },
          { label: 'Avg. Savings', value: `${stats.avgSavings}%`, icon: Percent, color: 'text-indigo-600' },
        ].map((k) => (
          <div key={k.label} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{k.label}</p>
              <p className={`text-xl sm:text-2xl font-black mt-1 ${k.color}`}>{k.value}</p>
            </div>
            <k.icon className="w-8 h-8 opacity-20 text-slate-500" />
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search bundles by name or included product..."
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[#3C6CA8]/30"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <RefreshCw className="w-8 h-8 animate-spin text-[#3C6CA8] mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Loading bundles...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-10 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
          <Gift className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-extrabold text-[#232323] dark:text-white">No bundles yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Create multi-product bundle offers — pricing, savings, and inventory checks are computed automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => {
            const live = isBundleActive(b);
            return (
              <div key={b.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-4 flex flex-col lg:flex-row lg:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-black text-sm text-[#232323] dark:text-white">{b.name}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${b.active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                      {b.active ? (live ? 'LIVE' : 'SCHEDULED/EXPIRED') : 'INACTIVE'}
                    </span>
                    {b.featured && <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">FEATURED</span>}
                    {!b.customer_visible && <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">HIDDEN</span>}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                    {b.items.map((i) => `${i.quantity}× ${i.product_name}`).join(' + ') || 'No items'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" />
                    {b.start_date ? new Date(b.start_date).toLocaleDateString() : 'No start'} → {b.end_date ? new Date(b.end_date).toLocaleDateString() : 'No end'}
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 line-through">{peso(b.original_total)}</p>
                    <p className="text-base font-black text-[#3C6CA8]">{peso(b.bundle_price)}</p>
                    <p className="text-[10px] font-bold text-emerald-600">Save {savingsPct(b)}%</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(b)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer" title="Edit">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleToggleActive(b)} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer" title={b.active ? 'Deactivate' : 'Activate'}>
                      {b.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button onClick={() => setBundleToDelete(b)} className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh]">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Gift className="w-5 h-5 text-[#3C6CA8]" />
                <h3 className="text-base sm:text-lg font-black text-[#232323] dark:text-white">
                  {editingId ? 'Edit Bundle' : 'Create Bundle'}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">Bundle Name <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    placeholder="e.g. Starter Research Kit"
                    className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl font-bold bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-[#3C6CA8]/30"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">Image URL</label>
                  <input
                    type="text"
                    value={draft.image_url}
                    onChange={(e) => setDraft({ ...draft, image_url: e.target.value })}
                    placeholder="https://…"
                    className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-[#3C6CA8]/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">Description</label>
                <textarea
                  rows={2}
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-[#3C6CA8]/30 resize-none"
                />
              </div>

              {/* Items */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/50 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5" /> Bundle Items ({draft.items.length})
                  </span>
                </div>
                {draft.items.map((item, idx) => (
                  <div key={`${item.product_id}-${idx}`} className="flex items-center gap-2">
                    <span className="flex-1 min-w-0 truncate font-bold text-slate-700 dark:text-slate-200">{item.product_name}</span>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => {
                        const qty = Math.max(1, Number(e.target.value) || 1);
                        setDraft((d) => ({ ...d, items: d.items.map((it, i) => (i === idx ? { ...it, quantity: qty } : it)) }));
                      }}
                      className="w-16 px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-center bg-white dark:bg-slate-800"
                      title="Quantity"
                    />
                    <span className="text-slate-300">×</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => {
                        const unit = Math.max(0, Number(e.target.value) || 0);
                        setDraft((d) => ({ ...d, items: d.items.map((it, i) => (i === idx ? { ...it, unit_price: unit } : it)) }));
                      }}
                      className="w-24 px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-right bg-white dark:bg-slate-800"
                      title="Unit price (₱)"
                    />
                    <button
                      onClick={() => setDraft((d) => ({ ...d, items: d.items.filter((_, i) => i !== idx) }))}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-2 pt-1">
                  <select
                    value={itemPickerId}
                    onChange={(e) => setItemPickerId(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 cursor-pointer"
                  >
                    <option value="">Select a product to add…</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} — {peso(p.base_price)}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={addItem}
                    className="px-3 py-2 bg-[#3C6CA8] text-white rounded-lg font-bold hover:bg-[#315A8E] cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>
              </div>

              {/* Pricing */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/50 space-y-2.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" /> Pricing
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Discount Type</label>
                    <select
                      value={draft.discount_type}
                      onChange={(e) => setDraft({ ...draft, discount_type: e.target.value as 'fixed' | 'percentage' })}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 cursor-pointer"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed (₱)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      {draft.discount_type === 'percentage' ? 'Discount %' : 'Discount ₱'}
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={draft.discount_value}
                      onChange={(e) => setDraft({ ...draft, discount_value: Number(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-2.5">
                    <p className="text-[10px] text-slate-400 flex items-center gap-1"><DollarSign className="w-3 h-3" /> Live Preview</p>
                    <p className="text-xs text-slate-500 line-through">{peso(pricing.originalTotal)}</p>
                    <p className={`text-sm font-black ${pricing.valid ? 'text-[#3C6CA8]' : 'text-rose-500'}`}>{peso(pricing.bundlePrice)}</p>
                  </div>
                </div>
                {!pricing.valid && pricing.error && (
                  <p className="flex items-center gap-1.5 text-[11px] font-bold text-rose-600">
                    <AlertTriangle className="w-3.5 h-3.5" /> {pricing.error}
                  </p>
                )}
              </div>

              {/* Availability window */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">Available From</label>
                  <input
                    type="date"
                    value={draft.start_date}
                    onChange={(e) => setDraft({ ...draft, start_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">Available Until</label>
                  <input
                    type="date"
                    value={draft.end_date}
                    onChange={(e) => setDraft({ ...draft, end_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-2">
                {([
                  { key: 'active', label: 'Active', desc: 'Bundle can be offered (within its availability window)' },
                  { key: 'featured', label: 'Featured', desc: 'Highlight this bundle on the storefront' },
                  { key: 'customer_visible', label: 'Customer Visible', desc: 'Show to customers (off = internal draft)' },
                ] as const).map((t) => (
                  <div key={t.key} className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800 dark:text-white text-xs">{t.label}</p>
                      <p className="text-[11px] text-slate-400">{t.desc}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={draft[t.key]}
                      onChange={(e) => setDraft({ ...draft, [t.key]: e.target.checked })}
                      className="w-5 h-5 rounded text-[#3C6CA8] focus:ring-[#3C6CA8] cursor-pointer"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2.5 bg-[#3C6CA8] hover:bg-[#315A8E] text-white rounded-xl font-black shadow-md shadow-[#3C6CA8]/20 disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? 'Saving...' : editingId ? 'Update Bundle' : 'Create Bundle'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {bundleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-5 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Delete Bundle?</h3>
              <p className="text-xs text-slate-500 mt-1">
                <span className="font-bold">"{bundleToDelete.name}"</span> will be permanently removed from the storefront.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setBundleToDelete(null)}
                className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BundleManager;
