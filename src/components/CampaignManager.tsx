import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Megaphone, Zap, Plus, Trash2, Play, Pause, XCircle, Clock,
  CheckCircle2, Loader2, Users, Send, Info,
} from 'lucide-react';
import {
  loadSegmentCustomers, filterSegment, loadSuppressionList, isSuppressed,
  recordMarketingEmailLog, emailsAlreadySent, processScheduledCampaigns,
  type Campaign,
} from '../lib/marketing';
import { runSchedulerNow, getLastSchedulerRun } from '../lib/scheduler';
import { getStoredTemplateByKey, renderEmailTemplate, renderEmailSubject } from '../utils/email';
import { sendTransactionalEmail } from '../services/emailService';
import { db } from '../lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy as fbOrderBy, limit as fbLimit } from 'firebase/firestore';
import { logAdminAction } from '../lib/audit';
import { fireToast } from './ToastNotification';

interface CampaignManagerProps {
  initialTab?: 'campaigns' | 'automations';
}

interface TemplateRow {
  id: string;
  template_key: string;
  name: string;
  subject: string;
}

const peso = (n: number) => `₱${Number(n || 0).toLocaleString('en-PH', { maximumFractionDigits: 2 })}`;

const SEGMENTS: Array<{ key: string; label: string }> = [
  { key: 'all', label: 'All Customers' },
  { key: 'new', label: 'New Customers (no orders)' },
  { key: 'previous', label: 'Previous Customers (any order)' },
  { key: 'delivered', label: 'Has Delivered Order' },
  { key: 'lapsed', label: 'Not Purchased Recently (60+ days)' },
  { key: 'repeat', label: 'Repeat Customers (2+ orders)' },
];

const statusPill = (s: string) => {
  switch (s) {
    case 'completed': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300';
    case 'sending': return 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300';
    case 'scheduled': return 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300';
    case 'paused': case 'cancelled': return 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';
    default: return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
  }
};

