import { useQuery } from "convex/react";
import { CalendarCheck, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "../../convex/_generated/api";

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

const statusStyles: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  confirmed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  in_progress: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function ClientBookingsPage() {
  const bookings = useQuery(api.loyalty.getMyBookings);
  const today = new Date().toISOString().split("T")[0];

  const upcoming = (bookings || []).filter(
    (b) => b.date >= today && b.status !== "cancelled",
  );
  const past = (bookings || []).filter(
    (b) => b.date < today || b.status === "cancelled",
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">My Bookings</h1>
        <p className="text-muted-foreground">
          Your complete booking history with ProWorx
        </p>
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarCheck className="size-5 text-blue-500" />
              Upcoming Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcoming.map((b) => (
                <div
                  key={b._id}
                  className="p-4 rounded-lg border bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{b.serviceName}</p>
                      {b.selectedVariant && (
                        <p className="text-sm text-muted-foreground">
                          {b.selectedVariant}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground mt-1">
                        📅{" "}
                        {new Date(b.date + "T12:00:00").toLocaleDateString(
                          "en-US",
                          {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}{" "}
                        at {b.time}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        📍 {b.serviceAddress}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">
                        {formatPrice(b.totalPrice || b.price)}
                      </p>
                      <Badge className={statusStyles[b.status]}>
                        {statusLabels[b.status]}
                      </Badge>
                    </div>
                  </div>
                  {b.addons && b.addons.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-800">
                      <p className="text-xs font-medium text-muted-foreground">
                        Add-ons:
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {b.addons.map((a, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {a.name} (+{formatPrice(a.price)})
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-800 flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="size-3 text-amber-500" />
                    You'll earn ~
                    {Math.floor((b.totalPrice || b.price) / 100)} points from
                    this booking
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Past Bookings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Past Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {past.length === 0 ? (
            <div className="text-center py-8">
              <CalendarCheck className="size-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No past bookings</p>
            </div>
          ) : (
            <div className="space-y-2">
              {past.map((b) => (
                <div
                  key={b._id}
                  className="p-3 rounded-lg border text-sm"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{b.serviceName}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(b.date + "T12:00:00").toLocaleDateString(
                          "en-US",
                          {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}{" "}
                        · {b.time}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {formatPrice(b.totalPrice || b.price)}
                      </p>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${statusStyles[b.status]}`}
                      >
                        {statusLabels[b.status]}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
