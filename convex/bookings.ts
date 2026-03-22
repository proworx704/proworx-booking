import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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
    if (staffId && date) {
      const results = await ctx.db
        .query("bookings")
        .withIndex("by_staff_date", (q) =>
          q.eq("staffId", staffId).eq("date", date),
        )
        .collect();
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
      if (staffId) return filtered.filter((b) => b.staffId === staffId);
      return filtered.sort((a, b) => a.time.localeCompare(b.time));
    }

    if (status) {
      const results = await ctx.db
        .query("bookings")
        .withIndex("by_status", (q) => q.eq("status", status))
        .collect();
      if (staffId) return results.filter((b) => b.staffId === staffId);
      return results.sort(
        (a, b) =>
          a.date.localeCompare(b.date) || a.time.localeCompare(b.time),
      );
    }

    const results = await ctx.db.query("bookings").collect();
    const filtered = staffId
      ? results.filter((b) => b.staffId === staffId)
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
    await ctx.db.patch(id, { status });
  },
});

// Admin: assign staff to booking
export const assignStaff = mutation({
  args: {
    id: v.id("bookings"),
    staffId: v.id("staff"),
  },
  handler: async (ctx, { id, staffId }) => {
    const staff = await ctx.db.get(staffId);
    if (!staff) throw new Error("Staff member not found");
    await ctx.db.patch(id, { staffId, staffName: staff.name });
  },
});

// Admin: unassign staff
export const unassignStaff = mutation({
  args: { id: v.id("bookings") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, { staffId: undefined, staffName: undefined });
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

// Admin: store Square payment link
export const setSquarePaymentLink = mutation({
  args: {
    id: v.id("bookings"),
    url: v.string(),
    linkId: v.optional(v.string()),
  },
  handler: async (ctx, { id, url, linkId }) => {
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
    await ctx.db.patch(id, { notes });
  },
});

// Admin: get booking stats
export const stats = query({
  args: { today: v.string() },
  handler: async (ctx, { today }) => {
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
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_staff", (q) => q.eq("staffId", staffId))
      .filter((q) => q.neq(q.field("status"), "cancelled"))
      .collect();

    let filtered = bookings;
    if (startDate) filtered = filtered.filter((b) => b.date >= startDate);
    if (endDate) filtered = filtered.filter((b) => b.date <= endDate);

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
