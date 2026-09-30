/**
 * Shared helpers for the public order-tracking mirror (orderTracking.js).
 * Imported by both the Firestore trigger and the scheduled safety-net sweep.
 */

import { FieldValue } from 'firebase-admin/firestore';

const toMillis = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
};

const mapItems = (data) => {
  const raw = Array.isArray(data.order_items)
    ? data.order_items
    : Array.isArray(data.items)
      ? data.items
      : [];
  return raw.map((i) => ({
    name: String(i.product_name || i.name || i.product?.name || 'Item'),
    quantity: Number(i.quantity || 1),
  }));
};

/** Build the sanitized public snapshot from a raw order document. */
export const buildTrackingSnapshot = (orderId, data) => ({
  order_number: String(data.order_number || orderId || ''),
  order_status: String(data.order_status || 'new'),
  payment_status: String(data.payment_status || 'pending'),
  payment_method_name: data.payment_method_name ? String(data.payment_method_name) : null,
  items: mapItems(data),
  total_price: Number(data.total_price || 0),
  shipping_fee: Number(data.shipping_fee || 0),
  shipping_location: data.shipping_location ? String(data.shipping_location) : null,
  shipping_city: data.shipping_city ? String(data.shipping_city) : null,
  shipping_barangay: data.shipping_barangay ? String(data.shipping_barangay) : null,
  shipping_zip_code: data.shipping_zip_code ? String(data.shipping_zip_code) : null,
  tracking_number: data.tracking_number ? String(data.tracking_number) : null,
  tracking_courier:
    data.tracking_courier || data.courier_name
      ? String(data.tracking_courier || data.courier_name)
      : null,
  tracking_url_template: data.tracking_url_template ? String(data.tracking_url_template) : null,
  shipping_provider: data.shipping_provider ? String(data.shipping_provider) : null,
  shipping_note: data.shipping_note ? String(data.shipping_note) : null,
  created_at: toMillis(data.created_at) || Date.now(),
  updated_at: toMillis(data.updated_at) || Date.now(),
  public_updated_at: FieldValue.serverTimestamp(),
});

/** Keep order-number keys Firestore-safe. */
export const safeKey = (raw) => String(raw || '')
  .trim()
  .replace(/[/\\]/g, '-')
  .slice(0, 300);
