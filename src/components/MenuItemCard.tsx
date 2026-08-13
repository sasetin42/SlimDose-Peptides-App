import React, { useState, useRef } from 'react';
import { ShoppingCart, Check } from 'lucide-react';
import type { Product, ProductVariation, GlobalDiscount } from '../types';
import { resolveProductPricing } from '../utils/pricing';

interface MenuItemCardProps {
  product: Product;
  onAddToCart: (product: Product, variation?: ProductVariation, quantity?: number) => void;
  cartQuantity?: number;
  onUpdateQuantity?: (index: number, quantity: number) => void;
  onProductClick?: (product: Product) => void;
  globalDiscount?: GlobalDiscount | null;
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({
  product,
  cartQuantity = 0,
  onProductClick,
  onAddToCart,
  globalDiscount,
}) => {
  const [imageError, setImageError] = useState(false);
  const [addedAnim, setAddedAnim] = useState(false);
  const [flyActive, setFlyActive] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const flyDotRef = useRef<HTMLSpanElement>(null);

  const firstAvailableVariation = product.variations && product.variations.length > 0
    ? (product.variations.find(v => v.stock_quantity > 0) || product.variations[0])
    : undefined;

  const pricing = resolveProductPricing(product, firstAvailableVariation, globalDiscount);
  const currentPrice = pricing.price;
  const hasDiscount = pricing.hasDiscount;
  const originalPrice = pricing.originalPrice;
  const hasMultipleVariations = (product.variations?.length ?? 0) > 1;

  const hasAnyStock = product.variations && product.variations.length > 0
    ? product.variations.some(v => v.stock_quantity > 0)
    : product.stock_quantity > 0;

  const isUnavailable = !product.available || (!hasAnyStock && !product.pre_order_enabled);

  const handleClick = () => onProductClick?.(product);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isUnavailable) return;

    // Launch flying dot toward cart icon
    if (cardRef.current) {
      const cartBtn = document.getElementById('header-cart-btn');
      if (cartBtn && flyDotRef.current) {
        const cardRect = cardRef.current.getBoundingClientRect();
        const cartRect = cartBtn.getBoundingClientRect();
        const dx = cartRect.left + cartRect.width / 2 - (cardRect.left + cardRect.width / 2);
        const dy = cartRect.top + cartRect.height / 2 - (cardRect.top + cardRect.height / 2);
        if (flyDotRef.current) {
          flyDotRef.current.style.setProperty('--fly-end', `translate(${dx}px, ${dy}px)`);
        }
        setFlyActive(true);
        setTimeout(() => setFlyActive(false), 700);
      }
    }

    // Button animation
    setAddedAnim(true);
    setTimeout(() => setAddedAnim(false), 1200);

