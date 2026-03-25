import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { requireAdmin, requireAuth } from "./authHelpers";
import type { Id } from "./_generated/dataModel";

// ─── Settings ────────────────────────────────────────────────────────────────

export const getSettings = query({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db.query("loyaltySettings").first();
    return settings || {
      pointsPerDollar: 1,
      programName: "ProWorx Rewards",
      isEnabled: true,
      expirationEnabled: false,
      expirationDays: 365,
      expirationWarningDays: 30,
      minSpendForPoints: 0,
      roundingMode: "floor",
      minPointsToRedeem: 0,
      maxRedemptionPercent: 100,
      allowPartialRedemption: false,
      clientPortalEnabled: true,
      showPointsOnBooking: true,
    };
  },
});

export const updateSettings = mutation({
  args: {
    pointsPerDollar: v.number(),
    programName: v.string(),
    isEnabled: v.boolean(),
    expirationEnabled: v.optional(v.boolean()),
    expirationDays: v.optional(v.number()),
    expirationWarningDays: v.optional(v.number()),
    minSpendForPoints: v.optional(v.number()),
    roundingMode: v.optional(v.string()),
    minPointsToRedeem: v.optional(v.number()),
    maxRedemptionPercent: v.optional(v.number()),
    allowPartialRedemption: v.optional(v.boolean()),
    clientPortalEnabled: v.optional(v.boolean()),
    showPointsOnBooking: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.query("loyaltySettings").first();
    if (existing) {
      await ctx.db.patch(existing._id, args);
    } else {
      await ctx.db.insert("loyaltySettings", args);
    }
  },
});

/** Expire old points based on expiration settings (admin action / cron) */
export const expirePoints = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const settings = await ctx.db.query("loyaltySettings").first();
    if (!settings?.expirationEnabled || !settings.expirationDays) return { expired: 0 };

    const cutoffMs = Date.now() - settings.expirationDays * 24 * 60 * 60 * 1000;

    // Find all "earn" and "bonus" transactions older than the cutoff
    // that haven't been marked as expired
    const allTxns = await ctx.db.query("loyaltyTransactions").collect();
    const earningTxns = allTxns.filter(
      (t) =>
        (t.type === "earn" || t.type === "bonus") &&
        t._creationTime < cutoffMs &&
        !t.expired,
    );

    let totalExpired = 0;

    // Group by account
    const byAccount = new Map<string, typeof earningTxns>();
    for (const txn of earningTxns) {
      const key = txn.loyaltyAccountId as string;
      if (!byAccount.has(key)) byAccount.set(key, []);
      byAccount.get(key)!.push(txn);
    }

    for (const [accountId, txns] of byAccount) {
      const account = await ctx.db.get(accountId as any);
      if (!account) continue;

      let pointsToExpire = 0;
      for (const txn of txns) {
        pointsToExpire += txn.points;
        // Mark as expired
        await ctx.db.patch(txn._id, { expired: true } as any);
      }

      // Can't expire more than they have
      pointsToExpire = Math.min(pointsToExpire, (account as any).currentPoints);

      if (pointsToExpire > 0) {
        await ctx.db.insert("loyaltyTransactions", {
          loyaltyAccountId: accountId as any,
          customerId: (account as any).customerId,
          type: "expire",
          points: -pointsToExpire,
          description: `Points expired (${settings.expirationDays}-day policy)`,
        });

        await ctx.db.patch(accountId as any, {
          currentPoints: (account as any).currentPoints - pointsToExpire,
        });

        totalExpired += pointsToExpire;
      }
    }

    return { expired: totalExpired };
  },
});

// ─── Account Management ──────────────────────────────────────────────────────

/** Get or create a loyalty account for a customer */
async function getOrCreateAccount(ctx: any, customerId: Id<"customers">) {
  const existing = await ctx.db
    .query("loyaltyAccounts")
    .withIndex("by_customer", (q: any) => q.eq("customerId", customerId))
    .first();
  if (existing) return existing;

  const id = await ctx.db.insert("loyaltyAccounts", {
    customerId,
    currentPoints: 0,
    lifetimeEarned: 0,
    lifetimeRedeemed: 0,
  });
  return await ctx.db.get(id);
}

