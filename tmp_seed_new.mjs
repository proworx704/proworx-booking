// This script adds the new catalog items to the live DB
// We'll use convex run catalog:create for each item
const items = [
  // Ceramic add-ons
  {
    name: "Wheel Ceramic Coating",
    slug: "wheel-ceramic",
    description: "Ceramic coating for wheels — protects against brake dust, road grime, and UV. Choose faces only or full removal for calipers.",
    category: "ceramicAddon",
    variants: [
      { label: "Faces Only", price: 20000, durationMin: 120 },
      { label: "Complete Wheels Off + Calipers", price: 40000, durationMin: 240 }
    ],
    isActive: true,
    sortOrder: 8
  },
  {
    name: "Plastic & Trim Ceramic",
    slug: "plastic-ceramic",
    description: "Ceramic coating for exterior plastics and trim — restores deep black finish with long-lasting UV protection.",
    category: "ceramicAddon",
    variants: [{ label: "Standard", price: 10000, durationMin: 60 }],
    isActive: true,
    sortOrder: 9
  },
  {
    name: "Iron Decontamination (Ceramic Prep)",
    slug: "iron-decon-ceramic",
    description: "Chemical iron fallout removal — essential pre-coating prep to dissolve embedded brake dust and industrial fallout.",
    category: "ceramicAddon",
    variants: [{ label: "Standard", price: 4000, durationMin: 30 }],
    isActive: true,
    sortOrder: 10
  },
  // Boat Detailing
  {
    name: "Basic Boat Wash",
    slug: "boat-basic-wash",
    description: "Exterior hand wash, rinse and dry, basic interior wipe-down, glass cleaned, trailer rinse.",
    category: "boatDetailing",
    variants: [
      { label: "Up to 20 ft", price: 25000, durationMin: 120 },
      { label: "21–25 ft", price: 32500, durationMin: 150 },
      { label: "26–30 ft", price: 40000, durationMin: 180 },
      { label: "31–35 ft", price: 50000, durationMin: 210 }
    ],
    isActive: true,
    sortOrder: 1
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
      { label: "31–35 ft", price: 67500, durationMin: 360 }
    ],
    isActive: true,
    sortOrder: 2
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
      { label: "31–35 ft", price: 85000, durationMin: 420 }
    ],
    isActive: true,
    sortOrder: 3
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
      { label: "31–35 ft", price: 115000, durationMin: 540 }
    ],
    isActive: true,
    sortOrder: 4,
    popular: true
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
      { label: "31–35 ft", price: 70000, durationMin: 480 }
    ],
    isActive: true,
    sortOrder: 5
  },
  // Boat Ceramic
  {
    name: "Boat Ceramic Coating (2-Year)",
    slug: "boat-ceramic-2yr",
    description: "Professional marine ceramic coating with UV and saltwater protection. Includes prep wash and gelcoat polish. 2-year durability.",
    category: "boatCeramic",
    variants: [
      { label: "Up to 20 ft", price: 80000, durationMin: 480 },
      { label: "21–25 ft", price: 100000, durationMin: 600 },
      { label: "26–30 ft", price: 125000, durationMin: 720 },
      { label: "31–35 ft", price: 150000, durationMin: 840 }
    ],
    isActive: true,
    sortOrder: 1
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
      { label: "31–35 ft", price: 225000, durationMin: 1080 }
    ],
    isActive: true,
    sortOrder: 2,
    popular: true
  },
  // Boat Add-ons
  {
    name: "Interior Boat Ceramic",
    slug: "boat-interior-ceramic",
    description: "Ceramic protection for vinyl seats, bolsters, and interior gelcoat surfaces. UV and stain resistant.",
    category: "boatAddon",
    variants: [
      { label: "Up to 20 ft", price: 30000, durationMin: 120 },
      { label: "21–25 ft", price: 40000, durationMin: 150 },
      { label: "26–30 ft", price: 50000, durationMin: 180 }
    ],
    isActive: true,
    sortOrder: 1
  },
  {
    name: "Pontoon / Hull Bottom Cleaning",
    slug: "boat-hull-clean",
    description: "Remove algae, scum, and buildup from pontoon logs or hull bottom.",
    category: "boatAddon",
    variants: [
      { label: "Pontoon Logs (Twin)", price: 30000, durationMin: 120 },
      { label: "Tritoon Logs (Triple)", price: 40000, durationMin: 150 },
      { label: "Fiberglass Hull Bottom", price: 40000, durationMin: 150 }
    ],
    isActive: true,
    sortOrder: 2
  },
  {
    name: "Trailer Detail",
    slug: "boat-trailer-detail",
    description: "Full trailer clean, degrease, and protectant — beyond the basic rinse included in wash packages.",
    category: "boatAddon",
    variants: [{ label: "Standard", price: 7500, durationMin: 60 }],
    isActive: true,
    sortOrder: 3
  },
  {
    name: "Teak Wood Cleaning & Seal",
    slug: "boat-teak",
    description: "Clean, brighten, and seal teak wood surfaces for lasting protection and natural beauty.",
    category: "boatAddon",
    variants: [
      { label: "Small Area (swim platform, etc.)", price: 15000, durationMin: 90 },
      { label: "Full Deck / Large Area", price: 35000, durationMin: 180 }
    ],
    isActive: true,
    sortOrder: 4
  },
  {
    name: "Metal & Brightwork Polish",
    slug: "boat-metal-polish",
    description: "Hand polish all stainless steel, aluminum, and chrome fixtures to a mirror finish.",
    category: "boatAddon",
    variants: [{ label: "Standard", price: 12500, durationMin: 90 }],
    isActive: true,
    sortOrder: 5
  },
  // Memberships
  {
    name: "Clean Membership",
    slug: "membership-clean",
    description: "Monthly exterior maintenance wash. Keep your vehicle looking its best between full details. Requires initial detail to join.",
    category: "membership",
    variants: [{ label: "Monthly", price: 5900, durationMin: 45 }],
    isActive: true,
    sortOrder: 1
  },
  {
    name: "Shield Membership",
    slug: "membership-shield",
    description: "Monthly interior + exterior maintenance detail with paint sealant refresh. The most popular choice. Requires initial detail to join.",
    category: "membership",
    variants: [{ label: "Monthly", price: 9900, durationMin: 90 }],
    isActive: true,
    sortOrder: 2,
    popular: true
  },
  {
    name: "Armor Membership",
    slug: "membership-armor",
    description: "Premium monthly full detail — interior deep clean, exterior compound & sealant, engine bay, and ceramic top-up. Requires initial detail to join.",
    category: "membership",
    variants: [{ label: "Monthly", price: 15900, durationMin: 150 }],
    isActive: true,
    sortOrder: 3
  }
];

// Output as JSON array for use with convex CLI
for (const item of items) {
  console.log(JSON.stringify(item));
}
