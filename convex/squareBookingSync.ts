/**
 * Square Booking Sync — Self-sustained Square integration
 *
 * When a booking is created in the app (customer or admin), this module
 * automatically pushes it to Square as an appointment/booking.
 *
 * Credentials: Square Access Token stored in systemSettings (key: "square_access_token").
 * No external dependencies (no Viktor proxy needed).
 */
import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

const SQUARE_BASE_URL = "https://connect.squareup.com/v2";
const LOCATION_ID = "9VRKFJAZZM3HG";

// ── Helper: get Square access token from systemSettings ─────────────────
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
  method: "GET" | "POST" | "PUT" = "POST",
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
      const errMsg =
        data?.errors?.map((e: any) => e.detail).join("; ") ||
        `HTTP ${res.status}`;
      console.error("[SquareSync] API error:", errMsg);
      return { ok: false, error: errMsg };
    }

    return { ok: true, data };
  } catch (err: any) {
    console.error("[SquareSync] Network error:", err.message);
    return { ok: false, error: err.message };
  }
}

// ── Find or create Square customer ──────────────────────────────────────
async function findOrCreateSquareCustomer(
  token: string,
  customerName: string,
  customerPhone: string,
  customerEmail: string,
  serviceAddress?: string,
): Promise<string | null> {
  // Try to find by email first
  if (customerEmail) {
    const search = await squareApi(token, "/customers/search", "POST", {
      query: {
        filter: {
          email_address: { exact: customerEmail },
        },
      },
    });
    if (search.ok && search.data?.customers?.length > 0) {
      return search.data.customers[0].id;
    }
  }

  // Try to find by phone
  if (customerPhone) {
    const search = await squareApi(token, "/customers/search", "POST", {
      query: {
        filter: {
          phone_number: { exact: customerPhone },
        },
      },
    });
    if (search.ok && search.data?.customers?.length > 0) {
      return search.data.customers[0].id;
    }
  }

  // Create new customer
  const [givenName, ...rest] = customerName.trim().split(" ");
  const familyName = rest.join(" ") || "";

  const create = await squareApi(token, "/customers", "POST", {
    given_name: givenName,
    family_name: familyName,
    email_address: customerEmail || undefined,
    phone_number: customerPhone || undefined,
    address: serviceAddress
      ? { address_line_1: serviceAddress }
      : undefined,
    idempotency_key: `proworx-cust-${customerEmail || customerPhone}-${Date.now()}`,
  });

  if (create.ok && create.data?.customer?.id) {
    return create.data.customer.id;
  }

  return null;
}

