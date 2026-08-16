import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Package,
  Sparkles,
  DollarSign,
  TrendingUp,
  Layers,
  CheckCircle2,
  AlertCircle,
  Tag,
  RefreshCw,
  Percent,
  Copy,
  Info,
  Sliders,
  ChevronDown,
  ChevronUp,
  ShieldCheck
} from 'lucide-react';
import type { Product, ProductVariation } from '../types';
import { useMenu } from '../hooks/useMenu';
import { supabase } from '../lib/supabase';
import { fireToast } from './ToastNotification';

interface VariationManagerProps {
  product: Product;
  onClose: () => void;
}

export default function VariationManager({ product, onClose }: VariationManagerProps) {
  const { addVariation, updateVariation, deleteVariation, refreshProducts } = useMenu();
  const [localVariations, setLocalVariations] = useState<ProductVariation[]>(product.variations || []);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(true);

  // Form State for Adding New Variation
  const [newVariation, setNewVariation] = useState({
    name: '',
    quantity_mg: 5.0,
    price: product.base_price || 1500,
    cost_price: product.raw_price || 0,
    discount_price: null as number | null,
    discount_active: false,
    stock_quantity: 50
  });

  // Form State for Editing Variation
  const [editingVariation, setEditingVariation] = useState({
    name: '',
    quantity_mg: 5.0,
    price: product.base_price || 1500,
    cost_price: 0,
    discount_price: null as number | null,
    discount_active: false,
    stock_quantity: 0
  });

  // Fetch variations directly for this product
  const fetchProductVariations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('product_variations')
        .select('*')
        .eq('product_id', product.id)
        .order('quantity_mg', { ascending: true });

      if (!error && data) {
        setLocalVariations(data);
      }
    } catch (e) {
      console.warn('Error fetching variations:', e);
    }
  }, [product.id]);

  // Setup Supabase Realtime Subscription
  useEffect(() => {
    fetchProductVariations();

    const channel = supabase
      .channel(`variations_live_${product.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'product_variations',
          filter: `product_id=eq.${product.id}`
        },
        () => {
          fetchProductVariations();
          refreshProducts();
        }
      )
      .subscribe((status) => {
        setIsLiveConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [product.id, fetchProductVariations, refreshProducts]);

  // Quick Preset Dosage Injector
  const applyPresetSize = (mg: number) => {
    const defaultName = `${mg}mg Vial`;
    if (editingId) {
      setEditingVariation(prev => ({
        ...prev,
        quantity_mg: mg,
        name: prev.name ? prev.name : defaultName
      }));
    } else {
      setNewVariation(prev => ({
        ...prev,
        quantity_mg: mg,
        name: `${mg}mg Vial`
      }));
    }
  };

  // Quick Discount Calculator
  const applyDiscountPercent = (target: 'new' | 'edit', percent: number) => {
    if (target === 'new') {
      const base = newVariation.price;
      const discounted = Math.round(base * (1 - percent / 100));
      setNewVariation(prev => ({
        ...prev,
        discount_price: discounted,
        discount_active: true
      }));
    } else {
      const base = editingVariation.price;
      const discounted = Math.round(base * (1 - percent / 100));
      setEditingVariation(prev => ({
        ...prev,
        discount_price: discounted,
        discount_active: true
      }));
    }
  };

  // Format Currency (PHP)
  const formatPHP = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Handle Add Variation
  const handleAddVariation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVariation.name.trim() || newVariation.price <= 0 || newVariation.quantity_mg <= 0) {
      fireToast('Please provide a valid size name, quantity (mg), and selling price.', 'warning');
      return;
    }

    try {
      setIsProcessing(true);
      const payload = {
        product_id: product.id,
        name: newVariation.name.trim(),
        quantity_mg: Number(newVariation.quantity_mg),
        price: Number(newVariation.price),
        cost_price: Number(newVariation.cost_price || 0),
        discount_price: newVariation.discount_active ? Number(newVariation.discount_price) : null,
        discount_active: Boolean(newVariation.discount_active),
        stock_quantity: Math.max(0, Number(newVariation.stock_quantity || 0))
      };

      const result = await addVariation(payload);
      if (result.success) {
        fireToast(`Variation "${payload.name}" added successfully!`, 'success');
        setNewVariation({
          name: '',
          quantity_mg: 5.0,
          price: product.base_price || 1500,
          cost_price: product.raw_price || 0,
          discount_price: null,
          discount_active: false,
          stock_quantity: 50
        });
        setIsAdding(false);
        await fetchProductVariations();
      } else {
        fireToast(result.error || 'Failed to add variation', 'error');
      }
    } catch (err: any) {
      fireToast(`Failed to add variation: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Start Edit
  const handleEditVariation = (variation: ProductVariation) => {
    setEditingId(variation.id);
    setEditingVariation({
      name: variation.name,
      quantity_mg: variation.quantity_mg,
      price: variation.price,
      cost_price: variation.cost_price ?? 0,
      discount_price: variation.discount_price,
      discount_active: variation.discount_active,
      stock_quantity: variation.stock_quantity
    });
    setIsAdding(false);
  };

  // Handle Update Variation
  const handleUpdateVariation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editingVariation.name.trim() || editingVariation.price <= 0 || editingVariation.quantity_mg <= 0) {
      fireToast('Please fill in all variation fields properly', 'warning');
      return;
    }

    try {
      setIsProcessing(true);
      const updates = {
        name: editingVariation.name.trim(),
        quantity_mg: Number(editingVariation.quantity_mg),
        price: Number(editingVariation.price),
        cost_price: Number(editingVariation.cost_price || 0),
        discount_price: editingVariation.discount_active ? Number(editingVariation.discount_price) : null,
        discount_active: Boolean(editingVariation.discount_active),
        stock_quantity: Math.max(0, Number(editingVariation.stock_quantity || 0))
      };

      const result = await updateVariation(editingId, updates);
      if (result.success) {
        fireToast(`Variation "${updates.name}" updated successfully!`, 'success');
        setEditingId(null);
        await fetchProductVariations();
      } else {
        fireToast(result.error || 'Failed to update variation', 'error');
      }
    } catch (err: any) {
      fireToast(`Update failed: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Delete Variation
  const handleDeleteVariation = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? Customers will no longer be able to select this size.`)) return;

    try {
      setIsProcessing(true);
      const result = await deleteVariation(id);
      if (result.success) {
        fireToast(`Variation "${name}" deleted.`, 'info');
        await fetchProductVariations();
      } else {
        fireToast(result.error || 'Failed to delete variation', 'error');
      }
    } catch (err: any) {
      fireToast(`Delete failed: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Summary Metrics
  const stats = useMemo(() => {
    const totalSizes = localVariations.length;
    const totalStock = localVariations.reduce((acc, v) => acc + (v.stock_quantity || 0), 0);
    const prices = localVariations.map(v => v.price).filter(p => p > 0);
    const minPrice = prices.length > 0 ? Math.min(...prices) : product.base_price;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : product.base_price;

    return {
      totalSizes,
      totalStock,
      minPrice,
      maxPrice
    };
  }, [localVariations, product.base_price]);

  return (
    <div
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Modal Header with Brand Styling ── */}
        <div className="bg-gradient-to-r from-slate-900 via-[#16253D] to-slate-900 text-white p-5 sm:p-6 flex items-start justify-between gap-4 shrink-0 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-9 h-9 rounded-xl bg-[#3C6CA8]/20 border border-blue-500/30 flex items-center justify-center text-[#3C6CA8]">
                <Package className="w-5 h-5 text-blue-400" />
              </div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                Manage Size &amp; Dosage Variations
              </h2>
              {/* Realtime Live Sync Status */}
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-all ${
                  isLiveConnected
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isLiveConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span>{isLiveConnected ? 'Live Sync Active' : 'Connecting'}</span>
              </div>
            </div>
            <p className="text-xs text-slate-300 mt-1 font-medium">
              Product: <span className="text-white font-bold">{product.name}</span> • Base Price: <span className="text-blue-300 font-mono font-bold">{formatPHP(product.base_price)}</span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── KPI Summary Stats Bar ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 sm:p-4 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/80 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Variations</span>
            <span className="text-base sm:text-lg font-black text-slate-900">{stats.totalSizes} Sizes</span>
          </div>

          <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/80 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Combined Inventory</span>
            <span className="text-base sm:text-lg font-black text-emerald-600">{stats.totalStock} Units</span>
          </div>

          <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/80 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Lowest Price Tier</span>
            <span className="text-base sm:text-lg font-black text-[#3C6CA8]">{formatPHP(stats.minPrice)}</span>
          </div>

          <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/80 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Highest Price Tier</span>
            <span className="text-base sm:text-lg font-black text-slate-900">{formatPHP(stats.maxPrice)}</span>
          </div>
        </div>

        {/* ── Scrollable Body Area ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
          {/* Header Action Row */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#3C6CA8]" />
                Configured Sizes &amp; Dosages
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                These prices and stock levels are what customers see in the product options selector.
              </p>
            </div>

            <button
              onClick={() => {
                setIsAdding(!isAdding);
                setEditingId(null);
              }}
              className="px-3.5 py-2 rounded-xl bg-[#3C6CA8] hover:bg-[#315A8E] active:bg-[#264874] text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-sm shadow-blue-500/20 cursor-pointer"
            >
              {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4 stroke-[3]" />}
              <span>{isAdding ? 'Close Form' : 'Add New Size'}</span>
            </button>
          </div>

          {/* ── Add New Variation Form Drawer ── */}
          {isAdding && (
            <div className="bg-slate-50 border border-blue-200 rounded-2xl p-4 sm:p-5 shadow-xs animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 mb-3.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Create New Size Variation
                  </h4>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar">
                  <span className="text-[10px] text-slate-400 font-bold hidden sm:inline mr-1">Presets:</span>
                  {[2, 5, 10, 15, 20, 30, 50].map((mg) => (
                    <button
                      key={mg}
                      type="button"
                      onClick={() => applyPresetSize(mg)}
                      className="px-2 py-0.5 rounded-lg bg-white hover:bg-blue-50 border border-slate-200 text-slate-700 text-[10px] font-bold transition-colors cursor-pointer"
                    >
                      {mg}mg
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleAddVariation} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="variationmanager-size-dosage-name" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Size / Dosage Name *
                    </label>
                    <input id="variationmanager-size-dosage-name" name="size_dosage_name" type="text"
                      required
                      value={newVariation.name}
                      onChange={(e) => setNewVariation({ ...newVariation, name: e.target.value })}
                      placeholder="e.g. 5mg Vial, 10mg Lyophilized"
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#3C6CA8]/20 focus:border-[#3C6CA8] outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="variationmanager-potency-quantity-mg" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Potency / Quantity (mg) *
                    </label>
                    <input id="variationmanager-potency-quantity-mg" name="potency_quantity_mg" type="number"
                      step="0.1"
                      min={0.1}
                      required
                      value={newVariation.quantity_mg}
                      onChange={(e) => setNewVariation({ ...newVariation, quantity_mg: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#3C6CA8]/20 focus:border-[#3C6CA8] outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="variationmanager-available-stock-units" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Available Stock (Units) *
                    </label>
                    <input id="variationmanager-available-stock-units" name="available_stock_units" type="number"
                      min={0}
                      required
                      value={newVariation.stock_quantity}
                      onChange={(e) => setNewVariation({ ...newVariation, stock_quantity: parseInt(e.target.value) || 0 })}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#3C6CA8]/20 focus:border-[#3C6CA8] outline-none"
                    />
                  </div>
                </div>

                {/* Financials & Margins */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
                  <div>
                    <label htmlFor="variationmanager-selling-price" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Selling Price (₱) *
                    </label>
                    <input id="variationmanager-selling-price" name="selling_price" type="number"
                      step="0.01"
                      min={1}
                      required
                      value={newVariation.price}
                      onChange={(e) => setNewVariation({ ...newVariation, price: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#3C6CA8]/20 focus:border-[#3C6CA8] outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="variationmanager-raw-cost" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Raw Cost (₱)
                    </label>
                    <input id="variationmanager-raw-cost" name="raw_cost" type="number"
                      step="0.01"
                      min={0}
                      value={newVariation.cost_price}
                      onChange={(e) => setNewVariation({ ...newVariation, cost_price: parseFloat(e.target.value) || 0 })}
                      placeholder="Supplier / synthesis cost"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#3C6CA8]/20 focus:border-[#3C6CA8] outline-none"
                    />
                  </div>

                  {/* Calculated Margin Box */}
                  <div className="flex flex-col justify-center bg-slate-50 p-2.5 rounded-lg border border-slate-150">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gross Profit &amp; Margin</span>
                    {newVariation.price > 0 && newVariation.cost_price > 0 ? (
                      <div className="mt-0.5">
                        <span className="text-xs font-extrabold text-emerald-600">
                          +₱{(newVariation.price - newVariation.cost_price).toLocaleString()}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded ml-1.5">
                          {(((newVariation.price - newVariation.cost_price) / newVariation.price) * 100).toFixed(0)}% Margin
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 mt-0.5">Enter cost to view profit</span>
                    )}
                  </div>
                </div>

                {/* Promotional Discount Row */}
                <div className="p-3 bg-white border border-slate-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <label htmlFor="variationmanager-setnewvariation-newvariation-d" className="flex items-center gap-2 cursor-pointer select-none">
                    <input id="variationmanager-checkbox-2" name="checkbox_2" type="checkbox"
                      checked={newVariation.discount_active}
                      onChange={(e) =>
                        setNewVariation({
                          ...newVariation,
                          discount_active: e.target.checked,
                          discount_price: e.target.checked ? newVariation.discount_price || Math.round(newVariation.price * 0.85) : null
                        })
                      }
                      className="w-4 h-4 text-[#3C6CA8] rounded focus:ring-[#3C6CA8]"
                    />
                    <span className="text-xs font-bold text-slate-800">🏷️ Apply Promotional Discount</span>
                  </label>

                  {newVariation.discount_active && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-slate-500">₱</span>
                        <input id="variationmanager-setnewvariation-newvariation-d" name="setnewvariation_newvariation_d" type="number"
                          step="0.01"
                          min={1}
                          value={newVariation.discount_price || ''}
                          onChange={(e) => setNewVariation({ ...newVariation, discount_price: parseFloat(e.target.value) || null })}
                          placeholder="Sale Price"
                          className="w-28 px-2.5 py-1 text-xs font-bold text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3C6CA8]/20 focus:border-[#3C6CA8] outline-none"
                        />
                      </div>
                      {/* Discount Shortcut Buttons */}
                      {[10, 15, 20, 25].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => applyDiscountPercent('new', pct)}
                          className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold transition-colors cursor-pointer"
                        >
                          -{pct}%
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Form Buttons */}
                <div className="flex gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="flex-1 py-2.5 rounded-xl bg-[#3C6CA8] hover:bg-[#315A8E] text-white font-bold text-xs transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {isProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>Save Variation</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── Variations List ── */}
          {localVariations.length === 0 ? (
            <div className="bg-slate-50 rounded-2xl border border-slate-200/90 p-10 text-center">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-800">No Size Variations Configured</h4>
              <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">
                Add size options (e.g. 5mg, 10mg vials) so customers can select their preferred dosage at checkout.
              </p>
              <button
                onClick={() => setIsAdding(true)}
                className="mt-4 px-4 py-2 bg-[#3C6CA8] hover:bg-[#315A8E] text-white rounded-xl text-xs font-bold transition-all shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add First Size</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {localVariations.map((variation) => {
                const isEditing = editingId === variation.id;
                const hasDiscount = variation.discount_active && variation.discount_price && variation.discount_price < variation.price;
                const profit = (variation.price || 0) - (variation.cost_price || 0);
                const marginPercent = variation.price > 0 && variation.cost_price ? ((profit / variation.price) * 100).toFixed(0) : null;

                if (isEditing) {
                  return (
                    <div
                      key={variation.id}
                      className="bg-white border-2 border-[#3C6CA8] rounded-2xl p-4 sm:p-5 shadow-md space-y-4 animate-in fade-in duration-150"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
                          Editing: {variation.name}
                        </span>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <form onSubmit={handleUpdateVariation} className="space-y-3.5">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label htmlFor="variationmanager-size-name" className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                              Size Name *
                            </label>
                            <input id="variationmanager-size-name" name="size_name" type="text"
                              required
                              value={editingVariation.name}
                              onChange={(e) => setEditingVariation({ ...editingVariation, name: e.target.value })}
                              className="w-full px-3 py-1.5 text-xs font-bold text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3C6CA8]/20 focus:border-[#3C6CA8] outline-none"
                            />
                          </div>

                          <div>
                            <label htmlFor="variationmanager-quantity-mg" className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                              Quantity (mg) *
                            </label>
                            <input id="variationmanager-quantity-mg" name="quantity_mg" type="number"
                              step="0.1"
                              min={0.1}
                              required
                              value={editingVariation.quantity_mg}
                              onChange={(e) => setEditingVariation({ ...editingVariation, quantity_mg: parseFloat(e.target.value) || 0 })}
                              className="w-full px-3 py-1.5 text-xs font-bold text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3C6CA8]/20 focus:border-[#3C6CA8] outline-none"
                            />
                          </div>

                          <div>
                            <label htmlFor="variationmanager-stock-units" className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                              Stock Units *
                            </label>
                            <input id="variationmanager-stock-units" name="stock_units" type="number"
                              min={0}
                              required
                              value={editingVariation.stock_quantity}
                              onChange={(e) => setEditingVariation({ ...editingVariation, stock_quantity: parseInt(e.target.value) || 0 })}
                              className="w-full px-3 py-1.5 text-xs font-bold text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3C6CA8]/20 focus:border-[#3C6CA8] outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label htmlFor="variationmanager-selling-price" className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                              Selling Price (₱) *
                            </label>
                            <input id="variationmanager-selling-price" name="selling_price" type="number"
                              step="0.01"
                              min={1}
                              required
                              value={editingVariation.price}
                              onChange={(e) => setEditingVariation({ ...editingVariation, price: parseFloat(e.target.value) || 0 })}
                              className="w-full px-3 py-1.5 text-xs font-bold text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3C6CA8]/20 focus:border-[#3C6CA8] outline-none"
                            />
                          </div>

                          <div>
                            <label htmlFor="variationmanager-raw-cost" className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                              Raw Cost (₱)
                            </label>
                            <input id="variationmanager-raw-cost" name="raw_cost" type="number"
                              step="0.01"
                              min={0}
                              value={editingVariation.cost_price}
                              onChange={(e) => setEditingVariation({ ...editingVariation, cost_price: parseFloat(e.target.value) || 0 })}
                              className="w-full px-3 py-1.5 text-xs font-bold text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3C6CA8]/20 focus:border-[#3C6CA8] outline-none"
                            />
                          </div>
                        </div>

                        {/* Discount row in edit */}
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 flex-wrap">
                          <label htmlFor="variationmanager-seteditingvariation-editingvar" className="flex items-center gap-2 cursor-pointer select-none">
                            <input id="variationmanager-checkbox-4" name="checkbox_4" type="checkbox"
                              checked={editingVariation.discount_active}
                              onChange={(e) =>
                                setEditingVariation({
                                  ...editingVariation,
                                  discount_active: e.target.checked,
                                  discount_price: e.target.checked ? editingVariation.discount_price || Math.round(editingVariation.price * 0.85) : null
                                })
                              }
                              className="w-4 h-4 text-[#3C6CA8] rounded"
                            />
                            <span className="text-xs font-bold text-slate-800">🏷️ Discount Active</span>
                          </label>

                          {editingVariation.discount_active && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-500">₱</span>
                              <input id="variationmanager-seteditingvariation-editingvar" name="seteditingvariation_editingvar" type="number"
                                step="0.01"
                                min={1}
                                value={editingVariation.discount_price || ''}
                                onChange={(e) => setEditingVariation({ ...editingVariation, discount_price: parseFloat(e.target.value) || null })}
                                placeholder="Sale Price"
                                className="w-24 px-2 py-1 text-xs font-bold text-slate-900 border border-slate-300 rounded-lg"
                              />
                              {[10, 15, 20].map((pct) => (
                                <button
                                  key={pct}
                                  type="button"
                                  onClick={() => applyDiscountPercent('edit', pct)}
                                  className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-bold"
                                >
                                  -{pct}%
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isProcessing}
                            className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Save Changes</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  );
                }

                return (
                  <div
                    key={variation.id}
                    className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-3.5 sm:p-4.5 shadow-xs hover:shadow-md transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    {/* Size & Specs */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#3C6CA8] font-bold text-xs shrink-0">
                        {variation.quantity_mg}mg
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm text-slate-900 truncate">
                            {variation.name}
                          </h4>
                          {hasDiscount && (
                            <span className="text-[10px] font-extrabold px-2 py-0.2 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                              PROMO SALE
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5 flex-wrap">
                          <span>
                            Stock: <strong className={variation.stock_quantity <= 5 ? 'text-amber-600' : 'text-slate-700'}>{variation.stock_quantity} units</strong>
                          </span>
                          {variation.cost_price ? (
                            <span>
                              Cost: ₱{Number(variation.cost_price).toLocaleString()}
                              {marginPercent && (
                                <span className="ml-1 text-emerald-600 font-bold">({marginPercent}% margin)</span>
                              )}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {/* Price & Actions */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                          Selling Price
                        </span>
                        <div className="flex items-baseline gap-1.5 sm:justify-end">
                          {hasDiscount ? (
                            <>
                              <span className="text-sm sm:text-base font-black text-rose-600">
                                {formatPHP(variation.discount_price!)}
                              </span>
                              <span className="text-xs text-slate-400 line-through">
                                {formatPHP(variation.price)}
                              </span>
                            </>
                          ) : (
                            <span className="text-sm sm:text-base font-black text-slate-900">
                              {formatPHP(variation.price)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleEditVariation(variation)}
                          disabled={isProcessing}
                          className="p-2 text-[#3C6CA8] bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors cursor-pointer"
                          title="Edit Size"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteVariation(variation.id, variation.name)}
                          disabled={isProcessing}
                          className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer"
                          title="Delete Size"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Modal Footer ── */}
        <div className="bg-slate-50 border-t border-slate-200 p-3.5 sm:p-4 flex items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] text-slate-500 hidden sm:block">
            Prices update across all client browsers in real-time.
          </p>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-colors cursor-pointer ml-auto"
          >
            Close Manager
          </button>
        </div>
      </div>
    </div>
  );
}
