import React, { useEffect, useMemo } from 'react';
import { Trash2, ShoppingBag, ArrowLeft, CreditCard, Plus, Minus, Sparkles, Heart, Tag, Info, X, Truck, ShieldCheck, Award, MapPin, Clock, Package, Zap, BadgeCheck, Navigation, ChevronDown } from 'lucide-react';
import type { CartItem } from '../types';
import { useBundleTiers } from '../hooks/useBundleTiers';
import { useGlobalDiscount } from '../hooks/useGlobalDiscount';
import { computeCartPricing, resolveProductPricing } from '../utils/pricing';
import { fireToast } from './ToastNotification';
import { DELIVERY_MODES } from '../data/deliveryModes';

interface CartProps {
  cartItems: CartItem[];
  hydrated: boolean;
  updateQuantity: (index: number, quantity: number) => void;
  removeFromCart: (index: number) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  refreshCartPrices: () => Promise<boolean>;
  pricesUpdatedAt: number | null;
  dismissPriceUpdateNotice: () => void;
  onContinueShopping: () => void;
  onCheckout: () => void;
}

const Cart: React.FC<CartProps> = ({
  cartItems,
  hydrated,
  updateQuantity,
  removeFromCart,
  clearCart,
  refreshCartPrices,
  pricesUpdatedAt,
  dismissPriceUpdateNotice,
  onContinueShopping,
  onCheckout,
}) => {
  const productIds = useMemo(
    () => cartItems.map((i) => i.product.id),
    [cartItems]
  );
  const { tiersByProduct } = useBundleTiers(productIds);
  const { globalDiscount } = useGlobalDiscount();

  // Refresh prices when cart drawer opens
  useEffect(() => {
    refreshCartPrices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pricing = useMemo(
    () => computeCartPricing(cartItems, tiersByProduct, globalDiscount),
    [cartItems, tiersByProduct, globalDiscount]
  );

  const totalItemCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );

  // Show skeleton while cart data is still being hydrated from localStorage/Supabase
  if (!hydrated && cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-[#FBFBFB] dark:bg-slate-950 flex items-center justify-center px-4 py-12">
        <div className="text-center max-w-sm w-full">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-luxury p-8 sm:p-10 border border-gray-100 dark:border-slate-800">
            <div className="bg-[#3C6CA8]/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5">
              <div className="w-8 h-8 rounded-full border-[3px] border-[#3C6CA8] border-t-transparent animate-spin" />
            </div>
            <div className="h-5 bg-gray-100 dark:bg-slate-800 rounded-lg w-40 mx-auto mb-3 animate-pulse" />
            <div className="h-3 bg-gray-100 dark:bg-slate-800 rounded w-56 mx-auto animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-[#FBFBFB] dark:bg-slate-950 flex items-center justify-center px-4 py-12">
        <div className="text-center max-w-sm w-full">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-luxury p-8 sm:p-10 border border-gray-100 dark:border-slate-800">
            <div className="bg-[#3C6CA8] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 shadow-md">
              <ShoppingBag className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-[#232323] dark:text-white mb-2 flex items-center justify-center gap-2">
              Your cart is empty
              <Heart className="w-5 h-5 text-rose-500 fill-rose-500 animate-pulse" />
            </h2>
            <p className="text-[#232323]/70 dark:text-slate-400 text-xs sm:text-sm mb-6">
              Start adding premium peptide solutions to your cart! ✨
            </p>
            <button
              onClick={onContinueShopping}
              className="bg-[#3C6CA8] hover:bg-[#315A8E] text-white px-6 py-3 rounded-xl font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transform hover:scale-[1.01] transition-all w-full flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Browse Products
            </button>
          </div>
        </div>
      </div>
    );
  }

  const finalTotal = pricing.subtotal;

  return (
    <div className="min-h-screen bg-[#FBFBFB] dark:bg-slate-950 py-3 sm:py-6 text-[#232323] dark:text-slate-100">
      <div className="max-w-[1400px] mx-auto w-full px-3 sm:px-6 md:px-8 pb-24 sm:pb-8">
        {/* Price update notice */}
        {pricesUpdatedAt && (
          <div className="mb-3 flex items-start gap-2.5 rounded-xl border border-[#3C6CA8]/20 bg-[#3C6CA8]/5 p-2.5 text-xs text-[#232323] dark:text-slate-200">
            <Info className="w-4 h-4 mt-0.5 text-[#3C6CA8] flex-shrink-0" />
            <div className="flex-1 font-medium">
              Prices have been updated to the latest from our store.
            </div>
            <button
              onClick={dismissPriceUpdateNotice}
              className="p-1 hover:bg-[#3C6CA8]/10 rounded-lg transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Compact Mobile & Desktop Header */}
        <div className="mb-3 sm:mb-6 border-b border-gray-200/60 dark:border-slate-800 pb-2.5 sm:pb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={onContinueShopping}
              className="p-1.5 -ml-1 text-gray-600 dark:text-slate-300 hover:text-[#3C6CA8] hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-all flex items-center shrink-0 cursor-pointer"
              title="Continue Shopping"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <span className="hidden sm:inline-block text-[#232323]/70 dark:text-slate-400 font-semibold text-[10px] uppercase tracking-wider mb-0.5">
                Return to Shop
              </span>
              <h1 className="text-lg sm:text-2xl md:text-3xl font-heading font-extrabold text-[#232323] dark:text-white flex items-center gap-1.5 truncate leading-tight">
                Shopping Cart
                <span className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-slate-400 shrink-0">
                  ({totalItemCount} {totalItemCount === 1 ? 'item' : 'items'})
                </span>
              </h1>
            </div>
          </div>

          <button
            onClick={clearCart}
            className="text-red-500 hover:text-red-600 font-bold flex items-center gap-1 sm:gap-1.5 transition-all text-xs px-2.5 py-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl shrink-0 cursor-pointer border border-transparent hover:border-red-200 dark:hover:border-red-900/50"
          >
            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Clear Cart</span>
            <span className="xs:hidden">Clear</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 items-start">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-2.5 sm:space-y-3">
            {cartItems.map((item, index) => {
              const line = pricing.lines[index];
              return (
                <div
                  key={index}
                  className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs p-3 sm:p-4 transition-all duration-300 border border-gray-200/80 dark:border-slate-800 hover:border-[#3C6CA8]/50 hover:shadow-md group"
                >
                  <div className="flex gap-3 sm:gap-4 items-start sm:items-center">
                    {/* Thumbnail */}
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-slate-50 to-blue-50/40 dark:from-slate-950 dark:to-slate-900 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden border border-gray-100 dark:border-slate-800 relative">
                      {item.product.image_url ? (
                        <img
                          src={item.product.image_url}
                          alt={item.product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-black text-xl sm:text-2xl text-[#3C6CA8] bg-blue-50/60 dark:bg-slate-800">
                          {item.product.name.charAt(0)}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-extrabold text-[#232323] dark:text-white text-sm sm:text-base mb-0.5 leading-snug line-clamp-2">
                              {item.product.name}
                            </h3>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              {item.variation && (
                                <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                                  Var: <strong className="ml-1 text-slate-900 dark:text-white">{item.variation.name}</strong>
                                </span>
                              )}
                              {line?.appliedTier && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#3C6CA8] text-white shadow-xs">
                                  <Tag className="w-2.5 h-2.5" />
                                  Bundle {Number(line.appliedTier.discount_percentage)}% OFF
                                </span>
                              )}
                              {(() => {
                                const pricingItem = resolveProductPricing(item.product, item.variation, globalDiscount);
                                if (pricingItem.hasGlobalDiscount) {
                                  const discountPct = Math.round((1 - pricingItem.price / pricingItem.originalPrice) * 100);
                                  return (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                                      <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                                      {globalDiscount?.name || 'Global Sale'} {discountPct}% OFF • Bundle paused
                                    </span>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          </div>
                          <button
                            onClick={() => removeFromCart(index)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer shrink-0 -mr-1 -mt-1"
                            title="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Responsive Bottom Section (Quantity + Pricing) */}
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100 dark:border-slate-800/80 gap-2">
                        {/* Quantity Counter */}
                        <div className="flex items-center border border-gray-200 dark:border-slate-700 rounded-xl bg-slate-50/80 dark:bg-slate-950 p-0.5 shadow-2xs shrink-0">
                          <button
                            type="button"
                            onClick={() => updateQuantity(index, item.quantity - 1)}
                            className="p-1 sm:p-1.5 hover:bg-white dark:hover:bg-slate-800 hover:text-[#3C6CA8] active:scale-95 transition-all rounded-lg text-[#232323] dark:text-slate-200 cursor-pointer shadow-2xs"
                            title="Decrease quantity"
                          >
                            <Minus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          </button>
                          <div className="px-2 sm:px-2.5 flex items-baseline gap-0.5">
                            <span className="font-extrabold text-[#232323] dark:text-white text-xs sm:text-sm">
                              {item.quantity}
                            </span>
                            {(() => {
                              const availableStock = item.variation ? item.variation.stock_quantity : item.product.stock_quantity;
                              if (availableStock > 0) {
                                return <span className="text-[9.5px] sm:text-[10px] text-gray-400 font-semibold">/{availableStock}</span>;
                              }
                              return null;
                            })()}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const availableStock = item.variation ? item.variation.stock_quantity : item.product.stock_quantity;
                              if (item.quantity >= availableStock) {
                                fireToast(`Only ${availableStock} item(s) available in stock.`, 'warning');
                                return;
                              }
                              updateQuantity(index, item.quantity + 1);
                            }}
                            disabled={(() => {
                              const availableStock = item.variation ? item.variation.stock_quantity : item.product.stock_quantity;
                              return item.quantity >= availableStock;
                            })()}
                            className="p-1 sm:p-1.5 hover:bg-white dark:hover:bg-slate-800 hover:text-[#3C6CA8] active:scale-95 transition-all rounded-lg text-[#232323] dark:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
                            title="Increase quantity"
                          >
                            <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          </button>
                        </div>

                        {/* Price Details */}
                        <div className="text-right flex flex-col items-end shrink-0 min-w-0">
                          <div className="text-sm sm:text-base md:text-lg font-black text-[#232323] dark:text-white tracking-tight leading-none">
                            ₱{(line ? line.lineSubtotal : item.price * item.quantity).toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                          </div>
                          {line?.bundlePercent ? (
                            <div className="flex items-center gap-1 mt-0.5 flex-wrap justify-end">
                              <span className="text-[10.5px] sm:text-[11px] text-gray-400 line-through">
                                ₱{(line.unitBasePrice * item.quantity).toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                              </span>
                              <span className="text-[9.5px] sm:text-[10.5px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.2 rounded border border-emerald-200/50 dark:border-emerald-800/50 whitespace-nowrap">
                                Saved ₱{line.lineSavings.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                              </span>
                            </div>
                          ) : (() => {
                            const pricingItem = resolveProductPricing(item.product, item.variation, globalDiscount);
                            if (pricingItem.hasGlobalDiscount) {
                              const originalSubtotal = pricingItem.originalPrice * item.quantity;
                              const currentSubtotal = line ? line.lineSubtotal : item.price * item.quantity;
                              const saved = originalSubtotal - currentSubtotal;
                              return (
                                <div className="flex items-center gap-1 mt-0.5 flex-wrap justify-end">
                                  <span className="text-[10.5px] sm:text-[11px] text-gray-400 line-through">
                                    ₱{originalSubtotal.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                                  </span>
                                  {saved > 0 && (
                                    <span className="text-[9px] sm:text-[10px] font-extrabold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-200/60 dark:border-amber-800/60 whitespace-nowrap">
                                      Saved ₱{saved.toLocaleString('en-PH', { minimumFractionDigits: 0 })} (Sale)
                                    </span>
                                  )}
                                </div>
                              );
                            }
                            return (
                              <span className="text-[10.5px] sm:text-[11px] text-[#232323]/60 dark:text-slate-400 font-semibold mt-0.5">
                                ₱{(line ? line.unitFinalPrice : item.price).toLocaleString('en-PH', { minimumFractionDigits: 0 })} each
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Order Summary Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-xs p-4 sm:p-6 sticky top-24 border border-gray-200/80 dark:border-slate-800 text-[#232323] dark:text-slate-100">
              <h2 className="text-base sm:text-xl font-extrabold text-[#232323] dark:text-white mb-3 sm:mb-5 flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-2.5">
                Order Summary
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-[#3C6CA8]" />
              </h2>

              <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                <div className="flex justify-between text-[#232323] dark:text-slate-200 text-xs sm:text-sm">
                  <span className="font-medium text-[#232323]/80 dark:text-slate-400">Subtotal ({totalItemCount} Items)</span>
                  <span className="font-bold text-[#232323] dark:text-white">₱{pricing.subtotalBeforeBundle.toLocaleString('en-PH', { minimumFractionDigits: 0 })}</span>
                </div>

                {pricing.hasBundleDiscount && (
                  <div className="flex justify-between items-center bg-[#3C6CA8]/10 -mx-4 px-4 sm:-mx-6 sm:px-6 py-2 border-y border-[#3C6CA8]/20">
                    <span className="flex items-center gap-1.5 text-[#3C6CA8] font-bold text-[11px] sm:text-xs uppercase tracking-wider">
                      <Tag className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      Bundle discount
                    </span>
                    <span className="font-black text-[#3C6CA8] text-xs sm:text-sm">
                      -₱{pricing.bundleSavings.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                    </span>
                  </div>
                )}

                <div className="pt-1">
                  <div className="flex justify-between text-xs sm:text-sm mb-2">
                    <span className="font-medium text-[#232323]/80 dark:text-slate-400">Shipping</span>
                    <span className="font-bold text-[#3C6CA8]">Calculated at checkout</span>
                  </div>
                  
                  {/* Collapsible Delivery & Shipping Rates Panel */}
                  <details className="group rounded-2xl border border-[#3C6CA8]/20 dark:border-slate-700 overflow-hidden shadow-xs" open>
                    <summary className="bg-gradient-to-r from-[#3C6CA8] to-[#4A7FC1] px-3 py-2 sm:px-3.5 sm:py-2.5 flex items-center gap-2 cursor-pointer list-none select-none">
                      <div className="w-5 h-5 rounded-md bg-white/20 flex items-center justify-center shrink-0">
                        <Truck className="w-3 h-3 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white text-xs leading-tight">Delivery & Shipping Rates</p>
                        <p className="text-white/80 text-[9px] font-medium">Available Shipping Options & Couriers</p>
                      </div>
                      <ChevronDown className="w-4 h-4 text-white transition-transform group-open:rotate-180 shrink-0" />
                    </summary>

                    {/* Region & Courier Rows */}
                    <div className="bg-white dark:bg-slate-900 divide-y divide-gray-100 dark:divide-slate-800">
                      {DELIVERY_MODES.map((mode) => (
                        <div
                          key={mode.id}
                          className="flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-blue-50/40 dark:hover:bg-slate-800/60 transition-colors"
                        >
                          <div className="w-7 h-7 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#3C6CA8] dark:text-blue-300 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/40">
                            <Truck className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-[#232323] dark:text-slate-100 truncate">{mode.name}</p>
                            <span className="text-[10px] text-gray-500 dark:text-slate-400 block truncate">{mode.desc}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-full ${
                              mode.fee === 0
                                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-blue-50 dark:bg-blue-950/50 text-[#3C6CA8] dark:text-blue-300 border border-blue-100 dark:border-blue-900/40'
                            }`}>
                              {mode.fee === 0 ? 'Paid Upon Delivery' : `₱${mode.fee}`}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Footer note */}
                    <div className="bg-gray-50 dark:bg-slate-800/60 px-3 py-1.5 flex items-center gap-1.5 border-t border-gray-100 dark:border-slate-700">
                      <Info className="w-3 h-3 text-gray-400 shrink-0" />
                      <p className="text-[9px] text-gray-500 dark:text-slate-400 font-medium">Select your preferred courier at checkout.</p>
                    </div>
                  </details>
                </div>

                <div className="border-t border-gray-200/80 dark:border-slate-800 pt-3 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-base sm:text-lg font-bold text-[#232323] dark:text-white">Total</span>
                    <span className="text-xl sm:text-2xl font-black text-[#232323] dark:text-white">
                      ₱{finalTotal.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                    </span>
                  </div>
                  {pricing.hasBundleDiscount && (
                    <p className="text-[10px] text-[#3C6CA8] mt-1 text-right font-semibold">
                      Bundle discount applied — promo codes can't be combined.
                    </p>
                  )}
                  <p className="text-[10px] text-[#232323]/60 dark:text-slate-400 mt-0.5 text-right font-medium">Excluding local shipping fees</p>
                </div>
              </div>

              {/* Styled Branding Action Buttons */}
              <button
                onClick={() => {
                  const customerSaved = localStorage.getItem('slimdose_customer');
                  if (!customerSaved) {
                    fireToast('Account Required: Please log in or register an account before proceeding to checkout.', 'warning', 5000);
                    window.dispatchEvent(new CustomEvent('openCustomerAuth'));
                    return;
                  }
                  onCheckout();
                }}
                className="w-full bg-[#3C6CA8] hover:bg-[#315A8E] text-white py-3 sm:py-3.5 rounded-xl font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transform active:scale-98 transition-all mb-2.5 flex items-center justify-center gap-2 cursor-pointer"
              >
                <CreditCard className="w-4 h-4" />
                Proceed to Checkout
              </button>

              <button
                onClick={onContinueShopping}
                className="w-full bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-[#3C6CA8] dark:text-slate-200 border border-[#3C6CA8]/50 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Continue Shopping
              </button>

              {/* Trust Badges */}
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800 space-y-2">
                <p className="flex items-center gap-2 text-[11px] sm:text-xs text-[#232323]/80 dark:text-slate-400 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#3C6CA8]" />
                  Secure SSL checkout
                </p>
                <p className="flex items-center gap-2 text-[11px] sm:text-xs text-[#232323]/80 dark:text-slate-400 font-semibold">
                  <Award className="w-3.5 h-3.5 text-[#3C6CA8]" />
                  Lab-tested premium products
                </p>
                <p className="flex items-center gap-2 text-[11px] sm:text-xs text-[#232323]/80 dark:text-slate-400 font-semibold">
                  <Truck className="w-3.5 h-3.5 text-[#3C6CA8]" />
                  Fast regional delivery 🚚
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Mobile Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-gray-200 dark:border-slate-800 shadow-2xl sm:hidden z-40 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total</p>
          <p className="text-lg font-black text-[#232323] dark:text-white leading-none">
            ₱{finalTotal.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
          </p>
        </div>
        <button
          onClick={() => {
            const customerSaved = localStorage.getItem('slimdose_customer');
            if (!customerSaved) {
              fireToast('Account Required: Please log in or register an account before proceeding to checkout.', 'warning', 5000);
              window.dispatchEvent(new CustomEvent('openCustomerAuth'));
              return;
            }
            onCheckout();
          }}
          className="bg-[#3C6CA8] hover:bg-[#315A8E] text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <CreditCard className="w-4 h-4" />
          Checkout
        </button>
      </div>
    </div>
  );
};

export default Cart;