// ═════════════════════════════════════════════════════════════════════════
// MAIN: Push a booking to Square
// ═════════════════════════════════════════════════════════════════════════
export const pushBookingToSquare = internalAction({
  args: {
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, { bookingId }) => {
    // 1. Get Square token
    const token = await getSquareToken(ctx);
    if (!token) {
      console.log("[SquareSync] No square_access_token configured — skipping.");
      return;
    }

    // 2. Get booking details
    const booking: any = await ctx.runQuery(
      internal.squareBookingSync.getBookingInternal,
      { bookingId },
    );
    if (!booking) {
      console.error("[SquareSync] Booking not found:", bookingId);
      return;
    }

    // Skip if already synced
    if (booking.squareBookingId) {
      console.log("[SquareSync] Already synced:", booking.squareBookingId);
      return;
    }

    // 3. Find or create Square customer
    const squareCustomerId = await findOrCreateSquareCustomer(
      token,
      booking.customerName,
      booking.customerPhone,
      booking.customerEmail,
      booking.serviceAddress,
    );

    // 4. Build the start time (ISO 8601)
    // date = "YYYY-MM-DD", time = "HH:MM" or "H:MM AM/PM"
    const startAt = parseBookingDateTime(booking.date, booking.time);
    const durationMinutes = booking.totalDuration || 120;

    // 5. Create Square Booking
    // Square Bookings API requires appointment_segments with a team_member_id.
    // If we don't have one, we'll create an Order instead (more flexible).

    // Try Bookings API first (preferred — shows up on Square Calendar)
    let squareBookingId: string | null = null;

    // Attempt: Create via Bookings API
    const bookingResult = await squareApi(token, "/bookings", "POST", {
      idempotency_key: `proworx-booking-${bookingId}-${Date.now()}`,
      booking: {
        location_id: LOCATION_ID,
        customer_id: squareCustomerId || undefined,
        start_at: startAt,
        customer_note: [
          booking.serviceName,
          booking.selectedVariant ? `(${booking.selectedVariant})` : "",
          booking.serviceAddress ? `\nAddress: ${booking.serviceAddress}` : "",
          booking.notes ? `\nNotes: ${booking.notes}` : "",
          booking.addons?.length
            ? `\nAdd-ons: ${booking.addons.map((a: any) => a.name).join(", ")}`
            : "",
          `\nPrice: $${((booking.totalPrice || booking.price) / 100).toFixed(2)}`,
          `\nConfirmation: ${booking.confirmationCode}`,
        ]
          .filter(Boolean)
          .join(""),
        appointment_segments: [
          {
            duration_minutes: durationMinutes,
            team_member_id: "me", // Square uses "me" for the primary account owner
            any_team_member: true,
          },
        ],
      },
    });

    if (bookingResult.ok && bookingResult.data?.booking?.id) {
      squareBookingId = bookingResult.data.booking.id;
      console.log("[SquareSync] Created Square booking:", squareBookingId);
    } else {
      // Fallback: Create as an Order (always works, shows in Square Dashboard)
      console.log(
        "[SquareSync] Bookings API failed, falling back to Order:",
        bookingResult.error,
      );

      const orderResult = await squareApi(token, "/orders", "POST", {
        idempotency_key: `proworx-order-${bookingId}-${Date.now()}`,
        order: {
          location_id: LOCATION_ID,
          customer_id: squareCustomerId || undefined,
          reference_id: booking.confirmationCode,
          line_items: [
            {
              name: booking.serviceName + (booking.selectedVariant ? ` (${booking.selectedVariant})` : ""),
              quantity: "1",
              base_price_money: {
                amount: booking.price,
                currency: "USD",
              },
              note: [
                booking.serviceAddress || "",
                booking.notes || "",
              ]
                .filter(Boolean)
                .join(" | "),
            },
            // Add-ons as separate line items
            ...(booking.addons || []).map((addon: any) => ({
              name: addon.name + (addon.variantLabel ? ` (${addon.variantLabel})` : ""),
              quantity: "1",
              base_price_money: {
                amount: addon.price,
                currency: "USD",
              },
            })),
          ],
          fulfillments: [
            {
              type: "SHIPMENT", // closest to mobile service
              state: "PROPOSED",
              shipment_details: {
                recipient: {
                  display_name: booking.customerName,
                  phone_number: booking.customerPhone,
                  email_address: booking.customerEmail,
                  address: booking.serviceAddress
                    ? { address_line_1: booking.serviceAddress }
                    : undefined,
                },
                expected_shipped_at: startAt,
              },
            },
          ],
        },
      });

      if (orderResult.ok && orderResult.data?.order?.id) {
        squareBookingId = `order:${orderResult.data.order.id}`;
        console.log("[SquareSync] Created Square order:", squareBookingId);
      } else {
        console.error(
          "[SquareSync] Both booking and order creation failed:",
          orderResult.error,
        );
        // Log error but don't throw — don't break the app booking flow
        await ctx.runMutation(internal.squareBookingSync.logSyncError, {
          bookingId,
          error: `Booking: ${bookingResult.error}; Order: ${orderResult.error}`,
        });
        return;
      }
    }

    // 6. Save the Square booking ID back to our booking
    if (squareBookingId) {
      await ctx.runMutation(internal.squareBookingSync.updateSquareBookingId, {
        bookingId,
        squareBookingId,
      });

      // Also update customer's squareCustomerId if we found/created one
      if (squareCustomerId && booking.customerId) {
        await ctx.runMutation(
          internal.squareBookingSync.updateCustomerSquareId,
          {
            customerId: booking.customerId,
            squareCustomerId,
          },
        );
      }
    }
  },
});

