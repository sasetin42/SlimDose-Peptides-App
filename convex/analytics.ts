import { v } from "convex/values";
import { query } from "./_generated/server";
import { toNum } from "./_lib";

type LineItem = {
  product_id?: string;
  product_name?: string;
  variation_id?: string | null;
  variation_name?: string | null;
  quantity: number;
  price: number;
};

function parseItems(raw: unknown): LineItem[] {
  if (!raw) return [];
  if (typeof raw !== "string") return raw as LineItem[];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function inRange(iso: string | undefined, start?: string, end?: string) {
  if (!iso) return false;
  if (start && iso < start) return false;
  if (end && iso > end) return false;
  return true;
}

function isCountableOrder(o: any) {
  return (
    ["confirmed", "processing", "shipped", "delivered"].includes(o.order_status ?? "") &&
    o.payment_status === "paid"
  );
}

// Replaces the old `get_dashboard_metrics` Postgres RPC.
export const dashboardMetrics = query({
  args: {
    start: v.optional(v.string()),
    end: v.optional(v.string()),
  },
  handler: async (ctx, { start, end }) => {
    const orders = await ctx.db.query("orders").collect();
    let totalOrders = 0;
    let totalRevenue = 0;
    let totalUnits = 0;
    for (const o of orders) {
      if (!isCountableOrder(o)) continue;
      if (!inRange(o.created_at, start, end)) continue;
      totalOrders += 1;
      totalRevenue += toNum(o.total_price) ?? 0;
      for (const item of parseItems(o.order_items)) {
        totalUnits += item.quantity ?? 0;
      }
    }
    const avg = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    return {
      total_orders: totalOrders,
      total_revenue: totalRevenue,
      total_units: totalUnits,
      average_order_value: avg,
    };
  },
});

// Replaces the old `get_product_rankings` RPC.
export const productRankings = query({
  args: {
    start: v.optional(v.string()),
    end: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { start, end, limit }) => {
    const orders = await ctx.db.query("orders").collect();
    const byProduct = new Map<
      string,
      { product_id: string; product_name: string; units: number; revenue: number }
    >();
    for (const o of orders) {
      if (!isCountableOrder(o)) continue;
      if (!inRange(o.created_at, start, end)) continue;
      for (const item of parseItems(o.order_items)) {
        const key = item.product_id ?? item.product_name ?? "unknown";
        const entry =
          byProduct.get(key) ??
          {
            product_id: item.product_id ?? key,
            product_name: item.product_name ?? "Unknown",
            units: 0,
            revenue: 0,
          };
        entry.units += item.quantity ?? 0;
        entry.revenue += (item.quantity ?? 0) * (item.price ?? 0);
        byProduct.set(key, entry);
      }
    }
    const sorted = Array.from(byProduct.values()).sort((a, b) => b.units - a.units);
    return limit ? sorted.slice(0, limit) : sorted;
  },
});

// Replaces the old `get_top_products(period, limit)` RPC.
export const topProducts = query({
  args: {
    period: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { period, limit }) => {
    const now = new Date();
    const start = new Date(now);
    if (period === "daily") start.setDate(now.getDate() - 1);
    else if (period === "weekly") start.setDate(now.getDate() - 7);
    else if (period === "monthly") start.setMonth(now.getMonth() - 1);

    const orders = await ctx.db.query("orders").collect();
    const byProduct = new Map<
      string,
      { product_id: string; product_name: string; units: number; revenue: number }
    >();
    for (const o of orders) {
      if (!isCountableOrder(o)) continue;
      if (!o.created_at || new Date(o.created_at) < start) continue;
      for (const item of parseItems(o.order_items)) {
        const key = item.product_id ?? item.product_name ?? "unknown";
        const entry =
          byProduct.get(key) ??
          {
            product_id: item.product_id ?? key,
            product_name: item.product_name ?? "Unknown",
            units: 0,
            revenue: 0,
          };
        entry.units += item.quantity ?? 0;
        entry.revenue += (item.quantity ?? 0) * (item.price ?? 0);
        byProduct.set(key, entry);
      }
    }
    const sorted = Array.from(byProduct.values()).sort((a, b) => b.units - a.units);
    return limit ? sorted.slice(0, limit) : sorted;
  },
});
