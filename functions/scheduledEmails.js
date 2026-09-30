/**
 * Firebase Scheduled Function — 24/7 email automation processing.
 * Runs every 15 minutes: sends due follow-up emails and starts due scheduled campaigns.
 * Deploy with: firebase deploy --only functions
 *
 * SMTP credentials are loaded from the site_settings collection (managed in the
 * admin Site Settings → SMTP section) with environment-variable fallbacks, so
 * updating the SMTP password in the admin UI takes effect without a redeploy.
 *
 * NOTE: this module intentionally duplicates the *minimal* processing logic
 * (rather than importing browser modules) so it stays self-contained for the
 * Functions runtime.
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

initializeApp();

/** SMTP config: Firestore site_settings KV first, env fallback second. */
const loadSmtpConfig = async (db) => {
  const cfg = {
    host: process.env.SMTP_HOST || 'smtp.hostinger.com',
    port: Number(process.env.SMTP_PORT || 465),
    user: process.env.SMTP_USER || 'noreply@slimdoseph.com',
    pass: process.env.SMTP_PASS || '',
    fromEmail: process.env.SMTP_FROM_EMAIL || 'noreply@slimdoseph.com',
    fromName: process.env.SMTP_FROM_NAME || 'SlimDose Peptides',
  };
  try {
    // site_settings keys are document IDs ({ id: '<docId>', value: ... } from the client)
    const keys = ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from_email', 'smtp_from_name'];
    const snaps = await Promise.all(keys.map((k) => db.collection('site_settings').doc(k).get()));
    snaps.forEach((s) => {
      if (!s.exists) return;
      const v = s.data()?.value;
      if (v !== undefined && v !== null && String(v).trim() !== '') cfg[s.id] = String(v).trim();
    });
    if (cfg.smtp_host) cfg.host = cfg.smtp_host;
    if (cfg.smtp_port && !Number.isNaN(Number(cfg.smtp_port))) cfg.port = Number(cfg.smtp_port);
    if (cfg.smtp_user) cfg.user = cfg.smtp_user;
    if (cfg.smtp_pass) cfg.pass = cfg.smtp_pass;
    if (cfg.smtp_from_email) cfg.fromEmail = cfg.smtp_from_email;
    if (cfg.smtp_from_name) cfg.fromName = cfg.smtp_from_name;
  } catch (e) {
    console.warn('[scheduledEmails] SMTP config load note (using env defaults):', e?.message);
  }
  return cfg;
};

