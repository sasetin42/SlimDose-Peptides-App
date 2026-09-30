import { db, auth } from './firebase';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query as firestoreQuery,
  where,
  onSnapshot,
} from 'firebase/firestore';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';

const DELETED_ITEMS_KEY = 'slimdose_deleted_ids_by_table';

export const getDeletedIdsForTable = (tableName: string): Set<string> => {
  try {
    const raw = localStorage.getItem(DELETED_ITEMS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const ids = Array.isArray(parsed[tableName]) ? parsed[tableName] : [];
    return new Set(ids.map(String));
  } catch {
    return new Set();
  }
};

export const markIdsAsDeleted = (tableName: string, ids: string[]) => {
  try {
    const raw = localStorage.getItem(DELETED_ITEMS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const existing = new Set(Array.isArray(parsed[tableName]) ? parsed[tableName] : []);
    ids.forEach(id => {
      if (id) existing.add(String(id));
    });
    parsed[tableName] = Array.from(existing);
    localStorage.setItem(DELETED_ITEMS_KEY, JSON.stringify(parsed));
  } catch (e) {
    console.warn('Failed to record deleted IDs to storage:', e);
  }
};

export const unmarkIdAsDeleted = (tableName: string, ids: string[]) => {
  try {
    const raw = localStorage.getItem(DELETED_ITEMS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const existing = new Set(Array.isArray(parsed[tableName]) ? parsed[tableName] : []);
    ids.forEach(id => {
      if (id) {
        existing.delete(String(id));
        existing.delete(String(id).toLowerCase().trim());
      }
    });
    parsed[tableName] = Array.from(existing);
    localStorage.setItem(DELETED_ITEMS_KEY, JSON.stringify(parsed));
  } catch (e) {
    console.warn('Failed to unmark deleted IDs from storage:', e);
  }
};

const TABLE_CACHE_PREFIX = 'slimdose_table_cache_';

export const getLocalTableCache = (tableName: string): any[] => {
  try {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(`${TABLE_CACHE_PREFIX}${tableName}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveLocalTableCache = (tableName: string, items: any[]) => {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`${TABLE_CACHE_PREFIX}${tableName}`, JSON.stringify(items));
  } catch (e) {
    console.warn(`[Local Cache] Failed to save table cache for ${tableName}:`, e);
  }
};

export const upsertLocalTableCache = (tableName: string, newOrUpdated: any[]) => {
  try {
    const existing = getLocalTableCache(tableName);
    const map = new Map<string, any>();
    existing.forEach(item => {
      if (item.id) map.set(String(item.id), item);
    });
    newOrUpdated.forEach(item => {
      if (item.id) {
        map.set(String(item.id), { ...(map.get(String(item.id)) || {}), ...item });
      }
    });
    saveLocalTableCache(tableName, Array.from(map.values()));
  } catch (e) {
    console.warn(`[Local Cache] Failed to upsert table cache for ${tableName}:`, e);
  }
};

export const removeLocalTableCacheIds = (tableName: string, ids: string[]) => {
  try {
    const existing = getLocalTableCache(tableName);
    const idSet = new Set(ids.map(String));
    const filtered = existing.filter(item => !idSet.has(String(item.id)));
    saveLocalTableCache(tableName, filtered);
  } catch (e) {
    console.warn(`[Local Cache] Failed to remove ids from table cache:`, e);
  }
};

// Helper to recursively strip undefined properties from documents for Firestore compatibility
const cleanUndefined = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined);
  }
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = cleanUndefined(value);
    }
  }
  return cleaned;
};

class SupabaseChannel {
  private subscriptions: Map<string, Array<(payload: any) => void>> = new Map();
  private unsubs: Array<() => void> = [];

  constructor() {}

  on(
    _event: string,
    filterConfig: { event: string; schema: string; table: string; filter?: string },
    callback: (payload: any) => void
  ) {
    const table = filterConfig.table;
    if (!this.subscriptions.has(table)) {
      this.subscriptions.set(table, []);
    }
    this.subscriptions.get(table)!.push(callback);
    return this;
  }

  subscribe(onStatusChange?: (status: string) => void) {
    this.subscriptions.forEach((callbacks, table) => {
      const colRef = collection(db, table);
      let isInitialSnapshot = true;
      const unsub = onSnapshot(
        colRef,
        (snapshot) => {
          if (isInitialSnapshot) {
            isInitialSnapshot = false;
            return;
          }
          snapshot.docChanges().forEach((change) => {
            const docId = change.doc.id;
            const docData = { id: docId, ...change.doc.data() };
            if (change.type === 'removed') {
              markIdsAsDeleted(table, [docId]);
            }
            callbacks.forEach((cb) => {
              cb({
                eventType:
                  change.type === 'added'
                    ? 'INSERT'
                    : change.type === 'modified'
                      ? 'UPDATE'
                      : 'DELETE',
                new: change.type !== 'removed' ? docData : null,
                old: change.type !== 'added' ? docData : null,
              });
            });
          });
        },
        (error) => {
          console.warn(`[Firestore Realtime] Error listening to ${table}:`, error);
        }
      );
      this.unsubs.push(unsub);
    });
    if (onStatusChange) onStatusChange('SUBSCRIBED');
    return this;
  }

  unsubscribeChannel() {
    this.unsubs.forEach(unsub => {
      try { unsub(); } catch {}
    });
    this.unsubs = [];
  }
}

class SupabaseQueryBuilder {
  private tableName: string;
  private wheres: Array<{ column: string; op: '==' | '!=' | 'in'; value: any }> = [];
  private orderings: Array<{ column: string; direction: 'asc' | 'desc' }> = [];
  private limitVal: number | null = null;
  private insertData: any = null;
  private updateData: any = null;
  private isDelete: boolean = false;
  private isUpsert: boolean = false;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(_columns: string = '*') {
    return this;
  }

  eq(column: string, value: any) {
    this.wheres.push({ column, op: '==', value });
    return this;
  }

  neq(column: string, value: any) {
    this.wheres.push({ column, op: '!=', value });
    return this;
  }

  not(column: string, operator: string, value: any) {
    if (operator === 'is' && value === null) {
      this.wheres.push({ column, op: '!=' as any, value: null });
    } else if (operator === 'eq') {
      this.wheres.push({ column, op: '!=', value });
    } else {
      this.wheres.push({ column, op: '!=' as any, value });
    }
    return this;
  }

  is(column: string, value: any) {
    this.wheres.push({ column, op: '==', value });
    return this;
  }

  gt(column: string, value: any) {
    this.wheres.push({ column, op: '>' as any, value });
    return this;
  }

  gte(column: string, value: any) {
    this.wheres.push({ column, op: '>=' as any, value });
    return this;
  }

  lt(column: string, value: any) {
    this.wheres.push({ column, op: '<' as any, value });
    return this;
  }

  lte(column: string, value: any) {
    this.wheres.push({ column, op: '<=' as any, value });
    return this;
  }

  in(column: string, values: any[]) {
    this.wheres.push({ column, op: 'in', value: values });
    return this;
  }

  ilike(column: string, pattern: string) {
    this.wheres.push({ column, op: 'ilike' as any, value: pattern });
    return this;
  }

  like(column: string, pattern: string) {
    this.wheres.push({ column, op: 'like' as any, value: pattern });
    return this;
  }

  or(filterString: string) {
    // Parse comma-separated filter string e.g. "customer_id.eq.abc,customer_email.eq.xyz"
    const conditions = filterString.split(',').map(cond => {
      const parts = cond.split('.');
      if (parts.length >= 3) {
        return { column: parts[0].trim(), op: parts[1].trim(), value: parts.slice(2).join('.').trim() };
      }
      return null;
    }).filter(Boolean);

    (this as any).orConditions = conditions;
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderings.push({ column, direction: options?.ascending !== false ? 'asc' : 'desc' });
    return this;
  }

  limit(count: number) {
    this.limitVal = count;
    return this;
  }

  range(_from: number, _to: number) {
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  insert(values: any | any[], _options?: { onConflict?: string }) {
    this.insertData = Array.isArray(values) ? values : [values];
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  update(values: any, _options?: { onConflict?: string }) {
    this.updateData = values;
    return this;
  }

  delete() {
    this.isDelete = true;
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  upsert(values: any | any[], _options?: { onConflict?: string }) {
    this.isUpsert = true;
    this.insertData = Array.isArray(values) ? values : [values];
    return this;
  }

  then<T = any>(
    resolve?: ((value: any) => T | PromiseLike<T>) | null,
    reject?: ((reason: any) => void) | null
  ): Promise<T> {
    return this.execute().then(resolve as any, reject as any);
  }

  async execute() {
    try {
      const colRef = collection(db, this.tableName);

      // Fetch from Firestore (optimized using query constraints if available)
      let docsData: any[] = [];
      try {
        // Firestore limits 'in' queries to 30 values max.
        const inConstraint = this.wheres.find(w => w.op === 'in');
        if (inConstraint && Array.isArray(inConstraint.value) && inConstraint.value.length > 30) {
          // Break into chunks of 30
          const chunkSize = 30;
          const chunks: any[][] = [];
          for (let i = 0; i < inConstraint.value.length; i += chunkSize) {
            chunks.push(inConstraint.value.slice(i, i + chunkSize));
          }

          const otherWheres = this.wheres.filter(w => w !== inConstraint);
          const chunkPromises = chunks.map(async (chunk) => {
            const constraints: any[] = [];
            for (const w of otherWheres) {
              if (w.op === '==' || w.op === '!=' || w.op === 'in') {
                constraints.push(where(w.column, w.op, w.value));
              }
            }
            constraints.push(where(inConstraint.column, 'in', chunk));
            const qRef = firestoreQuery(colRef, ...constraints);
            const snap = await getDocs(qRef);
            return snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
          });

          const chunkResults = await Promise.all(chunkPromises);
          docsData = chunkResults.flat();
        } else {
          const queryConstraints: any[] = [];
          for (const w of this.wheres) {
            if (w.op === '==' || w.op === '!=' || w.op === 'in') {
              queryConstraints.push(where(w.column, w.op, w.value));
            }
          }
          const firestoreQueryRef = queryConstraints.length > 0
            ? firestoreQuery(colRef, ...queryConstraints)
            : colRef;

          const snapshot = await getDocs(firestoreQueryRef);
          docsData = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }));
        }
      } catch (e) {
        console.warn(`[Firestore Adapter] Query on ${this.tableName} failed:`, e);
        return { data: null, error: e };
      }

      // The database is the single source of truth — no static fallbacks.
      if (docsData.length === 0) {
        const deletedIds = getDeletedIdsForTable(this.tableName);
        const localCached = getLocalTableCache(this.tableName);
        if (localCached && localCached.length > 0) {
          // Local cache holds records created this session that may not be visible
          // yet due to read-after-write lag; merge them in.
          docsData = localCached.filter(item => !deletedIds.has(String(item.id)));
        }
      }

      // Apply any remaining wheres client-side
      for (const w of this.wheres) {
        docsData = docsData.filter((item: any) => {
          const val = item[w.column];
          if (w.op === '==') {
            return val === w.value;
          }
          if (w.op === '!=') {
            return val !== w.value;
          }
          if (w.op === 'in') {
            return Array.isArray(w.value) && w.value.includes(val);
          }
          if (w.op === ('>' as any)) {
            return Number(val) > Number(w.value);
          }
          if (w.op === ('>=' as any)) {
            return Number(val) >= Number(w.value);
          }
          if (w.op === ('<' as any)) {
            return Number(val) < Number(w.value);
          }
          if (w.op === ('<=' as any)) {
            return Number(val) <= Number(w.value);
          }
          if (w.op === ('ilike' as any)) {
            const rawPattern = String(w.value).replace(/^%+|%+$/g, '').toLowerCase();
            return String(val || '').toLowerCase().includes(rawPattern);
          }
          if (w.op === ('like' as any)) {
            const rawPattern = String(w.value).replace(/^%+|%+$/g, '');
            return String(val || '').includes(rawPattern);
          }
          return true;
        });
      }

      // Apply OR conditions if present
      const orConditions: Array<{ column: string; op: string; value: string }> | undefined = (this as any).orConditions;
      if (orConditions && orConditions.length > 0) {
        docsData = docsData.filter((item: any) => {
          return orConditions.some(cond => {
            const val = item[cond.column];
            if (cond.op === 'eq') return String(val) === String(cond.value);
            if (cond.op === 'neq') return String(val) !== String(cond.value);
            if (cond.op === 'ilike') return String(val || '').toLowerCase().includes(String(cond.value).replace(/^%+|%+$/g, '').toLowerCase());
            return false;
          });
        });
      }

      // Handle Delete (supports single .eq('id'), bulk .in('id', [...]), and filtered targets)
      if (this.isDelete) {
        const targetId = this.wheres.find(w => w.column === 'id' && w.op === '==')?.value;
        const targetInIds = this.wheres.find(w => w.column === 'id' && w.op === 'in')?.value;

        let idsToDelete: string[] = [];
        if (targetId) {
          idsToDelete = [String(targetId)];
        } else if (Array.isArray(targetInIds)) {
          idsToDelete = targetInIds.map(String);
        } else if (docsData.length > 0) {
          idsToDelete = docsData.map(d => String(d.id));
        }

        // Record in tombstone registry and local cache immediately
        if (idsToDelete.length > 0) {
          markIdsAsDeleted(this.tableName, idsToDelete);
          removeLocalTableCacheIds(this.tableName, idsToDelete);
        }

        const targets = docsData.length > 0 ? docsData : idsToDelete.map(id => ({ id }));
        const promises = targets.map(async (item: any) => {
          if (!item.id) return;
          try {
            const docRef = doc(db, this.tableName, String(item.id));
            await deleteDoc(docRef);
          } catch (delErr) {
            console.warn(`[Firestore Adapter] deleteDoc error for ${item.id}:`, delErr);
          }
        });
        await Promise.all(promises);

        // If products table, also cascade-delete associated variations
        if (this.tableName === 'products' && idsToDelete.length > 0) {
          try {
            const varColRef = collection(db, 'product_variations');
            const varSnap = await getDocs(varColRef);
            const varDeletePromises: Promise<void>[] = [];
            varSnap.docs.forEach(docSnap => {
              const data = docSnap.data();
              if (idsToDelete.includes(String(data.product_id))) {
                varDeletePromises.push(deleteDoc(doc(db, 'product_variations', docSnap.id)));
              }
            });
            await Promise.all(varDeletePromises);
          } catch (varErr) {
            console.warn('[Firestore Adapter] Variation cascade delete skipped:', varErr);
          }
        }

        return { data: null, error: null };
      }

      // Handle Update
      if (this.updateData) {
        const sanitizedUpdate = cleanUndefined(this.updateData);
        const targetId = this.wheres.find(w => w.column === 'id' && w.op === '==')?.value;
        const targets = docsData.length > 0 ? docsData : (targetId ? [{ id: String(targetId) }] : []);

        const promises = targets.map(async (item: any) => {
          const docRef = doc(db, this.tableName, item.id);
          await setDoc(docRef, { ...sanitizedUpdate, id: item.id }, { merge: true });
        });
        await Promise.all(promises);
        const updated = targets.map((item: any) => ({
          ...item,
          ...sanitizedUpdate,
        }));
        upsertLocalTableCache(this.tableName, updated);
        return { data: updated, error: null };
      }

      // Handle Insert or Upsert (Parallelized for maximum speed)
      if (this.insertData) {
        const docPromises = this.insertData.map(async (item: any) => {
          const docId = item.id || doc(collection(db, this.tableName)).id;
          const docRef = doc(db, this.tableName, docId);
          const docData = cleanUndefined({ ...item, id: docId });

          if (this.isUpsert) {
            await setDoc(docRef, docData, { merge: true });
          } else {
            await setDoc(docRef, docData);
          }
          return docData;
        });

        const results = await Promise.all(docPromises);
        upsertLocalTableCache(this.tableName, results);
        return { data: this.insertData.length === 1 ? results[0] : results, error: null };
      }

      // Apply Orderings client-side
      if (this.orderings.length > 0) {
        docsData.sort((a: any, b: any) => {
          for (const o of this.orderings) {
            const valA = a[o.column];
            const valB = b[o.column];
            if (valA === undefined || valB === undefined) continue;
            if (valA < valB) return o.direction === 'asc' ? -1 : 1;
            if (valA > valB) return o.direction === 'asc' ? 1 : -1;
          }
          return 0;
        });
      }

      // Apply Limit client-side
      if (this.limitVal !== null) {
        docsData = docsData.slice(0, this.limitVal);
      }

      return { data: docsData, error: null };
    } catch (err: any) {
      console.error(`[Firestore Adapter] Error on table ${this.tableName}:`, err);
      return { data: null, error: err };
    }
  }

  async single() {
    const res = await this.execute();
    if (res.error) return { data: null, error: res.error };
    if (res.data && !Array.isArray(res.data)) return { data: res.data, error: null };
    return { data: res.data && res.data.length > 0 ? res.data[0] : null, error: null };
  }

  async maybeSingle() {
    return this.single();
  }
}

const activeChannels = new Map<string, SupabaseChannel>();

export const supabase = {
  from: (tableName: string) => new SupabaseQueryBuilder(tableName),
  channel: (channelName: string) => {
    const chan = new SupabaseChannel();
    activeChannels.set(channelName, chan);
    return chan;
  },
  removeChannel: (channel: any) => {
    if (channel && typeof channel.unsubscribeChannel === 'function') {
      channel.unsubscribeChannel();
    }
  },
  rpc: async (fnName: string, params?: any) => {
    try {
      if (fnName === 'get_sales_analytics') {
        const { date_start, date_end } = params || {};
        const start = date_start ? new Date(date_start).getTime() : 0;
        const end = date_end ? new Date(date_end).getTime() : Infinity;

        const ordersRes = await new SupabaseQueryBuilder('orders').select('*');
        const orders = ordersRes.data || [];
        const inRange = orders.filter((o: any) => {
          const t = new Date(o.created_at || Date.now()).getTime();
          return t >= start && t <= end && o.status !== 'cancelled' && o.order_status !== 'cancelled';
        });

        const total_orders = inRange.length;
        const total_revenue = inRange.reduce((acc: number, o: any) => acc + (Number(o.total_price) || 0), 0);
        const total_units = inRange.reduce((acc: number, o: any) => {
          const items = Array.isArray(o.order_items) ? o.order_items : [];
          return acc + items.reduce((iAcc: number, item: any) => iAcc + (Number(item.quantity) || 1), 0);
        }, 0);
        const total_cost = inRange.reduce((acc: number, o: any) => {
          const items = Array.isArray(o.order_items) ? o.order_items : [];
          return acc + items.reduce((iAcc: number, item: any) => iAcc + ((Number(item.raw_price) || (Number(item.price) * 0.4)) * (Number(item.quantity) || 1)), 0);
        }, 0);
        const total_profit = total_revenue - total_cost;
        const avg_order_value = total_orders > 0 ? total_revenue / total_orders : 0;
        const profit_margin = total_revenue > 0 ? (total_profit / total_revenue) * 100 : 0;

        return {
          data: [{
            total_revenue,
            total_profit,
            total_orders,
            total_units,
            avg_order_value,
            profit_margin,
          }],
          error: null,
        };
      }

      if (fnName === 'get_product_rankings_v2') {
        const { date_start, date_end, limit_count = 10 } = params || {};
        const start = date_start ? new Date(date_start).getTime() : 0;
        const end = date_end ? new Date(date_end).getTime() : Infinity;

        const ordersRes = await new SupabaseQueryBuilder('orders').select('*');
        const orders = ordersRes.data || [];
        const inRange = orders.filter((o: any) => {
          const t = new Date(o.created_at || Date.now()).getTime();
          return t >= start && t <= end && o.status !== 'cancelled';
        });

        const productMap: Record<string, { product_name: string; units_sold: number; revenue: number; cost: number; profit: number }> = {};
        inRange.forEach((o: any) => {
          const items = Array.isArray(o.order_items) ? o.order_items : [];
          items.forEach((item: any) => {
            const name = item.product_name || item.name || 'Unknown Product';
            if (!productMap[name]) {
              productMap[name] = { product_name: name, units_sold: 0, revenue: 0, cost: 0, profit: 0 };
            }
            const qty = Number(item.quantity) || 1;
            const rev = Number(item.total_price) || (Number(item.price) * qty) || 0;
            const cst = (Number(item.raw_price) || (Number(item.price) * 0.4)) * qty;
            productMap[name].units_sold += qty;
            productMap[name].revenue += rev;
            productMap[name].cost += cst;
            productMap[name].profit += (rev - cst);
          });
        });

        const list = Object.values(productMap)
          .sort((a, b) => b.units_sold - a.units_sold)
          .slice(0, limit_count);
        return { data: list, error: null };
      }

      return { data: [], error: null };
    } catch (err: any) {
      console.warn(`[RPC] Error invoking ${fnName}:`, err);
      return { data: [], error: err };
    }
  },
  storage: {
    from: (_bucketName: string) => ({
      upload: async (path: string, file: File, _options?: any) => {
        try {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          return { data: { path: dataUrl, fullPath: path }, error: null };
        } catch (err: any) {
          return { data: null, error: err };
        }
      },
      getPublicUrl: (path: string) => {
        if (!path) return { data: { publicUrl: '' } };
        return { data: { publicUrl: path } };
      },
      remove: async (_paths: string[]) => {
        return { data: null, error: null };
      },
    }),
  },
  auth: {
    signUp: async ({ email, password }: any) => {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        return { data: { user: userCredential.user }, error: null };
      } catch (err: any) {
        return { data: null, error: err };
      }
    },
    signInWithPassword: async ({ email, password }: any) => {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;
        return {
          data: {
            user: { email: firebaseUser.email, id: firebaseUser.uid },
            session: {
              access_token: 'authenticated_v1',
              user: { email: firebaseUser.email, id: firebaseUser.uid, role: 'admin', name: 'Store Admin' }
            }
          },
          error: null
        };
      } catch (err: any) {
        return { data: null, error: err };
      }
    },
    signOut: async () => {
      try {
        await firebaseSignOut(auth);
        return { error: null };
      } catch (err: any) {
        return { error: err };
      }
    },
    getSession: async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        return {
          data: {
            session: {
              access_token: 'authenticated_v1',
              user: { email: currentUser.email, id: currentUser.uid, role: 'admin', name: 'Store Admin' }
            }
          },
          error: null
        };
      }
      return { data: { session: null }, error: null };
    }
  },
  functions: {
    invoke: async (functionName: string, _options?: { body?: any }) => {
      console.debug(`ℹ️ Function '${functionName}' called (running in dedicated Firebase mode).`);
      return { data: { success: true, dedicatedFirebase: true }, error: null };
    }
  },
};
