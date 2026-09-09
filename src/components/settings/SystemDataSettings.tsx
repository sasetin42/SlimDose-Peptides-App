import React, { useState } from 'react';
import { SiteSettings } from '../../types';
import { Database, Key, Webhook, HardDrive, RefreshCw, Download, Upload, Trash2, Copy, Check, ShieldCheck, AlertCircle } from 'lucide-react';

interface Props {
  formData: Partial<SiteSettings>;
  onChange: (updates: Partial<SiteSettings>) => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
}

interface ApiKeyItem {
  id: string;
  name: string;
  key: string;
  scope: string;
  created_at: string;
}

export const SystemDataSettings: React.FC<Props> = ({ formData, onChange, onExportBackup, onImportBackup }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isFlushingCache, setIsFlushingCache] = useState(false);
  const [cacheFlushSuccess, setCacheFlushSuccess] = useState(false);

  // Local state for managed API keys (persisted in formData if desired or demo scoped keys)
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([
    {
      id: 'key_1',
      name: 'Mobile App Integration',
      key: 'sk_live_9a87f4c32b1e0d98',
      scope: 'read:inventory, write:orders',
      created_at: '2026-08-15'
    },
    {
      id: 'key_2',
      name: 'Doctor Portal Webhook Bridge',
      key: 'sk_live_4e71a93b58c2114d',
      scope: 'read:consultations',
      created_at: '2026-09-01'
    }
  ]);

  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScope, setNewKeyScope] = useState('read:all');

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleGenerateKey = () => {
    if (!newKeyName.trim()) return;
    const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(12)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    const newKey: ApiKeyItem = {
      id: `key_${Date.now()}`,
      name: newKeyName.trim(),
      key: `sk_live_${randomHex}`,
      scope: newKeyScope,
      created_at: new Date().toISOString().split('T')[0]
    };
    setApiKeys(prev => [newKey, ...prev]);
    setNewKeyName('');
  };

  const handleRevokeKey = (id: string) => {
    if (confirm('Are you sure you want to revoke this API key? Systems using it will immediately lose access.')) {
      setApiKeys(prev => prev.filter(k => k.id !== id));
    }
  };

  const handleFlushCdnCache = () => {
    setIsFlushingCache(true);
    setTimeout(() => {
      setIsFlushingCache(false);
      setCacheFlushSuccess(true);
      setTimeout(() => setCacheFlushSuccess(false), 3500);
    }, 1200);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
          <Database className="w-5 h-5 text-emerald-600" />
          API Keys, Backups & Infrastructure
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Manage programmatic API keys, real-time webhooks, CDN caching, and full database JSON snapshots.
        </p>
      </div>

      {/* Backup & Disaster Recovery */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <HardDrive className="w-4 h-4 text-emerald-600" />
            <h3 className="text-base font-semibold text-slate-900">Database & System Snapshot Backups</h3>
          </div>
          <span className="text-xs bg-emerald-50 text-emerald-700 font-medium px-2.5 py-1 rounded-full">
            Disaster Recovery
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
                <Download className="w-4 h-4 text-emerald-600" />
                Export Full System Configuration
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Generates a timestamped JSON file containing branding, payment configs, legal registrations, and email settings.
              </p>
            </div>
            <button
              type="button"
              onClick={onExportBackup}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <Download className="w-4 h-4" />
              Download JSON Backup Snapshot
            </button>
          </div>

          <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
                <Upload className="w-4 h-4 text-indigo-600" />
                Restore Configuration from File
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Upload a verified JSON snapshot to safely restore all system parameters and branding settings.
              </p>
            </div>
            <label className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer shadow-sm transition">
              <Upload className="w-4 h-4 text-slate-500" />
              Upload & Restore Snapshot
              <input
                type="file"
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onImportBackup(file);
                }}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* CDN & Cache Invalidation */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <RefreshCw className="w-4 h-4 text-emerald-600" />
            <h3 className="text-base font-semibold text-slate-900">Edge CDN & Static Asset Invalidation</h3>
          </div>
          <span className="text-xs text-slate-500">Cloudflare & Edge Cache</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
          <div>
            <p className="text-sm font-semibold text-slate-900">Purge Static Asset & Route Cache</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Forces all global edge nodes to refresh cached logos, CSS, JavaScript bundles, and static landing assets.
            </p>
          </div>
          <button
            type="button"
            disabled={isFlushingCache}
            onClick={handleFlushCdnCache}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition shrink-0 ${
              cacheFlushSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFlushingCache ? 'animate-spin' : ''}`} />
            {isFlushingCache ? 'Purging Edge Nodes...' : cacheFlushSuccess ? 'Cache Purged Cleanly!' : 'Purge All CDN Cache'}
          </button>
        </div>
      </div>

      {/* API Keys Management */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <Key className="w-4 h-4 text-emerald-600" />
            <h3 className="text-base font-semibold text-slate-900">Developer API Keys</h3>
          </div>
          <span className="text-xs bg-slate-100 text-slate-700 font-medium px-2.5 py-1 rounded-full">
            REST API
          </span>
        </div>

        {/* Generate Key Input */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-slate-50/80 border border-slate-200 rounded-xl">
          <div className="md:col-span-5">
            <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">Key Description / Client</label>
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="e.g., Courier Dispatch Bot"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>
          <div className="md:col-span-4">
            <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">Access Scope</label>
            <select
              value={newKeyScope}
              onChange={(e) => setNewKeyScope(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            >
              <option value="read:all">Read-Only (All Entities)</option>
              <option value="read:orders, write:orders">Orders Management</option>
              <option value="read:consultations">Consultations Read</option>
              <option value="full:admin">Full Administrative Access</option>
            </select>
          </div>
          <div className="md:col-span-3 flex items-end">
            <button
              type="button"
              onClick={handleGenerateKey}
              disabled={!newKeyName.trim()}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition"
            >
              + Generate Key
            </button>
          </div>
        </div>

        {/* Keys List */}
        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
          {apiKeys.map((item) => (
            <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">{item.name}</span>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                    {item.scope}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  <code className="text-xs text-slate-600 font-mono bg-slate-100 px-2 py-0.5 rounded">
                    {item.key.slice(0, 10)}••••••••••••••••{item.key.slice(-4)}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleCopy(item.key, item.id)}
                    className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1 font-medium"
                  >
                    {copiedKey === item.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy Key
                      </>
                    )}
                  </button>
                  <span className="text-[11px] text-slate-400">Created {item.created_at}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleRevokeKey(item.id)}
                className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 p-1.5 rounded-lg hover:bg-rose-50 self-end sm:self-center transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Revoke
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
