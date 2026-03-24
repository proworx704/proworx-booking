import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./authHelpers";

/**
 * Import a batch of bookings from Square.
 * Deduplicates by squareBookingId.
 * Resolves customer by squareCustomerId → creates if not found.
 */
export const importBookings = mutation({
  args: {
    bookings: v.array(
      v.object({
        squareBookingId: v.string(),
        squareCustomerId: v.string(),
        startAt: v.string(), // ISO datetime
        durationMinutes: v.number(),
        status: v.string(), // ACCEPTED, PENDING, etc.
        addressLine1: v.string(),
        city: v.string(),
        state: v.string(),
        postalCode: v.string(),
        customerNote: v.optional(v.string()),
        serviceVariationId: v.optional(v.string()),
        source: v.optional(v.string()), // FIRST_PARTY_BUYER etc.
      }),
    ),
  },
  handler: async (ctx, { bookings }) => {
    let created = 0;
    let skipped = 0;

    for (const b of bookings) {
      // Check for duplicate by squareBookingId
      const existing = await ctx.db
        .query("bookings")
        .withIndex("by_square_booking_id", (q) =>
          q.eq("squareBookingId", b.squareBookingId),
        )
        .first();
      if (existing) {
        skipped++;
        continue;
      }

      // Parse date & time from ISO
      const dt = new Date(b.startAt);
      // Convert UTC to Eastern (UTC-4 during EDT Mar-Nov, UTC-5 otherwise)
      const month = dt.getUTCMonth(); // 0-based
      const isDST = month >= 2 && month <= 10; // Mar–Nov approximation
      const offsetHours = isDST ? -4 : -5;
      const eastern = new Date(dt.getTime() + offsetHours * 3600000);
      const hours = eastern.getUTCHours().toString().padStart(2, "0");
      const minutes = eastern.getUTCMinutes().toString().padStart(2, "0");
      const timeStr = `${hours}:${minutes}`;

      // Also compute eastern date (in case UTC midnight crossing)
      const easternDate = `${eastern.getUTCFullYear()}-${(eastern.getUTCMonth() + 1).toString().padStart(2, "0")}-${eastern.getUTCDate().toString().padStart(2, "0")}`;

      // Full address
      const fullAddr = `${b.addressLine1}, ${b.city}, ${b.state} ${b.postalCode}`;

      // Try to find customer by square ID
      let customerId = undefined;
      const customer = await ctx.db
        .query("customers")
        .withIndex("by_square_id", (q) =>
          q.eq("squareCustomerId", b.squareCustomerId),
        )
        .first();
      if (customer) {
        customerId = customer._id;
      }

      // Determine status mapping
      const statusMap: Record<string, string> = {
        ACCEPTED: "confirmed",
        PENDING: "pending",
      };
      const bookingStatus = (statusMap[b.status] || "pending") as
        | "pending"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled";

      // Generate confirmation code
      const code = `SQ-${b.squareBookingId.slice(0, 8).toUpperCase()}`;

      // Determine if booking is in the past
      const now = new Date();
      const isPast = dt < now;

      await ctx.db.insert("bookings", {
        customerName: customer?.name || "Square Customer",
        customerPhone: customer?.phone || "",
        customerEmail: customer?.email || "",
        serviceAddress: fullAddr,
        zipCode: b.postalCode,
        customerId: customerId,
        serviceName: "Square Booking (Imported)",
        price: 0,
        date: easternDate,
        time: timeStr,
        status: isPast ? "completed" : bookingStatus,
        paymentStatus: "unpaid",
        confirmationCode: code,
        notes: b.customerNote || `Imported from Square. Duration: ${b.durationMinutes}min`,
        squareBookingId: b.squareBookingId,
        totalDuration: b.durationMinutes,
      });
      created++;
    }

    return { created, skipped, total: bookings.length };
  },
});

/** List all Square-imported bookings for verification */
export const listImported = query({
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const all = await ctx.db.query("bookings").collect();
    return all.filter((b) => b.squareBookingId).map((b) => ({
      id: b._id,
      squareBookingId: b.squareBookingId,
      date: b.date,
      time: b.time,
      status: b.status,
      customerName: b.customerName,
      address: b.serviceAddress,
    }));
  },
});
