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
    features: v.optional(v.array(v.string())), // feature bullet points (memberships)
    subscriptionUrl: v.optional(v.string()), // subscription/sign-up link (memberships)
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
    vehiclePhotoId: v.optional(v.id("_storage")),
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

    // Staff assignment (multi-staff)
    staffId: v.optional(v.id("staff")),       // primary/lead staff (kept for index compat)
    staffName: v.optional(v.string()),         // primary staff name
    staffIds: v.optional(v.array(v.id("staff"))),   // ALL assigned staff
    staffNames: v.optional(v.array(v.string())),     // ALL staff names (parallel array)

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

    // Follow-up & Review Gate
    followUpSent: v.optional(v.boolean()),
    followUpSentAt: v.optional(v.number()), // ms epoch — when feedback request was sent
    satisfaction: v.optional(v.union(v.literal("yes"), v.literal("no"))),
    satisfactionRating: v.optional(v.number()), // 1-5 star rating
    followUpNote: v.optional(v.string()),
    googleReviewClicked: v.optional(v.boolean()), // tracked when customer clicks review link

    // Notes
    notes: v.optional(v.string()),

    // Confirmation code
    confirmationCode: v.string(),

    // Square import link
    squareBookingId: v.optional(v.string()),

    // ─── Notification tracking ──
    confirmationEmailSent: v.optional(v.boolean()),
    confirmationSmsSent: v.optional(v.boolean()),
    reminder24hSent: v.optional(v.boolean()),
    reminder2hSent: v.optional(v.boolean()),
    feedbackEmailSent: v.optional(v.boolean()),
    feedbackSmsSent: v.optional(v.boolean()),

    // ─── Marketing Attribution / Lead Source Tracking ──
    leadSource: v.optional(v.union(
      v.literal("google_ads"),
      v.literal("google_local"),
      v.literal("facebook_ads"),
      v.literal("instagram_ads"),
      v.literal("google_organic"),
      v.literal("yelp"),
      v.literal("referral"),
      v.literal("direct"),
      v.literal("other"),
    )),
    utmSource: v.optional(v.string()),     // e.g. "google", "facebook", "instagram"
    utmMedium: v.optional(v.string()),     // e.g. "cpc", "social", "organic"
    utmCampaign: v.optional(v.string()),   // e.g. "spring_sale_2026"
    utmContent: v.optional(v.string()),    // e.g. "banner_ad_1"
    utmTerm: v.optional(v.string()),       // e.g. "car detailing charlotte"
    referrerUrl: v.optional(v.string()),   // raw document.referrer
    landingPage: v.optional(v.string()),   // e.g. "/book?service=ceramic-coating"
  })
    .index("by_date", ["date"])
    .index("by_status", ["status"])
    .index("by_confirmation", ["confirmationCode"])
    .index("by_email", ["customerEmail"])
    .index("by_staff", ["staffId"])
    .index("by_staff_date", ["staffId", "date"])
    .index("by_zip_date", ["zipCode", "date"])
    .index("by_square_booking_id", ["squareBookingId"])
    .index("by_lead_source", ["leadSource"]),

  // ═══════════════════════════════════════════════════════════════════════
  // AD SPEND TRACKING — Monthly spend per channel for ROI calculation
  // ═══════════════════════════════════════════════════════════════════════
  adSpend: defineTable({
    channel: v.union(
      v.literal("google_ads"),
      v.literal("google_local"),
      v.literal("facebook_ads"),
      v.literal("instagram_ads"),
      v.literal("yelp"),
      v.literal("other"),
    ),
    month: v.string(),      // "2026-03" format
    spend: v.number(),      // cents
    notes: v.optional(v.string()),
    updatedAt: v.number(),  // ms epoch
  })
    .index("by_channel", ["channel"])
    .index("by_month", ["month"])
    .index("by_channel_month", ["channel", "month"]),

  // ═══════════════════════════════════════════════════════════════════════
  // LIVE AD CAMPAIGN METRICS — Synced from Google Ads & Meta Ads APIs
  // ═══════════════════════════════════════════════════════════════════════
  adCampaignMetrics: defineTable({
    platform: v.union(v.literal("google_ads"), v.literal("meta_ads")),
    campaignId: v.string(),
    campaignName: v.string(),
    campaignStatus: v.string(),       // ENABLED, PAUSED, etc.
    date: v.string(),                 // YYYY-MM-DD
    impressions: v.number(),
    clicks: v.number(),
    cost: v.number(),                 // cents
    conversions: v.number(),
    ctr: v.number(),                  // decimal (0.078 = 7.8%)
    avgCpc: v.number(),               // cents
    costPerConversion: v.number(),    // cents
    lastSyncedAt: v.number(),         // ms epoch
  })
    .index("by_platform", ["platform"])
    .index("by_platform_date", ["platform", "date"])
    .index("by_campaign_date", ["campaignId", "date"]),

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

  // Site photos — images used on the public website
  sitePhotos: defineTable({
    storageId: v.id("_storage"),
    url: v.string(),
    filename: v.string(),
    section: v.string(), // e.g. "hero", "gallery", "about", "services", "boats", "memberships"
    alt: v.optional(v.string()),
    sortOrder: v.number(),
  }).index("by_section", ["section", "sortOrder"]),

  // Site pages — editable text content for all website pages
  sitePages: defineTable({
    slug: v.string(), // e.g. "home", "services", "boat-detailing", "memberships", "about"
    title: v.string(),
    sections: v.array(v.object({
      key: v.string(),
      label: v.string(),
      content: v.string(),
      type: v.union(v.literal("text"), v.literal("textarea"), v.literal("html")),
    })),
  }).index("by_slug", ["slug"]),

  // ═══════════════════════════════════════════════════════════════════════
  // CALENDAR EVENTS — Personal events, day blocks, vacation, etc.
  // ═══════════════════════════════════════════════════════════════════════

  calendarEvents: defineTable({
    title: v.string(),
    eventType: v.union(
      v.literal("personal"),
      v.literal("vacation"),
      v.literal("block"),
      v.literal("other"),
    ),
    // Date range — supports single-day and multi-day events
    startDate: v.string(), // YYYY-MM-DD
    endDate: v.string(),   // YYYY-MM-DD (same as startDate for single-day)
    // Time — only used when allDay is false
    startTime: v.optional(v.string()), // HH:mm (24hr)
    endTime: v.optional(v.string()),   // HH:mm (24hr)
    allDay: v.boolean(),
    blockTime: v.boolean(), // If true, prevents bookings during this time
    notes: v.optional(v.string()),
    color: v.optional(v.string()), // Custom color for the event
    createdBy: v.optional(v.id("users")),
  })
    .index("by_startDate", ["startDate"])
    .index("by_endDate", ["endDate"]),

  // ═══════════════════════════════════════════════════════════════════════
  // USER PROFILES — Role-based access control
  // ═══════════════════════════════════════════════════════════════════════

  userProfiles: defineTable({
    userId: v.id("users"),
    role: v.union(
      v.literal("owner"),    // Full access — Tyler
      v.literal("admin"),    // Full access — managers
      v.literal("employee"), // Employee portal only
      v.literal("client"),   // Client portal — loyalty, bookings, profile
    ),
    displayName: v.string(),
    staffId: v.optional(v.id("staff")),             // Link to staff table
    payrollWorkerId: v.optional(v.id("payrollWorkers")), // Link to payroll worker
    customerId: v.optional(v.id("customers")),       // Link to customer (for clients)
  })
    .index("by_user", ["userId"])
    .index("by_role", ["role"])
    .index("by_staff", ["staffId"])
    .index("by_worker", ["payrollWorkerId"])
    .index("by_customer", ["customerId"]),

  // ═══════════════════════════════════════════════════════════════════════
  // LOYALTY PROGRAM MODULE
  // ═══════════════════════════════════════════════════════════════════════

  // One loyalty account per customer — tracks balances
  loyaltyAccounts: defineTable({
    customerId: v.id("customers"),
    currentPoints: v.number(),     // available balance
    lifetimeEarned: v.number(),    // total ever earned
    lifetimeRedeemed: v.number(),  // total ever redeemed
    lastEarnedAt: v.optional(v.number()),   // ms epoch
    lastRedeemedAt: v.optional(v.number()), // ms epoch
  })
    .index("by_customer", ["customerId"])
    .index("by_points", ["currentPoints"]),

  // Every point change — full audit trail
  loyaltyTransactions: defineTable({
    loyaltyAccountId: v.id("loyaltyAccounts"),
    customerId: v.id("customers"),
    type: v.union(
      v.literal("earn"),            // Earned from a completed booking
      v.literal("redeem"),          // Redeemed for a reward/discount
      v.literal("bonus"),           // Amplifier bonus points
      v.literal("adjust"),          // Manual admin adjustment
      v.literal("expire"),          // Points expired (future use)
    ),
    points: v.number(),             // positive for earn/bonus, negative for redeem
    description: v.string(),        // Human-readable description
    bookingId: v.optional(v.id("bookings")),      // Which booking earned these points
    rewardId: v.optional(v.id("loyaltyRewards")), // Which reward was redeemed
    amplifierId: v.optional(v.id("loyaltyAmplifiers")), // Which amplifier applied
    createdBy: v.optional(v.string()), // admin name who made adjustment
    expired: v.optional(v.boolean()),  // Marked true after expiration processing
    expiresAt: v.optional(v.number()), // Timestamp when these points expire
  })
    .index("by_account", ["loyaltyAccountId"])
    .index("by_customer", ["customerId"])
    .index("by_booking", ["bookingId"])
    .index("by_type", ["type"]),

  // Available rewards customers can redeem
  loyaltyRewards: defineTable({
    name: v.string(),              // e.g. "$25 Off Any Service"
    description: v.string(),
    pointsCost: v.number(),        // Points needed to redeem
    rewardType: v.union(
      v.literal("discount_fixed"),   // Fixed dollar discount
      v.literal("discount_percent"), // Percentage discount
      v.literal("free_service"),     // Free service
      v.literal("custom"),           // Custom reward
    ),
    discountAmount: v.optional(v.number()),  // cents, for fixed discounts
    discountPercent: v.optional(v.number()), // percentage, for percent discounts
    isActive: v.boolean(),
    sortOrder: v.number(),
    totalRedemptions: v.number(),   // Counter
    icon: v.optional(v.string()),   // Emoji or icon name
  })
    .index("by_active", ["isActive"])
    .index("by_points_cost", ["pointsCost"]),

  // Promotional amplifiers — boost earning rate
  loyaltyAmplifiers: defineTable({
    name: v.string(),              // e.g. "2x Tuesday Points"
    description: v.string(),
    amplifierType: v.union(
      v.literal("multiplier"),     // e.g. 2x, 3x points
      v.literal("bonus"),          // Flat bonus points added
    ),
    multiplier: v.optional(v.number()),    // e.g. 2.0 for double points
    bonusPoints: v.optional(v.number()),   // e.g. 200 for +200 bonus
    // Conditions — when does this amplifier apply?
    daysOfWeek: v.optional(v.array(v.number())),  // 0=Sun..6=Sat, null = all days
    serviceCategories: v.optional(v.array(v.string())), // null = all services
    minSpendCents: v.optional(v.number()),  // Minimum booking amount to qualify
    // Schedule
    startDate: v.string(),         // YYYY-MM-DD
    endDate: v.string(),           // YYYY-MM-DD
    isActive: v.boolean(),
    createdBy: v.optional(v.string()),
  })
    .index("by_active", ["isActive"])
    .index("by_dates", ["startDate", "endDate"]),

  // Program settings (single-row config)
  loyaltySettings: defineTable({
    pointsPerDollar: v.number(),              // Default earning rate (e.g. 1 = 1pt/$1)
    programName: v.string(),                  // Display name for the program
    isEnabled: v.boolean(),                   // Master on/off switch
    // Point expiration
    expirationEnabled: v.optional(v.boolean()),    // Whether points expire at all
    expirationDays: v.optional(v.number()),        // Days until points expire (e.g. 365)
    expirationWarningDays: v.optional(v.number()), // Days before expiry to warn client (e.g. 30)
    // Earning rules
    minSpendForPoints: v.optional(v.number()),     // Min spend in cents to earn points (0 = always)
    roundingMode: v.optional(v.string()),          // "floor" | "round" | "ceil" — how to round fractional pts
    // Redemption rules
    minPointsToRedeem: v.optional(v.number()),     // Min points before client can redeem anything
    maxRedemptionPercent: v.optional(v.number()),   // Max % of a booking that can be paid with points (e.g. 100)
    allowPartialRedemption: v.optional(v.boolean()), // Can clients use fewer pts than reward cost?
    // Client portal
    clientPortalEnabled: v.optional(v.boolean()),   // Enable/disable client self-service portal
    showPointsOnBooking: v.optional(v.boolean()),   // Show estimated points on booking confirmation
  }),

  // ═══════════════════════════════════════════════════════════════════════
  // CLIENT SUPPORT TICKETS
  // ═══════════════════════════════════════════════════════════════════════
  supportTickets: defineTable({
    customerId: v.optional(v.id("customers")),
    userId: v.optional(v.id("users")),
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    category: v.union(
      v.literal("booking_issue"),
      v.literal("payment_issue"),
      v.literal("loyalty_question"),
      v.literal("service_feedback"),
      v.literal("account_help"),
      v.literal("general"),
    ),
    subject: v.string(),
    message: v.string(),
    status: v.union(
      v.literal("open"),
      v.literal("in_progress"),
      v.literal("resolved"),
      v.literal("closed"),
    ),
    priority: v.union(
      v.literal("low"),
      v.literal("normal"),
      v.literal("high"),
    ),
    adminNotes: v.optional(v.string()),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_customer", ["customerId"])
    .index("by_status", ["status"])
    .index("by_email", ["email"]),

  // ═══════════════════════════════════════════════════════════════════════
  // MARKETING OPT-INS
  // ═══════════════════════════════════════════════════════════════════════
  marketingOptIns: defineTable({
    customerId: v.optional(v.id("customers")),
    userId: v.optional(v.id("users")),
    email: v.string(),
    name: v.string(),
    phone: v.optional(v.string()),
    optedInAt: v.number(),        // ms epoch
    optedOutAt: v.optional(v.number()),  // ms epoch if they unsubscribed
    isActive: v.boolean(),
    source: v.union(
      v.literal("portal_registration"),
      v.literal("portal_settings"),
      v.literal("admin_import"),
      v.literal("booking"),
    ),
  })
    .index("by_email", ["email"])
    .index("by_customer", ["customerId"])
    .index("by_active", ["isActive"]),

  // ═══════════════════════════════════════════════════════════════════════
  // EMAIL CAMPAIGNS
  // ═══════════════════════════════════════════════════════════════════════
  emailCampaigns: defineTable({
    name: v.string(),
    subject: v.string(),
    body: v.string(),                // HTML content
    templateType: v.union(
      v.literal("coupon"),
      v.literal("announcement"),
      v.literal("seasonal"),
      v.literal("thank_you"),
      v.literal("newsletter"),
      v.literal("custom"),
    ),
    status: v.union(
      v.literal("draft"),
      v.literal("scheduled"),
      v.literal("sending"),
      v.literal("sent"),
      v.literal("failed"),
    ),
    audience: v.union(
      v.literal("all"),              // all customers with email
      v.literal("recent"),           // booked in last 90 days
      v.literal("inactive"),         // no booking in 90+ days
      v.literal("high_value"),       // top 20% by spend
    ),
    audienceCount: v.optional(v.number()),
    scheduledAt: v.optional(v.number()),   // ms epoch
    sentAt: v.optional(v.number()),        // ms epoch
    createdAt: v.number(),
    updatedAt: v.number(),
    // Coupon-specific fields
    couponCode: v.optional(v.string()),
    couponAmount: v.optional(v.number()),  // cents
    couponPercent: v.optional(v.number()), // e.g. 10 for 10%
    couponExpiry: v.optional(v.string()),  // YYYY-MM-DD
    // Stats
    totalSent: v.optional(v.number()),
    totalFailed: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"]),

  emailSends: defineTable({
    campaignId: v.id("emailCampaigns"),
    email: v.string(),
    customerName: v.string(),
    status: v.union(
      v.literal("queued"),
      v.literal("sent"),
      v.literal("failed"),
    ),
    sentAt: v.optional(v.number()),
    error: v.optional(v.string()),
  })
    .index("by_campaign", ["campaignId"])
    .index("by_status", ["status"]),

  // ─── System settings (secure key-value store for API keys etc.) ──────────
  systemSettings: defineTable({
    key: v.string(),       // e.g. "gemini_api_key"
    value: v.string(),     // the setting value
    updatedAt: v.number(), // ms epoch
  }).index("by_key", ["key"]),
});

export default schema;
