import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireAdmin } from "./authHelpers";

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Get current user's profile (role, linked staff/worker) */
export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const user = await ctx.db.get(userId);

    return {
      userId,
      email: user?.email,
      name: user?.name,
      profile,
      role: profile?.role ?? null, // null = no profile yet (new signup)
    };
  },
});

/** List all user profiles (admin only) */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if caller is owner/admin
    const callerProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!callerProfile || (callerProfile.role !== "owner" && callerProfile.role !== "admin")) {
      throw new Error("Access denied");
    }

    const profiles = await ctx.db.query("userProfiles").collect();

    // Enrich with user email
    const enriched = await Promise.all(
      profiles.map(async (p) => {
        const user = await ctx.db.get(p.userId);
        const staff = p.staffId ? await ctx.db.get(p.staffId) : null;
        const worker = p.payrollWorkerId ? await ctx.db.get(p.payrollWorkerId) : null;
        return {
          ...p,
          email: user?.email,
          userName: user?.name,
          staffName: staff?.name,
          workerName: worker?.name,
        };
      }),
    );

    return enriched;
  },
});

/** Get profile by userId (admin only) */
export const getByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    // Admin only
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) throw new Error("Authentication required");
    return await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────────

/** Create or update a user profile (admin only, or self-init for new signups) */
export const upsert = mutation({
  args: {
    targetUserId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("admin"), v.literal("employee")),
    displayName: v.string(),
    staffId: v.optional(v.id("staff")),
    payrollWorkerId: v.optional(v.id("payrollWorkers")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if caller is owner/admin (unless creating their own first profile)
    const callerProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const isAdmin = callerProfile?.role === "owner" || callerProfile?.role === "admin";
    const isSelf = args.targetUserId === userId;

    // Allow: admin creating any profile, OR first-time self-registration as employee
    if (!isAdmin && !isSelf) {
      throw new Error("Access denied");
    }
    // Non-admins can only self-register as employee
    if (!isAdmin && isSelf && args.role !== "employee") {
      throw new Error("Cannot self-assign admin role");
    }

    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.targetUserId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        role: args.role,
        displayName: args.displayName,
        staffId: args.staffId,
        payrollWorkerId: args.payrollWorkerId,
      });
      return existing._id;
    }

    return await ctx.db.insert("userProfiles", {
      userId: args.targetUserId,
      role: args.role,
      displayName: args.displayName,
      staffId: args.staffId,
      payrollWorkerId: args.payrollWorkerId,
    });
  },
});

/** Delete a user profile (admin only) */
export const remove = mutation({
  args: { id: v.id("userProfiles") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const callerProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!callerProfile || callerProfile.role !== "owner") {
      throw new Error("Only owners can delete profiles");
    }

    await ctx.db.delete(id);
  },
});

/** List all registered users (for admin to assign roles) */
export const listAllUsers = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const callerProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!callerProfile || (callerProfile.role !== "owner" && callerProfile.role !== "admin")) {
      throw new Error("Access denied");
    }

    const allUsers = await ctx.db.query("users").collect();
    const allProfiles = await ctx.db.query("userProfiles").collect();

    const profileMap = new Map(allProfiles.map((p) => [p.userId as string, p]));

    return allUsers.map((user) => ({
      userId: user._id,
      email: user.email,
      name: user.name,
      profile: profileMap.get(user._id as string) ?? null,
    }));
  },
});

/**
 * Auto-initialize profile on first login.
 *
 * • Owner emails (Tyler's accounts) → always "owner".
 * • Everyone else → "employee" (restricted to employee portal).
 * • If the caller already has a profile → no-op.
 *
 * Admins can later promote employees via the Team Management page.
 */
const OWNER_EMAILS = ["tyler@proworxdetailing.com", "detailing@proworxdetailing.com"];

