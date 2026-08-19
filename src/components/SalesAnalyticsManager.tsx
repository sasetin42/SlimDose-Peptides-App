import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
    ChevronLeft,
    RefreshCw,
    TrendingUp,
    TrendingDown,
    DollarSign,
    ShoppingBag,
    Package,
    Activity,
    Trophy,
    Medal,
    Flame,
    Clock,
    Box,
    Download,
    PiggyBank,
    Coins,
    Percent,
    ArrowUpRight,
    Sparkles,
    Calendar,
    Users,
    CreditCard,
    MapPin,
    ShieldCheck,
    Truck,
    CheckCircle2,
    BarChart3,
    PieChart,
    ExternalLink
} from 'lucide-react';
import { formatOrderId } from '../utils/orderUtils';
import { liveScrapedOrders } from '../data/liveScrapedOrders';

interface SalesAnalyticsManagerProps {
    onBack?: () => void;
    onNavigateView?: (view: string, id?: string) => void;
}

interface AnalyticsRow {
    total_orders: number;
    total_units: number;
    gross_sales: number;
    total_cost: number;
    net_profit: number;
    total_revenue: number;
    average_order_value: number;
    paid_revenue: number;
    pending_revenue: number;
    confirmed_orders: number;
}

interface ProductRanking {
    product_name: string;
    units_sold: number;
    revenue: number;
    cost: number;
    profit: number;
    sharePercent: number;
}

interface ChannelStat {
    name: string;
    count: number;
    revenue: number;
    sharePercent: number;
}

interface RegionStat {
    name: string;
    count: number;
    revenue: number;
    sharePercent: number;
}

interface StatusStat {
    status: string;
    count: number;
    revenue: number;
}

interface RecentSale {
    id: string;
    order_number: string | null;
    customer_name: string;
    customer_email?: string;
    customer_phone?: string;
    total_price: number;
    shipping_fee?: number;
    payment_method_name?: string;
    payment_status?: string;
    order_status?: string;
    created_at: string;
    order_items: any[];
}

type Timeframe = 'all' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

const EMPTY_METRICS: AnalyticsRow = {
    total_orders: 0,
    total_units: 0,
    gross_sales: 0,
    total_cost: 0,
    net_profit: 0,
    total_revenue: 0,
    average_order_value: 0,
    paid_revenue: 0,
    pending_revenue: 0,
    confirmed_orders: 0,
};

const formatPHP = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount || 0);
};

