import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAuth, requireAdmin } from "./authHelpers";

function generateConfirmationCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "PW-";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ─── Public: create a new booking ─────────────────────────────────────────────
// Supports both legacy (serviceId) and new catalog (catalogItemId + addons) format.

export const create = mutation({
  args: {
    customerName: v.string(),
    customerPhone: v.string(),
    customerEmail: v.string(),
    serviceAddress: v.string(),
    zipCode: v.optional(v.string()),
    // Legacy service fields (optional now)
    serviceId: v.optional(v.id("services")),
    vehicleType: v.optional(v.union(v.literal("sedan"), v.literal("suv"))),
    // New catalog fields
    catalogItemId: v.optional(v.id("serviceCatalog")),
    selectedVariant: v.optional(v.string()), // variant label
    addons: v.optional(
      v.array(
        v.object({
          catalogItemId: v.optional(v.id("serviceCatalog")),
          name: v.string(),
          variantLabel: v.optional(v.string()),
          price: v.number(),
          durationMin: v.number(),
        }),
      ),
    ),
    // Overrides (when using catalog)
    serviceName: v.optional(v.string()),
    price: v.optional(v.number()),
    totalPrice: v.optional(v.number()),
    totalDuration: v.optional(v.number()),
    // Common fields
    date: v.string(),
    time: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let serviceName = args.serviceName || "";
    let price = args.price || 0;
    let totalPrice = args.totalPrice;
    let totalDuration = args.totalDuration;
    let vehicleType = args.vehicleType;
    let duration = 120; // default fallback

    // ─── Resolve service details ───────────────────────────
    if (args.catalogItemId) {
      // New catalog-based booking
      const catalogItem = await ctx.db.get(args.catalogItemId);
      if (!catalogItem) throw new Error("Catalog item not found");

      serviceName = serviceName || catalogItem.name;

      // Find the selected variant
      if (args.selectedVariant) {
        const variant = catalogItem.variants.find(
          (v) => v.label === args.selectedVariant,
        );
        if (variant) {
          price = price || variant.price;
          duration = variant.durationMin;
        }
      } else if (catalogItem.variants.length === 1) {
        price = price || catalogItem.variants[0].price;
        duration = catalogItem.variants[0].durationMin;
      }

      // Calculate totals including add-ons
      const addonPrice = (args.addons || []).reduce((sum, a) => sum + a.price, 0);
      const addonDuration = (args.addons || []).reduce(
        (sum, a) => sum + a.durationMin,
        0,
      );
      totalPrice = totalPrice ?? price + addonPrice;
      totalDuration = totalDuration ?? duration + addonDuration;
    } else if (args.serviceId) {
      // Legacy service-based booking
      const service = await ctx.db.get(args.serviceId);
      if (!service) throw new Error("Service not found");

      serviceName = service.name;
      price =
        args.vehicleType === "sedan"
          ? service.sedanPrice
          : service.suvPrice;
      duration = service.duration;
      totalPrice = price;
      totalDuration = duration;
    }

    const confirmationCode = generateConfirmationCode();

    // ─── Auto-assign staff if possible ─────────────────────
    let staffId: string | undefined;
    let staffName: string | undefined;

    if (args.serviceId) {
      const serviceAssignments = await ctx.db
        .query("staffServices")
        .withIndex("by_service", (q) => q.eq("serviceId", args.serviceId!))
        .collect();

      if (serviceAssignments.length > 0) {
        const dateObj = new Date(args.date + "T12:00:00");
        const dayOfWeek = dateObj.getUTCDay();
        const [reqH, reqM] = args.time.split(":").map(Number);
        const reqMinutes = reqH * 60 + reqM;

        const existingBookings = await ctx.db
          .query("bookings")
          .withIndex("by_date", (q) => q.eq("date", args.date))
          .filter((q) => q.neq(q.field("status"), "cancelled"))
          .collect();

        for (const assignment of serviceAssignments) {
          const staff = await ctx.db.get(assignment.staffId);
          if (!staff || !staff.isActive) continue;

          const staffAvail = await ctx.db
            .query("staffAvailability")
            .withIndex("by_staff_day", (q) =>
              q.eq("staffId", staff._id).eq("dayOfWeek", dayOfWeek),
            )
            .first();

          if (!staffAvail || !staffAvail.isAvailable) continue;

          const [sH, sM] = staffAvail.startTime.split(":").map(Number);
          const [eH, eM] = staffAvail.endTime.split(":").map(Number);
          if (
            reqMinutes < sH * 60 + sM ||
            reqMinutes + duration > eH * 60 + eM
          )
            continue;

          const staffBookings = existingBookings.filter(
            (b) => b.staffId === staff._id,
          );
          const hasConflict = staffBookings.some((b) => {
            const [bH, bM] = b.time.split(":").map(Number);
            const bookingStart = bH * 60 + bM;
            const bookingEnd = bookingStart + duration;
            return (
              reqMinutes < bookingEnd &&
              reqMinutes + duration > bookingStart
            );
          });

          if (!hasConflict) {
            staffId = staff._id;
            staffName = staff.name;
            break;
          }
        }
      }
    }

    // ─── Auto-create or link customer ──────────────────────
    let customerId: string | undefined;
    if (args.customerEmail) {
      const existingCustomer = await ctx.db
        .query("customers")
        .withIndex("by_email", (q) => q.eq("email", args.customerEmail))
        .first();
      if (existingCustomer) {
        customerId = existingCustomer._id;
        await ctx.db.patch(existingCustomer._id, {
          totalBookings: (existingCustomer.totalBookings || 0) + 1,
          lastServiceDate: args.date,
          address: args.serviceAddress,
          phone: args.customerPhone,
          zipCode: args.zipCode,
          vehicleType: vehicleType,
        });
      } else {
        customerId = await ctx.db.insert("customers", {
          name: args.customerName,
          phone: args.customerPhone,
          email: args.customerEmail,
          address: args.serviceAddress,
          zipCode: args.zipCode,
          vehicleType: vehicleType,
          source: "booking",
          totalBookings: 1,
          totalSpent: 0,
          lastServiceDate: args.date,
        });
      }
    }

    // ─── Insert the booking ────────────────────────────────
    const bookingData: any = {
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      customerEmail: args.customerEmail,
      serviceAddress: args.serviceAddress,
      zipCode: args.zipCode,
      customerId: customerId as any,
      serviceName,
      price,
      date: args.date,
      time: args.time,
      status: "confirmed" as const,
      paymentStatus: "unpaid" as const,
      confirmationCode,
      notes: args.notes,
      staffId: staffId as any,
      staffName,
    };

    // Add legacy fields if present
    if (args.serviceId) bookingData.serviceId = args.serviceId;
    if (vehicleType) bookingData.vehicleType = vehicleType;

    // Add new catalog fields if present
    if (args.catalogItemId) bookingData.catalogItemId = args.catalogItemId;
    if (args.selectedVariant) bookingData.selectedVariant = args.selectedVariant;
    if (args.addons && args.addons.length > 0) bookingData.addons = args.addons;
    if (totalPrice !== undefined) bookingData.totalPrice = totalPrice;
    if (totalDuration !== undefined) bookingData.totalDuration = totalDuration;

    const bookingId = await ctx.db.insert("bookings", bookingData);

    // ── Schedule confirmation email + SMS (async, non-blocking) ──
    await ctx.scheduler.runAfter(0, internal.notifications.sendConfirmation, {
      bookingId,
    });

    return {
      bookingId,
      confirmationCode,
      price: totalPrice ?? price,
      serviceName,
      staffName,
    };
  },
});

