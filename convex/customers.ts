import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// List all customers with optional search
export const list = query({
  args: {
    search: v.optional(v.string()),
  },
  handler: async (ctx, { search }) => {
    const all = await ctx.db.query("customers").collect();

    let filtered = all;
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      filtered = all.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.phone?.includes(q) ||
          c.address?.toLowerCase().includes(q) ||
          c.zipCode?.includes(q),
      );
    }

    // Sort by name
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  },
});

// Get a single customer by ID
export const get = query({
  args: { id: v.id("customers") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

// Get bookings for a customer
export const getBookings = query({
  args: { customerId: v.id("customers") },
  handler: async (ctx, { customerId }) => {
    const customer = await ctx.db.get(customerId);
    if (!customer) return [];

    // Find bookings by customerId field or by matching email
    const byId = await ctx.db
      .query("bookings")
      .filter((q) => q.eq(q.field("customerId"), customerId))
      .collect();

    // Also find by email match (for bookings created before customer linking)
    let byEmail: typeof byId = [];
    if (customer.email) {
      byEmail = await ctx.db
        .query("bookings")
        .withIndex("by_email", (q) => q.eq("customerEmail", customer.email!))
        .collect();
    }

    // Merge and deduplicate
    const seen = new Set<string>();
    const merged = [];
    for (const b of [...byId, ...byEmail]) {
      if (!seen.has(b._id)) {
        seen.add(b._id);
        merged.push(b);
      }
    }

    // Sort by date desc
    return merged.sort((a, b) => b.date.localeCompare(a.date));
  },
});

// Create a customer
export const create = mutation({
  args: {
    name: v.string(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    vehicleType: v.optional(v.union(v.literal("sedan"), v.literal("suv"))),
    vehicleYear: v.optional(v.string()),
    vehicleMake: v.optional(v.string()),
    vehicleModel: v.optional(v.string()),
    vehicleColor: v.optional(v.string()),
    notes: v.optional(v.string()),
    source: v.union(
      v.literal("booking"),
      v.literal("manual"),
      v.literal("csv"),
      v.literal("square"),
    ),
    squareCustomerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("customers", {
      ...args,
      totalBookings: 0,
      totalSpent: 0,
    });
  },
});

// Update a customer
export const update = mutation({
  args: {
    id: v.id("customers"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    vehicleType: v.optional(v.union(v.literal("sedan"), v.literal("suv"))),
    vehicleYear: v.optional(v.string()),
    vehicleMake: v.optional(v.string()),
    vehicleModel: v.optional(v.string()),
    vehicleColor: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    // Only update fields that are provided
    const updates: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(fields)) {
      if (val !== undefined) updates[k] = val;
    }
    await ctx.db.patch(id, updates);
  },
});

// Delete a customer
export const remove = mutation({
  args: { id: v.id("customers") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

// Bulk import customers (from CSV or Square)
export const bulkImport = mutation({
  args: {
    customers: v.array(
      v.object({
        name: v.string(),
        phone: v.optional(v.string()),
        email: v.optional(v.string()),
        address: v.optional(v.string()),
        zipCode: v.optional(v.string()),
        vehicleType: v.optional(v.union(v.literal("sedan"), v.literal("suv"))),
        vehicleYear: v.optional(v.string()),
        vehicleMake: v.optional(v.string()),
        vehicleModel: v.optional(v.string()),
        vehicleColor: v.optional(v.string()),
        notes: v.optional(v.string()),
        source: v.union(
          v.literal("booking"),
          v.literal("manual"),
          v.literal("csv"),
          v.literal("square"),
        ),
        squareCustomerId: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, { customers }) => {
    let imported = 0;
    let skipped = 0;

    for (const c of customers) {
      // Check for duplicates by email or phone
      let exists = false;
      if (c.email) {
        const byEmail = await ctx.db
          .query("customers")
          .withIndex("by_email", (q) => q.eq("email", c.email!))
          .first();
        if (byEmail) exists = true;
      }
      if (!exists && c.phone) {
        const byPhone = await ctx.db
          .query("customers")
          .withIndex("by_phone", (q) => q.eq("phone", c.phone!))
          .first();
        if (byPhone) exists = true;
      }
      if (!exists && c.squareCustomerId) {
        const bySq = await ctx.db
          .query("customers")
          .withIndex("by_square_id", (q) =>
            q.eq("squareCustomerId", c.squareCustomerId!),
          )
          .first();
        if (bySq) exists = true;
      }

      if (exists) {
        skipped++;
        continue;
      }

      await ctx.db.insert("customers", {
        ...c,
        totalBookings: 0,
        totalSpent: 0,
      });
      imported++;
    }

    return { imported, skipped, total: customers.length };
  },
});

// Stats for the customers page
export const stats = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("customers").collect();
    return {
      total: all.length,
      withEmail: all.filter((c) => c.email).length,
      withPhone: all.filter((c) => c.phone).length,
      sources: {
        booking: all.filter((c) => c.source === "booking").length,
        manual: all.filter((c) => c.source === "manual").length,
        csv: all.filter((c) => c.source === "csv").length,
        square: all.filter((c) => c.source === "square").length,
      },
    };
  },
});
