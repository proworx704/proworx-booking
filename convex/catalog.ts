import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { requireAdmin } from "./authHelpers";

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
    await requireAdmin(ctx);
    const items = await ctx.db.query("serviceCatalog").collect();
    return items.sort((a, b) => {
      const catOrder: Record<string, number> = {
        core: 0,
        paintCorrection: 1,
        ceramicCoating: 2,
        interiorAddon: 3,
        exteriorAddon: 4,
        ceramicAddon: 5,
        boatDetailing: 6,
        boatCeramic: 7,
        boatAddon: 8,
        membership: 9,
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
      v.literal("boatDetailing"),
      v.literal("boatCeramic"),
      v.literal("boatAddon"),
      v.literal("membership"),
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
      v.literal("boatDetailing"),
      v.literal("boatCeramic"),
      v.literal("boatAddon"),
      v.literal("membership"),
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
    features: v.optional(v.array(v.string())),
    subscriptionUrl: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...updates }) => {
    await requireAdmin(ctx);
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
    await requireAdmin(ctx);
    const existing = await ctx.db.query("serviceCatalog").first();
    if (existing) return "Catalog already seeded";

    const items: Array<{
      name: string;
      slug: string;
      description: string;
      category: "core" | "paintCorrection" | "ceramicCoating" | "interiorAddon" | "exteriorAddon" | "ceramicAddon" | "boatDetailing" | "boatCeramic" | "boatAddon" | "membership";
      variants: Array<{ label: string; price: number; durationMin: number }>;
      isActive: boolean;
      sortOrder: number;
      deposit?: number;
      popular?: boolean;
    }> = [
      // ─── CORE SERVICES ──────────────────────────────────────
      // ── Inside & Out (4 tiers) ──
      {
        name: "Standard Inside & Out",
        slug: "standard-inside-out",
        description: "A full-vehicle refresh — interior and exterior in one appointment. Includes: full vacuum, carpet & upholstery shampoo, dashboard & console wipe-down, interior glass, door jambs, hand wash, wheel & tire cleaning, exterior glass, light spray wax, and tire shine.",
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
        name: "Premium Inside & Out — Interior Focus",
        slug: "premium-inside-out-interior",
        description: "Standard Inside & Out plus interior-focused add-ons at 10% off: Leather Deep Clean & Conditioning, Steam Cleaning, Premium Fragrance, and UV Protection.",
        category: "core",
        variants: [
          { label: "Coupe/Sedan", price: 31100, durationMin: 210 },
          { label: "Small SUV / Small Truck", price: 34700, durationMin: 240 },
          { label: "Large SUV (3-row) / Off-Road Truck", price: 38300, durationMin: 270 },
          { label: "Vans", price: 41900, durationMin: 300 },
        ],
        isActive: true,
        sortOrder: 2,
        popular: true,
      },
      {
        name: "Premium Inside & Out — Exterior Focus",
        slug: "premium-inside-out-exterior",
        description: "Standard Inside & Out plus exterior-focused add-ons at 10% off: Clay Bar Treatment, Iron Decontamination, 6-Month Paint Sealant, and Trim Restoration.",
        category: "core",
        variants: [
          { label: "Coupe/Sedan", price: 45000, durationMin: 210 },
          { label: "Small SUV / Small Truck", price: 48600, durationMin: 240 },
          { label: "Large SUV (3-row) / Off-Road Truck", price: 52200, durationMin: 270 },
          { label: "Vans", price: 55800, durationMin: 300 },
        ],
        isActive: true,
        sortOrder: 3,
        popular: true,
      },
      {
        name: "Elite Inside & Out — Ceramic",
        slug: "elite-inside-out",
        description: "The ultimate package — Standard base plus all add-ons at 15% off with ceramic upgrades: Steam Cleaning, Premium Fragrance, Clay Bar Treatment, Iron Decontamination, Fabric Protection, GYEON Leather Shield, Ceramic Tire Dressing, Plastic & Trim Ceramic, and 12-Month Ceramic Wax.",
        category: "core",
        variants: [
          { label: "Coupe/Sedan", price: 67300, durationMin: 330 },
          { label: "Small SUV / Small Truck", price: 70900, durationMin: 360 },
          { label: "Large SUV (3-row) / Off-Road Truck", price: 74500, durationMin: 390 },
          { label: "Vans", price: 78100, durationMin: 420 },
        ],
        isActive: true,
        sortOrder: 4,
      },
      // ── Interior Only (3 tiers) ──
      {
        name: "Standard Interior Only",
        slug: "standard-interior-only",
        description: "Complete interior detail. Includes: thorough vacuum of all surfaces, carpet & upholstery shampoo, dashboard & console wipe-down, cup holders & crevices, interior glass cleaning, door panels & jambs, and light stain treatment.",
        category: "core",
        variants: [
          { label: "Coupe/Sedan", price: 12700, durationMin: 105 },
          { label: "Small SUV / Small Truck", price: 14400, durationMin: 120 },
          { label: "3rd Row SUV / Off-Road Truck", price: 18000, durationMin: 150 },
          { label: "Vans", price: 21600, durationMin: 180 },
        ],
        isActive: true,
        sortOrder: 5,
      },
      {
        name: "Premium Interior Only",
        slug: "premium-interior-only",
        description: "Standard Interior plus bundled premium add-ons at 10% off: Leather Deep Clean & Conditioning, Steam Cleaning of vents and crevices, Premium Fragrance, and UV Protection for dashboard and plastics.",
        category: "core",
        variants: [
          { label: "Coupe/Sedan", price: 25800, durationMin: 165 },
          { label: "Small SUV / Small Truck", price: 27500, durationMin: 180 },
          { label: "3rd Row SUV / Off-Road Truck", price: 31100, durationMin: 210 },
          { label: "Vans", price: 34700, durationMin: 240 },
        ],
        isActive: true,
        sortOrder: 6,
        popular: true,
      },
      {
        name: "Elite Interior Only — Ceramic",
        slug: "elite-interior-only",
        description: "Standard Interior plus ceramic add-ons at 15% off: Steam Cleaning, Premium Fragrance, Fabric Protection / Weather Guard, and GYEON Leather Shield.",
        category: "core",
        variants: [
          { label: "Coupe/Sedan", price: 31400, durationMin: 210 },
          { label: "Small SUV / Small Truck", price: 33100, durationMin: 225 },
          { label: "3rd Row SUV / Off-Road Truck", price: 36700, durationMin: 255 },
          { label: "Vans", price: 40300, durationMin: 285 },
        ],
        isActive: true,
        sortOrder: 7,
      },
      // ── Exterior Only (3 tiers) ──
      {
        name: "Standard Exterior Only",
        slug: "standard-exterior-only",
        description: "Professional exterior refresh. Includes: full hand wash, wheel & tire cleaning, tire shine, exterior glass cleaning, door jambs, and a light spray wax for protection and shine.",
        category: "core",
        variants: [
          { label: "Coupe/Sedan", price: 10300, durationMin: 75 },
          { label: "Small SUV / Small Truck", price: 12400, durationMin: 90 },
          { label: "3rd Row SUV / Off-Road Truck", price: 14400, durationMin: 105 },
          { label: "Vans", price: 16500, durationMin: 120 },
        ],
        isActive: true,
        sortOrder: 8,
      },
      {
        name: "Premium Exterior Only",
        slug: "premium-exterior-only",
        description: "Standard Exterior plus bundled premium add-ons at 10% off: Clay Bar Treatment for smooth paint, Iron Decontamination, 6-Month Paint Sealant, and Trim Restoration to revive faded plastics.",
        category: "core",
        variants: [
          { label: "Coupe/Sedan", price: 37300, durationMin: 150 },
          { label: "Small SUV / Small Truck", price: 39400, durationMin: 165 },
          { label: "3rd Row SUV / Off-Road Truck", price: 41400, durationMin: 180 },
          { label: "Vans", price: 43500, durationMin: 195 },
        ],
        isActive: true,
        sortOrder: 9,
        popular: true,
      },
      {
        name: "Elite Exterior Only — Ceramic",
        slug: "elite-exterior-only",
        description: "Standard Exterior plus ceramic add-ons at 15% off: Clay Bar, Iron Decontamination, Ceramic Tire Dressing, Plastic & Trim Ceramic, and 12-Month Ceramic Wax for ultimate exterior protection.",
        category: "core",
        variants: [
          { label: "Coupe/Sedan", price: 40900, durationMin: 195 },
          { label: "Small SUV / Small Truck", price: 43000, durationMin: 210 },
          { label: "3rd Row SUV / Off-Road Truck", price: 45000, durationMin: 225 },
          { label: "Vans", price: 47100, durationMin: 240 },
        ],
        isActive: true,
        sortOrder: 10,
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
        sortOrder: 9,
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
        variants: [{ label: "Standard", price: 10000, durationMin: 30 }],
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
        variants: [{ label: "Standard", price: 6000, durationMin: 30 }],
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
      {
        name: "Wheel Ceramic Coating",
        slug: "wheel-ceramic",
        description: "Ceramic coating for wheels — protects against brake dust, road grime, and UV. Choose faces only or full removal for calipers.",
        category: "ceramicAddon",
        variants: [
          { label: "Faces Only", price: 20000, durationMin: 120 },
          { label: "Complete Wheels Off + Calipers", price: 40000, durationMin: 240 },
        ],
        isActive: true,
        sortOrder: 8,
      },
      {
        name: "Plastic & Trim Ceramic",
        slug: "plastic-ceramic",
        description: "Ceramic coating for exterior plastics and trim — restores deep black finish with long-lasting UV protection.",
        category: "ceramicAddon",
        variants: [{ label: "Standard", price: 10000, durationMin: 60 }],
        isActive: true,
        sortOrder: 9,
      },
      {
        name: "Iron Decontamination",
        slug: "iron-decon-ceramic",
        description: "Chemical iron fallout removal — essential pre-coating prep to dissolve embedded brake dust and industrial fallout.",
        category: "ceramicAddon",
        variants: [{ label: "Standard", price: 4000, durationMin: 30 }],
        isActive: true,
        sortOrder: 10,
      },

      // ─── BOAT DETAILING ────────────────────────────────────
      {
        name: "Basic Boat Wash",
        slug: "boat-basic-wash",
        description: "Exterior hand wash, rinse and dry, basic interior wipe-down, glass cleaned, trailer rinse.",
        category: "boatDetailing",
        variants: [
          { label: "Up to 20 ft", price: 25000, durationMin: 120 },
          { label: "21–25 ft", price: 32500, durationMin: 150 },
          { label: "26–30 ft", price: 40000, durationMin: 180 },
          { label: "31–35 ft", price: 50000, durationMin: 210 },
        ],
        isActive: true,
        sortOrder: 1,
      },
      {
        name: "Interior Boat Detail",
        slug: "boat-interior",
        description: "Deep clean all vinyl seats & bolsters, compartments, bilge, carpet/non-skid scrub, glass surfaces, and UV protectant applied.",
        category: "boatDetailing",
        variants: [
          { label: "Up to 20 ft", price: 35000, durationMin: 180 },
          { label: "21–25 ft", price: 45000, durationMin: 240 },
          { label: "26–30 ft", price: 55000, durationMin: 300 },
          { label: "31–35 ft", price: 67500, durationMin: 360 },
        ],
        isActive: true,
        sortOrder: 2,
      },
      {
        name: "Exterior Boat Detail + Wax",
        slug: "boat-exterior-wax",
        description: "Full exterior hand wash, machine compound & polish gelcoat, apply polymer sealant/wax, metal & brightwork polish, glass cleaned.",
        category: "boatDetailing",
        variants: [
          { label: "Up to 20 ft", price: 45000, durationMin: 240 },
          { label: "21–25 ft", price: 57500, durationMin: 300 },
          { label: "26–30 ft", price: 70000, durationMin: 360 },
          { label: "31–35 ft", price: 85000, durationMin: 420 },
        ],
        isActive: true,
        sortOrder: 3,
      },
      {
        name: "Full Boat Detail (Inside & Out)",
        slug: "boat-full-detail",
        description: "The works — complete interior deep clean + full exterior compound, polish, and sealant. Brightwork, glass, trailer included.",
        category: "boatDetailing",
        variants: [
          { label: "Up to 20 ft", price: 60000, durationMin: 360 },
          { label: "21–25 ft", price: 77500, durationMin: 420 },
          { label: "26–30 ft", price: 95000, durationMin: 480 },
          { label: "31–35 ft", price: 115000, durationMin: 540 },
        ],
        isActive: true,
        sortOrder: 4,
        popular: true,
      },
      {
        name: "Oxidation Removal & Gelcoat Restoration",
        slug: "boat-oxidation",
        description: "Heavy machine compound & multi-stage polish to restore faded, chalky gelcoat back to a deep gloss finish.",
        category: "boatDetailing",
        variants: [
          { label: "Up to 20 ft", price: 37500, durationMin: 300 },
          { label: "21–25 ft", price: 47500, durationMin: 360 },
          { label: "26–30 ft", price: 57500, durationMin: 420 },
          { label: "31–35 ft", price: 70000, durationMin: 480 },
        ],
        isActive: true,
        sortOrder: 5,
      },

      // ─── BOAT CERAMIC ──────────────────────────────────────
      {
        name: "Boat Ceramic Coating (2-Year)",
        slug: "boat-ceramic-2yr",
        description: "Professional marine ceramic coating with UV and saltwater protection. Includes prep wash and gelcoat polish. 2-year durability.",
        category: "boatCeramic",
        variants: [
          { label: "Up to 20 ft", price: 80000, durationMin: 480 },
          { label: "21–25 ft", price: 100000, durationMin: 600 },
          { label: "26–30 ft", price: 125000, durationMin: 720 },
          { label: "31–35 ft", price: 150000, durationMin: 840 },
        ],
        isActive: true,
        sortOrder: 1,
      },
      {
        name: "Boat Ceramic Coating (5-Year)",
        slug: "boat-ceramic-5yr",
        description: "Premium multi-layer marine ceramic coating with maximum UV, chemical, and saltwater resistance. Includes full correction & polish. 5-year warranty.",
        category: "boatCeramic",
        variants: [
          { label: "Up to 20 ft", price: 120000, durationMin: 600 },
          { label: "21–25 ft", price: 155000, durationMin: 720 },
          { label: "26–30 ft", price: 190000, durationMin: 900 },
          { label: "31–35 ft", price: 225000, durationMin: 1080 },
        ],
        isActive: true,
        sortOrder: 2,
        popular: true,
      },

      // ─── BOAT ADD-ONS ──────────────────────────────────────
      {
        name: "Interior Boat Ceramic",
        slug: "boat-interior-ceramic",
        description: "Ceramic protection for vinyl seats, bolsters, and interior gelcoat surfaces. UV and stain resistant.",
        category: "boatAddon",
        variants: [
          { label: "Up to 20 ft", price: 30000, durationMin: 120 },
          { label: "21–25 ft", price: 40000, durationMin: 150 },
          { label: "26–30 ft", price: 50000, durationMin: 180 },
        ],
        isActive: true,
        sortOrder: 1,
      },
      {
        name: "Pontoon / Hull Bottom Cleaning",
        slug: "boat-hull-clean",
        description: "Remove algae, scum, and buildup from pontoon logs or hull bottom.",
        category: "boatAddon",
        variants: [
          { label: "Pontoon Logs (Twin)", price: 30000, durationMin: 120 },
          { label: "Tritoon Logs (Triple)", price: 40000, durationMin: 150 },
          { label: "Fiberglass Hull Bottom", price: 40000, durationMin: 150 },
        ],
        isActive: true,
        sortOrder: 2,
      },
      {
        name: "Trailer Detail",
        slug: "boat-trailer-detail",
        description: "Full trailer clean, degrease, and protectant — beyond the basic rinse included in wash packages.",
        category: "boatAddon",
        variants: [{ label: "Standard", price: 7500, durationMin: 60 }],
        isActive: true,
        sortOrder: 3,
      },
      {
        name: "Teak Wood Cleaning & Seal",
        slug: "boat-teak",
        description: "Clean, brighten, and seal teak wood surfaces for lasting protection and natural beauty.",
        category: "boatAddon",
        variants: [
          { label: "Small Area (swim platform, etc.)", price: 15000, durationMin: 90 },
          { label: "Full Deck / Large Area", price: 35000, durationMin: 180 },
        ],
        isActive: true,
        sortOrder: 4,
      },
      {
        name: "Metal & Brightwork Polish",
        slug: "boat-metal-polish",
        description: "Hand polish all stainless steel, aluminum, and chrome fixtures to a mirror finish.",
        category: "boatAddon",
        variants: [{ label: "Standard", price: 12500, durationMin: 90 }],
        isActive: true,
        sortOrder: 5,
      },
      {
        name: "Canvas & Cushion Cleaning",
        slug: "boat-canvas-clean",
        description: "Deep clean Bimini tops, boat covers, and seat cushions — remove dirt, salt, and mildew stains.",
        category: "boatAddon",
        variants: [
          { label: "Cushions Only", price: 15000, durationMin: 90 },
          { label: "Full Canvas + Cushions", price: 27500, durationMin: 150 },
        ],
        isActive: true,
        sortOrder: 6,
      },
      {
        name: "Mildew & Odor Treatment",
        slug: "boat-mildew-treatment",
        description: "Professional mold and mildew removal with anti-microbial treatment. Eliminates odors from compartments, upholstery, and carpet.",
        category: "boatAddon",
        variants: [
          { label: "Spot Treatment", price: 7500, durationMin: 45 },
          { label: "Full Boat Treatment", price: 17500, durationMin: 90 },
        ],
        isActive: true,
        sortOrder: 7,
      },
      {
        name: "Engine / Outboard Detail",
        slug: "boat-engine-detail",
        description: "Clean, degrease, and dress the engine compartment or outboard motor. Restore a like-new look under the cowling.",
        category: "boatAddon",
        variants: [
          { label: "Single Outboard", price: 10000, durationMin: 60 },
          { label: "Twin Outboard / Inboard", price: 17500, durationMin: 90 },
        ],
        isActive: true,
        sortOrder: 8,
      },
      {
        name: "Non-Skid Deck Deep Clean",
        slug: "boat-nonskid-clean",
        description: "Scrub and restore textured non-skid deck surfaces — remove ground-in stains, scuffs, and grime.",
        category: "boatAddon",
        variants: [
          { label: "Up to 20 ft", price: 10000, durationMin: 60 },
          { label: "21–30 ft", price: 17500, durationMin: 90 },
          { label: "31–35 ft", price: 22500, durationMin: 120 },
        ],
        isActive: true,
        sortOrder: 9,
      },
      {
        name: "Water Spot Removal",
        slug: "boat-water-spot",
        description: "Remove hard water mineral deposits from gelcoat, glass, and metal surfaces using specialized compounds.",
        category: "boatAddon",
        variants: [
          { label: "Glass & Windshield Only", price: 7500, durationMin: 45 },
          { label: "Full Boat (Gelcoat + Glass)", price: 20000, durationMin: 120 },
        ],
        isActive: true,
        sortOrder: 10,
      },
      {
        name: "Vinyl Seat Restoration",
        slug: "boat-vinyl-restore",
        description: "Deep clean, condition, and UV-protect all vinyl seating surfaces. Restores color and prevents cracking.",
        category: "boatAddon",
        variants: [
          { label: "Up to 20 ft", price: 12500, durationMin: 60 },
          { label: "21–30 ft", price: 20000, durationMin: 90 },
          { label: "31–35 ft", price: 27500, durationMin: 120 },
        ],
        isActive: true,
        sortOrder: 11,
      },
      {
        name: "Glass & Windshield Sealant",
        slug: "boat-glass-sealant",
        description: "Apply hydrophobic ceramic sealant to all glass and windshield surfaces — repels water, salt spray, and makes cleaning easier.",
        category: "boatAddon",
        variants: [{ label: "Standard", price: 7500, durationMin: 30 }],
        isActive: true,
        sortOrder: 12,
      },

      // ─── MEMBERSHIPS ───────────────────────────────────────
      {
        name: "Exterior Only Membership",
        slug: "membership-exterior-only",
        description: "Monthly exterior maintenance wash. Keep your vehicle looking its best between full details. Requires initial detail to join.",
        category: "membership",
        variants: [{ label: "Monthly", price: 5900, durationMin: 45 }],
        isActive: true,
        sortOrder: 1,
      },
      {
        name: "Interior Only Membership",
        slug: "membership-interior-only",
        description: "Monthly interior + exterior maintenance detail with paint sealant refresh. The most popular choice. Requires initial detail to join.",
        category: "membership",
        variants: [{ label: "Monthly", price: 9900, durationMin: 90 }],
        isActive: true,
        sortOrder: 2,
        popular: true,
      },
      {
        name: "Full Inside & Out Membership",
        slug: "membership-full-inside-out",
        description: "Premium monthly full detail — interior deep clean, exterior compound & sealant, engine bay, and ceramic top-up. Requires initial detail to join.",
        category: "membership",
        variants: [{ label: "Monthly", price: 15900, durationMin: 150 }],
        isActive: true,
        sortOrder: 3,
      },
    ];

    for (const item of items) {
      await ctx.db.insert("serviceCatalog", item);
    }

    return `Seeded ${items.length} catalog items`;
  },
});

