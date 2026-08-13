import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  mirrorCategoryCreate,
  mirrorCategoryDelete,
  mirrorCategoryUpdate,
} from '../lib/convexMirror';

export interface Category {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export const useCategories = (options?: { activeOnly?: boolean }) => {
  const activeOnly = options?.activeOnly ?? true;
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('categories')
        .select('*');

      if (activeOnly) {
        query = query.eq('active', true);
      }

      const { data, error: fetchError } = await query
        .order('sort_order', { ascending: true });

      if (fetchError) throw fetchError;

      setCategories(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  const addCategory = async (category: Omit<Category, 'created_at' | 'updated_at'>) => {
    try {
      const { data, error: insertError } = await supabase
        .from('categories')
        .insert({
          id: category.id,
          name: category.name,
          icon: category.icon,
          sort_order: category.sort_order,
          active: category.active
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

      await fetchCategories();
      return data;
    } catch (err) {
      console.error('Error adding category:', err);
      throw err;
    }
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    try {
      const { error: updateError } = await supabase
        .from('categories')
        .update({
          name: updates.name,
          icon: updates.icon,
          sort_order: updates.sort_order,
          active: updates.active
        })
        .eq('id', id);

      if (updateError) throw updateError;

      mirrorCategoryUpdate(id, {
        name: updates.name,
        icon: updates.icon,
        sort_order: updates.sort_order,
        active: updates.active,
      });

      await fetchCategories();
    } catch (err) {
      console.error('Error updating category:', err);
      throw err;
    }
  };

  const deleteCategory = async (id: string) => {
    try {
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

      const { error: deleteError } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      mirrorCategoryDelete(id);

      await fetchCategories();
    } catch (err) {
      console.error('Error deleting category:', err);
      throw err;
    }
  };

  const reorderCategories = async (reorderedCategories: Category[]) => {
    try {
      const updates = reorderedCategories.map((cat, index) => ({
        id: cat.id,
        sort_order: index + 1
      }));

      for (const update of updates) {
        await supabase
          .from('categories')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id);
      }

      await fetchCategories();
    } catch (err) {
      console.error('Error reordering categories:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchCategories();

    // Set up real-time subscription for category changes.
    // Unique channel name per mount avoids "cannot add postgres_changes
    // callbacks after subscribe()" when React StrictMode double-mounts.
    const channelName = `categories-changes-${Math.random().toString(36).slice(2)}`;
    const categoriesChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categories'
        },
        (payload) => {
          console.log('Category changed:', payload);
          fetchCategories();
        }
      )
      .subscribe();

    // Refetch data when window regains focus
    const handleFocus = () => {
      fetchCategories();
    };

    window.addEventListener('focus', handleFocus);

    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeChannel(categoriesChannel);
      window.removeEventListener('focus', handleFocus);
    };
  }, [activeOnly]);

  return {
    categories,
    loading,
    error,
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    refetch: fetchCategories
  };
};