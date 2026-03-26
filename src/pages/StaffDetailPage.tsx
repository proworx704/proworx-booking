import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  Sparkles,
  X,
} from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DEFAULT_SCHEDULE = Array.from({ length: 7 }, (_, i) => ({
  dayOfWeek: i,
  startTime: "09:30",
  endTime: i === 6 ? "15:00" : "18:00",
  isAvailable: i !== 0,
}));

export function StaffDetailPage() {
  const { id } = useParams<{ id: string }>();
  const staffWithServices = useQuery(api.staff.getWithServices, id ? { id: id as Id<"staff"> } : "skip");
  const staffAvailability = useQuery(api.staffAvailability.getForStaff, id ? { staffId: id as Id<"staff"> } : "skip");
  const allServices = useQuery(api.services.listAll);
  const staffBookings = useQuery(api.bookings.listByStaff, id ? { staffId: id as Id<"staff"> } : "skip");

  const assignService = useMutation(api.staff.assignService);
  const unassignService = useMutation(api.staff.unassignService);
  const bulkUpdateAvail = useMutation(api.staffAvailability.bulkUpdate);

  const [editingSchedule, setEditingSchedule] = useState(false);
  const [schedule, setSchedule] = useState<Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isAvailable: boolean;
  }>>([]);

  if (!id) return null;

  if (!staffWithServices || !allServices) {
    return (
      <div className="text-center py-8 text-muted-foreground">Loading...</div>
    );
  }

  const staff = staffWithServices;
  const assignedServiceIds = new Set(staff.services?.map((s: any) => s._id) || []);

  // Build schedule from availability or defaults
  const currentSchedule = staffAvailability && staffAvailability.length > 0
    ? DAY_NAMES.map((_, i) => {
        const existing = staffAvailability.find((a) => a.dayOfWeek === i);
        return existing || DEFAULT_SCHEDULE[i];
      })
    : DEFAULT_SCHEDULE;

  const startEditing = () => {
    setSchedule(currentSchedule.map((s) => ({
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      isAvailable: s.isAvailable,
    })));
    setEditingSchedule(true);
  };

  const saveSchedule = async () => {
    try {
      await bulkUpdateAvail({
        staffId: id as Id<"staff">,
        schedule,
      });
      setEditingSchedule(false);
      toast.success("Schedule updated");
    } catch {
      toast.error("Failed to update schedule");
    }
  };

  const handleToggleService = async (serviceId: string) => {
    try {
      if (assignedServiceIds.has(serviceId)) {
        await unassignService({
          staffId: id as Id<"staff">,
          serviceId: serviceId as Id<"services">,
        });
        toast.success("Service unassigned");
      } else {
        await assignService({
          staffId: id as Id<"staff">,
          serviceId: serviceId as Id<"services">,
        });
        toast.success("Service assigned");
      }
    } catch {
      toast.error("Failed to update service assignment");
    }
  };

  const upcomingBookings = (staffBookings || []).filter(
    (b) => b.date >= new Date().toISOString().split("T")[0],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/staff">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div
            className="size-12 rounded-full flex items-center justify-center text-white font-semibold"
            style={{ backgroundColor: staff.color }}
          >
            {staff.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{staff.name}</h1>
            <div className="flex items-center gap-2">
              <Badge variant={staff.role === "owner" ? "default" : staff.role === "manager" ? "secondary" : "outline"}>
                {staff.role.charAt(0).toUpperCase() + staff.role.slice(1)}
              </Badge>
              {!staff.isActive && (
                <Badge variant="outline" className="text-muted-foreground">
                  Inactive
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Service Assignments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-5" />
              Service Assignments
            </CardTitle>
            <CardDescription>
              Choose which services this staff member can be booked for
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Core Services */}
              {allServices
                .filter((s) => !s.name.startsWith("Maintenance"))
                .map((service) => {
                  const isAssigned = assignedServiceIds.has(service._id);
                  return (
                    <div
                      key={service._id}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                        isAssigned
                          ? "bg-primary/5 border-primary/20"
                          : "hover:bg-muted/50"
                      }`}
                      onClick={() => handleToggleService(service._id)}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`size-8 rounded-full flex items-center justify-center ${
                            isAssigned
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {isAssigned ? <Check className="size-4" /> : <X className="size-4" />}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{service.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {Math.floor(service.duration / 60)}h{service.duration % 60 > 0 ? ` ${service.duration % 60}m` : ""} · ${(service.sedanPrice / 100).toFixed(0)}-${(service.suvPrice / 100).toFixed(0)}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={isAssigned}
                        onCheckedChange={() => handleToggleService(service._id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  );
                })}

              {/* Maintenance Services Section */}
              {allServices.some((s) => s.name.startsWith("Maintenance")) && (
                <>
                  <div className="pt-2 pb-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Maintenance Plans
                    </p>
                  </div>
                  {allServices
                    .filter((s) => s.name.startsWith("Maintenance"))
                    .map((service) => {
                      const isAssigned = assignedServiceIds.has(service._id);
                      return (
                        <div
                          key={service._id}
                          className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                            isAssigned
                              ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800"
                              : "hover:bg-muted/50"
                          }`}
                          onClick={() => handleToggleService(service._id)}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`size-8 rounded-full flex items-center justify-center ${
                                isAssigned
                                  ? "bg-emerald-600 text-white"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {isAssigned ? <Check className="size-4" /> : <X className="size-4" />}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{service.name.replace("Maintenance - ", "")}</p>
                              <p className="text-xs text-muted-foreground">
                                {service.duration >= 60 ? `${Math.floor(service.duration / 60)}h` : ""}{service.duration % 60 > 0 ? ` ${service.duration % 60}m` : ""} · ${(service.sedanPrice / 100).toFixed(0)}/mo
                              </p>
                            </div>
                          </div>
                          <Switch
                            checked={isAssigned}
                            onCheckedChange={() => handleToggleService(service._id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      );
                    })}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Weekly Availability */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="size-5" />
                  Weekly Schedule
                </CardTitle>
                <CardDescription>
                  Set when this staff member is available
                </CardDescription>
              </div>
              {!editingSchedule ? (
                <Button variant="outline" size="sm" onClick={startEditing}>
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditingSchedule(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={saveSchedule}>
                    Save
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(editingSchedule ? schedule : currentSchedule).map((day, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 p-2.5 rounded-lg ${
                    day.isAvailable ? "bg-muted/30" : "bg-muted/10 opacity-60"
                  }`}
                >
                  <span className="w-10 text-sm font-medium">{DAY_SHORT[day.dayOfWeek]}</span>
                  {editingSchedule ? (
                    <>
                      <Switch
                        checked={schedule[i].isAvailable}
                        onCheckedChange={(checked) => {
                          const newSchedule = [...schedule];
                          newSchedule[i] = { ...newSchedule[i], isAvailable: checked };
                          setSchedule(newSchedule);
                        }}
                      />
                      {schedule[i].isAvailable && (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            type="time"
                            value={schedule[i].startTime}
                            onChange={(e) => {
                              const newSchedule = [...schedule];
                              newSchedule[i] = { ...newSchedule[i], startTime: e.target.value };
                              setSchedule(newSchedule);
                            }}
                            className="h-8 w-28"
                          />
                          <span className="text-muted-foreground text-sm">to</span>
                          <Input
                            type="time"
                            value={schedule[i].endTime}
                            onChange={(e) => {
                              const newSchedule = [...schedule];
                              newSchedule[i] = { ...newSchedule[i], endTime: e.target.value };
                              setSchedule(newSchedule);
                            }}
                            className="h-8 w-28"
                          />
                        </div>
                      )}
                      {!schedule[i].isAvailable && (
                        <span className="text-sm text-muted-foreground">Closed</span>
                      )}
                    </>
                  ) : (
                    <>
                      {day.isAvailable ? (
                        <span className="text-sm">
                          {day.startTime} – {day.endTime}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Closed</span>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Bookings */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="size-5" />
              Upcoming Bookings
            </CardTitle>
            <CardDescription>
              {upcomingBookings.length} upcoming booking{upcomingBookings.length !== 1 ? "s" : ""} assigned to {staff.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No upcoming bookings assigned
              </p>
            ) : (
              <div className="space-y-2">
                {upcomingBookings.slice(0, 10).map((booking) => (
                  <Link
                    key={booking._id}
                    to={`/bookings/${booking._id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">{booking.customerName}</p>
                      <p className="text-xs text-muted-foreground">
                        {booking.serviceName} · {booking.vehicleType === "suv" ? "SUV" : "Sedan"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{booking.date}</p>
                      <p className="text-xs text-muted-foreground">{booking.time}</p>
                    </div>
                  </Link>
                ))}
                {upcomingBookings.length > 10 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    + {upcomingBookings.length - 10} more
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
