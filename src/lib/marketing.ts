/**
 * SlimDose Marketing Automation Engine
 * - Email suppression (unsubscribe/bounce/complaint)
 * - Email log persistence + dedupe
 * - Customer segmentation for campaigns
 * - Follow-up scheduling (1-month post-purchase by default)
 * - In-app scheduler tick (processes due follow-ups & scheduled campaigns)
 */

import { collection, getDocs, addDoc, query, where, limit as fbLimit } from 'firebase/firestore';
import { db } from './firebase';
import { getStoredTemplateByKey, sendTransactionalEmail, renderEmailTemplate, renderEmailSubject } from '../utils/email';
import { formatOrderId } from '../utils/orderUtils';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface EmailSuppression {
  id?: string;
  email: string;
  reason: 'unsubscribed' | 'bounced' | 'complaint' | 'manual';
  source?: string;
  created_at: string;
}

export interface MarketingEmailLog {
  id?: string;
  recipient: string;
  subject: string;
  template_key: string | null;
  campaign_id: string | null;
  follow_up_id: string | null;
  status: 'queued' | 'sent' | 'failed';
  error?: string | null;
  message_id?: string | null;
  opened_at?: string | null;
  clicked_at?: string | null;
  created_at: string;
}

export interface FollowUp {
  id?: string;
  order_id: string;
  order_number: string | null;
  customer_email: string;
  customer_name: string;
  scheduled_at: string;      // ISO date the follow-up should send
  trigger_status: string;    // order status that qualified this follow-up
  template_key: string;
  status: 'scheduled' | 'sent' | 'failed' | 'cancelled';
  sent_at?: string | null;
  error?: string | null;
  follow_up_date?: string | null; // admin-overridden date
  created_at: string;
}

export interface CustomerSegment {
  key: string;
  label: string;
}

export const CUSTOMER_SEGMENTS: CustomerSegment[] = [
  { key: 'all', label: 'All Customers' },
  { key: 'new', label: 'New Customers (no orders)' },
  { key: 'previous', label: 'Previous Customers (any order)' },
  { key: 'with_orders', label: 'Customers with Orders' },
  { key: 'without_orders', label: 'Customers without Orders' },
  { key: 'delivered', label: 'Customers with Delivered Orders' },
  { key: 'followup_eligible', label: 'Eligible for Follow-Up' },
  { key: 'lapsed', label: 'Not Purchased Recently (60+ days)' },
  { key: 'repeat', label: 'Repeat Customers (2+ orders)' },
];

// ─── Suppression list ──────────────────────────────────────────────────────────

const suppressionCache: { list: Set<string> | null; loadedAt: number } = { list: null, loadedAt: 0 };

export const isSuppressed = (email: string | undefined | null): boolean => {
  if (!email) return false;
  return suppressionCache.list?.has(email.toLowerCase().trim()) ?? false;
};

export const loadSuppressionList = async (force = false): Promise<Set<string>> => {
  if (!force && suppressionCache.list && Date.now() - suppressionCache.loadedAt < 60_000) {
    return suppressionCache.list;
  }
  try {
    const snap = await getDocs(collection(db, 'email_suppression'));
    const set = new Set<string>();
    snap.docs.forEach((d) => {
      const email = String((d.data() as any).email || '').toLowerCase().trim();
      if (email) set.add(email);
    });
    suppressionCache.list = set;
    suppressionCache.loadedAt = Date.now();
    return set;
  } catch (e) {
    console.warn('[marketing] Failed to load suppression list:', e);
    return suppressionCache.list || new Set();
  }
};

export const suppressEmail = async (
  email: string,
  reason: EmailSuppression['reason'],
  source?: string
): Promise<void> => {
  const clean = email.toLowerCase().trim();
  try {
    await addDoc(collection(db, 'email_suppression'), {
      email: clean,
      reason,
      source,
      created_at: new Date().toISOString(),
    });
    suppressionCache.list?.add(clean);
  } catch (e) {
    console.warn('[marketing] Failed to suppress email:', e);
  }
};

export const unsuppressEmail = async (email: string): Promise<void> => {
  const clean = email.toLowerCase().trim();
  try {
    const snap = await getDocs(query(collection(db, 'email_suppression'), where('email', '==', clean)));
    for (const d of snap.docs) {
      await import('firebase/firestore').then(({ deleteDoc }) => deleteDoc(d.ref));
    }
    suppressionCache.list?.delete(clean);
  } catch (e) {
    console.warn('[marketing] Failed to unsuppress email:', e);
  }
};

// ─── Email logs (marketing/campaign/follow-up) ────────────────────────────────