    onAddToCart(product, firstAvailableVariation, 1);
  };

  return (
    <div
      ref={cardRef}
      onClick={handleClick}
      className="relative bg-white dark:bg-[#161B26] rounded-2xl shadow-soft hover:shadow-[0_16px_40px_rgba(60,108,168,0.14)] flex flex-col group cursor-pointer overflow-hidden border border-gray-200/80 dark:border-slate-800/80 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1.5 hover:border-[#3C6CA8]/40 active:scale-[0.985] h-full"
    >
      {/* Flying dot animation */}
      {flyActive && (
        <span
          ref={flyDotRef}
          className="animate-fly-to-cart pointer-events-none absolute z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full"
          style={{ backgroundColor: '#3C6CA8' }}
        />
      )}

      {/* Product Image Container */}
      <div className="relative aspect-square overflow-hidden bg-gradient-to-tr from-gray-50 via-white to-blue-50/30 dark:from-slate-900 dark:to-slate-850">
        <img
          src={product.image_url && !imageError ? product.image_url : '/assets/logo.jpeg'}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-108"
          onError={() => setImageError(true)}
          loading="lazy"
        />

        {/* Badges Overlay */}
        <div className="absolute top-2 left-2 sm:top-2.5 sm:left-2.5 flex flex-col gap-1 pointer-events-none z-10">
          {product.featured && (
            <span className="px-2 sm:px-2.5 py-0.5 text-white text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider rounded-full shadow-md backdrop-blur-md" style={{ background: 'linear-gradient(135deg, #3C6CA8 0%, #264874 100%)' }}>
              ★ Featured
            </span>
          )}
          {hasDiscount && (
            <span className="px-2 sm:px-2.5 py-0.5 text-white text-[9px] sm:text-[10px] font-extrabold rounded-full shadow-md bg-emerald-600">
              {Math.round((1 - currentPrice / originalPrice) * 100)}% OFF
            </span>
          )}
          {product.pre_order_enabled && (
            <span className="px-2 sm:px-2.5 py-0.5 bg-blue-600 text-white text-[9px] sm:text-[10px] font-bold uppercase tracking-wider rounded-full shadow-md animate-pulse">
              Pre-Order
            </span>
          )}
        </div>

        {/* Cart Quantity Pill Badge */}
        {cartQuantity > 0 && (
          <div className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 bg-[#3C6CA8] text-white text-[10px] sm:text-xs font-bold w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center shadow-md pointer-events-none ring-2 ring-white dark:ring-[#161B26] z-10">
            {cartQuantity}
          </div>
        )}

        {/* Stock Status Overlay */}
        {isUnavailable && (
          <div className="absolute inset-0 bg-white/85 dark:bg-[#0F1219]/80 backdrop-blur-[2px] flex items-center justify-center z-10">
            <span className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-3 py-1 text-[11px] font-bold rounded-full border border-gray-200 dark:border-gray-700 uppercase tracking-wider shadow-sm">
              {!product.available ? 'Unavailable' : 'Out of Stock'}
            </span>
          </div>
        )}
      </div>

      {/* Product Details Area */}
      <div className="p-2.5 sm:p-4 flex-1 flex flex-col justify-between text-left">
        <div>
          {/* Category Tag if available */}
          {product.category && (
            <p className="text-[10px] uppercase font-bold tracking-wider text-[#3C6CA8] dark:text-blue-400 mb-0.5 truncate">
              {product.category}
            </p>
          )}

          {/* Product Title */}
          <h3 className="font-bold text-[#232323] dark:text-gray-100 text-[13px] sm:text-[15px] leading-snug w-full truncate group-hover:text-[#3C6CA8] transition-colors mb-1" title={product.name}>
            {product.name}
          </h3>

          {/* Price Layout */}
          <div className="flex items-baseline gap-1.5 mb-1.5 flex-wrap">
            {hasMultipleVariations && (
              <span className="text-[10px] text-gray-400 font-medium">From</span>
            )}
            {hasDiscount && (
              <span className="text-[11px] text-gray-400 line-through">
                ₱{originalPrice.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
              </span>
            )}
            <span className="text-sm sm:text-base font-extrabold text-[#3C6CA8] dark:text-blue-400 leading-none">
              ₱{currentPrice.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
            </span>
          </div>

          {/* Description */}
          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-tight mb-2">
            {product.description}
          </p>
        </div>

        {/* Add to Cart Button */}
        <div className="pt-1.5 mt-auto">
          <button
            id={`atc-${product.id}`}
            onClick={handleAddToCart}
            disabled={isUnavailable}
            className={`w-full py-2 sm:py-2.5 px-3 rounded-full text-white text-[11px] sm:text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 relative overflow-hidden shadow-sm hover:shadow-md cursor-pointer ${
              isUnavailable
                ? 'opacity-50 cursor-not-allowed bg-gray-300 dark:bg-gray-700'
                : addedAnim
                  ? 'bg-emerald-600 scale-95'
                  : 'bg-[#3C6CA8] hover:bg-[#315A8E] active:scale-95'
            }`}
          >
            {addedAnim ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Added!</span>
              </>
            ) : (
              <>
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>{product.pre_order_enabled ? 'Pre-Order' : hasMultipleVariations ? 'Quick Add' : 'Add to Cart'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MenuItemCard;
