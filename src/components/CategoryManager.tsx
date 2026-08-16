import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  FolderOpen,
  CheckCircle2,
  Search,
  RotateCw,
  Package,
  ArrowUpDown,
  X,
  Layers,
  Sparkles,
  SlidersHorizontal,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  AlertTriangle
} from 'lucide-react';
import { useCategories, Category } from '../hooks/useCategories';
import { supabase } from '../lib/supabase';
import { fireToast } from './ToastNotification';

interface CategoryManagerProps {
  onBack: () => void;
  adminEmail?: string;
  adminRole?: string;
}

type FilterTab = 'all' | 'active' | 'inactive' | 'populated' | 'empty';
type SortOption = 'sort_order' | 'name_asc' | 'most_products' | 'least_products';

const EMOJI_PRESETS = ['🔬', '🧬', '🧪', '⚖️', '🏃‍♂️', '🧠', '💧', '💊', '⚡', '🛡️', '📦', '🌿', '☕', '✨'];

const STANDARD_CATEGORIES = [
  { id: 'research', name: 'Research Peptides', icon: '🔬', sort_order: 1, active: true },
  { id: 'metabolic', name: 'GLP-1 & Metabolic', icon: '⚖️', sort_order: 2, active: true },
  { id: 'recovery', name: 'Tissue & Recovery', icon: '🏃‍♂️', sort_order: 3, active: true },
  { id: 'longevity', name: 'Longevity & Anti-Aging', icon: '🧬', sort_order: 4, active: true },
  { id: 'cognitive', name: 'Cognitive & Nootropics', icon: '🧠', sort_order: 5, active: true },
  { id: 'supplies', name: 'Supplies & Bac Water', icon: '💧', sort_order: 6, active: true },
];