export const recordMarketingEmailLog = async (entry: Omit<MarketingEmailLog, 'created_at'>): Promise<void> => {
  try {
    await addDoc(collection(db, 'email_logs'), {
      ...entry,
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('[marketing] Failed to record email log:', e);
  }
};

/** Returns emails already sent a given template for a given reference (dedupe) */
export const emailsAlreadySent = async (
  templateKey: string,
  opts?: { campaignId?: string; followUpId?: string }
): Promise<Set<string>> => {
  try {
    const constraints = [where('template_key', '==', templateKey)];
    if (opts?.campaignId) constraints.push(where('campaign_id', '==', opts.campaignId));
    if (opts?.followUpId) constraints.push(where('follow_up_id', '==', opts.followUpId));
    const q = query(collection(db, 'email_logs'), ...constraints, fbLimit(2000));
    const snap = await getDocs(q);
    const set = new Set<string>();
    snap.docs.forEach((d) => {
      const r = String((d.data() as any).recipient || '').toLowerCase().trim();
      if (r) set.add(r);
    });
    return set;
  } catch {
    return new Set();
  }
};

// ─── Customer segmentation ─────────────────────────────────────────────────────

export interface SegmentCustomer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  total_orders: number;
  total_spent: number;
  last_order_date: string | null;
  has_delivered: boolean;
  created_at: string;
}

export const loadSegmentCustomers = async (): Promise<SegmentCustomer[]> => {
  try {
    const [custSnap, ordSnap] = await Promise.all([
      getDocs(collection(db, 'customers')),
      getDocs(collection(db, 'orders')),
    ]);

    const byEmail = new Map<string, SegmentCustomer>();

    custSnap.docs.forEach((d) => {
      const c = d.data() as any;
      const email = String(c.email || '').toLowerCase().trim();
      if (!email) return;
      byEmail.set(email, {
        id: d.id,
        name: c.full_name || c.name || email.split('@')[0],
        email,
        phone: c.phone || '',
        total_orders: 0,
        total_spent: 0,
        last_order_date: null,
        has_delivered: false,
        created_at: c.created_at || new Date().toISOString(),
      });
    });

    ordSnap.docs.forEach((d) => {
      const o = d.data() as any;
      const email = String(o.customer_email || '').toLowerCase().trim();
      if (!email) return;
      if (!byEmail.has(email)) {
        byEmail.set(email, {
          id: `guest_${email.replace(/[^a-z0-9]/g, '').slice(0, 12)}`,
          name: o.customer_name || email.split('@')[0],
          email,
          phone: o.customer_phone || '',
          total_orders: 0,
          total_spent: 0,
          last_order_date: null,
          has_delivered: false,
          created_at: o.created_at || new Date().toISOString(),
        });
      }
      const stat = byEmail.get(email)!;
      stat.total_orders += 1;
      stat.total_spent += Number(o.total_price || 0) + Number(o.shipping_fee || 0);
      const oDate = o.created_at || '';
      if (!stat.last_order_date || new Date(oDate) > new Date(stat.last_order_date)) {
        stat.last_order_date = oDate;
      }
      if (String(o.order_status || '').toLowerCase() === 'delivered') stat.has_delivered = true;
    });

    return Array.from(byEmail.values());
  } catch (e) {
    console.warn('[marketing] loadSegmentCustomers failed:', e);
    return [];
  }
};

export const filterSegment = (
  customers: SegmentCustomer[],
  segmentKey: string,
  opts?: { productId?: string; categoryKey?: string; orderStatus?: string; dateFrom?: string; dateTo?: string }
): SegmentCustomer[] => {
  const now = Date.now();
  const SIXTY_DAYS = 60 * 24 * 60 * 60 * 1000;
  return customers.filter((c) => {
    switch (segmentKey) {
      case 'new':
      case 'without_orders':
        return c.total_orders === 0;
      case 'previous':
      case 'with_orders':
        return c.total_orders > 0;
      case 'delivered':
        return c.has_delivered;
      case 'followup_eligible':
        return c.total_orders > 0 && !!c.last_order_date && (now - new Date(c.last_order_date).getTime()) > 25 * 24 * 3600 * 1000;
      case 'lapsed':
        return c.total_orders > 0 && !!c.last_order_date && (now - new Date(c.last_order_date).getTime()) > SIXTY_DAYS;
      case 'repeat':
        return c.total_orders >= 2;
      case 'all':
      default:
        break;
    }
    // Extra filters
    if (opts?.dateFrom && new Date(c.created_at) < new Date(opts.dateFrom)) return false;
    if (opts?.dateTo && new Date(c.created_at) > new Date(`${opts.dateTo}T23:59:59`)) return false;
    return true;
  });
};

// ─── Follow-up automation ──────────────────────────────────────────────────────

export interface FollowUpSettings {
  enabled: boolean;
  interval_days: number;         // default 30 (1 month)
  trigger_status: string;        // default 'delivered'
  template_key: string;          // default 'customer-follow-up'
}

export const DEFAULT_FOLLOWUP_SETTINGS: FollowUpSettings = {
  enabled: true,
  interval_days: 30,
  trigger_status: 'delivered',
  template_key: 'customer-follow-up',
};

export const loadFollowUpSettings = async (): Promise<FollowUpSettings> => {
  try {
    const snap = await getDocs(query(collection(db, 'site_settings'), where('id', '==', 'followup_settings')));
    if (!snap.empty) {
      const raw = JSON.parse((snap.docs[0].data() as any).value || '{}');
      return { ...DEFAULT_FOLLOWUP_SETTINGS, ...raw };
    }
  } catch {}
  return DEFAULT_FOLLOWUP_SETTINGS;
};

export const saveFollowUpSettings = async (settings: FollowUpSettings): Promise<void> => {
  try {
    const { setDoc, doc } = await import('firebase/firestore');
    await setDoc(doc(db, 'site_settings', 'followup_settings'), {
      id: 'followup_settings',
      value: JSON.stringify(settings),
      type: 'json',
      updated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('[marketing] Failed to save follow-up settings:', e);
  }
};

/** Schedule (or reschedule) the follow-up for an order. Idempotent per order. */
export const scheduleFollowUpForOrder = async (
  order: { id: string; order_number?: string | null; customer_email?: string | null; customer_name?: string | null; created_at?: string | null },
  settings: FollowUpSettings
): Promise<FollowUp | null> => {
  if (!settings.enabled) return null;
  const email = String(order.customer_email || '').toLowerCase().trim();
  if (!email) return null;
  if (isSuppressed(email)) return null;

  try {
    // Idempotency: one follow-up per order
    const existing = await getDocs(query(collection(db, 'follow_ups'), where('order_id', '==', order.id), fbLimit(1)));
    if (!existing.empty) {
      const fu = existing.docs[0].data() as FollowUp;
      if (fu.status === 'cancelled') return null;
      return { id: existing.docs[0].id, ...fu };
    }

    const baseDate = order.created_at || new Date().toISOString();
    const scheduled = new Date(baseDate);
    scheduled.setDate(scheduled.getDate() + settings.interval_days);

    const payload: FollowUp = {
      order_id: order.id,
      order_number: order.order_number || null,
      customer_email: email,
      customer_name: order.customer_name || 'Valued Customer',
      scheduled_at: scheduled.toISOString(),
      trigger_status: settings.trigger_status,
      template_key: settings.template_key,
      status: 'scheduled',
      sent_at: null,
      error: null,
      follow_up_date: null,
      created_at: new Date().toISOString(),
    };

    const ref = await addDoc(collection(db, 'follow_ups'), payload as any);
    return { id: ref.id, ...payload };
  } catch (e) {
    console.warn('[marketing] scheduleFollowUpForOrder failed:', e);
    return null;
  }
};

/** Change a scheduled follow-up's date (admin action) */
export const rescheduleFollowUp = async (followUpId: string, newDate: string): Promise<boolean> => {
  try {
    const { doc, updateDoc } = await import('firebase/firestore');
    await updateDoc(doc(db, 'follow_ups', followUpId), { scheduled_at: new Date(newDate).toISOString(), follow_up_date: newDate });
    return true;
  } catch (e) {
    console.warn('[marketing] rescheduleFollowUp failed:', e);
    return false;
  }
};

/** Cancel a scheduled follow-up (admin action) */
export const cancelFollowUp = async (followUpId: string): Promise<boolean> => {
  try {
    const { doc, updateDoc } = await import('firebase/firestore');
    await updateDoc(doc(db, 'follow_ups', followUpId), { status: 'cancelled' });
    return true;
  } catch (e) {
    console.warn('[marketing] cancelFollowUp failed:', e);
    return false;
  }
};

/** Send a follow-up immediately (admin "send now" / resend) */
export const sendFollowUpNow = async (followUp: FollowUp): Promise<boolean> => {
  const template = getStoredTemplateByKey(followUp.template_key);
  const siteUrl = 'https://slimdoseph.com';
  const variables: Record<string, string> = {
    customer_name: followUp.customer_name,
    customer_first_name: (followUp.customer_name || '').split(' ')[0],
    order_id: formatOrderId({ id: followUp.order_id, order_number: followUp.order_number }, { prefix: false }),
    order_number: formatOrderId({ id: followUp.order_id, order_number: followUp.order_number }, { prefix: false }),
    follow_up_date: new Date(followUp.scheduled_at).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }),
    store_name: 'SlimDose Peptides',
    store_url: siteUrl,
    site_url: siteUrl,
    support_email: 'support@slimdoseph.com',
    unsubscribe_url: `${siteUrl}/unsubscribe?email=${encodeURIComponent(followUp.customer_email)}`,
  };

  const html = renderEmailTemplate(template.html_content, variables);
  const subject = renderEmailSubject(template.subject, variables);

  // Dedupe: never resend a sent follow-up unless forced
  if (followUp.status === 'sent') return true;

  const res = await sendTransactionalEmail({
    to: followUp.customer_email,
    subject,
    html,
  });

  try {
    const { doc, updateDoc } = await import('firebase/firestore');
    await updateDoc(doc(db, 'follow_ups', followUp.id!), {
      status: res.success ? 'sent' : 'failed',
      sent_at: res.success ? new Date().toISOString() : null,
      error: res.success ? null : res.error,
    });
  } catch {}

  await recordMarketingEmailLog({
    recipient: followUp.customer_email,
    subject,
    template_key: followUp.template_key,
    campaign_id: null,
    follow_up_id: followUp.id || null,
    status: res.success ? 'sent' : 'failed',
    error: res.error || null,
    message_id: res.messageId || null,
    opened_at: null,
    clicked_at: null,
  });

  return res.success;
};

/** Process all due follow-ups (called by the in-app scheduler and cloud function) */
export const processDueFollowUps = async (): Promise<{ processed: number; sent: number; failed: number }> => {
  await loadSuppressionList(true);
  const settings = await loadFollowUpSettings();
  if (!settings.enabled) return { processed: 0, sent: 0, failed: 0 };

  let processed = 0, sent = 0, failed = 0;
  try {
    const snap = await getDocs(query(collection(db, 'follow_ups'), where('status', '==', 'scheduled'), fbLimit(200)));
    const now = Date.now();
    for (const d of snap.docs) {
      const fu = { id: d.id, ...(d.data() as FollowUp) };
      const due = new Date(fu.scheduled_at).getTime() <= now;
      if (!due) continue;
      processed++;
      if (isSuppressed(fu.customer_email)) {
        await cancelFollowUp(fu.id!);
        continue;
      }
      const ok = await sendFollowUpNow(fu);
      if (ok) sent++; else failed++;
    }
  } catch (e) {
    console.warn('[marketing] processDueFollowUps failed:', e);
  }
  return { processed, sent, failed };
};

/**
 * Create follow-ups for qualifying orders that don't have one yet.
 * Called by the scheduler; safe to run repeatedly (idempotent per order).
 */
export const backfillFollowUps = async (): Promise<number> => {
  await loadSuppressionList();
  const settings = await loadFollowUpSettings();
  if (!settings.enabled) return 0;
  let created = 0;
  try {
    const snap = await getDocs(query(collection(db, 'orders'), where('order_status', '==', settings.trigger_status), fbLimit(500)));
    for (const d of snap.docs) {
      const o = d.data() as any;
      const res = await scheduleFollowUpForOrder(
        { id: d.id, order_number: o.order_number, customer_email: o.customer_email, customer_name: o.customer_name, created_at: o.created_at },
        settings
      );
      if (res) created++;
    }
  } catch (e) {
    console.warn('[marketing] backfillFollowUps failed:', e);
  }
  return created;
};

// ─── Scheduled campaigns ───────────────────────────────────────────────────────

export interface Campaign {
  id?: string;
  name: string;
  template_key: string;
  subject: string;
  audience_segment: string;
  recipient_emails: string[];
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'paused' | 'cancelled';
  scheduled_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  stats?: { sent: number; failed: number };
  created_at: string;
}

export const processScheduledCampaigns = async (): Promise<{ started: number }> => {
  let started = 0;
  try {
    const snap = await getDocs(query(collection(db, 'email_campaigns'), where('status', '==', 'scheduled'), fbLimit(20)));
    const now = Date.now();
    for (const d of snap.docs) {
      const c = { id: d.id, ...(d.data() as Campaign) };
      if (c.scheduled_at && new Date(c.scheduled_at).getTime() > now) continue;
      started++;
      // Kick off sending in the background — the campaign manager drives batches
      (async () => {
        try {
          const { doc, updateDoc } = await import('firebase/firestore');
          await updateDoc(doc(db, 'email_campaigns', c.id!), { status: 'sending', started_at: new Date().toISOString() });
        } catch {}
      })();
    }
  } catch (e) {
    console.warn('[marketing] processScheduledCampaigns failed:', e);
  }
  return { started };
};
