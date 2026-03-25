import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireAdmin } from "./authHelpers";

// ─── Overview KPIs for a date range ─────────────────────────────────────────
export const overview = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  returns: v.object({
    totalBookings: v.number(),
    completedBookings: v.number(),
    cancelledBookings: v.number(),
    totalRevenue: v.number(),
    avgBookingValue: v.number(),
    uniqueCustomers: v.number(),
    newCustomers: v.number(),
    unpaidAmount: v.number(),
  }),
  handler: async (ctx, { startDate, endDate }) => {
    await requireAdmin(ctx);
    const bookings = await ctx.db.query("bookings").collect();
    const inRange = bookings.filter(
      (b) => b.date >= startDate && b.date <= endDate,
    );

    const completed = inRange.filter((b) => b.status === "completed");
    const cancelled = inRange.filter((b) => b.status === "cancelled");
    const nonCancelled = inRange.filter((b) => b.status !== "cancelled");

    const totalRevenue = inRange
      .filter((b) => b.paymentStatus === "paid")
      .reduce((s, b) => s + (b.paymentAmount || b.totalPrice || b.price || 0), 0);

    const unpaidAmount = nonCancelled
      .filter((b) => b.paymentStatus === "unpaid")
      .reduce((s, b) => s + (b.totalPrice || b.price || 0), 0);

    const customerEmails = new Set(nonCancelled.map((b) => b.customerEmail));

    // New customers: those whose first booking falls in this range
    const allPrior = bookings.filter(
      (b) => b.date < startDate && b.status !== "cancelled",
    );
    const priorEmails = new Set(allPrior.map((b) => b.customerEmail));
    const newCustomers = [...customerEmails].filter(
      (e) => !priorEmails.has(e),
    ).length;

    const paidBookings = inRange.filter((b) => b.paymentStatus === "paid");
    const avgBookingValue =
      paidBookings.length > 0
        ? Math.round(
            paidBookings.reduce(
              (s, b) => s + (b.paymentAmount || b.totalPrice || b.price || 0),
              0,
            ) / paidBookings.length,
          )
        : 0;

    return {
      totalBookings: nonCancelled.length,
      completedBookings: completed.length,
      cancelledBookings: cancelled.length,
      totalRevenue,
      avgBookingValue,
      uniqueCustomers: customerEmails.size,
      newCustomers,
      unpaidAmount,
    };
  },
});

