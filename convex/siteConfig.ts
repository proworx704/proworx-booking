import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, requireAdmin } from "./authHelpers";

/** Get all site config as a key-value map */
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("siteConfig").collect();
    const map: Record<string, string> = {};
    for (const row of rows) {
      map[row.key] = row.value;
    }
    return map;
  },
});

/** Get a single config value by key */
export const getByKey = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const row = await ctx.db
      .query("siteConfig")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
    return row?.value ?? null;
  },
});

/** Upsert a config value */
export const set = mutation({
  args: {
    key: v.string(),
    value: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("siteConfig")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { value: args.value });
    } else {
      await ctx.db.insert("siteConfig", {
        key: args.key,
        value: args.value,
      });
    }
    return null;
  },
});

/** Set multiple config values at once */
export const setMany = mutation({
  args: {
    entries: v.array(
      v.object({
        key: v.string(),
        value: v.string(),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    for (const entry of args.entries) {
      const existing = await ctx.db
        .query("siteConfig")
        .withIndex("by_key", (q) => q.eq("key", entry.key))
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, { value: entry.value });
      } else {
        await ctx.db.insert("siteConfig", {
          key: entry.key,
          value: entry.value,
        });
      }
    }
    return null;
  },
});

/** Delete a config value */
export const remove = mutation({
  args: { key: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("siteConfig")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    return null;
  },
});
