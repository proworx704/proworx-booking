import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Temporary: import Square customers without auth (for Viktor automation)
export const bulkImportNoAuth = mutation({
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
    const importedNames: string[] = [];

    for (const c of customers) {
      // Check for duplicates by squareCustomerId first
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
          // Update existing with square ID if missing
          if (!byEmail.squareCustomerId) {
            await ctx.db.patch(byEmail._id, { squareCustomerId: c.squareCustomerId });
          }
          skipped++;
          continue;
        }
      }

      // Check by phone
      if (c.phone) {
        const byPhone = await ctx.db
          .query("customers")
          .withIndex("by_phone", (q) => q.eq("phone", c.phone!))
          .first();
        if (byPhone) {
          if (!byPhone.squareCustomerId) {
            await ctx.db.patch(byPhone._id, { squareCustomerId: c.squareCustomerId });
          }
          skipped++;
          continue;
        }
      }

      await ctx.db.insert("customers", {
        name: c.name,
        phone: c.phone,
        email: c.email,
        address: c.address,
        zipCode: c.zipCode,
        notes: c.notes,
        source: "square" as const,
        squareCustomerId: c.squareCustomerId,
        totalBookings: 0,
        totalSpent: 0,
      });
      imported++;
      importedNames.push(c.name);
    }

    return { imported, skipped, total: customers.length, importedNames };
  },
});

// Count existing customers
export const countCustomers = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("customers").collect();
    const bySource: Record<string, number> = {};
    for (const c of all) {
      bySource[c.source] = (bySource[c.source] || 0) + 1;
    }
    return { total: all.length, bySource };
  },
});