const CategoryManager: React.FC<CategoryManagerProps> = ({
  onBack,
  adminEmail = 'admin@slimdose.ph',
  adminRole = 'admin',
}) => {
  const { categories, addCategory, updateCategory, deleteCategory, refetch, loading } = useCategories({ activeOnly: false });
  const [categoryProductCounts, setCategoryProductCounts] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState<FilterTab>('all');
  const [sortBy, setSortBy] = useState<SortOption>('sort_order');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    icon: '🔬',
    sort_order: 1,
    active: true,
  });

  // Log Admin Action
  const logAdminAction = async (action: string, details?: any) => {
    try {
      await supabase.from('admin_audit_logs').insert([
        {
          user_email: adminEmail,
          user_role: adminRole,
          action,
          details,
        },
      ]);
    } catch (e) {
      console.warn('Audit log error:', e);
    }
  };

  // Fetch product counts per category
  const fetchProductCounts = async () => {
    try {
      const { data, error } = await supabase.from('products').select('category');
      if (error) throw error;

      const counts: Record<string, number> = {};
      if (data) {
        data.forEach((p) => {
          if (p.category) {
            counts[p.category] = (counts[p.category] || 0) + 1;
          }
        });
      }
      setCategoryProductCounts(counts);
    } catch (err) {
      console.warn('Error fetching product counts:', err);
    }
  };

  useEffect(() => {
    fetchProductCounts();
  }, [categories]);

  // Refresh handler
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    await fetchProductCounts();
    setIsRefreshing(false);
    fireToast('Categories synchronized live', 'success', 2000);
  };

  // Generate ID Slug helper
  const generateIdFromName = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  // Open Modal for Create or Edit
  const openModal = (cat?: Category) => {
    if (cat) {
      setEditingCategory(cat);
      setFormData({
        id: cat.id,
        name: cat.name,
        icon: cat.icon || '🔬',
        sort_order: cat.sort_order || 1,
        active: cat.active ?? true,
      });
    } else {
      setEditingCategory(null);
      const nextSort = categories.length > 0 ? Math.max(...categories.map((c) => c.sort_order || 0)) + 1 : 1;
      setFormData({
        id: '',
        name: '',
        icon: '🔬',
        sort_order: nextSort,
        active: true,
      });
    }
    setIsModalOpen(true);
  };

  // Save Category
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      fireToast('Please enter a category name.', 'warning');
      return;
    }

    const cleanId = formData.id.trim() || generateIdFromName(formData.name);
    if (!cleanId) {
      fireToast('Category ID is required.', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          name: formData.name.trim(),
          icon: formData.icon.trim() || '🔬',
          sort_order: Number(formData.sort_order) || 1,
          active: formData.active,
        });
        logAdminAction('update_category', { id: editingCategory.id, name: formData.name });
        fireToast(`Category "${formData.name}" updated successfully!`, 'success');
      } else {
        await addCategory({
          id: cleanId,
          name: formData.name.trim(),
          icon: formData.icon.trim() || '🔬',
          sort_order: Number(formData.sort_order) || 1,
          active: formData.active,
        });
        logAdminAction('create_category', { id: cleanId, name: formData.name });
        fireToast(`Category "${formData.name}" created successfully!`, 'success');
      }

      setIsModalOpen(false);
      setEditingCategory(null);
      await refetch();
    } catch (err: any) {
      console.error('Error saving category:', err);
      fireToast(`Failed to save category: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle Active Status
  const toggleActive = async (cat: Category) => {
    try {
      const newStatus = !cat.active;
      await updateCategory(cat.id, { active: newStatus });
      logAdminAction('toggle_category_active', { id: cat.id, active: newStatus });
      fireToast(`Category "${cat.name}" is now ${newStatus ? 'ACTIVE' : 'INACTIVE'}.`, 'info');
    } catch (err: any) {
      fireToast(`Failed to update status: ${err.message}`, 'error');
    }
  };

  // Quick Reorder (Move Up / Move Down)
  const handleMoveOrder = async (cat: Category, direction: 'up' | 'down') => {
    const sorted = [...categories].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const currentIndex = sorted.findIndex((c) => c.id === cat.id);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    const targetCat = sorted[targetIndex];
    const tempOrder = cat.sort_order;

    try {
      await updateCategory(cat.id, { sort_order: targetCat.sort_order });
      await updateCategory(targetCat.id, { sort_order: tempOrder });
      await refetch();
      fireToast(`Reordered "${cat.name}"`, 'success', 1500);
    } catch (err: any) {
      fireToast('Failed to reorder: ' + err.message, 'error');
    }
  };

  // Delete Category
  const handleDelete = async () => {
    if (!categoryToDelete) return;
    try {
      await deleteCategory(categoryToDelete.id);
      logAdminAction('delete_category', { id: categoryToDelete.id, name: categoryToDelete.name });
      fireToast(`Category "${categoryToDelete.name}" deleted.`, 'success');
      setIsDeleteModalOpen(false);
      setCategoryToDelete(null);
    } catch (err: any) {
      fireToast(err.message || 'Failed to delete category', 'error');
    }
  };

  // Seed / Initialize Standard Categories
  const handleSeedStandardCategories = async () => {
    setIsSeeding(true);
    try {
      for (const standard of STANDARD_CATEGORIES) {
        const exists = categories.some((c) => c.id === standard.id);
        if (!exists) {
          await addCategory(standard);
        }
      }
      await refetch();
      await fetchProductCounts();
      fireToast('Standard peptide categories loaded successfully! ⚡', 'success');
    } catch (err: any) {
      fireToast(`Failed to load standard categories: ${err.message}`, 'error');
    } finally {
      setIsSeeding(false);
    }
  };

  // KPI Metrics
  const metrics = useMemo(() => {
    const total = categories.length;
    const active = categories.filter((c) => c.active).length;
    const totalProducts = Object.values(categoryProductCounts).reduce((a, b) => a + b, 0);
    const empty = categories.filter((c) => (categoryProductCounts[c.id] || 0) === 0).length;
    return { total, active, totalProducts, empty };
  }, [categories, categoryProductCounts]);

  // Filter & Sort Categories
  const filteredAndSortedCategories = useMemo(() => {
    const result = categories.filter((c) => {
      // Search
      const q = searchTerm.trim().toLowerCase();
      if (q) {
        const matchesName = c.name.toLowerCase().includes(q);
        const matchesId = c.id.toLowerCase().includes(q);
        if (!matchesName && !matchesId) return false;
      }

      // Tab filter
      const count = categoryProductCounts[c.id] || 0;
      if (selectedTab === 'active') return c.active;
      if (selectedTab === 'inactive') return !c.active;
      if (selectedTab === 'populated') return count > 0;
      if (selectedTab === 'empty') return count === 0;

      return true;
    });

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'sort_order') {
        return (a.sort_order || 0) - (b.sort_order || 0);
      }
      if (sortBy === 'name_asc') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'most_products') {
        return (categoryProductCounts[b.id] || 0) - (categoryProductCounts[a.id] || 0);
      }
      if (sortBy === 'least_products') {
        return (categoryProductCounts[a.id] || 0) - (categoryProductCounts[b.id] || 0);
      }
      return 0;
    });

    return result;
  }, [categories, searchTerm, selectedTab, sortBy, categoryProductCounts]);

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-6 font-inter">
      {/* ─── Hero Header Bar ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-[#3C6CA8]/10 dark:bg-[#3C6CA8]/20 border border-[#3C6CA8]/25 text-[#3C6CA8] dark:text-[#94BBE9] flex items-center justify-center shrink-0 shadow-inner">
            <FolderOpen className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-[#232323] dark:text-white tracking-tight">
                Product Categories
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-[#3C6CA8]/10 text-[#3C6CA8] dark:bg-[#3C6CA8]/20 dark:text-[#94BBE9] border border-[#3C6CA8]/25">
                LIVE SYNC
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Organize peptide product lines, icons, display order, and storefront navigation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={handleManualRefresh}
            title="Refresh Live Data"
            className={`p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer ${
              isRefreshing ? 'opacity-70' : ''
            }`}
          >
            <RotateCw className={`w-4 h-4 text-[#3C6CA8] ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          {categories.length === 0 && (
            <button
              onClick={handleSeedStandardCategories}
              disabled={isSeeding}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-extrabold bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isSeeding ? 'Loading...' : 'Load Standard Categories'}</span>
            </button>
          )}

          <button
            onClick={() => openModal()}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-[#3C6CA8] hover:bg-[#315A8E] text-white px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black shadow-md shadow-[#3C6CA8]/20 hover:shadow-[#3C6CA8]/30 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Category</span>
          </button>
        </div>
      </div>

      {/* ─── Metric KPI Highlights ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Categories */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Categories</p>
            <p className="text-xl sm:text-2xl font-black text-[#232323] dark:text-white mt-1">{metrics.total}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-slate-800 text-[#3C6CA8] flex items-center justify-center">
            <FolderOpen className="w-5 h-5" />
          </div>
        </div>

        {/* Active Categories */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Active Lines</p>
            <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1.5">
              <span>{metrics.active}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Categorized Products */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Products</p>
            <p className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{metrics.totalProducts}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
        </div>

        {/* Empty Categories */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Empty Categories</p>
            <p className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{metrics.empty}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ─── Search, Filter Tabs & Sort Controls ─────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 space-y-3.5 shadow-2xs">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input id="categorymanager-search-by-category-name-slug-i" name="search_by_category_name_slug_i" type="text"
              placeholder="Search by category name, slug ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative flex items-center">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
              <select id="categorymanager-input-2" name="input_2" value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="pl-8 pr-8 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-[#3C6CA8]/30 appearance-none cursor-pointer"
              >
                <option value="sort_order">Sort Order (Ascending)</option>
                <option value="name_asc">Name (A-Z)</option>
                <option value="most_products">Most Products</option>
                <option value="least_products">Least Products</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {(
            [
              { id: 'all', label: 'All', count: categories.length },
              { id: 'active', label: 'Active', count: metrics.active },
              { id: 'inactive', label: 'Inactive', count: categories.filter((c) => !c.active).length },
              { id: 'populated', label: 'With Products', count: categories.filter((c) => (categoryProductCounts[c.id] || 0) > 0).length },
              { id: 'empty', label: 'Empty (0)', count: metrics.empty },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as FilterTab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedTab === tab.id
                  ? 'bg-[#3C6CA8] text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                  selectedTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Main Content: Desktop Table & Mobile Cards ─────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <RotateCw className="w-8 h-8 animate-spin text-[#3C6CA8] mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Loading categories...</p>
          </div>
        ) : filteredAndSortedCategories.length === 0 ? (
          <div className="p-10 sm:p-12 text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
              <FolderOpen className="w-8 h-8" />
            </div>
            <h3 className="text-base font-extrabold text-[#232323] dark:text-white">No categories found</h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {searchTerm || selectedTab !== 'all'
                ? 'No categories match your active filters or search term.'
                : 'You have not added any product categories yet.'}
            </p>

            <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
              <button
                onClick={() => openModal()}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#3C6CA8] text-white text-xs font-bold rounded-xl hover:bg-[#315A8E] transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Category
              </button>

              {categories.length === 0 && (
                <button
                  onClick={handleSeedStandardCategories}
                  disabled={isSeeding}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Load Standard Categories
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table View (>= 1024px) */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-5 w-24 text-center">Order</th>
                    <th className="py-3.5 px-5">Category & Slug</th>
                    <th className="py-3.5 px-5">Product Count</th>
                    <th className="py-3.5 px-5">Status</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-xs">
                  {filteredAndSortedCategories.map((cat, idx) => {
                    const productCount = categoryProductCounts[cat.id] || 0;
                    return (
                      <tr key={cat.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors group">
                        {/* Order Column */}
                        <td className="py-4 px-5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono font-bold text-xs flex items-center justify-center text-slate-700 dark:text-slate-300">
                              {cat.sort_order || idx + 1}
                            </span>
                            <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleMoveOrder(cat, 'up')}
                                title="Move up"
                                className="p-0.5 text-slate-400 hover:text-[#3C6CA8] cursor-pointer"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleMoveOrder(cat, 'down')}
                                title="Move down"
                                className="p-0.5 text-slate-400 hover:text-[#3C6CA8] cursor-pointer"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* Category & Slug */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3C6CA8]/10 to-blue-50 dark:from-slate-800 dark:to-slate-800/60 border border-[#3C6CA8]/20 flex items-center justify-center text-xl shrink-0 shadow-inner">
                              <span>{cat.icon || '🔬'}</span>
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-black text-sm text-[#232323] dark:text-white truncate group-hover:text-[#3C6CA8] transition-colors">
                                {cat.name}
                              </h4>
                              <span className="font-mono text-[10.5px] text-slate-400 dark:text-slate-500 block mt-0.5">
                                slug: <strong className="text-slate-600 dark:text-slate-300">{cat.id}</strong>
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Product Count */}
                        <td className="py-4 px-5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold ${
                              productCount > 0
                                ? 'bg-[#3C6CA8]/10 text-[#3C6CA8] dark:bg-[#3C6CA8]/20 dark:text-[#94BBE9] border border-[#3C6CA8]/20'
                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <Package className="w-3.5 h-3.5" />
                            <span>
                              {productCount} {productCount === 1 ? 'Product' : 'Products'}
                            </span>
                          </span>
                        </td>

                        {/* Status Column */}
                        <td className="py-4 px-5">
                          <button
                            onClick={() => toggleActive(cat)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                              cat.active
                                ? 'bg-emerald-100/70 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 hover:bg-emerald-200 border border-emerald-300 dark:border-emerald-800'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${cat.active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                            <span>{cat.active ? 'ACTIVE' : 'INACTIVE'}</span>
                          </button>
                        </td>

                        {/* Actions Column */}
                        <td className="py-4 px-5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openModal(cat)}
                              title="Edit Category"
                              className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setCategoryToDelete(cat);
                                setIsDeleteModalOpen(true);
                              }}
                              disabled={productCount > 0}
                              title={productCount > 0 ? 'Cannot delete category that contains products' : 'Delete Category'}
                              className="p-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
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
            <div className="block lg:hidden divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredAndSortedCategories.map((cat, idx) => {
                const productCount = categoryProductCounts[cat.id] || 0;
                return (
                  <div key={cat.id} className="p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-[#3C6CA8]/10 text-[#3C6CA8] flex items-center justify-center text-2xl shrink-0 border border-[#3C6CA8]/20 shadow-inner">
                          <span>{cat.icon || '🔬'}</span>
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-sm sm:text-base text-[#232323] dark:text-white truncate">
                            {cat.name}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono block truncate">
                            ID: {cat.id} • Order: #{cat.sort_order || idx + 1}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => toggleActive(cat)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold transition-all cursor-pointer shrink-0 ${
                          cat.active
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${cat.active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        <span>{cat.active ? 'ACTIVE' : 'INACTIVE'}</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                        <Package className="w-3.5 h-3.5 text-[#3C6CA8]" />
                        <span>{productCount} {productCount === 1 ? 'Product' : 'Products'}</span>
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openModal(cat)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-100 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => {
                            setCategoryToDelete(cat);
                            setIsDeleteModalOpen(true);
                          }}
                          disabled={productCount > 0}
                          className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 dark:bg-slate-800 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-bold hover:bg-rose-100 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ─── Create / Edit Category Modal Dialog ────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#3C6CA8]/10 text-[#3C6CA8] flex items-center justify-center">
                  <FolderOpen className="w-4 h-4" />
                </div>
                <h3 className="text-base sm:text-lg font-black text-[#232323] dark:text-white">
                  {editingCategory ? 'Edit Category' : 'Create New Category'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs sm:text-sm">
              {/* Category Name */}
              <div>
                <label htmlFor="categorymanager-category-name" className="block font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] mb-1.5">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input id="categorymanager-category-name" name="category_name" type="text"
                  required
                  placeholder="e.g. Research Peptides, GLP-1 Metabolic"
                  value={formData.name}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({
                      ...formData,
                      name: val,
                      id: editingCategory ? formData.id : generateIdFromName(val),
                    });
                  }}
                  className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8]"
                />
              </div>

              {/* Category ID Slug */}
              <div>
                <label htmlFor="categorymanager-category-id-slug" className="block font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] mb-1.5">
                  Category ID (Slug) <span className="text-rose-500">*</span>
                </label>
                <input id="categorymanager-category-id-slug" name="category_id_slug" type="text"
                  required
                  disabled={Boolean(editingCategory)}
                  placeholder="e.g. research-peptides"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: generateIdFromName(e.target.value) })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs font-bold bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-60 outline-none focus:ring-2 focus:ring-[#3C6CA8]/30"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {editingCategory ? 'Category ID cannot be modified after creation.' : 'Used in storefront URLs and database relations.'}
                </span>
              </div>

              {/* Icon & Preset Selector */}
              <div>
                <label htmlFor="categorymanager-category-icon-emoji" className="block font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] mb-1.5">
                  Category Icon / Emoji
                </label>
                <div className="flex items-center gap-3 mb-2">
                  <input id="categorymanager-category-icon-emoji" name="category_icon_emoji" type="text"
                    required
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    className="w-20 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-center text-xl font-bold bg-white dark:bg-slate-800"
                  />
                  <div className="flex-1 p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-bold">Selected Preview:</span>
                    <span className="text-2xl">{formData.icon || '🔬'}</span>
                  </div>
                </div>

                {/* Emoji presets */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {EMOJI_PRESETS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon: emoji })}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-base transition-all cursor-pointer ${
                        formData.icon === emoji
                          ? 'bg-[#3C6CA8] text-white scale-110 shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort Order */}
              <div>
                <label htmlFor="categorymanager-display-sort-order" className="block font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] mb-1">
                  Display Sort Order
                </label>
                <input id="categorymanager-display-sort-order" name="display_sort_order" type="number"
                  min="1"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: Number(e.target.value) || 1 })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#3C6CA8]/30"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Lower numbers appear first on the customer navigation bar.</span>
              </div>

              {/* Live Preview Box */}
              <div className="p-3 bg-[#3C6CA8]/5 dark:bg-slate-800/80 rounded-xl border border-[#3C6CA8]/20">
                <span className="text-[10px] font-extrabold uppercase text-[#3C6CA8] block mb-1">Storefront Button Preview</span>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xs">
                  <span className="text-lg">{formData.icon || '🔬'}</span>
                  <span className="font-extrabold text-xs text-slate-800 dark:text-white">
                    {formData.name.trim() || 'Category Name'}
                  </span>
                </div>
              </div>

              {/* Active Toggle Switch */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <p className="font-bold text-slate-800 dark:text-white text-xs">Enable Category</p>
                  <p className="text-[11px] text-slate-400">Show this category in the catalog filter</p>
                </div>
                <input id="categorymanager-checkbox-4" name="checkbox_4" type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-5 h-5 rounded text-[#3C6CA8] focus:ring-[#3C6CA8] cursor-pointer"
                />
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-[#3C6CA8] hover:bg-[#315A8E] text-white rounded-xl font-black shadow-md shadow-[#3C6CA8]/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : editingCategory ? 'Update Category' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation Modal ──────────────────────────────────── */}
      {isDeleteModalOpen && categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-5 border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Delete Category?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Are you sure you want to delete <span className="font-bold text-slate-800 dark:text-slate-200">"{categoryToDelete.name}"</span>?
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setCategoryToDelete(null);
                }}
                className="flex-1 py-2 px-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md shadow-rose-600/20 transition-all cursor-pointer"
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

export default CategoryManager;