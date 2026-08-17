import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Save,
  Package,
  Sparkles,
  Info,
  DollarSign,
  FlaskConical,
  Boxes,
  Image as ImageIcon,
  Gift,
  Plus,
  Trash2,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Percent,
  Warehouse,
  Clock,
  Video,
  FileCheck,
  AlertTriangle
} from 'lucide-react';
import type { Product, ProductBundleTier, Category } from '../types';
import { supabase } from '../lib/supabase';
import ImageUpload from './ImageUpload';
import { fireToast } from './ToastNotification';

export interface PepTalkOption {
  id: string;
  title: string;
}

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null; // null for Create, Product for Edit
  categories: Category[];
  peptalkVideos?: PepTalkOption[];
  peptalkArticles?: PepTalkOption[];
  onSaveSuccess: () => Promise<void>;
  logAdminAction?: (action: string, details?: any) => void;
  addProduct: (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => Promise<{ success: boolean; data?: Product; error?: string }>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<{ success: boolean; data?: Product; error?: string }>;
}

type TabKey = 'basic' | 'scientific' | 'inventory' | 'media' | 'dosing_bundles';

type BundleTierDraft = {
  id?: string;
  min_quantity: number;
  discount_percentage: number;
  active: boolean;
  most_popular: boolean;
};

