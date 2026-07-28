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
import { useState } from "react";
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

// Plan type definitions
const PLAN_TYPES = [
  {
    key: "full-io",
    label: "Full Inside & Out",
    slugPrefix: "membership-full-io-",
    description: "Complete interior and exterior detail every visit — our most comprehensive plan.",
    features: [
      "Full interior vacuum (carpets, seats, crevices)",
      "Wipe-down of all interior surfaces",
      "Interior glass cleaning",
      "Hand wash with foam pre-treatment",
      "Wheels & tires cleaned and dressed",
      "Exterior glass cleaned",
      "Light spray wax & tire shine",
    ],
    gradient: "from-amber-500 to-orange-500",
    accent: "border-amber-400/50 ring-1 ring-amber-400/20",
  },
  {
    key: "ext",
    label: "Exterior Only",
    slugPrefix: "membership-ext-",
    description: "Professional hand wash, wheels, tires, and exterior protection every visit.",
    features: [
      "Hand wash with foam pre-treatment",
      "Wheels & tires cleaned and dressed",
      "Door jambs wiped down",
      "Exterior glass cleaned",
      "Light spray wax & tire shine",
    ],
    gradient: "from-slate-500 to-slate-400",
    accent: "border-slate-300 dark:border-slate-600",
  },
  {
    key: "int",
    label: "Interior Only",
    slugPrefix: "membership-int-",
    description: "Full interior vacuum, surface wipe-down, and interior glass cleaning every visit.",
    features: [
      "Full interior vacuum (carpets, seats, crevices)",
      "Wipe-down of all interior surfaces",
      "Interior glass cleaning",
      "Door panels & jambs",
    ],
    gradient: "from-blue-600 to-cyan-500",
    accent: "border-blue-400/50 ring-2 ring-blue-400/20",
  },
];

const FREQUENCY_ORDER = ["biweekly", "monthly", "quarterly", "annual"];

const FREQUENCY_LABELS: Record<string, string> = {
  biweekly: "Biweekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  annual: "Annual Pre-Pay",
};

const FREQUENCY_DESCRIPTIONS: Record<string, string> = {
  biweekly: "Our best per-visit rate. Perfect for daily drivers and pristine upkeep.",
  monthly: "The sweet spot. Keeps your vehicle consistently fresh and protected.",
  quarterly: "The seasonal refresh. A deep maintenance clean every 3 months.",
  annual: "12 monthly visits pre-paid for the year. Save 8% plus 10% off add-on services.",
};

export function MembershipPage() {
  const catalog = useQuery(api.catalog.listActive, {});
  const memberships = (catalog ?? [])
    .filter((c) => c.category === "membership")
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const [activePlan, setActivePlan] = useState("full-io");

  const activePlanType = PLAN_TYPES.find((p) => p.key === activePlan)!;

  // Group memberships by plan type
  const planMemberships = memberships.filter((m) =>
    m.slug.startsWith(activePlanType.slugPrefix),
  );

  // Sort by frequency order
  const sortedPlanMemberships = FREQUENCY_ORDER.map((freq) =>
    planMemberships.find((m) => m.slug.endsWith(`-${freq}`)),
  ).filter(Boolean) as typeof memberships;

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
            Monthly Maintenance Plans
          </h1>
          <p className="text-lg text-blue-100 max-w-2xl mb-2">
            Keep your vehicle looking its best — every month. Professional mobile
            detailing on a schedule that works for you. Cancel anytime.
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
                desc: "Enroll in your chosen plan within the same month as your initial detail.",
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

        {/* Plan Type Tabs */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Select Your Plan Type
          </h2>
          <div className="flex gap-2 flex-wrap">
            {PLAN_TYPES.map((plan) => (
              <button
                key={plan.key}
                type="button"
                onClick={() => setActivePlan(plan.key)}
                className={`px-5 py-3 rounded-xl text-sm font-bold transition-all ${
                  activePlan === plan.key
                    ? "bg-primary text-primary-foreground shadow-md scale-105"
                    : "bg-card border-2 border-border text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5"
                }`}
              >
                {plan.label}
              </button>
            ))}
          </div>
        </div>

        {/* Active Plan Description */}
        <div className="mb-6">
          <p className="text-muted-foreground">{activePlanType.description}</p>
        </div>

        {/* Frequency Cards */}
        {!catalog ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-80 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {sortedPlanMemberships.map((item) => {
              const freq = item.slug.replace(activePlanType.slugPrefix, "");
              const price = item.variants[0]?.price ?? 0;
              const isAnnual = freq === "annual";
              const gradient = activePlanType.gradient;
              const accent = item.popular ? activePlanType.accent : "";

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
                    <CardTitle className="text-lg">
                      {FREQUENCY_LABELS[freq] ?? freq}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {FREQUENCY_DESCRIPTIONS[freq] ?? ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <span className="text-2xl font-bold">
                        {formatPrice(price)}
                      </span>
                      <span className="text-muted-foreground text-sm">
                        {isAnnual ? "/yr" : "/visit"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">
                      Starting at (Sedan). See table below for all sizes.
                    </p>
                    <Button
                      asChild
                      className="w-full"
                      variant={item.popular ? "default" : "outline"}
                      size="sm"
                    >
                      <a href={`tel:${BUSINESS_PHONE}`}>
                        <Phone className="size-4 mr-1" /> Subscribe Now
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* What's Included */}
        <div className="mb-8 p-6 rounded-2xl border bg-card">
          <h3 className="font-semibold mb-3">What's included in every visit:</h3>
          <ul className="grid sm:grid-cols-2 gap-2">
            {activePlanType.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="size-4 text-green-500 mt-0.5 shrink-0" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Pricing Table */}
        {catalog && sortedPlanMemberships.length > 0 && (
          <div className="mb-12 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b-2">
                  <th className="text-left p-3 font-semibold">Vehicle Size</th>
                  {sortedPlanMemberships.map((item) => {
                    const freq = item.slug.replace(activePlanType.slugPrefix, "");
                    return (
                      <th key={item._id} className="text-center p-3 font-semibold">
                        {FREQUENCY_LABELS[freq] ?? freq}
                        {item.popular && (
                          <Badge className="ml-1 bg-blue-500 text-white border-0 text-[9px]">
                            ★
                          </Badge>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {(sortedPlanMemberships[0]?.variants ?? []).map((_, vi) => (
                  <tr key={vi} className="border-b hover:bg-muted/50">
                    <td className="p-3 font-medium">
                      {sortedPlanMemberships[0]?.variants[vi]?.label}
                    </td>
                    {sortedPlanMemberships.map((item) => (
                      <td key={item._id} className="text-center p-3">
                        {formatPrice(item.variants[vi]?.price ?? 0)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-muted-foreground mt-3">
              Per-visit rates shown for Biweekly, Monthly, and Quarterly. Annual is a
              one-time pre-pay for 12 monthly visits. Billing starts the 1st of the month
              following signup.
            </p>
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
                No long-term contracts — <strong>cancel anytime</strong> with no penalty.
                Annual pre-pay plans include 10% off add-on services.
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
