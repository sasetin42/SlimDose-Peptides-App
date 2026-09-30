/**
 * E2E verification helpers (guarded).
 *
 * Every endpoint requires `confirm=SLIMDOSE-E2E-VERIFY` and is self-limited:
 *  - seedTestFollowUp  → creates ONE due follow-up addressed to the store's own
 *    smtp_admin_email (site_settings), marked e2e_test: true.
 *  - e2eTestOrder      → creates/updates/cleans a single clearly-marked test
 *    order (orders/e2e-test-order) used to validate the public tracking mirror
 *    trigger and the realtime /track-order page. op=create|update|status|cleanup.
 *
 * These endpoints touch nothing else and can be removed after verification.
 */

import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const CONFIRM_KEY = 'SLIMDOSE-E2E-VERIFY';
const TEST_ORDER_ID = 'e2e-test-order';
const TEST_ORDER_NUMBER = 'SDP-E2E-TEST';

const authorized = (req) => (req.query.confirm || req.body?.confirm) === CONFIRM_KEY;

export const seedTestFollowUp = onRequest(
  { cors: true, timeoutSeconds: 30, memory: '256MiB' },
  async (req, res) => {
    if (!authorized(req)) return res.status(403).json({ ok: false, error: 'forbidden' });
    const db = getFirestore();

    // Target the store's own admin inbox (never an arbitrary customer)
    const adminDoc = await db.collection('site_settings').doc('smtp_admin_email').get();
    const adminEmail = String(adminDoc.data()?.value || '').trim();
    if (!adminEmail || !adminEmail.includes('@')) {
      return res.status(400).json({ ok: false, error: 'No smtp_admin_email found in site_settings.' });
    }

    const ref = await db.collection('follow_ups').add({
      order_id: `e2e-test-${Date.now()}`,
      order_number: 'SDP-E2E-TEST',
      customer_email: adminEmail,
      customer_name: 'SlimDose E2E Verification',
      scheduled_at: new Date(Date.now() - 60_000).toISOString(), // due immediately
      trigger_status: 'delivered',
      template_key: 'customer-follow-up',
      status: 'scheduled',
      sent_at: null,
      error: null,
      e2e_test: true,
      created_at: new Date().toISOString(),
    });

    return res.status(200).json({ ok: true, followUpId: ref.id, target: adminEmail });
  }
);

export const e2eTestOrder = onRequest(
  { cors: true, timeoutSeconds: 30, memory: '256MiB' },
  async (req, res) => {
    if (!authorized(req)) return res.status(403).json({ ok: false, error: 'forbidden' });
    const db = getFirestore();
    const op = String(req.query.op || req.body?.op || 'status');

    if (op === 'create') {
      const payload = {
        order_number: TEST_ORDER_NUMBER,
        order_status: 'confirmed',
        payment_status: 'paid',
        customer_name: 'E2E Verification',
        total_price: 1234,
        shipping_fee: 100,
        shipping_location: 'JT_LUZON',
        shipping_city: 'Quezon City',
        order_items: [{ product_name: 'E2E Test Peptide 5mg', quantity: 2 }],
        tracking_number: 'E2E-TRACK-001',
        tracking_courier: 'J&T Express',
        tracking_url_template: 'https://www.jtexpress.ph/track?billcode={tracking_number}',
        e2e_test: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await db.collection('orders').doc(TEST_ORDER_ID).set(payload);
      return res.status(200).json({ ok: true, op, orderId: TEST_ORDER_ID });
    }

    if (op === 'update') {
      await db.collection('orders').doc(TEST_ORDER_ID).set(
        {
          order_status: 'shipped',
          tracking_number: 'E2E-TRACK-002',
          updated_at: new Date().toISOString(),
        },
        { merge: true }
      );
      return res.status(200).json({ ok: true, op });
    }

    if (op === 'cleanup') {
      await db.collection('orders').doc(TEST_ORDER_ID).delete().catch(() => {});
      await db.collection('public_order_tracking').doc(TEST_ORDER_NUMBER).delete().catch(() => {});
      return res.status(200).json({ ok: true, op: 'cleanup' });
    }

    // default: status — verifies the mirror trigger fired
    const [orderSnap, mirrorSnap] = await Promise.all([
      db.collection('orders').doc(TEST_ORDER_ID).get(),
      db.collection('public_order_tracking').doc(TEST_ORDER_NUMBER).get(),
    ]);
    const fuSnap = await db
      .collection('follow_ups')
      .where('e2e_test', '==', true)
      .limit(5)
      .get();
    const followUps = fuSnap.docs.map((d) => ({
      id: d.id,
      status: d.data().status,
      error: d.data().error || null,
      recipient: d.data().customer_email,
    }));

    return res.status(200).json({
      ok: true,
      op: 'status',
      orderExists: orderSnap.exists,
      mirrorExists: mirrorSnap.exists,
      mirror: mirrorSnap.exists
        ? {
            order_status: mirrorSnap.data().order_status,
            tracking_number: mirrorSnap.data().tracking_number,
            items: mirrorSnap.data().items,
            total_price: mirrorSnap.data().total_price,
          }
        : null,
      followUps,
    });
  }
);
