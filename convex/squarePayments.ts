import { v } from "convex/values";
import { action, mutation } from "./_generated/server";
import { api } from "./_generated/api";

declare const process: { env: Record<string, string | undefined> };

const LOCATION_ID = "9VRKFJAZZM3HG";

/**
 * Generate a Square payment link for a booking using the Viktor Spaces API.
 * This calls the Square MCP tool through our proxy.
 */
export const createPaymentLink = action({
  args: {
    bookingId: v.id("bookings"),
    serviceName: v.string(),
    amountCents: v.number(),
    customerName: v.string(),
    confirmationCode: v.string(),
  },
  handler: async (ctx, args) => {
    const VIKTOR_API_URL = process.env.VIKTOR_SPACES_API_URL;
    const PROJECT_NAME = process.env.VIKTOR_SPACES_PROJECT_NAME;
    const PROJECT_SECRET = process.env.VIKTOR_SPACES_PROJECT_SECRET;

    if (!VIKTOR_API_URL || !PROJECT_NAME || !PROJECT_SECRET) {
      throw new Error("Viktor Spaces API not configured");
    }

    // Generate a unique idempotency key
    const idempotencyKey = `proworx-${args.bookingId}-${Date.now()}`;

    const requestBody = {
      idempotency_key: idempotencyKey,
      quick_pay: {
        name: `${args.serviceName} — ${args.customerName}`,
        price_money: {
          amount: args.amountCents,
          currency: "USD",
        },
        location_id: LOCATION_ID,
      },
      checkout_options: {
        allow_tipping: true,
        ask_for_shipping_address: false,
      },
      payment_note: `ProWorx Booking ${args.confirmationCode}`,
    };

    // Call Square via Viktor API
    const response = await fetch(`${VIKTOR_API_URL}/api/viktor-spaces/tools/call`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_name: PROJECT_NAME,
        project_secret: PROJECT_SECRET,
        role: "squareup_make_api_request",
        arguments: {
          service: "checkout",
          method: "createPaymentLink",
          request: requestBody,
          characterization: `Payment link for ${args.customerName} - ${args.serviceName} ($${(args.amountCents / 100).toFixed(2)})`,
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Square API call failed: ${text}`);
    }

    const json = await response.json();

    // The result may contain the payment link directly, or a draft ID
    // Try to parse the result for the payment link URL
    let paymentLinkUrl = "";
    let paymentLinkId = "";

    if (json.success && json.result) {
      const result = json.result;
      // Check various response shapes
      if (typeof result === "object") {
        if (result.payment_link?.url) {
          paymentLinkUrl = result.payment_link.url;
          paymentLinkId = result.payment_link.id || "";
        } else if (result.url) {
          paymentLinkUrl = result.url;
          paymentLinkId = result.id || "";
        } else if (result.response_text) {
          // May be a string response — try parsing
          try {
            const parsed = JSON.parse(result.response_text);
            if (parsed.payment_link?.url) {
              paymentLinkUrl = parsed.payment_link.url;
              paymentLinkId = parsed.payment_link.id || "";
            }
          } catch {
            // Not JSON — might be a draft notification
          }
        } else if (result.draft_id) {
          // MCP tool returned a draft — can't auto-approve from here
          return {
            success: false,
            error: "Draft requires approval",
            draftId: result.draft_id,
          };
        }
      }
    }

    if (paymentLinkUrl) {
      // Store the payment link on the booking
      await ctx.runMutation(api.bookings.setSquarePaymentLink, {
        id: args.bookingId,
        url: paymentLinkUrl,
        linkId: paymentLinkId,
      });

      return {
        success: true,
        url: paymentLinkUrl,
        linkId: paymentLinkId,
      };
    }

    return {
      success: false,
      error: "Could not extract payment link from response",
      rawResult: JSON.stringify(json).slice(0, 500),
    };
  },
});

/**
 * Quick payment link — manual URL entry.
 * Tyler can paste a Square payment link URL directly.
 */
export const setPaymentLinkManual = mutation({
  args: {
    bookingId: v.id("bookings"),
    url: v.string(),
  },
  handler: async (ctx, { bookingId, url }) => {
    await ctx.db.patch(bookingId, {
      squarePaymentLinkUrl: url,
    });
  },
});
