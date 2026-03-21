import {
  Anchor,
  ArrowRight,
  CalendarCheck,
  Car,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BUSINESS_NAME, BUSINESS_PHONE } from "@/lib/constants";

export function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(59,130,246,0.15),transparent_50%)]" />
        <div className="container relative py-16 sm:py-24 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-sm mb-6">
            <Star className="size-3.5 fill-current" />
            5-Star Rated · Charlotte, NC
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 tracking-tight">
            Premium Mobile
            <br />
            <span className="text-blue-400">Auto Detailing</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            We come to you. Top-of-the-line products, eco-friendly approach, and
            12+ years of experience. Book your detail today.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              asChild
              className="bg-blue-600 hover:bg-blue-700 text-white text-lg px-8 py-6"
            >
              <Link to="/book">
                Book Now
                <ArrowRight className="size-5 ml-2" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="border-slate-500 text-slate-900 hover:bg-white/10 hover:text-white text-lg px-8 py-6"
            >
              <a href={`tel:${BUSINESS_PHONE}`}>
                Call {BUSINESS_PHONE}
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">
            Why Choose {BUSINESS_NAME}?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="size-12 rounded-xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
                  <Car className="size-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">
                  We Come to You
                </h3>
                <p className="text-muted-foreground text-sm">
                  Fully mobile and self-reliant. We bring our own water, power,
                  and premium products to your location.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="size-12 rounded-xl bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <Shield className="size-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Eco-Friendly</h3>
                <p className="text-muted-foreground text-sm">
                  Top-of-the-line, environmentally friendly products that
                  protect your car and the planet.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="size-12 rounded-xl bg-purple-100 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="size-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">
                  12+ Years Experience
                </h3>
                <p className="text-muted-foreground text-sm">
                  From express washes to ceramic coatings, our precision
                  detailing delivers showroom results every time.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Boat & Membership Quick Links */}
      <section className="py-12 bg-background">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <Link
              to="/boat-detailing"
              className="group flex items-start gap-4 p-6 rounded-2xl border bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-blue-200/50 dark:border-blue-800/30 hover:shadow-md transition-all"
            >
              <div className="size-12 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white flex items-center justify-center shrink-0">
                <Anchor className="size-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1 group-hover:text-blue-600 transition-colors">
                  Boat Detailing &amp; Ceramic
                </h3>
                <p className="text-sm text-muted-foreground">
                  Mobile marine detailing for Lake Norman &amp; Charlotte. Wash to
                  full ceramic protection.
                </p>
              </div>
            </Link>
            <Link
              to="/memberships"
              className="group flex items-start gap-4 p-6 rounded-2xl border bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950/30 dark:to-blue-950/30 border-slate-200/50 dark:border-slate-800/30 hover:shadow-md transition-all"
            >
              <div className="size-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shrink-0">
                <ShieldCheck className="size-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1 group-hover:text-blue-600 transition-colors">
                  Maintenance Memberships
                </h3>
                <p className="text-sm text-muted-foreground">
                  Starting at $59/mo. Keep your vehicle showroom-fresh with
                  monthly scheduled maintenance.
                </p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="container text-center">
          <CalendarCheck className="size-12 text-primary mx-auto mb-4" />
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
            Pick your service, choose a time that works, and we'll handle the
            rest. Quick online booking — no phone calls needed.
          </p>
          <Button size="lg" asChild className="text-lg px-8 py-6">
            <Link to="/book">
              Book Your Detail Now
              <ArrowRight className="size-5 ml-2" />
            </Link>
          </Button>
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
