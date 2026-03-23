import { useQuery } from "convex/react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  MapPin,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

function formatDayHeader(d: Date) {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return { dayName: dayNames[d.getDay()], dayNum: d.getDate() };
}

function formatTimeShort(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  if (m === 0) return `${hour}${ampm}`;
  return `${hour}:${m.toString().padStart(2, "0")}${ampm}`;
}

function formatTime12(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
}

function formatDuration(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

const isToday = (dateStr: string): boolean => {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return dateStr === today;
};

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  pending: { bg: "bg-amber-50", border: "border-amber-400", text: "text-amber-900" },
  confirmed: { bg: "bg-blue-50", border: "border-blue-500", text: "text-blue-900" },
  in_progress: { bg: "bg-purple-50", border: "border-purple-500", text: "text-purple-900" },
  completed: { bg: "bg-green-50", border: "border-green-500", text: "text-green-900" },
};

// ─── Constants ────────────────────────────────────────────────────────────────

const HOUR_START = 7;
const HOUR_END = 20;
const HOUR_HEIGHT = 72;
const TOTAL_HOURS = HOUR_END - HOUR_START;

// ─── Types ────────────────────────────────────────────────────────────────────

type Booking = {
  _id: string;
  customerName: string;
  customerPhone?: string;
  serviceName: string;
  date: string;
  time: string;
  totalDuration?: number;
  totalPrice?: number;
  price: number;
  status: string;
  paymentStatus: string;
  serviceAddress: string;
  zipCode?: string;
  confirmationCode: string;
  selectedVariant?: string;
  staffName?: string;
  staffNames?: string[];
};

// ─── Booking Block ────────────────────────────────────────────────────────────

function BookingBlock({ booking, isCompact }: { booking: Booking; isCompact: boolean }) {
  const duration = booking.totalDuration || 120;
  const startMin = timeToMinutes(booking.time);
  const topOffset = ((startMin - HOUR_START * 60) / 60) * HOUR_HEIGHT;
  const height = Math.max((duration / 60) * HOUR_HEIGHT - 2, 28);
  const colors = STATUS_COLORS[booking.status] || STATUS_COLORS.confirmed;
  const firstName = booking.customerName.split(" ")[0];

  return (
    <Link
      to={`/my/jobs/${booking._id}`}
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
            {booking.paymentStatus === "unpaid" && " · unpaid"}
          </div>
        )}
      </div>
    </Link>
  );
}

// ─── Now Line ─────────────────────────────────────────────────────────────────

function NowLine() {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  if (minutes < HOUR_START * 60 || minutes > HOUR_END * 60) return null;
  const topOffset = ((minutes - HOUR_START * 60) / 60) * HOUR_HEIGHT;
  return (
    <div className="absolute left-0 right-0 z-20 pointer-events-none flex items-center" style={{ top: `${topOffset}px` }}>
      <div className="size-2.5 rounded-full bg-red-500 -ml-1" />
      <div className="flex-1 h-[2px] bg-red-500" />
    </div>
  );
}

