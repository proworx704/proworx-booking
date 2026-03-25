import { useQuery, useMutation } from "convex/react";
import {
  Calendar,
  CalendarCheck,
  Clock,
  DollarSign,
  AlertCircle,
  MapPin,
  Users,
  ClipboardList,
  Wallet,
  Zap,
} from "lucide-react";
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "../../convex/_generated/api";
import { formatCurrency, formatHours, getWeekStart } from "@/lib/dateUtils";

function formatPrice(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
}

function formatTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function getEndDate(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function formatDateShort(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  in_progress: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const paymentColors: Record<string, string> = {
  unpaid: "bg-orange-100 text-orange-800",
  paid: "bg-green-100 text-green-800",
  refunded: "bg-gray-100 text-gray-800",
};

// ─── ZIP Route Clustering Panel ──────────────────────────
function ZipClusterPanel() {
  const today = getToday();
  const endDate = getEndDate(7);
  const [showRange, setShowRange] = useState<"today" | "week">("week");

  // For "today" mode: show only today's date; for "week" mode: today through +7 days
  const zipClusters = useQuery(api.bookings.listByZipCluster, {
    startDate: today,
    endDate: showRange === "today" ? today : endDate,
  });

  const totalBookings = zipClusters
    ? Object.values(zipClusters).reduce((sum, arr) => sum + arr.length, 0)
    : 0;

  const sortedZips = zipClusters
    ? Object.entries(zipClusters).sort((a, b) => b[1].length - a[1].length)
    : [];

  const zipColors = [
    "bg-teal-100 text-teal-800 border-teal-200",
    "bg-blue-100 text-blue-800 border-blue-200",
    "bg-purple-100 text-purple-800 border-purple-200",
    "bg-orange-100 text-orange-800 border-orange-200",
    "bg-pink-100 text-pink-800 border-pink-200",
    "bg-cyan-100 text-cyan-800 border-cyan-200",
    "bg-emerald-100 text-emerald-800 border-emerald-200",
    "bg-indigo-100 text-indigo-800 border-indigo-200",
  ];

  if (!zipClusters || totalBookings === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="size-5" />
              Route Clusters by ZIP
            </CardTitle>
            <CardDescription>
              {sortedZips.length} area{sortedZips.length !== 1 ? "s" : ""} ·{" "}
              {totalBookings} booking{totalBookings !== 1 ? "s" : ""}
            </CardDescription>
          </div>
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            <button
              type="button"
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                showRange === "today"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setShowRange("today")}
            >
              Today
            </button>
            <button
              type="button"
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                showRange === "week"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setShowRange("week")}
            >
              This Week
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedZips.map(([zip, bookings], idx) => (
            <div key={zip} className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={`text-sm font-mono px-2.5 py-0.5 ${zipColors[idx % zipColors.length]}`}
                >
                  <MapPin className="size-3 mr-1" />
                  {zip}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {bookings.length} booking{bookings.length !== 1 ? "s" : ""}
                </span>
                {bookings.length >= 2 && (
                  <Badge variant="secondary" className="text-xs bg-green-50 text-green-700 border-green-200">
                    ✓ Route efficient
                  </Badge>
                )}
              </div>
              <div className="ml-4 space-y-1">
                {bookings.map((b) => (
                  <Link
                    key={b._id}
                    to={`/bookings/${b._id}`}
                    className="flex items-center gap-3 px-3 py-2 rounded-md border hover:bg-accent/50 transition-colors text-sm"
                  >
                    <span className="font-medium min-w-[100px]">
                      {formatTime(b.time)}
                    </span>
                    <span className="text-muted-foreground">
                      {b.customerName}
                    </span>
                    <span className="text-muted-foreground hidden sm:inline">
                      · {b.serviceName}
                    </span>
                    {showRange === "week" && (
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatDateShort(b.date)}
                      </span>
                    )}
                    {((b as any).staffNames?.length > 0 || b.staffName) && (
                      <Badge variant="outline" className="text-xs ml-auto">
                        {(b as any).staffNames?.join(", ") || b.staffName}
                      </Badge>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const today = getToday();
  const stats = useQuery(api.bookings.stats, { today });
  const todayBookings = useQuery(api.bookings.listToday, { today });
  const upcoming = useQuery(api.bookings.listUpcoming, {
    startDate: today,
    endDate: getEndDate(7),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </div>

      {/* Stats Cards — clickable, link to filtered bookings */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/bookings?view=today">
          <Card className="hover:bg-blue-50/50 hover:border-blue-200 transition-colors cursor-pointer group">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <Calendar className="size-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.todayCount ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">Today</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/bookings?view=upcoming">
          <Card className="hover:bg-purple-50/50 hover:border-purple-200 transition-colors cursor-pointer group">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                  <CalendarCheck className="size-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {stats?.upcomingCount ?? "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">Upcoming</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/bookings?view=unpaid">
          <Card className="hover:bg-orange-50/50 hover:border-orange-200 transition-colors cursor-pointer group">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-orange-100 flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                  <AlertCircle className="size-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.unpaidCount ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">Unpaid</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/reports">
          <Card className="hover:bg-green-50/50 hover:border-green-200 transition-colors cursor-pointer group">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition-colors">
                  <DollarSign className="size-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {stats ? formatPrice(stats.totalRevenue) : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">Revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Appointments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="size-5" />
              Today's Appointments
            </CardTitle>
            <CardDescription>
              {todayBookings?.length ?? 0} appointment
              {todayBookings?.length !== 1 ? "s" : ""} today
            </CardDescription>
          </CardHeader>
          <CardContent>
            {todayBookings === undefined ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : todayBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No appointments today
              </p>
            ) : (
              <div className="space-y-2">
                {todayBookings.map((b) => (
                  <Link
                    key={b._id}
                    to={`/bookings/${b._id}`}
                    className="block p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{b.customerName}</p>
                        <p className="text-sm text-muted-foreground">
                          {b.serviceName} · {formatTime(b.time)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Badge
                          variant="outline"
                          className={statusColors[b.status]}
                        >
                          {b.status}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={paymentColors[b.paymentStatus]}
                        >
                          {b.paymentStatus}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarCheck className="size-5" />
              Upcoming (Next 7 Days)
            </CardTitle>
            <CardDescription>
              {upcoming?.length ?? 0} upcoming appointment
              {upcoming?.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcoming === undefined ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No upcoming appointments
              </p>
            ) : (
              <div className="space-y-2">
                {upcoming.map((b) => (
                  <Link
                    key={b._id}
                    to={`/bookings/${b._id}`}
                    className="block p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{b.customerName}</p>
                        <p className="text-sm text-muted-foreground">
                          {b.serviceName} · {formatDateShort(b.date)}{" "}
                          {formatTime(b.time)}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={statusColors[b.status]}
                      >
                        {b.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ZIP Route Clustering */}
      <ZipClusterPanel />

      {/* Payroll Summary */}
      <PayrollSummaryPanel />

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/bookings">View All Bookings</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/payroll/time-entries">Payroll</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/website">Website Editor</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/availability">Set Availability</Link>
        </Button>
      </div>
    </div>
  );
}

// ─── Payroll Summary Panel ──────────────────────────
function PayrollSummaryPanel() {
  const workers = useQuery(api.payrollWorkers.list) ?? [];
  const payouts = useQuery(api.payrollPayouts.list) ?? [];
  const pendingEntries = useQuery(api.payrollTimeEntries.listPending) ?? [];

  const currentWeekStart = useMemo(() => getWeekStart(new Date()), []);
  const currentWeekEnd = useMemo(() => {
    const d = new Date(`${currentWeekStart}T12:00:00`);
    d.setDate(d.getDate() + 6);
    return d.toISOString().split("T")[0];
  }, [currentWeekStart]);
  const weekEntries = useQuery(api.payrollTimeEntries.listByWeek, {
    weekStart: currentWeekStart,
    weekEnd: currentWeekEnd,
  }) ?? [];

  const generatePayouts = useMutation(api.payrollPayouts.generate);

  const activeWorkers = workers.filter((w) => w.isActive);
  const unpaidPayouts = payouts.filter((p) => !p.isPaid);
  const totalOwed = unpaidPayouts.reduce((s, p) => s + p.netPay, 0);
  const weekHours = weekEntries.reduce((s, e) => s + e.hoursWorked, 0);

  const handleGeneratePayouts = async () => {
    try {
      const result = await generatePayouts({
        weekStart: currentWeekStart,
        weekEnd: currentWeekEnd,
      });
      if (result.length === 0) {
        toast.info("No approved time entries to generate payouts for this week");
      } else {
        toast.success(`Generated ${result.length} payout(s) for this week`);
      }
    } catch {
      toast.error("Failed to generate payouts");
    }
  };

  if (workers.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Wallet className="size-5" />
              Payroll Summary
            </CardTitle>
            <CardDescription>
              {activeWorkers.length} active worker{activeWorkers.length !== 1 ? "s" : ""}
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={handleGeneratePayouts}>
            <Zap className="mr-1 h-3 w-3" />
            Generate Payouts
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <ClipboardList className="h-3 w-3" />
              This Week
            </p>
            <p className="text-xl font-bold">{formatHours(weekHours)}</p>
            <p className="text-xs text-muted-foreground">{weekEntries.length} entries</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Pending Review
            </p>
            <p className="text-xl font-bold text-amber-600">{pendingEntries.length}</p>
            {pendingEntries.length > 0 && (
              <Link to="/payroll/time-entries" className="text-xs text-primary hover:underline">
                Review →
              </Link>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              Unpaid
            </p>
            <p className="text-xl font-bold text-amber-600">
              {formatCurrency(totalOwed)}
            </p>
            <p className="text-xs text-muted-foreground">
              {unpaidPayouts.length} payout{unpaidPayouts.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" />
              Workers
            </p>
            <p className="text-xl font-bold">{activeWorkers.length}</p>
            <Link to="/payroll/workers" className="text-xs text-primary hover:underline">
              Manage →
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
