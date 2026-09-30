import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Sparkles,
  Copy,
  Check,
  Mail,
  User,
  Phone,
  MapPin,
  Package,
  ShieldCheck,
  ArrowLeft,
  ExternalLink,
  MessageCircle,
  FileCheck,
  Send,
  Loader2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatOrderId } from '../utils/orderUtils';
import { dispatchOrderEmail } from '../services/emailService';

// ─── Product Image Lookup Helper ───────────────────────────────────────────
const getProductImageFallback = (item: any): string | null => {
  if (item?.image_url) return item.image_url;
  if (item?.image) return item.image;
  if (item?.product?.image_url) return item.product.image_url;
  if (item?.product?.image) return item.product.image;

  const rawName = item?.product_name || item?.name || item?.product?.name || '';
  if (!rawName) return null;
  return null;
};

export default function Success() {
  // Check if we already have the placed order in localStorage for instant 0ms rendering
  const getInitialOrder = () => {
    try {
      const cached = localStorage.getItem('slimdose_last_order');
      if (cached) {
        const parsed = JSON.parse(cached);
        const searchParams = new URLSearchParams(window.location.search);
        const targetId = searchParams.get('order_id') || searchParams.get('id');
        if (!targetId || parsed.id === targetId || parsed.order_number === targetId) {
          return parsed;
        }
      }
    } catch (e) {
      // ignore parsing error
    }
    return null;
  };

  const initialOrder = React.useMemo(() => getInitialOrder(), []);
  const [order, setOrder] = useState<any>(initialOrder);
  const [loading, setLoading] = useState(!initialOrder);
  const [copied, setCopied] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [emailStatusMessage, setEmailStatusMessage] = useState<string | null>(null);
  const [msgCopied, setMsgCopied] = useState(false);

  // Extract order_id or ref from query parameters
  const searchParams = new URLSearchParams(window.location.search);
  const orderIdParam = searchParams.get('order_id') || searchParams.get('id');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (orderIdParam) {
      // If we already have the matching order loaded from localStorage, fetch silently in the background
      fetchOrderDetails(orderIdParam, !initialOrder);
    } else {
      // Fallback: check localStorage for recent placed order if not already hydrated
      if (!order) {
        const cachedOrder = localStorage.getItem('slimdose_last_order');
        if (cachedOrder) {
          try {
            setOrder(JSON.parse(cachedOrder));
          } catch (e) {
            console.error(e);
          }
        }
      }
      setLoading(false);
    }
  }, [orderIdParam]);

  const itemsList: any[] = React.useMemo(() => Array.isArray(order?.order_items) ? order.order_items : [], [order]);
  const customerName = order?.customer_name || 'Valued Client';
  const customerEmail = order?.customer_email || '';
  const customerPhone = order?.customer_phone || '';
  const address = order?.shipping_address || '';
  const barangay = order?.shipping_barangay || '';
  const city = order?.shipping_city || '';
  const state = order?.shipping_state || '';
  const zip = order?.shipping_zip_code || '';
  const paymentMethod = order?.payment_method_name || 'Manual QR / Bank Transfer';
  const grandTotal = Number(order?.total_price || 0) + Number(order?.shipping_fee || 0);

  const refNumber = formatOrderId(order, { prefix: false });
  const trackingQuery = refNumber || order?.order_number || order?.id || '';
  const trackingUrl = `/track-order?id=${encodeURIComponent(trackingQuery)}`;

  const formattedOrderMessage = React.useMemo(() => {
    if (!order) return '';
    const dateStr = order.created_at ? new Date(order.created_at).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }) : new Date().toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    return `✨ SlimDose Peptides - NEW ORDER

📅 ORDER DATE & TIME
${dateStr}

👤 CUSTOMER INFORMATION
Name: ${customerName}
Email: ${customerEmail || 'N/A'}
Phone: ${customerPhone || 'N/A'}

📍 SHIPPING DETAILS
Address: ${[address, barangay, city, state, zip].filter(Boolean).join(', ')}

💳 PAYMENT METHOD
${paymentMethod}

💰 TOTAL AMOUNT
₱${grandTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}

📋 ORDER ID: ${refNumber}`;
  }, [order, customerName, customerEmail, customerPhone, address, barangay, city, state, zip, paymentMethod, grandTotal, refNumber]);

  const fetchOrderDetails = async (id: string, showSpinner = true) => {
    try {
      if (showSpinner) {
        setLoading(true);
      }
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        setOrder(data);
        try {
          localStorage.setItem('slimdose_last_order', JSON.stringify(data));
        } catch (e) {
          // ignore
        }
      }
    } catch (err) {
      console.error('Error fetching order for success page:', err);
    } finally {
      if (showSpinner) {
        setLoading(false);
      }
    }
  };

  const handleResendEmail = async () => {
    if (!order) return;
    const targetEmail = order.customer_email;
    if (!targetEmail) {
      setEmailStatusMessage('No customer email on file.');
      return;
    }

    try {
      setResendingEmail(true);
      setEmailStatusMessage('Sending order notification...');

      const result = await dispatchOrderEmail('order-confirmed', {
        orderId: order.id,
        orderNumber: order.order_number || order.id,
        customerName: order.customer_name || 'Valued Client',
        customerEmail: targetEmail,
        customerPhone: order.customer_phone || '',
        shippingAddress: [order.shipping_address, order.shipping_barangay, order.shipping_city, order.shipping_state, order.shipping_zip_code].filter(Boolean).join(', '),
        shippingLocation: order.shipping_location,
        shippingFee: order.shipping_fee,
        subtotal: order.subtotal || order.total_price,
        discountApplied: order.discount_applied || 0,
        promoCode: order.promo_code,
        totalPrice: order.total_price,
        paymentMethodName: order.payment_method_name,
        contactMethod: order.contact_method,
        notes: order.notes,
        items: itemsList.map((item: any) => ({
          product_name: item.product_name || item.name || 'Research Peptide',
          variation_name: item.variation_name || item.variation?.name || null,
          quantity: item.quantity || 1,
          price: item.price || 0,
          total: (item.price || 0) * (item.quantity || 1),
        })),
        status: order.order_status || 'Confirmed',
      });

      if (result.success) {
        setEmailStatusMessage('Email sent successfully! Please check your inbox or spam folder.');
      } else {
        setEmailStatusMessage(`Notice: ${result.error || 'Relay pending'}`);
      }
    } catch (err: any) {
      console.error('Error resending email:', err);
      setEmailStatusMessage('Notice: Connection pending. Please verify your email.');
    } finally {
      setResendingEmail(false);
      setTimeout(() => {
        setEmailStatusMessage(null);
      }, 6000);
    }
  };

  const handleCopyOrderRef = async () => {
    const refText = refNumber || order?.order_number || order?.id || '';
    if (!refText) return;
    try {
      await navigator.clipboard.writeText(refText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy ref:', err);
    }
  };

  const handleCopyOrderMessage = async () => {
    if (!formattedOrderMessage) return;
    try {
      await navigator.clipboard.writeText(formattedOrderMessage);
      setMsgCopied(true);
      setTimeout(() => setMsgCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy order message:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4 py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#3C6CA8] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-600 dark:text-slate-400 font-bold">Loading order details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 md:py-12 px-4 sm:px-6 lg:px-8 animate-fadeIn">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header Navigation Bar */}
        <div className="flex items-center justify-between">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-600 hover:text-[#3C6CA8] dark:text-slate-300 dark:hover:text-blue-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Storefront</span>
          </a>
          <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            Order Submitted
          </span>
        </div>

        {/* Success Card Hero */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-sm sm:shadow-xl border border-gray-200/80 dark:border-slate-800 p-4 sm:p-10 text-center relative overflow-hidden">
          {/* Accent Glow Background */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#3C6CA8]/10 dark:bg-[#3C6CA8]/20 rounded-full blur-3xl -z-10 pointer-events-none" />

          {/* Icon Badge */}
          <div className="w-14 h-14 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-[#3C6CA8] to-blue-500 text-white flex items-center justify-center mx-auto mb-3 sm:mb-6 shadow-md sm:shadow-xl shadow-blue-500/20 ring-4 sm:ring-8 ring-blue-50 dark:ring-slate-800">
            <CheckCircle2 className="w-7 h-7 sm:w-12 sm:h-12" />
          </div>

          <h1 className="text-xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-1.5 sm:mb-2 flex items-center justify-center gap-1.5 flex-wrap">
            Thank You For Your Purchase! <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 inline" />
          </h1>
          <p className="text-xs sm:text-base text-slate-600 dark:text-slate-300 font-medium max-w-xl mx-auto leading-relaxed">
            Your order has been received and registered into the SlimDose system.
          </p>

          {/* Reference Badge & Direct Live Tracking Link */}
          <div className="mt-3.5 sm:mt-6 inline-flex items-center gap-2 sm:gap-3 bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs hover:border-[#3C6CA8]/50 transition-all">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Order Ref:</span>
            <a
              href={trackingUrl}
              className="font-mono font-extrabold text-[#3C6CA8] hover:text-[#2a4d77] dark:text-blue-400 dark:hover:text-blue-300 text-xs sm:text-base underline decoration-dotted underline-offset-2 hover:decoration-solid flex items-center gap-1.5 transition-all group"
              title="Click to track this order in real time"
            >
              <span>{refNumber}</span>
              <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </a>
            <button
              onClick={handleCopyOrderRef}
              className="p-1 text-slate-400 hover:text-[#3C6CA8] transition-colors cursor-pointer ml-1"
              title="Copy Order Reference"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* ORDER MESSAGE & TELEGRAM SECTION (Image 2 Design) */}
        <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 space-y-4">
          {/* Card Box */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <MessageCircle className="w-5 h-5 text-[#102A45] dark:text-blue-400" />
                <h3 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base leading-tight">
                  Your Order Message
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCopyOrderMessage}
                className="px-3.5 py-1.5 bg-[#102A45] hover:bg-[#183a5e] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
              >
                {msgCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Formatted Code Block */}
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed overflow-x-auto max-h-60">
              {formattedOrderMessage}
            </div>
          </div>

          {/* Telegram Action Button & Helper Text */}
          <div className="space-y-2 text-center pt-1">
            <a
              href="https://t.me/slimdose_mnl"
              target="_blank"
              rel="noreferrer"
              className="w-full py-3.5 px-6 bg-[#102A45] hover:bg-[#183a5e] text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-md transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-98"
            >
              <MessageCircle className="w-5 h-5 text-white" />
              <span>Open Telegram</span>
            </a>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center justify-center gap-1.5">
              <span>💡</span>
              <span>If Telegram doesn't open, copy the message above and visit our page manually</span>
            </p>
          </div>
        </div>

        {/* WHAT HAPPENS NEXT? SECTION (Image 3 Design) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-7 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-base sm:text-lg font-black text-[#102A45] dark:text-white">
              What Happens Next?
            </h3>
            <Sparkles className="w-5 h-5 text-[#3C6CA8]" />
          </div>

          <div className="space-y-3.5 pt-1">
            {/* Step 1 */}
            <div className="flex items-start gap-3.5">
              <div className="w-7 h-7 rounded-lg bg-[#6B87A8] text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                1
              </div>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium leading-snug pt-0.5">
                Send your order details and payment screenshot — we'll confirm within 24 hours or less.
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3.5">
              <div className="w-7 h-7 rounded-lg bg-[#6B87A8] text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                2
              </div>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium leading-snug pt-0.5">
                Your products are carefully packed and prepared for shipping.
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3.5">
              <div className="w-7 h-7 rounded-lg bg-[#6B87A8] text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                3
              </div>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium leading-snug pt-0.5">
                Payments made before 11 AM are shipped the same day.
              </p>
            </div>

            {/* Step 4 */}
            <div className="flex items-start gap-3.5">
              <div className="w-7 h-7 rounded-lg bg-[#6B87A8] text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                4
              </div>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium leading-snug pt-0.5">
                You can check your order status anytime on our{' '}
                <a
                  href={trackingUrl}
                  className="font-bold text-[#3C6CA8] hover:text-[#2a4d77] underline underline-offset-2"
                >
                  Track Order page
                </a>{' '}
                using your Order ID.
              </p>
            </div>
          </div>
        </div>

        {/* CRITICAL NOTICE: Admin Approval & Notification Protocol */}
        <div className="bg-amber-50/90 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-800 rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-xs">
          <div className="space-y-1.5 sm:space-y-2 min-w-0">
            <div className="flex items-center justify-between flex-wrap gap-1.5">
              <h3 className="text-sm sm:text-lg font-extrabold text-amber-900 dark:text-amber-200 leading-tight">
                Transaction Pending Admin Approval
              </h3>
              <span className="text-[9px] sm:text-[10px] font-extrabold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full border border-amber-300 dark:border-amber-700 shrink-0">
                Verification In Progress
              </span>
            </div>
            <p className="text-[11px] sm:text-sm text-amber-800/90 dark:text-amber-300/90 leading-snug sm:leading-relaxed font-normal">
              Please note that your transaction is subject to manual verification and approval by our SlimDose Store Administrator. Once your payment receipt is verified, you will receive an automatic confirmation update:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 pt-1 sm:pt-2">
              <div className="p-2.5 sm:p-3 bg-white/80 dark:bg-slate-900/80 rounded-xl sm:rounded-2xl border border-amber-200 dark:border-amber-900/50 flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">Email Notification</span>
                    <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate block" title={customerEmail}>{customerEmail || 'your email address'}</span>
                  </div>
                </div>
                {customerEmail && (
                  <button
                    type="button"
                    onClick={handleResendEmail}
                    disabled={resendingEmail}
                    className="shrink-0 px-2.5 py-1 text-[10px] sm:text-xs font-bold rounded-lg bg-blue-50 hover:bg-blue-100 text-[#3C6CA8] border border-blue-200/80 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-2xs"
                    title="Resend order confirmation email"
                  >
                    {resendingEmail ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Send className="w-2.5 h-2.5" />
                    )}
                    <span>{resendingEmail ? 'Sending...' : 'Resend'}</span>
                  </button>
                )}
              </div>

              <div className="p-2.5 sm:p-3 bg-white/80 dark:bg-slate-900/80 rounded-xl sm:rounded-2xl border border-amber-200 dark:border-amber-900/50 flex items-center gap-2.5">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">Account & SMS Update</span>
                  <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 block truncate">Track live in your store account</span>
                </div>
              </div>
            </div>

            {emailStatusMessage && (
              <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-[#3C6CA8] text-xs font-bold animate-fadeIn flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#3C6CA8] shrink-0" />
                <span>{emailStatusMessage}</span>
              </div>
            )}
          </div>
        </div>

        {/* Order Details & Summary Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          
          {/* Customer & Shipping Summary */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-sm sm:shadow-xl border border-gray-200/80 dark:border-slate-800 p-3.5 sm:p-6 space-y-3 sm:space-y-4">
              <h2 className="text-sm sm:text-lg font-bold text-slate-900 dark:white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5 sm:pb-3">
                <FileCheck className="w-4 h-4 sm:w-5 sm:h-5 text-[#3C6CA8]" />
                Customer & Shipping Information
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4 text-xs sm:text-sm">
                <div className="p-2.5 sm:p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl sm:rounded-2xl border border-slate-150 dark:border-slate-700/60 space-y-0.5 sm:space-y-1">
                  <span className="text-[9px] sm:text-[10px] uppercase font-extrabold text-slate-400 block">Customer Name</span>
                  <span className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-1.5 truncate">
                    <User className="w-3.5 h-3.5 text-[#3C6CA8] shrink-0" /> <span className="truncate">{customerName}</span>
                  </span>
                </div>

                <div className="p-2.5 sm:p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl sm:rounded-2xl border border-slate-150 dark:border-slate-700/60 space-y-0.5 sm:space-y-1 min-w-0">
                  <span className="text-[9px] sm:text-[10px] uppercase font-extrabold text-slate-400 block">Contact Information</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs sm:text-sm flex items-center gap-1.5 truncate">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" /> <span className="truncate">{customerEmail || '—'}</span>
                  </p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs sm:text-sm flex items-center gap-1.5 truncate">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" /> <span className="truncate">{customerPhone || '—'}</span>
                  </p>
                </div>

                {address && (
                  <div className="sm:col-span-2 p-2.5 sm:p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl sm:rounded-2xl border border-slate-150 dark:border-slate-700/60 space-y-0.5 sm:space-y-1">
                    <span className="text-[9px] sm:text-[10px] uppercase font-extrabold text-slate-400 block">Delivery Address</span>
                    <p className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm flex items-start gap-1.5 leading-snug">
                      <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-500 shrink-0 mt-0.5" />
                      <span>
                        {address}, {barangay ? `${barangay}, ` : ''}{city}, {state} {zip}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Order Items Table */}
            {itemsList.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-sm sm:shadow-xl border border-gray-200/80 dark:border-slate-800 p-3.5 sm:p-6 space-y-3 sm:space-y-4">
                <h2 className="text-sm sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5 sm:pb-3">
                  <Package className="w-4 h-4 sm:w-5 sm:h-5 text-[#3C6CA8]" />
                  Ordered Items ({itemsList.reduce((acc, i) => acc + (i.quantity || 1), 0)})
                </h2>

                <div className="space-y-2 sm:space-y-3">
                  {itemsList.map((item, idx) => {
                    const itemImg = getProductImageFallback(item);
                    return (
                      <div key={idx} className="p-2 sm:p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl sm:rounded-2xl border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {itemImg ? (
                            <img
                              src={itemImg}
                              alt={item.product_name || 'Product'}
                              className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover border border-slate-200/80 dark:border-slate-700 shrink-0 bg-white dark:bg-slate-800 shadow-xs"
                            />
                          ) : (
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-50 dark:bg-slate-800 text-[#3C6CA8] flex items-center justify-center font-extrabold text-xs shrink-0 border border-blue-100 dark:border-slate-700">
                              x{item.quantity}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              {itemImg && (
                                <span className="text-[10px] font-extrabold text-[#3C6CA8] dark:text-blue-400 bg-blue-50 dark:bg-slate-800 px-1.5 py-0.5 rounded-md border border-blue-100 dark:border-slate-700">
                                  x{item.quantity}
                                </span>
                              )}
                              <p className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate">{item.product_name}</p>
                            </div>
                            {item.variation_name && (
                              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 block truncate mt-0.5">{item.variation_name}</span>
                            )}
                          </div>
                        </div>
                        <span className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm shrink-0">
                          ₱{Number(item.total || item.price * item.quantity || 0).toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Payment & Action Column */}
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-sm sm:shadow-xl border border-gray-200/80 dark:border-slate-800 p-3.5 sm:p-6 space-y-3 sm:space-y-4">
              <h2 className="text-sm sm:text-lg font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2.5 sm:pb-3">
                Payment Summary
              </h2>

              <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                  <span>Selected Channel</span>
                  <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate max-w-[140px] text-right">{paymentMethod}</span>
                </div>

                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                  <span>Subtotal</span>
                  <span className="font-bold text-slate-900 dark:text-white">₱{Number(order?.total_price || 0).toLocaleString('en-PH')}</span>
                </div>

                <div className="flex justify-between items-start text-slate-600 dark:text-slate-400 gap-2">
                  <div className="min-w-0">
                    <span className="block">Shipping Fee</span>
                    {order?.shipping_location && (
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate">
                        {order.shipping_location.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    {Number(order?.shipping_fee || 0) === 0 ? (
                      <div className="flex flex-col items-end">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">₱0.00</span>
                        <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                          {order?.shipping_note || 'Customer Pays Rider'}
                        </span>
                      </div>
                    ) : (
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        ₱{Number(order?.shipping_fee || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-2 sm:pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-baseline">
                  <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">Total Paid</span>
                  <span className="text-xl sm:text-2xl font-black text-[#3C6CA8] dark:text-blue-400">
                    ₱{grandTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2 sm:space-y-3">
              <a
                href={trackingUrl}
                className="w-full py-3 px-4 bg-[#3C6CA8] hover:bg-[#315A8E] text-white font-extrabold text-xs sm:text-sm rounded-xl sm:rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Track Order Status</span>
              </a>

              <a
                href="https://t.me/slimdose_mnl"
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl sm:rounded-2xl transition-all flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-3.5 h-3.5 text-blue-500" />
                <span>Contact Telegram Support</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
