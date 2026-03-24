import { mutation } from "./_generated/server";
import { requireAdmin } from "./authHelpers";

/**
 * Seed Cameron's alternating custody schedule.
 *
 * Pattern from Tyler's Square calendar screenshots:
 * Week A: Cameron on Wed + Thu (4 PM onward)
 * Week B: Cameron on Mon + Tue + Fri (4 PM onward) + Sat (all day / 7 AM)
 *
 * Reference: Monday of Week A = 2026-03-30
 * (Week A = lighter week, no Saturday block — Tyler does NOT have Cameron on Sat Mar 21)
 */
export const run = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    // ── 1. Enable recurring blocks with Week A reference ──
    const existing = await ctx.db.query("recurringBlockSettings").first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        weekAStartDate: "2026-03-30", // Shifted: week of Mar 16 = Week A (no Sat block), week of Mar 23 = Week B
        isEnabled: true,
      });
    } else {
      await ctx.db.insert("recurringBlockSettings", {
        weekAStartDate: "2026-03-23",
        isEnabled: true,
      });
    }

    // ── 2. Clear all existing blocks ──
    const oldBlocks = await ctx.db.query("recurringBlocks").collect();
    for (const b of oldBlocks) {
      await ctx.db.delete(b._id);
    }

    // ── 3. Week A blocks: Wed (3) + Thu (4) at 4 PM ──
    await ctx.db.insert("recurringBlocks", {
      weekType: "A",
      dayOfWeek: 3, // Wednesday
      blockAfter: "16:00",
      reason: "Cameron",
    });
    await ctx.db.insert("recurringBlocks", {
      weekType: "A",
      dayOfWeek: 4, // Thursday
      blockAfter: "16:00",
      reason: "Cameron",
    });

    // ── 4. Week B blocks: Mon (1) + Tue (2) + Fri (5) at 4 PM, Sat (6) all day ──
    await ctx.db.insert("recurringBlocks", {
      weekType: "B",
      dayOfWeek: 1, // Monday
      blockAfter: "16:00",
      reason: "Cameron",
    });
    await ctx.db.insert("recurringBlocks", {
      weekType: "B",
      dayOfWeek: 2, // Tuesday
      blockAfter: "16:00",
      reason: "Cameron",
    });
    await ctx.db.insert("recurringBlocks", {
      weekType: "B",
      dayOfWeek: 5, // Friday
      blockAfter: "16:00",
      reason: "Cameron",
    });
    await ctx.db.insert("recurringBlocks", {
      weekType: "B",
      dayOfWeek: 6, // Saturday
      blockAfter: "07:00", // All day — blocked from 7 AM
      reason: "Cameron",
    });

    return "Cameron's alternating schedule seeded: Week A (Wed+Thu 4PM), Week B (Mon+Tue+Fri 4PM + Sat all day). Reference Monday: 2026-03-30 (shifted so Mar 21 Sat = no Cameron).";
  },
});
