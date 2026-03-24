import { query } from "./_generated/server";

// Temporary admin lookup — will be deleted after use
export const listAllProfiles = query({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query("userProfiles").collect();
    const staff = await ctx.db.query("staff").collect();
    const users = await ctx.db.query("users").collect();
    return { profiles, staff, users: users.map(u => ({ _id: u._id, email: u.email, name: u.name })) };
  },
});
