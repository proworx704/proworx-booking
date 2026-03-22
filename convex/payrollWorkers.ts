import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

async function requireAuth(ctx: { auth: unknown; db: unknown }) {
  const userId = await getAuthUserId(ctx as never);
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.db.query("payrollWorkers").collect();
  },
});

export const get = query({
  args: { id: v.id("payrollWorkers") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    hourlyRate: v.number(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  returns: v.id("payrollWorkers"),
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db.insert("payrollWorkers", {
      ...args,
      isActive: true,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("payrollWorkers"),
    name: v.optional(v.string()),
    hourlyRate: v.optional(v.number()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const worker = await ctx.db.get(args.id);
    if (!worker) throw new Error("Not found");
    const { id, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined),
    );
    await ctx.db.patch(id, filtered);
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("payrollWorkers") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const worker = await ctx.db.get(args.id);
    if (!worker) throw new Error("Not found");
    await ctx.db.delete(args.id);
    return null;
  },
});
