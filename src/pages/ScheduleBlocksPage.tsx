import { useMutation, useQuery } from "convex/react";
import {
  CalendarClock,
  Power,
  Save,
  Shield,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { api } from "../../convex/_generated/api";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const TIME_OPTIONS = [
  "all-day",
  "06:00",
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
];

function formatTime12(t: string) {
  if (t === "all-day") return "All Day";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

type WeekConfig = Record<number, { enabled: boolean; blockAfter: string }>;

export function ScheduleBlocksPage() {
  const settings = useQuery(api.recurringBlocks.getSettings);
  const blocks = useQuery(api.recurringBlocks.list);
  const saveSettings = useMutation(api.recurringBlocks.saveSettings);
  const upsertBlock = useMutation(api.recurringBlocks.upsert);
  const removeByWeekDay = useMutation(api.recurringBlocks.removeByWeekDay);

  const [isEnabled, setIsEnabled] = useState(false);
  const [weekAStartDate, setWeekAStartDate] = useState("");
  const [weekA, setWeekA] = useState<WeekConfig>({});
  const [weekB, setWeekB] = useState<WeekConfig>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Init from server
  useEffect(() => {
    if (settings) {
      setIsEnabled(settings.isEnabled);
      setWeekAStartDate(settings.weekAStartDate);
    }
  }, [settings]);

  useEffect(() => {
    if (blocks) {
      const a: WeekConfig = {};
      const b: WeekConfig = {};
      for (const block of blocks) {
        const target = block.weekType === "A" ? a : b;
        target[block.dayOfWeek] = {
          enabled: true,
          blockAfter: block.blockAfter,
        };
      }
      setWeekA(a);
      setWeekB(b);
    }
  }, [blocks]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save settings
      await saveSettings({
        weekAStartDate: weekAStartDate || new Date().toISOString().split("T")[0],
        isEnabled,
      });

      // Sync week A blocks
      for (let day = 0; day <= 6; day++) {
        const config = weekA[day];
        if (config?.enabled) {
          await upsertBlock({
            weekType: "A",
            dayOfWeek: day,
            blockAfter: config.blockAfter,
            reason: "Custody schedule",
          });
        } else {
          await removeByWeekDay({ weekType: "A", dayOfWeek: day });
        }
      }

      // Sync week B blocks
      for (let day = 0; day <= 6; day++) {
        const config = weekB[day];
        if (config?.enabled) {
          await upsertBlock({
            weekType: "B",
            dayOfWeek: day,
            blockAfter: config.blockAfter,
            reason: "Custody schedule",
          });
        } else {
          await removeByWeekDay({ weekType: "B", dayOfWeek: day });
        }
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error("Save failed:", e);
      alert("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (
    week: "A" | "B",
    day: number,
    enabled: boolean,
  ) => {
    const setter = week === "A" ? setWeekA : setWeekB;
    setter((prev) => ({
      ...prev,
      [day]: enabled
        ? { enabled: true, blockAfter: "16:00" }
        : { enabled: false, blockAfter: "16:00" },
    }));
  };

  const setBlockTime = (week: "A" | "B", day: number, time: string) => {
    const setter = week === "A" ? setWeekA : setWeekB;
    setter((prev) => ({
      ...prev,
      [day]: { ...prev[day], enabled: true, blockAfter: time },
    }));
  };

  const WeekColumn = ({
    weekType,
    config,
    color,
  }: {
    weekType: "A" | "B";
    config: WeekConfig;
    color: string;
  }) => (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Badge className={`${color} text-white text-sm px-3 py-1`}>
          Week {weekType}
        </Badge>
      </div>
      <div className="space-y-2">
        {[1, 2, 3, 4, 5, 6, 0].map((day) => {
          const dayConfig = config[day];
          const isActive = dayConfig?.enabled;

          return (
            <div
              key={day}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                isActive
                  ? "border-orange-300 bg-orange-50 dark:bg-orange-950/30"
                  : "border-border"
              }`}
            >
              <Switch
                checked={isActive ?? false}
                onCheckedChange={(checked) =>
                  toggleDay(weekType, day, checked)
                }
              />
              <span
                className={`text-sm font-medium w-24 ${
                  isActive ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {DAY_NAMES[day]}
              </span>
              {isActive && (
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {dayConfig?.blockAfter === "all-day" ? "Blocked" : "Stop after"}
                  </span>
                  <Select
                    value={dayConfig?.blockAfter || "16:00"}
                    onValueChange={(v) => setBlockTime(weekType, day, v)}
                  >
                    <SelectTrigger className="w-28 h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {formatTime12(t)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarClock className="size-6" />
            Schedule Blocks
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Alternating Week A / Week B schedule — blocks booking slots past a
            set time on specific days
          </p>
        </div>
      </div>

      {/* Enable toggle + reference date */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-1">
              <Switch
                checked={isEnabled}
                onCheckedChange={setIsEnabled}
              />
              <div>
                <p className="font-medium flex items-center gap-1.5">
                  <Power className="size-4" />
                  {isEnabled ? "Schedule Blocks Active" : "Schedule Blocks Disabled"}
                </p>
                <p className="text-xs text-muted-foreground">
                  When enabled, late-day slots are blocked on configured days
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="weekAStart" className="text-sm whitespace-nowrap">
                Week A starts
              </Label>
              <Input
                id="weekAStart"
                type="date"
                value={weekAStartDate}
                onChange={(e) => setWeekAStartDate(e.target.value)}
                className="w-44"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Explanation */}
      {isEnabled && (
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="p-4 flex gap-3">
            <Shield className="size-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-200">
                How it works
              </p>
              <p className="text-blue-800 dark:text-blue-300 mt-1">
                The calendar alternates between Week A and Week B starting from
                your reference date. On checked days, no booking slots will be
                offered at or after the "stop after" time. This doesn't affect
                existing bookings — only future slot availability.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Week A / Week B columns */}
      {isEnabled && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-5">
              <WeekColumn weekType="A" config={weekA} color="bg-blue-600" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <WeekColumn weekType="B" config={weekB} color="bg-purple-600" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Save */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="min-w-[140px]"
        >
          {saved ? (
            <>
              <CheckCircle className="size-4 mr-1" />
              Saved!
            </>
          ) : saving ? (
            "Saving..."
          ) : (
            <>
              <Save className="size-4 mr-1" />
              Save Schedule
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// Small helper — lucide doesn't export CheckCircle separately in some builds
function CheckCircle({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
