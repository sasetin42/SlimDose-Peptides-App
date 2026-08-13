import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { findByUuid, nowIso, stripInternal } from "./_lib";

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("categories").collect();
    return rows
      .filter((r) => r.active === true)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map(stripInternal);
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("categories").collect();
    return rows
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map(stripInternal);
  },
});

export const create = mutation({
  args: {
    id: v.string(),
    name: v.string(),
    icon: v.string(),
    sort_order: v.optional(v.number()),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = nowIso();
    const _id = await ctx.db.insert("categories", {
      id: args.id,
      name: args.name,
      icon: args.icon,
      sort_order: args.sort_order ?? 0,
      active: args.active ?? true,
      created_at: now,
      updated_at: now,
    });
    const doc = await ctx.db.get(_id);
    return stripInternal(doc);
  },
});

export const update = mutation({
  args: {
    id: v.string(),
    name: v.optional(v.string()),
    icon: v.optional(v.string()),
    sort_order: v.optional(v.number()),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, ...updates }) => {
    const row = await findByUuid(ctx, "categories", id);
    if (!row) throw new Error(`Category ${id} not found`);
    await ctx.db.patch(row._id, { ...updates, updated_at: nowIso() });
  },
});

export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    // Block deletion if any product references this category.
    const dependent = await ctx.db
      .query("products")
      .withIndex("by_category", (q) => q.eq("category", id))
      .first();
    if (dependent) {
      throw new Error(
        "Cannot delete category that contains products. Please move or delete the products first.",
      );
    }
    const row = await findByUuid(ctx, "categories", id);
    if (row) await ctx.db.delete(row._id);
  },
});

export const reorder = mutation({
  args: {
    items: v.array(v.object({ id: v.string(), sort_order: v.number() })),
  },
  handler: async (ctx, { items }) => {
    for (const item of items) {
      const row = await findByUuid(ctx, "categories", item.id);
      if (row) {
        await ctx.db.patch(row._id, {
          sort_order: item.sort_order,
          updated_at: nowIso(),
        });
      }
    }
  },
});
