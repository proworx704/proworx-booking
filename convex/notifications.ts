/**
 * Notifications — Email + SMS confirmations & reminders for bookings.
 *
 * Email: Uses Viktor Spaces transactional email API (works immediately).
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

async function sendEmail(to: string, subject: string, html: string, text: string): Promise<boolean> {
  const apiUrl = process.env.VIKTOR_SPACES_API_URL;
  const projectName = process.env.VIKTOR_SPACES_PROJECT_NAME;
  const projectSecret = process.env.VIKTOR_SPACES_PROJECT_SECRET;
  if (!apiUrl || !projectName || !projectSecret) {
    console.error("[notif] Viktor Spaces env vars missing");
    return false;
  }
  try {
    const resp = await fetch(`${apiUrl}/api/viktor-spaces/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_name: projectName,
        project_secret: projectSecret,
        to_email: to,
        subject,
        html_content: html,
        text_content: text,
        email_type: "transactional",
      }),
    });
    if (!resp.ok) {
      console.error(`[notif] Email HTTP ${resp.status}: ${await resp.text()}`);
      return false;
    }
    const json = (await resp.json()) as { success: boolean; error?: string };
    if (!json.success) { console.error(`[notif] Email API: ${json.error}`); return false; }
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

function confirmationEmailHtml(b: {
  customerName: string; serviceName: string; selectedVariant?: string;
  date: string; time: string; serviceAddress: string;
  totalPrice?: number; price: number; confirmationCode: string;
  addons?: Array<{ name: string; price: number }>; notes?: string;
}): { html: string; text: string } {
  const priceFmt = formatPrice(b.totalPrice ?? b.price);
  const dateFmt = formatDateReadable(b.date);
  const timeFmt = formatTime12h(b.time);
  const variant = b.selectedVariant ? ` (${b.selectedVariant})` : "";
  const addonRows = (b.addons || []).map(a =>
    `<tr><td style="padding:6px 0;color:#555;">+ ${a.name}</td><td style="padding:6px 0;text-align:right;color:#555;">${formatPrice(a.price)}</td></tr>`
  ).join("");

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f7f7f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);border-radius:12px 12px 0 0;padding:32px 24px;text-align:center;">
    <h1 style="margin:0;color:#f5a623;font-size:24px;letter-spacing:1px;">PROWORX</h1>
    <p style="margin:4px 0 0;color:#ccc;font-size:13px;">Mobile Detailing</p>
  </div>
  <div style="background:#fff;padding:32px 24px;border-radius:0 0 12px 12px;box-shadow:0 2px 8px rgba(0,0,0,.08);">
    <h2 style="margin:0 0 8px;color:#1a1a2e;font-size:20px;">Booking Confirmed! ✅</h2>
    <p style="color:#555;margin:0 0 24px;font-size:15px;">Hi ${b.customerName.split(" ")[0]}, your appointment has been confirmed.</p>
    <div style="background:#f0f7ff;border:2px solid #3b82f6;border-radius:10px;padding:16px;text-align:center;margin:0 0 24px;">
      <p style="margin:0 0 4px;color:#666;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Confirmation Code</p>
      <p style="margin:0;color:#1a1a2e;font-size:28px;font-weight:700;letter-spacing:3px;">${b.confirmationCode}</p>
    </div>
    <table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
      <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888;font-size:13px;width:120px;">📅 Date</td><td style="padding:10px 0;border-bottom:1px solid #eee;color:#1a1a2e;font-weight:600;">${dateFmt}</td></tr>
      <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888;font-size:13px;">⏰ Time</td><td style="padding:10px 0;border-bottom:1px solid #eee;color:#1a1a2e;font-weight:600;">${timeFmt}</td></tr>
      <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888;font-size:13px;">🚗 Service</td><td style="padding:10px 0;border-bottom:1px solid #eee;color:#1a1a2e;font-weight:600;">${b.serviceName}${variant}</td></tr>
      <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888;font-size:13px;">📍 Location</td><td style="padding:10px 0;border-bottom:1px solid #eee;color:#1a1a2e;font-weight:600;">${b.serviceAddress}</td></tr>
      <tr><td style="padding:10px 0;${addonRows ? "border-bottom:1px solid #eee;" : ""}color:#888;font-size:13px;">💰 Total</td><td style="padding:10px 0;${addonRows ? "border-bottom:1px solid #eee;" : ""}color:#1a1a2e;font-weight:700;font-size:18px;">${priceFmt}</td></tr>
      ${addonRows ? `<tr><td colspan="2" style="padding:8px 0 4px;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Add-Ons</td></tr>${addonRows}` : ""}
    </table>
    ${b.notes ? `<div style="background:#fffbeb;border-left:3px solid #f5a623;padding:12px 16px;border-radius:0 8px 8px 0;margin:0 0 24px;"><p style="margin:0;color:#555;font-size:14px;"><strong>Notes:</strong> ${b.notes}</p></div>` : ""}
    <div style="background:#f9fafb;border-radius:8px;padding:16px;margin:0 0 24px;">
      <h3 style="margin:0 0 8px;color:#1a1a2e;font-size:15px;">What to Expect</h3>
      <ul style="margin:0;padding:0 0 0 20px;color:#555;font-size:14px;line-height:1.8;">
        <li>We'll arrive at your location — no need to go anywhere</li>
        <li>Please make sure the vehicle is accessible</li>
        <li>We bring all equipment, water, and power</li>
        <li>You'll receive a reminder before your appointment</li>
      </ul>
    </div>
    <div style="text-align:center;padding:16px 0;border-top:1px solid #eee;">
      <p style="color:#888;font-size:13px;margin:0 0 8px;">Need to reschedule or have questions?</p>
      <p style="margin:0;"><a href="tel:+19802721903" style="color:#3b82f6;text-decoration:none;font-weight:600;">${BUSINESS_PHONE}</a> · <a href="mailto:${BUSINESS_EMAIL}" style="color:#3b82f6;text-decoration:none;font-weight:600;">${BUSINESS_EMAIL}</a></p>
    </div>
  </div>
  <div style="text-align:center;padding:24px 0 0;"><p style="color:#999;font-size:12px;margin:0;">${BUSINESS_NAME} · Charlotte, NC & Surrounding Areas</p></div>
</div></body></html>`;

  const text = `BOOKING CONFIRMED ✅\n\nHi ${b.customerName.split(" ")[0]},\n\nYour appointment with ${BUSINESS_NAME} is confirmed!\n\nConfirmation Code: ${b.confirmationCode}\n\n📅 ${dateFmt}\n⏰ ${timeFmt}\n🚗 ${b.serviceName}${variant}\n📍 ${b.serviceAddress}\n💰 ${priceFmt}\n${b.notes ? `\nNotes: ${b.notes}\n` : ""}\nWe'll come to you — no need to go anywhere.\nNeed to reschedule? Call ${BUSINESS_PHONE} or email ${BUSINESS_EMAIL}\n\n— ${BUSINESS_NAME}`;

  return { html, text };
}

function reminderEmailHtml(b: {
  customerName: string; serviceName: string; selectedVariant?: string;
  date: string; time: string; serviceAddress: string;
  totalPrice?: number; price: number; confirmationCode: string;
  timeframe: "24h" | "2h";
}): { html: string; text: string } {
  const priceFmt = formatPrice(b.totalPrice ?? b.price);
  const dateFmt = formatDateReadable(b.date);
  const timeFmt = formatTime12h(b.time);
  const variant = b.selectedVariant ? ` (${b.selectedVariant})` : "";
  const urgency = b.timeframe === "2h" ? "in about 2 hours" : "tomorrow";
  const emoji = b.timeframe === "2h" ? "⏰" : "📅";

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f7f7f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);border-radius:12px 12px 0 0;padding:32px 24px;text-align:center;">
    <h1 style="margin:0;color:#f5a623;font-size:24px;letter-spacing:1px;">PROWORX</h1>
    <p style="margin:4px 0 0;color:#ccc;font-size:13px;">Mobile Detailing</p>
  </div>
  <div style="background:#fff;padding:32px 24px;border-radius:0 0 12px 12px;box-shadow:0 2px 8px rgba(0,0,0,.08);">
    <h2 style="margin:0 0 8px;color:#1a1a2e;font-size:20px;">${emoji} Appointment Reminder</h2>
    <p style="color:#555;margin:0 0 24px;font-size:15px;">Hi ${b.customerName.split(" ")[0]}, friendly reminder — your detailing is ${urgency}!</p>
    <div style="background:#fff8e1;border:2px solid #f5a623;border-radius:10px;padding:16px;text-align:center;margin:0 0 24px;">
      <p style="margin:0 0 4px;color:#666;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Confirmation Code</p>
      <p style="margin:0;color:#1a1a2e;font-size:24px;font-weight:700;letter-spacing:3px;">${b.confirmationCode}</p>
    </div>
    <table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
      <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888;font-size:13px;width:120px;">📅 Date</td><td style="padding:10px 0;border-bottom:1px solid #eee;color:#1a1a2e;font-weight:600;">${dateFmt}</td></tr>
      <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888;font-size:13px;">⏰ Time</td><td style="padding:10px 0;border-bottom:1px solid #eee;color:#1a1a2e;font-weight:600;">${timeFmt}</td></tr>
      <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888;font-size:13px;">🚗 Service</td><td style="padding:10px 0;border-bottom:1px solid #eee;color:#1a1a2e;font-weight:600;">${b.serviceName}${variant}</td></tr>
      <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888;font-size:13px;">📍 Location</td><td style="padding:10px 0;border-bottom:1px solid #eee;color:#1a1a2e;font-weight:600;">${b.serviceAddress}</td></tr>
      <tr><td style="padding:10px 0;color:#888;font-size:13px;">💰 Total</td><td style="padding:10px 0;color:#1a1a2e;font-weight:700;font-size:18px;">${priceFmt}</td></tr>
    </table>
    <div style="background:#f0fdf4;border-radius:8px;padding:16px;margin:0 0 24px;">
      <h3 style="margin:0 0 8px;color:#166534;font-size:15px;">✅ Quick Checklist</h3>
      <ul style="margin:0;padding:0 0 0 20px;color:#555;font-size:14px;line-height:1.8;">
        <li>Vehicle accessible at the service address</li>
        <li>Remove personal items from the vehicle</li>
        <li>We bring all equipment — nothing needed from you</li>
      </ul>
    </div>
    <div style="text-align:center;padding:16px 0;border-top:1px solid #eee;">
      <p style="color:#888;font-size:13px;margin:0 0 8px;">Need to reschedule?</p>
      <p style="margin:0;"><a href="tel:+19802721903" style="color:#3b82f6;text-decoration:none;font-weight:600;">${BUSINESS_PHONE}</a> · <a href="mailto:${BUSINESS_EMAIL}" style="color:#3b82f6;text-decoration:none;font-weight:600;">${BUSINESS_EMAIL}</a></p>
    </div>
  </div>
  <div style="text-align:center;padding:24px 0 0;"><p style="color:#999;font-size:12px;margin:0;">${BUSINESS_NAME} · Charlotte, NC & Surrounding Areas</p></div>
</div></body></html>`;

  const text = `${emoji} APPOINTMENT REMINDER\n\nHi ${b.customerName.split(" ")[0]},\n\nFriendly reminder — your detailing is ${urgency}!\n\nConfirmation: ${b.confirmationCode}\n📅 ${dateFmt}\n⏰ ${timeFmt}\n🚗 ${b.serviceName}${variant}\n📍 ${b.serviceAddress}\n💰 ${priceFmt}\n\nPlease make sure your vehicle is accessible.\nNeed to reschedule? Call ${BUSINESS_PHONE}\n\n— ${BUSINESS_NAME}`;

  return { html, text };
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
      const { html, text } = confirmationEmailHtml({
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
      emailSent = await sendEmail(
        booking.customerEmail,
        `Booking Confirmed — ${formatDateReadable(booking.date)} at ${formatTime12h(booking.time)}`,
        html,
        text,
      );
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
      const { html, text } = reminderEmailHtml({
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
      const urgencyLabel = timeframe === "24h" ? "Tomorrow" : "In 2 Hours";
      emailSent = await sendEmail(
        booking.customerEmail,
        `⏰ Reminder: Your Detailing is ${urgencyLabel} — ${formatTime12h(booking.time)}`,
        html,
        text,
      );
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
