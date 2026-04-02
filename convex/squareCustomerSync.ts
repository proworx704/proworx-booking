import { v } from "convex/values";
import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireActionAuth } from "./authHelpers";

declare const process: { env: Record<string, string | undefined> };

const SQUARE_ROLE = "mcp_square_make_api_request";

interface SquareCustomer {
  id: string;
  given_name?: string;
  family_name?: string;
  email_address?: string;
  phone_number?: string;
  address?: {
    address_line_1?: string;
    address_line_2?: string;
    locality?: string;
    administrative_district_level_1?: string;
    postal_code?: string;
    country?: string;
  };
  note?: string;
  company_name?: string;
}

interface SquareListResponse {
  customers?: SquareCustomer[];
  cursor?: string;
  errors?: unknown[];
}

async function callSquareApi(
  viktorUrl: string,
  projectName: string,
  projectSecret: string,
  service: string,
  method: string,
  request: Record<string, unknown>,
): Promise<unknown> {
  const response = await fetch(`${viktorUrl}/api/viktor-spaces/tools/call`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      project_name: projectName,
      project_secret: projectSecret,
      role: SQUARE_ROLE,
      arguments: {
        service,
        method,
        request,
        characterization: `Square customer sync - ${method}`,
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Square API call failed: ${text}`);
  }

  const json = await response.json();
  if (json.success && json.result) {
    // Parse the result content if it's a string
    if (typeof json.result === "string") {
      return JSON.parse(json.result);
    }
    if (json.result.content && typeof json.result.content === "string") {
      return JSON.parse(json.result.content);
    }
    return json.result;
  }
  throw new Error(`Unexpected response: ${JSON.stringify(json).slice(0, 200)}`);
}

// Internal mutation to batch-insert customers (called from action)
export const batchInsertCustomers = internalMutation({
  args: {
    customers: v.array(
      v.object({
        name: v.string(),
        phone: v.optional(v.string()),
        email: v.optional(v.string()),
        address: v.optional(v.string()),
        zipCode: v.optional(v.string()),
        notes: v.optional(v.string()),
        squareCustomerId: v.string(),
      }),
    ),
  },
  handler: async (ctx, { customers }) => {
    let imported = 0;
    let skipped = 0;

    for (const c of customers) {
      // Check for duplicates by squareCustomerId
      const bySq = await ctx.db
        .query("customers")
        .withIndex("by_square_id", (q) => q.eq("squareCustomerId", c.squareCustomerId))
        .first();
      if (bySq) {
        skipped++;
        continue;
      }

      // Check by email
      if (c.email) {
        const byEmail = await ctx.db
          .query("customers")
          .withIndex("by_email", (q) => q.eq("email", c.email!))
          .first();
        if (byEmail) {
          if (!byEmail.squareCustomerId) {
            await ctx.db.patch(byEmail._id, { squareCustomerId: c.squareCustomerId });
          }
          skipped++;
          continue;
        }
      }

      await ctx.db.insert("customers", {
        name: c.name,
        phone: c.phone || "",
        email: c.email || "",
        address: c.address,
        zipCode: c.zipCode,
        notes: c.notes,
        squareCustomerId: c.squareCustomerId,
        source: "square" as const,
        totalSpent: 0,
        totalBookings: 0,
      });
      imported++;
    }

    return { imported, skipped, total: customers.length };
  },
});

// Main sync action — fetches all customers from Square and imports them
export const syncAllCustomers = action({
  args: {},
  handler: async (ctx) => {
    await requireActionAuth(ctx);

    const VIKTOR_API_URL = process.env.VIKTOR_SPACES_API_URL;
    const PROJECT_NAME = process.env.VIKTOR_SPACES_PROJECT_NAME;
    const PROJECT_SECRET = process.env.VIKTOR_SPACES_PROJECT_SECRET;

    if (!VIKTOR_API_URL || !PROJECT_NAME || !PROJECT_SECRET) {
      throw new Error("Viktor Spaces API not configured");
    }

    let cursor: string | undefined = undefined;
    let totalImported = 0;
    let totalSkipped = 0;
    let batchCount = 0;
    const MAX_BATCHES = 50; // Safety limit

    do {
      batchCount++;
      if (batchCount > MAX_BATCHES) break;

      const request: Record<string, unknown> = { limit: 100 };
      if (cursor) request.cursor = cursor;

      const result = (await callSquareApi(
        VIKTOR_API_URL,
        PROJECT_NAME,
        PROJECT_SECRET,
        "customers",
        "list",
        request,
      )) as SquareListResponse;

      const squareCustomers = result.customers || [];
      cursor = result.cursor;

      if (squareCustomers.length === 0) break;

      // Transform to our format
      const convexCustomers = squareCustomers.map((c: SquareCustomer) => {
        const name = `${(c.given_name || "").trim()} ${(c.family_name || "").trim()}`.trim() || "Unknown";
        const addr = c.address;
        const addressParts = [
          addr?.address_line_1,
          addr?.address_line_2,
          addr?.locality,
          addr?.administrative_district_level_1,
        ].filter(Boolean);
        const address = addressParts.join(", ") || undefined;

        return {
          name,
          phone: c.phone_number || undefined,
          email: c.email_address || undefined,
          address,
          zipCode: addr?.postal_code || undefined,
          notes: c.note || undefined,
          squareCustomerId: c.id,
        };
      });

      // Import batch
      const batchResult = await ctx.runMutation(
        internal.squareCustomerSync.batchInsertCustomers,
        { customers: convexCustomers },
      );
      totalImported += batchResult.imported;
      totalSkipped += batchResult.skipped;

    } while (cursor);

    return {
      totalImported,
      totalSkipped,
      batchesProcessed: batchCount,
      hasMore: !!cursor,
    };
  },
});
