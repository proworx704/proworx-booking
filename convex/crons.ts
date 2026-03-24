/**
 * Convex cron jobs for ProWorx Booking.
 *
 * • checkReminders — every 15 minutes, scans upcoming bookings and sends
 *   24-hour and 2-hour reminder emails/SMS.
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

export default crons;
