import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const checkVerificationCodes = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const accounts = await ctx.db
      .query("authAccounts")
      .filter((q) => q.eq(q.field("providerAccountId"), email))
      .collect();
    const account = accounts[0] as any;
    let user = null;
    let userProfile = null;
    if (account?.userId) {
      user = await ctx.db.get(account.userId);
      const profiles = await ctx.db
        .query("userProfiles")
        .filter((q) => q.eq(q.field("userId"), account.userId))
        .collect();
      userProfile = profiles[0] || null;
    }
    return {
      account: account ? { id: account._id, userId: account.userId, emailVerified: account.emailVerified, secret: account.secret ? "HAS_HASH" : "NONE" } : null,
      user: user ? { id: (user as any)._id, email: (user as any).email, name: (user as any).name } : null,
      userProfile,
    };
  },
});

// Temp: create client profile for a user by userId
export const createClientProfile = mutation({
  args: { userId: v.id("users"), displayName: v.string(), email: v.string() },
  handler: async (ctx, { userId, displayName, email }) => {
    // Check if profile already exists
    const existing = await ctx.db
      .query("userProfiles")
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();
    if (existing) return { status: "already_exists", id: existing._id };
    const id = await ctx.db.insert("userProfiles", {
      userId,
      role: "client",
      displayName,
      email,
    });
    return { status: "created", id };
  },
});
