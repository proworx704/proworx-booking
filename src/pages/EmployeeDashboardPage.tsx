import { useQuery } from "convex/react";
import { format, startOfWeek } from "date-fns";
import { CalendarDays, Clock, DollarSign, Wallet } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { useUserRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function EmployeeDashboardPage() {
  const { displayName } = useUserRole();

  const today = format(new Date(), "yyyy-MM-dd");
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

  const workerInfo = useQuery(api.employeePortal.myWorkerInfo);
  const weekStats = useQuery(api.employeePortal.myWeekStats, { weekStart });
  const todayJobs = useQuery(api.employeePortal.myJobs, { date: today });
  const recentEntries = useQuery(api.employeePortal.myTimeEntries, {
    startDate: weekStart,
  });

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold">
          {greeting()}, {displayName || "Team Member"} 👋
        </h1>
        <p className="text-muted-foreground">
          {format(new Date(), "EEEE, MMMM d, yyyy")}
          {workerInfo && (
            <span> · ${Number(workerInfo.hourlyRate).toFixed(2)}/hr</span>
          )}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Clock className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {weekStats?.totalHours ?? "—"}h
            </div>
            <p className="text-xs text-muted-foreground">hours logged</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <DollarSign className="size-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {weekStats?.approvedHours ?? "—"}h
            </div>
            <p className="text-xs text-muted-foreground">approved hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">
              {weekStats?.pendingHours ?? "—"}h
            </div>
            <p className="text-xs text-muted-foreground">awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Est. Pay</CardTitle>
            <Wallet className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${workerInfo && weekStats
                ? (weekStats.approvedHours * Number(workerInfo.hourlyRate)).toFixed(2)
                : "—"}
            </div>
            <p className="text-xs text-muted-foreground">this week</p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Jobs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="size-5" />
            Today's Jobs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayJobs === undefined ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : todayJobs.length === 0 ? (
            <p className="text-muted-foreground">No jobs assigned for today.</p>
          ) : (
            <div className="space-y-3">
              {todayJobs.map((booking: any) => (
                <div
                  key={booking._id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <p className="font-medium">{booking.customerName || "Customer"}</p>
                    <p className="text-sm text-muted-foreground">
                      {booking.serviceName || "Service"} · {booking.startTime}
                    </p>
                  </div>
                  <Badge
                    variant={
                      booking.status === "confirmed"
                        ? "default"
                        : booking.status === "completed"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {booking.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Time Entries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="size-5" />
            This Week's Time Entries
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentEntries === undefined ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : recentEntries.length === 0 ? (
            <p className="text-muted-foreground">
              No time entries this week.{" "}
              <a href="/my/time-entries" className="text-primary underline">
                Log your hours →
              </a>
            </p>
          ) : (
            <div className="space-y-2">
              {recentEntries.slice(0, 5).map((entry: any) => (
                <div
                  key={entry._id}
                  className="flex items-center justify-between p-2 rounded border"
                >
                  <div>
                    <span className="font-medium">
                      {format(new Date(entry.date + "T12:00:00"), "EEE, MMM d")}
                    </span>
                    <span className="text-sm text-muted-foreground ml-2">
                      {entry.startTime} – {entry.endTime}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{entry.hoursWorked}h</span>
                    <Badge
                      variant={
                        entry.status === "approved"
                          ? "default"
                          : entry.status === "pending"
                            ? "outline"
                            : "destructive"
                      }
                      className={
                        entry.status === "approved"
                          ? "bg-green-100 text-green-700 hover:bg-green-100"
                          : ""
                      }
                    >
                      {entry.status}
                    </Badge>
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
