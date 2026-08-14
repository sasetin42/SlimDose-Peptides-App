import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  mirrorPaymentMethodCreate,
  mirrorPaymentMethodDelete,
  mirrorPaymentMethodUpdate,
} from '../lib/convexMirror';

export interface PaymentMethod {
  id: string;
  name: string;
  account_number: string;
  account_name: string;
  qr_code_url: string;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const LOCAL_STORAGE_KEY = 'slimdose_payment_methods';

export const usePaymentMethods = () => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const saveToLocalStorage = (methods: PaymentMethod[]) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(methods));
    } catch (e) {
      console.warn('Failed to save payment methods to localStorage:', e);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      setLoading(true);
      
      const { data, error: fetchError } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('active', true)
        .order('sort_order', { ascending: true });

      if (fetchError || !data || data.length === 0) {
        // Fallback to local storage if remote returns empty or errors out
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) {
          const parsed: PaymentMethod[] = JSON.parse(saved);
          const activeOnly = parsed.filter(m => m.active);
          setPaymentMethods(activeOnly);
          setLoading(false);
          return;
        }
      }

      const merged = data || [];
      setPaymentMethods(merged);
      saveToLocalStorage(merged);
      setError(null);
    } catch (err) {
      console.error('Error fetching payment methods:', err);
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        setPaymentMethods(JSON.parse(saved));
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAllPaymentMethods = async () => {
    try {
      setLoading(true);
      
      const { data, error: fetchError } = await supabase
        .from('payment_methods')
        .select('*')
        .order('sort_order', { ascending: true });

      if (fetchError || !data || data.length === 0) {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) {
          setPaymentMethods(JSON.parse(saved));
          setLoading(false);
          return;
        }
      }

      const merged = data || [];
      setPaymentMethods(merged);
      saveToLocalStorage(merged);
      setError(null);
    } catch (err) {
      console.error('Error fetching all payment methods:', err);
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        setPaymentMethods(JSON.parse(saved));
      }
    } finally {
      setLoading(false);
    }
  };

  const addPaymentMethod = async (method: Omit<PaymentMethod, 'created_at' | 'updated_at'>) => {
    try {
      // Normalize qr_code_url: undefined/null/empty string → placeholder URL
      // Database requires NOT NULL, so we use a placeholder if empty
      let qrCodeUrl = method.qr_code_url?.trim() || '';
      if (!qrCodeUrl || qrCodeUrl === '') {
        // Use a placeholder image URL if no QR code is provided
        qrCodeUrl = 'https://images.pexels.com/photos/8867482/pexels-photo-8867482.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop';
      }
      
      console.log('📤 Adding payment method:', { 
        id: method.id, 
        name: method.name,
        qr_code_url: qrCodeUrl,
        qr_code_url_length: qrCodeUrl.length,
        is_placeholder: qrCodeUrl.includes('pexels.com')
      });
      
      const { data, error: insertError } = await supabase
        .from('payment_methods')
        .insert({
          id: method.id,
          name: method.name,
          account_number: method.account_number,
          account_name: method.account_name,
          qr_code_url: qrCodeUrl, // Always explicitly set (never empty)
          active: method.active,
          sort_order: method.sort_order
        })
        .select('*, qr_code_url') // Explicitly include qr_code_url in response
        .single();

      if (insertError) {
        console.warn('⚠️ Supabase insert RLS restriction encounter. Using fallback saved record:', insertError);
        const fallbackObj = {
          id: method.id,
          name: method.name,
          account_number: method.account_number,
          account_name: method.account_name,
          qr_code_url: qrCodeUrl,
          active: method.active,
          sort_order: method.sort_order,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        mirrorPaymentMethodCreate(fallbackObj);
        setPaymentMethods(prev => {
          const next = [...prev, fallbackObj];
          saveToLocalStorage(next);
          return next;
        });
        return fallbackObj;
      }

      console.log('✅ Payment method added:', {
        id: data?.id,
        qr_code_url: data?.qr_code_url
      });

      mirrorPaymentMethodCreate({
        id: method.id,
        name: method.name,
        account_number: method.account_number,
        account_name: method.account_name,
        qr_code_url: qrCodeUrl,
        active: method.active,
        sort_order: method.sort_order,
      });

      const fallbackObj = {
        id: method.id,
        name: method.name,
        account_number: method.account_number,
        account_name: method.account_name,
        qr_code_url: qrCodeUrl,
        active: method.active,
        sort_order: method.sort_order,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setPaymentMethods(prev => {
        const next = [...prev.filter(m => m.id !== method.id), fallbackObj];
        saveToLocalStorage(next);
        return next;
      });

      await fetchAllPaymentMethods();
      return data;
    } catch (err: any) {
      console.warn('⚠️ Exception during payment method add. Applying active local fallback...', err);
      const fallbackObj = {
        id: method.id,
        name: method.name,
        account_number: method.account_number,
        account_name: method.account_name,
        qr_code_url: method.qr_code_url || 'https://images.pexels.com/photos/8867482/pexels-photo-8867482.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop',
        active: method.active,
        sort_order: method.sort_order,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setPaymentMethods(prev => {
        const next = [...prev, fallbackObj];
        saveToLocalStorage(next);
        return next;
      });
      return fallbackObj;
    }
  };

  const updatePaymentMethod = async (id: string, updates: Partial<PaymentMethod>) => {
    try {
      // Create update payload
      const updatePayload: any = {};
      
      // Include all fields that are in the updates object
      if (updates.name !== undefined) updatePayload.name = updates.name;
      if (updates.account_number !== undefined) updatePayload.account_number = updates.account_number;
      if (updates.account_name !== undefined) updatePayload.account_name = updates.account_name;
      if (updates.active !== undefined) updatePayload.active = updates.active;
      if (updates.sort_order !== undefined) updatePayload.sort_order = updates.sort_order;
      
      // ALWAYS explicitly handle qr_code_url if it's in updates
      if ('qr_code_url' in updates) {
        if (updates.qr_code_url !== undefined && updates.qr_code_url !== null) {
          const urlString = String(updates.qr_code_url).trim();
          updatePayload.qr_code_url = urlString === '' 
            ? 'https://images.pexels.com/photos/8867482/pexels-photo-8867482.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop'
            : urlString;
        } else {
          updatePayload.qr_code_url = 'https://images.pexels.com/photos/8867482/pexels-photo-8867482.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop';
        }
      }
      
      setPaymentMethods(prev => {
        const next = prev.map(item => item.id === id ? { ...item, ...updatePayload, updated_at: new Date().toISOString() } : item);
        saveToLocalStorage(next);
        return next;
      });

      const { data, error: updateError } = await supabase
        .from('payment_methods')
        .update(updatePayload)
        .eq('id', id)
        .select('*, qr_code_url')
        .single();

      if (updateError) {
        console.warn('⚠️ Supabase update RLS restriction encounter. Using fallback updated record:', updateError);
        mirrorPaymentMethodUpdate(id, updatePayload);
        return { id, ...updatePayload };
      }

      mirrorPaymentMethodUpdate(id, updatePayload);
      await fetchAllPaymentMethods();
      return data;
    } catch (err: any) {
      console.warn('⚠️ Exception during payment method update. Applying local fallback update...', err);
      setPaymentMethods(prev => {
        const next = prev.map(item => item.id === id ? { ...item, ...updates, updated_at: new Date().toISOString() } : item);
        saveToLocalStorage(next);
        return next;
      });
      return { id, ...updates };
    }
  };

  const deletePaymentMethod = async (id: string) => {
    try {
      setPaymentMethods(prev => {
        const next = prev.filter(m => m.id !== id);
        saveToLocalStorage(next);
        return next;
      });

      const { error: deleteError } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', id);

      if (deleteError) console.warn('Delete remote warning:', deleteError);

      mirrorPaymentMethodDelete(id);
      await fetchAllPaymentMethods();
    } catch (err) {
      console.error('Error deleting payment method:', err);
    }
  };

  const reorderPaymentMethods = async (reorderedMethods: PaymentMethod[]) => {
    try {
      const updates = reorderedMethods.map((method, index) => ({
        id: method.id,
        sort_order: index + 1
      }));

      for (const update of updates) {
        await supabase
          .from('payment_methods')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id);
      }

      await fetchAllPaymentMethods();
    } catch (err) {
      console.error('Error reordering payment methods:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  return {
    paymentMethods,
    loading,
    error,
    addPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
    reorderPaymentMethods,
    refetch: fetchPaymentMethods,
    refetchAll: fetchAllPaymentMethods
  };
};