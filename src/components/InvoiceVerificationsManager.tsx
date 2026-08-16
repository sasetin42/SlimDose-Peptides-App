import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Check,
  X,
  FileText,
  Link as LinkIcon,
  RefreshCw,
  ShoppingBag,
  Calendar,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  Copy,
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  Tag,
  Radio,
  Eye,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  CreditCard,
  User,
  ShieldCheck,
  CheckSquare
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { fireToast } from './ToastNotification';
import { mirrorOrderUpdateStatus } from '../lib/convexMirror';

interface OrderItem {
  product_id?: string;
  product_name: string;
  variation_id?: string | null;
  variation_name?: string | null;
  quantity: number;
  price: number;
  total: number;
}

interface OrderInfo {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  shipping_address?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_zip_code?: string;
  shipping_location?: string;
  shipping_fee?: number;
  total_price: number;
  discount_applied?: number;
  promo_code?: string;
  payment_method_name?: string;
  order_items?: OrderItem[];
  payment_status?: string;
  order_status?: string;
  notes?: string;
  created_at?: string;
}

interface Verification {
  id: string;
  order_id: string;
  payment_proof_url: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string | null;
  created_at: string;
  updated_at?: string;
  orders?: OrderInfo | null;
}

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';
type SortOption = 'newest' | 'oldest' | 'amount-desc' | 'amount-asc';

