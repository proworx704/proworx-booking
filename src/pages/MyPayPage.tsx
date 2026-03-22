import { useQuery } from "convex/react";
import { format } from "date-fns";
import { Wallet, DollarSign, FileText } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { useUserRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function MyPayPage() {
  const { displayName } = useUserRole();
  const workerInfo = useQuery(api.employeePortal.myWorkerInfo);
  const payouts = useQuery(api.employeePortal.myPayouts);

  const totalPaid = payouts?.reduce((sum, p: any) => sum + (p.netPay || 0), 0) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wallet className="size-6" />
          My Pay
        </h1>
        <p className="text-muted-foreground">
          {displayName}
          {workerInfo && ` · $${Number(workerInfo.hourlyRate).toFixed(2)}/hr`}
        </p>
      </div>

      {/* Summary */}
      <div className="grid gap-4 grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
            <DollarSign className="size-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${totalPaid.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {payouts?.length ?? 0} payouts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rate</CardTitle>
            <FileText className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${workerInfo ? Number(workerInfo.hourlyRate).toFixed(2) : "—"}
            </div>
            <p className="text-xs text-muted-foreground">per hour</p>
          </CardContent>
        </Card>
      </div>

      {/* Payout History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-5" />
            Payout History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payouts === undefined ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : payouts.length === 0 ? (
            <p className="text-muted-foreground">No payouts yet.</p>
          ) : (
            <div className="space-y-3">
              {payouts.map((payout: any) => (
                <div
                  key={payout._id}
                  className="p-4 rounded-lg border space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      Week of{" "}
                      {format(new Date(payout.weekStart + "T12:00:00"), "MMM d, yyyy")}
                    </span>
                    <Badge
                      variant={payout.status === "paid" ? "default" : "outline"}
                      className={
                        payout.status === "paid"
                          ? "bg-green-100 text-green-700 hover:bg-green-100"
                          : ""
                      }
                    >
                      {payout.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Hours:</span>{" "}
                      <span className="font-medium">{payout.totalHours}h</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Gross:</span>{" "}
                      <span className="font-medium">
                        ${Number(payout.grossPay || 0).toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Net:</span>{" "}
                      <span className="font-bold text-green-600">
                        ${Number(payout.netPay || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  {payout.deductions > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Deductions: ${Number(payout.deductions).toFixed(2)}
                    </p>
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
