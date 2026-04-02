import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./authHelpers";

// ─── Queries ─────────────────────────────────────────────────────────────────

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("maintenanceMembers")
      .collect()
      .then((members) => members.sort((a, b) => a.name.localeCompare(b.name)));
  },
});

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("maintenanceMembers")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect()
      .then((members) => members.sort((a, b) => a.name.localeCompare(b.name)));
  },
});

export const getById = query({
  args: { id: v.id("maintenanceMembers") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.get(args.id);
  },
});

/** Group active members by ZIP code — for the scheduling view */
export const groupByZip = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const members = await ctx.db
      .query("maintenanceMembers")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    const grouped: Record<
      string,
      {
        zipCode: string;
        members: typeof members;
        dueSoon: number; // members due within 7 days
        overdue: number; // members past due
      }
    > = {};

    const today = new Date().toISOString().split("T")[0];
    const sevenDaysOut = new Date(Date.now() + 7 * 86400000)
      .toISOString()
      .split("T")[0];

    for (const m of members) {
      if (!grouped[m.zipCode]) {
        grouped[m.zipCode] = {
          zipCode: m.zipCode,
          members: [],
          dueSoon: 0,
          overdue: 0,
        };
      }
      grouped[m.zipCode].members.push(m);

      if (m.nextServiceDate) {
        if (m.nextServiceDate < today) {
          grouped[m.zipCode].overdue++;
        } else if (m.nextServiceDate <= sevenDaysOut) {
          grouped[m.zipCode].dueSoon++;
        }
      }
    }

    // Sort by most urgent (overdue first, then due soon)
    return Object.values(grouped).sort(
      (a, b) => b.overdue - a.overdue || b.dueSoon - a.dueSoon || a.zipCode.localeCompare(b.zipCode)
    );
  },
});

/** Get existing bookings for a ZIP on a given date — for smart scheduling */
export const getBookingsForZipDate = query({
  args: { zipCode: v.string(), date: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("bookings")
      .withIndex("by_zip_date", (q) =>
        q.eq("zipCode", args.zipCode).eq("date", args.date)
      )
      .collect();
  },
});

/** For a given ZIP, find upcoming dates that already have maintenance bookings */
export const suggestDatesForZip = query({
  args: { zipCode: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const today = new Date().toISOString().split("T")[0];
    const thirtyDaysOut = new Date(Date.now() + 30 * 86400000)
      .toISOString()
      .split("T")[0];

    // Get all bookings in this ZIP for the next 30 days
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_zip_date", (q) => q.eq("zipCode", args.zipCode))
      .collect();

    const upcomingByDate: Record<string, number> = {};
    for (const b of bookings) {
      if (
        b.date >= today &&
        b.date <= thirtyDaysOut &&
        b.status !== "cancelled"
      ) {
        upcomingByDate[b.date] = (upcomingByDate[b.date] || 0) + 1;
      }
    }

    // Also check members in this ZIP who have upcoming next service dates
    const members = await ctx.db
      .query("maintenanceMembers")
      .withIndex("by_active_zip", (q) =>
        q.eq("isActive", true).eq("zipCode", args.zipCode)
      )
      .collect();

    const memberDueDates: Record<string, string[]> = {};
    for (const m of members) {
      if (m.nextServiceDate && m.nextServiceDate >= today && m.nextServiceDate <= thirtyDaysOut) {
        if (!memberDueDates[m.nextServiceDate]) memberDueDates[m.nextServiceDate] = [];
        memberDueDates[m.nextServiceDate].push(m.name);
      }
    }

    return {
      bookingsByDate: upcomingByDate,
      memberDueDates,
      totalMembersInZip: members.length,
    };
  },
});

// ─── Mutations ───────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    customerId: v.optional(v.id("customers")),
    name: v.string(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.string(),
    zipCode: v.string(),
    vehicleType: v.optional(v.union(v.literal("sedan"), v.literal("suv"))),
    vehicleYear: v.optional(v.string()),
    vehicleMake: v.optional(v.string()),
    vehicleModel: v.optional(v.string()),
    vehicleColor: v.optional(v.string()),
    planType: v.union(
      v.literal("monthly"),
      v.literal("quarterly"),
      v.literal("yearly"),
    ),
    membershipTier: v.union(
      v.literal("exterior"),
      v.literal("interior"),
      v.literal("full"),
    ),
    serviceFrequencyDays: v.number(),
    nextServiceDate: v.optional(v.string()),
    planStartDate: v.optional(v.string()),
    planEndDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.insert("maintenanceMembers", {
      ...args,
      isActive: true,
      joinedAt: new Date().toISOString(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("maintenanceMembers"),
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
    planType: v.optional(
      v.union(
        v.literal("monthly"),
        v.literal("quarterly"),
        v.literal("yearly"),
      ),
    ),
    membershipTier: v.optional(
      v.union(
        v.literal("exterior"),
        v.literal("interior"),
        v.literal("full"),
      ),
    ),
    serviceFrequencyDays: v.optional(v.number()),
    nextServiceDate: v.optional(v.string()),
    lastServiceDate: v.optional(v.string()),
    planStartDate: v.optional(v.string()),
    planEndDate: v.optional(v.string()),
    notes: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { id, ...fields } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Member not found");

    // Only patch defined fields
    const patch: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(fields)) {
      if (val !== undefined) patch[k] = val;
    }
    await ctx.db.patch(id, patch);
    return id;
  },
});

/** Mark service completed — updates lastServiceDate and calculates next */
export const markServiceCompleted = mutation({
  args: { id: v.id("maintenanceMembers"), serviceDate: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const member = await ctx.db.get(args.id);
    if (!member) throw new Error("Member not found");

    const nextDate = new Date(`${args.serviceDate}T12:00:00`);
    nextDate.setDate(nextDate.getDate() + member.serviceFrequencyDays);
    const nextServiceDate = nextDate.toISOString().split("T")[0];

    await ctx.db.patch(args.id, {
      lastServiceDate: args.serviceDate,
      nextServiceDate,
    });
    return { nextServiceDate };
  },
});

export const remove = mutation({
  args: { id: v.id("maintenanceMembers") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});
