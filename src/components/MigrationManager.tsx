import React, { useState, useEffect, useRef } from 'react';
import {
  FileSpreadsheet, Database, RefreshCw, CheckCircle2, XCircle, AlertTriangle,
  Download, Play, History, Loader2, Users, Package, FolderOpen, ShoppingCart,
} from 'lucide-react';
import {
  parseUpload, loadExistingKeys, importCustomers, importProducts, importCategories, importOrders,
  type ParsedFile, type ConflictStrategy, type RecordResult,
} from '../utils/migration';
import { db } from '../lib/firebase';
import { collection, getDocs, query, orderBy as fbOrderBy, limit as fbLimit } from 'firebase/firestore';
import { logAdminAction } from '../lib/audit';
import { fireToast } from './ToastNotification';

type ImportType = 'customers' | 'products' | 'orders' | 'categories';

interface MigrationJob {
  id?: string;
  import_type: ImportType;
  file_name: string;
  total_rows: number;
  imported: number;
  updated: number;
  duplicates: number;
  failed: number;
  strategy: ConflictStrategy;
  created_at: string;
}

const TYPE_META: Record<ImportType, { label: string; icon: React.FC<any>; hint: string }> = {
  customers: { label: 'Customers', icon: Users, hint: 'name, email, phone, address columns (auto-detected)' },
  products: { label: 'Products', icon: Package, hint: 'name, sku, price, stock columns (auto-detected)' },
  orders: { label: 'Orders', icon: ShoppingCart, hint: 'order number, customer, items, totals (SDP refs assigned automatically)' },
  categories: { label: 'Categories', icon: FolderOpen, hint: 'name, slug, icon columns' },
};

