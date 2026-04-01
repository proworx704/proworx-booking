import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════════════
// MARKETING ATTRIBUTION & AD SPEND TRACKING
// ═══════════════════════════════════════════════════════════════════════

const LEAD_SOURCE_LABELS: Record<string, string> = {
  google_ads: "Google Ads",
  google_local: "Google Local Services",
  facebook_ads: "Facebook Ads",
  instagram_ads: "Instagram Ads",
  google_organic: "Google Organic",
  yelp: "Yelp",
  referral: "Referral",
  direct: "Direct",
  other: "Other",
};

// Helper: membership rebookings are recurring maintenance, not new customer
// acquisitions — exclude them from marketing attribution metrics.
function isMembershipRebooking(b: { serviceName?: string }): boolean {
  return !!b.serviceName && b.serviceName.toLowerCase().includes("membership");
}

const CHANNEL_VALIDATOR = v.union(
  v.literal("google_ads"),
  v.literal("google_local"),
  v.literal("facebook_ads"),
  v.literal("instagram_ads"),
  v.literal("yelp"),
  v.literal("other"),
);

// ─── Attribution Overview ────────────────────────────────────────────────────
// Returns bookings grouped by lead source with counts, revenue, close ratios
export const attributionOverview = query({
  args: {
    startDate: v.optional(v.string()), // YYYY-MM-DD
    endDate: v.optional(v.string()),   // YYYY-MM-DD
  },
  handler: async (ctx, args) => {
    let bookings = await ctx.db.query("bookings").collect();

    // Filter by date range
    if (args.startDate) {
      bookings = bookings.filter((b) => b.date >= args.startDate!);
    }
    if (args.endDate) {
      bookings = bookings.filter((b) => b.date <= args.endDate!);
    }

    // Exclude membership rebookings — recurring maintenance, not new acquisitions
    bookings = bookings.filter((b) => !isMembershipRebooking(b));

    // Group by lead source
    const sourceMap: Record<string, {
      source: string;
      label: string;
      totalBookings: number;
      completedBookings: number;
      cancelledBookings: number;
      totalRevenue: number;
      paidRevenue: number;
      avgBookingValue: number;
    }> = {};

    for (const b of bookings) {
      const src = b.leadSource || "direct";
      if (!sourceMap[src]) {
        sourceMap[src] = {
          source: src,
          label: LEAD_SOURCE_LABELS[src] || src,
          totalBookings: 0,
          completedBookings: 0,
          cancelledBookings: 0,
          totalRevenue: 0,
          paidRevenue: 0,
          avgBookingValue: 0,
        };
      }
      const entry = sourceMap[src];
      entry.totalBookings++;
      if (b.status === "completed") entry.completedBookings++;
      if (b.status === "cancelled") entry.cancelledBookings++;
      const rev = b.totalPrice || b.price || 0;
      entry.totalRevenue += rev;
      if (b.paymentStatus === "paid") entry.paidRevenue += rev;
    }

    // Calculate averages
    for (const entry of Object.values(sourceMap)) {
      entry.avgBookingValue = entry.totalBookings > 0
        ? Math.round(entry.totalRevenue / entry.totalBookings)
        : 0;
    }

    // Sort by total bookings descending
    const sources = Object.values(sourceMap).sort(
      (a, b) => b.totalBookings - a.totalBookings,
    );

    // Totals
    const totalBookings = bookings.length;
    const totalRevenue = bookings.reduce((s, b) => s + (b.totalPrice || b.price || 0), 0);
    const paidBookings = bookings.filter((b) => b.status !== "cancelled").length;

    return { sources, totalBookings, totalRevenue, paidBookings };
  },
});

// ─── Attribution by Campaign ─────────────────────────────────────────────────
export const campaignBreakdown = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let bookings = await ctx.db.query("bookings").collect();

    if (args.startDate) bookings = bookings.filter((b) => b.date >= args.startDate!);
    if (args.endDate) bookings = bookings.filter((b) => b.date <= args.endDate!);

    // Only bookings with UTM data
    const utmBookings = bookings.filter((b) => b.utmCampaign || b.utmSource);

    const campaigns: Record<string, {
      campaign: string;
      source: string;
      medium: string;
      bookings: number;
      revenue: number;
      completed: number;
    }> = {};

    for (const b of utmBookings) {
      const key = `${b.utmSource || "unknown"}|${b.utmCampaign || "none"}`;
      if (!campaigns[key]) {
        campaigns[key] = {
          campaign: b.utmCampaign || "(no campaign)",
          source: b.utmSource || "unknown",
          medium: b.utmMedium || "",
          bookings: 0,
          revenue: 0,
          completed: 0,
        };
      }
      campaigns[key].bookings++;
      campaigns[key].revenue += b.totalPrice || b.price || 0;
      if (b.status === "completed") campaigns[key].completed++;
    }

    return Object.values(campaigns).sort((a, b) => b.bookings - a.bookings);
  },
});

