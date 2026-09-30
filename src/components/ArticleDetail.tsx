import { useState, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  User,
  ShoppingCart,
  Package,
  Check,
  Copy,
  Share2,
  Bookmark,
  BookmarkCheck,
  Calculator,
  Clock,
  ShieldCheck,
  ChevronRight,
  BookOpen,
  AlertCircle
} from 'lucide-react';
import { useGlobalDiscount } from '../hooks/useGlobalDiscount';
import { getGlobalDiscountedPrice } from '../utils/pricing';
import { fireToast } from './ToastNotification';

interface Article {
  id: string;
  title: string;
  preview: string | null;
  content: string;
  cover_image: string | null;
  author: string;
  published_date: string;
  related_product_ids: string[] | null;
}

interface RelatedProduct {
  id: string;
  name: string;
  description?: string;
  category?: string;
  purity_percentage?: number;
  base_price: number;
  discount_price: number | null;
  discount_active: boolean;
  image_url: string | null;
  variations: { id: string; name: string; price: number }[] | null;
}

const sanitizeHtml = (html: string): string => {
  const temp = document.createElement('div');
  temp.innerHTML = html;
  const scripts = temp.querySelectorAll('script');
  scripts.forEach((s) => s.remove());

  const allElements = temp.querySelectorAll('*');
  allElements.forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      if (attr.name.startsWith('on') || (attr.name === 'href' && attr.value.startsWith('javascript:'))) {
        el.removeAttribute(attr.name);
      }
    });
  });
  return temp.innerHTML;
};

