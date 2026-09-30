import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { ProductBundleTier } from '../types';
import type { BundleTiersMap } from '../utils/pricing';

export const BUNDLE_TIERS_CACHE_KEY = 'slimdose_bundle_tiers_cache';
export const BUNDLE_TIERS_EVENT = 'bundle_tiers_updated';

/**
 * Directly save bundle tiers for a product to the local cache and notify all listeners.
 * Guarantees zero data loss upon refresh even before network sync completes.
 */
export function saveBundleTiersToCache(productId: string, tiers: ProductBundleTier[]) {
  try {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(BUNDLE_TIERS_CACHE_KEY);
      const map: BundleTiersMap = cached ? JSON.parse(cached) : {};
      map[productId] = tiers;
      localStorage.setItem(BUNDLE_TIERS_CACHE_KEY, JSON.stringify(map));
      window.dispatchEvent(new CustomEvent(BUNDLE_TIERS_EVENT, { detail: { productId } }));
    }
  } catch (e) {
    console.warn('Failed to save bundle tiers to cache:', e);
  }
}

/**
 * Invalidate the bundle tiers cache in localStorage and broadcast an update event
 * to all active listeners and components.
 */
export function invalidateBundleTiersCache(productId?: string) {
  try {
    if (typeof window !== 'undefined') {
      if (productId) {
        const cached = localStorage.getItem(BUNDLE_TIERS_CACHE_KEY);
        if (cached) {
          const map: BundleTiersMap = JSON.parse(cached);
          delete map[productId];
          localStorage.setItem(BUNDLE_TIERS_CACHE_KEY, JSON.stringify(map));
        }
      } else {
        localStorage.removeItem(BUNDLE_TIERS_CACHE_KEY);
      }
      window.dispatchEvent(new CustomEvent(BUNDLE_TIERS_EVENT, { detail: { productId } }));
    }
  } catch (e) {
    console.warn('Failed to invalidate bundle tiers cache:', e);
  }
}

const getInitialTiersMap = (): BundleTiersMap => {
  try {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(BUNDLE_TIERS_CACHE_KEY);
      if (cached) return JSON.parse(cached);
    }
  } catch {}
  return {};
};

export function useBundleTiers(productIds?: string[]) {
  const [tiersByProduct, setTiersByProduct] = useState<BundleTiersMap>(() => getInitialTiersMap());
  const [loading, setLoading] = useState(() => Object.keys(getInitialTiersMap()).length === 0);

  const fetchTiers = useCallback(async (ids?: string[]) => {
    let query = supabase
      .from('product_bundle_tiers')
      .select('*')
      .eq('active', true)
      .order('min_quantity', { ascending: true });

    if (ids && ids.length > 0) {
      query = query.in('product_id', ids);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Failed to load bundle tiers:', error);
    } else {
      const map: BundleTiersMap = {};
      (data as ProductBundleTier[]).forEach((tier) => {
        if (!map[tier.product_id]) map[tier.product_id] = [];
        map[tier.product_id].push(tier);
      });
      setTiersByProduct(prev => {
        // If specific IDs were queried, replace their keys to reflect deletions as well as updates
        const next: BundleTiersMap = { ...prev };
        if (ids && ids.length > 0) {
          ids.forEach((id) => {
            next[id] = map[id] || [];
          });
        } else {
          // If all tiers were queried, clean and assign
          Object.keys(next).forEach((key) => {
            next[key] = map[key] || [];
          });
          Object.assign(next, map);
        }

        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem(BUNDLE_TIERS_CACHE_KEY, JSON.stringify(next));
          }
        } catch {}
        return next;
      });
    }
    setLoading(false);
  }, []);

  // Initial and productIds-based fetch
  useEffect(() => {
    fetchTiers(productIds);
  }, [fetchTiers, productIds?.join(',')]);

  // Realtime subscription & cross-window sync
  useEffect(() => {
    // 1. Realtime Firestore/Supabase channel listener
    const channel = supabase
      .channel('product_bundle_tiers_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'product_bundle_tiers' },
        (payload: any) => {
          const changedProductId = payload.new?.product_id || payload.old?.product_id;
          if (!productIds || productIds.length === 0 || (changedProductId && productIds.includes(changedProductId))) {
            fetchTiers(productIds);
          }
        }
      )
      .subscribe();

    // 2. Custom event listener (e.g. from ProductModal or local mutations)
    const handleBundleTiersUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{ productId?: string }>;
      const targetId = customEvent.detail?.productId;
      if (!productIds || productIds.length === 0 || !targetId || productIds.includes(targetId)) {
        fetchTiers(productIds);
      }
    };

    // 3. Multi-tab storage sync
    const handleStorage = (e: StorageEvent) => {
      if (e.key === BUNDLE_TIERS_CACHE_KEY && e.newValue) {
        try {
          setTiersByProduct(JSON.parse(e.newValue));
        } catch {}
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(BUNDLE_TIERS_EVENT, handleBundleTiersUpdated);
      window.addEventListener('storage', handleStorage);
    }

    return () => {
      supabase.removeChannel(channel);
      if (typeof window !== 'undefined') {
        window.removeEventListener(BUNDLE_TIERS_EVENT, handleBundleTiersUpdated);
        window.removeEventListener('storage', handleStorage);
      }
    };
  }, [fetchTiers, productIds?.join(',')]);

  return { tiersByProduct, loading, refresh: () => fetchTiers(productIds) };
}

export async function fetchBundleTiersForProduct(
  productId: string
): Promise<ProductBundleTier[]> {
  try {
    const { data, error } = await supabase
      .from('product_bundle_tiers')
      .select('*')
      .eq('product_id', productId)
      .eq('active', true)
      .order('min_quantity', { ascending: true });

    if (!error && data && data.length > 0) {
      return data as ProductBundleTier[];
    }
  } catch (error) {
    console.error('Failed to load tiers for product from db:', error);
  }

  // Fallback to local cache if database returned 0 or errored
  try {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(BUNDLE_TIERS_CACHE_KEY);
      if (cached) {
        const map: BundleTiersMap = JSON.parse(cached);
        if (map[productId] && map[productId].length > 0) {
          return map[productId];
        }
      }
    }
  } catch {}

  return [];
}
