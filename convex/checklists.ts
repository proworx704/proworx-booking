import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, requireAdmin } from "./authHelpers";

// ── Queries ─────────────────────────────────────────────────────────────

/** List all active checklist templates */
export const listTemplates = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    const templates = await ctx.db.query("checklistTemplates").collect();
    return templates
      .filter((t) => t.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

/** List all templates including inactive (admin) */
export const listAllTemplates = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const templates = await ctx.db.query("checklistTemplates").collect();
    return templates.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

/** Get a single template */
export const getTemplate = query({
  args: { templateId: v.id("checklistTemplates") },
  handler: async (ctx, { templateId }) => {
    await requireAuth(ctx);
    return await ctx.db.get(templateId);
  },
});

/** List submissions — admin sees all, employee sees own */
export const listSubmissions = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("rejected")
      )
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { status, limit }) => {
    const userId = await requireAuth(ctx);

    // Get user profile to check role
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .first();

    let subs;
    if (status) {
      subs = await ctx.db
        .query("checklistSubmissions")
        .withIndex("by_status", (q) => q.eq("status", status))
        .order("desc")
        .collect();
    } else {
      subs = await ctx.db
        .query("checklistSubmissions")
        .order("desc")
        .collect();
    }

    // Employees only see their own
    const isAdmin =
      profile?.role === "owner" || profile?.role === "admin";
    if (!isAdmin) {
      subs = subs.filter((s) => s.submittedBy === userId);
    }

    if (limit) {
      subs = subs.slice(0, limit);
    }

    return subs;
  },
});

/** Get a single submission with images */
export const getSubmission = query({
  args: { submissionId: v.id("checklistSubmissions") },
  handler: async (ctx, { submissionId }) => {
    const userId = await requireAuth(ctx);
    const sub = await ctx.db.get(submissionId);
    if (!sub) return null;

    // Get user profile to check role
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .first();

    const isAdmin =
      profile?.role === "owner" || profile?.role === "admin";

    // Employees can only view own
    if (!isAdmin && sub.submittedBy !== userId) return null;

    // Get images
    const images = await ctx.db
      .query("checklistImages")
      .withIndex("by_submissionId", (q) =>
        q.eq("submissionId", submissionId)
      )
      .collect();

    // Get URLs for images
    const imagesWithUrls = await Promise.all(
      images.map(async (img) => ({
        ...img,
        url: await ctx.storage.getUrl(img.storageId),
      }))
    );

    // Get template for reference
    const template = await ctx.db.get(sub.templateId);

    return { ...sub, images: imagesWithUrls, template };
  },
});

/** Dashboard stats for admin */
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const all = await ctx.db.query("checklistSubmissions").collect();

    const pending = all.filter((s) => s.status === "pending").length;
    const approved = all.filter((s) => s.status === "approved").length;
    const rejected = all.filter((s) => s.status === "rejected").length;
    const total = all.length;

    // This week
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const thisWeek = all.filter(
      (s) => new Date(s.createdAt) >= weekStart
    ).length;

    return { pending, approved, rejected, total, thisWeek };
  },
});

// ── Mutations ───────────────────────────────────────────────────────────

/** Create a new checklist submission */
export const createSubmission = mutation({
  args: {
    templateId: v.id("checklistTemplates"),
    customerName: v.string(),
    vehicleYear: v.optional(v.string()),
    vehicleMake: v.string(),
    vehicleModel: v.string(),
    vehicleColor: v.optional(v.string()),
    licensePlate: v.optional(v.string()),
    jobDate: v.string(),
    notes: v.optional(v.string()),
    responses: v.array(
      v.object({
        sectionIndex: v.number(),
        itemIndex: v.number(),
        checked: v.boolean(),
        passFail: v.optional(
          v.union(
            v.literal("pass"),
            v.literal("fail"),
            v.literal("na")
          )
        ),
        note: v.optional(v.string()),
      })
    ),
    overallResult: v.union(v.literal("pass"), v.literal("fail")),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    // Get template info
    const template = await ctx.db.get(args.templateId);
    if (!template) throw new Error("Template not found");

    // Get user profile for name and staffId
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .first();

    const userName = profile?.displayName || "Unknown";

    const submissionId = await ctx.db.insert("checklistSubmissions", {
      templateId: args.templateId,
      templateName: template.name,
      submittedBy: userId,
      submittedByName: userName,
      staffId: profile?.staffId ?? undefined,
      customerName: args.customerName,
      vehicleYear: args.vehicleYear,
      vehicleMake: args.vehicleMake,
      vehicleModel: args.vehicleModel,
      vehicleColor: args.vehicleColor,
      licensePlate: args.licensePlate,
      jobDate: args.jobDate,
      notes: args.notes,
      responses: args.responses,
      overallResult: args.overallResult,
      status: "pending",
      createdAt: new Date().toISOString(),
    });

    return submissionId;
  },
});

