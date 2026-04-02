import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listAllProfiles = query({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query("userProfiles").collect();
    const users = await ctx.db.query("users").collect();
    const accounts = await ctx.db.query("authAccounts").collect();
    
    return {
      profiles: profiles.map(p => ({
        id: p._id,
        userId: p.userId,
        role: p.role,
        displayName: (p as any).displayName,
        customerId: (p as any).customerId,
        created: p._creationTime,
      })),
      recentUsers: users
        .sort((a: any, b: any) => b._creationTime - a._creationTime)
        .slice(0, 10)
        .map((u: any) => ({
          id: u._id,
          email: u.email,
          name: u.name,
          created: u._creationTime,
        })),
      recentAccounts: accounts
        .sort((a: any, b: any) => b._creationTime - a._creationTime)
        .slice(0, 10)
        .map((a: any) => ({
          id: a._id,
          userId: a.userId,
          provider: a.provider,
          email: a.providerAccountId,
          emailVerified: a.emailVerified,
          created: a._creationTime,
        })),
    };
  },
});

// Test what initMyProfile would do for a given user
export const testInitLogic = query({
  args: { userId: v.string() },
  handler: async (ctx) => {
    const userId = ctx.db.normalizeId("users", args.userId as any);
    if (!userId) return { error: "Invalid userId" };
    
    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existing) return { status: "has_profile", role: existing.role, id: existing._id };

    const user = await ctx.db.get(userId);
    const email = (user?.email ?? "").toLowerCase();
    
    const OWNER_EMAILS = ["tyler@proworxdetailing.com", "detailing@proworxdetailing.com"];
    const staffEmails = (await ctx.db.query("staff").collect())
      .map((s: any) => (s.email ?? "").toLowerCase())
      .filter((e: string) => e !== "");
    
    let role: string;
    if (OWNER_EMAILS.includes(email)) role = "owner";
    else if (staffEmails.includes(email)) role = "employee";
    else role = "client";
    
    const customerMatch = email
      ? await ctx.db.query("customers").withIndex("by_email", (q: any) => q.eq("email", email)).first()
      : null;
    
    return {
      status: "needs_profile",
      email,
      computedRole: role,
      staffEmails,
      customerExists: !!customerMatch,
      customerName: customerMatch?.name,
    };
  },
});

// Actually create a client profile
export const createClientProfile = mutation({
  args: { userId: v.string(), displayName: v.string() },
  handler: async (ctx, { userId: userIdStr, displayName }) => {
    const userId = ctx.db.normalizeId("users", userIdStr as any);
    if (!userId) throw new Error("Invalid userId");
    
    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existing) return { id: existing._id, status: "exists" };
    
    const user = await ctx.db.get(userId);
    const email = (user?.email ?? "").toLowerCase();
    
    // Find or create customer
    let customer = email
      ? await ctx.db.query("customers").withIndex("by_email", (q: any) => q.eq("email", email)).first()
      : null;
    
    let customerId;
    if (!customer) {
      customerId = await ctx.db.insert("customers", {
        name: displayName,
        email: email || undefined,
        source: "booking" as const,
        totalBookings: 0,
        totalSpent: 0,
      });
    } else {
      customerId = customer._id;
    }
    
    // Create loyalty account
    const loyaltyAccount = await ctx.db
      .query("loyaltyAccounts")
      .withIndex("by_customer", (q: any) => q.eq("customerId", customerId))
      .first();
    if (!loyaltyAccount) {
      await ctx.db.insert("loyaltyAccounts", {
        customerId,
        currentPoints: 0,
        lifetimeEarned: 0,
        lifetimeRedeemed: 0,
      });
    }
    
    const profileId = await ctx.db.insert("userProfiles", {
      userId,
      role: "client",
      displayName,
      customerId,
    } as any);
    
    return { id: profileId, status: "created" };
  },
});
