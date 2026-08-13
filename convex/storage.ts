import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Returns a one-shot upload URL the client can POST a file to.
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Resolve a storageId into the durable public URL we persist in the DB.
export const getUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, { storageId }) => {
    return await ctx.storage.getUrl(storageId as any);
  },
});

// Used by the upload hook: we expose a mutation that returns the URL right
// after the client POSTs the file, so the persisted DB row gets a real URL.
export const finalizeUpload = mutation({
  args: { storageId: v.string() },
  handler: async (ctx, { storageId }) => {
    const url = await ctx.storage.getUrl(storageId as any);
    if (!url) throw new Error("Failed to resolve uploaded file URL");
    return { storageId, url };
  },
});

// Delete a stored file by its storageId.
export const deleteFile = mutation({
  args: { storageId: v.string() },
  handler: async (ctx, { storageId }) => {
    await ctx.storage.delete(storageId as any);
  },
});
