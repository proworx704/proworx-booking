import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Employee Portal — queries scoped to the logged-in employee's data.
 * All functions require authentication and a linked payrollWorker.
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getEmployeeContext(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");

  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();

  if (!profile) throw new Error("No profile found");

  return { userId, profile };
}

// ─── My Time Entries ──────────────────────────────────────────────────────────

/** Get employee's own time entries (optionally filtered by date range) */
export const myTimeEntries = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, { startDate, endDate }) => {
    const { profile } = await getEmployeeContext(ctx);
    if (!profile.payrollWorkerId) return [];

    let entries = await ctx.db
      .query("payrollTimeEntries")
      .withIndex("by_worker", (q: any) => q.eq("workerId", profile.payrollWorkerId))
      .collect();

    if (startDate) entries = entries.filter((e: any) => e.date >= startDate);
    if (endDate) entries = entries.filter((e: any) => e.date <= endDate);

    return entries.sort((a: any, b: any) => b.date.localeCompare(a.date));
  },
});

/** Submit a new time entry */
export const submitTimeEntry = mutation({
  args: {
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { profile } = await getEmployeeContext(ctx);
    if (!profile.payrollWorkerId) throw new Error("No payroll worker linked");

    // Calculate hours
    const [sh, sm] = args.startTime.split(":").map(Number);
    const [eh, em] = args.endTime.split(":").map(Number);
    const startMinutes = sh * 60 + sm;
    const endMinutes = eh * 60 + em;
    const hoursWorked = Math.round(((endMinutes - startMinutes) / 60) * 100) / 100;

    if (hoursWorked <= 0) throw new Error("End time must be after start time");

    return await ctx.db.insert("payrollTimeEntries", {
      workerId: profile.payrollWorkerId,
      date: args.date,
      startTime: args.startTime,
      endTime: args.endTime,
      hoursWorked,
      notes: args.notes,
      status: "pending",
    });
  },
});

/** Delete own pending time entry */
export const deleteTimeEntry = mutation({
  args: { id: v.id("payrollTimeEntries") },
  handler: async (ctx, { id }) => {
    const { profile } = await getEmployeeContext(ctx);
    const entry = await ctx.db.get(id);
    if (!entry) throw new Error("Entry not found");
    if (entry.workerId !== profile.payrollWorkerId) throw new Error("Not your entry");
    if (entry.status !== "pending") throw new Error("Can only delete pending entries");
    await ctx.db.delete(id);
  },
});

// ─── My Payouts ───────────────────────────────────────────────────────────────

/** Get employee's payouts */
export const myPayouts = query({
  args: {},
  handler: async (ctx) => {
    const { profile } = await getEmployeeContext(ctx);
    if (!profile.payrollWorkerId) return [];

    const payouts = await ctx.db
      .query("payrollPayouts")
      .withIndex("by_worker", (q: any) => q.eq("workerId", profile.payrollWorkerId))
      .collect();

    return payouts.sort((a: any, b: any) => b.weekStart.localeCompare(a.weekStart));
  },
});

// ─── My Worker Info ───────────────────────────────────────────────────────────

/** Get employee's own worker record (name, hourly rate) */
export const myWorkerInfo = query({
  args: {},
  handler: async (ctx) => {
    const { profile } = await getEmployeeContext(ctx);
    if (!profile.payrollWorkerId) return null;

    const worker = await ctx.db.get(profile.payrollWorkerId);
    return worker;
  },
});

// ─── My Stats ─────────────────────────────────────────────────────────────────

/** Get summary stats for the current week */
export const myWeekStats = query({
  args: { weekStart: v.string() },
  handler: async (ctx, { weekStart }) => {
    const { profile } = await getEmployeeContext(ctx);
    if (!profile.payrollWorkerId) {
      return { totalHours: 0, pendingHours: 0, approvedHours: 0, entries: 0 };
    }

    // Get the week's date range (Mon-Sun)
    const startDate = weekStart;
    const endDate = (() => {
      const d = new Date(weekStart + "T12:00:00");
      d.setDate(d.getDate() + 6);
      return d.toISOString().split("T")[0];
    })();

    const entries = await ctx.db
      .query("payrollTimeEntries")
      .withIndex("by_worker", (q: any) => q.eq("workerId", profile.payrollWorkerId))
      .collect();

    const weekEntries = entries.filter(
      (e: any) => e.date >= startDate && e.date <= endDate,
    );

    const totalHours = weekEntries.reduce((s: number, e: any) => s + e.hoursWorked, 0);
    const pendingHours = weekEntries
      .filter((e: any) => e.status === "pending")
      .reduce((s: number, e: any) => s + e.hoursWorked, 0);
    const approvedHours = weekEntries
      .filter((e: any) => e.status === "approved")
      .reduce((s: number, e: any) => s + e.hoursWorked, 0);

    return {
      totalHours: Math.round(totalHours * 100) / 100,
      pendingHours: Math.round(pendingHours * 100) / 100,
      approvedHours: Math.round(approvedHours * 100) / 100,
      entries: weekEntries.length,
    };
  },
});

// ─── My Assigned Jobs (from bookings) ─────────────────────────────────────────

/** Get bookings assigned to this employee's staff record */
export const myJobs = query({
  args: { date: v.optional(v.string()) },
  handler: async (ctx, { date }) => {
    const { profile } = await getEmployeeContext(ctx);
    if (!profile.staffId) return [];

    // Get all bookings (optionally filtered by date)
    let bookings;
    if (date) {
      bookings = await ctx.db
        .query("bookings")
        .withIndex("by_date", (q: any) => q.eq("date", date))
        .collect();
    } else {
      // Default: today + upcoming
      const today = new Date().toISOString().split("T")[0];
      bookings = await ctx.db.query("bookings").collect();
      bookings = bookings.filter((b: any) => b.date >= today);
    }

    // Filter to bookings assigned to this staff member
    const myBookings = bookings.filter(
      (b: any) => b.assignedStaffId === profile.staffId,
    );

    return myBookings.sort((a: any, b: any) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.startTime || "").localeCompare(b.startTime || "");
    });
  },
});
