import { useAction, useMutation, useQuery } from "convex/react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  DollarSign,
  ExternalLink,
  Eye,
  Megaphone,
  MousePointerClick,
  Percent,
  Plus,
  RefreshCw,
  Target,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function fmt(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtPrecise(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const SOURCE_COLORS: Record<string, string> = {
  google_ads: "bg-blue-500",
  google_local: "bg-green-500",
  facebook_ads: "bg-indigo-500",
  instagram_ads: "bg-pink-500",
  google_organic: "bg-emerald-500",
  yelp: "bg-red-500",
  referral: "bg-amber-500",
  direct: "bg-gray-400",
  other: "bg-gray-300",
};

const SOURCE_LABELS: Record<string, string> = {
  google_ads: "Google Ads",
  google_local: "Google Local",
  facebook_ads: "Facebook Ads",
  instagram_ads: "Instagram Ads",
  google_organic: "Google Organic",
  yelp: "Yelp",
  referral: "Referral",
  direct: "Direct",
  other: "Other",
};

const AD_CHANNELS = [
  { value: "google_ads", label: "Google Ads" },
  { value: "google_local", label: "Google Local Services" },
  { value: "facebook_ads", label: "Facebook Ads" },
  { value: "instagram_ads", label: "Instagram Ads" },
  { value: "yelp", label: "Yelp" },
  { value: "other", label: "Other" },
] as const;

function getCurrentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getDateRange(period: string): { startDate: string; endDate: string } {
  const now = new Date();
  let start: Date;
  const end = now;

  switch (period) {
    case "this_month":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "last_month":
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end.setDate(0); // last day of prev month
      break;
    case "last_90":
      start = new Date(now);
      start.setDate(start.getDate() - 90);
      break;
    case "this_year":
      start = new Date(now.getFullYear(), 0, 1);
      break;
    case "all_time":
    default:
      start = new Date(2020, 0, 1);
      break;
  }

  const formatDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  return { startDate: formatDate(start), endDate: formatDate(end) };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════

export function MarketingPage() {
  const [period, setPeriod] = useState("this_month");
  const { startDate, endDate } = useMemo(() => getDateRange(period), [period]);

  const overview = useQuery(api.marketing.attributionOverview, { startDate, endDate });
  const roi = useQuery(api.marketing.roiByChannel, { startDate, endDate });
  const recentBookings = useQuery(api.marketing.recentAttributedBookings, { limit: 15 });
  const campaigns = useQuery(api.marketing.campaignBreakdown, { startDate, endDate });
  const adSpend = useQuery(api.marketing.listAdSpend, {});

  // Live ad performance data (synced from Google Ads & Meta)
  const livePerformance = useQuery(api.adSync.liveCampaignPerformance, { startDate, endDate });
  const dailyTrend = useQuery(api.adSync.dailyAdTrend, { startDate, endDate });
  const connectionStatus = useQuery(api.adSync.getConnectionStatus, {});

  const [syncing, setSyncing] = useState(false);
  const syncAllAction = useAction(api.adSync.syncAll);

  async function handleSync() {
    setSyncing(true);
    try {
      const result = await syncAllAction({ startDate, endDate });
      if (result.success) {
        toast.success("Ad data synced successfully!");
      } else {
        toast.error(result.error || "Sync failed");
      }
    } catch (e: any) {
      toast.error(e.message || "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  const [showSpendForm, setShowSpendForm] = useState(false);
  const [spendChannel, setSpendChannel] = useState<string>("google_ads");
  const [spendMonth, setSpendMonth] = useState(getCurrentMonth());
  const [spendAmount, setSpendAmount] = useState("");
  const [spendNotes, setSpendNotes] = useState("");

  const upsertSpend = useMutation(api.marketing.upsertAdSpend);
  const deleteSpend = useMutation(api.marketing.deleteAdSpend);

  async function handleSaveSpend() {
    const amountCents = Math.round(parseFloat(spendAmount) * 100);
    if (isNaN(amountCents) || amountCents <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    try {
      await upsertSpend({
        channel: spendChannel as any,
        month: spendMonth,
        spend: amountCents,
        notes: spendNotes || undefined,
      });
      toast.success("Ad spend saved");
      setSpendAmount("");
      setSpendNotes("");
      setShowSpendForm(false);
    } catch (e) {
      toast.error("Failed to save");
    }
  }

  // ─── Summary metrics from overview ────
  const totalBookings = overview?.totalBookings ?? 0;
  const totalRevenue = overview?.totalRevenue ?? 0;
  const attributedBookings = overview?.sources
    .filter((s) => s.source !== "direct" && s.source !== "untagged")
    .reduce((sum, s) => sum + s.totalBookings, 0) ?? 0;
  const attributedRevenue = overview?.sources
    .filter((s) => s.source !== "direct" && s.source !== "untagged")
    .reduce((sum, s) => sum + s.totalRevenue, 0) ?? 0;
  const totalAdSpend = roi?.reduce((sum, r) => sum + r.spend, 0) ?? 0;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" />
            Marketing Attribution
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track where your bookings come from and measure ad ROI
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="last_90">Last 90 Days</SelectItem>
              <SelectItem value="this_year">This Year</SelectItem>
              <SelectItem value="all_time">All Time</SelectItem>
            </SelectContent>
          </Select>
          {(connectionStatus?.googleAds.configured || connectionStatus?.metaAds.configured) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={syncing}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing..." : "Sync Ads"}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setShowSpendForm(!showSpendForm)}>
            <Plus className="h-4 w-4 mr-1" />
            Log Ad Spend
          </Button>
        </div>
      </div>

      {/* ─── Connection Status ─────────────────────────────────── */}
      {connectionStatus && (!connectionStatus.googleAds.configured || !connectionStatus.metaAds.configured) && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-start gap-3">
              <Activity className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-200">Ad Platform Connections</p>
                <div className="flex flex-wrap gap-3 mt-1.5">
                  <span className={`flex items-center gap-1.5 ${connectionStatus.googleAds.configured ? "text-green-700" : "text-muted-foreground"}`}>
                    <span className={`w-2 h-2 rounded-full ${connectionStatus.googleAds.configured ? "bg-green-500" : "bg-gray-300"}`} />
                    Google Ads {connectionStatus.googleAds.configured ? "Connected" : "Not connected"}
                  </span>
                  <span className={`flex items-center gap-1.5 ${connectionStatus.metaAds.configured ? "text-green-700" : "text-muted-foreground"}`}>
                    <span className={`w-2 h-2 rounded-full ${connectionStatus.metaAds.configured ? "bg-green-500" : "bg-gray-300"}`} />
                    Meta Ads {connectionStatus.metaAds.configured ? "Connected" : "Not connected"}
                  </span>
                </div>
                {(!connectionStatus.googleAds.configured || !connectionStatus.metaAds.configured) && (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Go to <strong>Settings → Ad Integrations</strong> to connect your ad accounts for live data.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Ad Spend Form ───────────────────────────────────── */}
      {showSpendForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Log Monthly Ad Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
              <div>
                <Label className="text-xs">Channel</Label>
                <Select value={spendChannel} onValueChange={setSpendChannel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AD_CHANNELS.map((ch) => (
                      <SelectItem key={ch.value} value={ch.value}>{ch.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Month</Label>
                <Input type="month" value={spendMonth} onChange={(e) => setSpendMonth(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Amount ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="250.00"
                  value={spendAmount}
                  onChange={(e) => setSpendAmount(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Notes</Label>
                <Input placeholder="Optional" value={spendNotes} onChange={(e) => setSpendNotes(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveSpend} className="flex-1">Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowSpendForm(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Summary Cards ───────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Bookings</p>
                <p className="text-2xl font-bold">{totalBookings}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Ad-Attributed</p>
                <p className="text-2xl font-bold">{attributedBookings}</p>
                <p className="text-xs text-muted-foreground">
                  {totalBookings > 0 ? `${Math.round((attributedBookings / totalBookings) * 100)}%` : "0%"} of total
                </p>
              </div>
              <Target className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Ad Revenue</p>
                <p className="text-2xl font-bold">{fmt(attributedRevenue)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Ad Spend</p>
                <p className="text-2xl font-bold">{fmt(totalAdSpend)}</p>
                {totalAdSpend > 0 && attributedRevenue > 0 && (
                  <p className="text-xs text-green-600 font-medium">
                    {Math.round(((attributedRevenue - totalAdSpend) / totalAdSpend) * 100)}% ROI
                  </p>
                )}
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Live Ad Performance (Google Ads & Meta) ──────────── */}
      {livePerformance && (livePerformance.campaigns.length > 0 || livePerformance.totals.totalSpend > 0) && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Live Ad Performance
                </CardTitle>
                <CardDescription>
                  Real-time data from Google Ads &amp; Meta Ads APIs
                  {livePerformance.lastSync && (
                    <span className="ml-2 text-xs">
                      · Synced {new Date(livePerformance.lastSync).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </span>
                  )}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Totals row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-background rounded-lg p-3 border">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-3 w-3" /> Total Ad Spend
                </p>
                <p className="text-xl font-bold">{fmt(livePerformance.totals.totalSpend)}</p>
                <p className="text-xs text-muted-foreground">{livePerformance.daysOfData} days</p>
              </div>
              <div className="bg-background rounded-lg p-3 border">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MousePointerClick className="h-3 w-3" /> Clicks
                </p>
                <p className="text-xl font-bold">{livePerformance.totals.totalClicks.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">
                  {livePerformance.totals.totalImpressions.toLocaleString()} impressions
                </p>
              </div>
              <div className="bg-background rounded-lg p-3 border">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Target className="h-3 w-3" /> Leads/Conversions
                </p>
                <p className="text-xl font-bold">{livePerformance.totals.totalConversions}</p>
                <p className="text-xs text-muted-foreground">
                  {livePerformance.totals.totalClicks > 0
                    ? `${((livePerformance.totals.totalConversions / livePerformance.totals.totalClicks) * 100).toFixed(1)}% conv. rate`
                    : "—"}
                </p>
              </div>
              <div className="bg-background rounded-lg p-3 border">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-3 w-3" /> Cost per Lead
                </p>
                <p className="text-xl font-bold">
                  {livePerformance.totals.totalConversions > 0
                    ? fmtPrecise(Math.round(livePerformance.totals.totalSpend / livePerformance.totals.totalConversions))
                    : "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {livePerformance.totals.totalClicks > 0
                    ? `${fmtPrecise(Math.round(livePerformance.totals.totalSpend / livePerformance.totals.totalClicks))} avg CPC`
                    : "—"}
                </p>
              </div>
            </div>

            {/* Campaign breakdown table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Campaign</th>
                    <th className="pb-2 font-medium text-center">Status</th>
                    <th className="pb-2 font-medium text-right">Spend</th>
                    <th className="pb-2 font-medium text-right">Clicks</th>
                    <th className="pb-2 font-medium text-right">Impressions</th>
                    <th className="pb-2 font-medium text-center">CTR</th>
                    <th className="pb-2 font-medium text-right">Leads</th>
                    <th className="pb-2 font-medium text-right">Cost/Lead</th>
                    <th className="pb-2 font-medium text-right">Avg CPC</th>
                  </tr>
                </thead>
                <tbody>
                  {livePerformance.campaigns.map((c) => (
                    <tr key={c.campaignId} className="border-b last:border-0">
                      <td className="py-2.5">
                        <div>
                          <span className="font-medium text-sm">
                            {c.campaignName.replace(/Campaign:SystemGenerated:\w+/, "Campaign (LSA)")}
                          </span>
                          <p className="text-xs text-muted-foreground capitalize">
                            {c.platform === "google_ads" ? "Google Ads" : "Meta Ads"}
                            {c.days > 0 && ` · ${c.days} days`}
                          </p>
                        </div>
                      </td>
                      <td className="py-2.5 text-center">
                        <Badge
                          variant={c.campaignStatus === "ENABLED" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {c.campaignStatus === "ENABLED" ? "Active" : c.campaignStatus.toLowerCase()}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-right font-medium">{fmt(c.cost)}</td>
                      <td className="py-2.5 text-right">{c.clicks.toLocaleString()}</td>
                      <td className="py-2.5 text-right text-muted-foreground">{c.impressions.toLocaleString()}</td>
                      <td className="py-2.5 text-center">
                        <Badge variant="outline" className="text-xs">
                          {(c.ctr * 100).toFixed(1)}%
                        </Badge>
                      </td>
                      <td className="py-2.5 text-right font-medium">{c.conversions}</td>
                      <td className="py-2.5 text-right">
                        {c.costPerConversion > 0 ? fmtPrecise(c.costPerConversion) : "—"}
                      </td>
                      <td className="py-2.5 text-right text-muted-foreground">
                        {c.avgCpc > 0 ? fmtPrecise(c.avgCpc) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Daily spend mini chart */}
            {dailyTrend && dailyTrend.length > 1 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium">Daily Ad Spend</p>
                <div className="flex items-end gap-[2px] h-16">
                  {(() => {
                    const maxSpend = Math.max(...dailyTrend.map((d) => d.spend), 1);
                    return dailyTrend.map((d) => (
                      <div
                        key={d.date}
                        className="flex-1 bg-primary/70 hover:bg-primary rounded-t transition-colors cursor-default group relative"
                        style={{ height: `${Math.max((d.spend / maxSpend) * 100, 2)}%` }}
                        title={`${d.date}: ${fmtPrecise(d.spend)} · ${d.clicks} clicks · ${d.conversions} leads`}
                      />
                    ));
                  })()}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{dailyTrend[0]?.date.slice(5)}</span>
                  <span>{dailyTrend[dailyTrend.length - 1]?.date.slice(5)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── ROI by Channel ──────────────────────────────────── */}
      {roi && roi.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Channel Performance & ROI
            </CardTitle>
            <CardDescription>Close rate, revenue, and cost per booking</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Channel</th>
                    <th className="pb-2 font-medium text-center">Bookings</th>
                    <th className="pb-2 font-medium text-center">Completed</th>
                    <th className="pb-2 font-medium text-center">Close Rate</th>
                    <th className="pb-2 font-medium text-right">Revenue</th>
                    <th className="pb-2 font-medium text-right">Ad Spend</th>
                    <th className="pb-2 font-medium text-right">Cost/Booking</th>
                    <th className="pb-2 font-medium text-right">ROI</th>
                  </tr>
                </thead>
                <tbody>
                  {roi.map((r) => (
                    <tr key={r.channel} className="border-b last:border-0">
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${SOURCE_COLORS[r.channel] || "bg-gray-300"}`} />
                          <span className="font-medium">{r.label}</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-center">{r.totalBookings}</td>
                      <td className="py-2.5 text-center">{r.completedBookings}</td>
                      <td className="py-2.5 text-center">
                        <Badge variant={r.closeRate >= 70 ? "default" : r.closeRate >= 40 ? "secondary" : "outline"}>
                          {r.closeRate}%
                        </Badge>
                      </td>
                      <td className="py-2.5 text-right font-medium">{fmt(r.revenue)}</td>
                      <td className="py-2.5 text-right text-muted-foreground">{r.spend > 0 ? fmt(r.spend) : "—"}</td>
                      <td className="py-2.5 text-right text-muted-foreground">{r.costPerBooking > 0 ? fmtPrecise(r.costPerBooking) : "—"}</td>
                      <td className="py-2.5 text-right">
                        {r.spend > 0 ? (
                          <span className={r.roiPercent >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                            {r.roiPercent >= 0 ? "+" : ""}{r.roiPercent}%
                          </span>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Bookings by Source ───────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Bookings by Source
          </CardTitle>
          <CardDescription>Where your customers are coming from</CardDescription>
        </CardHeader>
        <CardContent>
          {overview ? (
            <div className="space-y-3">
              {overview.sources.map((s) => {
                const pct = totalBookings > 0 ? (s.totalBookings / totalBookings) * 100 : 0;
                const closeRate = s.totalBookings > 0
                  ? Math.round((s.completedBookings / s.totalBookings) * 100)
                  : 0;
                return (
                  <div key={s.source} className="flex items-center gap-3">
                    <span className={`w-3 h-3 rounded-full shrink-0 ${SOURCE_COLORS[s.source] || "bg-gray-300"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{s.label}</span>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{s.totalBookings} bookings</span>
                          <span>{fmt(s.totalRevenue)}</span>
                          <Badge variant="outline" className="text-xs">
                            {closeRate}% close
                          </Badge>
                        </div>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${SOURCE_COLORS[s.source] || "bg-gray-300"}`}
                          style={{ width: `${Math.max(pct, 1)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
              {overview.sources.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No bookings in this period
                </p>
              )}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">Loading...</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ─── Campaign Breakdown ─────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Campaign Breakdown</CardTitle>
            <CardDescription>Performance by UTM campaign tag</CardDescription>
          </CardHeader>
          <CardContent>
            {campaigns && campaigns.length > 0 ? (
              <div className="space-y-2">
                {campaigns.map((c, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{c.campaign}</p>
                      <p className="text-xs text-muted-foreground">{c.source} / {c.medium || "—"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{c.bookings} bookings</p>
                      <p className="text-xs text-muted-foreground">{fmt(c.revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8 text-sm">
                No campaign data yet. Add <code>utm_campaign</code> to your ad URLs to see campaign-level data.
              </p>
            )}
          </CardContent>
        </Card>

        {/* ─── Ad Spend History ────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Ad Spend Log
            </CardTitle>
            <CardDescription>Monthly advertising spend by channel</CardDescription>
          </CardHeader>
          <CardContent>
            {adSpend && adSpend.length > 0 ? (
              <div className="space-y-2">
                {adSpend.map((entry) => (
                  <div key={entry._id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${SOURCE_COLORS[entry.channel] || "bg-gray-300"}`} />
                      <div>
                        <p className="text-sm font-medium">{SOURCE_LABELS[entry.channel] || entry.channel}</p>
                        <p className="text-xs text-muted-foreground">{entry.month}{entry.notes ? ` · ${entry.notes}` : ""}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{fmtPrecise(entry.spend)}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={async () => {
                          await deleteSpend({ id: entry._id });
                          toast.success("Deleted");
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8 text-sm">
                No ad spend logged yet. Click &quot;Log Ad Spend&quot; above to track your monthly ad costs.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Recent Attributed Bookings ──────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" />
            Recent Ad-Attributed Bookings
          </CardTitle>
          <CardDescription>Bookings that came from advertising channels</CardDescription>
        </CardHeader>
        <CardContent>
          {recentBookings && recentBookings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Customer</th>
                    <th className="pb-2 font-medium">Service</th>
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Source</th>
                    <th className="pb-2 font-medium">Campaign</th>
                    <th className="pb-2 font-medium text-right">Revenue</th>
                    <th className="pb-2 font-medium text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBookings.map((b) => (
                    <tr key={b._id} className="border-b last:border-0">
                      <td className="py-2">{b.customerName}</td>
                      <td className="py-2 text-muted-foreground">{b.serviceName}</td>
                      <td className="py-2 text-muted-foreground">{b.date}</td>
                      <td className="py-2">
                        <Badge variant="outline" className="text-xs">
                          {b.leadSourceLabel}
                        </Badge>
                      </td>
                      <td className="py-2 text-xs text-muted-foreground">{b.utmCampaign || "—"}</td>
                      <td className="py-2 text-right font-medium">{fmt(b.price || 0)}</td>
                      <td className="py-2 text-center">
                        <Badge
                          variant={b.status === "completed" ? "default" : b.status === "cancelled" ? "destructive" : "secondary"}
                          className="text-xs"
                        >
                          {b.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8 text-sm">
              No ad-attributed bookings yet. Once customers book from your ad links, they&apos;ll show up here.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ─── UTM Link Generator Guide ────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ExternalLink className="h-4 w-4" />
            How to Track Your Ads
          </CardTitle>
          <CardDescription>
            Add these parameters to your booking URLs in your ad campaigns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="bg-muted p-3 rounded-lg font-mono text-xs break-all">
              <p className="font-semibold text-foreground mb-2">Google Ads:</p>
              <p>book.proworxdetailing.com/book?utm_source=google&utm_medium=cpc&utm_campaign=YOUR_CAMPAIGN</p>
            </div>
            <div className="bg-muted p-3 rounded-lg font-mono text-xs break-all">
              <p className="font-semibold text-foreground mb-2">Google Local Services:</p>
              <p>book.proworxdetailing.com/book?utm_source=google&utm_medium=local&utm_campaign=local_services</p>
            </div>
            <div className="bg-muted p-3 rounded-lg font-mono text-xs break-all">
              <p className="font-semibold text-foreground mb-2">Facebook Ads:</p>
              <p>book.proworxdetailing.com/book?utm_source=facebook&utm_medium=cpc&utm_campaign=YOUR_CAMPAIGN</p>
            </div>
            <div className="bg-muted p-3 rounded-lg font-mono text-xs break-all">
              <p className="font-semibold text-foreground mb-2">Instagram Ads:</p>
              <p>book.proworxdetailing.com/book?utm_source=instagram&utm_medium=cpc&utm_campaign=YOUR_CAMPAIGN</p>
            </div>
            <p className="text-muted-foreground">
              <strong>Tip:</strong> Replace <code>YOUR_CAMPAIGN</code> with a descriptive name
              (e.g., <code>spring_special_2026</code>). The system will automatically detect the
              ad source and track the booking.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
