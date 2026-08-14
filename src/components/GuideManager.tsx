import { useEffect, useState, useRef } from 'react';
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
    BookOpen
} from 'lucide-react';
import ImageUpload from './ImageUpload';

interface Article {
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

interface SimpleProduct {
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

export default function GuideManager() {
    const [articles, setArticles] = useState<Article[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft'>('all');
    const [showModal, setShowModal] = useState(false);
    const [modalData, setModalData] = useState<ModalData>({
        title: '',
        preview: '',
        content: '',
        cover_image: null,
        author: 'SlimDose Team',
        published_date: new Date().toISOString().split('T')[0],
        display_order: 0,
        is_enabled: true,
        related_product_ids: []
    });
    const [editingArticle, setEditingArticle] = useState<string | null>(null);
    const [products, setProducts] = useState<SimpleProduct[]>([]);
    const contentEditorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchArticles();
        fetchProducts();
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

    const fetchArticles = async () => {
        try {
            const { data, error } = await supabase
                .from('guide_topics')
                .select('*')
                .order('display_order', { ascending: true });

            if (error) throw error;

            if (data) {
                setArticles(data);
            }
        } catch (error) {
            console.error('Error fetching articles:', error);
            alert('Failed to fetch articles');
        }
    };

    const handleContentChange = () => {
        if (contentEditorRef.current) {
            setModalData(prev => ({
                ...prev,
                content: contentEditorRef.current?.innerHTML || ''
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

    const openModal = (article?: Article) => {
        if (article) {
            setModalData({
                id: article.id,
                title: article.title,
                preview: article.preview || '',
                content: article.content,
                cover_image: article.cover_image,
                author: article.author,
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
                author: 'SlimDose Team',
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
        setModalData({
            title: '',
            preview: '',
            content: '',
            cover_image: null,
            author: 'SlimDose Team',
            published_date: new Date().toISOString().split('T')[0],
            display_order: 0,
            is_enabled: true,
            related_product_ids: []
        });
        setEditingArticle(null);
    };

    const saveArticle = async () => {
        if (!modalData.title.trim()) {
            alert('Please enter an article title');
            return;
        }

        if (!modalData.content.trim()) {
            alert('Please enter article content');
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
                author: modalData.author || 'SlimDose Team',
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
                    console.warn('Convex mirror guide update failed:', mErr);
                }
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
                    console.warn('Convex mirror guide create failed:', mErr);
                }
            }

            closeModal();
            fetchArticles();
        } catch (error: any) {
            console.error('Error saving article:', error);
            const detailMsg = error?.message || error?.details || error?.hint || 'Unknown database error';
            alert(`Failed to save article: ${detailMsg}`);
        }
    };

    const deleteArticle = async (articleId: string) => {
        if (!confirm('Are you sure you want to delete this article?')) {
            return;
        }

        try {
            const { error } = await supabase
                .from('guide_topics')
                .delete()
                .eq('id', articleId);

            if (error) throw error;
            mirrorGuideDelete(articleId);

            fetchArticles();
        } catch (error) {
            console.error('Error deleting article:', error);
            alert('Failed to delete article');
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

            fetchArticles();
        } catch (error) {
            console.error('Error toggling article status:', error);
            alert('Failed to update article status');
        }
    };

    // Client-side filtering logic
    const filteredArticles = articles.filter(article => {
        const matchesSearch =
            article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (article.preview && article.preview.toLowerCase().includes(searchQuery.toLowerCase())) ||
            article.author.toLowerCase().includes(searchQuery.toLowerCase());

        if (filterStatus === 'published') return matchesSearch && article.is_enabled;
        if (filterStatus === 'draft') return matchesSearch && !article.is_enabled;
        return matchesSearch;
    });

    const publishedCount = articles.filter(a => a.is_enabled).length;
    const draftCount = articles.filter(a => !a.is_enabled).length;

    return (
        <div className="min-h-screen bg-slate-50/50">
            {/* Top Navigation Bar */}
            <div className="bg-white shadow-xs border-b border-slate-200 sticky top-0 z-20">
                <div className="max-w-6xl mx-auto px-4 sm:px-6">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center space-x-3">
                            <a
                                href="/admin"
                                className="text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1.5 group text-xs font-semibold"
                            >
                                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform text-slate-500" />
                                <span>Dashboard</span>
                            </a>
                            <span className="text-slate-300">/</span>
                            <h1 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-theme-accent" />
                                Article Manager
                            </h1>
                        </div>
                        <button
                            onClick={() => openModal()}
                            className="flex items-center gap-2 bg-theme-accent text-white px-4 py-2 rounded-xl font-semibold hover:opacity-95 active:scale-98 transition-all shadow-xs text-xs"
                        >
                            <Plus className="w-4 h-4" />
                            New Article
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
                {/* Search & Status Filter Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                    <div className="relative w-full sm:w-80">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search articles or authors..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl shadow-2xs focus:ring-2 focus:ring-theme-accent/20 focus:border-theme-accent outline-none transition-all placeholder:text-slate-400"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5 bg-slate-200/60 p-1 rounded-xl border border-slate-200/80 w-full sm:w-auto">
                        <button
                            onClick={() => setFilterStatus('all')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                filterStatus === 'all'
                                    ? 'bg-white text-slate-900 shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            All ({articles.length})
                        </button>
                        <button
                            onClick={() => setFilterStatus('published')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                filterStatus === 'published'
                                    ? 'bg-white text-emerald-800 shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            Published ({publishedCount})
                        </button>
                        <button
                            onClick={() => setFilterStatus('draft')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                filterStatus === 'draft'
                                    ? 'bg-white text-amber-800 shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            Drafts ({draftCount})
                        </button>
                    </div>
                </div>

                {filteredArticles.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center shadow-xs border border-slate-200">
                        <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <h3 className="text-base font-bold text-slate-900 mb-1">
                            No Articles Found
                        </h3>
                        <p className="text-xs text-slate-500 mb-6">
                            {searchQuery ? 'No articles matching your search query' : 'Create your first educational article to get started.'}
                        </p>
                        <button
                            onClick={() => openModal()}
                            className="inline-flex items-center gap-2 bg-theme-accent text-white px-5 py-2.5 rounded-xl text-xs font-semibold hover:opacity-95 transition-opacity"
                        >
                            <Plus className="w-4 h-4" />
                            Create Article
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredArticles.map((article) => (
                            <div
                                key={article.id}
                                className="bg-white rounded-xl shadow-2xs hover:shadow-xs border border-slate-200/80 transition-all group overflow-hidden"
                            >
                                <div className="p-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-4 flex-1 min-w-0">
                                            <GripVertical className="w-4 h-4 text-slate-300 mt-2.5 flex-shrink-0 cursor-grab opacity-60 group-hover:opacity-100 transition-opacity" />
                                            
                                            {/* Article Image Thumbnail */}
                                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-slate-100 border border-slate-200/80 shrink-0 flex items-center justify-center relative group-hover:border-slate-300 transition-all">
                                                {article.cover_image ? (
                                                    <img
                                                        src={article.cover_image}
                                                        alt={article.title}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                                                        <FileText className="w-8 h-8 text-slate-400 opacity-60" />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                                                    <h3 className="text-base font-bold text-slate-900 truncate">
                                                        {article.title}
                                                    </h3>
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex-shrink-0 ${article.is_enabled
                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                                                        : 'bg-amber-50 text-amber-700 border border-amber-200/80'
                                                        }`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${article.is_enabled ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
                                                        {article.is_enabled ? 'Published' : 'Draft'}
                                                    </span>
                                                </div>
                                                {article.preview && (
                                                    <p className="text-xs text-slate-600 line-clamp-2 mb-2.5 leading-relaxed">
                                                        {article.preview}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                                                    {/* Author Avatar Pill */}
                                                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[11px] border border-slate-200/60">
                                                        <span className="w-4 h-4 rounded-full bg-theme-accent/20 text-theme-accent flex items-center justify-center font-bold text-[10px] uppercase">
                                                            {article.author ? article.author.charAt(0) : 'A'}
                                                        </span>
                                                        <span>{article.author}</span>
                                                    </div>
                                                    <span>•</span>
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                        {new Date(article.published_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                                    </span>
                                                    <span>•</span>
                                                    <span className="flex items-center gap-1">
                                                        <Hash className="w-3.5 h-3.5 text-slate-400" />
                                                        Order {article.display_order}
                                                    </span>
                                                    {article.related_product_ids && article.related_product_ids.length > 0 && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="inline-flex items-center gap-1 text-indigo-600 font-semibold">
                                                                <Package className="w-3.5 h-3.5" />
                                                                {article.related_product_ids.length} Linked Product(s)
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 flex-shrink-0 bg-slate-50 p-1.5 rounded-xl border border-slate-200/60">
                                            <button
                                                onClick={() => toggleEnabled(article.id, article.is_enabled)}
                                                className="p-1.5 hover:bg-white rounded-lg transition-colors text-slate-600 shadow-2xs"
                                                title={article.is_enabled ? 'Unpublish' : 'Publish'}
                                            >
                                                {article.is_enabled ? (
                                                    <Eye className="w-4 h-4 text-emerald-600" />
                                                ) : (
                                                    <EyeOff className="w-4 h-4 text-slate-400" />
                                                )}
                                            </button>
                                            <button
                                                onClick={() => openModal(article)}
                                                className="p-1.5 hover:bg-white rounded-lg transition-colors text-blue-600 shadow-2xs"
                                                title="Edit Article"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => deleteArticle(article.id)}
                                                className="p-1.5 hover:bg-white rounded-lg transition-colors text-red-600 shadow-2xs"
                                                title="Delete Article"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Backdrop Blur Modal - Compact 2 Column Layout */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-6 overflow-y-auto">
                    <div className="bg-white rounded-2xl max-w-6xl w-full shadow-2xl my-auto border border-slate-200/80 flex flex-col max-h-[90vh]">
                        {/* Compact Header */}
                        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white rounded-t-2xl shrink-0">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <BookOpen className="w-5 h-5 text-theme-accent" />
                                    {editingArticle ? 'Edit Article' : 'Create New Article'}
                                </h3>
                                <p className="text-xs text-slate-500">Fill in article body, cover banner, author details and product links.</p>
                            </div>
                            <button
                                onClick={closeModal}
                                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* 2-Column Content Body */}
                        <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
                            {/* Left Column (Primary Content: Title, Cover Image, Preview, Body) */}
                            <div className="lg:col-span-7 space-y-4">
                                {/* Article Title */}
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                                        Article Title *
                                    </label>
                                    <input
                                        type="text"
                                        value={modalData.title}
                                        onChange={(e) => setModalData({ ...modalData, title: e.target.value })}
                                        className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-theme-accent/20 focus:border-theme-accent outline-none"
                                        placeholder="e.g., Understanding Weight Loss Plateaus and How to Overcome Them"
                                    />
                                </div>

                                {/* Cover Image */}
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                                        Cover Image (Hero Banner)
                                    </label>
                                    <div className="max-h-48 overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50 p-2">
                                        <ImageUpload
                                            currentImage={modalData.cover_image || undefined}
                                            onImageChange={(imageUrl) => setModalData({ ...modalData, cover_image: imageUrl || null })}
                                            folder="article-covers"
                                        />
                                    </div>
                                </div>

                                {/* Preview Text */}
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                                        Teaser Preview Text (Card Summary)
                                    </label>
                                    <textarea
                                        value={modalData.preview}
                                        onChange={(e) => setModalData({ ...modalData, preview: e.target.value })}
                                        rows={2}
                                        maxLength={150}
                                        className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-theme-accent/20 focus:border-theme-accent outline-none leading-relaxed"
                                        placeholder="Short 1-2 line preview (max 150 characters)"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1 text-right">
                                        {modalData.preview.length}/150 characters
                                    </p>
                                </div>

                                {/* Article Content Editor */}
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                                            Article Body Content *
                                        </label>
                                        <span className="text-[10px] text-slate-400 font-mono">
                                            Supports H2/H3, Bullet & Numbered lists, Dividers & Paragraph breaks
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 p-1.5 bg-slate-100 border border-slate-300 border-b-0 rounded-t-xl flex-wrap">
                                        {/* Basic Formatting */}
                                        <button
                                            type="button"
                                            onClick={() => applyFormat('bold')}
                                            className="p-1.5 hover:bg-slate-200 rounded-md transition-colors text-slate-700 font-bold"
                                            title="Bold (Ctrl+B)"
                                        >
                                            <Bold className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => applyFormat('italic')}
                                            className="p-1.5 hover:bg-slate-200 rounded-md transition-colors text-slate-700"
                                            title="Italic (Ctrl+I)"
                                        >
                                            <Italic className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => applyFormat('underline')}
                                            className="p-1.5 hover:bg-slate-200 rounded-md transition-colors text-slate-700"
                                            title="Underline (Ctrl+U)"
                                        >
                                            <Underline className="w-3.5 h-3.5" />
                                        </button>

                                        <div className="h-3.5 w-px bg-slate-300 mx-0.5" />

                                        {/* Headings */}
                                        <button
                                            type="button"
                                            onClick={() => applyFormat('formatBlock', '<h2>')}
                                            className="px-2 py-0.5 hover:bg-slate-200 rounded-md transition-colors text-slate-700 text-xs font-bold"
                                            title="Heading 2"
                                        >
                                            H2
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => applyFormat('formatBlock', '<h3>')}
                                            className="px-2 py-0.5 hover:bg-slate-200 rounded-md transition-colors text-slate-700 text-xs font-semibold"
                                            title="Heading 3"
                                        >
                                            H3
                                        </button>

                                        <div className="h-3.5 w-px bg-slate-300 mx-0.5" />

                                        {/* Lists */}
                                        <button
                                            type="button"
                                            onClick={() => applyFormat('insertUnorderedList')}
                                            className="px-2 py-0.5 hover:bg-slate-200 rounded-md transition-colors text-slate-700 text-xs font-medium"
                                            title="Bullet List"
                                        >
                                            • List
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => applyFormat('insertOrderedList')}
                                            className="px-2 py-0.5 hover:bg-slate-200 rounded-md transition-colors text-slate-700 text-xs font-medium"
                                            title="Numbered List"
                                        >
                                            1. List
                                        </button>

                                        <div className="h-3.5 w-px bg-slate-300 mx-0.5" />

                                        {/* Horizontal Rule Divider */}
                                        <button
                                            type="button"
                                            onClick={() => applyFormat('insertHorizontalRule')}
                                            className="px-2 py-0.5 hover:bg-slate-200 rounded-md transition-colors text-slate-700 text-xs font-medium"
                                            title="Insert Divider Line"
                                        >
                                            ― Divider
                                        </button>
                                    </div>
                                    <div
                                        ref={contentEditorRef}
                                        contentEditable
                                        onInput={handleContentChange}
                                        onBlur={handleContentChange}
                                        dangerouslySetInnerHTML={{ __html: modalData.content }}
                                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-b-xl focus:ring-2 focus:ring-theme-accent/20 focus:border-theme-accent min-h-[220px] max-h-[300px] overflow-y-auto text-xs bg-white outline-none leading-relaxed [&>p]:mb-3 [&>h2]:text-sm [&>h2]:font-bold [&>h2]:mt-4 [&>h2]:mb-2 [&>h3]:text-xs [&>h3]:font-bold [&>h3]:mt-3 [&>h3]:mb-1 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-3 [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:mb-3 [&>hr]:my-3 [&>hr]:border-slate-200"
                                    />
                                </div>
                            </div>

                            {/* Right Column (Meta Settings, Product Associations & Publishing Status) */}
                            <div className="lg:col-span-5 space-y-4 bg-slate-50/60 p-4 rounded-xl border border-slate-200/80">
                                <h4 className="text-xs font-bold text-slate-900 border-b border-slate-200 pb-2 uppercase tracking-wider flex items-center gap-1.5">
                                    <Hash className="w-4 h-4 text-theme-accent" />
                                    Publishing & Metadata
                                </h4>

                                {/* Author Name */}
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                                        Author Name
                                    </label>
                                    <input
                                        type="text"
                                        value={modalData.author}
                                        onChange={(e) => setModalData({ ...modalData, author: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-theme-accent/20 focus:border-theme-accent outline-none text-xs bg-white"
                                        placeholder="e.g. SlimDose Medical Team"
                                    />
                                </div>

                                {/* Published Date & Display Order */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                                            Publish Date
                                        </label>
                                        <input
                                            type="date"
                                            value={modalData.published_date}
                                            onChange={(e) => setModalData({ ...modalData, published_date: e.target.value })}
                                            className="w-full px-3 py-1.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-theme-accent/20 focus:border-theme-accent outline-none text-xs bg-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                                            Sort Order
                                        </label>
                                        <input
                                            type="number"
                                            value={modalData.display_order}
                                            onChange={(e) => setModalData({ ...modalData, display_order: parseInt(e.target.value) || 0 })}
                                            className="w-full px-3 py-1.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-theme-accent/20 focus:border-theme-accent outline-none text-xs bg-white"
                                        />
                                    </div>
                                </div>

                                {/* Related Products Selector */}
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wider flex items-center justify-between">
                                        <span className="flex items-center gap-1">
                                            <Package className="w-3.5 h-3.5 text-indigo-600" />
                                            Linked Products
                                        </span>
                                        {modalData.related_product_ids.length > 0 && (
                                            <span className="text-[10px] text-emerald-600 font-bold">
                                                {modalData.related_product_ids.length} selected
                                            </span>
                                        )}
                                    </label>
                                    <div className="border border-slate-200/90 rounded-xl max-h-44 overflow-y-auto bg-white">
                                        {products.length === 0 ? (
                                            <p className="text-[11px] text-slate-400 p-3">No products available</p>
                                        ) : (
                                            products.map((product) => {
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
                                                        className={`w-full flex items-center gap-2.5 p-2 text-left hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0 ${isSelected ? 'bg-emerald-50/60' : ''}`}
                                                    >
                                                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
                                                            {isSelected && <Check className="w-3 h-3 text-white" />}
                                                        </div>
                                                        {product.image_url && (
                                                            <img src={product.image_url} alt="" className="w-7 h-7 rounded-md object-cover shrink-0" />
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[11px] font-bold text-slate-900 truncate">{product.name}</p>
                                                            <p className="text-[10px] text-slate-500">₱{product.base_price.toLocaleString()}</p>
                                                        </div>
                                                    </button>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>

                                {/* Publish Visibility Toggle */}
                                <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        id="is_enabled"
                                        checked={modalData.is_enabled}
                                        onChange={(e) => setModalData({ ...modalData, is_enabled: e.target.checked })}
                                        className="w-4 h-4 text-theme-accent rounded focus:ring-2 focus:ring-theme-accent"
                                    />
                                    <div>
                                        <label htmlFor="is_enabled" className="text-xs font-bold text-slate-900 block cursor-pointer">
                                            Publish to Customer Website
                                        </label>
                                        <p className="text-[10px] text-slate-500">
                                            {modalData.is_enabled ? 'Article will be visible to all visitors' : 'Article remains in draft status'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Compact Footer */}
                        <div className="px-6 py-3 border-t border-slate-200 flex justify-end gap-2.5 bg-slate-50/80 rounded-b-2xl shrink-0">
                            <button
                                onClick={closeModal}
                                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveArticle}
                                className="px-5 py-2 bg-theme-accent text-white rounded-xl text-xs font-semibold hover:opacity-95 transition-opacity shadow-xs"
                            >
                                {editingArticle ? 'Save Changes' : 'Create Article'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
