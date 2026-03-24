import { internalQuery } from "./_generated/server";

// Temporary admin lookup — will be deleted after use
export const listAllProfiles = internalQuery({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query("userProfiles").collect();
    const staff = await ctx.db.query("staff").collect();
    return { profiles, staff };
  },
});
