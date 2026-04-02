import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Employee Portal — queries scoped to the logged-in employee's data.
 * All functions require authentication and a linked payrollWorker.
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getEmployeeContext(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");

  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();

  if (!profile) {
    // Return a stub so queries return empty/null instead of crashing
    return { userId, profile: { role: null, payrollWorkerId: null, staffId: null } as any };
  }

  return { userId, profile };
}

// ─── My Time Entries ──────────────────────────────────────────────────────────

/** Get employee's own time entries (optionally filtered by date range) */
export const myTimeEntries = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, { startDate, endDate }) => {
    const { profile } = await getEmployeeContext(ctx);
    if (!profile.payrollWorkerId) return [];

    let entries = await ctx.db
      .query("payrollTimeEntries")
      .withIndex("by_worker", (q: any) => q.eq("workerId", profile.payrollWorkerId))
      .collect();

    if (startDate) entries = entries.filter((e: any) => e.date >= startDate);
    if (endDate) entries = entries.filter((e: any) => e.date <= endDate);

    return entries.sort((a: any, b: any) => b.date.localeCompare(a.date));
  },
});

/** Submit a new time entry */
export const submitTimeEntry = mutation({
  args: {
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { profile } = await getEmployeeContext(ctx);
    if (!profile.payrollWorkerId) throw new Error("No payroll worker linked");

    // Calculate hours
    const [sh, sm] = args.startTime.split(":").map(Number);
    const [eh, em] = args.endTime.split(":").map(Number);
    const startMinutes = sh * 60 + sm;
    const endMinutes = eh * 60 + em;
    const hoursWorked = Math.round(((endMinutes - startMinutes) / 60) * 100) / 100;

    if (hoursWorked <= 0) throw new Error("End time must be after start time");

    return await ctx.db.insert("payrollTimeEntries", {
      workerId: profile.payrollWorkerId,
      date: args.date,
      startTime: args.startTime,
      endTime: args.endTime,
      hoursWorked,
      notes: args.notes,
      status: "pending",
    });
  },
});

/** Delete own pending time entry */
export const deleteTimeEntry = mutation({
  args: { id: v.id("payrollTimeEntries") },
  handler: async (ctx, { id }) => {
    const { profile } = await getEmployeeContext(ctx);
    const entry = await ctx.db.get(id);
    if (!entry) throw new Error("Entry not found");
    if (entry.workerId !== profile.payrollWorkerId) throw new Error("Not your entry");
    if (entry.status !== "pending") throw new Error("Can only delete pending entries");
    await ctx.db.delete(id);
  },
});

// ─── My Payouts ───────────────────────────────────────────────────────────────

/** Get employee's payouts */
export const myPayouts = query({
  args: {},
  handler: async (ctx) => {
    const { profile } = await getEmployeeContext(ctx);
    if (!profile.payrollWorkerId) return [];

    const payouts = await ctx.db
      .query("payrollPayouts")
      .withIndex("by_worker", (q: any) => q.eq("workerId", profile.payrollWorkerId))
      .collect();

    return payouts.sort((a: any, b: any) => b.weekStart.localeCompare(a.weekStart));
  },
});

// ─── My Worker Info ───────────────────────────────────────────────────────────

/** Get employee's own worker record (name, hourly rate) */
export const myWorkerInfo = query({
  args: {},
  handler: async (ctx) => {
    const { profile } = await getEmployeeContext(ctx);
    if (!profile.payrollWorkerId) return null;

    const worker = await ctx.db.get(profile.payrollWorkerId) as {
      name: string;
      hourlyRate: number;
      phone?: string;
      email?: string;
      isActive: boolean;
    } | null;
    if (!worker) return null;

    return {
      name: worker.name,
      hourlyRate: worker.hourlyRate,
      phone: worker.phone,
      email: worker.email,
      isActive: worker.isActive,
    };
  },
});

// ─── My Stats ─────────────────────────────────────────────────────────────────

