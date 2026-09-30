/**
 * Product Bundles — multi-product bundle offers with fixed/percentage discounts.
 * Collections: bundles, bundle_items
 * A bundle groups products+quantities at a special price, with availability
 * windows, inventory validation, and featured visibility on the storefront.
 */

import { supabase } from './supabase';
import { logAdminAction } from './audit';

export interface BundleItem {
  product_id: string;
  product_name: string;
  variation_id?: string | null;
  variation_name?: string | null;
  quantity: number;
  unit_price: number;
}

export interface Bundle {
  id?: string;
  name: string;
  slug: string;
  description: string;
  image_url: string | null;
  items: BundleItem[];
  discount_type: 'fixed' | 'percentage';
  discount_value: number;
  original_total: number;
  bundle_price: number;
  start_date: string | null;
  end_date: string | null;
  active: boolean;
  featured: boolean;
  customer_visible: boolean;
  created_at?: string;
  updated_at?: string;
}

// ─── Pricing helpers ───────────────────────────────────────────────────────────

export const computeOriginalTotal = (items: BundleItem[]): number =>
  items.reduce((sum, i) => sum + Number(i.unit_price || 0) * Number(i.quantity || 0), 0);

export const computeBundlePrice = (items: BundleItem[], discountType: 'fixed' | 'percentage', discountValue: number): {
  originalTotal: number;
  bundlePrice: number;
  discountAmount: number;
  valid: boolean;
  error?: string;
} => {
  const originalTotal = computeOriginalTotal(items);
  if (items.length === 0) return { originalTotal: 0, bundlePrice: 0, discountAmount: 0, valid: false, error: 'Add at least one product.' };
  if (discountValue < 0) return { originalTotal, bundlePrice: 0, discountAmount: 0, valid: false, error: 'Discount cannot be negative.' };
  if (discountType === 'percentage' && discountValue >= 100) {
    return { originalTotal, bundlePrice: 0, discountAmount: 0, valid: false, error: 'Percentage discount must be below 100%.' };
  }
  const discountAmount = discountType === 'percentage'
    ? originalTotal * (discountValue / 100)
    : discountValue;
  const bundlePrice = Math.max(0, originalTotal - discountAmount);
  if (bundlePrice <= 0) {
    return { originalTotal, bundlePrice: 0, discountAmount, valid: false, error: 'Bundle price must be greater than zero.' };
  }
  if (bundlePrice >= originalTotal) {
    return { originalTotal, bundlePrice, discountAmount: 0, valid: false, error: 'Bundle price must be lower than the individual product total to be a real offer.' };
  }
  return { originalTotal, bundlePrice, discountAmount, valid: true };
};

// ─── Availability & inventory validation ───────────────────────────────────────

export const isBundleActive = (bundle: Bundle): boolean => {
  if (!bundle.active) return false;
  const now = Date.now();
  if (bundle.start_date && new Date(bundle.start_date).getTime() > now) return false;
  if (bundle.end_date && new Date(bundle.end_date).getTime() < now) return false;
  return true;
};

export interface BundleStockStatus {
  inStock: boolean;
  maxQuantity: number;
  missing: string[];
}

/** Check inventory for `count` bundles: every item needs qty * count in stock. */
export const checkBundleInventory = async (bundle: Bundle, count = 1): Promise<BundleStockStatus> => {
  const missing: string[] = [];
  let maxQuantity = Infinity;

  const productIds = Array.from(new Set(bundle.items.map((i) => i.product_id)));
  for (const pid of productIds) {
    try {
      const { data: product } = await supabase
        .from('products')
        .select('id, name, stock_quantity')
        .eq('id', pid)
        .maybeSingle();
      if (!product) {
        missing.push(`Unknown product ${pid}`);
        maxQuantity = 0;
        continue;
      }
      const required = bundle.items
        .filter((i) => i.product_id === pid)
        .reduce((sum, i) => sum + Number(i.quantity || 0), 0) * count;
      const available = Number(product.stock_quantity || 0);
      if (available < required) missing.push(`${product.name || pid} (needs ${required}, has ${available})`);
      const perBundleQty = bundle.items.filter((i) => i.product_id === pid).reduce((sum, i) => sum + Number(i.quantity || 0), 0);
      if (perBundleQty > 0) maxQuantity = Math.min(maxQuantity, Math.floor(available / perBundleQty));
    } catch {
      missing.push(`Could not verify stock for ${pid}`);
      maxQuantity = 0;
    }
  }

  return { inStock: missing.length === 0, maxQuantity: maxQuantity === Infinity ? 0 : maxQuantity, missing };
};

// ─── CRUD (via Firestore adapter for consistency with the rest of the app) ─────

export const listBundles = async (activeOnly = false): Promise<Bundle[]> => {
  try {
    let q = supabase.from('bundles').select('*').order('created_at', { ascending: false });
    const { data } = await q;
    const bundles = (data || []).map(decodeBundle) as Bundle[];
    return activeOnly ? bundles.filter(isBundleActive) : bundles;
  } catch (e) {
    console.warn('[bundles] listBundles failed:', e);
    return [];
  }
};

