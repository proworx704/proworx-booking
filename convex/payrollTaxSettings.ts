import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./authHelpers";

const DEFAULT_TAX_SETTINGS = {
  federalRate: 10,
  stateRate: 4.5,
  socialSecurityRate: 6.2,
  medicareRate: 1.45,
};

export const get = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("payrollTaxSettings").first();
  },
});

export const getDefaults = query({
  args: {},
  handler: async () => {
    return DEFAULT_TAX_SETTINGS;
  },
});

export const upsert = mutation({
  args: {
    federalRate: v.number(),
    stateRate: v.number(),
    socialSecurityRate: v.number(),
    medicareRate: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.query("payrollTaxSettings").first();
    if (existing) {
      await ctx.db.patch(existing._id, args);
    } else {
      await ctx.db.insert("payrollTaxSettings", args);
    }
    return null;
  },
});