/** Get loyalty account for a customer (admin view) */
export const getAccount = query({
  args: { customerId: v.id("customers") },
  handler: async (ctx, { customerId }) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("loyaltyAccounts")
      .withIndex("by_customer", (q) => q.eq("customerId", customerId))
      .first();
  },
});

/** Get my loyalty account (client view) */
export const getMyAccount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId as Id<"users">))
      .first();
    if (!profile?.customerId) return null;

    return await ctx.db
      .query("loyaltyAccounts")
      .withIndex("by_customer", (q) => q.eq("customerId", profile.customerId!))
      .first();
  },
});

/** Get transactions for a customer (admin view) */
export const getTransactions = query({
  args: { customerId: v.id("customers") },
  handler: async (ctx, { customerId }) => {
    await requireAdmin(ctx);
    const txns = await ctx.db
      .query("loyaltyTransactions")
      .withIndex("by_customer", (q) => q.eq("customerId", customerId))
      .collect();
    return txns.sort((a, b) => b._creationTime - a._creationTime);
  },
});

/** Get my transactions (client view) */
export const getMyTransactions = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId as Id<"users">))
      .first();
    if (!profile?.customerId) return [];

    const txns = await ctx.db
      .query("loyaltyTransactions")
      .withIndex("by_customer", (q) => q.eq("customerId", profile.customerId!))
      .collect();
    return txns.sort((a, b) => b._creationTime - a._creationTime);
  },
});

/** Get my bookings (client view) */
export const getMyBookings = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId as Id<"users">))
      .first();
    if (!profile?.customerId) return [];

    const customer = await ctx.db.get(profile.customerId!);
    if (!customer) return [];

    // Find bookings by customerId or email
    const byId = await ctx.db
      .query("bookings")
      .filter((q) => q.eq(q.field("customerId"), profile.customerId))
      .collect();

    let byEmail: typeof byId = [];
    if (customer.email) {
      byEmail = await ctx.db
        .query("bookings")
        .withIndex("by_email", (q) => q.eq("customerEmail", customer.email!))
        .collect();
    }

    // Merge and deduplicate
    const seen = new Set<string>();
    const merged = [];
    for (const b of [...byId, ...byEmail]) {
      if (!seen.has(b._id)) {
        seen.add(b._id);
        merged.push(b);
      }
    }
    return merged.sort((a, b) => b.date.localeCompare(a.date));
  },
});

/** Get my customer profile (client view) */
export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId as Id<"users">))
      .first();
    if (!profile?.customerId) return null;
    return await ctx.db.get(profile.customerId!);
  },
});

// ─── Earn Points ─────────────────────────────────────────────────────────────

