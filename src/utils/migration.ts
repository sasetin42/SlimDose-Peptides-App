/**
 * SlimDose Migration Framework
 * CSV/JSON parsing, field mapping, duplicate detection, and record
 * normalization for importing Customers, Products, Orders, and Categories
 * from an old website export into the Firestore-backed store.
 */

import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { generateUniqueOrderNumber, normalizeToSdp } from './orderUtils';
import { slugify } from './slugify';

// Module-level order fingerprint cache (resets each page session — combined with DB keys, sufficient for dedupe)
const orderFingerprints = new Set<string>();

// ─── Parsing ───────────────────────────────────────────────────────────────────

export interface ParsedFile {
  rows: Record<string, any>[];
  format: 'csv' | 'json';
  columns: string[];
}

export const parseCsv = (text: string): Record<string, any>[] => {
  const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') inQuotes = false;
        else cur += ch;
      } else {
        if (ch === '"') inQuotes = true;
        else if (ch === ',') { out.push(cur); cur = ''; }
        else cur += ch;
      }
    }
    out.push(cur);
    return out;
  };

  const headers = parseLine(lines[0]).map((h) => h.trim());
  const rows: Record<string, any>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const row: Record<string, any> = {};
    headers.forEach((h, idx) => { row[h] = values[idx] ?? ''; });
    rows.push(row);
  }
  return rows;
};

export const parseJsonFile = (text: string): Record<string, any>[] => {
  const parsed = JSON.parse(text);
  if (Array.isArray(parsed)) return parsed;
  // Common wrapper keys
  for (const key of ['data', 'rows', 'items', 'records', 'orders', 'customers', 'products', 'categories']) {
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed[key])) return parsed[key];
  }
  // Firestore-style export: { docId: { ...fields } }
  if (parsed && typeof parsed === 'object') {
    return Object.entries(parsed).map(([id, fields]: [string, any]) => ({ id, ...(fields || {}) }));
  }
  return [];
};

