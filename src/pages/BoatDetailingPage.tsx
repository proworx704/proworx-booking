import { useQuery } from "convex/react";
import {
  Anchor,
  ArrowRight,
  Phone,
  Shield,
  Sparkles,
  Star,
} from "lucide-react";
import { Link } from "react-router-dom";
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

const CATEGORY_META: Record<
  string,
  { title: string; subtitle: string; icon: React.ReactNode; gradient: string }
> = {
  boatDetailing: {
    title: "Boat Detailing",
    subtitle: "Professional mobile boat detailing — we come to you at the dock, marina, or driveway",
    icon: <Anchor className="size-6" />,
    gradient: "from-blue-600 to-cyan-500",
  },
  boatCeramic: {
    title: "Boat Ceramic Coating",
    subtitle: "Long-lasting marine ceramic protection against UV, saltwater, and oxidation",
    icon: <Shield className="size-6" />,
    gradient: "from-indigo-600 to-purple-500",
  },
  boatAddon: {
    title: "Boat Add-Ons",
    subtitle: "Enhance your detail with these additional services",
    icon: <Sparkles className="size-6" />,
    gradient: "from-amber-500 to-orange-500",
  },
};

export function BoatDetailingPage() {
  const catalog = useQuery(api.catalog.listActive, {});

  const boatCategories = ["boatDetailing", "boatCeramic", "boatAddon"];
  const grouped = boatCategories.reduce(
    (acc, cat) => {
      const items = (catalog ?? []).filter((c) => c.category === cat);
      if (items.length) acc[cat] = items;
      return acc;
    },
    {} as Record<string, typeof catalog>,
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-700 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIiBzdHJva2Utd2lkdGg9IjIiLz48L2c+PC9zdmc+')] opacity-30" />
        <div className="container max-w-5xl py-16 px-4 relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-14 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center">
              <Anchor className="size-7 text-cyan-300" />
            </div>
            <div>
              <Badge className="bg-cyan-400/20 text-cyan-200 border-cyan-400/30 mb-1">
                Lake Norman & Charlotte Area
              </Badge>
            </div>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 tracking-tight">
            Boat Detailing & Ceramic Coating
          </h1>
          <p className="text-lg text-blue-100 max-w-2xl mb-6">
            Professional mobile marine detailing for boats of all sizes. From a quick wash
            to full gelcoat restoration and multi-year ceramic protection — we bring the
            shop to your dock.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-white text-blue-900 hover:bg-blue-50">
              <Link to="/book">
                Book Now <ArrowRight className="size-4 ml-1" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
              <a href={`tel:${BUSINESS_PHONE}`}>
                <Phone className="size-4 mr-1" /> Call for Quote
              </a>
            </Button>
          </div>
        </div>
      </div>

      {/* Why Choose Us */}
      <div className="container max-w-5xl py-12 px-4">
        <div className="grid sm:grid-cols-3 gap-6 mb-16">
          {[
            {
              icon: <Star className="size-5 text-amber-500" />,
              title: "GYEON Certified",
              desc: "We use professional-grade GYEON marine ceramic coatings with manufacturer-backed warranties.",
            },
            {
              icon: <Anchor className="size-5 text-blue-500" />,
              title: "Mobile to Your Dock",
              desc: "We come to your marina, driveway, or boat ramp — fully equipped and self-contained.",
            },
            {
              icon: <Shield className="size-5 text-green-500" />,
              title: "UV & Salt Protection",
              desc: "Our coatings protect gelcoat from UV fade, saltwater corrosion, and environmental damage.",
            },
          ].map((item) => (
            <Card key={item.title} className="text-center">
              <CardContent className="pt-6">
                <div className="size-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                  {item.icon}
                </div>
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Service Categories */}
        {!catalog ? (
          <div className="space-y-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-16">
            {Object.entries(grouped).map(([cat, items]) => {
              const meta = CATEGORY_META[cat];
              if (!meta || !items) return null;

              return (
                <section key={cat}>
                  <div className="flex items-center gap-3 mb-6">
                    <div
                      className={`size-10 rounded-xl bg-gradient-to-br ${meta.gradient} text-white flex items-center justify-center`}
                    >
                      {meta.icon}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">{meta.title}</h2>
                      <p className="text-sm text-muted-foreground">
                        {meta.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {items.map((item) => {
                      const minPrice = Math.min(
                        ...item.variants.map((v) => v.price),
                      );
                      const maxPrice = Math.max(
                        ...item.variants.map((v) => v.price),
                      );
                      const singleVariant = item.variants.length === 1;

                      return (
                        <Card
                          key={item._id}
                          className={`transition-all hover:shadow-md ${item.popular ? "border-primary/40 ring-1 ring-primary/20" : ""}`}
                        >
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                                  {item.name}
                                  {item.popular && (
                                    <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">
                                      Popular
                                    </Badge>
                                  )}
                                </CardTitle>
                                <CardDescription className="mt-1">
                                  {item.description}
                                </CardDescription>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="font-bold text-primary text-lg">
                                  {singleVariant
                                    ? formatPrice(minPrice)
                                    : `${formatPrice(minPrice)}–${formatPrice(maxPrice)}`}
                                </div>
                                {item.deposit && (
                                  <p className="text-xs text-muted-foreground">
                                    {formatPrice(item.deposit)} deposit
                                  </p>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            {/* Size/variant pricing table */}
                            {!singleVariant && (
                              <div className="space-y-1.5 mb-4">
                                {item.variants.map((v) => (
                                  <div
                                    key={v.label}
                                    className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-muted/50"
                                  >
                                    <span className="text-muted-foreground">
                                      {v.label}
                                    </span>
                                    <span className="font-semibold">
                                      {formatPrice(v.price)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {cat !== "boatAddon" && (
                              <Button asChild size="sm" className="w-full">
                                <Link to={`/book?service=${item.slug}`}>
                                  Book This Service
                                  <ArrowRight className="size-4 ml-1" />
                                </Link>
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {/* CTA */}
        <div className="mt-16 text-center py-12 px-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 rounded-2xl border border-blue-200/50 dark:border-blue-800/30">
          <h2 className="text-2xl font-bold mb-2">
            Boats over 35 ft? Custom quote available.
          </h2>
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
            For larger vessels, yachts, or specialty marine work, give us a call
            for a custom inspection and estimate.
          </p>
          <div className="flex justify-center gap-3 flex-wrap">
            <Button asChild size="lg">
              <a href={`tel:${BUSINESS_PHONE}`}>
                <Phone className="size-4 mr-1" /> Call {BUSINESS_PHONE}
              </a>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/book">
                Book Online <ArrowRight className="size-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