const formatTimeAgo = (dateString?: string | number | null) => {
    if (!dateString) return 'Just now';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Just now';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return 'Just now';
    const seconds = Math.floor(diffMs / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    if (days < 30) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const toISODate = (d: Date) => d.toISOString().slice(0, 10);

const toNum = (v: any) => {
    if (v === null || v === undefined) return 0;
    const n = typeof v === 'number' ? v : parseFloat(v);
    return Number.isFinite(n) ? n : 0;
};

const computeRange = (timeframe: Timeframe, customStart: string, customEnd: string) => {
    const now = new Date();
    let startDate = new Date();
    let previousStartDate = new Date();
    let previousEndDate = new Date();

    if (timeframe === 'all') {
        startDate = new Date(0); // Epoch start
        previousStartDate = new Date(0);
        previousEndDate = new Date(0);
    } else if (timeframe === 'daily') {
        startDate.setHours(0, 0, 0, 0);
        previousStartDate.setDate(previousStartDate.getDate() - 1);
        previousStartDate.setHours(0, 0, 0, 0);
        previousEndDate.setDate(previousEndDate.getDate() - 1);
        previousEndDate.setHours(23, 59, 59, 999);
    } else if (timeframe === 'weekly') {
        const day = startDate.getDay();
        const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
        startDate.setDate(diff);
        startDate.setHours(0, 0, 0, 0);
        previousStartDate = new Date(startDate);
        previousStartDate.setDate(previousStartDate.getDate() - 7);
        previousEndDate = new Date(startDate);
        previousEndDate.setDate(previousEndDate.getDate() - 1);
        previousEndDate.setHours(23, 59, 59, 999);
    } else if (timeframe === 'monthly') {
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        previousStartDate = new Date(startDate);
        previousStartDate.setMonth(previousStartDate.getMonth() - 1);
        previousEndDate = new Date(startDate);
        previousEndDate.setDate(0);
        previousEndDate.setHours(23, 59, 59, 999);
    } else if (timeframe === 'yearly') {
        startDate = new Date(now.getFullYear(), 0, 1);
        previousStartDate = new Date(now.getFullYear() - 1, 0, 1);
        previousEndDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
    } else {
        startDate = customStart ? new Date(customStart + 'T00:00:00') : new Date('2020-01-01T00:00:00');
        const endDate = customEnd ? new Date(customEnd + 'T23:59:59.999') : now;
        const span = endDate.getTime() - startDate.getTime();
        previousEndDate = new Date(startDate.getTime() - 1);
        previousStartDate = new Date(previousEndDate.getTime() - span);
        return { startDate, endDate, previousStartDate, previousEndDate };
    }

    return { startDate, endDate: now, previousStartDate, previousEndDate };
};

const SalesAnalyticsManager: React.FC<SalesAnalyticsManagerProps> = ({ onBack, onNavigateView }) => {
    const [timeframe, setTimeframe] = useState<Timeframe>('all');
    const [customStart, setCustomStart] = useState<string>(toISODate(new Date(Date.now() - 30 * 86400000)));
    const [customEnd, setCustomEnd] = useState<string>(toISODate(new Date()));
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [exporting, setExporting] = useState(false);

    // Core Metrics State
    const [metrics, setMetrics] = useState<{ current: AnalyticsRow; previous: AnalyticsRow }>({
        current: { ...EMPTY_METRICS },
        previous: { ...EMPTY_METRICS },
    });

    // Breakdown States
    const [rankings, setRankings] = useState<ProductRanking[]>([]);
    const [channelStats, setChannelStats] = useState<ChannelStat[]>([]);
    const [regionStats, setRegionStats] = useState<RegionStat[]>([]);
    const [statusStats, setStatusStats] = useState<StatusStat[]>([]);
    const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
    const [sortBy, setSortBy] = useState<'units' | 'revenue' | 'profit'>('units');

    const range = useMemo(() => computeRange(timeframe, customStart, customEnd), [timeframe, customStart, customEnd]);

    // Data Fetching & Direct Real-Time Aggregation
    const fetchData = useCallback(async (showRefresh = false) => {
        if (showRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            let allOrders: any[] = [];
            const { data: rawOrders, error } = await supabase
                .from('orders')
                .select('*')
                .order('created_at', { ascending: false });

            if (rawOrders && rawOrders.length > 0) {
                allOrders = rawOrders;
            } else {
                allOrders = liveScrapedOrders || [];
            }
            const { startDate, endDate, previousStartDate, previousEndDate } = range;

            // Filter Current Period Orders
            const currentOrders = allOrders.filter((o: any) => {
                if (o.order_status === 'cancelled') return false;
                if (timeframe === 'all') return true;
                const createdTime = o.created_at ? new Date(o.created_at).getTime() : 0;
                return createdTime >= startDate.getTime() && createdTime <= endDate.getTime();
            });

            // Filter Previous Period Orders
            const previousOrders = allOrders.filter((o: any) => {
                if (o.order_status === 'cancelled') return false;
                if (timeframe === 'all') return false;
                const createdTime = o.created_at ? new Date(o.created_at).getTime() : 0;
                return createdTime >= previousStartDate.getTime() && createdTime <= previousEndDate.getTime();
            });

            // Process Current Metrics & Product Stats
            const productStatsMap = new Map<string, { units: number; revenue: number; cost: number; profit: number }>();
            const channelMap = new Map<string, { count: number; revenue: number }>();
            const regionMap = new Map<string, { count: number; revenue: number }>();
            const statusMap = new Map<string, { count: number; revenue: number }>();

            let curUnits = 0;
            let curGross = 0;
            let curCost = 0;
            let curPaidRevenue = 0;
            let curPendingRevenue = 0;
            let curConfirmedOrders = 0;

            currentOrders.forEach((o: any) => {
                const finalOrderTotal = (toNum(o.total_price) || 0) + (toNum(o.shipping_fee) || 0);
                const items: any[] = Array.isArray(o.order_items) ? o.order_items : [];

                if (o.payment_status === 'paid') {
                    curPaidRevenue += finalOrderTotal;
                } else {
                    curPendingRevenue += finalOrderTotal;
                }

                if (o.order_status === 'confirmed' || o.order_status === 'shipped' || o.order_status === 'delivered') {
                    curConfirmedOrders++;
                }

                // Channel Aggregation
                const channelName = o.payment_method_name || 'GCash / Bank Transfer';
                const existingChannel = channelMap.get(channelName) || { count: 0, revenue: 0 };
                existingChannel.count += 1;
                existingChannel.revenue += finalOrderTotal;
                channelMap.set(channelName, existingChannel);

                // Region Aggregation
                const regionName = o.shipping_state || o.shipping_city || o.shipping_location || 'Metro Manila';
                const existingRegion = regionMap.get(regionName) || { count: 0, revenue: 0 };
                existingRegion.count += 1;
                existingRegion.revenue += finalOrderTotal;
                regionMap.set(regionName, existingRegion);

                // Status Aggregation
                const statusName = o.order_status || 'new';
                const existingStatus = statusMap.get(statusName) || { count: 0, revenue: 0 };
                existingStatus.count += 1;
                existingStatus.revenue += finalOrderTotal;
                statusMap.set(statusName, existingStatus);

                // Line Items Aggregation
                if (items.length > 0) {
                    items.forEach((item: any) => {
                        const qty = toNum(item.quantity) || 1;
                        const lineTotal = toNum(item.total) || (toNum(item.price) * qty);
                        const estCost = lineTotal * 0.4; // 40% Estimated Production Baseline

                        curUnits += qty;
                        curGross += lineTotal;
                        curCost += estCost;

                        const name = item.product_name || 'Peptide Product';
                        const existing = productStatsMap.get(name) || { units: 0, revenue: 0, cost: 0, profit: 0 };
                        existing.units += qty;
                        existing.revenue += lineTotal;
                        existing.cost += estCost;
                        existing.profit += (lineTotal - estCost);
                        productStatsMap.set(name, existing);
                    });
                } else {
                    // Fallback when order_items array is missing
                    const orderGross = toNum(o.total_price) || 0;
                    curGross += orderGross;
                    curUnits += 1;
                    curCost += orderGross * 0.4;

                    const name = 'Standard Peptide Order';
                    const existing = productStatsMap.get(name) || { units: 0, revenue: 0, cost: 0, profit: 0 };
                    existing.units += 1;
                    existing.revenue += orderGross;
                    existing.cost += orderGross * 0.4;
                    existing.profit += orderGross * 0.6;
                    productStatsMap.set(name, existing);
                }
            });

            const curNetProfit = curGross - curCost;
            const curAOV = currentOrders.length > 0 ? curGross / currentOrders.length : 0;

            // Previous Period Computations
            let prevGross = 0;
            let prevUnits = 0;
            let prevCost = 0;

            previousOrders.forEach((o: any) => {
                const items: any[] = Array.isArray(o.order_items) ? o.order_items : [];
                if (items.length > 0) {
                    items.forEach((item: any) => {
                        const qty = toNum(item.quantity) || 1;
                        const lineTotal = toNum(item.total) || (toNum(item.price) * qty);
                        prevUnits += qty;
                        prevGross += lineTotal;
                        prevCost += lineTotal * 0.4;
                    });
                } else {
                    const gross = toNum(o.total_price) || 0;
                    prevGross += gross;
                    prevUnits += 1;
                    prevCost += gross * 0.4;
                }
            });

            const prevNetProfit = prevGross - prevCost;
            const prevAOV = previousOrders.length > 0 ? prevGross / previousOrders.length : 0;

            // Set Aggregated Metrics
            setMetrics({
                current: {
                    total_orders: currentOrders.length,
                    total_units: curUnits,
                    gross_sales: curGross,
                    total_cost: curCost,
                    net_profit: curNetProfit,
                    total_revenue: curGross,
                    average_order_value: curAOV,
                    paid_revenue: curPaidRevenue,
                    pending_revenue: curPendingRevenue,
                    confirmed_orders: curConfirmedOrders
                },
                previous: {
                    total_orders: previousOrders.length,
                    total_units: prevUnits,
                    gross_sales: prevGross,
                    total_cost: prevCost,
                    net_profit: prevNetProfit,
                    total_revenue: prevGross,
                    average_order_value: prevAOV,
                    paid_revenue: 0,
                    pending_revenue: 0,
                    confirmed_orders: 0
                }
            });

            // Product Rankings with Share %
            const computedRankings: ProductRanking[] = Array.from(productStatsMap.entries()).map(([name, stats]) => ({
                product_name: name,
                units_sold: stats.units,
                revenue: stats.revenue,
                cost: stats.cost,
                profit: stats.profit,
                sharePercent: curGross > 0 ? (stats.revenue / curGross) * 100 : 0
            }));
            setRankings(computedRankings);

            // Channel Breakdown
            const computedChannels: ChannelStat[] = Array.from(channelMap.entries()).map(([name, stats]) => ({
                name,
                count: stats.count,
                revenue: stats.revenue,
                sharePercent: curGross > 0 ? (stats.revenue / curGross) * 100 : 0
            })).sort((a, b) => b.revenue - a.revenue);
            setChannelStats(computedChannels);

            // Region Breakdown
            const computedRegions: RegionStat[] = Array.from(regionMap.entries()).map(([name, stats]) => ({
                name,
                count: stats.count,
                revenue: stats.revenue,
                sharePercent: curGross > 0 ? (stats.revenue / curGross) * 100 : 0
            })).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
            setRegionStats(computedRegions);

            // Status Breakdown
            const computedStatuses: StatusStat[] = Array.from(statusMap.entries()).map(([status, stats]) => ({
                status,
                count: stats.count,
                revenue: stats.revenue
            }));
            setStatusStats(computedStatuses);

            // Recent 6 Orders
            setRecentSales(allOrders.slice(0, 6));
        } catch (err) {
            console.error('Error computing analytics:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [range, timeframe]);

    // Live Realtime Postgres Listener
    useEffect(() => {
        fetchData();
        const channel = supabase
            .channel('analytics:live_orders')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
                setTimeout(() => fetchData(true), 600);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchData]);

    const calculateTrend = (current: number, previous: number) => {
        if (!previous || previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
    };

    const profitMargin = metrics.current.gross_sales > 0
        ? (metrics.current.net_profit / metrics.current.gross_sales) * 100
        : 0;

    const confirmationRate = metrics.current.total_orders > 0
        ? (metrics.current.confirmed_orders / metrics.current.total_orders) * 100
        : 0;

    const sortedRankings = useMemo(() => {
        return [...rankings].sort((a, b) => {
            if (sortBy === 'units') return b.units_sold - a.units_sold;
            if (sortBy === 'revenue') return b.revenue - a.revenue;
            return b.profit - a.profit;
        });
    }, [rankings, sortBy]);

    // Export CSV
    const handleExportCSV = async () => {
        setExporting(true);
        try {
            const { startDate, endDate } = range;
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const filteredForExport = (data || []).filter((o: any) => {
                if (timeframe === 'all') return true;
                const createdTime = o.created_at ? new Date(o.created_at).getTime() : 0;
                return createdTime >= startDate.getTime() && createdTime <= endDate.getTime();
            });

            const rows: (string | number)[][] = [
                ['Order ID', 'Date', 'Customer Name', 'Email', 'Phone', 'Order Status', 'Payment Status', 'Payment Method', 'Items Summary', 'Units', 'Subtotal', 'Shipping Fee', 'Total Paid (PHP)']
            ];

            filteredForExport.forEach((o: any) => {
                const items: any[] = Array.isArray(o.order_items) ? o.order_items : [];
                const itemSummary = items.map(i => `${i.product_name}${i.variation_name ? ` (${i.variation_name})` : ''} ×${i.quantity}`).join('; ');
                const units = items.reduce((s, i) => s + toNum(i.quantity), 0) || 1;
                const gross = toNum(o.total_price);
                const shipping = toNum(o.shipping_fee);

                rows.push([
                    formatOrderId(o, { prefix: false }),
                    new Date(o.created_at).toISOString(),
                    o.customer_name || 'Customer',
                    o.customer_email || '',
                    o.customer_phone || '',
                    o.order_status || 'new',
                    o.payment_status || 'pending',
                    o.payment_method_name || 'Manual Bank/GCash',
                    itemSummary,
                    units,
                    gross.toFixed(2),
                    shipping.toFixed(2),
                    (gross + shipping).toFixed(2)
                ]);
            });

            const csvContent = rows.map(r => r.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n');
            const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `slimdose_sales_analytics_${timeframe}_${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Export failed:', err);
            alert('Failed to export CSV.');
        } finally {
            setExporting(false);
        }
    };

    const getPrimaryProductName = (sale: RecentSale) => {
        const items = sale.order_items || [];
        if (items.length === 0) return 'Peptide Compound';
        const name = items[0].product_name || 'Peptide Product';
        const variation = items[0].variation_name ? ` (${items[0].variation_name})` : '';
        return items.length > 1 ? `${name}${variation} +${items.length - 1} more` : `${name}${variation}`;
    };

    if (loading) {
        return (
            <div className="w-full max-w-[1720px] mx-auto px-2 sm:px-4 md:px-6 py-12 flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="w-8 h-8 text-[#3C6CA8] animate-spin" />
                <p className="text-xs font-bold text-slate-500">Aggregating live revenue and product metrics...</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-[1720px] mx-auto px-2 sm:px-4 md:px-6 py-3 sm:py-4 space-y-4 text-left font-inter">
            {/* ── Top Header & Navigation Bar ── */}
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-3.5 sm:p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all">
                <div>
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="text-slate-500 hover:text-[#3C6CA8] flex items-center gap-1 text-xs font-bold mb-1 transition-colors cursor-pointer"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" />
                            <span>Back to Dashboard</span>
                        </button>
                    )}
                    <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <Activity className="w-4.5 h-4.5 text-[#3C6CA8]" />
                        <span>Sales Analytics &amp; Revenue Insights</span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            LIVE AUDIT
                        </span>
                    </h1>
                    <p className="text-xs text-slate-500">
                        Real-time revenue tracking, profit margins, product leaderboards, and financial exports.
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={handleExportCSV}
                        disabled={exporting}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#3C6CA8] hover:bg-[#315A8E] text-white rounded-xl text-xs font-black shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                        <Download className={`w-3.5 h-3.5 ${exporting ? 'animate-pulse' : ''}`} />
                        <span>{exporting ? 'Exporting…' : 'Export CSV'}</span>
                    </button>
                    <button
                        onClick={() => fetchData(true)}
                        disabled={refreshing}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                        title="Reload Analytics"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* ── Timeframe Filter Tabs ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white rounded-2xl p-2 sm:p-2.5 border border-slate-200/90 shadow-xs">
                <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl">
                    {(['all', 'daily', 'weekly', 'monthly', 'yearly', 'custom'] as const).map((t) => (
                        <button
                            key={t}
                            onClick={() => setTimeframe(t)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                                timeframe === t
                                    ? 'bg-[#3C6CA8] text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                            }`}
                        >
                            {t === 'all' ? 'All Time' : t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                    ))}
                </div>

                {timeframe === 'custom' && (
                    <div className="flex items-center gap-2 px-2">
                        <input
                            type="date"
                            value={customStart}
                            onChange={(e) => setCustomStart(e.target.value)}
                            className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg outline-none font-mono"
                        />
                        <span className="text-xs text-slate-400 font-bold">to</span>
                        <input
                            type="date"
                            value={customEnd}
                            onChange={(e) => setCustomEnd(e.target.value)}
                            className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg outline-none font-mono"
                        />
                    </div>
                )}
            </div>

            {/* ── Primary Financial KPI Cards Grid ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {/* Gross Sales */}
                <div className="relative overflow-hidden rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-[#3C6CA8] to-[#254976] text-white shadow-xs hover:shadow-md transition-all">
                    <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-200/90 flex items-center gap-1.5">
                            <DollarSign className="w-4 h-4 text-white" />
                            <span>Gross Sales</span>
                        </span>
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-200">
                            <TrendingUp className="w-2.5 h-2.5" />
                            <span>{calculateTrend(metrics.current.gross_sales, metrics.previous.gross_sales).toFixed(0)}% vs prev</span>
                        </span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white mb-0.5">
                        {formatPHP(metrics.current.gross_sales)}
                    </div>
                    <p className="text-[11px] text-slate-200/80 font-medium">
                        Total {metrics.current.total_orders} orders recorded
                    </p>
                </div>

                {/* Estimated COGS / Raw Cost */}
                <div className="relative overflow-hidden rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-slate-800 to-slate-950 text-white shadow-xs hover:shadow-md transition-all">
                    <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-200/90 flex items-center gap-1.5">
                            <Coins className="w-4 h-4 text-white" />
                            <span>Estimated Cost</span>
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                            COGS Baseline
                        </span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white mb-0.5">
                        {formatPHP(metrics.current.total_cost)}
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium">
                        Synthesis &amp; packaging expense
                    </p>
                </div>

                {/* Net Profit */}
                <div className="relative overflow-hidden rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-[#1E3A5F] to-[#12243B] text-white shadow-xs hover:shadow-md transition-all">
                    <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-200/90 flex items-center gap-1.5">
                            <PiggyBank className="w-4 h-4 text-emerald-400" />
                            <span>Net Profit</span>
                        </span>
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300">
                            <span>{profitMargin.toFixed(1)}% Margin</span>
                        </span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-emerald-300 mb-0.5">
                        {formatPHP(metrics.current.net_profit)}
                    </div>
                    <p className="text-[11px] text-slate-300/80 font-medium">
                        Gross revenue minus expenses
                    </p>
                </div>

                {/* Average Order Value */}
                <div className="relative overflow-hidden rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-[#2D588E] to-[#1C3B63] text-white shadow-xs hover:shadow-md transition-all">
                    <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-200/90 flex items-center gap-1.5">
                            <ShoppingBag className="w-4 h-4 text-white" />
                            <span>Avg. Order Value</span>
                        </span>
                        <span className="text-[10px] font-bold text-blue-200">
                            {metrics.current.total_units} Units Total
                        </span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white mb-0.5">
                        {formatPHP(metrics.current.average_order_value)}
                    </div>
                    <p className="text-[11px] text-slate-200/80 font-medium">
                        Avg basket size: {(metrics.current.total_units / (metrics.current.total_orders || 1)).toFixed(1)} units
                    </p>
                </div>
            </div>

            {/* ── Secondary Operational Metrics Strip ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">Verified Paid Revenue</span>
                        <p className="text-base font-black text-emerald-600 font-mono mt-0.5">{formatPHP(metrics.current.paid_revenue)}</p>
                    </div>
                    <ShieldCheck className="w-6 h-6 text-emerald-500/30" />
                </div>

                <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">Pending Proof Verification</span>
                        <p className="text-base font-black text-amber-600 font-mono mt-0.5">{formatPHP(metrics.current.pending_revenue)}</p>
                    </div>
                    <Clock className="w-6 h-6 text-amber-500/30" />
                </div>

                <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">Total Units Dispatched</span>
                        <p className="text-base font-black text-slate-900 font-mono mt-0.5">{metrics.current.total_units} Vials</p>
                    </div>
                    <Box className="w-6 h-6 text-[#3C6CA8]/30" />
                </div>

                <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">Fulfillment Confirmation</span>
                        <p className="text-base font-black text-blue-600 font-mono mt-0.5">{confirmationRate.toFixed(0)}% Rate</p>
                    </div>
                    <CheckCircle2 className="w-6 h-6 text-blue-500/30" />
                </div>
            </div>

            {/* ── Main Data Breakdown Grid ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Left 8 Cols: Top Selling Products Leaderboard */}
                <div className="lg:col-span-8 bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-4">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 flex-wrap">
                        <div className="flex items-center gap-2">
                            <Trophy className="w-4.5 h-4.5 text-[#3C6CA8]" />
                            <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                                Peptide Products Leaderboard
                            </h2>
                        </div>

                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                            {(['units', 'revenue', 'profit'] as const).map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setSortBy(s)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                        sortBy === s ? 'bg-white text-[#3C6CA8] shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-900'
                                    }`}
                                >
                                    {s === 'units' ? 'By Units' : s === 'revenue' ? 'By Revenue' : 'By Profit'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {sortedRankings.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 text-xs">
                            No product sales recorded for this timeframe.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {sortedRankings.map((p, idx) => (
                                <div key={idx} className="p-3 rounded-xl border border-slate-100 hover:border-slate-200 transition-all space-y-2 bg-slate-50/40">
                                    <div className="flex items-center justify-between gap-3 text-xs">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className={`w-6 h-6 rounded-full font-mono font-black flex items-center justify-center shrink-0 text-[11px] ${
                                                idx === 0 ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                                                idx === 1 ? 'bg-slate-200 text-slate-700' :
                                                idx === 2 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'
                                            }`}>
                                                {idx + 1}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-extrabold text-slate-900 truncate">
                                                    {p.product_name}
                                                </p>
                                                <p className="text-[11px] text-slate-400">
                                                    {p.units_sold} vial{p.units_sold !== 1 ? 's' : ''} sold · {formatPHP(p.revenue)} revenue ({p.sharePercent.toFixed(1)}% of total)
                                                </p>
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0">
                                            <span className="font-mono font-black text-slate-900 text-sm block">
                                                {sortBy === 'units' ? `${p.units_sold} units` : formatPHP(sortBy === 'profit' ? p.profit : p.revenue)}
                                            </span>
                                            <span className="text-[10px] font-bold text-emerald-600">
                                                +{formatPHP(p.profit)} profit
                                            </span>
                                        </div>
                                    </div>

                                    {/* Progress Share Bar */}
                                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                        <div
                                            className="bg-[#3C6CA8] h-1.5 rounded-full transition-all duration-500"
                                            style={{ width: `${Math.min(100, Math.max(8, p.sharePercent))}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right 4 Cols: Recent Live Orders & Channels */}
                <div className="lg:col-span-4 space-y-4">
                    {/* Recent Transactions Feed */}
                    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-[#3C6CA8]" />
                                <h2 className="text-sm font-extrabold text-slate-900">
                                    Recent Transactions
                                </h2>
                            </div>
                            <button
                                onClick={() => onNavigateView ? onNavigateView('orders') : null}
                                className="text-[11px] font-bold text-[#3C6CA8] hover:underline flex items-center gap-0.5 cursor-pointer"
                            >
                                <span>All Orders</span>
                                <ArrowUpRight className="w-3 h-3" />
                            </button>
                        </div>

                        {recentSales.length === 0 ? (
                            <div className="py-8 text-center text-slate-400 text-xs">
                                No recent orders found.
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {recentSales.map((sale) => (
                                    <div
                                        key={sale.id}
                                        onClick={() => onNavigateView ? onNavigateView('orders', sale.id) : null}
                                        className="py-2.5 space-y-1 hover:bg-slate-50/80 rounded-xl px-2 -mx-2 transition-colors cursor-pointer"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="font-extrabold text-slate-900 text-xs truncate">
                                                {getPrimaryProductName(sale)}
                                            </p>
                                            <span className="font-mono font-black text-slate-900 text-xs shrink-0">
                                                {formatPHP((sale.total_price || 0) + (sale.shipping_fee || 0))}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                                            <span className="truncate max-w-[140px]">{sale.customer_name || 'Customer'}</span>
                                            <span className="font-mono">{formatTimeAgo(sale.created_at)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Payment Channels Split */}
                    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                            <div className="flex items-center gap-2">
                                <CreditCard className="w-4 h-4 text-[#3C6CA8]" />
                                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                                    Payment Channels
                                </h3>
                            </div>
                        </div>

                        {channelStats.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-3">No channel data available.</p>
                        ) : (
                            <div className="space-y-2.5">
                                {channelStats.map((ch, idx) => (
                                    <div key={idx} className="space-y-1">
                                        <div className="flex items-center justify-between text-xs font-semibold">
                                            <span className="text-slate-800 truncate">{ch.name}</span>
                                            <span className="font-mono text-slate-900">{formatPHP(ch.revenue)} ({ch.count})</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                            <div
                                                className="bg-emerald-600 h-1.5 rounded-full"
                                                style={{ width: `${Math.min(100, Math.max(5, ch.sharePercent))}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SalesAnalyticsManager;
