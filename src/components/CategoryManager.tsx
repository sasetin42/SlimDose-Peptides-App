import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, ArrowLeft, Package, Search, Filter, FolderOpen, CheckCircle2, Star } from 'lucide-react';
import { useCategories, Category } from '../hooks/useCategories';
import { supabase } from '../lib/supabase';

interface CategoryManagerProps {
  onBack: () => void;
}

const CategoryManager: React.FC<CategoryManagerProps> = ({ onBack }) => {
  const { categories, addCategory, updateCategory, deleteCategory } = useCategories({ activeOnly: false });
  const [currentView, setCurrentView] = useState<'list' | 'add' | 'edit'>('list');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryProductCounts, setCategoryProductCounts] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    icon: '☕',
    sort_order: 0,
    active: true
  });

  // Fetch product counts for each category
  useEffect(() => {
    const fetchProductCounts = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('category');

        if (error) throw error;

        const counts: Record<string, number> = {};
        if (data) {
          data.forEach((product) => {
            counts[product.category] = (counts[product.category] || 0) + 1;
          });
        }
        setCategoryProductCounts(counts);
      } catch (error) {
        console.error('Error fetching product counts:', error);
      }
    };

    if (categories.length > 0) {
      fetchProductCounts();
    }
  }, [categories]);

  const handleAddCategory = () => {
    const nextSortOrder = Math.max(...categories.map(c => c.sort_order), 0) + 1;
    setFormData({
      id: '',
      name: '',
      icon: '☕',
      sort_order: nextSortOrder,
      active: true
    });
    setCurrentView('add');
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      id: category.id,
      name: category.name,
      icon: category.icon,
      sort_order: category.sort_order,
      active: category.active
    });
    setCurrentView('edit');
  };

  const handleDeleteCategory = async (id: string) => {
    if (confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      try {
        await deleteCategory(id);
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to delete category');
      }
    }
  };

  const handleSaveCategory = async () => {
    if (!formData.id || !formData.name || !formData.icon) {
      alert('Please fill in all required fields');
      return;
    }

    // Validate ID format (kebab-case)
    const idRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
    if (!idRegex.test(formData.id)) {
      alert('Category ID must be in kebab-case format (e.g., "hot-drinks", "cold-beverages")');
      return;
    }

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, formData);
      } else {
        await addCategory(formData);
      }
      setCurrentView('list');
      setEditingCategory(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to save category');
    }
  };

  const handleCancel = () => {
    setCurrentView('list');
    setEditingCategory(null);
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200/50 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
            <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-4">
              <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                <button
                  onClick={handleCancel}
                  className="text-gray-600 hover:text-gold-600 transition-colors flex items-center gap-1 sm:gap-2 group flex-shrink-0"
                >
                  <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 group-hover:-translate-x-1 transition-transform" />
                  <span className="text-xs sm:text-sm font-medium hidden sm:inline">Back</span>
                </button>
                <div className="h-5 sm:h-6 w-px bg-gray-300 hidden sm:block"></div>
                <h1 className="text-sm sm:text-lg lg:text-xl font-bold text-gray-900 truncate">
                  {currentView === 'add' ? 'Add New Category' : 'Edit Category'}
                </h1>
              </div>
              <div className="flex gap-1.5 sm:gap-2 flex-shrink-0">
                <button
                  onClick={handleCancel}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-300 hover:border-gray-400 rounded-lg hover:bg-gray-50 transition-all flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium"
                >
                  <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Cancel</span>
                </button>
                <button
                  onClick={handleSaveCategory}
                  className="bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-all flex items-center gap-1.5 sm:gap-2 shadow-md hover:shadow-lg disabled:opacity-50 text-xs sm:text-sm font-semibold active:scale-95"
                >
                  <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Save</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 lg:p-8">
            <div className="space-y-4 sm:space-y-6">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1.5 sm:mb-2">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-navy-900 transition-all text-sm"
                  placeholder="e.g., Research Peptides"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1.5 sm:mb-2">
                  Category ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-navy-900 transition-all text-xs sm:text-sm font-mono disabled:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-500"
                  placeholder="e.g., research-peptides"
                  disabled={currentView === 'edit'}
                />
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1.5 sm:mt-2">
                  {currentView === 'edit'
                    ? 'Category ID cannot be changed after creation'
                    : 'Automatically generated from name, or enter manually in kebab-case format'
                  }
                </p>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1.5 sm:mb-2">
                  Icon <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2 sm:gap-3">
                  <input
                    type="text"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-navy-900 transition-all text-sm"
                    placeholder="Enter emoji (e.g., ☕, 🧪, 💊)"
                  />
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex items-center justify-center text-2xl sm:text-3xl border border-gray-200 shadow-sm overflow-hidden flex-shrink-0">
                    <span className="leading-none select-none">{formData.icon || '?'}</span>
                  </div>
                </div>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1.5 sm:mt-2">
                  Use an emoji or icon character to represent this category
                </p>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1.5 sm:mb-2">
                  Sort Order
                </label>
                <input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: Number(e.target.value) })}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-navy-900 transition-all text-sm"
                  placeholder="0"
                />
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1.5 sm:mt-2">
                  Lower numbers appear first in the menu. Categories are sorted in ascending order.
                </p>
              </div>

              <div className="flex items-center pt-1 sm:pt-2">
                <label className="flex items-center gap-2 sm:gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="w-4 h-4 sm:w-5 sm:h-5 text-gold-600 rounded border-gray-300 focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 cursor-pointer"
                  />
                  <span className="text-xs sm:text-sm font-semibold text-gray-900 group-hover:text-gray-700">
                    Active Category
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List View
  const filteredCategories = categories.filter((category) => {
    const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          category.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = statusFilter === 'all' || 
                          (statusFilter === 'active' && category.active) || 
                          (statusFilter === 'inactive' && !category.active);
    return matchesSearch && matchesFilter;
  });

  const totalCategories = categories.length;
  const activeCategoriesCount = categories.filter(c => c.active).length;
  const featuredCategoriesCount = categories.filter(c => c.active && c.sort_order <= 3).length;
  const emptyCategoriesCount = categories.filter(c => (categoryProductCounts[c.id] || 0) === 0).length;

  const getBgGradient = (id: string) => {
    const colors: Record<string, string> = {
      research: 'from-blue-500/10 to-indigo-500/10 text-blue-600 border-blue-200/30 dark:from-blue-500/20 dark:to-indigo-500/20 dark:text-blue-400 dark:border-blue-900/30',
      weight: 'from-emerald-500/10 to-teal-500/10 text-emerald-600 border-emerald-200/30 dark:from-emerald-500/20 dark:to-teal-500/20 dark:text-emerald-400 dark:border-emerald-900/30',
      recovery: 'from-amber-500/10 to-orange-500/10 text-amber-600 border-amber-200/30 dark:from-amber-500/20 dark:to-orange-500/20 dark:text-amber-400 dark:border-amber-900/30',
      wellness: 'from-purple-500/10 to-pink-500/10 text-purple-600 border-purple-200/30 dark:from-purple-500/20 dark:to-pink-500/20 dark:text-purple-400 dark:border-purple-900/30',
    };
    return colors[id] || 'from-slate-500/10 to-slate-600/10 text-slate-600 border-slate-200/30 dark:from-slate-500/20 dark:to-slate-600/20 dark:text-slate-400 dark:border-slate-900/30';
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-12">
      {/* Top Header Bar */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-200/60 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <button
                onClick={onBack}
                className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5 group flex-shrink-0"
              >
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
                <span className="text-sm font-semibold hidden sm:inline">Dashboard</span>
              </button>
              <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>
              <h1 className="text-base sm:text-lg font-bold text-slate-950 dark:text-white truncate">
                Categories Overview
              </h1>
            </div>
            <button
              onClick={handleAddCategory}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-all duration-200 flex items-center gap-1.5 shadow-md hover:shadow-lg text-xs sm:text-sm font-bold active:scale-95 flex-shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>Add Category</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* Controls: Search & Filter bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Product Categories</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Organize and classify biotech products across research lines
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Categories */}
            <div className="relative flex-1 min-w-[200px] sm:flex-initial">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-500 text-slate-900 dark:text-white shadow-sm"
              />
            </div>

            {/* Filter Dropdown */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="appearance-none pl-3 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white shadow-sm cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
              <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Statistics Header Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-150 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider block">Total Categories</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block leading-none">{totalCategories}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <FolderOpen className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-150 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider block">Active Categories</span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block leading-none">{activeCategoriesCount}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-150 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider block">Featured</span>
              <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1 block leading-none">{featuredCategoriesCount}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Star className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-150 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider block">Empty Categories</span>
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 block leading-none">{emptyCategoriesCount}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Package className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Categories Grid or Empty State */}
        {filteredCategories.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 sm:p-12 text-center max-w-2xl mx-auto mt-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-55 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              <FolderOpen className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">No Categories Found</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6 text-xs sm:text-sm">
              {searchTerm || statusFilter !== 'all' 
                ? "No categories match your active filters and search queries."
                : "Create your first category to organize products."}
            </p>
            <button
              onClick={handleAddCategory}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg font-bold text-xs sm:text-sm active:scale-95 inline-flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Create Category</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCategories.map((category) => {
              const productCount = categoryProductCounts[category.id] || 0;
              const hasProducts = productCount > 0;
              const isAllCategory = category.id === 'all';
              const bgGradientClass = getBgGradient(category.id);

              return (
                <div
                  key={category.id}
                  className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-5 shadow-sm hover:shadow-luxury hover:border-blue-500/40 dark:hover:border-blue-500/40 transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Icon and metadata */}
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      <div className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${bgGradientClass} border flex items-center justify-center text-2xl overflow-hidden shadow-sm`}>
                        <span className="leading-none select-none">{category.icon}</span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-slate-900 dark:text-white text-base leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate animate-pulse-subtle">
                          {category.name}
                        </h3>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 truncate">
                          ID: {category.id}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-1">
                          Sort Order: #{category.sort_order}
                        </p>
                      </div>
                    </div>

                    {/* Status badge */}
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                      category.active
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400'
                        : 'bg-slate-100 border-slate-200 text-slate-650 dark:bg-slate-800/40 dark:border-slate-800 dark:text-slate-400'
                    }`}>
                      {category.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Card bottom details and actions */}
                  <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between">
                    {/* Products counter */}
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <Package className="w-3.5 h-3.5 text-slate-400" />
                      <span>{productCount} {productCount === 1 ? 'Product' : 'Products'}</span>
                    </span>

                    {/* Actions button group */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditCategory(category)}
                        className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-all duration-200"
                        title="Edit category"
                      >
                        <Edit className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        disabled={hasProducts && !isAllCategory}
                        className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-all duration-200 disabled:opacity-25 disabled:cursor-not-allowed"
                        title={hasProducts && !isAllCategory ? 'Cannot delete category with products' : 'Delete category'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryManager;