import { useEffect, useCallback } from "react";
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Gift,
  Phone,
  Shield,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BUSINESS_NAME, BUSINESS_PHONE } from "@/lib/constants";

/* ── Square links ── */
const SQUARE_WIDGET_URL =
  "https://app.squareup.com/appointments/buyer/widget/m9mhndj2r9ryyq/9VRKFJAZZM3HG";
const MEMBERSHIP_CHECKOUT_URL =
  "https://checkout.square.site/merchant/KAXAX104TMA6W/checkout/HDT3KCUF2VOY34QRVE27JKFL";
const COATING_LINKS = {
  oneEvo: "https://square.link/u/gH4gRlzU",       // $399
  pureEvo: "https://square.link/u/ApNI3tJ3",       // $699
  flashEvo: "https://square.link/u/Yb3WXDgL",      // $1,299
};

export function July4thPromoPage() {
  useEffect(() => {
    // Load Square Appointments widget script
    const existing = document.querySelector(
      'script[src*="squareup.com/appointments"]'
    );
    if (!existing) {
      const script = document.createElement("script");
      script.src =
        "https://app.squareup.com/appointments/buyer/widget/m9mhndj2r9ryyq/9VRKFJAZZM3HG.js";
      script.async = true;
      document.body.appendChild(script);
      return () => {
        script.remove();
      };
    }
  }, []);

  const openWidget = useCallback(() => {
    window.open(SQUARE_WIDGET_URL, "_blank", "noopener,noreferrer");
  }, []);

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-950 via-slate-900 to-red-950 text-white">
        {/* Animated stars/firework dots */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[10%] left-[5%] size-1.5 bg-white rounded-full animate-pulse opacity-60" />
          <div className="absolute top-[15%] right-[10%] size-2 bg-red-400 rounded-full animate-pulse opacity-50" style={{ animationDelay: "0.3s" }} />
          <div className="absolute top-[25%] left-[30%] size-1 bg-blue-300 rounded-full animate-pulse opacity-40" style={{ animationDelay: "0.7s" }} />
          <div className="absolute top-[8%] right-[35%] size-1.5 bg-white rounded-full animate-pulse opacity-50" style={{ animationDelay: "1s" }} />
          <div className="absolute top-[20%] left-[60%] size-1 bg-red-300 rounded-full animate-pulse opacity-40" style={{ animationDelay: "0.5s" }} />
          <div className="absolute top-[12%] left-[80%] size-2 bg-blue-400 rounded-full animate-pulse opacity-30" style={{ animationDelay: "1.2s" }} />
          <div className="absolute top-[30%] right-[20%] size-1 bg-white rounded-full animate-pulse opacity-50" style={{ animationDelay: "0.8s" }} />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(239,68,68,0.12),transparent_60%)]" />
        <div className="container relative py-16 sm:py-24 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/20 text-red-300 text-sm font-medium mb-6 border border-red-500/20">
            <Sparkles className="size-4" />
            Limited Time · Ends July 31st
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-2 tracking-tight">
            <span className="text-red-400">Red,</span>{" "}
            <span className="text-white">White,</span>{" "}
            <span className="text-blue-400">& SHINE</span>
          </h1>
          <p className="text-2xl sm:text-3xl font-bold text-slate-200 mb-4">
            🇺🇸 4th of July Specials
          </p>
          <p className="text-lg text-slate-300 mb-8 max-w-2xl mx-auto">
            Our biggest savings of the year — exclusively for our loyal clients.
            Save up to $300 on ceramic coatings, unlock free upgrades,
            and experience our limited-edition summer package.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              size="lg"
              asChild
              className="bg-red-600 hover:bg-red-700 text-white text-lg px-8 py-6 shadow-lg shadow-red-900/30"
            >
              <a href="#offers">
                View All Offers
                <ArrowRight className="size-5 ml-2" />
              </a>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="border-white/30 text-white hover:bg-white/10 text-lg px-8 py-6"
            >
              <a href="#book">
                <CalendarCheck className="size-5 mr-2" />
                Book Now
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Urgency Bar */}
      <div className="bg-gradient-to-r from-red-600 via-red-500 to-blue-600 text-white py-3">
        <div className="container text-center">
          <p className="text-sm sm:text-base font-semibold flex items-center justify-center gap-2">
            <Clock className="size-4 animate-pulse" />
            Holiday slots are filling fast — book before July 4th for priority scheduling!
          </p>
        </div>
      </div>

      {/* Offers Section */}
      <section id="offers" className="py-16 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">
              Holiday Offers
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Four ways to save big this summer. All offers valid through July 31st.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2 max-w-5xl mx-auto">
            {/* Offer 1: Add-On Upgrade */}
            <Card className="relative overflow-hidden border-red-200 dark:border-red-800/50 hover:shadow-lg transition-shadow">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-red-600" />
              <CardContent className="p-6 sm:p-8">
                <div className="flex items-start gap-4">
                  <div className="size-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                    <Gift className="size-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="flex-1">
                    <Badge variant="outline" className="text-red-600 border-red-300 mb-2">
                      Offer 1
                    </Badge>
                    <h3 className="text-xl font-bold mb-2">
                      The Ultimate Add-On Upgrade
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Book any <strong>Core Standard Detail Service</strong> and receive:
                    </p>
                    <div className="bg-red-50 dark:bg-red-950/30 rounded-xl p-4 mb-4">
                      <p className="text-2xl font-black text-red-600 dark:text-red-400">
                        15% OFF
                      </p>
                      <p className="text-sm text-muted-foreground">
                        All add-on services
                      </p>
                    </div>
                    <ul className="space-y-1.5 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-green-500 shrink-0" />
                        Engine bay detail
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-green-500 shrink-0" />
                        Pet hair removal
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-green-500 shrink-0" />
                        Headlight restoration & more
                      </li>
                    </ul>
                    <Button onClick={openWidget} className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white cursor-pointer">
                      Book & Save 15% <ArrowRight className="size-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Offer 2: Annual Membership Bonus */}
            <Card className="relative overflow-hidden border-amber-300 dark:border-amber-700/50 hover:shadow-lg transition-shadow ring-2 ring-amber-400/30">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-amber-600" />
              <div className="absolute top-4 right-4">
                <Badge className="bg-amber-500 text-white hover:bg-amber-600">
                  Best Value
                </Badge>
              </div>
              <CardContent className="p-6 sm:p-8">
                <div className="flex items-start gap-4">
                  <div className="size-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                    <Star className="size-6 text-amber-600 dark:text-amber-400 fill-current" />
                  </div>
                  <div className="flex-1">
                    <Badge variant="outline" className="text-amber-600 border-amber-300 mb-2">
                      Offer 2
                    </Badge>
                    <h3 className="text-xl font-bold mb-2">
                      Annual Membership Bonus
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Join our <strong>Annual Maintenance Membership</strong> at regular price and get:
                    </p>
                    <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-4 mb-4">
                      <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
                        FREE 3-Year Ceramic Coating
                      </p>
                      <p className="text-lg font-bold text-muted-foreground line-through">
                        $899 Value
                      </p>
                    </div>
                    <ul className="space-y-1.5 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-green-500 shrink-0" />
                        Effortless washing year-round
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-green-500 shrink-0" />
                        High-gloss showroom finish
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-green-500 shrink-0" />
                        Maintains & protects vehicle value
                      </li>
                    </ul>
                    <Button asChild className="mt-4 w-full bg-amber-600 hover:bg-amber-700 text-white cursor-pointer">
                      <a href={MEMBERSHIP_CHECKOUT_URL} target="_blank" rel="noopener noreferrer">
                        Join & Get Free Coating <ArrowRight className="size-4 ml-1" />
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Offer 3: Summer Freedom Package */}
            <Card className="relative overflow-hidden border-blue-200 dark:border-blue-800/50 hover:shadow-lg transition-shadow">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600" />
              <div className="absolute top-4 right-4">
                <Badge className="bg-blue-600 text-white hover:bg-blue-700">
                  Limited Run
                </Badge>
              </div>
              <CardContent className="p-6 sm:p-8">
                <div className="flex items-start gap-4">
                  <div className="size-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                    <Shield className="size-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <Badge variant="outline" className="text-blue-600 border-blue-300 mb-2">
                      Offer 3
                    </Badge>
                    <h3 className="text-xl font-bold mb-2">
                      "Summer Freedom" Detail Package
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      A premium, limited-run bundle to bulletproof your ride against sun, bugs, and salt:
                    </p>
                    <ul className="space-y-1.5 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-green-500 shrink-0" />
                        Standard Inside/Out Detail
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-green-500 shrink-0" />
                        <strong>Gyeon CanCoat</strong> exterior paint protection
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-green-500 shrink-0" />
                        <strong>Wheel WetCoat</strong> hydrophobic protection
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-green-500 shrink-0" />
                        <strong>Tire Ceramic Coating</strong> (no sling, deep satin finish)
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-green-500 shrink-0" />
                        <strong>Leather Ceramic</strong> OR <strong>Fabric Ceramic Protection</strong>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-green-500 shrink-0" />
                        Premium Fragrance of your choice
                      </li>
                    </ul>
                    <Button onClick={openWidget} className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white cursor-pointer">
                      Book Summer Freedom <ArrowRight className="size-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Offer 4: Summer Shield — Ceramic Coatings */}
            <Card className="relative overflow-hidden border-red-200 dark:border-red-800/50 hover:shadow-lg transition-shadow">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-white to-blue-500" />
              <CardContent className="p-6 sm:p-8">
                <div className="flex items-start gap-4">
                  <div className="size-12 rounded-xl bg-gradient-to-br from-red-100 to-blue-100 dark:from-red-900/30 dark:to-blue-900/30 flex items-center justify-center shrink-0">
                    <Zap className="size-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="flex-1">
                    <Badge variant="outline" className="text-red-600 border-red-300 mb-2">
                      Offer 4
                    </Badge>
                    <h3 className="text-xl font-bold mb-2">
                      Summer Shield Protection Event
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Professional-grade ceramic protection at the biggest discounts of the year:
                    </p>

                    {/* Pricing Table */}
                    <div className="rounded-xl border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-slate-800/50">
                            <th className="text-left p-3 font-semibold">Coating</th>
                            <th className="text-center p-3 font-semibold hidden sm:table-cell">Term</th>
                            <th className="text-right p-3 font-semibold">Price</th>
                            <th className="text-right p-3 font-semibold text-green-600">Savings</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-t">
                            <td className="p-3">
                              <div className="font-medium">Q² One EVO</div>
                              <div className="text-xs text-muted-foreground sm:hidden">1-Year</div>
                            </td>
                            <td className="text-center p-3 hidden sm:table-cell text-muted-foreground">1 Year</td>
                            <td className="p-3 text-right">
                              <span className="line-through text-muted-foreground text-xs">$499</span>
                              <br />
                              <span className="font-bold text-lg">$399</span>
                            </td>
                            <td className="p-3 text-right">
                              <span className="font-bold text-green-600">$100</span>
                            </td>
                          </tr>
                          <tr className="border-t bg-blue-50/50 dark:bg-blue-950/20">
                            <td className="p-3">
                              <div className="font-medium">Premium Ceramic</div>
                              <div className="text-xs text-muted-foreground sm:hidden">3-Year</div>
                            </td>
                            <td className="text-center p-3 hidden sm:table-cell text-muted-foreground">3 Years</td>
                            <td className="p-3 text-right">
                              <span className="line-through text-muted-foreground text-xs">$899</span>
                              <br />
                              <span className="font-bold text-lg">$699</span>
                            </td>
                            <td className="p-3 text-right">
                              <span className="font-bold text-green-600">$200</span>
                            </td>
                          </tr>
                          <tr className="border-t bg-amber-50/50 dark:bg-amber-950/20">
                            <td className="p-3">
                              <div className="font-medium">Q² Flash EVO</div>
                              <div className="text-xs text-blue-600 font-medium">w/ Warranty</div>
                              <div className="text-xs text-muted-foreground sm:hidden">10-Year</div>
                            </td>
                            <td className="text-center p-3 hidden sm:table-cell text-muted-foreground">10 Years</td>
                            <td className="p-3 text-right">
                              <span className="line-through text-muted-foreground text-xs">$1,599</span>
                              <br />
                              <span className="font-bold text-lg">$1,299</span>
                            </td>
                            <td className="p-3 text-right">
                              <span className="font-bold text-green-600">$300</span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-4 flex flex-col gap-2">
                      <Button asChild className="w-full bg-slate-800 hover:bg-slate-900 text-white cursor-pointer text-xs">
                        <a href={COATING_LINKS.oneEvo} target="_blank" rel="noopener noreferrer">
                          Get Q² One EVO — $399 <ArrowRight className="size-3 ml-1" />
                        </a>
                      </Button>
                      <Button asChild className="w-full bg-blue-700 hover:bg-blue-800 text-white cursor-pointer text-xs">
                        <a href={COATING_LINKS.pureEvo} target="_blank" rel="noopener noreferrer">
                          Get Premium Ceramic — $699 <ArrowRight className="size-3 ml-1" />
                        </a>
                      </Button>
                      <Button asChild className="w-full bg-gradient-to-r from-red-600 to-blue-600 hover:from-red-700 hover:to-blue-700 text-white cursor-pointer text-xs">
                        <a href={COATING_LINKS.flashEvo} target="_blank" rel="noopener noreferrer">
                          Get Q² Flash EVO — $1,299 <ArrowRight className="size-3 ml-1" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Book Now CTA */}
      <section id="book" className="py-16 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 text-white">
        <div className="container text-center">
          <CalendarCheck className="size-12 mx-auto mb-4 text-blue-400" />
          <h2 className="text-3xl sm:text-4xl font-bold mb-3">
            Book Your July 4th Detail
          </h2>
          <p className="text-slate-300 mb-8 max-w-lg mx-auto">
            Slots during the holiday week fill up fast. Secure your spot now
            to lock in these exclusive savings.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
            <Button
              size="lg"
              onClick={openWidget}
              className="bg-red-600 hover:bg-red-700 text-white text-lg px-8 py-6 shadow-lg shadow-red-900/40 cursor-pointer"
            >
              Book Your Detail Now
              <ArrowRight className="size-5 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="border-white/30 text-white hover:bg-white/10 text-lg px-8 py-6"
            >
              <a href={`tel:${BUSINESS_PHONE}`}>
                <Phone className="size-5 mr-2" />
                {BUSINESS_PHONE}
              </a>
            </Button>
          </div>

          <p className="text-slate-400 text-sm mt-4">
            Or call/text to claim your offer directly.
          </p>
        </div>
      </section>

      {/* Terms */}
      <section className="py-8 bg-muted/30">
        <div className="container text-center">
          <p className="text-xs text-muted-foreground max-w-2xl mx-auto">
            <strong>Terms & Conditions:</strong> Offers valid through July 31, 2026.
            Cannot be combined with other discounts or promotions.
            Appointments must be scheduled or membership activated before the expiration date.
            All prices are subject to vehicle size and condition.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 bg-muted/30">
        <div className="container text-center text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">{BUSINESS_NAME}</p>
          <p>Charlotte, NC & Surrounding Areas</p>
          <p className="mt-1">
            <a href={`tel:${BUSINESS_PHONE}`} className="hover:text-primary">
              {BUSINESS_PHONE}
            </a>
          </p>
          <p className="mt-3">
            © {new Date().getFullYear()} {BUSINESS_NAME}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
