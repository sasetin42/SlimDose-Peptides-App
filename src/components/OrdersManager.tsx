import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Package,
  CheckCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Truck,
  AlertCircle,
  Search,
  RefreshCw,
  Eye,
  MessageCircle,
  Image as ImageIcon,
  Pencil,
  Save,
  X,
  Download,
  MapPin,
  Printer,
  Copy,
  Check,
  ExternalLink,
  CreditCard,
  User,
  Mail,
  Phone,
  FileText,
  Sparkles,
  Calendar,
  ArrowUpDown,
  Flame,
  Tag,
  ShieldCheck,
  MoreVertical,
  Trash2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useMenuContext } from '../contexts/MenuContext';
import { fireToast } from './ToastNotification';
import {
  mirrorOrderUpdateDetails,
  mirrorOrderUpdateStatus,
  mirrorOrderUpdateTracking,
  mirrorProductAdjustStock,
  mirrorVariationAdjustStock,
} from '../lib/convexMirror';
import { trackOrderStatus, trackPaymentStatus, type OrderStatus } from '../utils/analytics';
import { formatOrderId, buildOrderIdMap } from '../utils/orderUtils';
import { liveScrapedOrders } from '../data/liveScrapedOrders';
import { dispatchOrderEmail } from '../services/emailService';

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
  // Telegram topic moves managed directly or via webhook
  console.debug(`Order ${orderId} moved to status: ${newStatus}`);
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

const ORDER_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

type SortMode = 'new_priority' | 'newest_first' | 'oldest_first' | 'amount_high' | 'amount_low' | 'customer_az';