const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  product,
  categories,
  peptalkVideos = [],
  peptalkArticles = [],
  onSaveSuccess,
  logAdminAction,
  addProduct,
  updateProduct,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('basic');
  const [isSaving, setIsSaving] = useState(false);

  // Track previous modal open state and product ID to prevent unwarranted tab/form wipes
  const prevOpenRef = useRef(false);
  const prevProductIdRef = useRef<string | null | undefined>(undefined);

  // Main Product Form Data
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    slug: '',
    description: '',
    category: categories[0]?.id || 'peptides',
    base_price: 0,
    raw_price: 0,
    discount_price: null,
    discount_active: false,
    purity_percentage: 99.0,
    molecular_weight: '',
    cas_number: '',
    sequence: '',
    storage_conditions: 'Store at -20°C',
    inclusions: null,
    stock_quantity: 0,
    stock_manila: 0,
    stock_davao: 0,
    available: true,
    featured: false,
    image_url: null,
    safety_sheet_url: null,
    coa_url: null,
    pre_order_enabled: false,
    pre_order_est_arrival: null,
    pre_order_restock_date: null,
    pre_order_note: null,
    pre_order_max_qty: 10,
    dosing_guide: '',
    dosage_chart_url: '',
    usage_notes: '',
    linked_peptalk_id: null,
  });

  const [bundleTiers, setBundleTiers] = useState<BundleTierDraft[]>([]);
  const [isSetProduct, setIsSetProduct] = useState(false);

  // Initialize or reset form state ONLY when modal transitions from closed to open or when product ID changes
  useEffect(() => {
    if (!isOpen) {
      prevOpenRef.current = false;
      prevProductIdRef.current = undefined;
      return;
    }

    const currentProductId = product ? product.id : null;
    const isModalOpening = !prevOpenRef.current;
    const isProductSwitched = prevProductIdRef.current !== currentProductId;

    // If modal was already open and viewing the same product/mode, DO NOT reset activeTab or formData
    if (!isModalOpening && !isProductSwitched) {
      return;
    }

    prevOpenRef.current = true;
    prevProductIdRef.current = currentProductId;
    setActiveTab('basic');

    if (product) {
      // Editing Mode
      setFormData({
        ...product,
        category: product.category || categories[0]?.id || 'peptides',
        base_price: product.base_price || 0,
        raw_price: product.raw_price || 0,
        stock_manila: product.stock_manila ?? 0,
        stock_davao: product.stock_davao ?? 0,
        stock_quantity: (product.stock_manila ?? 0) + (product.stock_davao ?? 0),
        available: product.available ?? true,
        featured: product.featured ?? false,
      });
      setIsSetProduct(product.inclusions !== null && product.inclusions !== undefined);

      // Fetch Bundle Tiers for editing product
      let isCancelled = false;
      (async () => {
        try {
          const { data } = await supabase
            .from('product_bundle_tiers')
            .select('*')
            .eq('product_id', product.id)
            .order('min_quantity', { ascending: true });

          if (!isCancelled && data) {
            setBundleTiers(
              (data as ProductBundleTier[]).map((t) => ({
                id: t.id,
                min_quantity: t.min_quantity,
                discount_percentage: Number(t.discount_percentage),
                active: t.active,
                most_popular: t.most_popular ?? false,
              }))
            );
          }
        } catch (e) {
          console.warn('Error loading product bundle tiers:', e);
        }
      })();

      return () => {
        isCancelled = true;
      };
    } else {
      // Create Mode
      setFormData({
        name: '',
        slug: '',
        description: '',
        category: categories[0]?.id || 'peptides',
        base_price: 0,
        raw_price: 0,
        discount_price: null,
        discount_active: false,
        purity_percentage: 99.0,
        molecular_weight: '',
        cas_number: '',
        sequence: '',
        storage_conditions: 'Store at -20°C',
        inclusions: null,
        stock_quantity: 0,
        stock_manila: 0,
        stock_davao: 0,
        available: true,
        featured: false,
        image_url: null,
        safety_sheet_url: null,
        coa_url: null,
        pre_order_enabled: false,
        pre_order_est_arrival: null,
        pre_order_restock_date: null,
        pre_order_note: null,
        pre_order_max_qty: 10,
        dosing_guide: '',
        dosage_chart_url: '',
        usage_notes: '',
        linked_peptalk_id: null,
      });
      setBundleTiers([]);
      setIsSetProduct(false);
    }
  }, [isOpen, product?.id]);

  // Real-time calculated properties
  const calculations = useMemo(() => {
    const base = Number(formData.base_price) || 0;
    const raw = Number(formData.raw_price) || 0;
    const profit = base - raw;
    const marginPct = base > 0 ? (profit / base) * 100 : 0;

    const discountPrice = formData.discount_price ? Number(formData.discount_price) : null;
    const isDiscountValid = Boolean(formData.discount_active && discountPrice && discountPrice < base);
    const discountPercent = isDiscountValid && discountPrice ? Math.round(((base - discountPrice) / base) * 100) : 0;

    const totalStock = (Number(formData.stock_manila) || 0) + (Number(formData.stock_davao) || 0);

    return {
      base,
      raw,
      profit,
      marginPct,
      discountPrice,
      isDiscountValid,
      discountPercent,
      totalStock,
    };
  }, [formData.base_price, formData.raw_price, formData.discount_price, formData.discount_active, formData.stock_manila, formData.stock_davao]);

  // Persist Bundle Tiers Helper
  const persistBundleTiers = async (productId: string) => {
    try {
      const { data: existing } = await supabase
        .from('product_bundle_tiers')
        .select('id')
        .eq('product_id', productId);

      const existingIds = new Set(((existing as { id: string }[]) ?? []).map((t) => t.id));
      const keepIds = new Set(bundleTiers.filter((t) => t.id).map((t) => t.id as string));
      const toDelete = [...existingIds].filter((id) => !keepIds.has(id));

      if (toDelete.length > 0) {
        await supabase.from('product_bundle_tiers').delete().in('id', toDelete);
      }

      for (const tier of bundleTiers) {
        const payload: any = {
          product_id: productId,
          min_quantity: tier.min_quantity,
          discount_percentage: tier.discount_percentage,
          active: tier.active,
          most_popular: tier.most_popular,
          updated_at: new Date().toISOString(),
        };

        if (tier.id) {
          await supabase.from('product_bundle_tiers').update(payload).eq('id', tier.id);
        } else {
          await supabase.from('product_bundle_tiers').insert([payload]);
        }
      }
    } catch (err) {
      console.error('Failed to persist bundle tiers:', err);
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name?.trim()) {
      setActiveTab('basic');
      fireToast('Product name is required.', 'warning');
      return;
    }

    if (!formData.base_price || Number(formData.base_price) <= 0) {
      setActiveTab('basic');
      fireToast('Please enter a valid base price greater than 0.', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      const manila = Number(formData.stock_manila) || 0;
      const davao = Number(formData.stock_davao) || 0;
      const totalStock = manila + davao;

      const preparedPayload: any = {
        name: formData.name.trim(),
        slug: formData.slug ? slugify(formData.slug) : slugify(formData.name.trim()),
        description: formData.description?.trim() || '',
        category: formData.category || categories[0]?.id || 'peptides',
        base_price: Number(formData.base_price),
        raw_price: Number(formData.raw_price) || 0,
        discount_price: formData.discount_price ? Number(formData.discount_price) : null,
        discount_active: Boolean(formData.discount_active),
        purity_percentage: Number(formData.purity_percentage) || 99.0,
        molecular_weight: formData.molecular_weight?.trim() || null,
        cas_number: formData.cas_number?.trim() || null,
        sequence: formData.sequence?.trim() || null,
        storage_conditions: formData.storage_conditions?.trim() || 'Store at -20°C',
        inclusions: isSetProduct && formData.inclusions && formData.inclusions.length > 0 ? formData.inclusions : null,
        stock_manila: manila,
        stock_davao: davao,
        stock_quantity: totalStock,
        available: formData.available ?? true,
        featured: formData.featured ?? false,
        image_url: formData.image_url || null,
        safety_sheet_url: formData.safety_sheet_url || null,
        coa_url: formData.coa_url || null,
        pre_order_enabled: Boolean(formData.pre_order_enabled),
        pre_order_est_arrival: formData.pre_order_enabled ? formData.pre_order_est_arrival || null : null,
        pre_order_restock_date: formData.pre_order_enabled ? formData.pre_order_restock_date || null : null,
        pre_order_note: formData.pre_order_enabled ? formData.pre_order_note || null : null,
        pre_order_max_qty: formData.pre_order_enabled ? Number(formData.pre_order_max_qty) || 10 : 10,
        dosing_guide: formData.dosing_guide?.trim() || '',
        dosage_chart_url: formData.dosage_chart_url?.trim() || '',
        usage_notes: formData.usage_notes?.trim() || '',
        linked_peptalk_id: formData.linked_peptalk_id || null,
      };

      if (product) {
        // Update existing product
        const res = await updateProduct(product.id, preparedPayload);
        if (!res.success) throw new Error(res.error || 'Failed to update product');

        await persistBundleTiers(product.id);
        logAdminAction?.('update_product', { id: product.id, name: preparedPayload.name, data: preparedPayload });
        fireToast(`Product "${preparedPayload.name}" updated successfully!`, 'success');
      } else {
        // Create new product
        const res = await addProduct(preparedPayload);
        if (!res.success) throw new Error(res.error || 'Failed to create product');

        if (res.data?.id && bundleTiers.length > 0) {
          await persistBundleTiers(res.data.id);
        }
        logAdminAction?.('create_product', { name: preparedPayload.name, data: preparedPayload });
        fireToast(`Product "${preparedPayload.name}" created successfully!`, 'success');
      }

      await onSaveSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving product in modal:', err);
      fireToast(`Failed to save product: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  // Tabs metadata
  const tabs = [
    { key: 'basic', label: 'Basic & Pricing', icon: DollarSign, badge: calculations.base > 0 ? `₱${calculations.base.toLocaleString()}` : undefined },
    { key: 'scientific', label: 'Scientific & Specs', icon: FlaskConical, badge: `${formData.purity_percentage || 99}%` },
    { key: 'inventory', label: 'Inventory & Pre-Order', icon: Boxes, badge: `${calculations.totalStock} units` },
    { key: 'media', label: 'Media & COA', icon: ImageIcon, badge: formData.image_url ? '✓ Image' : undefined },
    { key: 'dosing_bundles', label: 'Dosing & Bundles', icon: Gift, badge: bundleTiers.length > 0 ? `${bundleTiers.length} tiers` : undefined },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-4xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200 font-inter">
        {/* ─── Modal Header ────────────────────────────────────────────── */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#3C6CA8]/10 text-[#3C6CA8] dark:bg-[#3C6CA8]/20 dark:text-[#94BBE9] flex items-center justify-center shrink-0 border border-[#3C6CA8]/25 shadow-inner">
              <Package className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-[#232323] dark:text-white truncate">
                  {product ? `Edit Product: ${product.name}` : 'Add New Product'}
                </h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#3C6CA8]/10 text-[#3C6CA8] dark:bg-[#3C6CA8]/20 dark:text-[#94BBE9] border border-[#3C6CA8]/30">
                  {product ? 'EDITING' : 'NEW PEPTIDE'}
                </span>
                {formData.available ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200">
                    Hidden / Off
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                Configure pricing, scientific specifications, inventory allocations, and protocol guides
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0 ml-2"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ─── Modern Tab Navigation Bar ───────────────────────────────── */}
        <div className="flex items-center gap-1.5 px-4 sm:px-6 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto scrollbar-none shrink-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as TabKey)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#3C6CA8] text-white shadow-sm shadow-[#3C6CA8]/30'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[9.5px] px-1.5 py-0.2 rounded-md font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ─── Modal Form Body (Scrollable) ────────────────────────────── */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-xs sm:text-sm">
          {/* TAB 1: BASIC & PRICING */}
          {activeTab === 'basic' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Product Name */}
                <div className="md:col-span-2">
                  <label htmlFor="productmodal-product-name" className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Product Name <span className="text-rose-500">*</span>
                  </label>
                  <input id="productmodal-product-name" name="product_name" type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => {
                      const newName = e.target.value;
                      setFormData((prev) => {
                        const autoSlug = !prev.slug || prev.slug === slugify(prev.name || '');
                        return {
                          ...prev,
                          name: newName,
                          slug: autoSlug ? slugify(newName) : prev.slug,
                        };
                      });
                    }}
                    placeholder="e.g. Tirzepatide 10mg / BPC-157 5mg"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] transition-all"
                  />
                </div>

                {/* URL Slug */}
                <div className="md:col-span-2">
                  <label htmlFor="productmodal-product-url-slug" className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Product URL Slug
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-500 font-bold">
                      /products/
                    </span>
                    <input id="productmodal-product-url-slug" name="product_url_slug" type="text"
                      value={formData.slug || ''}
                      onChange={(e) => setFormData({ ...formData, slug: slugify(e.target.value) })}
                      placeholder="tirzepatide-10mg"
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs outline-none focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8]"
                    />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label htmlFor="productmodal-category" className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select id="productmodal-category" name="category" value={formData.category || ''}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-[#3C6CA8]/30"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selling Base Price */}
                <div>
                  <label htmlFor="productmodal-selling-base-price" className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Selling Base Price (₱) <span className="text-rose-500">*</span>
                  </label>
                  <input id="productmodal-selling-base-price" name="selling_base_price" type="number"
                    min="1"
                    step="1"
                    required
                    value={formData.base_price || ''}
                    onChange={(e) => setFormData({ ...formData, base_price: Number(e.target.value) })}
                    placeholder="e.g. 2499"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[#3C6CA8] dark:text-[#94BBE9] font-black text-sm outline-none focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8]"
                  />
                </div>

                {/* Raw Cost Price */}
                <div>
                  <label htmlFor="productmodal-raw-unit-cost-wholesale" className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Raw Unit Cost (₱) <span className="text-slate-400 text-[9.5px] font-normal">(Wholesale)</span>
                  </label>
                  <input id="productmodal-raw-unit-cost-wholesale" name="raw_unit_cost_wholesale" type="number"
                    min="0"
                    step="1"
                    value={formData.raw_price || ''}
                    onChange={(e) => setFormData({ ...formData, raw_price: Number(e.target.value) })}
                    placeholder="e.g. 1200"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-[#3C6CA8]/30"
                  />
                </div>

                {/* Live Profit Margin Calculator Card */}
                <div className="bg-gradient-to-br from-[#3C6CA8]/10 via-blue-50/50 to-slate-50 dark:from-slate-800/80 dark:to-slate-900 p-3.5 rounded-2xl border border-[#3C6CA8]/20 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Gross Profit Margin</span>
                    <span className="text-base font-black text-[#3C6CA8] dark:text-[#94BBE9]">
                      ₱{calculations.profit.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Margin (%)</span>
                    <span
                      className={`text-sm font-extrabold px-2 py-0.5 rounded-lg inline-block ${
                        calculations.marginPct > 40
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      }`}
                    >
                      {calculations.marginPct.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label htmlFor="productmodal-product-description" className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Product Description <span className="text-rose-500">*</span>
                  </label>
                  <textarea id="productmodal-product-description" name="product_description" required
                    rows={3}
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Provide detailed description of the peptide, benefits, and research applications..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8]"
                  />
                </div>

                {/* Promotional Discount Pricing Sub-Section */}
                <div className="md:col-span-2 p-4 bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Percent className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-black text-slate-800 dark:text-white">Discount Pricing</span>
                    </div>
                    <label htmlFor="productmodal-setformdata-formdata-discount-" className="flex items-center gap-2 cursor-pointer">
                      <input id="productmodal-checkbox-2" name="checkbox_2" type="checkbox"
                        checked={formData.discount_active || false}
                        onChange={(e) => setFormData({ ...formData, discount_active: e.target.checked })}
                        className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                      />
                      <span className="text-xs font-extrabold text-amber-900 dark:text-amber-300">Enable Discount</span>
                    </label>
                  </div>

                  {formData.discount_active && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label htmlFor="productmodal-setformdata-formdata-discount-" className="block text-[10.5px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          Discounted Price (₱)
                        </label>
                        <input id="productmodal-setformdata-formdata-discount-" name="setformdata_formdata_discount_" type="number"
                          min="1"
                          value={formData.discount_price || ''}
                          onChange={(e) => setFormData({ ...formData, discount_price: Number(e.target.value) || null })}
                          placeholder="e.g. 1999"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-200/50">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block">Customer Savings</span>
                          <span className="text-xs font-extrabold text-amber-600">
                            {calculations.discountPercent > 0 ? `${calculations.discountPercent}% OFF (Save ₱${(calculations.base - (calculations.discountPrice || 0)).toLocaleString()})` : 'Enter lower price'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SCIENTIFIC & SPECS */}
          {activeTab === 'scientific' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Purity */}
                <div>
                  <label htmlFor="productmodal-purity-percentage" className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Purity Percentage (%)
                  </label>
                  <input id="productmodal-purity-percentage" name="purity_percentage" type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={formData.purity_percentage || ''}
                    onChange={(e) => setFormData({ ...formData, purity_percentage: Number(e.target.value) })}
                    placeholder="99.2"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  />
                </div>

                {/* Molecular Weight */}
                <div>
                  <label htmlFor="productmodal-molecular-weight" className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Molecular Weight
                  </label>
                  <input id="productmodal-molecular-weight" name="molecular_weight" type="text"
                    value={formData.molecular_weight || ''}
                    onChange={(e) => setFormData({ ...formData, molecular_weight: e.target.value })}
                    placeholder="e.g. 1419.55 g/mol"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  />
                </div>

                {/* CAS Number */}
                <div>
                  <label htmlFor="productmodal-cas-registry-number" className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    CAS Registry Number
                  </label>
                  <input id="productmodal-cas-registry-number" name="cas_registry_number" type="text"
                    value={formData.cas_number || ''}
                    onChange={(e) => setFormData({ ...formData, cas_number: e.target.value })}
                    placeholder="e.g. 137525-51-0"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  />
                </div>

                {/* Storage Conditions */}
                <div>
                  <label htmlFor="productmodal-storage-conditions" className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Storage Conditions
                  </label>
                  <input id="productmodal-storage-conditions" name="storage_conditions" type="text"
                    value={formData.storage_conditions || ''}
                    onChange={(e) => setFormData({ ...formData, storage_conditions: e.target.value })}
                    placeholder="Store at -20°C (Lyophilized)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  />
                </div>

                {/* Peptide Sequence */}
                <div className="sm:col-span-2">
                  <label htmlFor="productmodal-amino-acid-sequence" className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Amino Acid Sequence
                  </label>
                  <input id="productmodal-amino-acid-sequence" name="amino_acid_sequence" type="text"
                    value={formData.sequence || ''}
                    onChange={(e) => setFormData({ ...formData, sequence: e.target.value.toUpperCase() })}
                    placeholder="e.g. GEPPPGKPADDAGLV"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold tracking-wider text-xs"
                  />
                </div>

                {/* Complete Set Inclusions */}
                <div className="sm:col-span-2 p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Boxes className="w-4 h-4 text-[#3C6CA8]" />
                      <span className="text-xs font-black text-slate-800 dark:text-white">Complete Set Inclusions (Kit Products)</span>
                    </div>
                    <label htmlFor="productmodal-setissetproduct-e-target-check" className="flex items-center gap-2 cursor-pointer">
                      <input id="productmodal-checkbox-4" name="checkbox_4" type="checkbox"
                        checked={isSetProduct}
                        onChange={(e) => {
                          setIsSetProduct(e.target.checked);
                          if (!e.target.checked) {
                            setFormData((prev) => ({ ...prev, inclusions: null }));
                          } else {
                            setFormData((prev) => ({ ...prev, inclusions: prev.inclusions || [] }));
                          }
                        }}
                        className="w-4 h-4 rounded text-[#3C6CA8] focus:ring-[#3C6CA8]"
                      />
                      <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">This is a SET product</span>
                    </label>
                  </div>

                  {isSetProduct && (
                    <div className="space-y-2 pt-1">
                      <label htmlFor="productmodal-setissetproduct-e-target-check" className="block text-[10.5px] font-bold text-slate-500 dark:text-slate-400">
                        Inclusions Checklist (One item per line):
                      </label>
                      <textarea id="productmodal-setissetproduct-e-target-check" name="setissetproduct_e_target_check" rows={4}
                        value={formData.inclusions?.join('\n') || ''}
                        onChange={(e) => {
                          const items = e.target.value.split('\n').filter((item) => item.trim() !== '');
                          setFormData({ ...formData, inclusions: items.length > 0 ? items : null });
                        }}
                        placeholder="1x 3ml Reconstitution Solution&#10;5x Sterile Insulin Syringes&#10;10x Antiseptic Alcohol Prep Pads"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: INVENTORY & PRE-ORDER */}
          {activeTab === 'inventory' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Warehouse Inventory Breakdown */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <Warehouse className="w-4 h-4 text-[#3C6CA8]" />
                  <span className="text-xs font-black text-slate-800 dark:text-white">Warehouse Stock Allocation</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="productmodal-manila-warehouse-units" className="block text-[10.5px] font-bold text-slate-500 mb-1">
                      Manila Warehouse (Units)
                    </label>
                    <input id="productmodal-manila-warehouse-units" name="manila_warehouse_units" type="number"
                      min="0"
                      value={formData.stock_manila ?? 0}
                      onChange={(e) => setFormData({ ...formData, stock_manila: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                    />
                  </div>

                  <div>
                    <label htmlFor="productmodal-davao-warehouse-units" className="block text-[10.5px] font-bold text-slate-500 mb-1">
                      Davao Warehouse (Units)
                    </label>
                    <input id="productmodal-davao-warehouse-units" name="davao_warehouse_units" type="number"
                      min="0"
                      value={formData.stock_davao ?? 0}
                      onChange={(e) => setFormData({ ...formData, stock_davao: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                    />
                  </div>

                  <div>
                    <label htmlFor="productmodal-total-stock-auto-sum" className="block text-[10.5px] font-bold text-slate-500 mb-1">
                      Total Stock (Auto Sum)
                    </label>
                    <input id="productmodal-total-stock-auto-sum" name="total_stock_auto_sum" type="number"
                      disabled
                      value={calculations.totalStock}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-[#3C6CA8] font-black cursor-not-allowed" autoComplete="off" />
                  </div>
                </div>
              </div>

              {/* Switches: Featured & Available */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label htmlFor="productmodal-featured-checkbox" className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl cursor-pointer hover:border-[#3C6CA8] transition-all">
                  <div>
                    <span className="text-xs font-black text-slate-800 dark:text-white block">⭐ Featured Product</span>
                    <span className="text-[10px] text-slate-400 block">Highlight in top recommended section</span>
                  </div>
                  <input id="productmodal-featured-checkbox" name="featured_checkbox" type="checkbox"
                    checked={formData.featured || false}
                    onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                    className="w-5 h-5 rounded text-[#3C6CA8] focus:ring-[#3C6CA8]"
                  />
                </label>

                <label htmlFor="productmodal-available-checkbox" className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl cursor-pointer hover:border-emerald-500 transition-all">
                  <div>
                    <span className="text-xs font-black text-slate-800 dark:text-white block">✅ Available for Sale</span>
                    <span className="text-[10px] text-slate-400 block">Show and permit orders on storefront</span>
                  </div>
                  <input id="productmodal-available-checkbox" name="available_checkbox" type="checkbox"
                    checked={formData.available ?? true}
                    onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
                    className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                </label>
              </div>

              {/* Pre-Order Configuration */}
              <div className="p-4 bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#3C6CA8]" />
                    <span className="text-xs font-black text-slate-800 dark:text-white">Pre-Order Configuration</span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input id="productmodal-checkbox-10" name="checkbox_10" type="checkbox"
                      checked={formData.pre_order_enabled || false}
                      onChange={(e) => setFormData({ ...formData, pre_order_enabled: e.target.checked })}
                      className="w-4 h-4 rounded text-[#3C6CA8] focus:ring-[#3C6CA8]"
                    />
                    <span className="text-xs font-extrabold text-[#3C6CA8]">Enable Pre-Order</span>
                  </label>
                </div>

                {formData.pre_order_enabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label htmlFor="productmodal-pre-order-est-arrival" className="block text-[10.5px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Estimated Arrival Text
                      </label>
                      <input id="productmodal-pre-order-est-arrival" name="pre_order_est_arrival" type="text"
                        value={formData.pre_order_est_arrival || ''}
                        onChange={(e) => setFormData({ ...formData, pre_order_est_arrival: e.target.value })}
                        placeholder="e.g. Late June 2026"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                      />
                    </div>

                    <div>
                      <label htmlFor="productmodal-target-restock-date" className="block text-[10.5px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Target Restock Date
                      </label>
                      <input id="productmodal-target-restock-date" name="target_restock_date" type="date"
                        value={formData.pre_order_restock_date || ''}
                        onChange={(e) => setFormData({ ...formData, pre_order_restock_date: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                      />
                    </div>

                    <div>
                      <label htmlFor="productmodal-max-pre-order-quantity" className="block text-[10.5px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Max Pre-Order Quantity
                      </label>
                      <input id="productmodal-max-pre-order-quantity" name="max_pre_order_quantity" type="number"
                        min="1"
                        value={formData.pre_order_max_qty || 10}
                        onChange={(e) => setFormData({ ...formData, pre_order_max_qty: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                      />
                    </div>

                    <div>
                      <label htmlFor="productmodal-customer-pre-order-note" className="block text-[10.5px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Customer Pre-Order Note
                      </label>
                      <input id="productmodal-customer-pre-order-note" name="customer_pre_order_note" type="text"
                        value={formData.pre_order_note || ''}
                        onChange={(e) => setFormData({ ...formData, pre_order_note: e.target.value })}
                        placeholder="e.g. Ships immediately upon arrival"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: MEDIA & COA */}
          {activeTab === 'media' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 animate-in fade-in duration-150 items-stretch">
              {/* Column 1: Main Product Image */}
              <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-[#3C6CA8]" />
                      <span className="text-xs font-black text-slate-800 dark:text-white">Main Product Image</span>
                    </div>
                    {formData.image_url && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, image_url: null })}
                        className="text-[11px] font-bold text-rose-500 hover:underline cursor-pointer"
                      >
                        Remove Image
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                    Upload primary product photo (JPG, PNG, WebP) or enter an image link.
                  </p>
                </div>

                <div className="flex-1 flex flex-col justify-center">
                  <ImageUpload
                    currentImage={formData.image_url || undefined}
                    onImageChange={(imageUrl) => {
                      setFormData((prev) => ({
                        ...prev,
                        image_url: imageUrl ? imageUrl.trim() : null,
                      }));
                    }}
                    title="Click to upload product image"
                    subtitle="Supports JPG, PNG, WebP, GIF, SVG - max 10MB"
                    urlPlaceholder="https://example.com/product-image.jpg"
                    urlLabel="Or enter product image URL"
                  />
                </div>
              </div>

              {/* Column 2: Certificate of Analysis (COA) */}
              <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-[#3C6CA8]" />
                      <span className="text-xs font-black text-slate-800 dark:text-white">Certificate of Analysis (COA)</span>
                    </div>
                    {formData.coa_url && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, coa_url: null })}
                        className="text-[11px] font-bold text-rose-500 hover:underline cursor-pointer"
                      >
                        Remove COA
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                    Upload COA PDF / lab test image or enter URL. A "View COA" button will appear on the site.
                  </p>
                </div>

                <div className="flex-1 flex flex-col justify-center">
                  <ImageUpload
                    currentImage={formData.coa_url || undefined}
                    onImageChange={(coaUrl) => {
                      setFormData((prev) => ({
                        ...prev,
                        coa_url: coaUrl ? coaUrl.trim() : null,
                      }));
                    }}
                    folder="coa-images"
                    accept="image/*,.pdf,application/pdf"
                    title="Click to upload COA file"
                    subtitle="Supports PDF documents & test images - max 10MB"
                    urlPlaceholder="https://example.com/coa-batch-102.pdf"
                    urlLabel="Or enter direct COA URL (PDF / link)"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: DOSING & BUNDLES */}
          {activeTab === 'dosing_bundles' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Dosing Guide & PepTalk Link Section */}
              <div className="p-4 sm:p-5 bg-blue-50/40 dark:bg-slate-800/60 border border-blue-200/80 dark:border-slate-700 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-[#3C6CA8]" />
                    <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                      Dosing Guide, Instructions &amp; PepTalk Link
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const sampleText = `• Reconstitution: Reconstitute lyophilized powder using 1.0 mL to 2.0 mL of Bacteriostatic Water (0.9% Benzyl Alcohol). Slowly drip down the glass vial wall; gently swirl and do not shake.\n• Dosing Protocol: Administer subcutaneously using a sterile calibrated U-100 insulin syringe according to target research protocol.\n• Storage: Lyophilized powder stores at -20°C. Once reconstituted, refrigerate at 2°C–8°C for up to 30 days.`;
                      const sampleNotes = `Strictly for laboratory research and analytical in vitro purposes. Not for human consumption. Keep refrigerated and light-protected after reconstitution.`;
                      setFormData(prev => ({
                        ...prev,
                        dosing_guide: prev.dosing_guide || sampleText,
                        usage_notes: prev.usage_notes || sampleNotes
                      }));
                      fireToast('Standard peptide protocol populated!', 'info');
                    }}
                    className="text-[10.5px] font-bold text-[#3C6CA8] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Auto-Fill Standard Protocol</span>
                  </button>
                </div>

                {/* PepTalk Protocol Redirection Link / Selector */}
                <div className="p-3.5 bg-white dark:bg-slate-900 border border-blue-100 dark:border-slate-800 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="productmodal-linked-peptalk-protocol" className="block text-[11px] font-bold text-slate-700 dark:text-slate-200">
                      Linked PepTalk Protocol / Guide (Customer Redirect)
                    </label>
                    {formData.linked_peptalk_id && (
                      <a
                        href={formData.linked_peptalk_id.startsWith('http') ? formData.linked_peptalk_id : `/peptalk/${formData.linked_peptalk_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] font-bold text-[#3C6CA8] hover:underline flex items-center gap-1"
                      >
                        <span>Test Link</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>

                  <select
                    id="productmodal-linked-peptalk-protocol"
                    name="linked_peptalk_protocol"
                    value={formData.linked_peptalk_id || ''}
                    onChange={(e) => setFormData({ ...formData, linked_peptalk_id: e.target.value || null })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-white"
                  >
                    <option value="">Auto (Redirects to PepTalk search by compound name)</option>
                    {peptalkArticles.length > 0 && (
                      <optgroup label="📖 PepTalk Articles / Guides">
                        {peptalkArticles.map((a) => (
                          <option key={`art-${a.id}`} value={a.id}>
                            Article: {a.title}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {peptalkVideos.length > 0 && (
                      <optgroup label="🎥 PepTalk Video Protocols">
                        {peptalkVideos.map((v) => (
                          <option key={`vid-${v.id}`} value={v.id}>
                            Video: {v.title}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Or enter custom PepTalk ID / external guide URL..."
                      value={formData.linked_peptalk_id || ''}
                      onChange={(e) => setFormData({ ...formData, linked_peptalk_id: e.target.value || null })}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-white"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    When customers click &quot;Open Guide&quot; on this product, they will instantly jump to this interactive protocol in PepTalk.
                  </p>
                </div>

                {/* Dosing Instructions (Detailed Text) */}
                <div>
                  <label htmlFor="productmodal-input-11" className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Dosing Instructions &amp; Text Protocol (Optional Summary)
                  </label>
                  <textarea
                    id="productmodal-input-11"
                    name="input_11"
                    rows={3}
                    value={formData.dosing_guide || ''}
                    onChange={(e) => setFormData({ ...formData, dosing_guide: e.target.value })}
                    placeholder="Explain reconstitution volume, starting dose, cycle frequency, insulin syringe calibration..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium leading-relaxed"
                  />
                </div>

                {/* Visual Dosage Reference Chart & Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label htmlFor="productmodal-dosage-chart-image-url" className="block text-[10.5px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Dosage Reference Chart Image URL
                    </label>
                    <input
                      id="productmodal-dosage-chart-image-url"
                      name="dosage_chart_image_url"
                      type="url"
                      value={formData.dosage_chart_url || ''}
                      onChange={(e) => setFormData({ ...formData, dosage_chart_url: e.target.value })}
                      placeholder="https://example.com/dosage-chart.png"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="productmodal-important-usage-notes" className="block text-[10.5px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Important Usage &amp; Safety Notes
                    </label>
                    <textarea
                      id="productmodal-important-usage-notes"
                      name="important_usage_notes"
                      rows={2}
                      value={formData.usage_notes || ''}
                      onChange={(e) => setFormData({ ...formData, usage_notes: e.target.value })}
                      placeholder="e.g. For research purposes only. Reconstitute with Bac Water. Refrigerate."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Quantity Tiered Bundle Discounts */}
              <div className="p-4 bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/70 dark:border-indigo-900/40 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gift className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-black text-slate-800 dark:text-white">Quantity Tiered Bundle Discounts</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const nextMin = bundleTiers.length === 0 ? 2 : Math.max(...bundleTiers.map((t) => t.min_quantity)) + 1;
                      setBundleTiers([
                        ...bundleTiers,
                        { min_quantity: nextMin, discount_percentage: 5, active: true, most_popular: false },
                      ]);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-extrabold hover:bg-indigo-700 cursor-pointer shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Tier</span>
                  </button>
                </div>

                {bundleTiers.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">
                    No bundle discount tiers configured. Click "Add Tier" to reward bulk volume purchases!
                  </p>
                ) : (
                  <div className="space-y-2.5 pt-1">
                    {bundleTiers.map((tier, idx) => {
                      const unitPrice = calculations.base * (1 - tier.discount_percentage / 100);
                      const totalCost = unitPrice * tier.min_quantity;
                      const savings = calculations.base * tier.min_quantity - totalCost;

                      return (
                        <div
                          key={idx}
                          className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-indigo-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                        >
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 flex-1 items-center">
                            <div>
                              <span className="text-[9.5px] uppercase font-bold text-slate-400 block">Min Qty</span>
                              <input id="productmodal-input-12" name="input_12" type="number"
                                min={2}
                                value={tier.min_quantity}
                                onChange={(e) => {
                                  const val = Math.max(2, Number(e.target.value) || 2);
                                  setBundleTiers(bundleTiers.map((t, i) => (i === idx ? { ...t, min_quantity: val } : t)));
                                }}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-bold text-xs"
                              />
                            </div>

                            <div>
                              <span className="text-[9.5px] uppercase font-bold text-slate-400 block">Discount %</span>
                              <input id="productmodal-input-13" name="input_13" type="number"
                                min={1}
                                max={100}
                                step="0.5"
                                value={tier.discount_percentage}
                                onChange={(e) => {
                                  const val = Math.min(100, Math.max(1, Number(e.target.value) || 1));
                                  setBundleTiers(bundleTiers.map((t, i) => (i === idx ? { ...t, discount_percentage: val } : t)));
                                }}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-bold text-xs text-indigo-600"
                              />
                            </div>

                            <div className="col-span-2 sm:col-span-1 bg-slate-50 dark:bg-slate-800/80 p-2 rounded-lg text-[10px]">
                              <span className="text-slate-400 block">Live Price / Vial:</span>
                              <span className="font-extrabold text-[#3C6CA8]">
                                ₱{Math.round(unitPrice).toLocaleString()} (Save ₱{Math.round(savings).toLocaleString()})
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                            <label htmlFor="productmodal-setbundletiers-bundletiers-map" className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                              <input id="productmodal-checkbox-15" name="checkbox_15" type="checkbox"
                                checked={tier.active}
                                onChange={(e) =>
                                  setBundleTiers(bundleTiers.map((t, i) => (i === idx ? { ...t, active: e.target.checked } : t)))
                                }
                                className="w-4 h-4 rounded text-indigo-600"
                              />
                              <span>Active</span>
                            </label>

                            <label className="flex items-center gap-1.5 text-xs font-bold text-amber-600 cursor-pointer">
                              <input id="productmodal-setbundletiers-bundletiers-map" name="setbundletiers_bundletiers_map" type="checkbox"
                                checked={tier.most_popular}
                                onChange={(e) =>
                                  setBundleTiers(bundleTiers.map((t, i) => ({ ...t, most_popular: i === idx ? e.target.checked : false })))
                                }
                                className="w-4 h-4 rounded text-amber-600"
                              />
                              <span>Popular</span>
                            </label>

                            <button
                              type="button"
                              onClick={() => setBundleTiers(bundleTiers.filter((_, i) => i !== idx))}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                              title="Delete tier"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── Sticky Footer ───────────────────────────────────────────── */}
          <div className="sticky bottom-0 -mx-5 sm:-mx-6 -mb-5 sm:-mb-6 px-5 sm:px-6 py-3.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-extrabold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#3C6CA8] hover:bg-[#315A8E] text-white rounded-xl text-xs font-black shadow-md shadow-[#3C6CA8]/25 hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {isSaving ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving Product...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{product ? 'Update Product' : 'Create Product'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductModal;
