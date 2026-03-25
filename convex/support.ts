/**
 * Client Support Tickets — submit & manage support requests
 */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// ── Client: Submit a support ticket ──────────────────────────────────────

export const submitTicket = mutation({
  args: {
    category: v.union(
      v.literal("booking_issue"),
      v.literal("payment_issue"),
      v.literal("loyalty_question"),
      v.literal("service_feedback"),
      v.literal("account_help"),
      v.literal("general"),
    ),
    subject: v.string(),
    message: v.string(),
  },
  handler: async (ctx, { category, subject, message }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    let customerId = profile?.customerId;
    let customerPhone: string | undefined;
    if (customerId) {
      const customer = await ctx.db.get(customerId);
      customerPhone = customer?.phone;
    }

    return await ctx.db.insert("supportTickets", {
      customerId: customerId || undefined,
      userId,
      name: user.name || profile?.displayName || "Client",
      email: user.email || "",
      phone: customerPhone,
      category,
      subject,
      message,
      status: "open",
      priority: "normal",
    });
  },
});

// ── Client: View my tickets ──────────────────────────────────────────────

export const myTickets = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile?.customerId) return [];

    return await ctx.db
      .query("supportTickets")
      .withIndex("by_customer", (q) => q.eq("customerId", profile.customerId!))
      .order("desc")
      .collect();
  },
});

// ── Admin: List all tickets ──────────────────────────────────────────────

export const listTickets = query({
  args: {
    status: v.optional(v.string()),
  },
  handler: async (ctx, { status }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile || (profile.role !== "owner" && profile.role !== "admin")) return [];

    let tickets = await ctx.db.query("supportTickets").order("desc").collect();

    if (status && status !== "all") {
      tickets = tickets.filter((t) => t.status === status);
    }

    return tickets;
  },
});

// ── Admin: Update ticket status ──────────────────────────────────────────

export const updateTicket = mutation({
  args: {
    ticketId: v.id("supportTickets"),
    status: v.optional(
      v.union(
        v.literal("open"),
        v.literal("in_progress"),
        v.literal("resolved"),
        v.literal("closed"),
      ),
    ),
    priority: v.optional(
      v.union(v.literal("low"), v.literal("normal"), v.literal("high")),
    ),
    adminNotes: v.optional(v.string()),
  },
  handler: async (ctx, { ticketId, status, priority, adminNotes }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile || (profile.role !== "owner" && profile.role !== "admin")) {
      throw new Error("Unauthorized");
    }

    const patch: Record<string, any> = {};
    if (status) {
      patch.status = status;
      if (status === "resolved" || status === "closed") {
        patch.resolvedAt = Date.now();
      }
    }
    if (priority) patch.priority = priority;
    if (adminNotes !== undefined) patch.adminNotes = adminNotes;

    await ctx.db.patch(ticketId, patch);
  },
});
