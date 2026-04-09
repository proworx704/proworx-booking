/**
 * Pre-Appointment Agreement — sent automatically when a booking is created.
 *
 * Customer receives a link in their confirmation email/SMS. They view the
 * agreement at /agreement?code=XXXX and sign by entering their full name.
 *
 * The agreement covers expectations: punctuality, vehicle prep, payment,
 * variable pricing, cancellation, etc.
 */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ─── Public Queries (no auth required — accessed via confirmation code) ──────

/** Look up booking for the agreement page (public, by confirmation code) */
export const getByCode = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const booking = await ctx.db
      .query("bookings")
      .withIndex("by_confirmation", (q) => q.eq("confirmationCode", code))
      .first();

    if (!booking) return null;

    // Return only what the agreement page needs — no sensitive data
    return {
      _id: booking._id,
      customerName: booking.customerName,
      serviceName: booking.serviceName,
      selectedVariant: booking.selectedVariant,
      date: booking.date,
      time: booking.time,
      serviceAddress: booking.serviceAddress,
      totalPrice: booking.totalPrice,
      price: booking.price,
      confirmationCode: booking.confirmationCode,
      agreementSigned: booking.agreementSigned ?? false,
      agreementSignedAt: booking.agreementSignedAt,
      agreementSignerName: booking.agreementSignerName,
    };
  },
});

/** Sign the pre-appointment agreement (public, by confirmation code) */
export const sign = mutation({
  args: {
    confirmationCode: v.string(),
    signerName: v.string(),
  },
  handler: async (ctx, { confirmationCode, signerName }) => {
    const booking = await ctx.db
      .query("bookings")
      .withIndex("by_confirmation", (q) => q.eq("confirmationCode", confirmationCode))
      .first();

    if (!booking) throw new Error("Booking not found");
    if (booking.agreementSigned) throw new Error("Agreement already signed");

    await ctx.db.patch(booking._id, {
      agreementSigned: true,
      agreementSignedAt: Date.now(),
      agreementSignerName: signerName.trim(),
    });

    return { success: true };
  },
});

// ─── Admin Query — check agreement status for a booking ─────────────────────

/** Get agreement status for a booking (admin use) */
export const getStatus = query({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, { bookingId }) => {
    const booking = await ctx.db.get(bookingId);
    if (!booking) return null;

    return {
      agreementSigned: booking.agreementSigned ?? false,
      agreementSignedAt: booking.agreementSignedAt,
      agreementSignerName: booking.agreementSignerName,
    };
  },
});