const OrdersManager: React.FC<OrdersManagerProps> = ({ onBack }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [sortMode, setSortMode] = useState<SortMode>('new_priority');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(new Set());
  const [batchActionInProgress, setBatchActionInProgress] = useState<string | null>(null);
  const [activeDropdownOrderId, setActiveDropdownOrderId] = useState<string | null>(null);
  const { refreshProducts } = useMenuContext();
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  useEffect(() => {
    loadOrders();

    // Supabase Realtime Live Sync for Orders
    const ordersChannel = supabase
      .channel('orders_realtime_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new as Order;
            setOrders(prev => {
              if (prev.some(o => o.id === newOrder.id)) return prev;
              return [newOrder, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedOrder = payload.new as Order;
            setOrders(prev => prev.map(o => o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as any)?.id;
            if (deletedId) {
              setOrders(prev => prev.filter(o => o.id !== deletedId));
            }
          }
        }
      )
      .subscribe();

    const handleOrderEvents = () => {
      loadOrders();
    };

    window.addEventListener('orderCreated', handleOrderEvents);
    window.addEventListener('orderConfirmed', handleOrderEvents);
    window.addEventListener('orderUpdated', handleOrderEvents);

    return () => {
      supabase.removeChannel(ordersChannel);
      window.removeEventListener('orderCreated', handleOrderEvents);
      window.removeEventListener('orderConfirmed', handleOrderEvents);
      window.removeEventListener('orderUpdated', handleOrderEvents);
    };
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.order-action-dropdown-container')) {
        setActiveDropdownOrderId(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveDropdownOrderId(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Notice loading orders from database, using live scraped orders:', error);
      }
      let loaded = (data && data.length > 0) ? data : (liveScrapedOrders || []);
      // Filter out specifically removed test order (SLD-000959 / SDP0959 / admin@gmail.com) and any user deleted orders
      loaded = loaded.filter((o: any) => {
        const num = String(o.order_number || o.id || '').toUpperCase();
        const email = String(o.customer_email || '').toLowerCase().trim();
        const phone = String(o.customer_phone || '').replace(/[^0-9]/g, '');
        if (num === 'SDP0959' || num === 'SLD-000959' || (email === 'admin@gmail.com' && phone === '639773590258')) {
          return false;
        }
        return true;
      });

      try {
        const deletedRaw = localStorage.getItem('slimdose_deleted_orders');
        if (deletedRaw) {
          const deletedIds = new Set(JSON.parse(deletedRaw));
          loaded = loaded.filter((o: any) => !deletedIds.has(o.id) && !deletedIds.has(o.order_number));
        }
      } catch {}
      setOrders(loaded);
    } catch (error) {
      console.warn('Error loading orders, falling back to scraped orders cache:', error);
      let fallback = liveScrapedOrders || [];
      fallback = fallback.filter((o: any) => {
        const num = String(o.order_number || o.id || '').toUpperCase();
        const email = String(o.customer_email || '').toLowerCase().trim();
        const phone = String(o.customer_phone || '').replace(/[^0-9]/g, '');
        if (num === 'SDP0959' || num === 'SLD-000959' || (email === 'admin@gmail.com' && phone === '639773590258')) {
          return false;
        }
        return true;
      });
      try {
        const deletedRaw = localStorage.getItem('slimdose_deleted_orders');
        if (deletedRaw) {
          const deletedIds = new Set(JSON.parse(deletedRaw));
          fallback = fallback.filter((o: any) => !deletedIds.has(o.id) && !deletedIds.has(o.order_number));
        }
      } catch {}
      setOrders(fallback);
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
    const orderRef = orderIdMap.get(order.id) || formatOrderId(order);
    if (!confirm(`Confirm order ${orderRef}? This will deduct stock from inventory.`)) {
      return;
    }

    try {
      setIsProcessing(true);

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

      await loadOrders();
      await refreshProducts();

      window.dispatchEvent(new CustomEvent('orderConfirmed'));
      fireToast('Order confirmed! Stock has been deducted from inventory. 🎉', 'success');
      setSelectedOrder(prev => prev && prev.id === order.id ? { ...prev, order_status: 'confirmed', payment_status: 'paid' } : null);
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

        // Dispatch dynamic transactional template if applicable
        if (targetOrder.customer_email) {
          const templateKeyMap: Record<string, any> = {
            processing: 'order-processing',
            shipped: 'order-shipped',
            delivered: 'order-delivered',
            cancelled: 'order-cancelled',
          };
          const tKey = templateKeyMap[newStatus.toLowerCase()];
          if (tKey) {
            dispatchOrderEmail(tKey, {
              orderId: targetOrder.id,
              orderNumber: targetOrder.order_number || targetOrder.id,
              customerName: targetOrder.customer_name || 'Valued Client',
              customerEmail: targetOrder.customer_email,
              customerPhone: targetOrder.customer_phone,
              shippingAddress: targetOrder.shipping_address,
              shippingLocation: targetOrder.shipping_location,
              shippingFee: targetOrder.shipping_fee,
              subtotal: targetOrder.subtotal,
              discountApplied: targetOrder.discount_applied,
              promoCode: targetOrder.promo_code,
              totalPrice: targetOrder.total_price,
              paymentMethodName: targetOrder.payment_method_name,
              trackingNumber: targetOrder.tracking_number,
              trackingCourier: targetOrder.tracking_courier || 'LBC Express',
              status: newStatus.toUpperCase(),
            }).catch(e => console.warn('Order status email dispatch note:', e));
          }
        }
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

  const handleUpdatePaymentStatus = async (orderId: string, newPaymentStatus: string) => {
    try {
      setIsProcessing(true);
      const { error } = await supabase
        .from('orders')
        .update({
          payment_status: newPaymentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;
      await loadOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, payment_status: newPaymentStatus } : null);
      }
      fireToast(`Payment status updated to ${newPaymentStatus.toUpperCase()}!`, 'success');
    } catch (error) {
      console.error('Error updating payment status:', error);
      fireToast('Failed to update payment status.', 'error');
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

  const handleDeleteOrder = async (order: Order) => {
    const orderRef = orderIdMap.get(order.id) || formatOrderId(order);
    if (!confirm(`Are you sure you want to permanently delete order ${orderRef} (${order.customer_name})? This action cannot be undone.`)) {
      return;
    }

    try {
      setIsProcessing(true);
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', order.id);

      if (error) {
        console.warn('Database delete warning:', error);
      }

      // Record in local cache of deleted IDs to ensure persistent deletion across fallbacks
      try {
        const deletedRaw = localStorage.getItem('slimdose_deleted_orders') || '[]';
        const deletedList: string[] = JSON.parse(deletedRaw);
        if (!deletedList.includes(order.id)) {
          deletedList.push(order.id);
          localStorage.setItem('slimdose_deleted_orders', JSON.stringify(deletedList));
        }
      } catch {}

      setOrders(prev => prev.filter(o => o.id !== order.id));
      if (selectedOrder && selectedOrder.id === order.id) {
        setSelectedOrder(null);
      }
      setSelectedOrderIds(prev => {
        const next = new Set(prev);
        next.delete(order.id);
        return next;
      });

      fireToast(`Order ${orderRef} deleted successfully! 🗑️`, 'success');
    } catch (error: any) {
      console.error('Error deleting order:', error);
      fireToast(`Failed to delete order: ${error.message || 'Unknown error'}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };


  const handleCopyOrderId = (orderRef: string) => {
    navigator.clipboard.writeText(orderRef.replace('#', ''));
    setCopiedId(orderRef);
    fireToast(`Copied ${orderRef} to clipboard!`, 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleSelectOrder = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectByStatus = (status: string) => {
    const matching = filteredOrders.filter(o => o.order_status === status).map(o => o.id);
    setSelectedOrderIds(new Set(matching));
    fireToast(`Selected ${matching.length} ${status.toUpperCase()} orders`, 'info');
  };

  const handleClearSelection = () => {
    setSelectedOrderIds(new Set());
  };

  const handleBatchUpdateStatus = async (newStatus: string) => {
    if (selectedOrderIds.size === 0) return;

    const count = selectedOrderIds.size;
    if (newStatus === 'cancelled') {
      if (!confirm(`⚠️ Are you sure you want to CANCEL ${count} selected order(s)? This will mark them as cancelled.`)) {
        return;
      }
    } else {
      if (!confirm(`Update status of ${count} selected order(s) to ${newStatus.toUpperCase()}?`)) {
        return;
      }
    }

    try {
      setBatchActionInProgress(newStatus);
      const idsArray = Array.from(selectedOrderIds);

      // 1. Update in Supabase
      const { error } = await supabase
        .from('orders')
        .update({
          order_status: newStatus,
          updated_at: new Date().toISOString()
        })
        .in('id', idsArray);

      if (error) throw error;

      // 2. Mirror and notify for each order
      for (const id of idsArray) {
        mirrorOrderUpdateStatus(id, { order_status: newStatus });
        moveOrderTelegramTopic(id, newStatus);
        const o = orders.find(item => item.id === id);
        if (o) {
          trackOrderStatus(newStatus as OrderStatus, buildOrderEmailProps(o));
        }
      }

      // 3. If batch confirming, also deduct stocks
      if (newStatus === 'confirmed') {
        for (const id of idsArray) {
          const o = orders.find(item => item.id === id);
          if (o && Array.isArray(o.order_items)) {
            for (const item of o.order_items) {
              if (item.variation_id) {
                mirrorVariationAdjustStock(item.variation_id, -item.quantity);
              } else if (item.product_id) {
                mirrorProductAdjustStock(item.product_id, -item.quantity);
              }
            }
          }
        }
        await refreshProducts();
        window.dispatchEvent(new CustomEvent('orderConfirmed'));
      }

      await loadOrders();
      setSelectedOrderIds(new Set());
      fireToast(`Successfully updated ${count} orders to ${newStatus.toUpperCase()}! 🚀`, 'success');
    } catch (err) {
      console.error('Error in batch update:', err);
      fireToast(`Failed to batch update orders: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    } finally {
      setBatchActionInProgress(null);
    }
  };

  const handleBatchUpdatePaymentStatus = async (newPaymentStatus: string) => {
    if (selectedOrderIds.size === 0) return;
    const count = selectedOrderIds.size;
    if (!confirm(`Mark payment status of ${count} selected order(s) as ${newPaymentStatus.toUpperCase()}?`)) {
      return;
    }

    try {
      setBatchActionInProgress(newPaymentStatus);
      const idsArray = Array.from(selectedOrderIds);

      const { error } = await supabase
        .from('orders')
        .update({
          payment_status: newPaymentStatus,
          updated_at: new Date().toISOString()
        })
        .in('id', idsArray);

      if (error) throw error;

      for (const id of idsArray) {
        mirrorOrderUpdateStatus(id, { payment_status: newPaymentStatus });
        const o = orders.find(item => item.id === id);
        if (o) {
          trackPaymentStatus(newPaymentStatus, { ...buildOrderEmailProps(o), payment_status: newPaymentStatus });
        }
      }

      await loadOrders();
      setSelectedOrderIds(new Set());
      fireToast(`Successfully marked ${count} orders as ${newPaymentStatus.toUpperCase()}! 💳`, 'success');
    } catch (err) {
      console.error('Error in batch payment update:', err);
      fireToast('Failed to update payment status for selected orders.', 'error');
    } finally {
      setBatchActionInProgress(null);
    }
  };

  const handleBatchDelete = async () => {
    const idsArray = Array.from(selectedOrderIds);
    const count = idsArray.length;
    if (count === 0) return;

    if (!confirm(`Are you sure you want to permanently delete ${count} selected order(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      setBatchActionInProgress('delete');
      const { error } = await supabase
        .from('orders')
        .delete()
        .in('id', idsArray);

      if (error) {
        console.warn('Batch database delete error:', error);
      }

      // Record in local cache of deleted IDs
      try {
        const deletedRaw = localStorage.getItem('slimdose_deleted_orders') || '[]';
        const deletedList: string[] = JSON.parse(deletedRaw);
        for (const id of idsArray) {
          if (!deletedList.includes(id)) deletedList.push(id);
        }
        localStorage.setItem('slimdose_deleted_orders', JSON.stringify(deletedList));
      } catch {}

      setOrders(prev => prev.filter(o => !selectedOrderIds.has(o.id)));
      setSelectedOrderIds(new Set());
      fireToast(`Successfully deleted ${count} orders! 🗑️`, 'success');
    } catch (err: any) {
      console.error('Error in batch delete:', err);
      fireToast('Failed to delete selected orders.', 'error');
    } finally {
      setBatchActionInProgress(null);
    }
  };


  const classifyRegion = (state: string): string => {
    const s = (state || '').toLowerCase().trim();
    const visayasProvinces = ['cebu', 'bohol', 'leyte', 'samar', 'eastern samar', 'western samar', 'northern samar', 'southern leyte', 'biliran', 'iloilo', 'capiz', 'aklan', 'antique', 'guimaras', 'negros occidental', 'negros oriental', 'siquijor'];
    const mindanaoProvinces = ['davao', 'davao del sur', 'davao del norte', 'davao oriental', 'davao occidental', 'davao de oro', 'zamboanga', 'zamboanga del sur', 'zamboanga del norte', 'zamboanga sibugay', 'bukidnon', 'misamis oriental', 'misamis occidental', 'lanao del norte', 'lanao del sur', 'cagayan de oro', 'general santos', 'cotabato', 'north cotabato', 'south cotabato', 'sultan kudarat', 'sarangani', 'agusan del norte', 'agusan del sur', 'surigao del norte', 'surigao del sur', 'dinagat islands', 'basilan', 'sulu', 'tawi-tawi', 'maguindanao', 'camiguin', 'compostela valley'];
    if (visayasProvinces.some(p => s.includes(p))) return 'Visayas';
    if (mindanaoProvinces.some(p => s.includes(p)) || s.includes('mindanao')) return 'Mindanao';
    return 'Luzon';
  };

  // Realtime & Live Date & Time formatting helper - Exact & Real data
  const parseOrderDate = (orderOrDate: any): Date => {
    if (!orderOrDate) return new Date();

    // If string or number passed directly
    if (typeof orderOrDate === 'string' || typeof orderOrDate === 'number') {
      let str = String(orderOrDate).trim();
      if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}/.test(str)) {
        str = str.replace(' ', 'T');
      }
      const d = new Date(str);
      if (!isNaN(d.getTime())) return d;
    }

    // If order object passed
    if (typeof orderOrDate === 'object') {
      const candidates = [
        orderOrDate.created_at,
        orderOrDate.updated_at,
        orderOrDate.order_date,
        orderOrDate.createdAt,
        orderOrDate.inserted_at,
        orderOrDate.date,
        orderOrDate.timestamp
      ];

      for (const val of candidates) {
        if (val) {
          let str = String(val).trim();
          if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}/.test(str)) {
            str = str.replace(' ', 'T');
          }
          const d = new Date(str);
          if (!isNaN(d.getTime())) return d;
        }
      }
    }

    return new Date();
  };

  const formatDateDetails = (orderOrDate: any) => {
    const parsed = parseOrderDate(orderOrDate);

    const isToday = new Date().toDateString() === parsed.toDateString();
    const dateFormatted = parsed.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    const timeFormatted = parsed.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    const dayName = parsed.toLocaleDateString('en-US', { weekday: 'short' });

    return {
      date: isToday ? `Today, ${parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : dateFormatted,
      fullDate: dateFormatted,
      time: timeFormatted,
      day: dayName,
      hasDate: true
    };
  };

  const orderIdMap = useMemo(() => {
    return buildOrderIdMap(orders);
  }, [orders]);

  const filteredOrders = useMemo(() => {
    let filtered = [...orders];

    // Search query filtering
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(o => {
        const orderRefStr = (orderIdMap.get(o.id) || formatOrderId(o)).toLowerCase();
        return (
          (o.customer_name || '').toLowerCase().includes(query) ||
          (o.customer_email || '').toLowerCase().includes(query) ||
          (o.customer_phone || '').includes(query) ||
          (o.id || '').toLowerCase().includes(query) ||
          orderRefStr.includes(query) ||
          (o.order_number?.toLowerCase().includes(query) ?? false) ||
          (o.tracking_number?.toLowerCase().includes(query) ?? false) ||
          (o.payment_method_name?.toLowerCase().includes(query) ?? false)
        );
      });
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(o => o.order_status === statusFilter);
    }

    // Filter by region
    if (regionFilter !== 'all') {
      filtered = filtered.filter(o => classifyRegion(o.shipping_state) === regionFilter);
    }

    // Multi-criteria sorting
    filtered.sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      const totalA = (a.total_price || 0) + (a.shipping_fee || 0);
      const totalB = (b.total_price || 0) + (b.shipping_fee || 0);

      switch (sortMode) {
        case 'new_priority': {
          // Put 'new' status first, then newest timestamp
          const isNewA = a.order_status === 'new' ? 1 : 0;
          const isNewB = b.order_status === 'new' ? 1 : 0;
          if (isNewA !== isNewB) return isNewB - isNewA;
          return timeB - timeA;
        }
        case 'newest_first':
          return timeB - timeA;
        case 'oldest_first':
          return timeA - timeB;
        case 'amount_high':
          return totalB - totalA;
        case 'amount_low':
          return totalA - totalB;
        case 'customer_az':
          return (a.customer_name || '').localeCompare(b.customer_name || '');
        default:
          return timeB - timeA;
      }
    });

    return filtered;
  }, [orders, statusFilter, regionFilter, searchQuery, sortMode]);

  // Reset to page 1 when filter parameters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, regionFilter, sortMode, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const paginatedOrders = useMemo(() => {
    if (pageSize >= 9999) return filteredOrders;
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

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

  const isAllSelected = useMemo(() => {
    return filteredOrders.length > 0 && filteredOrders.every(o => selectedOrderIds.has(o.id));
  }, [filteredOrders, selectedOrderIds]);

  const isSomeSelected = useMemo(() => {
    return filteredOrders.some(o => selectedOrderIds.has(o.id)) && !isAllSelected;
  }, [filteredOrders, selectedOrderIds, isAllSelected]);

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(filteredOrders.map(o => o.id)));
    }
  };

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

  const handleExportCSV = () => {
    const headers = ['Order #', 'Date', 'Time', 'Customer', 'Email', 'Phone', 'City', 'State', 'Region', 'Items', 'Subtotal', 'Shipping', 'Discount', 'Total', 'Payment', 'Status', 'Payment Status', 'Tracking #'];
    const rows = filteredOrders.map(o => {
      const dt = formatDateDetails(o);
      return [
        o.order_number || (o.id ? String(o.id).slice(0, 8) : 'ORD'),
        dt.fullDate,
        dt.time,
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
      ];
    });
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
      case 'new': return 'bg-amber-50 text-amber-800 border-amber-300';
      case 'confirmed': return 'bg-blue-50 text-[#3C6CA8] border-blue-200';
      case 'processing': return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'shipped': return 'bg-indigo-50 text-indigo-800 border-indigo-200';
      case 'delivered': return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'cancelled': return 'bg-rose-50 text-rose-800 border-rose-200';
      default: return 'bg-gray-50 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new': return <Clock className="w-3.5 h-3.5 text-amber-600" />;
      case 'confirmed': return <CheckCircle className="w-3.5 h-3.5 text-blue-600" />;
      case 'processing': return <Package className="w-3.5 h-3.5 text-purple-600" />;
      case 'shipped': return <Truck className="w-3.5 h-3.5 text-indigo-600" />;
      case 'delivered': return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
      case 'cancelled': return <XCircle className="w-3.5 h-3.5 text-rose-600" />;
      default: return <AlertCircle className="w-3.5 h-3.5" />;
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center bg-white rounded-2xl border border-slate-200/80 w-full max-w-[1720px] mx-auto">
        <div className="w-8 h-8 border-3 border-slate-200 border-t-[#3C6CA8] rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-600 font-bold text-sm">Loading Orders Management...</p>
      </div>
    );
  }

  if (selectedOrder) {
    return (
      <OrderDetailsView
        order={selectedOrder}
        onBack={() => setSelectedOrder(null)}
        onConfirm={() => handleConfirmOrder(selectedOrder)}
        onDelete={handleDeleteOrder}
        onUpdateStatus={handleUpdateOrderStatus}
        onUpdatePaymentStatus={handleUpdatePaymentStatus}
        onSaveTracking={handleSaveTracking}
        onSaveOrder={handleSaveOrder}
        isProcessing={isProcessing}
      />
    );
  }

  return (
    <div className="w-full max-w-[1920px] mx-auto px-1.5 sm:px-3 md:px-4 py-2 sm:py-3 space-y-3 sm:space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-600 cursor-pointer"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Orders Management
              </h2>
              {statusCounts.new > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 shadow-xs">
                  <Flame className="w-3.5 h-3.5 text-amber-600 animate-bounce" />
                  <span>{statusCounts.new} New Unconfirmed Orders</span>
                </span>
              )}
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Live orders overview with instant status confirmation, carrier tracking, and full date details
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold px-3 py-2 rounded-xl transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span> CSV
          </button>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold px-3.5 py-2 rounded-xl shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 sm:gap-2">
        {[
          { id: 'all', label: 'All Orders', count: statusCounts.all, color: 'text-slate-900' },
          { id: 'new', label: 'New Orders', count: statusCounts.new, color: 'text-amber-600', highlight: statusCounts.new > 0 },
          { id: 'confirmed', label: 'Confirmed', count: statusCounts.confirmed, color: 'text-blue-600' },
          { id: 'processing', label: 'Processing', count: statusCounts.processing, color: 'text-purple-600' },
          { id: 'shipped', label: 'Shipped', count: statusCounts.shipped, color: 'text-indigo-600' },
          { id: 'delivered', label: 'Delivered', count: statusCounts.delivered, color: 'text-emerald-600' },
          { id: 'cancelled', label: 'Cancelled', count: statusCounts.cancelled, color: 'text-rose-600' },
        ].map((st) => (
          <button
            key={st.id}
            onClick={() => setStatusFilter(st.id)}
            className={`bg-white rounded-xl p-2.5 sm:p-3 border transition-all cursor-pointer text-left relative overflow-hidden ${
              statusFilter === st.id
                ? 'border-slate-900 bg-slate-50/80 shadow-xs font-bold'
                : st.highlight
                  ? 'border-amber-300 bg-amber-50/30 hover:border-amber-400'
                  : 'border-slate-200/80 hover:border-slate-300'
            }`}
          >
            {st.highlight && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            )}
            <p className="text-[10px] text-slate-500 font-semibold uppercase truncate">{st.label}</p>
            <p className={`text-base sm:text-lg font-black mt-0.5 ${st.color}`}>{st.count}</p>
          </button>
        ))}
      </div>

      {/* Search, Sort & Region Toolbar */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-3 sm:p-3.5 space-y-2.5">
        <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
          {/* Search box */}
          <div className="relative flex-1 max-w-xl">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input id="ordersmanager-search-by-customer-phone-email-tr" name="search_by_customer_phone_email_tr"
              type="text"
              placeholder="Search by customer, phone, email, tracking, payment, order ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#3C6CA8] focus:border-transparent transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="text-slate-500 hidden sm:inline">Sort:</span>
              <select id="ordersmanager-input-2" name="input_2" value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                className="bg-transparent text-slate-900 font-bold outline-hidden cursor-pointer"
              >
                <option value="new_priority">🔥 New Orders First (Priority)</option>
                <option value="newest_first">📅 Newest Date First</option>
                <option value="oldest_first">📅 Oldest Date First</option>
                <option value="amount_high">💰 Highest Amount First</option>
                <option value="amount_low">💰 Lowest Amount First</option>
                <option value="customer_az">👤 Customer Name (A-Z)</option>
              </select>
            </div>

            {/* Region Filter */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-medium text-slate-600">
              <button
                onClick={() => setRegionFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-all ${regionFilter === 'all' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'}`}
              >
                All Regions
              </button>
              {['Luzon', 'Visayas', 'Mindanao'].map((r) => (
                <button
                  key={r}
                  onClick={() => setRegionFilter(r)}
                  className={`px-2.5 py-1 rounded-lg transition-all ${regionFilter === r ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'}`}
                >
                  {r} ({regionalStats[r as keyof typeof regionalStats].count})
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Batch Selection Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-500 text-[11px] uppercase tracking-wider">Quick Select:</span>
            <button
              onClick={handleToggleSelectAll}
              className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                isAllSelected
                  ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {isAllSelected ? '✓ Deselect All' : `Select All (${filteredOrders.length})`}
            </button>
            {statusCounts.new > 0 && (
              <button
                onClick={() => handleSelectByStatus('new')}
                className="px-2.5 py-1 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
              >
                <Flame className="w-3 h-3 text-amber-600" />
                <span>Select New ({statusCounts.new})</span>
              </button>
            )}
            {statusCounts.confirmed > 0 && (
              <button
                onClick={() => handleSelectByStatus('confirmed')}
                className="px-2.5 py-1 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-900 text-xs font-semibold transition-all cursor-pointer"
              >
                Select Confirmed ({statusCounts.confirmed})
              </button>
            )}
            {statusCounts.processing > 0 && (
              <button
                onClick={() => handleSelectByStatus('processing')}
                className="px-2.5 py-1 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-semibold transition-all cursor-pointer"
              >
                Select Processing ({statusCounts.processing})
              </button>
            )}
            {selectedOrderIds.size > 0 && (
              <button
                onClick={handleClearSelection}
                className="px-2 py-1 text-slate-500 hover:text-slate-800 text-xs font-medium underline underline-offset-2 transition-colors cursor-pointer"
              >
                Clear Selection
              </button>
            )}
          </div>

          {selectedOrderIds.size > 0 && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#3C6CA8] bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{selectedOrderIds.size} of {filteredOrders.length} orders selected</span>
            </div>
          )}
        </div>
      </div>

      {/* Orders Table Container */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-visible">
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-2">
              <Package className="w-6 h-6" />
            </div>
            <p className="font-bold text-slate-800 text-sm">No orders matching criteria</p>
            <p className="text-xs text-slate-500">Try adjusting your search keywords, status tabs, or regional filters.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto min-h-[400px] pb-32">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-[10px] uppercase tracking-wider font-bold text-slate-500">
                    <th className="py-2.5 px-3 w-10 text-center">
                      <input id="ordersmanager-checkbox-4" name="checkbox_4" type="checkbox"
                        checked={isAllSelected}
                        ref={el => {
                          if (el) el.indeterminate = isSomeSelected;
                        }}
                        onChange={handleToggleSelectAll}
                        className="w-4 h-4 rounded border-slate-300 text-[#3C6CA8] focus:ring-[#3C6CA8] cursor-pointer accent-[#3C6CA8]"
                        title={isAllSelected ? "Deselect all" : "Select all orders"}
                      />
                    </th>
                    <th className="py-2.5 px-3">Product & Order</th>
                    <th className="py-2.5 px-3">Customer Details</th>
                    <th className="py-2.5 px-3">Items Summary</th>
                    <th className="py-2.5 px-3">Total & Payment</th>
                    <th className="py-2.5 px-3">Date & Time</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {paginatedOrders.map((order, index) => {
                    const totalItems = (order.order_items || []).reduce((sum, item) => sum + item.quantity, 0);
                    const finalTotal = (order.total_price || 0) + (order.shipping_fee || 0);
                    const dateInfo = formatDateDetails(order);
                    const orderRef = orderIdMap.get(order.id) || formatOrderId(order);
                    const isNewOrder = order.order_status === 'new';
                    const isSelected = selectedOrderIds.has(order.id);
                    const isDropdownActive = activeDropdownOrderId === order.id;
                    const isNearBottom = index >= Math.max(1, paginatedOrders.length - 2) && paginatedOrders.length >= 2;
                    const primaryProductsText = (order.order_items || []).map(i => {
                      const name = i.product_name || 'Product';
                      const variation = i.variation_name ? ` (${i.variation_name})` : '';
                      return `${i.quantity > 1 ? `${i.quantity}x ` : ''}${name}${variation}`;
                    }).join(', ') || 'Peptide Product';

                    return (
                      <tr
                        key={order.id}
                        className={`transition-all group ${isDropdownActive ? 'relative z-30' : ''} ${
                          isSelected
                            ? 'bg-blue-50/70 hover:bg-blue-50 border-l-4 border-l-[#3C6CA8]'
                            : isNewOrder
                              ? 'bg-amber-50/25 hover:bg-amber-50/60 border-l-4 border-l-amber-500'
                              : 'hover:bg-slate-50/70'
                        }`}
                      >
                        {/* Checkbox column */}
                        <td className="py-2.5 px-3 text-center align-middle">
                          <input id={`ordersmanager-chk-${order.id}`} name={`chk_${order.id}`} type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectOrder(order.id)}
                            className="w-4 h-4 rounded border-slate-300 text-[#3C6CA8] focus:ring-[#3C6CA8] cursor-pointer accent-[#3C6CA8]"
                          />
                        </td>

                        {/* 1st Column: Product & Order */}
                        <td className="py-2.5 px-3 align-middle max-w-[280px]">
                            <div className="font-bold text-slate-900 text-[12px] tracking-tight line-clamp-2 leading-snug" title={primaryProductsText}>
                              {primaryProductsText}
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const rawCode = order.order_number || order.id || '';
                                    const textToCopy = rawCode.startsWith('SLD-') || rawCode.startsWith('SDP') ? rawCode : orderRef.replace(/^ID:\s*/i, '');
                                    navigator.clipboard.writeText(textToCopy);
                                    setCopiedId(order.id);
                                    fireToast(`Copied Order ${orderRef} to clipboard! 📋`, 'success', 2000);
                                    setTimeout(() => setCopiedId(null), 2000);
                                  }}
                                  className="font-mono font-bold text-slate-800 text-[11px] bg-slate-100 hover:bg-slate-200 active:bg-slate-300 px-2 py-0.5 rounded-md border border-slate-300/80 transition-all flex items-center gap-1 cursor-pointer group/id shadow-2xs hover:border-[#3C6CA8]"
                                  title="Click to copy full Order ID code"
                                >
                                  <span>{orderRef}</span>
                                  {copiedId === order.id ? (
                                    <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                                  ) : (
                                    <Copy className="w-2.5 h-2.5 text-slate-400 group-hover/id:text-[#3C6CA8] shrink-0" />
                                  )}
                                </button>
                              </div>
                              {isNewOrder && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500 text-white shadow-xs animate-pulse">
                                  <Sparkles className="w-2.5 h-2.5" />
                                  NEW
                                </span>
                              )}
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border inline-flex items-center gap-1 ${getStatusColor(order.order_status)}`}>
                                {getStatusIcon(order.order_status)}
                                <span>{order.order_status.toUpperCase()}</span>
                              </span>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                                order.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-amber-100 text-amber-800 border-amber-200'
                              }`}>
                                {order.payment_status === 'paid' ? 'PAID' : 'PENDING'}
                              </span>
                            </div>
                          </td>

                        {/* 2nd Column: Customer Details */}
                        <td className="py-2.5 px-3 align-middle">
                          <div className="min-w-0 max-w-[200px] space-y-0.5">
                            <p className="font-bold text-slate-900 text-xs truncate">{order.customer_name || 'Customer'}</p>
                            <p className="text-[11px] text-slate-500 truncate">{order.customer_email || 'No email'}</p>
                            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                              <Phone className="w-2.5 h-2.5" />
                              <span className="truncate">{order.customer_phone || 'No phone'}</span>
                            </div>
                          </div>
                        </td>

                        {/* 3rd Column: Items Summary */}
                        <td className="py-2.5 px-3 align-middle">
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200/80">
                              {totalItems} item{totalItems !== 1 ? 's' : ''}
                            </span>
                            <div className="text-[11px] text-slate-500 font-medium truncate max-w-[160px]">
                              {(order.order_items || []).map(i => `${i.quantity}x ${i.product_name}`).join(', ') || '—'}
                            </div>
                          </div>
                        </td>

                        {/* 4th Column: Total & Payment Method */}
                        <td className="py-2.5 px-3 align-middle">
                          <div className="space-y-0.5">
                            <p className="font-black text-slate-900 text-xs sm:text-sm">₱{finalTotal.toLocaleString('en-PH', { minimumFractionDigits: 0 })}</p>
                            <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                              <CreditCard className="w-2.5 h-2.5 text-slate-400" />
                              <span className="truncate max-w-[110px]">{order.payment_method_name || 'BDO Transfer'}</span>
                            </div>
                          </div>
                        </td>

                        {/* 5th Column: Date & Time (after Total & Payment) */}
                        <td className="py-2.5 px-3 align-middle whitespace-nowrap">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="font-bold text-slate-900 text-xs">{dateInfo.date}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                              <Clock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                              <span>{dateInfo.time}</span>
                              {dateInfo.day && <span>({dateInfo.day})</span>}
                            </div>
                          </div>
                        </td>

                        {/* 6th Column: Actions */}
                        <td className="py-2.5 px-3 text-right align-middle">
                          <div className="flex items-center justify-end gap-1.5">
                            {isNewOrder && (
                              <button
                                onClick={() => handleConfirmOrder(order)}
                                disabled={isProcessing}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                                title="Quick Confirm Order & Deduct Stock"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span className="hidden xl:inline">Confirm</span>
                              </button>
                            )}

                            {/* Modern 3-Dots Dropdown Trigger */}
                            <div className="relative inline-block text-left order-action-dropdown-container">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDropdownOrderId(activeDropdownOrderId === order.id ? null : order.id);
                                }}
                                className={`p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                                  activeDropdownOrderId === order.id
                                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                                    : 'text-slate-600 bg-white hover:bg-slate-100 hover:text-slate-900 border-slate-200 shadow-2xs hover:border-slate-300'
                                }`}
                                title="Actions Menu"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {activeDropdownOrderId === order.id && (
                                <div className={`absolute right-0 ${
                                  isNearBottom ? 'bottom-full mb-1.5 origin-bottom-right' : 'top-full mt-1.5 origin-top-right'
                                } w-52 bg-white rounded-2xl shadow-2xl border border-slate-200 py-1 z-50 animate-in fade-in zoom-in-95 duration-150 text-left`}>
                                  <div className="px-3 py-1.5 border-b border-slate-100">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Order Options</p>
                                    <p className="text-xs font-bold text-slate-800 font-mono truncate">{orderRef}</p>
                                  </div>

                                  <div className="p-1 space-y-0.5">
                                    {isNewOrder && (
                                      <button
                                        onClick={() => {
                                          setActiveDropdownOrderId(null);
                                          handleConfirmOrder(order);
                                        }}
                                        disabled={isProcessing}
                                        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
                                      >
                                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Confirm & Deduct Stock</span>
                                      </button>
                                    )}

                                    <button
                                      onClick={() => {
                                        setActiveDropdownOrderId(null);
                                        setSelectedOrder(order);
                                      }}
                                      className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                                    >
                                      <Eye className="w-3.5 h-3.5 text-[#3C6CA8]" />
                                      <span>View Full Details</span>
                                    </button>

                                    <button
                                      onClick={() => {
                                        setActiveDropdownOrderId(null);
                                        const nextStatus = order.payment_status === 'paid' ? 'pending' : 'paid';
                                        handleUpdatePaymentStatus(order.id, nextStatus);
                                      }}
                                      className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                                    >
                                      <CreditCard className="w-3.5 h-3.5 text-purple-600" />
                                      <span>{order.payment_status === 'paid' ? 'Mark Pending' : 'Mark Paid'}</span>
                                    </button>

                                    <button
                                      onClick={() => {
                                        setActiveDropdownOrderId(null);
                                        navigator.clipboard.writeText(order.order_number || order.id);
                                        fireToast(`Copied order ID: ${orderRef} 📋`, 'info');
                                      }}
                                      className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                                    >
                                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                                      <span>Copy Reference</span>
                                    </button>
                                  </div>

                                  <div className="px-3 pt-1.5 pb-1 border-t border-slate-100">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Set Status</p>
                                  </div>

                                  <div className="px-1 pb-1 grid grid-cols-2 gap-1">
                                    {['confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map((st) => (
                                      <button
                                        key={st}
                                        onClick={() => {
                                          setActiveDropdownOrderId(null);
                                          handleUpdateOrderStatus(order.id, st);
                                        }}
                                        disabled={order.order_status === st}
                                        className={`px-1.5 py-1 text-[10px] font-bold rounded-lg transition-colors cursor-pointer capitalize text-center ${
                                          order.order_status === st
                                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                            : st === 'cancelled'
                                              ? 'text-rose-600 hover:bg-rose-50'
                                              : 'text-slate-700 hover:bg-slate-100'
                                        }`}
                                      >
                                        {st}
                                      </button>
                                    ))}
                                  </div>

                                  <div className="p-1 border-t border-slate-100">
                                    <button
                                      onClick={() => {
                                        setActiveDropdownOrderId(null);
                                        handleDeleteOrder(order);
                                      }}
                                      className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                      <span>Delete Order</span>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards List (< 768px) */}
            <div className="block md:hidden divide-y divide-slate-200/80 p-3 space-y-3.5 bg-slate-100/70">
              <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <label htmlFor="ordersmanager-if-el-el-indeterminate-issomes" className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input id="ordersmanager-checkbox-8" name="checkbox_8" type="checkbox"
                    checked={isAllSelected}
                    ref={el => {
                      if (el) el.indeterminate = isSomeSelected;
                    }}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-[#3C6CA8] focus:ring-[#3C6CA8] accent-[#3C6CA8]"
                  />
                  <span>Select All ({filteredOrders.length})</span>
                </label>
                {selectedOrderIds.size > 0 && (
                  <span className="text-xs font-bold text-[#3C6CA8] bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200 shadow-2xs">
                    {selectedOrderIds.size} Selected
                  </span>
                )}
              </div>
              {paginatedOrders.map((order) => {
                const totalItems = (order.order_items || []).reduce((sum, item) => sum + item.quantity, 0);
                const finalTotal = (order.total_price || 0) + (order.shipping_fee || 0);
                const dateInfo = formatDateDetails(order);
                const orderRef = orderIdMap.get(order.id) || formatOrderId(order);
                const rawOrderNumber = order.order_number ? (order.order_number.startsWith('#') ? order.order_number : `#${order.order_number}`) : `#${orderRef.replace(/^ID:\s*/i, '')}`;
                const isNewOrder = order.order_status === 'new';
                const isSelected = selectedOrderIds.has(order.id);
                const isExpanded = expandedOrderIds.has(order.id);
                const paymentMethod = order.payment_method_name || 'GCash';
                const isPaid = order.payment_status === 'paid';

                return (
                  <div
                    key={order.id}
                    className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden shadow-md hover:shadow-lg ${
                      isSelected
                        ? 'border-[#3C6CA8] ring-2 ring-[#3C6CA8]/30 shadow-blue-500/10'
                        : isNewOrder
                          ? 'border-amber-300 shadow-amber-500/10 ring-1 ring-amber-400/30'
                          : 'border-slate-200/90 shadow-slate-900/5'
                    }`}
                  >
                    {/* Main Card Content (Matching Design Spec) */}
                    <div className="p-4 space-y-3.5 text-left">
                      {/* Top Header: Order # + Copy ID + Paid Status Pill */}
                      <div className="flex items-center justify-between gap-1.5 pb-2.5 border-b border-slate-100">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <input
                            id={`ordersmanager-mob-chk-${order.id}`}
                            name={`mob_chk_${order.id}`}
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectOrder(order.id)}
                            className="w-4 h-4 rounded border-slate-300 text-[#3C6CA8] focus:ring-[#3C6CA8] accent-[#3C6CA8] cursor-pointer shrink-0"
                          />
                          <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm tracking-tight truncate max-w-[140px] sm:max-w-none" title={rawOrderNumber}>
                            Order {rawOrderNumber}
                          </h4>
                          {/* Copy Ref Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const rawCode = order.order_number || order.id || '';
                              const textToCopy = rawCode.startsWith('SLD-') || rawCode.startsWith('SDP') ? rawCode : orderRef.replace(/^ID:\s*/i, '');
                              navigator.clipboard.writeText(textToCopy);
                              setCopiedId(order.id);
                              fireToast(`Copied Order ID: ${orderRef} 📋`, 'success', 1800);
                              setTimeout(() => setCopiedId(null), 1800);
                            }}
                            className="inline-flex items-center justify-center p-1 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-full border border-slate-200/80 text-slate-600 transition-colors cursor-pointer shrink-0 shadow-2xs"
                            title="Copy Order ID"
                          >
                            {copiedId === order.id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-2.5 h-2.5 text-slate-500" />
                            )}
                          </button>
                        </div>

                        {/* Payment Pill Badge */}
                        <div className="shrink-0">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold shadow-2xs ${
                            isPaid 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/90'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200/90'
                          }`}>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Paid via {paymentMethod}</span>
                          </span>
                        </div>
                      </div>

                      {/* 2-Column Grid: Customer & Items */}
                      <div className="grid grid-cols-2 gap-3 pt-0.5">
                        {/* Left: Customer */}
                        <div className="min-w-0 pr-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Customer</span>
                          <p className="font-extrabold text-slate-900 text-xs truncate uppercase tracking-tight" title={order.customer_name}>
                            {order.customer_name || 'Customer'}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5 font-normal">
                            {order.customer_email || 'No email saved'}
                          </p>
                        </div>

                        {/* Right: Items */}
                        <div className="min-w-0 pl-1 border-l border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Items</span>
                          <p className="font-extrabold text-slate-900 text-xs truncate">
                            {totalItems} item(s)
                          </p>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            {(order.order_items || []).length || 1} product(s)
                          </p>
                        </div>
                      </div>

                      {/* Visible Divider Between Customer/Items and Total/Date */}
                      <div className="border-t border-slate-100/90 my-1" />

                      {/* 2-Column Grid: Total & Date */}
                      <div className="grid grid-cols-2 gap-3 pt-0.5">
                        {/* Left: Total */}
                        <div className="pr-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Total</span>
                          <p className="font-black text-[#3C6CA8] text-base leading-tight">
                            ₱{finalTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </p>
                        </div>

                        {/* Right: Date */}
                        <div className="pl-1 border-l border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Date</span>
                          <p className="font-extrabold text-slate-800 text-xs">
                            {dateInfo.date}
                          </p>
                          <p className="text-[10.5px] text-slate-400 mt-0.5 font-mono">
                            {dateInfo.time}
                          </p>
                        </div>
                      </div>

                      {/* View Details Dropdown Button */}
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => toggleOrderExpand(order.id)}
                          className="w-full py-2.5 px-4 rounded-xl bg-[#0D1F3C] hover:bg-[#152E56] active:bg-[#08152B] text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md hover:shadow-lg active:scale-[0.99]"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{isExpanded ? 'Hide Details' : 'View Details'}</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 ml-0.5 text-blue-300" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 ml-0.5 text-blue-300" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* ── EXPANDED ACCORDION DROPDOWN VIEW ── */}
                    {isExpanded && (
                      <div className="p-4 bg-slate-50/90 border-t border-slate-200/90 space-y-3.5 animate-fadeIn text-left shadow-inner">
                        {/* Ordered Items Detailed List */}
                        <div className="space-y-2">
                          <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
                            Ordered Product Items
                          </span>
                          <div className="space-y-1.5 bg-white rounded-xl p-3 border border-slate-200/70 shadow-2xs">
                            {(order.order_items || []).map((item, i) => (
                              <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                                <div className="min-w-0 pr-2">
                                  <p className="font-bold text-slate-900 truncate">
                                    {item.quantity}x {item.product_name}
                                  </p>
                                  {item.variation_name && (
                                    <span className="text-[10px] text-slate-500 block">
                                      Dosage/Variation: {item.variation_name}
                                    </span>
                                  )}
                                </div>
                                <span className="font-bold text-slate-800 shrink-0 font-mono">
                                  ₱{Number(item.total || item.price || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Delivery Destination & Contact Details */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {/* Shipping Address */}
                          <div className="p-3 bg-white rounded-xl border border-slate-200/70 space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-[#3C6CA8]" /> Delivery Address
                            </span>
                            <p className="text-slate-800 leading-tight text-[11px] font-medium">
                              {[order.shipping_address, order.shipping_barangay, order.shipping_city, order.shipping_state, order.shipping_zip_code].filter(Boolean).join(', ') || 'No delivery address saved.'}
                            </p>
                          </div>

                          {/* Contact & Status Details */}
                          <div className="p-3 bg-white rounded-xl border border-slate-200/70 space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                              <Phone className="w-3 h-3 text-[#3C6CA8]" /> Contact &amp; Tracking
                            </span>
                            <p className="text-slate-800 font-mono text-[11px] font-bold">
                              {order.customer_phone || 'No phone listed'}
                            </p>
                            {order.tracking_number && (
                              <p className="text-[10px] text-[#3C6CA8] font-mono truncate">
                                Track: {order.tracking_number} ({order.shipping_provider || 'Courier'})
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Action Toolbar Inside Dropdown */}
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/70">
                          <div className="flex items-center gap-1.5">
                            {isNewOrder && (
                              <button
                                type="button"
                                onClick={() => handleConfirmOrder(order)}
                                disabled={isProcessing}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                              >
                                <CheckCircle className="w-3 h-3" />
                                <span>Confirm Order</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setSelectedOrder(order)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold cursor-pointer"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Full Modal</span>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteOrder(order)}
                            disabled={isProcessing}
                            className="inline-flex items-center gap-1 p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 active:scale-95 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-rose-200/60"
                            title="Delete Order"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls Bar */}
            {filteredOrders.length > 0 && (
              <div className="p-3.5 bg-slate-50/90 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-500">
                    Showing <span className="font-bold text-slate-900">{Math.min(filteredOrders.length, (currentPage - 1) * pageSize + 1)}</span> to <span className="font-bold text-slate-900">{Math.min(filteredOrders.length, currentPage * pageSize)}</span> of <span className="font-bold text-slate-900">{filteredOrders.length}</span> orders
                  </span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 outline-none focus:border-[#3C6CA8] cursor-pointer"
                  >
                    <option value={25}>25 per page</option>
                    <option value={50}>50 per page</option>
                    <option value={100}>100 per page</option>
                    <option value={9999}>All orders</option>
                  </select>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-bold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      title="First Page"
                    >
                      «
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-bold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      title="Previous Page"
                    >
                      ‹ Prev
                    </button>
                    <span className="px-3 py-1 font-bold text-slate-800 bg-white border border-slate-200 rounded-lg">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-bold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      title="Next Page"
                    >
                      Next ›
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-bold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      title="Last Page"
                    >
                      »
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating Sticky Batch Actions Command Bar */}
      {selectedOrderIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-4xl bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-slate-700/80 p-3 sm:p-4 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Selection Status & Deselect */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-[#3C6CA8] text-white text-xs font-black flex items-center justify-center shadow-xs">
                  {selectedOrderIds.size}
                </span>
                <span className="text-xs sm:text-sm font-bold text-white">
                  {selectedOrderIds.size} {selectedOrderIds.size === 1 ? 'Order' : 'Orders'} Selected
                </span>
              </div>
              <button
                onClick={handleClearSelection}
                className="text-xs text-slate-400 hover:text-white underline underline-offset-2 transition-colors cursor-pointer"
              >
                Deselect All
              </button>
            </div>

            {/* Batch Status Buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap w-full md:w-auto justify-center md:justify-end">
              <button
                onClick={() => handleBatchUpdateStatus('confirmed')}
                disabled={batchActionInProgress !== null}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="Confirm all selected orders and deduct inventory stock"
              >
                {batchActionInProgress === 'confirmed' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                <span>Confirm</span>
              </button>

              <button
                onClick={() => handleBatchUpdateStatus('processing')}
                disabled={batchActionInProgress !== null}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="Set status of all selected orders to Processing"
              >
                {batchActionInProgress === 'processing' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Package className="w-3.5 h-3.5" />}
                <span>Processing</span>
              </button>

              <button
                onClick={() => handleBatchUpdateStatus('shipped')}
                disabled={batchActionInProgress !== null}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="Set status of all selected orders to Shipped"
              >
                {batchActionInProgress === 'shipped' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Truck className="w-3.5 h-3.5" />}
                <span>Shipped</span>
              </button>

              <button
                onClick={() => handleBatchUpdateStatus('delivered')}
                disabled={batchActionInProgress !== null}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="Set status of all selected orders to Delivered"
              >
                {batchActionInProgress === 'delivered' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>Delivered</span>
              </button>

              <button
                onClick={() => handleBatchUpdatePaymentStatus('paid')}
                disabled={batchActionInProgress !== null}
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="Mark all selected orders as Paid"
              >
                {batchActionInProgress === 'paid' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
                <span>Mark Paid</span>
              </button>

              <button
                onClick={() => handleBatchUpdateStatus('cancelled')}
                disabled={batchActionInProgress !== null}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="Cancel all selected orders"
              >
                {batchActionInProgress === 'cancelled' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                <span>Cancel</span>
              </button>

              <button
                onClick={handleBatchDelete}
                disabled={batchActionInProgress !== null}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="Permanently delete all selected orders"
              >
                {batchActionInProgress === 'delete' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Delete</span>
              </button>

              <button
                onClick={handleClearSelection}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors ml-1"
                title="Dismiss toolbar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Enhanced Modern Order Details View ──────────────────────────────────────────

interface OrderDetailsViewProps {
  order: Order;
  onBack: () => void;
  onConfirm: () => void;
  onDelete: (order: Order) => void;
  onUpdateStatus: (orderId: string, status: string) => void;
  onUpdatePaymentStatus: (orderId: string, paymentStatus: string) => void;
  onSaveTracking: (orderId: string, trackingNumber: string, shippingNote: string) => void;
  onSaveOrder: (orderId: string, updates: Partial<Order>) => void;
  isProcessing: boolean;
}

const OrderDetailsView: React.FC<OrderDetailsViewProps> = ({
  order,
  onBack,
  onConfirm,
  onDelete,
  onUpdateStatus,
  onUpdatePaymentStatus,
  onSaveTracking,
  onSaveOrder,
  isProcessing
}) => {
  const [trackingNumber, setTrackingNumber] = useState(order.tracking_number || '');
  const [shippingNote, setShippingNote] = useState(order.shipping_note || '');
  const [isEditing, setIsEditing] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);

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

  const handleCopyOrderInfo = () => {
    const orderRef = formatOrderId(order);
    const items = (order.order_items || []).map(i => `• ${i.quantity}x ${i.product_name} (${i.variation_name || 'Standard'}) - ₱${i.total.toLocaleString('en-PH')}`).join('\n');
    const finalTotal = (order.total_price || 0) + (order.shipping_fee || 0);

    const summaryText = `SLIMDOSE ORDER SUMMARY\nOrder: ${orderRef}\nCustomer: ${order.customer_name}\nPhone: ${order.customer_phone}\nAddress: ${order.shipping_address}, ${order.shipping_city}, ${order.shipping_state}\n\nITEMS:\n${items}\n\nTOTAL: ₱${finalTotal.toLocaleString('en-PH')}\nPayment: ${order.payment_method_name || 'BDO'} (${order.payment_status.toUpperCase()})\nStatus: ${order.order_status.toUpperCase()}`;

    navigator.clipboard.writeText(summaryText);
    setCopiedRef(true);
    fireToast('Order summary copied to clipboard! 📋', 'success');
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const totalItems = (order.order_items || []).reduce((sum, item) => sum + item.quantity, 0);
  const finalTotal = (order.total_price || 0) + (order.shipping_fee || 0);
  const orderRef = formatOrderId(order);

  const createdDate = order.created_at
    ? new Date(order.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
    : '—';

  return (
    <div className="w-full max-w-[1720px] mx-auto px-2 sm:px-4 md:px-6 py-4 space-y-5">
      {/* Top Header Card */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-600 cursor-pointer"
            title="Back to Orders"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono">
                {orderRef}
              </h2>
              {order.order_status === 'new' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500 text-white shadow-xs animate-pulse">
                  <Sparkles className="w-3 h-3" />
                  NEW UNCONFIRMED
                </span>
              )}
              <span className="text-xs text-slate-400 font-medium">({createdDate})</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Customer: <strong className="text-slate-800">{order.customer_name}</strong> · {totalItems} item(s)
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          <button
            type="button"
            onClick={handleCopyOrderInfo}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            title="Copy order text summary"
          >
            {copiedRef ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copiedRef ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            title="Print invoice or packing slip"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print Slip</span>
          </button>

          {isEditing ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isProcessing}
                className="inline-flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit Details</span>
              </button>
              <button
                onClick={() => onDelete(order)}
                disabled={isProcessing}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold border border-rose-200 transition-all cursor-pointer disabled:opacity-50"
                title="Delete this order"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT COLUMN (7 Cols): Items, Tracking, Payment Proof */}
        <div className="lg:col-span-7 space-y-5">
          {/* Order Status & Confirmation Banner */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-4 sm:p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label htmlFor="ordersmanager-if-el-el-indeterminate-issomes" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Current Order Status
                </label>
                <div className="flex items-center gap-2">
                  <select id="ordersmanager-if-el-el-indeterminate-issomes" name="if_el_el_indeterminate_issomes" value={order.order_status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    disabled={isProcessing}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-hidden focus:ring-2 focus:ring-slate-900 cursor-pointer disabled:opacity-50"
                  >
                    {ORDER_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => onUpdatePaymentStatus(order.id, order.payment_status === 'paid' ? 'pending' : 'paid')}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      order.payment_status === 'paid'
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                        : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                    }`}
                    title="Click to toggle payment status"
                  >
                    {order.payment_status === 'paid' ? '✓ PAID' : 'PENDING PAYMENT'}
                  </button>
                </div>
              </div>

              {order.order_status === 'new' && (
                <button
                  onClick={onConfirm}
                  disabled={isProcessing}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Confirm & Deduct Stock</span>
                </button>
              )}
            </div>
          </div>

          {/* Order Items Card */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Package className="w-4 h-4 text-slate-700" />
                <span>Order Items ({totalItems} total units)</span>
              </h3>
              <span className="text-xs text-slate-400 font-medium">{(order.order_items || []).length} products</span>
            </div>

            <div className="divide-y divide-slate-100">
              {(order.order_items || []).map((item, index) => (
                <div key={index} className="py-3 flex items-center justify-between gap-3 text-xs sm:text-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 font-bold text-xs">
                      #{index + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">
                        {item.product_name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                        {item.variation_name && (
                          <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[11px] font-semibold text-slate-700">
                            {item.variation_name}
                          </span>
                        )}
                        <span>Qty: <strong>{item.quantity}</strong> × ₱{item.price.toLocaleString('en-PH')}</span>
                      </div>
                    </div>
                  </div>

                  <p className="font-black text-slate-900 text-sm shrink-0">
                    ₱{item.total.toLocaleString('en-PH')}
                  </p>
                </div>
              ))}
            </div>

            {/* Financial Summary */}
            <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-bold text-slate-900">₱{(order.total_price || 0).toLocaleString('en-PH')}</span>
              </div>
              {order.discount_applied && order.discount_applied > 0 ? (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Promo Discount {order.promo_code ? `(${order.promo_code})` : ''}</span>
                  <span>-₱{order.discount_applied.toLocaleString('en-PH')}</span>
                </div>
              ) : null}
              {order.shipping_fee && order.shipping_fee > 0 ? (
                <div className="flex justify-between">
                  <span>Shipping Fee</span>
                  <span className="font-bold text-slate-900">₱{order.shipping_fee.toLocaleString('en-PH')}</span>
                </div>
              ) : null}
              <div className="flex justify-between text-sm sm:text-base font-black text-slate-900 border-t border-slate-100 pt-2">
                <span>Grand Total</span>
                <span className="text-blue-600 font-black">₱{finalTotal.toLocaleString('en-PH')}</span>
              </div>
            </div>
          </div>

          {/* Shipping & Tracking Carrier Card */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600" />
                <span>Shipping & J&T Tracking Details</span>
              </h3>
              {trackingNumber && (
                <a
                  href={`https://www.jtexpress.ph/trajectoryQuery?bills=${trackingNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-bold"
                >
                  <span>Track Carrier</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label htmlFor="ordersmanager-j-t-express-tracking-number" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  J&T Express Tracking Number
                </label>
                <div className="flex gap-2">
                  <input id="ordersmanager-j-t-express-tracking-number" name="j_t_express_tracking_number" type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="e.g. 780001234567..."
                    className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-hidden"
                  />
                  {trackingNumber && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(trackingNumber);
                        fireToast('Tracking number copied! 🚚', 'success');
                      }}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                      title="Copy Tracking Number"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="ordersmanager-shipping-note-dispatch-remarks" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Shipping Note / Dispatch Remarks (Optional)
                </label>
                <input id="ordersmanager-shipping-note-dispatch-remarks" name="shipping_note_dispatch_remarks" type="text"
                  value={shippingNote}
                  onChange={(e) => setShippingNote(e.target.value)}
                  placeholder="e.g. Dispatched via J&T Express with ice pack + insulated pouch"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-hidden"
                />
              </div>

              <button
                onClick={() => onSaveTracking(order.id, trackingNumber, shippingNote)}
                disabled={isProcessing}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Tracking Info</span>
              </button>
            </div>
          </div>

          {/* Payment Proof & Verification */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>Payment Verification & Proof</span>
              </h3>
              <span className="text-xs font-bold text-slate-700">
                {order.payment_method_name || 'BDO / Bank Transfer'}
              </span>
            </div>

            {order.payment_proof_url ? (
              <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <img
                  src={order.payment_proof_url}
                  alt="Payment Receipt"
                  onClick={() => setShowImageModal(true)}
                  className="w-20 h-20 object-cover rounded-xl border border-slate-200 shadow-xs cursor-pointer hover:opacity-90 transition-opacity"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900 text-xs sm:text-sm">Payment Screenshot Attached</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Click thumbnail to expand full receipt or verify transaction reference.</p>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setShowImageModal(true)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Full Receipt</span>
                    </button>
                    <a
                      href={order.payment_proof_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Open Link</span>
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400">
                No payment proof image uploaded for this order.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (5 Cols): Customer, Shipping Address, Notes */}
        <div className="lg:col-span-5 space-y-5">
          {/* Customer Profile Card */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4 text-slate-700" />
                <span>Customer Information</span>
              </h3>
            </div>

            {isEditing ? (
              <div className="space-y-2.5 text-xs">
                <div>
                  <label htmlFor="ordersmanager-full-name" className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Full Name</label>
                  <input id="ordersmanager-full-name" name="full_name" type="text"
                    value={editForm.customer_name}
                    autoComplete="name" onChange={(e) => setEditForm({ ...editForm, customer_name: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold"
                  />
                </div>
                <div>
                  <label htmlFor="ordersmanager-email-address" className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Email Address</label>
                  <input id="ordersmanager-email-address" name="email_address" type="email"
                    value={editForm.customer_email}
                    autoComplete="email" onChange={(e) => setEditForm({ ...editForm, customer_email: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label htmlFor="ordersmanager-phone-number" className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Phone Number</label>
                  <input id="ordersmanager-phone-number" name="phone_number" type="text"
                    value={editForm.customer_phone}
                    autoComplete="tel" onChange={(e) => setEditForm({ ...editForm, customer_phone: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-800 font-bold flex items-center justify-center shrink-0">
                    {(order.customer_name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 text-sm truncate">{order.customer_name}</p>
                    <p className="text-slate-500 truncate">{order.customer_email}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="text-slate-400 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Phone</span>
                    <a href={`tel:${order.customer_phone}`} className="font-mono font-bold text-slate-900 hover:underline">
                      {order.customer_phone || '—'}
                    </a>
                  </div>

                  <div className="flex items-center justify-between text-slate-700">
                    <span className="text-slate-400 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email</span>
                    <a href={`mailto:${order.customer_email}`} className="font-medium text-slate-900 truncate max-w-[160px] hover:underline">
                      {order.customer_email || '—'}
                    </a>
                  </div>

                  {order.contact_method && (
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="text-slate-400 flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5" /> Contact Method</span>
                      <span className="font-bold text-blue-600 flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        {String(order.contact_method).charAt(0).toUpperCase() + String(order.contact_method).slice(1)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Delivery Address Card */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-500" />
                <span>Shipping Address</span>
              </h3>
              {order.shipping_location && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-50 text-blue-800 border border-blue-200">
                  {order.shipping_location}
                </span>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-2 text-xs">
                <div>
                  <label htmlFor="ordersmanager-street-address" className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Street Address</label>
                  <input id="ordersmanager-street-address" name="street_address" type="text"
                    value={editForm.shipping_address}
                    autoComplete="street-address" onChange={(e) => setEditForm({ ...editForm, shipping_address: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="ordersmanager-barangay" className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Barangay</label>
                  <input id="ordersmanager-barangay" name="barangay" type="text"
                    value={editForm.shipping_barangay}
                    onChange={(e) => setEditForm({ ...editForm, shipping_barangay: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="ordersmanager-city" className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">City</label>
                    <input id="ordersmanager-city" name="city" type="text"
                      value={editForm.shipping_city}
                      autoComplete="address-level2" onChange={(e) => setEditForm({ ...editForm, shipping_city: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label htmlFor="ordersmanager-province" className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Province</label>
                    <input id="ordersmanager-province" name="province" type="text"
                      value={editForm.shipping_state}
                      autoComplete="address-level1" onChange={(e) => setEditForm({ ...editForm, shipping_state: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5 text-xs text-slate-700">
                <p className="font-bold text-slate-900 leading-snug">{order.shipping_address}</p>
                {order.shipping_barangay && <p className="text-slate-600">Barangay: {order.shipping_barangay}</p>}
                <p className="text-slate-600">{order.shipping_city}, {order.shipping_state} {order.shipping_zip_code}</p>
                <div className="pt-2">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${order.shipping_address}, ${order.shipping_city}, ${order.shipping_state}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                  >
                    <span>Open in Google Maps</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Notes Card */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-4 sm:p-5 space-y-2.5">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-700" />
              <span>Customer Notes & Remarks</span>
            </h3>

            {isEditing ? (
              <textarea id="ordersmanager-input-11" name="input_11" value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                rows={3}
                placeholder="Add internal or customer notes..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-hidden focus:bg-white focus:ring-2 focus:ring-slate-900 resize-none"
              />
            ) : (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed">
                {order.notes ? order.notes : <span className="text-slate-400 italic">No notes provided.</span>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Lightbox Modal */}
      {showImageModal && order.payment_proof_url && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setShowImageModal(false)}
        >
          <div
            className="bg-white rounded-2xl overflow-hidden max-w-xl w-full shadow-2xl p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h4 className="font-bold text-slate-900 text-sm">Payment Proof Image</h4>
              <button
                onClick={() => setShowImageModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={order.payment_proof_url}
              alt="Payment receipt"
              className="w-full max-h-[70vh] object-contain rounded-xl bg-slate-50 border border-slate-100"
            />
            <div className="flex justify-end gap-2 pt-2">
              <a
                href={order.payment_proof_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
              >
                Open Full Size
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersManager;