export default function ArticleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { globalDiscount } = useGlobalDiscount();

  // Optimistic initial resolution (Router State -> Session/Local Cache -> Bundled Scraped Guides)
  const initialArticle = useMemo<Article | null>(() => {
    if (!id) return null;
    // 1. Passed via router navigation state
    const routerArticle = (location.state as { article?: Article } | null)?.article;
    if (routerArticle && (routerArticle.id === id || String(routerArticle.id) === String(id))) {
      return routerArticle;
    }
    // 2. Specific article cached in sessionStorage
    try {
      const cachedDirect = sessionStorage.getItem(`peptalk_article_${id}`);
      if (cachedDirect) return JSON.parse(cachedDirect);
    } catch {}
    // 3. Articles list cache in localStorage (SmartGuide cache)
    try {
      const cachedList = localStorage.getItem('peptalk_cached_articles');
      if (cachedList) {
        const parsed = JSON.parse(cachedList);
        if (Array.isArray(parsed)) {
          const match = parsed.find((a: any) => a.id === id || String(a.id) === String(id));
          if (match) return match;
        }
      }
    } catch {}
    return null;
  }, [id, location.state]);

  const [article, _setArticle] = useState<Article | null>(initialArticle);
  const [loading, _setLoading] = useState<boolean>(!initialArticle);
  const [fetchError, _setFetchError] = useState<string | null>(null);
  const [relatedProducts, _setRelatedProducts] = useState<RelatedProduct[]>([]);
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>({});
  const [addedToCart, setAddedToCart] = useState<Set<string>>(new Set());
  const [cartItemCount, setCartItemCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('peptide_cart');
      return saved ? JSON.parse(saved).reduce((sum: number, i: any) => sum + (i.quantity || 1), 0) : 0;
    } catch {
      return 0;
    }
  });

  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  // Extract category if specified in content (e.g. "Category: Cellular Energy...") or fallback
  const articleCategory = useMemo(() => {
    if (!article?.content) return 'Peptide Education';
    const match = article.content.match(/Category:\s*([^<\n\r]+)/i);
    if (match && match[1]) {
      return match[1].replace(/<[^>]*>/g, '').trim();
    }
    return 'Peptide Education';
  }, [article?.content]);

  // Toggle Bookmark
  const handleToggleBookmark = () => {
    if (!article) return;
    try {
      const saved = localStorage.getItem('slimdose_saved_articles');
      const list: string[] = saved ? JSON.parse(saved) : [];
      let nextList: string[];
      if (list.includes(article.id)) {
        nextList = list.filter((x) => x !== article.id);
        setIsBookmarked(false);
        fireToast('Protocol removed from bookmarks', 'info');
      } else {
        nextList = [...list, article.id];
        setIsBookmarked(true);
        fireToast('Protocol saved to bookmarks! 📑', 'success');
      }
      localStorage.setItem('slimdose_saved_articles', JSON.stringify(nextList));
    } catch {}
  };

  // Copy Protocol Summary
  const handleCopyProtocol = () => {
    if (!article) return;
    const textToCopy = `📋 ${article.title}\n\n${article.content}\n\nSource: SlimDose Medical Protocols (https://slimdose.com)`;
    navigator.clipboard.writeText(textToCopy);
    fireToast('Full protocol copied to clipboard! 📋', 'success');
  };

  // Share Article
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: article?.title || 'SlimDose Peptide Protocol',
          text: `Check out this expert peptide protocol: ${article?.title}`,
          url: window.location.href
        });
      } catch {}
    } else {
      navigator.clipboard.writeText(window.location.href);
      fireToast('Link copied to clipboard! 🔗', 'info');
    }
  };

  // Add to cart handler
  const handleAddToCart = (product: RelatedProduct) => {
    const selectedVarId = selectedVariations[product.id];
    const chosenVariation = product.variations?.find((v) => v.id === selectedVarId) || product.variations?.[0];

    const newCartItem = {
      product: {
        id: product.id,
        name: product.name,
        description: product.description || '',
        category: product.category || '',
        base_price: product.base_price,
        discount_price: product.discount_price,
        discount_start_date: null,
        discount_end_date: null,
        discount_active: product.discount_active,
        purity_percentage: product.purity_percentage || 99,
        molecular_weight: null,
        cas_number: null,
        sequence: null,
        storage_conditions: '',
        inclusions: null,
        stock_quantity: 999,
        available: true,
        featured: false,
        image_url: product.image_url,
        safety_sheet_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      variation: chosenVariation
        ? {
            id: chosenVariation.id,
            product_id: product.id,
            name: chosenVariation.name,
            quantity_mg: 0,
            price: chosenVariation.price,
            discount_price: null,
            discount_active: false,
            stock_quantity: 999,
            created_at: new Date().toISOString()
          }
        : undefined,
      quantity: 1,
      price: product.discount_active && product.discount_price
        ? product.discount_price
        : chosenVariation ? chosenVariation.price : product.base_price
    };

    try {
      const savedCart = localStorage.getItem('peptide_cart');
      const cartItems = savedCart ? JSON.parse(savedCart) : [];

      const existingIndex = cartItems.findIndex(
        (item: any) =>
          item.product.id === newCartItem.product.id &&
          (newCartItem.variation ? item.variation?.id === newCartItem.variation.id : !item.variation)
      );

      if (existingIndex > -1) {
        cartItems[existingIndex].quantity += 1;
      } else {
        cartItems.push(newCartItem);
      }

      localStorage.setItem('peptide_cart', JSON.stringify(cartItems));
      const totalCount = cartItems.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0);
      setCartItemCount(totalCount);
    } catch (error) {
      console.error('Error adding to cart:', error);
    }

    setAddedToCart((prev) => new Set([...prev, product.id]));
    fireToast(`Added ${product.name} to your cart! 🛍️`, 'success');

    setTimeout(() => {
      setAddedToCart((prev) => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
    }, 2000);
  };

  const getProductPricing = (product: RelatedProduct) => {
    const selectedVarId = selectedVariations[product.id];
    const activeVar = product.variations?.find((v) => v.id === selectedVarId);

    const baseFromPrice = activeVar
      ? activeVar.price
      : product.variations && product.variations.length > 0
        ? Math.min(...product.variations.map((v) => v.price))
        : product.base_price;

    const individualPrice = product.discount_active && product.discount_price
      ? product.discount_price
      : baseFromPrice;

    const globalResult = getGlobalDiscountedPrice(baseFromPrice, product.id, globalDiscount);
    const finalPrice = globalResult.hasGlobalDiscount && globalResult.price < individualPrice
      ? globalResult.price
      : individualPrice;

    return {
      originalPrice: baseFromPrice,
      price: finalPrice,
      hasDiscount: finalPrice < baseFromPrice
    };
  };

  if (loading && !article) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 animate-pulse">
        {/* Skeleton Top Bar */}
        <div className="border-b border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 h-14">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
            <div className="w-24 h-5 bg-slate-200 dark:bg-slate-800 rounded-lg" />
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-slate-200 dark:bg-slate-800 rounded-full" />
              <div className="w-8 h-8 bg-slate-200 dark:bg-slate-800 rounded-full" />
            </div>
          </div>
        </div>

        {/* Skeleton Hero Banner */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
            <div className="w-32 h-6 bg-slate-200 dark:bg-slate-800 rounded-full" />
            <div className="w-3/4 h-8 sm:h-10 bg-slate-200 dark:bg-slate-800 rounded-xl" />
            <div className="w-1/2 h-4 bg-slate-200 dark:bg-slate-800 rounded-lg" />
            <div className="flex gap-4 pt-2">
              <div className="w-24 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="w-24 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
            </div>
          </div>
        </div>

        {/* Skeleton Content Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="w-full h-4 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="w-11/12 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="w-4/5 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="w-3/4 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
            </div>
          </div>
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 h-64" />
          </div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Protocol Not Found</h2>
          <p className="text-xs text-slate-500">
            {fetchError ? 'Unable to reach the scientific protocol database. Please check your connection.' : 'The requested peptide guide or article is currently unavailable or has been archived.'}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Retry
            </button>
            <button
              onClick={() => navigate('/peptalk')}
              className="flex-1 py-2.5 bg-[#3C6CA8] hover:bg-[#315A8E] text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer"
            >
              Back to PepTalk
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors pb-24 text-left">
      {/* Sticky Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="max-w-5xl mx-auto px-3.5 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2">
          {/* Back button & Breadcrumb */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => navigate('/peptalk')}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all cursor-pointer group shrink-0"
              title="Return to PepTalk Content Center"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span className="hidden xs:inline">PepTalk</span>
            </button>

            <div className="flex items-center gap-1.5 text-xs text-slate-400 min-w-0 truncate">
              <ChevronRight className="w-3.5 h-3.5 shrink-0 hidden sm:inline" />
              <span className="font-bold text-slate-800 dark:text-slate-200 truncate hidden sm:inline">{article.title}</span>
            </div>
          </div>

          {/* Quick Action Tools */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              onClick={() => navigate('/peptide-calculator')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-[#3C6CA8] bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 rounded-xl border border-blue-200/60 dark:border-blue-800/60 transition-all cursor-pointer"
              title="Open Peptide Calculator"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Calculator</span>
            </button>

            <button
              onClick={handleCopyProtocol}
              className="p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition-all cursor-pointer flex items-center gap-1.5"
              title="Copy Summary"
            >
              <Copy className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Copy</span>
            </button>

            <button
              onClick={handleToggleBookmark}
              className={`p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                isBookmarked
                  ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 border-amber-300 dark:border-amber-700'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700'
              }`}
              title={isBookmarked ? 'Bookmarked' : 'Save Protocol'}
            >
              {isBookmarked ? <BookmarkCheck className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> : <Bookmark className="w-3.5 h-3.5" />}
              <span className="hidden lg:inline">{isBookmarked ? 'Saved' : 'Save'}</span>
            </button>

            <button
              onClick={handleShare}
              className="p-1.5 sm:p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
              title="Share Article"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>

            {/* Cart Icon */}
            {cartItemCount > 0 && (
              <button
                onClick={() => navigate('/cart')}
                className="relative p-1.5 sm:px-3 sm:py-1.5 bg-[#3C6CA8] text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm hover:bg-[#315A8E] transition-all cursor-pointer"
                title="View Shopping Cart"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cart</span>
                <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black flex items-center justify-center ml-0.5">
                  {cartItemCount}
                </span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area — Clean Unified Document Matching Backend Admin */}
      <main className="max-w-4xl mx-auto px-3 sm:px-6 pt-4 sm:pt-7 space-y-5">
        {/* Unified Document Container */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* ─── Hero Cover Banner (if provided) ─── */}
          {article.cover_image && (
            <div className="w-full h-52 sm:h-72 lg:h-80 relative overflow-hidden bg-slate-100 dark:bg-slate-800 border-b border-slate-200/80 dark:border-slate-800">
              <img
                src={article.cover_image}
                alt={article.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* ─── Header & Metadata ─── */}
          <section className="p-5 sm:p-8 space-y-4 border-b border-slate-100 dark:border-slate-800">
            {/* Badges & Meta Row */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#3C6CA8]/10 text-[#3C6CA8] dark:bg-[#3C6CA8]/20 dark:text-blue-300 border border-[#3C6CA8]/20">
                <BookOpen className="w-3.5 h-3.5 text-[#3C6CA8] dark:text-blue-400" />
                {articleCategory}
              </span>

              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/40">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Verified Research
              </span>

              <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 ml-auto font-mono">
                <Clock className="w-3.5 h-3.5" />
                ~4 min read
              </span>
            </div>

            {/* Title */}
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug">
              {article.title}
            </h1>

            {/* Author and Date strip */}
            <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1">
              <div className="flex items-center gap-1.5 font-medium truncate">
                <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 text-[#3C6CA8] flex items-center justify-center font-bold text-[10px] shrink-0">
                  <User className="w-3 h-3" />
                </div>
                <span className="truncate">By {article.author || 'SlimDose Research Team'}</span>
              </div>

              <div className="flex items-center gap-1.5 font-medium shrink-0">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {new Date(article.published_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </div>

            {/* Executive Teaser Excerpt Summary (if provided in admin) */}
            {article.preview && (
              <div className="mt-3 p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-slate-700 dark:text-slate-300 leading-relaxed">
                <div
                  className="peptalk-article-content text-xs sm:text-sm font-normal"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.preview) }}
                />
              </div>
            )}
          </section>

          {/* ─── Main Article Content: Pure formatted text & bullet points from backend ─── */}
          <article className="p-5 sm:p-8">
            <div
              className="peptalk-article-content max-w-none text-slate-800 dark:text-slate-200 leading-relaxed text-sm sm:text-base font-normal space-y-2"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.content) }}
            />
          </article>

          {/* ─── 7. Featured Products Mentioned Section ─── */}
          {relatedProducts.length > 0 && (
            <section className="p-4 sm:p-6 space-y-3 bg-slate-50/50 dark:bg-slate-950/30">
              <div className="flex items-center justify-between flex-wrap gap-1.5 border-b border-slate-200/70 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-[#3C6CA8] text-white flex items-center justify-center shadow-xs">
                    <Package className="w-3 h-3" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-tight">
                      Featured Research Compounds
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-slate-400">Products referenced in this protocol</p>
                  </div>
                </div>

                <span className="text-[10px] sm:text-xs font-bold text-[#3C6CA8] bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-full border border-blue-200/50">
                  {relatedProducts.length} Available
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {relatedProducts.map((product) => {
                  const pricing = getProductPricing(product);
                  const hasVariations = product.variations && product.variations.length > 0;
                  const isAdded = addedToCart.has(product.id);

                  return (
                    <div
                      key={product.id}
                      className="bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700 p-3 flex flex-col justify-between hover:border-[#3C6CA8]/50 transition-all shadow-2xs group"
                    >
                      <div className="flex gap-2.5">
                        {/* Product Thumbnail */}
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 flex items-center justify-center p-1">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <Package className="w-6 h-6 text-slate-300" />
                          )}
                        </div>

                        {/* Info & Pricing */}
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {product.purity_percentage ? `${product.purity_percentage}% Purity` : 'HPLC Tested'}
                          </span>
                          <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                            {product.name}
                          </h4>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                              ₱{pricing.price.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                            </span>
                            {pricing.hasDiscount && (
                              <span className="text-[10px] text-slate-400 line-through">
                                ₱{pricing.originalPrice.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Variations Selector if available */}
                      {hasVariations && product.variations!.length > 1 && (
                        <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
                          {product.variations!.map((v) => {
                            const isVarSelected = (selectedVariations[product.id] || product.variations![0].id) === v.id;
                            return (
                              <button
                                key={v.id}
                                type="button"
                                onClick={() => setSelectedVariations((prev) => ({ ...prev, [product.id]: v.id }))}
                                className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold transition-all cursor-pointer shrink-0 border ${
                                  isVarSelected
                                    ? 'bg-[#3C6CA8] text-white border-[#3C6CA8]'
                                    : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                {v.name}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Add To Cart Button */}
                      <button
                        type="button"
                        onClick={() => handleAddToCart(product)}
                        disabled={isAdded}
                        className={`w-full mt-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-98 ${
                          isAdded
                            ? 'bg-emerald-600 text-white'
                            : 'bg-[#3C6CA8] hover:bg-[#315A8E] text-white'
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Added!</span>
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="w-3 h-3" />
                            <span>Add to Cart</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* Bottom Navigation */}
        <div className="pt-2 flex items-center justify-between flex-wrap gap-2">
          <button
            onClick={() => navigate('/peptalk')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to PepTalk Center</span>
          </button>

          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer ml-auto"
          >
            ↑ Back to Top
          </button>
        </div>
      </main>
    </div>
  );
}