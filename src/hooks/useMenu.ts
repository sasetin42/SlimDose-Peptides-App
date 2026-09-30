import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Product, ProductVariation } from '../types';
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
      const parsed = cached ? JSON.parse(cached) : null;
      if (parsed && Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch {}
    return [];
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const lastFetchRef = useRef<number>(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastOrderCountsFetchRef = useRef<number>(0);
  const cachedSalesCountMapRef = useRef<Map<string, number> | null>(null);

  useEffect(() => {
    fetchProducts();

    const debouncedFetch = () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        fetchProducts();
      }, 300);
    };

    // Realtime Firestore onSnapshot for products, variations, orders
    const channelId = `products_realtime_sync`;
    const productsChannel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, debouncedFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_variations' }, debouncedFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, debouncedFetch)
      .subscribe();

    const handleOrderConfirmed = () => {
      debouncedFetch();
    };

    const handleStorageChange = () => {
      debouncedFetch();
    };

    window.addEventListener('orderConfirmed', handleOrderConfirmed);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('slimdose:products_updated', debouncedFetch);

    let focusTimeout: ReturnType<typeof setTimeout> | null = null;
    const handleFocus = () => {
      if (window.location.pathname === '/admin') return;
      const now = Date.now();
      if (now - lastFetchRef.current < 30_000) return; // skip if fetched < 30s ago
      if (focusTimeout) clearTimeout(focusTimeout);
      focusTimeout = setTimeout(fetchProducts, 2000);
    };
    const handleVisibility = () => {
      if (document.hidden || window.location.pathname === '/admin') return;
      const now = Date.now();
      if (now - lastFetchRef.current < 30_000) return;
      if (focusTimeout) clearTimeout(focusTimeout);
      setTimeout(fetchProducts, 2000);
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      supabase.removeChannel(productsChannel);
      window.removeEventListener('orderConfirmed', handleOrderConfirmed);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (focusTimeout) clearTimeout(focusTimeout);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const fetchOrderCounts = async (currentProducts: Product[]) => {
    try {
      const now = Date.now();
      let salesCountMap = cachedSalesCountMapRef.current;

      // Only query all orders if cache is empty or older than 60 seconds
      if (!salesCountMap || (now - lastOrderCountsFetchRef.current > 60_000)) {
        salesCountMap = new Map<string, number>();
        const { data: allOrders } = await supabase
          .from('orders')
          .select('order_items, order_status')
          .limit(500);

        const completedOrders = (allOrders || []).filter((o: any) => !['cancelled', 'declined', 'failed', 'refunded'].includes(o.order_status));

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
        cachedSalesCountMapRef.current = salesCountMap;
        lastOrderCountsFetchRef.current = now;
      }

      const updated = currentProducts.map(product => {
        const pNameKey = `name:${(product.name || '').toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        const liveSales = (salesCountMap!.get(product.id) || 0) + (salesCountMap!.get(pNameKey) || 0);
        return { ...product, sales_count: liveSales || 0 };
      });

      setProducts(updated);
      try { localStorage.setItem('slimdose_products_cache', JSON.stringify(updated)); } catch {}
    } catch (err) {
      console.warn('Failed to compute live order sales counts:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(products.length === 0);

      // Fetch directly from the database as the single source of truth
      const { data, error: sbError } = await supabase
        .from('products')
        .select('*')
        .order('featured', { ascending: false })
        .order('name', { ascending: true });

      if (!sbError && data && data.length > 0) {
        // Fetch variations in chunks of 25 (safe for Firestore 'in' limit of 30)
        const productIds = data.map((p: any) => p.id);
        const variationsByProduct = new Map<string, ProductVariation[]>();

        const chunkSize = 25;
        const idChunks: string[][] = [];
        for (let i = 0; i < productIds.length; i += chunkSize) {
          idChunks.push(productIds.slice(i, i + chunkSize));
        }

        const variationPromises = idChunks.map(chunk =>
          supabase
            .from('product_variations')
            .select('*')
            .in('product_id', chunk)
            .order('price', { ascending: true })
            .order('quantity_mg', { ascending: true })
        );

        const variationResults = await Promise.all(variationPromises);
        const allVariations = variationResults.flatMap(r => r.data || []);

        for (const v of allVariations) {
          const list = variationsByProduct.get(v.product_id) || [];
          list.push(v);
          variationsByProduct.set(v.product_id, list);
        }

        const salesCountMap = cachedSalesCountMapRef.current;
        const productsWithVariations = data.map((product: any) => {
          const pNameKey = `name:${(product.name || '').toLowerCase().replace(/[^a-z0-9]/g, '')}`;
          const liveSales = salesCountMap
            ? (salesCountMap.get(product.id) || 0) + (salesCountMap.get(pNameKey) || 0)
            : Number(product.sales_count || 0);
          return {
            ...product,
            sales_count: liveSales,
            variations: variationsByProduct.get(product.id) || [],
          };
        });

        setProducts(productsWithVariations);
        try { localStorage.setItem('slimdose_products_cache', JSON.stringify(productsWithVariations)); } catch {}
        setIsDemoMode(false);
        setError(null);
        setLoading(false);
        lastFetchRef.current = Date.now();

        // Refresh live order counts in the background without causing a full jarring card re-render
        fetchOrderCounts(productsWithVariations);

        return;
      }

      if (!sbError && data && data.length === 0) {
        // Database is genuinely empty — show real empty state
        setProducts([]);
        setIsDemoMode(false);
        setError(null);
        setLoading(false);
        return;
      }

      // Query failed — surface a real error, never fake data
      setProducts([]);
      setIsDemoMode(false);
      setError(sbError?.message || 'Failed to load products from the database.');
    } catch (err) {
      console.error('Error fetching products:', err);
      setProducts([]);
      setIsDemoMode(false);
      setError(err instanceof Error ? err.message : 'Failed to load products.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Admin CRUD ────────────────────────────────────────────────────────────
  const addProduct = async (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const now = new Date().toISOString();
      const productData: any = {
        ...product,
        image_url: product.image_url ?? null,
        created_at: now,
        updated_at: now,
      };
      const docId = (product as any).id || `prod_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      productData.id = docId;
      const { data, error } = await supabase.from('products').insert([productData]).select().single();
      if (error) throw error;
      mirrorProductCreate(productData);
      if (data) setProducts(prev => [...prev, { ...(data as any), variations: [] }]);
      window.dispatchEvent(new CustomEvent('slimdose:products_updated'));
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

      const { data, error } = await supabase
        .from('products')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      mirrorProductUpdate(id, updatePayload);

      const updatedProduct = data || { id, ...updatePayload };
      setProducts(prev => {
        const next = prev.map(p => (p.id === id ? { ...p, ...updatedProduct, variations: p.variations } : p));
        try { localStorage.setItem('slimdose_products_cache', JSON.stringify(next)); } catch {}
        return next;
      });
      window.dispatchEvent(new CustomEvent('slimdose:products_updated'));

      return { success: true, data: updatedProduct };
    } catch (err) {
      console.error('Failed to update product:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to update product' };
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      // Guard: block deletion when product is part of an active bundle
      try {
        const { data: bundlesData } = await supabase.from('bundles').select('id, name, items');
        const activeBundles = (bundlesData || []).filter((b: any) => {
          if (b.active === false) return false;
          const items = typeof b.items === 'string' ? JSON.parse(b.items || '[]') : (b.items || []);
          return items.some((i: any) => i.product_id === id);
        });
        if (activeBundles.length > 0) {
          return {
            success: false,
            error: `This product belongs to ${activeBundles.length} active bundle(s): ${activeBundles.map((b: any) => b.name).join(', ')}. Remove it from those bundles first.`,
          };
        }
      } catch (bundleCheckErr) {
        console.warn('Bundle membership check skipped:', bundleCheckErr);
      }

      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      mirrorProductDelete(id);
      // Cascade-delete associated variations
      try {
        const { data: vars } = await supabase.from('product_variations').select('id').eq('product_id', id);
        if (vars && vars.length > 0) {
          await supabase.from('product_variations').delete().in('id', vars.map((v: any) => v.id));
        }
      } catch {}
      setProducts(prev => {
        const next = prev.filter(p => String(p.id) !== String(id));
        try { localStorage.setItem('slimdose_products_cache', JSON.stringify(next)); } catch {}
        return next;
      });
      window.dispatchEvent(new CustomEvent('slimdose:products_updated'));
      return { success: true };
    } catch (err) {
      console.error('Failed to delete product:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to delete product' };
    }
  };

  const deleteMultipleProducts = async (ids: string[]) => {
    if (!ids || ids.length === 0) return { success: true, count: 0 };
    try {
      // Bundle guard for bulk deletes
      try {
        const { data: bundlesData } = await supabase.from('bundles').select('id, name, items');
        if (bundlesData && bundlesData.length > 0) {
          const blocked: string[] = [];
          for (const b of bundlesData) {
            if (b.active === false) continue;
            const items = typeof b.items === 'string' ? JSON.parse(b.items || '[]') : (b.items || []);
            if (items.some((i: any) => ids.includes(String(i.product_id)))) blocked.push(b.name);
          }
          if (blocked.length > 0) {
            return {
              success: false,
              error: `Cannot delete: these products belong to active bundle(s): ${blocked.join(', ')}. Remove them from bundles first.`,
            };
          }
        }
      } catch {}

      const { error } = await supabase.from('products').delete().in('id', ids);
      if (error) throw error;
      ids.forEach(id => mirrorProductDelete(id));
      const idSet = new Set(ids.map(String));
      setProducts(prev => {
        const next = prev.filter(p => !idSet.has(String(p.id)));
        try { localStorage.setItem('slimdose_products_cache', JSON.stringify(next)); } catch {}
        return next;
      });
      window.dispatchEvent(new CustomEvent('slimdose:products_updated'));
      return { success: true, count: ids.length };
    } catch (err) {
      console.error('Failed to delete multiple products:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to delete products' };
    }
  };

  const syncProductBasePriceWithVariations = async (productId: string) => {
    try {
      const { data: allVars } = await supabase
        .from('product_variations')
        .select('price, discount_price, discount_active')
        .eq('product_id', productId);
      if (allVars && allVars.length > 0) {
        const prices = allVars.map((v: any) => (v.discount_active && v.discount_price !== null ? v.discount_price : v.price)).filter((p: any) => p > 0);
        if (prices.length > 0) {
          const minPrice = Math.min(...prices);
          await supabase.from('products').update({ base_price: minPrice }).eq('id', productId);
        }
      }
    } catch (e) {
      console.warn('Failed to auto-sync product base_price:', e);
    }
  };

  const addVariation = async (variation: Omit<ProductVariation, 'id' | 'created_at'>) => {
    try {
      const payload = {
        ...variation,
        id: `var_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        created_at: new Date().toISOString(),
      };
      const { data, error } = await supabase.from('product_variations').insert([payload]).select().single();
      if (error) throw error;
      mirrorVariationCreate(payload);
      if (variation.product_id) {
        await syncProductBasePriceWithVariations(variation.product_id);
      }
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
      if (data?.product_id) {
        await syncProductBasePriceWithVariations(data.product_id);
      }
      await fetchProducts();
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to update variation' };
    }
  };

  const deleteVariation = async (id: string) => {
    try {
      const { data: existing } = await supabase.from('product_variations').select('product_id').eq('id', id).maybeSingle();
      const { error } = await supabase.from('product_variations').delete().eq('id', id);
      if (error) throw error;
      mirrorVariationDelete(id);
      if (existing?.product_id) {
        await syncProductBasePriceWithVariations(existing.product_id);
      }
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
    deleteMultipleProducts,
    addVariation,
    updateVariation,
    deleteVariation,
  };
}
