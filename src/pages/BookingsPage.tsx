import { useQuery } from "convex/react";
import {
  Calendar,
  ChevronRight,
  Filter,
  Search,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "../../convex/_generated/api";

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(0)}`;
}

function formatTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
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

type StatusFilter =
  | "all"
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled";

type PaymentFilter = "all" | "unpaid" | "paid" | "refunded";

// View presets from dashboard cards
type ViewPreset = "today" | "upcoming" | "unpaid" | null;

function getToday() {
  return new Date().toISOString().split("T")[0];
}

const PRESET_LABELS: Record<string, string> = {
  today: "Today's Bookings",
  upcoming: "Upcoming Bookings",
  unpaid: "Unpaid Bookings",
};

export function BookingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read initial state from URL params
  const viewPreset = (searchParams.get("view") as ViewPreset) || null;

  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() => {
    const s = searchParams.get("status");
    if (s && ["pending", "confirmed", "in_progress", "completed", "cancelled"].includes(s)) {
      return s as StatusFilter;
    }
    return "all";
  });

  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>(() => {
    if (viewPreset === "unpaid") return "unpaid";
    const p = searchParams.get("paymentStatus");
    if (p && ["unpaid", "paid", "refunded"].includes(p)) return p as PaymentFilter;
    return "all";
  });

  const [dateFilter, setDateFilter] = useState(() => {
    if (viewPreset === "today") return getToday();
    return searchParams.get("date") || "";
  });

  const [search, setSearch] = useState("");

  // Compute query args based on view preset
  const isUpcoming = viewPreset === "upcoming";
  const today = getToday();

  const queryArgs = {
    status: statusFilter === "all" ? undefined : statusFilter,
    paymentStatus: paymentFilter === "all" ? undefined : (paymentFilter as "unpaid" | "paid" | "refunded"),
    date: !isUpcoming && dateFilter ? dateFilter : undefined,
    startDate: isUpcoming ? today : undefined,
    endDate: undefined,
  };

  const bookings = useQuery(api.bookings.list, queryArgs);

  // For "upcoming" view, filter out today in-memory (show only future)
  const rangeFiltered = isUpcoming
    ? bookings?.filter((b) => b.date > today)?.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
    : bookings;

  const filteredBookings = rangeFiltered?.filter((b) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      b.customerName.toLowerCase().includes(q) ||
      b.customerEmail.toLowerCase().includes(q) ||
      b.customerPhone.includes(q) ||
      b.confirmationCode.toLowerCase().includes(q)
    );
  });

  // Derive title
  const title = viewPreset ? PRESET_LABELS[viewPreset] : "All Bookings";

  // Clear all filters
  const clearFilters = () => {
    setStatusFilter("all");
    setPaymentFilter("all");
    setDateFilter("");
    setSearch("");
    setSearchParams({});
  };

  const hasActiveFilters = viewPreset || statusFilter !== "all" || paymentFilter !== "all" || dateFilter;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-muted-foreground">
            {filteredBookings?.length ?? 0} booking{filteredBookings?.length !== 1 ? "s" : ""}
          </p>
        </div>
        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={clearFilters}>
            <X className="size-4 mr-1" />
            Clear Filters
          </Button>
        )}
      </div>

      {/* Active filter banner */}
      {viewPreset && (
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="secondary" className="gap-1">
            {viewPreset === "today" && "📅 Showing today's bookings"}
            {viewPreset === "upcoming" && "📆 Showing future bookings"}
            {viewPreset === "unpaid" && "💰 Showing unpaid bookings"}
          </Badge>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search name, email, phone, code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as StatusFilter)}
            >
              <SelectTrigger className="w-[160px]">
                <Filter className="size-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={paymentFilter}
              onValueChange={(v) => setPaymentFilter(v as PaymentFilter)}
            >
              <SelectTrigger className="w-[160px]">
                <Filter className="size-4 mr-2" />
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payment</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
            {!isUpcoming && (
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-[160px]"
                />
                {dateFilter && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDateFilter("")}
                  >
                    Clear
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bookings List */}
      <div className="space-y-2">
        {filteredBookings === undefined ? (
          [1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
          ))
        ) : filteredBookings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No bookings found
            </CardContent>
          </Card>
        ) : (
          filteredBookings.map((b) => (
            <Link key={b._id} to={`/bookings/${b._id}`}>
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <p className="font-semibold">{b.customerName}</p>
                        <span className="text-xs font-mono text-muted-foreground">
                          {b.confirmationCode}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {b.serviceName} ·{" "}
                        {formatDateShort(b.date)} at {formatTime(b.time)}
                        {b.staffNames && b.staffNames.length > 0 && (
                          <> · {b.staffNames.join(", ")}</>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">
                        {formatPrice(b.totalPrice || b.price)}
                      </span>
                      <Badge
                        variant="outline"
                        className={statusColors[b.status]}
                      >
                        {b.status.replace("_", " ")}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={paymentColors[b.paymentStatus]}
                      >
                        {b.paymentStatus}
                      </Badge>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
