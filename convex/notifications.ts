/**
 * Notifications — Email + SMS confirmations & reminders for bookings.
 *
 * Email: Uses Viktor Tools Gateway (coworker_send_email) — markdown body,
 *        automatically rendered by the email service.
 * SMS:   Uses Twilio REST API (requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
 *        TWILIO_PHONE_NUMBER environment variables — gracefully skips if missing).
 *
 * Triggered from:
 *  • bookings.create → ctx.scheduler.runAfter(0, internal.notifications.sendConfirmation, ...)
 *  • crons.ts        → checkAndSendReminders (every 15 min)
 */
import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

declare const process: { env: Record<string, string | undefined> };

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const BUSINESS_NAME = "ProWorx Mobile Detailing";
const BUSINESS_PHONE = "(980) 272-1903";
const BUSINESS_EMAIL = "detailing@proworxdetailing.com";

// ═══════════════════════════════════════════════════════════════════════════════
// FORMAT HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatTime12h(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function formatDateReadable(dateStr: string): string {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, mo - 1, d);
  return dt.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOW-LEVEL SENDERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Send an email via the Viktor Tools Gateway.
 * Uses `coworker_send_email` which accepts markdown body.
 * We send the text version (markdown-formatted) since the gateway handles rendering.
 */
async function sendEmail(to: string, subject: string, _html: string, text: string): Promise<boolean> {
  const apiUrl = process.env.VIKTOR_SPACES_API_URL;
  const projectName = process.env.VIKTOR_SPACES_PROJECT_NAME;
  const projectSecret = process.env.VIKTOR_SPACES_PROJECT_SECRET;
  if (!apiUrl || !projectName || !projectSecret) {
    console.error("[notif] Viktor Spaces env vars missing");
    return false;
  }
  try {
    const resp = await fetch(`${apiUrl}/api/viktor-spaces/tools/call`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_name: projectName,
        project_secret: projectSecret,
        role: "coworker_send_email",
        arguments: {
          to: [to],
          subject,
          body: text,
        },
      }),
    });
    if (!resp.ok) {
      console.error(`[notif] Email HTTP ${resp.status}: ${await resp.text()}`);
      return false;
    }
    const json = (await resp.json()) as { success: boolean; result?: { success: boolean }; error?: string };
    if (!json.success || !json.result?.success) {
      console.error(`[notif] Email API: ${json.error}`);
      return false;
    }
    console.log(`[notif] ✉️  Email sent to ${to}: "${subject}"`);
    return true;
  } catch (err) {
    console.error("[notif] Email exception:", err);
    return false;
  }
}

