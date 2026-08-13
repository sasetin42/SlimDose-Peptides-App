import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { findByUuid, fromNum, newId, nowIso, toNum } from "./_lib";

function decode(row: any) {
  if (!row) return row;
  const { _id, _creationTime, ...rest } = row;
  return {
    ...rest,
    discount_value: toNum(rest.discount_value) ?? 0,
    min_purchase_amount: toNum(rest.min_purchase_amount) ?? 0,
    max_discount_amount: toNum(rest.max_discount_amount),
  };
}

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("promo_codes").collect();
    return rows
      .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
      .map(decode);
  },
});

export const findByCode = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const row = await ctx.db
      .query("promo_codes")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();
    return row ? decode(row) : null;
  },
});

const inputFields = {
  code: v.string(),
  discount_type: v.string(),
  discount_value: v.number(),
  min_purchase_amount: v.optional(v.number()),
  max_discount_amount: v.optional(v.union(v.number(), v.null())),
  start_date: v.optional(v.union(v.string(), v.null())),
  end_date: v.optional(v.union(v.string(), v.null())),
  usage_limit: v.optional(v.union(v.number(), v.null())),
  active: v.optional(v.boolean()),
};

function encode(input: any) {
  const out: any = { ...input };
  if ("discount_value" in input) out.discount_value = fromNum(input.discount_value);
  if ("min_purchase_amount" in input)
    out.min_purchase_amount = fromNum(input.min_purchase_amount);
  if ("max_discount_amount" in input)
    out.max_discount_amount =
      input.max_discount_amount == null ? undefined : fromNum(input.max_discount_amount);
  for (const k of Object.keys(out)) {
    if (out[k] === null) out[k] = undefined;
  }
  return out;
}

export const create = mutation({
  args: inputFields,
  handler: async (ctx, input) => {
    const id = newId();
    const now = nowIso();
    const _id = await ctx.db.insert("promo_codes", {
      ...encode(input),
      id,
      code: input.code.toUpperCase(),
      usage_count: 0,
      active: input.active ?? true,
      created_at: now,
      updated_at: now,
    });
    return decode(await ctx.db.get(_id));
  },
});

export const update = mutation({
  args: {
    id: v.string(),
    code: v.optional(v.string()),
    discount_type: v.optional(v.string()),
    discount_value: v.optional(v.number()),
    min_purchase_amount: v.optional(v.number()),
    max_discount_amount: v.optional(v.union(v.number(), v.null())),
    start_date: v.optional(v.union(v.string(), v.null())),
    end_date: v.optional(v.union(v.string(), v.null())),
    usage_limit: v.optional(v.union(v.number(), v.null())),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, ...updates }) => {
    const row = await findByUuid(ctx, "promo_codes", id);
    if (!row) throw new Error(`Promo code ${id} not found`);
    const patch: any = { ...encode(updates), updated_at: nowIso() };
    if (typeof updates.code === "string") patch.code = updates.code.toUpperCase();
    await ctx.db.patch(row._id, patch);
    return decode(await ctx.db.get(row._id));
  },
});

export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const row = await findByUuid(ctx, "promo_codes", id);
    if (row) await ctx.db.delete(row._id);
  },
});

export const setActive = mutation({
  args: { id: v.string(), active: v.boolean() },
  handler: async (ctx, { id, active }) => {
    const row = await findByUuid(ctx, "promo_codes", id);
    if (!row) throw new Error(`Promo code ${id} not found`);
    await ctx.db.patch(row._id, { active, updated_at: nowIso() });
  },
});

export const incrementUsage = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const row = await findByUuid(ctx, "promo_codes", id);
    if (!row) return;
    await ctx.db.patch(row._id, {
      usage_count: (row.usage_count ?? 0) + 1,
      updated_at: nowIso(),
    });
  },
});