// ─── Revenue over time (daily buckets) ──────────────────────────────────────
export const revenueOverTime = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
    granularity: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly")),
  },
  returns: v.array(
    v.object({
      period: v.string(),
      revenue: v.number(),
      bookings: v.number(),
    }),
  ),
  handler: async (ctx, { startDate, endDate, granularity }) => {
    await requireAdmin(ctx);
    const bookings = await ctx.db.query("bookings").collect();
    const inRange = bookings.filter(
      (b) => b.date >= startDate && b.date <= endDate && b.status !== "cancelled",
    );

    const buckets: Record<string, { revenue: number; bookings: number }> = {};

    const getBucket = (dateStr: string): string => {
      if (granularity === "daily") return dateStr;
      if (granularity === "monthly") return dateStr.slice(0, 7); // YYYY-MM
      // weekly: get Monday of the week
      const d = new Date(dateStr + "T12:00:00");
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      d.setDate(diff);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${dd}`;
    };

    for (const b of inRange) {
      const bucket = getBucket(b.date);
      if (!buckets[bucket]) buckets[bucket] = { revenue: 0, bookings: 0 };
      buckets[bucket].bookings++;
      if (b.paymentStatus === "paid") {
        buckets[bucket].revenue += b.paymentAmount || b.totalPrice || b.price || 0;
      }
    }

    return Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, data]) => ({ period, ...data }));
  },
});

// ─── Service performance ────────────────────────────────────────────────────
export const servicePerformance = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  returns: v.array(
    v.object({
      serviceName: v.string(),
      bookingCount: v.number(),
      revenue: v.number(),
      avgPrice: v.number(),
      completionRate: v.number(),
    }),
  ),
  handler: async (ctx, { startDate, endDate }) => {
    await requireAdmin(ctx);
    const bookings = await ctx.db.query("bookings").collect();
    const inRange = bookings.filter(
      (b) => b.date >= startDate && b.date <= endDate,
    );

    const serviceMap: Record<
      string,
      { bookings: number; revenue: number; completed: number; total: number }
    > = {};

    for (const b of inRange) {
      const name = b.serviceName || "Unknown";
      if (!serviceMap[name]) {
        serviceMap[name] = { bookings: 0, revenue: 0, completed: 0, total: 0 };
      }
      if (b.status !== "cancelled") {
        serviceMap[name].bookings++;
        serviceMap[name].total++;
        if (b.paymentStatus === "paid") {
          serviceMap[name].revenue +=
            b.paymentAmount || b.totalPrice || b.price || 0;
        }
        if (b.status === "completed") {
          serviceMap[name].completed++;
        }
      } else {
        serviceMap[name].total++;
      }
    }

    return Object.entries(serviceMap)
      .map(([serviceName, data]) => ({
        serviceName,
        bookingCount: data.bookings,
        revenue: data.revenue,
        avgPrice:
          data.bookings > 0 ? Math.round(data.revenue / data.bookings) : 0,
        completionRate:
          data.total > 0
            ? Math.round((data.completed / data.total) * 100)
            : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  },
});

// ─── Staff productivity ─────────────────────────────────────────────────────
export const staffProductivity = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  returns: v.array(
    v.object({
      staffName: v.string(),
      bookingCount: v.number(),
      revenue: v.number(),
      completedCount: v.number(),
      avgPerBooking: v.number(),
    }),
  ),
  handler: async (ctx, { startDate, endDate }) => {
    await requireAdmin(ctx);
    const bookings = await ctx.db.query("bookings").collect();
    const inRange = bookings.filter(
      (b) =>
        b.date >= startDate &&
        b.date <= endDate &&
        b.status !== "cancelled",
    );

    const staffMap: Record<
      string,
      { bookings: number; revenue: number; completed: number }
    > = {};

    for (const b of inRange) {
      // Handle multi-staff bookings
      const names = b.staffNames && b.staffNames.length > 0
        ? b.staffNames
        : b.staffName
          ? [b.staffName]
          : ["Unassigned"];

      for (const name of names) {
        if (!staffMap[name]) {
          staffMap[name] = { bookings: 0, revenue: 0, completed: 0 };
        }
        staffMap[name].bookings++;
        if (b.paymentStatus === "paid") {
          // Split revenue evenly among assigned staff
          const share = (b.paymentAmount || b.totalPrice || b.price || 0) / names.length;
          staffMap[name].revenue += share;
        }
        if (b.status === "completed") staffMap[name].completed++;
      }
    }

    return Object.entries(staffMap)
      .map(([staffName, data]) => ({
        staffName,
        bookingCount: data.bookings,
        revenue: Math.round(data.revenue),
        completedCount: data.completed,
        avgPerBooking:
          data.bookings > 0 ? Math.round(data.revenue / data.bookings) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  },
});

// ─── Customer insights ──────────────────────────────────────────────────────
export const customerInsights = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  returns: v.object({
    topCustomers: v.array(
      v.object({
        name: v.string(),
        email: v.string(),
        bookingCount: v.number(),
        totalSpent: v.number(),
      }),
    ),
    repeatRate: v.number(),
    avgBookingsPerCustomer: v.number(),
    bookingsBySource: v.array(
      v.object({
        source: v.string(),
        count: v.number(),
      }),
    ),
  }),
  handler: async (ctx, { startDate, endDate }) => {
    await requireAdmin(ctx);
    const bookings = await ctx.db.query("bookings").collect();
    const inRange = bookings.filter(
      (b) =>
        b.date >= startDate &&
        b.date <= endDate &&
        b.status !== "cancelled",
    );

    // Customer aggregation
    const customerMap: Record<
      string,
      { name: string; email: string; bookings: number; spent: number }
    > = {};

    for (const b of inRange) {
      const key = b.customerEmail;
      if (!customerMap[key]) {
        customerMap[key] = {
          name: b.customerName,
          email: b.customerEmail,
          bookings: 0,
          spent: 0,
        };
      }
      customerMap[key].bookings++;
      if (b.paymentStatus === "paid") {
        customerMap[key].spent +=
          b.paymentAmount || b.totalPrice || b.price || 0;
      }
    }

    const customers = Object.values(customerMap);
    const repeatCustomers = customers.filter((c) => c.bookings > 1);
    const repeatRate =
      customers.length > 0
        ? Math.round((repeatCustomers.length / customers.length) * 100)
        : 0;

    const avgBookingsPerCustomer =
      customers.length > 0
        ? +(inRange.length / customers.length).toFixed(1)
        : 0;

    const topCustomers = customers
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 10)
      .map((c) => ({
        name: c.name,
        email: c.email,
        bookingCount: c.bookings,
        totalSpent: c.spent,
      }));

    // Booking source (zip area clusters as proxy)
    const zipMap: Record<string, number> = {};
    for (const b of inRange) {
      const zip = b.zipCode || "Unknown";
      zipMap[zip] = (zipMap[zip] || 0) + 1;
    }
    const bookingsBySource = Object.entries(zipMap)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      topCustomers,
      repeatRate,
      avgBookingsPerCustomer,
      bookingsBySource,
    };
  },
});

// ─── Status breakdown ───────────────────────────────────────────────────────
export const statusBreakdown = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  returns: v.array(
    v.object({
      status: v.string(),
      count: v.number(),
    }),
  ),
  handler: async (ctx, { startDate, endDate }) => {
    await requireAdmin(ctx);
    const bookings = await ctx.db.query("bookings").collect();
    const inRange = bookings.filter(
      (b) => b.date >= startDate && b.date <= endDate,
    );

    const statusMap: Record<string, number> = {};
    for (const b of inRange) {
      statusMap[b.status] = (statusMap[b.status] || 0) + 1;
    }

    return Object.entries(statusMap)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);
  },
});
