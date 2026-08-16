import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useGlobalDiscountAdmin } from '../hooks/useGlobalDiscount';
import { useMenu } from '../hooks/useMenu';
import { demoProducts } from '../data/demoProducts';
import type { GlobalDiscount, Product } from '../types';
import {
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  Percent,
  Search,
  X,
  AlertTriangle,
  Calendar,
  Tag,
  Package,
  Layers,
  Sparkles,
  Info,
  Check,
  TrendingUp,
  Clock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const toIsoBoundary = (dateValue: string, boundary: 'start' | 'end') => {
  const timePart = boundary === 'start' ? 'T00:00:00.000' : 'T23:59:59.999';
  return new Date(`${dateValue}${timePart}`).toISOString();
};

const isDateInPast = (isoString?: string | null) => {
  if (!isoString) return false;
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.getTime() < Date.now();
};

const isDateInFuture = (isoString?: string | null) => {
  if (!isoString) return false;
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.getTime() > Date.now();
};

const isDiscountExpired = (discount: Pick<GlobalDiscount, 'end_date'>) =>
  isDateInPast(discount.end_date);

const getDiscountStatus = (discount: GlobalDiscount) => {
  if (!discount.active) {
    return { label: 'Inactive', color: 'bg-gray-100 text-gray-700 border-gray-200' };
  }
  if (isDiscountExpired(discount)) {
    return { label: 'Expired', color: 'bg-amber-50 text-amber-700 border-amber-200' };
  }
  if (isDateInFuture(discount.start_date)) {
    return { label: 'Scheduled', color: 'bg-blue-50 text-blue-700 border-blue-200' };
  }
  return { label: 'Active', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
};

interface GlobalDiscountManagerProps {
  adminEmail?: string;
  adminRole?: string;
}

type FilterStatus = 'all' | 'active' | 'inactive' | 'expired';
type FilterType = 'all' | 'percentage' | 'fixed';

const GlobalDiscountManager: React.FC<GlobalDiscountManagerProps> = ({
  adminEmail = 'admin@slimdose.ph',
  adminRole = 'admin'
}) => {
  const { discounts, loading, saveDiscount, deleteDiscount, toggleActive } = useGlobalDiscountAdmin();
  const { products: menuProducts } = useMenu();

  // Guarantee products list is always populated from useMenu, local storage cache, or demoProducts
  const products: Product[] = useMemo(() => {
    if (menuProducts && menuProducts.length > 0) {
      return menuProducts;
    }
    try {
      const cached = localStorage.getItem('slimdose_products_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return demoProducts;
  }, [menuProducts]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<GlobalDiscount | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [showInfoBanner, setShowInfoBanner] = useState(true);
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<Partial<GlobalDiscount>>({
    name: '',
    discount_type: 'percentage',
    discount_value: 0,
    active: true,
    excluded_product_ids: [],
  });

  useEffect(() => {
    if (products.length > 0 && !previewProduct) {
      setPreviewProduct(products[0]);
    }
  }, [products, previewProduct]);

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

  // Metrics
  const stats = useMemo(() => {
    const total = discounts.length;
    const active = discounts.filter(d => d.active && !isDiscountExpired(d) && !isDateInFuture(d.start_date)).length;
    const scheduled = discounts.filter(d => d.active && isDateInFuture(d.start_date)).length;
    const expired = discounts.filter(d => isDiscountExpired(d)).length;
    const highestPercentage = discounts
      .filter(d => d.discount_type === 'percentage')
      .reduce((max, d) => Math.max(max, d.discount_value || 0), 0);

    return { total, active, scheduled, expired, highestPercentage };
  }, [discounts]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim() || formData.discount_value === undefined || formData.discount_value <= 0) {
      alert('Please enter a valid discount campaign name and value greater than 0.');
      return;
    }

    if (formData.discount_type === 'percentage' && formData.discount_value > 100) {
      alert('Percentage discount cannot exceed 100%.');
      return;
    }

    try {
      setSaving(true);
      const result = await saveDiscount(
        editingDiscount ? { ...formData, id: editingDiscount.id } : formData
      );

      if (result.success) {
        setIsModalOpen(false);
        setEditingDiscount(null);
        resetForm();
        logAction(editingDiscount ? 'update_global_discount' : 'create_global_discount', {
          name: formData.name,
          data: formData
        });
      } else {
        alert(`Error saving discount: ${result.error}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const discountToDelete = discounts.find(d => d.id === id);
    if (!confirm(`Are you sure you want to delete the discount "${discountToDelete?.name || 'campaign'}"?`)) return;

    const result = await deleteDiscount(id);
    if (result.success) {
      logAction('delete_global_discount', { id, name: discountToDelete?.name });
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  const handleToggleActive = async (discount: GlobalDiscount) => {
    const turningOn = !discount.active;
    if (turningOn && isDiscountExpired(discount)) {
      const endDate = discount.end_date ? new Date(discount.end_date).toLocaleDateString() : '';
      const proceed = confirm(
        `Notice: This discount end date (${endDate}) has expired. Customers won't see it until you update the end date.\n\nDo you still want to toggle active status?`
      );
      if (!proceed) return;
    }
    await toggleActive(discount.id, turningOn);
    logAction('toggle_global_discount_active', { id: discount.id, name: discount.name, active: turningOn });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      discount_type: 'percentage',
      discount_value: 10,
      active: true,
      excluded_product_ids: [],
    });
    setProductSearchQuery('');
  };

  const openModal = (discount?: GlobalDiscount) => {
    if (discount) {
      setEditingDiscount(discount);
      setFormData({
        name: discount.name,
        discount_type: discount.discount_type,
        discount_value: discount.discount_value,
        active: discount.active,
        start_date: discount.start_date,
        end_date: discount.end_date,
        excluded_product_ids: discount.excluded_product_ids || [],
      });
    } else {
      setEditingDiscount(null);
      resetForm();
    }
    setIsModalOpen(true);
  };

  const toggleExcludedProduct = (productId: string) => {
    const current = formData.excluded_product_ids || [];
    if (current.includes(productId)) {
      setFormData({ ...formData, excluded_product_ids: current.filter(id => id !== productId) });
    } else {
      setFormData({ ...formData, excluded_product_ids: [...current, productId] });
    }
  };

  // Date Quick Presets
  const applyDatePreset = (preset: 'no_expiry' | '7days' | '30days' | 'end_month') => {
    const now = new Date();
    const startDateStr = now.toISOString().split('T')[0];
    const startDateIso = toIsoBoundary(startDateStr, 'start');

    if (preset === 'no_expiry') {
      setFormData({ ...formData, start_date: undefined, end_date: undefined });
      return;
    }

    let endDate = new Date(now);
    if (preset === '7days') {
      endDate.setDate(now.getDate() + 7);
    } else if (preset === '30days') {
      endDate.setDate(now.getDate() + 30);
    } else if (preset === 'end_month') {
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    const endDateStr = endDate.toISOString().split('T')[0];
    setFormData({
      ...formData,
      start_date: formData.start_date || startDateIso,
      end_date: toIsoBoundary(endDateStr, 'end'),
    });
  };

  const filteredDiscounts = useMemo(() => {
    return discounts.filter(d => {
      // Search
      const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      // Status
      if (statusFilter === 'active' && (!d.active || isDiscountExpired(d))) return false;
      if (statusFilter === 'inactive' && d.active) return false;
      if (statusFilter === 'expired' && !isDiscountExpired(d)) return false;

      // Type
      if (typeFilter !== 'all' && d.discount_type !== typeFilter) return false;

      return true;
    });
  }, [discounts, searchQuery, statusFilter, typeFilter]);

  const filteredProducts = useMemo(() => {
    const q = productSearchQuery.toLowerCase().trim();
    if (!q) return products;

    // Clean search token for flexible matching (e.g. bpc157 matches bpc-157)
    const cleanQ = q.replace(/[^a-z0-9]/g, '');

    return products.filter(p => {
      const pName = (p.name || '').toLowerCase();
      const pCleanName = pName.replace(/[^a-z0-9]/g, '');
      const pCategory = (p.category || '').toLowerCase();
      const pDesc = (p.description || '').toLowerCase();
      const pSlug = (p.slug || '').toLowerCase();

      // Check variations (e.g., 5mg, 10mg, etc.)
      const matchesVariation = (p.variations || []).some(v => {
        const vName = (v.name || '').toLowerCase();
        const fullVarName = `${pName} ${vName}`.toLowerCase();
        const fullVarClean = fullVarName.replace(/[^a-z0-9]/g, '');
        const qtyMatch = v.quantity_mg ? `${v.quantity_mg}mg`.includes(q) : false;
        return (
          vName.includes(q) ||
          fullVarName.includes(q) ||
          qtyMatch ||
          (cleanQ.length > 0 && fullVarClean.includes(cleanQ))
        );
      });

      return (
        pName.includes(q) ||
        pSlug.includes(q) ||
        (cleanQ.length > 0 && pCleanName.includes(cleanQ)) ||
        pCategory.includes(q) ||
        pDesc.includes(q) ||
        matchesVariation
      );
    });
  }, [products, productSearchQuery]);

  const excludedProducts = useMemo(() => {
    return products.filter(p =>
      (formData.excluded_product_ids || []).includes(p.id)
    );
  }, [products, formData.excluded_product_ids]);

  // Sample calculated price for modal live preview
  const previewSampleCalculated = useMemo(() => {
    const basePrice = previewProduct?.base_price || 2500;
    const isExcluded = previewProduct && (formData.excluded_product_ids || []).includes(previewProduct.id);
    if (isExcluded || !formData.active) {
      return { finalPrice: basePrice, discountAmount: 0, applied: false };
    }
    const val = Number(formData.discount_value) || 0;
    if (formData.discount_type === 'percentage') {
      const discountAmount = Math.round((basePrice * Math.min(val, 100)) / 100);
      return { finalPrice: Math.max(0, basePrice - discountAmount), discountAmount, applied: val > 0 };
    } else {
      const discountAmount = Math.min(basePrice, val);
      return { finalPrice: Math.max(0, basePrice - discountAmount), discountAmount, applied: val > 0 };
    }
  }, [previewProduct, formData]);

  return (
    <div className="space-y-5 w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm shrink-0">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Global Discounts
              </h2>
              {stats.active > 0 && (
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100/80 text-emerald-800 border border-emerald-200/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {stats.active} Active Now
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Site-wide promotion rules applied automatically across your catalog
            </p>
          </div>
        </div>

        <button
          onClick={() => openModal()}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-xs transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>Create Global Discount</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 truncate">Total Campaigns</p>
            <p className="text-lg sm:text-xl font-bold text-slate-900">{stats.total}</p>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 truncate">Live & Active</p>
            <p className="text-lg sm:text-xl font-bold text-emerald-600">{stats.active}</p>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 truncate">Scheduled / Expired</p>
            <p className="text-lg sm:text-xl font-bold text-slate-900">{stats.scheduled + stats.expired}</p>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 truncate">Max Discount</p>
            <p className="text-lg sm:text-xl font-bold text-slate-900">{stats.highestPercentage > 0 ? `${stats.highestPercentage}%` : '—'}</p>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      {showInfoBanner && (
        <div className="relative bg-slate-50 border border-slate-200 rounded-xl p-3.5 sm:p-4 text-xs sm:text-sm text-slate-700">
          <div className="flex items-start gap-2.5 pr-6">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-slate-900">How Global Discounts Work</p>
              <p className="text-slate-600 leading-relaxed">
                Global discounts apply site-wide automatically. You can exclude specific items. When a product also has an individual discount, the cart automatically applies whichever discount yields the higher savings.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowInfoBanner(false)}
            className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 p-1"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Table / Card Container */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
        {/* Controls Toolbar */}
        <div className="p-3 sm:p-4 border-b border-slate-100 flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input id="globaldiscountmanager-search-discount-campaigns" name="search_discount_campaigns" type="text"
              placeholder="Search discount campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs sm:text-sm placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all outline-hidden"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <div className="flex items-center bg-slate-100/80 p-1 rounded-xl text-xs font-medium text-slate-600">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-all ${statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'}`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-2.5 py-1 rounded-lg transition-all ${statusFilter === 'active' ? 'bg-white text-emerald-700 shadow-xs font-semibold' : 'hover:text-slate-900'}`}
              >
                Active
              </button>
              <button
                onClick={() => setStatusFilter('inactive')}
                className={`px-2.5 py-1 rounded-lg transition-all ${statusFilter === 'inactive' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'}`}
              >
                Inactive
              </button>
              <button
                onClick={() => setStatusFilter('expired')}
                className={`px-2.5 py-1 rounded-lg transition-all ${statusFilter === 'expired' ? 'bg-white text-amber-700 shadow-xs font-semibold' : 'hover:text-slate-900'}`}
              >
                Expired
              </button>
            </div>

            {/* Type Filter */}
            <select id="globaldiscountmanager-input-2" name="input_2" value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as FilterType)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-slate-900 outline-hidden"
            >
              <option value="all">All Types</option>
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed Amount (₱)</option>
            </select>
          </div>
        </div>

        {/* Desktop / Tablet View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                <th className="py-3 px-4">Campaign Name</th>
                <th className="py-3 px-4">Discount Value</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Excluded Items</th>
                <th className="py-3 px-4">Validity Period</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                      Loading global discounts...
                    </div>
                  </td>
                </tr>
              ) : filteredDiscounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-2">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <Tag className="w-5 h-5" />
                      </div>
                      <p className="font-semibold text-slate-800">No discounts found</p>
                      <p className="text-xs text-slate-500">
                        {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                          ? 'Try adjusting your search query or filter criteria.'
                          : 'Create your first global discount campaign to apply site-wide offers.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDiscounts.map((discount) => {
                  const statusInfo = getDiscountStatus(discount);
                  const isExpired = isDiscountExpired(discount);

                  return (
                    <tr key={discount.id} className="hover:bg-slate-50/60 transition-colors group">
                      {/* Name */}
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span>{discount.name}</span>
                        </div>
                      </td>

                      {/* Value */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                          {discount.discount_type === 'percentage' ? (
                            <>
                              <Percent className="w-3 h-3" />
                              {discount.discount_value}% OFF
                            </>
                          ) : (
                            <>
                              <Tag className="w-3 h-3" />
                              ₱{Number(discount.discount_value).toLocaleString()} OFF
                            </>
                          )}
                        </span>
                      </td>

                      {/* Status Toggle & Badge */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(discount)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${statusInfo.color} hover:opacity-80 active:scale-95`}
                            title="Click to toggle active status"
                          >
                            {discount.active ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5" />
                            )}
                            {discount.active ? 'Active' : 'Inactive'}
                          </button>
                          {isExpired && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wider"
                              title="End date is in the past."
                            >
                              <AlertTriangle className="w-3 h-3" />
                              Expired
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Excluded */}
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {discount.excluded_product_ids && discount.excluded_product_ids.length > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                            <Package className="w-3 h-3 text-slate-400" />
                            {discount.excluded_product_ids.length} excluded
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">All Products (None)</span>
                        )}
                      </td>

                      {/* Date Range */}
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {discount.start_date || discount.end_date ? (
                          <div className="space-y-0.5">
                            {discount.start_date && (
                              <div className="flex items-center gap-1 text-slate-600">
                                <span className="text-slate-400 font-normal">From:</span>{' '}
                                {new Date(discount.start_date).toLocaleDateString()}
                              </div>
                            )}
                            {discount.end_date && (
                              <div className={`flex items-center gap-1 ${isExpired ? 'text-amber-700 font-medium' : 'text-slate-600'}`}>
                                <span className="text-slate-400 font-normal">Until:</span>{' '}
                                {new Date(discount.end_date).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No expiration</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openModal(discount)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit campaign"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(discount.id)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete campaign"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View (< 768px Card Layout) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading global discounts...
            </div>
          ) : filteredDiscounts.length === 0 ? (
            <div className="py-10 px-4 text-center text-slate-500">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-2">
                <Tag className="w-5 h-5" />
              </div>
              <p className="font-semibold text-sm text-slate-800">No discounts found</p>
              <p className="text-xs text-slate-500 mt-1">
                {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'Try adjusting your search query or filter criteria.'
                  : 'Create your first global discount campaign.'}
              </p>
            </div>
          ) : (
            filteredDiscounts.map((discount) => {
              const statusInfo = getDiscountStatus(discount);
              const isExpired = isDiscountExpired(discount);

              return (
                <div key={discount.id} className="p-4 space-y-3">
                  {/* Title & Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{discount.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                          {discount.discount_type === 'percentage'
                            ? `${discount.discount_value}% OFF`
                            : `₱${Number(discount.discount_value).toLocaleString()} OFF`}
                        </span>
                        {isExpired && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase">
                            Expired
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleActive(discount)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${statusInfo.color}`}
                    >
                      {discount.active ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      {discount.active ? 'Active' : 'Inactive'}
                    </button>
                  </div>

                  {/* Details Meta */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Exclusions</span>
                      <span className="font-medium text-slate-700">
                        {discount.excluded_product_ids?.length
                          ? `${discount.excluded_product_ids.length} excluded items`
                          : 'All products apply'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Validity</span>
                      <span className="font-medium text-slate-700 truncate block">
                        {discount.end_date
                          ? `Until ${new Date(discount.end_date).toLocaleDateString()}`
                          : 'No expiry date'}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => openModal(discount)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(discount.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modern Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                  <Percent className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    {editingDiscount ? 'Edit Global Discount' : 'Create Global Discount'}
                  </h3>
                  <p className="text-xs text-slate-500">Configure promotional discount rules</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              {/* Campaign Name */}
              <div>
                <label htmlFor="globaldiscountmanager-campaign-discount-name" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Campaign / Discount Name <span className="text-rose-500">*</span>
                </label>
                <input id="globaldiscountmanager-campaign-discount-name" name="campaign_discount_name" type="text"
                  required
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all outline-hidden font-medium"
                  placeholder="e.g. Summer Mega Sale, Flash Promo, Anniversary"
                  value={formData.name || ''}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              {/* Type & Value */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/60 p-4 rounded-xl border border-slate-100">
                <div>
                  <label htmlFor="globaldiscountmanager-discount-type-setformdata-form" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Discount Type
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-200/60 rounded-xl text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, discount_type: 'percentage' })}
                      className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                        formData.discount_type === 'percentage'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Percent className="w-3.5 h-3.5" />
                      Percentage (%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, discount_type: 'fixed' })}
                      className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                        formData.discount_type === 'fixed'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Tag className="w-3.5 h-3.5" />
                      Fixed (₱)
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="globaldiscountmanager-discount-type-setformdata-form" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Discount Value {formData.discount_type === 'percentage' ? '(%)' : '(₱)'} <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input id="globaldiscountmanager-discount-type-setformdata-form" name="discount_type_setformdata_form" type="number"
                      required
                      min="1"
                      max={formData.discount_type === 'percentage' ? 100 : undefined}
                      className="w-full pl-3.5 pr-10 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-hidden font-bold text-slate-900"
                      value={formData.discount_value || ''}
                      onChange={e => setFormData({ ...formData, discount_value: Number(e.target.value) })}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                      {formData.discount_type === 'percentage' ? '%' : 'PHP'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Preview Pill */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/60 text-xs">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-semibold text-emerald-900">Live Preview: </span>
                    <span className="text-emerald-700">
                      Customers will get {formData.discount_type === 'percentage' ? `${formData.discount_value || 0}% OFF` : `₱${Number(formData.discount_value || 0).toLocaleString()} OFF`} site-wide.
                    </span>
                  </div>
                </div>
                {previewProduct && (
                  <div className="hidden sm:block text-right">
                    <span className="text-slate-400 line-through mr-1.5">₱{previewProduct.base_price.toLocaleString()}</span>
                    <span className="font-bold text-emerald-800">₱{previewSampleCalculated.finalPrice.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Date Schedule & Presets */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="globaldiscountmanager-validity-schedule-optional-pre" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Validity Schedule (Optional)
                  </label>
                  <div className="flex items-center gap-1 text-[11px]">
                    <span className="text-slate-400 mr-1">Presets:</span>
                    <button
                      type="button"
                      onClick={() => applyDatePreset('no_expiry')}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 font-medium"
                    >
                      No Expiry
                    </button>
                    <button
                      type="button"
                      onClick={() => applyDatePreset('7days')}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 font-medium"
                    >
                      +7 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => applyDatePreset('30days')}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 font-medium"
                    >
                      +30 Days
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="globaldiscountmanager-validity-schedule-optional-pre" className="block text-[11px] font-medium text-slate-500 mb-1">Start Date</label>
                    <input id="globaldiscountmanager-validity-schedule-optional-pre" name="validity_schedule_optional_pre" type="date"
                      className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 outline-hidden"
                      value={formData.start_date ? formData.start_date.split('T')[0] : ''}
                      onChange={e => setFormData({ ...formData, start_date: e.target.value ? toIsoBoundary(e.target.value, 'start') : undefined })}
                    />
                  </div>
                  <div>
                    <label htmlFor="globaldiscountmanager-end-date" className="block text-[11px] font-medium text-slate-500 mb-1">End Date</label>
                    <input id="globaldiscountmanager-end-date" name="end_date" type="date"
                      className={`w-full px-3 py-2 text-xs sm:text-sm border rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 outline-hidden ${
                        isDateInPast(formData.end_date)
                          ? 'border-amber-300 bg-amber-50/50'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                      value={formData.end_date ? formData.end_date.split('T')[0] : ''}
                      onChange={e => setFormData({ ...formData, end_date: e.target.value ? toIsoBoundary(e.target.value, 'end') : undefined })}
                    />
                  </div>
                </div>

                {isDateInPast(formData.end_date) && (
                  <p className="text-xs text-amber-700 flex items-center gap-1.5 bg-amber-50 p-2 rounded-lg border border-amber-200">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    Selected end date has already passed. Update or clear the end date to activate.
                  </p>
                )}
              </div>

              {/* Excluded Products Section */}
              <div className="space-y-2.5 pt-2.5 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Product Exclusions ({excludedProducts.length} of {products.length} selected)
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Excluded items will maintain regular price or their individual discounts.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, excluded_product_ids: products.map(p => p.id) })}
                      className="text-xs text-slate-600 hover:text-slate-900 font-semibold"
                    >
                      Exclude All
                    </button>
                    {excludedProducts.length > 0 && (
                      <>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, excluded_product_ids: [] })}
                          className="text-xs text-rose-600 hover:underline font-semibold"
                        >
                          Clear All
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Excluded chips */}
                {excludedProducts.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-100">
                    {excludedProducts.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => toggleExcludedProduct(p.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-100/70 text-rose-800 hover:bg-rose-200 transition-colors cursor-pointer"
                        title="Click to remove from exclusions"
                      >
                        <span className="truncate max-w-[140px]">{p.name}</span>
                        <X className="w-3 h-3" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Product search box */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input id="globaldiscountmanager-search-all-products-e-g-bpc-15" name="search_all_products_e_g_bpc_15" type="text"
                    placeholder="Search all products (e.g., BPC-157, Semaglutide, Tirzepatide)..."
                    value={productSearchQuery}
                    onChange={e => setProductSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-hidden"
                  />
                  {productSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setProductSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Product Select List */}
                <div className="max-h-52 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
                  {filteredProducts.map(product => {
                    const isExcluded = (formData.excluded_product_ids || []).includes(product.id);
                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => toggleExcludedProduct(product.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs transition-colors cursor-pointer ${
                          isExcluded ? 'bg-rose-50/70 hover:bg-rose-100/70' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all shrink-0 ${
                            isExcluded ? 'bg-rose-500 border-rose-500 text-white' : 'border-slate-300 bg-white'
                          }`}>
                            {isExcluded && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>

                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt=""
                              className="w-7 h-7 rounded-md object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                              <Package className="w-3.5 h-3.5" />
                            </div>
                          )}

                          <div className="min-w-0">
                            <span className={`truncate font-semibold block ${isExcluded ? 'text-rose-900' : 'text-slate-800'}`}>
                              {product.name}
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate">
                              ₱{(product.discount_price || product.base_price || 0).toLocaleString()} · {product.category || 'Peptide'}
                            </span>
                          </div>
                        </div>

                        <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isExcluded ? 'bg-rose-200 text-rose-900' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {isExcluded ? 'Excluded' : 'Included'}
                        </span>
                      </button>
                    );
                  })}
                  {filteredProducts.length === 0 && (
                    <div className="p-6 text-center text-xs text-slate-400 space-y-1.5">
                      <p>No products matching "{productSearchQuery}"</p>
                      <button
                        type="button"
                        onClick={() => setProductSearchQuery('')}
                        className="text-xs text-[#3C6CA8] font-bold hover:underline"
                      >
                        Clear search filter
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Immediate Active Toggle */}
              <div className="pt-3 border-t border-slate-100">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input id="globaldiscountmanager-checkbox-5" name="checkbox_5" type="checkbox"
                    checked={formData.active ?? true}
                    onChange={e => setFormData({ ...formData, active: e.target.checked })}
                    className="w-4 h-4 text-slate-900 rounded border-slate-300 focus:ring-slate-900 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-slate-900">
                      Enable & Activate Campaign Immediately
                    </span>
                    <p className="text-[11px] text-slate-500">
                      When checked, this discount applies in the store according to the validity schedule.
                    </p>
                  </div>
                </label>
              </div>

              {/* Modal Footer Controls */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xs transition-all disabled:opacity-50"
                >
                  {saving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {editingDiscount ? 'Update Campaign' : 'Create Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalDiscountManager;
