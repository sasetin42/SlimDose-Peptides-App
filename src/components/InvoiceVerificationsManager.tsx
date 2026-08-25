import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Check,
  X,
  FileText,
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
  Eye,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  CreditCard,
  User,
  ShieldCheck,
  CheckSquare,
  Sparkles,
  TrendingUp,
  DollarSign,
  Send,
  MessageCircle,
  Maximize2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { fireToast } from './ToastNotification';
import { mirrorOrderUpdateStatus } from '../lib/convexMirror';
import { formatOrderId } from '../utils/orderUtils';

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

interface InvoiceVerificationsManagerProps {
  onNavigateView?: (view: string, id?: string) => void;
}

const formatPHP = (amount: number) => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount || 0);
};

const formatDateDisplay = (dateString?: string | null) => {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatTimeAgo = (dateString?: string | null) => {
  if (!dateString) return 'Recent';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Recent';
  const diff = Date.now() - date.getTime();
  if (diff < 0) return 'Just now';
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'Just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function InvoiceVerificationsManager({ onNavigateView }: InvoiceVerificationsManagerProps) {
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
  const [paymentChannelFilter, setPaymentChannelFilter] = useState<string>('all');

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

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

  // Fetch Verification Data & Unify with Orders with Payment Proofs
  const loadData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      // 1. Fetch from invoice_verifications table
      const { data: ivData, error: ivError } = await supabase
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

      if (ivError) {
        console.warn('Note reading invoice_verifications:', ivError);
      }

      // 2. Fetch all orders with payment_proof_url to guarantee 100% sync
      const { data: allOrders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.warn('Note reading orders:', ordersError);
      }

      const ordersWithProof = (allOrders || []).filter(
        (o: any) => o && o.payment_proof_url && typeof o.payment_proof_url === 'string' && o.payment_proof_url.trim().length > 0
      );

      const verificationsList: Verification[] = ivData ? [...ivData] : [];
      const existingOrderIds = new Set(verificationsList.map(v => v.order_id));

      // Synthesize any uploaded order proofs that may not yet have a record in invoice_verifications
      if (ordersWithProof && ordersWithProof.length > 0) {
        ordersWithProof.forEach((order) => {
          if (order.payment_proof_url && !existingOrderIds.has(order.id)) {
            verificationsList.push({
              id: `v-sync-${order.id}`,
              order_id: order.id,
              payment_proof_url: order.payment_proof_url,
              status: order.payment_status === 'paid' ? 'approved' : order.payment_status === 'rejected' ? 'rejected' : 'pending',
              created_at: order.created_at || new Date().toISOString(),
              orders: order
            });
            existingOrderIds.add(order.id);
          }
        });
      }

      // Sort by newest created_at timestamp
      verificationsList.sort((a, b) => {
        const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tB - tA;
      });

      setVerifications(verificationsList);
      setLastSyncedAt(new Date());
    } catch (err: any) {
      console.error('Error loading verifications:', err);
      fireToast('Failed to load receipts. Refreshing...', 'error');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Supabase Realtime Subscription
  useEffect(() => {
    loadData();

    const ivChannel = supabase
      .channel('realtime:invoice_verifications')
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
      supabase.removeChannel(ivChannel);
    };
  }, [loadData]);

  // Handle Manual Refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData(false);
    fireToast('Verifications reloaded live from database! 🔄', 'info');
  };

  // Toggle Line Items Expansion
  const toggleExpand = (id: string) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Toggle Row Selection
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Select All Filtered Rows
  const handleSelectAll = () => {
    if (selectedIds.size === filteredVerifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredVerifications.map(v => v.id)));
    }
  };

  // Handle Approve Verification & Link Order Features
  const handleApprove = async (v: Verification) => {
    try {
      setApprovingId(v.id);

      // 1. Update/Upsert verification record
      if (!v.id.startsWith('v-sync-')) {
        await supabase
          .from('invoice_verifications')
          .update({
            status: 'approved',
            updated_at: new Date().toISOString()
          })
          .eq('id', v.id);
      } else {
        await supabase
          .from('invoice_verifications')
          .upsert([{
            order_id: v.order_id,
            payment_proof_url: v.payment_proof_url,
            status: 'approved',
            updated_at: new Date().toISOString()
          }], { onConflict: 'order_id' });
      }

      // 2. Update order record to Paid and Confirmed
      await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          order_status: 'confirmed',
          updated_at: new Date().toISOString()
        })
        .eq('id', v.order_id);

      // 3. Mirror status to Convex
      mirrorOrderUpdateStatus(v.order_id, { order_status: 'confirmed', payment_status: 'paid' });

      const formattedId = formatOrderId({ id: v.order_id, order_number: v.orders?.order_number });
      fireToast(`Receipt approved! Order ${formattedId} marked as Paid & Confirmed. ✨`, 'success');

      if (previewItem?.id === v.id) {
        setPreviewItem(null);
      }

      await loadData(true);
    } catch (err: any) {
      console.error('Approve failed:', err);
      fireToast(`Approval error: ${err.message || 'Check database permissions'}`, 'error');
    } finally {
      setApprovingId(null);
    }
  };

  // Bulk Approve Selected
  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    const pendingToApprove = verifications.filter(v => selectedIds.has(v.id) && v.status === 'pending');
    if (pendingToApprove.length === 0) {
      fireToast('No pending receipts selected to approve.', 'info');
      return;
    }

    if (!confirm(`Approve payment proofs for ${pendingToApprove.length} selected orders?`)) {
      return;
    }

    try {
      setIsBulkProcessing(true);
      for (const v of pendingToApprove) {
        await handleApprove(v);
      }
      setSelectedIds(new Set());
      fireToast(`Bulk approved ${pendingToApprove.length} receipts successfully! 🎉`, 'success');
    } catch (err) {
      console.error('Bulk approve error:', err);
      fireToast('Some approvals could not be completed.', 'error');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Open Reject Modal
  const openRejectModal = (v: Verification) => {
    setRejectModalItem(v);
    setRejectionReason('Payment proof could not be verified. Please upload a clear photo/screenshot.');
  };

  // Submit Rejection
  const handleConfirmReject = async () => {
    if (!rejectModalItem) return;
    try {
      setIsRejecting(true);
      const reasonText = rejectionReason.trim() || 'Payment proof could not be verified or was illegible. Please submit a clear copy of your transaction receipt.';

      if (!rejectModalItem.id.startsWith('v-sync-')) {
        await supabase
          .from('invoice_verifications')
          .update({
            status: 'rejected',
            rejection_reason: reasonText,
            updated_at: new Date().toISOString()
          })
          .eq('id', rejectModalItem.id);
      } else {
        await supabase
          .from('invoice_verifications')
          .upsert([{
            order_id: rejectModalItem.order_id,
            payment_proof_url: rejectModalItem.payment_proof_url,
            status: 'rejected',
            rejection_reason: reasonText,
            updated_at: new Date().toISOString()
          }], { onConflict: 'order_id' });
      }

      // Update order payment status
      await supabase
        .from('orders')
        .update({
          payment_status: 'rejected',
          notes: rejectModalItem.orders?.notes
            ? `${rejectModalItem.orders.notes} | Verification Rejected: ${reasonText}`
            : `Verification Rejected: ${reasonText}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', rejectModalItem.order_id);

      mirrorOrderUpdateStatus(rejectModalItem.order_id, { payment_status: 'rejected' });

      const formattedId = formatOrderId({ id: rejectModalItem.order_id, order_number: rejectModalItem.orders?.order_number });
      fireToast(`Payment proof for Order ${formattedId} marked as rejected.`, 'info');
      setRejectModalItem(null);

      if (previewItem?.id === rejectModalItem.id) {
        setPreviewItem(null);
      }

      await loadData(true);
    } catch (err: any) {
      console.error('Reject failed:', err);
      fireToast(`Failed to reject: ${err.message}`, 'error');
    } finally {
      setIsRejecting(false);
    }
  };

  // Lightbox Handlers
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

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    fireToast(`Copied ${label} to clipboard! 📋`, 'info');
  };

  // Export CSV
  const handleExportCSV = () => {
    const rows = [
      ['Verification ID', 'Order ID', 'Status', 'Customer Name', 'Phone', 'Email', 'Payment Channel', 'Total Amount', 'Upload Date', 'Proof URL', 'Rejection Note']
    ];

    filteredVerifications.forEach(v => {
      const order = v.orders;
      const total = (order?.total_price || 0) + (order?.shipping_fee || 0);
      rows.push([
        v.id,
        formatOrderId({ id: v.order_id, order_number: order?.order_number }, { prefix: false }),
        v.status.toUpperCase(),
        order?.customer_name || '',
        order?.customer_phone || '',
        order?.customer_email || '',
        order?.payment_method_name || 'GCash/Bank',
        total.toFixed(2),
        v.created_at,
        v.payment_proof_url,
        v.rejection_reason || ''
      ]);
    });

    const csvContent = rows.map(r => r.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `slimdose_receipt_verifications_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    fireToast('Exported verifications report to CSV! 📊', 'success');
  };

  // Analytics Metrics
  const metrics = useMemo(() => {
    let pendingCount = 0;
    let pendingValue = 0;
    let approvedCount = 0;
    let approvedValue = 0;
    let rejectedCount = 0;

    verifications.forEach((v) => {
      const total = (v.orders?.total_price || 0) + (v.orders?.shipping_fee || 0);
      if (v.status === 'pending') {
        pendingCount++;
        pendingValue += total;
      } else if (v.status === 'approved') {
        approvedCount++;
        approvedValue += total;
      } else if (v.status === 'rejected') {
        rejectedCount++;
      }
    });

    const totalCount = verifications.length;
    const approvalRate = totalCount > 0 ? (approvedCount / (approvedCount + rejectedCount || 1)) * 100 : 100;

    return {
      totalCount,
      pendingCount,
      pendingValue,
      approvedCount,
      approvedValue,
      rejectedCount,
      approvalRate
    };
  }, [verifications]);

  // Unique Payment Channels for Filter
  const availablePaymentChannels = useMemo(() => {
    const set = new Set<string>();
    verifications.forEach(v => {
      if (v.orders?.payment_method_name) {
        set.add(v.orders.payment_method_name);
      }
    });
    return Array.from(set);
  }, [verifications]);

  // Filtered & Sorted Verifications
  const filteredVerifications = useMemo(() => {
    return verifications.filter((v) => {
      // Status Filter
      if (statusFilter !== 'all' && v.status !== statusFilter) {
        return false;
      }

      // Payment Channel Filter
      if (paymentChannelFilter !== 'all' && v.orders?.payment_method_name !== paymentChannelFilter) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const formattedId = formatOrderId({ id: v.order_id, order_number: v.orders?.order_number }).toLowerCase();
        const customerName = (v.orders?.customer_name || '').toLowerCase();
        const customerEmail = (v.orders?.customer_email || '').toLowerCase();
        const customerPhone = (v.orders?.customer_phone || '').toLowerCase();
        const orderId = (v.order_id || '').toLowerCase();
        const orderNum = (v.orders?.order_number || '').toLowerCase();
        const paymentMethod = (v.orders?.payment_method_name || '').toLowerCase();

        return (
          formattedId.includes(q) ||
          customerName.includes(q) ||
          customerEmail.includes(q) ||
          customerPhone.includes(q) ||
          orderId.includes(q) ||
          orderNum.includes(q) ||
          paymentMethod.includes(q)
        );
      }

      return true;
    }).sort((a, b) => {
      const orderA = a.orders;
      const orderB = b.orders;
      const totalA = (orderA?.total_price || 0) + (orderA?.shipping_fee || 0);
      const totalB = (orderB?.total_price || 0) + (orderB?.shipping_fee || 0);

      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'amount-desc':
          return totalB - totalA;
        case 'amount-asc':
          return totalA - totalB;
        default:
          return 0;
      }
    });
  }, [verifications, statusFilter, paymentChannelFilter, searchQuery, sortBy]);

  if (loading) {
    return (
      <div className="w-full max-w-[1720px] mx-auto px-2 sm:px-4 md:px-6 py-12 flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-8 h-8 text-[#3C6CA8] animate-spin" />
        <p className="text-xs font-bold text-slate-500">Loading invoice receipts &amp; payments...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1720px] mx-auto px-2 sm:px-4 md:px-6 py-3 sm:py-4 space-y-4 text-left font-inter">
      {/* ── Top Header & Live Sync Bar ── */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-3.5 sm:p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-8.5 h-8.5 rounded-xl bg-[#3C6CA8]/10 border border-[#3C6CA8]/20 flex items-center justify-center text-[#3C6CA8] shrink-0">
              <FileText className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                  Invoice &amp; Receipt Verifications
                </h1>
                {/* Live Pulse Indicator */}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {isLiveConnected ? 'LIVE SYNC' : 'SYNCED'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Inspect customer payment proofs, approve transactions, and synchronize order fulfillment status.
              </p>
            </div>
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            title="Download CSV Report"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            title="Reload verification data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── KPI Metric Summary Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Receipts */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-extrabold uppercase tracking-wider">Total Proofs</span>
            <FileText className="w-4 h-4 text-[#3C6CA8]" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">{metrics.totalCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">All customer upload logs</p>
        </div>

        {/* Pending Review */}
        <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 rounded-2xl p-4 border border-amber-200/80 shadow-xs">
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-xs font-extrabold uppercase tracking-wider">Pending Review</span>
            <Clock className="w-4 h-4 text-amber-600 animate-spin" />
          </div>
          <p className="text-2xl font-black text-amber-900 font-mono">{metrics.pendingCount}</p>
          <p className="text-[11px] text-amber-700 font-bold mt-0.5">
            Value: {formatPHP(metrics.pendingValue)}
          </p>
        </div>

        {/* Approved & Verified */}
        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 rounded-2xl p-4 border border-emerald-200/80 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-xs font-extrabold uppercase tracking-wider">Verified Paid</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-900 font-mono">{metrics.approvedCount}</p>
          <p className="text-[11px] text-emerald-700 font-bold mt-0.5">
            Value: {formatPHP(metrics.approvedValue)}
          </p>
        </div>

        {/* Rejection Count */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-extrabold uppercase tracking-wider">Rejected Proofs</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">{metrics.rejectedCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {metrics.approvalRate.toFixed(0)}% Approval Rate
          </p>
        </div>
      </div>

      {/* ── Advanced Search & Tab Filter Bar ── */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-3 sm:p-3.5 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto custom-scrollbar">
            {[
              { id: 'all', label: 'All Receipts', count: metrics.totalCount },
              { id: 'pending', label: 'Pending Review', count: metrics.pendingCount, highlight: true },
              { id: 'approved', label: 'Approved & Paid', count: metrics.approvedCount },
              { id: 'rejected', label: 'Rejected', count: metrics.rejectedCount },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as StatusFilter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  statusFilter === tab.id
                    ? 'bg-[#3C6CA8] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  statusFilter === tab.id
                    ? 'bg-white/20 text-white'
                    : tab.highlight && tab.count > 0
                    ? 'bg-amber-200 text-amber-800 font-bold'
                    : 'bg-slate-200 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by SDP0001, customer, phone, channel..."
              className="w-full pl-9 pr-8 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/70 focus:bg-white focus:ring-2 focus:ring-[#3C6CA8]/20 focus:border-[#3C6CA8] outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Secondary Filter Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-500 text-[11px] uppercase tracking-wider">Payment Channel:</span>
            <select
              value={paymentChannelFilter}
              onChange={(e) => setPaymentChannelFilter(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 font-semibold text-slate-700 outline-none text-xs"
            >
              <option value="all">All Channels</option>
              {availablePaymentChannels.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <span className="font-bold text-slate-500 text-[11px] uppercase tracking-wider ml-2">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 font-semibold text-slate-700 outline-none text-xs"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="amount-desc">Highest Amount</option>
              <option value="amount-asc">Lowest Amount</option>
            </select>
          </div>

          {/* Bulk Operations Toolbar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 bg-blue-50/80 px-3 py-1 rounded-xl border border-blue-200 animate-in fade-in duration-150">
              <span className="font-extrabold text-[#3C6CA8] text-xs">
                {selectedIds.size} Selected
              </span>
              <button
                onClick={handleBulkApprove}
                disabled={isBulkProcessing}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-black text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
              >
                <Check className="w-3 h-3 stroke-[3]" />
                <span>Bulk Approve</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Verification Records Modern Data Table View ── */}
      {filteredVerifications.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-base font-extrabold text-slate-900 mb-1">No Verifications Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? `No receipt records matching "${searchQuery}". Try clearing your search.`
              : 'There are currently no customer payment proofs matching this status filter.'}
          </p>
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setPaymentChannelFilter('all');
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold transition-colors cursor-pointer"
            >
              Reset All Filters
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[960px]">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-3 w-8 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredVerifications.length && filteredVerifications.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-[#3C6CA8] focus:ring-[#3C6CA8] accent-[#3C6CA8] cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-3 w-12 text-center">Proof</th>
                  <th className="py-3 px-4">Order ID & Date</th>
                  <th className="py-3 px-4">Customer Details</th>
                  <th className="py-3 px-4">Payment Channel</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredVerifications.map((v) => {
                  const orderInfo = v.orders;
                  const isPending = v.status === 'pending';
                  const isApproved = v.status === 'approved';
                  const isRejected = v.status === 'rejected';
                  const isExpanded = expandedOrders.has(v.id);
                  const isApproving = approvingId === v.id;
                  const isSelected = selectedIds.has(v.id);
                  const fileIsPdf = v.payment_proof_url?.toLowerCase().endsWith('.pdf');
                  const orderTotal = (orderInfo?.total_price || 0) + (orderInfo?.shipping_fee || 0);
                  const formattedOrderIdStr = formatOrderId({ id: v.order_id, order_number: orderInfo?.order_number });

                  return (
                    <React.Fragment key={v.id}>
                      {/* Main Table Row */}
                      <tr className={`hover:bg-slate-50/80 transition-colors group ${
                        isSelected ? 'bg-blue-50/50' : isPending ? 'bg-amber-50/15' : ''
                      }`}>
                        {/* Row Checkbox */}
                        <td className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(v.id)}
                            className="w-4 h-4 rounded border-slate-300 text-[#3C6CA8] focus:ring-[#3C6CA8] accent-[#3C6CA8] cursor-pointer"
                          />
                        </td>

                        {/* Receipt Thumbnail Cell */}
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => openLightbox(v)}
                            className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 hover:ring-2 hover:ring-[#3C6CA8] transition-all cursor-pointer relative mx-auto flex items-center justify-center group/thumb"
                            title="Inspect Receipt Proof"
                          >
                            {fileIsPdf ? (
                              <FileText className="w-5 h-5 text-rose-500" />
                            ) : (
                              <img
                                src={v.payment_proof_url}
                                alt="Receipt"
                                className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform"
                                loading="lazy"
                              />
                            )}
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                              <Eye className="w-3.5 h-3.5 text-white" />
                            </div>
                          </button>
                        </td>

                        {/* Order ID & Date Cell */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 font-bold">
                            <span className="font-mono text-slate-900 text-xs">
                              {formattedOrderIdStr}
                            </span>
                            <button
                              onClick={() => copyToClipboard(formattedOrderIdStr, 'Order ID')}
                              className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Copy Order ID"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5" title={new Date(v.created_at).toLocaleString()}>
                            {formatDateDisplay(v.created_at)} ({formatTimeAgo(v.created_at)})
                          </p>
                        </td>

                        {/* Customer Information Cell */}
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900 truncate max-w-[180px]">
                            {orderInfo?.customer_name || 'Guest Checkout'}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                            {orderInfo?.customer_phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-2.5 h-2.5 text-slate-400" /> {orderInfo.customer_phone}
                              </span>
                            )}
                            {orderInfo?.customer_email && !orderInfo?.customer_phone && (
                              <span className="truncate max-w-[140px] text-slate-400">
                                {orderInfo.customer_email}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Payment Method Cell */}
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-800 block">
                            {orderInfo?.payment_method_name || 'GCash / Bank Transfer'}
                          </span>
                          <button
                            onClick={() => toggleExpand(v.id)}
                            className="text-[10.5px] font-bold text-[#3C6CA8] hover:text-[#264874] flex items-center gap-1 mt-0.5 cursor-pointer"
                          >
                            <span>
                              {orderInfo?.order_items?.length || 0} item{(orderInfo?.order_items?.length || 0) > 1 ? 's' : ''}
                            </span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </td>

                        {/* Total Amount Cell */}
                        <td className="py-3 px-4 text-right font-mono font-black text-slate-900 text-sm">
                          {formatPHP(orderTotal)}
                        </td>

                        {/* Status Cell */}
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wide border ${
                              isApproved
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : isRejected
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-amber-50 text-amber-700 border-amber-300 animate-pulse'
                            }`}
                          >
                            {isApproved && <CheckCircle2 className="w-3 h-3" />}
                            {isRejected && <XCircle className="w-3 h-3" />}
                            {isPending && <Clock className="w-3 h-3" />}
                            {v.status.toUpperCase()}
                          </span>
                        </td>

                        {/* Action Buttons Cell */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Link to Orders Management View */}
                            <button
                              onClick={() => {
                                if (onNavigateView) {
                                  onNavigateView('orders', v.order_id);
                                } else {
                                  window.location.hash = 'orders';
                                  window.dispatchEvent(new HashChangeEvent('hashchange'));
                                }
                              }}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                              title="Jump to Orders Management"
                            >
                              <ShoppingBag className="w-3.5 h-3.5 text-[#3C6CA8]" />
                            </button>

                            <button
                              onClick={() => openLightbox(v)}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition-colors cursor-pointer inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                              title="Inspect Receipt Proof"
                            >
                              <Eye className="w-3.5 h-3.5 shrink-0" />
                              <span className="whitespace-nowrap">View</span>
                            </button>

                            {isPending && (
                              <>
                                <button
                                  onClick={() => handleApprove(v)}
                                  disabled={isApproving}
                                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-extrabold text-[11px] inline-flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50 shadow-xs whitespace-nowrap shrink-0"
                                  title="Approve and mark order as Paid"
                                >
                                  {isApproving ? (
                                    <RefreshCw className="w-3 h-3 animate-spin shrink-0" />
                                  ) : (
                                    <Check className="w-3 h-3 stroke-[3] shrink-0" />
                                  )}
                                  <span className="whitespace-nowrap">Approve</span>
                                </button>

                                <button
                                  onClick={() => openRejectModal(v)}
                                  disabled={isApproving}
                                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-bold text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                                  title="Reject Receipt Proof"
                                >
                                  <X className="w-3 h-3 shrink-0" />
                                  <span className="whitespace-nowrap">Reject</span>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Order Breakdown Sub-Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/60 border-b border-slate-100">
                          <td colSpan={7} className="p-3 sm:px-6">
                            <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 space-y-2 shadow-xs">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                                  Ordered Line Items & Shipping
                                </span>
                                {orderInfo?.shipping_address && (
                                  <span className="text-[11px] text-slate-500 flex items-center gap-1 truncate max-w-md">
                                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                    {[orderInfo.shipping_address, orderInfo.shipping_city, orderInfo.shipping_state].filter(Boolean).join(', ')}
                                  </span>
                                )}
                              </div>

                              <div className="divide-y divide-slate-100">
                                {orderInfo?.order_items && orderInfo.order_items.length > 0 ? (
                                  orderInfo.order_items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center py-1.5 text-xs">
                                      <div className="min-w-0 pr-2">
                                        <p className="font-bold text-slate-800">
                                          {item.quantity}× {item.product_name}
                                        </p>
                                        {item.variation_name && (
                                          <span className="text-[10px] text-slate-400">{item.variation_name}</span>
                                        )}
                                      </div>
                                      <span className="font-mono font-bold text-slate-700 shrink-0">
                                        {formatPHP(item.total || item.price * item.quantity)}
                                      </span>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-xs text-slate-400 py-1">No item details recorded for this order.</p>
                                )}
                              </div>

                              {/* Rejection Note inside expanded row if exists */}
                              {isRejected && v.rejection_reason && (
                                <div className="mt-2 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                  <span><strong>Rejection Note:</strong> {v.rejection_reason}</span>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── High-Res Image Lightbox Modal ── */}
      {previewItem && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={closeLightbox}
        >
          <div
            className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-700/60 ring-1 ring-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Lightbox Header */}
            <div className="px-4 py-3.5 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white flex items-center justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                    Receipt Verification — Order #{previewItem.orders?.order_number || (previewItem.order_id ? String(previewItem.order_id).slice(0, 8) : 'REF')}
                  </h3>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300 mt-0.5 truncate pl-8">
                  <span className="font-semibold text-white">{previewItem.orders?.customer_name || 'Customer'}</span>
                  <span className="text-slate-500">•</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {formatPHP((previewItem.orders?.total_price || 0) + (previewItem.orders?.shipping_fee || 0))}
                  </span>
                </div>
              </div>

              {/* Lightbox Controls */}
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="hidden sm:flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/50">
                  <button
                    onClick={() => setZoomLevel(prev => Math.min(prev + 0.25, 3))}
                    className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-200 hover:text-white transition-colors cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <span className="text-[11px] font-mono text-slate-300 px-1 font-bold min-w-[40px] text-center">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    onClick={() => setZoomLevel(prev => Math.max(prev - 0.25, 0.5))}
                    className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-200 hover:text-white transition-colors cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setRotationDeg(prev => (prev + 90) % 360)}
                    className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-200 hover:text-white transition-colors cursor-pointer"
                    title="Rotate 90°"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                  {(zoomLevel !== 1 || rotationDeg !== 0) && (
                    <button
                      onClick={() => { setZoomLevel(1); setRotationDeg(0); }}
                      className="px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-[10px] font-bold transition-colors cursor-pointer"
                      title="Reset Zoom & Rotation"
                    >
                      Reset
                    </button>
                  )}
                </div>

                <a
                  href={previewItem.payment_proof_url}
                  download={`Receipt-${previewItem.orders?.order_number || previewItem.order_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                  title="Download / Open Full File"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  onClick={closeLightbox}
                  className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 transition-colors ml-1 cursor-pointer"
                  title="Close Modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Lightbox Canvas Area */}
            <div className="flex-1 bg-slate-950/90 flex items-center justify-center p-4 overflow-auto min-h-[380px] max-h-[62vh] relative select-none">
              {previewItem.payment_proof_url.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={previewItem.payment_proof_url}
                  className="w-full h-full min-h-[500px] rounded-xl bg-white shadow-2xl"
                  title="PDF Receipt Viewer"
                />
              ) : (
                <div
                  className="transition-transform duration-150 ease-out flex items-center justify-center max-w-full max-h-full"
                  style={{
                    transform: `scale(${zoomLevel}) rotate(${rotationDeg}deg)`,
                  }}
                >
                  <img
                    src={previewItem.payment_proof_url}
                    alt="Full Receipt"
                    className="max-h-[58vh] max-w-full object-contain rounded-xl shadow-2xl border border-slate-800 pointer-events-auto"
                  />
                </div>
              )}
            </div>

            {/* Lightbox Footer Actions */}
            <div className="p-3.5 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Status:</span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                  previewItem.status === 'pending'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : previewItem.status === 'approved'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    previewItem.status === 'pending' ? 'bg-amber-500 animate-pulse' : previewItem.status === 'approved' ? 'bg-emerald-500' : 'bg-rose-500'
                  }`} />
                  {previewItem.status}
                </span>

                {previewItem.orders?.payment_method_name && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                    {previewItem.orders.payment_method_name}
                  </span>
                )}
              </div>

              {previewItem.status === 'pending' ? (
                <div className="flex items-center gap-2.5 flex-nowrap shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const item = previewItem;
                      closeLightbox();
                      handleApprove(item);
                    }}
                    className="px-4.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-black inline-flex items-center justify-center gap-2 shadow-sm hover:shadow-emerald-600/20 transition-all cursor-pointer whitespace-nowrap flex-nowrap shrink-0"
                  >
                    <Check className="w-4 h-4 stroke-[3] shrink-0" />
                    <span className="whitespace-nowrap">Approve Receipt</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const item = previewItem;
                      closeLightbox();
                      openRejectModal(item);
                    }}
                    className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 rounded-xl text-xs sm:text-sm font-bold border border-rose-200 dark:border-rose-800 transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap flex-nowrap shrink-0"
                  >
                    <X className="w-4 h-4 shrink-0" />
                    <span className="whitespace-nowrap">Reject</span>
                  </button>
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic">
                  {previewItem.status === 'approved' ? '✓ Receipt verified and order set to Paid.' : '✕ Receipt proof was rejected.'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Reason Selector Modal ── */}
      {rejectModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8.5 h-8.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                  <XCircle className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Reject Payment Proof
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Order {formatOrderId({ id: rejectModalItem.order_id, order_number: rejectModalItem.orders?.order_number })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRejectModalItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Quick Rejection Reasons
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  'Blurry / Illegible Screenshot',
                  'Reference Number Mismatch',
                  'Incorrect / Partial Amount',
                  'Duplicate Proof Submission'
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setRejectionReason(reason)}
                    className={`p-2 rounded-xl text-left text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap truncate ${
                      rejectionReason === reason
                        ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Custom Rejection Feedback
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                className="w-full p-3 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none resize-none leading-relaxed text-slate-800 dark:text-white"
                placeholder="Explain why the proof was rejected..."
              />
              <p className="text-[10px] text-slate-400">
                This note will be recorded in the order audit log and sent via email notification to the customer.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRejectModalItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isRejecting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition-colors cursor-pointer disabled:opacity-50 shadow-sm whitespace-nowrap shrink-0 inline-flex items-center gap-1.5"
              >
                {isRejecting ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { InvoiceVerificationsManager };

