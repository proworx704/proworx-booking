import { mutation } from "../_generated/server";

/**
 * Add Touch-Up Paint to the exterior add-ons catalog.
 * $75 deposit — final charge based on actual labor time (minimum $75).
 */
export const run = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if already exists
    const existing = await ctx.db
      .query("serviceCatalog")
      .withIndex("by_slug", (q) => q.eq("slug", "touch-up-paint"))
      .first();
    if (existing) return "Touch-Up Paint already exists";

    await ctx.db.insert("serviceCatalog", {
      name: "Touch-Up Paint",
      slug: "touch-up-paint",
      description:
        "Paint touch-up to repair chips, scratches, and minor paint damage. $75 deposit at booking — final charge based on actual labor time with a minimum of $75.",
      category: "exteriorAddon",
      variants: [
        { label: "Deposit (Minimum Charge)", price: 7500, durationMin: 60 },
      ],
      isActive: true,
      sortOrder: 9,
      deposit: 7500,
    });

    return "Added Touch-Up Paint to exterior add-ons";
  },
});
