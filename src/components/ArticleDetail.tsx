import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
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
  FlaskConical,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  Droplets,
  Clock,
  Activity,
  ShieldCheck,
  Zap,
  ChevronRight,
  HeartPulse,
  Syringe
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

interface DosageEntry {
  strength: string;
  reconstituteBac: string;
  doseDetails: string;
  frequency: string;
  rawText: string;
}

interface TitrationStep {
  weeks: string;
  dose: string;
  phase: 'Starter' | 'Titration' | 'Target' | 'Maintenance';
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
  const { globalDiscount } = useGlobalDiscount();

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([]);
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
  const [activeStrengthTab, setActiveStrengthTab] = useState<string>('');

  useEffect(() => {
    if (id) {
      fetchArticle(id);
      try {
        const saved = localStorage.getItem('slimdose_saved_articles');
        if (saved) {
          const list: string[] = JSON.parse(saved);
          setIsBookmarked(list.includes(id));
        }
      } catch {}
    }
  }, [id]);

  const fetchArticle = async (articleId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('guide_topics')
        .select('*')
        .eq('id', articleId)
        .eq('is_enabled', true)
        .single();

      if (error) throw error;

      if (data) {
        setArticle(data);
        if (data.related_product_ids && data.related_product_ids.length > 0) {
          fetchRelatedProducts(data.related_product_ids);
        }
      }
    } catch (error) {
      console.error('Error fetching article:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedProducts = async (productIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, description, category, purity_percentage, base_price, discount_price, discount_active, image_url, variations:product_variations(id, name, price)')
        .in('id', productIds);

      if (error) throw error;
      const prods = data || [];
      setRelatedProducts(prods);

      const initVars: Record<string, string> = {};
      prods.forEach((p) => {
        if (p.variations && p.variations.length > 0) {
          initVars[p.id] = p.variations[0].id;
        }
      });
      setSelectedVariations(initVars);
    } catch (error) {
      console.error('Error fetching related products:', error);
    }
  };

  // Structured Protocol Parser with Automatic HTML Stripper & Entity Decoupler
  const parsedData = useMemo(() => {
    if (!article?.content) return null;
    let content = article.content;

    // Convert HTML tags to clean formatted text if HTML was pasted
    if (content.includes('<') && (content.includes('</') || content.includes('/>') || content.includes('<p'))) {
      const temp = document.createElement('div');
      temp.innerHTML = content;
      temp.querySelectorAll('p, div, br, li, h1, h2, h3, h4, tr').forEach((el) => {
        el.after(document.createTextNode('\n'));
      });
      content = (temp.textContent || temp.innerText || '')
        .replace(/\r\n/g, '\n')
        .replace(/\n\s*\n\s*\n+/g, '\n\n')
        .trim();
    }

    const hasStrengths = /Strength:/i.test(content);
    const hasDosage = /Dosage\s*&\s*Frequency:/i.test(content) || /Reconstitute/i.test(content);
    const hasSchedule = /Dosing\s*Schedule/i.test(content);

    if (!hasStrengths && !hasDosage && !hasSchedule) {
      return null;
    }

    const getSectionText = (startMarker: string, endMarkers: string[]): string => {
      const startIdx = content.search(new RegExp(startMarker, 'i'));
      if (startIdx === -1) return '';

      let endIdx = content.length;
      for (const endMarker of endMarkers) {
        const idx = content.substring(startIdx + 5).search(new RegExp(endMarker, 'i'));
        if (idx !== -1 && startIdx + 5 + idx < endIdx) {
          endIdx = startIdx + 5 + idx;
        }
      }

      const match = content.slice(startIdx, endIdx);
      return match.replace(new RegExp(`^${startMarker}.*?\n`, 'i'), '').trim();
    };

    // Strengths
    const strengthMatch = content.match(/Strength:\s*([^\n\r]+)/i);
    const strengths = strengthMatch
      ? strengthMatch[1].split(/[•|,|\/]/).map((s) => s.trim()).filter(Boolean)
      : [];

    // Category
    const categoryMatch = content.match(/Category:\s*([^\n\r]+)/i);
    const category = categoryMatch ? categoryMatch[1].trim() : 'Advanced Peptide Protocol';

    // How it works
    const howItWorks = getSectionText('How it works:', [
      'Key Benefits:',
      'Dosage & Frequency:',
      'Recommended Cycle:',
      'Common Side Effects:',
      'Dosing Schedule'
    ]);

    // Key Benefits
    const benefitsText = getSectionText('Key Benefits:', [
      'Dosage & Frequency:',
      'Recommended Cycle:',
      'Common Side Effects:',
      'Tips:',
      'Dosing Schedule'
    ]);
    const benefits = benefitsText
      .split('\n')
      .map((l) => l.replace(/^[-•*]\s*/, '').trim())
      .filter((l) => l.length > 0);

    // Dosage & Frequency breakdown per strength
    const dosageSectionText = getSectionText('Dosage & Frequency:', [
      'Recommended Cycle:',
      'Common Side Effects:',
      'Tips:',
      'Dosing Schedule',
      'Dosing Advice:'
    ]);

    const dosageEntries: DosageEntry[] = [];
    if (dosageSectionText) {
      const blocks = dosageSectionText.split(/\n(?=(?:10|15|20|30|40|50|60|5|2\.5)\s*mg\b)/i);
      for (const b of blocks) {
        const lines = b.split('\n').map((l) => l.trim()).filter(Boolean);
        if (lines.length > 0) {
          const strMatch = lines[0].match(/^(\d+(?:\.\d+)?\s*mg)/i);
          const strength = strMatch ? strMatch[1].toUpperCase() : lines[0].replace(/[-:]/g, '').trim();

          let reconstituteBac = '';
          let doseDetails = '';
          let frequency = 'Once weekly';

          for (const line of lines) {
            if (/reconstitute/i.test(line)) {
              reconstituteBac = line.replace(/^[-•*]?\s*reconstitute\s*(?:with)?\s*/i, '').trim();
            } else if (/dose:/i.test(line)) {
              doseDetails = line.replace(/^[-•*]?\s*dose:\s*/i, '').trim();
            } else if (/frequency:/i.test(line)) {
              frequency = line.replace(/^[-•*]?\s*frequency:\s*/i, '').trim();
            }
          }

          if (strength) {
            dosageEntries.push({
              strength,
              reconstituteBac: reconstituteBac || '1.0 mL – 2.0 mL BAC Water',
              doseDetails: doseDetails || lines.slice(1).join(' • '),
              frequency: frequency || 'Once weekly',
              rawText: b
            });
          }
        }
      }
    }

    // Recommended Cycle
    const cycleMatch = content.match(/Recommended\s*Cycle:\s*([^\n\r]+)/i);
    const recommendedCycle = cycleMatch ? cycleMatch[1].trim() : 'Continuous (per titration protocol)';

    // Common Side Effects
    const sideEffectsText = getSectionText('Common Side Effects:', [
      'Tips:',
      'Dosing Schedule',
      'Dosing Advice:'
    ]);
    const sideEffects = sideEffectsText
      .split('\n')
      .map((l) => l.replace(/^[-•*]\s*/, '').trim())
      .filter((l) => l.length > 0);

    // Tips
    const tipsText = getSectionText('Tips:', ['Dosing Schedule', 'Dosing Advice:']);
    const tips = tipsText
      .split('\n')
      .map((l) => l.replace(/^[-•*]\s*/, '').trim())
      .filter((l) => l.length > 0);

    // Dosing Schedule (Titration timeline)
    const scheduleText = getSectionText('Dosing Schedule', ['Dosing Advice:']);
    const titrationSteps: TitrationStep[] = [];
    if (scheduleText) {
      const lines = scheduleText.split('\n').map((l) => l.trim()).filter(Boolean);
      for (const line of lines) {
        const stepMatch = line.match(/(Week[s]?\s*[\d\s\-+]+)[:\-]\s*([^\n\r]+)/i);
        if (stepMatch) {
          const weeks = stepMatch[1].trim();
          const dose = stepMatch[2].trim();
          let phase: TitrationStep['phase'] = 'Titration';
          if (weeks.toLowerCase().includes('1-4') || weeks.toLowerCase().includes('1 to 4')) phase = 'Starter';
          else if (weeks.includes('21+') || weeks.toLowerCase().includes('maintenance')) phase = 'Maintenance';
          else if (dose.includes('15mg') || dose.includes('12.5mg')) phase = 'Target';

          titrationSteps.push({ weeks, dose, phase });
        }
      }
    }

    // Dosing Advice
    const adviceIdx = content.search(/Dosing\s*Advice:/i);
    let dosingAdvice = '';
    if (adviceIdx !== -1) {
      dosingAdvice = content.slice(adviceIdx).replace(/^Dosing\s*Advice:\s*/i, '').trim();
    }

    return {
      strengths,
      category,
      howItWorks,
      benefits,
      dosageEntries,
      recommendedCycle,
      sideEffects,
      tips,
      titrationSteps,
      dosingAdvice
    };
  }, [article?.content]);

  // Default active strength tab
  useEffect(() => {
    if (parsedData?.dosageEntries && parsedData.dosageEntries.length > 0 && !activeStrengthTab) {
      setActiveStrengthTab(parsedData.dosageEntries[0].strength);
    }
  }, [parsedData]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800">
          <div className="animate-spin w-10 h-10 border-4 border-[#3C6CA8] border-t-transparent rounded-full" />
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Loading Clinical Protocol...</p>
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
          <p className="text-xs text-slate-500">The requested peptide guide or article is currently unavailable or has been archived.</p>
          <button
            onClick={() => navigate('/peptalk')}
            className="w-full py-2.5 bg-[#3C6CA8] hover:bg-[#315A8E] text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer"
          >
            Return to PepTalk Center
          </button>
        </div>
      </div>
    );
  }

  const selectedDosage = parsedData?.dosageEntries.find((d) => d.strength === activeStrengthTab) || parsedData?.dosageEntries[0];

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors pb-24 text-left">
      {/* Sticky Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="max-w-6xl mx-auto px-3.5 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2">
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

      {/* Main Content Area — Single Unified Document */}
      <main className="max-w-4xl mx-auto px-3 sm:px-6 pt-3 sm:pt-6 space-y-4">
        {/* Unified Document Container */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/80">
          {/* ─── 1. Header & Meta Section ─── */}
          <section className="p-4 sm:p-6 sm:pb-7 space-y-3">
            {/* Badges & Meta Row */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-xs">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-extrabold bg-[#3C6CA8]/10 text-[#3C6CA8] border border-[#3C6CA8]/20">
                <Sparkles className="w-3 h-3 text-[#3C6CA8]" />
                {parsedData?.category || 'Clinical Protocol'}
              </span>

              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/40">
                <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                Verified Research
              </span>

              <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] text-slate-400 ml-auto font-mono">
                <Clock className="w-3 h-3" />
                ~4 min read
              </span>
            </div>

            {/* Title */}
            <h1 className="text-lg sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
              {article.title}
            </h1>

            {/* Author and Date strip */}
            <div className="flex items-center gap-3 sm:gap-4 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 pt-1">
              <div className="flex items-center gap-1.5 font-medium truncate">
                <div className="w-4.5 h-4.5 rounded-full bg-blue-100 dark:bg-blue-950 text-[#3C6CA8] flex items-center justify-center font-bold text-[9px] shrink-0">
                  <User className="w-2.5 h-2.5" />
                </div>
                <span className="truncate">By {article.author || 'SlimDose Research Team'}</span>
              </div>

              <div className="flex items-center gap-1.5 font-medium shrink-0">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>
                  {new Date(article.published_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </div>

            {/* Executive Teaser Excerpt Summary (Rich HTML) */}
            {article.preview && (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-slate-700 dark:text-slate-300 leading-relaxed">
                <div
                  className="peptalk-article-content text-xs sm:text-sm"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.preview) }}
                />
              </div>
            )}

            {/* Strengths Available Pills */}
            {parsedData?.strengths && parsedData.strengths.length > 0 && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <FlaskConical className="w-3 h-3 text-[#3C6CA8]" />
                  Available Formulations &amp; Strengths
                </p>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {parsedData.strengths.map((str, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-0.5 rounded-lg text-[11px] sm:text-xs font-black bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 shrink-0"
                    >
                      {str}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* ─── Structured Protocol Content Display ─── */}
          {parsedData ? (
            <>
              {/* 2. Mechanism of Action ("How it works") */}
              {parsedData.howItWorks && (
                <section className="p-4 sm:p-6 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-blue-50 text-[#3C6CA8] dark:bg-blue-950/60 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200/40">
                      <HeartPulse className="w-3.5 h-3.5" />
                    </div>
                    <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                      Mechanism of Action (How It Works)
                    </h2>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                    {parsedData.howItWorks}
                  </p>
                </section>
              )}

              {/* 3. Key Benefits List */}
              {parsedData.benefits && parsedData.benefits.length > 0 && (
                <section className="p-4 sm:p-6 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200/40">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                      Key Research Benefits &amp; Objectives
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {parsedData.benefits.map((benefit, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-start gap-2 text-xs sm:text-sm"
                      >
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0 mt-0.5">✓</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200 leading-snug">
                          {benefit}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 4. Reconstitution & Dosage Matrix */}
              {parsedData.dosageEntries && parsedData.dosageEntries.length > 0 && (
                <section className="p-4 sm:p-6 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-[#3C6CA8]/10 text-[#3C6CA8] flex items-center justify-center shrink-0 border border-[#3C6CA8]/20">
                        <FlaskConical className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-tight">
                          Reconstitution &amp; Dosage Matrix
                        </h2>
                        <p className="text-[10px] sm:text-[11px] text-slate-400">Select vial size for exact mixing instructions</p>
                      </div>
                    </div>

                    <button
                      onClick={() => navigate('/peptide-calculator')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#3C6CA8]/10 hover:bg-[#3C6CA8]/20 text-[#3C6CA8] rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer border border-[#3C6CA8]/20"
                    >
                      <Calculator className="w-3 h-3" />
                      <span>Calculator</span>
                    </button>
                  </div>

                  {/* Strength Tab Buttons */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {parsedData.dosageEntries.map((entry) => {
                      const isSelected = (activeStrengthTab || parsedData.dosageEntries[0].strength) === entry.strength;
                      return (
                        <button
                          key={entry.strength}
                          type="button"
                          onClick={() => setActiveStrengthTab(entry.strength)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer border ${
                            isSelected
                              ? 'bg-[#3C6CA8] text-white border-[#3C6CA8] shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#3C6CA8]/50'
                          }`}
                        >
                          {entry.strength}
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected Strength Details */}
                  {selectedDosage && (
                    <div className="bg-slate-50 dark:bg-slate-800/40 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2.5">
                      <div className="flex items-center justify-between flex-wrap gap-1.5 border-b border-slate-200/70 dark:border-slate-700 pb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 bg-[#3C6CA8] text-white text-[10.5px] font-black rounded">
                            {selectedDosage.strength}
                          </span>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            Recommended Preparation Protocol
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Frequency: <strong className="text-slate-800 dark:text-slate-200">{selectedDosage.frequency}</strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {/* Step 1: Reconstitution */}
                        <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200/80 dark:border-slate-700 space-y-0.5">
                          <div className="flex items-center gap-1 text-[11px] font-bold text-[#3C6CA8]">
                            <Droplets className="w-3.5 h-3.5" />
                            <span>1. Reconstitution Volume</span>
                          </div>
                          <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                            {selectedDosage.reconstituteBac}
                          </p>
                          <p className="text-[10.5px] text-slate-400 leading-tight">
                            Slowly slide down glass vial wall; swirl gently and never shake.
                          </p>
                        </div>

                        {/* Step 2: Dosing & Yield */}
                        <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200/80 dark:border-slate-700 space-y-0.5">
                          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                            <Syringe className="w-3.5 h-3.5" />
                            <span>2. Dose &amp; Yield</span>
                          </div>
                          <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                            {selectedDosage.doseDetails}
                          </p>
                          <p className="text-[10.5px] text-slate-400 leading-tight">
                            Administer subcutaneously into fatty tissue once every 7 days.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* 5. Titration & Escalation Schedule */}
              {parsedData.titrationSteps && parsedData.titrationSteps.length > 0 && (
                <section className="p-4 sm:p-6 space-y-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-200/40">
                        <Activity className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-tight">
                          Dosing Titration Schedule
                        </h2>
                        <p className="text-[10px] sm:text-[11px] text-slate-400">Standard 4-week step-up escalation protocol</p>
                      </div>
                    </div>
                    <span className="text-[9.5px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded border border-amber-200/50">
                      Not Medical Advice
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {parsedData.titrationSteps.map((step, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700 flex items-center justify-between"
                      >
                        <div>
                          <span className="font-mono text-[11px] font-bold text-slate-400 block">
                            {step.weeks}
                          </span>
                          <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                            {step.dose}
                          </p>
                        </div>
                        <span
                          className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border ${
                            step.phase === 'Starter'
                              ? 'bg-blue-50 text-blue-600 border-blue-200'
                              : step.phase === 'Maintenance'
                                ? 'bg-purple-50 text-purple-600 border-purple-200'
                                : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                          }`}
                        >
                          {step.phase}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 6. Safety, Side Effects & Pro Tips */}
              <section className="p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Side Effects */}
                  {parsedData.sideEffects && parsedData.sideEffects.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-md bg-amber-50 text-amber-600 dark:bg-amber-950/60 flex items-center justify-center shrink-0 border border-amber-200/40">
                          <AlertCircle className="w-3 h-3" />
                        </div>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                          Potential Side Effects
                        </h3>
                      </div>
                      <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                        {parsedData.sideEffects.map((effect, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-amber-500 font-bold">•</span>
                            <span>{effect}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Tips & Protocol Advice */}
                  {(parsedData.tips?.length > 0 || parsedData.dosingAdvice) && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-md bg-blue-50 text-[#3C6CA8] dark:bg-blue-950/60 flex items-center justify-center shrink-0 border border-blue-200/40">
                          <Zap className="w-3 h-3" />
                        </div>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                          Best Practices &amp; Advice
                        </h3>
                      </div>
                      {parsedData.tips && parsedData.tips.length > 0 && (
                        <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300 mb-1">
                          {parsedData.tips.map((tip, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-[#3C6CA8] font-bold">✓</span>
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {parsedData.dosingAdvice && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed italic border-t border-slate-100 dark:border-slate-800 pt-1.5">
                          &ldquo;{parsedData.dosingAdvice}&rdquo;
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </section>
            </>
          ) : (
            /* Fallback for standard HTML or narrative articles from admin */
            <article className="p-4 sm:p-7">
              <div
                className="peptalk-article-content max-w-none text-slate-800 dark:text-slate-200 leading-relaxed text-xs sm:text-sm font-normal"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.content) }}
              />
            </article>
          )}

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