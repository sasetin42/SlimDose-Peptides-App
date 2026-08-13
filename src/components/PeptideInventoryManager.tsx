import React, { useState, useMemo, useEffect } from 'react';
import { Search, Edit, Download, RefreshCw, Bell, Check, Mail, ShieldAlert } from 'lucide-react';
import type { Product } from '../types';
import { useMenu } from '../hooks/useMenu';
import { useCategories } from '../hooks/useCategories';
import { supabase } from '../lib/supabase';
import { mirrorProductAdjustStock, mirrorVariationAdjustStock } from '../lib/convexMirror';

interface PeptideInventoryManagerProps {
  onBack: () => void;
}

interface RestockSetting {
  id: string;
  product_id: string;
  threshold_qty: number;
  notify_email: string;
}

const PeptideInventoryManager: React.FC<PeptideInventoryManagerProps> = ({ onBack: _onBack }) => {
  const { products, loading, refreshProducts } = useMenu();
  const { categories } = useCategories();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [restockSettings, setRestockSettings] = useState<RestockSetting[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'adjust' | 'alerts'>('adjust');

  // Local state for thresholds editing
  const [editingThresholdId, setEditingThresholdId] = useState<string | null>(null);
  const [inputThreshold, setInputThreshold] = useState<number>(5);
  const [inputEmail, setInputEmail] = useState<string>('admin@slimdose.ph');

  useEffect(() => {
    loadOrders();
    fetchRestockSettings();
  }, []);

  const loadOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('total_price, shipping_fee, order_items, order_status')
        .in('order_status', ['confirmed', 'processing', 'shipped', 'delivered'])
        .eq('payment_status', 'paid');

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  };

  const fetchRestockSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('restock_settings')
        .select('*');
      if (!error && data) {
        setRestockSettings(data);
      }
    } catch (error) {
      console.error('Error loading restock settings:', error);
    }
  };

  const handleUpdateThresholdSetting = async (productId: string) => {
    try {
      const existing = restockSettings.find(s => s.product_id === productId);
      if (existing) {
        const { error } = await supabase
          .from('restock_settings')
          .update({ threshold_qty: inputThreshold, notify_email: inputEmail })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('restock_settings')
          .insert([{ product_id: productId, threshold_qty: inputThreshold, notify_email: inputEmail }]);
        if (error) throw error;
      }
      setEditingThresholdId(null);
      await fetchRestockSettings();
      alert('Restock alarm threshold updated!');
    } catch (err: any) {
      console.error('Threshold save error:', err);
      alert(`Failed to save threshold: ${err.message}`);
    }
  };

  // Check if a product is below threshold alarm
  const getRestockAlarmStatus = (product: Product) => {
    const setting = restockSettings.find(s => s.product_id === product.id);
    const threshold = setting ? setting.threshold_qty : 5; // Default 5 if not set
    const totalStock = (product.stock_manila ?? 0) + (product.stock_davao ?? 0);
    return {
      isAlarmed: totalStock <= threshold,
      threshold,
      notifyEmail: setting ? setting.notify_email : 'admin@slimdose.ph'
    };
  };

  // Calculate stats
  const stats = useMemo(() => {
    const totalSales = orders.reduce((sum, order) => {
      const orderTotal = Number(order.total_price) + (Number(order.shipping_fee) || 0);
      return sum + orderTotal;
    }, 0);

    const totalVialsSold = orders.reduce((sum, order) => {
      if (order.order_items && Array.isArray(order.order_items)) {
        return sum + order.order_items.reduce((itemSum: number, item: any) => itemSum + (item.quantity || 0), 0);
      }
      return sum;
    }, 0);

    const totalInventoryValue = products.reduce((sum, product) => {
      const price = product.discount_active && product.discount_price ? product.discount_price : product.base_price;
      const totalStock = (product.stock_manila ?? 0) + (product.stock_davao ?? 0);

      if (product.variations && product.variations.length > 0) {
        return sum + product.variations.reduce((vSum, v) => {
          const vStock = (v as any).stock_manila + (v as any).stock_davao;
          return vSum + (vStock * v.price);
        }, 0);
      }
      return sum + (totalStock * price);
    }, 0);

    // Count items below threshold alarm
    const alarmCount = products.filter(p => getRestockAlarmStatus(p).isAlarmed).length;

    return {
      totalSales,
      totalVialsSold,
      totalInventoryValue,
      totalItems: products.length,
      alarmCount
    };
  }, [products, orders, restockSettings]);

  // Filter products
  const filteredProducts = useMemo(() => {
    let filtered = products;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query)
      );
    }

    if (selectedFilter === 'low-stock') {
      filtered = filtered.filter(p => getRestockAlarmStatus(p).isAlarmed);
    } else if (selectedFilter === 'out-of-stock') {
      filtered = filtered.filter(p => ((p.stock_manila ?? 0) + (p.stock_davao ?? 0)) === 0);
    } else if (selectedFilter === 'in-stock') {
      filtered = filtered.filter(p => ((p.stock_manila ?? 0) + (p.stock_davao ?? 0)) > 0);
    }

    return filtered;
  }, [products, selectedCategory, searchQuery, selectedFilter, restockSettings]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshProducts();
    await loadOrders();
    await fetchRestockSettings();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleUpdateBranchStock = async (
    productId: string,
    variationId: string | null,
    stockManila: number,
    stockDavao: number
  ) => {
    try {
      const totalStock = stockManila + stockDavao;

      if (variationId) {
        const { error } = await supabase
          .from('product_variations')
          .update({
            stock_manila: stockManila,
            stock_davao: stockDavao,
            stock_quantity: totalStock
          })
          .eq('id', variationId);

        if (error) throw error;
        mirrorVariationAdjustStock(variationId, totalStock);
      } else {
        const { error } = await supabase
          .from('products')
          .update({
            stock_manila: stockManila,
            stock_davao: stockDavao,
            stock_quantity: totalStock
          })
          .eq('id', productId);

        if (error) throw error;
        mirrorProductAdjustStock(productId, totalStock);
      }

      await refreshProducts();
      alert('Branch stocks adjusted successfully!');
    } catch (err: any) {
      console.error('Stock adjust error:', err);
      alert(`Failed to save stock: ${err.message}`);
    }
  };

  // Export CSV for Google Sheets auditing
  const handleExportCSV = () => {
    const headers = ['Product ID', 'Name', 'Category', 'Manila Stock', 'Davao Stock', 'Total Stock', 'Price (PHP)', 'Total Value (PHP)', 'Low Stock Alarm'];
    const rows = products.flatMap(p => {
      const price = p.discount_active && p.discount_price ? p.discount_price : p.base_price;
      const alarmInfo = getRestockAlarmStatus(p);
      
      if (p.variations && p.variations.length > 0) {
        return p.variations.map(v => {
          const vManila = (v as any).stock_manila ?? 0;
          const vDavao = (v as any).stock_davao ?? 0;
          const vTotal = vManila + vDavao;
          return [
            v.id,
            `"${p.name} ${v.name}"`,
            p.category,
            vManila,
            vDavao,
            vTotal,
            v.price,
            vTotal * v.price,
            vTotal <= alarmInfo.threshold ? 'YES' : 'NO'
          ];
        });
      }
      
      const pManila = p.stock_manila ?? 0;
      const pDavao = p.stock_davao ?? 0;
      const pTotal = pManila + pDavao;
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

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `peptides_inventory_audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-550 font-medium">Loading branch inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-left">
      {/* Sub Tabs Selector */}
      <div className="flex border-b border-gray-250 bg-white px-8 py-3 sticky top-16 z-20 justify-between items-center">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveSubTab('adjust')}
            className={`pb-2 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
              activeSubTab === 'adjust'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-slate-800'
            }`}
          >
            Branch Stock levels
          </button>
          <button
            onClick={() => setActiveSubTab('alerts')}
            className={`pb-2 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'alerts'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-slate-800'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            Alert Alarm Thresholds
          </button>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-850 text-white rounded-xl text-xs font-semibold shadow transition-all cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV Audit
        </button>
      </div>

      <div className="p-8 max-w-6xl mx-auto">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-2xl shadow p-5 border border-slate-150">
            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-1">Manila vs Davao Value</p>
            <h4 className="text-xl font-black text-slate-800">
              ₱{stats.totalInventoryValue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </h4>
            <p className="text-[10px] text-slate-450 mt-1">Total items in system: {stats.totalItems}</p>
          </div>

          <div className="bg-white rounded-2xl shadow p-5 border border-slate-150">
            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-1">Vials Sold (Total)</p>
            <h4 className="text-xl font-black text-slate-800">{stats.totalVialsSold} units</h4>
            <p className="text-[10px] text-slate-450 mt-1">From confirmed paid orders</p>
          </div>

          <div className="bg-white rounded-2xl shadow p-5 border border-red-200 bg-red-50/20">
            <p className="text-xs font-extrabold text-red-700 uppercase tracking-widest mb-1">Low Stock Alarms</p>
            <h4 className="text-xl font-black text-red-650 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-650 animate-bounce" />
              {stats.alarmCount} items
            </h4>
            <p className="text-[10px] text-red-700/80 mt-1">Below target restock levels</p>
          </div>
        </div>

        {/* Search controls */}
        <div className="bg-white rounded-2xl shadow p-4 border border-slate-150 mb-6 flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-xs text-slate-800 placeholder-slate-400"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 bg-white"
          >
            <option value="all">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 bg-white"
          >
            <option value="all">All Stock Levels</option>
            <option value="low-stock">Alarm Active</option>
            <option value="out-of-stock">Out of Stock</option>
            <option value="in-stock">In Stock</option>
          </select>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center shrink-0 cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Products Stock Adjuster List */}
        {activeSubTab === 'adjust' && (
          <div className="space-y-4">
            {filteredProducts.map(p => (
              <StockAdjusterCard
                key={p.id}
                product={p}
                onSaveStock={handleUpdateBranchStock}
                alarmStatus={getRestockAlarmStatus(p)}
              />
            ))}
          </div>
        )}

        {/* Alerts Threshold Settings Tab */}
        {activeSubTab === 'alerts' && (
          <div className="bg-white rounded-2xl shadow border border-slate-150 overflow-hidden">
            <table className="w-full text-xs text-slate-800">
              <thead className="bg-slate-50 text-slate-400 uppercase tracking-widest text-[9px] border-b border-slate-150">
                <tr>
                  <th className="py-4 px-6 text-left">Peptide / Product</th>
                  <th className="py-4 px-6 text-center">Current Total Stock</th>
                  <th className="py-4 px-6 text-center">Alarm Threshold</th>
                  <th className="py-4 px-6 text-left">Notification Email</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map(p => {
                  const alarmInfo = getRestockAlarmStatus(p);
                  const isEditing = editingThresholdId === p.id;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="py-4 px-6">
                        <p className="font-bold text-slate-800 text-sm">{p.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Category: {p.category}</p>
                      </td>
                      <td className="py-4 px-6 text-center font-bold">
                        <span className={`px-2 py-0.5 rounded-full font-black ${
                          alarmInfo.isAlarmed ? 'bg-red-50 text-red-650 animate-pulse border border-red-200' : 'bg-green-50 text-green-700'
                        }`}>
                          {(p.stock_manila ?? 0) + (p.stock_davao ?? 0)} vials
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center font-semibold text-slate-700">
                        {isEditing ? (
                          <input
                            type="number"
                            value={inputThreshold}
                            onChange={(e) => setInputThreshold(Number(e.target.value))}
                            className="w-16 px-2 py-1 border border-slate-200 rounded-lg text-center"
                          />
                        ) : (
                          <span>{alarmInfo.threshold} vials</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        {isEditing ? (
                          <input
                            type="email"
                            value={inputEmail}
                            onChange={(e) => setInputEmail(e.target.value)}
                            className="w-48 px-2 py-1 border border-slate-200 rounded-lg"
                          />
                        ) : (
                          <span className="flex items-center gap-1 text-slate-500">
                            <Mail className="w-3.5 h-3.5" />
                            {alarmInfo.notifyEmail}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        {isEditing ? (
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handleUpdateThresholdSetting(p.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1 font-semibold cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Save
                            </button>
                            <button
                              onClick={() => setEditingThresholdId(null)}
                              className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg font-semibold cursor-pointer"
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
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl flex items-center gap-1 ml-auto font-semibold cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            Configure Alarm
                          </button>
                        )}
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
  );
};

/* ─── Child Stock Adjuster Card Component ─── */
interface StockAdjusterCardProps {
  product: Product;
  onSaveStock: (productId: string, variationId: string | null, manila: number, davao: number) => void;
  alarmStatus: { isAlarmed: boolean; threshold: number; notifyEmail: string };
}

const StockAdjusterCard: React.FC<StockAdjusterCardProps> = ({ product, onSaveStock, alarmStatus }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [manilaStock, setManilaStock] = useState(product.stock_manila ?? 0);
  const [davaoStock, setDavaoStock] = useState(product.stock_davao ?? 0);

  // Sync state if product changes
  useEffect(() => {
    setManilaStock(product.stock_manila ?? 0);
    setDavaoStock(product.stock_davao ?? 0);
  }, [product]);

  return (
    <div className="bg-white rounded-2xl shadow p-5 border border-slate-150 hover:border-slate-300 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div className="flex-1">
        <div className="flex items-center gap-3 flex-wrap">
          <h4 className="font-black text-slate-850 text-base">{product.name}</h4>
          {alarmStatus.isAlarmed && (
            <span className="px-2 py-0.5 bg-red-50 text-red-700 text-[9px] font-black uppercase rounded-full border border-red-200 animate-pulse flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" />
              Low Stock Alarm
            </span>
          )}
        </div>
        
        {/* Branch metrics */}
        <div className="grid grid-cols-3 gap-4 mt-3 text-xs">
          <div>
            <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px] mb-0.5">Manila Branch</p>
            <p className="font-bold text-slate-800 text-sm">{product.stock_manila ?? 0} vials</p>
          </div>
          <div>
            <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px] mb-0.5">Davao Branch</p>
            <p className="font-bold text-slate-800 text-sm">{product.stock_davao ?? 0} vials</p>
          </div>
          <div>
            <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px] mb-0.5">Total Inventory</p>
            <p className="font-black text-blue-600 text-sm">
              {(product.stock_manila ?? 0) + (product.stock_davao ?? 0)} vials
            </p>
          </div>
        </div>
      </div>

      <div>
        {isEditing ? (
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
            <div className="flex gap-2">
              <div>
                <span className="block text-[9px] text-slate-400 font-bold uppercase mb-0.5">Manila</span>
                <input
                  type="number"
                  value={manilaStock}
                  onChange={(e) => setManilaStock(Number(e.target.value))}
                  className="w-16 px-2 py-1.5 border border-slate-200 rounded-lg text-center"
                />
              </div>
              <div>
                <span className="block text-[9px] text-slate-400 font-bold uppercase mb-0.5">Davao</span>
                <input
                  type="number"
                  value={davaoStock}
                  onChange={(e) => setDavaoStock(Number(e.target.value))}
                  className="w-16 px-2 py-1.5 border border-slate-200 rounded-lg text-center"
                />
              </div>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => {
                  onSaveStock(product.id, null, manilaStock, davaoStock);
                  setIsEditing(false);
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setManilaStock(product.stock_manila ?? 0);
                  setDavaoStock(product.stock_davao ?? 0);
                }}
                className="px-3 py-1.5 bg-slate-200 text-slate-655 hover:bg-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            Adjust Branch Stocks
          </button>
        )}
      </div>
    </div>
  );
};

export default PeptideInventoryManager;
