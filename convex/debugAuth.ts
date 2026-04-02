import { query } from "./_generated/server";
import { v } from "convex/values";

// Debug: check verification codes for an email
export const checkVerificationCodes = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    // Check authAccounts for this email
    const accounts = await ctx.db
      .query("authAccounts")
      .filter((q) => q.eq(q.field("providerAccountId"), email))
      .collect();

    // Check authVerificationCodes  
    const codes = await ctx.db
      .query("authVerificationCodes")
      .filter((q) => q.eq(q.field("accountId"), accounts[0]?._id))
      .collect();

    return {
      accountCount: accounts.length,
      accounts: accounts.map(a => ({
        id: a._id,
        provider: a.provider,
        providerAccountId: a.providerAccountId,
        emailVerified: (a as any).emailVerified,
      })),
      verificationCodes: codes.map(c => ({
        id: c._id,
        expiration: c.expirationTime,
        expired: (c.expirationTime as number) < Date.now(),
        verifier: (c as any).verifier ? "SET" : "NOT SET",
        code: c.code,
      })),
    };
  },
});
