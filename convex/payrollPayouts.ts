import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

async function requireAuth(ctx: { auth: unknown; db: unknown }) {
  const userId = await getAuthUserId(ctx as never);
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

function getPayDate(weekEnd: string): string {
  const d = new Date(`${weekEnd}T12:00:00`);
  const dayOfWeek = d.getDay();
  const daysUntilThursday = dayOfWeek <= 4 ? 4 - dayOfWeek : 11 - dayOfWeek;
  d.setDate(d.getDate() + daysUntilThursday);
  return d.toISOString().split("T")[0];
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    const payouts = await ctx.db.query("payrollPayouts").collect();
    return payouts.sort((a, b) => b.weekStart.localeCompare(a.weekStart));
  },
});

export const listByWeek = query({
  args: { weekStart: v.string() },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("payrollPayouts")
      .withIndex("by_weekStart", (q) => q.eq("weekStart", args.weekStart))
      .collect();
  },
});

export const generate = mutation({
  args: {
    weekStart: v.string(),
    weekEnd: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    // Get tax settings
    const taxSettings = await ctx.db.query("payrollTaxSettings").first();
    const fedRate = taxSettings?.federalRate ?? 10;
    const stateRate = taxSettings?.stateRate ?? 4.5;
    const ssRate = taxSettings?.socialSecurityRate ?? 6.2;
    const medRate = taxSettings?.medicareRate ?? 1.45;

    // Get all workers
    const workers = await ctx.db.query("payrollWorkers").collect();
    const payDate = getPayDate(args.weekEnd);
    const payoutIds: string[] = [];

    for (const worker of workers) {
      if (!worker.isActive) continue;

      // Get approved time entries for this worker this week
      const entries = await ctx.db
        .query("payrollTimeEntries")
        .withIndex("by_worker", (q) => q.eq("workerId", worker._id))
        .collect();

      const weekEntries = entries.filter(
        (e) =>
          e.date >= args.weekStart &&
          e.date <= args.weekEnd &&
          e.status === "approved",
      );

      if (weekEntries.length === 0) continue;

      const totalHours = weekEntries.reduce((sum, e) => sum + e.hoursWorked, 0);
      const grossPay =
        Math.round(totalHours * worker.hourlyRate * 100) / 100;

      const federalTax = Math.round(grossPay * (fedRate / 100) * 100) / 100;
      const stateTax = Math.round(grossPay * (stateRate / 100) * 100) / 100;
      const socialSecurity =
        Math.round(grossPay * (ssRate / 100) * 100) / 100;
      const medicare = Math.round(grossPay * (medRate / 100) * 100) / 100;
      const totalDeductions =
        Math.round(
          (federalTax + stateTax + socialSecurity + medicare) * 100,
        ) / 100;
      const netPay = Math.round((grossPay - totalDeductions) * 100) / 100;

      // Delete existing payout for same worker + week
      const existing = await ctx.db
        .query("payrollPayouts")
        .withIndex("by_worker_weekStart", (q) =>
          q.eq("workerId", worker._id).eq("weekStart", args.weekStart),
        )
        .unique();
      if (existing) await ctx.db.delete(existing._id);

      const id = await ctx.db.insert("payrollPayouts", {
        workerId: worker._id,
        weekStart: args.weekStart,
        weekEnd: args.weekEnd,
        totalHours: Math.round(totalHours * 100) / 100,
        grossPay,
        federalTax,
        stateTax,
        socialSecurity,
        medicare,
        totalDeductions,
        netPay,
        payDate,
        isPaid: false,
      });
      payoutIds.push(id);
    }

    return payoutIds;
  },
});

export const markPaid = mutation({
  args: { id: v.id("payrollPayouts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const payout = await ctx.db.get(args.id);
    if (!payout) throw new Error("Not found");
    await ctx.db.patch(args.id, {
      isPaid: true,
      paidAt: new Date().toISOString(),
    });
    return null;
  },
});

export const markUnpaid = mutation({
  args: { id: v.id("payrollPayouts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const payout = await ctx.db.get(args.id);
    if (!payout) throw new Error("Not found");
    await ctx.db.patch(args.id, {
      isPaid: false,
      paidAt: undefined,
    });
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("payrollPayouts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const payout = await ctx.db.get(args.id);
    if (!payout) throw new Error("Not found");
    await ctx.db.delete(args.id);
    return null;
  },
});