// Public: look up booking by confirmation code
export const getByConfirmation = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    return await ctx.db
      .query("bookings")
      .withIndex("by_confirmation", (q) => q.eq("confirmationCode", code))
      .first();
  },
});

// Admin: list all bookings with optional filters
export const list = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("confirmed"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("cancelled"),
      ),
    ),
    date: v.optional(v.string()),
    staffId: v.optional(v.id("staff")),
  },
  handler: async (ctx, { status, date, staffId }) => {
    await requireAdmin(ctx);
    // Helper: check if a booking is assigned to a specific staff (multi-staff aware)
    const hasStaff = (b: any, sid: string) => {
      if (b.staffIds?.some((id: any) => id.toString() === sid.toString())) return true;
      return b.staffId?.toString() === sid.toString();
    };

    if (staffId && date) {
      // Use index for primary staff match, then also check multi-staff
      const indexResults = await ctx.db
        .query("bookings")
        .withIndex("by_staff_date", (q) =>
          q.eq("staffId", staffId).eq("date", date),
        )
        .collect();
      // Also get all bookings for this date to catch secondary staff assignments
      const dateResults = await ctx.db
        .query("bookings")
        .withIndex("by_date", (q) => q.eq("date", date))
        .collect();
      const secondaryMatches = dateResults.filter(
        (b) => !indexResults.some((ir) => ir._id === b._id) && hasStaff(b, staffId),
      );
      const results = [...indexResults, ...secondaryMatches];
      if (status) return results.filter((b) => b.status === status);
      return results.sort((a, b) => a.time.localeCompare(b.time));
    }

    if (date) {
      const results = await ctx.db
        .query("bookings")
        .withIndex("by_date", (q) => q.eq("date", date))
        .collect();
      const filtered = status
        ? results.filter((b) => b.status === status)
        : results;
      if (staffId) return filtered.filter((b) => hasStaff(b, staffId));
      return filtered.sort((a, b) => a.time.localeCompare(b.time));
    }

    if (status) {
      const results = await ctx.db
        .query("bookings")
        .withIndex("by_status", (q) => q.eq("status", status))
        .collect();
      if (staffId) return results.filter((b) => hasStaff(b, staffId));
      return results.sort(
        (a, b) =>
          a.date.localeCompare(b.date) || a.time.localeCompare(b.time),
      );
    }

    const results = await ctx.db.query("bookings").collect();
    const filtered = staffId
      ? results.filter((b) => hasStaff(b, staffId))
      : results;
    return filtered.sort(
      (a, b) =>
        b.date.localeCompare(a.date) || a.time.localeCompare(b.time),
    );
  },
});