export const initMyProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // Already has a profile? Check if it needs payroll/staff linking.
    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      // Auto-link payroll worker + staff if missing
      if (!existing.payrollWorkerId || !existing.staffId) {
        const user = await ctx.db.get(userId);
        const email = (user?.email ?? "").toLowerCase();
        const patch: Record<string, unknown> = {};

        if (!existing.payrollWorkerId) {
          // Try to find existing payroll worker by email
          let worker = email
            ? await ctx.db
                .query("payrollWorkers")
                .withIndex("by_email", (q: any) => q.eq("email", email))
                .first()
            : null;
          if (!worker) {
            // Auto-create a payroll worker for this employee
            const workerId = await ctx.db.insert("payrollWorkers", {
              name: existing.displayName || email.split("@")[0] || "Team Member",
              hourlyRate: 0, // Admin sets this later
              email: email || undefined,
              isActive: true,
            });
            worker = await ctx.db.get(workerId);
            patch.payrollWorkerId = workerId;
          } else {
            patch.payrollWorkerId = worker._id;
          }
        }

        if (!existing.staffId) {
          // Try to find existing staff by email
          const allStaff = await ctx.db.query("staff").collect();
          const user = await ctx.db.get(userId);
          const email = (user?.email ?? "").toLowerCase();
          const matchedStaff = allStaff.find(
            (s: any) => (s.email ?? "").toLowerCase() === email && email !== "",
          );
          if (matchedStaff) {
            patch.staffId = matchedStaff._id;
          }
        }

        if (Object.keys(patch).length > 0) {
          await ctx.db.patch(existing._id, patch);
        }
      }
      return existing;
    }

    const user = await ctx.db.get(userId);
    const email = (user?.email ?? "").toLowerCase();

    // Only specific owner emails get admin access. Everyone else is employee.
    const role = OWNER_EMAILS.includes(email) ? "owner" : "employee";
    const displayName = user?.name || email.split("@")[0] || "Team Member";

    // For employees, auto-link or create payroll worker + match staff
    let payrollWorkerId: unknown = undefined;
    let staffId: unknown = undefined;

    if (role === "employee") {
      // Try to find existing payroll worker by email
      let worker = email
        ? await ctx.db
            .query("payrollWorkers")
            .withIndex("by_email", (q: any) => q.eq("email", email))
            .first()
        : null;
      if (!worker) {
        // Auto-create one
        const wId = await ctx.db.insert("payrollWorkers", {
          name: displayName,
          hourlyRate: 0, // Admin sets this later
          email: email || undefined,
          isActive: true,
        });
        payrollWorkerId = wId;
      } else {
        payrollWorkerId = worker._id;
      }

      // Try to match a staff record by email
      const allStaff = await ctx.db.query("staff").collect();
      const matchedStaff = allStaff.find(
        (s: any) => (s.email ?? "").toLowerCase() === email && email !== "",
      );
      if (matchedStaff) {
        staffId = matchedStaff._id;
      }
    }

    const profileData: Record<string, unknown> = {
      userId,
      role,
      displayName,
    };
    if (payrollWorkerId) profileData.payrollWorkerId = payrollWorkerId;
    if (staffId) profileData.staffId = staffId;

    const profileId = await ctx.db.insert("userProfiles", profileData as any);

    return { _id: profileId, userId, role, displayName };
  },
});

/** Quick helper: set role for a user by email (used for seeding) */
export const setRoleByEmail = mutation({
  args: {
    email: v.string(),
    role: v.union(v.literal("owner"), v.literal("admin"), v.literal("employee")),
    displayName: v.string(),
  },
  handler: async (ctx, { email, role, displayName }) => {
    // Only owners can set roles
    await requireAdmin(ctx);
    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();

    if (!user) {
      return { success: false, error: `No user found with email ${email}` };
    }

    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { role, displayName });
      return { success: true, action: "updated", profileId: existing._id };
    }

    const id = await ctx.db.insert("userProfiles", {
      userId: user._id,
      role,
      displayName,
    });
    return { success: true, action: "created", profileId: id };
  },
});
