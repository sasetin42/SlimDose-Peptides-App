import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Package,
  Truck,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  ArrowLeft,
  ShieldCheck,
  Copy,
  Check,
  RefreshCw,
  MapPin,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, doc, getDoc, getDocs, limit as fsLimit, onSnapshot, query, where } from 'firebase/firestore';
import { normalizeSdpToSld, formatOrderId } from '../utils/orderUtils';


interface TrackingOrderItem {
    product_name: string;
    quantity: number;
}

interface TrackingOrder {
    id: string;
    order_number: string | null;
    order_status: string;
    payment_status: string;
    payment_method_name?: string | null;
    customer_name?: string | null;
    customer_email?: string | null;
    customer_phone?: string | null;
    shipping_address?: string | null;
    shipping_barangay?: string | null;
    shipping_city?: string | null;
    shipping_state?: string | null;
    shipping_zip_code?: string | null;
    shipping_location?: string | null;
    tracking_number: string | null;
    tracking_courier: string | null;
    shipping_provider: string | null;
    shipping_note: string | null;
    notes?: string | null;
    total_price: number;
    shipping_fee: number;
    items: TrackingOrderItem[];
    courier_code: string | null;
    courier_name: string | null;
    tracking_url_template: string | null;
    created_at: string;
}

const OrderTracking: React.FC = () => {
    const [orderId, setOrderId] = useState('');
    const [order, setOrder] = useState<TrackingOrder | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(false);
    const [copiedTracking, setCopiedTracking] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const initialId = params.get('id') || params.get('order_id') || params.get('ref') || params.get('order_number');
        if (initialId) {
            setOrderId(initialId);
            fetchOrder(initialId);
        }
    }, []);

    /* ────────────────────────────────────────────────────────────────────
     * Public tracking lookup — reads the sanitized mirror collection
     * /public_order_tracking/{order_number} maintained by the Cloud Function
     * onOrderTrackingMirror. Guests need no auth; updates stream in realtime
     * via onSnapshot while a result is displayed.
     * ─────────────────────────────────────────────────────────────────── */
    const liveUnsubRef = useRef<(() => void) | null>(null);

    const mapTrackingDoc = (docId: string, d: any): TrackingOrder => ({
        id: docId,
        order_number: d.order_number ? normalizeSdpToSld(String(d.order_number)) : null,
        order_status: d.order_status || 'new',
        payment_status: d.payment_status || 'pending',
        payment_method_name: d.payment_method_name || null,
        customer_name: d.customer_name || null,
        customer_email: d.customer_email || null,
        customer_phone: d.customer_phone || null,
        shipping_address: d.shipping_address || null,
        shipping_barangay: d.shipping_barangay || null,
        shipping_city: d.shipping_city || null,
        shipping_state: d.shipping_state || null,
        shipping_zip_code: d.shipping_zip_code || null,
        shipping_location: d.shipping_location || null,
        tracking_number: d.tracking_number || null,
        tracking_courier: d.tracking_courier || null,
        shipping_provider: d.shipping_provider || null,
        shipping_note: d.shipping_note || null,
        notes: d.notes || null,
        total_price: Number(d.total_price || 0),
        shipping_fee: Number(d.shipping_fee || 0),
        items: Array.isArray(d.items)
            ? d.items.map((i: any) => ({
                product_name: i.name || i.product_name || i.product?.name || 'Item',
                quantity: Number(i.quantity || 1),
            }))
            : [],
        courier_code: null,
        courier_name: d.tracking_courier || null,
        tracking_url_template: d.tracking_url_template || null,
        created_at: d.created_at
            ? new Date(Number(d.created_at)).toISOString()
            : new Date().toISOString(),
    });

    const stopLive = () => {
        if (liveUnsubRef.current) {
            try { liveUnsubRef.current(); } catch { /* noop */ }
            liveUnsubRef.current = null;
        }
    };

    const fetchOrder = async (queryStr: string) => {
        const rawQuery = queryStr.trim();
        if (!rawQuery) return;

        // Strip prefixes like "ID:", "Order ID:", "Order #:", "#", "ORD-"
        const cleanQuery = rawQuery
            .replace(/^(id\s*:\s*|order\s*id\s*:\s*|order\s*#?\s*:\s*|ref\s*:\s*|ord-)/i, '')
            .replace(/^#+/, '')
            .trim();

        // Normalise the query itself to canonical SDP: SLD-000960 / ORD-000960 / SDP0960 → SDP-000960
        const normalisedQuery = normalizeSdpToSld(cleanQuery);

        // Build candidate search keys (covers SLD↔SDP bridging + tracking numbers)
        const digitMatch = cleanQuery.match(/\d+/);
        const digits = digitMatch ? digitMatch[0] : null;
        const searchCandidates = Array.from(new Set([
            rawQuery,
            cleanQuery,
            normalisedQuery,
            cleanQuery.toUpperCase(),
            cleanQuery.toLowerCase(),
            cleanQuery.replace(/[\s\-_]/g, ''),
            cleanQuery.replace(/^([a-zA-Z]+)(\d+)$/, '$1-$2'),
            cleanQuery.replace(/^([a-zA-Z]+)-?(\d+)$/, 'SDP-$2'),
            cleanQuery.replace(/^([a-zA-Z]+)-?(\d+)$/, 'SDP$2'),
            cleanQuery.replace(/^([a-zA-Z]+)-?(\d+)$/, 'SLD-$2'),
            cleanQuery.replace(/^([a-zA-Z]+)-?(\d+)$/, 'ORD-$2'),
            ...(digits ? [
                digits,
                `SDP${digits}`,
                `SDP-${digits}`,
                `SDP-${digits.padStart(6, '0')}`,
                `SDP${digits.padStart(4, '0')}`,
                `SDP-${digits.padStart(4, '0')}`,
                `SLD-${digits.padStart(6, '0')}`,
                `ORD-${digits.padStart(6, '0')}`,
                `SDP${String(parseInt(digits, 10))}`,
            ] : []),
        ].filter(Boolean)));

        setLoading(true);
        setError(null);
        setOrder(null);
        setHasSearched(true);
        stopLive();

        try {
            let docId: string | null = null;
            let rawData: any = null;

            // 1. Direct doc-ID hits (mirror is keyed by order_number)
            for (const cand of searchCandidates) {
                const snap = await getDoc(doc(db, 'public_order_tracking', cand));
                if (snap.exists()) {
                    docId = snap.id;
                    rawData = snap.data();
                    break;
                }
            }

            // 2. Field lookup (e.g. guest pasted a tracking number, not the order no.)
            if (!rawData) {
                const fieldQueries = [
                    query(collection(db, 'public_order_tracking'), where('order_number', '==', cleanQuery), fsLimit(1)),
                    query(collection(db, 'public_order_tracking'), where('tracking_number', '==', cleanQuery), fsLimit(1)),
                    ...(digits ? [query(collection(db, 'public_order_tracking'), where('tracking_number', '==', digits), fsLimit(1))] : []),
                ];
                for (const fq of fieldQueries) {
                    const snap = await getDocs(fq);
                    if (!snap.empty) {
                        docId = snap.docs[0].id;
                        rawData = snap.docs[0].data();
                        break;
                    }
                }
            }

            if (rawData && docId) {
                setOrder(mapTrackingDoc(docId, rawData));
                if (rawData.order_number) {
                    setOrderId(normalizeSdpToSld(String(rawData.order_number)));
                }
            } else {
                setError(`No order found matching "${rawQuery}". Please check your order reference number and try again.`);
            }
        } catch (err: any) {
            console.error('Error fetching order:', err);
            setError('An error occurred while searching for your order. Please verify your reference ID and try again.');
        } finally {
            setLoading(false);
        }
    };

    // Realtime subscription: mirrors stream order changes to the guest live.
    // Keyed on the raw mirror doc id (order.id) so non-canonical legacy order
    // numbers still round-trip correctly.
    useEffect(() => {
        stopLive();
        if (!order?.id) return;
        const key = order.id;
        liveUnsubRef.current = onSnapshot(
            doc(db, 'public_order_tracking', key),
            { includeMetadataChanges: false },
            (snap) => {
                if (!snap.exists()) return;
                const fresh = mapTrackingDoc(snap.id, snap.data());
                setOrder((prev) => (prev ? { ...prev, ...fresh } : fresh));
            },
            (err) => {
                console.warn('[OrderTracking] live subscription note:', err);
            }
        );
        return stopLive;
    }, [order?.id]);



    const handleTrack = async (e?: React.FormEvent, searchVal?: string) => {
        if (e) e.preventDefault();
        fetchOrder(searchVal || orderId);
    };

    const getStatusStep = (status: string) => {
        const steps = ['new', 'confirmed', 'processing', 'shipped', 'delivered'];
        const statusIndex = steps.indexOf(status?.toLowerCase());
        if (status === 'cancelled') return -1;
        return statusIndex >= 0 ? statusIndex : 1;
    };

    const currentStep = order ? getStatusStep(order.order_status) : 0;

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedTracking(true);
        setTimeout(() => setCopiedTracking(false), 2000);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-4 sm:py-8 px-2.5 sm:px-6 lg:px-8 animate-fadeIn">
            <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
                {/* Navigation Bar */}
                <div className="flex items-center justify-between">
                    <a
                        href="/"
                        className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-900 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full shadow-xs border border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-300 hover:text-[#3C6CA8] dark:hover:text-blue-400 transition-all font-bold text-xs sm:text-sm"
                    >
                        <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span>Back to Store</span>
                    </a>

                </div>

                {/* Hero Header */}
                <div className="text-center space-y-1.5 sm:space-y-2 py-2 sm:py-4">
                    <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#3C6CA8] via-blue-600 to-[#294E7A] text-white flex items-center justify-center mx-auto shadow-md sm:shadow-lg shadow-blue-600/20">
                        <Truck className="w-5 h-5 sm:w-7 sm:h-7" />
                    </div>
                    <h1 className="text-xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                        Live Order & Package Tracking
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                        Track your peptide shipment status and courier details in real time.
                    </p>
                </div>

                {/* Search Box */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-sm sm:shadow-xl p-3.5 sm:p-7 border border-gray-200 dark:border-slate-800">
                    <form onSubmit={(e) => handleTrack(e)} className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                            <input id="ordertracking-input-1" name="input_1" type="text"
                                value={orderId}
                                onChange={(e) => setOrderId(e.target.value)}
                                placeholder="Enter Order ID or Number (e.g., SDP0961)..."
                                className="w-full text-xs sm:text-base pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-800 dark:text-slate-100 focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] outline-none transition-all font-medium"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading || !orderId.trim()}
                            className="bg-[#3C6CA8] hover:bg-[#315A8E] text-white px-6 sm:px-8 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm shadow-md sm:shadow-lg shadow-[#3C6CA8]/20 hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95 shrink-0"
                        >
                            {loading ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    <span>Searching...</span>
                                </>
                            ) : (
                                <>
                                    <span>Track Order</span>
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Quick Demo Help Suggestions */}
                    <div className="mt-3 pt-3 sm:mt-4 sm:pt-4 border-t border-gray-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] sm:text-xs text-gray-400 gap-1.5 sm:gap-2">
                        <span className="flex items-center gap-1 font-medium text-gray-500 dark:text-slate-400">
                            <HelpCircle className="w-3.5 h-3.5 text-[#3C6CA8] shrink-0" /> Need your order number? Check your email confirmation.
                        </span>
                    </div>
                </div>

                {/* Error Result */}
                {error && (
                    <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl sm:rounded-2xl p-3 sm:p-5 flex items-center gap-2.5 sm:gap-3 text-rose-700 dark:text-rose-300 animate-fadeIn">
                        <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                        <div className="text-xs sm:text-sm font-medium">
                            <p className="font-bold text-xs sm:text-sm">Order Search Alert</p>
                            <p className="mt-0.5 text-[11px] sm:text-xs">{error}</p>
                        </div>
                    </div>
                )}

                {/* Detailed Results */}
                {hasSearched && order && (
                    <div className="space-y-6 animate-fadeIn">
                        {/* Main Status & Banner */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-xl border border-gray-200 dark:border-slate-800 overflow-hidden">
                            <div className="bg-gradient-to-r from-slate-900 via-[#294E7A] to-slate-900 p-4 sm:p-6 md:p-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
                                <div>
                                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                        <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-blue-200 bg-white/10 px-2 py-0.5 rounded-full border border-white/20 flex items-center gap-1">
                                            <span className="relative flex h-2 w-2">
                                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-300 opacity-75"></span>
                                              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400"></span>
                                            </span>
                                            LIVE STATUS
                                        </span>
                                        <span className="text-[10px] sm:text-xs text-emerald-400 font-bold flex items-center gap-1">
                                            <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Verified
                                        </span>
                                    </div>
                                    <h2 className="text-xl sm:text-2xl font-extrabold capitalize flex items-center gap-2 text-white">
                                        {order.order_status === 'new' && <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />}
                                        {order.order_status === 'confirmed' && <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />}
                                        {order.order_status === 'processing' && <Package className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />}
                                        {order.order_status === 'shipped' && <Truck className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />}
                                        {order.order_status === 'delivered' && <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />}
                                        {order.order_status === 'cancelled' && <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-rose-500" />}
                                        <span>{order.order_status}</span>
                                    </h2>
                                </div>
                                <div className="md:text-right bg-white/10 backdrop-blur-sm p-2.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl border border-white/15">
                                    <p className="text-[10px] sm:text-[11px] text-blue-200 uppercase font-extrabold tracking-wider">Order Reference</p>
                                    <p className="font-mono text-sm sm:text-base font-extrabold text-white">
                                        {formatOrderId(order, { prefix: false })}
                                    </p>
                                </div>
                            </div>

                            <div className="p-4 sm:p-6 md:p-8">
                                 {/* Interactive Timeline Progress - Solid Filled Complete Steps */}
                                {order.order_status !== 'cancelled' ? (
                                    <div className="mb-6 sm:mb-8 bg-slate-50/80 dark:bg-slate-950/40 p-4 sm:p-6 rounded-2xl border border-gray-200/80 dark:border-slate-800">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                                <Sparkles className="w-3.5 h-3.5 text-[#3C6CA8]" /> Delivery Timeline
                                            </span>
                                            <span className="text-[11px] sm:text-xs font-bold text-[#3C6CA8] dark:text-blue-400">
                                                Step {Math.max(1, currentStep + 1)} of 5 ({Math.round(((currentStep + 1) / 5) * 100)}%)
                                            </span>
                                        </div>

                                        <div className="relative">
                                            {/* Background Track */}
                                            <div className="absolute top-4 sm:top-5 left-4 right-4 h-1.5 bg-gray-200 dark:bg-slate-800 rounded-full -translate-y-1/2" />
                                            {/* Solid Progress Fill */}
                                            <div
                                                className="absolute top-4 sm:top-5 left-4 h-1.5 bg-[#3C6CA8] rounded-full -translate-y-1/2 transition-all duration-500 shadow-sm"
                                                style={{ width: `calc(${Math.min(100, Math.max(0, (currentStep / 4) * 100))}% * (100% - 2rem) / 100)` }}
                                            />

                                            <div className="relative flex justify-between">
                                                {[
                                                    { title: 'Placed', subtitle: 'Order received', icon: Clock },
                                                    { title: 'Confirmed', subtitle: 'Payment verified', icon: ShieldCheck },
                                                    { title: 'Processing', subtitle: 'Cold-chain packed', icon: Package },
                                                    { title: 'Shipped', subtitle: 'In transit with rider', icon: Truck },
                                                    { title: 'Delivered', subtitle: 'Successfully received', icon: CheckCircle }
                                                ].map((step, index) => {
                                                    const isCompleted = index <= currentStep;
                                                    const isCurrent = index === currentStep;
                                                    const StepIcon = step.icon;

                                                    return (
                                                        <div key={step.title} className="flex flex-col items-center text-center max-w-[70px] sm:max-w-[100px]">
                                                            {/* Step Node Icon */}
                                                            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-300 ${
                                                                isCompleted
                                                                    ? 'bg-[#3C6CA8] text-white shadow-md shadow-[#3C6CA8]/25 ring-2 ring-[#3C6CA8]/30'
                                                                    : 'bg-white dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-800 text-gray-300 dark:text-slate-700'
                                                            } ${isCurrent ? 'scale-110 ring-4 ring-[#3C6CA8]/25 animate-pulse' : ''}`}>
                                                                <StepIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                                            </div>
                                                            <span className={`text-[10px] sm:text-xs font-black mt-2 ${
                                                                isCompleted ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-slate-600'
                                                            }`}>
                                                                {step.title}
                                                            </span>
                                                            <span className="text-[9px] text-gray-400 dark:text-slate-500 hidden sm:block leading-tight font-medium mt-0.5">
                                                                {step.subtitle}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-rose-50 dark:bg-rose-950/40 rounded-xl sm:rounded-2xl p-4 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 mb-5 flex items-center gap-2.5">
                                        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                                        <div>
                                            <p className="font-bold text-xs sm:text-sm">Order Cancelled</p>
                                            <p className="text-[11px] sm:text-xs">This order has been cancelled. Please contact customer support for further assistance.</p>
                                        </div>
                                    </div>
                                )}

                                {/* Information Details Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6">
                                    {/* Customer & Delivery Address Card */}
                                    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-gray-200 dark:border-slate-700 space-y-3">
                                        <h3 className="font-extrabold text-xs sm:text-sm text-gray-900 dark:text-white flex items-center justify-between border-b border-gray-200/80 dark:border-slate-700/80 pb-2">
                                            <span className="flex items-center gap-1.5">
                                                <MapPin className="w-4 h-4 text-rose-500" /> Delivery Details
                                            </span>
                                            {order.shipping_location && (
                                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-[#3C6CA8]/10 text-[#3C6CA8] dark:text-blue-300">
                                                    {order.shipping_location.replace(/_/g, ' ')}
                                                </span>
                                            )}
                                        </h3>

                                        {order.customer_name && (
                                            <div>
                                                <span className="text-[10px] uppercase font-bold text-gray-400 block">Recipient</span>
                                                <span className="font-extrabold text-xs sm:text-sm text-gray-900 dark:text-white">
                                                    {order.customer_name}
                                                </span>
                                                {order.customer_phone && (
                                                    <span className="text-xs text-gray-500 dark:text-slate-400 ml-2">
                                                        ({order.customer_phone})
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {order.shipping_address ? (
                                            <div>
                                                <span className="text-[10px] uppercase font-bold text-gray-400 block">Delivery Address</span>
                                                <p className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-slate-200 leading-snug mt-0.5">
                                                    {order.shipping_address}
                                                    {order.shipping_barangay ? `, ${order.shipping_barangay}` : ''}
                                                    {order.shipping_city ? `, ${order.shipping_city}` : ''}
                                                    {order.shipping_state ? `, ${order.shipping_state}` : ''}
                                                    {order.shipping_zip_code ? ` ${order.shipping_zip_code}` : ''}
                                                </p>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-gray-400 italic">Address provided upon courier hand-off</p>
                                        )}

                                        {order.notes && (
                                            <div className="pt-2 border-t border-gray-200/60 dark:border-slate-700/60">
                                                <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 block">Delivery Notes</span>
                                                <p className="text-xs text-gray-700 dark:text-slate-300 font-medium">
                                                    {order.notes}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Courier Tracking Box */}
                                    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-gray-200 dark:border-slate-700 space-y-3">
                                        <h3 className="font-extrabold text-xs sm:text-sm text-gray-900 dark:text-white flex items-center justify-between border-b border-gray-200/80 dark:border-slate-700/80 pb-2">
                                            <span className="flex items-center gap-1.5">
                                                <Truck className="w-4 h-4 text-[#3C6CA8]" /> Courier Dispatch
                                            </span>
                                        </h3>
                                        {order.tracking_number ? (
                                            <div className="space-y-3">
                                                <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-gray-200 dark:border-slate-800">
                                                    <p className="text-[10px] sm:text-[11px] text-gray-400 uppercase font-bold tracking-wider mb-1 flex items-center justify-between">
                                                        <span>Waybill / Tracking No.{order.courier_name ? ` (${order.courier_name})` : ''}</span>
                                                        <button
                                                            onClick={() => copyToClipboard(order.tracking_number!)}
                                                            className="inline-flex items-center gap-1 text-xs text-[#3C6CA8] hover:underline font-bold cursor-pointer"
                                                        >
                                                            {copiedTracking ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                                            <span>{copiedTracking ? 'Copied' : 'Copy'}</span>
                                                        </button>
                                                    </p>
                                                    <p className="text-base sm:text-lg font-mono font-extrabold text-gray-900 dark:text-white tracking-wider">
                                                        {order.tracking_number}
                                                    </p>
                                                </div>

                                                {(() => {
                                                    const trackingUrl = order.tracking_url_template
                                                        ? order.tracking_url_template.replace('{tracking_number}', order.tracking_number).replace('{TRACKING_NUMBER}', order.tracking_number)
                                                        : `https://www.jtexpress.ph/trajectoryQuery?bills=${order.tracking_number}`;
                                                    const label = order.courier_name ? `Track Live on ${order.courier_name}` : 'Track Live on Courier';
                                                    return (
                                                        <a
                                                            href={trackingUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="block w-full py-2.5 sm:py-3 bg-[#3C6CA8] hover:bg-[#315A8E] text-white text-center rounded-xl font-extrabold text-xs sm:text-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                                                        >
                                                            <span>{label}</span>
                                                            <ExternalLink className="w-3.5 h-3.5" />
                                                        </a>
                                                    );
                                                })()}
                                            </div>
                                        ) : (
                                            <div className="text-center py-4 text-gray-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800">
                                                <Truck className="w-7 h-7 sm:w-8 sm:h-8 mx-auto mb-1.5 opacity-30 text-[#3C6CA8]" />
                                                <p className="font-extrabold text-xs sm:text-sm text-gray-700 dark:text-slate-200">No tracking number assigned yet</p>

                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Order Summary & Financials */}
                                <div className="space-y-3 sm:space-y-4">
                                    {order.shipping_note && (
                                        <div className="bg-blue-50 dark:bg-slate-800/80 rounded-xl p-3.5 sm:p-4 border border-blue-200 dark:border-slate-700">
                                            <h3 className="font-bold text-[#3C6CA8] dark:text-blue-300 mb-1 flex items-center gap-1.5 text-[10px] sm:text-xs uppercase tracking-wider">
                                                <Package className="w-3.5 h-3.5" /> Special Shipping Note
                                            </h3>
                                            <p className="text-gray-800 dark:text-slate-200 text-xs leading-relaxed font-medium">
                                                {order.shipping_note}
                                            </p>
                                        </div>
                                    )}

                                    <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200 dark:border-slate-800">
                                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3 mb-3 flex-wrap gap-2">
                                            <h3 className="font-extrabold text-gray-900 dark:text-white text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2">
                                                <Package className="w-4 h-4 text-[#3C6CA8]" /> Ordered Package Items
                                            </h3>
                                            <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
                                                {(order.items || []).length} Product Line{(order.items || []).length === 1 ? '' : 's'}
                                            </span>
                                        </div>

                                        <div className="divide-y divide-gray-100 dark:divide-slate-800 mb-4">
                                            {(order.items || []).map((item, idx) => (
                                                <div key={idx} className="py-2.5 flex justify-between items-center text-xs sm:text-sm">
                                                    <span className="font-bold text-gray-800 dark:text-slate-200">{item.quantity}x {item.product_name}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3 sm:p-4 space-y-2 border border-slate-200/70 dark:border-slate-700/60">
                                            <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                                                <span>Subtotal</span>
                                                <span className="font-bold text-slate-900 dark:text-white">₱{Number(order.total_price || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                                            </div>
                                            <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                                                <span>Shipping Fee ({order.shipping_location || 'Standard'})</span>
                                                <span className="font-bold text-blue-600 dark:text-blue-400">
                                                    {Number(order.shipping_fee || 0) === 0 ? '₱0.00 (Customer Pays Rider)' : `₱${Number(order.shipping_fee).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700 font-black text-base sm:text-lg text-gray-900 dark:text-white">
                                                <span>Total Amount</span>
                                                <span className="text-[#3C6CA8] dark:text-blue-400">
                                                    ₱{(Number(order.total_price || 0) + Number(order.shipping_fee || 0)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrderTracking;
