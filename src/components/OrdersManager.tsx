import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Package, CheckCircle, XCircle, Clock, Truck, AlertCircle, Search, RefreshCw, Eye, MessageCircle, Image as ImageIcon, Pencil, Save, X, Download, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useMenu } from '../hooks/useMenu';
import { fireToast } from './ToastNotification';
import {
  mirrorOrderUpdateDetails,
  mirrorOrderUpdateStatus,
  mirrorOrderUpdateTracking,
  mirrorProductAdjustStock,
  mirrorVariationAdjustStock,
} from '../lib/convexMirror';
import { trackOrderStatus, trackPaymentStatus, type OrderStatus } from '../utils/analytics';

function buildOrderEmailProps(order: any) {
  const fmt = (n: unknown) => Number(n ?? 0).toLocaleString('en-PH');
  const items: any[] = Array.isArray(order?.order_items) ? order.order_items : [];
  const itemsSummary = items
    .map((i: any) => {
      const name = i.variation_name ? `${i.product_name} — ${i.variation_name}` : i.product_name;
      return `${i.quantity} × ${name} — ₱${Number(i.total ?? 0).toLocaleString('en-PH')}`;
    })
    .join('\n');
  const subtotalNum = Number(order?.total_price ?? 0) + Number(order?.discount_applied ?? 0);
  const finalTotalNum = Number(order?.total_price ?? 0) + Number(order?.shipping_fee ?? 0);
  const contact = String(order?.contact_method || '');
  return {
    order_id: order?.id,
    order_number: order?.order_number ?? null,
    items_summary: itemsSummary,
    subtotal: fmt(subtotalNum),
    shipping_fee: fmt(order?.shipping_fee),
    discount: fmt(order?.discount_applied),
    promo_code: order?.promo_code || '',
    total_price: fmt(finalTotalNum),
    payment_method: order?.payment_method_name || '—',
    contact_method: contact ? contact.charAt(0).toUpperCase() + contact.slice(1) : '—',
    email: order?.customer_email ?? null,
    customer_name: order?.customer_name ?? null,
  };
}

async function moveOrderTelegramTopic(orderId: string, newStatus: string) {
  try {
    const { error } = await supabase.functions.invoke('telegram-move-order', {
      body: { order_id: orderId, new_status: newStatus, actor_name: 'Web Admin' },
    });
    if (error) console.warn('telegram-move-order failed', error);
  } catch (err) {
    console.warn('telegram-move-order threw', err);
  }
}

interface OrderItem {
  product_id: string;
  product_name: string;
  variation_id: string | null;
  variation_name: string | null;
  quantity: number;
  price: number;
  total: number;
  purity_percentage?: number;
}

interface Order {
  id: string;
  order_number: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: string;
  shipping_barangay: string | null;
  shipping_city: string;
  shipping_state: string;
  shipping_zip_code: string;
  shipping_country: string;
  shipping_location: string | null;
  shipping_fee: number | null;
  order_items: OrderItem[];
  total_price: number;
  payment_method_id: string | null;
  payment_method_name: string | null;
  payment_proof_url: string | null;
  paymongo_payment_id: string | null;
  paymongo_payment_method_used: string | null;
  contact_method: string | null;
  order_status: string;
  payment_status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  tracking_number: string | null;
  shipping_note: string | null;
  promo_code: string | null;
  promo_code_id: string | null;
  discount_applied: number | null;
}

interface OrdersManagerProps {
  onBack: () => void;
}

