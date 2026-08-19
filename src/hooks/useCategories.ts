import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  mirrorCategoryCreate,
  mirrorCategoryDelete,
  mirrorCategoryUpdate,
} from '../lib/convexMirror';

import { liveScrapedCategories } from '../data/liveScrapedCategories';

export interface Category {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

const DEFAULT_STANDARD_CATEGORIES: Category[] = liveScrapedCategories.map((c, idx) => ({
  id: c.id,
  name: c.name,
  icon: c.icon || '🔬',
  sort_order: c.sort_order ?? c.display_order ?? idx,
  active: c.active ?? true,
  created_at: c.created_at
}));

const CACHE_KEY = 'slimdose_cached_categories';

// Module-level in-memory cache for instant cross-component, cross-render access
let memoryCache: Category[] | null = null;
try {
  const local = localStorage.getItem(CACHE_KEY);
  if (local) {
    const parsed = JSON.parse(local);
    if (Array.isArray(parsed) && parsed.length > 0) {
      memoryCache = parsed;
    }
  }
} catch {}

/** Write-through cache helper — updates both memoryCache and localStorage */
const writeCache = (data: Category[]) => {
  memoryCache = data;
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch {}
};

/** Invalidate the cache so next fetch is authoritative */
const invalidateCache = () => {
  memoryCache = null;
  try { localStorage.removeItem(CACHE_KEY); } catch {}
};

const getInitialCategories = (activeOnly: boolean): Category[] => {
  const base = memoryCache && memoryCache.length > 0 ? memoryCache : DEFAULT_STANDARD_CATEGORIES;
  return activeOnly ? base.filter((c) => c.active) : base;
};

export const useCategories = (options?: { activeOnly?: boolean }) => {
  const activeOnly = options?.activeOnly ?? true;
  const [categories, setCategories] = useState<Category[]>(() => getInitialCategories(activeOnly));
  const [loading, setLoading] = useState<boolean>(() => !memoryCache || memoryCache.length === 0);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      let query = supabase.from('categories').select('*');
      if (activeOnly) {
        query = query.eq('active', true);
      }
      const { data, error: fetchError } = await query.order('sort_order', { ascending: true });
      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        const normalized: Category[] = data.map((c: any) => ({
          id: c.id,
          name: c.name || '',
          icon: c.icon || '🔬',
          sort_order: c.sort_order ?? 0,
          active: c.active ?? true,
          created_at: c.created_at,
          updated_at: c.updated_at,
        }));
        writeCache(normalized);
        const filtered = activeOnly ? normalized.filter((c) => c.active) : normalized;
        setCategories(filtered);
      } else if (data && data.length === 0) {
        // Firestore returned genuinely empty — clear cache and show empty
        writeCache([]);
        setCategories([]);
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  }, [activeOnly]);

  const addCategory = async (category: Omit<Category, 'created_at' | 'updated_at'>) => {
    // Optimistic: add to local state immediately
    const newCat: Category = {
      ...category,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setCategories(prev => {
      const next = activeOnly ? [...prev, newCat].filter(c => c.active) : [...prev, newCat];
      writeCache(activeOnly ? [...(memoryCache || []), newCat] : next);
      return next;
    });

    try {
      const { data, error: insertError } = await supabase
        .from('categories')
        .insert({
          id: category.id,
          name: category.name,
          icon: category.icon,
          sort_order: category.sort_order,
          active: category.active,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      mirrorCategoryCreate({
        id: category.id,
        name: category.name,
        icon: category.icon,
        sort_order: category.sort_order,
        active: category.active,
      });

      // Authoritative refresh
      invalidateCache();
      await fetchCategories();
      return data;
    } catch (err) {
      console.error('Error adding category:', err);
      // Rollback optimistic update
      invalidateCache();
      await fetchCategories();
      throw err;
    }
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    // Optimistic: patch local state immediately
    setCategories(prev => {
      const next = prev.map(c => c.id === id ? { ...c, ...updates } : c);
      const fullCache = (memoryCache || []).map(c => c.id === id ? { ...c, ...updates } : c);
      writeCache(fullCache);
      return activeOnly ? next.filter(c => c.active) : next;
    });

    try {
      const patch: Record<string, any> = {};
      if (updates.name !== undefined) patch.name = updates.name;
      if (updates.icon !== undefined) patch.icon = updates.icon;
      if (updates.sort_order !== undefined) patch.sort_order = updates.sort_order;
      if (updates.active !== undefined) patch.active = updates.active;

      const { error: updateError } = await supabase
        .from('categories')
        .update(patch)
        .eq('id', id);

      if (updateError) throw updateError;

      mirrorCategoryUpdate(id, {
        name: updates.name,
        icon: updates.icon,
        sort_order: updates.sort_order,
        active: updates.active,
      });

      // Authoritative refresh in background (don't await to keep UI snappy)
      invalidateCache();
      fetchCategories();
    } catch (err) {
      console.error('Error updating category:', err);
      // Rollback
      invalidateCache();
      await fetchCategories();
      throw err;
    }
  };

  const deleteCategory = async (id: string) => {
    // Check if category has products
    const { data: products, error: checkError } = await supabase
      .from('products')
      .select('id')
      .eq('category', id)
      .limit(1);

    if (checkError) throw checkError;

    if (products && products.length > 0) {
      throw new Error('Cannot delete category that contains products. Please move or delete the products first.');
    }

    // Optimistic: remove from local state immediately
    setCategories(prev => {
      const next = prev.filter(c => c.id !== id);
      const fullCache = (memoryCache || []).filter(c => c.id !== id);
      writeCache(fullCache);
      return next;
    });

    try {
      const { error: deleteError } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      mirrorCategoryDelete(id);

      invalidateCache();
      await fetchCategories();
    } catch (err) {
      console.error('Error deleting category:', err);
      invalidateCache();
      await fetchCategories();
      throw err;
    }
  };

  const reorderCategories = async (reorderedCategories: Category[]) => {
    // Optimistic
    const updated = reorderedCategories.map((cat, index) => ({ ...cat, sort_order: index + 1 }));
    writeCache(updated);
    setCategories(activeOnly ? updated.filter(c => c.active) : updated);

    try {
      for (const [index, cat] of reorderedCategories.entries()) {
        await supabase
          .from('categories')
          .update({ sort_order: index + 1 })
          .eq('id', cat.id);
      }
      invalidateCache();
      await fetchCategories();
    } catch (err) {
      console.error('Error reordering categories:', err);
      invalidateCache();
      await fetchCategories();
      throw err;
    }
  };

  useEffect(() => {
    fetchCategories();

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedFetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        invalidateCache();
        fetchCategories();
      }, 500);
    };

    const categoriesChannel = supabase
      .channel('categories_realtime_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, debouncedFetch)
      .subscribe();

    return () => {
      supabase.removeChannel(categoriesChannel);
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [fetchCategories]);

  return {
    categories,
    loading,
    error,
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    refetch: fetchCategories,
  };
};
