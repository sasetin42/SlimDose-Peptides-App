// Fire-and-forget Convex mirror.
//
// Supabase is the source of truth. After every successful write to Supabase
// we invoke the matching Convex mutation here so a copy of the data lives in
// the Convex deployment as a backup. Failures are logged but never bubble up
// to the user-facing flow.
//
// Reads are NOT mirrored — components/hooks read from Supabase directly.

import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../convex/_generated/api';

const url =
  (import.meta.env.VITE_CONVEX_URL as string | undefined) ||
  'https://blessed-cuttlefish-644.convex.cloud';

const client = new ConvexHttpClient(url);

function fire<T>(label: string, fn: () => Promise<T>): void {
  fn().catch((err) => {
    console.warn(`[Convex mirror] ${label} failed:`, err);
  });
}

// ---------- categories ----------
export function mirrorCategoryCreate(data: {
  id: string;
  name: string;
  icon: string;
  sort_order?: number;
  active?: boolean;
}) {
  fire('category.create', () => client.mutation(api.categories.create, data));
}

export function mirrorCategoryUpdate(id: string, updates: Partial<{
  name: string;
  icon: string;
  sort_order: number;
  active: boolean;
}>) {
  fire('category.update', () => client.mutation(api.categories.update, { id, ...updates }));
}

export function mirrorCategoryDelete(id: string) {
  fire('category.remove', () => client.mutation(api.categories.remove, { id }));
}

// ---------- products / variations ----------
export function mirrorProductCreate(data: any) {
  // Convex's products.create generates its own id, so we can't preserve the
  // Supabase UUID here without altering the schema. We still send a copy.
  fire('product.create', () =>
    client.mutation(api.products.create, sanitizeProduct(data)),
  );
}

export function mirrorProductUpdate(id: string, updates: any) {
  fire('product.update', () =>
    client.mutation(api.products.update, { id, ...sanitizeProduct(updates) }),
  );
}

export function mirrorProductDelete(id: string) {
  fire('product.remove', () => client.mutation(api.products.remove, { id }));
}

export function mirrorProductAdjustStock(id: string, stock_quantity: number) {
  fire('product.adjustStock', () =>
    client.mutation(api.products.adjustStock, { id, stock_quantity }),
  );
}

function sanitizeProduct(data: any): any {
  const out: any = {};
  const fields = [
    'name', 'description', 'category', 'base_price', 'discount_price',
    'discount_start_date', 'discount_end_date', 'discount_active',
    'purity_percentage', 'molecular_weight', 'cas_number', 'sequence',
    'storage_conditions', 'inclusions', 'stock_quantity', 'available',
    'featured', 'image_url', 'safety_sheet_url',
  ];
  for (const k of fields) if (k in data) out[k] = data[k];
  return out;
}

export function mirrorVariationCreate(data: any) {
  fire('variation.create', () =>
    client.mutation(api.productVariations.create, {
      product_id: data.product_id,
      name: data.name,
      quantity_mg: Number(data.quantity_mg) || 0,
      price: Number(data.price) || 0,
      discount_price: data.discount_price ?? null,
      discount_active: data.discount_active,
      stock_quantity: data.stock_quantity,
    }),
  );
}

export function mirrorVariationUpdate(id: string, updates: any) {
  fire('variation.update', () =>
    client.mutation(api.productVariations.update, { id, ...updates }),
  );
}

export function mirrorVariationDelete(id: string) {
  fire('variation.remove', () => client.mutation(api.productVariations.remove, { id }));
}

export function mirrorVariationAdjustStock(id: string, stock_quantity: number) {
  fire('variation.adjustStock', () =>
    client.mutation(api.productVariations.adjustStock, { id, stock_quantity }),
  );
}

// ---------- payment methods ----------
export function mirrorPaymentMethodCreate(data: any) {
  fire('paymentMethod.create', () => client.mutation(api.paymentMethods.create, data));
}

export function mirrorPaymentMethodUpdate(id: string, updates: any) {
  fire('paymentMethod.update', () =>
    client.mutation(api.paymentMethods.update, { id, ...updates }),
  );
}

export function mirrorPaymentMethodDelete(id: string) {
  fire('paymentMethod.remove', () => client.mutation(api.paymentMethods.remove, { id }));
}

