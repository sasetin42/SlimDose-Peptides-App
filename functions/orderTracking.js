/**
 * Order Tracking Mirror — public, sanitized order-status documents.
 *
 * Firestore rules lock /orders down to admins + the owning customer, so the
 * anonymous /track-order page cannot read orders directly. This module keeps a
 * mirrored collection /public_order_tracking/{order_number} containing ONLY
 * non-sensitive tracking fields (no email, phone, full address, or payment
 * credentials). The mirror is written exclusively by the Admin SDK here, which
 * bypasses security rules; client rules allow public read, deny all writes.
 *
 *  - onOrderTrackingMirror: Firestore trigger, keeps the mirror in sync on
 *    every order create/update/delete (realtime for the tracking page).
 *  - backfillOrderTracking: admin-only callable that seeds mirrors for all
 *    existing orders (one-off / on-demand maintenance).
 */

import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { buildTrackingSnapshot, safeKey } from './orderTrackingLib.js';



export const onOrderTrackingMirror = onDocumentWritten(
  {
    document: 'orders/{orderId}',
    timeoutSeconds: 60,
    memory: '256MiB',
    retry: false,
  },
  async (event) => {
    const db = getFirestore();
    const orderId = event.params.orderId;
    const before = event.data?.before?.exists ? event.data.before.data() : null;
    const after = event.data?.after?.exists ? event.data.after.data() : null;

    const beforeKey = before ? safeKey(before.order_number || orderId) : null;
    const afterKey = after ? safeKey(after.order_number || orderId) : null;

    // Order deleted → remove its public mirror.
    if (!after) {
      if (beforeKey) {
        await db.collection('public_order_tracking').doc(beforeKey).delete().catch(() => {});
      }
      return null;
    }

    // Order number changed → remove the stale mirror key.
    if (beforeKey && afterKey && beforeKey !== afterKey) {
      await db.collection('public_order_tracking').doc(beforeKey).delete().catch(() => {});
    }

    await db
      .collection('public_order_tracking')
      .doc(afterKey)
      .set(buildTrackingSnapshot(orderId, after), { merge: true });

    console.log(`[orderTracking] mirrored ${orderId} → public_order_tracking/${afterKey}`);
    return null;
  }
);

/**
 * Admin-only backfill: creates mirrors for existing orders.
 * Call from the app console:  supabase  →  functions callable 'backfillOrderTracking'
 * or via HTTPS callable with a signed-in admin account.
 */
export const backfillOrderTracking = onCall(
  {
    timeoutSeconds: 540,
    memory: '512MiB',
  },
  async (req) => {
    const email = String(req.auth?.token?.email || '').toLowerCase();
    if (!email) {
      throw new HttpsError('unauthenticated', 'Sign in with an admin account first.');
    }
    const db = getFirestore();
    const adminDoc = await db.collection('admin_users').doc(email).get();
    if (!adminDoc.exists) {
      throw new HttpsError('permission-denied', 'Admin privileges required.');
    }

    const snap = await db
      .collection('orders')
      .orderBy('created_at', 'desc')
      .limit(2000)
      .get();

    let mirrored = 0;
    let ops = 0;
    let batch = db.batch();

    for (const d of snap.docs) {
      const o = d.data();
      const key = safeKey(o.order_number || d.id);
      if (!key) continue;
      batch.set(
        db.collection('public_order_tracking').doc(key),
        buildTrackingSnapshot(d.id, o),
        { merge: true }
      );
      mirrored++;
      if (++ops >= 400) {
        await batch.commit();
        batch = db.batch();
        ops = 0;
      }
    }
    if (ops > 0) await batch.commit();

    console.log(`[orderTracking] backfill complete: ${mirrored} mirrors`);
    return { ok: true, mirrored, scanned: snap.size };
  }
);
