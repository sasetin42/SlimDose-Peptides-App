import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  History, CheckCircle2, AlertTriangle, XCircle, Search, Download, Filter,
  RefreshCw, ChevronDown, ChevronRight, Database
} from 'lucide-react';
import { fetchAuditLogs, type AuditLogEntry } from '../../lib/audit';

const formatTimestamp = (iso?: string) => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString([], {
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch {
    return iso;
  }
};

const roleLabel = (role?: string) => {
  if (!role) return '—';
  return role.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
};

const MODULE_OPTIONS = [
  { value: 'all', label: 'All Modules' },
  { value: 'auth', label: 'Auth & Access' },
  { value: 'products', label: 'Products' },
  { value: 'orders', label: 'Orders' },
  { value: 'customers', label: 'Customers' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'settings', label: 'Settings' },
  { value: 'admin', label: 'Admin Console' },
];

const moduleBadgeClass = (module?: string) => {
  switch (module) {
    case 'auth': return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300';
    case 'orders': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';
    case 'products': return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300';
    case 'marketing': return 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-300';
    case 'settings': return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300';
    default: return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
  }
};

const actionIcon = (action: string) => {
  const a = (action || '').toLowerCase();
  if (a.includes('delete') || a.includes('remove')) return <XCircle className="w-4 h-4 text-rose-600 shrink-0" />;
  if (a.includes('fail') || a.includes('denied')) return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
  return <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />;
};

export const AuditLogsSettings: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const entries = await fetchAuditLogs(300);
      setLogs(entries);
      setLoadError(null);
    } catch (e: any) {
      setLoadError(e?.message || 'Failed to load audit logs.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-refresh every 60s while the tab is visible
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, 60_000);
    return () => clearInterval(id);
  }, [load]);

  const filteredLogs = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    return logs.filter((log) => {
      const matchesModule = moduleFilter === 'all' || (log.module || 'admin') === moduleFilter;
      if (!matchesModule) return false;
      if (!q) return true;
      const haystack = [
        log.action,
        log.user_email,
        log.user_role,
        log.module,
        log.details,
        log.ip,
        log.record_id === undefined ? '' : String(log.record_id),
        typeof log.before === 'object' ? JSON.stringify(log.before) : String(log.before ?? ''),
        typeof log.after === 'object' ? JSON.stringify(log.after) : String(log.after ?? ''),
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [logs, searchFilter, moduleFilter]);

  const handleExportLogs = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `slimdose_audit viewer_${Date.now()}.json`.replace(' ', '_'));
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <History className="w-5 h-5 text-emerald-600" />
            Audit Trail &amp; Security Event Logs
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Immutable chronological log of every administrative action, recorded to Firestore
            (<code className="text-[11px] bg-slate-100 px-1.5 py-0.5 rounded font-mono">admin_audit_logs</code>).
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-center">
          <button
            type="button"
            onClick={load}
            disabled={refreshing}
            className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 shadow-sm transition disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={handleExportLogs}
            disabled={filteredLogs.length === 0}
            className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export JSON
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search by action, administrator, IP, record ID..."
            className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
          >
            {MODULE_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Log List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden divide-y divide-slate-100">
        {loading ? (
          <div className="p-10 text-center text-slate-400 text-sm flex flex-col items-center gap-3">
            <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
            Loading audit trail from Firestore…
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm space-y-2">
            <Database className="w-8 h-8 mx-auto text-slate-300" />
            <p>{loadError || 'No audit events recorded yet.'}</p>
            <p className="text-xs text-slate-400">
              Admin actions (logins, product/order/customer changes, settings updates) are logged here automatically.
            </p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const hasDetails = !!(log.details || log.before || log.after);
            const expanded = expandedId === log.id;
            return (
              <div key={log.id} className="px-4 py-3 hover:bg-slate-50/60 transition">
                <div
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${hasDetails ? 'cursor-pointer' : ''}`}
                  onClick={() => hasDetails && setExpandedId(expanded ? null : log.id!)}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {actionIcon(log.action)}
                      <span className="text-xs font-bold text-slate-900 font-mono">{log.action}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono uppercase ${moduleBadgeClass(log.module)}`}>
                        {log.module || 'admin'}
                      </span>
                      {log.ip && <span className="text-[11px] text-slate-400 font-mono">{log.ip}</span>}
                      {hasDetails && (
                        expanded
                          ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                          : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </div>

                    {log.details && !expanded && (
                      <p className="text-xs text-slate-600 truncate max-w-3xl">{log.details}</p>
                    )}

                    <div className="text-[11px] text-slate-400 flex items-center gap-3 flex-wrap">
                      <span>
                        Actor: <strong className="text-slate-700">{log.user_email}</strong>
                        {log.user_role && log.user_role !== 'system' ? ` (${roleLabel(log.user_role)})` : ''}
                      </span>
                      <span>•</span>
                      <span>{formatTimestamp(log.created_at)}</span>
                      {log.record_id !== undefined && log.record_id !== null && (
                        <>
                          <span>•</span>
                          <span className="font-mono">{String(log.record_id).slice(0, 24)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {expanded && hasDetails && (
                  <div className="mt-3 ml-6 p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-2 overflow-x-auto">
                    {log.details && (
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Details</span>
                        <p className="text-xs text-slate-700 whitespace-pre-wrap break-words">{log.details}</p>
                      </div>
                    )}
                    {log.before !== undefined && log.before !== null && (
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Before</span>
                        <pre className="text-[11px] text-slate-600 font-mono whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                          {JSON.stringify(log.before, null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.after !== undefined && log.after !== null && (
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">After</span>
                        <pre className="text-[11px] text-slate-600 font-mono whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                          {JSON.stringify(log.after, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
        Audit entries are append-only and cannot be edited or deleted from the console.
      </p>
    </div>
  );
};