export const parseUpload = async (file: File): Promise<ParsedFile> => {
  const text = await file.text();
  const name = file.name.toLowerCase();
  if (name.endsWith('.json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
    const rows = parseJsonFile(text);
    const columns = Array.from(new Set(rows.flatMap((r) => Object.keys(r || {}))));
    return { rows, format: 'json', columns };
  }
  const rows = parseCsv(text);
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
  return { rows, format: 'csv', columns };
};

// ─── Duplicate detection ───────────────────────────────────────────────────────

export type ConflictStrategy = 'skip' | 'update' | 'insert';

export interface DuplicateCheckSets {
  customerEmails: Set<string>;
  customerPhones: Set<string>;
  customerIds: Set<string>;
  productSkus: Set<string>;
  productSlugs: Set<string>;
  productIds: Set<string>;
  categorySlugs: Set<string>;
  categoryNames: Set<string>;
  categoryIds: Set<string>;
  orderNumbers: Set<string>;
  orderSourceIds: Set<string>;
}

export const loadExistingKeys = async (): Promise<DuplicateCheckSets> => {
  const [cust, prod, cat, ord] = await Promise.all([
    getDocs(collection(db, 'customers')),
    getDocs(collection(db, 'products')),
    getDocs(collection(db, 'categories')),
    getDocs(collection(db, 'orders')),
  ]);

  const sets: DuplicateCheckSets = {
    customerEmails: new Set(), customerPhones: new Set(), customerIds: new Set(),
    productSkus: new Set(), productSlugs: new Set(), productIds: new Set(),
    categorySlugs: new Set(), categoryNames: new Set(), categoryIds: new Set(),
    orderNumbers: new Set(), orderSourceIds: new Set(),
  };

  cust.docs.forEach((d: any) => {
    const c = d.data() as any;
    sets.customerIds.add(d.id);
    if (c.email) sets.customerEmails.add(String(c.email).toLowerCase().trim());
    if (c.phone) sets.customerPhones.add(String(c.phone).replace(/[^0-9]/g, ''));
  });
  prod.docs.forEach((d: any) => {
    const p = d.data() as any;
    sets.productIds.add(d.id);
    if (p.sku) sets.productSkus.add(String(p.sku).toUpperCase().trim());
    if (p.slug) sets.productSlugs.add(String(p.slug).toLowerCase().trim());
  });
  cat.docs.forEach((d: any) => {
    const c = d.data() as any;
    sets.categoryIds.add(d.id);
    if (c.slug) sets.categorySlugs.add(String(c.slug).toLowerCase().trim());
    if (c.name) sets.categoryNames.add(String(c.name).toLowerCase().trim());
  });
  ord.docs.forEach((d: any) => {
    const o = d.data() as any;
    sets.orderNumbers.add(d.id);
    if (o.order_number) sets.orderNumbers.add(String(o.order_number).toUpperCase().trim());
    if (o.source_order_id) sets.orderSourceIds.add(String(o.source_order_id).toUpperCase().trim());
  });

  return sets;
};

export interface RecordResult {
  row: number;
  action: 'imported' | 'updated' | 'skipped' | 'duplicate' | 'failed';
  id?: string;
  ref?: string;
  reason?: string;
}

// ─── Normalizers ───────────────────────────────────────────────────────────────

const num = (v: any): number => {
  if (v === null || v === undefined || v === '') return 0;
  const n = Number(String(v).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

const pick = (row: Record<string, any>, keys: string[]): any => {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') return row[k];
  }
  return undefined;
};

const bool = (v: any): boolean => {
  const s = String(v ?? '').toLowerCase().trim();
  return s === 'true' || s === '1' || s === 'yes' || s === 'y' || s === 'active';
};

// ─── Importers ─────────────────────────────────────────────────────────────────

export interface ImportContext {
  sets: DuplicateCheckSets;
  strategy: ConflictStrategy;
  writeDoc: (collectionName: string, docId: string | null, data: any) => Promise<string | null>;
  log: (msg: string) => void;
}

export const normalizeCustomerRow = (row: Record<string, any>) => ({
  full_name: String(pick(row, ['full_name', 'name', 'customer_name', 'Full Name', 'Name']) || '').trim(),
  email: String(pick(row, ['email', 'customer_email', 'Email']) || '').toLowerCase().trim(),
  phone: String(pick(row, ['phone', 'customer_phone', 'Phone', 'mobile']) || '').trim(),
  shipping_address: String(pick(row, ['shipping_address', 'address', 'Address', 'street']) || '').trim(),
  shipping_city: String(pick(row, ['shipping_city', 'city', 'City']) || '').trim(),
  shipping_state: String(pick(row, ['shipping_state', 'state', 'province', 'State']) || '').trim(),
  shipping_zip_code: String(pick(row, ['shipping_zip_code', 'zip', 'postal_code', 'Zip']) || '').trim(),
  source_system: 'old_website',
  source_id: String(pick(row, ['id', 'customer_id', 'ID']) || ''),
});

export const importCustomers = async (rows: Record<string, any>[], ctx: ImportContext): Promise<RecordResult[]> => {
  const results: RecordResult[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const c = normalizeCustomerRow(row);
      if (!c.email && !c.phone) {
        results.push({ row: i + 2, action: 'failed', reason: 'No email or phone found' });
        continue;
      }
      const emailKey = c.email;
      const phoneKey = c.phone.replace(/[^0-9]/g, '');
      const isDup = (emailKey && ctx.sets.customerEmails.has(emailKey)) ||
                    (phoneKey && ctx.sets.customerPhones.has(phoneKey));
      const isKnown = (c.source_id && ctx.sets.customerIds.has(c.source_id));

      if (isDup || isKnown) {
        if (ctx.strategy === 'skip') {
          results.push({ row: i + 2, action: 'duplicate', ref: emailKey, reason: 'Already exists' });
          continue;
        }
        if (ctx.strategy === 'update' && emailKey) {
          const id = await ctx.writeDoc('customers', emailKey, c);
          results.push({ row: i + 2, action: 'updated', id: id || emailKey, ref: emailKey });
          continue;
        }
        if (ctx.strategy === 'insert') {
          const id = await ctx.writeDoc('customers', null, c);
          results.push({ row: i + 2, action: 'imported', id: id || undefined, ref: emailKey });
          continue;
        }
      }

      const id = await ctx.writeDoc('customers', emailKey || null, c);
      if (emailKey) ctx.sets.customerEmails.add(emailKey);
      if (phoneKey) ctx.sets.customerPhones.add(phoneKey);
      results.push({ row: i + 2, action: 'imported', id: id || undefined, ref: emailKey });
    } catch (e: any) {
      results.push({ row: i + 2, action: 'failed', reason: e?.message || 'Unknown error' });
    }
  }
  return results;
};

export const normalizeProductRow = (row: Record<string, any>) => {
  const name = String(pick(row, ['name', 'product_name', 'Name', 'title']) || '').trim();
  const sku = String(pick(row, ['sku', 'SKU', 'product_sku']) || '').trim();
  const slugRaw = String(pick(row, ['slug', 'Slug']) || name);
  return {
    name,
    sku: sku || null,
    slug: slugify(slugRaw || name),
    description: String(pick(row, ['description', 'Description', 'body_html']) || '').trim(),
    category: String(pick(row, ['category', 'category_id', 'Category', 'product_type']) || '').trim(),
    base_price: num(pick(row, ['base_price', 'price', 'Price', 'regular_price'])),
    raw_price: num(pick(row, ['raw_price', 'cost_price', 'cost', 'Cost'])),
    discount_price: pick(row, ['discount_price', 'sale_price']) != null ? num(pick(row, ['discount_price', 'sale_price'])) : null,
    discount_active: bool(pick(row, ['discount_active', 'on_sale'])),
    stock_quantity: num(pick(row, ['stock_quantity', 'stock', 'inventory_quantity', 'Stock'])),
    available: pick(row, ['available', 'status', 'published']) != null
      ? (bool(pick(row, ['available'])) || String(pick(row, ['status', 'published'])).toLowerCase() === 'active' || bool(pick(row, ['published'])))
      : true,
    featured: bool(pick(row, ['featured'])),
    image_url: String(pick(row, ['image_url', 'image', 'image_src', 'featured_image']) || '') || null,
    created_at: String(pick(row, ['created_at', 'created']) || new Date().toISOString()),
    updated_at: new Date().toISOString(),
    source_system: 'old_website',
    source_id: String(pick(row, ['id', 'product_id', 'ID']) || ''),
  };
};

export const importProducts = async (rows: Record<string, any>[], ctx: ImportContext): Promise<RecordResult[]> => {
  const results: RecordResult[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const p = normalizeProductRow(row);
      if (!p.name) {
        results.push({ row: i + 2, action: 'failed', reason: 'Missing product name' });
        continue;
      }
      const skuKey = p.sku ? String(p.sku).toUpperCase().trim() : '';
      const slugKey = p.slug.toLowerCase().trim();
      const isDup = (skuKey && ctx.sets.productSkus.has(skuKey)) ||
                    (p.source_id && ctx.sets.productIds.has(p.source_id)) ||
                    (slugKey && ctx.sets.productSlugs.has(slugKey));

      if (isDup && ctx.strategy === 'skip') {
        results.push({ row: i + 2, action: 'duplicate', ref: p.name, reason: 'SKU/slug/ID already exists' });
        continue;
      }

      let docId: string | null = null;
      if (isDup && ctx.strategy === 'update') {
        docId = p.source_id || skuKey || slugKey || null;
      }

      const id = await ctx.writeDoc('products', docId, p);
      if (skuKey) ctx.sets.productSkus.add(skuKey);
      if (slugKey) ctx.sets.productSlugs.add(slugKey);
      if (p.source_id) ctx.sets.productIds.add(p.source_id);
      results.push({ row: i + 2, action: isDup && ctx.strategy === 'update' ? 'updated' : 'imported', id: id || undefined, ref: p.name });
    } catch (e: any) {
      results.push({ row: i + 2, action: 'failed', reason: e?.message || 'Unknown error' });
    }
  }
  return results;
};

