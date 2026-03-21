import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ─── Public queries ───────────────────────────────────────────────────────────

/** List all active catalog items, optionally filtered by category */
export const listActive = query({
  args: { category: v.optional(v.string()) },
  handler: async (ctx, { category }) => {
    let items;
    if (category) {
      items = await ctx.db
        .query("serviceCatalog")
        .withIndex("by_category", (q) => q.eq("category", category as any))
        .collect();
    } else {
      items = await ctx.db.query("serviceCatalog").collect();
    }
    return items
      .filter((i) => i.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

/** Get a single catalog item by ID */
export const get = query({
  args: { id: v.id("serviceCatalog") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

/** Get a catalog item by slug (for deep links from website) */
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return await ctx.db
      .query("serviceCatalog")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
  },
});

/** List all catalog items (admin) */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("serviceCatalog").collect();
    return items.sort((a, b) => {
      const catOrder: Record<string, number> = {
        core: 0,
        paintCorrection: 1,
        ceramicCoating: 2,
        interiorAddon: 3,
        exteriorAddon: 4,
        ceramicAddon: 5,
      };
      const ca = catOrder[a.category] ?? 99;
      const cb = catOrder[b.category] ?? 99;
      return ca - cb || a.sortOrder - b.sortOrder;
    });
  },
});

// ─── Admin mutations ──────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    description: v.string(),
    category: v.union(
      v.literal("core"),
      v.literal("paintCorrection"),
      v.literal("ceramicCoating"),
      v.literal("interiorAddon"),
      v.literal("exteriorAddon"),
      v.literal("ceramicAddon"),
    ),
    variants: v.array(
      v.object({
        label: v.string(),
        price: v.number(),
        durationMin: v.number(),
      }),
    ),
    isActive: v.boolean(),
    sortOrder: v.number(),
    deposit: v.optional(v.number()),
    popular: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => ctx.db.insert("serviceCatalog", args),
});

export const update = mutation({
  args: {
    id: v.id("serviceCatalog"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(
      v.union(
        v.literal("core"),
        v.literal("paintCorrection"),
        v.literal("ceramicCoating"),
        v.literal("interiorAddon"),
        v.literal("exteriorAddon"),
        v.literal("ceramicAddon"),
      ),
    ),
    variants: v.optional(
      v.array(
        v.object({
          label: v.string(),
          price: v.number(),
          durationMin: v.number(),
        }),
      ),
    ),
    isActive: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
    deposit: v.optional(v.number()),
    popular: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, ...updates }) => {
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, val]) => val !== undefined),
    );
    await ctx.db.patch(id, filtered);
  },
});

export const remove = mutation({
  args: { id: v.id("serviceCatalog") },
  handler: async (ctx, { id }) => ctx.db.delete(id),
});

