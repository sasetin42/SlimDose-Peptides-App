import React, { useState } from 'react';
import { History, ShieldAlert, CheckCircle2, AlertTriangle, XCircle, Search, Download, Trash2, Filter } from 'lucide-react';

interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  action: string;
  category: 'security' | 'settings' | 'smtp' | 'auth' | 'backup';
  status: 'success' | 'warning' | 'error';
  ip: string;
  details: string;
}

const DEFAULT_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'log-1',
    timestamp: '2026-09-08 13:10:22',
    user: 'admin@slimdose.ph',
    role: 'Super Admin',
    action: 'SMTP Relay Handshake Test',
    category: 'smtp',
    status: 'success',
    ip: '112.198.88.10',
    details: 'Verified TLS handshake with smtp.hostinger.com:465. Code: 250 OK'
  },
  {
    id: 'log-2',
    timestamp: '2026-09-08 12:45:10',
    user: 'admin@slimdose.ph',
    role: 'Super Admin',
    action: 'Updated Payment Links & Tax Settings',
    category: 'settings',
    status: 'success',
    ip: '112.198.88.10',
    details: 'Changed tax_rate_percent to 12% and verified GCash/Maya merchant credentials'
  },
  {
    id: 'log-3',
    timestamp: '2026-09-08 11:20:05',
    user: 'system',
    role: 'System Daemon',
    action: 'Nightly Database JSON Snapshot',
    category: 'backup',
    status: 'success',
    ip: '127.0.0.1',
    details: 'Automated snapshot generated: site_settings_snapshot_20260908.json (24KB)'
  },
  {
    id: 'log-4',
    timestamp: '2026-09-08 10:02:14',
    user: 'unknown@180.245.19.4',
    role: 'Guest',
    action: 'Failed Admin Login Attempt',
    category: 'security',
    status: 'warning',
    ip: '180.245.19.4',
    details: 'Invalid password on admin portal. Brute-force counter: 1/5'
  },
  {
    id: 'log-5',
    timestamp: '2026-09-07 18:30:40',
    user: 'admin@slimdose.ph',
    role: 'Super Admin',
    action: 'Brand Assets Updated',
    category: 'settings',
    status: 'success',
    ip: '112.198.88.10',
    details: 'High-res transparent dark/light logo variants re-indexed'
  }
];

export const AuditLogsSettings: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>(DEFAULT_AUDIT_LOGS);
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchFilter.toLowerCase()) ||
      log.user.toLowerCase().includes(searchFilter.toLowerCase()) ||
      log.details.toLowerCase().includes(searchFilter.toLowerCase()) ||
      log.ip.includes(searchFilter);
    const matchesCategory = categoryFilter === 'all' || log.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleExportLogs = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `slimdose_audit_trail_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleClearLogs = () => {
    if (confirm('Clear audit logs history? This cannot be undone.')) {
      setLogs([]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <History className="w-5 h-5 text-emerald-600" />
            Audit Trail & Security Event Logs
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Tamper-evident chronological activity log recording all administrative modifications and security incidents.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-center">
          <button
            type="button"
            onClick={handleExportLogs}
            className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 shadow-sm transition"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export Log JSON
          </button>
          <button
            type="button"
            onClick={handleClearLogs}
            className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
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
            placeholder="Search events by keyword, administrator email, IP address..."
            className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
          >
            <option value="all">All Event Categories</option>
            <option value="settings">System Settings</option>
            <option value="security">Security & Access</option>
            <option value="smtp">Email & SMTP</option>
            <option value="backup">Backups & Snapshots</option>
          </select>
        </div>
      </div>

      {/* Log List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden divide-y divide-slate-100">
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No audit logs found matching your filter criteria.
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="p-4 hover:bg-slate-50/60 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  {log.status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                  {log.status === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />}
                  {log.status === 'error' && <XCircle className="w-4 h-4 text-rose-600 shrink-0" />}

                  <span className="text-xs font-bold text-slate-900">{log.action}</span>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono uppercase">
                    {log.category}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">{log.ip}</span>
                </div>

                <p className="text-xs text-slate-600">{log.details}</p>

                <div className="text-[11px] text-slate-400 flex items-center gap-3">
                  <span>Actor: <strong className="text-slate-700">{log.user}</strong> ({log.role})</span>
                  <span>•</span>
                  <span>{log.timestamp}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
