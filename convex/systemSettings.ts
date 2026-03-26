/**
 * System Settings — secure key-value store for API keys, config, etc.
 *
 * Keys are stored in the Convex database (server-side only, never sent to client).
 * Admin-only access via requireAuth.
 */
import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";

// ── Admin queries/mutations (require auth) ─────────────────────────────────

export const get = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const row = await ctx.db
      .query("systemSettings")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    return row?.value ?? null;
  },
});

export const set = mutation({
  args: { key: v.string(), value: v.string() },
  handler: async (ctx, { key, value }) => {
    const existing = await ctx.db
      .query("systemSettings")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { value, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("systemSettings", { key, value, updatedAt: Date.now() });
    }
    return "ok";
  },
});

// ── Internal query (for use by other server functions like AI assistant) ───

export const getInternal = internalQuery({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const row = await ctx.db
      .query("systemSettings")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    return row?.value ?? null;
  },
});
