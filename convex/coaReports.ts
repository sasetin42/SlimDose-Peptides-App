import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { findByUuid, fromNum, newId, nowIso, toNum } from "./_lib";

function decode(row: any) {
  if (!row) return row;
  const { _id, _creationTime, ...rest } = row;
  return {
    ...rest,
    purity_percentage: toNum(rest.purity_percentage),
  };
}

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("coa_reports").collect();
    return rows
      .sort((a, b) => (b.test_date ?? "").localeCompare(a.test_date ?? ""))
      .map(decode);
  },
});

const inputFields = {
  product_name: v.string(),
  batch: v.optional(v.string()),
  test_date: v.optional(v.string()),
  purity_percentage: v.optional(v.union(v.number(), v.null())),
  quantity: v.optional(v.string()),
  task_number: v.optional(v.string()),
  verification_key: v.optional(v.string()),
  image_url: v.optional(v.union(v.string(), v.null())),
  featured: v.optional(v.boolean()),
  manufacturer: v.optional(v.string()),
  laboratory: v.optional(v.string()),
};

function encode(input: any) {
  const out: any = { ...input };
  if ("purity_percentage" in input)
    out.purity_percentage =
      input.purity_percentage == null ? undefined : fromNum(input.purity_percentage);
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
    const _id = await ctx.db.insert("coa_reports", {
      ...encode(input),
      id,
      created_at: now,
      updated_at: now,
    });
    return decode(await ctx.db.get(_id));
  },
});

export const update = mutation({
  args: {
    id: v.string(),
    ...inputFields,
  },
  handler: async (ctx, { id, ...updates }) => {
    const row = await findByUuid(ctx, "coa_reports", id);
    if (!row) throw new Error(`COA report ${id} not found`);
    await ctx.db.patch(row._id, { ...encode(updates), updated_at: nowIso() });
    return decode(await ctx.db.get(row._id));
  },
});

export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const row = await findByUuid(ctx, "coa_reports", id);
    if (row) await ctx.db.delete(row._id);
  },
});
