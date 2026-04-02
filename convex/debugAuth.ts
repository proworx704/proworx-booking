import { query } from "./_generated/server";

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