// ─── Production migration: 10-tier bundle pricing (April 2026) ────────────────
// Internal migration – callable from CLI: npx convex run catalog:runAddBundleTiers
// Also callable from the /migrate-tiers HTTP endpoint
type CatalogCategory = "core" | "paintCorrection" | "ceramicCoating" | "interiorAddon" | "exteriorAddon" | "ceramicAddon" | "boatDetailing" | "boatCeramic" | "boatAddon" | "membership";

export const runAddBundleTiers = internalMutation({
  args: {},
  handler: async (ctx) => {
    const tiers: Array<{
      slug: string;
      name: string;
      category: CatalogCategory;
      description: string;
      variants: Array<{ label: string; price: number; durationMin: number }>;
      sortOrder: number;
      popular?: boolean;
    }> = [
      // ── Inside & Out (4 tiers) ──
      {
        slug: "standard-inside-out",
        name: "Standard Inside & Out",
        category: "core",
        description: "A full-vehicle refresh — interior and exterior in one appointment. Includes: full vacuum, carpet & upholstery shampoo, dashboard & console wipe-down, interior glass, door jambs, hand wash, wheel & tire cleaning, exterior glass, light spray wax, and tire shine.",
        variants: [
          { label: "Coupe/Sedan", price: 18000, durationMin: 150 },
          { label: "Small SUV / Small Truck", price: 21600, durationMin: 180 },
          { label: "Large SUV (3-row) / Off-Road Truck", price: 25200, durationMin: 210 },
          { label: "Vans", price: 28800, durationMin: 240 },
        ],
        sortOrder: 1,
      },
      {
        slug: "premium-inside-out-interior",
        name: "Premium Inside & Out — Interior Focus",
        category: "core",
        description: "Standard Inside & Out plus interior-focused add-ons at 10% off: Leather Deep Clean & Conditioning, Steam Cleaning, Premium Fragrance, and UV Protection.",
        variants: [
          { label: "Coupe/Sedan", price: 31100, durationMin: 210 },
          { label: "Small SUV / Small Truck", price: 34700, durationMin: 240 },
          { label: "Large SUV (3-row) / Off-Road Truck", price: 38300, durationMin: 270 },
          { label: "Vans", price: 41900, durationMin: 300 },
        ],
        sortOrder: 2,
        popular: true,
      },
      {
        slug: "premium-inside-out-exterior",
        name: "Premium Inside & Out — Exterior Focus",
        category: "core",
        description: "Standard Inside & Out plus exterior-focused add-ons at 10% off: Clay Bar Treatment, Iron Decontamination, 6-Month Paint Sealant, and Trim Restoration.",
        variants: [
          { label: "Coupe/Sedan", price: 45000, durationMin: 210 },
          { label: "Small SUV / Small Truck", price: 48600, durationMin: 240 },
          { label: "Large SUV (3-row) / Off-Road Truck", price: 52200, durationMin: 270 },
          { label: "Vans", price: 55800, durationMin: 300 },
        ],
        sortOrder: 3,
        popular: true,
      },
      {
        slug: "elite-inside-out",
        name: "Elite Inside & Out — Ceramic",
        category: "core",
        description: "The ultimate package — Standard base plus all add-ons at 15% off with ceramic upgrades: Steam Cleaning, Premium Fragrance, Clay Bar Treatment, Iron Decontamination, Fabric Protection, GYEON Leather Shield, Ceramic Tire Dressing, Plastic & Trim Ceramic, and 12-Month Ceramic Wax.",
        variants: [
          { label: "Coupe/Sedan", price: 67300, durationMin: 330 },
          { label: "Small SUV / Small Truck", price: 70900, durationMin: 360 },
          { label: "Large SUV (3-row) / Off-Road Truck", price: 74500, durationMin: 390 },
          { label: "Vans", price: 78100, durationMin: 420 },
        ],
        sortOrder: 4,
      },
      // ── Interior Only (3 tiers) ──
      {
        slug: "standard-interior-only",
        name: "Standard Interior Only",
        category: "core",
        description: "Complete interior detail. Includes: thorough vacuum of all surfaces, carpet & upholstery shampoo, dashboard & console wipe-down, cup holders & crevices, interior glass cleaning, door panels & jambs, and light stain treatment.",
        variants: [
          { label: "Coupe/Sedan", price: 12700, durationMin: 105 },
          { label: "Small SUV / Small Truck", price: 14400, durationMin: 120 },
          { label: "3rd Row SUV / Off-Road Truck", price: 18000, durationMin: 150 },
          { label: "Vans", price: 21600, durationMin: 180 },
        ],
        sortOrder: 5,
      },
      {
        slug: "premium-interior-only",
        name: "Premium Interior Only",
        category: "core",
        description: "Standard Interior plus bundled premium add-ons at 10% off: Leather Deep Clean & Conditioning, Steam Cleaning of vents and crevices, Premium Fragrance, and UV Protection for dashboard and plastics.",
        variants: [
          { label: "Coupe/Sedan", price: 25800, durationMin: 165 },
          { label: "Small SUV / Small Truck", price: 27500, durationMin: 180 },
          { label: "3rd Row SUV / Off-Road Truck", price: 31100, durationMin: 210 },
          { label: "Vans", price: 34700, durationMin: 240 },
        ],
        sortOrder: 6,
        popular: true,
      },
      {
        slug: "elite-interior-only",
        name: "Elite Interior Only — Ceramic",
        category: "core",
        description: "Standard Interior plus ceramic add-ons at 15% off: Steam Cleaning, Premium Fragrance, Fabric Protection / Weather Guard, and GYEON Leather Shield.",
        variants: [
          { label: "Coupe/Sedan", price: 31400, durationMin: 210 },
          { label: "Small SUV / Small Truck", price: 33100, durationMin: 225 },
          { label: "3rd Row SUV / Off-Road Truck", price: 36700, durationMin: 255 },
          { label: "Vans", price: 40300, durationMin: 285 },
        ],
        sortOrder: 7,
      },
      // ── Exterior Only (3 tiers) ──
      {
        slug: "standard-exterior-only",
        name: "Standard Exterior Only",
        category: "core",
        description: "Professional exterior refresh. Includes: full hand wash, wheel & tire cleaning, tire shine, exterior glass cleaning, door jambs, and a light spray wax for protection and shine.",
        variants: [
          { label: "Coupe/Sedan", price: 10300, durationMin: 75 },
          { label: "Small SUV / Small Truck", price: 12400, durationMin: 90 },
          { label: "3rd Row SUV / Off-Road Truck", price: 14400, durationMin: 105 },
          { label: "Vans", price: 16500, durationMin: 120 },
        ],
        sortOrder: 8,
      },
      {
        slug: "premium-exterior-only",
        name: "Premium Exterior Only",
        category: "core",
        description: "Standard Exterior plus bundled premium add-ons at 10% off: Clay Bar Treatment for smooth paint, Iron Decontamination, 6-Month Paint Sealant, and Trim Restoration to revive faded plastics.",
        variants: [
          { label: "Coupe/Sedan", price: 37300, durationMin: 150 },
          { label: "Small SUV / Small Truck", price: 39400, durationMin: 165 },
          { label: "3rd Row SUV / Off-Road Truck", price: 41400, durationMin: 180 },
          { label: "Vans", price: 43500, durationMin: 195 },
        ],
        sortOrder: 9,
        popular: true,
      },
      {
        slug: "elite-exterior-only",
        name: "Elite Exterior Only — Ceramic",
        category: "core",
        description: "Standard Exterior plus ceramic add-ons at 15% off: Clay Bar, Iron Decontamination, Ceramic Tire Dressing, Plastic & Trim Ceramic, and 12-Month Ceramic Wax for ultimate exterior protection.",
        variants: [
          { label: "Coupe/Sedan", price: 40900, durationMin: 195 },
          { label: "Small SUV / Small Truck", price: 43000, durationMin: 210 },
          { label: "3rd Row SUV / Off-Road Truck", price: 45000, durationMin: 225 },
          { label: "Vans", price: 47100, durationMin: 240 },
        ],
        sortOrder: 10,
      },
    ];

    let updated = 0;
    let created = 0;
    const log: string[] = [];

    for (const t of tiers) {
      const existing = await ctx.db
        .query("serviceCatalog")
        .withIndex("by_slug", (q) => q.eq("slug", t.slug))
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, {
          name: t.name,
          category: t.category,
          description: t.description,
          variants: t.variants,
          sortOrder: t.sortOrder,
          popular: t.popular,
          isActive: true,
        });
        log.push(`updated: ${t.slug}`);
        updated++;
      } else {
        await ctx.db.insert("serviceCatalog", {
          slug: t.slug,
          name: t.name,
          category: t.category,
          description: t.description,
          variants: t.variants,
          sortOrder: t.sortOrder,
          popular: t.popular,
          isActive: true,
        });
        log.push(`created: ${t.slug}`);
        created++;
      }
    }

    // Deactivate old "premium-inside-out" (replaced by interior/exterior variants)
    const oldPremiumIO = await ctx.db
      .query("serviceCatalog")
      .withIndex("by_slug", (q) => q.eq("slug", "premium-inside-out"))
      .first();
    if (oldPremiumIO) {
      await ctx.db.patch(oldPremiumIO._id, { isActive: false });
      log.push("deactivated: premium-inside-out (replaced by interior/exterior focus variants)");
    }

    // Fix sort order for basic wash
    const wash = await ctx.db
      .query("serviceCatalog")
      .withIndex("by_slug", (q) => q.eq("slug", "basic-exterior-wash"))
      .first();
    if (wash) await ctx.db.patch(wash._id, { sortOrder: 11 });

    return `10-tier migration complete: ${created} created, ${updated} updated. ${log.join("; ")}`;
  },
});
