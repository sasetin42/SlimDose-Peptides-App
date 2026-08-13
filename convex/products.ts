import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { findByUuid, fromNum, newId, nowIso, toNum } from "./_lib";

// Convert a stored product row into the shape the frontend expects
// (numeric fields as numbers, inclusions array decoded from JSON).
function decodeProduct(row: any) {
  if (!row) return row;
  const { _id, _creationTime, ...rest } = row;
  return {
    ...rest,
    base_price: toNum(rest.base_price) ?? 0,
    discount_price: toNum(rest.discount_price),
    purity_percentage: toNum(rest.purity_percentage) ?? 0,
    inclusions:
      typeof rest.inclusions === "string" && rest.inclusions
        ? safeJsonParse(rest.inclusions)
        : rest.inclusions ?? null,
  };
}

function safeJsonParse(value: string): any {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

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

export const listAvailableWithVariations = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    const filtered = products
      .filter((p) => p.available === true)
      .sort((a, b) => {
        // featured DESC then name ASC
        const af = a.featured ? 1 : 0;
        const bf = b.featured ? 1 : 0;
        if (af !== bf) return bf - af;
        return (a.name ?? "").localeCompare(b.name ?? "");
      });

    const allVariations = await ctx.db.query("product_variations").collect();
    const byProduct = new Map<string, any[]>();
    for (const v of allVariations) {
      if (!v.product_id) continue;
      if (!byProduct.has(v.product_id)) byProduct.set(v.product_id, []);
      byProduct.get(v.product_id)!.push(v);
    }

    return filtered.map((p) => {
      const variations = (byProduct.get(p.id) ?? [])
        .sort((a, b) => (toNum(a.quantity_mg) ?? 0) - (toNum(b.quantity_mg) ?? 0))
        .map(decodeVariation);
      return { ...decodeProduct(p), variations };
    });
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    return products
      .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))
      .map(decodeProduct);
  },
});

export const listByIds = query({
  args: { ids: v.array(v.string()) },
  handler: async (ctx, { ids }) => {
    const idSet = new Set(ids);
    const products = await ctx.db.query("products").collect();
    const matched = products.filter((p) => idSet.has(p.id));
    const allVariations = await ctx.db.query("product_variations").collect();
    return matched.map((p) => {
      const variations = allVariations
        .filter((v) => v.product_id === p.id)
        .map(decodeVariation);
      return { ...decodeProduct(p), variations };
    });
  },
});

export const getById = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const row = await findByUuid(ctx, "products", id);
    return row ? decodeProduct(row) : null;
  },
});

const productInputFields = {
  name: v.optional(v.string()),
  description: v.optional(v.string()),
  category: v.optional(v.string()),
  base_price: v.optional(v.number()),
  discount_price: v.optional(v.union(v.number(), v.null())),
  discount_start_date: v.optional(v.union(v.string(), v.null())),
  discount_end_date: v.optional(v.union(v.string(), v.null())),
  discount_active: v.optional(v.boolean()),
  purity_percentage: v.optional(v.number()),
  molecular_weight: v.optional(v.union(v.string(), v.null())),
  cas_number: v.optional(v.union(v.string(), v.null())),
  sequence: v.optional(v.union(v.string(), v.null())),
  storage_conditions: v.optional(v.string()),
  inclusions: v.optional(v.union(v.array(v.string()), v.null())),
  stock_quantity: v.optional(v.number()),
  available: v.optional(v.boolean()),
  featured: v.optional(v.boolean()),
  image_url: v.optional(v.union(v.string(), v.null())),
  safety_sheet_url: v.optional(v.union(v.string(), v.null())),
};

function encodeProductPayload(input: any) {
  const out: any = { ...input };
  if ("base_price" in input) out.base_price = fromNum(input.base_price);
  if ("discount_price" in input)
    out.discount_price = input.discount_price == null ? undefined : fromNum(input.discount_price);
  if ("purity_percentage" in input)
    out.purity_percentage = fromNum(input.purity_percentage);
  if ("inclusions" in input)
    out.inclusions = input.inclusions == null ? undefined : JSON.stringify(input.inclusions);
  // Convert nulls to `undefined` so the optional-field schema accepts them.
  for (const k of Object.keys(out)) {
    if (out[k] === null) out[k] = undefined;
  }
  return out;
}

export const create = mutation({
  args: productInputFields,
  handler: async (ctx, input) => {
    const now = nowIso();
    const id = newId();
    const payload = encodeProductPayload(input);
    const _id = await ctx.db.insert("products", {
      ...payload,
      id,
      created_at: now,
      updated_at: now,
    });
    const doc = await ctx.db.get(_id);
    return decodeProduct(doc);
  },
});

export const update = mutation({
  args: {
    id: v.string(),
    ...productInputFields,
  },
  handler: async (ctx, { id, ...updates }) => {
    const row = await findByUuid(ctx, "products", id);
    if (!row) throw new Error(`Product ${id} not found`);
    const payload = encodeProductPayload(updates);
    await ctx.db.patch(row._id, { ...payload, updated_at: nowIso() });
    const doc = await ctx.db.get(row._id);
    return decodeProduct(doc);
  },
});

export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const row = await findByUuid(ctx, "products", id);
    if (!row) return;
    // Cascade: delete this product's variations.
    const vars = await ctx.db
      .query("product_variations")
      .withIndex("by_product", (q) => q.eq("product_id", id))
      .collect();
    for (const variation of vars) {
      await ctx.db.delete(variation._id);
    }
    await ctx.db.delete(row._id);
  },
});

// Decrement stock by an absolute amount; used by the OrdersManager when
// an order is confirmed.
export const adjustStock = mutation({
  args: { id: v.string(), stock_quantity: v.number() },
  handler: async (ctx, { id, stock_quantity }) => {
    const row = await findByUuid(ctx, "products", id);
    if (!row) throw new Error(`Product ${id} not found`);
    await ctx.db.patch(row._id, {
      stock_quantity,
      updated_at: nowIso(),
    });
  },
});
