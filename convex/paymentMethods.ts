import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { findByUuid, nowIso, stripInternal } from "./_lib";

const QR_PLACEHOLDER =
  "https://images.pexels.com/photos/8867482/pexels-photo-8867482.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop";

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("payment_methods").collect();
    return rows
      .filter((r) => r.active === true)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map(stripInternal);
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("payment_methods").collect();
    return rows
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map(stripInternal);
  },
});

function normalizeQr(url: string | null | undefined): string {
  const trimmed = (url ?? "").toString().trim();
  return trimmed === "" ? QR_PLACEHOLDER : trimmed;
}

export const create = mutation({
  args: {
    id: v.string(),
    name: v.string(),
    account_number: v.string(),
    account_name: v.string(),
    qr_code_url: v.optional(v.string()),
    active: v.optional(v.boolean()),
    sort_order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await findByUuid(ctx, "payment_methods", args.id);
    if (existing) {
      throw new Error(
        `A payment method with ID "${args.id}" already exists. Please use a different ID.`,
      );
    }
    const now = nowIso();
    const _id = await ctx.db.insert("payment_methods", {
      id: args.id,
      name: args.name,
      account_number: args.account_number,
      account_name: args.account_name,
      qr_code_url: normalizeQr(args.qr_code_url),
      active: args.active ?? true,
      sort_order: args.sort_order ?? 0,
      created_at: now,
      updated_at: now,
    });
    return stripInternal(await ctx.db.get(_id));
  },
});

export const update = mutation({
  args: {
    id: v.string(),
    name: v.optional(v.string()),
    account_number: v.optional(v.string()),
    account_name: v.optional(v.string()),
    qr_code_url: v.optional(v.string()),
    active: v.optional(v.boolean()),
    sort_order: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...updates }) => {
    const row = await findByUuid(ctx, "payment_methods", id);
    if (!row) throw new Error(`Payment method ${id} not found`);
    const patch: any = { ...updates, updated_at: nowIso() };
    if ("qr_code_url" in updates) patch.qr_code_url = normalizeQr(updates.qr_code_url);
    await ctx.db.patch(row._id, patch);
    return stripInternal(await ctx.db.get(row._id));
  },
});

export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const row = await findByUuid(ctx, "payment_methods", id);
    if (row) await ctx.db.delete(row._id);
  },
});

export const reorder = mutation({
  args: {
    items: v.array(v.object({ id: v.string(), sort_order: v.number() })),
  },
  handler: async (ctx, { items }) => {
    for (const item of items) {
      const row = await findByUuid(ctx, "payment_methods", item.id);
      if (row) {
        await ctx.db.patch(row._id, {
          sort_order: item.sort_order,
          updated_at: nowIso(),
        });
      }
    }
  },
});
