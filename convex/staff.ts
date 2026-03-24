import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./authHelpers";

// List all staff
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const staff = await ctx.db.query("staff").collect();
    return staff.sort((a, b) => {
      // Owner first, then managers, then technicians
      const roleOrder = { owner: 0, manager: 1, technician: 2 };
      return (roleOrder[a.role] - roleOrder[b.role]) || a.name.localeCompare(b.name);
    });
  },
});

// List active staff only
export const listActive = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const staff = await ctx.db
      .query("staff")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
    return staff.sort((a, b) => a.name.localeCompare(b.name));
  },
});

// Get a single staff member
export const get = query({
  args: { id: v.id("staff") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    return await ctx.db.get(id);
  },
});

// Create staff member
export const create = mutation({
  args: {
    name: v.string(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.union(v.literal("owner"), v.literal("technician"), v.literal("manager")),
    color: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.insert("staff", {
      ...args,
      isActive: true,
    });
  },
});

// Update staff member
export const update = mutation({
  args: {
    id: v.id("staff"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.optional(v.union(v.literal("owner"), v.literal("technician"), v.literal("manager"))),
    isActive: v.optional(v.boolean()),
    color: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...updates }) => {
    await requireAdmin(ctx);
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined),
    );
    await ctx.db.patch(id, filtered);
  },
});

// Delete staff member (also removes their service assignments and availability)
export const remove = mutation({
  args: { id: v.id("staff") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    // Remove service assignments
    const assignments = await ctx.db
      .query("staffServices")
      .withIndex("by_staff", (q) => q.eq("staffId", id))
      .collect();
    for (const a of assignments) {
      await ctx.db.delete(a._id);
    }

    // Remove availability entries
    const avail = await ctx.db
      .query("staffAvailability")
      .withIndex("by_staff", (q) => q.eq("staffId", id))
      .collect();
    for (const a of avail) {
      await ctx.db.delete(a._id);
    }

    await ctx.db.delete(id);
  },
});

// Get staff with their assigned services
export const getWithServices = query({
  args: { id: v.id("staff") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const staff = await ctx.db.get(id);
    if (!staff) return null;

    const assignments = await ctx.db
      .query("staffServices")
      .withIndex("by_staff", (q) => q.eq("staffId", id))
      .collect();

    const services = await Promise.all(
      assignments.map(async (a) => {
        const service = await ctx.db.get(a.serviceId);
        return service ? { ...service, assignmentId: a._id } : null;
      }),
    );

    return {
      ...staff,
      services: services.filter(Boolean),
    };
  },
});

// Get all staff with their service counts
export const listWithServiceCounts = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const staff = await ctx.db.query("staff").collect();
    const allAssignments = await ctx.db.query("staffServices").collect();

    const result = staff.map((s) => ({
      ...s,
      serviceCount: allAssignments.filter((a) => a.staffId === s._id).length,
    }));

    return result.sort((a, b) => {
      const roleOrder = { owner: 0, manager: 1, technician: 2 };
      return (roleOrder[a.role] - roleOrder[b.role]) || a.name.localeCompare(b.name);
    });
  },
});

// Assign service to staff member
export const assignService = mutation({
  args: {
    staffId: v.id("staff"),
    serviceId: v.id("services"),
  },
  handler: async (ctx, { staffId, serviceId }) => {
    await requireAdmin(ctx);
    // Check if already assigned
    const existing = await ctx.db
      .query("staffServices")
      .withIndex("by_staff_service", (q) =>
        q.eq("staffId", staffId).eq("serviceId", serviceId),
      )
      .first();
    if (existing) return existing._id;

    return await ctx.db.insert("staffServices", { staffId, serviceId });
  },
});

// Unassign service from staff member
export const unassignService = mutation({
  args: {
    staffId: v.id("staff"),
    serviceId: v.id("services"),
  },
  handler: async (ctx, { staffId, serviceId }) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("staffServices")
      .withIndex("by_staff_service", (q) =>
        q.eq("staffId", staffId).eq("serviceId", serviceId),
      )
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

// Get services assigned to a staff member
export const getAssignedServices = query({
  args: { staffId: v.id("staff") },
  handler: async (ctx, { staffId }) => {
    await requireAdmin(ctx);
    const assignments = await ctx.db
      .query("staffServices")
      .withIndex("by_staff", (q) => q.eq("staffId", staffId))
      .collect();

    const services = await Promise.all(
      assignments.map((a) => ctx.db.get(a.serviceId)),
    );
    return services.filter(Boolean);
  },
});

// Get staff who can perform a specific service (public — booking form)
// Returns only name/ID, never phone or email.
export const getStaffForService = query({
  args: { serviceId: v.id("services") },
  handler: async (ctx, { serviceId }) => {
    const assignments = await ctx.db
      .query("staffServices")
      .withIndex("by_service", (q) => q.eq("serviceId", serviceId))
      .collect();

    const staffMembers = await Promise.all(
      assignments.map((a) => ctx.db.get(a.staffId)),
    );
    return staffMembers
      .filter((s) => s && s.isActive)
      .map((s) => ({ _id: s!._id, name: s!.name, color: s!.color }));
  },
});

// Seed Tyler as owner
export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.query("staff").first();
    if (existing) return "Staff already seeded";

    const tylerId = await ctx.db.insert("staff", {
      name: "Tyler York",
      phone: "(980) 272-1903",
      email: "detailing@proworxdetailing.com",
      role: "owner",
      isActive: true,
      color: "#2563eb",
    });

    // Assign all services to Tyler
    const services = await ctx.db.query("services").collect();
    for (const service of services) {
      await ctx.db.insert("staffServices", {
        staffId: tylerId,
        serviceId: service._id,
      });
    }

    // Set default availability for Tyler (same as business hours)
    const days = [
      { dayOfWeek: 0, startTime: "09:30", endTime: "18:00", isAvailable: false },
      { dayOfWeek: 1, startTime: "09:30", endTime: "18:00", isAvailable: true },
      { dayOfWeek: 2, startTime: "09:30", endTime: "18:00", isAvailable: true },
      { dayOfWeek: 3, startTime: "09:30", endTime: "18:00", isAvailable: true },
      { dayOfWeek: 4, startTime: "09:30", endTime: "18:00", isAvailable: true },
      { dayOfWeek: 5, startTime: "09:30", endTime: "18:00", isAvailable: true },
      { dayOfWeek: 6, startTime: "09:30", endTime: "15:00", isAvailable: true },
    ];

    for (const day of days) {
      await ctx.db.insert("staffAvailability", {
        staffId: tylerId,
        ...day,
      });
    }

    return "Seeded staff with Tyler as owner";
  },
});
