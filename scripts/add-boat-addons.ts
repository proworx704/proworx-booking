/**
 * Add new boat detailing add-ons to the production Convex database.
 * Run: npx convex run catalog:create --prod '{ ... }' for each item
 */

import { execSync } from "child_process";

const newAddons = [
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
];

async function main() {
  for (const addon of newAddons) {
    const args = JSON.stringify(addon);
    console.log(`Adding: ${addon.name}...`);
    
    // Add to prod
    try {
      execSync(`npx convex run catalog:create --prod '${args}'`, { 
        cwd: process.cwd(),
        stdio: "pipe"
      });
      console.log(`  ✅ Added to prod: ${addon.name}`);
    } catch (e: any) {
      console.log(`  ⚠️ Prod: ${e.stderr?.toString() || e.message}`);
    }

    // Add to dev
    try {
      execSync(`npx convex run catalog:create '${args}'`, {
        cwd: process.cwd(),
        stdio: "pipe"
      });
      console.log(`  ✅ Added to dev: ${addon.name}`);
    } catch (e: any) {
      console.log(`  ⚠️ Dev: ${e.stderr?.toString() || e.message}`);
    }
  }
}

main();
