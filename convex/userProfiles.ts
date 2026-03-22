import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Get current user's profile (role, linked staff/worker) */
export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const user = await ctx.db.get(userId);

    return {
      userId,
      email: user?.email,
      name: user?.name,
      profile,
      role: profile?.role ?? null, // null = no profile yet (new signup)
    };
  },
});

/** List all user profiles (admin only) */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if caller is owner/admin
    const callerProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!callerProfile || (callerProfile.role !== "owner" && callerProfile.role !== "admin")) {
      throw new Error("Access denied");
    }

    const profiles = await ctx.db.query("userProfiles").collect();

    // Enrich with user email
    const enriched = await Promise.all(
      profiles.map(async (p) => {
        const user = await ctx.db.get(p.userId);
        const staff = p.staffId ? await ctx.db.get(p.staffId) : null;
        const worker = p.payrollWorkerId ? await ctx.db.get(p.payrollWorkerId) : null;
        return {
          ...p,
          email: user?.email,
          userName: user?.name,
          staffName: staff?.name,
          workerName: worker?.name,
        };
      }),
    );

    return enriched;
  },
});

/** Get profile by userId (admin only) */
export const getByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────────

/** Create or update a user profile (admin only, or self-init for new signups) */
export const upsert = mutation({
  args: {
    targetUserId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("admin"), v.literal("employee")),
    displayName: v.string(),
    staffId: v.optional(v.id("staff")),
    payrollWorkerId: v.optional(v.id("payrollWorkers")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if caller is owner/admin (unless creating their own first profile)
    const callerProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const isAdmin = callerProfile?.role === "owner" || callerProfile?.role === "admin";
    const isSelf = args.targetUserId === userId;

    // Allow: admin creating any profile, OR first-time self-registration as employee
    if (!isAdmin && !isSelf) {
      throw new Error("Access denied");
    }
    // Non-admins can only self-register as employee
    if (!isAdmin && isSelf && args.role !== "employee") {
      throw new Error("Cannot self-assign admin role");
    }

    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.targetUserId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        role: args.role,
        displayName: args.displayName,
        staffId: args.staffId,
        payrollWorkerId: args.payrollWorkerId,
      });
      return existing._id;
    }

    return await ctx.db.insert("userProfiles", {
      userId: args.targetUserId,
      role: args.role,
      displayName: args.displayName,
      staffId: args.staffId,
      payrollWorkerId: args.payrollWorkerId,
    });
  },
});

/** Delete a user profile (admin only) */
export const remove = mutation({
  args: { id: v.id("userProfiles") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const callerProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!callerProfile || callerProfile.role !== "owner") {
      throw new Error("Only owners can delete profiles");
    }

    await ctx.db.delete(id);
  },
});

/** Quick helper: set role for a user by email (used for seeding) */
export const setRoleByEmail = mutation({
  args: {
    email: v.string(),
    role: v.union(v.literal("owner"), v.literal("admin"), v.literal("employee")),
    displayName: v.string(),
  },
  handler: async (ctx, { email, role, displayName }) => {
    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();

    if (!user) {
      return { success: false, error: `No user found with email ${email}` };
    }

    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { role, displayName });
      return { success: true, action: "updated", profileId: existing._id };
    }

    const id = await ctx.db.insert("userProfiles", {
      userId: user._id,
      role,
      displayName,
    });
    return { success: true, action: "created", profileId: id };
  },
});
