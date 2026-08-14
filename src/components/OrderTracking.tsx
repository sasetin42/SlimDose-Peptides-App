import React, { useState, useEffect } from 'react';
import { Search, Package, Truck, CheckCircle, Clock, AlertCircle, ArrowRight, ExternalLink, ArrowLeft, ShieldCheck, Copy, Check, RefreshCw, ThermometerSnowflake, MapPin, Calendar, HelpCircle, PhoneCall, Sparkles, Building2, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface TrackingOrderItem {
    product_name: string;
    quantity: number;
}

interface TrackingOrder {
    id: string;
    order_number: string | null;
    order_status: string;
    payment_status: string;
    tracking_number: string | null;
    tracking_courier: string | null;
    shipping_provider: string | null;
    shipping_note: string | null;
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

    const fetchOrder = async (queryStr: string) => {
        const query = queryStr.trim();
        if (!query) return;

        setLoading(true);
        setError(null);
        setOrder(null);
        setHasSearched(true);

        try {
            let rawData: any = null;

            // 1. Try exact id match first
            const { data: byId } = await supabase
                .from('orders')
                .select('*')
                .eq('id', query)
                .maybeSingle();

            if (byId) {
                rawData = byId;
            } else {
                // 2. Try exact order_number match
                const { data: byNum } = await supabase
                    .from('orders')
                    .select('*')
                    .eq('order_number', query)
                    .maybeSingle();

                if (byNum) {
                    rawData = byNum;
                } else {
                    // 3. Try flexible search across id, order_number, tracking_number
                    const { data: byFlex } = await supabase
                        .from('orders')
                        .select('*')
                        .or(`id.ilike.%${query}%,order_number.ilike.%${query}%,tracking_number.ilike.%${query}%`)
                        .order('created_at', { ascending: false })
                        .limit(1);

                    if (byFlex && byFlex.length > 0) {
                        rawData = byFlex[0];
                    } else {
                        // 4. Try RPC function fallback if available
                        try {
                            const { data: rpcData } = await supabase.rpc('get_order_details', {
                                order_id_input: query
                            });
                            if (rpcData) rawData = rpcData;
                        } catch {
                            // RPC not available
                        }
                    }
                }
            }

            if (rawData) {
                const itemsList = Array.isArray(rawData.order_items)
                    ? rawData.order_items.map((i: any) => ({
                        product_name: i.product_name || i.name || i.product?.name || 'Peptide Solution',
                        quantity: i.quantity || 1,
                    }))
                    : Array.isArray(rawData.items)
                    ? rawData.items.map((i: any) => ({
                        product_name: i.product_name || i.name || i.product?.name || 'Peptide Solution',
                        quantity: i.quantity || 1,
                    }))
                    : [];

                const formattedOrder: TrackingOrder = {
                    id: rawData.id,
                    order_number: rawData.order_number || null,
                    order_status: rawData.order_status || 'new',
                    payment_status: rawData.payment_status || 'pending',
                    tracking_number: rawData.tracking_number || null,
                    tracking_courier: rawData.tracking_courier || rawData.courier_name || null,
                    shipping_provider: rawData.shipping_provider || null,
                    shipping_note: rawData.shipping_note || null,
                    total_price: Number(rawData.total_price || 0),
                    shipping_fee: Number(rawData.shipping_fee || 0),
                    items: itemsList,
                    courier_code: rawData.courier_code || null,
                    courier_name: rawData.courier_name || rawData.tracking_courier || null,
                    tracking_url_template: rawData.tracking_url_template || null,
                    created_at: rawData.created_at || new Date().toISOString(),
                };

                setOrder(formattedOrder);
            } else {
                setError(`No order found matching "${query}". Please check your order ID or reference number and try again.`);
            }
        } catch (err: any) {
            console.error('Error fetching order:', err);
            setError('An error occurred while searching for your order. Please verify your reference ID and try again.');
        } finally {
            setLoading(false);
        }
    };

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
                    <span className="flex items-center gap-1 text-[10px] sm:text-xs font-extrabold text-[#3C6CA8] bg-[#3C6CA8]/10 dark:bg-[#3C6CA8]/20 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full border border-[#3C6CA8]/20">
                        <ThermometerSnowflake className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Cold-Chain Tracked
                    </span>
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
                        Track your peptide shipment status, courier details, and cold-chain dispatch progress in real time.
                    </p>
                </div>

                {/* Search Box */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-sm sm:shadow-xl p-3.5 sm:p-7 border border-gray-200 dark:border-slate-800">
                    <form onSubmit={(e) => handleTrack(e)} className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                            <input
                                type="text"
                                value={orderId}
                                onChange={(e) => setOrderId(e.target.value)}
                                placeholder="Enter Order ID or Number (e.g., SDP-10492)..."
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
                        <span className="text-[10px] sm:text-[11px] font-semibold text-[#3C6CA8]">24/7 Cold-Chain Dispatch Monitoring</span>
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
                                        <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-blue-200 bg-white/10 px-2 py-0.5 rounded-full border border-white/20">
                                            Current Order Status
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
                                        {order.order_number || `ORD-${order.id.slice(0, 8).toUpperCase()}`}
                                    </p>
                                </div>
                            </div>

                            <div className="p-4 sm:p-6 md:p-8">
                                 {/* Interactive Timeline Progress */}
                                {order.order_status !== 'cancelled' ? (
                                    <div className="mb-5 sm:mb-8">
                                        <div className="relative">
                                            <div className="absolute top-3.5 sm:top-4.5 left-0 w-full h-[1px] bg-gray-200 dark:bg-slate-800 -translate-y-1/2" />
                                            <div
                                                className="absolute top-3.5 sm:top-4.5 left-0 h-[1px] bg-gradient-to-r from-[#3C6CA8] to-emerald-500 -translate-y-1/2 transition-all duration-500"
                                                style={{ width: `${Math.min(100, Math.max(0, currentStep * 25))}%` }}
                                            />

                                            <div className="relative flex justify-between">
                                                {[
                                                    { title: 'Placed', icon: Clock },
                                                    { title: 'Confirmed', icon: ShieldCheck },
                                                    { title: 'Processing', icon: Package },
                                                    { title: 'Shipped', icon: Truck },
                                                    { title: 'Delivered', icon: CheckCircle }
                                                ].map((step, index) => {
                                                    const isCompleted = index <= currentStep;
                                                    const isCurrent = index === currentStep;
                                                    const StepIcon = step.icon;

                                                    return (
                                                        <div key={step.title} className="flex flex-col items-center gap-1">
                                                            <div className={`w-7 h-7 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl flex items-center justify-center border-[1px] transition-all duration-300 bg-white dark:bg-slate-900 ${isCompleted ? 'border-[#3C6CA8] text-[#3C6CA8] dark:text-blue-400 shadow-xs' : 'border-gray-200 dark:border-slate-800 text-gray-300 dark:text-slate-700'
                                                                } ${isCurrent ? 'ring-2 sm:ring-4 ring-[#3C6CA8]/20 scale-105 border-[#3C6CA8]' : ''}`}>
                                                                <StepIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                            </div>
                                                            <span className={`text-[10px] sm:text-xs font-bold ${isCompleted ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-slate-600'
                                                                }`}>{step.title}</span>
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

                                {/* Tracking & Summary Grid */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                                    {/* Courier Tracking Box */}
                                    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-gray-200 dark:border-slate-700">
                                        <h3 className="font-extrabold text-xs sm:text-sm text-gray-900 dark:text-white mb-3 flex items-center justify-between">
                                            <span className="flex items-center gap-1.5">
                                                <Truck className="w-4 h-4 text-[#3C6CA8]" /> Courier Tracking Info
                                            </span>
                                            <span className="text-[9px] sm:text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-md">
                                                Cold-Chain Insulated
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
                                                <p className="text-[11px] sm:text-xs mt-0.5 text-gray-400">Your order is being prepared for cold-chain insulated dispatch.</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Order Summary & Notes */}
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

                                        <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-gray-200 dark:border-slate-800">
                                            <h3 className="font-extrabold text-gray-900 dark:text-white mb-2.5 text-[10px] sm:text-xs uppercase tracking-wider border-b border-gray-100 dark:border-slate-800 pb-1.5 flex items-center justify-between">
                                                <span>Package Items</span>
                                                <span className="text-gray-400 font-medium">{(order.items || []).length} Products</span>
                                            </h3>
                                            <div className="space-y-1.5 mb-3">
                                                {(order.items || []).map((item, idx) => (
                                                    <div key={idx} className="flex justify-between text-xs font-semibold text-gray-700 dark:text-slate-300">
                                                        <span>{item.quantity}x {item.product_name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex justify-between items-center pt-2.5 border-t border-gray-100 dark:border-slate-800 font-black text-sm sm:text-base text-gray-900 dark:text-white">
                                                <span>Total Amount</span>
                                                <span className="text-[#3C6CA8] dark:text-blue-400">
                                                    ₱{(Number(order.total_price || 0) + Number(order.shipping_fee || 0)).toLocaleString('en-PH', { minimumFractionDigits: 0 })}
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
