import { useQuery, useMutation } from "convex/react";
import {
  DollarSign,
  CheckCircle2,
  Circle,
  CalendarDays,
  Receipt,
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// Badge used in earlier draft; kept import for future enhancements
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payouts</h1>
        <p className="text-muted-foreground">Weekly payout history with tax deductions</p>
      </div>

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
          {weekKeys.map((weekStartKey) => {
            const weekPayouts = payoutsByWeek[weekStartKey];
            const weekEnd = weekPayouts[0].weekEnd;
            const payDate = weekPayouts[0].payDate;
            const weekGross = weekPayouts.reduce((s, p) => s + p.grossPay, 0);
            const weekNet = weekPayouts.reduce((s, p) => s + p.netPay, 0);
            const weekDeductions = weekPayouts.reduce((s, p) => s + p.totalDeductions, 0);

            return (
              <Card key={weekStartKey}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">
                        Week of {formatDateShort(weekStartKey)} – {formatDateShort(weekEnd)}
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
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
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
                          <th className="pb-2 font-medium text-right">Status</th>
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
                            <td className="py-2.5 text-right font-semibold text-emerald-600">
                              {formatCurrency(p.netPay)}
                            </td>
                            <td className="py-2.5 text-right">
                              <Button
                                variant={p.isPaid ? "ghost" : "outline"}
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => (p.isPaid ? markUnpaid({ id: p._id }) : markPaid({ id: p._id }))}
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
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
