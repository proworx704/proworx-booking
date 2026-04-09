/**
 * Convex cron jobs for ProWorx Booking.
 *
 * • checkReminders — every 15 minutes, scans upcoming bookings and sends
 *   24-hour and 2-hour reminder emails/SMS.
 * • checkFeedbackRequests — every 30 minutes, scans completed bookings and
 *   sends feedback/review requests (Google Review Gate).
 */
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run the reminder checker every 15 minutes
crons.interval(
  "checkReminders",
  { minutes: 15 },
  internal.notifications.checkAndSendReminders,
);

// Run the feedback/review request checker every 30 minutes
crons.interval(
  "checkFeedbackRequests",
  { minutes: 30 },
  internal.notifications.checkAndSendFeedbackRequests,
);

// Poll Square for new bookings every 5 minutes and auto-send agreements
crons.interval(
  "squareInboundSync",
  { minutes: 5 },
  internal.squareInboundSync.pollNewBookings,
);

export default crons;
