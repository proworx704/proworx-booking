/**
 * Revert all pricing to $80/hr base + original add-on bundle structure.
 * Standard = $80/hr × hours × 1.03
 * Premium = Standard + add-ons at 10% off
 * Elite = Standard + ceramic add-ons at 15% off
 * DELETE THIS FILE after migration is complete.
 */
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const run = mutation({
  args: { secret: v.string() },
  handler: async (ctx, { secret }) => {
    if (secret !== "pw-bundle-revert-2026") {
      throw new Error("Invalid secret");
    }

    const allItems = await ctx.db.query("serviceCatalog").collect();

    const updates: Record<string, Record<string, number>> = {
      "Standard Inside & Out": {
        "Coupe/Sedan": 16500, "Small SUV / Small Truck": 20600,
        "Large SUV (3-row) / Off-Road Truck": 24700, "Vans": 28800,
      },
      "Premium I&O — Interior Focus": {
        "Sedan / Small Car": 29600, "Small SUV / Small Truck": 33700,
        "Large SUV / Off-Road Truck": 37800, "Van": 41900,
      },
      "Premium I&O — Exterior Focus": {
        "Sedan / Small Car": 43500, "Small SUV / Small Truck": 47600,
        "Large SUV / Off-Road Truck": 51700, "Van": 55800,
      },
      "Elite Inside & Out": {
        "Sedan / Small Car": 65800, "Small SUV / Small Truck": 69900,
        "Large SUV / Off-Road Truck": 74000, "Van": 78100,
      },
      "Standard Interior Only": {
        "Coupe/Sedan": 12400, "Small SUV / Small Truck": 14400,
        "3rd Row SUV / Off-Road Truck": 16500, "Vans": 20600,
      },
      "Premium Interior": {
        "Sedan / Small Car": 25500, "Small SUV / Small Truck": 27500,
        "Large SUV / Off-Road Truck": 29600, "Van": 33700,
      },
      "Elite Interior Only": {
        "Sedan / Small Car": 31100, "Small SUV / Small Truck": 33100,
        "Large SUV / Off-Road Truck": 35200, "Van": 39300,
      },
      "Standard Exterior Only": {
        "Coupe/Sedan": 10300, "Small SUV / Small Truck": 12400,
        "3rd Row SUV / Off-Road Truck": 14400, "Vans": 16500,
      },
      "Premium Exterior": {
        "Sedan / Small Car": 37300, "Small SUV / Small Truck": 39400,
        "Large SUV / Off-Road Truck": 41400, "Van": 43500,
      },
      "Elite Exterior Only": {
        "Sedan / Small Car": 40900, "Small SUV / Small Truck": 43000,
        "Large SUV / Off-Road Truck": 45000, "Van": 47100,
      },
    };

    const log: string[] = [];

    for (const item of allItems) {
      const priceMap = updates[item.name];
      if (!priceMap) continue;

      const newVariants = item.variants.map((v: any) => {
        const newPrice = priceMap[v.label];
        if (newPrice !== undefined && newPrice !== v.price) {
          log.push(`${item.name} / ${v.label}: $${v.price / 100} → $${newPrice / 100}`);
          return { ...v, price: newPrice };
        }
        return v;
      });

      await ctx.db.patch(item._id, { variants: newVariants });
    }

    return {
      updated: log.length,
      changes: log,
    };
  },
});