// ---------- shipping locations ----------
export function mirrorShippingLocationCreate(data: any) {
  fire('shippingLocation.create', () =>
    client.mutation(api.shippingLocations.create, {
      id: data.id,
      name: data.name,
      fee: Number(data.fee) || 0,
      is_active: data.is_active,
      order_index: data.order_index,
    }),
  );
}

export function mirrorShippingLocationUpdate(id: string, updates: any) {
  fire('shippingLocation.update', () =>
    client.mutation(api.shippingLocations.update, {
      id,
      ...(updates.name !== undefined && { name: updates.name }),
      ...(updates.fee !== undefined && { fee: Number(updates.fee) }),
      ...(updates.is_active !== undefined && { is_active: updates.is_active }),
      ...(updates.order_index !== undefined && { order_index: updates.order_index }),
    }),
  );
}

export function mirrorShippingLocationDelete(id: string) {
  fire('shippingLocation.remove', () =>
    client.mutation(api.shippingLocations.remove, { id }),
  );
}

// ---------- site settings ----------
export function mirrorSiteSettingUpsert(id: string, value: string, type?: string) {
  fire('siteSettings.upsert', () =>
    client.mutation(api.siteSettings.upsert, { id, value, type }),
  );
}

export function mirrorSiteSettingsUpsertMany(
  items: Array<{ id: string; value: string; type?: string }>,
) {
  fire('siteSettings.upsertMany', () =>
    client.mutation(api.siteSettings.upsertMany, { items }),
  );
}

// ---------- COA reports ----------
export function mirrorCoaReportCreate(data: any) {
  fire('coaReport.create', () =>
    client.mutation(api.coaReports.create, {
      product_name: data.product_name,
      batch: data.batch,
      test_date: data.test_date,
      purity_percentage:
        data.purity_percentage == null ? null : Number(data.purity_percentage),
      quantity: data.quantity,
      task_number: data.task_number,
      verification_key: data.verification_key,
      image_url: data.image_url,
      featured: data.featured,
      manufacturer: data.manufacturer,
      laboratory: data.laboratory,
    }),
  );
}

export function mirrorCoaReportUpdate(id: string, updates: any) {
  fire('coaReport.update', () =>
    client.mutation(api.coaReports.update, {
      id,
      product_name: updates.product_name ?? '',
      batch: updates.batch,
      test_date: updates.test_date,
      purity_percentage:
        updates.purity_percentage == null ? null : Number(updates.purity_percentage),
      quantity: updates.quantity,
      task_number: updates.task_number,
      verification_key: updates.verification_key,
      image_url: updates.image_url,
      featured: updates.featured,
      manufacturer: updates.manufacturer,
      laboratory: updates.laboratory,
    }),
  );
}

export function mirrorCoaReportDelete(id: string) {
  fire('coaReport.remove', () => client.mutation(api.coaReports.remove, { id }));
}

// ---------- promo codes ----------
export function mirrorPromoCreate(data: any) {
  fire('promo.create', () =>
    client.mutation(api.promoCodes.create, {
      code: (data.code ?? '').toUpperCase(),
      discount_type: data.discount_type,
      discount_value: Number(data.discount_value) || 0,
      min_purchase_amount: Number(data.min_purchase_amount) || 0,
      max_discount_amount: data.max_discount_amount ?? null,
      start_date: data.start_date ?? null,
      end_date: data.end_date ?? null,
      usage_limit: data.usage_limit ?? null,
      active: data.active,
    }),
  );
}

export function mirrorPromoUpdate(id: string, updates: any) {
  fire('promo.update', () => client.mutation(api.promoCodes.update, { id, ...updates }));
}

export function mirrorPromoDelete(id: string) {
  fire('promo.remove', () => client.mutation(api.promoCodes.remove, { id }));
}

export function mirrorPromoSetActive(id: string, active: boolean) {
  fire('promo.setActive', () => client.mutation(api.promoCodes.setActive, { id, active }));
}

export function mirrorPromoIncrementUsage(id: string) {
  fire('promo.incrementUsage', () =>
    client.mutation(api.promoCodes.incrementUsage, { id }),
  );
}

// ---------- FAQs ----------
export function mirrorFaqCreate(data: any) {
  fire('faq.create', () =>
    client.mutation(api.faqs.create, {
      question: data.question,
      answer: data.answer,
      category: data.category,
      order_index: data.order_index,
      is_active: data.is_active,
    }),
  );
}

