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

  // Weekly availability settings
  availability: defineTable({
    dayOfWeek: v.number(), // 0=Sunday, 1=Monday, ... 6=Saturday
    startTime: v.string(), // "09:30"
    endTime: v.string(), // "18:00"
    isAvailable: v.boolean(),
  }).index("by_day", ["dayOfWeek"]),

  // Blocked dates (holidays, days off, etc.)
  blockedDates: defineTable({
    date: v.string(), // "2026-03-25"
    reason: v.optional(v.string()),
  }).index("by_date", ["date"]),

  // Customer bookings
  bookings: defineTable({
    // Customer info
    customerName: v.string(),
    customerPhone: v.string(),
    customerEmail: v.string(),
    serviceAddress: v.string(),

    // Booking details
    serviceId: v.id("services"),
    serviceName: v.string(),
    vehicleType: v.union(v.literal("sedan"), v.literal("suv")),
    price: v.number(), // in cents

    // Schedule
    date: v.string(), // "2026-03-25"
    time: v.string(), // "10:00"

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
    .index("by_email", ["customerEmail"]),
});

export default schema;
