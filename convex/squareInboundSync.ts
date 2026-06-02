/**
 * Square Inbound Sync — Polls Square Bookings API for new bookings.
 *
 * Runs on a cron (every 5 minutes). When it finds a Square booking that
 * doesn't exist in the ProWorx system, it imports it and triggers the
 * confirmation email/SMS (which includes the pre-appointment agreement link).
 */
import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

const SQUARE_BASE_URL = "https://connect.squareup.com/v2";
const LOCATION_ID = "9VRKFJAZZM3HG";

// ── Helper: get Square access token ─────────────────────────────────────
async function getSquareToken(ctx: any): Promise<string | null> {
  const token = await ctx.runQuery(internal.systemSettings.getInternal, {
    key: "square_access_token",
  });
  return token ?? null;
}

// ── Helper: call Square API ─────────────────────────────────────────────
async function squareApi(
  token: string,
  endpoint: string,
  method: "GET" | "POST" = "GET",
  body?: any,
): Promise<{ ok: boolean; data?: any; error?: string }> {
  try {
    const res = await fetch(`${SQUARE_BASE_URL}${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Square-Version": "2025-03-19",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) {
      const errMsg = data?.errors?.map((e: any) => e.detail).join("; ") || `HTTP ${res.status}`;
      return { ok: false, error: errMsg };
    }
    return { ok: true, data };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

// ── Main: Poll Square for new bookings ──────────────────────────────────
export const pollNewBookings = internalAction({
  handler: async (ctx) => {
    const token = await getSquareToken(ctx);
    if (!token) {
      console.log("[SquareInbound] No square_access_token — skipping.");
      return;
    }

    // Look back 3 days minimum so we catch bookings with future start times
    // that might have been rescheduled, plus 30 days ahead
    const now = new Date();
    const startAt = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const endAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const listResult = await squareApi(
      token,
      `/bookings?location_id=${LOCATION_ID}&start_at_min=${startAt.toISOString()}&start_at_max=${endAt.toISOString()}&limit=100`,
      "GET",
    );

    if (!listResult.ok) {
      console.error("[SquareInbound] Failed to list bookings:", listResult.error);
      return;
    }

    const squareBookings = listResult.data?.bookings || [];
    if (squareBookings.length === 0) {
      // Update last sync time even if nothing found
      await ctx.runMutation(internal.squareInboundSync.updateLastSync, {
        timestamp: now.toISOString(),
      });
      return;
    }

    console.log(`[SquareInbound] Found ${squareBookings.length} Square bookings to check.`);

    let imported = 0;
    for (const sb of squareBookings) {
      // Check if already exists in our system
      const exists = await ctx.runQuery(internal.squareInboundSync.bookingExistsBySquareId, {
        squareBookingId: sb.id,
      });
      if (exists) continue;

      // Skip cancelled bookings
      if (sb.status === "CANCELLED_BY_CUSTOMER" || sb.status === "CANCELLED_BY_SELLER") {
        continue;
      }

      // Get customer info from Square
      let customerName = "Square Customer";
      let customerPhone = "";
      let customerEmail = "";

      if (sb.customer_id) {
        const custResult = await squareApi(token, `/customers/${sb.customer_id}`, "GET");
        if (custResult.ok && custResult.data?.customer) {
          const c = custResult.data.customer;
          customerName = [c.given_name, c.family_name].filter(Boolean).join(" ") || "Square Customer";
          customerPhone = c.phone_number || "";
          customerEmail = c.email_address || "";
        }
      }

      // Parse date/time — proper ET conversion
      const dt = new Date(sb.start_at);
      const etStr = dt.toLocaleString("en-US", { timeZone: "America/New_York" });
      const etDate = new Date(etStr);
      const dateStr = `${etDate.getFullYear()}-${(etDate.getMonth() + 1).toString().padStart(2, "0")}-${etDate.getDate().toString().padStart(2, "0")}`;
      const timeStr = `${etDate.getHours().toString().padStart(2, "0")}:${etDate.getMinutes().toString().padStart(2, "0")}`;

      // Get duration from appointment segments
      const duration = sb.appointment_segments?.[0]?.duration_minutes || 120;

      // Get service address from customer note or location
      const customerNote = sb.customer_note || "";
      const serviceAddress = sb.location_id ? "" : ""; // Square bookings don't always have address

      // Create booking in ProWorx system
      const bookingId = await ctx.runMutation(internal.squareInboundSync.createFromSquare, {
        customerName,
        customerPhone,
        customerEmail,
        serviceAddress: customerNote.includes(",") ? customerNote : "",
        date: dateStr,
        time: timeStr,
        squareBookingId: sb.id,
        squareCustomerId: sb.customer_id || "",
        duration,
        customerNote,
      });

      if (bookingId) {
        // NOTE (2026-04-28): Confirmation email DISABLED per Tyler's request.
        // All customer notifications should come from Square directly.
        // await ctx.scheduler.runAfter(0, internal.notifications.sendConfirmation, { bookingId });
        imported++;
        console.log(`[SquareInbound] Imported Square booking ${sb.id} → ${bookingId}`);
      }
    }

    // Update last sync timestamp
    await ctx.runMutation(internal.squareInboundSync.updateLastSync, {
      timestamp: now.toISOString(),
    });

    if (imported > 0) {
      console.log(`[SquareInbound] Imported ${imported} new bookings from Square.`);
    }
  },
});

// ── Check if booking exists by Square ID ────────────────────────────────
export const bookingExistsBySquareId = internalQuery({
  args: { squareBookingId: v.string() },
  handler: async (ctx, { squareBookingId }) => {
    const existing = await ctx.db
      .query("bookings")
      .withIndex("by_square_booking_id", (q) => q.eq("squareBookingId", squareBookingId))
      .first();
    return !!existing;
  },
});

// ── Create booking from Square data ─────────────────────────────────────
export const createFromSquare = internalMutation({
  args: {
    customerName: v.string(),
    customerPhone: v.string(),
    customerEmail: v.string(),
    serviceAddress: v.string(),
    date: v.string(),
    time: v.string(),
    squareBookingId: v.string(),
    squareCustomerId: v.string(),
    duration: v.number(),
    customerNote: v.string(),
  },
  handler: async (ctx, args) => {
    // Generate confirmation code
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "PW-";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Try to match existing customer
    let customerId = undefined;
    if (args.squareCustomerId) {
      const customer = await ctx.db
        .query("customers")
        .withIndex("by_square_id", (q) => q.eq("squareCustomerId", args.squareCustomerId))
        .first();
      if (customer) customerId = customer._id;
    }
    if (!customerId && args.customerEmail) {
      const customer = await ctx.db
        .query("customers")
        .withIndex("by_email", (q) => q.eq("email", args.customerEmail))
        .first();
      if (customer) customerId = customer._id;
    }
    if (!customerId && args.customerPhone) {
      const customer = await ctx.db
        .query("customers")
        .withIndex("by_phone", (q) => q.eq("phone", args.customerPhone))
        .first();
      if (customer) customerId = customer._id;
    }

    const bookingId = await ctx.db.insert("bookings", {
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      customerEmail: args.customerEmail,
      serviceAddress: args.serviceAddress,
      zipCode: "",
      customerId: customerId,
      serviceName: "Square Booking",
      price: 0,
      date: args.date,
      time: args.time,
      status: "confirmed",
      paymentStatus: "unpaid",
      confirmationCode: code,
      notes: args.customerNote || "Imported from Square",
      squareBookingId: args.squareBookingId,
      totalDuration: args.duration,
    });

    return bookingId;
  },
});

// ── Update last sync timestamp ──────────────────────────────────────────
export const updateLastSync = internalMutation({
  args: { timestamp: v.string() },
  handler: async (ctx, { timestamp }) => {
    const existing = await ctx.db
      .query("systemSettings")
      .withIndex("by_key", (q) => q.eq("key", "square_inbound_last_sync"))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { value: timestamp, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("systemSettings", {
        key: "square_inbound_last_sync",
        value: timestamp,
        updatedAt: Date.now(),
      });
    }
  },
});

// ── Manual sync with diagnostics ────────────────────────────────────────
export const manualSync = action({
  args: {},
  handler: async (ctx) => {
    const token = await getSquareToken(ctx);
    if (!token) {
      return { success: false, error: "No Square access token — go to Settings to add one.", found: 0, imported: 0 };
    }

    // Always look back 7 days for manual sync to catch all upcoming + recent bookings
    const now = new Date();
    const startAt = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const endAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const listResult = await squareApi(
      token,
      `/bookings?location_id=${LOCATION_ID}&start_at_min=${startAt.toISOString()}&start_at_max=${endAt.toISOString()}&limit=100`,
      "GET",
    );

    if (!listResult.ok) {
      return { success: false, error: `Square API error: ${listResult.error}`, found: 0, imported: 0 };
    }

    const squareBookings = listResult.data?.bookings || [];
    let imported = 0;
    let skippedExisting = 0;
    let skippedCancelled = 0;

    for (const sb of squareBookings) {
      if (sb.status === "CANCELLED_BY_CUSTOMER" || sb.status === "CANCELLED_BY_SELLER") {
        skippedCancelled++;
        continue;
      }

      const exists = await ctx.runQuery(internal.squareInboundSync.bookingExistsBySquareId, {
        squareBookingId: sb.id,
      });
      if (exists) {
        skippedExisting++;
        continue;
      }

      // Get customer info
      let customerName = "Square Customer";
      let customerPhone = "";
      let customerEmail = "";

      if (sb.customer_id) {
        const custResult = await squareApi(token, `/customers/${sb.customer_id}`, "GET");
        if (custResult.ok && custResult.data?.customer) {
          const c = custResult.data.customer;
          customerName = [c.given_name, c.family_name].filter(Boolean).join(" ") || "Square Customer";
          customerPhone = c.phone_number || "";
          customerEmail = c.email_address || "";
        }
      }

      // Parse date/time — proper ET conversion
      const dt = new Date(sb.start_at);
      const etStr = dt.toLocaleString("en-US", { timeZone: "America/New_York" });
      const etDate = new Date(etStr);
      const dateStr = `${etDate.getFullYear()}-${(etDate.getMonth() + 1).toString().padStart(2, "0")}-${etDate.getDate().toString().padStart(2, "0")}`;
      const timeStr = `${etDate.getHours().toString().padStart(2, "0")}:${etDate.getMinutes().toString().padStart(2, "0")}`;

      const duration = sb.appointment_segments?.[0]?.duration_minutes || 120;
      const customerNote = sb.customer_note || "";

      const bookingId = await ctx.runMutation(internal.squareInboundSync.createFromSquare, {
        customerName,
        customerPhone,
        customerEmail,
        serviceAddress: customerNote.includes(",") ? customerNote : "",
        date: dateStr,
        time: timeStr,
        squareBookingId: sb.id,
        squareCustomerId: sb.customer_id || "",
        duration,
        customerNote,
      });

      if (bookingId) imported++;
    }

    // Update last sync
    await ctx.runMutation(internal.squareInboundSync.updateLastSync, {
      timestamp: now.toISOString(),
    });

    return {
      success: true,
      found: squareBookings.length,
      imported,
      skippedExisting,
      skippedCancelled,
      error: null,
    };
  },
});
