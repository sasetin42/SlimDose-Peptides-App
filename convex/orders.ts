import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { findByUuid, fromNum, newId, nowIso, toNum } from "./_lib";

function decode(row: any) {
  if (!row) return row;
  const { _id, _creationTime, ...rest } = row;
  return {
    ...rest,
    subtotal: toNum(rest.subtotal),
    total_price: toNum(rest.total_price) ?? 0,
    shipping_fee: toNum(rest.shipping_fee),
    discount_applied: toNum(rest.discount_applied),
    order_items: (() => {
      if (!rest.order_items) return [];
      if (typeof rest.order_items !== "string") return rest.order_items;
      try {
        return JSON.parse(rest.order_items);
      } catch {
        return [];
      }
    })(),
  };
}

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("orders").collect();
    return rows
      .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
      .map(decode);
  },
});

export const listRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const rows = await ctx.db.query("orders").collect();
    const sorted = rows.sort((a, b) =>
      (b.created_at ?? "").localeCompare(a.created_at ?? ""),
    );
    return (limit ? sorted.slice(0, limit) : sorted).map(decode);
  },
});

export const getById = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const row = await findByUuid(ctx, "orders", id);
    return row ? decode(row) : null;
  },
});

// Public, sanitized order lookup for the customer-facing tracking page.
// Mirrors the old `get_order_details` Postgres RPC.
export const getOrderDetails = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const row = await findByUuid(ctx, "orders", id);
    if (!row) return null;
    const decoded = decode(row);
    return {
      id: decoded.id,
      order_status: decoded.order_status,
      payment_status: decoded.payment_status,
      tracking_number: decoded.tracking_number,
      tracking_courier: decoded.tracking_courier,
      shipping_note: decoded.shipping_note,
      shipping_provider: decoded.shipping_provider,
      shipped_at: decoded.shipped_at,
      created_at: decoded.created_at,
      updated_at: decoded.updated_at,
      total_price: decoded.total_price,
      shipping_fee: decoded.shipping_fee,
      shipping_location: decoded.shipping_location,
      payment_method_name: decoded.payment_method_name,
      order_items: decoded.order_items,
      customer_name: decoded.customer_name,
    };
  },
});

// Order items are serialized to a JSON string before storage, so we accept
// any object shape to keep front-end-specific fields (total, purity, etc.).
const orderItemValidator = v.any();

export const create = mutation({
  args: {
    customer_name: v.string(),
    customer_email: v.optional(v.string()),
    customer_phone: v.optional(v.string()),
    contact_method: v.optional(v.string()),
    shipping_address: v.optional(v.string()),
    shipping_city: v.optional(v.string()),
    shipping_state: v.optional(v.string()),
    shipping_zip_code: v.optional(v.string()),
    shipping_country: v.optional(v.string()),
    shipping_barangay: v.optional(v.string()),
    shipping_region: v.optional(v.string()),
    shipping_location: v.optional(v.string()),
    shipping_fee: v.optional(v.number()),
    order_items: v.array(orderItemValidator),
    subtotal: v.optional(v.number()),
    total_price: v.number(),
    pricing_mode: v.optional(v.string()),
    payment_method_id: v.optional(v.string()),
    payment_method_name: v.optional(v.string()),
    payment_proof_url: v.optional(v.string()),
    promo_code_id: v.optional(v.union(v.string(), v.null())),
    promo_code: v.optional(v.union(v.string(), v.null())),
    discount_applied: v.optional(v.union(v.number(), v.null())),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, input) => {
    const id = newId();
    const now = nowIso();
    const _id = await ctx.db.insert("orders", {
      id,
      customer_name: input.customer_name,
      customer_email: input.customer_email,
      customer_phone: input.customer_phone,
      contact_method: input.contact_method,
      shipping_address: input.shipping_address,
      shipping_city: input.shipping_city,
      shipping_state: input.shipping_state,
      shipping_zip_code: input.shipping_zip_code,
      shipping_country: input.shipping_country,
      shipping_barangay: input.shipping_barangay,
      shipping_region: input.shipping_region,
      shipping_location: input.shipping_location,
      shipping_fee: fromNum(input.shipping_fee ?? 0),
      order_items: JSON.stringify(input.order_items),
      subtotal: fromNum(input.subtotal ?? 0),
      total_price: fromNum(input.total_price),
      pricing_mode: input.pricing_mode,
      payment_method_id: input.payment_method_id,
      payment_method_name: input.payment_method_name,
      payment_status: "pending",
      payment_proof_url: input.payment_proof_url,
      promo_code_id: input.promo_code_id ?? undefined,
      promo_code: input.promo_code ?? undefined,
      discount_applied:
        input.discount_applied == null ? undefined : fromNum(input.discount_applied),
      order_status: "new",
      notes: input.notes,
      created_at: now,
      updated_at: now,
    });
    return decode(await ctx.db.get(_id));
  },
});

export const updateStatus = mutation({
  args: {
    id: v.string(),
    order_status: v.optional(v.string()),
    payment_status: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...updates }) => {
    const row = await findByUuid(ctx, "orders", id);
    if (!row) throw new Error(`Order ${id} not found`);
    await ctx.db.patch(row._id, { ...updates, updated_at: nowIso() });
  },
});

export const updateTracking = mutation({
  args: {
    id: v.string(),
    tracking_number: v.optional(v.string()),
    tracking_courier: v.optional(v.string()),
    shipping_note: v.optional(v.string()),
    shipping_provider: v.optional(v.string()),
    shipped_at: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...updates }) => {
    const row = await findByUuid(ctx, "orders", id);
    if (!row) throw new Error(`Order ${id} not found`);
    await ctx.db.patch(row._id, { ...updates, updated_at: nowIso() });
  },
});

export const updateDetails = mutation({
  args: {
    id: v.string(),
    customer_name: v.optional(v.string()),
    customer_email: v.optional(v.string()),
    customer_phone: v.optional(v.string()),
    contact_method: v.optional(v.string()),
    shipping_address: v.optional(v.string()),
    shipping_city: v.optional(v.string()),
    shipping_state: v.optional(v.string()),
    shipping_zip_code: v.optional(v.string()),
    shipping_country: v.optional(v.string()),
    shipping_barangay: v.optional(v.string()),
    shipping_region: v.optional(v.string()),
    shipping_location: v.optional(v.string()),
    notes: v.optional(v.string()),
    admin_notes: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...updates }) => {
    const row = await findByUuid(ctx, "orders", id);
    if (!row) throw new Error(`Order ${id} not found`);
    await ctx.db.patch(row._id, { ...updates, updated_at: nowIso() });
  },
});

export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const row = await findByUuid(ctx, "orders", id);
    if (row) await ctx.db.delete(row._id);
  },
});