const OrdersManager: React.FC<OrdersManagerProps> = ({ onBack }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { refreshProducts } = useMenu();

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error loading orders:', error);
      fireToast('Failed to load orders. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadOrders();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleConfirmOrder = async (order: Order) => {
    if (!confirm(`Confirm order #${order.order_number || order.id.slice(0, 8)}? This will deduct stock from inventory.`)) {
      return;
    }

    try {
      setIsProcessing(true);

      // Deduct or replenish stock for each item to guarantee fulfillment
      for (const item of (order.order_items || [])) {
        if (item.variation_id) {
          const { data: variation } = await supabase
            .from('product_variations')
            .select('stock_quantity')
            .eq('id', item.variation_id)
            .maybeSingle();

          const currentStock = variation?.stock_quantity ?? 0;
          const newStock = Math.max(0, currentStock >= item.quantity ? currentStock - item.quantity : 10);
          await supabase
            .from('product_variations')
            .update({ stock_quantity: newStock })
            .eq('id', item.variation_id);
          mirrorVariationAdjustStock(item.variation_id, newStock);
        } else if (item.product_id) {
          const { data: product } = await supabase
            .from('products')
            .select('stock_quantity')
            .eq('id', item.product_id)
            .maybeSingle();

          const currentStock = product?.stock_quantity ?? 0;
          const newStock = Math.max(0, currentStock >= item.quantity ? currentStock - item.quantity : 10);
          await supabase
            .from('products')
            .update({ stock_quantity: newStock })
            .eq('id', item.product_id);
          mirrorProductAdjustStock(item.product_id, newStock);
        }
      }

      // Update order status
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          order_status: 'confirmed',
          payment_status: 'paid',
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (updateError) throw updateError;
      mirrorOrderUpdateStatus(order.id, { order_status: 'confirmed', payment_status: 'paid' });
      moveOrderTelegramTopic(order.id, 'confirmed');
      const emailProps = buildOrderEmailProps(order);
      trackOrderStatus('confirmed', emailProps);
      trackPaymentStatus('paid', { ...emailProps, payment_status: 'paid' });

      // Refresh orders and products
      await loadOrders();
      await refreshProducts();

      // Trigger custom event to refresh inventory sales data
      window.dispatchEvent(new CustomEvent('orderConfirmed'));

      fireToast('Order confirmed! Stock has been deducted from inventory. 🎉', 'success');
      setSelectedOrder(null);
    } catch (error) {
      console.error('Error confirming order:', error);
      fireToast(`Failed to confirm order: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      setIsProcessing(true);
      const { error } = await supabase
        .from('orders')
        .update({
          order_status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;
      mirrorOrderUpdateStatus(orderId, { order_status: newStatus });
      moveOrderTelegramTopic(orderId, newStatus);
      const targetOrder = orders.find(o => o.id === orderId);
      if (targetOrder) {
        trackOrderStatus(newStatus as OrderStatus, buildOrderEmailProps(targetOrder));
      }

      await loadOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, order_status: newStatus } : null);
      }
      fireToast(`Order status updated to ${newStatus.toUpperCase()}`, 'success');
    } catch (error) {
      console.error('Error updating order status:', error);
      fireToast('Failed to update order status. Please try again.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveTracking = async (orderId: string, trackingNumber: string, shippingNote: string) => {
    try {
      setIsProcessing(true);
      const { error } = await supabase
        .from('orders')
        .update({
          tracking_number: trackingNumber || null,
          shipping_note: shippingNote || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;
      mirrorOrderUpdateTracking(orderId, {
        tracking_number: trackingNumber || undefined,
        shipping_note: shippingNote || undefined,
      });

      // Update local state
      await loadOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => prev ? { 
          ...prev, 
          tracking_number: trackingNumber || null, 
          shipping_note: shippingNote || null 
        } : null);
      }

      fireToast('Tracking information saved successfully! 🚚', 'success');
    } catch (error) {
      console.error('Error saving tracking info:', error);
      fireToast('Failed to save tracking information.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveOrder = async (orderId: string, updates: Partial<Order>) => {
    try {
      setIsProcessing(true);
      const { error } = await supabase
        .from('orders')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;
      mirrorOrderUpdateDetails(orderId, updates);
      await loadOrders();

      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, ...updates } as Order : null);
      }

      fireToast('Order details updated successfully! ✨', 'success');
    } catch (error) {
      console.error('Error saving order:', error);
      fireToast('Failed to save order. Please try again.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Region classification helper
  const classifyRegion = (state: string): string => {
    const s = (state || '').toLowerCase().trim();
    const visayasProvinces = ['cebu', 'bohol', 'leyte', 'samar', 'eastern samar', 'western samar', 'northern samar', 'southern leyte', 'biliran', 'iloilo', 'capiz', 'aklan', 'antique', 'guimaras', 'negros occidental', 'negros oriental', 'siquijor'];
    const mindanaoProvinces = ['davao', 'davao del sur', 'davao del norte', 'davao oriental', 'davao occidental', 'davao de oro', 'zamboanga', 'zamboanga del sur', 'zamboanga del norte', 'zamboanga sibugay', 'bukidnon', 'misamis oriental', 'misamis occidental', 'lanao del norte', 'lanao del sur', 'cagayan de oro', 'general santos', 'cotabato', 'north cotabato', 'south cotabato', 'sultan kudarat', 'sarangani', 'agusan del norte', 'agusan del sur', 'surigao del norte', 'surigao del sur', 'dinagat islands', 'basilan', 'sulu', 'tawi-tawi', 'maguindanao', 'camiguin', 'compostela valley'];
    if (visayasProvinces.some(p => s.includes(p))) return 'Visayas';
    if (mindanaoProvinces.some(p => s.includes(p)) || s.includes('mindanao')) return 'Mindanao';
    return 'Luzon';
  };

  const formatDate = (dateStr: any) => {
    if (!dateStr) return { date: 'Recent', time: 'Just now' };
    const parsed = new Date(dateStr);
    if (isNaN(parsed.getTime())) return { date: 'Recent', time: 'Just now' };
    return {
      date: parsed.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: parsed.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const filteredOrders = useMemo(() => {
    let filtered = [...orders];

    // Guarantee sorting newest first
    filtered.sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeB - timeA;
    });

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(o => o.order_status === statusFilter);
    }

    // Filter by region
    if (regionFilter !== 'all') {
      filtered = filtered.filter(o => classifyRegion(o.shipping_state) === regionFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(o =>
        (o.customer_name || '').toLowerCase().includes(query) ||
        (o.customer_email || '').toLowerCase().includes(query) ||
        (o.customer_phone || '').includes(query) ||
        (o.id || '').toLowerCase().includes(query) ||
        (o.order_number?.toLowerCase().includes(query) ?? false)
      );
    }

    return filtered;
  }, [orders, statusFilter, regionFilter, searchQuery]);

  const statusCounts = useMemo(() => {
    return {
      all: orders.length,
      new: orders.filter(o => o.order_status === 'new').length,
      confirmed: orders.filter(o => o.order_status === 'confirmed').length,
      processing: orders.filter(o => o.order_status === 'processing').length,
      shipped: orders.filter(o => o.order_status === 'shipped').length,
      delivered: orders.filter(o => o.order_status === 'delivered').length,
      cancelled: orders.filter(o => o.order_status === 'cancelled').length,
    };
  }, [orders]);

  // Regional analytics
  const regionalStats = useMemo(() => {
    const regions = { Luzon: { count: 0, revenue: 0 }, Visayas: { count: 0, revenue: 0 }, Mindanao: { count: 0, revenue: 0 } };
    orders.forEach(o => {
      if (o.order_status === 'cancelled') return;
      const region = classifyRegion(o.shipping_state) as keyof typeof regions;
      regions[region].count += 1;
      regions[region].revenue += o.total_price + (o.shipping_fee || 0);
    });
    return regions;
  }, [orders]);

  // CSV Export
  const handleExportCSV = () => {
    const headers = ['Order #', 'Date', 'Customer', 'Email', 'Phone', 'City', 'State', 'Region', 'Items', 'Subtotal', 'Shipping', 'Discount', 'Total', 'Payment', 'Status', 'Payment Status', 'Tracking #'];
    const rows = filteredOrders.map(o => [
      o.order_number || o.id.slice(0, 8),
      formatDate(o.created_at).date,
      o.customer_name,
      o.customer_email,
      o.customer_phone,
      o.shipping_city,
      o.shipping_state,
      classifyRegion(o.shipping_state),
      (o.order_items || []).map(i => `${i.quantity}x ${i.product_name}${i.variation_name ? ` (${i.variation_name})` : ''}`).join('; '),
      (o.total_price || 0).toFixed(2),
      (o.shipping_fee || 0).toFixed(2),
      (o.discount_applied || 0).toFixed(2),
      ((o.total_price || 0) + (o.shipping_fee || 0)).toFixed(2),
      o.payment_method_name || '—',
      o.order_status,
      o.payment_status,
      o.tracking_number || ''
    ]);
    const csvContent = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `slimdose-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
      case 'confirmed': return 'bg-[#3C6CA8]/10 text-[#3C6CA8] border-[#3C6CA8]/30 dark:bg-[#3C6CA8]/20 dark:text-blue-300 dark:border-[#3C6CA8]/40';
      case 'processing': return 'bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800';
      case 'shipped': return 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800';
      case 'delivered': return 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
      case 'cancelled': return 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800';
      default: return 'bg-gray-50 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new': return <Clock className="w-3.5 h-3.5" />;
      case 'confirmed': return <CheckCircle className="w-3.5 h-3.5" />;
      case 'processing': return <Package className="w-3.5 h-3.5" />;
      case 'shipped': return <Truck className="w-3.5 h-3.5" />;
      case 'delivered': return <CheckCircle className="w-3.5 h-3.5" />;
      case 'cancelled': return <XCircle className="w-3.5 h-3.5" />;
      default: return <AlertCircle className="w-3.5 h-3.5" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-[#3C6CA8] rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-600 dark:text-slate-400 font-bold text-sm">Loading orders management... ✨</p>
        </div>
      </div>
    );
  }

  if (selectedOrder) {
    return (
      <OrderDetailsView
        order={selectedOrder}
        onBack={() => setSelectedOrder(null)}
        onConfirm={() => handleConfirmOrder(selectedOrder)}
        onUpdateStatus={handleUpdateOrderStatus}
        onSaveTracking={handleSaveTracking}
        onSaveOrder={handleSaveOrder}
        isProcessing={isProcessing}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 shadow-sm border-b border-gray-200 dark:border-slate-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex items-center justify-between h-14 md:h-16 gap-2">
            <div className="flex items-center space-x-2 md:space-x-4 min-w-0 flex-1">
              <button
                onClick={onBack}
                className="text-gray-700 dark:text-slate-300 hover:text-[#3C6CA8] dark:hover:text-blue-400 transition-colors flex items-center gap-1.5 group cursor-pointer font-bold text-xs sm:text-sm"
              >
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                <span>Dashboard</span>
              </button>
              <h1 className="text-sm md:text-base lg:text-xl font-extrabold text-gray-900 dark:text-white truncate">
                Orders Management
              </h1>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="bg-[#3C6CA8] hover:bg-[#315A8E] text-white px-3 md:px-4 py-2 rounded-xl font-bold text-xs md:text-sm shadow-sm hover:shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh Data</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 md:gap-3 mb-4 sm:mb-6">
          {[
            { id: 'all', label: 'All Orders', count: statusCounts.all, color: 'text-gray-900 dark:text-white' },
            { id: 'new', label: 'New', count: statusCounts.new, color: 'text-amber-600 dark:text-amber-400' },
            { id: 'confirmed', label: 'Confirmed', count: statusCounts.confirmed, color: 'text-[#3C6CA8] dark:text-blue-400' },
            { id: 'processing', label: 'Processing', count: statusCounts.processing, color: 'text-purple-600 dark:text-purple-400' },
            { id: 'shipped', label: 'Shipped', count: statusCounts.shipped, color: 'text-blue-600 dark:text-blue-400' },
            { id: 'delivered', label: 'Delivered', count: statusCounts.delivered, color: 'text-emerald-600 dark:text-emerald-400' },
            { id: 'cancelled', label: 'Cancelled', count: statusCounts.cancelled, color: 'text-rose-600 dark:text-rose-400' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={`bg-white dark:bg-slate-900 rounded-2xl shadow-xs p-3 border-2 transition-all cursor-pointer text-left ${
                statusFilter === st.id
                  ? 'border-[#3C6CA8] bg-blue-50/30 dark:bg-slate-800/80 shadow-md scale-102'
                  : 'border-gray-200 dark:border-slate-800 hover:border-[#3C6CA8]/50'
              }`}
            >
              <p className="text-[10px] md:text-xs text-gray-500 dark:text-slate-400 font-bold uppercase mb-0.5 truncate">{st.label}</p>
              <p className={`text-lg md:text-2xl font-black ${st.color}`}>{st.count}</p>
            </button>
          ))}
        </div>

        {/* Regional Distribution & Export Header */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs p-3.5 sm:p-5 mb-4 sm:mb-6 border border-gray-200 dark:border-slate-800">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
            <h3 className="text-xs sm:text-sm font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#3C6CA8]" />
              Regional Distribution
            </h3>
            <div className="flex items-center gap-2">
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white font-bold outline-none cursor-pointer"
              >
                <option value="all">All Regions</option>
                <option value="Luzon">Luzon</option>
                <option value="Visayas">Visayas</option>
                <option value="Mindanao">Mindanao</option>
              </select>
              <button
                onClick={handleExportCSV}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {['Luzon', 'Visayas', 'Mindanao'].map((region) => (
              <button
                key={region}
                onClick={() => setRegionFilter(regionFilter === region ? 'all' : region)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  regionFilter === region
                    ? 'bg-[#3C6CA8]/10 border-[#3C6CA8] font-bold'
                    : 'bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-800 hover:border-[#3C6CA8]/40'
                }`}
              >
                <p className="text-[10px] text-gray-400 font-bold uppercase">{region}</p>
                <p className="text-sm sm:text-base font-extrabold text-gray-900 dark:text-white">{regionalStats[region as keyof typeof regionalStats].count} Orders</p>
                <p className="text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                  ₱{regionalStats[region as keyof typeof regionalStats].revenue.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs p-3.5 sm:p-4 mb-4 sm:mb-6 border border-gray-200 dark:border-slate-800">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by customer name, email, phone, or order ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] outline-none transition-all"
            />
          </div>
        </div>

        {/* Modern Data Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
          {filteredOrders.length === 0 ? (
            <div className="p-8 sm:p-12 text-center">
              <Package className="w-10 h-10 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-gray-700 dark:text-slate-300 font-extrabold text-sm sm:text-base">No orders found</p>
              <p className="text-gray-400 text-xs mt-1">Try adjusting your search query or status filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[760px]">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-800/80 border-b border-gray-200 dark:border-slate-800 text-[11px] font-extrabold uppercase text-gray-400 tracking-wider">
                    <th className="py-3 px-4">Order ID & Status</th>
                    <th className="py-3 px-4">Customer Info</th>
                    <th className="py-3 px-4">Items & Quantity</th>
                    <th className="py-3 px-4">Total Amount</th>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-xs sm:text-sm">
                  {filteredOrders.map((order) => {
                    const totalItems = (order.order_items || []).reduce((sum, item) => sum + item.quantity, 0);
                    const finalTotal = (order.total_price || 0) + (order.shipping_fee || 0);
                    const dateInfo = formatDate(order.created_at);
                    const orderRef = order.order_number ? `#${order.order_number}` : `#ORD-${order.id.slice(0, 8).toUpperCase()}`;

                    return (
                      <tr key={order.id} className="hover:bg-blue-50/40 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <p className="font-mono font-extrabold text-gray-900 dark:text-white text-xs sm:text-sm">{orderRef}</p>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border inline-flex items-center gap-1 ${getStatusColor(order.order_status)}`}>
                                {getStatusIcon(order.order_status)}
                                <span>{order.order_status.toUpperCase()}</span>
                              </span>
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                                order.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              }`}>
                                {order.payment_status === 'paid' ? '✓ PAID' : 'PENDING'}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="min-w-0 max-w-[200px]">
                            <p className="font-extrabold text-gray-900 dark:text-white text-xs sm:text-sm truncate">{order.customer_name || 'Customer'}</p>
                            <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate">{order.customer_email || 'No email'}</p>
                            {order.customer_phone && <p className="text-[10px] text-gray-400 truncate">{order.customer_phone}</p>}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div>
                            <p className="font-extrabold text-gray-900 dark:text-white text-xs">{totalItems} item(s)</p>
                            <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate max-w-[180px]">
                              {(order.order_items || []).map(i => i.product_name).join(', ') || 'Peptide Product'}
                            </p>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div>
                            <p className="font-black text-[#3C6CA8] dark:text-blue-400 text-xs sm:text-sm">₱{finalTotal.toLocaleString('en-PH', { minimumFractionDigits: 0 })}</p>
                            {order.shipping_fee && order.shipping_fee > 0 ? (
                              <p className="text-[10px] text-gray-400">+ ₱{order.shipping_fee} shipping</p>
                            ) : null}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div>
                            <p className="font-bold text-gray-800 dark:text-slate-200 text-xs">{dateInfo.date}</p>
                            <p className="text-[10px] text-gray-400">{dateInfo.time}</p>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="px-3.5 py-1.5 bg-[#3C6CA8] hover:bg-[#315A8E] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 ml-auto cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Details</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Order Card Component
interface OrderCardProps {
  order: Order;
  onView: () => void;
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => React.ReactNode;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, onView, getStatusColor, getStatusIcon }) => {
  const totalItems = order.order_items.reduce((sum, item) => sum + item.quantity, 0);
  const finalTotal = order.total_price + (order.shipping_fee || 0);

  return (
    <div className="bg-white rounded-lg md:rounded-xl shadow-md hover:shadow-lg p-3 md:p-4 lg:p-6 border border-navy-700/30 hover:border-navy-900 transition-all">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 md:gap-3 mb-2 flex-wrap">
            <h3 className="font-bold text-gray-900 text-sm md:text-base lg:text-lg truncate">
              Order #{order.order_number || order.id.slice(0, 8).toUpperCase()}
            </h3>
            <span className={`px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-semibold border flex items-center gap-1 ${getStatusColor(order.order_status)}`}>
              {getStatusIcon(order.order_status)}
              <span className="hidden sm:inline">{order.order_status.charAt(0).toUpperCase() + order.order_status.slice(1)}</span>
              <span className="sm:hidden">{order.order_status.charAt(0).toUpperCase()}</span>
            </span>
            <span className={`px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-semibold ${order.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-gold-100 text-gold-700'
              }`}>
              {order.payment_status === 'paid'
                ? `✓ Paid${order.payment_method_name ? ` via ${order.payment_method_name}` : ''}`
                : 'Pending'}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 text-xs md:text-sm">
            <div className="min-w-0">
              <span className="text-gray-500 text-[10px] md:text-xs">Customer</span>
              <p className="font-semibold text-gray-900 truncate">{order.customer_name}</p>
              <p className="text-[10px] md:text-xs text-gray-500 truncate">{order.customer_email}</p>
            </div>
            <div>
              <span className="text-gray-500 text-[10px] md:text-xs">Items</span>
              <p className="font-semibold text-gray-900">{totalItems} item(s)</p>
              <p className="text-[10px] md:text-xs text-gray-500">{order.order_items.length} product(s)</p>
            </div>
            <div>
              <span className="text-gray-500 text-[10px] md:text-xs">Total</span>
              <p className="font-semibold text-gold-600">₱{finalTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
              {order.shipping_fee && order.shipping_fee > 0 && (
                <p className="text-[10px] md:text-xs text-gray-500">+ ₱{order.shipping_fee} shipping</p>
              )}
              {order.discount_applied && order.discount_applied > 0 && (
                <p className="text-[10px] md:text-xs text-green-600">
                  -₱{order.discount_applied.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  {order.promo_code ? ` (${order.promo_code})` : ' discount'}
                </p>
              )}
            </div>
            <div>
              <span className="text-gray-500 text-[10px] md:text-xs">Date</span>
              <p className="font-semibold text-gray-900">{new Date(order.created_at).toLocaleDateString()}</p>
              <p className="text-[10px] md:text-xs text-gray-500">{new Date(order.created_at).toLocaleTimeString()}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 md:min-w-[120px]">
          <button
            onClick={onView}
            className="px-3 md:px-4 py-1.5 md:py-2 bg-navy-900 hover:bg-navy-800 text-white rounded-lg transition-colors font-medium text-xs md:text-sm flex items-center justify-center gap-1 md:gap-2 shadow-md hover:shadow-lg border border-navy-900/20"
          >
            <Eye className="w-3 h-3 md:w-4 md:h-4" />
            <span className="hidden sm:inline">View Details</span>
            <span className="sm:hidden">View</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Order Details View Component
interface OrderDetailsViewProps {
  order: Order;
  onBack: () => void;
  onConfirm: () => void;
  onUpdateStatus: (orderId: string, status: string) => void;
  onSaveTracking: (orderId: string, trackingNumber: string, shippingNote: string) => void;
  onSaveOrder: (orderId: string, updates: Partial<Order>) => void;
  isProcessing: boolean;
}

const ORDER_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const OrderDetailsView: React.FC<OrderDetailsViewProps> = ({
  order,
  onBack,
  onConfirm,
  onUpdateStatus,
  onSaveTracking,
  onSaveOrder,
  isProcessing
}) => {
  const [trackingNumber, setTrackingNumber] = useState(order.tracking_number || '');
  const [shippingNote, setShippingNote] = useState(order.shipping_note || '');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    customer_name: order.customer_name,
    customer_email: order.customer_email,
    customer_phone: order.customer_phone,
    shipping_address: order.shipping_address,
    shipping_barangay: order.shipping_barangay || '',
    shipping_city: order.shipping_city,
    shipping_state: order.shipping_state,
    shipping_zip_code: order.shipping_zip_code,
    shipping_country: order.shipping_country || '',
    notes: order.notes || '',
  });

  // Update local state when order changes
  useEffect(() => {
    setTrackingNumber(order.tracking_number || '');
    setShippingNote(order.shipping_note || '');
    setEditForm({
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      customer_phone: order.customer_phone,
      shipping_address: order.shipping_address,
      shipping_barangay: order.shipping_barangay || '',
      shipping_city: order.shipping_city,
      shipping_state: order.shipping_state,
      shipping_zip_code: order.shipping_zip_code,
      shipping_country: order.shipping_country || '',
      notes: order.notes || '',
    });
    setIsEditing(false);
  }, [order]);

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === order.order_status) return;

    if (newStatus === 'confirmed' && order.order_status === 'new') {
      onConfirm();
      return;
    }

    if (newStatus === 'cancelled') {
      if (confirm('Are you sure you want to cancel this order?')) {
        onUpdateStatus(order.id, newStatus);
      }
      return;
    }

    onUpdateStatus(order.id, newStatus);
  };

  const handleSaveEdit = () => {
    const updates: Partial<Order> = {
      customer_name: editForm.customer_name,
      customer_email: editForm.customer_email,
      customer_phone: editForm.customer_phone,
      shipping_address: editForm.shipping_address,
      shipping_barangay: editForm.shipping_barangay || null,
      shipping_city: editForm.shipping_city,
      shipping_state: editForm.shipping_state,
      shipping_zip_code: editForm.shipping_zip_code,
      shipping_country: editForm.shipping_country,
      notes: editForm.notes || null,
    };
    onSaveOrder(order.id, updates);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditForm({
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      customer_phone: order.customer_phone,
      shipping_address: order.shipping_address,
      shipping_barangay: order.shipping_barangay || '',
      shipping_city: order.shipping_city,
      shipping_state: order.shipping_state,
      shipping_zip_code: order.shipping_zip_code,
      shipping_country: order.shipping_country || '',
      notes: order.notes || '',
    });
    setIsEditing(false);
  };
  const totalItems = order.order_items.reduce((sum, item) => sum + item.quantity, 0);
  const finalTotal = order.total_price + (order.shipping_fee || 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="bg-white dark:bg-slate-900 shadow-sm border-b border-gray-200 dark:border-slate-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
            <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
              <button
                onClick={onBack}
                className="text-gray-700 dark:text-slate-300 hover:text-[#3C6CA8] dark:hover:text-blue-400 transition-colors flex items-center gap-1.5 group cursor-pointer font-bold text-xs sm:text-sm"
              >
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                <span>Back to Orders</span>
              </button>
              <h1 className="text-xs sm:text-base lg:text-lg font-extrabold text-gray-900 dark:text-white truncate">
                Order #{order.order_number || order.id.slice(0, 8).toUpperCase()}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={handleCancelEdit}
                    className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-200 text-gray-700 rounded-xl transition-colors font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Cancel</span>
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={isProcessing}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors font-bold text-xs flex items-center gap-1 disabled:opacity-50 shadow-xs cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isProcessing ? 'Saving...' : 'Save'}</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-1.5 bg-[#3C6CA8] hover:bg-[#315A8E] text-white rounded-xl transition-colors font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit Order</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-2.5 sm:px-4 lg:px-6 py-3 sm:py-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-3.5 sm:p-6 border border-gray-200 dark:border-slate-800 space-y-3.5 sm:space-y-6">
          {/* Order Status */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Order Status</label>
              <select
                value={order.order_status}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={isProcessing}
                className={`w-full sm:w-auto px-3 py-1.5 rounded-xl text-xs font-extrabold border outline-none cursor-pointer transition-colors disabled:opacity-50 ${
                  order.order_status === 'new' ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300' :
                  order.order_status === 'confirmed' ? 'bg-[#3C6CA8]/10 text-[#3C6CA8] border-[#3C6CA8]/30 dark:bg-[#3C6CA8]/20 dark:text-blue-300' :
                  order.order_status === 'processing' ? 'bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300' :
                  order.order_status === 'shipped' ? 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300' :
                  order.order_status === 'delivered' ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300' :
                  'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300'
                }`}
              >
                {ORDER_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            {order.order_status === 'new' && (
              <button
                onClick={onConfirm}
                disabled={isProcessing}
                className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all font-extrabold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-xs cursor-pointer active:scale-95"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{isProcessing ? 'Processing...' : 'Confirm Order & Deduct Stock'}</span>
              </button>
            )}
          </div>

          {/* Customer Info */}
          <div>
            <h3 className="font-extrabold text-gray-900 dark:text-white mb-2 text-xs sm:text-sm">Customer Information</h3>
            {isEditing ? (
              <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-3 space-y-2.5 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-0.5">Name</label>
                  <input
                    type="text"
                    value={editForm.customer_name}
                    onChange={(e) => setEditForm({ ...editForm, customer_name: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-0.5">Email</label>
                  <input
                    type="email"
                    value={editForm.customer_email}
                    onChange={(e) => setEditForm({ ...editForm, customer_email: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-0.5">Phone</label>
                  <input
                    type="text"
                    value={editForm.customer_phone}
                    onChange={(e) => setEditForm({ ...editForm, customer_phone: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-3 space-y-1 text-xs text-gray-700 dark:text-slate-300">
                <p><span className="font-bold text-gray-400">Name:</span> <strong className="text-gray-900 dark:text-white">{order.customer_name}</strong></p>
                <p><span className="font-bold text-gray-400">Email:</span> {order.customer_email}</p>
                <p><span className="font-bold text-gray-400">Phone:</span> {order.customer_phone}</p>
                {order.contact_method && (
                  <p className="flex items-center gap-1.5">
                    <span className="font-bold text-gray-400">Contact Method:</span>
                    <span className="flex items-center gap-1 text-blue-500 font-bold"><MessageCircle className="w-3 h-3" /> Telegram</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Shipping Address */}
          <div>
            <h3 className="font-extrabold text-gray-900 dark:text-white mb-2 text-xs sm:text-sm">Shipping Address</h3>
            {isEditing ? (
              <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-3 space-y-2.5 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-0.5">Street Address</label>
                  <input
                    type="text"
                    value={editForm.shipping_address}
                    onChange={(e) => setEditForm({ ...editForm, shipping_address: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-0.5">City</label>
                    <input
                      type="text"
                      value={editForm.shipping_city}
                      onChange={(e) => setEditForm({ ...editForm, shipping_city: e.target.value })}
                      className="w-full px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-0.5">Province/State</label>
                    <input
                      type="text"
                      value={editForm.shipping_state}
                      onChange={(e) => setEditForm({ ...editForm, shipping_state: e.target.value })}
                      className="w-full px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-3 text-xs text-gray-700 dark:text-slate-300 space-y-0.5">
                <p className="font-semibold">{order.shipping_address}</p>
                {order.shipping_barangay && <p>Barangay: {order.shipping_barangay}</p>}
                <p>{order.shipping_city}, {order.shipping_state} {order.shipping_zip_code}</p>
                {order.shipping_location && (
                  <p className="mt-1"><span className="font-bold text-gray-400">Region:</span> <span className="font-extrabold text-[#3C6CA8]">{order.shipping_location}</span></p>
                )}
              </div>
            )}
          </div>

          {/* Shipping & Tracking Details (Editable) */}
          <div className="bg-blue-50/60 dark:bg-slate-800/80 rounded-xl p-3.5 sm:p-5 border border-blue-100 dark:border-slate-700 space-y-3">
            <h3 className="font-extrabold text-[#3C6CA8] dark:text-blue-300 flex items-center gap-1.5 text-xs sm:text-sm">
              <Truck className="w-4 h-4" />
              Shipping & Tracking Details
            </h3>
            <div className="space-y-2.5">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                  J&T Tracking Number
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="e.g., 78XXXX..."
                    className="flex-1 px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-xs outline-none"
                  />
                  {trackingNumber && (
                    <a
                      href={`https://www.jtexpress.ph/trajectoryQuery?bills=${trackingNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 rounded-xl hover:bg-gray-200 flex items-center justify-center"
                      title="Test Link"
                    >
                      <Truck className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                  Shipping Note (Optional)
                </label>
                <input
                  type="text"
                  value={shippingNote}
                  onChange={(e) => setShippingNote(e.target.value)}
                  placeholder="e.g., Shipped via J&T Express..."
                  className="w-full px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-xs outline-none"
                />
              </div>
              <button
                onClick={() => onSaveTracking(order.id, trackingNumber, shippingNote)}
                disabled={isProcessing}
                className="w-full sm:w-auto px-4 py-2 bg-[#3C6CA8] hover:bg-[#315A8E] text-white rounded-xl font-extrabold text-xs transition-all shadow-xs disabled:opacity-50 cursor-pointer active:scale-95"
              >
                {isProcessing ? 'Saving...' : 'Save Tracking Info'}
              </button>
            </div>
          </div>

          {/* Order Items */}
          <div>
            <h3 className="font-extrabold text-gray-900 dark:text-white mb-2 text-xs sm:text-sm">Order Items ({totalItems} items)</h3>
            <div className="space-y-1.5">
              {(order.order_items || []).map((item, index) => (
                <div key={index} className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-2.5 flex justify-between items-center text-xs">
                  <div className="min-w-0 pr-2">
                    <p className="font-extrabold text-gray-900 dark:text-white truncate">
                      {item.product_name} {item.variation_name ? `- ${item.variation_name}` : ''}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      Quantity: {item.quantity} × ₱{item.price.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                    </p>
                  </div>
                  <p className="font-black text-gray-900 dark:text-white text-xs shrink-0">
                    ₱{item.total.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Proof */}
          {order.payment_proof_url && (
            <div>
              <h3 className="font-extrabold text-gray-900 dark:text-white mb-2 text-xs sm:text-sm flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4" />
                Payment Proof
              </h3>
              <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-3">
                <img
                  src={order.payment_proof_url}
                  alt="Payment proof"
                  className="max-w-full max-h-64 mx-auto object-contain rounded-xl border border-gray-200 dark:border-slate-700"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = `
                      <div class="text-rose-600 p-3 text-center text-xs font-bold">
                        <p>⚠️ Payment proof image failed to load</p>
                        <p class="text-[10px] text-gray-400 mt-1 font-normal break-all">URL: ${order.payment_proof_url}</p>
                      </div>
                    `;
                  }}
                />
              </div>
            </div>
          )}

          {/* Payment Info */}
          <div>
            <h3 className="font-extrabold text-gray-900 dark:text-white mb-2 text-xs sm:text-sm">Payment Information</h3>
            <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-3 space-y-1 text-xs text-gray-700 dark:text-slate-300">
              <p>
                <span className="font-bold text-gray-400">Method:</span> <strong className="text-gray-900 dark:text-white">{order.payment_method_name || 'N/A'}</strong>
              </p>
              <p className="flex items-center gap-1.5"><span className="font-bold text-gray-400">Status:</span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                  order.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                }`}>
                  {order.payment_status === 'paid' ? 'PAID' : 'PENDING'}
                </span>
              </p>
            </div>
          </div>

          {/* Order Summary */}
          <div className="border-t border-gray-100 dark:border-slate-800 pt-3">
            <div className="space-y-1.5 text-xs text-gray-600 dark:text-slate-400 font-medium">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-extrabold text-gray-900 dark:text-white">₱{(order.total_price || 0).toLocaleString('en-PH', { minimumFractionDigits: 0 })}</span>
              </div>
              {order.shipping_fee && order.shipping_fee > 0 ? (
                <div className="flex justify-between">
                  <span>Shipping Fee</span>
                  <span className="font-extrabold text-gray-900 dark:text-white">₱{order.shipping_fee.toLocaleString('en-PH', { minimumFractionDigits: 0 })}</span>
                </div>
              ) : null}
              <div className="flex justify-between text-sm sm:text-base font-black text-gray-900 dark:text-white border-t border-gray-100 dark:border-slate-800 pt-2">
                <span>Total</span>
                <span className="text-[#3C6CA8] dark:text-blue-400">₱{finalTotal.toLocaleString('en-PH', { minimumFractionDigits: 0 })}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {(order.notes || isEditing) && (
            <div>
              <h3 className="font-extrabold text-gray-900 dark:text-white mb-2 text-xs sm:text-sm">Notes</h3>
              {isEditing ? (
                <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-3">
                  <textarea
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    placeholder="Add notes..."
                    rows={3}
                    className="w-full px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none text-xs"
                  />
                </div>
              ) : (
                <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-3">
                  <p className="text-gray-700 dark:text-slate-300 text-xs">{order.notes}</p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default OrdersManager;
