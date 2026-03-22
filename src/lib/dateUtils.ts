// Date utility functions for payroll module

/** Get the Monday of the week containing the given date */
export function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return formatDate(d);
}

/** Format a Date to YYYY-MM-DD */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Format YYYY-MM-DD to "Mon, Mar 20" */
export function formatDateShort(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** Format YYYY-MM-DD to "March 20, 2026" */
export function formatDateLong(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** Format 24hr time (HH:mm) to 12hr (e.g. "2:30 PM") */
export function formatTime12hr(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

/** Format hours as "Xh Ym" */
export function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Format currency (dollars, not cents) */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

/** Get the pay date (following Thursday) for a week ending on Sunday */
export function getPayDate(weekEnd: string): string {
  const d = new Date(`${weekEnd}T12:00:00`);
  const dayOfWeek = d.getDay();
  const daysUntilThursday = dayOfWeek <= 4 ? 4 - dayOfWeek : 11 - dayOfWeek;
  d.setDate(d.getDate() + daysUntilThursday);
  return formatDate(d);
}

/** Get all days of a week (Mon-Sun) from weekStart */
export function getWeekDays(weekStart: string): string[] {
  const days: string[] = [];
  const d = new Date(`${weekStart}T12:00:00`);
  for (let i = 0; i < 7; i++) {
    days.push(formatDate(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

/** Navigate weeks: get prev/next week's Monday */
export function shiftWeek(weekStart: string, direction: number): string {
  const d = new Date(`${weekStart}T12:00:00`);
  d.setDate(d.getDate() + direction * 7);
  return formatDate(d);
}

/** Today's date string */
export function today(): string {
  return formatDate(new Date());
}
