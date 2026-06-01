/**
 * Team Invites — Send email/SMS invitations for employees to join the app.
 *
 * Flow:
 * 1. Admin creates invite (name, email/phone, role)
 * 2. System sends email and/or SMS with a signup link
 * 3. When the invitee signs up, initMyProfile auto-matches the invite by email
 *    and assigns the correct role
 */
import { v } from "convex/values";
import { mutation, query, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

declare const process: { env: Record<string, string | undefined> };

// ─── Queries ──────────────────────────────────────────────────────────────────

/** List all invites (admin only) */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!profile || (profile.role !== "owner" && profile.role !== "admin")) {
      throw new Error("Access denied");
    }

    const invites = await ctx.db.query("teamInvites").order("desc").collect();
    return invites;
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────────

/** Create a new team invite and trigger sending */
export const create = mutation({
  args: {
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    role: v.union(v.literal("admin"), v.literal("employee")),
    sendVia: v.union(v.literal("email"), v.literal("sms"), v.literal("both")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!profile || (profile.role !== "owner" && profile.role !== "admin")) {
      throw new Error("Access denied");
    }

    if (!args.email && !args.phone) {
      throw new Error("Please provide an email or phone number");
    }
    if ((args.sendVia === "email" || args.sendVia === "both") && !args.email) {
      throw new Error("Email is required to send via email");
    }
    if ((args.sendVia === "sms" || args.sendVia === "both") && !args.phone) {
      throw new Error("Phone number is required to send via text");
    }

    // Check for existing pending invite with same email
    if (args.email) {
      const existing = await ctx.db
        .query("teamInvites")
        .withIndex("by_email", (q) => q.eq("email", args.email))
        .filter((q) => q.eq(q.field("status"), "pending"))
        .first();
      if (existing) {
        throw new Error(`A pending invite already exists for ${args.email}`);
      }
    }

    // Generate invite token
    const token = generateToken();

    const inviteId = await ctx.db.insert("teamInvites", {
      name: args.name,
      email: args.email?.toLowerCase(),
      phone: args.phone,
      role: args.role,
      token,
      status: "pending",
      invitedBy: userId,
      sentVia: args.sendVia,
      createdAt: Date.now(),
    });

    // Schedule sending
    await ctx.scheduler.runAfter(0, internal.teamInvites.sendInviteNotifications, {
      inviteId,
    });

    return inviteId;
  },
});

/** Cancel a pending invite */
export const cancel = mutation({
  args: { id: v.id("teamInvites") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!profile || (profile.role !== "owner" && profile.role !== "admin")) {
      throw new Error("Access denied");
    }

    const invite = await ctx.db.get(id);
    if (!invite || invite.status !== "pending") {
      throw new Error("Invite not found or not pending");
    }

    await ctx.db.patch(id, { status: "cancelled" });
  },
});

/** Resend invite notifications */
export const resend = mutation({
  args: { id: v.id("teamInvites") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!profile || (profile.role !== "owner" && profile.role !== "admin")) {
      throw new Error("Access denied");
    }

    const invite = await ctx.db.get(id);
    if (!invite || invite.status !== "pending") {
      throw new Error("Invite not found or not pending");
    }

    await ctx.scheduler.runAfter(0, internal.teamInvites.sendInviteNotifications, {
      inviteId: id,
    });
  },
});

// ─── Internal: mark invite as accepted (called from initMyProfile) ───────────

export const markAccepted = internalMutation({
  args: {
    inviteId: v.id("teamInvites"),
    userId: v.id("users"),
  },
  handler: async (ctx, { inviteId, userId }) => {
    await ctx.db.patch(inviteId, {
      status: "accepted",
      acceptedBy: userId,
      acceptedAt: Date.now(),
    });
  },
});

// ─── Internal: find pending invite by email ──────────────────────────────────

export const findPendingByEmail = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return await ctx.db
      .query("teamInvites")
      .withIndex("by_email", (q) => q.eq("email", email.toLowerCase()))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();
  },
});