/** Award points for a completed booking (admin action) */
export const awardPoints = mutation({
  args: {
    customerId: v.id("customers"),
    bookingId: v.optional(v.id("bookings")),
    amountCents: v.number(), // The amount in cents the customer paid
    description: v.optional(v.string()),
  },
  handler: async (ctx, { customerId, bookingId, amountCents, description }) => {
    await requireAdmin(ctx);

    const settings = await ctx.db.query("loyaltySettings").first();
    const pointsPerDollar = settings?.pointsPerDollar ?? 1;

    // Base points: 1pt per $1 (or configured rate)
    const dollars = Math.floor(amountCents / 100);

    // Check minimum spend
    if (settings?.minSpendForPoints && amountCents < settings.minSpendForPoints) {
      return { basePoints: 0, bonusTotal: 0, totalEarned: 0 };
    }

    let basePoints = dollars * pointsPerDollar;

    // Apply rounding mode
    const roundMode = settings?.roundingMode || "floor";
    if (roundMode === "round") basePoints = Math.round(dollars * pointsPerDollar);
    else if (roundMode === "ceil") basePoints = Math.ceil(dollars * pointsPerDollar);

    const account = await getOrCreateAccount(ctx, customerId);

    // Calculate expiration timestamp if enabled
    const expiresAt = settings?.expirationEnabled && settings?.expirationDays
      ? Date.now() + settings.expirationDays * 24 * 60 * 60 * 1000
      : undefined;

    // Record base earning
    if (basePoints > 0) {
      await ctx.db.insert("loyaltyTransactions", {
        loyaltyAccountId: account._id,
        customerId,
        type: "earn",
        points: basePoints,
        description: description || `Earned from $${dollars} service`,
        bookingId,
        expiresAt,
      });
    }

    // Check for active amplifiers
    let bonusTotal = 0;
    const today = new Date().toISOString().split("T")[0];
    const dayOfWeek = new Date().getDay();

    const amplifiers = await ctx.db
      .query("loyaltyAmplifiers")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Get booking details for service category matching
    let bookingCategory: string | undefined;
    if (bookingId) {
      const booking = await ctx.db.get(bookingId);
      if (booking?.catalogItemId) {
        const catalogItem = await ctx.db.get(booking.catalogItemId);
        if (catalogItem) bookingCategory = catalogItem.category;
      }
    }

    for (const amp of amplifiers) {
      // Check date range
      if (amp.startDate > today || amp.endDate < today) continue;

      // Check day of week condition
      if (amp.daysOfWeek && amp.daysOfWeek.length > 0 && !amp.daysOfWeek.includes(dayOfWeek)) continue;

      // Check service category condition
      if (amp.serviceCategories && amp.serviceCategories.length > 0) {
        if (!bookingCategory || !amp.serviceCategories.includes(bookingCategory)) continue;
      }

      // Check minimum spend
      if (amp.minSpendCents && amountCents < amp.minSpendCents) continue;

      // Apply amplifier
      let bonusPoints = 0;
      if (amp.amplifierType === "multiplier" && amp.multiplier) {
        // Multiplier: extra points = base * (multiplier - 1)
        bonusPoints = Math.floor(basePoints * (amp.multiplier - 1));
      } else if (amp.amplifierType === "bonus" && amp.bonusPoints) {
        bonusPoints = amp.bonusPoints;
      }

      if (bonusPoints > 0) {
        await ctx.db.insert("loyaltyTransactions", {
          loyaltyAccountId: account._id,
          customerId,
          type: "bonus",
          points: bonusPoints,
          description: `${amp.name} bonus`,
          bookingId,
          amplifierId: amp._id,
          expiresAt,
        });
        bonusTotal += bonusPoints;
      }
    }

    const totalEarned = basePoints + bonusTotal;

    // Update account balance
    await ctx.db.patch(account._id, {
      currentPoints: account.currentPoints + totalEarned,
      lifetimeEarned: account.lifetimeEarned + totalEarned,
      lastEarnedAt: Date.now(),
    });

    return { basePoints, bonusTotal, totalEarned };
  },
});

/** Redeem points for a reward (admin action) */
export const redeemPoints = mutation({
  args: {
    customerId: v.id("customers"),
    rewardId: v.id("loyaltyRewards"),
    bookingId: v.optional(v.id("bookings")),
  },
  handler: async (ctx, { customerId, rewardId, bookingId }) => {
    await requireAdmin(ctx);

    const reward = await ctx.db.get(rewardId);
    if (!reward || !reward.isActive) throw new Error("Reward not available");

    const account = await ctx.db
      .query("loyaltyAccounts")
      .withIndex("by_customer", (q) => q.eq("customerId", customerId))
      .first();
    if (!account) throw new Error("No loyalty account found");
    if (account.currentPoints < reward.pointsCost) {
      throw new Error(`Not enough points. Need ${reward.pointsCost}, have ${account.currentPoints}`);
    }

    // Deduct points
    await ctx.db.insert("loyaltyTransactions", {
      loyaltyAccountId: account._id,
      customerId,
      type: "redeem",
      points: -reward.pointsCost,
      description: `Redeemed: ${reward.name}`,
      rewardId,
      bookingId,
    });

    await ctx.db.patch(account._id, {
      currentPoints: account.currentPoints - reward.pointsCost,
      lifetimeRedeemed: account.lifetimeRedeemed + reward.pointsCost,
      lastRedeemedAt: Date.now(),
    });

    // Increment reward redemption counter
    await ctx.db.patch(rewardId, {
      totalRedemptions: reward.totalRedemptions + 1,
    });

    return { pointsDeducted: reward.pointsCost, newBalance: account.currentPoints - reward.pointsCost };
  },
});