// ─── Booking Popover ──────────────────────────────────────────────────────────

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
              booking.status === "confirmed" ? "bg-blue-100 text-blue-700" :
              booking.status === "completed" ? "bg-green-100 text-green-700" :
              booking.status === "in_progress" ? "bg-purple-100 text-purple-700" :
              "bg-yellow-100 text-yellow-700"
            }`}
          >
            {booking.status.replace("_", " ")}
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
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(booking.serviceAddress)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-blue-600 underline"
              >
                {booking.serviceAddress}
              </a>
            </div>
          )}
          {(booking.totalPrice || booking.price) > 0 && (
            <div className="flex items-center gap-2">
              <DollarSign className="size-3.5 text-muted-foreground shrink-0" />
              <span>{formatPrice(booking.totalPrice || booking.price)}</span>
              <Badge
                variant="secondary"
                className={`text-[10px] ml-auto ${
                  booking.paymentStatus === "paid" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                }`}
              >
                {booking.paymentStatus}
              </Badge>
            </div>
          )}
        </div>
        <div className="flex gap-2 mt-4">
          <Button size="sm" variant="default" className="flex-1" asChild>
            <Link to={`/my/jobs/${booking._id}`}>View / Take Payment</Link>
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>Close</Button>
        </div>
      </Card>
    </div>
  );
}

// ─── Day Column ───────────────────────────────────────────────────────────────

function DayColumn({
  date, bookings, isCompact, onBookingClick,
}: {
  date: Date;
  bookings: Booking[];
  isCompact: boolean;
  onBookingClick: (b: Booking) => void;
}) {
  const dateStr = formatDateStr(date);
  const dayInfo = formatDayHeader(date);
  const dayBookings = bookings.filter((b) => b.date === dateStr);
  const isTodayCol = isToday(dateStr);

  return (
    <div className="flex-1 min-w-0">
      <div className={`sticky top-0 z-30 text-center py-2 border-b bg-background ${isTodayCol ? "bg-blue-50 dark:bg-blue-950/30" : ""}`}>
        <div className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase">{dayInfo.dayName}</div>
        <div className={`text-sm sm:text-base font-bold ${isTodayCol ? "bg-blue-600 text-white rounded-full w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center mx-auto" : ""}`}>
          {dayInfo.dayNum}
        </div>
        {dayBookings.length > 0 && (
          <div className="text-[9px] text-muted-foreground mt-0.5">
            {dayBookings.length} job{dayBookings.length > 1 ? "s" : ""}
          </div>
        )}
      </div>
      <div className={`relative border-r ${isTodayCol ? "bg-blue-50/30 dark:bg-blue-950/10" : ""}`} style={{ height: `${TOTAL_HOURS * HOUR_HEIGHT}px` }}>
        {Array.from({ length: TOTAL_HOURS }, (_, i) => (
          <div key={i} className="absolute left-0 right-0 border-t border-dashed border-gray-100 dark:border-gray-800" style={{ top: `${i * HOUR_HEIGHT}px` }} />
        ))}
        {dayBookings.map((booking) => (
          <div key={booking._id} onClick={() => onBookingClick(booking)}>
            <BookingBlock booking={booking} isCompact={isCompact} />
          </div>
        ))}
        {isTodayCol && <NowLine />}
      </div>
    </div>
  );
}

// ─── Week Stats ───────────────────────────────────────────────────────────────

function WeekStats({ bookings }: { bookings: Booking[] }) {
  const total = bookings.length;
  const revenue = bookings.reduce((s, b) => s + (b.totalPrice || b.price || 0), 0);
  const completed = bookings.filter((b) => b.status === "completed").length;
  const unpaid = bookings.filter((b) => b.paymentStatus !== "paid").length;

  return (
    <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm">
      <div className="flex items-center gap-1">
        <CalendarDays className="size-3.5 text-muted-foreground" />
        <span className="font-medium">{total}</span>
        <span className="text-muted-foreground hidden sm:inline">jobs</span>
      </div>
      {revenue > 0 && (
        <div className="flex items-center gap-1">
          <DollarSign className="size-3.5 text-muted-foreground" />
          <span className="font-medium">{formatPrice(revenue)}</span>
        </div>
      )}
      <div className="hidden sm:flex items-center gap-1 text-muted-foreground">
        {completed} done · {unpaid} unpaid
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function MyCalendarPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const today = new Date();
  const baseMonday = getMonday(today);
  const monday = addDays(baseMonday, weekOffset * 7);
  const sunday = addDays(monday, 6);

  const startDate = formatDateStr(monday);
  const endDate = formatDateStr(sunday);

  const bookings = useQuery(api.employeePortal.myJobsByDateRange, { startDate, endDate });

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(monday, i)), [monday.getTime()]);

  const monthLabel = useMemo(() => {
    const first = weekDays[0];
    const last = weekDays[6];
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    if (first.getMonth() === last.getMonth()) return `${months[first.getMonth()]} ${first.getFullYear()}`;
    return `${months[first.getMonth()].slice(0, 3)} – ${months[last.getMonth()].slice(0, 3)} ${last.getFullYear()}`;
  }, [weekDays]);

  const isCompact = typeof window !== "undefined" && window.innerWidth < 640;

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="size-5 sm:size-6 text-primary" />
            My Schedule
          </h1>
          <p className="text-sm text-muted-foreground">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)} className={weekOffset === 0 ? "invisible" : ""}>
            Today
          </Button>
          <Button variant="outline" size="icon" className="size-8" onClick={() => setWeekOffset((o) => o - 1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="icon" className="size-8" onClick={() => setWeekOffset((o) => o + 1)}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {bookings && <WeekStats bookings={bookings} />}

      <div className="border rounded-xl overflow-hidden bg-background shadow-sm">
        <div className="flex">
          <div className="w-10 sm:w-14 shrink-0 border-r bg-muted/30">
            <div className="h-[62px] border-b" />
            <div style={{ height: `${TOTAL_HOURS * HOUR_HEIGHT}px` }} className="relative">
              {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                <div key={i} className="absolute left-0 right-0 text-[10px] sm:text-xs text-muted-foreground text-right pr-1.5 sm:pr-2 -translate-y-1/2" style={{ top: `${i * HOUR_HEIGHT}px` }}>
                  {formatTimeShort(`${HOUR_START + i}:00`)}
                </div>
              ))}
            </div>
          </div>
          {weekDays.map((date) => (
            <DayColumn
              key={formatDateStr(date)}
              date={date}
              bookings={bookings || []}
              isCompact={isCompact}
              onBookingClick={setSelectedBooking}
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
      </div>

      {selectedBooking && (
        <BookingPopover booking={selectedBooking} onClose={() => setSelectedBooking(null)} />
      )}
    </div>
  );
}
