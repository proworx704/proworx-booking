import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";

export function LoyaltySettingsPage() {
  const settings = useQuery(api.loyalty.getSettings);
  const updateSettings = useMutation(api.loyalty.updateSettings);
  const expirePoints = useMutation(api.loyalty.expirePoints);

  const [form, setForm] = useState({
    programName: "ProWorx Rewards",
    pointsPerDollar: "1",
    isEnabled: true,
    expirationEnabled: false,
    expirationDays: "365",
    expirationWarningDays: "30",
    minSpendForPoints: "0",
    roundingMode: "floor",
    minPointsToRedeem: "0",
    maxRedemptionPercent: "100",
    allowPartialRedemption: false,
    clientPortalEnabled: true,
    showPointsOnBooking: true,
  });

  useEffect(() => {
    if (settings) {
      setForm({
        programName: (settings as any).programName || "ProWorx Rewards",
        pointsPerDollar: String((settings as any).pointsPerDollar ?? 1),
        isEnabled: (settings as any).isEnabled ?? true,
        expirationEnabled: (settings as any).expirationEnabled ?? false,
        expirationDays: String((settings as any).expirationDays ?? 365),
        expirationWarningDays: String((settings as any).expirationWarningDays ?? 30),
        minSpendForPoints: String(((settings as any).minSpendForPoints ?? 0) / 100),
        roundingMode: (settings as any).roundingMode ?? "floor",
        minPointsToRedeem: String((settings as any).minPointsToRedeem ?? 0),
        maxRedemptionPercent: String((settings as any).maxRedemptionPercent ?? 100),
        allowPartialRedemption: (settings as any).allowPartialRedemption ?? false,
        clientPortalEnabled: (settings as any).clientPortalEnabled ?? true,
        showPointsOnBooking: (settings as any).showPointsOnBooking ?? true,
      });
    }
  }, [settings]);

  async function handleSave() {
    try {
      await updateSettings({
        programName: form.programName,
        pointsPerDollar: parseFloat(form.pointsPerDollar) || 1,
        isEnabled: form.isEnabled,
        expirationEnabled: form.expirationEnabled,
        expirationDays: parseInt(form.expirationDays) || 365,
        expirationWarningDays: parseInt(form.expirationWarningDays) || 30,
        minSpendForPoints: Math.round((parseFloat(form.minSpendForPoints) || 0) * 100),
        roundingMode: form.roundingMode,
        minPointsToRedeem: parseInt(form.minPointsToRedeem) || 0,
        maxRedemptionPercent: parseInt(form.maxRedemptionPercent) || 100,
        allowPartialRedemption: form.allowPartialRedemption,
        clientPortalEnabled: form.clientPortalEnabled,
        showPointsOnBooking: form.showPointsOnBooking,
      });
      toast.success("Settings saved! ✅");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleRunExpiration() {
    try {
      const result = await expirePoints({});
      toast.success("Expiration processed", { description: `${(result as any).expired} points expired` });
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/loyalty">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Loyalty Settings</h1>
          <p className="text-muted-foreground">
            Configure every aspect of your rewards program
          </p>
        </div>
      </div>

      {/* General */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Program Enabled</Label>
              <p className="text-sm text-muted-foreground">
                Master on/off switch for the entire loyalty program
              </p>
            </div>
            <Switch
              checked={form.isEnabled}
              onCheckedChange={(v) => setForm({ ...form, isEnabled: v })}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Program Name</Label>
              <Input
                value={form.programName}
                onChange={(e) => setForm({ ...form, programName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Points Per Dollar</Label>
              <Input
                type="number"
                min="0.1"
                step="0.5"
                value={form.pointsPerDollar}
                onChange={(e) => setForm({ ...form, pointsPerDollar: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                1 = earn 1 point per $1 spent, 2 = 2 pts/$1
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Earning Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Earning Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Min Spend to Earn Points ($)</Label>
              <Input
                type="number"
                min="0"
                value={form.minSpendForPoints}
                onChange={(e) => setForm({ ...form, minSpendForPoints: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                0 = earn on any purchase
              </p>
            </div>
            <div className="space-y-2">
              <Label>Rounding Mode</Label>
              <Select
                value={form.roundingMode}
                onValueChange={(v) => setForm({ ...form, roundingMode: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="floor">Round Down (floor)</SelectItem>
                  <SelectItem value="round">Nearest (round)</SelectItem>
                  <SelectItem value="ceil">Round Up (ceil)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                How to round fractional points (e.g. $7.50 at 1pt/$ = 7 or 8?)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Point Expiration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Point Expiration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Enable Point Expiration</Label>
              <p className="text-sm text-muted-foreground">
                Points will expire after a set number of days
              </p>
            </div>
            <Switch
              checked={form.expirationEnabled}
              onCheckedChange={(v) => setForm({ ...form, expirationEnabled: v })}
            />
          </div>

          {form.expirationEnabled && (
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Expiration Period (days)</Label>
                  <Input
                    type="number"
                    min="30"
                    value={form.expirationDays}
                    onChange={(e) => setForm({ ...form, expirationDays: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Points expire this many days after being earned
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Warning Period (days before)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={form.expirationWarningDays}
                    onChange={(e) =>
                      setForm({ ...form, expirationWarningDays: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Notify clients this many days before expiration
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleRunExpiration}>
                Run Expiration Now
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Redemption Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Redemption Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Min Points to Redeem</Label>
              <Input
                type="number"
                min="0"
                value={form.minPointsToRedeem}
                onChange={(e) => setForm({ ...form, minPointsToRedeem: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Client needs at least this many points to redeem anything
              </p>
            </div>
            <div className="space-y-2">
              <Label>Max Redemption %</Label>
              <Input
                type="number"
                min="1"
                max="100"
                value={form.maxRedemptionPercent}
                onChange={(e) => setForm({ ...form, maxRedemptionPercent: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Max % of a booking that can be covered by rewards (100 = full)
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Allow Partial Redemption</Label>
              <p className="text-sm text-muted-foreground">
                Can clients use fewer points than reward cost?
              </p>
            </div>
            <Switch
              checked={form.allowPartialRedemption}
              onCheckedChange={(v) => setForm({ ...form, allowPartialRedemption: v })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Client Portal */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Client Portal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Client Self-Service Portal</Label>
              <p className="text-sm text-muted-foreground">
                Allow clients to log in, view points, and browse rewards
              </p>
            </div>
            <Switch
              checked={form.clientPortalEnabled}
              onCheckedChange={(v) => setForm({ ...form, clientPortalEnabled: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Show Points on Booking</Label>
              <p className="text-sm text-muted-foreground">
                Display estimated points earned on booking confirmation
              </p>
            </div>
            <Switch
              checked={form.showPointsOnBooking}
              onCheckedChange={(v) => setForm({ ...form, showPointsOnBooking: v })}
            />
          </div>
          <div className="bg-muted rounded-lg p-3 text-sm">
            <p className="font-medium mb-1">Client Portal URL</p>
            <code className="text-xs bg-background px-2 py-1 rounded">
              book.proworxdetailing.com/rewards/login
            </code>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end pb-8">
        <Button size="lg" onClick={handleSave}>
          <Save className="size-4 mr-2" /> Save All Settings
        </Button>
      </div>
    </div>
  );
}
