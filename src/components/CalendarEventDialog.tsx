import { useMutation } from "convex/react";
import {
  Calendar,
  Clock,
  Loader2,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CalendarEvent = {
  _id: Id<"calendarEvents">;
  title: string;
  eventType: "personal" | "vacation" | "block" | "other";
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  allDay: boolean;
  blockTime: boolean;
  notes?: string;
  color?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  initialDate?: string;
  initialTime?: string;
  editEvent?: CalendarEvent | null;
};

// ─── Event Type Config ────────────────────────────────────────────────────────

const EVENT_TYPES = [
  { value: "personal", label: "Personal Event", color: "#6366f1" },
  { value: "vacation", label: "Vacation / Day Off", color: "#f59e0b" },
  { value: "block", label: "Block Time", color: "#ef4444" },
  { value: "other", label: "Other", color: "#8b5cf6" },
] as const;

const DEFAULT_COLORS: Record<string, string> = {
  personal: "#6366f1",
  vacation: "#f59e0b",
  block: "#ef4444",
  other: "#8b5cf6",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function CalendarEventDialog({
  open,
  onClose,
  initialDate,
  initialTime,
  editEvent,
}: Props) {
  const createEvent = useMutation(api.calendarEvents.create);
  const updateEvent = useMutation(api.calendarEvents.update);
  const removeEvent = useMutation(api.calendarEvents.remove);

  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState<"personal" | "vacation" | "block" | "other">("personal");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [allDay, setAllDay] = useState(true);
  const [blockTime, setBlockTime] = useState(true);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Reset form when dialog opens or edit event changes
  useEffect(() => {
    if (open) {
      if (editEvent) {
        setTitle(editEvent.title);
        setEventType(editEvent.eventType);
        setStartDate(editEvent.startDate);
        setEndDate(editEvent.endDate);
        setStartTime(editEvent.startTime || "09:00");
        setEndTime(editEvent.endTime || "17:00");
        setAllDay(editEvent.allDay);
        setBlockTime(editEvent.blockTime);
        setNotes(editEvent.notes || "");
      } else {
        const today = new Date().toISOString().split("T")[0];
        setTitle("");
        setEventType("personal");
        setStartDate(initialDate || today);
        setEndDate(initialDate || today);
        setStartTime(initialTime || "09:00");
        setEndTime(
          initialTime
            ? (() => {
                const [h, m] = initialTime.split(":").map(Number);
                return `${Math.min(h + 1, 23).toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
              })()
            : "17:00",
        );
        setAllDay(initialTime ? false : true);
        setBlockTime(true);
        setNotes("");
      }
    }
  }, [open, initialDate, initialTime, editEvent]);

  // Auto-set blockTime when switching event types
  useEffect(() => {
    if (eventType === "vacation" || eventType === "block") {
      setBlockTime(true);
      if (eventType === "vacation") setAllDay(true);
    }
  }, [eventType]);

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      toast.error("Please enter an event title");
      return;
    }
    if (!startDate) {
      toast.error("Please select a start date");
      return;
    }
    if (!allDay && (!startTime || !endTime)) {
      toast.error("Please set start and end times");
      return;
    }
    if (endDate < startDate) {
      toast.error("End date cannot be before start date");
      return;
    }

    setSaving(true);
    try {
      if (editEvent) {
        await updateEvent({
          id: editEvent._id,
          title: title.trim(),
          eventType,
          startDate,
          endDate: endDate || startDate,
          startTime: allDay ? undefined : startTime,
          endTime: allDay ? undefined : endTime,
          allDay,
          blockTime,
          notes: notes.trim() || undefined,
          color: DEFAULT_COLORS[eventType],
        });
        toast.success("Event updated!");
      } else {
        await createEvent({
          title: title.trim(),
          eventType,
          startDate,
          endDate: endDate || startDate,
          startTime: allDay ? undefined : startTime,
          endTime: allDay ? undefined : endTime,
          allDay,
          blockTime,
          notes: notes.trim() || undefined,
          color: DEFAULT_COLORS[eventType],
        });
        toast.success("Event created!");
      }
      onClose();
    } catch (err) {
      toast.error("Failed to save event");
      console.error(err);
    } finally {
      setSaving(false);
    }
  }, [
    title, eventType, startDate, endDate, startTime, endTime,
    allDay, blockTime, notes, editEvent, createEvent, updateEvent, onClose,
  ]);

  const handleDelete = useCallback(async () => {
    if (!editEvent) return;
    setDeleting(true);
    try {
      await removeEvent({ id: editEvent._id });
      toast.success("Event deleted");
      onClose();
    } catch (err) {
      toast.error("Failed to delete event");
      console.error(err);
    } finally {
      setDeleting(false);
    }
  }, [editEvent, removeEvent, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-md mx-4 bg-background rounded-xl shadow-2xl border overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Calendar className="size-5 text-primary" />
            <h2 className="font-bold text-lg">
              {editEvent ? "Edit Event" : "Create Personal Event"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-muted transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Event Type */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Event type</Label>
            <Select value={eventType} onValueChange={(v) => setEventType(v as typeof eventType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    <div className="flex items-center gap-2">
                      <div
                        className="size-3 rounded-full"
                        style={{ backgroundColor: t.color }}
                      />
                      {t.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Event title</Label>
            <Input
              placeholder="e.g., Vacation, Dentist appointment, Day off..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          {/* Date and time section */}
          <div className="space-y-3">
            <Label className="text-sm font-bold">Date and time</Label>

            {/* Checkboxes */}
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={blockTime}
                  onCheckedChange={(c) => setBlockTime(!!c)}
                />
                <span className="text-sm">Block time</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={allDay}
                  onCheckedChange={(c) => {
                    setAllDay(!!c);
                    if (c) {
                      setStartTime("09:00");
                      setEndTime("17:00");
                    }
                  }}
                />
                <span className="text-sm">All day</span>
              </label>
            </div>

            {/* Date pickers */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Start date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (endDate < e.target.value) setEndDate(e.target.value);
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">End date</Label>
                <Input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            {/* Time pickers (only when not all-day) */}
            {!allDay && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="size-3" /> Start time
                  </Label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="size-3" /> End time
                  </Label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Notes</Label>
            <Textarea
              placeholder="Optional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t bg-muted/20">
          <div>
            {editEvent && (
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <Loader2 className="size-4 animate-spin mr-1" />
                ) : (
                  <Trash2 className="size-4 mr-1" />
                )}
                Delete
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="size-4 animate-spin mr-1" />
              ) : null}
              {editEvent ? "Save Changes" : "Create Event"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
