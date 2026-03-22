import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

async function requireAuth(ctx: { auth: unknown; db: unknown }) {
  const userId = await getAuthUserId(ctx as never);
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

function calculateHours(startTime: string, endTime: string): number {
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  let hours = endH - startH + (endM - startM) / 60;
  if (hours < 0) hours += 24; // overnight
  return Math.round(hours * 100) / 100;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.db.query("payrollTimeEntries").collect();
  },
});

export const listByWeek = query({
  args: {
    weekStart: v.string(),
    weekEnd: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const entries = await ctx.db.query("payrollTimeEntries").collect();
    return entries.filter(
      (e) => e.date >= args.weekStart && e.date <= args.weekEnd,
    );
  },
});

export const listByWorkerAndWeek = query({
  args: {
    workerId: v.id("payrollWorkers"),
    weekStart: v.string(),
    weekEnd: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const all = await ctx.db
      .query("payrollTimeEntries")
      .withIndex("by_worker", (q) => q.eq("workerId", args.workerId))
      .collect();
    return all.filter(
      (e) => e.date >= args.weekStart && e.date <= args.weekEnd,
    );
  },
});

export const listPending = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("payrollTimeEntries")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
  },
});

export const create = mutation({
  args: {
    workerId: v.id("payrollWorkers"),
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    notes: v.optional(v.string()),
  },
  returns: v.id("payrollTimeEntries"),
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const worker = await ctx.db.get(args.workerId);
    if (!worker) throw new Error("Worker not found");
    const hoursWorked = calculateHours(args.startTime, args.endTime);
    return await ctx.db.insert("payrollTimeEntries", {
      ...args,
      hoursWorked,
      status: "approved", // Admin-created entries are auto-approved
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("payrollTimeEntries"),
    workerId: v.optional(v.id("payrollWorkers")),
    date: v.optional(v.string()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const entry = await ctx.db.get(args.id);
    if (!entry) throw new Error("Not found");
    const startTime = args.startTime ?? entry.startTime;
    const endTime = args.endTime ?? entry.endTime;
    const hoursWorked = calculateHours(startTime, endTime);
    const { id, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined),
    );
    await ctx.db.patch(id, { ...filtered, hoursWorked });
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("payrollTimeEntries") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const entry = await ctx.db.get(args.id);
    if (!entry) throw new Error("Not found");
    await ctx.db.delete(args.id);
    return null;
  },
});

export const approve = mutation({
  args: { id: v.id("payrollTimeEntries") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const entry = await ctx.db.get(args.id);
    if (!entry) throw new Error("Not found");
    await ctx.db.patch(args.id, {
      status: "approved",
      reviewedAt: new Date().toISOString(),
    });
    return null;
  },
});

export const reject = mutation({
  args: {
    id: v.id("payrollTimeEntries"),
    adminNotes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const entry = await ctx.db.get(args.id);
    if (!entry) throw new Error("Not found");
    await ctx.db.patch(args.id, {
      status: "rejected",
      reviewedAt: new Date().toISOString(),
      adminNotes: args.adminNotes,
    });
    return null;
  },
});

export const adjustAndApprove = mutation({
  args: {
    id: v.id("payrollTimeEntries"),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    adminNotes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const entry = await ctx.db.get(args.id);
    if (!entry) throw new Error("Not found");
    const startTime = args.startTime ?? entry.startTime;
    const endTime = args.endTime ?? entry.endTime;
    const hoursWorked = calculateHours(startTime, endTime);
    await ctx.db.patch(args.id, {
      startTime,
      endTime,
      hoursWorked,
      status: "approved",
      reviewedAt: new Date().toISOString(),
      adminNotes: args.adminNotes,
    });
    return null;
  },
});
