import { mutation } from "./_generated/server";
import { requireAdmin } from "./authHelpers";

type Section = {
  title: string;
  items: { label: string; type: "check" | "passfail" }[];
};

type Template = {
  serviceType: string;
  name: string;
  sortOrder: number;
  sections: Section[];
};

const TEMPLATES: Template[] = [
  {
    serviceType: "standard",
    name: "Standard Detail (Full Interior + Exterior)",
    sortOrder: 1,
    sections: [
      {
        title: "Vehicle Check-In",
        items: [
          { label: "Walk-around completed with customer", type: "check" },
          { label: "Pre-existing damage documented", type: "check" },
          { label: "Before photos taken (4+ angles)", type: "check" },
          { label: "Service confirmed with customer", type: "check" },
        ],
      },
      {
        title: "Interior — Vacuum & Debris",
        items: [
          { label: "All seats vacuumed (under & between)", type: "check" },
          { label: "Carpets & floor mats vacuumed", type: "check" },
          { label: "Trunk / cargo area vacuumed", type: "check" },
          { label: "Crevices, seat tracks, door pockets cleaned", type: "check" },
        ],
      },
      {
        title: "Interior — Surfaces",
        items: [
          { label: "Dashboard & center console cleaned + dressed", type: "check" },
          { label: "Door panels cleaned & dressed", type: "check" },
          { label: "Vents cleaned (brush / compressed air)", type: "check" },
          { label: "Steering wheel & column cleaned", type: "check" },
          { label: "Cup holders & storage bins cleaned", type: "check" },
        ],
      },
      {
        title: "Interior — Leather / Upholstery",
        items: [
          { label: "Leather cleaned with leather cleaner", type: "check" },
          { label: "Leather conditioned", type: "check" },
          { label: "Fabric seats extracted / shampooed (if applicable)", type: "check" },
        ],
      },
      {
        title: "Interior — Glass & Final",
        items: [
          { label: "All interior glass streak-free", type: "passfail" },
          { label: "Rearview mirror & visor mirrors cleaned", type: "check" },
          { label: "Air freshener applied (if requested)", type: "check" },
          { label: "Interior smells fresh — no chemical residue", type: "passfail" },
        ],
      },
      {
        title: "Exterior — Wash",
        items: [
          { label: "Pre-rinse / foam cannon applied", type: "check" },
          { label: "Two-bucket method wash completed", type: "check" },
          { label: "Door jambs cleaned", type: "check" },
          { label: "Clay bar decontamination completed", type: "check" },
        ],
      },
      {
        title: "Exterior — Wheels & Tires",
        items: [
          { label: "Wheels cleaned (face, barrel, lug nuts)", type: "check" },
          { label: "Tires cleaned & tire dressing applied", type: "check" },
          { label: "Wheel wells cleaned", type: "check" },
        ],
      },
      {
        title: "Exterior — Protection & Final",
        items: [
          { label: "Sealant / ceramic wax applied evenly", type: "check" },
          { label: "Exterior glass cleaned streak-free", type: "passfail" },
          { label: "Trim restored / dressed", type: "check" },
          { label: "Final wipe-down — no streaks or residue", type: "passfail" },
          { label: "After photos taken (matching before angles)", type: "check" },
        ],
      },
    ],
  },
  {
    serviceType: "interior",
    name: "Interior Only",
    sortOrder: 2,
    sections: [
      {
        title: "Vehicle Check-In",
        items: [
          { label: "Walk-around completed with customer", type: "check" },
          { label: "Pre-existing damage documented", type: "check" },
          { label: "Before photos taken", type: "check" },
        ],
      },
      {
        title: "Vacuum & Debris Removal",
        items: [
          { label: "All seats vacuumed thoroughly", type: "check" },
          { label: "Carpets & floor mats vacuumed", type: "check" },
          { label: "Trunk / cargo area vacuumed", type: "check" },
          { label: "Crevices & seat tracks cleaned", type: "check" },
          { label: "Door pockets & storage emptied & cleaned", type: "check" },
        ],
      },
      {
        title: "Surfaces & Trim",
        items: [
          { label: "Dashboard cleaned & dressed", type: "check" },
          { label: "Center console cleaned & dressed", type: "check" },
          { label: "Door panels cleaned & dressed", type: "check" },
          { label: "Vents cleaned", type: "check" },
          { label: "Steering wheel & column cleaned", type: "check" },
          { label: "Cup holders & bins cleaned", type: "check" },
          { label: "Pedals wiped down", type: "check" },
        ],
      },
      {
        title: "Leather / Upholstery",
        items: [
          { label: "Leather cleaned", type: "check" },
          { label: "Leather conditioned", type: "check" },
          { label: "Fabric extracted / shampooed (if needed)", type: "check" },
          { label: "Stains addressed", type: "check" },
        ],
      },
      {
        title: "Glass & Final Inspection",
        items: [
          { label: "All interior glass streak-free", type: "passfail" },
          { label: "Mirrors cleaned", type: "check" },
          { label: "Door jambs wiped", type: "check" },
          { label: "Interior smells clean — no chemical residue", type: "passfail" },
          { label: "Floor mats reinstalled", type: "check" },
          { label: "After photos taken", type: "check" },
        ],
      },
    ],
  },
  {
    serviceType: "exterior",
    name: "Exterior Only",
    sortOrder: 3,
    sections: [
      {
        title: "Vehicle Check-In",
        items: [
          { label: "Walk-around completed with customer", type: "check" },
          { label: "Pre-existing damage documented", type: "check" },
          { label: "Before photos taken", type: "check" },
        ],
      },
      {
        title: "Wash & Decontamination",
        items: [
          { label: "Pre-rinse completed", type: "check" },
          { label: "Foam cannon / pre-soak applied", type: "check" },
          { label: "Two-bucket wash method used", type: "check" },
          { label: "Clay bar decontamination completed", type: "check" },
          { label: "Iron remover applied (if needed)", type: "check" },
          { label: "Door jambs cleaned", type: "check" },
        ],
      },
      {
        title: "Wheels & Tires",
        items: [
          { label: "Wheels cleaned (face, barrel, lugs)", type: "check" },
          { label: "Tires scrubbed & dressed", type: "check" },
          { label: "Wheel wells cleaned", type: "check" },
          { label: "Fender trim cleaned", type: "check" },
        ],
      },
      {
        title: "Protection & Finishing",
        items: [
          { label: "Paint dried completely (air blower / towel)", type: "check" },
          { label: "Sealant / ceramic wax applied evenly", type: "check" },
          { label: "Trim restored / dressed", type: "check" },
          { label: "All exterior glass cleaned streak-free", type: "passfail" },
          { label: "Exhaust tips cleaned", type: "check" },
          { label: "Final inspection — no water spots or residue", type: "passfail" },
          { label: "After photos taken", type: "check" },
        ],
      },
    ],
  },
  {
    serviceType: "paint_correction",
    name: "Paint Correction",
    sortOrder: 4,
    sections: [
      {
        title: "Vehicle Check-In & Prep",
        items: [
          { label: "Walk-around with customer completed", type: "check" },
          { label: "Pre-existing damage documented", type: "check" },
          { label: "Before photos taken (close-up defects + full panels)", type: "check" },
          { label: "Full decontamination wash completed", type: "check" },
          { label: "Clay bar treatment completed", type: "check" },
          { label: "Iron remover applied", type: "check" },
          { label: "Masking tape applied to trim, rubber, plastic", type: "check" },
        ],
      },
      {
        title: "Paint Correction — Panel by Panel",
        items: [
          { label: "Hood corrected & inspected", type: "passfail" },
          { label: "Roof corrected & inspected", type: "passfail" },
          { label: "Front fenders (L/R) corrected", type: "passfail" },
          { label: "Front doors (L/R) corrected", type: "passfail" },
          { label: "Rear doors / quarters (L/R) corrected", type: "passfail" },
          { label: "Trunk / tailgate corrected", type: "passfail" },
          { label: "Rear bumper corrected", type: "passfail" },
          { label: "Front bumper corrected", type: "passfail" },
          { label: "Pillars corrected", type: "passfail" },
        ],
      },
      {
        title: "Finishing",
        items: [
          { label: "Finishing polish applied to all panels", type: "check" },
          { label: "IPA wipe-down completed (polish residue removed)", type: "check" },
          { label: "Paint inspected under LED light — swirl-free", type: "passfail" },
          { label: "Masking tape removed cleanly", type: "check" },
          { label: "Trim & rubber checked for polish residue", type: "passfail" },
        ],
      },
      {
        title: "Protection & Final",
        items: [
          { label: "Sealant / coating applied (if included)", type: "check" },
          { label: "Exterior glass cleaned", type: "check" },
          { label: "Wheels & tires dressed", type: "check" },
          { label: "After photos taken (same angles as before)", type: "check" },
          { label: "Customer walk-through of results", type: "check" },
          { label: "Aftercare instructions provided", type: "check" },
        ],
      },
    ],
  },
  {
    serviceType: "ceramic_coating",
    name: "Ceramic Coating",
    sortOrder: 5,
    sections: [
      {
        title: "Vehicle Check-In & Decon",
        items: [
          { label: "Walk-around with customer completed", type: "check" },
          { label: "Pre-existing damage documented", type: "check" },
          { label: "Before photos taken", type: "check" },
          { label: "Full decontamination wash", type: "check" },
          { label: "Clay bar treatment", type: "check" },
          { label: "Iron remover applied", type: "check" },
        ],
      },
      {
        title: "Paint Correction (Pre-Coating)",
        items: [
          { label: "All panels corrected (see Paint Correction checklist)", type: "check" },
          { label: "IPA wipe-down — surface is bare paint, oil-free", type: "passfail" },
          { label: "Surface inspected under LED light", type: "passfail" },
          { label: "Masking tape applied to non-coated areas", type: "check" },
        ],
      },
      {
        title: "Ceramic Coating — Panel by Panel",
        items: [
          { label: "Hood coated & leveled", type: "passfail" },
          { label: "Roof coated & leveled", type: "passfail" },
          { label: "Front fenders (L/R) coated", type: "passfail" },
          { label: "Front doors (L/R) coated", type: "passfail" },
          { label: "Rear doors / quarters (L/R) coated", type: "passfail" },
          { label: "Trunk / tailgate coated", type: "passfail" },
          { label: "Bumpers (F/R) coated", type: "passfail" },
          { label: "Pillars coated", type: "passfail" },
        ],
      },
      {
        title: "Additional Surfaces",
        items: [
          { label: "Wheels coated (if included)", type: "check" },
          { label: "Trim / plastic coated (if included)", type: "check" },
          { label: "Glass coating applied (if included)", type: "check" },
          { label: "Leather coating applied (if included)", type: "check" },
        ],
      },
      {
        title: "Cure & Final",
        items: [
          { label: "IR cure applied / initial flash time observed", type: "check" },
          { label: "No high spots detected on any panel", type: "passfail" },
          { label: "Masking removed", type: "check" },
          { label: "After photos taken", type: "check" },
          { label: "Customer walk-through of results", type: "check" },
          { label: "Ceramic Coating Care Card given to customer", type: "check" },
          { label: "Cure instructions explained (7-day no-wash)", type: "check" },
        ],
      },
    ],
  },
  {
    serviceType: "vehicle_checkin",
    name: "Vehicle Check-In (Pre-Service)",
    sortOrder: 6,
    sections: [
      {
        title: "Customer Greeting",
        items: [
          { label: "Greeted customer by name", type: "check" },
          { label: "Confirmed service & pricing", type: "check" },
          { label: "Discussed any specific concerns", type: "check" },
        ],
      },
      {
        title: "Exterior Condition",
        items: [
          { label: "Walked around vehicle with customer", type: "check" },
          { label: "Scratches / dents documented", type: "check" },
          { label: "Paint chips / peeling noted", type: "check" },
          { label: "Windshield / glass damage noted", type: "check" },
          { label: "Wheel / tire condition noted", type: "check" },
          { label: "Trim damage / missing pieces noted", type: "check" },
        ],
      },
      {
        title: "Interior Condition",
        items: [
          { label: "Seat condition documented (rips, stains)", type: "check" },
          { label: "Dashboard / trim damage noted", type: "check" },
          { label: "Unusual odors noted", type: "check" },
          { label: "Customer valuables secured / noted", type: "check" },
        ],
      },
      {
        title: "Documentation",
        items: [
          { label: "Before photos taken (4+ angles exterior)", type: "check" },
          { label: "Before photos taken (interior condition)", type: "check" },
          { label: "All damage noted on check-in form", type: "check" },
        ],
      },
    ],
  },
  {
    serviceType: "mobile_onsite",
    name: "Mobile Service On-Site Setup",
    sortOrder: 7,
    sections: [
      {
        title: "Arrival & Setup",
        items: [
          { label: "Arrived 10 min before appointment", type: "check" },
          { label: "Greeted customer, confirmed service", type: "check" },
          { label: "Identified water source / power access", type: "check" },
          { label: "Work area is safe (level, no hazards)", type: "check" },
          { label: "Drop cloths / mats placed to protect driveway", type: "check" },
          { label: "Equipment set up and tested", type: "check" },
          { label: "Supplies verified — all products available", type: "check" },
        ],
      },
      {
        title: "During Service",
        items: [
          { label: "Appropriate checklist being followed for service type", type: "check" },
          { label: "Work area kept clean during service", type: "check" },
          { label: "No damage to customer property", type: "passfail" },
          { label: "Chemical runoff contained / managed", type: "check" },
          { label: "Noise level appropriate for neighborhood", type: "check" },
        ],
      },
      {
        title: "Teardown & Cleanup",
        items: [
          { label: "All equipment cleaned & packed", type: "check" },
          { label: "Work area cleaned — no debris, puddles, or residue", type: "passfail" },
          { label: "Trash removed from site", type: "check" },
          { label: "Customer property restored to original state", type: "passfail" },
          { label: "Driveway / surface checked for stains", type: "passfail" },
        ],
      },
      {
        title: "Customer Handoff",
        items: [
          { label: "Customer walk-through of finished vehicle", type: "check" },
          { label: "Aftercare instructions provided", type: "check" },
          { label: "Upsell / add-on mentioned (if appropriate)", type: "check" },
          { label: "Payment collected / confirmed", type: "check" },
          { label: "Thank you & referral card given", type: "check" },
          { label: "After photos taken", type: "check" },
        ],
      },
    ],
  },
];

/** Seed all 7 checklist templates — admin only */
export const seedAllTemplates = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const now = new Date().toISOString();

    let created = 0;
    let updated = 0;

    for (const t of TEMPLATES) {
      const existing = await ctx.db
        .query("checklistTemplates")
        .withIndex("by_serviceType", (q) =>
          q.eq("serviceType", t.serviceType)
        )
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          name: t.name,
          sections: t.sections,
          sortOrder: t.sortOrder,
          updatedAt: now,
        });
        updated++;
      } else {
        await ctx.db.insert("checklistTemplates", {
          name: t.name,
          serviceType: t.serviceType,
          sections: t.sections,
          isActive: true,
          sortOrder: t.sortOrder,
          createdAt: now,
          updatedAt: now,
        });
        created++;
      }
    }

    return { created, updated, total: TEMPLATES.length };
  },
});
