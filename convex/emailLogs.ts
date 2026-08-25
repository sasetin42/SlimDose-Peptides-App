import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { nowIso } from "./_lib";

/**
 * Email delivery audit log — stores every SMTP dispatch attempt.
 */
export const logDelivery = mutation({
  args: {
    recipient: v.string(),
    subject: v.string(),
    provider: v.string(),
    message_id: v.string(),
    status: v.string(),
    smtp_host: v.optional(v.string()),
    from_email: v.optional(v.string()),
    error_message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("email_logs", {
      ...args,
      sent_at: nowIso(),
    });
  },
});

export const listRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 50 }) => {
    const rows = await ctx.db.query("email_logs").order("desc").take(limit);
    return rows;
  },
});
