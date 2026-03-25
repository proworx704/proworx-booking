import { useQuery } from "convex/react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Gift,
  Sparkles,
  Star,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "../../convex/_generated/api";

const typeConfig: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  earn: { label: "Earned", icon: Star, color: "text-green-600" },
  bonus: { label: "Bonus", icon: Sparkles, color: "text-amber-600" },
  redeem: { label: "Redeemed", icon: Gift, color: "text-red-500" },
  adjust: { label: "Adjustment", icon: Wrench, color: "text-blue-500" },
  expire: { label: "Expired", icon: ArrowDownLeft, color: "text-gray-400" },
};

export function ClientPointsPage() {
  const account = useQuery(api.loyalty.getMyAccount);
  const transactions = useQuery(api.loyalty.getMyTransactions);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">My Points</h1>
        <p className="text-muted-foreground">
          Your complete points history
        </p>
      </div>

      {/* Balance Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white border-0">
          <CardContent className="pt-6 pb-4">
            <p className="text-amber-100 text-xs font-medium uppercase tracking-wider">
              Available
            </p>
            <p className="text-3xl font-bold">
              {account?.currentPoints?.toLocaleString() || "0"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 pb-4">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
              Total Earned
            </p>
            <p className="text-3xl font-bold text-green-600">
              {account?.lifetimeEarned?.toLocaleString() || "0"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 pb-4">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
              Total Redeemed
            </p>
            <p className="text-3xl font-bold text-red-500">
              {account?.lifetimeRedeemed?.toLocaleString() || "0"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Points History</CardTitle>
        </CardHeader>
        <CardContent>
          {!transactions || transactions.length === 0 ? (
            <div className="text-center py-8">
              <Star className="size-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No transactions yet</p>
              <p className="text-sm text-muted-foreground">
                Book a service to start earning points!
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {transactions.map((txn) => {
                const config = typeConfig[txn.type] || typeConfig.earn;
                const Icon = config.icon;
                return (
                  <div
                    key={txn._id}
                    className="flex items-center gap-3 py-3 border-b last:border-0"
                  >
                    <div
                      className={`size-9 rounded-full flex items-center justify-center bg-muted/50 ${config.color}`}
                    >
                      {txn.points > 0 ? (
                        <ArrowUpRight className="size-4" />
                      ) : (
                        <ArrowDownLeft className="size-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {txn.description}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {config.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(txn._creationTime).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            },
                          )}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`font-bold text-base tabular-nums ${config.color}`}
                    >
                      {txn.points > 0 ? "+" : ""}
                      {txn.points.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
