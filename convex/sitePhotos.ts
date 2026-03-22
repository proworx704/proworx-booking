import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ─── Queries ──────────────────────────────────────────────────────────────────

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("sitePhotos").collect();
  },
});

export const listBySection = query({
  args: { section: v.string() },
  handler: async (ctx, { section }) => {
    return await ctx.db
      .query("sitePhotos")
      .withIndex("by_section", (q) => q.eq("section", section))
      .collect();
  },
});

// ─── Generate upload URL ──────────────────────────────────────────────────────

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// ─── Create photo record after upload ─────────────────────────────────────────

export const create = mutation({
  args: {
    storageId: v.id("_storage"),
    filename: v.string(),
    section: v.string(),
    alt: v.optional(v.string()),
  },
  handler: async (ctx, { storageId, filename, section, alt }) => {
    const url = await ctx.storage.getUrl(storageId);
    if (!url) throw new Error("Failed to get storage URL");

    // Get next sort order
    const existing = await ctx.db
      .query("sitePhotos")
      .withIndex("by_section", (q) => q.eq("section", section))
      .collect();
    const maxOrder = existing.reduce((max, p) => Math.max(max, p.sortOrder), 0);

    return await ctx.db.insert("sitePhotos", {
      storageId,
      url,
      filename,
      section,
      alt: alt || filename,
      sortOrder: maxOrder + 1,
    });
  },
});

// ─── Update photo ─────────────────────────────────────────────────────────────

export const update = mutation({
  args: {
    id: v.id("sitePhotos"),
    section: v.optional(v.string()),
    alt: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...updates }) => {
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, val]) => val !== undefined),
    );
    await ctx.db.patch(id, filtered);
  },
});

// ─── Delete photo (also delete file from storage) ─────────────────────────────

export const remove = mutation({
  args: { id: v.id("sitePhotos") },
  handler: async (ctx, { id }) => {
    const photo = await ctx.db.get(id);
    if (photo) {
      await ctx.storage.delete(photo.storageId);
      await ctx.db.delete(id);
    }
  },
});