export default function InvoiceVerificationsManager() {
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date>(new Date());
  const [isLiveConnected, setIsLiveConnected] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  // Lightbox Preview Modal State
  const [previewItem, setPreviewItem] = useState<Verification | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotationDeg, setRotationDeg] = useState(0);

  // Reject Modal State
  const [rejectModalItem, setRejectModalItem] = useState<Verification | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // Approve Loading State
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // Fetch Verification Data
  const loadData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const { data, error } = await supabase
        .from('invoice_verifications')
        .select(`
          *,
          orders (
            id,
            order_number,
            customer_name,
            customer_email,
            customer_phone,
            shipping_address,
            shipping_city,
            shipping_state,
            shipping_zip_code,
            shipping_location,
            shipping_fee,
            total_price,
            discount_applied,
            promo_code,
            payment_method_name,
            order_items,
            payment_status,
            order_status,
            notes,
            created_at
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVerifications(data || []);
      setLastSyncedAt(new Date());
    } catch (err: any) {
      console.error('Error loading verifications:', err);
      if (!silent) {
        fireToast(`Failed to load receipt verifications: ${err.message || 'Unknown error'}`, 'error');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Initial Load & Supabase Realtime Live Sync Subscription
  useEffect(() => {
    loadData();

    // Setup Supabase Realtime Subscription on invoice_verifications and orders
    const channel = supabase
      .channel('admin_invoice_verifications_live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invoice_verifications' },
        () => {
          loadData(true);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          loadData(true);
        }
      )
      .subscribe((status) => {
        setIsLiveConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  // Manual Refresh Handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
    fireToast('Verifications refreshed successfully', 'success', 2000);
  };

  // Toggle expand order details
  const toggleExpand = (id: string) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Copy text helper
  const copyToClipboard = (text: string, label = 'Copied') => {
    navigator.clipboard.writeText(text);
    fireToast(`${label} copied to clipboard!`, 'success', 2000);
  };

  // Format Currency (PHP)
  const formatPHP = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Format Relative / Absolute Date
  const formatDateDisplay = (dateString: string) => {
    const d = new Date(dateString);
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

    if (diffSeconds < 60) return 'Just now';
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    return d.toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Handle Approve Verification
  const handleApprove = async (v: Verification) => {
    try {
      setApprovingId(v.id);

      // 1. Update verification record
      const { error: vErr } = await supabase
        .from('invoice_verifications')
        .update({
          status: 'approved',
          updated_at: new Date().toISOString()
        })
        .eq('id', v.id);

      if (vErr) throw vErr;

      // 2. Update order record to Paid and Confirmed
      const { error: oErr } = await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          order_status: 'confirmed',
          payment_proof_url: v.payment_proof_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', v.order_id);

      if (oErr) throw oErr;

      // 3. Mirror status to Convex
      mirrorOrderUpdateStatus(v.order_id, { order_status: 'confirmed', payment_status: 'paid' });

      // 4. Trigger Telegram Notification Edge Function
      try {
        await fetch(`${supabase.supabaseUrl}/functions/v1/telegram-notify-order`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': (supabase as any).supabaseKey || '',
          },
          body: JSON.stringify({ order_id: v.order_id }),
        });
      } catch (tgErr) {
        console.warn('Telegram notification failed:', tgErr);
      }

      fireToast(`Receipt approved! Order #${v.orders?.order_number || v.order_id.slice(0, 8)} confirmed.`, 'success');
      await loadData(true);
    } catch (err: any) {
      console.error('Approval error:', err);
      fireToast(`Approval error: ${err.message || 'Unknown failure'}`, 'error');
    } finally {
      setApprovingId(null);
    }
  };

  // Open Reject Modal
  const openRejectModal = (v: Verification) => {
    setRejectModalItem(v);
    setRejectionReason('');
  };

  // Submit Rejection
  const handleConfirmReject = async () => {
    if (!rejectModalItem) return;
    try {
      setIsRejecting(true);
      const { error } = await supabase
        .from('invoice_verifications')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason.trim() || 'Payment proof could not be verified.',
          updated_at: new Date().toISOString()
        })
        .eq('id', rejectModalItem.id);

      if (error) throw error;

      fireToast(`Payment proof for Order #${rejectModalItem.orders?.order_number || rejectModalItem.order_id.slice(0, 8)} marked as rejected.`, 'info');
      setRejectModalItem(null);
      await loadData(true);
    } catch (err: any) {
      fireToast(`Rejection failed: ${err.message}`, 'error');
    } finally {
      setIsRejecting(false);
    }
  };

  // Lightbox handlers
  const openLightbox = (v: Verification) => {
    setPreviewItem(v);
    setZoomLevel(1);
    setRotationDeg(0);
  };

  const closeLightbox = () => {
    setPreviewItem(null);
    setZoomLevel(1);
    setRotationDeg(0);
  };

  // KPI Metrics Calculations
  const stats = useMemo(() => {
    const total = verifications.length;
    const pending = verifications.filter(v => v.status === 'pending');
    const approved = verifications.filter(v => v.status === 'approved');
    const rejected = verifications.filter(v => v.status === 'rejected');

    const totalVerifiedRevenue = approved.reduce((acc, v) => {
      const price = (v.orders?.total_price || 0) + (v.orders?.shipping_fee || 0);
      return acc + price;
    }, 0);

    const pendingRevenue = pending.reduce((acc, v) => {
      const price = (v.orders?.total_price || 0) + (v.orders?.shipping_fee || 0);
      return acc + price;
    }, 0);

    return {
      total,
      pendingCount: pending.length,
      pendingRevenue,
      approvedCount: approved.length,
      totalVerifiedRevenue,
      rejectedCount: rejected.length
    };
  }, [verifications]);

  // Filtered & Sorted Verifications
  const filteredVerifications = useMemo(() => {
    return verifications
      .filter(v => {
        // Status filter
        if (statusFilter !== 'all' && v.status !== statusFilter) return false;

        // Search Query filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const orderNum = (v.orders?.order_number || '').toLowerCase();
          const orderId = (v.order_id || '').toLowerCase();
          const custName = (v.orders?.customer_name || '').toLowerCase();
          const custEmail = (v.orders?.customer_email || '').toLowerCase();
          const custPhone = (v.orders?.customer_phone || '').toLowerCase();
          const payMethod = (v.orders?.payment_method_name || '').toLowerCase();

          return (
            orderNum.includes(q) ||
            orderId.includes(q) ||
            custName.includes(q) ||
            custEmail.includes(q) ||
            custPhone.includes(q) ||
            payMethod.includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        if (sortBy === 'oldest') {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        if (sortBy === 'amount-desc') {
          const aTot = (a.orders?.total_price || 0) + (a.orders?.shipping_fee || 0);
          const bTot = (b.orders?.total_price || 0) + (b.orders?.shipping_fee || 0);
          return bTot - aTot;
        }
        if (sortBy === 'amount-asc') {
          const aTot = (a.orders?.total_price || 0) + (a.orders?.shipping_fee || 0);
          const bTot = (b.orders?.total_price || 0) + (b.orders?.shipping_fee || 0);
          return aTot - bTot;
        }
        return 0;
      });
  }, [verifications, statusFilter, searchQuery, sortBy]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 space-y-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-[#3C6CA8]/10 border border-[#3C6CA8]/20 flex items-center justify-center animate-pulse">
            <RefreshCw className="w-6 h-6 text-[#3C6CA8] animate-spin" />
          </div>
        </div>
        <p className="text-sm font-semibold text-slate-600">Connecting to Realtime Verification Queue...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-left max-w-7xl mx-auto pb-10">
      {/* ── Top Header & Live Sync Bar ── */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-9 h-9 rounded-xl bg-[#3C6CA8]/10 border border-[#3C6CA8]/20 flex items-center justify-center text-[#3C6CA8] shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Invoice &amp; Receipt Verifications
                </h1>
                {/* Live Pulse Indicator */}
                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-all ${
                    isLiveConnected
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                  title={isLiveConnected ? 'Supabase Postgres Realtime Live Feed Active' : 'Connecting to Live Feed'}
                >
                  <span className={`w-2 h-2 rounded-full ${isLiveConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  <span className="hidden xs:inline">{isLiveConnected ? 'Live Sync Active' : 'Reconnecting'}</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time GCash, Maya &amp; Bank Transfer receipt audit console.
              </p>
            </div>
          </div>
        </div>

        {/* Action / Sync status */}
        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <span className="text-[11px] font-medium text-slate-400 hidden md:inline">
            Synced: {lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 active:bg-slate-300 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-200 shadow-xs cursor-pointer disabled:opacity-50"
            title="Refresh Verifications Queue"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#3C6CA8]' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── KPI Metric Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Pending Card */}
        <div
          onClick={() => setStatusFilter('pending')}
          className={`cursor-pointer bg-white rounded-2xl p-4 border transition-all relative overflow-hidden group shadow-xs ${
            statusFilter === 'pending'
              ? 'border-amber-400 ring-2 ring-amber-400/20 bg-amber-50/20'
              : 'border-slate-200/80 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Pending Review</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100/70 text-amber-700 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">{stats.pendingCount}</span>
            {stats.pendingCount > 0 && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                Needs Action
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate">
            {formatPHP(stats.pendingRevenue)} pending
          </p>
        </div>

        {/* Approved Card */}
        <div
          onClick={() => setStatusFilter('approved')}
          className={`cursor-pointer bg-white rounded-2xl p-4 border transition-all relative overflow-hidden group shadow-xs ${
            statusFilter === 'approved'
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20'
              : 'border-slate-200/80 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Verified &amp; Paid</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">{stats.approvedCount}</span>
          </div>
          <p className="text-[11px] font-bold text-emerald-600 mt-1 truncate">
            {formatPHP(stats.totalVerifiedRevenue)} confirmed
          </p>
        </div>

        {/* Rejected Card */}
        <div
          onClick={() => setStatusFilter('rejected')}
          className={`cursor-pointer bg-white rounded-2xl p-4 border transition-all relative overflow-hidden group shadow-xs ${
            statusFilter === 'rejected'
              ? 'border-rose-400 ring-2 ring-rose-400/20 bg-rose-50/20'
              : 'border-slate-200/80 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Rejected Proofs</span>
            <div className="w-8 h-8 rounded-xl bg-rose-100/70 text-rose-700 flex items-center justify-center font-bold">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">{stats.rejectedCount}</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate">
            Requires customer resubmit
          </p>
        </div>

        {/* Total Verifications Card */}
        <div
          onClick={() => setStatusFilter('all')}
          className={`cursor-pointer bg-white rounded-2xl p-4 border transition-all relative overflow-hidden group shadow-xs ${
            statusFilter === 'all'
              ? 'border-[#3C6CA8] ring-2 ring-[#3C6CA8]/20 bg-blue-50/20'
              : 'border-slate-200/80 hover:border-[#3C6CA8]/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Submissions</span>
            <div className="w-8 h-8 rounded-xl bg-[#3C6CA8]/10 text-[#3C6CA8] flex items-center justify-center font-bold">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">{stats.total}</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate">
            All GCash / Bank uploads
          </p>
        </div>
      </div>

      {/* ── Search, Filters & Controls Bar ── */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-3 sm:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input id="invoiceverificationsmanager-search" name="search" type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Order #, Customer Name, Email, Phone..."
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-50/80 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3C6CA8]/20 focus:border-[#3C6CA8] transition-all text-slate-800 placeholder-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-400 font-bold hidden sm:inline">Sort:</span>
            <select id="invoiceverificationsmanager-input-2" name="input_2" value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-none focus:ring-2 focus:ring-[#3C6CA8]/20 focus:border-[#3C6CA8] cursor-pointer"
            >
              <option value="newest">Newest Uploads</option>
              <option value="oldest">Oldest Uploads</option>
              <option value="amount-desc">Order Amount (High to Low)</option>
              <option value="amount-asc">Order Amount (Low to High)</option>
            </select>
          </div>
        </div>

        {/* Tab Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-t border-slate-100 pt-3 custom-scrollbar">
          {(
            [
              { id: 'all', label: 'All Receipts', count: stats.total },
              { id: 'pending', label: 'Pending', count: stats.pendingCount, alert: stats.pendingCount > 0 },
              { id: 'approved', label: 'Approved', count: stats.approvedCount },
              { id: 'rejected', label: 'Rejected', count: stats.rejectedCount }
            ] as const
          ).map((tab) => {
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-[#3C6CA8] text-white shadow-sm'
                    : 'bg-slate-100/70 hover:bg-slate-100 text-slate-600'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    active
                      ? 'bg-white/20 text-white'
                      : tab.alert
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Verification Cards List ── */}
      {filteredVerifications.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Verification Records Found</h3>
          <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No receipt records matching "${searchQuery}". Try adjusting your filters.`
              : 'Proof uploads from GCash, Maya, or bank transfers will automatically appear here.'}
          </p>
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
              className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-all"
            >
              Clear Search Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredVerifications.map((v) => {
            const orderInfo = v.orders;
            const isPending = v.status === 'pending';
            const isApproved = v.status === 'approved';
            const isRejected = v.status === 'rejected';
            const isExpanded = expandedOrders.has(v.id);
            const isApproving = approvingId === v.id;
            const fileIsPdf = v.payment_proof_url?.toLowerCase().endsWith('.pdf');

            const orderTotal = (orderInfo?.total_price || 0) + (orderInfo?.shipping_fee || 0);

            return (
              <div
                key={v.id}
                className={`bg-white rounded-2xl shadow-xs border transition-all duration-200 overflow-hidden ${
                  isPending
                    ? 'border-amber-300 hover:border-amber-400 hover:shadow-md'
                    : isApproved
                    ? 'border-slate-200/90 hover:border-emerald-300 hover:shadow-md'
                    : 'border-slate-200/90 opacity-90 hover:opacity-100'
                }`}
              >
                {/* Card Main Body */}
                <div className="p-4 sm:p-5 flex flex-col md:flex-row gap-4 sm:gap-5 items-stretch">
                  {/* Proof Visual Thumbnail with Quick Lightbox Trigger */}
                  <div className="w-full md:w-52 h-48 md:h-auto bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center overflow-hidden shrink-0 relative group">
                    {fileIsPdf ? (
                      <div className="text-center p-4">
                        <FileText className="w-12 h-12 text-rose-500 mx-auto mb-2" />
                        <span className="text-[10px] font-black text-slate-600 block tracking-wider">PDF RECEIPT</span>
                        <span className="text-[9px] text-slate-400">Click to preview document</span>
                      </div>
                    ) : (
                      <img
                        src={v.payment_proof_url}
                        alt="Payment Receipt Proof"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    )}

                    {/* Overlay Action Buttons */}
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2 backdrop-blur-xs">
                      <button
                        onClick={() => openLightbox(v)}
                        className="p-2 bg-white text-slate-800 rounded-xl hover:bg-slate-100 text-xs font-bold flex items-center gap-1 shadow-lg cursor-pointer transition-transform transform active:scale-95"
                        title="Zoom / Inspect Receipt"
                      >
                        <Eye className="w-4 h-4 text-[#3C6CA8]" />
                        <span className="text-[11px]">Inspect</span>
                      </button>
                      <a
                        href={v.payment_proof_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-slate-900/80 text-white rounded-xl hover:bg-slate-900 transition-colors"
                        title="Open in new tab"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>

                    {/* Mobile always-visible tap to view pill */}
                    <button
                      onClick={() => openLightbox(v)}
                      className="md:hidden absolute bottom-2 right-2 px-2 py-1 bg-slate-900/80 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 backdrop-blur-xs"
                    >
                      <Eye className="w-3 h-3" />
                      <span>View</span>
                    </button>
                  </div>

                  {/* Details Information Column */}
                  <div className="flex-1 flex flex-col justify-between space-y-4">
                    {/* Top Row: Order Header & Status Badge */}
                    <div>
                      <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm sm:text-base font-black text-slate-900 flex items-center gap-1.5">
                            <ShoppingBag className="w-4 h-4 text-[#3C6CA8]" />
                            #{orderInfo?.order_number || v.order_id.slice(0, 8)}
                          </span>
                          <button
                            onClick={() => copyToClipboard(orderInfo?.order_number || v.order_id, 'Order number')}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
                            title="Copy Order Number"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-black tracking-wide border flex items-center gap-1 ${
                              isApproved
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : isRejected
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-amber-50 text-amber-700 border-amber-300 animate-pulse'
                            }`}
                          >
                            {isApproved && <CheckCircle2 className="w-3.5 h-3.5" />}
                            {isRejected && <XCircle className="w-3.5 h-3.5" />}
                            {isPending && <Clock className="w-3.5 h-3.5" />}
                            {v.status.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {/* Customer & Payment Metadata Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs mt-3 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                        <div>
                          <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wider flex items-center gap-1">
                            <User className="w-3 h-3" /> Customer
                          </span>
                          <p className="font-bold text-slate-800 mt-0.5 truncate" title={orderInfo?.customer_name}>
                            {orderInfo?.customer_name || 'Guest User'}
                          </p>
                          {orderInfo?.customer_phone && (
                            <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Phone className="w-2.5 h-2.5" /> {orderInfo.customer_phone}
                            </p>
                          )}
                        </div>

                        <div>
                          <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wider flex items-center gap-1">
                            <CreditCard className="w-3 h-3" /> Payment Channel
                          </span>
                          <p className="font-bold text-slate-800 mt-0.5 truncate">
                            {orderInfo?.payment_method_name || 'GCash / Bank Transfer'}
                          </p>
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100 inline-block mt-0.5">
                            Proof Attached
                          </span>
                        </div>

                        <div className="col-span-2 sm:col-span-1">
                          <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wider flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Uploaded At
                          </span>
                          <p className="font-bold text-slate-800 mt-0.5" title={new Date(v.created_at).toLocaleString()}>
                            {formatDateDisplay(v.created_at)}
                          </p>
                          <span className="text-[10px] text-slate-400">
                            {new Date(v.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      {/* Rejection Note (if rejected) */}
                      {isRejected && v.rejection_reason && (
                        <div className="mt-2.5 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                          <div>
                            <span className="font-bold block">Rejection Reason:</span>
                            <p className="text-[11px] mt-0.5">{v.rejection_reason}</p>
                          </div>
                        </div>
                      )}

                      {/* Expandable Order Items Breakdown */}
                      {orderInfo?.order_items && orderInfo.order_items.length > 0 && (
                        <div className="mt-2.5">
                          <button
                            onClick={() => toggleExpand(v.id)}
                            className="text-[11px] font-bold text-[#3C6CA8] hover:text-[#264874] flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <span>
                              {isExpanded ? 'Hide' : 'View'} {orderInfo.order_items.length} Ordered Item{orderInfo.order_items.length > 1 ? 's' : ''}
                            </span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>

                          {isExpanded && (
                            <div className="mt-2 p-3 bg-white border border-slate-200 rounded-xl space-y-1.5 animate-in fade-in duration-150">
                              {orderInfo.order_items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center text-xs py-1 border-b border-slate-100 last:border-0">
                                  <div className="min-w-0 pr-2">
                                    <p className="font-bold text-slate-800 truncate">
                                      {item.quantity}× {item.product_name}
                                    </p>
                                    {item.variation_name && (
                                      <span className="text-[10px] text-slate-500">{item.variation_name}</span>
                                    )}
                                  </div>
                                  <span className="font-mono font-bold text-slate-700 shrink-0">
                                    {formatPHP(item.total || item.price * item.quantity)}
                                  </span>
                                </div>
                              ))}

                              {/* Destination Note */}
                              {orderInfo.shipping_address && (
                                <div className="pt-2 mt-1 border-t border-slate-100 text-[11px] text-slate-500 flex items-start gap-1">
                                  <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400 mt-0.5" />
                                  <span className="truncate">
                                    {[orderInfo.shipping_address, orderInfo.shipping_city, orderInfo.shipping_state].filter(Boolean).join(', ')}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Bottom Action / Total Value Row */}
                    <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-3 border-t border-slate-100">
                      <div>
                        <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider block">
                          Total Amount To Verify
                        </span>
                        <p className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                          {formatPHP(orderTotal)}
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openLightbox(v)}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          title="Preview Full Image"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Proof</span>
                        </button>

                        {isPending && (
                          <>
                            <button
                              onClick={() => handleApprove(v)}
                              disabled={isApproving}
                              className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50"
                            >
                              {isApproving ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              )}
                              <span>Confirm &amp; Approve</span>
                            </button>

                            <button
                              onClick={() => openRejectModal(v)}
                              disabled={isApproving}
                              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border border-rose-200 transition-colors cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── High-Res Image Lightbox Modal ── */}
      {previewItem && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={closeLightbox}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-800/20"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Lightbox Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <h3 className="text-sm font-bold truncate flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Receipt Verification — Order #{previewItem.orders?.order_number || previewItem.order_id.slice(0, 8)}
                </h3>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                  {previewItem.orders?.customer_name} • {formatPHP((previewItem.orders?.total_price || 0) + (previewItem.orders?.shipping_fee || 0))}
                </p>
              </div>

              {/* Lightbox Controls */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setZoomLevel(prev => Math.min(prev + 0.3, 3))}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setZoomLevel(prev => Math.max(prev - 0.3, 0.7))}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setRotationDeg(prev => (prev + 90) % 360)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                  title="Rotate 90°"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <a
                  href={previewItem.payment_proof_url}
                  download={`Receipt-${previewItem.orders?.order_number || previewItem.order_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                  title="Download File"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  onClick={closeLightbox}
                  className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white transition-colors ml-1"
                  title="Close Modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Lightbox Canvas Area */}
            <div className="flex-1 bg-slate-950 flex items-center justify-center p-4 overflow-auto min-h-[350px] relative">
              {previewItem.payment_proof_url.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={previewItem.payment_proof_url}
                  className="w-full h-full min-h-[500px] rounded-lg bg-white"
                  title="PDF Receipt Viewer"
                />
              ) : (
                <div
                  className="transition-transform duration-150 ease-out flex items-center justify-center"
                  style={{
                    transform: `scale(${zoomLevel}) rotate(${rotationDeg}deg)`,
                  }}
                >
                  <img
                    src={previewItem.payment_proof_url}
                    alt="Full Receipt"
                    className="max-h-[65vh] max-w-full object-contain rounded-lg shadow-2xl select-none"
                  />
                </div>
              )}
            </div>

            {/* Lightbox Footer Actions */}
            <div className="p-3 sm:p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-slate-600">
                <span>Status: </span>
                <span className="font-bold uppercase text-slate-900">{previewItem.status}</span>
                {previewItem.orders?.payment_method_name && (
                  <span className="ml-2 text-slate-500">• {previewItem.orders.payment_method_name}</span>
                )}
              </div>

              {previewItem.status === 'pending' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const item = previewItem;
                      closeLightbox();
                      handleApprove(item);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Approve Receipt</span>
                  </button>
                  <button
                    onClick={() => {
                      const item = previewItem;
                      closeLightbox();
                      openRejectModal(item);
                    }}
                    className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold border border-rose-200 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                    <span>Reject</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Reason Confirmation Modal ── */}
      {rejectModalItem && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setRejectModalItem(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 sm:p-6 border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Reject Payment Proof</h3>
                <p className="text-xs text-slate-500">Order #{rejectModalItem.orders?.order_number || rejectModalItem.order_id.slice(0, 8)}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              Please specify the reason for rejection. This helps keep record for why the payment could not be validated.
            </p>

            {/* Quick Reason Chips */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {[
                'Blurry / unreadable image',
                'Incorrect amount transferred',
                'Duplicate receipt submitted',
                'Invalid reference number'
              ].map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setRejectionReason(reason)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-colors cursor-pointer ${
                    rejectionReason === reason
                      ? 'bg-rose-50 text-rose-700 border-rose-300 font-bold'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>

            <textarea id="invoiceverificationsmanager-input-3" name="input_3" rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection notes / reason..."
              className="w-full p-3 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none text-slate-800 transition-all resize-none"
            />

            <div className="flex gap-2.5 mt-4">
              <button
                type="button"
                onClick={() => setRejectModalItem(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isRejecting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isRejecting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                <span>Confirm Rejection</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