/** Manual point adjustment (admin) */
export const adjustPoints = mutation({
  args: {
    customerId: v.id("customers"),
    points: v.number(), // positive to add, negative to subtract
    reason: v.string(),
  },
  handler: async (ctx, { customerId, points, reason }) => {
    const { profile } = await requireAdmin(ctx);

    const account = await getOrCreateAccount(ctx, customerId);

    const newBalance = account.currentPoints + points;
    if (newBalance < 0) throw new Error("Cannot reduce below 0");

    await ctx.db.insert("loyaltyTransactions", {
      loyaltyAccountId: account._id,
      customerId,
      type: "adjust",
      points,
      description: reason,
      createdBy: profile.displayName,
    });

    await ctx.db.patch(account._id, {
      currentPoints: newBalance,
      lifetimeEarned: points > 0 ? account.lifetimeEarned + points : account.lifetimeEarned,
      lifetimeRedeemed: points < 0 ? account.lifetimeRedeemed + Math.abs(points) : account.lifetimeRedeemed,
      ...(points > 0 ? { lastEarnedAt: Date.now() } : { lastRedeemedAt: Date.now() }),
    });

    return { newBalance };
  },
});

// ─── Dashboard Stats (Admin) ─────────────────────────────────────────────────

export const dashboardStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const accounts = await ctx.db.query("loyaltyAccounts").collect();
    const rewards = await ctx.db.query("loyaltyRewards").collect();
    const amplifiers = await ctx.db.query("loyaltyAmplifiers").collect();

    const totalMembers = accounts.length;
    const totalPointsOutstanding = accounts.reduce((s, a) => s + a.currentPoints, 0);
    const totalLifetimeEarned = accounts.reduce((s, a) => s + a.lifetimeEarned, 0);
    const totalLifetimeRedeemed = accounts.reduce((s, a) => s + a.lifetimeRedeemed, 0);

    // Top 10 customers by points
    const topCustomers = accounts
      .sort((a, b) => b.currentPoints - a.currentPoints)
      .slice(0, 10);

    // Resolve customer names
    const topWithNames = await Promise.all(
      topCustomers.map(async (a) => {
        const customer = await ctx.db.get(a.customerId);
        return {
          ...a,
          customerName: customer?.name || "Unknown",
          customerEmail: customer?.email,
        };
      }),
    );

    const activeRewards = rewards.filter((r) => r.isActive).length;
    const today = new Date().toISOString().split("T")[0];
    const activeAmplifiers = amplifiers.filter(
      (a) => a.isActive && a.startDate <= today && a.endDate >= today,
    ).length;

    return {
      totalMembers,
      totalPointsOutstanding,
      totalLifetimeEarned,
      totalLifetimeRedeemed,
      activeRewards,
      activeAmplifiers,
      topCustomers: topWithNames,
    };
  },
});

// ─── Rewards CRUD (Admin) ────────────────────────────────────────────────────

export const listRewards = query({
  args: {},
  handler: async (ctx) => {
    // Accessible to all authenticated users (clients can see available rewards)
    const rewards = await ctx.db.query("loyaltyRewards").collect();
    return rewards.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

export const createReward = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    pointsCost: v.number(),
    rewardType: v.union(
      v.literal("discount_fixed"),
      v.literal("discount_percent"),
      v.literal("free_service"),
      v.literal("custom"),
    ),
    discountAmount: v.optional(v.number()),
    discountPercent: v.optional(v.number()),
    icon: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.insert("loyaltyRewards", {
      ...args,
      isActive: true,
      sortOrder: args.sortOrder ?? 0,
      totalRedemptions: 0,
    });
  },
});

