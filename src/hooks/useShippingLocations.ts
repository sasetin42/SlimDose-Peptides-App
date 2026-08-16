import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  mirrorShippingLocationCreate,
  mirrorShippingLocationDelete,
  mirrorShippingLocationUpdate,
} from '../lib/convexMirror';

export interface ShippingLocation {
  id: string;
  name: string;
  fee: number;
  note?: string;
  is_active: boolean;
  order_index: number;
  created_at?: string;
  updated_at?: string;
}

// Default delivery modes
export const defaultShippingLocations: ShippingLocation[] = [
  { id: 'JT_LUZON', name: 'J&T — Luzon', fee: 120, is_active: true, order_index: 1 },
  { id: 'JT_VISAYAS', name: 'J&T — Visayas', fee: 150, is_active: true, order_index: 2 },
  { id: 'JT_MINDANAO', name: 'J&T — Mindanao', fee: 90, is_active: true, order_index: 3 },
  { id: 'MAXIM_DAVAO', name: 'Maxim — Davao City', fee: 0, note: 'Customer Pays Rider', is_active: true, order_index: 4 },
  { id: 'LALAMOVE_MM', name: 'Lalamove — Metro Manila', fee: 0, note: 'Customer Pays Rider', is_active: true, order_index: 5 },
];

const SHIPPING_CACHE_KEY = 'slimdose_shipping_locations_cache';

const getInitialShippingLocations = (): ShippingLocation[] => {
  try {
    const cached = localStorage.getItem(SHIPPING_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return defaultShippingLocations;
};

export const useShippingLocations = () => {
  const [locations, setLocations] = useState<ShippingLocation[]>(getInitialShippingLocations);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLocations = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('shipping_locations')
        .select('*')
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      if (fetchError) {
        console.warn('Shipping locations table notice, using cached/fallback:', fetchError.message);
        setLocations(getInitialShippingLocations());
      } else if (data && data.length > 0) {
        setLocations(data);
        try { localStorage.setItem(SHIPPING_CACHE_KEY, JSON.stringify(data)); } catch {}
      } else {
        setLocations(getInitialShippingLocations());
      }
    } catch (err) {
      console.error('Error fetching shipping locations:', err);
      setLocations(getInitialShippingLocations());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();

    const handleSync = () => {
      setLocations(getInitialShippingLocations());
    };
    window.addEventListener('storage', handleSync);
    window.addEventListener('shipping_locations_updated', handleSync);

    // Setup Realtime Live Subscription
    const channel = supabase
      .channel('public_shipping_locations_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shipping_locations' },
        () => {
          fetchLocations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('shipping_locations_updated', handleSync);
    };
  }, [fetchLocations]);

  const getShippingFee = (locationId: string): number => {
    if (!locationId) return 0;
    const norm = locationId.trim().toUpperCase();
    const location = locations.find(loc => loc.id.toUpperCase() === norm || loc.name.toUpperCase().includes(norm));
    if (location) return location.fee;
    if (norm.includes('LUZON')) return 120;
    if (norm.includes('VISAYAS')) return 150;
    if (norm.includes('MINDANAO')) return 90;
    if (norm.includes('MAXIM') || norm.includes('DAVAO')) return 0;
    if (norm.includes('LALAMOVE') || norm.includes('METRO') || norm.includes('NCR')) return 0;
    return 0;
  };

  return { locations, loading, error, getShippingFee, refetch: fetchLocations };
};

