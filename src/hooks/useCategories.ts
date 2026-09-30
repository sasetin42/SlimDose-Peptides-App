import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  mirrorCategoryCreate,
  mirrorCategoryDelete,
  mirrorCategoryUpdate,
} from '../lib/convexMirror';

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  parent_id: string | null;
  description: string;
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
  image_url: string | null;
  sort_order: number;
  active: boolean;
  archived: boolean;
  created_at?: string;
  updated_at?: string;
}

const normalizeCategory = (c: any): Category => ({
  id: c.id,
  name: c.name || '',
  slug: c.slug || '',
  icon: c.icon || '🔬',
  parent_id: c.parent_id || null,
  description: c.description || '',
  seo_title: c.seo_title || '',
  seo_description: c.seo_description || '',
  seo_keywords: c.seo_keywords || '',
  image_url: c.image_url || null,
  sort_order: c.sort_order ?? 0,
  active: c.active ?? true,
  archived: c.archived === true,
  created_at: c.created_at,
  updated_at: c.updated_at,
});

const CACHE_KEY = 'slimdose_cached_categories_v2';

// Module-level in-memory cache for instant cross-component, cross-render access
let memoryCache: Category[] | null = null;
try {
  const local = localStorage.getItem(CACHE_KEY);
  if (local) {
    const parsed = JSON.parse(local);
    if (Array.isArray(parsed) && parsed.length > 0) {
      memoryCache = parsed.map(normalizeCategory);
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
  const base = memoryCache || [];
  return activeOnly ? base.filter((c) => c.active && !c.archived) : base;
};

export const useCategories = (options?: { activeOnly?: boolean; includeArchived?: boolean }) => {
  const activeOnly = options?.activeOnly ?? true;
  const includeArchived = options?.includeArchived ?? false;
  const [categories, setCategories] = useState<Category[]>(() => getInitialCategories(activeOnly));
  const [loading, setLoading] = useState<boolean>(() => !memoryCache);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (fetchError) throw fetchError;

      const normalized: Category[] = (data || []).map(normalizeCategory);
      writeCache(normalized);
      let filtered = normalized;
      if (!includeArchived) filtered = filtered.filter((c) => !c.archived);
      if (activeOnly) filtered = filtered.filter((c) => c.active);
      setCategories(filtered);
      setError(null);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  }, [activeOnly, includeArchived]);

  const addCategory = async (category: Partial<Category> & { id?: string }) => {
    try {
      const id = category.id || `cat_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      const payload = {
        id,
        name: category.name || 'Untitled Category',
        slug: category.slug || (category.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
        icon: category.icon || '🔬',
        parent_id: category.parent_id || null,
        description: category.description || '',
        seo_title: category.seo_title || '',
        seo_description: category.seo_description || '',
        seo_keywords: category.seo_keywords || '',
        image_url: category.image_url || null,
        sort_order: category.sort_order ?? 99,
        active: category.active ?? true,
        archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: inserted, error: insertError } = await supabase
        .from('categories')
        .insert([payload])
        .select()
        .single();

      if (insertError) throw insertError;

      mirrorCategoryCreate({
        id: payload.id,
        name: payload.name,
        icon: payload.icon,
        sort_order: payload.sort_order,
        active: payload.active,
      });

      invalidateCache();
      await fetchCategories();
      return (inserted as any) || payload;
    } catch (err) {
      console.error('Error adding category:', err);
      invalidateCache();
      await fetchCategories();
      throw err;
    }
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    // Optimistic patch
    setCategories(prev => {
      const next = prev.map(c => c.id === id ? { ...c, ...updates } : c);
      const fullCache = (memoryCache || []).map(c => c.id === id ? { ...c, ...updates } : c);
      writeCache(fullCache);
      return activeOnly ? next.filter(c => c.active) : next;
    });

    try {
      const patch: Record<string, any> = { updated_at: new Date().toISOString() };
      const fields = ['name', 'slug', 'icon', 'parent_id', 'description', 'seo_title', 'seo_description', 'seo_keywords', 'image_url', 'sort_order', 'active', 'archived'];
      for (const f of fields) {
        if (updates[f as keyof Category] !== undefined) patch[f] = updates[f as keyof Category];
      }

      const { error: updateError } = await supabase
        .from('categories')
        .update(patch)
        .eq('id', id);

      if (updateError) throw updateError;

      mirrorCategoryUpdate(id, patch);

      invalidateCache();
      fetchCategories();
    } catch (err) {
      console.error('Error updating category:', err);
      invalidateCache();
      await fetchCategories();
      throw err;
    }
  };

  /**
   * Delete a category. When `reassignTo` is provided, all products in this
   * category are moved there first (explicit reassignment confirmation flow).
   */
  const deleteCategory = async (id: string, reassignTo?: string | null) => {
    // Check if category has products
    const { data: products, error: checkError } = await supabase
      .from('products')
      .select('id')
      .eq('category', id);

    if (checkError) throw checkError;

    if (products && products.length > 0) {
      if (!reassignTo) {
        throw new Error(`CATEGORY_HAS_PRODUCTS:${products.length}`);
      }
      // Reassign all products to the target category
      for (const p of products) {
        const { error: upErr } = await supabase
          .from('products')
          .update({ category: reassignTo, updated_at: new Date().toISOString() })
          .eq('id', p.id);
        if (upErr) throw upErr;
      }
    }

    // Prevent deleting a parent that still has children (unless reassigning)
    const childCheck = (memoryCache || []).filter(c => c.parent_id === id);
    if (childCheck.length > 0) {
      if (!reassignTo) {
        throw new Error(`CATEGORY_HAS_CHILDREN:${childCheck.length}`);
      }
      for (const child of childCheck) {
        await supabase.from('categories').update({ parent_id: reassignTo, updated_at: new Date().toISOString() }).eq('id', child.id);
      }
    }

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
    setCategories(activeOnly ? updated.filter(c => c.active && !c.archived) : updated);

    try {
      for (const [index, cat] of reorderedCategories.entries()) {
        await supabase
          .from('categories')
          .update({ sort_order: index + 1, updated_at: new Date().toISOString() })
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
