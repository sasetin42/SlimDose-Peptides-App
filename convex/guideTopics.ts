import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { findByUuid, newId, nowIso, stripInternal } from "./_lib";

export const listEnabledSummaries = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("guide_topics").collect();
    return rows
      .filter((r) => r.is_enabled === true)
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      .map((r) => ({
        id: r.id,
        title: r.title,
        preview: r.preview ?? null,
        author: r.author,
        published_date: r.published_date,
        cover_image: r.cover_image ?? null,
      }));
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("guide_topics").collect();
    return rows
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      .map(stripInternal);
  },
});

export const getById = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const row = await findByUuid(ctx, "guide_topics", id);
    if (!row || row.is_enabled !== true) return null;
    return stripInternal(row);
  },
});

const inputFields = {
  title: v.string(),
  preview: v.optional(v.union(v.string(), v.null())),
  content: v.string(),
  cover_image: v.optional(v.union(v.string(), v.null())),
  author: v.string(),
  published_date: v.string(),
  display_order: v.optional(v.number()),
  is_enabled: v.optional(v.boolean()),
  related_product_ids: v.optional(v.array(v.string())),
};

export const create = mutation({
  args: inputFields,
  handler: async (ctx, args) => {
    const id = newId();
    const now = nowIso();
    const _id = await ctx.db.insert("guide_topics", {
      id,
      title: args.title,
      preview: args.preview ?? undefined,
      content: args.content,
      cover_image: args.cover_image ?? undefined,
      author: args.author,
      published_date: args.published_date,
      display_order: args.display_order ?? 0,
      is_enabled: args.is_enabled ?? true,
      related_product_ids: args.related_product_ids ?? [],
      created_at: now,
      updated_at: now,
    });
    return stripInternal(await ctx.db.get(_id));
  },
});

export const update = mutation({
  args: {
    id: v.string(),
    title: v.optional(v.string()),
    preview: v.optional(v.union(v.string(), v.null())),
    content: v.optional(v.string()),
    cover_image: v.optional(v.union(v.string(), v.null())),
    author: v.optional(v.string()),
    published_date: v.optional(v.string()),
    display_order: v.optional(v.number()),
    is_enabled: v.optional(v.boolean()),
    related_product_ids: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { id, ...updates }) => {
    const row = await findByUuid(ctx, "guide_topics", id);
    if (!row) throw new Error(`Article ${id} not found`);
    const patch: any = { ...updates, updated_at: nowIso() };
    for (const k of Object.keys(patch)) {
      if (patch[k] === null) patch[k] = undefined;
    }
    await ctx.db.patch(row._id, patch);
    return stripInternal(await ctx.db.get(row._id));
  },
});

export const setEnabled = mutation({
  args: { id: v.string(), is_enabled: v.boolean() },
  handler: async (ctx, { id, is_enabled }) => {
    const row = await findByUuid(ctx, "guide_topics", id);
    if (!row) throw new Error(`Article ${id} not found`);
    await ctx.db.patch(row._id, { is_enabled, updated_at: nowIso() });
  },
});

export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const row = await findByUuid(ctx, "guide_topics", id);
    if (row) await ctx.db.delete(row._id);
  },
});