// ─── Seed full ProWorx catalog ────────────────────────────────────────────────

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("serviceCatalog").first();
    if (existing) return "Catalog already seeded";

    const items: Array<{
      name: string;
      slug: string;
      description: string;
      category: "core" | "paintCorrection" | "ceramicCoating" | "interiorAddon" | "exteriorAddon" | "ceramicAddon";
      variants: Array<{ label: string; price: number; durationMin: number }>;
      isActive: boolean;
      sortOrder: number;
      deposit?: number;
      popular?: boolean;
    }> = [
      // ─── CORE SERVICES ──────────────────────────────────────
      {
        name: "Standard Inside & Out",
        slug: "standard-inside-out",
        description: "A full-vehicle refresh combining interior and exterior services into one streamlined appointment.",
        category: "core",
        variants: [
          { label: "Coupe/Sedan", price: 18000, durationMin: 150 },
          { label: "Small SUV / Small Truck", price: 21600, durationMin: 180 },
          { label: "Large SUV (3-row) / Off-Road Truck", price: 25200, durationMin: 210 },
          { label: "Vans", price: 28800, durationMin: 240 },
        ],
        isActive: true,
        sortOrder: 1,
      },
      {
        name: "Standard Interior Only",
        slug: "standard-interior",
        description: "Complete interior detail — vacuum, shampoo, wipe-down, glass, and light stain treatment.",
        category: "core",
        variants: [
          { label: "Coupe/Sedan", price: 12700, durationMin: 105 },
          { label: "Small SUV / Small Truck", price: 14400, durationMin: 120 },
          { label: "3rd Row SUV / Off-Road Truck", price: 18000, durationMin: 150 },
          { label: "Vans", price: 21600, durationMin: 180 },
        ],
        isActive: true,
        sortOrder: 2,
      },
      {
        name: "Standard Exterior Only",
        slug: "standard-exterior",
        description: "Professional exterior refresh — hand wash, wheels, glass, and light spray wax.",
        category: "core",
        variants: [
          { label: "Coupe/Sedan", price: 10300, durationMin: 75 },
          { label: "Small SUV / Small Truck", price: 12400, durationMin: 90 },
          { label: "3rd Row SUV / Off-Road Truck", price: 14400, durationMin: 105 },
          { label: "Vans", price: 16500, durationMin: 120 },
        ],
        isActive: true,
        sortOrder: 3,
      },
      {
        name: "Basic Exterior Maintenance Wash",
        slug: "basic-exterior-wash",
        description: "Quick exterior wash and dry for well-maintained vehicles.",
        category: "core",
        variants: [
          { label: "All Vehicles", price: 7500, durationMin: 45 },
        ],
        isActive: true,
        sortOrder: 4,
      },

      // ─── PAINT CORRECTION ───────────────────────────────────
      {
        name: "Single Stage Paint Correction",
        slug: "single-stage-correction",
        description: "Removes light swirls and minor imperfections. Restores depth and gloss for vehicles in good condition.",
        category: "paintCorrection",
        variants: [
          { label: "Compact 2 Door", price: 55000, durationMin: 360 },
          { label: "Midsize Sedans", price: 70000, durationMin: 480 },
          { label: "SUV/Truck", price: 90000, durationMin: 600 },
        ],
        isActive: true,
        sortOrder: 1,
      },
      {
        name: "Enhancement Polish",
        slug: "enhancement-polish",
        description: "A compounding stage to remove deeper scratches, followed by fine polishing for a mirror-like finish.",
        category: "paintCorrection",
        variants: [
          { label: "Compact 2 Door", price: 100000, durationMin: 600 },
          { label: "Midsize Sedans", price: 120000, durationMin: 720 },
          { label: "SUV/Truck", price: 140000, durationMin: 840 },
        ],
        isActive: true,
        sortOrder: 2,
      },
      {
        name: "Multi-Stage Paint Correction",
        slug: "multi-stage-correction",
        description: "Our most thorough correction — multiple cutting and polishing stages for showroom-quality perfection.",
        category: "paintCorrection",
        variants: [
          { label: "Compact 2 Door", price: 170000, durationMin: 960 },
          { label: "Midsize Sedans", price: 200000, durationMin: 1200 },
          { label: "SUV/Truck", price: 240000, durationMin: 1440 },
        ],
        isActive: true,
        sortOrder: 3,
      },

      // ─── CERAMIC COATING ────────────────────────────────────
      {
        name: "GYEON Q² One EVO (1 Year)",
        slug: "ceramic-1yr",
        description: "Single-layer ceramic coating with 1-year manufacturer warranty. Hydrophobic protection & UV shield.",
        category: "ceramicCoating",
        variants: [
          { label: "Starting Price", price: 49900, durationMin: 180 },
        ],
        isActive: true,
        sortOrder: 1,
        deposit: 15000,
      },
      {
        name: "GYEON Q² Pure EVO (3 Years)",
        slug: "ceramic-3yr",
        description: "Professional ceramic coating with superior chemical & UV resistance. 3-year manufacturer warranty.",
        category: "ceramicCoating",
        variants: [
          { label: "Starting Price", price: 89900, durationMin: 240 },
        ],
        isActive: true,
        sortOrder: 2,
        deposit: 27000,
        popular: true,
      },
      {
        name: "GYEON Q² Flash EVO (10 Years)",
        slug: "ceramic-10yr",
        description: "Top-tier ceramic coating with maximum hardness & self-cleaning hydrophobic effect. 10-year warranty.",
        category: "ceramicCoating",
        variants: [
          { label: "Starting Price", price: 159900, durationMin: 300 },
        ],
        isActive: true,
        sortOrder: 3,
        deposit: 48000,
      },

      // ─── INTERIOR ADD-ONS ──────────────────────────────────
      {
        name: "Pet Hair Removal",
        slug: "pet-hair-removal",
        description: "Thorough removal of pet hair from carpets, seats, and crevices.",
        category: "interiorAddon",
        variants: [{ label: "Standard", price: 8000, durationMin: 60 }],
        isActive: true,
        sortOrder: 1,
      },
      {
        name: "Steam Cleaning (Vents, Plastics, Crevices)",
        slug: "steam-cleaning",
        description: "High-temp steam sanitizes hard-to-reach areas and freshens vents.",
        category: "interiorAddon",
        variants: [{ label: "Standard", price: 6000, durationMin: 30 }],
        isActive: true,
        sortOrder: 2,
      },
      {
        name: "Stain Removal (Targeted)",
        slug: "stain-removal",
        description: "Specialized treatment for stubborn stains on fabric, carpet, or seats.",
        category: "interiorAddon",
        variants: [{ label: "Standard", price: 4500, durationMin: 30 }],
        isActive: true,
        sortOrder: 3,
      },
      {
        name: "Odor/Ozone Treatment",
        slug: "odor-ozone",
        description: "Ozone generator neutralizes odors (smoke, pets, mildew).",
        category: "interiorAddon",
        variants: [{ label: "Standard", price: 4500, durationMin: 30 }],
        isActive: true,
        sortOrder: 4,
      },
      {
        name: "Plastic & Vinyl UV Protection",
        slug: "uv-protection",
        description: "Protects dashboards, door panels, and trim with UV-blocking treatment.",
        category: "interiorAddon",
        variants: [{ label: "Standard", price: 4000, durationMin: 30 }],
        isActive: true,
        sortOrder: 5,
      },
      {
        name: "Leather Deep Clean & Condition",
        slug: "leather-clean",
        description: "Cleans and nourishes leather seats/trim to restore suppleness and prevent cracking.",
        category: "interiorAddon",
        variants: [{ label: "Standard", price: 2500, durationMin: 20 }],
        isActive: true,
        sortOrder: 6,
      },
      {
        name: "Premium Fragrance",
        slug: "premium-fragrance",
        description: "Choose a premium, long-lasting scent for your vehicle.",
        category: "interiorAddon",
        variants: [{ label: "Standard", price: 2000, durationMin: 5 }],
        isActive: true,
        sortOrder: 7,
      },

      // ─── EXTERIOR ADD-ONS ──────────────────────────────────
      {
        name: "Paint Protection",
        slug: "paint-protection",
        description: "Paint protection from short-term to long-term ceramic.",
        category: "exteriorAddon",
        variants: [
          { label: "Carnauba Wax (3 months)", price: 6000, durationMin: 45 },
          { label: "Paint Sealant (6 months)", price: 8000, durationMin: 45 },
          { label: "Ceramic Wax (12 months)", price: 12000, durationMin: 45 },
          { label: "Q² Flash EVO Pro Ceramic (10 years)", price: 125000, durationMin: 180 },
        ],
        isActive: true,
        sortOrder: 1,
      },
      {
        name: "Engine Bay",
        slug: "engine-bay",
        description: "Engine bay cleaning from basic degrease to full detail with dressing.",
        category: "exteriorAddon",
        variants: [
          { label: "Basic Degrease & Rinse", price: 4000, durationMin: 30 },
          { label: "Full Engine Bay Detail (with Dressing)", price: 8000, durationMin: 60 },
        ],
        isActive: true,
        sortOrder: 2,
      },
      {
        name: "Headlight Restoration + UV Sealant",
        slug: "headlight-restoration",
        description: "Removes oxidation and restores clarity with UV sealant protection.",
        category: "exteriorAddon",
        variants: [{ label: "Standard", price: 8000, durationMin: 60 }],
        isActive: true,
        sortOrder: 3,
      },
      {
        name: "Wheel Polishing & Protection",
        slug: "wheel-polishing",
        description: "Polishes away oxidation and applies a sealant/ceramic layer.",
        category: "exteriorAddon",
        variants: [{ label: "Standard", price: 8000, durationMin: 60 }],
        isActive: true,
        sortOrder: 4,
      },
      {
        name: "Trim Restoration",
        slug: "trim-restoration",
        description: "Revives faded plastics with UV protection.",
        category: "exteriorAddon",
        variants: [{ label: "Standard", price: 8000, durationMin: 30 }],
        isActive: true,
        sortOrder: 5,
      },
      {
        name: "Glass Polishing (Spots/Rain/Haze)",
        slug: "glass-polishing",
        description: "Polishes glass to remove water spots, rain marks, and haze.",
        category: "exteriorAddon",
        variants: [{ label: "Standard", price: 8000, durationMin: 30 }],
        isActive: true,
        sortOrder: 6,
      },
      {
        name: "Iron Decontamination (Wheels)",
        slug: "iron-decontamination",
        description: "Chemical treatment to dissolve embedded brake dust and fallout.",
        category: "exteriorAddon",
        variants: [{ label: "Standard", price: 4000, durationMin: 5 }],
        isActive: true,
        sortOrder: 7,
      },
      {
        name: "Clay Bar Treatment",
        slug: "clay-bar",
        description: "Removes bonded contaminants for a smooth, clean finish.",
        category: "exteriorAddon",
        variants: [{ label: "Standard", price: 6000, durationMin: 30 }],
        isActive: true,
        sortOrder: 8,
      },

      // ─── CERAMIC ADD-ONS ───────────────────────────────────
      {
        name: "GYEON View (Windshield Ceramic – 12+ mo)",
        slug: "gyeon-view",
        description: "Long-lasting hydrophobic coating for superior rain visibility.",
        category: "ceramicAddon",
        variants: [{ label: "Standard", price: 12000, durationMin: 90 }],
        isActive: true,
        sortOrder: 1,
      },
      {
        name: "Convertible Top Fabric Protection",
        slug: "convertible-top",
        description: "Hydrophobic treatment for convertible tops.",
        category: "ceramicAddon",
        variants: [{ label: "Standard", price: 10000, durationMin: 30 }],
        isActive: true,
        sortOrder: 2,
      },
      {
        name: "Fabric Protection / Weather Guard",
        slug: "fabric-protection",
        description: "Hydrophobic barrier for seats, carpets, and mats to resist spills.",
        category: "ceramicAddon",
        variants: [{ label: "Standard", price: 8000, durationMin: 10 }],
        isActive: true,
        sortOrder: 3,
      },
      {
        name: "GYEON Leather Shield",
        slug: "gyeon-leather",
        description: "Ceramic coating for leather to resist dye transfer, staining, and UV fading.",
        category: "ceramicAddon",
        variants: [{ label: "Standard", price: 6000, durationMin: 20 }],
        isActive: true,
        sortOrder: 4,
      },
      {
        name: "GYEON Fabric Coat",
        slug: "gyeon-fabric",
        description: "Hydrophobic fabric protection for seats and carpets.",
        category: "ceramicAddon",
        variants: [{ label: "Standard", price: 4000, durationMin: 30 }],
        isActive: true,
        sortOrder: 5,
      },
      {
        name: "Rain Repellent Glass Treatment",
        slug: "rain-repellent",
        description: "Water-beading layer for safer wet driving.",
        category: "ceramicAddon",
        variants: [{ label: "Standard", price: 4000, durationMin: 5 }],
        isActive: true,
        sortOrder: 6,
      },
      {
        name: "Ceramic Tire Dressing",
        slug: "ceramic-tire",
        description: "Long-lasting, deep black finish for tires with UV protection.",
        category: "ceramicAddon",
        variants: [{ label: "Standard", price: 2000, durationMin: 30 }],
        isActive: true,
        sortOrder: 7,
      },
    ];

    for (const item of items) {
      await ctx.db.insert("serviceCatalog", item);
    }

    return `Seeded ${items.length} catalog items`;
  },
});