// ─── Recent Attributed Bookings ──────────────────────────────────────────────
export const recentAttributedBookings = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const bookings = await ctx.db
      .query("bookings")
      .order("desc")
      .collect();

    // Only bookings with a lead source (not direct/unknown),
    // excluding recurring membership rebookings
    const attributed = bookings
      .filter((b) => b.leadSource && b.leadSource !== "direct" && !isMembershipRebooking(b))
      .slice(0, limit)
      .map((b) => ({
        _id: b._id,
        customerName: b.customerName,
        serviceName: b.serviceName,
        date: b.date,
        price: b.totalPrice || b.price,
        status: b.status,
        paymentStatus: b.paymentStatus,
        leadSource: b.leadSource,
        leadSourceLabel: LEAD_SOURCE_LABELS[b.leadSource || ""] || b.leadSource,
        utmCampaign: b.utmCampaign,
        utmSource: b.utmSource,
      }));

    return attributed;
  },
});

// ═══════════════════════════════════════════════════════════════════════
// AD SPEND CRUD
// ═══════════════════════════════════════════════════════════════════════

// List all ad spend entries
export const listAdSpend = query({
  args: {
    month: v.optional(v.string()),
    channel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let entries = await ctx.db.query("adSpend").collect();
    if (args.month) entries = entries.filter((e) => e.month === args.month);
    if (args.channel) entries = entries.filter((e) => e.channel === args.channel);
    return entries.sort((a, b) => b.month.localeCompare(a.month) || a.channel.localeCompare(b.channel));
  },
});

// Upsert ad spend for a channel + month
export const upsertAdSpend = mutation({
  args: {
    channel: CHANNEL_VALIDATOR,
    month: v.string(), // "2026-03"
    spend: v.number(), // cents
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if entry exists
    const existing = await ctx.db
      .query("adSpend")
      .withIndex("by_channel_month", (q) =>
        q.eq("channel", args.channel).eq("month", args.month),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        spend: args.spend,
        notes: args.notes,
        updatedAt: Date.now(),
      });
      return existing._id;
    } else {
      return await ctx.db.insert("adSpend", {
        channel: args.channel,
        month: args.month,
        spend: args.spend,
        notes: args.notes,
        updatedAt: Date.now(),
      });
    }
  },
});

export const deleteAdSpend = mutation({
  args: { id: v.id("adSpend") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// ─── ROI Calculation ─────────────────────────────────────────────────────────
// Combines ad spend with attribution data
export const roiByChannel = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let bookings = await ctx.db.query("bookings").collect();
    const allSpend = await ctx.db.query("adSpend").collect();

    if (args.startDate) bookings = bookings.filter((b) => b.date >= args.startDate!);
    if (args.endDate) bookings = bookings.filter((b) => b.date <= args.endDate!);

    // Exclude membership rebookings from ROI attribution
    bookings = bookings.filter((b) => !isMembershipRebooking(b));

    // Get months in the date range for spend filtering
    const months = new Set<string>();
    for (const b of bookings) {
      months.add(b.date.substring(0, 7)); // YYYY-MM
    }

    const channels = ["google_ads", "google_local", "facebook_ads", "instagram_ads", "yelp", "other"] as const;

    const roi = channels.map((channel) => {
      const channelBookings = bookings.filter((b) => b.leadSource === channel);
      const channelSpend = allSpend
        .filter((s) => s.channel === channel && months.has(s.month))
        .reduce((sum, s) => sum + s.spend, 0);

      const revenue = channelBookings.reduce(
        (s, b) => s + (b.totalPrice || b.price || 0), 0,
      );
      const completed = channelBookings.filter((b) => b.status === "completed").length;
      const total = channelBookings.length;
      const closeRate = total > 0 ? Math.round((completed / total) * 100) : 0;
      const costPerBooking = total > 0 ? Math.round(channelSpend / total) : 0;
      const roiPercent = channelSpend > 0
        ? Math.round(((revenue - channelSpend) / channelSpend) * 100)
        : 0;

      return {
        channel,
        label: LEAD_SOURCE_LABELS[channel] || channel,
        totalBookings: total,
        completedBookings: completed,
        closeRate,
        revenue,
        spend: channelSpend,
        costPerBooking,
        roiPercent,
      };
    });

    return roi.filter((r) => r.totalBookings > 0 || r.spend > 0);
  },
});

// ─── Set lead source on existing booking (for manual attribution) ────────────
export const setBookingLeadSource = mutation({
  args: {
    bookingId: v.id("bookings"),
    leadSource: v.union(
      v.literal("google_ads"),
      v.literal("google_local"),
      v.literal("facebook_ads"),
      v.literal("instagram_ads"),
      v.literal("google_organic"),
      v.literal("yelp"),
      v.literal("referral"),
      v.literal("direct"),
      v.literal("other"),
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.bookingId, { leadSource: args.leadSource });
  },
});