export const updateReward = mutation({
  args: {
    id: v.id("loyaltyRewards"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    pointsCost: v.optional(v.number()),
    rewardType: v.optional(v.union(
      v.literal("discount_fixed"),
      v.literal("discount_percent"),
      v.literal("free_service"),
      v.literal("custom"),
    )),
    discountAmount: v.optional(v.number()),
    discountPercent: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    icon: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...fields }) => {
    await requireAdmin(ctx);
    const updates: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(fields)) {
      if (val !== undefined) updates[k] = val;
    }
    await ctx.db.patch(id, updates);
  },
});

export const deleteReward = mutation({
  args: { id: v.id("loyaltyRewards") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.delete(id);
  },
});

// ─── Amplifiers CRUD (Admin) ─────────────────────────────────────────────────

export const listAmplifiers = query({
  args: {},
  handler: async (ctx) => {
    const amps = await ctx.db.query("loyaltyAmplifiers").collect();
    return amps.sort((a, b) => b._creationTime - a._creationTime);
  },
});

export const createAmplifier = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    amplifierType: v.union(v.literal("multiplier"), v.literal("bonus")),
    multiplier: v.optional(v.number()),
    bonusPoints: v.optional(v.number()),
    daysOfWeek: v.optional(v.array(v.number())),
    serviceCategories: v.optional(v.array(v.string())),
    minSpendCents: v.optional(v.number()),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const { profile } = await requireAdmin(ctx);
    return await ctx.db.insert("loyaltyAmplifiers", {
      ...args,
      isActive: true,
      createdBy: profile.displayName,
    });
  },
});

export const updateAmplifier = mutation({
  args: {
    id: v.id("loyaltyAmplifiers"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    amplifierType: v.optional(v.union(v.literal("multiplier"), v.literal("bonus"))),
    multiplier: v.optional(v.number()),
    bonusPoints: v.optional(v.number()),
    daysOfWeek: v.optional(v.array(v.number())),
    serviceCategories: v.optional(v.array(v.string())),
    minSpendCents: v.optional(v.number()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, ...fields }) => {
    await requireAdmin(ctx);
    const updates: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(fields)) {
      if (val !== undefined) updates[k] = val;
    }
    await ctx.db.patch(id, updates);
  },
});

export const deleteAmplifier = mutation({
  args: { id: v.id("loyaltyAmplifiers") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.delete(id);
  },
});

// ─── All Loyalty Accounts (Admin) ────────────────────────────────────────────

export const listAccounts = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const accounts = await ctx.db.query("loyaltyAccounts").collect();

    const withNames = await Promise.all(
      accounts.map(async (a) => {
        const customer = await ctx.db.get(a.customerId);
        return {
          ...a,
          customerName: customer?.name || "Unknown",
          customerEmail: customer?.email,
          customerPhone: customer?.phone,
        };
      }),
    );

    return withNames.sort((a, b) => b.currentPoints - a.currentPoints);
  },
});

// ─── Client account creation from signup ─────────────────────────────────────

/** Initialize loyalty account for a customer (called when linking client account) */
export const initAccount = mutation({
  args: { customerId: v.id("customers") },
  handler: async (ctx, { customerId }) => {
    await requireAdmin(ctx);
    return await getOrCreateAccount(ctx, customerId);
  },
});

// ─── Internal functions (callable from other server functions, no auth) ────────

/** Auto-create loyalty account for a customer (called from booking flow) */
export const internalInitAccount = internalMutation({
  args: { customerId: v.id("customers") },
  handler: async (ctx, { customerId }) => {
    return await getOrCreateAccount(ctx, customerId);
  },
});

