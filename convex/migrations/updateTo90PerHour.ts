import { mutation } from "../_generated/server";

// Square online fee: 2.9% + $0.30
const SQUARE_PERCENT = 0.029;
const SQUARE_FLAT_CENTS = 30;
const HOURLY_RATE_CENTS = 9000; // $90.00

/**
 * Calculate price that nets $90/hr after Square takes fees.
 * price * (1 - 0.029) - 0.30 = base
 * price = (base + 30) / 0.971
 * Rounded up to nearest dollar.
 */
function priceWithFees(durationMin: number): number {
  const baseCents = HOURLY_RATE_CENTS * (durationMin / 60);
  const exactCents = (baseCents + SQUARE_FLAT_CENTS) / (1 - SQUARE_PERCENT);
  return Math.ceil(exactCents / 100) * 100;
}

const LABOR_CATEGORIES = ["core", "boatDetailing"];

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
          const newPrice = priceWithFees(v.durationMin);
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

    // Touch-up paint: keep $75 deposit, $75 min labor — NOT subject to fee adjustment
    // (deposit collected separately, labor billed at actual time)
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

    return `Updated ${updated} services to $90/hr + Square fees (2.9% + $0.30)`;
  },
});
