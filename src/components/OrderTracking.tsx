import React, { useState } from 'react';
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

    const handleTrack = async (e?: React.FormEvent, searchVal?: string) => {
        if (e) e.preventDefault();
        const query = (searchVal || orderId).trim();
        if (!query) return;

        setLoading(true);
        setError(null);
        setOrder(null);
        setHasSearched(true);

        try {
            const { data, error } = await supabase.rpc('get_order_details', {
                order_id_input: query
            });

            if (error) {
                throw error;
            }

            if (data) {
                setOrder(data as TrackingOrder);
            } else {
                setError('Order not found. Please verify your Order Number or ID and try again.');
            }
        } catch (err) {
            console.error('Error fetching order:', err);
            setError('An error occurred while fetching your order details. Please try again.');
        } finally {
            setLoading(false);
        }
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
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 animate-fadeIn">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Navigation Bar */}
                <div className="flex items-center justify-between">
                    <a
                        href="/"
                        className="inline-flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-full shadow-sm border border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-300 hover:text-[#3C6CA8] dark:hover:text-blue-400 transition-all font-bold text-xs sm:text-sm"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back to Store</span>
                    </a>
                    <span className="flex items-center gap-1.5 text-xs font-extrabold text-[#3C6CA8] bg-[#3C6CA8]/10 dark:bg-[#3C6CA8]/20 px-3 py-1.5 rounded-full border border-[#3C6CA8]/20">
                        <ThermometerSnowflake className="w-3.5 h-3.5" /> Cold-Chain Tracked
                    </span>
                </div>

                {/* Hero Header */}
                <div className="text-center space-y-2 py-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#3C6CA8] via-blue-600 to-[#294E7A] text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-600/20">
                        <Truck className="w-7 h-7" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                        Live Order & Package Tracking
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 max-w-md mx-auto">
                        Track your peptide shipment status, courier details, and cold-chain dispatch progress in real time.
                    </p>
                </div>

                {/* Search Box */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl p-5 sm:p-7 border border-gray-200 dark:border-slate-800">
                    <form onSubmit={(e) => handleTrack(e)} className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                value={orderId}
                                onChange={(e) => setOrderId(e.target.value)}
                                placeholder="Enter Order ID or Number (e.g., SDP-10492 or UUID)..."
                                className="w-full text-sm sm:text-base pl-12 pr-4 py-3.5 rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-800 dark:text-slate-100 focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] outline-none transition-all font-medium"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading || !orderId.trim()}
                            className="bg-[#3C6CA8] hover:bg-[#315A8E] text-white px-8 py-3.5 rounded-2xl font-bold text-sm shadow-lg shadow-[#3C6CA8]/20 hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95 shrink-0"
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
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-gray-400 gap-2">
                        <span className="flex items-center gap-1 font-medium text-gray-500 dark:text-slate-400">
                            <HelpCircle className="w-3.5 h-3.5 text-[#3C6CA8]" /> Need your order number? Check your email confirmation.
                        </span>
                        <span className="text-[11px] font-semibold text-[#3C6CA8]">24/7 Cold-Chain Dispatch Monitoring</span>
                    </div>
                </div>

                {/* Error Result */}
                {error && (
                    <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl p-4 sm:p-5 flex items-center gap-3 text-rose-700 dark:text-rose-300 animate-fadeIn">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <div className="text-xs sm:text-sm font-medium">
                            <p className="font-bold">Order Search Alert</p>
                            <p className="mt-0.5">{error}</p>
                        </div>
                    </div>
                )}

                {/* Detailed Results */}
                {hasSearched && order && (
                    <div className="space-y-6 animate-fadeIn">
                        {/* Main Status & Banner */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-gray-200 dark:border-slate-800 overflow-hidden">
                            <div className="bg-gradient-to-r from-slate-900 via-[#294E7A] to-slate-900 p-6 md:p-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-extrabold uppercase tracking-wider text-blue-200 bg-white/10 px-2.5 py-0.5 rounded-full border border-white/20">
                                            Current Order Status
                                        </span>
                                        <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                                            <ShieldCheck className="w-3.5 h-3.5" /> Verified
                                        </span>
                                    </div>
                                    <h2 className="text-2xl sm:text-3xl font-extrabold capitalize flex items-center gap-2 text-white">
                                        {order.order_status === 'new' && <Clock className="w-7 h-7 text-amber-400" />}
                                        {order.order_status === 'confirmed' && <CheckCircle className="w-7 h-7 text-blue-400" />}
                                        {order.order_status === 'processing' && <Package className="w-7 h-7 text-purple-400" />}
                                        {order.order_status === 'shipped' && <Truck className="w-7 h-7 text-emerald-400" />}
                                        {order.order_status === 'delivered' && <CheckCircle className="w-7 h-7 text-emerald-400" />}
                                        {order.order_status === 'cancelled' && <AlertCircle className="w-7 h-7 text-rose-500" />}
                                        <span>{order.order_status}</span>
                                    </h2>
                                </div>
                                <div className="md:text-right bg-white/10 backdrop-blur-sm px-4 py-2.5 rounded-2xl border border-white/15">
                                    <p className="text-[11px] text-blue-200 uppercase font-extrabold tracking-wider">Order Reference</p>
                                    <p className="font-mono text-base sm:text-lg font-extrabold text-white">
                                        {order.order_number || `ORD-${order.id.slice(0, 8).toUpperCase()}`}
                                    </p>
                                </div>
                            </div>

                            <div className="p-6 md:p-8">
                                {/* Interactive Timeline Progress */}
                                {order.order_status !== 'cancelled' ? (
                                    <div className="mb-8">
                                        <div className="relative">
                                            <div className="absolute top-1/2 left-0 w-full h-1.5 bg-gray-100 dark:bg-slate-800 -translate-y-1/2 rounded-full" />
                                            <div
                                                className="absolute top-1/2 left-0 h-1.5 bg-gradient-to-r from-[#3C6CA8] to-emerald-500 -translate-y-1/2 rounded-full transition-all duration-500"
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
                                                        <div key={step.title} className="flex flex-col items-center gap-2">
                                                            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center border-2 transition-all duration-300 bg-white dark:bg-slate-900 ${isCompleted ? 'border-[#3C6CA8] text-[#3C6CA8] dark:text-blue-400 shadow-md' : 'border-gray-200 dark:border-slate-800 text-gray-300 dark:text-slate-700'
                                                                } ${isCurrent ? 'ring-4 ring-[#3C6CA8]/20 scale-110 border-[#3C6CA8]' : ''}`}>
                                                                <StepIcon className="w-5 h-5" />
                                                            </div>
                                                            <span className={`text-xs sm:text-sm font-bold ${isCompleted ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-slate-600'
                                                                }`}>{step.title}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-rose-50 dark:bg-rose-950/40 rounded-2xl p-5 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 mb-6 flex items-center gap-3">
                                        <AlertCircle className="w-6 h-6 text-rose-600 shrink-0" />
                                        <div>
                                            <p className="font-bold">Order Cancelled</p>
                                            <p className="text-xs sm:text-sm">This order has been cancelled. Please contact customer support for further assistance.</p>
                                        </div>
                                    </div>
                                )}

                                {/* Tracking & Summary Grid */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Courier Tracking Box */}
                                    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-5 sm:p-6 border border-gray-200 dark:border-slate-700">
                                        <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center justify-between">
                                            <span className="flex items-center gap-2">
                                                <Truck className="w-5 h-5 text-[#3C6CA8]" /> Courier Tracking Info
                                            </span>
                                            <span className="text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-md">
                                                Cold-Chain Insulated
                                            </span>
                                        </h3>

                                        {order.tracking_number ? (
                                            <div className="space-y-4">
                                                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800">
                                                    <p className="text-[11px] text-gray-400 uppercase font-bold tracking-wider mb-1 flex items-center justify-between">
                                                        <span>Waybill / Tracking No.{order.courier_name ? ` (${order.courier_name})` : ''}</span>
                                                        <button
                                                            onClick={() => copyToClipboard(order.tracking_number!)}
                                                            className="inline-flex items-center gap-1 text-xs text-[#3C6CA8] hover:underline font-bold cursor-pointer"
                                                        >
                                                            {copiedTracking ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                                            <span>{copiedTracking ? 'Copied' : 'Copy'}</span>
                                                        </button>
                                                    </p>
                                                    <p className="text-lg sm:text-xl font-mono font-extrabold text-gray-900 dark:text-white tracking-wider">
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
                                                            className="block w-full py-3.5 bg-[#3C6CA8] hover:bg-[#315A8E] text-white text-center rounded-xl font-extrabold text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                                                        >
                                                            <span>{label}</span>
                                                            <ExternalLink className="w-4 h-4" />
                                                        </a>
                                                    );
                                                })()}
                                            </div>
                                        ) : (
                                            <div className="text-center py-6 text-gray-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800">
                                                <Truck className="w-10 h-10 mx-auto mb-2 opacity-30 text-[#3C6CA8]" />
                                                <p className="font-bold text-sm text-gray-700 dark:text-slate-200">No tracking number assigned yet</p>
                                                <p className="text-xs mt-1">Your order is being prepared for cold-chain insulated dispatch.</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Order Summary & Notes */}
                                    <div className="space-y-4">
                                        {order.shipping_note && (
                                            <div className="bg-blue-50 dark:bg-slate-800/80 rounded-xl p-4 border border-blue-200 dark:border-slate-700">
                                                <h3 className="font-bold text-[#3C6CA8] dark:text-blue-300 mb-1 flex items-center gap-2 text-xs uppercase tracking-wider">
                                                    <Package className="w-4 h-4" /> Special Shipping Note
                                                </h3>
                                                <p className="text-gray-800 dark:text-slate-200 text-xs sm:text-sm leading-relaxed font-medium">
                                                    {order.shipping_note}
                                                </p>
                                            </div>
                                        )}

                                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-200 dark:border-slate-800">
                                            <h3 className="font-bold text-gray-900 dark:text-white mb-3 text-xs uppercase tracking-wider border-b border-gray-100 dark:border-slate-800 pb-2 flex items-center justify-between">
                                                <span>Package Items</span>
                                                <span className="text-slate-400 font-normal">{(order.items || []).length} Products</span>
                                            </h3>
                                            <div className="space-y-2 mb-4">
                                                {(order.items || []).map((item, idx) => (
                                                    <div key={idx} className="flex justify-between text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300">
                                                        <span>{item.quantity}x {item.product_name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex justify-between items-center pt-3 border-t border-gray-100 dark:border-slate-800 font-extrabold text-base sm:text-lg text-gray-900 dark:text-white">
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
