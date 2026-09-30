import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, CalendarClock, Send, Ban, Save, Clock,
  Mail, Search, Users,
} from 'lucide-react';
import {
  loadFollowUpSettings, saveFollowUpSettings, DEFAULT_FOLLOWUP_SETTINGS,
  rescheduleFollowUp, cancelFollowUp, sendFollowUpNow, backfillFollowUps,
  isSuppressed, type FollowUp, type FollowUpSettings,
} from '../lib/marketing';
import { getStoredTemplateByKey } from '../utils/email';
import { db } from '../lib/firebase';
import { collection, getDocs, query, orderBy as fbOrderBy, limit as fbLimit } from 'firebase/firestore';
import { logAdminAction } from '../lib/audit';
import { fireToast } from './ToastNotification';

const FollowUpsManager: React.FC = () => {
  const [settings, setSettings] = useState<FollowUpSettings>(DEFAULT_FOLLOWUP_SETTINGS);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const [queue, setQueue] = useState<FollowUp[]>([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusTab, setStatusTab] = useState<'all' | 'scheduled' | 'sent' | 'failed' | 'cancelled'>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isBackfilling, setIsBackfilling] = useState(false);

  const loadQueue = useCallback(async () => {
    setQueueLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'follow_ups'), fbOrderBy('created_at', 'desc'), fbLimit(300)));
      setQueue(snap.docs.map((d) => ({ id: d.id, ...(d.data() as FollowUp) })));
    } catch (e) {
      console.warn('Failed to load follow-up queue:', e);
      setQueue([]);
    } finally {
      setQueueLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setSettingsLoading(true);
      try { setSettings(await loadFollowUpSettings()); } catch { setSettings(DEFAULT_FOLLOWUP_SETTINGS); }
      setSettingsLoading(false);
    })();
    loadQueue();
  }, [loadQueue]);

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      await saveFollowUpSettings(settings);
      logAdminAction('update_followup_settings', { module: 'marketing', details: JSON.stringify(settings) });
      fireToast('Follow-up settings saved.', 'success');
    } catch (err: any) {
      fireToast(err?.message || 'Failed to save settings', 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleBackfill = async () => {
    setIsBackfilling(true);
    try {
      const created = await backfillFollowUps();
      fireToast(`Backfill complete — ${created} follow-up(s) scheduled.`, 'success');
      await loadQueue();
    } catch (err: any) {
      fireToast(err?.message || 'Backfill failed', 'error');
    } finally {
      setIsBackfilling(false);
    }
  };

  const handleSendNow = async (fu: FollowUp) => {
    if (!fu.id) return;
    setBusyId(fu.id);
    try {
      const ok = await sendFollowUpNow(fu);
      if (ok) {
        logAdminAction('send_follow_up_now', { module: 'marketing', record_id: fu.id, details: fu.customer_email });
        fireToast(`Follow-up sent to ${fu.customer_email}.`, 'success');
      } else {
        fireToast(`Send failed for ${fu.customer_email}.`, 'error');
      }
      await loadQueue();
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async (fu: FollowUp) => {
    if (!fu.id) return;
    setBusyId(fu.id);
    try {
      const ok = await cancelFollowUp(fu.id);
      if (ok) {
        logAdminAction('cancel_follow_up', { module: 'marketing', record_id: fu.id, details: fu.customer_email });
        fireToast('Follow-up cancelled.', 'info');
        await loadQueue();
      } else {
        fireToast('Failed to cancel follow-up.', 'error');
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleReschedule = async (fu: FollowUp, newDate: string) => {
    if (!fu.id || !newDate) return;
    setBusyId(fu.id);
    try {
      const ok = await rescheduleFollowUp(fu.id, new Date(newDate).toISOString());
      if (ok) {
        logAdminAction('reschedule_follow_up', { module: 'marketing', record_id: fu.id, details: newDate });
        fireToast('Follow-up rescheduled.', 'success');
        await loadQueue();
      } else {
        fireToast('Failed to reschedule.', 'error');
      }
    } finally {
      setBusyId(null);
    }
  };

  const filtered = queue.filter((f) => {
    if (statusTab !== 'all' && f.status !== statusTab) return false;
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      f.customer_email.toLowerCase().includes(q) ||
      (f.customer_name || '').toLowerCase().includes(q) ||
      (f.order_number || f.order_id || '').toLowerCase().includes(q)
    );
  });

  const counts = {
    all: queue.length,
    scheduled: queue.filter((f) => f.status === 'scheduled').length,
    sent: queue.filter((f) => f.status === 'sent').length,
    failed: queue.filter((f) => f.status === 'failed').length,
    cancelled: queue.filter((f) => f.status === 'cancelled').length,
  };

  const statusPill = (s: string) => {
    switch (s) {
      case 'sent': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300';
      case 'failed': return 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300';
      case 'cancelled': return 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';
      default: return 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300';
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5 font-inter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#3C6CA8]/10 dark:bg-[#3C6CA8]/20 border border-[#3C6CA8]/25 text-[#3C6CA8] dark:text-[#94BBE9] flex items-center justify-center shrink-0">
            <CalendarClock className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#232323] dark:text-white tracking-tight">Customer Follow-Ups</h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Automated post-purchase re-engagement — scheduler runs every 5 minutes while admin is open
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleBackfill}
            disabled={isBackfilling || !settings.enabled}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-extrabold bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-40 transition-all cursor-pointer"
            title="Schedule follow-ups for qualifying orders that don't have one"
          >
            <RefreshCw className={`w-4 h-4 ${isBackfilling ? 'animate-spin' : ''}`} />
            Backfill Queue
          </button>
        </div>
      </div>

      {/* Settings */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-[#232323] dark:text-white uppercase tracking-wider">Automation Settings</h2>
          <button
            onClick={handleSaveSettings}
            disabled={isSavingSettings || settingsLoading}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#3C6CA8] hover:bg-[#315A8E] text-white rounded-xl text-xs font-black disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            {isSavingSettings ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
        {settingsLoading ? (
          <p className="text-xs text-slate-400">Loading settings…</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center justify-between md:block">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">Enabled</label>
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                className="w-5 h-5 rounded text-[#3C6CA8] cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">Days After Order</label>
              <input
                type="number"
                min={1}
                max={365}
                value={settings.interval_days}
                onChange={(e) => setSettings({ ...settings, interval_days: Math.max(1, Number(e.target.value) || 30) })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 font-bold"
              />
              <p className="text-[10px] text-slate-400 mt-1">Default 30 days (1 month)</p>
            </div>
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">Trigger Order Status</label>
              <select
                value={settings.trigger_status}
                onChange={(e) => setSettings({ ...settings, trigger_status: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 cursor-pointer"
              >
                {['confirmed', 'processing', 'shipped', 'delivered', 'completed'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">Template</label>
              <select
                value={settings.template_key}
                onChange={(e) => setSettings({ ...settings, template_key: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 cursor-pointer"
              >
                {['customer-follow-up', 'we-miss-you', 'thank-you-order', 'promo-welcome'].map((k) => (
                  <option key={k} value={k}>{k} — {getStoredTemplateByKey(k)?.name || k}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Queue */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
        <div className="p-4 space-y-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-sm font-black text-[#232323] dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4" /> Follow-Up Queue ({counts.scheduled} pending)
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search customer, email, order…"
                className="pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs w-full sm:w-72 outline-none focus:ring-2 focus:ring-[#3C6CA8]/30"
              />
            </div>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {(['all', 'scheduled', 'sent', 'failed', 'cancelled'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  statusTab === tab
                    ? 'bg-[#3C6CA8] text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {tab} ({counts[tab]})
              </button>
            ))}
          </div>
        </div>

        {queueLoading ? (
          <div className="p-10 text-center">
            <RefreshCw className="w-7 h-7 animate-spin text-[#3C6CA8] mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-500">Loading queue…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <Mail className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-500">No follow-ups in this view. New qualifying orders are picked up automatically by the scheduler.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
            {filtered.map((fu) => (
              <div key={fu.id} className="p-4 flex flex-col lg:flex-row lg:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-[#232323] dark:text-white truncate">{fu.customer_name}</span>
                    <span className="text-xs text-slate-500 truncate">{fu.customer_email}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${statusPill(fu.status)}`}>{fu.status}</span>
                    {isSuppressed(fu.customer_email) && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300" title="On suppression list">
                        Suppressed
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                    <span>Order: {fu.order_number || fu.order_id}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(fu.scheduled_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    <span>Template: {fu.template_key}</span>
                    {fu.error && <span className="text-rose-500">⚠ {fu.error}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {fu.status === 'scheduled' && (
                    <input
                      type="date"
                      defaultValue={new Date(fu.scheduled_at).toISOString().slice(0, 10)}
                      onChange={(e) => handleReschedule(fu, e.target.value)}
                      className="px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] bg-white dark:bg-slate-800 cursor-pointer"
                      title="Reschedule date"
                    />
                  )}
                  {fu.status !== 'sent' && fu.status !== 'cancelled' && (
                    <button
                      onClick={() => handleSendNow(fu)}
                      disabled={busyId === fu.id}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-[#3C6CA8]/10 text-[#3C6CA8] rounded-lg text-[11px] font-bold hover:bg-[#3C6CA8]/20 disabled:opacity-40 cursor-pointer"
                    >
                      <Send className="w-3 h-3" /> Send Now
                    </button>
                  )}
                  {fu.status !== 'cancelled' && fu.status !== 'sent' && (
                    <button
                      onClick={() => handleCancel(fu)}
                      disabled={busyId === fu.id}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 dark:bg-slate-800 text-rose-600 rounded-lg text-[11px] font-bold hover:bg-rose-100 disabled:opacity-40 cursor-pointer"
                    >
                      <Ban className="w-3 h-3" /> Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FollowUpsManager;
