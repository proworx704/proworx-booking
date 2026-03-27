import { mutation } from "./_generated/server";

/**
 * One-time migration: Add Premium/Elite tiers + Hot Water Extraction add-on.
 * Run with: bunx convex run migrateAddTiers:run
 * Then delete this file.
 */
export const run = mutation({
  args: {},
  handler: async (ctx) => {
    const results: string[] = [];

    // ── 1. Re-order existing core items to make room for tiers ────────────
    const allCore = await ctx.db
      .query("serviceCatalog")
      .withIndex("by_category", (q) => q.eq("category", "core"))
      .collect();

    const reorderMap: Record<string, number> = {
      "standard-inside-out": 10,
      "standard-interior-only": 20,
      "standard-exterior-only": 30,
      "basic-exterior-wash": 40,
    };

    for (const item of allCore) {
      const newOrder = reorderMap[item.slug];
      if (newOrder !== undefined && item.sortOrder !== newOrder) {
        await ctx.db.patch(item._id, { sortOrder: newOrder });
        results.push(`Reordered ${item.slug} → ${newOrder}`);
      }
    }

    // ── 2. Check for existing items to avoid duplicates ──────────────────
    const allItems = await ctx.db.query("serviceCatalog").collect();
    const existingSlugs = new Set(allItems.map((i) => i.slug));

    const newItems: Array<{
      name: string;
      slug: string;
      description: string;
      category: "core" | "interiorAddon";
      variants: Array<{ label: string; price: number; durationMin: number }>;
      isActive: boolean;
      sortOrder: number;
      popular?: boolean;
    }> = [
      // ── Premium Inside & Out ─────────────────────────────────
      {
        name: "Premium Inside & Out",
        slug: "premium-inside-out",
        description:
          "Everything in our Standard detail PLUS leather conditioning, steam cleaning, 6-month paint sealant, interior UV protection, and premium air freshener.",
        category: "core",
        variants: [
          { label: "Coupe/Sedan", price: 28500, durationMin: 240 },
          { label: "Small SUV / Small Truck", price: 33500, durationMin: 270 },
          {
            label: "Large SUV (3-row) / Off-Road Truck",
            price: 38500,
            durationMin: 300,
          },
          { label: "Vans", price: 43500, durationMin: 330 },
        ],
        isActive: true,
        sortOrder: 11,
        popular: true,
      },

      // ── Elite Inside & Out ───────────────────────────────────
      {
        name: "Elite Inside & Out",
        slug: "elite-inside-out",
        description:
          "The ultimate detail — everything in Premium PLUS clay bar decontamination, iron decontamination, 12-month ceramic wax, and exterior trim protectant.",
        category: "core",
        variants: [
          { label: "Coupe/Sedan", price: 39900, durationMin: 300 },
          { label: "Small SUV / Small Truck", price: 46500, durationMin: 330 },
          {
            label: "Large SUV (3-row) / Off-Road Truck",
            price: 53500,
            durationMin: 360,
          },
          { label: "Vans", price: 59900, durationMin: 390 },
        ],
        isActive: true,
        sortOrder: 12,
      },

      // ── Premium Interior Only ────────────────────────────────
      {
        name: "Premium Interior Only",
        slug: "premium-interior-only",
        description:
          "Standard interior detail PLUS leather deep clean & conditioning, steam cleaning, interior UV protection, and premium air freshener.",
        category: "core",
        variants: [
          { label: "Coupe/Sedan", price: 21000, durationMin: 175 },
          { label: "Small SUV / Small Truck", price: 24500, durationMin: 195 },
          {
            label: "3rd Row SUV / Off-Road Truck",
            price: 29000,
            durationMin: 225,
          },
          { label: "Vans", price: 33500, durationMin: 255 },
        ],
        isActive: true,
        sortOrder: 21,
      },

      // ── Premium Exterior Only ────────────────────────────────
      {
        name: "Premium Exterior Only",
        slug: "premium-exterior-only",
        description:
          "Standard exterior PLUS clay bar decontamination, iron decontamination, 6-month paint sealant, and exterior trim protectant.",
        category: "core",
        variants: [
          { label: "Coupe/Sedan", price: 17500, durationMin: 145 },
          { label: "Small SUV / Small Truck", price: 20500, durationMin: 160 },
          {
            label: "3rd Row SUV / Off-Road Truck",
            price: 24000,
            durationMin: 180,
          },
          { label: "Vans", price: 27500, durationMin: 195 },
        ],
        isActive: true,
        sortOrder: 31,
      },

      // ── Elite Exterior Only ──────────────────────────────────
      {
        name: "Elite Exterior Only",
        slug: "elite-exterior-only",
        description:
          "Premium exterior with 12-month ceramic wax upgrade for maximum long-term paint protection.",
        category: "core",
        variants: [
          { label: "Coupe/Sedan", price: 22500, durationMin: 165 },
          { label: "Small SUV / Small Truck", price: 26500, durationMin: 180 },
          {
            label: "3rd Row SUV / Off-Road Truck",
            price: 30500,
            durationMin: 200,
          },
          { label: "Vans", price: 34500, durationMin: 215 },
        ],
        isActive: true,
        sortOrder: 32,
      },

      // ── Hot Water Extraction / Shampoo (Interior Add-On) ────
      {
        name: "Hot Water Extraction / Shampoo",
        slug: "hot-water-extraction",
        description:
          "Deep hot water extraction cleaning for all seats and carpeted areas. Goes beyond standard shampooing for a thorough deep clean.",
        category: "interiorAddon",
        variants: [{ label: "Standard", price: 10000, durationMin: 75 }],
        isActive: true,
        sortOrder: 0, // top of interior add-ons
      },
    ];

    for (const item of newItems) {
      if (existingSlugs.has(item.slug)) {
        results.push(`SKIP (already exists): ${item.slug}`);
        continue;
      }
      await ctx.db.insert("serviceCatalog", item);
      results.push(`ADDED: ${item.name} (${item.slug})`);
    }

    return results;
  },
});