/** Auto-award points when booking is completed (called from bookings.updateStatus) */
export const internalAwardPoints = internalMutation({
  args: {
    customerId: v.id("customers"),
    amount: v.number(),
    bookingId: v.optional(v.id("bookings")),
    serviceName: v.optional(v.string()),
    bookingDay: v.optional(v.string()),
    serviceCategory: v.optional(v.string()),
  },
  handler: async (ctx, { customerId, amount, bookingId, serviceName, bookingDay, serviceCategory }) => {
    // Get settings
    const settingsRow = await ctx.db.query("loyaltySettings").first();
    const settings = {
      pointsPerDollar: 1,
      minSpendForPoints: 0,
      roundingMode: "floor" as string,
      expirationEnabled: false,
      expirationDays: 365,
      ...settingsRow,
    };

    if (amount < settings.minSpendForPoints) return null;

    let basePoints = amount * settings.pointsPerDollar;
    if (settings.roundingMode === "floor") basePoints = Math.floor(basePoints);
    else if (settings.roundingMode === "ceil") basePoints = Math.ceil(basePoints);
    else basePoints = Math.round(basePoints);

    // Check amplifiers
    const now = Date.now();
    const amplifiers = await ctx.db
      .query("loyaltyAmplifiers")
      .withIndex("by_active", (q: any) => q.eq("isActive", true))
      .collect();

    let totalPoints = basePoints;
    let appliedAmplifier: string | undefined;

    // bookingDay comes as string name; convert to number for schema match
    const dayNameToNum: Record<string, number> = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };
    const bookingDayNum = bookingDay ? dayNameToNum[bookingDay] : undefined;

    for (const amp of amplifiers) {
      if (amp.startDate && new Date(amp.startDate).getTime() > now) continue;
      if (amp.endDate && new Date(amp.endDate).getTime() < now) continue;

      let matches = true;
      if (amp.daysOfWeek?.length && bookingDayNum !== undefined) {
        matches = amp.daysOfWeek.includes(bookingDayNum);
      }
      if (matches && amp.serviceCategories?.length && serviceCategory) {
        matches = amp.serviceCategories.includes(serviceCategory);
      }
      if (matches && amp.minSpendCents) {
        matches = amount >= amp.minSpendCents;
      }

      if (matches) {
        if (amp.amplifierType === "multiplier") {
          totalPoints = Math.floor(basePoints * (amp.multiplier ?? 1));
        } else {
          totalPoints = basePoints + (amp.bonusPoints || 0);
        }
        appliedAmplifier = amp.name;
        break;
      }
    }

    const account = await getOrCreateAccount(ctx, customerId);
    const expiresAt = settings.expirationEnabled
      ? now + settings.expirationDays * 86400000
      : undefined;

    await ctx.db.insert("loyaltyTransactions", {
      loyaltyAccountId: account._id,
      customerId,
      type: appliedAmplifier ? "bonus" : "earn",
      points: totalPoints,
      description: appliedAmplifier
        ? `Earned ${totalPoints} pts (${appliedAmplifier}) for ${serviceName || "service"}`
        : `Earned ${totalPoints} pts for ${serviceName || "service"}`,
      bookingId,
      expiresAt,
    });

    await ctx.db.patch(account._id, {
      currentPoints: account.currentPoints + totalPoints,
      lifetimeEarned: account.lifetimeEarned + totalPoints,
    });

    return { pointsAwarded: totalPoints, amplifier: appliedAmplifier };
  },
});

/** Bulk-init loyalty accounts for all existing customers */
export const bulkInitAccounts = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const customers = await ctx.db.query("customers").collect();
    let created = 0;
    for (const c of customers) {
      const existing = await ctx.db
        .query("loyaltyAccounts")
        .withIndex("by_customer", (q: any) => q.eq("customerId", c._id))
        .first();
      if (!existing) {
        await ctx.db.insert("loyaltyAccounts", {
          customerId: c._id,
          currentPoints: 0,
          lifetimeEarned: 0,
          lifetimeRedeemed: 0,
        });
        created++;
      }
    }
    return { total: customers.length, created };
  },
});