export const normalizeCategoryRow = (row: Record<string, any>) => {
  const name = String(pick(row, ['name', 'category_name', 'Name', 'title']) || '').trim();
  const slugRaw = String(pick(row, ['slug', 'Slug', 'handle']) || name);
  return {
    name,
    slug: slugify(slugRaw || name),
    icon: String(pick(row, ['icon', 'Icon']) || '🔬'),
    parent_id: String(pick(row, ['parent_id', 'parent', 'parent_category']) || '') || null,
    description: String(pick(row, ['description', 'Description']) || ''),
    seo_title: String(pick(row, ['seo_title', 'meta_title']) || ''),
    seo_description: String(pick(row, ['seo_description', 'meta_description']) || ''),
    seo_keywords: String(pick(row, ['seo_keywords', 'meta_keywords']) || ''),
    sort_order: num(pick(row, ['sort_order', 'display_order', 'order', 'position'])),
    active: pick(row, ['active', 'is_active', 'status']) != null ? bool(pick(row, ['active', 'is_active'])) || String(pick(row, ['status'])).toLowerCase() === 'active' : true,
    source_system: 'old_website',
    source_id: String(pick(row, ['id', 'category_id', 'ID']) || ''),
  };
};

export const importCategories = async (rows: Record<string, any>[], ctx: ImportContext): Promise<RecordResult[]> => {
  const results: RecordResult[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const c = normalizeCategoryRow(row);
      if (!c.name) {
        results.push({ row: i + 2, action: 'failed', reason: 'Missing category name' });
        continue;
      }
      const slugKey = c.slug.toLowerCase().trim();
      const isDup = (c.source_id && ctx.sets.categoryIds.has(c.source_id)) ||
                    (slugKey && ctx.sets.categorySlugs.has(slugKey)) ||
                    (c.name.toLowerCase().trim() && ctx.sets.categoryNames.has(c.name.toLowerCase().trim()));

      if (isDup && ctx.strategy === 'skip') {
        results.push({ row: i + 2, action: 'duplicate', ref: c.name, reason: 'Slug/name/ID already exists' });
        continue;
      }

      let docId: string | null = c.source_id || null;
      if (isDup && ctx.strategy === 'update' && !docId) docId = slugKey;

      const id = await ctx.writeDoc('categories', docId, c);
      if (slugKey) ctx.sets.categorySlugs.add(slugKey);
      if (c.name) ctx.sets.categoryNames.add(c.name.toLowerCase().trim());
      results.push({ row: i + 2, action: isDup && ctx.strategy === 'update' ? 'updated' : 'imported', id: id || undefined, ref: c.name });
    } catch (e: any) {
      results.push({ row: i + 2, action: 'failed', reason: e?.message || 'Unknown error' });
    }
  }
  return results;
};

