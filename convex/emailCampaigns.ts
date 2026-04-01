import { v } from "convex/values";
import { query, mutation, action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

// ═══════════════════════════════════════════════════════════════════════
// EMAIL CAMPAIGN TEMPLATES & BACKEND
// ═══════════════════════════════════════════════════════════════════════

declare const process: { env: Record<string, string | undefined> };

const TEMPLATE_VALIDATOR = v.union(
  v.literal("coupon"),
  v.literal("announcement"),
  v.literal("seasonal"),
  v.literal("thank_you"),
  v.literal("newsletter"),
  v.literal("custom"),
);

const AUDIENCE_VALIDATOR = v.union(
  v.literal("all"),
  v.literal("recent"),
  v.literal("inactive"),
  v.literal("high_value"),
);

// ─── List all campaigns ──────────────────────────────────────────────────────
export const list = query({
  args: {},
  handler: async (ctx) => {
    const campaigns = await ctx.db
      .query("emailCampaigns")
      .order("desc")
      .collect();
    return campaigns;
  },
});

// ─── Get single campaign with send stats ─────────────────────────────────────
export const get = query({
  args: { id: v.id("emailCampaigns") },
  handler: async (ctx, args) => {
    const campaign = await ctx.db.get(args.id);
    if (!campaign) return null;

    const sends = await ctx.db
      .query("emailSends")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.id))
      .collect();

    return {
      ...campaign,
      stats: {
        total: sends.length,
        sent: sends.filter((s) => s.status === "sent").length,
        failed: sends.filter((s) => s.status === "failed").length,
        queued: sends.filter((s) => s.status === "queued").length,
      },
    };
  },
});