// ── Internal queries/mutations used by the action ───────────────────────

export const getBookingInternal = internalQuery({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, { bookingId }) => {
    return await ctx.db.get(bookingId);
  },
});

export const updateSquareBookingId = internalMutation({
  args: {
    bookingId: v.id("bookings"),
    squareBookingId: v.string(),
  },
  handler: async (ctx, { bookingId, squareBookingId }) => {
    await ctx.db.patch(bookingId, { squareBookingId });
  },
});

export const updateCustomerSquareId = internalMutation({
  args: {
    customerId: v.id("customers"),
    squareCustomerId: v.string(),
  },
  handler: async (ctx, { customerId, squareCustomerId }) => {
    const customer = await ctx.db.get(customerId);
    if (customer && !customer.squareCustomerId) {
      await ctx.db.patch(customerId, { squareCustomerId });
    }
  },
});

export const logSyncError = internalMutation({
  args: {
    bookingId: v.id("bookings"),
    error: v.string(),
  },
  handler: async (ctx, { bookingId, error }) => {
    // Store the error on the booking as a note suffix
    const booking = await ctx.db.get(bookingId);
    if (booking) {
      const existingNotes = booking.notes || "";
      await ctx.db.patch(bookingId, {
        notes: existingNotes
          ? `${existingNotes}\n[Square sync failed: ${error}]`
          : `[Square sync failed: ${error}]`,
      });
    }
  },
});

// ── Check sync status (for settings page) ───────────────────────────────
export const getSyncStatus = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("bookings").collect();
    const synced = all.filter((b) => b.squareBookingId).length;
    const unsynced = all.filter(
      (b) => !b.squareBookingId && b.status !== "cancelled",
    ).length;
    return { synced, unsynced, total: all.length };
  },
});

// ── Manual sync: push an existing booking to Square ─────────────────────
export const manualSync = action({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, { bookingId }) => {
    // Run the internal action directly (actions can call internal actions)
    await ctx.runAction(internal.squareBookingSync.pushBookingToSquare, { bookingId });
    return { success: true };
  },
});

// ═════════════════════════════════════════════════════════════════════════
// HELPERS
// ═════════════════════════════════════════════════════════════════════════

function parseBookingDateTime(date: string, time: string): string {
  // date = "2025-04-15" or "April 15, 2025"
  // time = "09:00" or "9:00 AM" or "14:30"
  let dateStr = date;
  let hours = 0;
  let minutes = 0;

  // Parse time
  const amPmMatch = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (amPmMatch) {
    hours = parseInt(amPmMatch[1]);
    minutes = parseInt(amPmMatch[2]);
    if (amPmMatch[3].toUpperCase() === "PM" && hours !== 12) hours += 12;
    if (amPmMatch[3].toUpperCase() === "AM" && hours === 12) hours = 0;
  } else {
    const simpleMatch = time.match(/(\d{1,2}):(\d{2})/);
    if (simpleMatch) {
      hours = parseInt(simpleMatch[1]);
      minutes = parseInt(simpleMatch[2]);
    }
  }

  // Ensure date is in ISO format
  if (!dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    // Try to parse non-ISO date
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      dateStr = d.toISOString().split("T")[0];
    }
  }

  // Return in ISO 8601 format with Eastern time offset
  const hStr = hours.toString().padStart(2, "0");
  const mStr = minutes.toString().padStart(2, "0");
  return `${dateStr}T${hStr}:${mStr}:00-04:00`; // EDT offset
}



// Internal: get all unsynced non-cancelled bookings
export const getUnsyncedBookings = internalQuery({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("bookings").collect();
    return all.filter((b) => !b.squareBookingId && b.status !== "cancelled");
  },
});
