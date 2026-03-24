import { mutation } from "./_generated/server";
import { requireAdmin } from "./authHelpers";

/**
 * Update membership catalog items with vehicle-size-based variants
 * and realistic maintenance cleaning times.
 * 
 * Times are based on maintenance-level work (lighter than full details):
 * - Clean (Exterior): hand wash, tires, windows, door jambs, tire shine
 * - Shield (Interior): vacuum, wipe-down, dashboard, leather/vinyl, windows, air freshener  
 * - Armor (Inside & Out): all above + ceramic wet-coat protection, paint sealant
 */
export const run = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const allItems = await ctx.db.query("serviceCatalog").collect();
    const membershipItems = allItems.filter(i => i.category === "membership");

    const updates: Record<string, {
      description: string;
      variants: Array<{ label: string; price: number; durationMin: number }>;
    }> = {
      "membership-exterior-only": {
        description: "Monthly exterior maintenance wash — hand wash, tires, exterior windows, door jambs, and tire shine. Keeps your vehicle looking fresh between full details.",
        variants: [
          { label: "Coupe/Sedan", price: 5900, durationMin: 30 },
          { label: "Small SUV / Small Truck", price: 5900, durationMin: 40 },
          { label: "3rd Row SUV / Off-Road Truck", price: 5900, durationMin: 50 },
          { label: "Vans", price: 5900, durationMin: 60 },
        ],
      },
      "membership-interior-only": {
        description: "Monthly interior maintenance detail — vacuum, wipe-down, dashboard care, leather/vinyl conditioning, interior windows, and air freshener. The most popular choice.",
        variants: [
          { label: "Coupe/Sedan", price: 9900, durationMin: 35 },
          { label: "Small SUV / Small Truck", price: 9900, durationMin: 45 },
          { label: "3rd Row SUV / Off-Road Truck", price: 9900, durationMin: 55 },
          { label: "Vans", price: 9900, durationMin: 70 },
        ],
      },
      "membership-full-inside-out": {
        description: "Premium monthly inside & out detail with ceramic wet-coat protection — paint sealant, tire shine, and priority scheduling. The ultimate maintenance plan.",
        variants: [
          { label: "Coupe/Sedan", price: 15900, durationMin: 60 },
          { label: "Small SUV / Small Truck", price: 15900, durationMin: 80 },
          { label: "3rd Row SUV / Off-Road Truck", price: 15900, durationMin: 100 },
          { label: "Vans", price: 15900, durationMin: 120 },
        ],
      },
    };

    let updated = 0;
    for (const item of membershipItems) {
      const slug = item.slug;
      if (slug && updates[slug]) {
        await ctx.db.patch(item._id, {
          variants: updates[slug].variants,
          description: updates[slug].description,
        });
        updated++;
      }
    }

    return `Updated ${updated} membership items with vehicle-size variants`;
  },
});
