import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./authHelpers";

const sectionValidator = v.object({
  key: v.string(),
  label: v.string(),
  content: v.string(),
  type: v.union(v.literal("text"), v.literal("textarea"), v.literal("html")),
});

// ─── Queries ──────────────────────────────────────────────────────────────────

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("sitePages").collect();
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return await ctx.db
      .query("sitePages")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
  },
});

// ─── Upsert a page ───────────────────────────────────────────────────────────

export const upsert = mutation({
  args: {
    slug: v.string(),
    title: v.string(),
    sections: v.array(sectionValidator),
  },
  handler: async (ctx, { slug, title, sections }) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("sitePages")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { title, sections });
      return existing._id;
    }
    return await ctx.db.insert("sitePages", { slug, title, sections });
  },
});

// ─── Seed default pages ──────────────────────────────────────────────────────

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.query("sitePages").first();
    if (existing) return "Pages already seeded";

    const pages = [
      {
        slug: "home",
        title: "Home Page",
        sections: [
          { key: "hero_badge", label: "Hero Badge", content: "5-Star Rated · Charlotte, NC", type: "text" as const },
          { key: "hero_title", label: "Hero Title", content: "Premium Mobile\nAuto Detailing", type: "text" as const },
          { key: "hero_subtitle", label: "Hero Subtitle", content: "We come to you. Top-of-the-line products, eco-friendly approach, and 12+ years of experience. Book your detail today.", type: "textarea" as const },
          { key: "cta_primary", label: "Primary Button Text", content: "Book Now", type: "text" as const },
          { key: "cta_phone", label: "Phone Button Text", content: "Call (980) 272-1903", type: "text" as const },
          { key: "why_title", label: "Why Choose Us Title", content: "Why Choose ProWorx Mobile Detailing?", type: "text" as const },
          { key: "feature_1_title", label: "Feature 1 Title", content: "We Come to You", type: "text" as const },
          { key: "feature_1_desc", label: "Feature 1 Description", content: "Fully mobile and self-reliant. We bring our own water, power, and premium products to your location.", type: "textarea" as const },
          { key: "feature_2_title", label: "Feature 2 Title", content: "Eco-Friendly", type: "text" as const },
          { key: "feature_2_desc", label: "Feature 2 Description", content: "Top-of-the-line, environmentally friendly products that protect your car and the planet.", type: "textarea" as const },
          { key: "feature_3_title", label: "Feature 3 Title", content: "12+ Years Experience", type: "text" as const },
          { key: "feature_3_desc", label: "Feature 3 Description", content: "From express washes to ceramic coatings, our precision detailing delivers showroom results every time.", type: "textarea" as const },
          { key: "footer_cta", label: "Footer CTA Title", content: "Ready to Get Started?", type: "text" as const },
          { key: "footer_cta_desc", label: "Footer CTA Description", content: "Pick your service, choose a time that works, and we'll handle the rest. Quick online booking — no phone calls needed.", type: "textarea" as const },
        ],
      },
      {
        slug: "book",
        title: "Booking Page",
        sections: [
          { key: "page_title", label: "Page Title", content: "Book Your Detail", type: "text" as const },
          { key: "page_subtitle", label: "Page Subtitle", content: "Choose your service, pick a time, and we'll come to you.", type: "textarea" as const },
        ],
      },
      {
        slug: "boat-detailing",
        title: "Boat Detailing Page",
        sections: [
          { key: "page_title", label: "Page Title", content: "Marine Detailing & Ceramic Coating", type: "text" as const },
          { key: "page_subtitle", label: "Page Subtitle", content: "Professional mobile detailing and ceramic protection for boats of all sizes. Lake Norman & Charlotte area.", type: "textarea" as const },
          { key: "why_title", label: "Why Choose Us Title", content: "Why Choose ProWorx for Your Boat?", type: "text" as const },
        ],
      },
      {
        slug: "memberships",
        title: "Memberships Page",
        sections: [
          { key: "page_title", label: "Page Title", content: "Maintenance Memberships", type: "text" as const },
          { key: "page_subtitle", label: "Page Subtitle", content: "Keep your vehicle looking showroom-fresh year-round with scheduled monthly maintenance detailing.", type: "textarea" as const },
          { key: "how_title", label: "How It Works Title", content: "How It Works", type: "text" as const },
          { key: "step_1", label: "Step 1", content: "Book any full detailing service with us first. This is required before joining a membership.", type: "textarea" as const },
          { key: "step_2", label: "Step 2", content: "Enroll in your chosen membership tier within the same month as your initial detail.", type: "textarea" as const },
          { key: "step_3", label: "Step 3", content: "Your recurring maintenance service begins the following month. We'll schedule your preferred day each month.", type: "textarea" as const },
          { key: "details_title", label: "Details Section Title", content: "Important Membership Details", type: "text" as const },
          { key: "details_content", label: "Membership Details", content: "An initial full detail is required before joining any membership. This ensures we start from a clean baseline.\nYou must sign up within 30 days of your initial detail.\nMonthly service begins the following month after enrollment.\nMemberships are billed monthly through Square. Cancel anytime with 7 days' notice.", type: "textarea" as const },
        ],
      },
    ];

    for (const page of pages) {
      await ctx.db.insert("sitePages", page);
    }

    return `Seeded ${pages.length} pages`;
  },
});