const MigrationManager: React.FC = () => {
  const [importType, setImportType] = useState<ImportType>('customers');
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [fileName, setFileName] = useState('');
  const [strategy, setStrategy] = useState<ConflictStrategy>('skip');
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<RecordResult[]>([]);
  const [jobLog, setJobLog] = useState<string[]>([]);
  const [jobs, setJobs] = useState<MigrationJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadJobs = async () => {
    setJobsLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'migration_jobs'), fbOrderBy('created_at', 'desc'), fbLimit(15)));
      setJobs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as MigrationJob[]);
    } catch (e) {
      console.warn('Failed to load migration jobs:', e);
      setJobs([]);
    } finally {
      setJobsLoading(false);
    }
  };

  useEffect(() => { loadJobs(); }, []);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    try {
      const res = await parseUpload(file);
      if (res.rows.length === 0) {
        fireToast('No rows found in that file.', 'warning');
        return;
      }
      setParsed(res);
      setFileName(file.name);
      setResults([]);
      setJobLog([]);
      fireToast(`Parsed ${res.rows.length} rows (${res.format.toUpperCase()}).`, 'success');
    } catch (err: any) {
      fireToast(err?.message || 'Failed to parse file', 'error');
    }
  };

  const handleImport = async () => {
    if (!parsed || parsed.rows.length === 0) {
      fireToast('Upload a CSV or JSON file first.', 'warning');
      return;
    }
    if (!window.confirm(
      `Import ${parsed.rows.length} ${TYPE_META[importType].label.toLowerCase()} with strategy "${strategy.toUpperCase()}"?\n\n` +
      `Skip = ignore duplicates · Update = overwrite existing matches · Insert = force new records.`
    )) return;

    setIsRunning(true);
    setResults([]);
    const logs: string[] = [];
    try {
      const sets = await loadExistingKeys();
      logs.push(`Loaded existing keys — ${sets.customerEmails.size} customer emails, ${sets.productSkus.size} product SKUs, ${sets.orderNumbers.size} order numbers.`);
      setJobLog([...logs]);

      const writeDoc = async (colName: string, docId: string | null, data: any): Promise<string | null> => {
        try {
          if (docId) {
            const { doc, setDoc } = await import('firebase/firestore');
            await setDoc(doc(db, colName, docId), data, { merge: true });
            return docId;
          }
          const { addDoc, collection: fsCollection } = await import('firebase/firestore');
          const ref = await addDoc(fsCollection(db, colName), data);
          return ref.id;
        } catch (e) {
          console.warn('[migration] writeDoc failed:', e);
          return null;
        }
      };

      const importFn =
        importType === 'customers' ? importCustomers :
        importType === 'products' ? importProducts :
        importType === 'orders' ? importOrders :
        importCategories;

      const res = await importFn(parsed.rows, {
        sets,
        strategy,
        writeDoc,
        log: (msg: string) => {
          logs.push(msg);
          setJobLog([...logs]);
        },
      });
      setResults(res);

      const summary = {
        imported: res.filter((r) => r.action === 'imported').length,
        updated: res.filter((r) => r.action === 'updated').length,
        duplicates: res.filter((r) => r.action === 'duplicate').length,
        failed: res.filter((r) => r.action === 'failed').length,
      };

      // Persist the job record
      try {
        const { addDoc: fsAdd, collection: fsCollection } = await import('firebase/firestore');
        await fsAdd(fsCollection(db, 'migration_jobs'), {
          import_type: importType,
          file_name: fileName,
          total_rows: parsed.rows.length,
          ...summary,
          strategy,
          created_at: new Date().toISOString(),
        });
      } catch {}

      logAdminAction('migration_import', {
        module: 'migration',
        details: `${TYPE_META[importType].label} ← ${fileName}: ${summary.imported} imported, ${summary.updated} updated, ${summary.duplicates} duplicates, ${summary.failed} failed`,
      });
      fireToast(
        `Import complete — ${summary.imported} imported, ${summary.updated} updated, ${summary.duplicates} duplicates, ${summary.failed} failed.`,
        summary.failed > 0 ? 'warning' : 'success'
      );
      await loadJobs();
    } catch (err: any) {
      fireToast(err?.message || 'Import failed', 'error');
    } finally {
      setIsRunning(false);
    }
  };

  const exportFailed = () => {
    const failed = results.filter((r) => r.action === 'failed');
    if (failed.length === 0) return;
    const csv = ['row,action,reason', ...failed.map((r) => `${r.row},"${r.action}","${(r.reason || '').replace(/"/g, '""')}"`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `migration_failures_${importType}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const summary = results.length > 0 ? {
    imported: results.filter((r) => r.action === 'imported').length,
    updated: results.filter((r) => r.action === 'updated').length,
    duplicates: results.filter((r) => r.action === 'duplicate').length,
    failed: results.filter((r) => r.action === 'failed').length,
  } : null;

  const Meta = TYPE_META[importType];

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5 font-inter">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-[#3C6CA8]/10 dark:bg-[#3C6CA8]/20 border border-[#3C6CA8]/25 text-[#3C6CA8] dark:text-[#94BBE9] flex items-center justify-center shrink-0">
          <Database className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#232323] dark:text-white tracking-tight">Data Migration</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Import customers, products, orders, and categories from old-website CSV/JSON exports — with duplicate detection
          </p>
        </div>
      </div>

      {/* Type selector */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {(Object.keys(TYPE_META) as ImportType[]).map((t) => {
          const m = TYPE_META[t];
          return (
            <button
              key={t}
              onClick={() => { setImportType(t); setParsed(null); setResults([]); setJobLog([]); }}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                importType === t
                  ? 'border-[#3C6CA8] bg-[#3C6CA8]/5 dark:bg-[#3C6CA8]/10 shadow-sm'
                  : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
              }`}
            >
              <m.icon className={`w-5 h-5 mb-1.5 ${importType === t ? 'text-[#3C6CA8]' : 'text-slate-400'}`} />
              <p className={`text-xs font-black ${importType === t ? 'text-[#3C6CA8]' : 'text-[#232323] dark:text-white'}`}>{m.label}</p>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{m.hint}</p>
            </button>
          );
        })}
      </div>

      {/* Upload & run */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 space-y-4">
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0] || null); }}
          className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-center cursor-pointer hover:border-[#3C6CA8]/50 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-all"
        >
          <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          {parsed ? (
            <>
              <p className="text-xs font-black text-[#232323] dark:text-white">{fileName}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {parsed.rows.length} rows · {parsed.format.toUpperCase()} · {parsed.columns.length} columns
              </p>
            </>
          ) : (
            <>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Click to upload or drag a CSV / JSON file</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Column names are auto-mapped; extras are ignored</p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json,.txt"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] || null)}
          />
        </div>

        {/* Column preview */}
        {parsed && parsed.columns.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {parsed.columns.slice(0, 20).map((c) => (
              <span key={c} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">
                {c}
              </span>
            ))}
            {parsed.columns.length > 20 && <span className="text-[10px] text-slate-400">+{parsed.columns.length - 20} more</span>}
          </div>
        )}

        {/* Strategy + run */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1">
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">Duplicate Strategy</label>
            <div className="flex items-center gap-2">
              {([
                { key: 'skip', label: 'Skip Duplicates', desc: 'Ignore rows that already exist' },
                { key: 'update', label: 'Update Existing', desc: 'Overwrite matching records' },
                { key: 'insert', label: 'Force Insert', desc: 'Import everything as new' },
              ] as const).map((s) => (
                <button
                  key={s.key}
                  onClick={() => setStrategy(s.key)}
                  title={s.desc}
                  className={`flex-1 px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                    strategy === s.key
                      ? 'bg-[#3C6CA8] text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleImport}
            disabled={!parsed || isRunning}
            className="flex items-center justify-center gap-2 bg-[#3C6CA8] hover:bg-[#315A8E] text-white px-6 py-2.5 rounded-xl text-xs font-black shadow-md shadow-[#3C6CA8]/20 disabled:opacity-40 cursor-pointer transition-all"
          >
            {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {isRunning ? 'Importing…' : `Import ${Meta.label}`}
          </button>
        </div>

        {/* Progress log */}
        {jobLog.length > 0 && (
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 max-h-32 overflow-y-auto">
            {jobLog.map((line, i) => (
              <p key={i} className="text-[10.5px] font-mono text-slate-500 dark:text-slate-400">› {line}</p>
            ))}
          </div>
        )}

        {/* Results */}
        {summary && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Imported', value: summary.imported, color: 'text-emerald-600', icon: CheckCircle2 },
                { label: 'Updated', value: summary.updated, color: 'text-blue-600', icon: RefreshCw },
                { label: 'Duplicates', value: summary.duplicates, color: 'text-amber-600', icon: AlertTriangle },
                { label: 'Failed', value: summary.failed, color: 'text-rose-600', icon: XCircle },
              ].map((s) => (
                <div key={s.label} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/70 dark:border-slate-700 flex items-center gap-2.5">
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                  <div>
                    <p className={`text-lg font-black leading-none ${s.color}`}>{s.value}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {results.length > 0 && (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/70">
                {results.slice(0, 150).map((r, i) => (
                  <div key={i} className="px-3 py-1.5 flex items-center justify-between text-[11px]">
                    <span className="font-mono text-slate-400">Row {r.row}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-slate-600 dark:text-slate-300 font-bold">{r.ref || '—'}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        r.action === 'imported' ? 'bg-emerald-100 text-emerald-700' :
                        r.action === 'updated' ? 'bg-blue-100 text-blue-700' :
                        r.action === 'duplicate' ? 'bg-amber-100 text-amber-700' :
                        'bg-rose-100 text-rose-700'
                      }`}>{r.action}</span>
                    </span>
                  </div>
                ))}
                {results.length > 150 && (
                  <div className="px-3 py-2 text-center text-[10px] text-slate-400">+ {results.length - 150} more rows…</div>
                )}
              </div>
            )}

            {summary.failed > 0 && (
              <button
                onClick={exportFailed}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold hover:bg-slate-200 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Export Failure Report (CSV)
              </button>
            )}
          </div>
        )}
      </div>

      {/* Job history */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-black text-[#232323] dark:text-white uppercase tracking-wider flex items-center gap-2">
            <History className="w-4 h-4" /> Recent Migration Jobs
          </h2>
          <button onClick={loadJobs} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer" title="Refresh">
            <RefreshCw className={`w-4 h-4 ${jobsLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {jobs.length === 0 ? (
          <p className="p-6 text-center text-xs text-slate-400">No imports recorded yet.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
            {jobs.map((j) => (
              <div key={j.id} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-black text-[#232323] dark:text-white capitalize">
                    {j.import_type} <span className="text-slate-400 font-bold">— {j.file_name}</span>
                  </p>
                  <p className="text-[10.5px] text-slate-400 mt-0.5">
                    {new Date(j.created_at).toLocaleString('en-PH')} · strategy: {j.strategy}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-bold">
                  <span className="text-emerald-600">{j.imported}✓</span>
                  <span className="text-blue-600">{j.updated}↻</span>
                  <span className="text-amber-600">{j.duplicates}⚠</span>
                  <span className="text-rose-600">{j.failed}✕</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MigrationManager;
