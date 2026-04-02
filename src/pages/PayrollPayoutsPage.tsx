import { useQuery, useMutation } from "convex/react";
import { useState } from "react";
import {
  DollarSign,
  CheckCircle2,
  Circle,
  CalendarDays,
  Receipt,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  formatCurrency,
  formatDateShort,
  formatDateLong,
  formatHours,
} from "@/lib/dateUtils";

export function PayrollPayoutsPage() {
  const workers = useQuery(api.payrollWorkers.list) ?? [];
  const payouts = useQuery(api.payrollPayouts.list) ?? [];
  const markPaid = useMutation(api.payrollPayouts.markPaid);
  const markUnpaid = useMutation(api.payrollPayouts.markUnpaid);
  const removePayout = useMutation(api.payrollPayouts.remove);
  const generatePayouts = useMutation(api.payrollPayouts.generate);

  const [recalculating, setRecalculating] = useState<string | null>(null);

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    payoutId?: Id<"payrollPayouts">;
    workerName?: string;
    weekLabel?: string;
  }>({ open: false });

  const workerMap = Object.fromEntries(workers.map((w) => [w._id, w]));

  // Group payouts by week
  const payoutsByWeek = payouts.reduce(
    (acc, p) => {
      const key = p.weekStart;
      if (!acc[key]) acc[key] = [];
      acc[key].push(p);
      return acc;
    },
    {} as Record<string, typeof payouts>,
  );

  const weekKeys = Object.keys(payoutsByWeek).sort((a, b) => b.localeCompare(a));

  const totalGross = payouts.reduce((s, p) => s + p.grossPay, 0);
  const totalDeductions = payouts.reduce((s, p) => s + p.totalDeductions, 0);
  const totalPaid = payouts.filter((p) => p.isPaid).reduce((s, p) => s + p.netPay, 0);
  const totalUnpaid = payouts.filter((p) => !p.isPaid).reduce((s, p) => s + p.netPay, 0);

  const handleTogglePaid = async (id: Id<"payrollPayouts">, isPaid: boolean) => {
    try {
      if (isPaid) {
        await markUnpaid({ id });
        toast.success("Marked as unpaid");
      } else {
        await markPaid({ id });
        toast.success("Marked as paid");
      }
    } catch {
      toast.error("Failed to update payout");
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.payoutId) return;
    try {
      await removePayout({ id: deleteDialog.payoutId });
      toast.success("Payout deleted");
      setDeleteDialog({ open: false });
    } catch {
      toast.error("Failed to delete payout");
    }
  };

  const handleRecalculate = async (weekStart: string, weekEnd: string) => {
    setRecalculating(weekStart);
    try {
      await generatePayouts({ weekStart, weekEnd });
      toast.success("Payouts recalculated with latest hours");
    } catch {
      toast.error("Failed to recalculate payouts");
    } finally {
      setRecalculating(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payouts</h1>
        <p className="text-muted-foreground">Weekly payout history with tax deductions</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gross</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalGross)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Taxes</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">-{formatCurrency(totalDeductions)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Out</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(totalPaid)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <Circle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{formatCurrency(totalUnpaid)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Payouts */}
      {weekKeys.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <CalendarDays className="mx-auto h-8 w-8 mb-2 opacity-50" />
            <p className="text-lg mb-1">No payouts yet</p>
            <p>Log time entries, then generate payouts from the Dashboard.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {weekKeys.map((weekStart) => {
            const weekPayouts = payoutsByWeek[weekStart];
            const weekEnd = weekPayouts[0].weekEnd;
            const payDate = weekPayouts[0].payDate;
            const weekGross = weekPayouts.reduce((s, p) => s + p.grossPay, 0);
            const weekNet = weekPayouts.reduce((s, p) => s + p.netPay, 0);
            const weekDeductions = weekPayouts.reduce((s, p) => s + p.totalDeductions, 0);

            return (
              <Card key={weekStart}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">
                        Week of {formatDateShort(weekStart)} – {formatDateShort(weekEnd)}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Pay date: {formatDateLong(payDate)} (Thursday)
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-emerald-600">{formatCurrency(weekNet)}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatCurrency(weekGross)} gross · -{formatCurrency(weekDeductions)} tax
                      </div>
                    </div>
                  </div>
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1.5"
                      disabled={recalculating === weekStart}
                      onClick={() => handleRecalculate(weekStart, weekEnd)}
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${recalculating === weekStart ? "animate-spin" : ""}`} />
                      {recalculating === weekStart ? "Recalculating..." : "Recalculate Payouts"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Desktop: full table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="pb-2 font-medium">Worker</th>
                          <th className="pb-2 font-medium text-right">Hours</th>
                          <th className="pb-2 font-medium text-right">Gross</th>
                          <th className="pb-2 font-medium text-right">Federal</th>
                          <th className="pb-2 font-medium text-right">NC State</th>
                          <th className="pb-2 font-medium text-right">SS</th>
                          <th className="pb-2 font-medium text-right">Medicare</th>
                          <th className="pb-2 font-medium text-right">Net</th>
                          <th className="pb-2 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {weekPayouts.map((p) => (
                          <tr key={p._id} className="border-b last:border-0">
                            <td className="py-2.5 font-medium">{workerMap[p.workerId]?.name ?? "Unknown"}</td>
                            <td className="py-2.5 text-right">{formatHours(p.totalHours)}</td>
                            <td className="py-2.5 text-right">{formatCurrency(p.grossPay)}</td>
                            <td className="py-2.5 text-right text-red-500">-{formatCurrency(p.federalTax)}</td>
                            <td className="py-2.5 text-right text-red-500">-{formatCurrency(p.stateTax)}</td>
                            <td className="py-2.5 text-right text-red-500">-{formatCurrency(p.socialSecurity)}</td>
                            <td className="py-2.5 text-right text-red-500">-{formatCurrency(p.medicare)}</td>
                            <td className="py-2.5 text-right font-semibold text-emerald-600">{formatCurrency(p.netPay)}</td>
                            <td className="py-2.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant={p.isPaid ? "ghost" : "outline"}
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => handleTogglePaid(p._id, p.isPaid)}
                                >
                                  {p.isPaid ? (
                                    <>
                                      <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-500" />
                                      Paid
                                    </>
                                  ) : (
                                    <>
                                      <Circle className="h-3 w-3 mr-1" />
                                      Mark Paid
                                    </>
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                                  onClick={() =>
                                    setDeleteDialog({
                                      open: true,
                                      payoutId: p._id,
                                      workerName: workerMap[p.workerId]?.name ?? "Unknown",
                                      weekLabel: `${formatDateShort(weekStart)} – ${formatDateShort(weekEnd)}`,
                                    })
                                  }
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile: card layout per worker */}
                  <div className="md:hidden space-y-3">
                    {weekPayouts.map((p) => (
                      <div key={p._id} className="rounded-lg border p-3 space-y-3">
                        {/* Worker name + net pay */}
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{workerMap[p.workerId]?.name ?? "Unknown"}</span>
                          <span className="text-lg font-bold text-emerald-600">{formatCurrency(p.netPay)}</span>
                        </div>

                        {/* Hours + Gross */}
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Hours: </span>
                            <span className="font-medium">{formatHours(p.totalHours)}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-muted-foreground">Gross: </span>
                            <span className="font-medium">{formatCurrency(p.grossPay)}</span>
                          </div>
                        </div>

                        {/* Tax breakdown */}
                        <div className="grid grid-cols-2 gap-1 text-xs text-red-500">
                          <div>Federal: -{formatCurrency(p.federalTax)}</div>
                          <div className="text-right">NC State: -{formatCurrency(p.stateTax)}</div>
                          <div>SS: -{formatCurrency(p.socialSecurity)}</div>
                          <div className="text-right">Medicare: -{formatCurrency(p.medicare)}</div>
                        </div>

                        {/* Action buttons — always visible on mobile */}
                        <div className="flex items-center gap-2 pt-1 border-t">
                          <Button
                            variant={p.isPaid ? "secondary" : "default"}
                            size="sm"
                            className={`flex-1 h-9 text-sm ${!p.isPaid ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                            onClick={() => handleTogglePaid(p._id, p.isPaid)}
                          >
                            {p.isPaid ? (
                              <>
                                <CheckCircle2 className="h-4 w-4 mr-1.5 text-emerald-500" />
                                Paid — Tap to Undo
                              </>
                            ) : (
                              <>
                                <Circle className="h-4 w-4 mr-1.5" />
                                Mark as Paid
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 px-3 text-red-500 hover:text-red-700 hover:bg-red-50 border-red-200"
                            onClick={() =>
                              setDeleteDialog({
                                open: true,
                                payoutId: p._id,
                                workerName: workerMap[p.workerId]?.name ?? "Unknown",
                                weekLabel: `${formatDateShort(weekStart)} – ${formatDateShort(weekEnd)}`,
                              })
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => {
          if (!open) setDeleteDialog({ open: false });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Payout</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the payout for{" "}
              <strong>{deleteDialog.workerName}</strong> for the week of{" "}
              <strong>{deleteDialog.weekLabel}</strong>?
              <br />
              <br />
              This removes the payout record. You can always regenerate it later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-1.5" />
              Delete Payout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
