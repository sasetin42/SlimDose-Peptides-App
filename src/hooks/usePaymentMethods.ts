import { useState, useEffect, useCallback } from 'react';
import { db } from '../lib/firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
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

export const defaultPaymentMethods: PaymentMethod[] = [
  {
    id: 'bdo',
    name: 'BDO',
    account_number: '010990146456',
    account_name: 'Slimdose',
    qr_code_url: '',
    active: true,
    sort_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'gcash',
    name: 'GCash',
    account_number: '0977 813 2630',
    account_name: 'Kyle Ryu S.',
    qr_code_url: '',
    active: true,
    sort_order: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'cimb',
    name: 'CIMB',
    account_number: '0000-1234-5678',
    account_name: 'Kyle Ryu S.',
    qr_code_url: '',
    active: true,
    sort_order: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

export const usePaymentMethods = () => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return defaultPaymentMethods;
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

  // Seed default payment methods if Firestore collection is completely empty
  const seedDefaultsIfEmpty = useCallback(async () => {
    try {
      const colRef = collection(db, 'payment_methods');
      const snap = await getDocs(colRef);
      if (snap.empty) {
        console.log('🌱 Seeding default payment methods to Firestore...');
        for (const item of defaultPaymentMethods) {
          await setDoc(doc(db, 'payment_methods', item.id), item, { merge: true });
        }
      }
    } catch (e) {
      console.warn('⚠️ Seeding payment methods skipped (permission or offline):', e);
    }
  }, []);

  const fetchPaymentMethods = useCallback(async () => {
    try {
      setLoading(true);
      const colRef = collection(db, 'payment_methods');
      const snap = await getDocs(colRef);

      if (snap.empty) {
        await seedDefaultsIfEmpty();
        setPaymentMethods(defaultPaymentMethods.filter(m => m.active));
        saveToLocalStorage(defaultPaymentMethods);
        setLoading(false);
        return;
      }

      const items: PaymentMethod[] = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as PaymentMethod[];

      items.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      const activeOnly = items.filter(m => m.active !== false);

      setPaymentMethods(activeOnly.length > 0 ? activeOnly : items);
      saveToLocalStorage(items);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching payment methods:', err);
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        setPaymentMethods(JSON.parse(saved));
      }
    } finally {
      setLoading(false);
    }
  }, [seedDefaultsIfEmpty]);

  const fetchAllPaymentMethods = useCallback(async () => {
    try {
      setLoading(true);
      const colRef = collection(db, 'payment_methods');
      const snap = await getDocs(colRef);

      if (snap.empty) {
        await seedDefaultsIfEmpty();
        setPaymentMethods(defaultPaymentMethods);
        saveToLocalStorage(defaultPaymentMethods);
        setLoading(false);
        return;
      }

      const items: PaymentMethod[] = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as PaymentMethod[];

      items.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      setPaymentMethods(items);
      saveToLocalStorage(items);
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
  }, [seedDefaultsIfEmpty]);

  const addPaymentMethod = async (method: Omit<PaymentMethod, 'created_at' | 'updated_at'>) => {
    try {
      let qrCodeUrl = method.qr_code_url?.trim() || '';
      if (!qrCodeUrl || qrCodeUrl === '') {
        qrCodeUrl = 'https://images.pexels.com/photos/8867482/pexels-photo-8867482.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop';
      }

      const newMethod: PaymentMethod = {
        id: method.id,
        name: method.name,
        account_number: method.account_number,
        account_name: method.account_name,
        qr_code_url: qrCodeUrl,
        active: method.active ?? true,
        sort_order: method.sort_order || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Direct Firestore write with merge
      const docRef = doc(db, 'payment_methods', method.id);
      await setDoc(docRef, newMethod, { merge: true });

      // Optimistic update
      setPaymentMethods(prev => {
        const next = [...prev.filter(m => m.id !== method.id), newMethod];
        next.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        saveToLocalStorage(next);
        return next;
      });

      mirrorPaymentMethodCreate(newMethod);
      return newMethod;
    } catch (err: any) {
      console.warn('⚠️ Error during addPaymentMethod. Applying optimistic local fallback...', err);
      const fallbackObj: PaymentMethod = {
        id: method.id,
        name: method.name,
        account_number: method.account_number,
        account_name: method.account_name,
        qr_code_url: method.qr_code_url || 'https://images.pexels.com/photos/8867482/pexels-photo-8867482.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop',
        active: method.active ?? true,
        sort_order: method.sort_order || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setPaymentMethods(prev => {
        const next = [...prev.filter(m => m.id !== method.id), fallbackObj];
        next.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        saveToLocalStorage(next);
        return next;
      });
      return fallbackObj;
    }
  };

  const updatePaymentMethod = async (id: string, updates: Partial<PaymentMethod>) => {
    try {
      const updatePayload: any = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      if ('qr_code_url' in updates) {
        if (updates.qr_code_url !== undefined && updates.qr_code_url !== null) {
          const urlString = String(updates.qr_code_url).trim();
          updatePayload.qr_code_url = urlString === ''
            ? 'https://images.pexels.com/photos/8867482/pexels-photo-8867482.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop'
            : urlString;
        }
      }

      // Direct Firestore write with merge
      const docRef = doc(db, 'payment_methods', id);
      await setDoc(docRef, updatePayload, { merge: true });

      // Optimistic update
      setPaymentMethods(prev => {
        const next = prev.map(item => item.id === id ? { ...item, ...updatePayload } : item);
        next.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        saveToLocalStorage(next);
        return next;
      });

      mirrorPaymentMethodUpdate(id, updatePayload);
      return { id, ...updatePayload };
    } catch (err: any) {
      console.warn('⚠️ Error during updatePaymentMethod. Applying local fallback update...', err);
      setPaymentMethods(prev => {
        const next = prev.map(item => item.id === id ? { ...item, ...updates, updated_at: new Date().toISOString() } : item);
        next.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        saveToLocalStorage(next);
        return next;
      });
      return { id, ...updates };
    }
  };

  const deletePaymentMethod = async (id: string) => {
    try {
      // Optimistic update
      setPaymentMethods(prev => {
        const next = prev.filter(m => m.id !== id);
        saveToLocalStorage(next);
        return next;
      });

      // Direct Firestore delete
      const docRef = doc(db, 'payment_methods', id);
      await deleteDoc(docRef);

      mirrorPaymentMethodDelete(id);
    } catch (err) {
      console.error('Error deleting payment method from Firestore:', err);
    }
  };

  const reorderPaymentMethods = async (reorderedMethods: PaymentMethod[]) => {
    try {
      const updated = reorderedMethods.map((method, index) => ({
        ...method,
        sort_order: index + 1,
        updated_at: new Date().toISOString(),
      }));

      setPaymentMethods(updated);
      saveToLocalStorage(updated);

      for (const item of updated) {
        const docRef = doc(db, 'payment_methods', item.id);
        await setDoc(docRef, { sort_order: item.sort_order, updated_at: item.updated_at }, { merge: true });
      }
    } catch (err) {
      console.error('Error reordering payment methods in Firestore:', err);
      throw err;
    }
  };

  useEffect(() => {
    // 1. Initial fetch & seed check
    fetchPaymentMethods();

    // 2. Realtime listener via Firestore onSnapshot for live updates across all clients
    const colRef = collection(db, 'payment_methods');
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const items: PaymentMethod[] = snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })) as PaymentMethod[];

          items.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
          const activeOnly = items.filter(m => m.active !== false);

          setPaymentMethods(activeOnly.length > 0 ? activeOnly : items);
          saveToLocalStorage(items);
          setLoading(false);
        }
      },
      (err) => {
        console.warn('⚠️ Firestore realtime onSnapshot for payment_methods encountered an error:', err);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [fetchPaymentMethods]);

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