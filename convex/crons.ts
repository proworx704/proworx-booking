/**
 * Convex cron jobs for ProWorx Booking.
 *
 * NOTE (2026-04-28): Reminder & feedback emails DISABLED per Tyler's request.
 * All customer-facing notifications should come from Square directly.
 * Square inbound sync kept active (data only, no emails).
 */
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// DISABLED — Reminders now handled by Square
// crons.interval(
//   "checkReminders",
//   { minutes: 15 },
//   internal.notifications.checkAndSendReminders,
// );

// DISABLED — Feedback/review requests handled separately
// crons.interval(
//   "checkFeedbackRequests",
//   { minutes: 30 },
//   internal.notifications.checkAndSendFeedbackRequests,
// );

// Poll Square for new bookings every 5 minutes (sync only, no emails)
crons.interval(
  "squareInboundSync",
  { minutes: 5 },
  internal.squareInboundSync.pollNewBookings,
);

// Auto-generate payroll payouts every Monday at 6 AM ET (10:00 UTC)
// Generates payouts for the previous Mon–Sun week using approved time entries.
// Tyler can still adjust/edit payouts manually after auto-generation.
crons.weekly(
  "autoGeneratePayouts",
  { dayOfWeek: "monday", hourUTC: 10, minuteUTC: 0 },
  internal.payrollPayouts.autoGenerateWeeklyPayouts,
);

export default crons;
