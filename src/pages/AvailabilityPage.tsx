import { useMutation, useQuery } from "convex/react";
import { CalendarOff, Clock, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { api } from "../../convex/_generated/api";

const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

interface DaySettings {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  dirty: boolean;
}

export function AvailabilityPage() {
  const availability = useQuery(api.availability.list);
  const blockedDates = useQuery(api.availability.listBlockedDates);
  const seedAvailability = useMutation(api.availability.seed);
  const upsertAvailability = useMutation(api.availability.upsert);
  const addBlockedDate = useMutation(api.availability.addBlockedDate);
  const removeBlockedDate = useMutation(api.availability.removeBlockedDate);

  const [days, setDays] = useState<DaySettings[]>([]);
  const [saving, setSaving] = useState(false);
  const [newBlockedDate, setNewBlockedDate] = useState("");
  const [newBlockedReason, setNewBlockedReason] = useState("");

  useEffect(() => {
    if (availability && availability.length === 0) {
      seedAvailability();
    }
  }, [availability, seedAvailability]);

  useEffect(() => {
    if (availability && availability.length > 0) {
      setDays(
        availability.map((a) => ({
          dayOfWeek: a.dayOfWeek,
          startTime: a.startTime,
          endTime: a.endTime,
          isAvailable: a.isAvailable,
          dirty: false,
        })),
      );
    }
  }, [availability]);

  const updateDay = (
    index: number,
    field: keyof DaySettings,
    value: string | boolean,
  ) => {
    setDays((prev) =>
      prev.map((d, i) =>
        i === index ? { ...d, [field]: value, dirty: true } : d,
      ),
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const dirtyDays = days.filter((d) => d.dirty);
      for (const day of dirtyDays) {
        await upsertAvailability({
          dayOfWeek: day.dayOfWeek,
          startTime: day.startTime,
          endTime: day.endTime,
          isAvailable: day.isAvailable,
        });
      }
      setDays((prev) => prev.map((d) => ({ ...d, dirty: false })));
    } finally {
      setSaving(false);
    }
  };

  const handleAddBlocked = async () => {
    if (!newBlockedDate) return;
    await addBlockedDate({
      date: newBlockedDate,
      reason: newBlockedReason || undefined,
    });
    setNewBlockedDate("");
    setNewBlockedReason("");
  };

  const hasDirty = days.some((d) => d.dirty);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Availability</h1>
        <p className="text-muted-foreground">
          Set your weekly schedule and block off dates
        </p>
      </div>

      {/* Weekly Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="size-5" />
            Weekly Schedule
          </CardTitle>
          <CardDescription>
            Set which days you're available and your working hours
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {days.map((day, index) => (
              <div
                key={day.dayOfWeek}
                className={`flex items-center gap-4 p-3 rounded-lg border ${
                  day.isAvailable
                    ? "bg-background"
                    : "bg-muted/50 opacity-60"
                } ${day.dirty ? "border-primary/50" : ""}`}
              >
                <div className="w-28">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={day.isAvailable}
                      onCheckedChange={(checked) =>
                        updateDay(index, "isAvailable", checked)
                      }
                    />
                    <span className="font-medium text-sm">
                      {dayNames[day.dayOfWeek]}
                    </span>
                  </div>
                </div>
                {day.isAvailable && (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      type="time"
                      value={day.startTime}
                      onChange={(e) =>
                        updateDay(index, "startTime", e.target.value)
                      }
                      className="w-[130px]"
                    />
                    <span className="text-muted-foreground">to</span>
                    <Input
                      type="time"
                      value={day.endTime}
                      onChange={(e) =>
                        updateDay(index, "endTime", e.target.value)
                      }
                      className="w-[130px]"
                    />
                  </div>
                )}
                {!day.isAvailable && (
                  <span className="text-sm text-muted-foreground">Closed</span>
                )}
              </div>
            ))}
          </div>

          {hasDirty && (
            <div className="flex justify-end mt-4">
              <Button onClick={handleSave} disabled={saving}>
                <Save className="size-4 mr-2" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Blocked Dates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarOff className="size-5" />
            Blocked Dates
          </CardTitle>
          <CardDescription>
            Block specific dates (holidays, vacation, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <Input
              type="date"
              value={newBlockedDate}
              onChange={(e) => setNewBlockedDate(e.target.value)}
              className="w-[180px]"
            />
            <Input
              placeholder="Reason (optional)"
              value={newBlockedReason}
              onChange={(e) => setNewBlockedReason(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleAddBlocked} disabled={!newBlockedDate}>
              Block Date
            </Button>
          </div>

          {blockedDates && blockedDates.length > 0 ? (
            <div className="space-y-2">
              {blockedDates
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((bd) => (
                  <div
                    key={bd._id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div>
                      <p className="font-medium">
                        {new Date(bd.date + "T12:00:00").toLocaleDateString(
                          "en-US",
                          {
                            weekday: "short",
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}
                      </p>
                      {bd.reason && (
                        <p className="text-sm text-muted-foreground">
                          {bd.reason}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => removeBlockedDate({ id: bd._id })}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No blocked dates
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
