/**
 * Migration: Sync entire booking catalog with proworxdetailing.com pricing.
 *
 * Changes:
 *   1. Core detailing (Standard/Premium/Elite) — updated to website rates
 *   2. Paint Correction — 3 tiers updated to website prices
 *   3. Ceramic Coating — deactivate Flash EVO 10yr, add Infinite Type 1 & Type 1+2
 *   4. Boat Detailing base services — updated to website rates
 *   5. Boat Correction tiers — add 1-Step, 2-Step, Multi-Stage (replace Oxidation)
 *   6. Boat Ceramic — add GYEON Q²R GelCoat (replace 2yr/5yr)
 *   7. Add-ons — Convertible Top $60→$100, add Can Coat Pro EVO spray ceramic
 *
 * Run from CLI:
 *   npx convex run migrations/updateBoatServices:run
 *
 * Idempotent — safe to run multiple times.
 */
import { internalMutation } from "../_generated/server";

type Category =
  | "core"
  | "paintCorrection"
  | "ceramicCoating"
  | "interiorAddon"
  | "exteriorAddon"
  | "ceramicAddon"
  | "boatDetailing"
  | "boatCeramic"
  | "boatAddon"
  | "membership";

interface ServiceUpdate {
  slug: string;
  name: string;
  description: string;
  category: Category;
  variants: Array<{ label: string; price: number; durationMin: number }>;
  isActive: boolean;
  sortOrder: number;
  deposit?: number;
  popular?: boolean;
}

