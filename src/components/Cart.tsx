import React, { useEffect, useMemo } from 'react';
import { Trash2, ShoppingBag, ArrowLeft, CreditCard, Plus, Minus, Sparkles, Heart, Tag, Info, X, Truck, ShieldCheck, Award, MapPin, Clock, Package, Zap, BadgeCheck, Navigation } from 'lucide-react';
import type { CartItem } from '../types';
import { useBundleTiers } from '../hooks/useBundleTiers';
import { useGlobalDiscount } from '../hooks/useGlobalDiscount';
import { computeCartPricing } from '../utils/pricing';
import { fireToast } from './ToastNotification';

interface CartProps {
  cartItems: CartItem[];
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

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-[#FBFBFB] flex items-center justify-center px-4 py-16">
        <div className="text-center max-w-md w-full">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-luxury p-10 md:p-12 border border-gray-100 dark:border-slate-800">
            <div className="bg-[#3C6CA8] w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-md">
              <ShoppingBag className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-[#232323] dark:text-white mb-2 flex items-center justify-center gap-2">
              Your cart is empty
              <Heart className="w-5.5 h-5.5 text-rose-500 fill-rose-500 animate-pulse" />
            </h2>
            <p className="text-[#232323]/70 dark:text-slate-400 text-sm mb-8">
              Start adding premium peptide solutions to your cart! ✨
            </p>
            <button
              onClick={onContinueShopping}
              className="bg-[#3C6CA8] hover:bg-[#315A8E] text-white px-8 py-3.5 rounded-xl font-bold text-sm shadow-md hover:shadow-lg transform hover:scale-[1.01] transition-all w-full flex items-center justify-center gap-2 cursor-pointer"
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
    <div className="min-h-screen bg-[#FBFBFB] py-4 md:py-8 text-[#232323]">
      <div className="max-w-[1400px] mx-auto w-full px-4 md:px-8">
        {/* Price update notice */}
        {pricesUpdatedAt && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-[#3C6CA8]/20 bg-[#3C6CA8]/5 p-3 text-[#232323]">
            <Info className="w-5 h-5 mt-0.5 text-[#3C6CA8] flex-shrink-0" />
            <div className="flex-1 text-sm font-medium text-[#232323]">
              Prices have been updated to the latest from our store.
            </div>
            <button
              onClick={dismissPriceUpdateNotice}
              className="p-1 hover:bg-[#3C6CA8]/10 rounded-lg transition-colors text-[#232323]"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-200/60 pb-3">
          <div>
            <button
              onClick={onContinueShopping}
              className="text-[#232323]/70 hover:text-[#3C6CA8] font-semibold text-xs uppercase tracking-wider mb-1 flex items-center gap-2 transition-colors group cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
              Continue Shopping
            </button>
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-[#232323] dark:text-white flex items-center gap-2">
              Shopping Cart
              <Sparkles className="w-5 h-5 text-[#3C6CA8]" />
            </h1>
          </div>
          <button
            onClick={clearCart}
            className="self-end sm:self-auto text-red-500 hover:text-red-600 font-bold flex items-center gap-2 transition-all text-xs sm:text-sm px-3 py-1.5 hover:bg-red-50 rounded-xl cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            Clear Cart
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-3">
            {cartItems.map((item, index) => {
              const line = pricing.lines[index];
              return (
                <div
                  key={index}
                  className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm hover:shadow-md p-3.5 md:p-4 transition-all duration-300 border border-gray-200/70 dark:border-slate-800 hover:border-[#3C6CA8]/40"
                >
                  <div className="flex gap-3 md:gap-5 items-center">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-50 dark:bg-slate-950 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden border border-gray-100 dark:border-slate-800">
                      {item.product.image_url ? (
                        <img
                          src={item.product.image_url}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-2xl font-bold text-[#3C6CA8]">
                          {item.product.name.charAt(0)}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0 pr-2">
                            <h3 className="font-extrabold text-[#232323] dark:text-white text-base mb-0.5 truncate">
                              {item.product.name}
                            </h3>
                            {item.variation && (
                              <p className="text-xs text-[#232323]/70 dark:text-slate-400 font-medium">
                                Variation: <span className="text-[#232323] dark:text-slate-200 font-semibold">{item.variation.name}</span>
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => removeFromCart(index)}
                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {line?.appliedTier && (
                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#3C6CA8] text-white">
                              <Tag className="w-3 h-3" />
                              Bundle: {Number(line.appliedTier.discount_percentage)}% OFF
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-gray-100 dark:border-slate-800">
                        {/* Quantity Counter */}
                        <div className="flex items-center border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 px-2 py-1 shadow-sm">
                          <button
                            onClick={() => updateQuantity(index, item.quantity - 1)}
                            className="p-1 hover:bg-[#3C6CA8]/10 hover:text-[#3C6CA8] transition-all rounded-lg text-[#232323] cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <div className="px-3 flex items-center gap-1">
                            <span className="font-extrabold text-[#232323] dark:text-white text-sm">
                              {item.quantity}
                            </span>
                            {(() => {
                              const availableStock = item.variation ? item.variation.stock_quantity : item.product.stock_quantity;
                              if (availableStock > 0) {
                                return <span className="text-xs text-gray-400 font-medium">/ {availableStock}</span>;
                              }
                              return null;
                            })()}
                          </div>
                          <button
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
                            className="p-1 hover:bg-[#3C6CA8]/10 hover:text-[#3C6CA8] transition-all rounded-lg text-[#232323] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Price Details */}
                        <div className="text-right">
                          <div className="text-xl font-extrabold text-[#232323] dark:text-white">
                            ₱{(line ? line.lineSubtotal : item.price * item.quantity).toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                          </div>
                          {line?.bundlePercent ? (
                            <>
                              <div className="text-[11px] text-gray-400 line-through">
                                ₱{(line.unitBasePrice * item.quantity).toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                              </div>
                              <div className="text-[11px] text-[#3C6CA8] font-bold">
                                Saved ₱{line.lineSavings.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                              </div>
                            </>
                          ) : (
                            <div className="text-[11px] text-[#232323]/60 font-medium">
                              ₱{(line ? line.unitFinalPrice : item.price).toLocaleString('en-PH', { minimumFractionDigits: 0 })} each
                            </div>
                          )}
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
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm p-6 sticky top-24 border border-gray-200/80 dark:border-slate-800 text-[#232323]">
              <h2 className="text-xl font-extrabold text-[#232323] dark:text-white mb-5 flex items-center gap-2 border-b border-gray-100 pb-3">
                Order Summary
                <Sparkles className="w-5 h-5 text-[#3C6CA8]" />
              </h2>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-[#232323] text-sm">
                  <span className="font-medium text-[#232323]/80">Subtotal ({cartItems.reduce((sum, item) => sum + item.quantity, 0)} Items)</span>
                  <span className="font-bold text-[#232323] dark:text-white">₱{pricing.subtotalBeforeBundle.toLocaleString('en-PH', { minimumFractionDigits: 0 })}</span>
                </div>

                {pricing.hasBundleDiscount && (
                  <div className="flex justify-between items-center bg-[#3C6CA8]/10 -mx-6 px-6 py-2.5 border-y border-[#3C6CA8]/20">
                    <span className="flex items-center gap-1.5 text-[#3C6CA8] font-bold text-xs uppercase tracking-wider">
                      <Tag className="w-3.5 h-3.5" />
                      Bundle discount
                    </span>
                    <span className="font-black text-[#3C6CA8] text-sm">
                      -₱{pricing.bundleSavings.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                    </span>
                  </div>
                )}

                <div className="pt-2">
                  <div className="flex justify-between text-[#232323] text-sm mb-2">
                    <span className="font-medium text-[#232323]/80">Shipping</span>
                    <span className="font-bold text-[#3C6CA8]">Calculated at checkout</span>
                  </div>
                  
                  {/* Enhanced Delivery & Shipping Rates Panel */}
                  <div className="rounded-2xl border border-[#3C6CA8]/20 dark:border-slate-700 overflow-hidden shadow-sm">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-[#3C6CA8] to-[#4A7FC1] px-3.5 py-2.5 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                        <Truck className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-white text-xs leading-tight">Delivery & Shipping Rates</p>
                        <p className="text-white/70 text-[9px] font-medium">Via J&T Express · Nationwide Coverage</p>
                      </div>
                      <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 bg-white/20 rounded-full text-[9px] font-bold text-white border border-white/20">
                        <BadgeCheck className="w-3 h-3" /> Partner Courier
                      </span>
                    </div>

                    {/* Region Rows */}
                    <div className="bg-white dark:bg-slate-900 divide-y divide-gray-100 dark:divide-slate-800">
                      {/* Luzon */}
                      <div className="flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-blue-50/40 dark:hover:bg-slate-800/60 transition-colors">
                        <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                          <MapPin className="w-3.5 h-3.5 text-[#3C6CA8]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-[#232323] dark:text-slate-100">Luzon</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Clock className="w-2.5 h-2.5 text-gray-400" />
                            <span className="text-[9px] text-gray-500 dark:text-slate-400">2–4 business days</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-black text-[#3C6CA8]">₱150</p>
                          <p className="text-[9px] text-gray-400 font-medium">J&T Express</p>
                        </div>
                      </div>

                      {/* Visayas */}
                      <div className="flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-blue-50/40 dark:hover:bg-slate-800/60 transition-colors">
                        <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                          <Navigation className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-[#232323] dark:text-slate-100">Visayas</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Clock className="w-2.5 h-2.5 text-gray-400" />
                            <span className="text-[9px] text-gray-500 dark:text-slate-400">3–5 business days</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">₱120</p>
                          <p className="text-[9px] text-gray-400 font-medium">J&T Express</p>
                        </div>
                      </div>

                      {/* Mindanao */}
                      <div className="flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-blue-50/40 dark:hover:bg-slate-800/60 transition-colors">
                        <div className="w-7 h-7 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center shrink-0">
                          <Package className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-[#232323] dark:text-slate-100">Mindanao</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Clock className="w-2.5 h-2.5 text-gray-400" />
                            <span className="text-[9px] text-gray-500 dark:text-slate-400">4–6 business days</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-black text-teal-600 dark:text-teal-400">₱90</p>
                          <p className="text-[9px] text-gray-400 font-medium">J&T Express</p>
                        </div>
                      </div>

                      {/* COD / Maxim */}
                      <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-amber-50/60 dark:bg-amber-950/20">
                        <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                          <Zap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-[#232323] dark:text-slate-100">Maxim Delivery</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Truck className="w-2.5 h-2.5 text-gray-400" />
                            <span className="text-[9px] text-gray-500 dark:text-slate-400">Same-day · COD available</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-black text-amber-600 dark:text-amber-400">Booking fee</p>
                          <p className="text-[9px] text-gray-400 font-medium">Cash on Delivery</p>
                        </div>
                      </div>
                    </div>

                    {/* Footer note */}
                    <div className="bg-gray-50 dark:bg-slate-800/60 px-3.5 py-2 flex items-center gap-1.5 border-t border-gray-100 dark:border-slate-700">
                      <Info className="w-3 h-3 text-gray-400 shrink-0" />
                      <p className="text-[9px] text-gray-500 dark:text-slate-400 font-medium">Exact fee calculated at checkout based on your address.</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200/80 dark:border-slate-800 pt-4 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-[#232323] dark:text-white">Total</span>
                    <span className="text-2xl font-black text-[#232323] dark:text-white">
                      ₱{finalTotal.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                    </span>
                  </div>
                  {pricing.hasBundleDiscount && (
                    <p className="text-[11px] text-[#3C6CA8] mt-1.5 text-right font-semibold">
                      Bundle discount applied — promo codes can't be combined.
                    </p>
                  )}
                  <p className="text-[11px] text-[#232323]/60 dark:text-slate-400 mt-1 text-right font-medium">Excluding local shipping fees</p>
                </div>
              </div>

              {/* Styled Branding Action Buttons */}
              <button
                onClick={onCheckout}
                className="w-full bg-[#3C6CA8] hover:bg-[#315A8E] text-white py-4 rounded-xl font-bold text-sm shadow-md hover:shadow-lg transform hover:scale-[1.01] transition-all mb-3 flex items-center justify-center gap-2 cursor-pointer"
              >
                <CreditCard className="w-4 h-4" />
                Proceed to Checkout
              </button>

              <button
                onClick={onContinueShopping}
                className="w-full bg-white hover:bg-gray-50 text-[#3C6CA8] border-2 border-[#3C6CA8] py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer hover:shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Continue Shopping
              </button>

              {/* Trust Badges */}
              <div className="mt-6 pt-5 border-t border-gray-100 dark:border-slate-800 space-y-2.5">
                <p className="flex items-center gap-2 text-xs text-[#232323]/80 dark:text-slate-400 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-[#3C6CA8]" />
                  Secure SSL checkout
                </p>
                <p className="flex items-center gap-2 text-xs text-[#232323]/80 dark:text-slate-400 font-semibold">
                  <Award className="w-4 h-4 text-[#3C6CA8]" />
                  Lab-tested premium products
                </p>
                <p className="flex items-center gap-2 text-xs text-[#232323]/80 dark:text-slate-400 font-semibold">
                  <Truck className="w-4 h-4 text-[#3C6CA8]" />
                  Fast regional delivery 🚚
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
