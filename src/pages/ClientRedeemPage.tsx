import { useMutation, useQuery } from "convex/react";
import { Check, Gift, Lock, Star } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

function formatRewardValue(reward: any) {
  if (reward.rewardType === "discount_fixed" && reward.discountAmount)
    return `$${(reward.discountAmount / 100).toFixed(0)} Off`;
  if (reward.rewardType === "discount_percent" && reward.discountPercent)
    return `${reward.discountPercent}% Off`;
  if (reward.rewardType === "free_service") return "Free Service";
  return "Special Reward";
}

export function ClientRedeemPage() {
  const account = useQuery(api.loyalty.getMyAccount);
  const rewards = useQuery(api.loyalty.listRewards);
  const profile = useQuery(api.loyalty.getMyProfile);
  const settings = useQuery(api.loyalty.getSettings);

  const [confirmReward, setConfirmReward] = useState<any>(null);

  const activeRewards = (rewards || []).filter((r) => r.isActive).sort((a, b) => a.pointsCost - b.pointsCost);
  const currentPts = account?.currentPoints || 0;
  const minRedeem = (settings as any)?.minPointsToRedeem || 0;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Rewards</h1>
        <p className="text-muted-foreground">
          Redeem your points for discounts and perks
        </p>
      </div>

      {/* Balance Banner */}
      <Card className="bg-gradient-to-r from-amber-500 to-orange-600 text-white border-0">
        <CardContent className="py-5 flex items-center justify-between">
          <div>
            <p className="text-amber-100 text-sm font-medium">Your Balance</p>
            <p className="text-3xl font-bold">{currentPts.toLocaleString()} pts</p>
          </div>
          <Star className="size-10 text-amber-200/40" />
        </CardContent>
      </Card>

      {minRedeem > 0 && currentPts < minRedeem && (
        <div className="text-sm text-muted-foreground bg-muted rounded-lg p-3">
          You need at least <strong>{minRedeem} points</strong> to start redeeming rewards.
        </div>
      )}

      {/* Rewards Grid */}
      {activeRewards.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Gift className="size-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No rewards available yet</p>
            <p className="text-sm text-muted-foreground">Check back soon!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {activeRewards.map((reward) => {
            const canRedeem = currentPts >= reward.pointsCost && currentPts >= minRedeem;
            const progress = Math.min(100, (currentPts / reward.pointsCost) * 100);

            return (
              <Card
                key={reward._id}
                className={`transition-all ${
                  canRedeem
                    ? "border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-800 hover:shadow-md"
                    : "opacity-75"
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">
                      {reward.icon ? `${reward.icon} ` : "🎁 "}
                      {reward.name}
                    </CardTitle>
                    <Badge
                      variant={canRedeem ? "default" : "secondary"}
                      className={canRedeem ? "bg-green-600" : ""}
                    >
                      {reward.pointsCost.toLocaleString()} pts
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    {reward.description}
                  </p>
                  <p className="text-sm font-medium mb-3">
                    {formatRewardValue(reward)}
                  </p>

                  {/* Progress bar */}
                  {!canRedeem && (
                    <div className="mb-3">
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {reward.pointsCost - currentPts} more points needed
                      </p>
                    </div>
                  )}

                  <Button
                    size="sm"
                    className="w-full"
                    disabled={!canRedeem}
                    onClick={() => setConfirmReward(reward)}
                  >
                    {canRedeem ? (
                      <>
                        <Gift className="size-4 mr-1" /> Redeem
                      </>
                    ) : (
                      <>
                        <Lock className="size-4 mr-1" /> Locked
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={!!confirmReward} onOpenChange={() => setConfirmReward(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Redemption</DialogTitle>
            <DialogDescription>
              This will be submitted to ProWorx for your next service. A team member will apply the discount.
            </DialogDescription>
          </DialogHeader>
          {confirmReward && (
            <div className="py-4 space-y-3">
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="font-medium">
                  {confirmReward.icon} {confirmReward.name}
                </span>
                <span className="font-bold text-red-500">
                  -{confirmReward.pointsCost.toLocaleString()} pts
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current balance</span>
                <span>{currentPts.toLocaleString()} pts</span>
              </div>
              <div className="flex justify-between text-sm font-medium">
                <span>Balance after</span>
                <span>{(currentPts - confirmReward.pointsCost).toLocaleString()} pts</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmReward(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                // Client-side redemption will be a request that admin can process
                // For now we show a toast confirming the request
                toast.success("Redemption Requested! 🎉", {
                  description:
                    "ProWorx will apply this reward on your next service. Points will be deducted when applied.",
                });
                setConfirmReward(null);
              }}
            >
              <Check className="size-4 mr-1" /> Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
