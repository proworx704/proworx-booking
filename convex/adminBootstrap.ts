import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { Scrypt } from "lucia";

/** Debug: check auth account details and verify password */
export const debugAuth = internalQuery({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, { email, password }) => {
    const accounts = await ctx.db.query("authAccounts").collect();
    const account = accounts.find((a: any) => a.providerAccountId === email);
    
    if (!account) {
      return { found: false, error: `No account for ${email}` };
    }

    const secret = (account as any).secret;
    const secretPreview = secret ? secret.substring(0, 50) + "..." : "NO SECRET";
    
    // Try to verify
    let verifyResult = false;
    try {
      verifyResult = await new Scrypt().verify(secret, password);
    } catch (e: any) {
      return { 
        found: true, 
        secretPreview, 
        verifyResult: false,
        verifyError: e.message,
        allFields: Object.keys(account),
      };
    }

    return { 
      found: true, 
      secretPreview, 
      verifyResult,
      allFields: Object.keys(account),
    };
  },
});

/** Fix auth account password - delete and recreate the secret properly */
export const fixAuthPassword = internalMutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, { email, password }) => {
    const accounts = await ctx.db.query("authAccounts").collect();
    const account = accounts.find((a: any) => a.providerAccountId === email);
    
    if (!account) {
      return { success: false, error: `No auth account found for ${email}` };
    }

    const hashedPassword = await new Scrypt().hash(password);
    
    // Update the secret field
    await ctx.db.patch(account._id, { secret: hashedPassword } as any);
    
    // Verify it was written correctly
    const updated = await ctx.db.get(account._id);
    const storedSecret = (updated as any)?.secret;
    const matches = await new Scrypt().verify(storedSecret, password);
    
    return { 
      success: true, 
      message: `Password hash updated for ${email}`,
      verificationCheck: matches,
    };
  },
});

/** List all users for debugging */
export const listUsers = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.map((u) => ({ id: u._id, email: u.email, name: u.name }));
  },
});

/** List all user profiles */
export const listProfiles = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("userProfiles").collect();
  },
});

/** List auth accounts */
export const listAuthAccounts = internalQuery({
  args: {},
  handler: async (ctx) => {
    const accounts = await ctx.db.query("authAccounts").collect();
    return accounts.map((a) => ({ 
      id: a._id, 
      providerId: (a as any).provider,
      providerAccountId: (a as any).providerAccountId,
      userId: a.userId,
    }));
  },
});

/** Promote user to owner by userId */
export const promoteToOwner = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { role: "owner" });
      return { success: true, action: "updated" };
    }
    const user = await ctx.db.get(userId);
    await ctx.db.insert("userProfiles", {
      userId,
      role: "owner",
      displayName: user?.name || "Admin",
    });
    return { success: true, action: "created" };
  },
});

/** Clear all auth rate limits */
export const clearRateLimits = internalMutation({
  args: {},
  handler: async (ctx) => {
    const limits = await ctx.db.query("authRateLimits").collect();
    for (const limit of limits) {
      await ctx.db.delete(limit._id);
    }
    return { cleared: limits.length };
  },
});
