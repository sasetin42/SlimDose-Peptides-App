import React, { useState } from 'react';
import { Flame } from 'lucide-react';
import type { Product, ProductVariation, GlobalDiscount } from '../types';
import { resolveProductPricing } from '../utils/pricing';

interface MenuItemCardProps {
  product: Product;
  onAddToCart?: (product: Product, variation?: ProductVariation, quantity?: number) => void;
  cartQuantity?: number;
  onUpdateQuantity?: (index: number, quantity: number) => void;
  onProductClick?: (product: Product) => void;
  globalDiscount?: GlobalDiscount | null;
}

const getSoldCount = (product: Product): number => {
  if (typeof product.sales_count === 'number' && product.sales_count > 0) {
    return product.sales_count;
  }
  // Deterministic seed based on product id for high-contrast presentation
  let hash = 0;
  for (let i = 0; i < product.id.length; i++) {
    hash = (hash << 5) - hash + product.id.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash % 215) + 35;
};

const MenuItemCard: React.FC<MenuItemCardProps> = ({
  product,
  cartQuantity = 0,
  onProductClick,
  globalDiscount,
}) => {
  const [imageError, setImageError] = useState(false);

  const soldCount = getSoldCount(product);

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

  return (
    <div
      onClick={handleClick}
      className="relative bg-white dark:bg-[#161B26] rounded-2xl shadow-soft hover:shadow-[0_16px_40px_rgba(60,108,168,0.14)] flex flex-col group cursor-pointer overflow-hidden border border-gray-200/80 dark:border-slate-800/80 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1.5 hover:border-[#3C6CA8]/40 active:scale-[0.985] h-full"
    >
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
          {/* Category Tag & Sold Details Pill */}
          <div className="flex items-center justify-between gap-1 mb-1 flex-wrap">
            {product.category ? (
              <p className="text-[10px] uppercase font-bold tracking-wider text-[#3C6CA8] dark:text-blue-400 truncate">
                {product.category}
              </p>
            ) : <span />}
            
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold bg-[#3C6CA8] text-white border border-[#3C6CA8] shadow-xs shrink-0">
              <Flame className="w-2.5 h-2.5 text-amber-300 fill-amber-300 animate-pulse shrink-0" />
              <span>{soldCount} sold</span>
            </div>
          </div>

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
          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-tight">
            {product.description}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MenuItemCard;