// Admin: list bookings for today
export const listToday = query({
  args: { today: v.string() },
  handler: async (ctx, { today }) => {
    await requireAdmin(ctx);
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_date", (q) => q.eq("date", today))
      .filter((q) => q.neq(q.field("status"), "cancelled"))
      .collect();
    return bookings.sort((a, b) => a.time.localeCompare(b.time));
  },
});

// Admin: list upcoming bookings
export const listUpcoming = query({
  args: { startDate: v.string(), endDate: v.string() },
  handler: async (ctx, { startDate, endDate }) => {
    await requireAdmin(ctx);
    const bookings = await ctx.db
      .query("bookings")
      .filter((q) =>
        q.and(
          q.gt(q.field("date"), startDate),
          q.lte(q.field("date"), endDate),
          q.neq(q.field("status"), "cancelled"),
        ),
      )
      .collect();
    return bookings.sort(
      (a, b) =>
        a.date.localeCompare(b.date) || a.time.localeCompare(b.time),
    );
  },
});

// Admin: get a single booking
export const get = query({
  args: { id: v.id("bookings") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

// Admin: update booking status
export const updateStatus = mutation({
  args: {
    id: v.id("bookings"),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled"),
    ),
  },
  handler: async (ctx, { id, status }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, { status });
  },
});

// Admin: add a staff member to a booking (multi-staff)
export const assignStaff = mutation({
  args: {
    id: v.id("bookings"),
    staffId: v.id("staff"),
  },
  handler: async (ctx, { id, staffId }) => {
    await requireAdmin(ctx);
    const staff = await ctx.db.get(staffId);
    if (!staff) throw new Error("Staff member not found");
    const booking = await ctx.db.get(id);
    if (!booking) throw new Error("Booking not found");

    // Build new arrays (add if not already present)
    const currentIds = booking.staffIds ?? (booking.staffId ? [booking.staffId] : []);
    const currentNames = booking.staffNames ?? (booking.staffName ? [booking.staffName] : []);
    if (currentIds.some((sid: any) => sid.toString() === staffId.toString())) return; // already assigned

    const newIds = [...currentIds, staffId];
    const newNames = [...currentNames, staff.name];

    await ctx.db.patch(id, {
      staffId: newIds[0],        // primary = first in list
      staffName: newNames[0],
      staffIds: newIds,
      staffNames: newNames,
    });
  },
});

// Admin: remove a staff member from a booking
export const unassignStaff = mutation({
  args: {
    id: v.id("bookings"),
    staffId: v.optional(v.id("staff")),  // if omitted, removes ALL staff
  },
  handler: async (ctx, { id, staffId }) => {
    await requireAdmin(ctx);
    const booking = await ctx.db.get(id);
    if (!booking) throw new Error("Booking not found");

    if (!staffId) {
      // Remove all staff
      await ctx.db.patch(id, {
        staffId: undefined, staffName: undefined,
        staffIds: undefined, staffNames: undefined,
      });
      return;
    }

    // Remove specific staff member
    const currentIds = booking.staffIds ?? (booking.staffId ? [booking.staffId] : []);
    const currentNames = booking.staffNames ?? (booking.staffName ? [booking.staffName] : []);
    const idx = currentIds.findIndex((sid: any) => sid.toString() === staffId.toString());
    if (idx === -1) return; // not assigned

    const newIds = currentIds.filter((_: any, i: number) => i !== idx);
    const newNames = currentNames.filter((_: any, i: number) => i !== idx);

    if (newIds.length === 0) {
      await ctx.db.patch(id, {
        staffId: undefined, staffName: undefined,
        staffIds: undefined, staffNames: undefined,
      });
    } else {
      await ctx.db.patch(id, {
        staffId: newIds[0],
        staffName: newNames[0],
        staffIds: newIds,
        staffNames: newNames,
      });
    }
  },
});

// Admin: mark as paid
export const markPaid = mutation({
  args: {
    id: v.id("bookings"),
    paymentMethod: v.string(),
    paymentAmount: v.number(),
    paymentId: v.optional(v.string()),
  },
  handler: async (ctx, { id, paymentMethod, paymentAmount, paymentId }) => {
    await requireAdmin(ctx);
    const booking = await ctx.db.get(id);
    await ctx.db.patch(id, {
      paymentStatus: "paid",
      paymentMethod,
      paymentAmount,
      paymentId,
      paidAt: Date.now(),
    });
    if (booking?.customerId) {
      const customer = await ctx.db.get(booking.customerId);
      if (customer) {
        await ctx.db.patch(customer._id, {
          totalSpent: (customer.totalSpent || 0) + paymentAmount,
        });
      }
    }
  },
});

// Admin: undo payment (mark as unpaid)
export const markUnpaid = mutation({
  args: {
    id: v.id("bookings"),
  },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const booking = await ctx.db.get(id);
    if (!booking) throw new Error("Booking not found");
    if (booking.paymentStatus !== "paid") throw new Error("Booking is not marked as paid");

    // Reverse the customer's totalSpent if we tracked it
    if (booking.customerId && booking.paymentAmount) {
      const customer = await ctx.db.get(booking.customerId);
      if (customer) {
        await ctx.db.patch(customer._id, {
          totalSpent: Math.max(0, (customer.totalSpent || 0) - booking.paymentAmount),
        });
      }
    }

    await ctx.db.patch(id, {
      paymentStatus: "unpaid",
      paymentMethod: undefined,
      paymentAmount: undefined,
      paymentId: undefined,
      paidAt: undefined,
    });
  },
});

