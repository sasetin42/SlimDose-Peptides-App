import { useState, useEffect } from 'react';
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
    is_active: boolean;
    order_index: number;
}

// Default shipping locations (fallback if database table doesn't exist)
const defaultLocations: ShippingLocation[] = [
    { id: 'LUZON', name: 'Luzon (J&T)', fee: 150, is_active: true, order_index: 1 },
    { id: 'VISAYAS', name: 'Visayas (J&T)', fee: 120, is_active: true, order_index: 2 },
    { id: 'MINDANAO', name: 'Mindanao (J&T)', fee: 90, is_active: true, order_index: 3 },
    { id: 'MAXIM', name: 'Maxim Delivery (Booking fee paid by customer upon delivery)', fee: 0, is_active: true, order_index: 4 },
];

export const useShippingLocations = () => {
    const [locations, setLocations] = useState<ShippingLocation[]>(defaultLocations);
    const [loading, setLoading] = useState(true);
    const [error] = useState<string | null>(null);

    const fetchLocations = async () => {
        try {
            setLoading(true);
            const { data, error: fetchError } = await supabase
                .from('shipping_locations')
                .select('*')
                .eq('is_active', true)
                .order('order_index', { ascending: true });

            if (fetchError) {
                console.warn('Shipping locations table not found, using defaults:', fetchError.message);
                setLocations(defaultLocations);
            } else if (data && data.length > 0) {
                setLocations(data);
            } else {
                setLocations(defaultLocations);
            }
        } catch (err) {
            console.error('Error fetching shipping locations:', err);
            setLocations(defaultLocations);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLocations();
    }, []);

    const getShippingFee = (locationId: string): number => {
        const location = locations.find(loc => loc.id === locationId);
        return location ? location.fee : 0;
    };

    return { locations, loading, error, getShippingFee, refetch: fetchLocations };
};

// Admin hook with CRUD operations
export const useShippingLocationsAdmin = () => {
    const [locations, setLocations] = useState<ShippingLocation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAllLocations = async () => {
        try {
            setLoading(true);
            const { data, error: fetchError } = await supabase
                .from('shipping_locations')
                .select('*')
                .order('order_index', { ascending: true });

            if (fetchError) {
                console.warn('Shipping locations table not found:', fetchError.message);
                setLocations([]);
                setError('Table not found. Please run the migration.');
            } else {
                setLocations(data || []);
                setError(null);
            }
        } catch (err) {
            console.error('Error fetching shipping locations:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    const updateLocation = async (id: string, updates: Partial<ShippingLocation>) => {
        const { error } = await supabase
            .from('shipping_locations')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw error;
        mirrorShippingLocationUpdate(id, updates);
        await fetchAllLocations();
    };

    const addLocation = async (location: Omit<ShippingLocation, 'order_index'> & { order_index?: number }) => {
        const payload = { ...location, order_index: location.order_index || locations.length + 1 };
        const { error } = await supabase
            .from('shipping_locations')
            .insert([payload]);

        if (error) throw error;
        mirrorShippingLocationCreate(payload);
        await fetchAllLocations();
    };

    const deleteLocation = async (id: string) => {
        const { error } = await supabase
            .from('shipping_locations')
            .delete()
            .eq('id', id);

        if (error) throw error;
        mirrorShippingLocationDelete(id);
        await fetchAllLocations();
    };

    useEffect(() => {
        fetchAllLocations();
    }, []);

    return { locations, loading, error, updateLocation, addLocation, deleteLocation, refetch: fetchAllLocations };
};