/** Get summary stats for the current week */
export const myWeekStats = query({
  args: { weekStart: v.string() },
  handler: async (ctx, { weekStart }) => {
    const { profile } = await getEmployeeContext(ctx);
    if (!profile.payrollWorkerId) {
      return { totalHours: 0, pendingHours: 0, approvedHours: 0, entries: 0 };
    }

    // Get the week's date range (Mon-Sun)
    const startDate = weekStart;
    const endDate = (() => {
      const d = new Date(weekStart + "T12:00:00");
      d.setDate(d.getDate() + 6);
      return d.toISOString().split("T")[0];
    })();

    const entries = await ctx.db
      .query("payrollTimeEntries")
      .withIndex("by_worker", (q: any) => q.eq("workerId", profile.payrollWorkerId))
      .collect();

    const weekEntries = entries.filter(
      (e: any) => e.date >= startDate && e.date <= endDate,
    );

    const totalHours = weekEntries.reduce((s: number, e: any) => s + e.hoursWorked, 0);
    const pendingHours = weekEntries
      .filter((e: any) => e.status === "pending")
      .reduce((s: number, e: any) => s + e.hoursWorked, 0);
    const approvedHours = weekEntries
      .filter((e: any) => e.status === "approved")
      .reduce((s: number, e: any) => s + e.hoursWorked, 0);

    return {
      totalHours: Math.round(totalHours * 100) / 100,
      pendingHours: Math.round(pendingHours * 100) / 100,
      approvedHours: Math.round(approvedHours * 100) / 100,
      entries: weekEntries.length,
    };
  },
});

// ─── My Assigned Jobs (from bookings) ─────────────────────────────────────────

/** Get bookings assigned to this employee's staff record (multi-staff aware) */
export const myJobs = query({
  args: { date: v.optional(v.string()) },
  handler: async (ctx, { date }) => {
    const { profile } = await getEmployeeContext(ctx);
    if (!profile.staffId) return [];
    const myStaffId = profile.staffId.toString();

    // Helper: check if booking is assigned to this employee
    const isMyBooking = (b: any) =>
      b.staffId?.toString() === myStaffId ||
      b.staffIds?.some((sid: any) => sid.toString() === myStaffId);

    // Get all bookings (optionally filtered by date)
    let bookings;
    if (date) {
      bookings = await ctx.db
        .query("bookings")
        .withIndex("by_date", (q: any) => q.eq("date", date))
        .collect();
    } else {
      const today = new Date().toISOString().split("T")[0];
      bookings = await ctx.db.query("bookings").collect();
      bookings = bookings.filter((b: any) => b.date >= today);
    }

    const myBookings = bookings.filter(isMyBooking);
    return myBookings.sort((a: any, b: any) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.time || "").localeCompare(b.time || "");
    });
  },
});

// ─── My Calendar (bookings by date range) ─────────────────────────────────────

/** Get employee's assigned bookings for a date range (for calendar view, multi-staff aware) */
export const myJobsByDateRange = query({
  args: { startDate: v.string(), endDate: v.string() },
  handler: async (ctx, { startDate, endDate }) => {
    const { profile } = await getEmployeeContext(ctx);
    if (!profile.staffId) return [];
    const myStaffId = profile.staffId.toString();

    const isMyBooking = (b: any) =>
      b.staffId?.toString() === myStaffId ||
      b.staffIds?.some((sid: any) => sid.toString() === myStaffId);

    // Get primary matches via index
    const primaryBookings = await ctx.db
      .query("bookings")
      .withIndex("by_staff_date", (q: any) =>
        q.eq("staffId", profile.staffId).gte("date", startDate),
      )
      .collect();

    // Also scan by date range for secondary assignments
    const dateBookings = await ctx.db
      .query("bookings")
      .withIndex("by_date", (q: any) => q.gte("date", startDate))
      .collect();

    const secondaryBookings = dateBookings.filter(
      (b: any) =>
        b.date <= endDate &&
        !primaryBookings.some((pb: any) => pb._id === b._id) &&
        isMyBooking(b),
    );

    const allBookings = [...primaryBookings, ...secondaryBookings];

    return allBookings
      .filter(
        (b: any) => b.date <= endDate && b.status !== "cancelled",
      )
      .map((b: any) => ({
        _id: b._id,
        customerName: b.customerName,
        customerPhone: b.customerPhone,
        serviceName: b.serviceName,
        date: b.date,
        time: b.time,
        totalDuration: b.totalDuration,
        totalPrice: b.totalPrice,
        price: b.price,
        status: b.status,
        paymentStatus: b.paymentStatus,
        serviceAddress: b.serviceAddress,
        zipCode: b.zipCode,
        confirmationCode: b.confirmationCode,
        selectedVariant: b.selectedVariant,
        staffName: b.staffName,
        staffNames: b.staffNames,
      }))
      .sort(
        (a: any, b: any) =>
          a.date.localeCompare(b.date) || a.time.localeCompare(b.time),
      );
  },
});

// ─── Get Single Job Detail ────────────────────────────────────────────────────