export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    const log: string[] = [];

    // Helper: upsert by slug
    async function upsert(item: ServiceUpdate) {
      const existing = await ctx.db
        .query("serviceCatalog")
        .withIndex("by_slug", (q) => q.eq("slug", item.slug))
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, { ...item });
        log.push(`Updated: ${item.name} (${item.slug})`);
      } else {
        await ctx.db.insert("serviceCatalog", item);
        log.push(`Created: ${item.name} (${item.slug})`);
      }
    }

    // Helper: deactivate by slug
    async function deactivate(slug: string) {
      const item = await ctx.db
        .query("serviceCatalog")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();
      if (item) {
        await ctx.db.patch(item._id, { isActive: false });
        log.push(`Deactivated: ${item.name} (${slug})`);
      } else {
        log.push(`Not found (skip deactivate): ${slug}`);
      }
    }

    // ═══════════════════════════════════════════════════════════
    // 1. CORE DETAILING — match website pricing
    // ═══════════════════════════════════════════════════════════

    // ── Inside & Out (4 tiers) ──
    await upsert({
      slug: "standard-inside-out",
      name: "Standard Inside & Out",
      description: "A full-vehicle refresh — interior and exterior in one appointment. Includes: full vacuum, carpet & upholstery shampoo, dashboard & console wipe-down, interior glass, door jambs, hand wash, wheel & tire cleaning, exterior glass, light spray wax, and tire shine.",
      category: "core",
      variants: [
        { label: "Coupe/Sedan", price: 25800, durationMin: 150 },
        { label: "Small SUV / Small Truck", price: 31000, durationMin: 180 },
        { label: "Large SUV (3-row) / Off-Road Truck", price: 36100, durationMin: 210 },
        { label: "Vans", price: 41300, durationMin: 240 },
      ],
      isActive: true,
      sortOrder: 1,
    });

    await upsert({
      slug: "premium-inside-out-interior",
      name: "Premium Inside & Out — Interior Focus",
      description: "Standard Inside & Out plus interior-focused add-ons at 10% off: Leather Deep Clean & Conditioning, Steam Cleaning, Premium Fragrance, and UV Protection.",
      category: "core",
      variants: [
        { label: "Coupe/Sedan", price: 38900, durationMin: 210 },
        { label: "Small SUV / Small Truck", price: 44100, durationMin: 240 },
        { label: "Large SUV (3-row) / Off-Road Truck", price: 49200, durationMin: 270 },
        { label: "Vans", price: 54400, durationMin: 300 },
      ],
      isActive: true,
      sortOrder: 2,
      popular: true,
    });

    await upsert({
      slug: "premium-inside-out-exterior",
      name: "Premium Inside & Out — Exterior Focus",
      description: "Standard Inside & Out plus exterior-focused add-ons at 10% off: Clay Bar Treatment, Iron Decontamination, 6-Month Paint Sealant, and Trim Restoration.",
      category: "core",
      variants: [
        { label: "Coupe/Sedan", price: 52800, durationMin: 210 },
        { label: "Small SUV / Small Truck", price: 58000, durationMin: 240 },
        { label: "Large SUV (3-row) / Off-Road Truck", price: 63100, durationMin: 270 },
        { label: "Vans", price: 68300, durationMin: 300 },
      ],
      isActive: true,
      sortOrder: 3,
      popular: true,
    });

    await upsert({
      slug: "elite-inside-out",
      name: "Elite Inside & Out — Ceramic",
      description: "The ultimate package — Standard base plus all add-ons at 15% off with ceramic upgrades: Steam Cleaning, Premium Fragrance, Clay Bar Treatment, Iron Decontamination, Fabric Protection, GYEON Leather Shield, Ceramic Tire Dressing, Plastic & Trim Ceramic, and 12-Month Ceramic Wax.",
      category: "core",
      variants: [
        { label: "Coupe/Sedan", price: 75100, durationMin: 330 },
        { label: "Small SUV / Small Truck", price: 80300, durationMin: 360 },
        { label: "Large SUV (3-row) / Off-Road Truck", price: 85400, durationMin: 390 },
        { label: "Vans", price: 90600, durationMin: 420 },
      ],
      isActive: true,
      sortOrder: 4,
    });

    // ── Interior Only (3 tiers) ──
    await upsert({
      slug: "standard-interior-only",
      name: "Standard Interior Only",
      description: "Complete interior detail. Includes: thorough vacuum of all surfaces, carpet & upholstery shampoo, dashboard & console wipe-down, cup holders & crevices, interior glass cleaning, door panels & jambs, and light stain treatment.",
      category: "core",
      variants: [
        { label: "Coupe/Sedan", price: 18100, durationMin: 105 },
        { label: "Small SUV / Small Truck", price: 20700, durationMin: 120 },
        { label: "3rd Row SUV / Off-Road Truck", price: 25800, durationMin: 150 },
        { label: "Vans", price: 31000, durationMin: 180 },
      ],
      isActive: true,
      sortOrder: 5,
    });

    await upsert({
      slug: "premium-interior-only",
      name: "Premium Interior Only",
      description: "Standard Interior plus bundled premium add-ons at 10% off: Leather Deep Clean & Conditioning, Steam Cleaning of vents and crevices, Premium Fragrance, and UV Protection for dashboard and plastics.",
      category: "core",
      variants: [
        { label: "Coupe/Sedan", price: 31200, durationMin: 165 },
        { label: "Small SUV / Small Truck", price: 33800, durationMin: 180 },
        { label: "3rd Row SUV / Off-Road Truck", price: 38900, durationMin: 210 },
        { label: "Vans", price: 44100, durationMin: 240 },
      ],
      isActive: true,
      sortOrder: 6,
      popular: true,
    });

    await upsert({
      slug: "elite-interior-only",
      name: "Elite Interior Only — Ceramic",
      description: "Standard Interior plus ceramic add-ons at 15% off: Steam Cleaning, Premium Fragrance, Fabric Protection / Weather Guard, and GYEON Leather Shield.",
      category: "core",
      variants: [
        { label: "Coupe/Sedan", price: 36800, durationMin: 210 },
        { label: "Small SUV / Small Truck", price: 39400, durationMin: 225 },
        { label: "3rd Row SUV / Off-Road Truck", price: 44500, durationMin: 255 },
        { label: "Vans", price: 49700, durationMin: 285 },
      ],
      isActive: true,
      sortOrder: 7,
    });

    // ── Exterior Only (3 tiers) ──
    await upsert({
      slug: "standard-exterior-only",
      name: "Standard Exterior Only",
      description: "Professional exterior refresh. Includes: full hand wash, wheel & tire cleaning, tire shine, exterior glass cleaning, door jambs, and a light spray wax for protection and shine.",
      category: "core",
      variants: [
        { label: "Coupe/Sedan", price: 13000, durationMin: 75 },
        { label: "Small SUV / Small Truck", price: 15500, durationMin: 90 },
        { label: "3rd Row SUV / Off-Road Truck", price: 18100, durationMin: 105 },
        { label: "Vans", price: 20700, durationMin: 120 },
      ],
      isActive: true,
      sortOrder: 8,
    });

    await upsert({
      slug: "premium-exterior-only",
      name: "Premium Exterior Only",
      description: "Standard Exterior plus bundled premium add-ons at 10% off: Clay Bar Treatment for smooth paint, Iron Decontamination, 6-Month Paint Sealant, and Trim Restoration to revive faded plastics.",
      category: "core",
      variants: [
        { label: "Coupe/Sedan", price: 40000, durationMin: 150 },
        { label: "Small SUV / Small Truck", price: 42500, durationMin: 165 },
        { label: "3rd Row SUV / Off-Road Truck", price: 45100, durationMin: 180 },
        { label: "Vans", price: 47700, durationMin: 195 },
      ],
      isActive: true,
      sortOrder: 9,
      popular: true,
    });

    await upsert({
      slug: "elite-exterior-only",
      name: "Elite Exterior Only — Ceramic",
      description: "Standard Exterior plus ceramic add-ons at 15% off: Clay Bar, Iron Decontamination, Ceramic Tire Dressing, Plastic & Trim Ceramic, and 12-Month Ceramic Wax for ultimate exterior protection.",
      category: "core",
      variants: [
        { label: "Coupe/Sedan", price: 43600, durationMin: 195 },
        { label: "Small SUV / Small Truck", price: 46100, durationMin: 210 },
        { label: "3rd Row SUV / Off-Road Truck", price: 48700, durationMin: 225 },
        { label: "Vans", price: 51300, durationMin: 240 },
      ],
      isActive: true,
      sortOrder: 10,
    });

    // ═══════════════════════════════════════════════════════════
    // 2. PAINT CORRECTION — match website pricing
    // ═══════════════════════════════════════════════════════════

    await upsert({
      slug: "single-stage-correction",
      name: "Single Stage Paint Correction",
      description: "Removes light swirls and minor imperfections. Restores depth and gloss for vehicles in good condition.",
      category: "paintCorrection",
      variants: [
        { label: "Compact 2 Door", price: 57000, durationMin: 360 },
        { label: "Midsize Sedans", price: 76000, durationMin: 480 },
        { label: "SUV/Truck", price: 95000, durationMin: 600 },
      ],
      isActive: true,
      sortOrder: 1,
    });

    await upsert({
      slug: "enhancement-polish",
      name: "Enhancement Polish",
      description: "A compounding stage to remove deeper scratches, followed by fine polishing for a mirror-like finish.",
      category: "paintCorrection",
      variants: [
        { label: "Compact 2 Door", price: 95000, durationMin: 600 },
        { label: "Midsize Sedans", price: 114000, durationMin: 720 },
        { label: "SUV/Truck", price: 133000, durationMin: 840 },
      ],
      isActive: true,
      sortOrder: 2,
    });

    await upsert({
      slug: "multi-stage-correction",
      name: "Multi-Stage Paint Correction",
      description: "Our most thorough correction — multiple cutting and polishing stages for showroom-quality perfection.",
      category: "paintCorrection",
      variants: [
        { label: "Compact 2 Door", price: 156700, durationMin: 960 },
        { label: "Midsize Sedans", price: 190000, durationMin: 1200 },
        { label: "SUV/Truck", price: 228000, durationMin: 1440 },
      ],
      isActive: true,
      sortOrder: 3,
    });

    // ═══════════════════════════════════════════════════════════
    // 3. CERAMIC COATING — add Infinite tiers, deactivate Flash 10yr
    // ═══════════════════════════════════════════════════════════

    await upsert({
      slug: "ceramic-infinite-1",
      name: "GYEON Infinite Type 1 (Lifetime)",
      description: "GYEON Infinite Base Type 1 — fluoro-modified polysilazane ceramic coating with extreme chemical resistance, self-cleaning effect, and superior UV protection. Lifetime GYEON Infinite Warranty with biennial maintenance inspection.",
      category: "ceramicCoating",
      variants: [
        { label: "Starting Price", price: 179900, durationMin: 360 },
      ],
      isActive: true,
      sortOrder: 3,
      deposit: 54000,
    });

    await upsert({
      slug: "ceramic-infinite-12",
      name: "GYEON Infinite Type 1 + 2 (Ultimate Lifetime)",
      description: "GYEON Infinite Base Type 1 + Type 2 TopCoat — dual-layer ceramic coating for maximum gloss, depth, color enhancement, and extreme watermark resistance. Best scratch resistance available. Lifetime GYEON Infinite Warranty with biennial maintenance inspection.",
      category: "ceramicCoating",
      variants: [
        { label: "Starting Price", price: 219900, durationMin: 420 },
      ],
      isActive: true,
      sortOrder: 4,
      deposit: 66000,
    });

    // Deactivate Flash EVO 10yr (replaced by Infinite tiers)
    await deactivate("ceramic-10yr");

    // ═══════════════════════════════════════════════════════════
    // 4. BOAT DETAILING — update base services to website pricing
    // ═══════════════════════════════════════════════════════════

    await upsert({
      slug: "boat-basic-wash",
      name: "Basic Boat Wash",
      description: "Exterior hand wash, rinse and dry, basic interior wipe-down, glass cleaned, trailer rinse.",
      category: "boatDetailing",
      variants: [
        { label: "Up to 20 ft", price: 20600, durationMin: 120 },
        { label: "21–25 ft", price: 25800, durationMin: 150 },
        { label: "26–30 ft", price: 30900, durationMin: 180 },
        { label: "31–35 ft", price: 36100, durationMin: 210 },
      ],
      isActive: true,
      sortOrder: 1,
    });

    await upsert({
      slug: "boat-interior",
      name: "Interior Boat Detail",
      description: "Deep clean all vinyl seats & bolsters, compartments, bilge, carpet/non-skid scrub, glass surfaces, and UV protectant applied.",
      category: "boatDetailing",
      variants: [
        { label: "Up to 20 ft", price: 30900, durationMin: 180 },
        { label: "21–25 ft", price: 41200, durationMin: 240 },
        { label: "26–30 ft", price: 51500, durationMin: 300 },
        { label: "31–35 ft", price: 61800, durationMin: 360 },
      ],
      isActive: true,
      sortOrder: 2,
    });

    await upsert({
      slug: "boat-exterior-wax",
      name: "Exterior Boat Detail + Wax",
      description: "Full exterior hand wash, machine compound & polish gelcoat, apply polymer sealant/wax, metal & brightwork polish, glass cleaned.",
      category: "boatDetailing",
      variants: [
        { label: "Up to 20 ft", price: 41200, durationMin: 240 },
        { label: "21–25 ft", price: 51500, durationMin: 300 },
        { label: "26–30 ft", price: 61800, durationMin: 360 },
        { label: "31–35 ft", price: 72100, durationMin: 420 },
      ],
      isActive: true,
      sortOrder: 3,
    });

    await upsert({
      slug: "boat-full-detail",
      name: "Full Boat Detail (Inside & Out)",
      description: "The works — complete interior deep clean + full exterior compound, polish, and sealant. Brightwork, glass, trailer included.",
      category: "boatDetailing",
      variants: [
        { label: "Up to 20 ft", price: 61800, durationMin: 360 },
        { label: "21–25 ft", price: 72100, durationMin: 420 },
        { label: "26–30 ft", price: 82400, durationMin: 480 },
        { label: "31–35 ft", price: 92700, durationMin: 540 },
      ],
      isActive: true,
      sortOrder: 4,
      popular: true,
    });

    // ═══════════════════════════════════════════════════════════
    // 5. BOAT CORRECTION — new 3-tier structure (replaces Oxidation)
    // ═══════════════════════════════════════════════════════════

    await upsert({
      slug: "boat-1step-polish",
      name: "Boat 1-Step Enhancement Polish",
      description: "Removes light oxidation and restores gloss on well-maintained gelcoat. Ideal for boats that have been regularly waxed and just need a refresh. ~60-70% defect removal.",
      category: "boatDetailing",
      variants: [
        { label: "Up to 20 ft", price: 82400, durationMin: 300 },
        { label: "21–25 ft", price: 92700, durationMin: 360 },
        { label: "26–30 ft", price: 103000, durationMin: 420 },
        { label: "31–35 ft", price: 113300, durationMin: 480 },
      ],
      isActive: true,
      sortOrder: 5,
    });

    await upsert({
      slug: "boat-2step-correction",
      name: "Boat 2-Step Correction",
      description: "A compounding stage to cut through moderate oxidation and swirl marks, followed by a fine polish to restore a deep, glossy finish on gelcoat and fiberglass. ~85-95% defect removal.",
      category: "boatDetailing",
      variants: [
        { label: "Up to 20 ft", price: 123600, durationMin: 420 },
        { label: "21–25 ft", price: 133900, durationMin: 480 },
        { label: "26–30 ft", price: 144200, durationMin: 540 },
        { label: "31–35 ft", price: 154500, durationMin: 600 },
      ],
      isActive: true,
      sortOrder: 6,
    });

    await upsert({
      slug: "boat-multistage-correction",
      name: "Boat Multi-Stage Correction",
      description: "Our most thorough gelcoat correction — multiple cutting and polishing stages to remove heavy oxidation, decal residue, deep scratches, and years of neglect. Restores severely weathered boats to like-new. ~95-99% defect removal.",
      category: "boatDetailing",
      variants: [
        { label: "Up to 20 ft", price: 185400, durationMin: 540 },
        { label: "21–25 ft", price: 206000, durationMin: 600 },
        { label: "26–30 ft", price: 226600, durationMin: 720 },
        { label: "31–35 ft", price: 247200, durationMin: 840 },
      ],
      isActive: true,
      sortOrder: 7,
    });

    // Deactivate old Oxidation Removal
    await deactivate("boat-oxidation");

    // ═══════════════════════════════════════════════════════════
    // 6. BOAT CERAMIC — GYEON Q²R GelCoat (replaces 2yr/5yr)
    // ═══════════════════════════════════════════════════════════

    await upsert({
      slug: "boat-ceramic-gelcoat",
      name: "Boat Ceramic Coating — GYEON Q²R GelCoat",
      description: "Purpose-built for marine use — GYEON Q²R GelCoat is a ceramic coating engineered specifically for gelcoat's porous surface, not a repurposed automotive product. Long-lasting UV and oxidation protection with a hydrophobic, self-cleaning gloss.",
      category: "boatCeramic",
      variants: [
        { label: "Up to 20 ft", price: 47500, durationMin: 360 },
        { label: "21–25 ft", price: 52500, durationMin: 420 },
        { label: "26–30 ft", price: 57500, durationMin: 480 },
        { label: "31–35 ft", price: 95000, durationMin: 600 },
      ],
      isActive: true,
      sortOrder: 1,
    });

    // Deactivate old 2yr/5yr ceramic
    await deactivate("boat-ceramic-2yr");
    await deactivate("boat-ceramic-5yr");

    // ═══════════════════════════════════════════════════════════
    // 7. ADD-ONS — fix Convertible Top + add Can Coat spray ceramic
    // ═══════════════════════════════════════════════════════════

    // Fix Convertible Top price: $60 → $100
    const convTop = await ctx.db
      .query("serviceCatalog")
      .withIndex("by_slug", (q) => q.eq("slug", "convertible-top"))
      .first();
    if (convTop) {
      await ctx.db.patch(convTop._id, {
        variants: [{ label: "Standard", price: 10000, durationMin: 30 }],
      });
      log.push("Updated: Convertible Top Fabric Protection $60 → $100");
    }

    // Add GYEON Can Coat Pro EVO spray ceramic (on website, not in catalog)
    await upsert({
      slug: "can-coat-pro-evo",
      name: "GYEON Can Coat Pro EVO — Spray Ceramic (12–18 mo)",
      description: "Professional spray ceramic coating for quick, durable protection. Add to any detail service for enhanced gloss, hydrophobic effect, and UV resistance.",
      category: "ceramicAddon",
      variants: [{ label: "Standard", price: 14900, durationMin: 20 }],
      isActive: true,
      sortOrder: 11,
    });

    return log;
  },
});
