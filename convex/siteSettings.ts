import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { findByUuid, nowIso, stripInternal } from "./_lib";

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("site_settings").collect();
    return rows
      .sort((a, b) => (a.id ?? "").localeCompare(b.id ?? ""))
      .map(stripInternal);
  },
});

export const getOne = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const row = await findByUuid(ctx, "site_settings", id);
    return row ? stripInternal(row) : null;
  },
});

export const upsert = mutation({
  args: {
    id: v.string(),
    value: v.string(),
    type: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const row = await findByUuid(ctx, "site_settings", args.id);
    if (row) {
      await ctx.db.patch(row._id, {
        value: args.value,
        type: args.type ?? row.type ?? "string",
        description: args.description ?? row.description,
        updated_at: nowIso(),
      });
      return stripInternal(await ctx.db.get(row._id));
    }
    const _id = await ctx.db.insert("site_settings", {
      id: args.id,
      value: args.value,
      type: args.type ?? "string",
      description: args.description,
      updated_at: nowIso(),
    });
    return stripInternal(await ctx.db.get(_id));
  },
});

export const upsertMany = mutation({
  args: {
    items: v.array(
      v.object({
        id: v.string(),
        value: v.string(),
        type: v.optional(v.string()),
        description: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, { items }) => {
    for (const item of items) {
      const row = await findByUuid(ctx, "site_settings", item.id);
      if (row) {
        await ctx.db.patch(row._id, {
          value: item.value,
          type: item.type ?? row.type ?? "string",
          description: item.description ?? row.description,
          updated_at: nowIso(),
        });
      } else {
        await ctx.db.insert("site_settings", {
          id: item.id,
          value: item.value,
          type: item.type ?? "string",
          description: item.description,
          updated_at: nowIso(),
        });
      }
    }
  },
});

export const updateValue = mutation({
  args: { id: v.string(), value: v.string() },
  handler: async (ctx, { id, value }) => {
    const row = await findByUuid(ctx, "site_settings", id);
    if (!row) {
      await ctx.db.insert("site_settings", {
        id,
        value,
        type: "string",
        updated_at: nowIso(),
      });
      return;
    }
    await ctx.db.patch(row._id, { value, updated_at: nowIso() });
  },
});
