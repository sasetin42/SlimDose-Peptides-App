import React, { useState, useMemo } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  ArrowLeft,
  Search,
  Eye,
  EyeOff,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ArrowUp,
  ArrowDown,
  Database,
  Tag
} from 'lucide-react';
import { useFAQsAdmin, FAQItem, defaultFAQs } from '../hooks/useFAQs';

interface FAQManagerProps {
  onBack?: () => void;
}

const DEFAULT_CATEGORIES = [
  'PRODUCT & USAGE',
  'ORDERING & PACKAGING',
  'PAYMENT METHODS',
  'SHIPPING & DELIVERY',
];

const FAQManager: React.FC<FAQManagerProps> = ({ onBack }) => {
  const { faqs, loading, addFAQ, updateFAQ, deleteFAQ, refetch } = useFAQsAdmin();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'hidden'>('all');
  const [expandedFaqIds, setExpandedFaqIds] = useState<Set<string>>(new Set());
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showDbInfo, setShowDbInfo] = useState(false);

  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    category: 'PRODUCT & USAGE',
    order_index: 1,
    is_active: true,
  });
  const [error, setError] = useState<string | null>(null);

  // Dynamic list of categories from existing FAQs and defaults
  const allCategories = useMemo(() => {
    const set = new Set<string>(DEFAULT_CATEGORIES);
    faqs.forEach(f => {
      if (f.category) set.add(f.category);
    });
    return Array.from(set);
  }, [faqs]);

  // Statistics
  const stats = useMemo(() => {
    const total = faqs.length;
    const active = faqs.filter(f => f.is_active).length;
    const hidden = total - active;
    const uniqueCategories = new Set(faqs.map(f => f.category)).size;
    return { total, active, hidden, uniqueCategories };
  }, [faqs]);

  const resetForm = () => {
    setFormData({
      question: '',
      answer: '',
      category: DEFAULT_CATEGORIES[0],
      order_index: faqs.length + 1,
      is_active: true,
    });
    setShowCustomCategory(false);
    setCustomCategoryInput('');
    setIsModalOpen(false);
    setEditingId(null);
    setError(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setFormData(prev => ({
      ...prev,
      category: selectedCategory !== 'ALL' ? selectedCategory : DEFAULT_CATEGORIES[0],
      order_index: faqs.length + 1
    }));
    setIsModalOpen(true);
  };

  const handleEdit = (faq: FAQItem) => {
    const isCustom = !DEFAULT_CATEGORIES.includes(faq.category);
    setFormData({
      question: faq.question,
      answer: faq.answer,
      category: isCustom ? 'CUSTOM' : faq.category,
      order_index: faq.order_index,
      is_active: faq.is_active,
    });
    if (isCustom) {
      setShowCustomCategory(true);
      setCustomCategoryInput(faq.category);
    } else {
      setShowCustomCategory(false);
      setCustomCategoryInput('');
    }
    setEditingId(faq.id);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.question.trim() || !formData.answer.trim()) {
      setError('Please provide both question and answer.');
      return;
    }

    const finalCategory = showCustomCategory
      ? (customCategoryInput.trim().toUpperCase() || 'GENERAL')
      : formData.category;

    try {
      setSaving(true);
      setError(null);
      const payload = {
        ...formData,
        category: finalCategory,
        order_index: Number(formData.order_index) || 1,
      };

      if (editingId) {
        await updateFAQ(editingId, payload);
      } else {
        await addFAQ(payload);
      }
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save FAQ');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, question: string) => {
    if (!window.confirm(`Are you sure you want to delete this FAQ?\n\n"${question}"`)) return;
    try {
      await deleteFAQ(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete FAQ');
    }
  };

  const toggleActive = async (faq: FAQItem) => {
    try {
      await updateFAQ(faq.id, { is_active: !faq.is_active });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle FAQ status');
    }
  };

  const handleMoveOrder = async (faq: FAQItem, direction: 'up' | 'down') => {
    const currentCategoryFaqs = faqs
      .filter(f => f.category === faq.category)
      .sort((a, b) => a.order_index - b.order_index);

    const currentIndex = currentCategoryFaqs.findIndex(f => f.id === faq.id);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= currentCategoryFaqs.length) return;

    const targetFaq = currentCategoryFaqs[targetIndex];

    try {
      // Swap order indices
      await updateFAQ(faq.id, { order_index: targetFaq.order_index });
      await updateFAQ(targetFaq.id, { order_index: faq.order_index });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder FAQ');
    }
  };

  const handleSeedDefaults = async () => {
    try {
      setSeeding(true);
      setError(null);
      const { seedDefaultFAQs } = await import('../hooks/useFAQs').then(() => ({ seedDefaultFAQs: (refetch as any) }));
      // Using seedDefaultFAQs through refetch or direct upsert
      for (const item of defaultFAQs) {
        await supabase.from('faqs').upsert({
          id: item.id,
          question: item.question,
          answer: item.answer,
          category: item.category,
          order_index: item.order_index,
          is_active: item.is_active,
          updated_at: new Date().toISOString()
        });
      }
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to seed FAQs.');
    } finally {
      setSeeding(false);
    }
  };

  const toggleExpandFaq = (id: string) => {
    setExpandedFaqIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCollapseCategory = (category: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedFaqIds(new Set(faqs.map(f => f.id)));
    setCollapsedCategories(new Set());
  };

  const collapseAll = () => {
    setExpandedFaqIds(new Set());
    setCollapsedCategories(new Set(allCategories));
  };

  const handleCopySql = () => {
    const sql = `CREATE TABLE IF NOT EXISTS public.faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'PRODUCT & USAGE',
  order_index INT4 NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read-only access on faqs" ON public.faqs FOR SELECT USING (true);
CREATE POLICY "Allow all operations for authenticated users on faqs" ON public.faqs FOR ALL USING (true);`;
    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  // Filtered FAQs
  const filteredFAQs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return faqs.filter(faq => {
      // Category
      if (selectedCategory !== 'ALL' && faq.category !== selectedCategory) {
        return false;
      }
      // Status
      if (statusFilter === 'active' && !faq.is_active) return false;
      if (statusFilter === 'hidden' && faq.is_active) return false;

      // Query
      if (q) {
        const matchQ = (faq.question || '').toLowerCase().includes(q);
        const matchA = (faq.answer || '').toLowerCase().includes(q);
        const matchC = (faq.category || '').toLowerCase().includes(q);
        if (!matchQ && !matchA && !matchC) return false;
      }

      return true;
    });
  }, [faqs, searchQuery, selectedCategory, statusFilter]);

  // Group filtered FAQs by Category
  const groupedFAQs = useMemo(() => {
    const groups: { [key: string]: FAQItem[] } = {};
    allCategories.forEach(cat => {
      groups[cat] = [];
    });

    filteredFAQs.forEach(faq => {
      const cat = faq.category || 'GENERAL';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(faq);
    });

    // Sort items within each category by order_index
    Object.keys(groups).forEach(cat => {
      groups[cat].sort((a, b) => a.order_index - b.order_index);
    });

    return groups;
  }, [filteredFAQs, allCategories]);

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5 w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-600"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm shrink-0">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                FAQ Management
              </h2>
              {stats.active > 0 && (
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100/80 text-emerald-800 border border-emerald-200/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {stats.active} Published
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Manage questions, answers, category sections, and display ordering on the site
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {faqs.length === 0 && !loading && (
            <button
              type="button"
              disabled={seeding}
              onClick={handleSeedDefaults}
              className="inline-flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold px-3.5 py-2.5 rounded-xl transition-all"
              title="Populate 13 standard questions"
            >
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>{seeding ? 'Seeding...' : 'Load Standard FAQs'}</span>
            </button>
          )}
          <button
            onClick={handleOpenAdd}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl shadow-xs transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Add FAQ</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 truncate">Total FAQs</p>
            <p className="text-lg sm:text-xl font-bold text-slate-900">{stats.total}</p>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Eye className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 truncate">Active & Visible</p>
            <p className="text-lg sm:text-xl font-bold text-emerald-600">{stats.active}</p>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <EyeOff className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 truncate">Hidden / Drafts</p>
            <p className="text-lg sm:text-xl font-bold text-slate-900">{stats.hidden}</p>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 truncate">Categories</p>
            <p className="text-lg sm:text-xl font-bold text-slate-900">{allCategories.length}</p>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl text-xs sm:text-sm flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Toolbar & Filter Bar */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-3.5 sm:p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input id="faqmanager-search-by-question-keyword-or-" name="search_by_question_keyword_or_" type="text"
              placeholder="Search by question, keyword, or answer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50/80 border border-slate-200 rounded-xl text-xs sm:text-sm placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-hidden transition-all"
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
                Visible
              </button>
              <button
                onClick={() => setStatusFilter('hidden')}
                className={`px-2.5 py-1 rounded-lg transition-all ${statusFilter === 'hidden' ? 'bg-white text-amber-700 shadow-xs font-semibold' : 'hover:text-slate-900'}`}
              >
                Hidden
              </button>
            </div>

            {/* Quick Actions Expand/Collapse */}
            <div className="flex items-center gap-1 text-xs">
              <button
                onClick={expandAll}
                className="px-2.5 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                title="Expand all questions"
              >
                Expand All
              </button>
              <button
                onClick={collapseAll}
                className="px-2.5 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                title="Collapse all questions"
              >
                Collapse All
              </button>
            </div>
          </div>
        </div>

        {/* Category Pills Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar text-xs">
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition-all ${
              selectedCategory === 'ALL'
                ? 'bg-slate-900 text-white font-bold shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
            }`}
          >
            All Categories ({faqs.length})
          </button>
          {allCategories.map(cat => {
            const count = faqs.filter(f => f.category === cat).length;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition-all ${
                  isSelected
                    ? 'bg-slate-900 text-white font-bold shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Main FAQ Content List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-slate-200/80">
            <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-medium">Loading FAQ catalog...</p>
          </div>
        ) : filteredFAQs.length === 0 ? (
          <div className="py-14 px-4 text-center bg-white rounded-2xl border border-slate-200/80 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-base">No FAQs found</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                {searchQuery || selectedCategory !== 'ALL' || statusFilter !== 'all'
                  ? 'No questions matched your current filter criteria. Try resetting your search or category filter.'
                  : 'Get started by creating your first FAQ item or importing standard defaults.'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              {faqs.length === 0 ? (
                <button
                  onClick={handleSeedDefaults}
                  disabled={seeding}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{seeding ? 'Importing...' : 'Import Standard FAQs'}</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('ALL');
                    setStatusFilter('all');
                  }}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        ) : (
          Object.entries(groupedFAQs).map(([category, items]) => {
            if (items.length === 0) return null;
            const isCategoryCollapsed = collapsedCategories.has(category);

            return (
              <div
                key={category}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition-all"
              >
                {/* Category Group Header */}
                <div
                  onClick={() => toggleCollapseCategory(category)}
                  className="flex items-center justify-between px-4 sm:px-5 py-3.5 bg-slate-50/80 border-b border-slate-100 cursor-pointer select-none hover:bg-slate-100/70 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-lg bg-slate-200/80 text-slate-700 flex items-center justify-center shrink-0">
                      <Tag className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="font-bold text-xs sm:text-sm uppercase tracking-wider text-slate-900 truncate">
                      {category}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-slate-600 border border-slate-200 shrink-0">
                      {items.length} {items.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="text-[11px] hidden sm:inline text-slate-500 font-medium">
                      {isCategoryCollapsed ? 'Click to expand' : 'Click to collapse'}
                    </span>
                    {isCategoryCollapsed ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronUp className="w-4 h-4" />
                    )}
                  </div>
                </div>

                {/* Questions List */}
                {!isCategoryCollapsed && (
                  <div className="divide-y divide-slate-100">
                    {items.map((faq, idx) => {
                      const isExpanded = expandedFaqIds.has(faq.id);

                      return (
                        <div
                          key={faq.id}
                          className={`p-3.5 sm:p-5 transition-colors ${
                            !faq.is_active ? 'bg-slate-50/60' : 'hover:bg-slate-50/40'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                            {/* Question Title & Meta */}
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                <span className="inline-flex items-center font-mono text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                                  #{faq.order_index}
                                </span>
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                                    faq.is_active
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                                      : 'bg-amber-50 text-amber-700 border-amber-200/60'
                                  }`}
                                >
                                  {faq.is_active ? (
                                    <>
                                      <CheckCircle2 className="w-3 h-3" />
                                      Visible
                                    </>
                                  ) : (
                                    <>
                                      <EyeOff className="w-3 h-3" />
                                      Hidden
                                    </>
                                  )}
                                </span>
                              </div>

                              {/* Question Heading */}
                              <h4
                                onClick={() => toggleExpandFaq(faq.id)}
                                className="font-bold text-slate-900 text-sm sm:text-base leading-snug cursor-pointer hover:text-blue-600 transition-colors"
                              >
                                {faq.question}
                              </h4>

                              {/* Answer Text */}
                              <div className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                                {isExpanded ? (
                                  <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100 whitespace-pre-line font-normal text-slate-700">
                                    {faq.answer}
                                  </div>
                                ) : (
                                  <p className="line-clamp-2 text-slate-500 font-normal">
                                    {faq.answer}
                                  </p>
                                )}
                              </div>

                              {/* Toggle Read Answer */}
                              <button
                                type="button"
                                onClick={() => toggleExpandFaq(faq.id)}
                                className="mt-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1"
                              >
                                {isExpanded ? 'Show less' : 'View full answer'}
                                {isExpanded ? (
                                  <ChevronUp className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>

                            {/* Action Buttons Toolbar */}
                            <div className="flex items-center gap-1 self-end sm:self-start shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 w-full sm:w-auto justify-end">
                              {/* Reorder Buttons */}
                              <div className="flex items-center bg-slate-100 rounded-lg p-0.5 mr-1">
                                <button
                                  type="button"
                                  onClick={() => handleMoveOrder(faq, 'up')}
                                  disabled={idx === 0}
                                  className="p-1.5 text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:hover:text-slate-500 transition-colors rounded"
                                  title="Move Up"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveOrder(faq, 'down')}
                                  disabled={idx === items.length - 1}
                                  className="p-1.5 text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:hover:text-slate-500 transition-colors rounded"
                                  title="Move Down"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Toggle Visibility */}
                              <button
                                type="button"
                                onClick={() => toggleActive(faq)}
                                className={`p-2 rounded-lg transition-colors ${
                                  faq.is_active
                                    ? 'text-emerald-600 hover:bg-emerald-50'
                                    : 'text-amber-600 hover:bg-amber-50'
                                }`}
                                title={faq.is_active ? 'Hide FAQ from public' : 'Publish FAQ'}
                              >
                                {faq.is_active ? (
                                  <Eye className="w-4 h-4" />
                                ) : (
                                  <EyeOff className="w-4 h-4" />
                                )}
                              </button>

                              {/* Edit Button */}
                              <button
                                type="button"
                                onClick={() => handleEdit(faq)}
                                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Edit Question & Answer"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              {/* Delete Button */}
                              <button
                                type="button"
                                onClick={() => handleDelete(faq.id, faq.question)}
                                className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Delete FAQ"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Database Schema Guide */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5">
        <div
          onClick={() => setShowDbInfo(!showDbInfo)}
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Supabase Database Setup</h4>
              <p className="text-xs text-slate-500">
                SQL schema and table structure for persistent FAQs
              </p>
            </div>
          </div>
          <button className="text-xs font-semibold text-blue-600 hover:text-blue-800">
            {showDbInfo ? 'Hide Details' : 'View SQL Snippet'}
          </button>
        </div>

        {showDbInfo && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-3 animate-in fade-in duration-150">
            <p className="text-xs text-slate-600 leading-relaxed">
              If your database does not have the <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-800">faqs</code> table configured yet, copy and execute this schema in the Supabase SQL Editor:
            </p>
            <div className="relative">
              <pre className="bg-slate-900 text-slate-100 p-3.5 rounded-xl text-[11px] font-mono overflow-x-auto leading-relaxed">
{`CREATE TABLE IF NOT EXISTS public.faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'PRODUCT & USAGE',
  order_index INT4 NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);`}
              </pre>
              <button
                type="button"
                onClick={handleCopySql}
                className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedSql ? 'Copied' : 'Copy SQL'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modern Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    {editingId ? 'Edit FAQ Item' : 'Add New FAQ'}
                  </h3>
                  <p className="text-xs text-slate-500">Provide clean question and detailed guidance</p>
                </div>
              </div>
              <button
                onClick={resetForm}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* Question */}
              <div>
                <label htmlFor="faqmanager-question" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Question <span className="text-rose-500">*</span>
                </label>
                <input id="faqmanager-question" name="question" type="text"
                  required
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-hidden font-semibold text-slate-900 transition-all"
                  placeholder="e.g. How should peptides be stored after reconstitution?"
                />
              </div>

              {/* Answer */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="faqmanager-answer" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Answer <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400">Supports line breaks & bullet points</span>
                </div>
                <textarea id="faqmanager-answer" name="answer" required
                  rows={5}
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-hidden text-slate-800 transition-all leading-relaxed"
                  placeholder="Write clear and reassuring answer details..."
                />
              </div>

              {/* Category & Order Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="faqmanager-category-section" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Category Section <span className="text-rose-500">*</span>
                  </label>
                  <select id="faqmanager-category-section" name="category_section" value={showCustomCategory ? 'CUSTOM' : formData.category}
                    onChange={(e) => {
                      if (e.target.value === 'CUSTOM') {
                        setShowCustomCategory(true);
                      } else {
                        setShowCustomCategory(false);
                        setFormData({ ...formData, category: e.target.value });
                      }
                    }}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 outline-hidden font-medium text-slate-800"
                  >
                    {DEFAULT_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    {allCategories
                      .filter(cat => !DEFAULT_CATEGORIES.includes(cat))
                      .map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    <option value="CUSTOM">+ Create Custom Category...</option>
                  </select>

                  {showCustomCategory && (
                    <input id="faqmanager-type-custom-category-name" name="type_custom_category_name" type="text"
                      required
                      placeholder="Type custom category name..."
                      value={customCategoryInput}
                      onChange={(e) => setCustomCategoryInput(e.target.value)}
                      className="mt-2 w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-hidden uppercase font-semibold"
                    />
                  )}
                </div>

                <div>
                  <label htmlFor="faqmanager-display-order-index" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Display Order Index
                  </label>
                  <input id="faqmanager-display-order-index" name="display_order_index" type="number"
                    min={1}
                    value={formData.order_index}
                    onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 outline-hidden font-semibold"
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <div className="pt-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input id="faqmanager-checkbox-4" name="checkbox_4" type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-slate-900 rounded border-slate-300 focus:ring-slate-900 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-slate-900">
                      Publish and Make Visible Immediately
                    </span>
                    <p className="text-[11px] text-slate-500">
                      When active, this FAQ appears in the public FAQ accordion for all website visitors.
                    </p>
                  </div>
                </label>
              </div>

              {/* Live Preview Card */}
              {formData.question && (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Public Website Preview
                  </div>
                  <p className="font-bold text-slate-900 text-sm">{formData.question}</p>
                  <p className="text-slate-600 whitespace-pre-line leading-relaxed">
                    {formData.answer || 'Answer preview will appear here...'}
                  </p>
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xs transition-all disabled:opacity-50"
                >
                  {saving ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {editingId ? 'Update FAQ' : 'Save FAQ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FAQManager;
