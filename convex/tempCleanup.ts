/**
 * Temporary admin utilities - DELETE THIS FILE after use.
 */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/** List all user profiles with their user details */
export const listAllProfiles = query({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query("userProfiles").collect();
    const results = [];
    for (const p of profiles) {
      const user = await ctx.db.get(p.userId);
      results.push({
        profileId: p._id,
        userId: p.userId,
        role: p.role,
        displayName: p.displayName,
        email: user?.email ?? "unknown",
        name: user?.name ?? "unknown",
        staffId: p.staffId,
        payrollWorkerId: p.payrollWorkerId,
      });
    }
    return results;
  },
});

/** Remove a user profile by ID */
export const removeProfile = mutation({
  args: { profileId: v.id("userProfiles") },
  handler: async (ctx, { profileId }) => {
    const profile = await ctx.db.get(profileId);
    if (!profile) return { success: false, error: "not found" };
    await ctx.db.delete(profileId);
    return { success: true, deleted: profileId, role: profile.role, displayName: profile.displayName };
  },
});

/** List all staff entries */
export const listStaff = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("staff").collect();
  },
});

/** Remove a staff entry */
export const removeStaff = mutation({
  args: { staffId: v.id("staff") },
  handler: async (ctx, { staffId }) => {
    await ctx.db.delete(staffId);
    return { success: true, deleted: staffId };
  },
});
