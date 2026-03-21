import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Public: list active services for booking page
export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const services = await ctx.db
      .query("services")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    return services.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

// Admin: list all services
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const services = await ctx.db.query("services").collect();
    return services.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

// Admin: get a single service
export const get = query({
  args: { id: v.id("services") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

// Admin: create service
export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    sedanPrice: v.number(),
    suvPrice: v.number(),
    duration: v.number(),
    isActive: v.boolean(),
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("services", args);
  },
});

// Admin: update service
export const update = mutation({
  args: {
    id: v.id("services"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    sedanPrice: v.optional(v.number()),
    suvPrice: v.optional(v.number()),
    duration: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...updates }) => {
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined),
    );
    await ctx.db.patch(id, filtered);
  },
});

// Admin: delete service
export const remove = mutation({
  args: { id: v.id("services") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

// Seed default ProWorx services
export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if services already exist
    const existing = await ctx.db.query("services").first();
    if (existing) return "Services already seeded";

    const services = [
      {
        name: "Express Detail",
        description:
          "Quick exterior wash + interior vacuum, wipe-down, and windows. Perfect for regular maintenance.",
        sedanPrice: 15000,
        suvPrice: 20000,
        duration: 90,
        isActive: true,
        sortOrder: 1,
      },
      {
        name: "Full Detail",
        description:
          "Complete interior deep clean + exterior hand wash, clay bar, and wax. Our most popular service.",
        sedanPrice: 25000,
        suvPrice: 35000,
        duration: 180,
        isActive: true,
        sortOrder: 2,
      },
      {
        name: "Interior Only",
        description:
          "Deep interior cleaning — shampooing, leather conditioning, steam cleaning, and full detail of all surfaces.",
        sedanPrice: 17500,
        suvPrice: 22500,
        duration: 120,
        isActive: true,
        sortOrder: 3,
      },
      {
        name: "Exterior Only",
        description:
          "Full exterior treatment — hand wash, clay bar, polish, and protective wax coating.",
        sedanPrice: 15000,
        suvPrice: 20000,
        duration: 120,
        isActive: true,
        sortOrder: 4,
      },
      {
        name: "Paint Correction",
        description:
          "Professional multi-stage paint correction to remove swirls, scratches, and imperfections. Restores showroom finish.",
        sedanPrice: 40000,
        suvPrice: 50000,
        duration: 360,
        isActive: true,
        sortOrder: 5,
      },
      {
        name: "Ceramic Coating",
        description:
          "Premium ceramic coating package — includes paint correction + ceramic protection for long-lasting shine and protection.",
        sedanPrice: 180000,
        suvPrice: 240000,
        duration: 480,
        isActive: true,
        sortOrder: 6,
      },
    ];

    for (const service of services) {
      await ctx.db.insert("services", service);
    }

    return "Seeded 6 services";
  },
});
