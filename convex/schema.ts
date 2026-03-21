import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const schema = defineSchema({
  ...authTables,

  // Services offered by ProWorx
  services: defineTable({
    name: v.string(),
    description: v.string(),
    sedanPrice: v.number(), // in cents
    suvPrice: v.number(), // in cents
    duration: v.number(), // in minutes
    isActive: v.boolean(),
    sortOrder: v.number(),
  }),

  // Staff members
  staff: defineTable({
    name: v.string(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.union(v.literal("owner"), v.literal("technician"), v.literal("manager")),
    isActive: v.boolean(),
    color: v.string(), // hex color for calendar display, e.g. "#2563eb"
    notes: v.optional(v.string()),
  }).index("by_active", ["isActive"]),

  // Staff-to-service assignments (many-to-many)
  staffServices: defineTable({
    staffId: v.id("staff"),
    serviceId: v.id("services"),
  })
    .index("by_staff", ["staffId"])
    .index("by_service", ["serviceId"])
    .index("by_staff_service", ["staffId", "serviceId"]),

  // Per-staff availability (weekly schedule)
  staffAvailability: defineTable({
    staffId: v.id("staff"),
    dayOfWeek: v.number(), // 0=Sunday .. 6=Saturday
    startTime: v.string(), // "09:30"
    endTime: v.string(), // "18:00"
    isAvailable: v.boolean(),
  })
    .index("by_staff", ["staffId"])
    .index("by_staff_day", ["staffId", "dayOfWeek"]),

  // Per-service blocked dates (freeze booking for specific services on specific dates)
  serviceFreeze: defineTable({
    serviceId: v.id("services"),
    date: v.string(), // "2026-03-25"
    reason: v.optional(v.string()),
  })
    .index("by_service", ["serviceId"])
    .index("by_date", ["date"])
    .index("by_service_date", ["serviceId", "date"]),

  // Weekly availability settings (global/business-level)
  availability: defineTable({
    dayOfWeek: v.number(), // 0=Sunday, 1=Monday, ... 6=Saturday
    startTime: v.string(), // "09:30"
    endTime: v.string(), // "18:00"
    isAvailable: v.boolean(),
  }).index("by_day", ["dayOfWeek"]),

  // Blocked dates (holidays, days off — blocks ALL services)
  blockedDates: defineTable({
    date: v.string(), // "2026-03-25"
    reason: v.optional(v.string()),
  }).index("by_date", ["date"]),

  // Customer / Client database
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
      v.literal("booking"),   // auto-created from a booking
      v.literal("manual"),    // manually entered
      v.literal("csv"),       // imported from CSV
      v.literal("square"),    // imported from Square
    ),
    squareCustomerId: v.optional(v.string()),
    totalBookings: v.optional(v.number()),
    totalSpent: v.optional(v.number()), // cents
    lastServiceDate: v.optional(v.string()),
  })
    .index("by_email", ["email"])
    .index("by_phone", ["phone"])
    .index("by_name", ["name"])
    .index("by_square_id", ["squareCustomerId"]),

  // Customer bookings
  bookings: defineTable({
    // Customer info
    customerName: v.string(),
    customerPhone: v.string(),
    customerEmail: v.string(),
    serviceAddress: v.string(),
    zipCode: v.optional(v.string()), // ZIP / postal code for route clustering
    customerId: v.optional(v.id("customers")), // link to customer record

    // Booking details
    serviceId: v.id("services"),
    serviceName: v.string(),
    vehicleType: v.union(v.literal("sedan"), v.literal("suv")),
    price: v.number(), // in cents

    // Schedule
    date: v.string(), // "2026-03-25"
    time: v.string(), // "10:00"

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
    paymentAmount: v.optional(v.number()), // actual charged amount in cents
    paymentId: v.optional(v.string()),
    squarePaymentLinkUrl: v.optional(v.string()), // Square checkout link
    squarePaymentLinkId: v.optional(v.string()),
    paidAt: v.optional(v.number()), // timestamp

    // Follow-up
    followUpSent: v.optional(v.boolean()),
    satisfaction: v.optional(v.union(v.literal("yes"), v.literal("no"))),
    followUpNote: v.optional(v.string()),

    // Notes
    notes: v.optional(v.string()),

    // Confirmation code for customer lookup
    confirmationCode: v.string(),
  })
    .index("by_date", ["date"])
    .index("by_status", ["status"])
    .index("by_confirmation", ["confirmationCode"])
    .index("by_email", ["customerEmail"])
    .index("by_staff", ["staffId"])
    .index("by_staff_date", ["staffId", "date"])
    .index("by_zip_date", ["zipCode", "date"]),
});

export default schema;
