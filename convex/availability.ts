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

// Public: get available time slots for a specific date, service, and duration
// Now considers: business hours, blocked dates, service freezes, staff availability
export const getAvailableSlots = query({
  args: {
    date: v.string(), // "2026-03-25"
    durationMinutes: v.number(),
    serviceId: v.optional(v.id("services")),
  },
  handler: async (ctx, { date, durationMinutes, serviceId }) => {
    // Check if date is globally blocked
    const blocked = await ctx.db
      .query("blockedDates")
      .withIndex("by_date", (q) => q.eq("date", date))
      .first();
    if (blocked) return [];

    // Check if this specific service is frozen on this date
    if (serviceId) {
      const frozen = await ctx.db
        .query("serviceFreeze")
        .withIndex("by_service_date", (q) =>
          q.eq("serviceId", serviceId).eq("date", date),
        )
        .first();
      if (frozen) return [];
    }

    // Get day of week for this date
    const dateObj = new Date(date + "T12:00:00");
    const dayOfWeek = dateObj.getUTCDay();

    // Get business availability for this day
    const avail = await ctx.db
      .query("availability")
      .withIndex("by_day", (q) => q.eq("dayOfWeek", dayOfWeek))
      .first();

    if (!avail || !avail.isAvailable) return [];

    // Get existing bookings for this date (non-cancelled)
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_date", (q) => q.eq("date", date))
      .filter((q) => q.neq(q.field("status"), "cancelled"))
      .collect();

    // If we have staff, check which staff can do this service and are available
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

        // If no staff available for this service on this day, no slots
        if (staffAvailable.length === 0) return [];
      }
    }

    // Generate time slots
    const [startH, startM] = avail.startTime.split(":").map(Number);
    const [endH, endM] = avail.endTime.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    const slots: string[] = [];

    for (let m = startMinutes; m + durationMinutes <= endMinutes; m += 60) {
      const h = Math.floor(m / 60);
      const mins = m % 60;
      const timeStr = `${h.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;

      if (useStaffScheduling) {
        // Check if any staff member is available at this time
        const anyStaffFree = staffAvailable.some((s) => {
          // Staff hours check
          if (m < s.startMinutes || m + durationMinutes > s.endMinutes) return false;

          // Check for booking conflicts with this staff
          const staffBookings = bookings.filter((b) => b.staffId === s._id);
          const hasConflict = staffBookings.some((b) => {
            const [bH, bM] = b.time.split(":").map(Number);
            const bookingStart = bH * 60 + bM;
            // Use the service duration or 120 min buffer
            const bookingEnd = bookingStart + (durationMinutes || 120);
            return m < bookingEnd && m + durationMinutes > bookingStart;
          });
          return !hasConflict;
        });

        if (anyStaffFree) {
          slots.push(timeStr);
        }
      } else {
        // Legacy: just check if the time slot isn't already booked
        const bookedTimes = new Set(bookings.map((b) => b.time));
        if (!bookedTimes.has(timeStr)) {
          slots.push(timeStr);
        }
      }
    }

    return slots;
  },
});