/** Get full booking detail — only if assigned to this employee (multi-staff aware) */
export const getMyJob = query({
  args: { id: v.id("bookings") },
  handler: async (ctx, { id }) => {
    const { profile } = await getEmployeeContext(ctx);
    if (!profile.staffId) return null;
    const booking = await ctx.db.get(id);
    if (!booking) return null;
    const myStaffId = profile.staffId.toString();
    const isAssigned =
      booking.staffId?.toString() === myStaffId ||
      (booking as any).staffIds?.some((sid: any) => sid.toString() === myStaffId);
    if (!isAssigned) return null;

    // Enrich with vehicle info from customer profile
    let vehicleInfo = null;
    if (booking.customerId) {
      const customer = await ctx.db.get(booking.customerId);
      if (customer) {
        let vehiclePhotoUrl: string | null = null;
        if (customer.vehiclePhotoId) {
          vehiclePhotoUrl = await ctx.storage.getUrl(customer.vehiclePhotoId);
        }
        vehicleInfo = {
          vehicleYear: customer.vehicleYear,
          vehicleMake: customer.vehicleMake,
          vehicleModel: customer.vehicleModel,
          vehicleColor: customer.vehicleColor,
          vehicleType: customer.vehicleType,
          vehiclePhotoUrl,
        };
      }
    }
    return { ...booking, vehicleInfo };
  },
});

// ─── Employee Status Update ───────────────────────────────────────────────────

/** Employee can update status of their assigned bookings */
export const updateMyJobStatus = mutation({
  args: {
    id: v.id("bookings"),
    status: v.union(
      v.literal("confirmed"),
      v.literal("in_progress"),
      v.literal("completed"),
    ),
  },
  handler: async (ctx, { id, status }) => {
    const { profile } = await getEmployeeContext(ctx);
    if (!profile.staffId) throw new Error("No staff profile linked");
    const booking = await ctx.db.get(id);
    if (!booking) throw new Error("Booking not found");
    const myStaffId = profile.staffId.toString();
    const isAssigned =
      booking.staffId?.toString() === myStaffId ||
      (booking as any).staffIds?.some((sid: any) => sid.toString() === myStaffId);
    if (!isAssigned) throw new Error("Not your assigned booking");
    await ctx.db.patch(id, { status });
  },
});

// ─── Employee Payment Recording ───────────────────────────────────────────────

/** Employee can record payment on their assigned bookings */
export const markMyJobPaid = mutation({
  args: {
    id: v.id("bookings"),
    paymentMethod: v.string(),
    paymentAmount: v.number(),
    paymentId: v.optional(v.string()),
  },
  handler: async (ctx, { id, paymentMethod, paymentAmount, paymentId }) => {
    const { profile } = await getEmployeeContext(ctx);
    if (!profile.staffId) throw new Error("No staff profile linked");
    const booking = await ctx.db.get(id);
    if (!booking) throw new Error("Booking not found");
    const myStaffId = profile.staffId.toString();
    const isAssigned =
      booking.staffId?.toString() === myStaffId ||
      (booking as any).staffIds?.some((sid: any) => sid.toString() === myStaffId);
    if (!isAssigned) throw new Error("Not your assigned booking");
    await ctx.db.patch(id, {
      paymentStatus: "paid",
      paymentMethod,
      paymentAmount,
      paymentId,
      paidAt: Date.now(),
    });
    // Update customer total spent
    if (booking.customerId) {
      const customer = await ctx.db.get(booking.customerId);
      if (customer) {
        await ctx.db.patch(customer._id, {
          totalSpent: (customer.totalSpent || 0) + paymentAmount,
        });
      }
    }
  },
});

// ─── Employee Notes Update ────────────────────────────────────────────────────

/** Employee can add/update notes on their assigned bookings */
export const updateMyJobNotes = mutation({
  args: {
    id: v.id("bookings"),
    notes: v.string(),
  },
  handler: async (ctx, { id, notes }) => {
    const { profile } = await getEmployeeContext(ctx);
    if (!profile.staffId) throw new Error("No staff profile linked");
    const booking = await ctx.db.get(id);
    if (!booking) throw new Error("Booking not found");
    const myStaffId = profile.staffId.toString();
    const isAssigned =
      booking.staffId?.toString() === myStaffId ||
      (booking as any).staffIds?.some((sid: any) => sid.toString() === myStaffId);
    if (!isAssigned) throw new Error("Not your assigned booking");
    await ctx.db.patch(id, { notes });
  },
});
