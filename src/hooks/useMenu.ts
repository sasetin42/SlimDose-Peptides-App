import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Product, ProductVariation } from '../types';
import { demoProducts } from '../data/demoProducts';
import {
  mirrorProductCreate,
  mirrorProductDelete,
  mirrorProductUpdate,
  mirrorVariationCreate,
  mirrorVariationDelete,
  mirrorVariationUpdate,
} from '../lib/convexMirror';

export function useMenu() {
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const cached = localStorage.getItem('slimdose_products_cache');
      return cached ? JSON.parse(cached) : demoProducts;
    } catch {
      return demoProducts;
    }
  });
  const [loading, setLoading] = useState(() => {
    try {
      return !localStorage.getItem('slimdose_products_cache');
    } catch {
      return true;
    }
  });
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const lastFetchRef = useRef<number>(0);

  useEffect(() => {
    fetchProducts();

    // Supabase realtime for updates (products, variations, orders)
    const channelId = `products-realtime-${Date.now()}`;
    const productsChannel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => fetchProducts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_variations' }, () => fetchProducts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchProducts())
      .subscribe();

    const handleOrderConfirmed = () => {
      fetchProducts();
    };

    window.addEventListener('orderConfirmed', handleOrderConfirmed);

    let focusTimeout: ReturnType<typeof setTimeout> | null = null;
    const handleFocus = () => {
      if (window.location.pathname === '/admin') return;
      const now = Date.now();
      if (now - lastFetchRef.current < 30_000) return; // skip if fetched < 30s ago
      if (focusTimeout) clearTimeout(focusTimeout);
      focusTimeout = setTimeout(fetchProducts, 2000); // increase from 1s to 2s
    };
    const handleVisibility = () => {
      if (document.hidden || window.location.pathname === '/admin') return;
      const now = Date.now();
      if (now - lastFetchRef.current < 30_000) return;
      if (focusTimeout) clearTimeout(focusTimeout);
      focusTimeout = setTimeout(fetchProducts, 2000);
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      supabase.removeChannel(productsChannel);
      window.removeEventListener('orderConfirmed', handleOrderConfirmed);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (focusTimeout) clearTimeout(focusTimeout);
    };
  }, []);

  const fetchOrderCounts = async (currentProducts: Product[]) => {
    try {
      const salesCountMap = new Map<string, number>();
      const { data: allOrders } = await supabase
        .from('orders')
        .select('order_items, order_status');

      const completedOrders = (allOrders || []).filter(o => !['cancelled', 'declined', 'failed', 'refunded'].includes(o.order_status));

      for (const orderRow of completedOrders) {
        const items = Array.isArray(orderRow.order_items) ? orderRow.order_items : [];
        for (const item of items) {
          const pId = item.product_id;
          const pName = (item.product_name || item.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const qty = Number(item.quantity ?? 1);
          if (pId) salesCountMap.set(pId, (salesCountMap.get(pId) || 0) + qty);
          if (pName) salesCountMap.set(`name:${pName}`, (salesCountMap.get(`name:${pName}`) || 0) + qty);
        }
      }

      const updated = currentProducts.map(product => {
        const pNameKey = `name:${(product.name || '').toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        const liveSales = (salesCountMap.get(product.id) || 0) + (salesCountMap.get(pNameKey) || 0);
        return { ...product, sales_count: liveSales || 0 };
      });
      
      setProducts(updated);
      try { localStorage.setItem('slimdose_products_cache', JSON.stringify(updated)); } catch {}
    } catch (err) {
      console.warn('Failed to compute live order sales counts:', err);
    }
  };

  const fetchProducts = async () => {
    const hasData = products && products.length > 0;
    try {
      if (!hasData) {
        setLoading(true);
      }

      // Fetch directly from Supabase as the primary source of truth
      const { data, error: sbError } = await supabase
        .from('products')
        .select('*')
        .order('featured', { ascending: false })
        .order('name', { ascending: true });

      if (!sbError && data && data.length > 0) {
        // Fetch variations
        const productIds = data.map(p => p.id);
        const variationsByProduct = new Map<string, ProductVariation[]>();
        const { data: allVariations } = await supabase
          .from('product_variations')
          .select('*')
          .in('product_id', productIds)
          .order('quantity_mg', { ascending: true });

        for (const v of allVariations || []) {
          const list = variationsByProduct.get(v.product_id) || [];
          list.push(v);
          variationsByProduct.set(v.product_id, list);
        }

        const productsWithVariations = data.map(product => ({
          ...product,
          sales_count: product.sales_count ?? 0,
          variations: variationsByProduct.get(product.id) || [],
        }));

        setProducts(productsWithVariations);
        try { localStorage.setItem('slimdose_products_cache', JSON.stringify(productsWithVariations)); } catch {}
        setIsDemoMode(false);
        setError(null);
        setLoading(false);
        lastFetchRef.current = Date.now();

        setTimeout(() => fetchOrderCounts(productsWithVariations), 0);

        return;
      }

      // Fallback: inject demo products
      console.info('📦 Using demo products (no Supabase data found)');
      setProducts(demoProducts);
      setIsDemoMode(true);
      setError(null);
    } catch (err) {
      console.error('Error fetching products:', err);
      // Always fall back to demo products on error
      setProducts(demoProducts);
      setIsDemoMode(true);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  // ─── Admin CRUD (Supabase-backed) ──────────────────────────────────────────
  const addProduct = async (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const productData: any = { ...product, image_url: product.image_url ?? null };
      const { data, error } = await supabase.from('products').insert([productData]).select('*, image_url').single();
      if (error) throw error;
      mirrorProductCreate(productData);
      if (data) setProducts([...products, data]);
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to add product' };
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    try {
      let imageUrlValue: string | null = null;
      if (updates.image_url !== undefined && updates.image_url !== null) {
        const urlString = String(updates.image_url).trim();
        imageUrlValue = urlString === '' ? null : urlString;
      }
      
      const { id: _id, created_at, updated_at, variations, sales_count, ...cleanUpdates } = updates as any;
      const updatePayload: any = { 
        ...cleanUpdates, 
        image_url: imageUrlValue,
        updated_at: new Date().toISOString()
      };

      // Only if ID is explicitly a demo product prefix like "demo-*" do we insert into DB if not existing
      if (typeof id === 'string' && id.startsWith('demo-')) {
        console.log('📦 Converting demo product to persistent product:', id);
        const { data, error } = await supabase.from('products').insert([updatePayload]).select('*, image_url').single();
        if (error) throw new Error(error.message);
        mirrorProductCreate(updatePayload);
        if (data) {
          setProducts(prev => prev.map(p => p.id === id ? { ...data, variations: p.variations || [] } : p));
        }
        return { success: true, data };
      }

      // Standard update for existing product
      const { data, error } = await supabase
        .from('products')
        .update(updatePayload)
        .eq('id', id)
        .select('*, image_url')
        .single();

      if (error) throw new Error(error.message);
      mirrorProductUpdate(id, updatePayload);

      const updatedProduct = data || { id, ...updatePayload };
      setProducts(prev => {
        const next = prev.map(p => (p.id === id ? { ...p, ...updatedProduct, variations: p.variations } : p));
        try { localStorage.setItem('slimdose_products_cache', JSON.stringify(next)); } catch {}
        return next;
      });
      window.dispatchEvent(new Event('storage'));

      return { success: true, data: updatedProduct };
    } catch (err) {
      console.error('Failed to update product:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to update product' };
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      mirrorProductDelete(id);
      setProducts(products.filter(p => p.id !== id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to delete product' };
    }
  };

  const addVariation = async (variation: Omit<ProductVariation, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase.from('product_variations').insert([variation]).select().single();
      if (error) throw error;
      mirrorVariationCreate(variation);
      await fetchProducts();
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to add variation' };
    }
  };

  const updateVariation = async (id: string, updates: Partial<ProductVariation>) => {
    try {
      const { data, error } = await supabase.from('product_variations').update(updates).eq('id', id).select().single();
      if (error) throw error;
      mirrorVariationUpdate(id, updates);
      await fetchProducts();
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to update variation' };
    }
  };

  const deleteVariation = async (id: string) => {
    try {
      const { error } = await supabase.from('product_variations').delete().eq('id', id);
      if (error) throw error;
      mirrorVariationDelete(id);
      await fetchProducts();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to delete variation' };
    }
  };

  return {
    menuItems: products,
    products,
    loading,
    error,
    isDemoMode,
    refreshProducts: fetchProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    addVariation,
    updateVariation,
    deleteVariation,
  };
}
