import { v } from "convex/values";
import { mutation, query, action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

// Temporary: import Square customers without auth (for Viktor automation)
export const bulkImportNoAuth = mutation({
  args: {
    customers: v.array(
      v.object({
        name: v.string(),
        phone: v.optional(v.string()),
        email: v.optional(v.string()),
        address: v.optional(v.string()),
        zipCode: v.optional(v.string()),
        notes: v.optional(v.string()),
        squareCustomerId: v.string(),
      }),
    ),
  },
  handler: async (ctx, { customers }) => {
    let imported = 0;
    let skipped = 0;
    const importedNames: string[] = [];

    for (const c of customers) {
      // Check for duplicates by squareCustomerId first
      const bySq = await ctx.db
        .query("customers")
        .withIndex("by_square_id", (q) => q.eq("squareCustomerId", c.squareCustomerId))
        .first();
      if (bySq) {
        skipped++;
        continue;
      }

      // Check by email
      if (c.email) {
        const byEmail = await ctx.db
          .query("customers")
          .withIndex("by_email", (q) => q.eq("email", c.email!))
          .first();
        if (byEmail) {
          // Update existing with square ID if missing
          if (!byEmail.squareCustomerId) {
            await ctx.db.patch(byEmail._id, { squareCustomerId: c.squareCustomerId });
          }
          skipped++;
          continue;
        }
      }

      // Check by phone
      if (c.phone) {
        const byPhone = await ctx.db
          .query("customers")
          .withIndex("by_phone", (q) => q.eq("phone", c.phone!))
          .first();
        if (byPhone) {
          if (!byPhone.squareCustomerId) {
            await ctx.db.patch(byPhone._id, { squareCustomerId: c.squareCustomerId });
          }
          skipped++;
          continue;
        }
      }

      await ctx.db.insert("customers", {
        name: c.name,
        phone: c.phone,
        email: c.email,
        address: c.address,
        zipCode: c.zipCode,
        notes: c.notes,
        source: "square" as const,
        squareCustomerId: c.squareCustomerId,
        totalBookings: 0,
        totalSpent: 0,
      });
      imported++;
      importedNames.push(c.name);
    }

    return { imported, skipped, total: customers.length, importedNames };
  },
});

// Count existing customers
export const countCustomers = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("customers").collect();
    const bySource: Record<string, number> = {};
    for (const c of all) {
      bySource[c.source] = (bySource[c.source] || 0) + 1;
    }
    return { total: all.length, bySource };
  },
});



// Temp: list all staff (no auth)
export const listStaffNoAuth = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("staff").collect();
  },
});

// Temp: remove staff by ID (no auth)
export const removeStaffNoAuth = mutation({
  args: { staffId: v.id("staff") },
  handler: async (ctx, { staffId }) => {
    // Remove service assignments
    const assignments = await ctx.db
      .query("staffServices")
      .withIndex("by_staff", (q) => q.eq("staffId", staffId))
      .collect();
    for (const a of assignments) await ctx.db.delete(a._id);
    
    // Remove availability
    const avail = await ctx.db
      .query("staffAvailability")
      .withIndex("by_staff_day", (q) => q.eq("staffId", staffId))
      .collect();
    for (const a of avail) await ctx.db.delete(a._id);
    
    // Remove staff
    await ctx.db.delete(staffId);
    return "removed";
  },
});

// Temp: search customers by email
export const searchCustomerByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const all = await ctx.db.query("customers").collect();
    return all.filter((c: any) => (c.email ?? "").toLowerCase().includes(email.toLowerCase()));
  },
});

// Temp: list all user profiles
export const listAllProfilesNoAuth = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("userProfiles").collect();
  },
});

// Temp: list all auth users
export const listAuthUsersNoAuth = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.map(u => ({ id: u._id, email: u.email, name: u.name }));
  },
});

