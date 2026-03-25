/**
 * Marketing Opt-ins — manage email marketing preferences
 */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// ── Client: Check opt-in status ──────────────────────────────────────────

export const getMyOptIn = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (!user?.email) return null;

    return await ctx.db
      .query("marketingOptIns")
      .withIndex("by_email", (q) => q.eq("email", user.email!.toLowerCase()))
      .first();
  },
});

// ── Client: Opt in to marketing ──────────────────────────────────────────

export const optIn = mutation({
  args: {
    source: v.optional(
      v.union(
        v.literal("portal_registration"),
        v.literal("portal_settings"),
        v.literal("admin_import"),
        v.literal("booking"),
      ),
    ),
  },
  handler: async (ctx, { source }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user?.email) throw new Error("No email found");

    const email = user.email.toLowerCase();

    // Check existing
    const existing = await ctx.db
      .query("marketingOptIns")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (existing) {
      // Re-activate if previously opted out
      if (!existing.isActive) {
        await ctx.db.patch(existing._id, {
          isActive: true,
          optedOutAt: undefined,
          optedInAt: Date.now(),
        });
      }
      return existing._id;
    }

    // Get profile info
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    let customerPhone: string | undefined;
    if (profile?.customerId) {
      const customer = await ctx.db.get(profile.customerId);
      customerPhone = customer?.phone;
    }

    return await ctx.db.insert("marketingOptIns", {
      userId,
      customerId: profile?.customerId || undefined,
      email,
      name: user.name || profile?.displayName || "Client",
      phone: customerPhone,
      optedInAt: Date.now(),
      isActive: true,
      source: source ?? "portal_settings",
    });
  },
});

// ── Client: Opt out of marketing ─────────────────────────────────────────

export const optOut = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user?.email) return;

    const existing = await ctx.db
      .query("marketingOptIns")
      .withIndex("by_email", (q) => q.eq("email", user.email!.toLowerCase()))
      .first();

    if (existing && existing.isActive) {
      await ctx.db.patch(existing._id, {
        isActive: false,
        optedOutAt: Date.now(),
      });
    }
  },
});

// ── Admin: List all opted-in contacts ────────────────────────────────────

export const listOptedIn = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile || (profile.role !== "owner" && profile.role !== "admin")) return [];

    return await ctx.db
      .query("marketingOptIns")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
  },
});

// ── Admin: Get marketing stats ───────────────────────────────────────────

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile || (profile.role !== "owner" && profile.role !== "admin")) return null;

    const all = await ctx.db.query("marketingOptIns").collect();
    const active = all.filter((m) => m.isActive);
    const optedOut = all.filter((m) => !m.isActive);

    return {
      totalSubscribers: active.length,
      totalOptedOut: optedOut.length,
      recentSubscribers: active
        .sort((a, b) => b.optedInAt - a.optedInAt)
        .slice(0, 10)
        .map((m) => ({ name: m.name, email: m.email, optedInAt: m.optedInAt })),
    };
  },
});
