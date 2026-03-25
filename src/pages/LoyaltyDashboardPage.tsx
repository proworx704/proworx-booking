import { useMutation, useQuery } from "convex/react";
import {
  Award,
  Gift,
  Minus,
  Plus,
  Rocket,
  Settings2,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export function LoyaltyDashboardPage() {
  const stats = useQuery(api.loyalty.dashboardStats);
  const accounts = useQuery(api.loyalty.listAccounts);
  const settings = useQuery(api.loyalty.getSettings);
  const rewards = useQuery(api.loyalty.listRewards);
  const amplifiers = useQuery(api.loyalty.listAmplifiers);
  const awardPoints = useMutation(api.loyalty.awardPoints);
  const adjustPoints = useMutation(api.loyalty.adjustPoints);
  const redeemPoints = useMutation(api.loyalty.redeemPoints);

  const [adjustDialog, setAdjustDialog] = useState<{
    customerId: Id<"customers">;
    customerName: string;
    currentPoints: number;
  } | null>(null);
  const [adjustPts, setAdjustPts] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustType, setAdjustType] = useState<"add" | "subtract">("add");

  const [redeemDialog, setRedeemDialog] = useState<{
    customerId: Id<"customers">;
    customerName: string;
    currentPoints: number;
  } | null>(null);
  const [selectedRewardId, setSelectedRewardId] = useState("");

  const today = new Date().toISOString().split("T")[0];
  const activeAmps = (amplifiers || []).filter(
    (a) => a.isActive && a.startDate <= today && a.endDate >= today,
  );

  async function handleAdjust() {
    if (!adjustDialog || !adjustPts || !adjustReason) return;
    const pts = parseInt(adjustPts);
    if (isNaN(pts) || pts <= 0) return;
    try {
      await adjustPoints({
        customerId: adjustDialog.customerId,
        points: adjustType === "subtract" ? -pts : pts,
        reason: adjustReason,
      });
      toast.success(`${adjustType === "add" ? "Added" : "Subtracted"} ${pts} points`);
      setAdjustDialog(null);
      setAdjustPts("");
      setAdjustReason("");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleRedeem() {
    if (!redeemDialog || !selectedRewardId) return;
    try {
      const result = await redeemPoints({
        customerId: redeemDialog.customerId,
        rewardId: selectedRewardId as Id<"loyaltyRewards">,
      });
      toast.success("Reward Redeemed! 🎉", { description: `Deducted ${result.pointsDeducted} pts. New balance: ${result.newBalance}` });
      setRedeemDialog(null);
      setSelectedRewardId("");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {(settings as any)?.programName || "Loyalty Program"}
          </h1>
          <p className="text-muted-foreground">
            Manage points, rewards, and promotions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/loyalty/settings">
              <Settings2 className="size-4 mr-1" /> Settings
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Members</p>
                <p className="text-2xl font-bold">{stats?.totalMembers ?? 0}</p>
              </div>
              <Users className="size-8 text-blue-500/40" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Points Outstanding</p>
                <p className="text-2xl font-bold">
                  {stats?.totalPointsOutstanding?.toLocaleString() ?? 0}
                </p>
              </div>
              <Star className="size-8 text-amber-500/40" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Lifetime Earned</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats?.totalLifetimeEarned?.toLocaleString() ?? 0}
                </p>
              </div>
              <TrendingUp className="size-8 text-green-500/40" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Redeemed</p>
                <p className="text-2xl font-bold text-red-500">
                  {stats?.totalLifetimeRedeemed?.toLocaleString() ?? 0}
                </p>
              </div>
              <Gift className="size-8 text-red-500/40" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Amplifiers Banner */}
      {activeAmps.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Rocket className="size-5 text-amber-600" />
                <span className="font-medium">
                  {activeAmps.length} active promo{activeAmps.length > 1 ? "s" : ""}
                </span>
                <div className="flex gap-2">
                  {activeAmps.map((a) => (
                    <Badge key={a._id} variant="secondary" className="bg-amber-100 text-amber-700">
                      {a.name} ({a.amplifierType === "multiplier" ? `${a.multiplier}x` : `+${a.bonusPoints}`})
                    </Badge>
                  ))}
                </div>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/loyalty/amplifiers">Manage</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/loyalty/rewards">
                <Gift className="size-4 mr-2" /> Manage Rewards ({rewards?.filter((r) => r.isActive).length || 0} active)
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/loyalty/amplifiers">
                <Rocket className="size-4 mr-2" /> Manage Amplifiers
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/loyalty/settings">
                <Settings2 className="size-4 mr-2" /> Program Settings
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Top Customers */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="size-5 text-amber-500" />
              Top Loyalty Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!stats?.topCustomers || stats.topCustomers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No loyalty accounts yet. Award points to customers to get started!
              </p>
            ) : (
              <div className="space-y-2">
                {stats.topCustomers.map((c, idx) => (
                  <div
                    key={c._id}
                    className="flex items-center gap-3 py-2 border-b last:border-0"
                  >
                    <span className="text-sm font-bold text-muted-foreground w-5">
                      #{idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {c.customerName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {c.customerEmail}
                      </p>
                    </div>
                    <div className="text-right mr-2">
                      <p className="font-bold text-amber-600">
                        {c.currentPoints.toLocaleString()} pts
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {c.lifetimeEarned.toLocaleString()} lifetime
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() =>
                          setAdjustDialog({
                            customerId: c.customerId,
                            customerName: c.customerName,
                            currentPoints: c.currentPoints,
                          })
                        }
                      >
                        <Plus className="size-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() =>
                          setRedeemDialog({
                            customerId: c.customerId,
                            customerName: c.customerName,
                            currentPoints: c.currentPoints,
                          })
                        }
                      >
                        <Gift className="size-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* All Accounts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Loyalty Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {!accounts || accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No loyalty accounts yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 font-medium">Customer</th>
                    <th className="py-2 font-medium text-right">Balance</th>
                    <th className="py-2 font-medium text-right">Earned</th>
                    <th className="py-2 font-medium text-right">Redeemed</th>
                    <th className="py-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((a) => (
                    <tr key={a._id} className="border-b last:border-0">
                      <td className="py-2">
                        <Link
                          to={`/customers/${a.customerId}`}
                          className="hover:underline"
                        >
                          <p className="font-medium">{a.customerName}</p>
                          <p className="text-xs text-muted-foreground">
                            {a.customerEmail || a.customerPhone || "—"}
                          </p>
                        </Link>
                      </td>
                      <td className="py-2 text-right font-bold text-amber-600">
                        {a.currentPoints.toLocaleString()}
                      </td>
                      <td className="py-2 text-right text-green-600">
                        {a.lifetimeEarned.toLocaleString()}
                      </td>
                      <td className="py-2 text-right text-red-500">
                        {a.lifetimeRedeemed.toLocaleString()}
                      </td>
                      <td className="py-2 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() =>
                              setAdjustDialog({
                                customerId: a.customerId,
                                customerName: a.customerName,
                                currentPoints: a.currentPoints,
                              })
                            }
                          >
                            Adjust
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() =>
                              setRedeemDialog({
                                customerId: a.customerId,
                                customerName: a.customerName,
                                currentPoints: a.currentPoints,
                              })
                            }
                          >
                            Redeem
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Adjust Points Dialog */}
      <Dialog open={!!adjustDialog} onOpenChange={() => setAdjustDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Points — {adjustDialog?.customerName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Current balance: <strong>{adjustDialog?.currentPoints.toLocaleString()}</strong> pts
            </p>
            <div className="flex gap-2">
              <Button
                variant={adjustType === "add" ? "default" : "outline"}
                size="sm"
                onClick={() => setAdjustType("add")}
              >
                <Plus className="size-3 mr-1" /> Add
              </Button>
              <Button
                variant={adjustType === "subtract" ? "default" : "outline"}
                size="sm"
                onClick={() => setAdjustType("subtract")}
              >
                <Minus className="size-3 mr-1" /> Subtract
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Points</Label>
              <Input
                type="number"
                min="1"
                value={adjustPts}
                onChange={(e) => setAdjustPts(e.target.value)}
                placeholder="Enter points"
              />
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="Why are you adjusting?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleAdjust}>
              {adjustType === "add" ? "Add" : "Subtract"} Points
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Redeem Points Dialog */}
      <Dialog open={!!redeemDialog} onOpenChange={() => setRedeemDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redeem Reward — {redeemDialog?.customerName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Current balance: <strong>{redeemDialog?.currentPoints.toLocaleString()}</strong> pts
            </p>
            <div className="space-y-2">
              <Label>Select Reward</Label>
              <Select value={selectedRewardId} onValueChange={setSelectedRewardId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a reward..." />
                </SelectTrigger>
                <SelectContent>
                  {(rewards || [])
                    .filter((r) => r.isActive)
                    .map((r) => (
                      <SelectItem
                        key={r._id}
                        value={r._id}
                        disabled={r.pointsCost > (redeemDialog?.currentPoints || 0)}
                      >
                        {r.name} — {r.pointsCost} pts
                        {r.pointsCost > (redeemDialog?.currentPoints || 0) && " (not enough)"}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRedeemDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleRedeem} disabled={!selectedRewardId}>
              <Gift className="size-4 mr-1" /> Redeem
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
