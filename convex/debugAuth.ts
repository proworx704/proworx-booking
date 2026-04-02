import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Check all auth state for an email
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
    let sessions: any[] = [];
    let codes: any[] = [];
    
    if (account?.userId) {
      user = await ctx.db.get(account.userId);
      const profiles = await ctx.db
        .query("userProfiles")
        .filter((q) => q.eq(q.field("userId"), account.userId))
        .collect();
      userProfile = profiles[0] || null;
      sessions = await ctx.db
        .query("authSessions")
        .filter((q) => q.eq(q.field("userId"), account.userId))
        .collect();
    }
    
    // Check verification codes for this account
    if (account) {
      codes = await ctx.db
        .query("authVerificationCodes")
        .filter((q) => q.eq(q.field("accountId"), account._id))
        .collect();
    }
    
    // Also get ALL verification codes (to see if any exist at all)
    const allCodes = await ctx.db.query("authVerificationCodes").collect();
    
    return {
      account: account ? {
        id: account._id,
        userId: account.userId,
        emailVerified: account.emailVerified,
        hasPassword: !!account.secret,
      } : null,
      user: user ? { id: (user as any)._id, email: (user as any).email, name: (user as any).name } : null,
      userProfile: userProfile ? { id: (userProfile as any)._id, role: (userProfile as any).role } : null,
      sessionCount: sessions.length,
      codesForAccount: codes.map((c: any) => ({
        id: c._id,
        provider: c.provider,
        codeHash: c.code?.substring(0, 12) + "...",
        expirationTime: c.expirationTime,
        expired: c.expirationTime < Date.now(),
        emailVerified: c.emailVerified,
        verifier: c.verifier ?? "NOT_SET",
      })),
      totalCodesInSystem: allCodes.length,
      allCodesProviders: allCodes.map((c: any) => ({ 
        provider: c.provider, 
        email: c.emailVerified,
        expired: c.expirationTime < Date.now(),
      })),
    };
  },
});

// Temp: create client profile for a user by userId
export const createClientProfile = mutation({
  args: { userId: v.id("users"), displayName: v.string() },
  handler: async (ctx, { userId, displayName }) => {
    const existing = await ctx.db
      .query("userProfiles")
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();
    if (existing) return { status: "already_exists", id: existing._id };
    const id = await ctx.db.insert("userProfiles", {
      userId,
      role: "client",
      displayName,
    });
    return { status: "created", id };
  },
});
