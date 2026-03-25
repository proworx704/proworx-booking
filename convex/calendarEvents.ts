/**
 * Calendar Events — Personal events, vacation blocks, day-off blocks, etc.
 *
 * Supports:
 *  - All-day events (single or multi-day)
 *  - Timed events with start/end time
 *  - Block time (prevents bookings during event)
 *  - Event types: personal, vacation, block, other
 */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Get all calendar events that overlap with a date range.
 * An event overlaps if its startDate <= rangeEnd AND endDate >= rangeStart.
 */
export const listByDateRange = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, { startDate, endDate }) => {
    // Get all events — filter in memory for range overlap
    // (Convex doesn't support range queries across two fields natively)
    const allEvents = await ctx.db.query("calendarEvents").collect();
    return allEvents.filter(
      (e) => e.startDate <= endDate && e.endDate >= startDate,
    );
  },
});

/** Get a single calendar event by ID. */
export const get = query({
  args: { id: v.id("calendarEvents") },
  handler: async (ctx, { id }) => {
    return ctx.db.get(id);
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────────

/** Create a new calendar event. */
export const create = mutation({
  args: {
    title: v.string(),
    eventType: v.union(
      v.literal("personal"),
      v.literal("vacation"),
      v.literal("block"),
      v.literal("other"),
    ),
    startDate: v.string(),
    endDate: v.string(),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    allDay: v.boolean(),
    blockTime: v.boolean(),
    notes: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("calendarEvents", {
      ...args,
    });
  },
});

/** Update an existing calendar event. */
export const update = mutation({
  args: {
    id: v.id("calendarEvents"),
    title: v.optional(v.string()),
    eventType: v.optional(
      v.union(
        v.literal("personal"),
        v.literal("vacation"),
        v.literal("block"),
        v.literal("other"),
      ),
    ),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    allDay: v.optional(v.boolean()),
    blockTime: v.optional(v.boolean()),
    notes: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Calendar event not found");

    // Only update provided fields
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }

    await ctx.db.patch(id, updates);
    return id;
  },
});

/** Delete a calendar event. */
export const remove = mutation({
  args: { id: v.id("calendarEvents") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
