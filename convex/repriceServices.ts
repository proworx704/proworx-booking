import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Square online fee: 2.9% + $0.30
const SQUARE_PERCENT = 0.029;
const SQUARE_FLAT_CENTS = 30; // $0.30
const HOURLY_RATE_CENTS = 7500; // $75.00

function newPriceCents(durationMin: number): number {
  const baseCents = HOURLY_RATE_CENTS * (durationMin / 60);
  // price that nets $75/hr after Square takes fees:
  // price * (1 - 0.029) = base + 0.30
  // price = (base + 30) / 0.971
  const exactCents = (baseCents + SQUARE_FLAT_CENTS) / (1 - SQUARE_PERCENT);
  // Round up to nearest dollar (100 cents)
  return Math.ceil(exactCents / 100) * 100;
}

// Tyler said "Option B" = labor-only primary services
// Then "Paint correction can also stay the same"
// So ONLY: core detailing + boat detailing
const REPRICE_CATEGORIES = new Set([
  "core",          // Standard Inside & Out, Interior Only, Exterior Only
  "boatDetailing", // Boat wash, interior/exterior/full detail, oxidation removal
]);

// Everything else stays the same:
// paintCorrection, ceramicCoating, ceramicAddon, boatCeramic,
// interiorAddon, exteriorAddon, boatAddon, membership

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

    // 1. Update legacy services table
    // Only reprice primary detailing services
    const REPRICE_LEGACY = new Set([
      "Express Detail",
      "Full Detail",
      "Interior Only",
      "Exterior Only",
      "Maintenance - Exterior Only",
      "Maintenance - Interior Only",
      "Maintenance - Full Inside & Out",
    ]);

    const legacyServices = await ctx.db.query("services").collect();
    for (const svc of legacyServices) {
      if (!REPRICE_LEGACY.has(svc.name)) {
        continue; // skip Paint Correction, Ceramic Coating, anything else
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

    // 2. Update serviceCatalog — only core + boatDetailing
    const catalogItems = await ctx.db.query("serviceCatalog").collect();
    for (const item of catalogItems) {
      if (!REPRICE_CATEGORIES.has(item.category)) {
        continue;
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