export function mirrorFaqUpdate(id: string, updates: any) {
  fire('faq.update', () => client.mutation(api.faqs.update, { id, ...updates }));
}

export function mirrorFaqDelete(id: string) {
  fire('faq.remove', () => client.mutation(api.faqs.remove, { id }));
}

// ---------- guide_topics ----------
export function mirrorGuideCreate(data: any) {
  fire('guide.create', () =>
    client.mutation(api.guideTopics.create, {
      title: data.title,
      preview: data.preview ?? null,
      content: data.content,
      cover_image: data.cover_image ?? null,
      author: data.author,
      published_date: data.published_date,
      display_order: data.display_order,
      is_enabled: data.is_enabled,
      related_product_ids: data.related_product_ids ?? [],
    }),
  );
}

export function mirrorGuideUpdate(id: string, updates: any) {
  fire('guide.update', () =>
    client.mutation(api.guideTopics.update, { id, ...updates }),
  );
}

export function mirrorGuideDelete(id: string) {
  fire('guide.remove', () => client.mutation(api.guideTopics.remove, { id }));
}

export function mirrorGuideSetEnabled(id: string, is_enabled: boolean) {
  fire('guide.setEnabled', () =>
    client.mutation(api.guideTopics.setEnabled, { id, is_enabled }),
  );
}

// ---------- global discounts ----------
export function mirrorDiscountCreate(data: any) {
  fire('discount.create', () =>
    client.mutation(api.globalDiscounts.create, {
      name: data.name ?? '',
      discount_type: data.discount_type ?? 'percentage',
      discount_value: Number(data.discount_value) || 0,
      active: data.active,
      start_date: data.start_date ?? null,
      end_date: data.end_date ?? null,
      excluded_product_ids: data.excluded_product_ids ?? [],
    }),
  );
}

export function mirrorDiscountUpdate(id: string, updates: any) {
  fire('discount.update', () =>
    client.mutation(api.globalDiscounts.update, { id, ...updates }),
  );
}

export function mirrorDiscountDelete(id: string) {
  fire('discount.remove', () => client.mutation(api.globalDiscounts.remove, { id }));
}

export function mirrorDiscountSetActive(id: string, active: boolean) {
  fire('discount.setActive', () =>
    client.mutation(api.globalDiscounts.setActive, { id, active }),
  );
}

// ---------- orders ----------
export function mirrorOrderCreate(data: any) {
  fire('order.create', () =>
    client.mutation(api.orders.create, {
      customer_name: data.customer_name,
      customer_email: data.customer_email,
      customer_phone: data.customer_phone,
      contact_method: data.contact_method ?? undefined,
      shipping_address: data.shipping_address,
      shipping_city: data.shipping_city,
      shipping_state: data.shipping_state,
      shipping_zip_code: data.shipping_zip_code,
      shipping_country: data.shipping_country,
      shipping_barangay: data.shipping_barangay,
      shipping_region: data.shipping_region,
      shipping_location: data.shipping_location,
      shipping_fee: Number(data.shipping_fee ?? 0),
      order_items: data.order_items,
      subtotal: Number(data.subtotal ?? 0),
      total_price: Number(data.total_price ?? 0),
      pricing_mode: data.pricing_mode,
      payment_method_id: data.payment_method_id,
      payment_method_name: data.payment_method_name,
      payment_proof_url: data.payment_proof_url,
      promo_code_id: data.promo_code_id ?? null,
      promo_code: data.promo_code ?? null,
      discount_applied: data.discount_applied ?? null,
      notes: data.notes,
    }),
  );
}

export function mirrorOrderUpdateStatus(
  id: string,
  updates: { order_status?: string; payment_status?: string },
) {
  fire('order.updateStatus', () =>
    client.mutation(api.orders.updateStatus, { id, ...updates }),
  );
}

export function mirrorOrderUpdateTracking(
  id: string,
  updates: { tracking_number?: string; shipping_note?: string },
) {
  fire('order.updateTracking', () =>
    client.mutation(api.orders.updateTracking, { id, ...updates }),
  );
}

export function mirrorOrderUpdateDetails(id: string, updates: any) {
  fire('order.updateDetails', () =>
    client.mutation(api.orders.updateDetails, { id, ...updates }),
  );
}
