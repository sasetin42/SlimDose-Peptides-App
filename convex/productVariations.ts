import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { findByUuid, fromNum, newId, nowIso, toNum } from "./_lib";

function decodeVariation(row: any) {
  if (!row) return row;
  const { _id, _creationTime, ...rest } = row;
  return {
    ...rest,
    quantity_mg: toNum(rest.quantity_mg) ?? 0,
    price: toNum(rest.price) ?? 0,
    discount_price: toNum(rest.discount_price),
  };
}

const inputFields = {
  product_id: v.string(),
  name: v.string(),
  quantity_mg: v.number(),
  price: v.number(),
  discount_price: v.optional(v.union(v.number(), v.null())),
  discount_active: v.optional(v.boolean()),
  stock_quantity: v.optional(v.number()),
};

function encodePayload(input: any) {
  const out: any = { ...input };
  if ("quantity_mg" in input) out.quantity_mg = fromNum(input.quantity_mg);
  if ("price" in input) out.price = fromNum(input.price);
  if ("discount_price" in input)
    out.discount_price = input.discount_price == null ? undefined : fromNum(input.discount_price);
  for (const k of Object.keys(out)) {
    if (out[k] === null) out[k] = undefined;
  }
  return out;
}

export const listByProduct = query({
  args: { product_id: v.string() },
  handler: async (ctx, { product_id }) => {
    const rows = await ctx.db
      .query("product_variations")
      .withIndex("by_product", (q) => q.eq("product_id", product_id))
      .collect();
    return rows
      .sort((a, b) => (toNum(a.quantity_mg) ?? 0) - (toNum(b.quantity_mg) ?? 0))
      .map(decodeVariation);
  },
});

export const create = mutation({
  args: inputFields,
  handler: async (ctx, input) => {
    const id = newId();
    const _id = await ctx.db.insert("product_variations", {
      ...encodePayload(input),
      id,
      created_at: nowIso(),
    });
    const doc = await ctx.db.get(_id);
    return decodeVariation(doc);
  },
});

export const update = mutation({
  args: {
    id: v.string(),
    name: v.optional(v.string()),
    quantity_mg: v.optional(v.number()),
    price: v.optional(v.number()),
    discount_price: v.optional(v.union(v.number(), v.null())),
    discount_active: v.optional(v.boolean()),
    stock_quantity: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...updates }) => {
    const row = await findByUuid(ctx, "product_variations", id);
    if (!row) throw new Error(`Variation ${id} not found`);
    await ctx.db.patch(row._id, encodePayload(updates));
    const doc = await ctx.db.get(row._id);
    return decodeVariation(doc);
  },
});

export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const row = await findByUuid(ctx, "product_variations", id);
    if (row) await ctx.db.delete(row._id);
  },
});

export const adjustStock = mutation({
  args: { id: v.string(), stock_quantity: v.number() },
  handler: async (ctx, { id, stock_quantity }) => {
    const row = await findByUuid(ctx, "product_variations", id);
    if (!row) throw new Error(`Variation ${id} not found`);
    await ctx.db.patch(row._id, { stock_quantity });
  },
});

export const getById = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const row = await findByUuid(ctx, "product_variations", id);
    return row ? decodeVariation(row) : null;
  },
});
