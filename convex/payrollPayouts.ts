import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { requireAdmin } from "./authHelpers";

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
    await requireAdmin(ctx);
    const payouts = await ctx.db.query("payrollPayouts").collect();
    return payouts.sort((a, b) => b.weekStart.localeCompare(a.weekStart));
  },
});

export const listByWeek = query({
  args: { weekStart: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
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
    await requireAdmin(ctx);

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
    await requireAdmin(ctx);
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
    await requireAdmin(ctx);
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
    await requireAdmin(ctx);
    const payout = await ctx.db.get(args.id);
    if (!payout) throw new Error("Not found");
    await ctx.db.delete(args.id);
    return null;
  },
});

// ─── Auto-generate payouts for the previous week (Mon-Sun) ───
// Called by cron every Monday morning. No auth check needed (internal only).
function getPreviousWeekRange(): { weekStart: string; weekEnd: string } {
  // "now" in UTC — cron fires ~10:00 UTC (6 AM ET)
  const now = new Date();
  const day = now.getDay(); // 0=Sun … 6=Sat
  // Previous Monday = today minus (day + 6) % 7 days, then minus 7
  const prevMon = new Date(now);
  prevMon.setDate(now.getDate() - ((day + 6) % 7) - 7);
  const prevSun = new Date(prevMon);
  prevSun.setDate(prevMon.getDate() + 6);
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  return { weekStart: fmt(prevMon), weekEnd: fmt(prevSun) };
}

export const autoGenerateWeeklyPayouts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const { weekStart, weekEnd } = getPreviousWeekRange();

    // Get tax settings
    const taxSettings = await ctx.db.query("payrollTaxSettings").first();
    const fedRate = taxSettings?.federalRate ?? 10;
    const stateRate = taxSettings?.stateRate ?? 4.5;
    const ssRate = taxSettings?.socialSecurityRate ?? 6.2;
    const medRate = taxSettings?.medicareRate ?? 1.45;

    const workers = await ctx.db.query("payrollWorkers").collect();
    const payDate = getPayDate(weekEnd);
    let generated = 0;

    for (const worker of workers) {
      if (!worker.isActive) continue;

      const entries = await ctx.db
        .query("payrollTimeEntries")
        .withIndex("by_worker", (q) => q.eq("workerId", worker._id))
        .collect();

      const weekEntries = entries.filter(
        (e) =>
          e.date >= weekStart &&
          e.date <= weekEnd &&
          e.status === "approved",
      );

      if (weekEntries.length === 0) continue;

      // Skip if payout already exists for this worker+week
      const existing = await ctx.db
        .query("payrollPayouts")
        .withIndex("by_worker_weekStart", (q) =>
          q.eq("workerId", worker._id).eq("weekStart", weekStart),
        )
        .unique();
      if (existing) continue;

      const totalHours = weekEntries.reduce((sum, e) => sum + e.hoursWorked, 0);
      const grossPay = Math.round(totalHours * worker.hourlyRate * 100) / 100;

      const federalTax = Math.round(grossPay * (fedRate / 100) * 100) / 100;
      const stateTax = Math.round(grossPay * (stateRate / 100) * 100) / 100;
      const socialSecurity = Math.round(grossPay * (ssRate / 100) * 100) / 100;
      const medicare = Math.round(grossPay * (medRate / 100) * 100) / 100;
      const totalDeductions =
        Math.round((federalTax + stateTax + socialSecurity + medicare) * 100) / 100;
      const netPay = Math.round((grossPay - totalDeductions) * 100) / 100;

      await ctx.db.insert("payrollPayouts", {
        workerId: worker._id,
        weekStart,
        weekEnd,
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
      generated++;
    }

    console.log(
      `Auto-generated ${generated} payout(s) for week ${weekStart} → ${weekEnd}`,
    );
  },
});