const CampaignManager: React.FC<CampaignManagerProps> = ({ initialTab = 'campaigns' }) => {
  const [tab, setTab] = useState<'campaigns' | 'automations'>(initialTab);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({ name: '', template_key: '', subject: '', audience_segment: 'all', scheduled_at: '' });

  const [activeSendId, setActiveSendId] = useState<string | null>(null);
  const [liveSend, setLiveSend] = useState({ sent: 0, failed: 0 });
  const pausedRef = useRef(false);
  const cancelledRef = useRef(false);

  const [lastRun, setLastRun] = useState<Date | null>(null);
  const [isRunningScheduler, setIsRunningScheduler] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [campSnap, tplSnap] = await Promise.all([
        getDocs(query(collection(db, 'email_campaigns'), fbOrderBy('created_at', 'desc'), fbLimit(100))),
        getDocs(collection(db, 'email_templates')),
      ]);
      setCampaigns(campSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Campaign[]);
      const tplRows: TemplateRow[] = tplSnap.docs
        .map((d) => ({ id: d.id, ...(d.data() as any) }))
        .filter((t: any) => t.is_active !== false);
      setTemplates(tplRows);
      setLastRun(getLastSchedulerRun() ? new Date(getLastSchedulerRun()!) : null);
    } catch (e) {
      console.warn('CampaignManager load failed:', e);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const openCreate = () => {
    setForm({ name: '', template_key: templates[0]?.template_key || '', subject: templates[0]?.subject || '', audience_segment: 'all', scheduled_at: '' });
    setIsCreateOpen(true);
  };

  const handleTemplateChange = (key: string) => {
    const tpl = templates.find((t) => t.template_key === key);
    setForm((f) => ({ ...f, template_key: key, subject: tpl?.subject || f.subject }));
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.template_key || !form.subject.trim()) {
      fireToast('Name, template, and subject are required.', 'warning');
      return;
    }
    setIsSaving(true);
    try {
      const payload: Omit<Campaign, 'id'> = {
        name: form.name.trim(),
        template_key: form.template_key,
        subject: form.subject.trim(),
        audience_segment: form.audience_segment,
        recipient_emails: [],
        status: form.scheduled_at ? 'scheduled' : 'draft',
        scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
        started_at: null,
        completed_at: null,
        stats: { sent: 0, failed: 0 },
        created_at: new Date().toISOString(),
      };
      const ref = await addDoc(collection(db, 'email_campaigns'), payload as any);
      logAdminAction('create_campaign', { module: 'marketing', record_id: ref.id, details: `${payload.name} → ${payload.audience_segment}` });
      fireToast(form.scheduled_at ? 'Campaign scheduled.' : 'Campaign created as draft.', 'success');
      setIsCreateOpen(false);
      await loadAll();
    } catch (err: any) {
      fireToast(err?.message || 'Failed to create campaign', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  /** Core send engine — shared by Send Now and Resume. */
  const runCampaignSend = async (c: Campaign) => {
    if (!c.id) return;
    setActiveSendId(c.id);
    pausedRef.current = false;
    cancelledRef.current = false;
    setLiveSend({ sent: 0, failed: 0 });
    try {
      await updateDoc(doc(db, 'email_campaigns', c.id), { status: 'sending', started_at: c.started_at || new Date().toISOString() });
      const customers = filterSegment(await loadSegmentCustomers(), c.audience_segment);
      const targets = customers.filter((x) => !isSuppressed(x.email));
      const alreadySent = await emailsAlreadySent(c.template_key, { campaignId: c.id });
      await loadSuppressionList(true);

      let sent = 0;
      let failed = 0;
      let skipped = 0;
      const tpl = getStoredTemplateByKey(c.template_key);
      const siteUrl = 'https://slimdoseph.com';

      for (const cust of targets) {
        if (cancelledRef.current) {
          await updateDoc(doc(db, 'email_campaigns', c.id), { status: 'cancelled', stats: { sent, failed } });
          fireToast('Campaign cancelled.', 'info');
          return;
        }
        if (pausedRef.current) {
          await updateDoc(doc(db, 'email_campaigns', c.id), { status: 'paused', stats: { sent, failed } });
          fireToast('Campaign paused.', 'info');
          return;
        }
        if (alreadySent.has(cust.email.toLowerCase())) {
          skipped++;
          continue;
        }
        const variables: Record<string, string> = {
          customer_name: cust.name,
          customer_first_name: (cust.name || '').split(' ')[0],
          email: cust.email,
          total_orders: String(cust.total_orders),
          total_spent: peso(cust.total_spent),
          last_order_date: cust.last_order_date ? new Date(cust.last_order_date).toLocaleDateString('en-PH') : '',
          store_name: 'SlimDose Peptides',
          store_url: siteUrl,
          site_url: siteUrl,
          catalog_url: `${siteUrl}/`,
          support_email: 'support@slimdoseph.com',
          unsubscribe_url: `${siteUrl}/unsubscribe?email=${encodeURIComponent(cust.email)}`,
          discount_percentage: '10',
          promo_code: 'WELCOME10',
          otp_code: '',
          expiry_minutes: '',
        };
        try {
          const html = renderEmailTemplate(tpl?.html_content || '<p>Hello {{ customer_first_name }}!</p>', variables);
          const subject = renderEmailSubject(c.subject, variables);
          const res = await sendTransactionalEmail({ to: cust.email, subject, html });
          await recordMarketingEmailLog({
            recipient: cust.email,
            subject,
            template_key: c.template_key,
            campaign_id: c.id,
            follow_up_id: null,
            status: res.success ? 'sent' : 'failed',
            error: res.error || null,
            message_id: res.messageId || null,
            opened_at: null,
            clicked_at: null,
          });
          if (res.success) sent++; else failed++;
        } catch {
          failed++;
        }
        setLiveSend({ sent, failed });
        await updateDoc(doc(db, 'email_campaigns', c.id), { stats: { sent, failed } }).catch(() => {});
        await new Promise((r) => setTimeout(r, 350));
      }

      await updateDoc(doc(db, 'email_campaigns', c.id), {
        status: 'completed',
        completed_at: new Date().toISOString(),
        stats: { sent, failed },
      });
      logAdminAction('campaign_sent', { module: 'marketing', record_id: c.id, details: `${c.name} → ${sent} sent, ${failed} failed, ${skipped} skipped` });
      fireToast(`Campaign complete — ${sent} sent, ${failed} failed, ${skipped} skipped.`, 'success');
    } catch (err: any) {
      fireToast(err?.message || 'Campaign send failed', 'error');
    } finally {
      setActiveSendId(null);
      await loadAll();
    }
  };

  const handleDelete = async (c: Campaign) => {
    if (!c.id || !window.confirm(`Delete campaign "${c.name}"?`)) return;
    try {
      await deleteDoc(doc(db, 'email_campaigns', c.id));
      logAdminAction('delete_campaign', { module: 'marketing', record_id: c.id, details: c.name });
      fireToast('Campaign deleted.', 'success');
      await loadAll();
    } catch (err: any) {
      fireToast(err?.message || 'Failed to delete campaign', 'error');
    }
  };

  const handleRunSchedulerNow = async () => {
    setIsRunningScheduler(true);
    try {
      const result = await runSchedulerNow();
      if (result) {
        setLastRun(new Date(result.at));
        fireToast(`Scheduler run complete — ${result.followUps.sent} follow-up(s) sent, ${result.campaigns.started} campaign(s) started, ${result.backfilled} backfilled.`, 'success');
      } else {
        fireToast('Scheduler is busy — try again shortly.', 'info');
      }
    } finally {
      setIsRunningScheduler(false);
    }
  };

  const segmentLabel = (key: string) => SEGMENTS.find((s) => s.key === key)?.label || key;

  const schedulerStats = useMemo(() => ({
    scheduled: campaigns.filter((c) => c.status === 'scheduled').length,
    sending: campaigns.filter((c) => c.status === 'sending').length,
    completed: campaigns.filter((c) => c.status === 'completed').length,
  }), [campaigns]);

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5 font-inter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#3C6CA8]/10 dark:bg-[#3C6CA8]/20 border border-[#3C6CA8]/25 text-[#3C6CA8] dark:text-[#94BBE9] flex items-center justify-center shrink-0">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#232323] dark:text-white tracking-tight">Campaigns &amp; Automations</h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Segment-targeted email campaigns plus the follow-up automation engine
            </p>
          </div>
        </div>
        {tab === 'campaigns' && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-[#3C6CA8] hover:bg-[#315A8E] text-white px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black shadow-md shadow-[#3C6CA8]/20 cursor-pointer active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" /> New Campaign
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        {([
          { key: 'campaigns', label: 'Email Campaigns', icon: Megaphone },
          { key: 'automations', label: 'Automations & Scheduler', icon: Zap },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              tab === t.key ? 'bg-[#3C6CA8] text-white shadow-sm' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
            }`}
          >
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'campaigns' ? (
        <>
          {loading ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <Loader2 className="w-8 h-8 animate-spin text-[#3C6CA8] mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Loading campaigns…</p>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="p-10 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
              <Megaphone className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500">No campaigns yet. Create one to send a template to a customer segment.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map((c) => {
                const isActiveSend = activeSendId === c.id;
                return (
                  <div key={c.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-4 space-y-2.5">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-black text-sm text-[#232323] dark:text-white">{c.name}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${statusPill(c.status)}`}>{c.status}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {segmentLabel(c.audience_segment)}</span>
                          <span>Template: {c.template_key}</span>
                          {c.scheduled_at && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(c.scheduled_at).toLocaleString('en-PH')}</span>}
                          {c.stats && <span className="text-emerald-600 font-bold">{c.stats.sent} sent</span>}
                          {c.stats && c.stats.failed > 0 && <span className="text-rose-500 font-bold">{c.stats.failed} failed</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {(c.status === 'draft' || c.status === 'paused' || c.status === 'scheduled') && (
                          <button
                            onClick={() => runCampaignSend(c)}
                            disabled={Boolean(activeSendId)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold disabled:opacity-40 cursor-pointer"
                          >
                            {isActiveSend ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                            {c.status === 'paused' ? 'Resume' : 'Send Now'}
                          </button>
                        )}
                        {isActiveSend && (
                          <>
                            <button
                              onClick={() => { pausedRef.current = true; }}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-[11px] font-bold cursor-pointer"
                            >
                              <Pause className="w-3 h-3" /> Pause
                            </button>
                            <button
                              onClick={() => { cancelledRef.current = true; }}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-100 text-rose-700 rounded-lg text-[11px] font-bold cursor-pointer"
                            >
                              <XCircle className="w-3 h-3" /> Cancel
                            </button>
                            <span className="text-[11px] font-bold text-slate-500">{liveSend.sent} sent / {liveSend.failed} failed</span>
                          </>
                        )}
                        <button
                          onClick={() => handleDelete(c)}
                          className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="Delete campaign"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {isActiveSend && (
                      <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-[#3C6CA8] transition-all" style={{ width: `${Math.min(100, ((liveSend.sent + liveSend.failed) / Math.max(1, liveSend.sent + liveSend.failed + 10)) * 100)}%` }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* ── Automations tab ── */
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-wider text-[#232323] dark:text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#3C6CA8]" /> In-App Scheduler
              </h3>
              <button
                onClick={handleRunSchedulerNow}
                disabled={isRunningScheduler}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#3C6CA8] hover:bg-[#315A8E] text-white rounded-xl text-xs font-black disabled:opacity-50 cursor-pointer"
              >
                {isRunningScheduler ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                Run Now
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              While any admin session is open, the scheduler ticks every 5 minutes: it backfills follow-ups for qualifying
              orders, sends due follow-ups, and flips scheduled campaigns to <strong>sending</strong>.
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Scheduled Campaigns', value: schedulerStats.scheduled, icon: Clock },
                { label: 'Currently Sending', value: schedulerStats.sending, icon: Send },
                { label: 'Completed', value: schedulerStats.completed, icon: CheckCircle2 },
              ].map((s) => (
                <div key={s.label} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/70 dark:border-slate-700">
                  <s.icon className="w-4 h-4 text-slate-400 mb-1" />
                  <p className="text-lg font-black text-[#232323] dark:text-white">{s.value}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{s.label}</p>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-400">
              Last scheduler run: {lastRun ? lastRun.toLocaleString('en-PH') : 'this session (runs ~10s after page load, then every 5 min)'}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 space-y-2">
            <h3 className="text-sm font-black uppercase tracking-wider text-[#232323] dark:text-white flex items-center gap-2">
              <Info className="w-4 h-4 text-[#3C6CA8]" /> 24/7 Cloud Function
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Deploy <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[10px]">functions/scheduledEmails.js</code> with a
              Firebase scheduled trigger (recommended: every 15 minutes) so follow-ups and campaign kicks continue even when no
              admin is online. It shares the same idempotent engine, so overlapping runs are safe.
            </p>
            <button
              onClick={async () => {
                const started = await processScheduledCampaigns();
                fireToast(`${started} scheduled campaign(s) kicked to sending.`, 'info');
                await loadAll();
              }}
              className="mt-1 flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" /> Process Scheduled Campaigns Now
            </button>
          </div>
        </div>
      )}

      {/* Create Campaign Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-black text-[#232323] dark:text-white">New Email Campaign</h3>
              <button onClick={() => setIsCreateOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer">✕</button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs sm:text-sm">
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">Campaign Name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. September Restock Blast"
                  className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl font-bold bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-[#3C6CA8]/30"
                />
              </div>
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">Template <span className="text-rose-500">*</span></label>
                <select
                  value={form.template_key}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 font-bold cursor-pointer"
                >
                  {templates.length === 0 && <option value="">No active templates</option>}
                  {templates.map((t) => (
                    <option key={t.id} value={t.template_key}>{t.name} ({t.template_key})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">Subject <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl font-bold bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-[#3C6CA8]/30"
                />
              </div>
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">Audience Segment</label>
                <select
                  value={form.audience_segment}
                  onChange={(e) => setForm({ ...form, audience_segment: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 cursor-pointer"
                >
                  {SEGMENTS.map((s) => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">Schedule For <span className="normal-case font-bold text-slate-400">(optional)</span></label>
                <input
                  type="datetime-local"
                  value={form.scheduled_at}
                  onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
                />
                <p className="text-[10px] text-slate-400 mt-1">Leave blank to save as a draft you can send manually.</p>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
              <button onClick={() => setIsCreateOpen(false)} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-bold cursor-pointer">
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={isSaving}
                className="px-6 py-2.5 bg-[#3C6CA8] hover:bg-[#315A8E] text-white rounded-xl font-black disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? 'Creating…' : 'Create Campaign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignManager;