// Admin: store Square payment link
export const setSquarePaymentLink = mutation({
  args: {
    id: v.id("bookings"),
    url: v.string(),
    linkId: v.optional(v.string()),
  },
  handler: async (ctx, { id, url, linkId }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, {
      squarePaymentLinkUrl: url,
      squarePaymentLinkId: linkId,
    });
  },
});

// Admin: update notes
export const updateNotes = mutation({
  args: {
    id: v.id("bookings"),
    notes: v.string(),
  },
  handler: async (ctx, { id, notes }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, { notes });
  },
});

// Admin: get booking stats
export const stats = query({
  args: { today: v.string() },
  handler: async (ctx, { today }) => {
    await requireAdmin(ctx);
    const allBookings = await ctx.db.query("bookings").collect();

    const todayBookings = allBookings.filter(
      (b) => b.date === today && b.status !== "cancelled",
    );
    const upcoming = allBookings.filter(
      (b) => b.date > today && b.status !== "cancelled",
    );
    const unpaid = allBookings.filter(
      (b) =>
        b.paymentStatus === "unpaid" &&
        b.status !== "cancelled" &&
        b.date <= today,
    );
    const totalRevenue = allBookings
      .filter((b) => b.paymentStatus === "paid")
      .reduce((sum, b) => sum + (b.paymentAmount || b.price), 0);

    return {
      todayCount: todayBookings.length,
      upcomingCount: upcoming.length,
      unpaidCount: unpaid.length,
      totalRevenue,
    };
  },
});