// Admin hook with CRUD & Realtime synchronization
export const useShippingLocationsAdmin = () => {
  const [locations, setLocations] = useState<ShippingLocation[]>(getInitialShippingLocations);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLiveConnected, setIsLiveConnected] = useState(true);

  const fetchAllLocations = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('shipping_locations')
        .select('*')
        .order('order_index', { ascending: true });

      if (fetchError) {
        console.warn('Shipping locations table query notice:', fetchError.message);
        // Fallback to local cached locations so admin can continue working
        setLocations(getInitialShippingLocations());
        setError(null);
      } else if (data && data.length > 0) {
        setLocations(data);
        try { localStorage.setItem(SHIPPING_CACHE_KEY, JSON.stringify(data)); } catch {}
        setError(null);
      } else {
        setLocations(getInitialShippingLocations());
        setError(null);
      }
    } catch (err: any) {
      console.error('Error fetching shipping locations for admin:', err);
      setLocations(getInitialShippingLocations());
      setError(null);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const updateLocation = async (id: string, updates: Partial<ShippingLocation>) => {
    // Optimistic state update + immediate persistent cache save
    let nextList: ShippingLocation[] = [];
    setLocations(prev => {
      nextList = prev.map(loc => (loc.id === id ? { ...loc, ...updates, updated_at: new Date().toISOString() } : loc));
      try { localStorage.setItem(SHIPPING_CACHE_KEY, JSON.stringify(nextList)); } catch {}
      return nextList;
    });
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('shipping_locations_updated'));

    try {
      const fullItem = nextList.find(loc => loc.id === id) || { id, ...updates };
      const { error: dbError } = await supabase
        .from('shipping_locations')
        .upsert({
          ...fullItem,
          ...updates,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (dbError) {
        console.warn('Supabase upsert notice:', dbError.message);
      }
      mirrorShippingLocationUpdate(id, updates);
    } catch (e) {
      console.warn('Supabase update warning, local state applied:', e);
    }
    await fetchAllLocations(true);
  };

  const addLocation = async (location: Omit<ShippingLocation, 'order_index'> & { order_index?: number }) => {
    const payload: ShippingLocation = {
      ...location,
      order_index: location.order_index || locations.length + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Optimistic update + immediate persistent cache save
    setLocations(prev => {
      const next = [...prev, payload];
      try { localStorage.setItem(SHIPPING_CACHE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('shipping_locations_updated'));

    try {
      const { error: dbError } = await supabase
        .from('shipping_locations')
        .upsert([payload], { onConflict: 'id' });

      if (dbError) throw dbError;
      mirrorShippingLocationCreate(payload);
    } catch (e) {
      console.warn('Supabase insert warning, local state applied:', e);
    }
    await fetchAllLocations(true);
  };

  const deleteLocation = async (id: string) => {
    // Optimistic update + immediate persistent cache save
    setLocations(prev => {
      const next = prev.filter(loc => loc.id !== id);
      try { localStorage.setItem(SHIPPING_CACHE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('shipping_locations_updated'));

    try {
      const { error: dbError } = await supabase
        .from('shipping_locations')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;
      mirrorShippingLocationDelete(id);
    } catch (e) {
      console.warn('Supabase delete warning, local state applied:', e);
    }
    await fetchAllLocations(true);
  };

  const seedDefaultLocations = async () => {
    try {
      setLoading(true);
      const rows = defaultShippingLocations.map((loc, idx) => ({
        id: loc.id,
        name: loc.name,
        fee: loc.fee,
        is_active: loc.is_active,
        order_index: idx + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { error: insertError } = await supabase
        .from('shipping_locations')
        .upsert(rows, { onConflict: 'id' });

      if (insertError) throw insertError;
      await fetchAllLocations();
      return true;
    } catch (err: any) {
      console.error('Failed to seed default shipping locations:', err);
      setLocations(defaultShippingLocations);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const reorderLocation = async (id: string, direction: 'up' | 'down') => {
    const currentIndex = locations.findIndex(loc => loc.id === id);
    if (currentIndex === -1) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= locations.length) return;

    const newLocations = [...locations];
    const [moved] = newLocations.splice(currentIndex, 1);
    newLocations.splice(targetIndex, 0, moved);

    // Re-assign order indices
    const updated = newLocations.map((loc, idx) => ({
      ...loc,
      order_index: idx + 1
    }));
    setLocations(updated);

    // Persist changes
    try {
      for (const loc of updated) {
        await supabase
          .from('shipping_locations')
          .update({ order_index: loc.order_index })
          .eq('id', loc.id);
      }
    } catch (e) {
      console.warn('Error saving reorder:', e);
    }
  };

  useEffect(() => {
    fetchAllLocations();

    // Subscribe to realtime database changes
    const channel = supabase
      .channel('admin_shipping_locations_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shipping_locations' },
        () => {
          fetchAllLocations(true);
        }
      )
      .subscribe((status) => {
        setIsLiveConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAllLocations]);

  return {
    locations,
    loading,
    error,
    isLiveConnected,
    updateLocation,
    addLocation,
    deleteLocation,
    seedDefaultLocations,
    reorderLocation,
    refetch: fetchAllLocations
  };
};
