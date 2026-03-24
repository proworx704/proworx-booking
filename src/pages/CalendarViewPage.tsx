import { useQuery } from "convex/react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  DollarSign,
  Plus,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { QuickBookDialog } from "@/components/QuickBookDialog";
import { api } from "../../convex/_generated/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function addDays(d: Date, n: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + n);
  return result;
}

function formatDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function formatDayHeader(d: Date): { dayName: string; dayNum: number; monthShort: string } {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return {
    dayName: dayNames[d.getDay()],
    dayNum: d.getDate(),
    monthShort: monthNames[d.getMonth()],
  };
}

function formatTime12(t: string): string {
  if (!t || !t.includes(":")) return "—";
  const [h = 0, m = 0] = t.split(":").map(Number);
  const safeH = Number.isFinite(h) ? h : 0;
  const safeM = Number.isFinite(m) ? m : 0;
  const ampm = safeH >= 12 ? "PM" : "AM";
  const hour = safeH % 12 || 12;
  return `${hour}:${safeM.toString().padStart(2, "0")} ${ampm}`;
}

function formatTimeShort(t: string): string {
  if (!t || !t.includes(":")) return "—";
  const [h = 0, m = 0] = t.split(":").map(Number);
  const safeH = Number.isFinite(h) ? h : 0;
  const safeM = Number.isFinite(m) ? m : 0;
  const ampm = safeH >= 12 ? "PM" : "AM";
  const hour = safeH % 12 || 12;
  if (safeM === 0) return `${hour}${ampm}`;
  return `${hour}:${safeM.toString().padStart(2, "0")}${ampm}`;
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function formatDuration(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const isToday = (dateStr: string): boolean => {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return dateStr === today;
};

// Status colors for booking blocks
const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  pending: { bg: "bg-amber-50", border: "border-amber-400", text: "text-amber-900" },
  confirmed: { bg: "bg-blue-50", border: "border-blue-500", text: "text-blue-900" },
  in_progress: { bg: "bg-purple-50", border: "border-purple-500", text: "text-purple-900" },
  completed: { bg: "bg-green-50", border: "border-green-500", text: "text-green-900" },
};

// ─── Constants ────────────────────────────────────────────────────────────────

const HOUR_START = 7; // 7 AM
const HOUR_END = 20; // 8 PM
const HOUR_HEIGHT = 72; // pixels per hour
const TOTAL_HOURS = HOUR_END - HOUR_START;

// ─── Types ────────────────────────────────────────────────────────────────────

type Booking = {
  _id: string;
  customerName: string;
  serviceName: string;
  date: string;
  time: string;
  totalDuration?: number;
  totalPrice?: number;
  price: number;
  status: string;
  paymentStatus: string;
  staffName?: string;
  serviceAddress: string;
  zipCode?: string;
  confirmationCode: string;
  selectedVariant?: string;
};

type ScheduleBlock = {
  date: string;
  dayOfWeek: number;
  weekType: "A" | "B";
  blockAfter: string;
  reason?: string;
};

// ─── Booking Event Block Component ────────────────────────────────────────────

function BookingBlock({ booking, isCompact }: { booking: Booking; isCompact: boolean }) {
  const duration = booking.totalDuration || 120;
  const startMin = timeToMinutes(booking.time);
  const topOffset = ((startMin - HOUR_START * 60) / 60) * HOUR_HEIGHT;
  const height = Math.max((duration / 60) * HOUR_HEIGHT - 2, 28);

  const colors = STATUS_COLORS[booking.status] || STATUS_COLORS.confirmed;
  const firstName = booking.customerName.split(" ")[0];

  return (
    <Link
      to={`/bookings/${booking._id}`}
      className={`absolute left-0.5 right-0.5 rounded-md border-l-[3px] ${colors.bg} ${colors.border} ${colors.text} overflow-hidden cursor-pointer hover:shadow-md transition-shadow z-10`}
      style={{ top: `${topOffset}px`, height: `${height}px` }}
    >
      <div className="px-1.5 py-0.5 h-full flex flex-col">
        <div className="font-semibold text-[11px] sm:text-xs truncate leading-tight">
          {firstName}
        </div>
        {height > 36 && (
          <div className="text-[10px] sm:text-[11px] opacity-80 truncate leading-tight">
            {formatTimeShort(booking.time)}
          </div>
        )}
        {height > 52 && !isCompact && (
          <div className="text-[9px] sm:text-[10px] opacity-70 truncate leading-tight">
            {booking.serviceName.replace("Standard ", "").replace("Membership", "Maint.")}
          </div>
        )}
        {height > 68 && !isCompact && booking.totalPrice && booking.totalPrice > 0 && (
          <div className="text-[9px] sm:text-[10px] opacity-70 truncate leading-tight">
            {formatPrice(booking.totalPrice || booking.price)}
          </div>
        )}
      </div>
    </Link>
  );
}

// ─── Schedule Block Overlay ───────────────────────────────────────────────────

function ScheduleBlockOverlay({ block }: { block: ScheduleBlock }) {
  // "all-day" means block the entire day
  if (block.blockAfter === "all-day") {
    return (
      <div
        className="absolute left-0 right-0 bg-rose-100/60 dark:bg-rose-900/20 border-t-2 border-rose-300 dark:border-rose-700 z-[5] pointer-events-none"
        style={{ top: 0, height: `${TOTAL_HOURS * HOUR_HEIGHT}px` }}
      >
        <div className="px-1.5 py-1 text-[10px] sm:text-[11px] font-medium text-rose-600 dark:text-rose-400 truncate">
          {block.reason || "Blocked — All Day"}
        </div>
      </div>
    );
  }

  const startMin = timeToMinutes(block.blockAfter);
  const endMin = HOUR_END * 60;
  const topOffset = ((startMin - HOUR_START * 60) / 60) * HOUR_HEIGHT;
  const height = ((endMin - startMin) / 60) * HOUR_HEIGHT;

  return (
    <div
      className="absolute left-0 right-0 bg-rose-100/60 dark:bg-rose-900/20 border-t-2 border-rose-300 dark:border-rose-700 z-[5] pointer-events-none"
      style={{ top: `${topOffset}px`, height: `${height}px` }}
    >
      <div className="px-1.5 py-1 text-[10px] sm:text-[11px] font-medium text-rose-600 dark:text-rose-400 truncate">
        {block.reason || "Blocked"}
      </div>
    </div>
  );
}

// ─── Blocked Date Overlay (full day) ──────────────────────────────────────────

function BlockedDateOverlay({ reason }: { reason?: string }) {
  return (
    <div className="absolute inset-0 bg-gray-100/70 dark:bg-gray-800/50 z-[5] pointer-events-none flex items-start justify-center pt-2">
      <span className="text-[10px] font-medium text-gray-500">
        {reason || "Blocked"}
      </span>
    </div>
  );
}

// ─── Booking Popover (on click) ───────────────────────────────────────────────

function BookingPopover({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={onClose}>
      <Card className="w-80 max-w-[90vw] p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-bold text-lg">{booking.customerName}</h3>
            <p className="text-sm text-muted-foreground">{booking.serviceName}</p>
            {booking.selectedVariant && (
              <p className="text-xs text-muted-foreground">{booking.selectedVariant}</p>
            )}
          </div>
          <Badge
            variant="secondary"
            className={`text-[10px] ${
              booking.status === "confirmed"
                ? "bg-blue-100 text-blue-700"
                : booking.status === "completed"
                  ? "bg-green-100 text-green-700"
                  : booking.status === "in_progress"
                    ? "bg-purple-100 text-purple-700"
                    : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {booking.status}
          </Badge>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="size-3.5 text-muted-foreground shrink-0" />
            <span>
              {formatTime12(booking.time)}
              {booking.totalDuration && ` · ${formatDuration(booking.totalDuration)}`}
            </span>
          </div>
          {booking.serviceAddress && (
            <div className="flex items-center gap-2">
              <MapPin className="size-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">{booking.serviceAddress}</span>
            </div>
          )}
          {(booking.totalPrice || booking.price) > 0 && (
            <div className="flex items-center gap-2">
              <DollarSign className="size-3.5 text-muted-foreground shrink-0" />
              <span>{formatPrice(booking.totalPrice || booking.price)}</span>
              <Badge
                variant="secondary"
                className={`text-[10px] ml-auto ${
                  booking.paymentStatus === "paid"
                    ? "bg-green-100 text-green-700"
                    : "bg-orange-100 text-orange-700"
                }`}
              >
                {booking.paymentStatus}
              </Badge>
            </div>
          )}
          {((booking as any).staffNames?.length > 0 || booking.staffName) && (
            <div className="text-xs text-muted-foreground">
              Assigned: {(booking as any).staffNames?.join(", ") || booking.staffName}
            </div>
          )}
        </div>
        <div className="flex gap-2 mt-4">
          <Button size="sm" variant="outline" className="flex-1" asChild>
            <Link to={`/bookings/${booking._id}`}>View Details</Link>
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ─── Now Line ─────────────────────────────────────────────────────────────────

function NowLine() {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  if (minutes < HOUR_START * 60 || minutes > HOUR_END * 60) return null;

  const topOffset = ((minutes - HOUR_START * 60) / 60) * HOUR_HEIGHT;

  return (
    <div
      className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
      style={{ top: `${topOffset}px` }}
    >
      <div className="size-2.5 rounded-full bg-red-500 -ml-1" />
      <div className="flex-1 h-[2px] bg-red-500" />
    </div>
  );
}

// ─── Day Column ───────────────────────────────────────────────────────────────

function DayColumn({
  date,
  bookings,
  blocks,
  blockedDates,
  isCompact,
  onBookingClick,
  onSlotClick,
}: {
  date: Date;
  bookings: Booking[];
  blocks: ScheduleBlock[];
  blockedDates: string[];
  isCompact: boolean;
  onBookingClick: (b: Booking) => void;
  onSlotClick: (date: string, time: string) => void;
}) {
  const dateStr = formatDateStr(date);
  const dayInfo = formatDayHeader(date);
  const dayBookings = bookings.filter((b) => b.date === dateStr);
  const dayBlocks = blocks.filter((b) => b.date === dateStr);
  const isBlockedDate = blockedDates.includes(dateStr);
  const isTodayCol = isToday(dateStr);

  // ─── Click-to-book handler on the grid ────────────────────
  const handleGridClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isBlockedDate) return;
      // Don't trigger if clicking on a booking block
      const target = e.target as HTMLElement;
      if (target.closest("a")) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const y = e.clientY - rect.top;
      // Snap to 30-minute intervals
      const rawMinutes = (y / HOUR_HEIGHT) * 60 + HOUR_START * 60;
      const snappedMinutes = Math.round(rawMinutes / 30) * 30;
      const clampedMinutes = Math.max(
        HOUR_START * 60,
        Math.min(snappedMinutes, (HOUR_END - 1) * 60 + 30),
      );
      const h = Math.floor(clampedMinutes / 60);
      const m = clampedMinutes % 60;
      const timeStr = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
      onSlotClick(dateStr, timeStr);
    },
    [dateStr, isBlockedDate, onSlotClick],
  );

  // ─── Hover state for "+" indicator ─────────────────────────
  const [hoverY, setHoverY] = useState<number | null>(null);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isBlockedDate) return;
      const target = e.target as HTMLElement;
      if (target.closest("a")) {
        setHoverY(null);
        return;
      }
      const rect = e.currentTarget.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const rawMinutes = (y / HOUR_HEIGHT) * 60 + HOUR_START * 60;
      const snappedMinutes = Math.round(rawMinutes / 30) * 30;
      const clampedMinutes = Math.max(
        HOUR_START * 60,
        Math.min(snappedMinutes, (HOUR_END - 1) * 60 + 30),
      );
      const topPx = ((clampedMinutes - HOUR_START * 60) / 60) * HOUR_HEIGHT;
      setHoverY(topPx);
    },
    [isBlockedDate],
  );

  return (
    <div className="flex-1 min-w-0">
      {/* Day header */}
      <div
        className={`sticky top-0 z-30 text-center py-2 border-b bg-background ${
          isTodayCol ? "bg-blue-50 dark:bg-blue-950/30" : ""
        }`}
      >
        <div className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase">
          {dayInfo.dayName}
        </div>
        <div
          className={`text-sm sm:text-base font-bold ${
            isTodayCol
              ? "bg-blue-600 text-white rounded-full w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center mx-auto"
              : ""
          }`}
        >
          {dayInfo.dayNum}
        </div>
        {dayBookings.length > 0 && (
          <div className="text-[9px] text-muted-foreground mt-0.5">
            {dayBookings.length} appt{dayBookings.length > 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Time grid */}
      <div
        className={`relative border-r ${isTodayCol ? "bg-blue-50/30 dark:bg-blue-950/10" : ""} ${
          !isBlockedDate ? "cursor-pointer" : ""
        }`}
        style={{ height: `${TOTAL_HOURS * HOUR_HEIGHT}px` }}
        onClick={handleGridClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverY(null)}
      >
        {/* Hour grid lines */}
        {Array.from({ length: TOTAL_HOURS }, (_, i) => (
          <div
            key={i}
            className="absolute left-0 right-0 border-t border-dashed border-gray-100 dark:border-gray-800"
            style={{ top: `${i * HOUR_HEIGHT}px` }}
          />
        ))}

        {/* Hover indicator — shows where the booking will be placed */}
        {hoverY !== null && !isBlockedDate && (
          <div
            className="absolute left-0 right-0 z-[6] pointer-events-none transition-all duration-75"
            style={{ top: `${hoverY}px` }}
          >
            <div className="mx-0.5 h-[34px] rounded-md border-2 border-dashed border-primary/40 bg-primary/5 flex items-center justify-center">
              <Plus className="size-3.5 text-primary/60" />
            </div>
          </div>
        )}

        {/* Blocked date overlay */}
        {isBlockedDate && <BlockedDateOverlay />}

        {/* Schedule block overlays (Cameron / custody) */}
        {dayBlocks.map((block, i) => (
          <ScheduleBlockOverlay key={i} block={block} />
        ))}

        {/* Booking blocks */}
        {dayBookings.map((booking) => (
          <div key={booking._id} onClick={() => onBookingClick(booking)}>
            <BookingBlock booking={booking} isCompact={isCompact} />
          </div>
        ))}

        {/* Now line — only on today's column */}
        {isTodayCol && <NowLine />}
      </div>
    </div>
  );
}

// ─── Week Header with Revenue ─────────────────────────────────────────────────

function WeekStats({ bookings }: { bookings: Booking[] }) {
  const totalBookings = bookings.length;
  const totalRevenue = bookings.reduce((s, b) => s + (b.totalPrice || b.price || 0), 0);
  const completedCount = bookings.filter((b) => b.status === "completed").length;
  const paidCount = bookings.filter((b) => b.paymentStatus === "paid").length;

  return (
    <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm">
      <div className="flex items-center gap-1">
        <CalendarDays className="size-3.5 text-muted-foreground" />
        <span className="font-medium">{totalBookings}</span>
        <span className="text-muted-foreground hidden sm:inline">bookings</span>
      </div>
      {totalRevenue > 0 && (
        <div className="flex items-center gap-1">
          <DollarSign className="size-3.5 text-muted-foreground" />
          <span className="font-medium">{formatPrice(totalRevenue)}</span>
        </div>
      )}
      <div className="hidden sm:flex items-center gap-1 text-muted-foreground">
        {completedCount} done · {paidCount} paid
      </div>
    </div>
  );
}

// ─── Main Calendar View ───────────────────────────────────────────────────────

export function CalendarViewPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // ─── Quick-book state ───────────────────────────────────
  const [quickBookOpen, setQuickBookOpen] = useState(false);
  const [quickBookDate, setQuickBookDate] = useState("");
  const [quickBookTime, setQuickBookTime] = useState("");

  const handleSlotClick = useCallback((date: string, time: string) => {
    setQuickBookDate(date);
    setQuickBookTime(time);
    setQuickBookOpen(true);
  }, []);

  // Calculate current week boundaries
  const today = new Date();
  const baseMonday = getMonday(today);
  const monday = addDays(baseMonday, weekOffset * 7);
  const sunday = addDays(monday, 6);

  const startDate = formatDateStr(monday);
  const endDate = formatDateStr(sunday);

  // Fetch bookings and blocks for this week
  const bookings = useQuery(api.bookings.listByDateRange, { startDate, endDate });
  const scheduleBlocks = useQuery(api.recurringBlocks.getBlocksForRange, { startDate, endDate });
  const blockedDatesRaw = useQuery(api.availability.getBlockedDatesInRange, { startDate, endDate });

  const blockedDates = useMemo(
    () => (blockedDatesRaw || []).map((d: { date: string }) => d.date),
    [blockedDatesRaw],
  );

  // Build array of 7 days for the week
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(monday, i)),
    [monday.getTime()],
  );

  // Month / year label
  const monthLabel = useMemo(() => {
    const first = weekDays[0];
    const last = weekDays[6];
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    if (first.getMonth() === last.getMonth()) {
      return `${months[first.getMonth()]} ${first.getFullYear()}`;
    }
    return `${months[first.getMonth()].slice(0, 3)} – ${months[last.getMonth()].slice(0, 3)} ${last.getFullYear()}`;
  }, [weekDays]);

  const goToday = () => setWeekOffset(0);
  const goPrev = () => setWeekOffset((o) => o - 1);
  const goNext = () => setWeekOffset((o) => o + 1);

  const isCompact = typeof window !== "undefined" && window.innerWidth < 640;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="size-5 sm:size-6 text-primary" />
            Calendar
          </h1>
          <p className="text-sm text-muted-foreground">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              const now = new Date();
              const todayStr = formatDateStr(now);
              const nextHour = now.getHours() + 1;
              const timeStr = `${Math.min(nextHour, 19).toString().padStart(2, "0")}:00`;
              handleSlotClick(todayStr, timeStr);
            }}
          >
            <Plus className="size-4 mr-1.5" />
            <span className="hidden sm:inline">New Booking</span>
            <span className="sm:hidden">Book</span>
          </Button>
          <Button variant="outline" size="sm" onClick={goToday} className={weekOffset === 0 ? "invisible" : ""}>
            Today
          </Button>
          <Button variant="outline" size="icon" className="size-8" onClick={goPrev}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="icon" className="size-8" onClick={goNext}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      {bookings && <WeekStats bookings={bookings} />}

      {/* Calendar grid */}
      <div className="border rounded-xl overflow-hidden bg-background shadow-sm">
        <div className="flex">
          {/* Time gutter */}
          <div className="w-10 sm:w-14 shrink-0 border-r bg-muted/30">
            {/* Header spacer */}
            <div className="h-[62px] border-b" />
            {/* Hour labels */}
            <div style={{ height: `${TOTAL_HOURS * HOUR_HEIGHT}px` }} className="relative">
              {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                <div
                  key={i}
                  className="absolute left-0 right-0 text-[10px] sm:text-xs text-muted-foreground text-right pr-1.5 sm:pr-2 -translate-y-1/2"
                  style={{ top: `${i * HOUR_HEIGHT}px` }}
                >
                  {formatTimeShort(`${HOUR_START + i}:00`)}
                </div>
              ))}
            </div>
          </div>

          {/* Day columns */}
          {weekDays.map((date) => (
            <DayColumn
              key={formatDateStr(date)}
              date={date}
              bookings={bookings || []}
              blocks={scheduleBlocks || []}
              blockedDates={blockedDates}
              isCompact={isCompact}
              onBookingClick={setSelectedBooking}
              onSlotClick={handleSlotClick}
            />
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-[10px] sm:text-xs text-muted-foreground px-1">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded border-l-[3px] border-blue-500 bg-blue-50" />
          Confirmed
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded border-l-[3px] border-amber-400 bg-amber-50" />
          Pending
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded border-l-[3px] border-purple-500 bg-purple-50" />
          In Progress
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded border-l-[3px] border-green-500 bg-green-50" />
          Completed
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-rose-100 border-t-2 border-rose-300" />
          Blocked
        </div>
      </div>

      {/* Booking popover */}
      {selectedBooking && (
        <BookingPopover
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
        />
      )}

      {/* Quick-book dialog */}
      <QuickBookDialog
        open={quickBookOpen}
        onClose={() => setQuickBookOpen(false)}
        initialDate={quickBookDate}
        initialTime={quickBookTime}
      />
    </div>
  );
}