export const normalizeOrderRow = (row: Record<string, any>) => {
  const itemsRaw = pick(row, ['order_items', 'items', 'line_items', 'products']);
  let orderItems: any[] = [];
  if (Array.isArray(itemsRaw)) {
    orderItems = itemsRaw;
  } else if (typeof itemsRaw === 'string' && itemsRaw.trim()) {
    try {
      const parsed = JSON.parse(itemsRaw);
      if (Array.isArray(parsed)) orderItems = parsed;
    } catch {
      // Line-format: "2x Product A; 1x Product B"
      orderItems = itemsRaw.split(';').map((chunk) => {
        const m = chunk.trim().match(/^(\d+)\s*x\s*(.+)$/i);
        if (m) return { product_name: m[2].trim(), quantity: num(m[1]), price: 0, total: 0 };
        return { product_name: chunk.trim(), quantity: 1, price: 0, total: 0 };
      });
    }
  }
  orderItems = orderItems.map((item) => ({
    product_id: String(item.product_id || item.sku || '') || null,
    product_name: String(item.product_name || item.name || item.title || 'Product'),
    variation_name: item.variation_name || item.variant || null,
    quantity: num(item.quantity ?? item.qty) || 1,
    price: num(item.price ?? item.unit_price),
    total: num(item.total ?? (Number(item.price || item.unit_price || 0) * Number(item.quantity ?? item.qty ?? 1))),
  }));

  const sourceOrderId = String(pick(row, ['source_order_id', 'old_order_id', 'id', 'order_id', 'Order ID']) || '');
  const orderNumberRaw = String(pick(row, ['order_number', 'number', 'reference']) || sourceOrderId);

  return {
    order_number: normalizeToSdp(orderNumberRaw || generateUniqueOrderNumber()),
    customer_name: String(pick(row, ['customer_name', 'name', 'Name', 'billing name']) || '').trim(),
    customer_email: String(pick(row, ['customer_email', 'email', 'Email']) || '').toLowerCase().trim(),
    customer_phone: String(pick(row, ['customer_phone', 'phone', 'Phone']) || '').trim(),
    shipping_address: String(pick(row, ['shipping_address', 'address', 'Address']) || '').trim(),
    shipping_barangay: String(pick(row, ['shipping_barangay', 'barangay']) || '') || null,
    shipping_city: String(pick(row, ['shipping_city', 'city', 'City']) || '').trim(),
    shipping_state: String(pick(row, ['shipping_state', 'state', 'province']) || '').trim(),
    shipping_zip_code: String(pick(row, ['shipping_zip_code', 'zip', 'postal']) || '').trim(),
    shipping_location: String(pick(row, ['shipping_location']) || '') || null,
    shipping_fee: num(pick(row, ['shipping_fee', 'shipping', 'Shipping'])),
    order_items: orderItems,
    subtotal: num(pick(row, ['subtotal', 'Subtotal'])),
    total_price: num(pick(row, ['total_price', 'total', 'Total', 'grand_total'])),
    payment_method_name: String(pick(row, ['payment_method_name', 'payment_method', 'Payment Method']) || '') || null,
    payment_status: String(pick(row, ['payment_status', 'financial_status']) || 'pending').toLowerCase(),
    order_status: String(pick(row, ['order_status', 'status', 'fulfillment_status']) || 'new').toLowerCase(),
    tracking_number: String(pick(row, ['tracking_number', 'tracking']) || '') || null,
    tracking_courier: String(pick(row, ['tracking_courier', 'courier']) || '') || null,
    notes: String(pick(row, ['notes', 'note', 'customer_note']) || '') || null,
    admin_notes: String(pick(row, ['admin_notes']) || '') || null,
    source_system: 'old_website',
    source_order_id: sourceOrderId,
    created_at: String(pick(row, ['created_at', 'date', 'Date', 'order_date']) || new Date().toISOString()),
    updated_at: new Date().toISOString(),
  };
};

