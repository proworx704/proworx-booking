import { useQuery } from "convex/react";
import {
  ArrowRight,
  CalendarCheck,
  CalendarPlus,
  Gift,
  Rocket,
  Star,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { api } from "../../convex/_generated/api";

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function ClientDashboardPage() {
  const account = useQuery(api.loyalty.getMyAccount);
  const transactions = useQuery(api.loyalty.getMyTransactions);
  const bookings = useQuery(api.loyalty.getMyBookings);
  const rewards = useQuery(api.loyalty.listRewards);
  const amplifiers = useQuery(api.loyalty.listAmplifiers);
  const profile = useQuery(api.loyalty.getMyProfile);

  const activeRewards = rewards?.filter((r) => r.isActive) || [];
  const today = new Date().toISOString().split("T")[0];
  const activePromos =
    amplifiers?.filter(
      (a) => a.isActive && a.startDate <= today && a.endDate >= today,
    ) || [];

  // Find the next reward they can redeem
  const nextReward = activeRewards
    .sort((a, b) => a.pointsCost - b.pointsCost)
    .find((r) => r.pointsCost > (account?.currentPoints || 0));

  const progressToNext = nextReward
    ? Math.min(
        100,
        ((account?.currentPoints || 0) / nextReward.pointsCost) * 100,
      )
    : 100;

  const recentTxns = (transactions || []).slice(0, 5);
  const upcomingBookings = (bookings || []).filter(
    (b) => b.date >= today && b.status !== "cancelled",
  );

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold">
          Welcome back, {profile?.name?.split(" ")[0] || "there"}! 👋
        </h1>
        <p className="text-muted-foreground">
          Here's your ProWorx Rewards overview
        </p>
      </div>

      {/* Book Now CTA */}
      <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0">
        <CardContent className="pt-6 pb-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <CalendarPlus className="size-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Ready for your next detail?</h3>
                <p className="text-blue-100 text-sm">
                  Book online in minutes — your info is already saved.
                </p>
              </div>
            </div>
            <Button
              asChild
              size="lg"
              className="bg-white text-blue-700 hover:bg-blue-50 shrink-0 font-semibold"
            >
              <Link to="/rewards/book">
                Book Now
                <ArrowRight className="size-4 ml-1" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Points Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white border-0">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm font-medium">
                  Available Points
                </p>
                <p className="text-4xl font-bold mt-1">
                  {account?.currentPoints?.toLocaleString() || "0"}
                </p>
              </div>
              <Star className="size-12 text-amber-200/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Lifetime Earned
                </p>
                <p className="text-3xl font-bold mt-1">
                  {account?.lifetimeEarned?.toLocaleString() || "0"}
                </p>
              </div>
              <TrendingUp className="size-10 text-green-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Total Bookings
                </p>
                <p className="text-3xl font-bold mt-1">
                  {bookings?.length || 0}
                </p>
              </div>
              <CalendarCheck className="size-10 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress to Next Reward */}
      {nextReward && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">
                Next Reward: {nextReward.name}
              </p>
              <span className="text-sm text-muted-foreground">
                {account?.currentPoints || 0} / {nextReward.pointsCost} pts
              </span>
            </div>
            <Progress value={progressToNext} className="h-3" />
            <p className="text-xs text-muted-foreground mt-2">
              {nextReward.pointsCost - (account?.currentPoints || 0)} more
              points to go!
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active Promos */}
        {activePromos.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Rocket className="size-5 text-amber-600" />
                Active Bonus Promos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activePromos.map((promo) => (
                  <div
                    key={promo._id}
                    className="p-3 rounded-lg bg-white dark:bg-background border"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{promo.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {promo.description}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                      >
                        {promo.amplifierType === "multiplier"
                          ? `${promo.multiplier}x Points`
                          : `+${promo.bonusPoints} Bonus`}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Ends{" "}
                      {new Date(promo.endDate + "T12:00:00").toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric" },
                      )}
                    </p>
                  </div>
                ))}
              </div>
              <Button
                variant="link"
                className="px-0 mt-2"
                asChild
              >
                <Link to="/rewards/promos">
                  View all promos <ArrowRight className="size-4 ml-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Recent Points Activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="size-5 text-amber-500" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentTxns.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No activity yet. Book a detail to start earning!
              </p>
            ) : (
              <div className="space-y-2">
                {recentTxns.map((txn) => (
                  <div
                    key={txn._id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">{txn.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(txn._creationTime).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}
                      </p>
                    </div>
                    <span
                      className={`font-bold text-sm ${
                        txn.points > 0
                          ? "text-green-600"
                          : "text-red-500"
                      }`}
                    >
                      {txn.points > 0 ? "+" : ""}
                      {txn.points}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <Button
              variant="link"
              className="px-0 mt-2"
              asChild
            >
              <Link to="/rewards/points">
                View all activity <ArrowRight className="size-4 ml-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Upcoming Bookings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarCheck className="size-5 text-blue-500" />
              Upcoming Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingBookings.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-3">
                  No upcoming bookings
                </p>
                <Button size="sm" asChild>
                  <Link to="/rewards/book">Book Now</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingBookings.slice(0, 3).map((b) => (
                  <div
                    key={b._id}
                    className="p-3 rounded-lg border text-sm"
                  >
                    <div className="flex justify-between">
                      <p className="font-medium">{b.serviceName}</p>
                      <p className="text-muted-foreground">
                        {formatPrice(b.totalPrice || b.price)}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(b.date + "T12:00:00").toLocaleDateString(
                        "en-US",
                        {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        },
                      )}{" "}
                      at {b.time}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <Button
              variant="link"
              className="px-0 mt-2"
              asChild
            >
              <Link to="/rewards/bookings">
                View all bookings <ArrowRight className="size-4 ml-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Available Rewards */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Gift className="size-5 text-purple-500" />
              Available Rewards
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeRewards.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Rewards coming soon!
              </p>
            ) : (
              <div className="space-y-2">
                {activeRewards.slice(0, 3).map((r) => {
                  const canRedeem =
                    (account?.currentPoints || 0) >= r.pointsCost;
                  return (
                    <div
                      key={r._id}
                      className={`p-3 rounded-lg border text-sm ${
                        canRedeem
                          ? "border-green-200 bg-green-50/50 dark:bg-green-950/20"
                          : ""
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <p className="font-medium">
                          {r.icon ? `${r.icon} ` : ""}
                          {r.name}
                        </p>
                        <Badge variant={canRedeem ? "default" : "secondary"}>
                          {r.pointsCost} pts
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <Button
              variant="link"
              className="px-0 mt-2"
              asChild
            >
              <Link to="/rewards/redeem">
                View all rewards <ArrowRight className="size-4 ml-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
