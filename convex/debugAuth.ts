import { query } from "./_generated/server";
import { v } from "convex/values";

export const checkVerificationCodes = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const accounts = await ctx.db
      .query("authAccounts")
      .filter((q) => q.eq(q.field("providerAccountId"), email))
      .collect();

    const account = accounts[0] as any;
    
    // Check if there's a linked user
    let user = null;
    let userProfile = null;
    if (account?.userId) {
      user = await ctx.db.get(account.userId);
      // Check userProfiles
      const profiles = await ctx.db
        .query("userProfiles")
        .filter((q) => q.eq(q.field("userId"), account.userId))
        .collect();
      userProfile = profiles[0] || null;
    }

    // Check active sessions for this user
    let sessions: any[] = [];
    if (account?.userId) {
      sessions = await ctx.db
        .query("authSessions")
        .filter((q) => q.eq(q.field("userId"), account.userId))
        .collect();
    }

    return {
      account: account ? {
        id: account._id,
        userId: account.userId,
        provider: account.provider,
        emailVerified: account.emailVerified,
        secret: account.secret ? "HAS_PASSWORD_HASH" : "NO_PASSWORD",
      } : null,
      user: user ? { id: (user as any)._id, email: (user as any).email, name: (user as any).name } : null,
      userProfile: userProfile ? { role: (userProfile as any).role, displayName: (userProfile as any).displayName } : null,
      sessionCount: sessions.length,
    };
  },
});
