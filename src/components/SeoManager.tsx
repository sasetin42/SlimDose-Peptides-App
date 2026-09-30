import React, { useState, useEffect, useMemo } from 'react';
import {
  Globe, Save, Loader2, Search, CheckCircle2, AlertTriangle, RefreshCw,
  FileText, TrendingUp,
} from 'lucide-react';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { supabase } from '../lib/supabase';
import { logAdminAction } from '../lib/audit';
import { fireToast } from './ToastNotification';

interface PageSeoRow {
  page_id: string;
  content: {
    seo_title?: string;
    seo_description?: string;
    [key: string]: any;
  } | null;
}

const PAGES: Array<{ id: string; label: string }> = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About Us' },
  { id: 'contact', label: 'Contact' },
  { id: 'shipping_policy', label: 'Shipping Policy' },
  { id: 'privacy_policy', label: 'Privacy Policy' },
  { id: 'terms_conditions', label: 'Terms & Conditions' },
  { id: 'faq', label: 'FAQ Header' },
  { id: 'footer', label: 'Footer' },
];

const SeoManager: React.FC = () => {
  const { siteSettings, updateSiteSettings } = useSiteSettings();
  const [pages, setPages] = useState<PageSeoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingGlobal, setSavingGlobal] = useState(false);
  const [savingPage, setSavingPage] = useState<string | null>(null);
  const [expandedPage, setExpandedPage] = useState<string | null>(null);
  const [pageDraft, setPageDraft] = useState<{ seo_title: string; seo_description: string }>({ seo_title: '', seo_description: '' });
  const [searchTerm, setSearchTerm] = useState('');

  const [globalDraft, setGlobalDraft] = useState({ meta_title: '', meta_description: '', meta_keywords: '' });
  const [globalTouched, setGlobalTouched] = useState(false);

  useEffect(() => {
    if (siteSettings && !globalTouched) {
      setGlobalDraft({
        meta_title: siteSettings.meta_title || '',
        meta_description: siteSettings.meta_description || '',
        meta_keywords: siteSettings.meta_keywords || '',
      });
    }
  }, [siteSettings, globalTouched]);

  const loadPages = async () => {
    setLoading(true);
    try {
      const { data } = (await supabase
        .from('page_contents')
        .select('page_id, content')
        .in('page_id', PAGES.map((p) => p.id))) as any;
      setPages((data || []) as PageSeoRow[]);
    } catch (e) {
      console.warn('SeoManager: failed to load page contents', e);
      setPages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPages(); }, []);

  const seoByPage = useMemo(() => {
    const map: Record<string, { seo_title: string; seo_description: string }> = {};
    for (const p of pages) {
      map[p.page_id] = {
        seo_title: p.content?.seo_title || '',
        seo_description: p.content?.seo_description || '',
      };
    }
    return map;
  }, [pages]);

  const handleSaveGlobal = async () => {
    setSavingGlobal(true);
    try {
      await updateSiteSettings({
        meta_title: globalDraft.meta_title.trim(),
        meta_description: globalDraft.meta_description.trim(),
        meta_keywords: globalDraft.meta_keywords.trim(),
      });
      logAdminAction('update_seo_global', { module: 'seo', details: `Meta title: ${globalDraft.meta_title}` });
      fireToast('Global SEO defaults saved.', 'success');
      setGlobalTouched(false);
    } catch (err: any) {
      fireToast(err?.message || 'Failed to save global SEO', 'error');
    } finally {
      setSavingGlobal(false);
    }
  };

  const openPageEditor = (pageId: string) => {
    if (expandedPage === pageId) {
      setExpandedPage(null);
      return;
    }
    setExpandedPage(pageId);
    setPageDraft({
      seo_title: seoByPage[pageId]?.seo_title || '',
      seo_description: seoByPage[pageId]?.seo_description || '',
    });
  };

  const handleSavePage = async (pageId: string) => {
    setSavingPage(pageId);
    try {
      const existing = pages.find((p) => p.page_id === pageId);
      const mergedContent = { ...(existing?.content || {}), ...pageDraft };
      const { error } = (await supabase.from('page_contents').upsert({
        page_id: pageId,
        content: mergedContent,
        updated_at: new Date().toISOString(),
      })) as any;
      if (error) throw error;
      logAdminAction('update_seo_page', { module: 'seo', record_id: pageId, details: pageDraft.seo_title || pageId });
      fireToast(`SEO saved for ${PAGES.find((p) => p.id === pageId)?.label || pageId}.`, 'success');
      setExpandedPage(null);
      await loadPages();
    } catch (err: any) {
      fireToast(err?.message || 'Failed to save page SEO', 'error');
    } finally {
      setSavingPage(null);
    }
  };

  const coverage = useMemo(() => {
    const filled = PAGES.filter((p) => (seoByPage[p.id]?.seo_title || '').length > 0).length;
    return { filled, total: PAGES.length, pct: Math.round((filled / PAGES.length) * 100) };
  }, [seoByPage]);

  const filteredPages = PAGES.filter((p) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      p.label.toLowerCase().includes(q) ||
      (seoByPage[p.id]?.seo_title || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5 font-inter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#3C6CA8]/10 dark:bg-[#3C6CA8]/20 border border-[#3C6CA8]/25 text-[#3C6CA8] dark:text-[#94BBE9] flex items-center justify-center shrink-0">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#232323] dark:text-white tracking-tight">SEO &amp; Meta Manager</h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Global search-engine defaults plus per-page meta titles and descriptions
            </p>
          </div>
        </div>
        <button
          onClick={loadPages}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-all cursor-pointer"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Coverage */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Page SEO Coverage</span>
            <span className="text-xs font-black text-[#3C6CA8]">{coverage.filled}/{coverage.total} pages ({coverage.pct}%)</span>
          </div>
          <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-[#3C6CA8] rounded-full transition-all" style={{ width: `${coverage.pct}%` }} />
          </div>
        </div>
        <TrendingUp className="w-8 h-8 text-slate-200 dark:text-slate-700" />
      </div>

      {/* Global defaults */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-[#232323] dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#3C6CA8]" /> Global Site Meta (fallback for every page)
          </h2>
          <button
            onClick={handleSaveGlobal}
            disabled={savingGlobal}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#3C6CA8] hover:bg-[#315A8E] text-white rounded-xl text-xs font-black disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" /> {savingGlobal ? 'Saving…' : 'Save Global Meta'}
          </button>
        </div>
        <div>
          <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
            Meta Title <span className="normal-case font-bold text-slate-400">({globalDraft.meta_title.length}/70)</span>
          </label>
          <input
            type="text"
            maxLength={70}
            value={globalDraft.meta_title}
            onChange={(e) => { setGlobalDraft({ ...globalDraft, meta_title: e.target.value }); setGlobalTouched(true); }}
            className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl font-bold bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-[#3C6CA8]/30"
          />
        </div>
        <div>
          <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
            Meta Description <span className="normal-case font-bold text-slate-400">({globalDraft.meta_description.length}/180)</span>
          </label>
          <textarea
            rows={2}
            maxLength={180}
            value={globalDraft.meta_description}
            onChange={(e) => { setGlobalDraft({ ...globalDraft, meta_description: e.target.value }); setGlobalTouched(true); }}
            className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-[#3C6CA8]/30 resize-none"
          />
        </div>
        <div>
          <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">Meta Keywords (comma-separated)</label>
          <input
            type="text"
            value={globalDraft.meta_keywords}
            onChange={(e) => { setGlobalDraft({ ...globalDraft, meta_keywords: e.target.value }); setGlobalTouched(true); }}
            className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-[#3C6CA8]/30"
          />
        </div>
      </div>

      {/* Per-page SEO */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-sm font-black text-[#232323] dark:text-white uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#3C6CA8]" /> Per-Page SEO
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search pages…"
              className="pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs w-full sm:w-64 outline-none focus:ring-2 focus:ring-[#3C6CA8]/30"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center">
            <Loader2 className="w-7 h-7 animate-spin text-[#3C6CA8] mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-500">Loading page SEO…</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
            {filteredPages.map((p) => {
              const seo = seoByPage[p.id] || { seo_title: '', seo_description: '' };
              const filled = seo.seo_title.length > 0;
              const expanded = expandedPage === p.id;
              return (
                <div key={p.id}>
                  <button
                    onClick={() => openPageEditor(p.id)}
                    className="w-full px-5 py-3 flex items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors text-left cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-[#232323] dark:text-white">{p.label}</span>
                        {filled ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9.5px] font-extrabold uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Set
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9.5px] font-extrabold uppercase bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                            <AlertTriangle className="w-2.5 h-2.5" /> Missing
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{seo.seo_title || 'No meta title configured — global fallback applies'}</p>
                    </div>
                    <span className={`text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}>▾</span>
                  </button>
                  {expanded && (
                    <div className="px-5 pb-4 pt-1 space-y-3 bg-slate-50/60 dark:bg-slate-800/40">
                      <div>
                        <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                          Meta Title ({pageDraft.seo_title.length}/70)
                        </label>
                        <input
                          type="text"
                          maxLength={70}
                          value={pageDraft.seo_title}
                          onChange={(e) => setPageDraft({ ...pageDraft, seo_title: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-[#3C6CA8]/30"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                          Meta Description ({pageDraft.seo_description.length}/180)
                        </label>
                        <textarea
                          rows={2}
                          maxLength={180}
                          value={pageDraft.seo_description}
                          onChange={(e) => setPageDraft({ ...pageDraft, seo_description: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-[#3C6CA8]/30 resize-none"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSavePage(p.id)}
                          disabled={savingPage === p.id}
                          className="flex items-center gap-1.5 px-4 py-2 bg-[#3C6CA8] hover:bg-[#315A8E] text-white rounded-lg text-xs font-black disabled:opacity-50 cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" /> {savingPage === p.id ? 'Saving…' : 'Save Page SEO'}
                        </button>
                        <button
                          onClick={() => setExpandedPage(null)}
                          className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs font-bold cursor-pointer"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SeoManager;