// ─── Internal get (for actions) ──────────────────────────────────────────
export const getInternal = internalQuery({
  args: { id: v.id("emailCampaigns") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// ─── Get audience count for a given segment ──────────────────────────────────
export const getAudienceCount = query({
  args: { audience: AUDIENCE_VALIDATOR },
  handler: async (ctx, args) => {
    const customers = await ctx.db.query("customers").collect();
    const withEmail = customers.filter((c) => c.email && c.email.trim());
    const now = Date.now();
    const ninetyDaysAgo = new Date(now - 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    switch (args.audience) {
      case "all":
        return withEmail.length;
      case "recent":
        return withEmail.filter(
          (c) => c.lastServiceDate && c.lastServiceDate >= ninetyDaysAgo,
        ).length;
      case "inactive":
        return withEmail.filter(
          (c) => !c.lastServiceDate || c.lastServiceDate < ninetyDaysAgo,
        ).length;
      case "high_value": {
        const sorted = withEmail
          .filter((c) => (c.totalSpent || 0) > 0)
          .sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0));
        return Math.max(1, Math.ceil(sorted.length * 0.2));
      }
      default:
        return withEmail.length;
    }
  },
});

// ─── Create a new campaign (draft) ───────────────────────────────────────────
export const create = mutation({
  args: {
    name: v.string(),
    subject: v.string(),
    body: v.string(),
    templateType: TEMPLATE_VALIDATOR,
    audience: AUDIENCE_VALIDATOR,
    couponCode: v.optional(v.string()),
    couponAmount: v.optional(v.number()),
    couponPercent: v.optional(v.number()),
    couponExpiry: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("emailCampaigns", {
      ...args,
      status: "draft",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// ─── Update a draft campaign ─────────────────────────────────────────────────
export const update = mutation({
  args: {
    id: v.id("emailCampaigns"),
    name: v.optional(v.string()),
    subject: v.optional(v.string()),
    body: v.optional(v.string()),
    templateType: v.optional(TEMPLATE_VALIDATOR),
    audience: v.optional(AUDIENCE_VALIDATOR),
    couponCode: v.optional(v.string()),
    couponAmount: v.optional(v.number()),
    couponPercent: v.optional(v.number()),
    couponExpiry: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const campaign = await ctx.db.get(id);
    if (!campaign) throw new Error("Campaign not found");
    if (campaign.status !== "draft")
      throw new Error("Can only edit draft campaigns");

    await ctx.db.patch(id, { ...updates, updatedAt: Date.now() });
    return id;
  },
});

// ─── Delete a draft campaign ─────────────────────────────────────────────────
export const remove = mutation({
  args: { id: v.id("emailCampaigns") },
  handler: async (ctx, args) => {
    const campaign = await ctx.db.get(args.id);
    if (!campaign) throw new Error("Campaign not found");
    if (campaign.status === "sending")
      throw new Error("Cannot delete a campaign that is currently sending");

    // Delete associated sends
    const sends = await ctx.db
      .query("emailSends")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.id))
      .collect();
    for (const s of sends) {
      await ctx.db.delete(s._id);
    }
    await ctx.db.delete(args.id);
  },
});

// ─── Internal: Record a single email send result ─────────────────────────────
export const recordSend = internalMutation({
  args: {
    campaignId: v.id("emailCampaigns"),
    email: v.string(),
    customerName: v.string(),
    status: v.union(v.literal("sent"), v.literal("failed")),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("emailSends", {
      campaignId: args.campaignId,
      email: args.email,
      customerName: args.customerName,
      status: args.status,
      sentAt: Date.now(),
      error: args.error,
    });
  },
});

// ─── Internal: Update campaign status after sending ──────────────────────────
export const updateCampaignStatus = internalMutation({
  args: {
    id: v.id("emailCampaigns"),
    status: v.union(
      v.literal("sending"),
      v.literal("sent"),
      v.literal("failed"),
    ),
    totalSent: v.optional(v.number()),
    totalFailed: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = {
      status: args.status,
      updatedAt: Date.now(),
    };
    if (args.status === "sent" || args.status === "failed") {
      updates.sentAt = Date.now();
    }
    if (args.totalSent !== undefined) updates.totalSent = args.totalSent;
    if (args.totalFailed !== undefined) updates.totalFailed = args.totalFailed;
    await ctx.db.patch(args.id, updates);
  },
});

// ─── Send campaign action (runs in Node.js runtime) ──────────────────────────
export const sendCampaign = action({
  args: { id: v.id("emailCampaigns") },
  handler: async (ctx, args) => {
    // 1. Get campaign
    const campaign = await ctx.runQuery(
      internal.emailCampaigns.getInternal,
      { id: args.id },
    );
    if (!campaign) throw new Error("Campaign not found");
    if (campaign.status !== "draft")
      throw new Error("Can only send draft campaigns");

    // 2. Mark as sending
    await ctx.runMutation(internal.emailCampaigns.updateCampaignStatus, {
      id: args.id,
      status: "sending",
    });

    // 3. Get audience
    const allCustomers = await ctx.runQuery(
      internal.customers.listInternal,
      {},
    );
    const withEmail = allCustomers.filter(
      (c: { email?: string }) => c.email && c.email.trim(),
    );

    const now = Date.now();
    const ninetyDaysAgo = new Date(now - 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    let audience: typeof withEmail;
    switch (campaign.audience) {
      case "recent":
        audience = withEmail.filter(
          (c: { lastServiceDate?: string }) =>
            c.lastServiceDate && c.lastServiceDate >= ninetyDaysAgo,
        );
        break;
      case "inactive":
        audience = withEmail.filter(
          (c: { lastServiceDate?: string }) =>
            !c.lastServiceDate || c.lastServiceDate < ninetyDaysAgo,
        );
        break;
      case "high_value": {
        const sorted = withEmail
          .filter((c: { totalSpent?: number }) => (c.totalSpent || 0) > 0)
          .sort(
            (a: { totalSpent?: number }, b: { totalSpent?: number }) =>
              (b.totalSpent || 0) - (a.totalSpent || 0),
          );
        audience = sorted.slice(0, Math.max(1, Math.ceil(sorted.length * 0.2)));
        break;
      }
      default:
        audience = withEmail;
    }

    // 4. Send emails via Viktor Spaces API
    const apiUrl = process.env.VIKTOR_SPACES_API_URL;
    const projectName = process.env.VIKTOR_SPACES_PROJECT_NAME;
    const projectSecret = process.env.VIKTOR_SPACES_PROJECT_SECRET;

    if (!apiUrl || !projectName || !projectSecret) {
      await ctx.runMutation(internal.emailCampaigns.updateCampaignStatus, {
        id: args.id,
        status: "failed",
      });
      throw new Error("Email service not configured");
    }

    let sent = 0;
    let failed = 0;

    // Send in batches of 5 to avoid overwhelming the API
    for (let i = 0; i < audience.length; i += 5) {
      const batch = audience.slice(i, i + 5);
      const results = await Promise.allSettled(
        batch.map(async (customer: { email?: string; name: string }) => {
          const email = customer.email!;
          try {
            const response = await fetch(
              `${apiUrl}/api/viktor-spaces/send-email`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  project_name: projectName,
                  project_secret: projectSecret,
                  to_email: email,
                  subject: campaign.subject,
                  html_content: campaign.body,
                  text_content: campaign.subject, // fallback
                  email_type: "marketing",
                }),
              },
            );

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }

            const result = (await response.json()) as {
              success: boolean;
              error?: string;
            };
            if (!result.success) {
              throw new Error(result.error || "Send failed");
            }

            await ctx.runMutation(internal.emailCampaigns.recordSend, {
              campaignId: args.id,
              email,
              customerName: customer.name,
              status: "sent",
            });
            sent++;
          } catch (err: unknown) {
            const errorMsg =
              err instanceof Error ? err.message : "Unknown error";
            await ctx.runMutation(internal.emailCampaigns.recordSend, {
              campaignId: args.id,
              email,
              customerName: customer.name,
              status: "failed",
              error: errorMsg,
            });
            failed++;
          }
        }),
      );
    }

    // 5. Mark as sent
    await ctx.runMutation(internal.emailCampaigns.updateCampaignStatus, {
      id: args.id,
      status: "sent",
      totalSent: sent,
      totalFailed: failed,
    });

    return { sent, failed, total: audience.length };
  },
});
