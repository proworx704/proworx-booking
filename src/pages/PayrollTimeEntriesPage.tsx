import { useQuery, useMutation } from "convex/react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Pencil,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  formatDateShort,
  formatDateLong,
  formatHours,
  formatTime12hr,
  formatCurrency,
  getWeekStart,
  getWeekDays,
  shiftWeek,
  today,
} from "@/lib/dateUtils";

export function PayrollTimeEntriesPage() {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const weekEnd = useMemo(() => {
    const d = new Date(`${weekStart}T12:00:00`);
    d.setDate(d.getDate() + 6);
    return d.toISOString().split("T")[0];
  }, [weekStart]);

  const workers = useQuery(api.payrollWorkers.list) ?? [];
  const entries = useQuery(api.payrollTimeEntries.listByWeek, { weekStart, weekEnd }) ?? [];
  const createEntry = useMutation(api.payrollTimeEntries.create);
  const updateEntry = useMutation(api.payrollTimeEntries.update);
  const removeEntry = useMutation(api.payrollTimeEntries.remove);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<"payrollTimeEntries"> | null>(null);
  const [workerId, setWorkerId] = useState<string>("");
  const [date, setDate] = useState(() => today());
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("17:00");
  const [notes, setNotes] = useState("");

  const isCurrentWeek = weekStart === getWeekStart(new Date());
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const activeWorkers = workers.filter((w) => w.isActive);
  const workerMap = Object.fromEntries(workers.map((w) => [w._id, w]));

  const entriesByDay = useMemo(() => {
    const map: Record<string, typeof entries> = {};
    for (const day of weekDays) {
      map[day] = entries
        .filter((e) => e.date === day)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return map;
  }, [entries, weekDays]);

  const openCreate = (presetDate?: string) => {
    setEditingId(null);
    setWorkerId(activeWorkers.length === 1 ? activeWorkers[0]._id : "");
    setDate(presetDate ?? today());
    setStartTime("08:00");
    setEndTime("17:00");
    setNotes("");
    setDialogOpen(true);
  };

  const openEdit = (entry: (typeof entries)[0]) => {
    setEditingId(entry._id);
    setWorkerId(entry.workerId);
    setDate(entry.date);
    setStartTime(entry.startTime);
    setEndTime(entry.endTime);
    setNotes(entry.notes ?? "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!workerId) {
      toast.error("Select a worker");
      return;
    }
    if (!date || !startTime || !endTime) {
      toast.error("Fill in all fields");
      return;
    }
    try {
      if (editingId) {
        await updateEntry({
          id: editingId,
          workerId: workerId as Id<"payrollWorkers">,
          date,
          startTime,
          endTime,
          notes: notes.trim() || undefined,
        });
        toast.success("Entry updated");
      } else {
        await createEntry({
          workerId: workerId as Id<"payrollWorkers">,
          date,
          startTime,
          endTime,
          notes: notes.trim() || undefined,
        });
        toast.success("Time entry added");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Something went wrong");
    }
  };

  const handleDelete = async (id: Id<"payrollTimeEntries">) => {
    try {
      await removeEntry({ id });
      toast.success("Entry removed");
    } catch {
      toast.error("Could not delete entry");
    }
  };

  const previewHours = useMemo(() => {
    if (!startTime || !endTime) return 0;
    const [sH, sM] = startTime.split(":").map(Number);
    const [eH, eM] = endTime.split(":").map(Number);
    let hours = eH - sH + (eM - sM) / 60;
    if (hours < 0) hours += 24;
    return Math.round(hours * 100) / 100;
  }, [startTime, endTime]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Time Entries</h1>
          <p className="text-muted-foreground">
            {formatDateLong(weekStart)} — {formatDateLong(weekEnd)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekStart(shiftWeek(weekStart, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {!isCurrentWeek && (
            <Button variant="outline" size="sm" onClick={() => setWeekStart(getWeekStart(new Date()))}>
              This Week
            </Button>
          )}
          <Button variant="outline" size="icon" onClick={() => setWeekStart(shiftWeek(weekStart, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Button onClick={() => openCreate()}>
        <Plus className="mr-2 h-4 w-4" />
        Add Time Entry
      </Button>

      <div className="space-y-3">
        {weekDays.map((day) => {
          const dayEntries = entriesByDay[day] ?? [];
          const totalHours = dayEntries.reduce((sum, e) => sum + e.hoursWorked, 0);
          const totalPay = dayEntries.reduce((sum, e) => {
            const worker = workerMap[e.workerId];
            return sum + (worker ? e.hoursWorked * worker.hourlyRate : 0);
          }, 0);

          return (
            <Card key={day}>
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-sm font-medium">{formatDateShort(day)}</CardTitle>
                    {dayEntries.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {formatHours(totalHours)}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {formatCurrency(totalPay)}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openCreate(day)}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>
              </CardHeader>
              {dayEntries.length > 0 && (
                <CardContent className="px-4 pb-3 pt-0">
                  <div className="space-y-2">
                    {dayEntries.map((entry) => {
                      const worker = workerMap[entry.workerId];
                      return (
                        <div key={entry._id} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2">
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm font-medium">
                                {formatTime12hr(entry.startTime)} – {formatTime12hr(entry.endTime)}
                              </span>
                            </div>
                            <span className="text-sm text-muted-foreground">{worker?.name ?? "Unknown"}</span>
                            <Badge variant="secondary" className="text-xs">
                              {formatHours(entry.hoursWorked)}
                            </Badge>
                            {entry.status === "pending" && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-amber-300 text-amber-700 bg-amber-50">
                                <AlertCircle className="h-2.5 w-2.5 mr-0.5" />
                                Pending
                              </Badge>
                            )}
                            {entry.status === "rejected" && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-red-300 text-red-700 bg-red-50">
                                <XCircle className="h-2.5 w-2.5 mr-0.5" />
                                Rejected
                              </Badge>
                            )}
                            {entry.status === "approved" && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-emerald-300 text-emerald-700 bg-emerald-50">
                                <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                                Approved
                              </Badge>
                            )}
                            {entry.notes && (
                              <span className="text-xs text-muted-foreground hidden sm:inline">— {entry.notes}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(entry)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(entry._id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Time Entry" : "Add Time Entry"}</DialogTitle>
            <DialogDescription>Log start and end times. Hours are calculated automatically.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Worker *</Label>
              <Select value={workerId} onValueChange={setWorkerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select worker" />
                </SelectTrigger>
                <SelectContent>
                  {activeWorkers.map((w) => (
                    <SelectItem key={w._id} value={w._id}>
                      {w.name} ({formatCurrency(w.hourlyRate)}/hr)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="te-date">Date *</Label>
              <Input id="te-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="te-start">Start Time *</Label>
                <Input id="te-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="te-end">End Time *</Label>
                <Input id="te-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
            {previewHours > 0 && (
              <div className="rounded-md bg-muted/50 p-3 text-sm">
                <span className="font-medium">{formatHours(previewHours)}</span>
                {workerId && workerMap[workerId] && (
                  <span className="text-muted-foreground">
                    {" "}· {formatCurrency(previewHours * workerMap[workerId].hourlyRate)} gross
                  </span>
                )}
              </div>
            )}
            <div>
              <Label htmlFor="te-notes">Notes</Label>
              <Input
                id="te-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes (e.g. job details)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>{editingId ? "Save Changes" : "Add Entry"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
