import { useQuery } from "convex/react";
import {
  BarChart3,
  Calendar,
  DollarSign,
  TrendingUp,
  Users,
  Briefcase,
  ArrowUpRight,
  ArrowDownRight,
  Repeat,
  UserPlus,
  CreditCard,
  PieChart,
} from "lucide-react";
import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "../../convex/_generated/api";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPrice(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
}

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function subtractDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() - days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function formatDateLabel(period: string, granularity: string): string {
  if (granularity === "monthly") {
    const [y, m] = period.split("-");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[parseInt(m) - 1]} ${y}`;
  }
  if (granularity === "weekly") {
    const d = new Date(period + "T12:00:00");
    return `Wk ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  }
  // daily
  const d = new Date(period + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Date Range Presets ─────────────────────────────────────────────────────

type DateRange = { label: string; startDate: string; endDate: string; granularity: "daily" | "weekly" | "monthly" };

function getDateRanges(): DateRange[] {
  const today = getToday();
  return [
    { label: "Last 7 Days", startDate: subtractDays(today, 7), endDate: today, granularity: "daily" },
    { label: "Last 30 Days", startDate: subtractDays(today, 30), endDate: today, granularity: "daily" },
    { label: "Last 90 Days", startDate: subtractDays(today, 90), endDate: today, granularity: "weekly" },
    { label: "Last 6 Months", startDate: subtractDays(today, 180), endDate: today, granularity: "monthly" },
    { label: "Last 12 Months", startDate: subtractDays(today, 365), endDate: today, granularity: "monthly" },
    { label: "All Time", startDate: "2020-01-01", endDate: today, granularity: "monthly" },
  ];
}

// ─── Color Palette ──────────────────────────────────────────────────────────

const CHART_COLORS = [
  "#0ea5e9", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
];

const STATUS_COLORS: Record<string, string> = {
  pending: "#eab308",
  confirmed: "#3b82f6",
  in_progress: "#a855f7",
  completed: "#22c55e",
  cancelled: "#ef4444",
};

// ─── Custom Tooltip ─────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="size-3 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">
            {formatter ? formatter(entry.value, entry.name) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export function ReportsPage() {
  const ranges = useMemo(getDateRanges, []);
  const [selectedRange, setSelectedRange] = useState(1); // Default: Last 30 Days
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const range = ranges[selectedRange];
  const startDate = customStart || range.startDate;
  const endDate = customEnd || range.endDate;
  const granularity = customStart ? (
    // Auto-detect granularity for custom range
    (() => {
      const days = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
      if (days <= 31) return "daily" as const;
      if (days <= 120) return "weekly" as const;
      return "monthly" as const;
    })()
  ) : range.granularity;

  // ─── Data Queries ──────────────────────────────────────────────────────────

  const overview = useQuery(api.analytics.overview, { startDate, endDate });
  const revenueData = useQuery(api.analytics.revenueOverTime, { startDate, endDate, granularity });
  const servicePerf = useQuery(api.analytics.servicePerformance, { startDate, endDate });
  const staffProd = useQuery(api.analytics.staffProductivity, { startDate, endDate });
  const customerInsights = useQuery(api.analytics.customerInsights, { startDate, endDate });
  const statusBreakdown = useQuery(api.analytics.statusBreakdown, { startDate, endDate });

  const isLoading = !overview;

  // ─── Chart Data Transforms ────────────────────────────────────────────────

  const revenueChartData = useMemo(() => {
    if (!revenueData) return [];
    return revenueData.map((d) => ({
      ...d,
      label: formatDateLabel(d.period, granularity),
      revenueDisplay: d.revenue / 100,
    }));
  }, [revenueData, granularity]);

  const servicePieData = useMemo(() => {
    if (!servicePerf) return [];
    return servicePerf.slice(0, 8).map((s) => ({
      name: s.serviceName.length > 25 ? s.serviceName.slice(0, 22) + "..." : s.serviceName,
      value: s.bookingCount,
      revenue: s.revenue,
    }));
  }, [servicePerf]);

  const statusPieData = useMemo(() => {
    if (!statusBreakdown) return [];
    return statusBreakdown.map((s) => ({
      name: s.status.replace("_", " "),
      value: s.count,
      color: STATUS_COLORS[s.status] || "#94a3b8",
    }));
  }, [statusBreakdown]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="size-6" />
            Reports & Analytics
          </h1>
          <p className="text-muted-foreground">
            Business performance insights for informed decisions
          </p>
        </div>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {ranges.map((r, i) => (
                <Button
                  key={r.label}
                  variant={selectedRange === i && !customStart ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setSelectedRange(i);
                    setCustomStart("");
                    setCustomEnd("");
                  }}
                >
                  {r.label}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">Custom:</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="border rounded px-2 py-1 text-sm bg-background"
              />
              <span className="text-muted-foreground">to</span>
              <input
                type="date"
                value={customEnd || endDate}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="border rounded px-2 py-1 text-sm bg-background"
              />
              {customStart && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCustomStart("");
                    setCustomEnd("");
                  }}
                >
                  Reset
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-green-100 flex items-center justify-center">
                <DollarSign className="size-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {isLoading ? "—" : formatPrice(overview.totalRevenue)}
                </p>
                <p className="text-xs text-muted-foreground">Total Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Briefcase className="size-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {isLoading ? "—" : overview.totalBookings}
                </p>
                <p className="text-xs text-muted-foreground">Total Bookings</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <TrendingUp className="size-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {isLoading ? "—" : formatPrice(overview.avgBookingValue)}
                </p>
                <p className="text-xs text-muted-foreground">Avg Booking Value</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-teal-100 flex items-center justify-center">
                <Users className="size-5 text-teal-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {isLoading ? "—" : overview.uniqueCustomers}
                </p>
                <p className="text-xs text-muted-foreground">Unique Customers</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-9 rounded-lg bg-emerald-100 flex items-center justify-center">
              <ArrowUpRight className="size-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-lg font-bold">
                {isLoading ? "—" : overview.completedBookings}
              </p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-9 rounded-lg bg-red-100 flex items-center justify-center">
              <ArrowDownRight className="size-4 text-red-600" />
            </div>
            <div>
              <p className="text-lg font-bold">
                {isLoading ? "—" : overview.cancelledBookings}
              </p>
              <p className="text-xs text-muted-foreground">Cancelled</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-9 rounded-lg bg-cyan-100 flex items-center justify-center">
              <UserPlus className="size-4 text-cyan-600" />
            </div>
            <div>
              <p className="text-lg font-bold">
                {isLoading ? "—" : overview.newCustomers}
              </p>
              <p className="text-xs text-muted-foreground">New Customers</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-9 rounded-lg bg-orange-100 flex items-center justify-center">
              <CreditCard className="size-4 text-orange-600" />
            </div>
            <div>
              <p className="text-lg font-bold">
                {isLoading ? "—" : formatPrice(overview.unpaidAmount)}
              </p>
              <p className="text-xs text-muted-foreground">Unpaid Amount</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="size-5" />
            Revenue Trend
          </CardTitle>
          <CardDescription>
            Revenue and booking volume over time ({granularity})
          </CardDescription>
        </CardHeader>
        <CardContent>
          {revenueChartData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No revenue data for this period
            </div>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    yAxisId="revenue"
                    tickFormatter={(v) => `$${v.toLocaleString()}`}
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    yAxisId="bookings"
                    orientation="right"
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    content={
                      <CustomTooltip
                        formatter={(v: number, name: string) =>
                          name === "Revenue" ? `$${v.toLocaleString()}` : v
                        }
                      />
                    }
                  />
                  <Area
                    yAxisId="revenue"
                    type="monotone"
                    dataKey="revenueDisplay"
                    name="Revenue"
                    stroke="#10b981"
                    fill="url(#revenueGradient)"
                    strokeWidth={2}
                  />
                  <Line
                    yAxisId="bookings"
                    type="monotone"
                    dataKey="bookings"
                    name="Bookings"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Two-column: Service Performance + Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChart className="size-5" />
              Service Breakdown
            </CardTitle>
            <CardDescription>Bookings by service type</CardDescription>
          </CardHeader>
          <CardContent>
            {servicePieData.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                No data for this period
              </div>
            ) : (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={servicePieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={95}
                      dataKey="value"
                      nameKey="name"
                      paddingAngle={2}
                    >
                      {servicePieData.map((_entry, index) => (
                        <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={<CustomTooltip formatter={(v: number) => `${v} bookings`} />}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: "12px" }}
                    />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="size-5" />
              Booking Status
            </CardTitle>
            <CardDescription>Distribution by booking status</CardDescription>
          </CardHeader>
          <CardContent>
            {statusPieData.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                No data for this period
              </div>
            ) : (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusPieData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                      width={90}
                      className="capitalize"
                    />
                    <Tooltip content={<CustomTooltip formatter={(v: number) => `${v} bookings`} />} />
                    <Bar dataKey="value" name="Bookings" radius={[0, 4, 4, 0]}>
                      {statusPieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Service Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Briefcase className="size-5" />
            Service Performance
          </CardTitle>
          <CardDescription>Revenue and volume by service</CardDescription>
        </CardHeader>
        <CardContent>
          {!servicePerf ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : servicePerf.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No service data for this period
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium">Service</th>
                    <th className="pb-3 font-medium text-right">Bookings</th>
                    <th className="pb-3 font-medium text-right">Revenue</th>
                    <th className="pb-3 font-medium text-right">Avg Price</th>
                    <th className="pb-3 font-medium text-right">Completion</th>
                  </tr>
                </thead>
                <tbody>
                  {servicePerf.map((s) => (
                    <tr key={s.serviceName} className="border-b last:border-0">
                      <td className="py-3 font-medium">{s.serviceName}</td>
                      <td className="py-3 text-right">{s.bookingCount}</td>
                      <td className="py-3 text-right font-medium text-green-600">
                        {formatPrice(s.revenue)}
                      </td>
                      <td className="py-3 text-right">{formatPrice(s.avgPrice)}</td>
                      <td className="py-3 text-right">
                        <Badge
                          variant="outline"
                          className={
                            s.completionRate >= 80
                              ? "bg-green-50 text-green-700 border-green-200"
                              : s.completionRate >= 50
                                ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                                : "bg-red-50 text-red-700 border-red-200"
                          }
                        >
                          {s.completionRate}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Two-column: Staff Productivity + Customer Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Staff Productivity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="size-5" />
              Staff Productivity
            </CardTitle>
            <CardDescription>Bookings and revenue per staff member</CardDescription>
          </CardHeader>
          <CardContent>
            {!staffProd ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : staffProd.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No staff data for this period
              </p>
            ) : (
              <div className="space-y-4">
                {staffProd.map((s, i) => {
                  const maxRevenue = staffProd[0]?.revenue || 1;
                  const pct = Math.round((s.revenue / maxRevenue) * 100);
                  return (
                    <div key={s.staffName} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="size-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                            style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                          >
                            {s.staffName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{s.staffName}</p>
                            <p className="text-xs text-muted-foreground">
                              {s.bookingCount} bookings · {s.completedCount} completed
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm text-green-600">{formatPrice(s.revenue)}</p>
                          <p className="text-xs text-muted-foreground">
                            avg {formatPrice(s.avgPerBooking)}/booking
                          </p>
                        </div>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="size-5" />
              Customer Insights
            </CardTitle>
            <CardDescription>Retention, repeat rate, and top clients</CardDescription>
          </CardHeader>
          <CardContent>
            {!customerInsights ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : (
              <div className="space-y-5">
                {/* Summary metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Repeat className="size-4 text-blue-600" />
                      <span className="text-xs text-muted-foreground">Repeat Rate</span>
                    </div>
                    <p className="text-2xl font-bold">{customerInsights.repeatRate}%</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Briefcase className="size-4 text-purple-600" />
                      <span className="text-xs text-muted-foreground">Avg Bookings</span>
                    </div>
                    <p className="text-2xl font-bold">{customerInsights.avgBookingsPerCustomer}</p>
                  </div>
                </div>

                {/* Top Customers */}
                <div>
                  <p className="text-sm font-medium mb-2">Top Customers by Spend</p>
                  <div className="space-y-2">
                    {customerInsights.topCustomers.slice(0, 5).map((c, i) => (
                      <div key={c.email} className="flex items-center justify-between py-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-muted-foreground w-5">
                            #{i + 1}
                          </span>
                          <span className="text-sm font-medium">{c.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {c.bookingCount} bookings
                          </Badge>
                        </div>
                        <span className="text-sm font-bold text-green-600">
                          {formatPrice(c.totalSpent)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top ZIP areas */}
                {customerInsights.bookingsBySource.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Top Service Areas (ZIP)</p>
                    <div className="flex flex-wrap gap-2">
                      {customerInsights.bookingsBySource.slice(0, 6).map((s) => (
                        <Badge key={s.source} variant="outline" className="text-xs">
                          📍 {s.source}: {s.count}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
