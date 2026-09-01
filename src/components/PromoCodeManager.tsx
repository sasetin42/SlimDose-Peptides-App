import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { PromoCode } from '../types';
import {
  mirrorPromoCreate,
  mirrorPromoDelete,
  mirrorPromoSetActive,
  mirrorPromoUpdate,
} from '../lib/convexMirror';
import {
  Plus,
  Search,
  Tag,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  Clock,
  Percent,
  Copy,
  Check,
  RotateCw,
  Sparkles,
  ShoppingBag,
  AlertTriangle,
  X,
  SlidersHorizontal,
  ChevronDown,
  Layers
} from 'lucide-react';
import { fireToast } from './ToastNotification';

interface PromoCodeManagerProps {
  adminEmail?: string;
  adminRole?: string;
}

type FilterTab = 'all' | 'active' | 'inactive' | 'expired' | 'percentage' | 'fixed';
type SortOption = 'newest' | 'most_used' | 'highest_discount' | 'expiring_soon' | 'code_asc';

const PromoCodeManager: React.FC<PromoCodeManagerProps> = ({
  adminEmail = 'admin@slimdose.ph',
  adminRole = 'admin'
}) => {
  // Initialize from local cache for instant 0ms rendering
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>(() => {
    try {
      const cached = localStorage.getItem('slimdose_promo_codes_cache');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState(promoCodes.length === 0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<FilterTab>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [codeToDelete, setCodeToDelete] = useState<PromoCode | null>(null);
  const [editingCode, setEditingCode] = useState<PromoCode | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState<{
    code: string;
    discount_type: 'fixed' | 'percentage';
    discount_value: number;
    min_purchase_amount: number;
    max_discount_amount?: number;
    usage_limit?: number;
    is_unlimited_usage: boolean;
    start_date?: string;
    end_date?: string;
    active: boolean;
  }>({
    code: '',
    discount_type: 'percentage',
    discount_value: 10,
    min_purchase_amount: 0,
    max_discount_amount: undefined,
    usage_limit: undefined,
    is_unlimited_usage: true,
    start_date: undefined,
    end_date: undefined,
    active: true
  });

  // Audit Log Helper
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

  // Fetch Promo Codes from Supabase
  const fetchPromoCodes = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true);
    else if (promoCodes.length === 0) setLoading(true);

    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted = (data as PromoCode[]) || [];
      setPromoCodes(formatted);
      try {
        localStorage.setItem('slimdose_promo_codes_cache', JSON.stringify(formatted));
      } catch {}
    } catch (error: any) {
      console.error('Error fetching promo codes:', error);
      fireToast('Failed to load live promo codes: ' + (error.message || 'Network error'), 'error');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Realtime Supabase Channel Subscription
  useEffect(() => {
    fetchPromoCodes();

    const channel = supabase
      .channel('public:promo_codes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'promo_codes' },
        () => {
          fetchPromoCodes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Copy code to clipboard with visual feedback
  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    fireToast(`Promo code "${code}" copied to clipboard!`, 'success');
    setTimeout(() => {
      setCopiedCodeId(null);
    }, 2000);
  };

  // Quick Random Code Generator
  const generateRandomCode = () => {
    const prefixes = ['SLIM', 'PLUS', 'FLASH', 'SAVE', 'SPECIAL', 'PEPTIDE', 'DEAL'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(10 + Math.random() * 89);
    const generated = `${prefix}${formData.discount_type === 'percentage' ? formData.discount_value || num : num}`;
    setFormData((prev) => ({ ...prev, code: generated.toUpperCase() }));
  };

  // Open Edit or Create Modal
  const openModal = (code?: PromoCode) => {
    if (code) {
      setEditingCode(code);
      setFormData({
        code: code.code,
        discount_type: code.discount_type,
        discount_value: code.discount_value,
        min_purchase_amount: code.min_purchase_amount || 0,
        max_discount_amount: code.max_discount_amount,
        usage_limit: code.usage_limit,
        is_unlimited_usage: !code.usage_limit || code.usage_limit <= 0,
        start_date: code.start_date ? code.start_date.split('T')[0] : undefined,
        end_date: code.end_date ? code.end_date.split('T')[0] : undefined,
        active: code.active
      });
    } else {
      setEditingCode(null);
      setFormData({
        code: '',
        discount_type: 'percentage',
        discount_value: 10,
        min_purchase_amount: 0,
        max_discount_amount: undefined,
        usage_limit: undefined,
        is_unlimited_usage: true,
        start_date: undefined,
        end_date: undefined,
        active: true
      });
    }
    setIsModalOpen(true);
  };

  // Save Promo Code (Create or Update)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim()) {
      fireToast('Please enter a promo code string.', 'warning');
      return;
    }
    if (formData.discount_value <= 0) {
      fireToast('Discount value must be greater than 0.', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      const cleanCode = formData.code.trim().toUpperCase().replace(/\s+/g, '');
      const dataToSave: Record<string, any> = {
        code: cleanCode,
        discount_type: formData.discount_type,
        discount_value: Number(formData.discount_value),
        min_purchase_amount: Number(formData.min_purchase_amount) || 0,
        max_discount_amount: (formData.max_discount_amount !== undefined && formData.max_discount_amount !== null && Number(formData.max_discount_amount) > 0)
          ? Number(formData.max_discount_amount)
          : null,
        usage_limit: (!formData.is_unlimited_usage && formData.usage_limit !== undefined && formData.usage_limit !== null && Number(formData.usage_limit) > 0)
          ? Number(formData.usage_limit)
          : null,
        start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
        end_date: formData.end_date ? new Date(`${formData.end_date}T23:59:59.999Z`).toISOString() : null,
        active: Boolean(formData.active),
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
        logAction('update_promo_code', { id: editingCode.id, code: cleanCode, data: dataToSave });
        fireToast(`Promo code "${cleanCode}" updated successfully!`, 'success');
      } else {
        // Create
        const { data, error } = await supabase
          .from('promo_codes')
          .insert([{ ...dataToSave, usage_count: 0 }])
          .select()
          .single();

        if (error) throw error;

        mirrorPromoCreate(data || dataToSave);
        logAction('create_promo_code', { code: cleanCode, data: dataToSave });
        fireToast(`Promo code "${cleanCode}" created successfully!`, 'success');
      }

      setIsModalOpen(false);
      setEditingCode(null);
      fetchPromoCodes();
    } catch (error: any) {
      console.error('Error saving promo code:', error);
      fireToast(`Failed to save promo code: ${error.message || 'Unknown error'}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle Active Status
  const toggleActive = async (id: string, currentStatus: boolean, codeName: string) => {
    try {
      const newStatus = !currentStatus;
      const { error } = await supabase
        .from('promo_codes')
        .update({ active: newStatus })
        .eq('id', id);

      if (error) throw error;

      // Optimistic state update
      setPromoCodes((prev) =>
        prev.map((item) => (item.id === id ? { ...item, active: newStatus } : item))
      );

      mirrorPromoSetActive(id, newStatus);
      logAction('toggle_promo_code_active', { id, code: codeName, active: newStatus });
      fireToast(`Promo "${codeName}" is now ${newStatus ? 'ACTIVE' : 'INACTIVE'}.`, 'info');
    } catch (error: any) {
      console.error('Error updating promo status:', error);
      fireToast('Failed to change promo status: ' + error.message, 'error');
      fetchPromoCodes();
    }
  };

  // Delete Promo Code
  const handleDelete = async () => {
    if (!codeToDelete) return;
    try {
      const { error } = await supabase
        .from('promo_codes')
        .delete()
        .eq('id', codeToDelete.id);

      if (error) throw error;

      // Optimistic delete
      setPromoCodes((prev) => prev.filter((c) => c.id !== codeToDelete.id));

      mirrorPromoDelete(codeToDelete.id);
      logAction('delete_promo_code', { id: codeToDelete.id, code: codeToDelete.code });
      fireToast(`Promo code "${codeToDelete.code}" was deleted.`, 'success');
      setIsDeleteModalOpen(false);
      setCodeToDelete(null);
    } catch (error: any) {
      console.error('Error deleting promo code:', error);
      fireToast(`Error deleting promo code: ${error.message}`, 'error');
    }
  };

  // Duplicate / Clone promo code
  const handleDuplicate = (code: PromoCode) => {
    setEditingCode(null);
    setFormData({
      code: `${code.code}_COPY`,
      discount_type: code.discount_type,
      discount_value: code.discount_value,
      min_purchase_amount: code.min_purchase_amount || 0,
      max_discount_amount: code.max_discount_amount,
      usage_limit: code.usage_limit,
      is_unlimited_usage: !code.usage_limit || code.usage_limit <= 0,
      start_date: code.start_date ? code.start_date.split('T')[0] : undefined,
      end_date: code.end_date ? code.end_date.split('T')[0] : undefined,
      active: true
    });
    setIsModalOpen(true);
  };

  // KPI Metrics Calculation
  const metrics = useMemo(() => {
    const total = promoCodes.length;
    const now = new Date().getTime();
    const active = promoCodes.filter((c) => {
      if (!c.active) return false;
      if (c.end_date && new Date(c.end_date).getTime() < now) return false;
      if (c.usage_limit && c.usage_count >= c.usage_limit) return false;
      return true;
    }).length;

    const totalRedemptions = promoCodes.reduce((sum, c) => sum + (c.usage_count || 0), 0);
    const maxPercentDiscount = Math.max(
      0,
      ...promoCodes.filter((c) => c.discount_type === 'percentage').map((c) => c.discount_value || 0)
    );

    return { total, active, totalRedemptions, maxPercentDiscount };
  }, [promoCodes]);

  // Filtering and Sorting
  const filteredAndSortedCodes = useMemo(() => {
    const now = new Date().getTime();

    const result = promoCodes.filter((item) => {
      // Search
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const matchesCode = item.code.toLowerCase().includes(q);
        const matchesType = item.discount_type.toLowerCase().includes(q);
        const matchesValue = item.discount_value.toString().includes(q);
        if (!matchesCode && !matchesType && !matchesValue) return false;
      }

      // Tab filter
      const isExpired = item.end_date ? new Date(item.end_date).getTime() < now : false;
      const isLimitReached = item.usage_limit ? item.usage_count >= item.usage_limit : false;

      if (selectedTab === 'active') return item.active && !isExpired && !isLimitReached;
      if (selectedTab === 'inactive') return !item.active;
      if (selectedTab === 'expired') return isExpired || isLimitReached;
      if (selectedTab === 'percentage') return item.discount_type === 'percentage';
      if (selectedTab === 'fixed') return item.discount_type === 'fixed';

      return true;
    });

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }
      if (sortBy === 'most_used') {
        return (b.usage_count || 0) - (a.usage_count || 0);
      }
      if (sortBy === 'highest_discount') {
        return (b.discount_value || 0) - (a.discount_value || 0);
      }
      if (sortBy === 'expiring_soon') {
        const timeA = a.end_date ? new Date(a.end_date).getTime() : Infinity;
        const timeB = b.end_date ? new Date(b.end_date).getTime() : Infinity;
        return timeA - timeB;
      }
      if (sortBy === 'code_asc') {
        return a.code.localeCompare(b.code);
      }
      return 0;
    });

    return result;
  }, [promoCodes, searchQuery, selectedTab, sortBy]);

  // Helper: check expiry status
  const getExpiryDetails = (endDate?: string) => {
    if (!endDate) return { text: 'Lifetime / No Expiry', isExpired: false, isUrgent: false };
    const end = new Date(endDate).getTime();
    const now = new Date().getTime();
    const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: 'Expired', isExpired: true, isUrgent: false };
    if (diffDays === 0) return { text: 'Expires Today', isExpired: false, isUrgent: true };
    if (diffDays <= 3) return { text: `${diffDays} days left`, isExpired: false, isUrgent: true };
    return { text: new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), isExpired: false, isUrgent: false };
  };

  return (
    <div className="space-y-6">
      {/* ─── Hero Header & Actions ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#3C6CA8]/10 dark:bg-[#3C6CA8]/20 border border-[#3C6CA8]/25 text-[#3C6CA8] dark:text-blue-400 flex items-center justify-center shrink-0 shadow-inner">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                Promo Codes & Vouchers
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-[#3C6CA8]/10 text-[#3C6CA8] dark:bg-blue-950 dark:text-blue-400 border border-[#3C6CA8]/20">
                LIVE SYNC
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-0.5">
              Create, manage, and validate customer discounts, limits, and redemption rules
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => fetchPromoCodes(true)}
            title="Refresh Live Data"
            className={`p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all cursor-pointer ${
              isRefreshing ? 'opacity-70' : ''
            }`}
          >
            <RotateCw className={`w-4 h-4 text-[#3C6CA8] ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => openModal()}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-[#3C6CA8] hover:bg-[#325a8c] text-white px-4 sm:px-5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-[#3C6CA8]/20 hover:shadow-[#3C6CA8]/30 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Code</span>
          </button>
        </div>
      </div>

      {/* ─── Metric KPI Highlights ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Codes */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] sm:text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Total Codes</p>
            <p className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mt-1">{metrics.total}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-slate-800 text-[#3C6CA8] flex items-center justify-center">
            <Tag className="w-5 h-5" />
          </div>
        </div>

        {/* Active Promos */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] sm:text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Active Deals</p>
            <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1.5">
              <span>{metrics.active}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Total Redemptions */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] sm:text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Redemptions</p>
            <p className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{metrics.totalRedemptions}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>

        {/* Max Discount Available */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] sm:text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Top Discount</p>
            <p className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
              {metrics.maxPercentDiscount > 0 ? `${metrics.maxPercentDiscount}% OFF` : 'N/A'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ─── Search, Filter Tabs & Sort Controls ─────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800 p-4 space-y-3.5 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input id="promocodemanager-search-code-name-discount-valu" name="search_code_name_discount_valu" type="text"
              placeholder="Search code name, discount value..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-gray-800 dark:text-slate-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative flex items-center">
              <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400 absolute left-3 pointer-events-none" />
              <select id="promocodemanager-input-2" name="input_2" value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="pl-8 pr-8 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-[#3C6CA8]/30 appearance-none cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="most_used">Most Used</option>
                <option value="highest_discount">Highest Discount</option>
                <option value="expiring_soon">Expiring Soon</option>
                <option value="code_asc">Code (A-Z)</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {(
            [
              { id: 'all', label: 'All', count: promoCodes.length },
              { id: 'active', label: 'Active', count: metrics.active },
              { id: 'inactive', label: 'Inactive', count: promoCodes.filter((c) => !c.active).length },
              { id: 'expired', label: 'Expired / Limit', count: promoCodes.filter((c) => (c.end_date && new Date(c.end_date).getTime() < new Date().getTime()) || (c.usage_limit && c.usage_count >= c.usage_limit)).length },
              { id: 'percentage', label: 'Percentage (%)', count: promoCodes.filter((c) => c.discount_type === 'percentage').length },
              { id: 'fixed', label: 'Fixed (₱)', count: promoCodes.filter((c) => c.discount_type === 'fixed').length }
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as FilterTab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedTab === tab.id
                  ? 'bg-[#3C6CA8] text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${selectedTab === tab.id ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Main Content: Desktop Table & Mobile Card Deck ─────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <RotateCw className="w-8 h-8 animate-spin text-[#3C6CA8] mx-auto mb-3" />
            <p className="text-sm font-bold text-gray-600 dark:text-slate-300">Syncing live promo codes...</p>
          </div>
        ) : filteredAndSortedCodes.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-slate-800 text-gray-400 mx-auto flex items-center justify-center">
              <Tag className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-gray-800 dark:text-white">No promo codes found</h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 max-w-sm mx-auto">
              {searchQuery ? `No results matching "${searchQuery}". Try clearing the search.` : 'You have not created any promo codes yet. Start by creating one!'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => openModal()}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-[#3C6CA8] text-white text-xs font-bold rounded-xl hover:bg-[#325a8c] transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Your First Promo Code
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View (>= 1024px) */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 dark:bg-slate-800/60 border-b border-gray-200 dark:border-slate-800 text-[11px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-5">Promo Code</th>
                    <th className="py-3.5 px-5">Discount Details</th>
                    <th className="py-3.5 px-5">Status</th>
                    <th className="py-3.5 px-5">Usage & Limit</th>
                    <th className="py-3.5 px-5">Validity</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800/70 text-xs">
                  {filteredAndSortedCodes.map((code) => {
                    const expiry = getExpiryDetails(code.end_date);
                    const usagePercent = code.usage_limit && code.usage_limit > 0 ? Math.min(100, Math.round((code.usage_count / code.usage_limit) * 100)) : 0;
                    const isLimitReached = code.usage_limit ? code.usage_count >= code.usage_limit : false;

                    return (
                      <tr
                        key={code.id}
                        className="hover:bg-gray-50/60 dark:hover:bg-slate-800/40 transition-colors group"
                      >
                        {/* Promo Code Column */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-sm text-gray-900 dark:text-white px-2.5 py-1 bg-gray-100 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 tracking-wider">
                              {code.code}
                            </span>
                            <button
                              onClick={() => handleCopyCode(code.code, code.id)}
                              title="Copy Promo Code"
                              className="p-1.5 text-gray-400 hover:text-[#3C6CA8] hover:bg-[#3C6CA8]/10 rounded-md transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                            >
                              {copiedCodeId === code.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                          <span className="block text-[10px] text-gray-400 mt-1">
                            Created: {new Date(code.created_at || Date.now()).toLocaleDateString()}
                          </span>
                        </td>

                        {/* Discount Details */}
                        <td className="py-4 px-5">
                          <div className="space-y-1">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black ${
                                code.discount_type === 'percentage'
                                  ? 'bg-[#3C6CA8]/10 text-[#3C6CA8] dark:bg-blue-950/60 dark:text-blue-300 border border-[#3C6CA8]/20'
                                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50'
                              }`}
                            >
                              {code.discount_type === 'percentage' ? (
                                <>
                                  <Percent className="w-3 h-3" />
                                  <span>{code.discount_value}% OFF</span>
                                </>
                              ) : (
                                <span>₱{code.discount_value.toLocaleString()} OFF</span>
                              )}
                            </span>

                            {code.min_purchase_amount > 0 && (
                              <p className="text-[11px] text-gray-500 dark:text-slate-400 font-medium">
                                Min Spend: <span className="font-bold text-gray-700 dark:text-slate-300">₱{code.min_purchase_amount.toLocaleString()}</span>
                              </p>
                            )}

                            {code.max_discount_amount && code.max_discount_amount > 0 && (
                              <p className="text-[10px] text-gray-400">
                                Cap: ₱{code.max_discount_amount.toLocaleString()}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Status Column */}
                        <td className="py-4 px-5">
                          <button
                            onClick={() => toggleActive(code.id, code.active, code.code)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                              code.active && !expiry.isExpired && !isLimitReached
                                ? 'bg-emerald-100/70 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 hover:bg-emerald-200 border border-emerald-300 dark:border-emerald-800'
                                : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-gray-200 border border-gray-200 dark:border-slate-700'
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                code.active && !expiry.isExpired && !isLimitReached ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'
                              }`}
                            />
                            <span>{code.active && !expiry.isExpired && !isLimitReached ? 'ACTIVE' : 'INACTIVE'}</span>
                          </button>
                        </td>

                        {/* Usage Column */}
                        <td className="py-4 px-5">
                          <div className="space-y-1 max-w-[130px]">
                            <div className="flex items-center justify-between text-xs font-bold text-gray-700 dark:text-slate-200">
                              <span>{code.usage_count} uses</span>
                              <span className="text-[10px] text-gray-400">
                                {code.usage_limit ? `/ ${code.usage_limit}` : '(∞)'}
                              </span>
                            </div>
                            {code.usage_limit && code.usage_limit > 0 && (
                              <div className="w-full bg-gray-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    usagePercent >= 90 ? 'bg-rose-500' : 'bg-[#3C6CA8]'
                                  }`}
                                  style={{ width: `${usagePercent}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Expiry Column */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-1.5">
                            <Clock className={`w-3.5 h-3.5 ${expiry.isExpired ? 'text-rose-500' : expiry.isUrgent ? 'text-amber-500' : 'text-gray-400'}`} />
                            <span
                              className={`text-xs font-semibold ${
                                expiry.isExpired
                                  ? 'text-rose-600 dark:text-rose-400 font-bold'
                                  : expiry.isUrgent
                                  ? 'text-amber-600 dark:text-amber-400 font-bold'
                                  : 'text-gray-600 dark:text-slate-300'
                              }`}
                            >
                              {expiry.text}
                            </span>
                          </div>
                        </td>

                        {/* Actions Column */}
                        <td className="py-4 px-5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleDuplicate(code)}
                              title="Duplicate Code"
                              className="p-2 text-gray-500 hover:text-[#3C6CA8] hover:bg-[#3C6CA8]/10 rounded-lg transition-colors cursor-pointer"
                            >
                              <Layers className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openModal(code)}
                              title="Edit Code"
                              className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setCodeToDelete(code);
                                setIsDeleteModalOpen(true);
                              }}
                              title="Delete Code"
                              className="p-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile & Tablet Card Deck View (< 1024px) */}
            <div className="block lg:hidden divide-y divide-gray-100 dark:divide-slate-800/80">
              {filteredAndSortedCodes.map((code) => {
                const expiry = getExpiryDetails(code.end_date);
                const usagePercent = code.usage_limit && code.usage_limit > 0 ? Math.min(100, Math.round((code.usage_count / code.usage_limit) * 100)) : 0;
                const isLimitReached = code.usage_limit ? code.usage_count >= code.usage_limit : false;

                return (
                  <div key={code.id} className="p-4 sm:p-5 space-y-3.5">
                    {/* Header: Monospace Code + Status Toggle */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sm sm:text-base text-gray-900 dark:text-white px-2.5 py-1 bg-gray-100 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 tracking-wider">
                          {code.code}
                        </span>
                        <button
                          onClick={() => handleCopyCode(code.code, code.id)}
                          className="p-1.5 text-gray-400 hover:text-[#3C6CA8] bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 cursor-pointer"
                        >
                          {copiedCodeId === code.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      <button
                        onClick={() => toggleActive(code.id, code.active, code.code)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                          code.active && !expiry.isExpired && !isLimitReached
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                            : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400 border border-gray-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${code.active && !expiry.isExpired && !isLimitReached ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                        <span>{code.active && !expiry.isExpired && !isLimitReached ? 'ACTIVE' : 'INACTIVE'}</span>
                      </button>
                    </div>

                    {/* Middle Details Grid */}
                    <div className="grid grid-cols-2 gap-2 bg-gray-50 dark:bg-slate-800/60 p-3 rounded-xl border border-gray-100 dark:border-slate-800 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-400 block">Discount</span>
                        <span className="font-extrabold text-gray-900 dark:text-white text-sm">
                          {code.discount_type === 'percentage' ? `${code.discount_value}% OFF` : `₱${code.discount_value.toLocaleString()} OFF`}
                        </span>
                        {code.min_purchase_amount > 0 && (
                          <span className="text-[10px] text-gray-500 block">Min: ₱{code.min_purchase_amount.toLocaleString()}</span>
                        )}
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-400 block">Validity</span>
                        <span
                          className={`font-bold block ${
                            expiry.isExpired ? 'text-rose-600' : expiry.isUrgent ? 'text-amber-600' : 'text-gray-800 dark:text-slate-200'
                          }`}
                        >
                          {expiry.text}
                        </span>
                        <span className="text-[10px] text-gray-400 block">
                          Used: {code.usage_count} {code.usage_limit ? `/ ${code.usage_limit}` : '(Unlimited)'}
                        </span>
                      </div>
                    </div>

                    {/* Usage Progress Bar if limited */}
                    {code.usage_limit && code.usage_limit > 0 && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] text-gray-500">
                          <span>Usage Capacity</span>
                          <span className="font-bold">{usagePercent}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${usagePercent >= 90 ? 'bg-rose-500' : 'bg-[#3C6CA8]'}`}
                            style={{ width: `${usagePercent}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Footer Actions */}
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-100 dark:border-slate-800">
                      <button
                        onClick={() => handleDuplicate(code)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-gray-200 cursor-pointer"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Clone</span>
                      </button>
                      <button
                        onClick={() => openModal(code)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-100 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => {
                          setCodeToDelete(code);
                          setIsDeleteModalOpen(true);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 dark:bg-slate-800 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-bold hover:bg-rose-100 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ─── Create / Edit Modal Dialog ─────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200 dark:border-slate-800 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#3C6CA8]/10 text-[#3C6CA8] flex items-center justify-center">
                  <Tag className="w-4 h-4" />
                </div>
                <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                  {editingCode ? 'Edit Promo Code' : 'Create New Promo Code'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs sm:text-sm">
              {/* Promo Code string + Generator */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="promocodemanager-promo-code-input" className="block font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
                    Promo Code String <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomCode}
                    className="text-[11px] font-bold text-[#3C6CA8] hover:text-[#2D5384] flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    Generate Code
                  </button>
                </div>
                <input id="promocodemanager-promo-code-input" name="promo_code" type="text"
                  autoComplete="off"
                  required
                  placeholder="e.g. SLIMDOSE20, SUMMER15"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl uppercase font-mono font-bold text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8]"
                />
              </div>

              {/* Discount Type Selector Pills */}
              <div>
                <span className="block font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider text-[11px] mb-1.5">
                  Discount Type <span className="text-rose-500">*</span>
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, discount_type: 'percentage' })}
                    className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                      formData.discount_type === 'percentage'
                        ? 'bg-[#3C6CA8]/10 text-[#3C6CA8] border-[#3C6CA8] dark:bg-blue-950 dark:text-blue-400'
                        : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-50'
                    }`}
                  >
                    <Percent className="w-4 h-4" />
                    <span>Percentage (%)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, discount_type: 'fixed' })}
                    className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                      formData.discount_type === 'fixed'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-500 dark:bg-emerald-950 dark:text-emerald-400'
                        : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-50'
                    }`}
                  >
                    <span>Fixed Amount (₱)</span>
                  </button>
                </div>
              </div>

              {/* Discount Value & Min Purchase */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="promocodemanager-discount-value" className="block font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider text-[11px] mb-1">
                    Discount Value {formData.discount_type === 'percentage' ? '(%)' : '(₱)'} <span className="text-rose-500">*</span>
                  </label>
                  <input id="promocodemanager-discount-value" name="discount_value" type="number"
                    required
                    min="1"
                    max={formData.discount_type === 'percentage' ? 100 : 1000000}
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8]"
                  />
                </div>

                <div>
                  <label htmlFor="promocodemanager-min-spend" className="block font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider text-[11px] mb-1">
                    Min Spend (₱)
                  </label>
                  <input id="promocodemanager-min-spend" name="min_spend" type="number"
                    min="0"
                    placeholder="0 for No Min"
                    value={formData.min_purchase_amount || ''}
                    onChange={(e) => setFormData({ ...formData, min_purchase_amount: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8]"
                  />
                </div>
              </div>

              {/* Usage Limit & Unlimited Toggle */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="promocodemanager-usage-limit" className="font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
                    Usage Limit
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-slate-400 cursor-pointer">
                    <input id="promocodemanager-usage-limit" name="usage_limit" type="checkbox"
                      checked={formData.is_unlimited_usage}
                      onChange={(e) => setFormData({ ...formData, is_unlimited_usage: e.target.checked })}
                      className="rounded text-[#3C6CA8] focus:ring-[#3C6CA8]"
                    />
                    <span>Unlimited Uses</span>
                  </label>
                </div>
                {!formData.is_unlimited_usage && (
                  <input id="promocodemanager-e-g-50-100" name="e_g_50_100" type="number"
                    min="1"
                    placeholder="e.g. 50, 100"
                    value={formData.usage_limit || ''}
                    onChange={(e) => setFormData({ ...formData, usage_limit: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8]"
                  />
                )}
              </div>

              {/* Expiry Date */}
              <div>
                <label htmlFor="promocodemanager-expiry-date-optional" className="block font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider text-[11px] mb-1">
                  Expiry Date (Optional)
                </label>
                <input id="promocodemanager-expiry-date-optional" name="expiry_date_optional" type="date"
                  value={formData.end_date || ''}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value || undefined })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8]"
                />
              </div>

              {/* Live Preview Box */}
              <div className="p-3 bg-gray-50 dark:bg-slate-800/80 rounded-xl border border-gray-200 dark:border-slate-700">
                <span className="text-[10px] font-extrabold uppercase text-gray-400 block mb-1">Live Customer Preview</span>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-[#3C6CA8]" />
                    <span className="font-mono font-bold text-gray-800 dark:text-white">
                      {formData.code.trim() || 'PROMOCODE'}
                    </span>
                  </div>
                  <span className="font-extrabold text-[#3C6CA8] dark:text-blue-400">
                    {formData.discount_type === 'percentage'
                      ? `${formData.discount_value || 0}% OFF`
                      : `₱${(formData.discount_value || 0).toLocaleString()} OFF`}
                  </span>
                </div>
              </div>

              {/* Active Toggle Switch */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <p className="font-bold text-gray-800 dark:text-white text-xs">Enable Promo Code Immediately</p>
                  <p className="text-[11px] text-gray-400">Customers will be able to apply this code at checkout</p>
                </div>
                <input id="promocodemanager-checkbox-6" name="checkbox_6" type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-5 h-5 rounded text-[#3C6CA8] focus:ring-[#3C6CA8] cursor-pointer"
                />
              </div>

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-[#3C6CA8] hover:bg-[#325a8c] text-white rounded-xl font-extrabold shadow-md shadow-[#3C6CA8]/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : editingCode ? 'Update Promo Code' : 'Create Promo Code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation Modal ──────────────────────────────────── */}
      {isDeleteModalOpen && codeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-5 border border-gray-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-black text-gray-900 dark:text-white">Delete Promo Code?</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                Are you sure you want to delete <span className="font-mono font-bold text-gray-800 dark:text-slate-200">"{codeToDelete.code}"</span>? Customers will no longer be able to redeem it.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setCodeToDelete(null);
                }}
                className="flex-1 py-2 px-3 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 font-bold rounded-xl text-xs hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md shadow-rose-600/20 transition-all cursor-pointer"
              >
                Delete Code
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromoCodeManager;