// ─── Internal: send invite email/SMS ─────────────────────────────────────────

export const sendInviteNotifications = internalAction({
  args: { inviteId: v.id("teamInvites") },
  handler: async (ctx, { inviteId }) => {
    const invite = await ctx.runQuery(internal.teamInvites.getInternal, { id: inviteId });
    if (!invite || invite.status !== "pending") return;

    const appUrl = process.env.VITE_APP_URL || "https://book.proworxdetailing.com";
    const signupUrl = `${appUrl}/login`;

    const roleName = invite.role === "admin" ? "Admin" : "Employee";

    // Send email
    if ((invite.sentVia === "email" || invite.sentVia === "both") && invite.email) {
      await sendInviteEmail(invite.email, invite.name, roleName, signupUrl);
    }

    // Send SMS
    if ((invite.sentVia === "sms" || invite.sentVia === "both") && invite.phone) {
      await sendInviteSms(invite.phone, invite.name, signupUrl);
    }
  },
});

/** Internal query to get invite data from action */
export const getInternal = internalQuery({
  args: { id: v.id("teamInvites") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateToken(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let token = "";
  const array = new Uint32Array(16);
  crypto.getRandomValues(array);
  for (let i = 0; i < 16; i++) {
    token += chars[array[i] % chars.length];
  }
  return token;
}

async function sendInviteEmail(
  to: string,
  name: string,
  roleName: string,
  signupUrl: string,
): Promise<boolean> {
  const apiUrl = process.env.VIKTOR_SPACES_API_URL;
  const projectName = process.env.VIKTOR_SPACES_PROJECT_NAME;
  const projectSecret = process.env.VIKTOR_SPACES_PROJECT_SECRET;
  if (!apiUrl || !projectName || !projectSecret) {
    console.error("[invite] Viktor Spaces env vars missing");
    return false;
  }
  try {
    const subject = "You're invited to join ProWorx Detailing";
    const body = `Hi ${name.split(" ")[0]},\n\nYou've been invited to join **ProWorx Mobile Detailing** as an **${roleName}**.\n\nTo get started, create your account here:\n\n👉 **${signupUrl}**\n\nSign up using this email address (**${to}**) so your account is automatically linked.\n\nQuestions? Contact us at (980) 272-1903.\n\n— ProWorx Mobile Detailing`;

    const resp = await fetch(`${apiUrl}/api/viktor-spaces/tools/call`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_name: projectName,
        project_secret: projectSecret,
        role: "coworker_send_email",
        arguments: {
          to: [to],
          subject,
          body,
        },
      }),
    });
    if (!resp.ok) {
      console.error(`[invite] Email HTTP ${resp.status}: ${await resp.text()}`);
      return false;
    }
    const json = (await resp.json()) as { success: boolean; result?: { success: boolean }; error?: string };
    if (!json.success || !json.result?.success) {
      console.error(`[invite] Email API error: ${json.error}`);
      return false;
    }
    console.log(`[invite] ✉️ Invite email sent to ${to}`);
    return true;
  } catch (err) {
    console.error("[invite] Email exception:", err);
    return false;
  }
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

async function sendInviteSms(
  to: string,
  name: string,
  signupUrl: string,
): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!sid || !token || !from) {
    console.warn("[invite] Twilio not configured — SMS skipped");
    return false;
  }
  const toE164 = normalizePhone(to);
  const body = `Hi ${name.split(" ")[0]}! You're invited to join ProWorx Detailing. Create your account here: ${signupUrl} — Sign up with this phone number so your account is linked.`;
  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: toE164, From: from, Body: body }).toString(),
    });
    if (!resp.ok) {
      console.error(`[invite] SMS HTTP ${resp.status}: ${await resp.text()}`);
      return false;
    }
    console.log(`[invite] 📱 Invite SMS sent to ${toE164}`);
    return true;
  } catch (err) {
    console.error("[invite] SMS exception:", err);
    return false;
  }
}
