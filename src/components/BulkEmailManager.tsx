import React, { useState, useEffect, useMemo } from 'react';
import {
  Send, Loader2, Users, Filter, ShieldOff, Search, Info, CheckCircle2, XCircle,
} from 'lucide-react';
import {
  loadSegmentCustomers, filterSegment, loadSuppressionList, isSuppressed,
  recordMarketingEmailLog, emailsAlreadySent,
  type SegmentCustomer,
} from '../lib/marketing';
import { getStoredTemplateByKey, renderEmailTemplate, renderEmailSubject } from '../utils/email';
import { sendTransactionalEmail } from '../services/emailService';
import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { logAdminAction } from '../lib/audit';
import { fireToast } from './ToastNotification';

interface TemplateRow {
  id: string;
  template_key: string;
  name: string;
  subject: string;
  description?: string;
  category?: string;
  is_active?: boolean;
}

const peso = (n: number) => `₱${Number(n || 0).toLocaleString('en-PH', { maximumFractionDigits: 2 })}`;

const BulkEmailManager: React.FC = () => {
  const [customers, setCustomers] = useState<SegmentCustomer[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyOverride, setBodyOverride] = useState('');
  const [segmentKey, setSegmentKey] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [isSending, setIsSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [failCount, setFailCount] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [isSuppressionLoaded, setIsSuppressionLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      setLoadingData(true);
      try {
        const [cust, tplSnap] = await Promise.all([
          loadSegmentCustomers(),
          getDocs(collection(db, 'email_templates')),
        ]);
        setCustomers(cust);
        const tplRows: TemplateRow[] = tplSnap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }))
          .filter((t: any) => t.is_active !== false);
        setTemplates(tplRows);
        if (tplRows.length > 0) {
          setSelectedTemplateKey(tplRows[0].template_key);
          setSubject(tplRows[0].subject);
        }
        await loadSuppressionList(true);
        setIsSuppressionLoaded(true);
      } catch (e) {
        console.warn('BulkEmailManager load failed:', e);
        fireToast('Failed to load customer/template data', 'error');
      } finally {
        setLoadingData(false);
      }
    })();
  }, []);

  const segmentCustomers = useMemo(
    () => filterSegment(customers, segmentKey, { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }),
    [customers, segmentKey, dateFrom, dateTo]
  );

  const searchedCustomers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return segmentCustomers;
    return segmentCustomers.filter(
      (c) => c.email.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
    );
  }, [segmentCustomers, searchTerm]);

  const selectedTemplate = templates.find((t) => t.template_key === selectedTemplateKey);

  const handleTemplateChange = (key: string) => {
    setSelectedTemplateKey(key);
    const tpl = templates.find((t) => t.template_key === key);
    if (tpl) {
      setSubject(tpl.subject);
      setBodyOverride('');
    }
  };

  /** Send one templated email (Subject + HTML override aware). Returns true on success. */
  const sendOne = async (c: SegmentCustomer): Promise<boolean> => {
    const tpl = getStoredTemplateByKey(selectedTemplateKey);
    const siteUrl = 'https://slimdoseph.com';
    const variables: Record<string, string> = {
      customer_name: c.name,
      customer_first_name: (c.name || '').split(' ')[0],
      email: c.email,
      total_orders: String(c.total_orders),
      total_spent: peso(c.total_spent),
      last_order_date: c.last_order_date ? new Date(c.last_order_date).toLocaleDateString('en-PH') : '',
      store_name: 'SlimDose Peptides',
      store_url: siteUrl,
      site_url: siteUrl,
      catalog_url: `${siteUrl}/`,
      support_email: 'support@slimdoseph.com',
      unsubscribe_url: `${siteUrl}/unsubscribe?email=${encodeURIComponent(c.email)}`,
      discount_percentage: '10',
      promo_code: 'WELCOME10',
      otp_code: '',
      expiry_minutes: '',
    };
    const html = bodyOverride.trim()
      ? `<tr><td style="padding: 18px 28px;">${bodyOverride}</td></tr>`
      : renderEmailTemplate(tpl?.html_content || '<p>Hello {{ customer_first_name }}!</p>', variables);
    const finalSubject = renderEmailSubject(subject || tpl?.subject || 'A message from SlimDose', variables);

    const res = await sendTransactionalEmail({ to: c.email, subject: finalSubject, html });
    await recordMarketingEmailLog({
      recipient: c.email,
      subject: finalSubject,
      template_key: selectedTemplateKey || null,
      campaign_id: null,
      follow_up_id: null,
      status: res.success ? 'sent' : 'failed',
      error: res.error || null,
      message_id: res.messageId || null,
      opened_at: null,
      clicked_at: null,
    });
    return res.success;
  };

  const handleSend = async () => {
    if (!selectedTemplateKey) {
      fireToast('Select an email template first.', 'warning');
      return;
    }
    if (!subject.trim()) {
      fireToast('Email subject is required.', 'warning');
      return;
    }
    const targets = searchedCustomers.filter((c) => !isSuppressed(c.email));
    if (targets.length === 0) {
      fireToast('No eligible recipients in this segment.', 'warning');
      return;
    }
    if (!window.confirm(`Send "${subject}" to ${targets.length} recipient(s)? Suppressed emails are skipped automatically.`)) {
      return;
    }

    setIsSending(true);
    setSentCount(0);
    setFailCount(0);
    setProgressTotal(targets.length);
    try {
      const alreadySent = await emailsAlreadySent(selectedTemplateKey);
      let sent = 0;
      let failed = 0;
      let skipped = 0;
      for (const c of targets) {
        if (alreadySent.has(c.email.toLowerCase())) {
          skipped++;
          continue;
        }
        try {
          const ok = await sendOne(c);
          if (ok) sent++; else failed++;
        } catch {
          failed++;
        }
        setSentCount(sent);
        setFailCount(failed);
        // Gentle pacing to stay under SMTP/provider rate limits
        await new Promise((r) => setTimeout(r, 350));
      }
      logAdminAction('bulk_email_send', {
        module: 'marketing',
        details: `Template "${selectedTemplateKey}" → ${sent} sent, ${failed} failed, ${skipped} skipped (dedupe)`,
      });
      fireToast(`Bulk send complete — ${sent} sent, ${failed} failed, ${skipped} skipped.`, sent > 0 ? 'success' : 'error');
    } finally {
      setIsSending(false);
    }
  };

  const stats = [
    { label: 'In Segment', value: segmentCustomers.length, icon: Users, color: 'text-[#3C6CA8]' },
    { label: 'After Search', value: searchedCustomers.length, icon: Filter, color: 'text-indigo-600' },
    { label: 'Suppressed (skipped)', value: searchedCustomers.filter((c) => isSuppressed(c.email)).length, icon: ShieldOff, color: 'text-rose-500' },
    { label: 'Sent This Session', value: sentCount, icon: CheckCircle2, color: 'text-emerald-600' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5 font-inter">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-[#3C6CA8]/10 dark:bg-[#3C6CA8]/20 border border-[#3C6CA8]/25 text-[#3C6CA8] dark:text-[#94BBE9] flex items-center justify-center shrink-0">
          <Send className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#232323] dark:text-white tracking-tight">Bulk Email Sender</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Send templated campaigns to customer segments — suppression list respected, per-recipient dedupe enforced
          </p>
        </div>
      </div>

      {loadingData ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <Loader2 className="w-8 h-8 animate-spin text-[#3C6CA8] mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Loading customers and templates…</p>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {stats.map((k) => (
              <div key={k.label} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{k.label}</p>
                  <p className={`text-xl sm:text-2xl font-black mt-1 ${k.color}`}>{k.value}</p>
                </div>
                <k.icon className="w-8 h-8 opacity-20 text-slate-500" />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Composer */}
            <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">Email Template</label>
                <select
                  value={selectedTemplateKey}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 font-bold cursor-pointer"
                >
                  {templates.length === 0 && <option value="">No active templates found</option>}
                  {templates.map((t) => (
                    <option key={t.id} value={t.template_key}>{t.name} ({t.template_key})</option>
                  ))}
                </select>
                {selectedTemplate && (
                  <p className="text-[11px] text-slate-400 mt-1">{selectedTemplate.description || 'Uses the published template content from Email Templates.'}</p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">Subject Line</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Supports variables like {{ customer_first_name }}"
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl font-bold bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-[#3C6CA8]/30"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                  Body Override <span className="normal-case font-bold text-slate-400">(optional HTML — blank = template body)</span>
                </label>
                <textarea
                  rows={5}
                  value={bodyOverride}
                  onChange={(e) => setBodyOverride(e.target.value)}
                  placeholder="<p>Hi {{ customer_first_name }}, check out our new arrivals…</p>"
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-[#3C6CA8]/30 resize-y"
                />
              </div>

              <button
                onClick={handleSend}
                disabled={isSending || !selectedTemplateKey || searchedCustomers.length === 0}
                className="w-full flex items-center justify-center gap-2 bg-[#3C6CA8] hover:bg-[#315A8E] text-white py-3 rounded-xl text-sm font-black shadow-md shadow-[#3C6CA8]/20 disabled:opacity-40 cursor-pointer transition-all"
              >
                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {isSending
                  ? `Sending… ${sentCount + failCount}/${progressTotal}`
                  : `Send to ${searchedCustomers.filter((c) => !isSuppressed(c.email)).length} Recipient(s)`}
              </button>

              {(sentCount > 0 || failCount > 0) && (
                <div className="flex items-center gap-4 text-xs font-bold">
                  <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> {sentCount} sent</span>
                  <span className="text-rose-600 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> {failCount} failed</span>
                </div>
              )}

              <div className="flex items-start gap-2 p-3 bg-blue-50/60 dark:bg-slate-800/60 rounded-xl border border-blue-100 dark:border-slate-700">
                <Info className="w-3.5 h-3.5 text-[#3C6CA8] shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Sends sequentially with 350ms pacing. Recipients who previously received the same template are skipped.
                  Unsubscribes/bounces are filtered via the suppression list{isSuppressionLoaded ? '' : ' (loading…)'}.
                </p>
              </div>
            </div>

            {/* Audience */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 space-y-3">
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">Audience Segment</label>
                <select
                  value={segmentKey}
                  onChange={(e) => setSegmentKey(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 font-bold cursor-pointer"
                >
                  <option value="all">All Customers</option>
                  <option value="new">New Customers (no orders)</option>
                  <option value="previous">Previous Customers (any order)</option>
                  <option value="delivered">Has Delivered Order</option>
                  <option value="lapsed">Not Purchased Recently (60+ days)</option>
                  <option value="repeat">Repeat Customers (2+ orders)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Registered From</label>
                  <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full px-2 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">To</label>
                  <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full px-2 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800" />
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter recipients…"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#3C6CA8]/30"
                />
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/70 border border-slate-100 dark:border-slate-800 rounded-xl">
                {searchedCustomers.slice(0, 100).map((c) => {
                  const suppressed = isSuppressed(c.email);
                  return (
                    <div key={c.id} className={`px-3 py-2 flex items-center justify-between gap-2 ${suppressed ? 'opacity-40' : ''}`}>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{c.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{c.email} · {c.total_orders} order(s) · {peso(c.total_spent)}</p>
                      </div>
                      {suppressed && <span title="Suppressed"><ShieldOff className="w-3.5 h-3.5 text-rose-400 shrink-0" /></span>}
                    </div>
                  );
                })}
                {searchedCustomers.length > 100 && (
                  <div className="px-3 py-2 text-[10px] text-slate-400 text-center">+ {searchedCustomers.length - 100} more…</div>
                )}
                {searchedCustomers.length === 0 && (
                  <div className="px-3 py-6 text-center text-xs text-slate-400">No recipients match this audience.</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default BulkEmailManager;
