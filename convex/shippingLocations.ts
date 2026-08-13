import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { findByUuid, fromNum, newId, nowIso, toNum } from "./_lib";

function decode(row: any) {
  if (!row) return row;
  const { _id, _creationTime, ...rest } = row;
  return { ...rest, fee: toNum(rest.fee) ?? 0 };
}

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("shipping_locations").collect();
    return rows
      .filter((r) => r.is_active === true)
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
      .map(decode);
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("shipping_locations").collect();
    return rows
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
      .map(decode);
  },
});

export const create = mutation({
  args: {
    id: v.optional(v.string()),
    name: v.string(),
    fee: v.number(),
    is_active: v.optional(v.boolean()),
    order_index: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const id = args.id ?? newId();
    const now = nowIso();
    const _id = await ctx.db.insert("shipping_locations", {
      id,
      name: args.name,
      fee: fromNum(args.fee),
      is_active: args.is_active ?? true,
      order_index: args.order_index ?? 0,
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
    fee: v.optional(v.number()),
    is_active: v.optional(v.boolean()),
    order_index: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...updates }) => {
    const row = await findByUuid(ctx, "shipping_locations", id);
    if (!row) throw new Error(`Shipping location ${id} not found`);
    const patch: any = { ...updates, updated_at: nowIso() };
    if ("fee" in updates) patch.fee = fromNum(updates.fee);
    await ctx.db.patch(row._id, patch);
    return decode(await ctx.db.get(row._id));
  },
});

export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const row = await findByUuid(ctx, "shipping_locations", id);
    if (row) await ctx.db.delete(row._id);
  },
});
