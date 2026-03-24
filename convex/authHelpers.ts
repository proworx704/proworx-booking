/**
 * Authentication & Authorization Helpers
 * 
 * Usage in queries/mutations:
 *   await requireAuth(ctx);      // throws if not logged in
 *   await requireAdmin(ctx);     // throws if not owner/admin
 * 
 * Usage in actions (no DB access):
 *   await requireActionAuth(ctx); // throws if not logged in
 */
import { getAuthUserId } from "@convex-dev/auth/server";

type QueryMutationCtx = { db: any; auth: any };
type ActionCtx = { auth: any };

/** Require authentication for queries/mutations. Returns userId. */
export async function requireAuth(ctx: QueryMutationCtx): Promise<string> {
  const userId = await getAuthUserId(ctx as any);
  if (!userId) {
    throw new Error("Authentication required");
  }
  return userId as string;
}

/** Require admin/owner role for queries/mutations. Returns userId + profile. */
export async function requireAdmin(ctx: QueryMutationCtx) {
  const userId = await requireAuth(ctx);
  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();

  if (!profile || (profile.role !== "owner" && profile.role !== "admin")) {
    throw new Error("Admin access required");
  }

  return { userId, profile };
}

/** Require owner role for queries/mutations. Returns userId + profile. */
export async function requireOwner(ctx: QueryMutationCtx) {
  const userId = await requireAuth(ctx);
  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();

  if (!profile || profile.role !== "owner") {
    throw new Error("Owner access required");
  }

  return { userId, profile };
}

/** Require authentication for actions (no DB access). */
export async function requireActionAuth(ctx: ActionCtx): Promise<void> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Authentication required");
  }
}
