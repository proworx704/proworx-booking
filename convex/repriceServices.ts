import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Square online fee: 2.9% + $0.30
const SQUARE_PERCENT = 0.029;
const SQUARE_FLAT_CENTS = 30; // $0.30
const HOURLY_RATE_CENTS = 7500; // $75.00

function newPriceCents(durationMin: number): number {
  const baseCents = HOURLY_RATE_CENTS * (durationMin / 60);
  // price - (price * 0.029 + 30) = base
  // price * 0.971 = base + 30
  // price = (base + 30) / 0.971
  const exactCents = (baseCents + SQUARE_FLAT_CENTS) / (1 - SQUARE_PERCENT);
  // Round up to nearest dollar (100 cents)
  return Math.ceil(exactCents / 100) * 100;
}

// Categories to reprice (labor-based services only)
const REPRICE_CATEGORIES = new Set([
  "core",
  "interiorAddon",
  "exteriorAddon",
  "boatDetailing",
  "boatAddon",
]);

// Skip these categories (product-heavy or subscription)
// ceramicCoating, ceramicAddon, membership, paintCorrection

export const run = mutation({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (ctx, { dryRun }) => {
    const changes: Array<{
      table: string;
      name: string;
      variant?: string;
      oldPrice: number;
      newPrice: number;
      durationMin: number;
    }> = [];

    // 1. Update legacy services table (skip Ceramic Coating and Paint Correction)
    const legacyServices = await ctx.db.query("services").collect();
    for (const svc of legacyServices) {
      if (
        svc.name.toLowerCase().includes("ceramic") ||
        svc.name.toLowerCase().includes("paint correction")
      ) {
        continue;
      }

      const np = newPriceCents(svc.duration);

      changes.push({
        table: "services",
        name: svc.name,
        variant: "sedan",
        oldPrice: svc.sedanPrice,
        newPrice: np,
        durationMin: svc.duration,
      });
      changes.push({
        table: "services",
        name: svc.name,
        variant: "suv",
        oldPrice: svc.suvPrice,
        newPrice: np,
        durationMin: svc.duration,
      });

      if (!dryRun) {
        await ctx.db.patch(svc._id, {
          sedanPrice: np,
          suvPrice: np,
        });
      }
    }

    // 2. Update serviceCatalog (only labor-based categories)
    const catalogItems = await ctx.db.query("serviceCatalog").collect();
    for (const item of catalogItems) {
      if (!REPRICE_CATEGORIES.has(item.category)) {
        continue; // skip ceramics, memberships, paint correction
      }

      const newVariants = item.variants.map(
        (v: { label: string; price: number; durationMin: number }) => {
          const np = newPriceCents(v.durationMin);
          changes.push({
            table: "serviceCatalog",
            name: item.name,
            variant: v.label,
            oldPrice: v.price,
            newPrice: np,
            durationMin: v.durationMin,
          });
          return { ...v, price: np };
        }
      );

      if (!dryRun) {
        await ctx.db.patch(item._id, { variants: newVariants });
      }
    }

    return {
      totalChanges: changes.length,
      dryRun: !!dryRun,
      changes,
    };
  },
});