// Admin: list by staff
export const listByStaff = query({
  args: {
    staffId: v.id("staff"),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, { staffId, startDate, endDate }) => {
    await requireAdmin(ctx);
    // Get bookings where this staff is primary (via index)
    const primaryBookings = await ctx.db
      .query("bookings")
      .withIndex("by_staff", (q) => q.eq("staffId", staffId))
      .filter((q) => q.neq(q.field("status"), "cancelled"))
      .collect();

    // Also find bookings where this staff is a secondary assignee
    let allBookings = await ctx.db
      .query("bookings")
      .filter((q) => q.neq(q.field("status"), "cancelled"))
      .collect();
    if (startDate) allBookings = allBookings.filter((b) => b.date >= (startDate as string));
    if (endDate) allBookings = allBookings.filter((b) => b.date <= (endDate as string));

    const secondaryBookings = allBookings.filter(
      (b) =>
        !primaryBookings.some((pb) => pb._id === b._id) &&
        b.staffIds?.some((sid: any) => sid.toString() === staffId.toString()),
    );

    let filtered = [...primaryBookings, ...secondaryBookings];
    if (startDate) filtered = filtered.filter((b) => b.date >= (startDate as string));
    if (endDate) filtered = filtered.filter((b) => b.date <= (endDate as string));

    return filtered.sort(
      (a, b) =>
        a.date.localeCompare(b.date) || a.time.localeCompare(b.time),
    );
  },
});

// Admin: ZIP cluster grouping
export const listByZipCluster = query({
  args: { startDate: v.string(), endDate: v.string() },
  handler: async (ctx, { startDate, endDate }) => {
    await requireAdmin(ctx);
    const bookings = await ctx.db
      .query("bookings")
      .filter((q) =>
        q.and(
          q.gte(q.field("date"), startDate),
          q.lte(q.field("date"), endDate),
          q.neq(q.field("status"), "cancelled"),
        ),
      )
      .collect();

    const zipGroups: Record<
      string,
      Array<{
        _id: string;
        customerName: string;
        serviceName: string;
        date: string;
        time: string;
        serviceAddress: string;
        status: string;
        staffName?: string;
      }>
    > = {};

    for (const b of bookings) {
      const zip = b.zipCode || "No ZIP";
      if (!zipGroups[zip]) zipGroups[zip] = [];
      zipGroups[zip].push({
        _id: b._id,
        customerName: b.customerName,
        serviceName: b.serviceName,
        date: b.date,
        time: b.time,
        serviceAddress: b.serviceAddress,
        status: b.status,
        staffName: b.staffName,
      });
    }

    for (const zip of Object.keys(zipGroups)) {
      zipGroups[zip].sort(
        (a, b) =>
          a.date.localeCompare(b.date) || a.time.localeCompare(b.time),
      );
    }

    return zipGroups;
  },
});