async function sendSms(to: string, body: string): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!sid || !token || !from) {
    console.warn("[notif] Twilio not configured — SMS skipped");
    return false;
  }
  const toE164 = normalizePhone(to);
  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: toE164, From: from, Body: body }).toString(),
    });
    if (!resp.ok) {
      console.error(`[notif] SMS HTTP ${resp.status}: ${await resp.text()}`);
      return false;
    }
    console.log(`[notif] 📱 SMS sent to ${toE164}`);
    return true;
  } catch (err) {
    console.error("[notif] SMS exception:", err);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

function confirmationEmailBody(b: {
  customerName: string; serviceName: string; selectedVariant?: string;
  date: string; time: string; serviceAddress: string;
  totalPrice?: number; price: number; confirmationCode: string;
  addons?: Array<{ name: string; price: number }>; notes?: string;
}): { subject: string; body: string } {
  const priceFmt = formatPrice(b.totalPrice ?? b.price);
  const dateFmt = formatDateReadable(b.date);
  const timeFmt = formatTime12h(b.time);
  const variant = b.selectedVariant ? ` (${b.selectedVariant})` : "";
  const addonLines = (b.addons || []).map(a => `  - + ${a.name}: ${formatPrice(a.price)}`).join("\n");

  const subject = `Booking Confirmed — ${dateFmt} at ${timeFmt}`;
  const body = `# Booking Confirmed! ✅

Hi ${b.customerName.split(" ")[0]},

Your appointment with **${BUSINESS_NAME}** is confirmed!

---

### Confirmation Code: \`${b.confirmationCode}\`

---

| Detail | Info |
|--------|------|
| 📅 Date | **${dateFmt}** |
| ⏰ Time | **${timeFmt}** |
| 🚗 Service | **${b.serviceName}${variant}** |
| 📍 Location | **${b.serviceAddress}** |
| 💰 Total | **${priceFmt}** |
${addonLines ? `\n**Add-Ons:**\n${addonLines}\n` : ""}${b.notes ? `\n> **Notes:** ${b.notes}\n` : ""}
---

### What to Expect

- We'll arrive at your location — no need to go anywhere
- Please make sure the vehicle is accessible
- We bring all equipment, water, and power
- You'll receive a reminder before your appointment

---

Need to reschedule or have questions?

📞 **${BUSINESS_PHONE}** · ✉️ **${BUSINESS_EMAIL}**

---

*${BUSINESS_NAME} · Charlotte, NC & Surrounding Areas*`;

  return { subject, body };
}

function reminderEmailBody(b: {
  customerName: string; serviceName: string; selectedVariant?: string;
  date: string; time: string; serviceAddress: string;
  totalPrice?: number; price: number; confirmationCode: string;
  timeframe: "24h" | "2h";
}): { subject: string; body: string } {
  const priceFmt = formatPrice(b.totalPrice ?? b.price);
  const dateFmt = formatDateReadable(b.date);
  const timeFmt = formatTime12h(b.time);
  const variant = b.selectedVariant ? ` (${b.selectedVariant})` : "";
  const urgency = b.timeframe === "2h" ? "in about 2 hours" : "tomorrow";
  const emoji = b.timeframe === "2h" ? "⏰" : "📅";
  const urgencyLabel = b.timeframe === "24h" ? "Tomorrow" : "In 2 Hours";

  const subject = `${emoji} Reminder: Your Detailing is ${urgencyLabel} — ${timeFmt}`;
  const body = `# ${emoji} Appointment Reminder

Hi ${b.customerName.split(" ")[0]},

Friendly reminder — your detailing is **${urgency}**!

---

### Confirmation Code: \`${b.confirmationCode}\`

---

| Detail | Info |
|--------|------|
| 📅 Date | **${dateFmt}** |
| ⏰ Time | **${timeFmt}** |
| 🚗 Service | **${b.serviceName}${variant}** |
| 📍 Location | **${b.serviceAddress}** |
| 💰 Total | **${priceFmt}** |

---

### ✅ Quick Checklist

- Vehicle accessible at the service address
- Remove personal items from the vehicle
- We bring all equipment — nothing needed from you

---

Need to reschedule?

📞 **${BUSINESS_PHONE}** · ✉️ **${BUSINESS_EMAIL}**

---

*${BUSINESS_NAME} · Charlotte, NC & Surrounding Areas*`;

  return { subject, body };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SMS TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

function confirmationSms(b: {
  customerName: string; serviceName: string; date: string; time: string; confirmationCode: string;
}): string {
  return `ProWorx Detailing — Booking Confirmed! ✅\n\nHi ${b.customerName.split(" ")[0]}, your ${b.serviceName} is set for ${formatDateReadable(b.date)} at ${formatTime12h(b.time)}.\n\nConfirmation: ${b.confirmationCode}\nQuestions? ${BUSINESS_PHONE}`;
}

function reminderSms(b: {
  customerName: string; serviceName: string; time: string; confirmationCode: string; timeframe: "24h" | "2h";
}): string {
  const urgency = b.timeframe === "2h" ? "in ~2 hours" : "tomorrow";
  return `⏰ ProWorx Reminder — Your ${b.serviceName} is ${urgency} at ${formatTime12h(b.time)}.\n\nConfirmation: ${b.confirmationCode}\nPlease have your vehicle accessible.\nNeed to reschedule? ${BUSINESS_PHONE}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTERNAL QUERIES — Read data for actions
// ═══════════════════════════════════════════════════════════════════════════════

export const getBookingById = internalQuery({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, { bookingId }) => {
    return await ctx.db.get(bookingId);
  },
});

export const getBookingsForDates = internalQuery({
  args: { dates: v.array(v.string()) },
  handler: async (ctx, { dates }) => {
    const results = [];
    for (const date of dates) {
      const bookings = await ctx.db
        .query("bookings")
        .withIndex("by_date", (q) => q.eq("date", date))
        .collect();
      results.push(...bookings);
    }
    return results;
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// INTERNAL MUTATIONS — Mark notifications as sent
// ═══════════════════════════════════════════════════════════════════════════════

export const markConfirmationSent = internalMutation({
  args: {
    bookingId: v.id("bookings"),
    emailSent: v.boolean(),
    smsSent: v.boolean(),
  },
  handler: async (ctx, { bookingId, emailSent, smsSent }) => {
    await ctx.db.patch(bookingId, {
      confirmationEmailSent: emailSent,
      confirmationSmsSent: smsSent,
    });
  },
});

export const markReminderSent = internalMutation({
  args: {
    bookingId: v.id("bookings"),
    timeframe: v.union(v.literal("24h"), v.literal("2h")),
  },
  handler: async (ctx, { bookingId, timeframe }) => {
    if (timeframe === "24h") {
      await ctx.db.patch(bookingId, { reminder24hSent: true });
    } else {
      await ctx.db.patch(bookingId, { reminder2hSent: true });
    }
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ACTIONS — Called from scheduler / crons
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Send booking confirmation email + SMS.
 * Called via ctx.scheduler.runAfter(0, ...) from bookings.create
 */
export const sendConfirmation = internalAction({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, { bookingId }) => {
    const booking = await ctx.runQuery(internal.notifications.getBookingById, { bookingId });
    if (!booking) {
      console.error(`[notif] Booking ${bookingId} not found`);
      return;
    }
    if (booking.confirmationEmailSent && booking.confirmationSmsSent) {
      console.log(`[notif] Confirmation already sent for ${bookingId}`);
      return;
    }

    // ── Email ──
    let emailSent = booking.confirmationEmailSent ?? false;
    if (!emailSent && booking.customerEmail) {
      const { subject, body } = confirmationEmailBody({
        customerName: booking.customerName,
        serviceName: booking.serviceName,
        selectedVariant: booking.selectedVariant,
        date: booking.date,
        time: booking.time,
        serviceAddress: booking.serviceAddress,
        totalPrice: booking.totalPrice,
        price: booking.price,
        confirmationCode: booking.confirmationCode,
        addons: booking.addons,
        notes: booking.notes,
      });
      emailSent = await sendEmail(booking.customerEmail, subject, "", body);
    }

    // ── SMS ──
    let smsSent = booking.confirmationSmsSent ?? false;
    if (!smsSent && booking.customerPhone) {
      smsSent = await sendSms(
        booking.customerPhone,
        confirmationSms({
          customerName: booking.customerName,
          serviceName: booking.serviceName,
          date: booking.date,
          time: booking.time,
          confirmationCode: booking.confirmationCode,
        }),
      );
    }

    await ctx.runMutation(internal.notifications.markConfirmationSent, {
      bookingId,
      emailSent,
      smsSent,
    });

    console.log(`[notif] Confirmation for ${booking.confirmationCode}: email=${emailSent}, sms=${smsSent}`);
  },
});

/**
 * Send a reminder (24 h or 2 h) for one booking.
 */
export const sendReminder = internalAction({
  args: {
    bookingId: v.id("bookings"),
    timeframe: v.union(v.literal("24h"), v.literal("2h")),
  },
  handler: async (ctx, { bookingId, timeframe }) => {
    const booking = await ctx.runQuery(internal.notifications.getBookingById, { bookingId });
    if (!booking || booking.status === "cancelled") return;

    const alreadySent = timeframe === "24h" ? booking.reminder24hSent : booking.reminder2hSent;
    if (alreadySent) return;

    // ── Email ──
    let emailSent = false;
    if (booking.customerEmail) {
      const { subject, body } = reminderEmailBody({
        customerName: booking.customerName,
        serviceName: booking.serviceName,
        selectedVariant: booking.selectedVariant,
        date: booking.date,
        time: booking.time,
        serviceAddress: booking.serviceAddress,
        totalPrice: booking.totalPrice,
        price: booking.price,
        confirmationCode: booking.confirmationCode,
        timeframe,
      });
      emailSent = await sendEmail(booking.customerEmail, subject, "", body);
    }

    // ── SMS ──
    let smsSent = false;
    if (booking.customerPhone) {
      smsSent = await sendSms(
        booking.customerPhone,
        reminderSms({
          customerName: booking.customerName,
          serviceName: booking.serviceName,
          time: booking.time,
          confirmationCode: booking.confirmationCode,
          timeframe,
        }),
      );
    }

    await ctx.runMutation(internal.notifications.markReminderSent, { bookingId, timeframe });
    console.log(`[notif] ${timeframe} reminder for ${booking.confirmationCode}: email=${emailSent}, sms=${smsSent}`);
  },
});

/**
 * Cron job: scan upcoming bookings, schedule reminders as needed.
 * Runs every 15 minutes via crons.ts.
 */
export const checkAndSendReminders = internalAction({
  handler: async (ctx) => {
    // Eastern Time (EDT = UTC-4, EST = UTC-5).
    // In March 2026 EDT is active.
    const now = new Date();
    const etOffsetMs = -4 * 60 * 60 * 1000; // EDT
    const etNow = new Date(now.getTime() + now.getTimezoneOffset() * 60 * 1000 + etOffsetMs);

    const todayStr = etNow.toISOString().slice(0, 10);
    const tomorrowDate = new Date(etNow);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowStr = tomorrowDate.toISOString().slice(0, 10);

    // Also check day after tomorrow for 24 h reminders that fire in the evening
    const dayAfterDate = new Date(etNow);
    dayAfterDate.setDate(dayAfterDate.getDate() + 2);
    const dayAfterStr = dayAfterDate.toISOString().slice(0, 10);

    const bookings = await ctx.runQuery(internal.notifications.getBookingsForDates, {
      dates: [todayStr, tomorrowStr, dayAfterStr],
    });

    const currentMinutes = etNow.getHours() * 60 + etNow.getMinutes();

    let scheduled = 0;
    for (const booking of bookings) {
      if (booking.status === "cancelled") continue;

      // Parse appointment time
      const [appH, appM] = booking.time.split(":").map(Number);
      const appMinutes = appH * 60 + appM;

      // Calculate minutes until appointment
      let minutesUntil: number;
      if (booking.date === todayStr) {
        minutesUntil = appMinutes - currentMinutes;
      } else if (booking.date === tomorrowStr) {
        minutesUntil = (24 * 60 - currentMinutes) + appMinutes;
      } else {
        // Day after tomorrow
        minutesUntil = (48 * 60 - currentMinutes) + appMinutes;
      }

      // Skip past bookings
      if (minutesUntil < 0) continue;

      // 24 h reminder: 22–26 hour window
      if (!booking.reminder24hSent && minutesUntil >= 22 * 60 && minutesUntil <= 26 * 60) {
        await ctx.scheduler.runAfter(0, internal.notifications.sendReminder, {
          bookingId: booking._id,
          timeframe: "24h" as const,
        });
        scheduled++;
      }

      // 2 h reminder: 90–150 minute window
      if (!booking.reminder2hSent && minutesUntil >= 90 && minutesUntil <= 150) {
        await ctx.scheduler.runAfter(0, internal.notifications.sendReminder, {
          bookingId: booking._id,
          timeframe: "2h" as const,
        });
        scheduled++;
      }
    }

    if (scheduled > 0) {
      console.log(`[notif] Cron: scheduled ${scheduled} reminders`);
    }
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// REVIEW GATE — Automatic feedback request after service completion
// ═══════════════════════════════════════════════════════════════════════════════

const APP_URL = process.env.VITE_APP_URL || "https://proworx-booking-8ee2b7c6.viktor.space";

function feedbackRequestEmailBody(b: {
  customerName: string;
  serviceName: string;
  selectedVariant?: string;
  date: string;
  confirmationCode: string;
}): { subject: string; body: string } {
  const dateFmt = formatDateReadable(b.date);
  const variant = b.selectedVariant ? ` (${b.selectedVariant})` : "";
  const feedbackUrl = `${APP_URL}/feedback?code=${b.confirmationCode}`;

  const subject = `How was your detail, ${b.customerName.split(" ")[0]}?`;
  const body = `# How Was Your Experience? ⭐

Hi ${b.customerName.split(" ")[0]},

We recently completed your **${b.serviceName}${variant}** on ${dateFmt} — and we'd love to hear how it went!

---

## 👉 [Rate Your Experience](${feedbackUrl})

It only takes 10 seconds. Your feedback helps us keep delivering 5-star quality.

---

### Why It Matters

- We read every single response
- Your feedback directly shapes how we improve
- If anything wasn't perfect, we want to make it right

---

Thank you for choosing **${BUSINESS_NAME}**! We appreciate your trust.

📞 **${BUSINESS_PHONE}** · ✉️ **${BUSINESS_EMAIL}**

---

*${BUSINESS_NAME} · Charlotte, NC & Surrounding Areas*`;

  return { subject, body };
}

function feedbackRequestSms(b: {
  customerName: string;
  serviceName: string;
  confirmationCode: string;
}): string {
  const feedbackUrl = `${APP_URL}/feedback?code=${b.confirmationCode}`;
  return `Hi ${b.customerName.split(" ")[0]}! 👋 How was your ${b.serviceName} with ProWorx? We'd love your quick feedback:\n\n${feedbackUrl}\n\nTakes 10 seconds — thank you! ⭐\n— ${BUSINESS_NAME}`;
}

// Internal mutation to mark feedback request as sent
export const markFeedbackSent = internalMutation({
  args: {
    bookingId: v.id("bookings"),
    emailSent: v.boolean(),
    smsSent: v.boolean(),
  },
  handler: async (ctx, { bookingId, emailSent, smsSent }) => {
    await ctx.db.patch(bookingId, {
      followUpSent: true,
      followUpSentAt: Date.now(),
      feedbackEmailSent: emailSent,
      feedbackSmsSent: smsSent,
    });
  },
});

/**
 * Send feedback/review request after service completion.
 * Scheduled by bookings.updateStatus when marked "completed" (2-hour delay).
 * Also triggered by the cron fallback scanner.
 */
export const sendFeedbackRequest = internalAction({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, { bookingId }) => {
    const booking = await ctx.runQuery(internal.notifications.getBookingById, { bookingId });
    if (!booking) {
      console.error(`[review] Booking ${bookingId} not found`);
      return;
    }

    // Skip if already sent, cancelled, or not completed
    if (booking.followUpSent || booking.status !== "completed") {
      console.log(`[review] Skipping ${bookingId}: followUpSent=${booking.followUpSent}, status=${booking.status}`);
      return;
    }

    // ── Email ──
    let emailSent = false;
    if (booking.customerEmail) {
      const { subject, body } = feedbackRequestEmailBody({
        customerName: booking.customerName,
        serviceName: booking.serviceName,
        selectedVariant: booking.selectedVariant,
        date: booking.date,
        confirmationCode: booking.confirmationCode,
      });
      emailSent = await sendEmail(booking.customerEmail, subject, "", body);
    }

    // ── SMS ──
    let smsSent = false;
    if (booking.customerPhone) {
      smsSent = await sendSms(
        booking.customerPhone,
        feedbackRequestSms({
          customerName: booking.customerName,
          serviceName: booking.serviceName,
          confirmationCode: booking.confirmationCode,
        }),
      );
    }

    await ctx.runMutation(internal.notifications.markFeedbackSent, {
      bookingId,
      emailSent,
      smsSent,
    });

    console.log(
      `[review] Feedback request for ${booking.confirmationCode}: email=${emailSent}, sms=${smsSent}`,
    );
  },
});

/**
 * Cron fallback: scan completed bookings that haven't had feedback requests sent.
 * Sends feedback if completed > 2 hours ago and no followUpSent.
 * This catches bookings that were completed before the auto-trigger was added,
 * or where the scheduler failed.
 */
export const checkAndSendFeedbackRequests = internalAction({
  handler: async (ctx) => {
    // Get all completed bookings
    const completed = await ctx.runQuery(
      internal.notifications.getCompletedWithoutFeedback,
    );

    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    let scheduled = 0;

    for (const booking of completed) {
      // Only send if the booking was created more than 2 hours ago
      // (using _creationTime as proxy since we don't track completedAt)
      if (booking._creationTime < twoHoursAgo) {
        await ctx.scheduler.runAfter(0, internal.notifications.sendFeedbackRequest, {
          bookingId: booking._id,
        });
        scheduled++;
      }
    }

    if (scheduled > 0) {
      console.log(`[review] Cron: scheduled ${scheduled} feedback requests`);
    }
  },
});

// Internal query for the cron to find completed bookings without feedback
export const getCompletedWithoutFeedback = internalQuery({
  args: {},
  handler: async (ctx) => {
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_status", (q) => q.eq("status", "completed"))
      .collect();

    return bookings.filter((b) => !b.followUpSent && !b.satisfaction);
  },
});
