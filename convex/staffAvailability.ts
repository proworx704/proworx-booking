import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./authHelpers";

// Get availability for a staff member
export const getForStaff = query({
  args: { staffId: v.id("staff") },
  handler: async (ctx, { staffId }) => {
    await requireAdmin(ctx);
    const avail = await ctx.db
      .query("staffAvailability")
      .withIndex("by_staff", (q) => q.eq("staffId", staffId))
      .collect();
    return avail.sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  },
});

// Upsert availability for a staff member on a specific day
export const upsert = mutation({
  args: {
    staffId: v.id("staff"),
    dayOfWeek: v.number(),
    startTime: v.string(),
    endTime: v.string(),
    isAvailable: v.boolean(),
  },
  handler: async (ctx, { staffId, dayOfWeek, startTime, endTime, isAvailable }) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("staffAvailability")
      .withIndex("by_staff_day", (q) =>
        q.eq("staffId", staffId).eq("dayOfWeek", dayOfWeek),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { startTime, endTime, isAvailable });
      return existing._id;
    }

    return await ctx.db.insert("staffAvailability", {
      staffId,
      dayOfWeek,
      startTime,
      endTime,
      isAvailable,
    });
  },
});

// Bulk update all 7 days for a staff member
export const bulkUpdate = mutation({
  args: {
    staffId: v.id("staff"),
    schedule: v.array(
      v.object({
        dayOfWeek: v.number(),
        startTime: v.string(),
        endTime: v.string(),
        isAvailable: v.boolean(),
      }),
    ),
  },
  handler: async (ctx, { staffId, schedule }) => {
    await requireAdmin(ctx);
    for (const day of schedule) {
      const existing = await ctx.db
        .query("staffAvailability")
        .withIndex("by_staff_day", (q) =>
          q.eq("staffId", staffId).eq("dayOfWeek", day.dayOfWeek),
        )
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          startTime: day.startTime,
          endTime: day.endTime,
          isAvailable: day.isAvailable,
        });
      } else {
        await ctx.db.insert("staffAvailability", {
          staffId,
          ...day,
        });
      }
    }
  },
});

// Get available staff for a specific date, time, and service
export const getAvailableStaff = query({
  args: {
    date: v.string(),
    time: v.string(),
    serviceId: v.id("services"),
    durationMinutes: v.number(),
  },
  handler: async (ctx, { date, time, serviceId, durationMinutes }) => {
    await requireAdmin(ctx);
    // Get day of week
    const dateObj = new Date(date + "T12:00:00");
    const dayOfWeek = dateObj.getUTCDay();

    // Get all active staff assigned to this service
    const serviceAssignments = await ctx.db
      .query("staffServices")
      .withIndex("by_service", (q) => q.eq("serviceId", serviceId))
      .collect();

    const availableStaff = [];

    for (const assignment of serviceAssignments) {
      const staff = await ctx.db.get(assignment.staffId);
      if (!staff || !staff.isActive) continue;

      // Check staff availability for this day of week
      const staffAvail = await ctx.db
        .query("staffAvailability")
        .withIndex("by_staff_day", (q) =>
          q.eq("staffId", staff._id).eq("dayOfWeek", dayOfWeek),
        )
        .first();

      if (!staffAvail || !staffAvail.isAvailable) continue;

      // Check if the requested time fits within staff's hours
      const [reqH, reqM] = time.split(":").map(Number);
      const reqMinutes = reqH * 60 + reqM;
      const [startH, startM] = staffAvail.startTime.split(":").map(Number);
      const [endH, endM] = staffAvail.endTime.split(":").map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      if (reqMinutes < startMinutes || reqMinutes + durationMinutes > endMinutes) continue;

      // Check if staff already has a booking at this time
      const staffBookings = await ctx.db
        .query("bookings")
        .withIndex("by_staff_date", (q) =>
          q.eq("staffId", staff._id).eq("date", date),
        )
        .filter((q) => q.neq(q.field("status"), "cancelled"))
        .collect();

      const hasConflict = staffBookings.some((b) => {
        const [bH, bM] = b.time.split(":").map(Number);
        const bookingStart = bH * 60 + bM;
        // We'd need the booking's service duration too - use a default buffer
        const bookingEnd = bookingStart + 120; // assume 2hr buffer unless we have the actual duration
        const reqEnd = reqMinutes + durationMinutes;
        return reqMinutes < bookingEnd && reqEnd > bookingStart;
      });

      if (hasConflict) continue;

      availableStaff.push(staff);
    }

    return availableStaff;
  },
});
