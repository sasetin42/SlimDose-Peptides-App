import React, { useEffect, useMemo } from 'react';
import { Trash2, ShoppingBag, ArrowLeft, CreditCard, Plus, Minus, Sparkles, Heart, Tag, Info, X, Truck, ShieldCheck, Award, MapPin, Clock, Package, Zap, BadgeCheck, Navigation, ChevronDown } from 'lucide-react';
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

  const totalItemCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );

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
                  className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs p-2.5 sm:p-4 transition-all duration-300 border border-gray-200/70 dark:border-slate-800 hover:border-[#3C6CA8]/40"
                >
                  <div className="flex gap-2.5 sm:gap-4 items-center">
                    <div className="w-14 h-14 sm:w-20 sm:h-20 bg-gray-50 dark:bg-slate-950 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden border border-gray-100 dark:border-slate-800">
                      {item.product.image_url ? (
                        <img
                          src={item.product.image_url}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-xl sm:text-2xl font-bold text-[#3C6CA8]">
                          {item.product.name.charAt(0)}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0 pr-1.5">
                            <h3 className="font-extrabold text-[#232323] dark:text-white text-sm sm:text-base mb-0.5 truncate leading-snug">
                              {item.product.name}
                            </h3>
                            {item.variation && (
                              <p className="text-[11px] sm:text-xs text-[#232323]/70 dark:text-slate-400 font-medium">
                                Var: <span className="text-[#232323] dark:text-slate-200 font-semibold">{item.variation.name}</span>
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => removeFromCart(index)}
                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer shrink-0"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                        </div>

                        {line?.appliedTier && (
                          <div className="mt-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#3C6CA8] text-white">
                              <Tag className="w-2.5 h-2.5" />
                              Bundle: {Number(line.appliedTier.discount_percentage)}% OFF
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-between items-center mt-2 pt-1.5 border-t border-gray-100 dark:border-slate-800">
                        {/* Quantity Counter */}
                        <div className="flex items-center border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 px-1.5 py-0.5 shadow-xs">
                          <button
                            onClick={() => updateQuantity(index, item.quantity - 1)}
                            className="p-1 hover:bg-[#3C6CA8]/10 hover:text-[#3C6CA8] transition-all rounded-lg text-[#232323] dark:text-slate-200 cursor-pointer"
                          >
                            <Minus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          </button>
                          <div className="px-2 flex items-center gap-1">
                            <span className="font-extrabold text-[#232323] dark:text-white text-xs sm:text-sm">
                              {item.quantity}
                            </span>
                            {(() => {
                              const availableStock = item.variation ? item.variation.stock_quantity : item.product.stock_quantity;
                              if (availableStock > 0) {
                                return <span className="text-[10px] text-gray-400 font-medium">/{availableStock}</span>;
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
                            className="p-1 hover:bg-[#3C6CA8]/10 hover:text-[#3C6CA8] transition-all rounded-lg text-[#232323] dark:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          >
                            <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          </button>
                        </div>

                        {/* Price Details */}
                        <div className="text-right">
                          <div className="text-base sm:text-xl font-extrabold text-[#232323] dark:text-white leading-tight">
                            ₱{(line ? line.lineSubtotal : item.price * item.quantity).toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                          </div>
                          {line?.bundlePercent ? (
                            <>
                              <div className="text-[10px] text-gray-400 line-through">
                                ₱{(line.unitBasePrice * item.quantity).toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                              </div>
                              <div className="text-[10px] text-[#3C6CA8] font-bold">
                                Saved ₱{line.lineSavings.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                              </div>
                            </>
                          ) : (
                            <div className="text-[10px] text-[#232323]/60 dark:text-slate-400 font-medium">
                              ₱{(line ? line.unitFinalPrice : item.price).toLocaleString('en-PH', { minimumFractionDigits: 0 })} ea
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
                  
                  {/* Collapsible Delivery & Shipping Rates Panel for Mobile */}
                  <details className="group rounded-2xl border border-[#3C6CA8]/20 dark:border-slate-700 overflow-hidden shadow-xs">
                    <summary className="bg-gradient-to-r from-[#3C6CA8] to-[#4A7FC1] px-3 py-2 sm:px-3.5 sm:py-2.5 flex items-center gap-2 cursor-pointer list-none select-none">
                      <div className="w-5 h-5 rounded-md bg-white/20 flex items-center justify-center shrink-0">
                        <Truck className="w-3 h-3 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white text-xs leading-tight">Delivery & Shipping Rates</p>
                        <p className="text-white/80 text-[9px] font-medium hidden sm:block">Via J&T Express · Nationwide Coverage</p>
                      </div>
                      <ChevronDown className="w-4 h-4 text-white transition-transform group-open:rotate-180 shrink-0" />
                    </summary>

                    {/* Region Rows */}
                    <div className="bg-white dark:bg-slate-900 divide-y divide-gray-100 dark:divide-slate-800">
                      {/* Luzon */}
                      <div className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50/40 dark:hover:bg-slate-800/60 transition-colors">
                        <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                          <MapPin className="w-3 h-3 text-[#3C6CA8]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-[#232323] dark:text-slate-100">Luzon</p>
                          <span className="text-[9px] text-gray-500 dark:text-slate-400">2–4 business days</span>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-black text-[#3C6CA8]">₱150</p>
                        </div>
                      </div>

                      {/* Visayas */}
                      <div className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50/40 dark:hover:bg-slate-800/60 transition-colors">
                        <div className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                          <Navigation className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-[#232323] dark:text-slate-100">Visayas</p>
                          <span className="text-[9px] text-gray-500 dark:text-slate-400">3–5 business days</span>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-black text-indigo-600 dark:text-indigo-400">₱120</p>
                        </div>
                      </div>

                      {/* Mindanao */}
                      <div className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50/40 dark:hover:bg-slate-800/60 transition-colors">
                        <div className="w-6 h-6 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center shrink-0">
                          <Package className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-[#232323] dark:text-slate-100">Mindanao</p>
                          <span className="text-[9px] text-gray-500 dark:text-slate-400">4–6 business days</span>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-black text-teal-600 dark:text-teal-400">₱90</p>
                        </div>
                      </div>

                      {/* COD / Maxim */}
                      <div className="flex items-center gap-2 px-3 py-2 bg-amber-50/60 dark:bg-amber-950/20">
                        <div className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                          <Zap className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-[#232323] dark:text-slate-100">Maxim Delivery</p>
                          <span className="text-[9px] text-gray-500 dark:text-slate-400">Same-day · COD available</span>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[11px] font-black text-amber-600 dark:text-amber-400">Booking fee</p>
                        </div>
                      </div>
                    </div>

                    {/* Footer note */}
                    <div className="bg-gray-50 dark:bg-slate-800/60 px-3 py-1.5 flex items-center gap-1.5 border-t border-gray-100 dark:border-slate-700">
                      <Info className="w-3 h-3 text-gray-400 shrink-0" />
                      <p className="text-[9px] text-gray-500 dark:text-slate-400 font-medium">Exact fee calculated at checkout based on your address.</p>
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
