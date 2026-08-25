import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { findByUuid, nowIso, stripInternal, newId } from "./_lib";

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("email_templates").collect();
    return rows
      .sort((a, b) => (a.category ?? "").localeCompare(b.category ?? "") || a.name.localeCompare(b.name))
      .map(stripInternal);
  },
});

export const getByKey = query({
  args: { template_key: v.string() },
  handler: async (ctx, { template_key }) => {
    const row = await ctx.db
      .query("email_templates")
      .withIndex("by_key", (q) => q.eq("template_key", template_key))
      .first();
    return stripInternal(row);
  },
});

export const getById = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const row = await findByUuid(ctx, "email_templates", id);
    return stripInternal(row);
  },
});

export const upsertTemplate = mutation({
  args: {
    id: v.optional(v.string()),
    template_key: v.string(),
    name: v.string(),
    subject: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    html_content: v.string(),
    variables: v.optional(
      v.array(
        v.object({
          key: v.string(),
          label: v.string(),
          example: v.string(),
        })
      )
    ),
    is_customized: v.optional(v.boolean()),
    is_active: v.optional(v.boolean()),
    updated_by: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = nowIso();
    const existing = await ctx.db
      .query("email_templates")
      .withIndex("by_key", (q) => q.eq("template_key", args.template_key))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        subject: args.subject,
        description: args.description,
        category: args.category,
        html_content: args.html_content,
        variables: args.variables,
        is_customized: args.is_customized ?? true,
        is_active: args.is_active ?? true,
        updated_at: now,
        updated_by: args.updated_by || "Admin",
      });
      const updated = await ctx.db.get(existing._id);
      return stripInternal(updated);
    } else {
      const templateId = args.id || newId();
      const _id = await ctx.db.insert("email_templates", {
        id: templateId,
        template_key: args.template_key,
        name: args.name,
        subject: args.subject,
        description: args.description || "",
        category: args.category,
        html_content: args.html_content,
        variables: args.variables || [],
        is_customized: args.is_customized ?? false,
        is_active: args.is_active ?? true,
        created_at: now,
        updated_at: now,
        updated_by: args.updated_by || "Admin",
      });
      const doc = await ctx.db.get(_id);
      return stripInternal(doc);
    }
  },
});

export const updateTemplate = mutation({
  args: {
    id: v.string(),
    subject: v.optional(v.string()),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    html_content: v.optional(v.string()),
    variables: v.optional(
      v.array(
        v.object({
          key: v.string(),
          label: v.string(),
          example: v.string(),
        })
      )
    ),
    is_customized: v.optional(v.boolean()),
    is_active: v.optional(v.boolean()),
    updated_by: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...updates }) => {
    const row = await findByUuid(ctx, "email_templates", id);
    if (!row) throw new Error(`Email template ${id} not found`);

    const now = nowIso();
    const patch: Record<string, any> = {
      updated_at: now,
      ...updates,
    };
    if (updates.html_content !== undefined || updates.subject !== undefined) {
      patch.is_customized = true;
    }

    await ctx.db.patch(row._id, patch);
    const updated = await ctx.db.get(row._id);
    return stripInternal(updated);
  },
});

export const seedDefaults = mutation({
  args: {
    templates: v.array(
      v.object({
        id: v.string(),
        template_key: v.string(),
        name: v.string(),
        subject: v.string(),
        description: v.optional(v.string()),
        category: v.string(),
        html_content: v.string(),
        variables: v.optional(
          v.array(
            v.object({
              key: v.string(),
              label: v.string(),
              example: v.string(),
            })
          )
        ),
        is_customized: v.optional(v.boolean()),
        is_active: v.optional(v.boolean()),
      })
    ),
  },
  handler: async (ctx, { templates }) => {
    const now = nowIso();
    let seededCount = 0;

    for (const tmpl of templates) {
      const existing = await ctx.db
        .query("email_templates")
        .withIndex("by_key", (q) => q.eq("template_key", tmpl.template_key))
        .first();

      if (!existing) {
        await ctx.db.insert("email_templates", {
          id: tmpl.id,
          template_key: tmpl.template_key,
          name: tmpl.name,
          subject: tmpl.subject,
          description: tmpl.description || "",
          category: tmpl.category,
          html_content: tmpl.html_content,
          variables: tmpl.variables || [],
          is_customized: false,
          is_active: true,
          created_at: now,
          updated_at: now,
          updated_by: "System Initializer",
        });
        seededCount++;
      }
    }

    return { success: true, seededCount };
  },
});

export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const row = await findByUuid(ctx, "email_templates", id);
    if (!row) throw new Error(`Email template ${id} not found`);
    await ctx.db.delete(row._id);
    return { success: true };
  },
});
