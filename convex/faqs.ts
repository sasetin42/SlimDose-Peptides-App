import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { findByUuid, newId, nowIso, stripInternal } from "./_lib";

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("faqs").collect();
    return rows
      .filter((r) => r.is_active === true)
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
      .map(stripInternal);
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("faqs").collect();
    return rows
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
      .map(stripInternal);
  },
});

export const create = mutation({
  args: {
    question: v.string(),
    answer: v.string(),
    category: v.string(),
    order_index: v.optional(v.number()),
    is_active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const id = newId();
    const now = nowIso();
    const _id = await ctx.db.insert("faqs", {
      id,
      question: args.question,
      answer: args.answer,
      category: args.category,
      order_index: args.order_index ?? 0,
      is_active: args.is_active ?? true,
      created_at: now,
      updated_at: now,
    });
    return stripInternal(await ctx.db.get(_id));
  },
});

export const update = mutation({
  args: {
    id: v.string(),
    question: v.optional(v.string()),
    answer: v.optional(v.string()),
    category: v.optional(v.string()),
    order_index: v.optional(v.number()),
    is_active: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, ...updates }) => {
    const row = await findByUuid(ctx, "faqs", id);
    if (!row) throw new Error(`FAQ ${id} not found`);
    await ctx.db.patch(row._id, { ...updates, updated_at: nowIso() });
    return stripInternal(await ctx.db.get(row._id));
  },
});

export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const row = await findByUuid(ctx, "faqs", id);
    if (row) await ctx.db.delete(row._id);
  },
});