// Temp: auto-assign client profiles to users who are customers but don't have profiles
export const fixOrphanedCustomerUsers = mutation({
  args: {},
  handler: async (ctx) => {
    const allUsers = await ctx.db.query("users").collect();
    const allProfiles = await ctx.db.query("userProfiles").collect();
    const allCustomers = await ctx.db.query("customers").collect();

    const profileUserIds = new Set(allProfiles.map((p: any) => p.userId as string));
    const customerEmailMap = new Map(
      allCustomers
        .filter((c: any) => c.email)
        .map((c: any) => [(c.email as string).toLowerCase(), c._id]),
    );

    const fixed: string[] = [];
    for (const user of allUsers) {
      if (profileUserIds.has(user._id as string)) continue;
      const email = (user.email ?? "").toLowerCase();
      if (!email) continue;
      
      const customerId = customerEmailMap.get(email);
      if (customerId) {
        await ctx.db.insert("userProfiles", {
          userId: user._id,
          role: "client",
          displayName: user.name || email.split("@")[0] || "Client",
          customerId,
        } as any);
        fixed.push(email);
      }
    }
    return { fixed };
  },
});

// Temp: set user profile role
export const setProfileRole = mutation({
  args: { profileId: v.id("userProfiles"), role: v.string(), displayName: v.optional(v.string()) },
  handler: async (ctx, { profileId, role, displayName }) => {
    const patch: Record<string, unknown> = { role };
    if (displayName) patch.displayName = displayName;
    await ctx.db.patch(profileId, patch);
    return "updated";
  },
});

// Temp: test Square booking sync
export const testSquareSyncNoAuth = action({
  args: {},
  handler: async (ctx): Promise<{ bookingId: string; status: string }> => {
    const bookingId = await ctx.runMutation(internal.bookings.insertTestBooking, {});
    await ctx.runAction(internal.squareBookingSync.pushBookingToSquare, { bookingId: bookingId as any });
    return { bookingId: bookingId as string, status: "sync triggered" };
  },
});

// Temp: delete test booking
export const deleteBookingNoAuth = mutation({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, { bookingId }) => {
    await ctx.db.delete(bookingId);
    return "deleted";
  },
});

// Temp: sync all unsynced bookings to Square
export const syncAllUnsyncedNoAuth = action({
  args: {},
  handler: async (ctx): Promise<{ synced: number; failed: number; results: string[] }> => {
    // Get all unsynced bookings
    const unsynced: any[] = await ctx.runQuery(internal.squareBookingSync.getUnsyncedBookings, {});
    const results: string[] = [];
    let synced = 0;
    let failed = 0;
    
    for (const booking of unsynced) {
      try {
        await ctx.runAction(internal.squareBookingSync.pushBookingToSquare, { bookingId: booking._id });
        results.push(`✅ ${booking.customerName} - ${booking.serviceName} (${booking.date})`);
        synced++;
      } catch (e: any) {
        results.push(`❌ ${booking.customerName} - ${booking.serviceName}: ${e.message?.substring(0, 80)}`);
        failed++;
      }
    }
    return { synced, failed, results };
  },
});

// Temp: list bookings without auth
export const listBookingsNoAuth = query({
  args: { startDate: v.optional(v.string()), endDate: v.optional(v.string()) },
  handler: async (ctx, { startDate, endDate }) => {
    let bookings = await ctx.db.query("bookings").collect();
    if (startDate) bookings = bookings.filter(b => b.date >= startDate);
    if (endDate) bookings = bookings.filter(b => b.date <= endDate);
    return bookings.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  },
});

// Temp: list catalog without auth
export const listCatalogNoAuth = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("serviceCatalog").collect();
  },
});

// Temp: patch a customer record (no auth)
export const patchCustomerNoAuth = mutation({
  args: {
    customerId: v.id("customers"),
    name: v.optional(v.string()),
    address: v.optional(v.string()),
    zipCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, string> = {};
    if (args.name !== undefined) patch.name = args.name;
    if (args.address !== undefined) patch.address = args.address;
    if (args.zipCode !== undefined) patch.zipCode = args.zipCode;
    await ctx.db.patch(args.customerId, patch);
    return "ok";
  },
});

// Temp: update catalog item (no auth)
export const updateCatalogNoAuth = mutation({
  args: {
    id: v.id("serviceCatalog"),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...patch } = args;
    const clean: Record<string, string> = {};
    if (patch.description !== undefined) clean.description = patch.description;
    await ctx.db.patch(id, clean);
    return "ok";
  },
});
