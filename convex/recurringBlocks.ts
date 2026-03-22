import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Week A / Week B recurring schedule blocks.
 *
 * Tyler has an alternating custody schedule — some days he can't work
 * past a certain time. This module lets him define blocks per week type
 * and automatically determines which week is A or B using a reference date.
 */

// ─── Settings ─────────────────────────────────────────────────────────────────

/** Get recurring block settings */
export const getSettings = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("recurringBlockSettings").first();
  },
});

/** Save/update settings */
export const saveSettings = mutation({
  args: {
    weekAStartDate: v.string(), // Monday of a known Week A, e.g. "2026-03-23"
    isEnabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("recurringBlockSettings").first();
    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }
    return await ctx.db.insert("recurringBlockSettings", args);
  },
});

// ─── Block rules ──────────────────────────────────────────────────────────────

/** List all recurring blocks */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const blocks = await ctx.db.query("recurringBlocks").collect();
    return blocks.sort((a, b) => {
      if (a.weekType !== b.weekType) return a.weekType === "A" ? -1 : 1;
      return a.dayOfWeek - b.dayOfWeek;
    });
  },
});

/** Get blocks for a specific week type */
export const listByWeek = query({
  args: { weekType: v.union(v.literal("A"), v.literal("B")) },
  handler: async (ctx, { weekType }) => {
    const blocks = await ctx.db
      .query("recurringBlocks")
      .collect();
    return blocks
      .filter((b) => b.weekType === weekType)
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  },
});

/** Add or update a block rule */
export const upsert = mutation({
  args: {
    weekType: v.union(v.literal("A"), v.literal("B")),
    dayOfWeek: v.number(), // 0-6
    blockAfter: v.string(), // "16:00"
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check for existing block on this week+day
    const existing = await ctx.db
      .query("recurringBlocks")
      .withIndex("by_week_day", (q) =>
        q.eq("weekType", args.weekType).eq("dayOfWeek", args.dayOfWeek),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        blockAfter: args.blockAfter,
        reason: args.reason,
      });
      return existing._id;
    }
    return await ctx.db.insert("recurringBlocks", args);
  },
});

/** Remove a block rule */
export const remove = mutation({
  args: { id: v.id("recurringBlocks") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

/** Remove all blocks for a given week type + day */
export const removeByWeekDay = mutation({
  args: {
    weekType: v.union(v.literal("A"), v.literal("B")),
    dayOfWeek: v.number(),
  },
  handler: async (ctx, { weekType, dayOfWeek }) => {
    const block = await ctx.db
      .query("recurringBlocks")
      .withIndex("by_week_day", (q) =>
        q.eq("weekType", weekType).eq("dayOfWeek", dayOfWeek),
      )
      .first();
    if (block) await ctx.db.delete(block._id);
  },
});

// ─── Utility query: determine week type for any date ──────────────────────────

/**
 * Given a date string, returns "A", "B", or null (if disabled).
 * Uses the reference weekAStartDate (a Monday) to compute alternation.
 */
export const getWeekType = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const settings = await ctx.db.query("recurringBlockSettings").first();
    if (!settings || !settings.isEnabled) return null;

    return computeWeekType(settings.weekAStartDate, date);
  },
});

/**
 * Get the effective block-after time for a specific date, if any.
 * Returns the blockAfter time string or null.
 */
export const getBlockForDate = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const settings = await ctx.db.query("recurringBlockSettings").first();
    if (!settings || !settings.isEnabled) return null;

    const weekType = computeWeekType(settings.weekAStartDate, date);
    if (!weekType) return null;

    const dateObj = new Date(date + "T12:00:00");
    const dayOfWeek = dateObj.getUTCDay();

    const block = await ctx.db
      .query("recurringBlocks")
      .withIndex("by_week_day", (q) =>
        q.eq("weekType", weekType as "A" | "B").eq("dayOfWeek", dayOfWeek),
      )
      .first();

    return block ? { blockAfter: block.blockAfter, reason: block.reason, weekType } : null;
  },
});

// ─── Helper ───────────────────────────────────────────────────────────────────

function computeWeekType(
  weekAStartDate: string,
  targetDate: string,
): "A" | "B" {
  // Both dates are "YYYY-MM-DD"
  const refDate = new Date(weekAStartDate + "T00:00:00Z");
  const target = new Date(targetDate + "T00:00:00Z");

  const diffMs = target.getTime() - refDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);

  // Even weeks from reference = A, odd = B
  return diffWeeks % 2 === 0 ? "A" : "B";
}

// ─── Calendar view: get blocks for a range of dates ───────────────────────────
export const getBlocksForRange = query({
  args: { startDate: v.string(), endDate: v.string() },
  handler: async (ctx, { startDate, endDate }) => {
    const settings = await ctx.db.query("recurringBlockSettings").first();
    if (!settings || !settings.isEnabled) return [];

    const blocks = await ctx.db.query("recurringBlocks").collect();
    if (blocks.length === 0) return [];

    const results: Array<{
      date: string;
      dayOfWeek: number;
      weekType: "A" | "B";
      blockAfter: string;
      reason?: string;
    }> = [];

    // Iterate dates in range
    const start = new Date(startDate + "T12:00:00");
    const end = new Date(endDate + "T12:00:00");

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      const dayOfWeek = d.getDay(); // 0=Sunday

      const weekType = computeWeekType(settings.weekAStartDate, dateStr);
      const block = blocks.find(
        (b) => b.weekType === weekType && b.dayOfWeek === dayOfWeek,
      );
      if (block) {
        results.push({
          date: dateStr,
          dayOfWeek,
          weekType,
          blockAfter: block.blockAfter,
          reason: block.reason,
        });
      }
    }

    return results;
  },
});