// Public: submit satisfaction feedback
export const submitFeedback = mutation({
  args: {
    confirmationCode: v.string(),
    satisfaction: v.union(v.literal("yes"), v.literal("no")),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { confirmationCode, satisfaction, note }) => {
    const booking = await ctx.db
      .query("bookings")
      .withIndex("by_confirmation", (q) =>
        q.eq("confirmationCode", confirmationCode),
      )
      .first();
    if (!booking) throw new Error("Booking not found");

    await ctx.db.patch(booking._id, {
      satisfaction,
      followUpNote: note,
      followUpSent: true,
    });

    return { satisfaction };
  },
});

// ─── Calendar view: list bookings for a date range ────────────────────────────
export const listByDateRange = query({
  args: { startDate: v.string(), endDate: v.string() },
  handler: async (ctx, { startDate, endDate }) => {
    await requireAdmin(ctx);
    const bookings = await ctx.db
      .query("bookings")
      .filter((q) =>
        q.and(
          q.gte(q.field("date"), startDate),
          q.lte(q.field("date"), endDate),
          q.neq(q.field("status"), "cancelled"),
        ),
      )
      .collect();

    return bookings
      .map((b) => ({
        _id: b._id,
        customerName: b.customerName,
        serviceName: b.serviceName,
        date: b.date,
        time: b.time,
        totalDuration: b.totalDuration,
        totalPrice: b.totalPrice,
        price: b.price,
        status: b.status,
        paymentStatus: b.paymentStatus,
        staffName: b.staffName,
        serviceAddress: b.serviceAddress,
        zipCode: b.zipCode,
        confirmationCode: b.confirmationCode,
        selectedVariant: b.selectedVariant,
      }))
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) || a.time.localeCompare(b.time),
      );
  },
});

/** Direct insert for bulk import — no service lookup, no customer creation */
export const updateZipCode = mutation({
  args: {
    bookingId: v.id("bookings"),
    zipCode: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.bookingId, { zipCode: args.zipCode });
    return true;
  },
});

export const directInsert = mutation({
  args: {
    customerName: v.string(),
    customerPhone: v.string(),
    customerEmail: v.string(),
    serviceAddress: v.string(),
    serviceName: v.string(),
    price: v.number(),
    date: v.string(),
    time: v.string(),
    staffName: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled"),
    ),
    paymentStatus: v.union(
      v.literal("unpaid"),
      v.literal("paid"),
      v.literal("refunded"),
    ),
    confirmationCode: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.insert("bookings", {
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      customerEmail: args.customerEmail,
      serviceAddress: args.serviceAddress,
      serviceName: args.serviceName,
      price: args.price,
      date: args.date,
      time: args.time,
      staffName: args.staffName,
      status: args.status,
      paymentStatus: args.paymentStatus,
      confirmationCode: args.confirmationCode,
      notes: args.notes,
    });
  },
});

/** Admin: update booking price and totalPrice */
export const updatePrice = mutation({
  args: {
    bookingId: v.id("bookings"),
    price: v.number(), // cents
    selectedVariant: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found");
    
    // Update price + totalPrice (recalculate with add-ons if any)
    const addonTotal = (booking.addons || []).reduce((sum, a) => sum + a.price, 0);
    const totalPrice = args.price + addonTotal;
    
    const patch: Record<string, unknown> = {
      price: args.price,
      totalPrice: totalPrice,
    };
    if (args.selectedVariant) {
      patch.selectedVariant = args.selectedVariant;
    }
    
    await ctx.db.patch(args.bookingId, patch);
    return { updated: true, bookingId: args.bookingId, newPrice: args.price, newTotal: totalPrice };
  },
});