export const processEmailAutomations = onSchedule(
  {
    schedule: 'every 15 minutes',
    timeZone: 'Asia/Manila',
    timeoutSeconds: 540,
    memory: '512MiB',
  },
  async () => {
    const db = getFirestore();
    const now = Date.now();

    // ── 1. Backfill follow-ups for qualifying orders ──
    try {
      const ordersSnap = await db
        .collection('orders')
        .where('order_status', '==', 'delivered')
        .limit(500)
        .get();

      const followUpSettingsSnap = await db.collection('site_settings').doc('followup_settings').get();
      let settings = { enabled: true, interval_days: 30, template_key: 'customer-follow-up' };
      if (followUpSettingsSnap.exists) {
        const rawValue = followUpSettingsSnap.data()?.value;
        let parsed = null;
        try { parsed = JSON.parse(rawValue); } catch { parsed = null; }
        if (parsed && typeof parsed === 'object') {
          settings = { ...settings, ...parsed };
        } else if (typeof rawValue === 'string' && rawValue.trim() !== '') {
          settings = { ...settings, enabled: rawValue.trim().toLowerCase() !== 'false' };
        }
      }

      if (settings.enabled) {
        for (const odoc of ordersSnap.docs) {
          const o = odoc.data();
          const email = String(o.customer_email || '').toLowerCase().trim();
          if (!email) continue;

          const existing = await db.collection('follow_ups').where('order_id', '==', odoc.id).limit(1).get();
          if (!existing.empty) continue;

          const base = new Date(o.created_at || Date.now());
          base.setDate(base.getDate() + (settings.interval_days || 30));

          // Skip suppressed recipients
          const suppressed = await db.collection('email_suppression').where('email', '==', email).limit(1).get();
          if (!suppressed.empty) continue;

          await db.collection('follow_ups').add({
            order_id: odoc.id,
            order_number: o.order_number || null,
            customer_email: email,
            customer_name: o.customer_name || 'Valued Customer',
            scheduled_at: base.toISOString(),
            trigger_status: 'delivered',
            template_key: settings.template_key || 'customer-follow-up',
            status: 'scheduled',
            sent_at: null,
            error: null,
            created_at: new Date().toISOString(),
          });
        }
      }
    } catch (e) {
      console.error('[scheduledEmails] backfill error:', e);
    }

    // ── 2. Send due follow-ups ──
    const cfg = await loadSmtpConfig(db);
    let nodemailer = null;
    const sendViaSmtp = async (to, subject, html) => {
      if (!nodemailer) nodemailer = (await import('nodemailer')).default;
      const transporter = nodemailer.createTransport({
        host: cfg.host,
        port: cfg.port,
        secure: cfg.port === 465,
        auth: {
          user: cfg.user,
          pass: cfg.pass,
        },
        tls: { rejectUnauthorized: false },
      });
      return transporter.sendMail({
        from: `"${cfg.fromName}" <${cfg.fromEmail}>`,
        to,
        subject,
        html,
      });
    };

    try {
      const due = await db
        .collection('follow_ups')
        .where('status', '==', 'scheduled')
        .limit(200)
        .get();

      for (const d of due.docs) {
        const fu = d.data();
        if (new Date(fu.scheduled_at).getTime() > now) continue;

        const suppressed = await db.collection('email_suppression').where('email', '==', fu.customer_email).limit(1).get();
        if (!suppressed.empty) {
          await d.ref.update({ status: 'cancelled', error: 'recipient_suppressed' });
          continue;
        }

        try {
          const siteUrl = 'https://slimdoseph.com';
          const orderRef = fu.order_number || fu.order_id;
          const firstName = String(fu.customer_name || '').split(' ')[0];
          const subject = `How are you doing, ${firstName}? — SlimDose Peptides`;
          const html = `<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#F8FAFC;font-family:Arial,sans-serif">
            <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #E2E8F0;border-radius:16px;padding:32px">
              <p style="margin:0;font-size:20px;font-weight:900;color:#0F172A">SlimDose <span style="color:#3C6CA8">Peptides</span></p>
              <h1 style="margin:20px 0 8px;font-size:22px;color:#0F172A">Hi ${firstName},</h1>
              <p style="margin:0 0 12px;font-size:14px;color:#475569;line-height:1.7">
                A month ago you ordered <strong>${orderRef}</strong> from SlimDose Peptides. We'd love to hear how everything went.
              </p>
              <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.7">
                If you're ready to restock or have questions about storage and handling, our team is here to help.
              </p>
              <a href="${siteUrl}" style="display:inline-block;background:#3C6CA8;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px">Visit SlimDose Peptides</a>
              <p style="margin:24px 0 0;font-size:11px;color:#94A3B8">
                You're receiving this because you ordered from SlimDose.
                <a href="${siteUrl}/unsubscribe?email=${encodeURIComponent(fu.customer_email)}" style="color:#94A3B8">Unsubscribe</a>
              </p>
            </div></body></html>`;

          await sendViaSmtp(fu.customer_email, subject, html);
          await d.ref.update({ status: 'sent', sent_at: new Date().toISOString(), error: null });
          await db.collection('email_logs').add({
            recipient: fu.customer_email,
            subject,
            template_key: fu.template_key || 'customer-follow-up',
            campaign_id: null,
            follow_up_id: d.id,
            status: 'sent',
            created_at: new Date().toISOString(),
          });
        } catch (sendErr) {
          await d.ref.update({ status: 'failed', error: sendErr?.message || 'smtp_error' });
          await db.collection('email_logs').add({
            recipient: fu.customer_email,
            subject: 'follow-up',
            template_key: fu.template_key || 'customer-follow-up',
            campaign_id: null,
            follow_up_id: d.id,
            status: 'failed',
            error: sendErr?.message || 'smtp_error',
            created_at: new Date().toISOString(),
          });
        }
      }
    } catch (e) {
      console.error('[scheduledEmails] follow-up send error:', e);
    }

    // ── 3. Start due scheduled campaigns ──
    try {
      const campaigns = await db
        .collection('email_campaigns')
        .where('status', '==', 'scheduled')
        .limit(20)
        .get();

      for (const c of campaigns.docs) {
        const data = c.data();
        if (data.scheduled_at && new Date(data.scheduled_at).getTime() > now) continue;
        await c.ref.update({ status: 'sending', started_at: FieldValue.serverTimestamp() });
      }
    } catch (e) {
      console.error('[scheduledEmails] campaign start error:', e);
    }

    // ── 4. Backfill public order-tracking mirrors (safety net) ──
    // The onOrderTrackingMirror trigger keeps mirrors fresh for new writes;
    // this sweep creates mirrors for orders that predate the trigger.
    try {
      const { buildTrackingSnapshot, safeKey } = await import('./orderTrackingLib.js');
      const ordersSnap = await db.collection('orders').orderBy('created_at', 'desc').limit(500).get();
      let created = 0;
      let batch = db.batch();
      let ops = 0;
      for (const d of ordersSnap.docs) {
        const key = safeKey(d.data().order_number || d.id);
        if (!key) continue;
        const mirror = await db.collection('public_order_tracking').doc(key).get();
        if (mirror.exists) continue;
        batch.set(db.collection('public_order_tracking').doc(key), buildTrackingSnapshot(d.id, d.data()), { merge: true });
        created++;
        if (++ops >= 400) {
          await batch.commit();
          batch = db.batch();
          ops = 0;
        }
      }
      if (ops > 0) await batch.commit();
      if (created > 0) console.log(`[scheduledEmails] tracking mirror backfill: ${created} created`);
    } catch (e) {
      console.error('[scheduledEmails] tracking mirror backfill error:', e);
    }
  }
);