const decodeBundle = (raw: any): Bundle => ({
  id: raw.id,
  name: raw.name || 'Untitled Bundle',
  slug: raw.slug || '',
  description: raw.description || '',
  image_url: raw.image_url || null,
  items: Array.isArray(raw.items) ? raw.items : (typeof raw.items === 'string' ? safeParseItems(raw.items) : []),
  discount_type: raw.discount_type === 'percentage' ? 'percentage' : 'fixed',
  discount_value: Number(raw.discount_value || 0),
  original_total: Number(raw.original_total || 0),
  bundle_price: Number(raw.bundle_price || 0),
  start_date: raw.start_date || null,
  end_date: raw.end_date || null,
  active: raw.active !== false,
  featured: raw.featured === true,
  customer_visible: raw.customer_visible !== false,
  created_at: raw.created_at,
  updated_at: raw.updated_at,
});

const safeParseItems = (s: string): BundleItem[] => {
  try { return JSON.parse(s); } catch { return []; }
};

export const saveBundle = async (bundle: Bundle, _adminEmail = 'admin@slimdose.ph'): Promise<{ success: boolean; id?: string; error?: string }> => {
  // Validation
  if (!bundle.name?.trim()) return { success: false, error: 'Bundle name is required.' };
  const pricing = computeBundlePrice(bundle.items, bundle.discount_type, bundle.discount_value);
  if (!pricing.valid) return { success: false, error: pricing.error };
  if (bundle.end_date && bundle.start_date && new Date(bundle.end_date) < new Date(bundle.start_date)) {
    return { success: false, error: 'End date must be after start date.' };
  }
  // Prevent overlapping full-price bundles: enforce at least one item
  if (bundle.items.some((i) => !i.product_id || Number(i.quantity) <= 0)) {
    return { success: false, error: 'Every bundle item needs a product and quantity.' };
  }

  const payload = {
    name: bundle.name.trim(),
    slug: bundle.slug || bundle.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
    description: bundle.description || '',
    image_url: bundle.image_url || null,
    items: bundle.items,
    discount_type: bundle.discount_type,
    discount_value: bundle.discount_value,
    original_total: pricing.originalTotal,
    bundle_price: pricing.bundlePrice,
    start_date: bundle.start_date || null,
    end_date: bundle.end_date || null,
    active: bundle.active,
    featured: bundle.featured,
    customer_visible: bundle.customer_visible,
    updated_at: new Date().toISOString(),
  };

  try {
    if (bundle.id) {
      await supabase.from('bundles').update(payload).eq('id', bundle.id);
      await logAdminAction('bundle_updated', { module: 'bundles', record_id: bundle.id, after: payload });
      return { success: true, id: bundle.id };
    } else {
      const now = new Date().toISOString();
      const docId = `bundle_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      const { data, error } = await supabase
        .from('bundles')
        .insert([{ ...payload, id: docId, created_at: now }])
        .select()
        .single();
      if (error) throw error;
      const newId = (data as any)?.id || docId;
      await logAdminAction('bundle_created', { module: 'bundles', record_id: newId, after: payload });
      return { success: true, id: newId };
    }
  } catch (e: any) {
    console.error('[bundles] saveBundle failed:', e);
    return { success: false, error: e?.message || 'Failed to save bundle.' };
  }
};

export const deleteBundle = async (bundleId: string): Promise<boolean> => {
  try {
    await supabase.from('bundles').delete().eq('id', bundleId);
    await logAdminAction('bundle_deleted', { module: 'bundles', record_id: bundleId });
    return true;
  } catch (e) {
    console.error('[bundles] deleteBundle failed:', e);
    return false;
  }
};

export const setBundleActive = async (bundleId: string, active: boolean): Promise<boolean> => {
  try {
    await supabase.from('bundles').update({ active, updated_at: new Date().toISOString() }).eq('id', bundleId);
    await logAdminAction(active ? 'bundle_activated' : 'bundle_deactivated', { module: 'bundles', record_id: bundleId });
    return true;
  } catch {
    return false;
  }
};

// ─── Storefront helpers ────────────────────────────────────────────────────────

/** Fetch active, customer-visible bundles with products resolved for cart use */
export const fetchStorefrontBundles = async (products: any[]): Promise<Bundle[]> => {
  const bundles = await listBundles(true);
  const visible = bundles.filter((b) => b.customer_visible && b.items.length > 0);

  // Resolve current product prices/stock for display & validation
  const productMap = new Map(products.map((p) => [p.id, p]));
  return visible
    .map((b) => ({
      ...b,
      items: b.items.map((i) => {
        const product = productMap.get(i.product_id);
        return {
          ...i,
          product_name: product?.name || i.product_name,
          unit_price: product ? (product.discount_active && product.discount_price != null ? product.discount_price : product.base_price) : i.unit_price,
        };
      }),
    }))
    .filter((b) => b.items.every((i) => productMap.has(i.product_id)));
};
