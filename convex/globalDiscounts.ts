import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { findByUuid, fromNum, newId, nowIso, toNum } from "./_lib";

function decode(row: any) {
  if (!row) return row;
  const { _id, _creationTime, ...rest } = row;
  return {
    ...rest,
    discount_value: toNum(rest.discount_value) ?? 0,
    excluded_product_ids: rest.excluded_product_ids ?? [],
  };
}

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("global_discounts").collect();
    return rows
      .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
      .map(decode);
  },
});

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("global_discounts").collect();
    return rows
      .filter((r) => r.active === true)
      .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
      .map(decode);
  },
});

const inputFields = {
  name: v.string(),
  discount_type: v.string(),
  discount_value: v.number(),
  active: v.optional(v.boolean()),
  start_date: v.optional(v.union(v.string(), v.null())),
  end_date: v.optional(v.union(v.string(), v.null())),
  excluded_product_ids: v.optional(v.array(v.string())),
};

function encode(input: any) {
  const out: any = { ...input };
  if ("discount_value" in input) out.discount_value = fromNum(input.discount_value);
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
    const _id = await ctx.db.insert("global_discounts", {
      ...encode(input),
      id,
      active: input.active ?? true,
      excluded_product_ids: input.excluded_product_ids ?? [],
      created_at: now,
      updated_at: now,
    });
    return decode(await ctx.db.get(_id));
  },
});

export const update = mutation({
  args: {
    id: v.string(),
    name: v.optional(v.string()),
    discount_type: v.optional(v.string()),
    discount_value: v.optional(v.number()),
    active: v.optional(v.boolean()),
    start_date: v.optional(v.union(v.string(), v.null())),
    end_date: v.optional(v.union(v.string(), v.null())),
    excluded_product_ids: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { id, ...updates }) => {
    const row = await findByUuid(ctx, "global_discounts", id);
    if (!row) throw new Error(`Discount ${id} not found`);
    await ctx.db.patch(row._id, { ...encode(updates), updated_at: nowIso() });
    return decode(await ctx.db.get(row._id));
  },
});

export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const row = await findByUuid(ctx, "global_discounts", id);
    if (row) await ctx.db.delete(row._id);
  },
});

export const setActive = mutation({
  args: { id: v.string(), active: v.boolean() },
  handler: async (ctx, { id, active }) => {
    const row = await findByUuid(ctx, "global_discounts", id);
    if (!row) throw new Error(`Discount ${id} not found`);
    await ctx.db.patch(row._id, { active, updated_at: nowIso() });
  },
});
