import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, requireAdmin } from "./authHelpers";

// List all service freezes
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const freezes = await ctx.db.query("serviceFreeze").collect();
    // Enrich with service names
    const enriched = await Promise.all(
      freezes.map(async (f) => {
        const service = await ctx.db.get(f.serviceId);
        return {
          ...f,
          serviceName: service?.name || "Unknown Service",
        };
      }),
    );
    return enriched.sort((a, b) => a.date.localeCompare(b.date));
  },
});

// List freezes for a specific service
export const listForService = query({
  args: { serviceId: v.id("services") },
  handler: async (ctx, { serviceId }) => {
    await requireAdmin(ctx);
    const freezes = await ctx.db
      .query("serviceFreeze")
      .withIndex("by_service", (q) => q.eq("serviceId", serviceId))
      .collect();
    return freezes.sort((a, b) => a.date.localeCompare(b.date));
  },
});

// Check if a service is frozen on a specific date
export const isFrozen = query({
  args: {
    serviceId: v.id("services"),
    date: v.string(),
  },
  handler: async (ctx, { serviceId, date }) => {
    await requireAdmin(ctx);
    const freeze = await ctx.db
      .query("serviceFreeze")
      .withIndex("by_service_date", (q) =>
        q.eq("serviceId", serviceId).eq("date", date),
      )
      .first();
    return !!freeze;
  },
});

// Add a service freeze (single date)
export const add = mutation({
  args: {
    serviceId: v.id("services"),
    date: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    // Check if already frozen
    const existing = await ctx.db
      .query("serviceFreeze")
      .withIndex("by_service_date", (q) =>
        q.eq("serviceId", args.serviceId).eq("date", args.date),
      )
      .first();
    if (existing) return existing._id;

    return await ctx.db.insert("serviceFreeze", args);
  },
});

// Add a service freeze for multiple dates at once
export const addBulk = mutation({
  args: {
    serviceId: v.id("services"),
    dates: v.array(v.string()),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { serviceId, dates, reason }) => {
    await requireAdmin(ctx);
    const ids = [];
    for (const date of dates) {
      const existing = await ctx.db
        .query("serviceFreeze")
        .withIndex("by_service_date", (q) =>
          q.eq("serviceId", serviceId).eq("date", date),
        )
        .first();
      if (existing) {
        ids.push(existing._id);
        continue;
      }
      const id = await ctx.db.insert("serviceFreeze", { serviceId, date, reason });
      ids.push(id);
    }
    return ids;
  },
});

// Remove a service freeze
export const remove = mutation({
  args: { id: v.id("serviceFreeze") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.delete(id);
  },
});

// Remove all freezes for a service on a specific date
export const removeByServiceDate = mutation({
  args: {
    serviceId: v.id("services"),
    date: v.string(),
  },
  handler: async (ctx, { serviceId, date }) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("serviceFreeze")
      .withIndex("by_service_date", (q) =>
        q.eq("serviceId", serviceId).eq("date", date),
      )
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

// Get all frozen dates for display (grouped by service)
export const listGrouped = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const freezes = await ctx.db.query("serviceFreeze").collect();
    const services = await ctx.db.query("services").collect();

    const serviceMap = new Map(services.map((s) => [s._id, s.name]));

    // Group by service
    const grouped: Record<string, { serviceId: string; serviceName: string; dates: Array<{ _id: string; date: string; reason?: string }> }> = {};

    for (const f of freezes) {
      const key = f.serviceId;
      if (!grouped[key]) {
        grouped[key] = {
          serviceId: key,
          serviceName: serviceMap.get(f.serviceId) || "Unknown",
          dates: [],
        };
      }
      grouped[key].dates.push({
        _id: f._id,
        date: f.date,
        reason: f.reason,
      });
    }

    // Sort dates within each group
    for (const g of Object.values(grouped)) {
      g.dates.sort((a, b) => a.date.localeCompare(b.date));
    }

    return Object.values(grouped).sort((a, b) => a.serviceName.localeCompare(b.serviceName));
  },
});
