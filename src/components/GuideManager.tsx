import { useEffect, useState, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import {
  mirrorGuideCreate,
  mirrorGuideDelete,
  mirrorGuideSetEnabled,
  mirrorGuideUpdate,
} from '../lib/convexMirror';
import {
    Plus,
    Edit2,
    Trash2,
    X,
    FileText,
    Eye,
    EyeOff,
    GripVertical,
    ArrowLeft,
    Package,
    Check,
    Bold,
    Italic,
    Underline,
    Search,
    Calendar,
    Hash,
    BookOpen,
    ExternalLink,
    RefreshCw,
    SlidersHorizontal,
    Sparkles,
    Clock,
    User,
    CheckCircle2,
    FileEdit,
    Layers,
    ArrowUpDown,
    ImageIcon,
    Upload,
    Loader2,
    Strikethrough,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    List,
    ListOrdered,
    Quote,
    Table,
    Link as LinkIcon,
    AlertTriangle,
    Info,
    ShieldCheck,
    Maximize2,
    Minimize2,
    Undo,
    Redo,
    Heading1,
    Heading2,
    Heading3,
    Type,
    Minus,
    Tag,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import ImageUpload from './ImageUpload';
import { useImageUpload } from '../hooks/useImageUpload';
import { fireToast } from './ToastNotification';
import { liveScrapedGuideTopics } from '../data/liveScrapedGuideTopics';

export interface Article {
    id: string;
    title: string;
    preview: string | null;
    content: string;
    cover_image: string | null;
    author: string;
    published_date: string;
    display_order: number;
    is_enabled: boolean;
    created_at: string;
    updated_at: string;
    related_product_ids: string[] | null;
}

export interface SimpleProduct {
    id: string;
    name: string;
    base_price: number;
    image_url: string | null;
}

interface ModalData {
    id?: string;
    title: string;
    preview: string;
    content: string;
    cover_image: string | null;
    author: string;
    published_date: string;
    display_order: number;
    is_enabled: boolean;
    related_product_ids: string[];
}

type FilterStatus = 'all' | 'published' | 'draft';
type SortOption = 'order-asc' | 'recent' | 'oldest' | 'title-asc';

export default function GuideManager() {
    const [articles, setArticles] = useState<Article[]>([]);
    const [products, setProducts] = useState<SimpleProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
    const [sortBy, setSortBy] = useState<SortOption>('order-asc');
    const [productSearch, setProductSearch] = useState('');

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingArticle, setEditingArticle] = useState<string | null>(null);
    const [isFullscreenEditor, setIsFullscreenEditor] = useState(false);
    const [isMetaDrawerOpen, setIsMetaDrawerOpen] = useState(true);
    const [modalData, setModalData] = useState<ModalData>({
        title: '',
        preview: '',
        content: '',
        cover_image: null,
        author: 'SlimDose Medical Team',
        published_date: new Date().toISOString().split('T')[0],
        display_order: 0,
        is_enabled: true,
        related_product_ids: []
    });

    const contentEditorRef = useRef<HTMLDivElement>(null);
    const teaserEditorRef = useRef<HTMLDivElement>(null);
    const articleImageInputRef = useRef<HTMLInputElement>(null);
    const { uploadImage: uploadArticleImage, uploading: isUploadingArticleImage } = useImageUpload('article-body-images');

    const handleArticleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const uploadedUrl = await uploadArticleImage(file);
            if (uploadedUrl) {
                // Focus editor and insert image
                if (contentEditorRef.current) {
                    contentEditorRef.current.focus();
                }
                const imageHtml = `<p><img src="${uploadedUrl}" alt="Article Illustration" style="max-width: 100%; height: auto; border-radius: 12px; margin: 16px auto; display: block; box-shadow: 0 4px 14px rgba(0,0,0,0.08);" /></p><p><br></p>`;
                document.execCommand('insertHTML', false, imageHtml);
                handleContentChange();
                fireToast('Image inserted into article! 📸', 'success');
            }
        } catch (err: any) {
            console.error('Failed to upload and insert article image:', err);
            fireToast(`Failed to upload image: ${err.message || 'Unknown error'}`, 'error');
        } finally {
            if (articleImageInputRef.current) {
                articleImageInputRef.current.value = '';
            }
        }
    };

    useEffect(() => {
        fetchArticles();
        fetchProducts();

        // Realtime sync on guide_topics table
        const channel = supabase
            .channel('guide_topics_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'guide_topics' }, () => {
                fetchArticles(false);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchProducts = async () => {
        try {
            const { data, error } = await supabase
                .from('products')
                .select('id, name, base_price, image_url')
                .order('name');
            if (error) throw error;
            setProducts(data || []);
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    const fetchArticles = async (showLoading = true) => {
        try {
            if (showLoading) setLoading(true);
            const { data, error } = await supabase
                .from('guide_topics')
                .select('*')
                .order('display_order', { ascending: true });

            if (data && data.length > 0) {
                setArticles(data);
            } else {
                setArticles(liveScrapedGuideTopics || []);
            }
        } catch (error) {
            console.warn('Notice loading articles from remote, using live scraped fallback:', error);
            setArticles(liveScrapedGuideTopics || []);
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchArticles(false);
        fireToast('Articles synchronized live', 'success');
        setTimeout(() => setIsRefreshing(false), 500);
    };

    // Calculate Reading Time
    const getReadingTime = (content: string) => {
        const text = (content || '').replace(/<[^>]*>/g, '');
        const words = text.trim().split(/\s+/).filter(Boolean).length;
        const minutes = Math.ceil(words / 180);
        return minutes > 0 ? `${minutes} min read` : '1 min read';
    };
    const calculateReadTime = getReadingTime;

    const handleContentChange = () => {
        if (contentEditorRef.current) {
            setModalData(prev => ({
                ...prev,
                content: contentEditorRef.current?.innerHTML || ''
            }));
        }
    };

    const handleTeaserChange = () => {
        if (teaserEditorRef.current) {
            setModalData(prev => ({
                ...prev,
                preview: teaserEditorRef.current?.innerHTML || ''
            }));
        }
    };

    const applyFormat = (command: string, value: string | undefined = undefined) => {
        document.execCommand(command, false, value);
        handleContentChange();
        if (contentEditorRef.current) {
            contentEditorRef.current.focus();
        }
    };

    const applyTeaserFormat = (command: string, value: string | undefined = undefined) => {
        document.execCommand(command, false, value);
        handleTeaserChange();
        if (teaserEditorRef.current) {
            teaserEditorRef.current.focus();
        }
    };

    const insertCallout = (type: 'info' | 'warning' | 'success') => {
        if (contentEditorRef.current) contentEditorRef.current.focus();
        let calloutHtml = '';
        if (type === 'info') {
            calloutHtml = `<div class="peptalk-callout-info"><div><p style="margin:0;font-weight:700;">💡 Clinical Tip</p><p style="margin:4px 0 0 0;">Add your clinical research tip, guideline, or protocol recommendation here.</p></div></div><p><br></p>`;
        } else if (type === 'warning') {
            calloutHtml = `<div class="peptalk-callout-warning"><div><p style="margin:0;font-weight:700;">⚠️ Important Precaution</p><p style="margin:4px 0 0 0;">Highlight safety contraindications, reconstitution precautions, or dosage warnings here.</p></div></div><p><br></p>`;
        } else {
            calloutHtml = `<div class="peptalk-callout-success"><div><p style="margin:0;font-weight:700;">✅ Protocol Verified</p><p style="margin:4px 0 0 0;">Document best practice findings, standard storage parameters, or titration goals.</p></div></div><p><br></p>`;
        }
        document.execCommand('insertHTML', false, calloutHtml);
        handleContentChange();
        fireToast('Callout block inserted! 💡', 'success');
    };

    const insertClinicalTable = () => {
        if (contentEditorRef.current) contentEditorRef.current.focus();
        const tableHtml = `<table><thead><tr><th>Strength / Vial</th><th>BAC Reconstitution</th><th>Recommended Dose</th><th>Frequency</th></tr></thead><tbody><tr><td>5mg Vial</td><td>1.0 mL BAC Water</td><td>0.25mg (5 Units)</td><td>Once Weekly</td></tr><tr><td>10mg Vial</td><td>2.0 mL BAC Water</td><td>0.50mg (10 Units)</td><td>Once Weekly</td></tr><tr><td>15mg Vial</td><td>3.0 mL BAC Water</td><td>0.75mg (15 Units)</td><td>Once Weekly</td></tr></tbody></table><p><br></p>`;
        document.execCommand('insertHTML', false, tableHtml);
        handleContentChange();
        fireToast('Clinical table inserted! 📊', 'success');
    };

    const insertQuote = () => {
        if (contentEditorRef.current) contentEditorRef.current.focus();
        const quoteHtml = `<blockquote>&ldquo;Consistency, gentle handling, and strict adherence to refrigeration standards maximize compound integrity.&rdquo;</blockquote><p><br></p>`;
        document.execCommand('insertHTML', false, quoteHtml);
        handleContentChange();
        fireToast('Quote block inserted! ❝', 'success');
    };

    const insertLink = () => {
        const url = prompt('Enter destination link URL (e.g. https://slimdose.com):');
        if (url) {
            document.execCommand('createLink', false, url);
            handleContentChange();
            fireToast('Link inserted! 🔗', 'success');
        }
    };

    const openModal = (article?: Article) => {
        if (article) {
            setModalData({
                id: article.id,
                title: article.title,
                preview: article.preview || '',
                content: article.content,
                cover_image: article.cover_image,
                author: article.author || 'SlimDose Medical Team',
                published_date: article.published_date,
                display_order: article.display_order,
                is_enabled: article.is_enabled,
                related_product_ids: article.related_product_ids || []
            });
            setEditingArticle(article.id);
        } else {
            const maxOrder = articles.length > 0 ? Math.max(...articles.map(a => a.display_order)) : -1;
            setModalData({
                title: '',
                preview: '',
                content: '',
                cover_image: null,
                author: 'SlimDose Medical Team',
                published_date: new Date().toISOString().split('T')[0],
                display_order: maxOrder + 1,
                is_enabled: true,
                related_product_ids: []
            });
            setEditingArticle(null);
        }
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingArticle(null);
        setProductSearch('');
    };

    const saveArticle = async () => {
        if (!modalData.title.trim()) {
            fireToast('Please enter an article title', 'warning');
            return;
        }

        if (!modalData.content.trim()) {
            fireToast('Please enter article body content', 'warning');
            return;
        }

        try {
            const cleanRelatedProductIds = Array.isArray(modalData.related_product_ids)
                ? modalData.related_product_ids.filter(id => id && typeof id === 'string' && id.trim() !== '')
                : [];

            const articleData = {
                title: modalData.title.trim(),
                preview: modalData.preview ? modalData.preview.trim() : null,
                content: modalData.content,
                cover_image: modalData.cover_image || null,
                author: modalData.author.trim() || 'SlimDose Medical Team',
                published_date: modalData.published_date || new Date().toISOString().split('T')[0],
                display_order: Number(modalData.display_order) || 0,
                is_enabled: modalData.is_enabled ?? true,
                related_product_ids: cleanRelatedProductIds
            };

            if (editingArticle) {
                const { error } = await supabase
                    .from('guide_topics')
                    .update({
                        ...articleData,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', editingArticle);

                if (error) {
                    console.error('Supabase update guide_topics error:', error);
                    const { error: retryErr } = await supabase
                        .from('guide_topics')
                        .update({
                            title: articleData.title,
                            preview: articleData.preview,
                            content: articleData.content,
                            cover_image: articleData.cover_image,
                            author: articleData.author,
                            published_date: articleData.published_date,
                            display_order: articleData.display_order,
                            is_enabled: articleData.is_enabled,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', editingArticle);
                    if (retryErr) throw retryErr;
                }
                
                try {
                    mirrorGuideUpdate(editingArticle, articleData);
                } catch (mErr) {
                    console.warn('Convex mirror guide update notice:', mErr);
                }
                fireToast('Article updated successfully', 'success');
            } else {
                const { error } = await supabase
                    .from('guide_topics')
                    .insert(articleData);

                if (error) {
                    console.error('Supabase insert guide_topics error:', error);
                    const { error: retryErr } = await supabase
                        .from('guide_topics')
                        .insert({
                            title: articleData.title,
                            preview: articleData.preview,
                            content: articleData.content,
                            cover_image: articleData.cover_image,
                            author: articleData.author,
                            published_date: articleData.published_date,
                            display_order: articleData.display_order,
                            is_enabled: articleData.is_enabled
                        });
                    if (retryErr) throw retryErr;
                }

                try {
                    mirrorGuideCreate(articleData);
                } catch (mErr) {
                    console.warn('Convex mirror guide create notice:', mErr);
                }
                fireToast('New article published successfully', 'success');
            }

            closeModal();
            fetchArticles(false);
        } catch (error: any) {
            console.error('Error saving article:', error);
            const detailMsg = error?.message || 'Database error occurred';
            fireToast(`Failed to save article: ${detailMsg}`, 'error');
        }
    };

    const deleteArticle = async (articleId: string, title: string) => {
        if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const { error } = await supabase
                .from('guide_topics')
                .delete()
                .eq('id', articleId);

            if (error) throw error;
            mirrorGuideDelete(articleId);
            fireToast('Article deleted', 'info');
            fetchArticles(false);
        } catch (error) {
            console.error('Error deleting article:', error);
            fireToast('Failed to delete article', 'error');
        }
    };

    const toggleEnabled = async (articleId: string, currentlyEnabled: boolean) => {
        try {
            const { error } = await supabase
                .from('guide_topics')
                .update({ is_enabled: !currentlyEnabled, updated_at: new Date().toISOString() })
                .eq('id', articleId);

            if (error) throw error;
            mirrorGuideSetEnabled(articleId, !currentlyEnabled);
            fireToast(
                !currentlyEnabled ? 'Article published live to website' : 'Article moved to draft status',
                'success'
            );
            fetchArticles(false);
        } catch (error) {
            console.error('Error toggling article status:', error);
            fireToast('Failed to update article status', 'error');
        }
    };

    // Filter & Sort Logic
    const filteredArticles = useMemo(() => {
        const result = articles.filter(article => {
            const q = searchQuery.toLowerCase().trim();
            const matchesSearch = !q || (
                article.title.toLowerCase().includes(q) ||
                (article.preview && article.preview.toLowerCase().includes(q)) ||
                article.author.toLowerCase().includes(q) ||
                article.content.toLowerCase().includes(q)
            );

            if (filterStatus === 'published') return matchesSearch && article.is_enabled;
            if (filterStatus === 'draft') return matchesSearch && !article.is_enabled;
            return matchesSearch;
        });

        result.sort((a, b) => {
            if (sortBy === 'order-asc') return a.display_order - b.display_order;
            if (sortBy === 'recent') return new Date(b.published_date).getTime() - new Date(a.published_date).getTime();
            if (sortBy === 'oldest') return new Date(a.published_date).getTime() - new Date(b.published_date).getTime();
            if (sortBy === 'title-asc') return a.title.localeCompare(b.title);
            return 0;
        });

        return result;
    }, [articles, searchQuery, filterStatus, sortBy]);

    // KPI Metrics
    const kpiMetrics = useMemo(() => {
        const total = articles.length;
        const published = articles.filter(a => a.is_enabled).length;
        const drafts = total - published;
        const totalProductsLinked = articles.reduce((acc, a) => acc + (a.related_product_ids?.length || 0), 0);

        return { total, published, drafts, totalProductsLinked };
    }, [articles]);

    const filteredModalProducts = useMemo(() => {
        if (!productSearch.trim()) return products;
        const q = productSearch.toLowerCase().trim();
        return products.filter(p => p.name.toLowerCase().includes(q));
    }, [products, productSearch]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-16 space-y-4 font-inter">
                <div className="animate-spin w-9 h-9 border-3 border-[#3C6CA8] border-t-transparent rounded-full shadow-md" />
                <p className="text-xs font-bold text-slate-500 animate-pulse">Loading Peptalk Educational Articles...</p>
            </div>
        );
    }

    return (
        <div className="space-y-5 text-left font-inter max-w-7xl mx-auto">
            
            {/* ── Top Header Navigation Bar ── */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-2 sm:space-x-3">
                    <a
                        href="/admin"
                        className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1 text-xs font-bold"
                    >
                        <ArrowLeft className="h-4 w-4 text-slate-400" />
                        <span>Dashboard</span>
                    </a>
                    <span className="text-slate-300 dark:text-slate-700">/</span>
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#3C6CA8]/10 text-[#3C6CA8] flex items-center justify-center font-bold">
                            <BookOpen className="w-4 h-4" />
                        </div>
                        <h1 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight">
                            Peptalk Articles Manager
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    {/* Live Realtime Sync Status */}
                    <div 
                        onClick={handleRefresh}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-all select-none"
                        title="Click to sync articles with database"
                    >
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="hidden sm:inline">Live Realtime</span>
                        <RefreshCw className={`w-3 h-3 text-slate-400 ${isRefreshing ? 'animate-spin text-[#3C6CA8]' : ''}`} />
                    </div>

                    {/* New Article Action */}
                    <button
                        type="button"
                        onClick={() => openModal()}
                        className="flex items-center gap-1.5 bg-[#3C6CA8] hover:bg-[#325a8c] text-white px-4 py-2 rounded-xl font-bold transition-all shadow-sm active:scale-95 text-xs cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        <span>New Article</span>
                    </button>
                </div>
            </div>

            {/* ── KPI Stats Overview Bar ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* Total Articles */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                            Total Articles
                        </span>
                        <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 block">
                            {kpiMetrics.total}
                        </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-[#3C6CA8]/10 text-[#3C6CA8] flex items-center justify-center font-bold shrink-0">
                        <FileText className="w-5 h-5" />
                    </div>
                </div>

                {/* Published Articles */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                            Live on Website
                        </span>
                        <div className="flex items-baseline gap-1.5 mt-1">
                            <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
                                {kpiMetrics.published}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded-md">
                                Public
                            </span>
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                </div>

                {/* Draft Articles */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                            Drafts / Review
                        </span>
                        <span className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 block">
                            {kpiMetrics.drafts}
                        </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shrink-0">
                        <FileEdit className="w-5 h-5" />
                    </div>
                </div>

                {/* Linked Products */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                            Linked Products
                        </span>
                        <span className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 mt-1 block">
                            {kpiMetrics.totalProductsLinked}
                        </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold shrink-0">
                        <Package className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* ── Search & Status Filter Bar ── */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-3.5 sm:p-4 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                    
                    {/* Search Input */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                        <input id="guidemanager-search-articles-by-title-excer" name="search_articles_by_title_excer" type="text"
                            placeholder="Search articles by title, excerpt, content, or author..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] transition-all"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Right Controls: Sort & Filter Pills */}
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        
                        {/* Sort Selector */}
                        <div className="flex items-center gap-1">
                            <select id="guidemanager-input-2" name="input_2" value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as SortOption)}
                                aria-label="Sort articles"
                                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#3C6CA8]/30 cursor-pointer"
                            >
                                <option value="order-asc">Sort Order (0-9)</option>
                                <option value="recent">Newest Published</option>
                                <option value="oldest">Oldest Published</option>
                                <option value="title-asc">Title (A-Z)</option>
                            </select>
                        </div>

                        {/* Status Filter Segment Pills */}
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                            <button
                                type="button"
                                onClick={() => setFilterStatus('all')}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    filterStatus === 'all'
                                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                                }`}
                            >
                                All ({kpiMetrics.total})
                            </button>
                            <button
                                type="button"
                                onClick={() => setFilterStatus('published')}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    filterStatus === 'published'
                                        ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                                }`}
                            >
                                Published ({kpiMetrics.published})
                            </button>
                            <button
                                type="button"
                                onClick={() => setFilterStatus('draft')}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    filterStatus === 'draft'
                                        ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-300 shadow-xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                                }`}
                            >
                                Drafts ({kpiMetrics.drafts})
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Articles List / Responsive Cards ── */}
            {filteredArticles.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                        <FileText className="w-7 h-7" />
                    </div>
                    <h4 className="text-base font-black text-slate-800 dark:text-white">No Articles Found</h4>
                    <p className="text-slate-400 text-xs max-w-sm mx-auto">
                        {searchQuery 
                            ? 'No educational articles match your current search query or filter.' 
                            : 'Publish your first Peptalk educational article to guide and inform your customers.'}
                    </p>
                    <button
                        type="button"
                        onClick={() => { setSearchQuery(''); setFilterStatus('all'); }}
                        className="px-4 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
                    >
                        Reset Search Filters
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredArticles.map((article) => {
                        const authorInitial = (article.author?.trim().charAt(0) || 'S').toUpperCase();
                        const readingTime = getReadingTime(article.content);

                        return (
                            <div
                                key={article.id}
                                className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 sm:p-4 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-[#3C6CA8]/50 hover:shadow-md transition-all group overflow-hidden"
                            >
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    
                                    {/* Left Article Details */}
                                    <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                                        <GripVertical className="w-4 h-4 text-slate-300 dark:text-slate-600 mt-2 flex-shrink-0 cursor-grab opacity-40 group-hover:opacity-100 transition-opacity hidden sm:block" />
                                        
                                        {/* Cover Image / Thumbnail */}
                                        <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0 flex items-center justify-center relative group-hover:scale-[1.02] transition-transform">
                                            {article.cover_image ? (
                                                <img
                                                    src={article.cover_image}
                                                    alt={article.title}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-[#3C6CA8]/10 to-[#3C6CA8]/20 flex flex-col items-center justify-center p-2 text-center">
                                                    <span className="text-[10px] font-black text-[#3C6CA8] tracking-wider uppercase">SlimDose</span>
                                                    <BookOpen className="w-4 h-4 text-[#3C6CA8] mt-0.5" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Main Text & Meta */}
                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <a 
                                                    href={`/peptalk/${article.id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs sm:text-sm font-black text-slate-900 dark:text-white hover:text-[#3C6CA8] transition-colors truncate max-w-lg flex items-center gap-1.5"
                                                    title="Open live article page"
                                                >
                                                    <span>{article.title}</span>
                                                    <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                                </a>

                                                {/* Published/Draft Status Badge */}
                                                <button
                                                    type="button"
                                                    onClick={() => toggleEnabled(article.id, article.is_enabled)}
                                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                                                        article.is_enabled
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-100'
                                                            : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 hover:bg-amber-100'
                                                    }`}
                                                    title={`Click to ${article.is_enabled ? 'unpublish' : 'publish'}`}
                                                >
                                                    <span className={`w-1.5 h-1.5 rounded-full ${article.is_enabled ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
                                                    <span>{article.is_enabled ? 'Published' : 'Draft'}</span>
                                                </button>
                                            </div>

                                            {/* Preview Excerpt */}
                                            {article.preview && (
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 leading-normal">
                                                    {article.preview}
                                                </p>
                                            )}

                                            {/* Metadata Pills Row */}
                                            <div className="flex items-center gap-2 sm:gap-3 text-[10px] text-slate-500 dark:text-slate-400 flex-wrap pt-0.5">
                                                {/* Author */}
                                                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                                    <span className="w-3.5 h-3.5 rounded-full bg-[#3C6CA8]/20 text-[#3C6CA8] flex items-center justify-center font-black text-[8.5px]">
                                                        {authorInitial}
                                                    </span>
                                                    <span>{article.author}</span>
                                                </div>

                                                {/* Date */}
                                                <span className="flex items-center gap-1 font-medium">
                                                    <Calendar className="w-3 h-3 text-slate-400" />
                                                    {new Date(article.published_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                                </span>

                                                {/* Reading Time */}
                                                <span className="flex items-center gap-1 font-medium">
                                                    <Clock className="w-3 h-3 text-slate-400" />
                                                    {readingTime}
                                                </span>

                                                {/* Sort Order Index */}
                                                <span className="flex items-center gap-1 font-mono font-bold text-slate-400">
                                                    <Hash className="w-3 h-3" />
                                                    Order {article.display_order}
                                                </span>

                                                {/* Linked Products Count */}
                                                {article.related_product_ids && article.related_product_ids.length > 0 && (
                                                    <span className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 font-bold bg-purple-50 dark:bg-purple-950/40 px-1.5 py-0.2 rounded-md border border-purple-200 dark:border-purple-800">
                                                        <Package className="w-3 h-3" />
                                                        {article.related_product_ids.length} Linked Product{article.related_product_ids.length > 1 ? 's' : ''}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Action Buttons */}
                                    <div className="flex items-center gap-1.5 self-end sm:self-center bg-slate-50 dark:bg-slate-800/80 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
                                        {/* Live View */}
                                        <a
                                            href={`/peptalk/${article.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-600 dark:text-slate-300 shadow-2xs cursor-pointer"
                                            title="View published article"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                        </a>

                                        {/* Toggle Status */}
                                        <button
                                            type="button"
                                            onClick={() => toggleEnabled(article.id, article.is_enabled)}
                                            className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors shadow-2xs cursor-pointer"
                                            title={article.is_enabled ? 'Move to Draft' : 'Publish Live'}
                                        >
                                            {article.is_enabled ? (
                                                <Eye className="w-3.5 h-3.5 text-emerald-600" />
                                            ) : (
                                                <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                                            )}
                                        </button>

                                        {/* Edit Article */}
                                        <button
                                            type="button"
                                            onClick={() => openModal(article)}
                                            className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors text-[#3C6CA8] shadow-2xs cursor-pointer"
                                            title="Edit Article Content"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>

                                        {/* Delete Article */}
                                        <button
                                            type="button"
                                            onClick={() => deleteArticle(article.id, article.title)}
                                            className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors text-rose-600 shadow-2xs cursor-pointer"
                                            title="Delete Article"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── FULL-WIDTH EXPANSIVE ARTICLE EDITOR & CREATION MODAL ── */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto animate-fadeIn">
                    <div className={`bg-white dark:bg-slate-900 shadow-2xl my-auto border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden transition-all duration-200 ${
                        isFullscreenEditor
                            ? 'fixed inset-2 sm:inset-4 max-w-none max-h-none rounded-2xl z-[60]'
                            : 'rounded-3xl max-w-6xl w-full max-h-[94vh]'
                    }`}>
                        
                        {/* Modal Header */}
                        <div className="px-5 sm:px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-950 shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-[#3C6CA8]/10 text-[#3C6CA8] flex items-center justify-center font-bold">
                                    <BookOpen className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                                        {editingArticle ? 'Edit Peptalk Article' : 'Create New Peptalk Article'}
                                    </h3>
                                    <p className="text-[11px] text-slate-400">
                                        Full-width composing canvas with real-time WYSIWYG preview and clinical formatting tools.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => setIsFullscreenEditor(!isFullscreenEditor)}
                                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                                    title={isFullscreenEditor ? 'Exit Fullscreen' : 'Fullscreen Canvas'}
                                >
                                    {isFullscreenEditor ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                                </button>
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 text-slate-500 transition-all cursor-pointer"
                                    aria-label="Close modal"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Continuous Scrollable Canvas */}
                        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
                            
                            {/* ── 1. Article Title (Full-Width Prominent) ── */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label htmlFor="guidemanager-article-title" className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                        Article Title *
                                    </label>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                        {modalData.title.length} characters
                                    </span>
                                </div>
                                <input id="guidemanager-article-title" name="article_title" type="text"
                                    value={modalData.title}
                                    onChange={(e) => setModalData({ ...modalData, title: e.target.value })}
                                    className="w-full px-4 py-2.5 text-sm sm:text-base font-bold border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] outline-none shadow-2xs placeholder:font-normal placeholder:text-slate-400"
                                    placeholder="e.g. Understanding Reconstitution, Dosage Titration and Safety Protocols"
                                />
                            </div>

                            {/* ── 2. Collapsible Article Metadata & Media Section ── */}
                            <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden transition-all shadow-2xs">
                                <button
                                    type="button"
                                    onClick={() => setIsMetaDrawerOpen(!isMetaDrawerOpen)}
                                    className="w-full px-4 py-2.5 flex items-center justify-between bg-slate-100/70 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                                >
                                    <div className="flex items-center gap-2">
                                        <Hash className="w-4 h-4 text-[#3C6CA8]" />
                                        <span className="text-xs font-bold uppercase tracking-wider">Banner &amp; Publishing Settings</span>
                                        {modalData.is_enabled ? (
                                            <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                Live Public
                                            </span>
                                        ) : (
                                            <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                                Internal Draft
                                            </span>
                                        )}
                                        {modalData.related_product_ids.length > 0 && (
                                            <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                                                {modalData.related_product_ids.length} Linked Products
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 text-slate-400 text-xs font-medium">
                                        <span>{isMetaDrawerOpen ? 'Hide' : 'Show Settings'}</span>
                                        {isMetaDrawerOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </div>
                                </button>

                                {isMetaDrawerOpen && (
                                    <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 border-t border-slate-200 dark:border-slate-700">
                                        {/* Cover Image Banner */}
                                        <div className="lg:col-span-5 space-y-1.5">
                                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                                Cover Image (Hero Banner)
                                            </label>
                                            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-2xs">
                                                <ImageUpload
                                                    currentImage={modalData.cover_image || undefined}
                                                    onImageChange={(imageUrl) => setModalData({ ...modalData, cover_image: imageUrl || null })}
                                                    folder="article-covers"
                                                    title="Click to upload cover banner"
                                                    subtitle="Supports JPG, PNG, WebP, GIF - max 10MB"
                                                    urlPlaceholder="https://example.com/cover-image.jpg"
                                                    urlLabel="Or enter cover image URL"
                                                />
                                            </div>
                                        </div>

                                        {/* Publishing Metadata & Products */}
                                        <div className="lg:col-span-7 space-y-3">
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                {/* Author */}
                                                <div className="space-y-1 sm:col-span-2">
                                                    <label htmlFor="guidemanager-article-author" className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                                        Author / Attribution
                                                    </label>
                                                    <input id="guidemanager-article-author" name="article_author" type="text"
                                                        value={modalData.author}
                                                        onChange={(e) => setModalData({ ...modalData, author: e.target.value })}
                                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none"
                                                        placeholder="e.g. SlimDose Medical Team"
                                                    />
                                                </div>

                                                {/* Publish Date */}
                                                <div className="space-y-1">
                                                    <label htmlFor="guidemanager-publish-date" className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                                        Publish Date
                                                    </label>
                                                    <input id="guidemanager-publish-date" name="publish_date" type="date"
                                                        value={modalData.published_date}
                                                        onChange={(e) => setModalData({ ...modalData, published_date: e.target.value })}
                                                        className="w-full px-2.5 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {/* Display Sort Order */}
                                                <div className="space-y-1">
                                                    <label htmlFor="guidemanager-display-sort-order" className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                                        Display Sort Order
                                                    </label>
                                                    <input id="guidemanager-display-sort-order" name="display_sort_order" type="number"
                                                        value={modalData.display_order}
                                                        onChange={(e) => setModalData({ ...modalData, display_order: parseInt(e.target.value) || 0 })}
                                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none"
                                                    />
                                                </div>

                                                {/* Public Visibility Toggle */}
                                                <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        id="modal_is_enabled"
                                                        checked={modalData.is_enabled}
                                                        onChange={(e) => setModalData({ ...modalData, is_enabled: e.target.checked })}
                                                        className="w-4 h-4 text-[#3C6CA8] rounded focus:ring-2 focus:ring-[#3C6CA8] cursor-pointer"
                                                    />
                                                    <div>
                                                        <label htmlFor="modal_is_enabled" className="text-xs font-bold text-slate-900 dark:text-white block cursor-pointer">
                                                            Publish Live
                                                        </label>
                                                        <p className="text-[10px] text-slate-400">
                                                            {modalData.is_enabled ? 'Visible to public' : 'Internal draft'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Linked Products Picker */}
                                            <div className="space-y-1.5 pt-1">
                                                <div className="flex items-center justify-between">
                                                    <label htmlFor="guidemanager-filter-products" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                                                        <Package className="w-3.5 h-3.5 text-purple-600" />
                                                        <span>Link Featured Products</span>
                                                    </label>
                                                    <input id="guidemanager-filter-products" name="filter_products" type="text"
                                                        placeholder="Quick search products..."
                                                        value={productSearch}
                                                        onChange={(e) => setProductSearch(e.target.value)}
                                                        className="px-2 py-0.5 text-[11px] border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white w-44"
                                                    />
                                                </div>

                                                <div className="border border-slate-200 dark:border-slate-700 rounded-xl max-h-32 overflow-y-auto bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700">
                                                    {filteredModalProducts.length === 0 ? (
                                                        <p className="text-[11px] text-slate-400 p-2.5 text-center">No matching products</p>
                                                    ) : (
                                                        filteredModalProducts.map((product) => {
                                                            const isSelected = modalData.related_product_ids.includes(product.id);
                                                            return (
                                                                <button
                                                                    key={product.id}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const newIds = isSelected
                                                                            ? modalData.related_product_ids.filter(id => id !== product.id)
                                                                            : [...modalData.related_product_ids, product.id];
                                                                        setModalData({ ...modalData, related_product_ids: newIds });
                                                                    }}
                                                                    className={`w-full flex items-center gap-2 p-1.5 px-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${
                                                                        isSelected ? 'bg-purple-50/60 dark:bg-purple-950/40' : ''
                                                                    }`}
                                                                >
                                                                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                                                                        isSelected ? 'bg-[#3C6CA8] border-[#3C6CA8]' : 'border-slate-300'
                                                                    }`}>
                                                                        {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                                                                    </div>
                                                                    {product.image_url && (
                                                                        <img src={product.image_url} alt="" className="w-5 h-5 rounded object-cover shrink-0" />
                                                                    )}
                                                                    <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                                                                        <p className="text-[11px] font-bold text-slate-900 dark:text-white truncate">{product.name}</p>
                                                                        <p className="text-[10px] text-slate-400 font-mono">₱{product.base_price.toLocaleString()}</p>
                                                                    </div>
                                                                </button>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ── 3. FULL-WIDTH TEASER EXCERPT SUMMARY (RICH TEXT WYSIWYG) ── */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                    <div className="flex items-center gap-2">
                                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                            Teaser Excerpt Summary
                                        </label>
                                        <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                            Rich Text Formatter
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-slate-400">
                                        Shown on article cards &amp; executive overview
                                    </span>
                                </div>

                                {/* Teaser Formatting Toolbar */}
                                <div className="flex items-center gap-1 p-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 border-b-0 rounded-t-xl flex-wrap text-slate-700 dark:text-slate-300 text-xs">
                                    <button
                                        type="button"
                                        onClick={() => applyTeaserFormat('bold')}
                                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md font-bold"
                                        title="Bold (Ctrl+B)"
                                    >
                                        <Bold className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyTeaserFormat('italic')}
                                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md"
                                        title="Italic (Ctrl+I)"
                                    >
                                        <Italic className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyTeaserFormat('underline')}
                                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md"
                                        title="Underline (Ctrl+U)"
                                    >
                                        <Underline className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyTeaserFormat('strikeThrough')}
                                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md"
                                        title="Strikethrough"
                                    >
                                        <Strikethrough className="w-3.5 h-3.5" />
                                    </button>

                                    <div className="h-3.5 w-px bg-slate-300 dark:bg-slate-700 mx-1" />

                                    <button
                                        type="button"
                                        onClick={() => applyTeaserFormat('removeFormat')}
                                        className="px-2 py-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-[11px] font-medium"
                                        title="Clear Formatting"
                                    >
                                        Clear Format
                                    </button>
                                </div>

                                {/* Teaser Editable Body */}
                                <div
                                    ref={teaserEditorRef}
                                    contentEditable
                                    onInput={handleTeaserChange}
                                    onBlur={handleTeaserChange}
                                    dangerouslySetInnerHTML={{ __html: modalData.preview }}
                                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-b-xl focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] min-h-[85px] max-h-[140px] overflow-y-auto text-xs sm:text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none leading-relaxed shadow-inner"
                                />
                            </div>

                            {/* ── 4. FULL-WIDTH ARTICLE BODY CONTENT (ADVANCED WYSIWYG) ── */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                    <div className="flex items-center gap-2">
                                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                            Article Body Content *
                                        </label>
                                        <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                            Full WYSIWYG Editor
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-slate-400">
                                        {calculateReadTime(modalData.content)} • {modalData.content.replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(Boolean).length} words
                                    </span>
                                </div>

                                {/* Comprehensive Formatting Toolbar */}
                                <div className="sticky top-0 z-10 flex items-center gap-1 p-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 border-b-0 rounded-t-2xl flex-wrap text-slate-700 dark:text-slate-300 shadow-xs">
                                    {/* Typography Blocks */}
                                    <button
                                        type="button"
                                        onClick={() => applyFormat('formatBlock', '<p>')}
                                        className="px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-xs font-semibold"
                                        title="Paragraph"
                                    >
                                        <Type className="w-3.5 h-3.5 inline mr-1" />
                                        <span>P</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyFormat('formatBlock', '<h1>')}
                                        className="px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-xs font-black text-slate-900 dark:text-white"
                                        title="Heading 1"
                                    >
                                        H1
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyFormat('formatBlock', '<h2>')}
                                        className="px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-xs font-bold"
                                        title="Heading 2"
                                    >
                                        H2
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyFormat('formatBlock', '<h3>')}
                                        className="px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-xs font-semibold"
                                        title="Heading 3"
                                    >
                                        H3
                                    </button>

                                    <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />

                                    {/* Inline Styles */}
                                    <button
                                        type="button"
                                        onClick={() => applyFormat('bold')}
                                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md font-bold"
                                        title="Bold (Ctrl+B)"
                                    >
                                        <Bold className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyFormat('italic')}
                                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md"
                                        title="Italic (Ctrl+I)"
                                    >
                                        <Italic className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyFormat('underline')}
                                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md"
                                        title="Underline (Ctrl+U)"
                                    >
                                        <Underline className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyFormat('strikeThrough')}
                                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md"
                                        title="Strikethrough"
                                    >
                                        <Strikethrough className="w-3.5 h-3.5" />
                                    </button>

                                    <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />

                                    {/* Alignments */}
                                    <button
                                        type="button"
                                        onClick={() => applyFormat('justifyLeft')}
                                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md"
                                        title="Align Left"
                                    >
                                        <AlignLeft className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyFormat('justifyCenter')}
                                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md"
                                        title="Align Center"
                                    >
                                        <AlignCenter className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyFormat('justifyRight')}
                                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md"
                                        title="Align Right"
                                    >
                                        <AlignRight className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyFormat('justifyFull')}
                                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md"
                                        title="Justify"
                                    >
                                        <AlignJustify className="w-3.5 h-3.5" />
                                    </button>

                                    <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />

                                    {/* Lists */}
                                    <button
                                        type="button"
                                        onClick={() => applyFormat('insertUnorderedList')}
                                        className="px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-xs font-medium flex items-center gap-1"
                                        title="Bullet List"
                                    >
                                        <List className="w-3.5 h-3.5" />
                                        <span>Bullet</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyFormat('insertOrderedList')}
                                        className="px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-xs font-medium flex items-center gap-1"
                                        title="Numbered List"
                                    >
                                        <ListOrdered className="w-3.5 h-3.5" />
                                        <span>Numbered</span>
                                    </button>

                                    <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />

                                    {/* Rich Clinical Elements */}
                                    <button
                                        type="button"
                                        onClick={() => insertCallout('info')}
                                        className="px-2 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-md text-xs font-bold flex items-center gap-1"
                                        title="Insert Clinical Tip Callout Box"
                                    >
                                        <Info className="w-3.5 h-3.5" />
                                        <span>Tip Box</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => insertCallout('warning')}
                                        className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-md text-xs font-bold flex items-center gap-1"
                                        title="Insert Precaution Warning Box"
                                    >
                                        <AlertTriangle className="w-3.5 h-3.5" />
                                        <span>Warning Box</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => insertCallout('success')}
                                        className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-md text-xs font-bold flex items-center gap-1"
                                        title="Insert Verified Protocol Box"
                                    >
                                        <ShieldCheck className="w-3.5 h-3.5" />
                                        <span>Protocol Box</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={insertClinicalTable}
                                        className="px-2 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-md text-xs font-bold flex items-center gap-1"
                                        title="Insert Clinical Table"
                                    >
                                        <Table className="w-3.5 h-3.5" />
                                        <span>Table</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={insertQuote}
                                        className="px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-xs font-medium flex items-center gap-1"
                                        title="Insert Blockquote"
                                    >
                                        <Quote className="w-3.5 h-3.5" />
                                        <span>Quote</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyFormat('insertHorizontalRule')}
                                        className="px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-xs font-medium flex items-center gap-1"
                                        title="Insert Divider"
                                    >
                                        <Minus className="w-3.5 h-3.5" />
                                        <span>Divider</span>
                                    </button>

                                    <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />

                                    {/* Links & Photo */}
                                    <button
                                        type="button"
                                        onClick={insertLink}
                                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md"
                                        title="Insert Hyperlink"
                                    >
                                        <LinkIcon className="w-3.5 h-3.5" />
                                    </button>

                                    <input id="guidemanager-file-upload" name="file_upload" type="file"
                                        ref={articleImageInputRef}
                                        onChange={handleArticleImageSelect}
                                        accept="image/*"
                                        className="hidden"/>
                                    <button
                                        type="button"
                                        onClick={() => articleImageInputRef.current?.click()}
                                        disabled={isUploadingArticleImage}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#3C6CA8] hover:bg-[#325a8c] text-white rounded-md text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
                                        title="Upload and insert photo/image directly into article"
                                    >
                                        {isUploadingArticleImage ? (
                                            <>
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                <span>Uploading...</span>
                                            </>
                                        ) : (
                                            <>
                                                <ImageIcon className="w-3.5 h-3.5" />
                                                <span>Insert Photo</span>
                                            </>
                                        )}
                                    </button>

                                    {/* Undo / Redo */}
                                    <div className="ml-auto flex items-center gap-0.5">
                                        <button
                                            type="button"
                                            onClick={() => applyFormat('undo')}
                                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-slate-500"
                                            title="Undo"
                                        >
                                            <Undo className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => applyFormat('redo')}
                                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-slate-500"
                                            title="Redo"
                                        >
                                            <Redo className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Full Width WYSIWYG Content Body with Matching Frontend Prose Styling */}
                                <div
                                    ref={contentEditorRef}
                                    contentEditable
                                    onInput={handleContentChange}
                                    onBlur={handleContentChange}
                                    dangerouslySetInnerHTML={{ __html: modalData.content }}
                                    className="peptalk-article-content w-full px-5 py-4 border border-slate-300 dark:border-slate-700 rounded-b-2xl focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] min-h-[380px] max-h-[550px] overflow-y-auto text-xs sm:text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none shadow-inner"
                                />
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-5 sm:px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950 shrink-0">
                            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                                Changes are saved immediately and synced across the customer portal.
                            </span>
                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={saveArticle}
                                    className="px-5 py-2 text-xs font-bold text-white bg-[#3C6CA8] hover:bg-[#325a8c] rounded-xl transition-all shadow-md shadow-[#3C6CA8]/20 cursor-pointer flex items-center gap-1.5"
                                >
                                    <Check className="w-4 h-4" />
                                    <span>{editingArticle ? 'Save & Update Article' : 'Publish Article'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
