import { mutation } from "../_generated/server";

const RATE = 90; // $/hr

const LABOR_CATEGORIES = ["core", "boatDetailing"];

// Correct slugs from the database
const LABOR_ADDON_SLUGS = [
  "pet-hair-removal",
  "hot-water-extraction",
  "engine-bay",
  "headlight-restoration",
  "wheel-polishing",
  "leather-clean",
  "uv-protection",
  "steam-cleaning",
  "boat-trailer-detail",
  "boat-metal-polish",
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
          const newPrice = Math.round(hrs * RATE * 100);
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

    // Update touch-up paint description
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
            price: 7500,
            durationMin: 60,
          },
        ],
        deposit: 7500,
      });
    }

    return `Updated ${updated} additional services to $${RATE}/hr`;
  },
});
