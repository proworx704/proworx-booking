/**
 * AI Assistant — LLM-powered business intelligence + edit capabilities
 *
 * Gathers real-time data from the Convex database and exposes it to an LLM
 * with function-calling tools so the AI can both answer questions AND make
 * edits (update booking status, reschedule, assign staff, etc.)
 */
import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireActionAuth } from "./authHelpers";

declare const process: { env: Record<string, string | undefined> };

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "AIzaSyARiVeXTH-XVssSeiHJFHpQz5l_k3KgQOE";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";
// Model priority list — falls back through these if one hits quota limits
const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"];

// ═══════════════════════════════════════════════════════════════════════════
// Gemini API Helper (OpenAI-compatible endpoint with auto-fallback)
// ═══════════════════════════════════════════════════════════════════════════

async function callGemini(body: Record<string, unknown>): Promise<any> {
  const models = body.model ? [body.model as string, ...GEMINI_MODELS.filter(m => m !== body.model)] : GEMINI_MODELS;
  let lastError = "";

  for (const model of models) {
    const response = await fetch(`${GEMINI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GEMINI_API_KEY}`,
      },
      body: JSON.stringify({ ...body, model }),
    });

    if (response.ok) {
      const data = await response.json();
      return data;
    }

    const text = await response.text();
    lastError = `${model}: ${response.status} - ${text.slice(0, 200)}`;
    console.log(`Gemini model ${model} failed (${response.status}), trying next...`);

    // Only retry on quota/rate limit errors (429)
    if (response.status !== 429) {
      throw new Error(`Gemini API error: ${lastError}`);
    }
  }

  throw new Error(`All Gemini models exhausted. Last error: ${lastError}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// Formatting Helpers
// ═══════════════════════════════════════════════════════════════════════════

function fmtPrice(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function dateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

function dateDaysAhead(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

// ═══════════════════════════════════════════════════════════════════════════
// Data Gathering (internalQuery)
// ═══════════════════════════════════════════════════════════════════════════

export const gatherBusinessData = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const dayOfWeek = now.toLocaleDateString("en-US", { weekday: "long" });

    const str7ago = dateDaysAgo(7);
    const str30ago = dateDaysAgo(30);
    const str90ago = dateDaysAgo(90);
    const str7future = dateDaysAhead(7);

    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lmStart = `${lm.getFullYear()}-${String(lm.getMonth() + 1).padStart(2, "0")}-01`;
    const lmEnd = new Date(now.getFullYear(), now.getMonth(), 0)
      .toISOString()
      .split("T")[0];

    const [allBookings, allCustomers, allStaff, loyaltyAccounts, loyaltySettings] =
      await Promise.all([
        ctx.db.query("bookings").collect(),
        ctx.db.query("customers").collect(),
        ctx.db.query("staff").collect(),
        ctx.db.query("loyaltyAccounts").collect(),
        ctx.db.query("loyaltySettings").first(),
      ]);

    // Booking slices
    const todayBookings = allBookings
      .filter((b) => b.date === today)
      .sort((a, b) => a.time.localeCompare(b.time));

    const upcomingBookings = allBookings
      .filter((b) => b.date > today && b.date <= str7future && b.status !== "cancelled")
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

    const unpaidBookings = allBookings
      .filter((b) => b.paymentStatus === "unpaid" && b.status !== "cancelled")
      .sort((a, b) => b.date.localeCompare(a.date));

    const recentBookings = allBookings
      .filter((b) => b.date >= str30ago && b.date <= today)
      .sort((a, b) => b.date.localeCompare(a.date));

    // Revenue helpers
    const paidSum = (list: typeof allBookings) =>
      list
        .filter((b) => b.paymentStatus === "paid")
        .reduce((s, b) => s + (b.paymentAmount || b.totalPrice || b.price || 0), 0);

    const nonCancelled = (list: typeof allBookings) =>
      list.filter((b) => b.status !== "cancelled");

    const thisMonthBookings = allBookings.filter((b) => b.date >= monthStart && b.date <= today);
    const lastMonthBookings = allBookings.filter((b) => b.date >= lmStart && b.date <= lmEnd);
    const last7Bookings = allBookings.filter((b) => b.date >= str7ago && b.date <= today);

    // Customer inactivity
    const lastBookingByEmail = new Map<string, string>();
    for (const b of allBookings) {
      if (b.status !== "cancelled" && b.customerEmail) {
        const cur = lastBookingByEmail.get(b.customerEmail) || "";
        if (b.date > cur) lastBookingByEmail.set(b.customerEmail, b.date);
      }
    }
    const inactiveCustomers = allCustomers.filter((c) => {
      if (!c.email) return false;
      const last = lastBookingByEmail.get(c.email);
      return !last || last < str90ago;
    });

    // Compact booking formatter
    const fmtBooking = (b: (typeof allBookings)[0]) => ({
      date: b.date,
      time: b.time,
      customer: b.customerName,
      phone: b.customerPhone,
      email: b.customerEmail,
      service: b.serviceName,
      variant: b.selectedVariant || b.vehicleType || "",
      price: b.totalPrice || b.price,
      status: b.status,
      payment: b.paymentStatus,
      staff: b.staffNames?.join(", ") || b.staffName || "Unassigned",
      address: b.serviceAddress,
      code: b.confirmationCode,
      notes: b.notes || "",
    });

    return {
      today,
      dayOfWeek,
      todayBookings: todayBookings.map(fmtBooking),
      upcomingBookings: upcomingBookings.slice(0, 25).map(fmtBooking),
      unpaidBookings: unpaidBookings.slice(0, 30).map(fmtBooking),
      recentBookings: recentBookings.slice(0, 50).map(fmtBooking),
      revenue: {
        thisMonth: paidSum(thisMonthBookings),
        thisMonthCount: nonCancelled(thisMonthBookings).length,
        lastMonth: paidSum(lastMonthBookings),
        lastMonthCount: nonCancelled(lastMonthBookings).length,
        last7Days: paidSum(last7Bookings),
        last7Count: nonCancelled(last7Bookings).length,
        totalUnpaid: unpaidBookings.reduce((s, b) => s + (b.totalPrice || b.price || 0), 0),
        totalUnpaidCount: unpaidBookings.length,
      },
      customers: {
        total: allCustomers.length,
        inactiveCount: inactiveCustomers.length,
        inactive90Days: inactiveCustomers.slice(0, 25).map((c) => ({
          name: c.name,
          email: c.email || "",
          phone: c.phone || "",
          lastService: lastBookingByEmail.get(c.email || "") || "Never",
        })),
      },
      staff: allStaff.filter((s) => s.isActive).map((s) => ({
        name: s.name,
        role: s.role,
        phone: s.phone || "",
      })),
      loyalty: {
        isEnabled: loyaltySettings?.isEnabled ?? false,
        programName: loyaltySettings?.programName ?? "ProWorx Rewards",
        totalMembers: loyaltyAccounts.length,
        totalPointsOutstanding: loyaltyAccounts.reduce((s, a) => s + a.currentPoints, 0),
        pointsPerDollar: loyaltySettings?.pointsPerDollar ?? 1,
      },
      allTime: {
        totalBookings: nonCancelled(allBookings).length,
        totalRevenue: paidSum(allBookings),
        totalCustomers: allCustomers.length,
      },
    };
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// Tool Mutations — edits the AI can perform
// ═══════════════════════════════════════════════════════════════════════════

export const toolUpdateBookingStatus = internalMutation({
  args: {
    confirmationCode: v.string(),
    status: v.string(),
  },
  handler: async (ctx, { confirmationCode, status }) => {
    const booking = await ctx.db
      .query("bookings")
      .withIndex("by_confirmation", (q) => q.eq("confirmationCode", confirmationCode))
      .first();
    if (!booking) return { success: false, message: `Booking ${confirmationCode} not found.` };

    const validStatuses = ["pending", "confirmed", "in_progress", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return { success: false, message: `Invalid status "${status}". Must be: ${validStatuses.join(", ")}` };
    }
    await ctx.db.patch(booking._id, { status: status as any });
    return {
      success: true,
      message: `Booking ${confirmationCode} (${booking.customerName}) status changed from "${booking.status}" → "${status}".`,
    };
  },
});

export const toolUpdatePaymentStatus = internalMutation({
  args: {
    confirmationCode: v.string(),
    paymentStatus: v.string(),
    paymentMethod: v.optional(v.string()),
  },
  handler: async (ctx, { confirmationCode, paymentStatus, paymentMethod }) => {
    const booking = await ctx.db
      .query("bookings")
      .withIndex("by_confirmation", (q) => q.eq("confirmationCode", confirmationCode))
      .first();
    if (!booking) return { success: false, message: `Booking ${confirmationCode} not found.` };

    const validPayment = ["unpaid", "paid", "refunded"];
    if (!validPayment.includes(paymentStatus)) {
      return { success: false, message: `Invalid payment status "${paymentStatus}".` };
    }

    const patch: Record<string, any> = { paymentStatus };
    if (paymentStatus === "paid") {
      patch.paidAt = Date.now();
      patch.paymentAmount = booking.totalPrice || booking.price;
      if (paymentMethod) patch.paymentMethod = paymentMethod;
    }
    await ctx.db.patch(booking._id, patch);
    return {
      success: true,
      message: `Booking ${confirmationCode} (${booking.customerName}) payment updated to "${paymentStatus}"${paymentMethod ? ` via ${paymentMethod}` : ""}.`,
    };
  },
});

export const toolRescheduleBooking = internalMutation({
  args: {
    confirmationCode: v.string(),
    newDate: v.optional(v.string()),
    newTime: v.optional(v.string()),
  },
  handler: async (ctx, { confirmationCode, newDate, newTime }) => {
    const booking = await ctx.db
      .query("bookings")
      .withIndex("by_confirmation", (q) => q.eq("confirmationCode", confirmationCode))
      .first();
    if (!booking) return { success: false, message: `Booking ${confirmationCode} not found.` };

    const patch: Record<string, any> = {};
    const changes: string[] = [];
    if (newDate) {
      patch.date = newDate;
      changes.push(`date: ${booking.date} → ${newDate}`);
    }
    if (newTime) {
      patch.time = newTime;
      changes.push(`time: ${booking.time} → ${newTime}`);
    }
    if (Object.keys(patch).length === 0) {
      return { success: false, message: "No date or time provided to reschedule." };
    }

    await ctx.db.patch(booking._id, patch);
    return {
      success: true,
      message: `Booking ${confirmationCode} (${booking.customerName}) rescheduled: ${changes.join(", ")}.`,
    };
  },
});

export const toolAssignStaff = internalMutation({
  args: {
    confirmationCode: v.string(),
    staffNames: v.array(v.string()),
  },
  handler: async (ctx, { confirmationCode, staffNames }) => {
    const booking = await ctx.db
      .query("bookings")
      .withIndex("by_confirmation", (q) => q.eq("confirmationCode", confirmationCode))
      .first();
    if (!booking) return { success: false, message: `Booking ${confirmationCode} not found.` };

    // Look up staff IDs
    const allStaff = await ctx.db.query("staff").collect();
    const matched: { id: any; name: string }[] = [];
    const notFound: string[] = [];

    for (const name of staffNames) {
      const staff = allStaff.find(
        (s) => s.name.toLowerCase() === name.toLowerCase() && s.isActive,
      );
      if (staff) {
        matched.push({ id: staff._id, name: staff.name });
      } else {
        notFound.push(name);
      }
    }

    if (matched.length === 0) {
      return { success: false, message: `No matching active staff found for: ${staffNames.join(", ")}. Available: ${allStaff.filter((s) => s.isActive).map((s) => s.name).join(", ")}` };
    }

    await ctx.db.patch(booking._id, {
      staffId: matched[0].id,
      staffName: matched[0].name,
      staffIds: matched.map((s) => s.id),
      staffNames: matched.map((s) => s.name),
    });

    let msg = `Booking ${confirmationCode} assigned to: ${matched.map((s) => s.name).join(", ")}.`;
    if (notFound.length > 0) msg += ` (Not found: ${notFound.join(", ")})`;
    return { success: true, message: msg };
  },
});

export const toolUpdateBookingNotes = internalMutation({
  args: {
    confirmationCode: v.string(),
    notes: v.string(),
  },
  handler: async (ctx, { confirmationCode, notes }) => {
    const booking = await ctx.db
      .query("bookings")
      .withIndex("by_confirmation", (q) => q.eq("confirmationCode", confirmationCode))
      .first();
    if (!booking) return { success: false, message: `Booking ${confirmationCode} not found.` };

    await ctx.db.patch(booking._id, { notes });
    return {
      success: true,
      message: `Notes updated on booking ${confirmationCode} (${booking.customerName}).`,
    };
  },
});

export const toolUpdateCustomer = internalMutation({
  args: {
    email: v.string(),
    updates: v.object({
      name: v.optional(v.string()),
      phone: v.optional(v.string()),
      address: v.optional(v.string()),
      notes: v.optional(v.string()),
    }),
  },
  handler: async (ctx, { email, updates }) => {
    const customer = await ctx.db
      .query("customers")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!customer) return { success: false, message: `Customer with email "${email}" not found.` };

    const patch: Record<string, any> = {};
    const changes: string[] = [];
    if (updates.name !== undefined) { patch.name = updates.name; changes.push(`name → ${updates.name}`); }
    if (updates.phone !== undefined) { patch.phone = updates.phone; changes.push(`phone → ${updates.phone}`); }
    if (updates.address !== undefined) { patch.address = updates.address; changes.push(`address → ${updates.address}`); }
    if (updates.notes !== undefined) { patch.notes = updates.notes; changes.push(`notes updated`); }

    if (Object.keys(patch).length === 0) {
      return { success: false, message: "No updates provided." };
    }

    await ctx.db.patch(customer._id, patch);
    return {
      success: true,
      message: `Customer "${customer.name}" updated: ${changes.join(", ")}.`,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// LLM Tool Definitions (OpenAI function-calling format)
// ═══════════════════════════════════════════════════════════════════════════

const LLM_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "update_booking_status",
      description: "Change the status of a booking. Use the confirmationCode (e.g. PW-XXXXXX) to identify the booking.",
      parameters: {
        type: "object",
        properties: {
          confirmationCode: { type: "string", description: "Booking confirmation code (e.g. PW-A3B2C4)" },
          status: {
            type: "string",
            enum: ["pending", "confirmed", "in_progress", "completed", "cancelled"],
            description: "New booking status",
          },
        },
        required: ["confirmationCode", "status"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_payment_status",
      description: "Update payment status on a booking. Can mark as paid, unpaid, or refunded.",
      parameters: {
        type: "object",
        properties: {
          confirmationCode: { type: "string", description: "Booking confirmation code" },
          paymentStatus: {
            type: "string",
            enum: ["unpaid", "paid", "refunded"],
            description: "New payment status",
          },
          paymentMethod: {
            type: "string",
            description: "Payment method (e.g. cash, card, square, zelle). Optional.",
          },
        },
        required: ["confirmationCode", "paymentStatus"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "reschedule_booking",
      description: "Reschedule a booking to a new date and/or time. Provide at least one of newDate or newTime.",
      parameters: {
        type: "object",
        properties: {
          confirmationCode: { type: "string", description: "Booking confirmation code" },
          newDate: { type: "string", description: "New date in YYYY-MM-DD format. Optional." },
          newTime: { type: "string", description: "New time in HH:mm (24-hour) format, e.g. '14:00'. Optional." },
        },
        required: ["confirmationCode"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "assign_staff",
      description: "Assign one or more staff members to a booking. Use staff names (must match active staff).",
      parameters: {
        type: "object",
        properties: {
          confirmationCode: { type: "string", description: "Booking confirmation code" },
          staffNames: {
            type: "array",
            items: { type: "string" },
            description: "Array of staff member names to assign",
          },
        },
        required: ["confirmationCode", "staffNames"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_booking_notes",
      description: "Update or replace the notes on a booking.",
      parameters: {
        type: "object",
        properties: {
          confirmationCode: { type: "string", description: "Booking confirmation code" },
          notes: { type: "string", description: "New notes text (replaces existing notes)" },
        },
        required: ["confirmationCode", "notes"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_customer",
      description: "Update customer information (name, phone, address, or notes). Identify customer by email.",
      parameters: {
        type: "object",
        properties: {
          email: { type: "string", description: "Customer email address to look up" },
          name: { type: "string", description: "New customer name. Optional." },
          phone: { type: "string", description: "New phone number. Optional." },
          address: { type: "string", description: "New address. Optional." },
          notes: { type: "string", description: "New notes. Optional." },
        },
        required: ["email"],
      },
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// System Prompt Builder
// ═══════════════════════════════════════════════════════════════════════════

function buildSystemPrompt(d: any): string {
  const section = (title: string, body: string) => `═══ ${title} ═══\n${body}`;

  const bookingLine = (b: any) =>
    `• ${b.date} ${b.time} | ${b.customer} | ${b.service}${b.variant ? ` (${b.variant})` : ""} | ${fmtPrice(b.price)} | ${b.status} | ${b.payment} | Staff: ${b.staff} | Code: ${b.code}`;

  const todaySec = d.todayBookings.length === 0
    ? "No bookings today."
    : d.todayBookings
        .map((b: any) =>
          `• ${b.time} | ${b.customer} | ${b.service}${b.variant ? ` (${b.variant})` : ""} | ${fmtPrice(b.price)} | ${b.status} | ${b.payment} | Staff: ${b.staff} | 📍 ${b.address} | 📞 ${b.phone} | Code: ${b.code}${b.notes ? ` | Notes: ${b.notes}` : ""}`)
        .join("\n");

  const upcomingSec = d.upcomingBookings.length === 0
    ? "No upcoming bookings."
    : d.upcomingBookings.map(bookingLine).join("\n");

  const unpaidSec = d.unpaidBookings.length === 0
    ? "No unpaid bookings! 🎉"
    : d.unpaidBookings.map((b: any) =>
        `• ${b.date} | ${b.customer} | ${b.service} | ${fmtPrice(b.price)} | 📞 ${b.phone} | ✉️ ${b.email} | Code: ${b.code}`)
        .join("\n");

  const recentSec = d.recentBookings.length === 0
    ? "No bookings in the last 30 days."
    : d.recentBookings.map(bookingLine).join("\n");

  const inactiveSec = d.customers.inactiveCount === 0
    ? "All customers are active!"
    : `${d.customers.inactiveCount} customers haven't booked in 90+ days:\n` +
      d.customers.inactive90Days.map((c: any) =>
        `• ${c.name} | ${c.email} | ${c.phone} | Last: ${c.lastService}`).join("\n");

  const staffSec = d.staff.map((s: any) =>
    `• ${s.name} (${s.role})${s.phone ? ` | ${s.phone}` : ""}`).join("\n") || "No active staff.";

  const revChange = d.revenue.lastMonth > 0
    ? ` (${d.revenue.thisMonth >= d.revenue.lastMonth ? "+" : ""}${Math.round(((d.revenue.thisMonth - d.revenue.lastMonth) / d.revenue.lastMonth) * 100)}% vs last month)`
    : "";

  return `You are the ProWorx AI Assistant — an intelligent business helper for ProWorx Mobile Detailing, a premium mobile auto detailing service in Charlotte, NC.

You have LIVE access to the business database. You can both ANSWER QUESTIONS and MAKE EDITS using the available tools.

GUIDELINES:
• Be concise and direct. Use bullet points and tables when helpful.
• All prices in the data are in CENTS — always divide by 100 when displaying.
• When comparing periods, show both values and the percentage change.
• If the data doesn't contain what's needed, say so clearly.
• Offer actionable insights and follow-up suggestions when relevant.
• Professional yet friendly tone — you're a trusted business partner.

EDITING RULES:
• You have tools to update bookings, payments, scheduling, staff assignments, and customer records.
• Always use the confirmationCode (like PW-XXXXXX) to identify bookings.
• When making edits, confirm what you changed in your response.
• If a request is ambiguous (e.g. multiple matching bookings), ask for clarification.
• Use tools from the data context — match customer names, dates, etc. to find the right confirmation code.

${section("CURRENT DATE", `${d.today} (${d.dayOfWeek})\nBusiness Hours: Mon–Fri 9:30 AM – 6:00 PM | Sat 9:30 AM – 3:00 PM | Sun Closed`)}

${section(`TODAY'S SCHEDULE (${d.today})`, todaySec)}

${section("UPCOMING BOOKINGS (Next 7 Days)", upcomingSec)}

${section("REVENUE SNAPSHOT", `This Month: ${fmtPrice(d.revenue.thisMonth)} from ${d.revenue.thisMonthCount} bookings${revChange}
Last Month: ${fmtPrice(d.revenue.lastMonth)} from ${d.revenue.lastMonthCount} bookings
Last 7 Days: ${fmtPrice(d.revenue.last7Days)} from ${d.revenue.last7Count} bookings
Unpaid Outstanding: ${fmtPrice(d.revenue.totalUnpaid)} across ${d.revenue.totalUnpaidCount} bookings
All-Time Revenue: ${fmtPrice(d.allTime.totalRevenue)} from ${d.allTime.totalBookings} bookings`)}

${section("UNPAID BOOKINGS", unpaidSec)}

${section("CUSTOMERS", `Total: ${d.customers.total}\nInactive 90+ days: ${d.customers.inactiveCount}\n${inactiveSec}`)}

${section("STAFF", staffSec)}

${section("RECENT BOOKINGS (Last 30 Days)", recentSec)}

${section(`LOYALTY PROGRAM — ${d.loyalty.programName}`, `Status: ${d.loyalty.isEnabled ? "Active" : "Inactive"}\nMembers: ${d.loyalty.totalMembers}\nPoints Outstanding: ${d.loyalty.totalPointsOutstanding.toLocaleString()}\nEarning Rate: ${d.loyalty.pointsPerDollar} pt/$1`)}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// Tool Executor — runs the mutations for each LLM tool call
// ═══════════════════════════════════════════════════════════════════════════

async function executeTool(
  ctx: any,
  name: string,
  args: Record<string, any>,
): Promise<string> {
  try {
    let result: any;
    switch (name) {
      case "update_booking_status":
        result = await ctx.runMutation(internal.aiAssistant.toolUpdateBookingStatus, {
          confirmationCode: args.confirmationCode,
          status: args.status,
        });
        break;
      case "update_payment_status":
        result = await ctx.runMutation(internal.aiAssistant.toolUpdatePaymentStatus, {
          confirmationCode: args.confirmationCode,
          paymentStatus: args.paymentStatus,
          paymentMethod: args.paymentMethod,
        });
        break;
      case "reschedule_booking":
        result = await ctx.runMutation(internal.aiAssistant.toolRescheduleBooking, {
          confirmationCode: args.confirmationCode,
          newDate: args.newDate,
          newTime: args.newTime,
        });
        break;
      case "assign_staff":
        result = await ctx.runMutation(internal.aiAssistant.toolAssignStaff, {
          confirmationCode: args.confirmationCode,
          staffNames: args.staffNames,
        });
        break;
      case "update_booking_notes":
        result = await ctx.runMutation(internal.aiAssistant.toolUpdateBookingNotes, {
          confirmationCode: args.confirmationCode,
          notes: args.notes,
        });
        break;
      case "update_customer":
        result = await ctx.runMutation(internal.aiAssistant.toolUpdateCustomer, {
          email: args.email,
          updates: {
            name: args.name,
            phone: args.phone,
            address: args.address,
            notes: args.notes,
          },
        });
        break;
      default:
        return JSON.stringify({ success: false, message: `Unknown tool: ${name}` });
    }
    return JSON.stringify(result);
  } catch (err: any) {
    return JSON.stringify({ success: false, message: `Error: ${err.message}` });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Chat Action (with function-calling loop)
// ═══════════════════════════════════════════════════════════════════════════

export const chat = action({
  args: {
    messages: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
      }),
    ),
  },
  returns: v.string(),
  handler: async (ctx, { messages }) => {
    await requireActionAuth(ctx);

    // 1. Gather live business data
    const data = await ctx.runQuery(internal.aiAssistant.gatherBusinessData);
    const systemPrompt = buildSystemPrompt(data);

    // 2. Build initial LLM messages
    const llmMessages: any[] = [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    // 3. Function-calling loop (max 5 iterations to prevent runaway)
    const MAX_TOOL_ROUNDS = 5;
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const result = await callGemini({
        model: GEMINI_MODELS[0],
        messages: llmMessages,
        tools: LLM_TOOLS,
        tool_choice: "auto",
        temperature: 0.4,
        max_tokens: 2500,
      });

      const choice = result?.choices?.[0];
      if (!choice) {
        throw new Error("No response from AI");
      }

      const assistantMessage = choice.message;

      // If the LLM wants to call tools
      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        // Add the assistant message (with tool_calls) to the conversation
        llmMessages.push(assistantMessage);

        // Execute each tool call and add results
        for (const toolCall of assistantMessage.tool_calls) {
          const fnName = toolCall.function.name;
          let fnArgs: Record<string, any> = {};
          try {
            fnArgs = JSON.parse(toolCall.function.arguments);
          } catch {
            fnArgs = {};
          }

          console.log(`AI Tool Call: ${fnName}(${JSON.stringify(fnArgs)})`);
          const toolResult = await executeTool(ctx, fnName, fnArgs);
          console.log(`AI Tool Result: ${toolResult}`);

          llmMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: toolResult,
          });
        }
        // Continue the loop — let the LLM process tool results
        continue;
      }

      // LLM returned a text response — we're done
      const content =
        assistantMessage.content ??
        (typeof result === "string" ? result : null);

      if (content) return content;
      throw new Error("Could not parse AI response");
    }

    return "I performed multiple actions but couldn't generate a final summary. Please check the dashboard to verify the changes.";
  },
});
