import { useQuery } from "convex/react";
import { CalendarClock, Rocket, Sparkles, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "../../convex/_generated/api";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function ClientPromosPage() {
  const amplifiers = useQuery(api.loyalty.listAmplifiers);
  const today = new Date().toISOString().split("T")[0];

  const activePromos = (amplifiers || []).filter(
    (a) => a.isActive && a.startDate <= today && a.endDate >= today,
  );
  const upcomingPromos = (amplifiers || []).filter(
    (a) => a.isActive && a.startDate > today,
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Bonus Promos</h1>
        <p className="text-muted-foreground">
          Earn extra points with special promotions
        </p>
      </div>

      {/* Active Promos */}
      {activePromos.length === 0 && upcomingPromos.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Rocket className="size-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">
              No active promotions right now
            </p>
            <p className="text-sm text-muted-foreground">
              Check back soon — ProWorx runs special point boosts regularly!
            </p>
          </CardContent>
        </Card>
      )}

      {activePromos.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Zap className="size-5 text-amber-500" />
            Active Now
          </h2>
          {activePromos.map((promo) => (
            <Card
              key={promo._id}
              className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800"
            >
              <CardContent className="pt-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-lg">{promo.name}</h3>
                    <p className="text-muted-foreground">
                      {promo.description}
                    </p>
                  </div>
                  <Badge className="bg-amber-500 text-white text-lg px-3 py-1">
                    {promo.amplifierType === "multiplier"
                      ? `${promo.multiplier}×`
                      : `+${promo.bonusPoints}`}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  {/* Type badge */}
                  <Badge variant="outline" className="gap-1">
                    <Sparkles className="size-3" />
                    {promo.amplifierType === "multiplier"
                      ? `${promo.multiplier}x Points Multiplier`
                      : `+${promo.bonusPoints} Bonus Points`}
                  </Badge>

                  {/* Days */}
                  {promo.daysOfWeek && promo.daysOfWeek.length > 0 && promo.daysOfWeek.length < 7 && (
                    <Badge variant="outline" className="gap-1">
                      <CalendarClock className="size-3" />
                      {promo.daysOfWeek.map((d) => DAYS[d]).join(", ")}
                    </Badge>
                  )}

                  {/* Service category */}
                  {promo.serviceCategories && promo.serviceCategories.length > 0 && (
                    <Badge variant="outline" className="gap-1">
                      {promo.serviceCategories.join(", ")}
                    </Badge>
                  )}

                  {/* Min spend */}
                  {promo.minSpendCents && promo.minSpendCents > 0 && (
                    <Badge variant="outline">
                      Min ${(promo.minSpendCents / 100).toFixed(0)} spend
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-muted-foreground mt-3">
                  Ends{" "}
                  {new Date(promo.endDate + "T12:00:00").toLocaleDateString(
                    "en-US",
                    { weekday: "long", month: "long", day: "numeric", year: "numeric" },
                  )}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upcoming Promos */}
      {upcomingPromos.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CalendarClock className="size-5 text-blue-500" />
            Coming Soon
          </h2>
          {upcomingPromos.map((promo) => (
            <Card key={promo._id} className="opacity-80">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{promo.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {promo.description}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-base px-3 py-1">
                    {promo.amplifierType === "multiplier"
                      ? `${promo.multiplier}×`
                      : `+${promo.bonusPoints}`}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Starts{" "}
                  {new Date(promo.startDate + "T12:00:00").toLocaleDateString(
                    "en-US",
                    { weekday: "long", month: "long", day: "numeric" },
                  )}{" "}
                  · Ends{" "}
                  {new Date(promo.endDate + "T12:00:00").toLocaleDateString(
                    "en-US",
                    { month: "long", day: "numeric" },
                  )}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