/** Approve or reject a submission (admin only) */
export const reviewSubmission = mutation({
  args: {
    submissionId: v.id("checklistSubmissions"),
    decision: v.union(v.literal("approved"), v.literal("rejected")),
    reviewNotes: v.optional(v.string()),
  },
  handler: async (ctx, { submissionId, decision, reviewNotes }) => {
    const { userId, profile } = await requireAdmin(ctx);
    const sub = await ctx.db.get(submissionId);
    if (!sub) throw new Error("Not found");

    const reviewerName = profile?.displayName || "Admin";

    await ctx.db.patch(submissionId, {
      status: decision,
      reviewedBy: userId,
      reviewedByName: reviewerName,
      reviewedAt: new Date().toISOString(),
      reviewNotes,
    });
  },
});

/** Generate upload URL for checklist images */
export const generateImageUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/** Save an uploaded image linked to a submission */
export const saveChecklistImage = mutation({
  args: {
    submissionId: v.id("checklistSubmissions"),
    storageId: v.string(),
    type: v.union(v.literal("before"), v.literal("after")),
    caption: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const sub = await ctx.db.get(args.submissionId);
    if (!sub) throw new Error("Not found");

    await ctx.db.insert("checklistImages", {
      submissionId: args.submissionId,
      storageId: args.storageId,
      type: args.type,
      caption: args.caption,
      uploadedBy: userId,
      createdAt: new Date().toISOString(),
    });
  },
});

/** Delete a checklist image */
export const deleteChecklistImage = mutation({
  args: { imageId: v.id("checklistImages") },
  handler: async (ctx, { imageId }) => {
    const userId = await requireAuth(ctx);
    const img = await ctx.db.get(imageId);
    if (!img) throw new Error("Not found");

    // Get profile to check if admin
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .first();

    const isAdmin =
      profile?.role === "owner" || profile?.role === "admin";

    // Only author or admin can delete
    if (!isAdmin && img.uploadedBy !== userId) {
      throw new Error("Permission denied");
    }

    await ctx.storage.delete(img.storageId);
    await ctx.db.delete(imageId);
  },
});

// ── Admin Template Management ───────────────────────────────────────────

/** Upsert a checklist template */
export const upsertTemplate = mutation({
  args: {
    serviceType: v.string(),
    name: v.string(),
    sections: v.array(
      v.object({
        title: v.string(),
        items: v.array(
          v.object({
            label: v.string(),
            type: v.union(v.literal("check"), v.literal("passfail")),
          })
        ),
      })
    ),
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const now = new Date().toISOString();

    // Check if template already exists for this service type
    const existing = await ctx.db
      .query("checklistTemplates")
      .withIndex("by_serviceType", (q) =>
        q.eq("serviceType", args.serviceType)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        sections: args.sections,
        sortOrder: args.sortOrder,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("checklistTemplates", {
      name: args.name,
      serviceType: args.serviceType,
      sections: args.sections,
      isActive: true,
      sortOrder: args.sortOrder,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/** Toggle template active status */
export const toggleTemplate = mutation({
  args: { templateId: v.id("checklistTemplates") },
  handler: async (ctx, { templateId }) => {
    await requireAdmin(ctx);
    const template = await ctx.db.get(templateId);
    if (!template) throw new Error("Not found");
    await ctx.db.patch(templateId, {
      isActive: !template.isActive,
      updatedAt: new Date().toISOString(),
    });
  },
});
