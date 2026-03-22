import { useMutation, useQuery } from "convex/react";
import { format, startOfWeek, addDays } from "date-fns";
import { Clock, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export function MyTimeEntriesPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [newEntry, setNewEntry] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    startTime: "08:00",
    endTime: "17:00",
    notes: "",
  });

  const weekStart = format(
    addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset * 7),
    "yyyy-MM-dd",
  );
  const weekEnd = format(
    addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset * 7 + 6),
    "yyyy-MM-dd",
  );

  const entries = useQuery(api.employeePortal.myTimeEntries, {
    startDate: weekStart,
    endDate: weekEnd,
  });
  const weekStats = useQuery(api.employeePortal.myWeekStats, { weekStart });
  const workerInfo = useQuery(api.employeePortal.myWorkerInfo);

  const submitEntry = useMutation(api.employeePortal.submitTimeEntry);
  const deleteEntry = useMutation(api.employeePortal.deleteTimeEntry);

  const handleSubmit = async () => {
    try {
      await submitEntry(newEntry);
      toast.success("Time entry submitted!");
      setAddOpen(false);
      setNewEntry({
        date: format(new Date(), "yyyy-MM-dd"),
        startTime: "08:00",
        endTime: "17:00",
        notes: "",
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to submit entry");
    }
  };

  const handleDelete = async (id: any) => {
    try {
      await deleteEntry({ id });
      toast.success("Entry deleted");
    } catch (error: any) {
      toast.error(error.message || "Cannot delete entry");
    }
  };

  const totalHours = entries?.reduce((sum, e: any) => sum + e.hoursWorked, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="size-6" />
            My Time Entries
          </h1>
          <p className="text-muted-foreground">
            {workerInfo
              ? `${workerInfo.name} · $${Number(workerInfo.hourlyRate).toFixed(2)}/hr`
              : "Track your work hours"}
          </p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4 mr-1" />
              Log Hours
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Time Entry</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={newEntry.date}
                  onChange={(e) =>
                    setNewEntry({ ...newEntry, date: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={newEntry.startTime}
                    onChange={(e) =>
                      setNewEntry({ ...newEntry, startTime: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={newEntry.endTime}
                    onChange={(e) =>
                      setNewEntry({ ...newEntry, endTime: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <Label>Notes (optional)</Label>
                <Textarea
                  value={newEntry.notes}
                  onChange={(e) =>
                    setNewEntry({ ...newEntry, notes: e.target.value })
                  }
                  placeholder="What did you work on?"
                />
              </div>
              <Button onClick={handleSubmit} className="w-full">
                Submit for Approval
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Week Navigator */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setWeekOffset(weekOffset - 1)}>
          ← Previous
        </Button>
        <span className="text-sm font-medium">
          {format(new Date(weekStart + "T12:00:00"), "MMM d")} –{" "}
          {format(new Date(weekEnd + "T12:00:00"), "MMM d, yyyy")}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setWeekOffset(weekOffset + 1)}
          disabled={weekOffset >= 0}
        >
          Next →
        </Button>
      </div>

      {/* Week Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold">{totalHours.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {weekStats?.approvedHours ?? 0}h
            </div>
            <p className="text-xs text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-amber-500">
              {weekStats?.pendingHours ?? 0}h
            </div>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Entries List */}
      <Card>
        <CardHeader>
          <CardTitle>Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {entries === undefined ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : entries.length === 0 ? (
            <p className="text-muted-foreground">No entries this week. Click "Log Hours" to add one.</p>
          ) : (
            <div className="space-y-2">
              {entries.map((entry: any) => (
                <div
                  key={entry._id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {format(new Date(entry.date + "T12:00:00"), "EEEE, MMM d")}
                      </span>
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
                    <p className="text-sm text-muted-foreground">
                      {entry.startTime} – {entry.endTime} · {entry.hoursWorked}h
                      {entry.notes && ` · ${entry.notes}`}
                    </p>
                  </div>
                  {entry.status === "pending" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(entry._id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
