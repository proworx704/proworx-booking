import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

function generateConfirmationCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "PW-";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Public: create a new booking (no auth required)
export const create = mutation({
  args: {
    customerName: v.string(),
    customerPhone: v.string(),
    customerEmail: v.string(),
    serviceAddress: v.string(),
    serviceId: v.id("services"),
    vehicleType: v.union(v.literal("sedan"), v.literal("suv")),
    date: v.string(),
    time: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get service details
    const service = await ctx.db.get(args.serviceId);
    if (!service) throw new Error("Service not found");

    const price =
      args.vehicleType === "sedan" ? service.sedanPrice : service.suvPrice;

    const confirmationCode = generateConfirmationCode();

    // Auto-assign staff if possible
    let staffId: string | undefined;
    let staffName: string | undefined;

    // Find staff who can do this service and are available
    const serviceAssignments = await ctx.db
      .query("staffServices")
      .withIndex("by_service", (q) => q.eq("serviceId", args.serviceId))
      .collect();

    if (serviceAssignments.length > 0) {
      const dateObj = new Date(args.date + "T12:00:00");
      const dayOfWeek = dateObj.getUTCDay();
      const [reqH, reqM] = args.time.split(":").map(Number);
      const reqMinutes = reqH * 60 + reqM;

      // Get existing bookings on this date
      const existingBookings = await ctx.db
        .query("bookings")
        .withIndex("by_date", (q) => q.eq("date", args.date))
        .filter((q) => q.neq(q.field("status"), "cancelled"))
        .collect();

      for (const assignment of serviceAssignments) {
        const staff = await ctx.db.get(assignment.staffId);
        if (!staff || !staff.isActive) continue;

        // Check staff day availability
        const staffAvail = await ctx.db
          .query("staffAvailability")
          .withIndex("by_staff_day", (q) =>
            q.eq("staffId", staff._id).eq("dayOfWeek", dayOfWeek),
          )
          .first();

        if (!staffAvail || !staffAvail.isAvailable) continue;

        const [sH, sM] = staffAvail.startTime.split(":").map(Number);
        const [eH, eM] = staffAvail.endTime.split(":").map(Number);
        if (reqMinutes < sH * 60 + sM || reqMinutes + service.duration > eH * 60 + eM) continue;

        // Check for booking conflicts
        const staffBookings = existingBookings.filter((b) => b.staffId === staff._id);
        const hasConflict = staffBookings.some((b) => {
          const [bH, bM] = b.time.split(":").map(Number);
          const bookingStart = bH * 60 + bM;
          const bookingEnd = bookingStart + service.duration;
          return reqMinutes < bookingEnd && reqMinutes + service.duration > bookingStart;
        });

        if (!hasConflict) {
          staffId = staff._id;
          staffName = staff.name;
          break;
        }
      }
    }

    const bookingId = await ctx.db.insert("bookings", {
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      customerEmail: args.customerEmail,
      serviceAddress: args.serviceAddress,
      serviceId: args.serviceId,
      serviceName: service.name,
      vehicleType: args.vehicleType,
      price,
      date: args.date,
      time: args.time,
      status: "confirmed",
      paymentStatus: "unpaid",
      confirmationCode,
      notes: args.notes,
      staffId: staffId as any,
      staffName,
    });

    return { bookingId, confirmationCode, price, serviceName: service.name, staffName };
  },
});

// Public: look up booking by confirmation code
export const getByConfirmation = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    return await ctx.db
      .query("bookings")
      .withIndex("by_confirmation", (q) => q.eq("confirmationCode", code))
      .first();
  },
});

// Admin: list all bookings with optional filters
export const list = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("confirmed"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("cancelled"),
      ),
    ),
    date: v.optional(v.string()),
    staffId: v.optional(v.id("staff")),
  },
  handler: async (ctx, { status, date, staffId }) => {
    if (staffId && date) {
      const results = await ctx.db
        .query("bookings")
        .withIndex("by_staff_date", (q) =>
          q.eq("staffId", staffId).eq("date", date),
        )
        .collect();
      if (status) return results.filter((b) => b.status === status);
      return results.sort((a, b) => a.time.localeCompare(b.time));
    }

    if (date) {
      const results = await ctx.db
        .query("bookings")
        .withIndex("by_date", (q) => q.eq("date", date))
        .collect();
      const filtered = status ? results.filter((b) => b.status === status) : results;
      if (staffId) return filtered.filter((b) => b.staffId === staffId);
      return filtered.sort((a, b) => a.time.localeCompare(b.time));
    }

    if (status) {
      const results = await ctx.db
        .query("bookings")
        .withIndex("by_status", (q) => q.eq("status", status))
        .collect();
      if (staffId) return results.filter((b) => b.staffId === staffId);
      return results.sort(
        (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time),
      );
    }

    const results = await ctx.db.query("bookings").collect();
    const filtered = staffId ? results.filter((b) => b.staffId === staffId) : results;
    return filtered.sort(
      (a, b) => b.date.localeCompare(a.date) || a.time.localeCompare(b.time),
    );
  },
});

