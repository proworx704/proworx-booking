import { mutation } from "../_generated/server";

const RATE = 90; // $/hr

// Categories to update to strict $90/hr
const LABOR_CATEGORIES = [
  "core",           // all 9 core packages
  "boatDetailing",  // all boat detailing services
];

// Individual labor add-ons to update (by slug)
const LABOR_ADDON_SLUGS = [
  "pet-hair-removal",
  "hot-water-extraction-shampoo",
  "engine-bay",
  "headlight-restoration-uv-sealant",
  "wheel-polishing-protection",
  "leather-deep-clean-condition",
  "plastic-vinyl-uv-protection",
  "steam-cleaning-vents-plastics-crevices",
  "trailer-detail",
  "metal-brightwork-polish",
  // touch-up-paint excluded: $75 deposit + $75 min labor, $90/hr over 1hr
];

export const run = mutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("serviceCatalog").collect();
    let updated = 0;

    for (const item of all) {
      const isLaborCat = LABOR_CATEGORIES.includes(item.category);
      const isLaborAddon = LABOR_ADDON_SLUGS.includes(item.slug);

      if (!isLaborCat && !isLaborAddon) continue;

      const newVariants = item.variants.map(
        (v: { label: string; price: number; durationMin: number }) => {
          const hrs = v.durationMin / 60;
          const newPrice = Math.round(hrs * RATE * 100); // cents
          return { ...v, price: newPrice };
        },
      );

      const changed = newVariants.some(
        (nv: { price: number }, i: number) => nv.price !== item.variants[i].price,
      );

      if (changed) {
        await ctx.db.patch(item._id, { variants: newVariants });
        updated++;
      }
    }

    // Update touch-up paint description to reflect pricing model
    const touchUp = all.find(
      (i: { slug: string }) => i.slug === "touch-up-paint",
    );
    if (touchUp) {
      await ctx.db.patch(touchUp._id, {
        description:
          "$75 deposit at booking. $75 minimum labor charge (under 1hr). Over 1hr billed at $90/hr.",
        variants: [
          {
            label: "Deposit + Minimum Labor",
            price: 7500, // $75 deposit shown at booking
            durationMin: 60,
          },
        ],
        deposit: 7500,
      });
    }

    return `Updated ${updated} services to $${RATE}/hr`;
  },
});
