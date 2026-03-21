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
      { dayOfWeek: 0, startTime: "09:30", endTime: "18:00", isAvailable: false },
      { dayOfWeek: 1, startTime: "09:30", endTime: "18:00", isAvailable: true },
      { dayOfWeek: 2, startTime: "09:30", endTime: "18:00", isAvailable: true },
      { dayOfWeek: 3, startTime: "09:30", endTime: "18:00", isAvailable: true },
      { dayOfWeek: 4, startTime: "09:30", endTime: "18:00", isAvailable: true },
      { dayOfWeek: 5, startTime: "09:30", endTime: "18:00", isAvailable: true },
      { dayOfWeek: 6, startTime: "09:30", endTime: "15:00", isAvailable: true },
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

// ─── Helper: compute Week A/B from reference date ─────────────────────────────

function computeWeekType(
  weekAStartDate: string,
  targetDate: string,
): "A" | "B" {
  const refDate = new Date(weekAStartDate + "T00:00:00Z");
  const target = new Date(targetDate + "T00:00:00Z");
  const diffMs = target.getTime() - refDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  return diffWeeks % 2 === 0 ? "A" : "B";
}

// ─── Public: get available time slots ─────────────────────────────────────────
// Considers: business hours, blocked dates, service freezes, staff availability,
// recurring schedule blocks (Week A/B), and ZIP-based "recommended" flagging.

export const getAvailableSlots = query({
  args: {
    date: v.string(),
    durationMinutes: v.number(),
    serviceId: v.optional(v.id("services")),
    zipCode: v.optional(v.string()),
  },
  handler: async (ctx, { date, durationMinutes, serviceId, zipCode }) => {
    // Check if date is globally blocked
    const blocked = await ctx.db
      .query("blockedDates")
      .withIndex("by_date", (q) => q.eq("date", date))
      .first();
    if (blocked) return [];

    // Check service freeze
    if (serviceId) {
      const frozen = await ctx.db
        .query("serviceFreeze")
        .withIndex("by_service_date", (q) =>
          q.eq("serviceId", serviceId).eq("date", date),
        )
        .first();
      if (frozen) return [];
    }

    // Get day of week
    const dateObj = new Date(date + "T12:00:00");
    const dayOfWeek = dateObj.getUTCDay();

    // Get business availability
    const avail = await ctx.db
      .query("availability")
      .withIndex("by_day", (q) => q.eq("dayOfWeek", dayOfWeek))
      .first();
    if (!avail || !avail.isAvailable) return [];

    // ─── Check recurring schedule blocks (Week A/B) ───────────
    let effectiveEndTime = avail.endTime;
    const rbSettings = await ctx.db.query("recurringBlockSettings").first();
    if (rbSettings && rbSettings.isEnabled) {
      const weekType = computeWeekType(rbSettings.weekAStartDate, date);
      const block = await ctx.db
        .query("recurringBlocks")
        .withIndex("by_week_day", (q) =>
          q.eq("weekType", weekType).eq("dayOfWeek", dayOfWeek),
        )
        .first();
      if (block) {
        // Cap end time at blockAfter
        const [bH, bM] = block.blockAfter.split(":").map(Number);
        const [eH, eM] = avail.endTime.split(":").map(Number);
        const blockMinutes = bH * 60 + bM;
        const endMinutes = eH * 60 + eM;
        if (blockMinutes < endMinutes) {
          effectiveEndTime = block.blockAfter;
        }
      }
    }

    // Get existing bookings for this date
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_date", (q) => q.eq("date", date))
      .filter((q) => q.neq(q.field("status"), "cancelled"))
      .collect();

    // Staff-based scheduling
    let staffAvailable: Array<{ _id: string; startMinutes: number; endMinutes: number }> = [];
    let useStaffScheduling = false;

    if (serviceId) {
      const serviceAssignments = await ctx.db
        .query("staffServices")
        .withIndex("by_service", (q) => q.eq("serviceId", serviceId))
        .collect();

      if (serviceAssignments.length > 0) {
        useStaffScheduling = true;
        for (const assignment of serviceAssignments) {
          const staff = await ctx.db.get(assignment.staffId);
          if (!staff || !staff.isActive) continue;

          const staffAvailForDay = await ctx.db
            .query("staffAvailability")
            .withIndex("by_staff_day", (q) =>
              q.eq("staffId", staff._id).eq("dayOfWeek", dayOfWeek),
            )
            .first();

          if (!staffAvailForDay || !staffAvailForDay.isAvailable) continue;

          const [sH, sM] = staffAvailForDay.startTime.split(":").map(Number);
          const [eH, eM] = staffAvailForDay.endTime.split(":").map(Number);
          staffAvailable.push({
            _id: staff._id as string,
            startMinutes: sH * 60 + sM,
            endMinutes: eH * 60 + eM,
          });
        }

        if (staffAvailable.length === 0) return [];
      }
    }

    // ZIP code recommendation check
    const hasZipMatch =
      zipCode && zipCode.trim().length >= 3
        ? bookings.some((b) => b.zipCode && b.zipCode === zipCode.trim())
        : false;

    // Generate time slots
    const [startH, startM] = avail.startTime.split(":").map(Number);
    const [endH, endM] = effectiveEndTime.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    // ─── Filter out past time slots for today ─────────────────
    // Convert current UTC time to Eastern Time (UTC-4 EDT / UTC-5 EST)
    const nowUtc = Date.now();
    const nowEastern = new Date(nowUtc);
    // Use manual offset: check if in DST (March-November roughly)
    const month = nowEastern.getUTCMonth(); // 0-indexed
    const isDST = month >= 2 && month <= 10; // March(2) through November(10)
    const offsetHours = isDST ? -4 : -5;
    const easternMs = nowUtc + offsetHours * 60 * 60 * 1000;
    const easternDate = new Date(easternMs);
    const todayStr = `${easternDate.getUTCFullYear()}-${String(easternDate.getUTCMonth() + 1).padStart(2, "0")}-${String(easternDate.getUTCDate()).padStart(2, "0")}`;
    const isToday = date === todayStr;
    // Current time in minutes (Eastern), plus 30 min buffer for booking lead time
    const nowMinutesEastern = isToday
      ? easternDate.getUTCHours() * 60 + easternDate.getUTCMinutes() + 30
      : 0;

    const slots: Array<{ time: string; recommended: boolean }> = [];

    for (let m = startMinutes; m + durationMinutes <= endMinutes; m += 60) {
      // Skip past slots for today
      if (isToday && m < nowMinutesEastern) continue;
      const h = Math.floor(m / 60);
      const mins = m % 60;
      const timeStr = `${h.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;

      if (useStaffScheduling) {
        const anyStaffFree = staffAvailable.some((s) => {
          if (m < s.startMinutes || m + durationMinutes > s.endMinutes) return false;
          const staffBookings = bookings.filter((b) => b.staffId === s._id);
          const hasConflict = staffBookings.some((b) => {
            const [bH, bM] = b.time.split(":").map(Number);
            const bookingStart = bH * 60 + bM;
            const bookingEnd = bookingStart + (durationMinutes || 120);
            return m < bookingEnd && m + durationMinutes > bookingStart;
          });
          return !hasConflict;
        });

        if (anyStaffFree) {
          slots.push({ time: timeStr, recommended: hasZipMatch });
        }
      } else {
        const bookedTimes = new Set(bookings.map((b) => b.time));
        if (!bookedTimes.has(timeStr)) {
          slots.push({ time: timeStr, recommended: hasZipMatch });
        }
      }
    }

    return slots;
  },
});
