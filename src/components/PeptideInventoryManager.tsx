import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Search,
  Edit2,
  Download,
  RefreshCw,
  Bell,
  Check,
  Mail,
  ShieldAlert,
  Package,
  Warehouse,
  TrendingUp,
  MapPin,
  Save,
  X,
  Plus,
  Minus,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Layers,
  AlertTriangle,
  FileSpreadsheet,
  Flame,
  Sparkles,
  ArrowUpDown,
  DollarSign
} from 'lucide-react';
import type { Product, ProductVariation } from '../types';
import { useMenuContext } from '../contexts/MenuContext';
import { useCategories } from '../hooks/useCategories';
import { supabase } from '../lib/supabase';
import { mirrorProductAdjustStock, mirrorVariationAdjustStock } from '../lib/convexMirror';
import { fireToast } from './ToastNotification';

interface PeptideInventoryManagerProps {
  onBack?: () => void;
}

interface RestockSetting {
  id: string;
  product_id: string;
  threshold_qty: number;
  notify_email: string;
}

export default function PeptideInventoryManager({ onBack: _onBack }: PeptideInventoryManagerProps) {
  const { products, loading, refreshProducts } = useMenuContext();
  const { categories } = useCategories();

  // Filters & State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStockFilter, setSelectedStockFilter] = useState<'all' | 'low-stock' | 'out-of-stock' | 'in-stock'>('all');
  const [activeTab, setActiveTab] = useState<'inventory' | 'alerts'>('inventory');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(true);

  const [orders, setOrders] = useState<any[]>([]);
  const [restockSettings, setRestockSettings] = useState<RestockSetting[]>([]);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  // Threshold Editing State
  const [editingThresholdId, setEditingThresholdId] = useState<string | null>(null);
  const [inputThreshold, setInputThreshold] = useState<number>(5);
  const [inputEmail, setInputEmail] = useState<string>('admin@slimdose.ph');
  const [isSavingThreshold, setIsSavingThreshold] = useState(false);

  // Load Orders & Restock Settings
  const loadOrders = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('total_price, shipping_fee, order_items, order_status, payment_status');

      if (!error && data) {
        const activeOrders = data.filter((o: any) => !['cancelled', 'declined', 'failed', 'refunded'].includes(o.order_status));
        setOrders(activeOrders);
      }
    } catch (error) {
      console.warn('Error loading orders in inventory manager:', error);
    }
  }, []);

  const fetchRestockSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('restock_settings')
        .select('*');
      if (!error && data) {
        setRestockSettings(data);
      }
    } catch (error) {
      console.warn('Error loading restock settings:', error);
    }
  }, []);

  // Supabase Realtime Subscription
  useEffect(() => {
    loadOrders();
    fetchRestockSettings();

    const channel = supabase
      .channel('inventory_manager_realtime_live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          refreshProducts();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'product_variations' },
        () => {
          refreshProducts();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          loadOrders();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'restock_settings' },
        () => {
          fetchRestockSettings();
        }
      )
      .subscribe((status) => {
        setIsLiveConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadOrders, fetchRestockSettings, refreshProducts]);

  // Refresh Handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refreshProducts(), loadOrders(), fetchRestockSettings()]);
    setIsRefreshing(false);
    fireToast('Inventory data synced live! ⚡', 'success', 2000);
  };

  // Toggle product variations accordion
  const toggleExpand = (id: string) => {
    setExpandedProducts(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Format Currency (PHP)
  const formatPHP = (amount: number) => {
    const num = isNaN(amount) ? 0 : amount;
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    }).format(num);
  };

  // Get restock status for product
  const getProductAlarmStatus = (product: Product) => {
    const setting = restockSettings.find(s => s.product_id === product.id);
    const threshold = setting ? setting.threshold_qty : 5;
    const manila = Number(product.stock_manila ?? 0);
    const davao = Number(product.stock_davao ?? 0);
    const fallbackStock = Number(product.stock_quantity ?? 0);
    const totalStock = (manila + davao > 0) ? (manila + davao) : fallbackStock;

    return {
      isAlarmed: totalStock <= threshold,
      threshold,
      totalStock,
      notifyEmail: setting ? setting.notify_email : 'admin@slimdose.ph'
    };
  };

  // Update Threshold Setting
  const handleUpdateThreshold = async (productId: string) => {
    try {
      setIsSavingThreshold(true);
      const existing = restockSettings.find(s => s.product_id === productId);
      if (existing) {
        const { error } = await supabase
          .from('restock_settings')
          .update({
            threshold_qty: Math.max(1, Number(inputThreshold)),
            notify_email: inputEmail.trim()
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('restock_settings')
          .insert([{
            product_id: productId,
            threshold_qty: Math.max(1, Number(inputThreshold)),
            notify_email: inputEmail.trim()
          }]);
        if (error) throw error;
      }
      setEditingThresholdId(null);
      await fetchRestockSettings();
      fireToast('Restock threshold alarm updated successfully! 🔔', 'success');
    } catch (err: any) {
      fireToast(`Failed to save threshold: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setIsSavingThreshold(false);
    }
  };

  // Update Branch Stock directly (Fixed mirror function calls & multi-branch synchronization)
  const handleUpdateBranchStock = async (
    productId: string,
    variationId: string | null,
    manilaStock: number,
    davaoStock: number
  ) => {
    try {
      const manila = Math.max(0, Number(manilaStock) || 0);
      const davao = Math.max(0, Number(davaoStock) || 0);
      const total = manila + davao;

      if (variationId) {
        // Update product variation in Supabase
        const { error } = await supabase
          .from('product_variations')
          .update({
            stock_manila: manila,
            stock_davao: davao,
            stock_quantity: total,
            updated_at: new Date().toISOString()
          })
          .eq('id', variationId);

        if (error) throw error;
        mirrorVariationAdjustStock(variationId, total);

        // Fetch all variations for this product to recalculate parent product totals
        const { data: allVars } = await supabase
          .from('product_variations')
          .select('stock_manila, stock_davao, stock_quantity')
          .eq('product_id', productId);

        if (allVars && allVars.length > 0) {
          const parentManila = allVars.reduce((sum, v) => sum + Number(v.stock_manila || 0), 0);
          const parentDavao = allVars.reduce((sum, v) => sum + Number(v.stock_davao || 0), 0);
          const parentTotal = parentManila + parentDavao;

          await supabase
            .from('products')
            .update({
              stock_manila: parentManila,
              stock_davao: parentDavao,
              stock_quantity: parentTotal,
              updated_at: new Date().toISOString()
            })
            .eq('id', productId);

          mirrorProductAdjustStock(productId, parentTotal);
        }
      } else {
        // Update parent product directly
        const { error } = await supabase
          .from('products')
          .update({
            stock_manila: manila,
            stock_davao: davao,
            stock_quantity: total,
            updated_at: new Date().toISOString()
          })
          .eq('id', productId);

        if (error) throw error;
        mirrorProductAdjustStock(productId, total);
      }

      await refreshProducts();
      fireToast('Stock levels updated and saved successfully! 📦', 'success');
    } catch (err: any) {
      console.error('Stock adjustment error:', err);
      fireToast(`Failed to update stock: ${err.message || 'Database error'}`, 'error');
    }
  };

  // Calculate Accurate Inventory Stats (Zero NaN Guaranteed)
  const stats = useMemo(() => {
    const totalVialsSold = orders.reduce((sum, order) => {
      if (order.order_items && Array.isArray(order.order_items)) {
        return sum + order.order_items.reduce((iSum: number, item: any) => iSum + Number(item.quantity || 0), 0);
      }
      return sum;
    }, 0);

    let totalInventoryValue = 0;
    let totalStockUnits = 0;
    let totalManilaUnits = 0;
    let totalDavaoUnits = 0;

    for (const p of products) {
      const price = Number(p.discount_active && p.discount_price ? p.discount_price : p.base_price) || 0;
      const pManila = Number(p.stock_manila ?? 0);
      const pDavao = Number(p.stock_davao ?? 0);
      const pFallback = Number(p.stock_quantity ?? 0);
      const pTotal = (pManila + pDavao > 0) ? (pManila + pDavao) : pFallback;

      if (p.variations && p.variations.length > 0) {
        for (const v of p.variations) {
          const vManila = Number((v as any).stock_manila ?? 0);
          const vDavao = Number((v as any).stock_davao ?? 0);
          const vFallback = Number(v.stock_quantity ?? 0);
          const vTotal = (vManila + vDavao > 0) ? (vManila + vDavao) : vFallback;
          const vPrice = Number(v.discount_active && v.discount_price ? v.discount_price : v.price) || price;

          totalInventoryValue += (vTotal * vPrice);
          totalStockUnits += vTotal;
          totalManilaUnits += vManila;
          totalDavaoUnits += vDavao;
        }
      } else {
        totalInventoryValue += (pTotal * price);
        totalStockUnits += pTotal;
        totalManilaUnits += pManila;
        totalDavaoUnits += pDavao;
      }
    }

    const alarmCount = products.filter(p => getProductAlarmStatus(p).isAlarmed).length;
    const outOfStockCount = products.filter(p => getProductAlarmStatus(p).totalStock === 0).length;

    return {
      totalInventoryValue: isNaN(totalInventoryValue) ? 0 : totalInventoryValue,
      totalStockUnits,
      totalManilaUnits,
      totalDavaoUnits,
      totalVialsSold,
      totalItems: products.length,
      alarmCount,
      outOfStockCount
    };
  }, [products, orders, restockSettings]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products
      .filter(p => {
        if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;

        const alarmInfo = getProductAlarmStatus(p);
        if (selectedStockFilter === 'low-stock' && !alarmInfo.isAlarmed) return false;
        if (selectedStockFilter === 'out-of-stock' && alarmInfo.totalStock > 0) return false;
        if (selectedStockFilter === 'in-stock' && alarmInfo.totalStock === 0) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const nameMatch = (p.name || '').toLowerCase().includes(q);
          const descMatch = (p.description || '').toLowerCase().includes(q);
          const catMatch = (p.category || '').toLowerCase().includes(q);
          return nameMatch || descMatch || catMatch;
        }
        return true;
      })
      .sort((a, b) => {
        // Alarmed items first
        const aAlarm = getProductAlarmStatus(a).isAlarmed ? 1 : 0;
        const bAlarm = getProductAlarmStatus(b).isAlarmed ? 1 : 0;
        if (bAlarm !== aAlarm) return bAlarm - aAlarm;
        return (a.name || '').localeCompare(b.name || '');
      });
  }, [products, selectedCategory, selectedStockFilter, searchQuery, restockSettings]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Product ID',
      'Name',
      'Category',
      'Manila Stock',
      'Davao Stock',
      'Total Stock',
      'Selling Price (PHP)',
      'Total Valuation (PHP)',
      'Low Stock Alarm'
    ];

    const rows = products.flatMap(p => {
      const price = Number(p.discount_active && p.discount_price ? p.discount_price : p.base_price) || 0;
      const alarmInfo = getProductAlarmStatus(p);

      if (p.variations && p.variations.length > 0) {
        return p.variations.map(v => {
          const vManila = Number((v as any).stock_manila ?? 0);
          const vDavao = Number((v as any).stock_davao ?? 0);
          const vTotal = (vManila + vDavao > 0) ? (vManila + vDavao) : Number(v.stock_quantity ?? 0);
          const vPrice = Number(v.price || price);
          return [
            v.id,
            `"${p.name} - ${v.name}"`,
            p.category,
            vManila,
            vDavao,
            vTotal,
            vPrice,
            vTotal * vPrice,
            vTotal <= alarmInfo.threshold ? 'YES' : 'NO'
          ];
        });
      }

      const pManila = Number(p.stock_manila ?? 0);
      const pDavao = Number(p.stock_davao ?? 0);
      const pTotal = (pManila + pDavao > 0) ? (pManila + pDavao) : Number(p.stock_quantity ?? 0);

      return [[
        p.id,
        `"${p.name}"`,
        p.category,
        pManila,
        pDavao,
        pTotal,
        price,
        pTotal * price,
        alarmInfo.isAlarmed ? 'YES' : 'NO'
      ]];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `slimdose_inventory_audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    fireToast('CSV inventory report downloaded! 📊', 'success');
  };

  if (loading && products.length === 0) {
    return (
      <div className="py-20 text-center bg-white rounded-2xl border border-slate-200/80 max-w-6xl mx-auto">
        <div className="w-8 h-8 border-3 border-slate-200 border-t-[#3C6CA8] rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-600 font-bold text-sm">Loading Peptide Inventory & Stock Levels...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5 w-full text-left">
      {/* ── Top Header & Live Sync Bar ── */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm shrink-0">
            <Warehouse className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Peptide Inventory
              </h2>
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border transition-all ${
                  isLiveConnected
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isLiveConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span>{isLiveConnected ? 'Live Multi-Branch Sync' : 'Connecting'}</span>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Live Manila Hub &amp; Davao Hub inventory allocation, instant stock adjustment, and automated restock alarms
            </p>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold px-3.5 py-2.5 rounded-xl transition-all cursor-pointer"
            title="Export CSV Audit Spreadsheet"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span> CSV
          </button>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            title="Refresh Live Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── KPI Metric Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Total Valuation Card */}
        <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500">Inventory Valuation</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-1.5 sm:mt-2">
            <span className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              {formatPHP(stats.totalInventoryValue)}
            </span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 truncate">
            {stats.totalStockUnits} total vials · {stats.totalItems} products
          </p>
        </div>

        {/* Low Stock Alarms Card */}
        <div
          onClick={() => setSelectedStockFilter(selectedStockFilter === 'low-stock' ? 'all' : 'low-stock')}
          className={`cursor-pointer bg-white rounded-xl p-3.5 sm:p-4 border transition-all relative overflow-hidden group shadow-xs ${
            selectedStockFilter === 'low-stock'
              ? 'border-rose-400 ring-2 ring-rose-400/20 bg-rose-50/20'
              : 'border-slate-200/80 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500">Restock Alarms</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <ShieldAlert className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${stats.alarmCount > 0 ? 'animate-bounce' : ''}`} />
            </div>
          </div>
          <div className="mt-1.5 sm:mt-2 flex items-baseline gap-2">
            <span className="text-lg sm:text-xl font-black text-rose-600 tracking-tight">{stats.alarmCount}</span>
            {stats.alarmCount > 0 && (
              <span className="text-[10px] font-black bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded-full animate-pulse">
                Needs Restock
              </span>
            )}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 truncate">
            {stats.outOfStockCount} out of stock (0 vials)
          </p>
        </div>

        {/* Multi-Branch Breakdown Card */}
        <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500">Branch Distribution</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-1.5 sm:mt-2 flex items-center gap-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[9px] uppercase font-bold">Manila Hub</span>
              <span className="font-bold text-slate-900 text-xs sm:text-sm">{stats.totalManilaUnits} vials</span>
            </div>
            <div className="border-l border-slate-200 pl-3">
              <span className="text-slate-400 block text-[9px] uppercase font-bold">Davao Hub</span>
              <span className="font-bold text-slate-900 text-xs sm:text-sm">{stats.totalDavaoUnits} vials</span>
            </div>
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 truncate">
            Cold-chain storage allocation
          </p>
        </div>

        {/* Confirmed Orders Sold Card */}
        <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500">Lifetime Vials Sold</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-1.5 sm:mt-2">
            <span className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">{stats.totalVialsSold} units</span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 truncate">
            From verified paid customer orders
          </p>
        </div>
      </div>

      {/* ── Sub-Tabs & Filter Controls Bar ── */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-3.5 sm:p-4 space-y-3">
        {/* Top Tab Switcher */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'inventory'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Warehouse className="w-3.5 h-3.5" />
              <span>Branch Stock Levels</span>
            </button>

            <button
              onClick={() => setActiveTab('alerts')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'alerts'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Restock Threshold Alarms</span>
              {stats.alarmCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-black animate-pulse">
                  {stats.alarmCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Search & Category Filter Row */}
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input id="peptideinventorymanager-search" name="search" type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by peptide name, dosage, or category..."
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-50/80 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all text-slate-800 placeholder-slate-400"
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

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <select id="peptideinventorymanager-input-2" name="input_2" value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <select id="peptideinventorymanager-input-3" name="input_3" value={selectedStockFilter}
              onChange={(e) => setSelectedStockFilter(e.target.value as any)}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer"
            >
              <option value="all">All Stock Statuses</option>
              <option value="low-stock">🚨 Low Stock Alarms</option>
              <option value="out-of-stock">❌ Out of Stock (0)</option>
              <option value="in-stock">{'✅ In Stock (> 0)'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Tab 1: Branch Stock Adjuster List ── */}
      {activeTab === 'inventory' && (
        <div className="space-y-3">
          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-12 text-center">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-800">No Products Matching Filter</h4>
              <p className="text-slate-400 text-xs mt-1">Try clearing your search query or selecting "All Stock Statuses".</p>
            </div>
          ) : (
            filteredProducts.map((product) => (
              <StockAdjusterCard
                key={product.id}
                product={product}
                onSaveStock={handleUpdateBranchStock}
                alarmStatus={getProductAlarmStatus(product)}
                isExpanded={expandedProducts.has(product.id)}
                onToggleExpand={() => toggleExpand(product.id)}
                formatPHP={formatPHP}
              />
            ))
          )}
        </div>
      )}

      {/* ── Tab 2: Restock Alert Alarms Thresholds Table ── */}
      {activeTab === 'alerts' && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
          <div className="p-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-blue-600" />
                <span>Automated Restock Threshold Triggers</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                When combined branch stock drops to or below the alarm threshold, low-stock warnings trigger automatically.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-800">
              <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-widest text-[10px] border-b border-slate-100 font-semibold">
                <tr>
                  <th className="py-3 px-4 sm:px-6">Product / Peptide</th>
                  <th className="py-3 px-4 text-center">Current Total Stock</th>
                  <th className="py-3 px-4 text-center">Alarm Threshold</th>
                  <th className="py-3 px-4">Notification Target</th>
                  <th className="py-3 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => {
                  const alarmInfo = getProductAlarmStatus(p);
                  const isEditing = editingThresholdId === p.id;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="font-bold text-slate-900 text-xs sm:text-sm">{p.name}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Category: {p.category}</div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${
                            alarmInfo.isAlarmed
                              ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {alarmInfo.totalStock} vials
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                        {isEditing ? (
                          <input id="peptideinventorymanager-input-4" name="input_4" type="number"
                            min={1}
                            value={inputThreshold}
                            onChange={(e) => setInputThreshold(Number(e.target.value))}
                            className="w-20 px-2 py-1 text-center border border-slate-300 rounded-lg text-xs font-bold"
                          />
                        ) : (
                          <span>≤ {alarmInfo.threshold} vials</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {isEditing ? (
                          <input id="peptideinventorymanager-input-5" name="input_5" type="email"
                            value={inputEmail}
                            autoComplete="email" onChange={(e) => setInputEmail(e.target.value)}
                            className="w-full max-w-[220px] px-2.5 py-1 border border-slate-300 rounded-lg text-xs"
                          />
                        ) : (
                          <span className="flex items-center gap-1 text-slate-600 font-medium">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            {alarmInfo.notifyEmail}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleUpdateThreshold(p.id)}
                              disabled={isSavingThreshold}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Save</span>
                            </button>
                            <button
                              onClick={() => setEditingThresholdId(null)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingThresholdId(p.id);
                              setInputThreshold(alarmInfo.threshold);
                              setInputEmail(alarmInfo.notifyEmail);
                            }}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 ml-auto cursor-pointer transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                            <span>Configure</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Compact Modern Stock Adjuster Card Component ─── */
interface StockAdjusterCardProps {
  product: Product;
  onSaveStock: (productId: string, variationId: string | null, manila: number, davao: number) => Promise<void>;
  alarmStatus: { isAlarmed: boolean; threshold: number; totalStock: number; notifyEmail: string };
  isExpanded: boolean;
  onToggleExpand: () => void;
  formatPHP: (amount: number) => string;
}

const StockAdjusterCard: React.FC<StockAdjusterCardProps> = ({
  product,
  onSaveStock,
  alarmStatus,
  isExpanded,
  onToggleExpand,
  formatPHP
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [manilaStock, setManilaStock] = useState<number>(Number(product.stock_manila ?? 0));
  const [davaoStock, setDavaoStock] = useState<number>(Number(product.stock_davao ?? 0));
  const [isSaving, setIsSaving] = useState(false);

  // Sync state if product updates
  useEffect(() => {
    setManilaStock(Number(product.stock_manila ?? 0));
    setDavaoStock(Number(product.stock_davao ?? 0));
  }, [product]);

  const hasVariations = Boolean(product.variations && product.variations.length > 0);
  const price = Number(product.discount_active && product.discount_price ? product.discount_price : product.base_price) || 0;
  const productValuation = alarmStatus.totalStock * price;

  const handleQuickStep = async (branch: 'manila' | 'davao', amount: number) => {
    setIsSaving(true);
    try {
      if (branch === 'manila') {
        const next = Math.max(0, manilaStock + amount);
        setManilaStock(next);
        await onSaveStock(product.id, null, next, davaoStock);
      } else {
        const next = Math.max(0, davaoStock + amount);
        setDavaoStock(next);
        await onSaveStock(product.id, null, manilaStock, next);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveInline = async () => {
    setIsSaving(true);
    try {
      await onSaveStock(product.id, null, manilaStock, davaoStock);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className={`bg-white rounded-2xl shadow-xs border transition-all duration-200 overflow-hidden ${
        alarmStatus.isAlarmed
          ? 'border-rose-300 hover:border-rose-400 bg-rose-50/10'
          : 'border-slate-200/80 hover:border-slate-300'
      }`}
    >
      <div className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left Column: Product Info & Badges */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
              {product.name}
            </h3>

            {alarmStatus.isAlarmed && (
              <span className="px-2 py-0.5 bg-rose-50 text-rose-700 text-[10px] font-black uppercase rounded-full border border-rose-200 animate-pulse flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" />
                Low Stock Alarm (≤ {alarmStatus.threshold})
              </span>
            )}

            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold">
              {formatPHP(price)}/vial
            </span>
          </div>

          {/* Branch Stock Distribution Grid */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mt-3 bg-slate-50/80 p-2.5 sm:p-3 rounded-xl border border-slate-100 text-xs">
            <div>
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] block">Manila Hub</span>
              <p className="font-bold text-slate-800 text-xs sm:text-sm mt-0.5">
                {product.stock_manila ?? 0} vials
              </p>
            </div>

            <div>
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] block">Davao Hub</span>
              <p className="font-bold text-slate-800 text-xs sm:text-sm mt-0.5">
                {product.stock_davao ?? 0} vials
              </p>
            </div>

            <div>
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] block">Combined Stock</span>
              <p className="font-black text-blue-600 text-xs sm:text-sm mt-0.5">
                {alarmStatus.totalStock} vials
              </p>
              <span className="text-[10px] text-slate-400 block truncate">Val: {formatPHP(productValuation)}</span>
            </div>
          </div>

          {/* Variations Toggle Link */}
          {hasVariations && (
            <button
              onClick={onToggleExpand}
              className="mt-2.5 text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>
                {isExpanded ? 'Hide' : 'Manage'} {product.variations!.length} Size Variation Stocks
              </span>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* Right Column: Inline Stock Adjuster */}
        <div className="w-full md:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
          {isEditing ? (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-3 justify-between sm:justify-start">
                <div>
                  <span className="block text-[9px] text-slate-500 font-bold uppercase mb-0.5">Manila</span>
                  <input id="peptideinventorymanager-input-6" name="input_6" type="number"
                    min={0}
                    value={manilaStock}
                    onChange={(e) => setManilaStock(Math.max(0, Number(e.target.value)))}
                    className="w-16 px-2 py-1.5 text-xs font-bold text-slate-900 border border-slate-300 rounded-lg text-center bg-white"
                  />
                </div>

                <div>
                  <span className="block text-[9px] text-slate-500 font-bold uppercase mb-0.5">Davao</span>
                  <input id="peptideinventorymanager-input-7" name="input_7" type="number"
                    min={0}
                    value={davaoStock}
                    onChange={(e) => setDavaoStock(Math.max(0, Number(e.target.value)))}
                    className="w-16 px-2 py-1.5 text-xs font-bold text-slate-900 border border-slate-300 rounded-lg text-center bg-white"
                  />
                </div>
              </div>

              <div className="flex gap-1.5 pt-1 sm:pt-0">
                <button
                  onClick={handleSaveInline}
                  disabled={isSaving}
                  className="flex-1 sm:flex-none px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-xs disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setManilaStock(Number(product.stock_manila ?? 0));
                    setDavaoStock(Number(product.stock_davao ?? 0));
                  }}
                  className="flex-1 sm:flex-none px-3 py-1.5 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setIsEditing(true)}
                className="flex-1 sm:flex-none px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold border border-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Adjust Stock</span>
              </button>

              {/* Quick Stepper +5 shortcuts */}
              <button
                onClick={() => handleQuickStep('manila', 5)}
                disabled={isSaving}
                className="px-2.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                title="Quick Add +5 to Manila Hub"
              >
                +5 Mnl
              </button>
              <button
                onClick={() => handleQuickStep('davao', 5)}
                disabled={isSaving}
                className="px-2.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                title="Quick Add +5 to Davao Hub"
              >
                +5 Dvo
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Expandable Variations Breakdown Section */}
      {isExpanded && hasVariations && (
        <div className="bg-slate-50/90 border-t border-slate-200 p-4 space-y-2.5 animate-in fade-in duration-150">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
            Size Variations Stock Breakdown:
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {product.variations!.map((v) => (
              <VariationStockRow
                key={v.id}
                productId={product.id}
                variation={v}
                onSaveStock={onSaveStock}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface VariationStockRowProps {
  productId: string;
  variation: any;
  onSaveStock: (productId: string, variationId: string | null, manilaStock: number, davaoStock: number) => Promise<void>;
}

const VariationStockRow: React.FC<VariationStockRowProps> = ({ productId, variation, onSaveStock }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [vManila, setVManila] = useState(Number(variation.stock_manila ?? 0));
  const [vDavao, setVDavao] = useState(Number(variation.stock_davao ?? 0));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setVManila(Number(variation.stock_manila ?? 0));
    setVDavao(Number(variation.stock_davao ?? 0));
  }, [variation]);

  const vTotal = vManila + vDavao;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveStock(productId, variation.id, vManila, vDavao);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs shadow-2xs">
      <div className="flex items-center justify-between gap-2">
        <div>
          <span className="font-bold text-slate-800 block">{variation.name} ({variation.quantity_mg}mg)</span>
          <span className="text-[10px] text-slate-400">
            Mnl: {vManila} • Dvo: {vDavao}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="font-mono font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
            {vTotal} units
          </span>
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded cursor-pointer"
            title="Edit branch stock"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {isEditing && (
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-2">
          <div className="flex-1">
            <span className="text-[9px] text-slate-400 font-bold block">Manila</span>
            <input id="peptideinventorymanager-input-8" name="input_8" type="number"
              min={0}
              value={vManila}
              onChange={(e) => setVManila(Math.max(0, Number(e.target.value)))}
              className="w-full px-1.5 py-1 text-xs font-bold border border-slate-300 rounded text-center"
            />
          </div>
          <div className="flex-1">
            <span className="text-[9px] text-slate-400 font-bold block">Davao</span>
            <input id="peptideinventorymanager-input-9" name="input_9" type="number"
              min={0}
              value={vDavao}
              onChange={(e) => setVDavao(Math.max(0, Number(e.target.value)))}
              className="w-full px-1.5 py-1 text-xs font-bold border border-slate-300 rounded text-center"
            />
          </div>
          <div className="flex gap-1 self-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold cursor-pointer disabled:opacity-50"
            >
              {isSaving ? '...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setVManila(Number(variation.stock_manila ?? 0));
                setVDavao(Number(variation.stock_davao ?? 0));
              }}
              className="px-1.5 py-1 bg-slate-200 text-slate-700 rounded text-[11px] font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
