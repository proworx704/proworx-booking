import { useQuery } from "convex/react";
import {
  AlertCircle,
  CalendarDays,
  Clock,
  MapPin,
  Users,
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const TIER_LABELS: Record<string, string> = {
  exterior: "Clean",
  interior: "Shield",
  full: "Armor",
};
const TIER_COLORS: Record<string, string> = {
  exterior: "bg-blue-100 text-blue-800",
  interior: "bg-purple-100 text-purple-800",
  full: "bg-amber-100 text-amber-800",
};
const PLAN_LABELS: Record<string, string> = {
  monthly: "Mo",
  quarterly: "Qt",
  yearly: "Yr",
};

export function MaintenanceSchedulePage() {
  const zipGroups = useQuery(api.maintenanceMembers.groupByZip) ?? [];

  const today = new Date().toISOString().split("T")[0];
  const sevenDays = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

  const totalOverdue = zipGroups.reduce((s, g) => s + g.overdue, 0);
  const totalDueSoon = zipGroups.reduce((s, g) => s + g.dueSoon, 0);
  const totalMembers = zipGroups.reduce((s, g) => s + g.members.length, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Maintenance Schedule</h1>
          <p className="text-muted-foreground">
            Members grouped by ZIP code — plan efficient route days
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/maintenance/members">View All Members</Link>
        </Button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMembers}</div>
            <p className="text-xs text-muted-foreground">
              across {zipGroups.length} ZIP{zipGroups.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Due This Week</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{totalDueSoon}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totalOverdue}</div>
          </CardContent>
        </Card>
      </div>

      {/* ZIP groups */}
      {zipGroups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <MapPin className="mx-auto h-8 w-8 mb-2 opacity-50" />
            <p className="text-lg mb-1">No maintenance members yet</p>
            <p>
              <Link to="/maintenance/members" className="text-primary underline">
                Add members
              </Link>{" "}
              to start grouping by ZIP code.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {zipGroups.map((group) => {
            // Sort members: overdue first, then due soon, then by next date
            const sorted = [...group.members].sort((a, b) => {
              const aDate = a.nextServiceDate ?? "9999-99-99";
              const bDate = b.nextServiceDate ?? "9999-99-99";
              return aDate.localeCompare(bDate);
            });

            return (
              <Card key={group.zipCode}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">{group.zipCode}</CardTitle>
                      <Badge variant="secondary" className="ml-1">
                        {group.members.length} member{group.members.length !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {group.overdue > 0 && (
                        <Badge variant="destructive">
                          {group.overdue} overdue
                        </Badge>
                      )}
                      {group.dueSoon > 0 && (
                        <Badge className="bg-amber-500 hover:bg-amber-600">
                          {group.dueSoon} due soon
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {sorted.map((m) => {
                      const isOverdue = m.nextServiceDate && m.nextServiceDate < today;
                      const isDueSoon =
                        m.nextServiceDate &&
                        m.nextServiceDate >= today &&
                        m.nextServiceDate <= sevenDays;
                      const vehicle = [m.vehicleYear, m.vehicleMake, m.vehicleModel]
                        .filter(Boolean)
                        .join(" ");

                      return (
                        <div
                          key={m._id}
                          className={`rounded-lg border p-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 ${
                            isOverdue
                              ? "border-red-200 bg-red-50 dark:bg-red-950/20"
                              : isDueSoon
                                ? "border-amber-200 bg-amber-50 dark:bg-amber-950/20"
                                : ""
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">{m.name}</span>
                              <Badge className={`text-[10px] px-1.5 py-0 ${TIER_COLORS[m.membershipTier]}`}>
                                {TIER_LABELS[m.membershipTier]}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {PLAN_LABELS[m.planType]}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground mt-0.5">
                              {m.address}
                              {vehicle && <span className="ml-2">· {vehicle}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {m.nextServiceDate ? (
                              <span
                                className={`text-sm font-medium flex items-center gap-1 ${
                                  isOverdue
                                    ? "text-red-600"
                                    : isDueSoon
                                      ? "text-amber-600"
                                      : "text-muted-foreground"
                                }`}
                              >
                                <CalendarDays className="h-3.5 w-3.5" />
                                {m.nextServiceDate}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">No date set</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
