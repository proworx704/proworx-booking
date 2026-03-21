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
    });

    return { bookingId, confirmationCode, price, serviceName: service.name };
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
  },
  handler: async (ctx, { status, date }) => {
    let q = ctx.db.query("bookings");

    if (date) {
      const results = await q
        .withIndex("by_date", (idx) => idx.eq("date", date))
        .collect();
      if (status) {
        return results
          .filter((b) => b.status === status)
          .sort((a, b) => a.time.localeCompare(b.time));
      }
      return results.sort((a, b) => a.time.localeCompare(b.time));
    }

    if (status) {
      const results = await q
        .withIndex("by_status", (idx) => idx.eq("status", status))
        .collect();
      return results.sort(
        (a, b) =>
          a.date.localeCompare(b.date) || a.time.localeCompare(b.time),
      );
    }

    const results = await q.collect();
    return results.sort(
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
