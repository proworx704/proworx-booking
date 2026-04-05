import { useQuery } from "convex/react";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BUSINESS_PHONE } from "@/lib/constants";
import { api } from "../../convex/_generated/api";

function formatPrice(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: cents % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`;
}

// Feature bullets per tier
const TIER_FEATURES: Record<string, string[]> = {
  "membership-exterior-only": [
    "Monthly exterior hand wash",
    "Tire & wheel clean",
    "Exterior window cleaning",
    "Door jamb wipe-down",
    "Tire shine & dressing",
  ],
  "membership-interior-only": [
    "Monthly interior detail",
    "Full vacuum & wipe-down",
    "Dashboard & console detail",
    "Leather / vinyl conditioning",
    "Interior windows",
    "Air freshener",
  ],
  "membership-full-inside-out": [
    "Full inside & out detail",
    "Everything in Exterior + Interior",
    "Ceramic wet-coat protection",
    "Paint sealant refresh",
    "Tire shine & trim dressing",
    "Priority scheduling",
  ],
  "membership-ceramic-maintenance": [
    "Full inside & out detail",
    "Everything in Full I&O plan",
    "GYEON ceramic top-coat refresh",
    "Ceramic trim & plastic refresh",
    "Iron decontamination",
    "Priority scheduling",
    "15% off add-on services",
  ],
};

const TIER_GRADIENTS: Record<string, string> = {
  "membership-exterior-only": "from-slate-500 to-slate-400",
  "membership-interior-only": "from-blue-600 to-cyan-500",
  "membership-full-inside-out": "from-amber-500 to-orange-500",
  "membership-ceramic-maintenance": "from-emerald-500 to-teal-500",
};

const TIER_ACCENT: Record<string, string> = {
  "membership-exterior-only": "border-slate-300 dark:border-slate-600",
  "membership-interior-only": "border-blue-400/50 ring-2 ring-blue-400/20",
  "membership-full-inside-out": "border-amber-400/50 ring-1 ring-amber-400/20",
  "membership-ceramic-maintenance": "border-emerald-400/50 ring-2 ring-emerald-400/20",
};

export function MembershipPage() {
  const catalog = useQuery(api.catalog.listActive, {});
  const memberships = (catalog ?? [])
    .filter((c) => c.category === "membership")
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-blue-800 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIiBzdHJva2Utd2lkdGg9IjIiLz48L2c+PC9zdmc+')] opacity-30" />
        <div className="container max-w-5xl py-16 px-4 relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-14 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center">
              <ShieldCheck className="size-7 text-blue-300" />
            </div>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 tracking-tight">
            Maintenance Memberships
          </h1>
          <p className="text-lg text-blue-100 max-w-2xl mb-2">
            Keep your vehicle looking showroom-fresh year-round with scheduled
            monthly maintenance detailing.
          </p>
        </div>
      </div>

      <div className="container max-w-5xl py-12 px-4">
        {/* Already a Member */}
        <div className="mb-8 p-5 rounded-2xl border-2 border-blue-500/30 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="size-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                <ShieldCheck className="size-6" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Already a member?</h2>
                <p className="text-sm text-muted-foreground">
                  Book your monthly maintenance visit — no charge, it's included in your plan.
                </p>
              </div>
            </div>
            <Button asChild size="lg" className="shrink-0">
              <a href="/book?category=membership">
                Book Here <ArrowRight className="size-4 ml-1" />
              </a>
            </Button>
          </div>
        </div>

        {/* How It Works */}
        <div className="mb-12 p-6 rounded-2xl border bg-card">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Clock className="size-5 text-primary" /> How It Works
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                step: "1",
                icon: <Sparkles className="size-5 text-blue-500" />,
                title: "Get Your Initial Detail",
                desc: "Book any full detailing service with us first. This is required before joining a membership.",
              },
              {
                step: "2",
                icon: <Calendar className="size-5 text-green-500" />,
                title: "Sign Up Within 30 Days",
                desc: "Enroll in your chosen membership tier within the same month as your initial detail.",
              },
              {
                step: "3",
                icon: <Star className="size-5 text-amber-500" />,
                title: "Monthly Service Starts",
                desc: "Your recurring maintenance service begins the following month. We'll schedule your preferred day each month.",
              },
            ].map((s) => (
              <div key={s.step} className="flex gap-3">
                <div className="size-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-sm">
                  {s.step}
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-1">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Membership Tiers */}
        {!catalog ? (
          <div className="grid sm:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-96 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-3 gap-6 mb-12">
            {memberships.map((item) => {
              const price = item.variants[0]?.price ?? 0;
              const features = (item as any).features?.length
                ? (item as any).features as string[]
                : TIER_FEATURES[item.slug] ?? [];
              const subUrl = (item as any).subscriptionUrl as string | undefined;
              const gradient = TIER_GRADIENTS[item.slug] ?? "from-gray-500 to-gray-400";
              const accent = TIER_ACCENT[item.slug] ?? "";

              return (
                <Card
                  key={item._id}
                  className={`relative overflow-hidden transition-all hover:shadow-lg ${accent}`}
                >
                  {item.popular && (
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-blue-500 text-white border-0">
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <div
                      className={`size-10 rounded-xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center mb-2`}
                    >
                      <ShieldCheck className="size-5" />
                    </div>
                    <CardTitle className="text-xl">
                      {item.name.replace(" Membership", "")}
                    </CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <span className="text-3xl font-bold">
                        {formatPrice(price)}
                      </span>
                      <span className="text-muted-foreground text-sm">/month</span>
                    </div>
                    <ul className="space-y-2 mb-6">
                      {features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm">
                          {f.endsWith(":") ? (
                            <span className="text-muted-foreground font-medium">
                              {f}
                            </span>
                          ) : (
                            <>
                              <CheckCircle2 className="size-4 text-green-500 mt-0.5 shrink-0" />
                              <span>{f}</span>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                    <Button
                      asChild
                      className={`w-full ${item.popular ? "" : "variant-outline"}`}
                      variant={item.popular ? "default" : "outline"}
                    >
                      {subUrl ? (
                        <a href={subUrl} target="_blank" rel="noopener noreferrer">
                          <ArrowRight className="size-4 mr-1" /> Subscribe Now
                        </a>
                      ) : (
                        <a href={`tel:${BUSINESS_PHONE}`}>
                          <Phone className="size-4 mr-1" /> Call to Join
                        </a>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Important Notes */}
        <div className="p-6 rounded-2xl border border-amber-200/50 bg-amber-50/50 dark:bg-amber-950/10 dark:border-amber-800/30">
          <h3 className="font-semibold mb-3 text-amber-800 dark:text-amber-400">
            Important Membership Details
          </h3>
          <ul className="space-y-2 text-sm text-amber-900/80 dark:text-amber-300/80">
            <li className="flex items-start gap-2">
              <span className="font-bold">•</span>
              <span>
                An <strong>initial full detail</strong> is required before joining any
                membership. This ensures we start from a clean baseline.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">•</span>
              <span>
                You must <strong>sign up within 30 days</strong> of your initial detail.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">•</span>
              <span>
                Monthly service <strong>begins the following month</strong> after enrollment.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">•</span>
              <span>
                Memberships are billed monthly through Square. Cancel anytime with 7 days' notice.
              </span>
            </li>
          </ul>
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <h2 className="text-2xl font-bold mb-2">Ready to keep your ride fresh?</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Book your initial detail to get started, then sign up for monthly
            maintenance before your next visit.
          </p>
          <div className="flex justify-center gap-3 flex-wrap">
            <Button asChild size="lg">
              <a href={`tel:${BUSINESS_PHONE}`}>
                <Phone className="size-4 mr-1" /> Call to Join
              </a>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="/book">
                Book Initial Detail <ArrowRight className="size-4 ml-1" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
