import { db } from '../lib/firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  writeBatch,
  DocumentData,
  QueryConstraint,
  Unsubscribe,
} from 'firebase/firestore';

export interface QueryFilterOptions {
  wheres?: Array<{ field: string; op: '==' | '!=' | '>' | '>=' | '<' | '<=' | 'in' | 'array-contains'; value: any }>;
  orders?: Array<{ field: string; direction?: 'asc' | 'desc' }>;
  limitCount?: number;
}

/**
 * Realtime subscription to a collection with optional filters
 */
export function subscribeToCollection<T = DocumentData>(
  collectionName: string,
  onNext: (items: T[]) => void,
  onError?: (error: Error) => void,
  options?: QueryFilterOptions
): Unsubscribe {
  const colRef = collection(db, collectionName);
  const constraints: QueryConstraint[] = [];

  if (options?.wheres) {
    for (const w of options.wheres) {
      constraints.push(where(w.field, w.op, w.value));
    }
  }

  if (options?.orders) {
    for (const o of options.orders) {
      constraints.push(orderBy(o.field, o.direction || 'asc'));
    }
  }

  if (options?.limitCount) {
    constraints.push(limit(options.limitCount));
  }

  const q = constraints.length > 0 ? query(colRef, ...constraints) : colRef;

  return onSnapshot(
    q,
    (snapshot) => {
      const items: T[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as unknown as T[];
      onNext(items);
    },
    (err) => {
      console.error(`Realtime error listening to ${collectionName}:`, err);
      if (onError) onError(err);
    }
  );
}

/**
 * Realtime subscription to a single document
 */
export function subscribeToDocument<T = DocumentData>(
  collectionName: string,
  docId: string,
  onNext: (item: T | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const docRef = doc(db, collectionName, docId);

  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        onNext({ id: snap.id, ...snap.data() } as unknown as T);
      } else {
        onNext(null);
      }
    },
    (err) => {
      console.error(`Realtime error listening to doc ${collectionName}/${docId}:`, err);
      if (onError) onError(err);
    }
  );
}

/**
 * Create or overwrite a document with a generated or explicit ID
 */
export async function createDocument<T extends Record<string, any>>(
  collectionName: string,
  data: T,
  customId?: string
): Promise<string> {
  const docId = customId || doc(collection(db, collectionName)).id;
  const docRef = doc(db, collectionName, docId);
  const record = { ...data, id: docId, created_at: data.created_at || new Date().toISOString() };
  await setDoc(docRef, record);
  return docId;
}

/**
 * Update an existing document fields
 */
export async function updateDocumentFields<T extends Record<string, any>>(
  collectionName: string,
  docId: string,
  data: Partial<T>
): Promise<void> {
  const docRef = doc(db, collectionName, docId);
  await updateDoc(docRef, { ...data, updated_at: new Date().toISOString() });
}

/**
 * Delete a document from a collection
 */
export async function deleteDocument(collectionName: string, docId: string): Promise<void> {
  const docRef = doc(db, collectionName, docId);
  await deleteDoc(docRef);
}

/**
 * Execute batch operations in a single transaction-like write
 */
export async function executeBatchWrite(
  operations: Array<{
    type: 'create' | 'update' | 'delete';
    collection: string;
    id?: string;
    data?: any;
  }>
): Promise<void> {
  const batch = writeBatch(db);

  for (const op of operations) {
    if (op.type === 'create') {
      const docId = op.id || doc(collection(db, op.collection)).id;
      const docRef = doc(db, op.collection, docId);
      batch.set(docRef, { ...op.data, id: docId, created_at: new Date().toISOString() });
    } else if (op.type === 'update' && op.id) {
      const docRef = doc(db, op.collection, op.id);
      batch.update(docRef, { ...op.data, updated_at: new Date().toISOString() });
    } else if (op.type === 'delete' && op.id) {
      const docRef = doc(db, op.collection, op.id);
      batch.delete(docRef);
    }
  }

  await batch.commit();
}