export const importOrders = async (rows: Record<string, any>[], ctx: ImportContext): Promise<RecordResult[]> => {
  const results: RecordResult[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const o = normalizeOrderRow(row);
      if (!o.order_items.length && !o.total_price) {
        results.push({ row: i + 2, action: 'failed', reason: 'Order has no items or total' });
        continue;
      }
      if (!o.customer_name && !o.customer_email) {
        results.push({ row: i + 2, action: 'failed', reason: 'Order has no customer identification' });
        continue;
      }

      const numKey = String(o.order_number).toUpperCase().trim();
      const sourceKey = String(o.source_order_id || '').toUpperCase().trim();

      // Duplicate detection: source_order_id → order_number → customer+date+total fallback
      let dupReason: string | null = null;
      if (sourceKey && ctx.sets.orderSourceIds.has(sourceKey)) dupReason = 'source_order_id exists';
      else if (ctx.sets.orderNumbers.has(numKey)) dupReason = 'order_number exists';

      if (!dupReason && o.customer_email && o.created_at) {
        const fingerprint = `${o.customer_email}|${String(o.created_at).slice(0, 10)}|${o.total_price}`;
        if (orderFingerprints.has(fingerprint)) dupReason = 'customer+date+total match';
        else orderFingerprints.add(fingerprint);
      }

      if (dupReason) {
        if (ctx.strategy === 'skip') {
          results.push({ row: i + 2, action: 'duplicate', ref: numKey, reason: dupReason });
          continue;
        }
        if (ctx.strategy === 'update') {
          const docId = sourceKey || numKey;
          const id = await ctx.writeDoc('orders', docId, o);
          results.push({ row: i + 2, action: 'updated', id: id || docId, ref: numKey });
          continue;
        }
      }

      const docId = ctx.strategy === 'insert' ? null : (sourceKey || numKey);
      const id = await ctx.writeDoc('orders', docId, o);
      ctx.sets.orderNumbers.add(numKey);
      if (sourceKey) ctx.sets.orderSourceIds.add(sourceKey);
      results.push({ row: i + 2, action: 'imported', id: id || undefined, ref: numKey });
    } catch (e: any) {
      results.push({ row: i + 2, action: 'failed', reason: e?.message || 'Unknown error' });
    }
  }
  return results;
};
