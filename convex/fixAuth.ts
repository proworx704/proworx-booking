import { v } from "convex/values";
import { Scrypt } from "lucia";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

export const getAuthAccounts = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("authAccounts").collect();
  },
});

export const updatePasswordHash = internalMutation({
  args: {
    accountId: v.id("authAccounts"),
    newSecret: v.string(),
  },
  handler: async (ctx, { accountId, newSecret }) => {
    await ctx.db.patch(accountId, { secret: newSecret });
  },
});

export const fixPasswords = action({
  args: {
    fixKey: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, { fixKey }) => {
    if (fixKey !== "fix-proworx-2026") {
      return "unauthorized";
    }

    const scrypt = new Scrypt();
    const accounts = await ctx.runQuery(internal.fixAuth.getAuthAccounts);
    
    let fixed = 0;
    const results: string[] = [];
    
    for (const account of accounts) {
      let newPassword: string | null = null;
      
      if (account.providerAccountId === "agent@test.local") {
        newPassword = "TestAgent123!";
      } else if (account.providerAccountId === "employee@test.local") {
        newPassword = "TestEmployee123!";
      }
      
      if (newPassword && account.secret) {
        const newHash = await scrypt.hash(newPassword);
        await ctx.runMutation(internal.fixAuth.updatePasswordHash, {
          accountId: account._id,
          newSecret: newHash,
        });
        fixed++;
        results.push(`Fixed: ${account.providerAccountId}`);
      }
    }
    
    return `Fixed ${fixed} accounts: ${results.join(", ")}`;
  },
});
