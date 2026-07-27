/**
 * Migration: Update boat services to match the website.
 *
 * Replaces:
 *   - "Oxidation Removal & Gelcoat Restoration" → 3 correction tiers
 *     (1-Step Enhancement Polish, 2-Step Correction, Multi-Stage Correction)
 *   - "Boat Ceramic Coating (2-Year)" + "(5-Year)" → single GYEON Q²R GelCoat
 *
 * Run from the Convex dashboard or via:
 *   npx convex run migrations/updateBoatServices:run
 */
import { internalMutation } from "../_generated/server";

export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("serviceCatalog").collect();
    const log: string[] = [];

    // ── 1. Deactivate old boat services ──────────────────────

    const oldSlugs = ["boat-oxidation", "boat-ceramic-2yr", "boat-ceramic-5yr"];
    for (const slug of oldSlugs) {
      const item = all.find((c) => c.slug === slug);
      if (item) {
        await ctx.db.patch(item._id, { isActive: false });
        log.push(`Deactivated: ${item.name} (${slug})`);
      } else {
        log.push(`Not found (skip): ${slug}`);
      }
    }

    // ── 2. Insert new boat correction tiers ──────────────────

    const newItems = [
      {
        name: "Boat 1-Step Enhancement Polish",
        slug: "boat-1step-polish",
        description:
          "Removes light oxidation and restores gloss on well-maintained gelcoat. Ideal for boats that have been regularly waxed and just need a refresh. ~60-70% defect removal.",
        category: "boatDetailing" as const,
        variants: [
          { label: "Up to 20 ft", price: 82400, durationMin: 300 },
          { label: "21–25 ft", price: 92700, durationMin: 360 },
          { label: "26–30 ft", price: 103000, durationMin: 420 },
          { label: "31–35 ft", price: 113300, durationMin: 480 },
        ],
        isActive: true,
        sortOrder: 5,
      },
      {
        name: "Boat 2-Step Correction",
        slug: "boat-2step-correction",
        description:
          "A compounding stage to cut through moderate oxidation and swirl marks, followed by a fine polish to restore a deep, glossy finish on gelcoat and fiberglass. ~85-95% defect removal.",
        category: "boatDetailing" as const,
        variants: [
          { label: "Up to 20 ft", price: 123600, durationMin: 420 },
          { label: "21–25 ft", price: 133900, durationMin: 480 },
          { label: "26–30 ft", price: 144200, durationMin: 540 },
          { label: "31–35 ft", price: 154500, durationMin: 600 },
        ],
        isActive: true,
        sortOrder: 6,
      },
      {
        name: "Boat Multi-Stage Correction",
        slug: "boat-multistage-correction",
        description:
          "Our most thorough gelcoat correction — multiple cutting and polishing stages to remove heavy oxidation, decal residue, deep scratches, and years of neglect. Restores severely weathered boats to like-new. ~95-99% defect removal.",
        category: "boatDetailing" as const,
        variants: [
          { label: "Up to 20 ft", price: 185400, durationMin: 540 },
          { label: "21–25 ft", price: 206000, durationMin: 600 },
          { label: "26–30 ft", price: 226600, durationMin: 720 },
          { label: "31–35 ft", price: 247200, durationMin: 840 },
        ],
        isActive: true,
        sortOrder: 7,
      },
      {
        name: "Boat Ceramic Coating — GYEON Q²R GelCoat",
        slug: "boat-ceramic-gelcoat",
        description:
          "Purpose-built for marine use — GYEON Q²R GelCoat is a ceramic coating engineered specifically for gelcoat's porous surface, not a repurposed automotive product. Long-lasting UV and oxidation protection with a hydrophobic, self-cleaning gloss.",
        category: "boatCeramic" as const,
        variants: [
          { label: "Up to 20 ft", price: 47500, durationMin: 360 },
          { label: "21–25 ft", price: 52500, durationMin: 420 },
          { label: "26–30 ft", price: 57500, durationMin: 480 },
          { label: "31–35 ft", price: 95000, durationMin: 600 },
        ],
        isActive: true,
        sortOrder: 1,
      },
    ];

    for (const item of newItems) {
      // Skip if slug already exists (idempotent)
      const existing = all.find((c) => c.slug === item.slug);
      if (existing) {
        // Update in place if it exists but data may be stale
        await ctx.db.patch(existing._id, { ...item });
        log.push(`Updated existing: ${item.name} (${item.slug})`);
      } else {
        await ctx.db.insert("serviceCatalog", item);
        log.push(`Created: ${item.name} (${item.slug})`);
      }
    }

    return log;
  },
});
