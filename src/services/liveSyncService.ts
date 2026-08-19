import { createClient } from '@supabase/supabase-js';

const LIVE_SUPABASE_URL = 'https://qqsvwakoergetbhkafnm.supabase.co';
const LIVE_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxc3Z3YWtvZXJnZXRiaGthZm5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1OTY5MTAsImV4cCI6MjA5MzE3MjkxMH0.2V4bG7EPwV5cXEtqmNVpp-g81UXcyPBDsl3xkgnV_nw';

export const liveSupabase = createClient(LIVE_SUPABASE_URL, LIVE_SUPABASE_KEY);

export interface LiveSyncStatus {
  isSyncing: boolean;
  lastSyncedAt: string | null;
  recordsSynced: number;
  error: string | null;
}

let syncState: LiveSyncStatus = {
  isSyncing: false,
  lastSyncedAt: localStorage.getItem('slimdose_last_live_sync') || new Date().toISOString(),
  recordsSynced: 0,
  error: null
};

const listeners = new Set<(status: LiveSyncStatus) => void>();

export const subscribeLiveSync = (callback: (status: LiveSyncStatus) => void) => {
  listeners.add(callback);
  callback(syncState);
  return () => {
    listeners.delete(callback);
  };
};

const notifyListeners = () => {
  listeners.forEach(cb => cb({ ...syncState }));
};

export const triggerLiveSync = async (): Promise<LiveSyncStatus> => {
  if (syncState.isSyncing) return syncState;

  syncState.isSyncing = true;
  syncState.error = null;
  notifyListeners();

  try {
    console.log('🔄 Triggering live synchronization with slimdoseph.com...');

    const [productsRes, ordersRes, categoriesRes, guidesRes, promoRes, paymentRes] = await Promise.all([
      liveSupabase.from('products').select('*'),
      liveSupabase.from('orders').select('*'),
      liveSupabase.from('categories').select('*'),
      liveSupabase.from('guide_topics').select('*'),
      liveSupabase.from('promo_codes').select('*'),
      liveSupabase.from('payment_methods').select('*')
    ]);

    const totalCount = 
      (productsRes.data?.length || 0) +
      (ordersRes.data?.length || 0) +
      (categoriesRes.data?.length || 0) +
      (guidesRes.data?.length || 0) +
      (promoRes.data?.length || 0) +
      (paymentRes.data?.length || 0);

    const now = new Date().toISOString();
    localStorage.setItem('slimdose_last_live_sync', now);

    syncState = {
      isSyncing: false,
      lastSyncedAt: now,
      recordsSynced: totalCount,
      error: null
    };
    
    notifyListeners();
    return syncState;
  } catch (err: any) {
    console.error('❌ Live Sync error:', err);
    syncState = {
      ...syncState,
      isSyncing: false,
      error: err?.message || 'Sync failed'
    };
    notifyListeners();
    return syncState;
  }
};
