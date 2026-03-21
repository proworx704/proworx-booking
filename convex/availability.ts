import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all availability settings
export const list = query({
  args: {},
  handler: async (ctx) => {
    const availability = await ctx.db.query("availability").collect();
    return availability.sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  },
});

// Get availability for a specific day
export const getByDay = query({
  args: { dayOfWeek: v.number() },
  handler: async (ctx, { dayOfWeek }) => {
    return await ctx.db
      .query("availability")
      .withIndex("by_day", (q) => q.eq("dayOfWeek", dayOfWeek))
      .first();
  },
});

// Update availability for a day
export const upsert = mutation({
  args: {
    dayOfWeek: v.number(),
    startTime: v.string(),
    endTime: v.string(),
    isAvailable: v.boolean(),
  },
  handler: async (ctx, { dayOfWeek, startTime, endTime, isAvailable }) => {
    const existing = await ctx.db
      .query("availability")
      .withIndex("by_day", (q) => q.eq("dayOfWeek", dayOfWeek))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { startTime, endTime, isAvailable });
      return existing._id;
    }
    return await ctx.db.insert("availability", {
      dayOfWeek,
      startTime,
      endTime,
      isAvailable,
    });
  },
});

// Seed default availability (Mon-Fri 9:30-18:00, Sat 9:30-15:00, Sun closed)
export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("availability").first();
    if (existing) return "Availability already seeded";

    const days = [
      { dayOfWeek: 0, startTime: "09:30", endTime: "18:00", isAvailable: false }, // Sunday
      { dayOfWeek: 1, startTime: "09:30", endTime: "18:00", isAvailable: true }, // Monday
      { dayOfWeek: 2, startTime: "09:30", endTime: "18:00", isAvailable: true }, // Tuesday
      { dayOfWeek: 3, startTime: "09:30", endTime: "18:00", isAvailable: true }, // Wednesday
      { dayOfWeek: 4, startTime: "09:30", endTime: "18:00", isAvailable: true }, // Thursday
      { dayOfWeek: 5, startTime: "09:30", endTime: "18:00", isAvailable: true }, // Friday
      { dayOfWeek: 6, startTime: "09:30", endTime: "15:00", isAvailable: true }, // Saturday
    ];

    for (const day of days) {
      await ctx.db.insert("availability", day);
    }

    return "Seeded availability";
  },
});

// --- Blocked dates ---

export const listBlockedDates = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("blockedDates").collect();
  },
});

export const addBlockedDate = mutation({
  args: {
    date: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if already blocked
    const existing = await ctx.db
      .query("blockedDates")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .first();
    if (existing) return existing._id;
    return await ctx.db.insert("blockedDates", args);
  },
});

export const removeBlockedDate = mutation({
  args: { id: v.id("blockedDates") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

// Public: get available time slots for a specific date and service duration
export const getAvailableSlots = query({
  args: {
    date: v.string(), // "2026-03-25"
    durationMinutes: v.number(),
  },
  handler: async (ctx, { date, durationMinutes }) => {
    // Check if date is blocked
    const blocked = await ctx.db
      .query("blockedDates")
      .withIndex("by_date", (q) => q.eq("date", date))
      .first();
    if (blocked) return [];

    // Get day of week for this date
    const dateObj = new Date(date + "T12:00:00");
    const dayOfWeek = dateObj.getUTCDay();

    // Get availability for this day
    const avail = await ctx.db
      .query("availability")
      .withIndex("by_day", (q) => q.eq("dayOfWeek", dayOfWeek))
      .first();

    if (!avail || !avail.isAvailable) return [];

    // Get existing bookings for this date
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_date", (q) => q.eq("date", date))
      .filter((q) =>
        q.and(
          q.neq(q.field("status"), "cancelled"),
        ),
      )
      .collect();

    const bookedTimes = new Set(bookings.map((b) => b.time));

    // Generate time slots
    const slots: string[] = [];
    const [startH, startM] = avail.startTime.split(":").map(Number);
    const [endH, endM] = avail.endTime.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    // Slots every 60 minutes, but ensure the service fits before end time
    for (
      let m = startMinutes;
      m + durationMinutes <= endMinutes;
      m += 60
    ) {
      const h = Math.floor(m / 60);
      const mins = m % 60;
      const timeStr = `${h.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;

      if (!bookedTimes.has(timeStr)) {
        slots.push(timeStr);
      }
    }

    return slots;
  },
});