// Admin: list bookings for today
export const listToday = query({
  args: { today: v.string() },
  handler: async (ctx, { today }) => {
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_date", (q) => q.eq("date", today))
      .filter((q) => q.neq(q.field("status"), "cancelled"))
      .collect();
    return bookings.sort((a, b) => a.time.localeCompare(b.time));
  },
});

// Admin: list upcoming bookings (next 7 days, excluding today)
export const listUpcoming = query({
  args: { startDate: v.string(), endDate: v.string() },
  handler: async (ctx, { startDate, endDate }) => {
    const bookings = await ctx.db
      .query("bookings")
      .filter((q) =>
        q.and(
          q.gt(q.field("date"), startDate),
          q.lte(q.field("date"), endDate),
          q.neq(q.field("status"), "cancelled"),
        ),
      )
      .collect();
    return bookings.sort(
      (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time),
    );
  },
});

// Admin: get a single booking
export const get = query({
  args: { id: v.id("bookings") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

// Admin: update booking status
export const updateStatus = mutation({
  args: {
    id: v.id("bookings"),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled"),
    ),
  },
  handler: async (ctx, { id, status }) => {
    await ctx.db.patch(id, { status });
  },
});

// Admin: assign staff to booking
export const assignStaff = mutation({
  args: {
    id: v.id("bookings"),
    staffId: v.id("staff"),
  },
  handler: async (ctx, { id, staffId }) => {
    const staff = await ctx.db.get(staffId);
    if (!staff) throw new Error("Staff member not found");
    await ctx.db.patch(id, { staffId, staffName: staff.name });
  },
});

// Admin: unassign staff from booking
export const unassignStaff = mutation({
  args: { id: v.id("bookings") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, { staffId: undefined, staffName: undefined });
  },
});

// Admin: mark as paid
export const markPaid = mutation({
  args: {
    id: v.id("bookings"),
    paymentMethod: v.string(),
    paymentAmount: v.number(),
    paymentId: v.optional(v.string()),
  },
  handler: async (ctx, { id, paymentMethod, paymentAmount, paymentId }) => {
    await ctx.db.patch(id, {
      paymentStatus: "paid",
      paymentMethod,
      paymentAmount,
      paymentId,
      paidAt: Date.now(),
    });
  },
});

// Admin: update notes
export const updateNotes = mutation({
  args: {
    id: v.id("bookings"),
    notes: v.string(),
  },
  handler: async (ctx, { id, notes }) => {
    await ctx.db.patch(id, { notes });
  },
});

// Admin: get booking stats
export const stats = query({
  args: { today: v.string() },
  handler: async (ctx, { today }) => {
    const allBookings = await ctx.db.query("bookings").collect();

    const todayBookings = allBookings.filter(
      (b) => b.date === today && b.status !== "cancelled",
    );
    const upcoming = allBookings.filter(
      (b) => b.date > today && b.status !== "cancelled",
    );
    const unpaid = allBookings.filter(
      (b) =>
        b.paymentStatus === "unpaid" &&
        b.status !== "cancelled" &&
        b.date <= today,
    );
    const totalRevenue = allBookings
      .filter((b) => b.paymentStatus === "paid")
      .reduce((sum, b) => sum + (b.paymentAmount || b.price), 0);

    return {
      todayCount: todayBookings.length,
      upcomingCount: upcoming.length,
      unpaidCount: unpaid.length,
      totalRevenue,
    };
  },
});

// Admin: get bookings for a specific staff member
export const listByStaff = query({
  args: {
    staffId: v.id("staff"),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, { staffId, startDate, endDate }) => {
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_staff", (q) => q.eq("staffId", staffId))
      .filter((q) => q.neq(q.field("status"), "cancelled"))
      .collect();

    let filtered = bookings;
    if (startDate) filtered = filtered.filter((b) => b.date >= startDate);
    if (endDate) filtered = filtered.filter((b) => b.date <= endDate);

    return filtered.sort(
      (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time),
    );
  },
});

// Public: submit satisfaction feedback
export const submitFeedback = mutation({
  args: {
    confirmationCode: v.string(),
    satisfaction: v.union(v.literal("yes"), v.literal("no")),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { confirmationCode, satisfaction, note }) => {
    const booking = await ctx.db
      .query("bookings")
      .withIndex("by_confirmation", (q) =>
        q.eq("confirmationCode", confirmationCode),
      )
      .first();
    if (!booking) throw new Error("Booking not found");

    await ctx.db.patch(booking._id, {
      satisfaction,
      followUpNote: note,
      followUpSent: true,
    });

    return { satisfaction };
  },
});
