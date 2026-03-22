import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Shared validator for catalog variant (reused in multiple places)
const variantValidator = v.object({
  label: v.string(),
  price: v.number(), // cents
  durationMin: v.number(),
});

const schema = defineSchema({
  ...authTables,

  // ─── Legacy services table (kept for backward compat with existing bookings) ──
  services: defineTable({
    name: v.string(),
    description: v.string(),
    sedanPrice: v.number(),
    suvPrice: v.number(),
    duration: v.number(),
    isActive: v.boolean(),
    sortOrder: v.number(),
  }),

  // ─── NEW: Full service catalog with variants & categories ──
  serviceCatalog: defineTable({
    name: v.string(),
    slug: v.string(), // URL-friendly slug for deep links, e.g. "standard-inside-out"
    description: v.string(),
    category: v.union(
      v.literal("core"),
      v.literal("paintCorrection"),
      v.literal("ceramicCoating"),
      v.literal("interiorAddon"),
      v.literal("exteriorAddon"),
      v.literal("ceramicAddon"),
      v.literal("boatDetailing"),
      v.literal("boatCeramic"),
      v.literal("boatAddon"),
      v.literal("membership"),
    ),
    variants: v.array(variantValidator),
    isActive: v.boolean(),
    sortOrder: v.number(),
    deposit: v.optional(v.number()), // cents — for ceramic coating packages
    popular: v.optional(v.boolean()),
  })
    .index("by_category", ["category"])
    .index("by_slug", ["slug"])
    .index("by_active", ["isActive"]),

  // ─── NEW: Recurring schedule blocks (Week A / Week B custody schedule) ──
  recurringBlocks: defineTable({
    weekType: v.union(v.literal("A"), v.literal("B")),
    dayOfWeek: v.number(), // 0=Sunday .. 6=Saturday
    blockAfter: v.string(), // "16:00" — block all slots at or after this time
    reason: v.optional(v.string()),
  }).index("by_week_day", ["weekType", "dayOfWeek"]),

  // Settings for the recurring block system
  recurringBlockSettings: defineTable({
    weekAStartDate: v.string(), // Reference Monday for Week A, e.g. "2026-03-23"
    isEnabled: v.boolean(),
  }),

  // ─── Staff ──
  staff: defineTable({
    name: v.string(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.union(v.literal("owner"), v.literal("technician"), v.literal("manager")),
    isActive: v.boolean(),
    color: v.string(),
    notes: v.optional(v.string()),
  }).index("by_active", ["isActive"]),

  staffServices: defineTable({
    staffId: v.id("staff"),
    serviceId: v.id("services"),
  })
    .index("by_staff", ["staffId"])
    .index("by_service", ["serviceId"])
    .index("by_staff_service", ["staffId", "serviceId"]),

  staffAvailability: defineTable({
    staffId: v.id("staff"),
    dayOfWeek: v.number(),
    startTime: v.string(),
    endTime: v.string(),
    isAvailable: v.boolean(),
  })
    .index("by_staff", ["staffId"])
    .index("by_staff_day", ["staffId", "dayOfWeek"]),

  // ─── Service freeze ──
  serviceFreeze: defineTable({
    serviceId: v.id("services"),
    date: v.string(),
    reason: v.optional(v.string()),
  })
    .index("by_service", ["serviceId"])
    .index("by_date", ["date"])
    .index("by_service_date", ["serviceId", "date"]),

  // ─── Availability ──
  availability: defineTable({
    dayOfWeek: v.number(),
    startTime: v.string(),
    endTime: v.string(),
    isAvailable: v.boolean(),
  }).index("by_day", ["dayOfWeek"]),

  blockedDates: defineTable({
    date: v.string(),
    reason: v.optional(v.string()),
  }).index("by_date", ["date"]),

  // ─── Customers ──
  customers: defineTable({
    name: v.string(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    vehicleType: v.optional(v.union(v.literal("sedan"), v.literal("suv"))),
    vehicleYear: v.optional(v.string()),
    vehicleMake: v.optional(v.string()),
    vehicleModel: v.optional(v.string()),
    vehicleColor: v.optional(v.string()),
    notes: v.optional(v.string()),
    source: v.union(
      v.literal("booking"),
      v.literal("manual"),
      v.literal("csv"),
      v.literal("square"),
    ),
    squareCustomerId: v.optional(v.string()),
    totalBookings: v.optional(v.number()),
    totalSpent: v.optional(v.number()),
    lastServiceDate: v.optional(v.string()),
  })
    .index("by_email", ["email"])
    .index("by_phone", ["phone"])
    .index("by_name", ["name"])
    .index("by_square_id", ["squareCustomerId"]),

  // ─── Bookings ──
  bookings: defineTable({
    // Customer info
    customerName: v.string(),
    customerPhone: v.string(),
    customerEmail: v.string(),
    serviceAddress: v.string(),
    zipCode: v.optional(v.string()),
    customerId: v.optional(v.id("customers")),

    // Booking details — legacy (serviceId) or new (catalogItemId)
    serviceId: v.optional(v.id("services")), // legacy — now optional
    catalogItemId: v.optional(v.id("serviceCatalog")), // new catalog reference
    serviceName: v.string(),
    selectedVariant: v.optional(v.string()), // variant label, e.g. "Coupe/Sedan"
    vehicleType: v.optional(v.union(v.literal("sedan"), v.literal("suv"))), // legacy — now optional
    price: v.number(), // base service price in cents

    // Add-ons
    addons: v.optional(
      v.array(
        v.object({
          catalogItemId: v.optional(v.id("serviceCatalog")),
          name: v.string(),
          variantLabel: v.optional(v.string()),
          price: v.number(), // cents
          durationMin: v.number(),
        }),
      ),
    ),
    totalPrice: v.optional(v.number()), // total including addons, cents
    totalDuration: v.optional(v.number()), // total including addons, minutes

    // Schedule
    date: v.string(),
    time: v.string(),

    // Staff assignment
    staffId: v.optional(v.id("staff")),
    staffName: v.optional(v.string()),

    // Status
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled"),
    ),

    // Payment
    paymentStatus: v.union(
      v.literal("unpaid"),
      v.literal("paid"),
      v.literal("refunded"),
    ),
    paymentMethod: v.optional(v.string()),
    paymentAmount: v.optional(v.number()),
    paymentId: v.optional(v.string()),
    squarePaymentLinkUrl: v.optional(v.string()),
    squarePaymentLinkId: v.optional(v.string()),
    paidAt: v.optional(v.number()),

    // Follow-up
    followUpSent: v.optional(v.boolean()),
    satisfaction: v.optional(v.union(v.literal("yes"), v.literal("no"))),
    followUpNote: v.optional(v.string()),

    // Notes
    notes: v.optional(v.string()),

    // Confirmation code
    confirmationCode: v.string(),

    // Square import link
    squareBookingId: v.optional(v.string()),
  })
    .index("by_date", ["date"])
    .index("by_status", ["status"])
    .index("by_confirmation", ["confirmationCode"])
    .index("by_email", ["customerEmail"])
    .index("by_staff", ["staffId"])
    .index("by_staff_date", ["staffId", "date"])
    .index("by_zip_date", ["zipCode", "date"])
    .index("by_square_booking_id", ["squareBookingId"]),

  // ═══════════════════════════════════════════════════════════════════════
  // PAYROLL MODULE (ported from ProWorx Time Tracker)
  // ═══════════════════════════════════════════════════════════════════════

  payrollWorkers: defineTable({
    name: v.string(),
    hourlyRate: v.number(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    isActive: v.boolean(),
  })
    .index("by_active", ["isActive"])
    .index("by_email", ["email"]),

  payrollTimeEntries: defineTable({
    workerId: v.id("payrollWorkers"),
    date: v.string(), // YYYY-MM-DD
    startTime: v.string(), // HH:mm (24hr)
    endTime: v.string(), // HH:mm (24hr)
    hoursWorked: v.number(), // auto-calculated
    notes: v.optional(v.string()),
    // Approval workflow
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
    reviewedAt: v.optional(v.string()), // ISO timestamp
    adminNotes: v.optional(v.string()),
  })
    .index("by_worker", ["workerId"])
    .index("by_worker_date", ["workerId", "date"])
    .index("by_date", ["date"])
    .index("by_status", ["status"]),

  payrollPayouts: defineTable({
    workerId: v.id("payrollWorkers"),
    weekStart: v.string(), // YYYY-MM-DD (Monday)
    weekEnd: v.string(), // YYYY-MM-DD (Sunday)
    totalHours: v.number(),
    grossPay: v.number(),
    federalTax: v.number(),
    stateTax: v.number(),
    socialSecurity: v.number(),
    medicare: v.number(),
    totalDeductions: v.number(),
    netPay: v.number(),
    payDate: v.string(), // following Thursday YYYY-MM-DD
    isPaid: v.boolean(),
    paidAt: v.optional(v.string()), // ISO timestamp when marked paid
  })
    .index("by_worker", ["workerId"])
    .index("by_weekStart", ["weekStart"])
    .index("by_worker_weekStart", ["workerId", "weekStart"]),

  payrollTaxSettings: defineTable({
    federalRate: v.number(), // percentage e.g. 10
    stateRate: v.number(), // NC state tax percentage
    socialSecurityRate: v.number(), // 6.2
    medicareRate: v.number(), // 1.45
  }),

  // ═══════════════════════════════════════════════════════════════════════
  // WEBSITE CMS MODULE (ported from ProWorx Website Admin)
  // ═══════════════════════════════════════════════════════════════════════

  siteConfig: defineTable({
    key: v.string(),
    value: v.string(),
  }).index("by_key", ["key"]),
});

export default schema;
