import { useMutation, useQuery } from "convex/react";
import {
  CalendarOff,
  Plus,
  Snowflake,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

export function ServiceFreezePage() {
  const grouped = useQuery(api.serviceFreeze.listGrouped);
  const services = useQuery(api.services.listAll);
  const addFreeze = useMutation(api.serviceFreeze.add);
  const addBulkFreeze = useMutation(api.serviceFreeze.addBulk);
  const removeFreeze = useMutation(api.serviceFreeze.remove);

  const [showDialog, setShowDialog] = useState(false);
  const [selectedService, setSelectedService] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const today = new Date().toISOString().split("T")[0];

  const handleAdd = async () => {
    if (!selectedService || !startDate) {
      toast.error("Please select a service and at least a start date");
      return;
    }

    try {
      if (endDate && endDate > startDate) {
        // Date range — generate all dates between start and end
        const dates: string[] = [];
        const current = new Date(startDate + "T12:00:00");
        const end = new Date(endDate + "T12:00:00");

        while (current <= end) {
          dates.push(current.toISOString().split("T")[0]);
          current.setDate(current.getDate() + 1);
        }

        await addBulkFreeze({
          serviceId: selectedService as Id<"services">,
          dates,
          reason: reason || undefined,
        });
        toast.success(`Froze ${dates.length} dates for service`);
      } else {
        await addFreeze({
          serviceId: selectedService as Id<"services">,
          date: startDate,
          reason: reason || undefined,
        });
        toast.success("Service frozen for date");
      }
      setShowDialog(false);
      setSelectedService("");
      setStartDate("");
      setEndDate("");
      setReason("");
    } catch {
      toast.error("Failed to freeze service");
    }
  };

  const handleRemove = async (freezeId: string) => {
    await removeFreeze({ id: freezeId as Id<"serviceFreeze"> });
    toast.success("Freeze removed");
  };

  // Count total active freezes (future dates only)
  const activeFreezes = grouped
    ? grouped.reduce((sum, g) => sum + g.dates.filter((d) => d.date >= today).length, 0)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Service Freeze</h1>
          <p className="text-muted-foreground">
            Block specific services from being booked on certain dates
          </p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="size-4 mr-2" />
          Freeze Dates
        </Button>
      </div>

      {/* Summary */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Snowflake className="size-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium">
                {activeFreezes} active freeze{activeFreezes !== 1 ? "s" : ""}
              </p>
              <p className="text-sm text-muted-foreground">
                Services with blocked dates will not show available time slots for customers
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grouped freezes */}
      {!grouped || !services ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : grouped.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CalendarOff className="size-12 mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium mb-1">No frozen dates</h3>
            <p className="text-muted-foreground mb-4">
              All services are available for booking on all open days.
            </p>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="size-4 mr-2" />
              Freeze Dates
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map((group) => (
            <Card key={group.serviceId}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{group.serviceName}</CardTitle>
                  <Badge variant="secondary">
                    {group.dates.filter((d) => d.date >= today).length} active
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {group.dates.map((freeze) => {
                    const isPast = freeze.date < today;
                    return (
                      <div
                        key={freeze._id}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border ${
                          isPast
                            ? "bg-muted/50 text-muted-foreground"
                            : "bg-red-50 text-red-700 border-red-200"
                        }`}
                      >
                        <CalendarOff className="size-3.5" />
                        <span>{formatDate(freeze.date)}</span>
                        {freeze.reason && (
                          <span className="text-xs opacity-70">({freeze.reason})</span>
                        )}
                        <button
                          onClick={() => handleRemove(freeze._id)}
                          className="ml-1 hover:text-red-900 transition-colors"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Freeze Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Freeze Service Dates</DialogTitle>
            <DialogDescription>
              Block a service from being booked on specific dates. Other services will remain available.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Service</Label>
              <Select value={selectedService} onValueChange={setSelectedService}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a service..." />
                </SelectTrigger>
                <SelectContent>
                  {services?.map((s) => (
                    <SelectItem key={s._id} value={s._id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={today}
                />
              </div>
              <div>
                <Label>End Date (optional)</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || today}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave blank for a single day
                </p>
              </div>
            </div>
            <div>
              <Label>Reason (optional)</Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Equipment maintenance"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd}>
              <Snowflake className="size-4 mr-2" />
              Freeze Dates
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
