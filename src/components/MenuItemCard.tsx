import React, { useState, useEffect } from 'react';
import { Flame, Sparkles, Zap, Tag, Atom, ShieldCheck, Heart } from 'lucide-react';
import { fireToast } from './ToastNotification';
import type { Product, ProductVariation, GlobalDiscount, ProductBundleTier } from '../types';
import { resolveProductPricing } from '../utils/pricing';

interface MenuItemCardProps {
  product: Product;
  onAddToCart?: (product: Product, variation?: ProductVariation, quantity?: number) => void;
  cartQuantity?: number;
  onUpdateQuantity?: (index: number, quantity: number) => void;
  onProductClick?: (product: Product) => void;
  globalDiscount?: GlobalDiscount | null;
  bundleTiers?: ProductBundleTier[];
}

// Preload the ProductPage chunk on hover so it's ready before click
let productPagePrefetched = false;
const prefetchProductPage = () => {
  if (!productPagePrefetched) {
    productPagePrefetched = true;
    import('./ProductPage');
  }
};

const MenuItemCard: React.FC<MenuItemCardProps> = ({
  product,
  cartQuantity = 0,
  onProductClick,
  globalDiscount,
  bundleTiers = [],
}) => {
  const [imageError, setImageError] = useState(false);

  const soldCount = Number(product.sales_count || 0);

  const firstAvailableVariation = product.variations && product.variations.length > 0
    ? (product.variations.find((v) => v.stock_quantity > 0) || product.variations[0])
    : undefined;

  const pricing = resolveProductPricing(product, firstAvailableVariation, globalDiscount);
  const currentPrice = pricing.price;
  const hasDiscount = pricing.hasDiscount;
  const originalPrice = pricing.originalPrice;
  const hasMultipleVariations = (product.variations?.length ?? 0) > 1;

  const hasAnyStock = product.variations && product.variations.length > 0
    ? product.variations.some((v) => v.stock_quantity > 0)
    : product.stock_quantity > 0;

  const isUnavailable = !product.available || (!hasAnyStock && !product.pre_order_enabled);

  const [isSaved, setIsSaved] = useState<boolean>(() => {
    try {
      const custRaw = localStorage.getItem('slimdose_customer');
      const custId = custRaw ? JSON.parse(custRaw)?.id : 'guest';
      const stored = JSON.parse(localStorage.getItem(`slimdose_wishlist_${custId}`) || '[]');
      return Array.isArray(stored) && stored.some((item: any) => item.id === product.id || item.productId === product.id);
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handleUpdate = () => {
      try {
        const custRaw = localStorage.getItem('slimdose_customer');
        const custId = custRaw ? JSON.parse(custRaw)?.id : 'guest';
        const stored = JSON.parse(localStorage.getItem(`slimdose_wishlist_${custId}`) || '[]');
        setIsSaved(Array.isArray(stored) && stored.some((item: any) => item.id === product.id || item.productId === product.id));
      } catch {}
    };
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('wishlist_updated', handleUpdate);
    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('wishlist_updated', handleUpdate);
    };
  }, [product.id]);

  const handleToggleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const custRaw = localStorage.getItem('slimdose_customer');
      const custId = custRaw ? JSON.parse(custRaw)?.id : 'guest';
      const storageKey = `slimdose_wishlist_${custId}`;
      const currentList: any[] = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      const existsIndex = currentList.findIndex((item: any) => item.id === product.id || item.productId === product.id);
      
      if (existsIndex >= 0) {
        currentList.splice(existsIndex, 1);
        localStorage.setItem(storageKey, JSON.stringify(currentList));
        setIsSaved(false);
        fireToast(`Removed ${product.name} from Saved Items.`, 'info');
      } else {
        const newItem = {
          id: product.id,
          productId: product.id,
          name: product.name,
          variant: firstAvailableVariation?.name || 'Standard Vial',
          price: currentPrice,
          category: product.category || 'Peptides',
          inStock: !isUnavailable,
          image_url: product.image_url || '/assets/logo.jpeg',
          savedAt: new Date().toISOString()
        };
        currentList.unshift(newItem);
        localStorage.setItem(storageKey, JSON.stringify(currentList));
        setIsSaved(true);
        fireToast(`Saved ${product.name} to your Saved Items! ❤️`, 'success');
      }
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('wishlist_updated'));
    } catch (err) {
      console.error('Error toggling wishlist on card:', err);
    }
  };

  // Bundle calculations for display
  const activeBundleTiers = (bundleTiers || []).filter((t) => t.active);
  const maxBundlePct = activeBundleTiers.length > 0
    ? Math.max(...activeBundleTiers.map((t) => Number(t.discount_percentage)))
    : 0;
  const minBundleQty = activeBundleTiers.length > 0
    ? Math.min(...activeBundleTiers.map((t) => t.min_quantity))
    : 2;

  const handleClick = () => onProductClick?.(product);

  const discountPercentage = hasDiscount && originalPrice > 0
    ? Math.round((1 - currentPrice / originalPrice) * 100)
    : 0;

  return (
    <div
      onClick={handleClick}
      onMouseEnter={prefetchProductPage}
      className="group relative bg-white dark:bg-[#161B26] rounded-2xl sm:rounded-3xl shadow-soft hover:shadow-[0_20px_48px_rgba(60,108,168,0.16)] flex flex-col cursor-pointer overflow-hidden border border-slate-200/80 dark:border-slate-800/80 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1.5 hover:border-[#3C6CA8]/50 active:scale-[0.985] h-full"
    >
      {/* ─── Product Image Container with Framed Canvas ─── */}
      <div className="relative p-2 sm:p-3.5 pb-0">
        <div className="relative aspect-square w-full rounded-xl sm:rounded-2xl overflow-hidden bg-[#FAF9F5] dark:bg-slate-900/60 border border-slate-150/70 dark:border-slate-800/70 flex items-center justify-center p-2 sm:p-4">
          <img
            src={product.image_url && !imageError ? product.image_url : '/assets/logo.jpeg'}
            alt={product.name}
            width={400}
            height={400}
            className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal transition-transform duration-700 ease-out group-hover:scale-106"
            onError={() => setImageError(true)}
            loading="lazy"
            decoding="async"
          />

          {/* Badges Overlay */}
          <div className="absolute top-1.5 left-1.5 right-1.5 sm:top-2 sm:left-2 sm:right-2 flex items-start justify-between gap-1 pointer-events-none z-10">
            {/* Left Badge: Category / Featured / Pre-Order */}
            <div className="flex flex-wrap items-center gap-1 min-w-0 max-w-[68%]">
              {product.category && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] sm:text-[9.5px] font-bold uppercase tracking-wider bg-white/90 dark:bg-slate-900/90 text-[#3C6CA8] dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/40 backdrop-blur-md shadow-2xs truncate">
                  <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-[#3C6CA8] shrink-0" />
                  <span className="truncate">{product.category}</span>
                </span>
              )}
              {product.featured && (
                <span className="px-1.5 sm:px-2.5 py-0.5 text-white text-[8px] sm:text-[9.5px] font-black uppercase tracking-wider rounded-full shadow-xs bg-[#3C6CA8] truncate whitespace-nowrap">
                  ★ Featured
                </span>
              )}
              {product.pre_order_enabled && !product.featured && (
                <span className="px-1.5 sm:px-2.5 py-0.5 bg-blue-600 text-white text-[8px] sm:text-[9.5px] font-black uppercase tracking-wider rounded-full shadow-xs animate-pulse truncate whitespace-nowrap">
                  Pre-Order
                </span>
              )}
            </div>

            {/* Right Badge: Discount / Global Sale / Wishlist */}
            <div className="flex items-center gap-1 shrink-0 pointer-events-auto">
              {hasDiscount && discountPercentage > 0 && (
                <span className="px-1.5 sm:px-2 py-0.5 text-white text-[8px] sm:text-[9.5px] font-black uppercase tracking-wider rounded-full shadow-xs bg-[#F04438] whitespace-nowrap">
                  {discountPercentage}% OFF
                </span>
              )}

              {/* Quick Save / Wishlist Heart Button */}
              <button
                type="button"
                onClick={handleToggleSave}
                aria-label={isSaved ? "Remove from Saved Items" : "Save Item"}
                title={isSaved ? "Saved to Wishlist" : "Save to Wishlist"}
                className={`p-1.5 rounded-full backdrop-blur-md transition-all cursor-pointer shadow-xs ${
                  isSaved
                    ? 'bg-rose-500 text-white shadow-rose-500/30'
                    : 'bg-white/90 dark:bg-slate-900/90 text-slate-400 hover:text-rose-500 hover:scale-110'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
              </button>

              {/* Cart Quantity Badge (if in cart) */}
              {cartQuantity > 0 && (
                <div className="bg-[#3C6CA8] text-white text-[9px] sm:text-xs font-black w-4.5 h-4.5 sm:w-5.5 sm:h-5.5 rounded-full flex items-center justify-center shadow-md ring-1.5 ring-white dark:ring-slate-900 shrink-0">
                  {cartQuantity}
                </div>
              )}
            </div>
          </div>

          {/* Bottom-Left Overlay: Bundle / Global Discount Tag */}
          {activeBundleTiers.length > 0 && (
            <div className="absolute bottom-1.5 left-1.5 sm:bottom-2 sm:left-2 pointer-events-none z-10 max-w-[88%]">
              {pricing.hasGlobalDiscount ? (
                <div className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-50/95 dark:bg-amber-950/90 border border-amber-400/40 text-[8px] sm:text-[9px] font-bold text-amber-800 dark:text-amber-300 backdrop-blur-md shadow-2xs truncate">
                  <Tag className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                  <span className="truncate">Bundle up to {maxBundlePct}% OFF</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full bg-blue-50/95 dark:bg-blue-950/90 border border-blue-200/80 dark:border-blue-900/60 text-[8px] sm:text-[9.5px] font-extrabold text-[#3C6CA8] dark:text-blue-300 backdrop-blur-md shadow-2xs truncate">
                  <Zap className="w-2.5 h-2.5 text-[#3C6CA8] dark:text-blue-400 shrink-0" />
                  <span className="truncate">Buy {minBundleQty}+ Save {maxBundlePct}% OFF</span>
                </div>
              )}
            </div>
          )}

          {/* Stock Status Overlay */}
          {isUnavailable && (
            <div className="absolute inset-0 bg-white/85 dark:bg-[#0F1219]/85 backdrop-blur-[2px] flex items-center justify-center z-20">
              <span className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[9px] sm:text-[11px] font-bold rounded-full border border-slate-200 dark:border-slate-700 uppercase tracking-wider shadow-sm">
                {!product.available ? 'Unavailable' : 'Out of Stock'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ─── Product Details Area ─── */}
      <div className="p-2.5 sm:p-4 flex-1 flex flex-col justify-between text-left relative min-w-0">
        <div className="min-w-0 flex-1 flex flex-col">
          {/* Product Title */}
          <h3
            className="font-black text-slate-900 dark:text-white text-[13px] sm:text-[15px] leading-snug line-clamp-1 group-hover:text-[#3C6CA8] transition-colors mb-1.5 tracking-tight"
            title={product.name}
          >
            {product.name}
          </h3>

          {/* Price Layout with Highlight Pill */}
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap min-w-0">
            {hasMultipleVariations && (
              <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium">From</span>
            )}
            {hasDiscount && (
              <span className="text-[10px] sm:text-xs text-slate-400 font-semibold line-through">
                ₱{originalPrice.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
              </span>
            )}
            <span className="inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#3C6CA8] dark:text-blue-300 font-black text-xs sm:text-sm border border-blue-200/70 dark:border-blue-900/50 shadow-2xs">
              ₱{currentPrice.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
            </span>
          </div>

          {/* Description & Sold Count Inline Row */}
          {(product.description || soldCount > 0) && (
            <div className="flex items-center justify-between gap-1.5 mt-auto pt-1 min-w-0">
              {product.description ? (
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 line-clamp-1 leading-relaxed font-normal truncate">
                  {product.description}
                </p>
              ) : <div />}
              {soldCount > 0 && (
                <span className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[9.5px] font-extrabold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/40 shrink-0 ml-auto shadow-2xs">
                  <Flame className="w-2.5 h-2.5 text-amber-500 fill-amber-500 shrink-0" />
                  <span>{soldCount} sold</span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(MenuItemCard);