/** Admin: full booking edit — change service, variant, add-ons, date/time, customer info */
export const editBooking = mutation({
  args: {
    bookingId: v.id("bookings"),
    // Service
    catalogItemId: v.optional(v.id("serviceCatalog")),
    serviceName: v.optional(v.string()),
    selectedVariant: v.optional(v.string()),
    price: v.optional(v.number()), // base price in cents
    // Add-ons
    addons: v.optional(
      v.array(
        v.object({
          catalogItemId: v.optional(v.id("serviceCatalog")),
          name: v.string(),
          variantLabel: v.optional(v.string()),
          price: v.number(),
          durationMin: v.number(),
        }),
      ),
    ),
    // Schedule
    date: v.optional(v.string()),
    time: v.optional(v.string()),
    // Customer info
    customerName: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    customerEmail: v.optional(v.string()),
    serviceAddress: v.optional(v.string()),
    zipCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found");

    const patch: Record<string, unknown> = {};

    // Service fields
    if (args.catalogItemId !== undefined) patch.catalogItemId = args.catalogItemId;
    if (args.serviceName !== undefined) patch.serviceName = args.serviceName;
    if (args.selectedVariant !== undefined) patch.selectedVariant = args.selectedVariant;
    if (args.price !== undefined) patch.price = args.price;

    // Add-ons
    if (args.addons !== undefined) patch.addons = args.addons;

    // Recalculate totals
    const basePrice = (args.price !== undefined ? args.price : booking.price);
    const addonList = (args.addons !== undefined ? args.addons : booking.addons) || [];
    const addonTotal = addonList.reduce((sum: number, a: { price: number; durationMin: number }) => sum + a.price, 0);
    const addonDuration = addonList.reduce((sum: number, a: { price: number; durationMin: number }) => sum + a.durationMin, 0);
    patch.totalPrice = basePrice + addonTotal;
    // For duration, look up the catalog item if changed, else keep existing
    if (args.catalogItemId !== undefined) {
      const item = await ctx.db.get(args.catalogItemId);
      if (item) {
        const variant = item.variants.find((v: { label: string }) => v.label === (args.selectedVariant || ""));
        const baseDuration = variant ? variant.durationMin : (item.variants[0]?.durationMin ?? 0);
        patch.totalDuration = baseDuration + addonDuration;
      }
    } else if (args.addons !== undefined) {
      // Addons changed but service didn't — recalculate duration
      const existingBaseDuration = (booking.totalDuration ?? 0) -
        ((booking.addons || []).reduce((s: number, a: { durationMin: number }) => s + a.durationMin, 0));
      patch.totalDuration = existingBaseDuration + addonDuration;
    }

    // Schedule
    if (args.date !== undefined) patch.date = args.date;
    if (args.time !== undefined) patch.time = args.time;

    // Customer info
    if (args.customerName !== undefined) patch.customerName = args.customerName;
    if (args.customerPhone !== undefined) patch.customerPhone = args.customerPhone;
    if (args.customerEmail !== undefined) patch.customerEmail = args.customerEmail;
    if (args.serviceAddress !== undefined) patch.serviceAddress = args.serviceAddress;
    if (args.zipCode !== undefined) patch.zipCode = args.zipCode;

    await ctx.db.patch(args.bookingId, patch);
    return { updated: true, bookingId: args.bookingId, totalPrice: patch.totalPrice };
  },
});

/** Admin: batch update prices for multiple bookings */
export const batchUpdatePrices = mutation({
  args: {
    updates: v.array(v.object({
      bookingId: v.id("bookings"),
      price: v.number(),
      selectedVariant: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const results = [];
    for (const u of args.updates) {
      const booking = await ctx.db.get(u.bookingId);
      if (!booking) {
        results.push({ bookingId: u.bookingId, updated: false, error: "not found" });
        continue;
      }
      const addonTotal = (booking.addons || []).reduce((sum, a) => sum + a.price, 0);
      const totalPrice = u.price + addonTotal;
      const patch: Record<string, unknown> = {
        price: u.price,
        totalPrice: totalPrice,
      };
      if (u.selectedVariant) {
        patch.selectedVariant = u.selectedVariant;
      }
      await ctx.db.patch(u.bookingId, patch);
      results.push({ bookingId: u.bookingId, updated: true, newPrice: u.price });
    }
    return results;
  },
});
