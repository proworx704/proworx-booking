import { useMutation, useQuery } from "convex/react";
import {
  Car,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Link as LinkIcon,
  Paintbrush,
  Save,
  Shield,
  Ship,
  Sparkles,
  Star,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "../../convex/_generated/api";

/* ─── Service definitions matching the website ────────────────────────────── */

interface ServiceDef {
  slug: string;
  name: string;
  description: string;
}

interface CategoryDef {
  key: string;
  label: string;
  icon: React.ReactNode;
  services: ServiceDef[];
}

const SERVICE_CATEGORIES: CategoryDef[] = [
  {
    key: "inside-out",
    label: "Inside & Out (Full Service)",
    icon: <Car className="size-5" />,
    services: [
      {
        slug: "standard-inside-out",
        name: "Standard Inside & Out",
        description:
          "Complete interior and exterior detail — hand wash, vacuum, wipe-down, glass, tire dressing, and spray wax.",
      },
      {
        slug: "premium-io-interior",
        name: "Premium I&O — Interior Focus",
        description:
          "Standard Inside & Out + bundled interior add-ons at 10% off — steam, fragrance, leather conditioning, and more.",
      },
      {
        slug: "premium-io-exterior",
        name: "Premium I&O — Exterior Focus",
        description:
          "Standard Inside & Out + bundled exterior add-ons at 10% off — clay bar, iron decontamination, paint protection, and more.",
      },
      {
        slug: "elite-inside-out",
        name: "Elite Inside & Out — Ceramic",
        description:
          "Standard Inside & Out + all ceramic interior & exterior add-ons bundled at 15% off with GYEON ceramic upgrades.",
      },
    ],
  },
  {
    key: "interior",
    label: "Interior Only",
    icon: <Sparkles className="size-5" />,
    services: [
      {
        slug: "standard-interior",
        name: "Standard Interior",
        description:
          "Full interior clean — vacuum, wipe-down of all surfaces, interior glass, and light fragrance.",
      },
      {
        slug: "premium-interior",
        name: "Premium Interior",
        description:
          "Standard Interior + bundled add-ons at 10% off — steam cleaning, premium fragrance, leather conditioning, stain removal.",
      },
      {
        slug: "elite-interior",
        name: "Elite Interior — Ceramic",
        description:
          "Standard Interior plus ceramic interior add-ons at 15% off — hot water extraction, steam cleaning, fabric protection, GYEON leather shield.",
      },
    ],
  },
  {
    key: "exterior",
    label: "Exterior Only",
    icon: <Paintbrush className="size-5" />,
    services: [
      {
        slug: "standard-exterior",
        name: "Standard Exterior",
        description:
          "Hand wash with foam pre-treatment, wheels & tires cleaned and dressed, exterior glass, and spray wax.",
      },
      {
        slug: "premium-exterior",
        name: "Premium Exterior",
        description:
          "Standard Exterior + bundled add-ons at 10% off — clay bar, iron decontamination, paint sealant, trim restoration.",
      },
      {
        slug: "elite-exterior",
        name: "Elite Exterior — Ceramic",
        description:
          "Standard Exterior + ceramic exterior add-ons bundled at 15% off — clay bar, iron decon, ceramic tire dressing, plastic & trim ceramic, 12-month ceramic wax.",
      },
    ],
  },
  {
    key: "paint-correction",
    label: "Paint Correction",
    icon: <Sparkles className="size-5" />,
    services: [
      {
        slug: "single-stage-paint-correction",
        name: "Single Stage Paint Correction",
        description:
          "One-step machine polish to remove light swirls, water spots, and minor scratches — restores up to 70% clarity.",
      },
      {
        slug: "multi-stage-paint-correction",
        name: "Multi-Stage Paint Correction",
        description:
          "Two or more cutting/polishing stages for heavy swirls, deep scratches, and oxidation — restores up to 95% clarity.",
      },
    ],
  },
  {
    key: "ceramic-coating",
    label: "Ceramic Coating Packages",
    icon: <Shield className="size-5" />,
    services: [
      {
        slug: "gyeon-one-evo",
        name: "GYEON Q² One EVO (1 Year)",
        description:
          "Entry-level ceramic coating with 1 year of hydrophobic protection, UV resistance, and ease of cleaning.",
      },
      {
        slug: "gyeon-pure-evo",
        name: "GYEON Q² Pure EVO (3 Years)",
        description:
          "Mid-tier ceramic with 3 years of durable protection, deep gloss, and superior chemical resistance.",
      },
      {
        slug: "gyeon-flash-evo",
        name: "GYEON Q² Flash EVO (10 Years)",
        description:
          "Flagship ceramic coating — up to 10 years of extreme hardness, self-cleaning effect, and showroom gloss.",
      },
    ],
  },
  {
    key: "boat-detailing",
    label: "Boat Detailing",
    icon: <Ship className="size-5" />,
    services: [
      {
        slug: "basic-boat-wash",
        name: "Basic Boat Wash",
        description: "Exterior rinse, hand wash, and dry for routine maintenance between full details.",
      },
      {
        slug: "interior-boat-detail",
        name: "Interior Boat Detail",
        description: "Deep clean all interior surfaces — seats, carpet, console, storage, and glass.",
      },
      {
        slug: "exterior-boat-detail",
        name: "Exterior Boat Detail + Wax",
        description: "Full exterior wash, oxidation removal where needed, and marine-grade wax protection.",
      },
      {
        slug: "full-boat-detail",
        name: "Full Boat Detail (Inside & Out)",
        description: "Complete interior + exterior boat detail with wax — the works.",
      },
    ],
  },
  {
    key: "boat-ceramic",
    label: "Boat Ceramic Coatings",
    icon: <Shield className="size-5" />,
    services: [
      {
        slug: "boat-ceramic-2yr",
        name: "Boat Ceramic Coating (2-Year)",
        description: "2-year marine ceramic protection against salt, UV, and oxidation.",
      },
      {
        slug: "boat-ceramic-5yr",
        name: "Boat Ceramic Coating (5-Year)",
        description: "5-year marine ceramic — maximum durability for gelcoat, metal, and non-skid surfaces.",
      },
    ],
  },
  {
    key: "memberships",
    label: "Membership Plans",
    icon: <Star className="size-5" />,
    services: [
      {
        slug: "membership-exterior",
        name: "Exterior Only Membership",
        description: "Monthly exterior detail membership — keep your vehicle protected year-round.",
      },
      {
        slug: "membership-interior",
        name: "Interior Only Membership",
        description: "Monthly interior detail membership — always fresh and clean inside.",
      },
      {
        slug: "membership-full",
        name: "Full Inside & Out Membership",
        description: "Monthly full-service membership — complete inside & out detail every month.",
      },
    ],
  },
];

// Collect all widget keys for bulk loading
const ALL_WIDGET_KEYS = SERVICE_CATEGORIES.flatMap((cat) =>
  cat.services.map((s) => `widget:${s.slug}`),
);

/* ─── Component ───────────────────────────────────────────────────────────── */

function ServiceWidgetCard({
  service,
  savedUrl,
  onSave,
}: {
  service: ServiceDef;
  savedUrl: string;
  onSave: (slug: string, url: string) => void;
}) {
  const [url, setUrl] = useState(savedUrl);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setUrl(savedUrl);
    setDirty(false);
  }, [savedUrl]);

  return (
    <Card className="border-border/50">
      <CardContent className="p-4 space-y-3">
        <div>
          <h4 className="font-semibold text-sm">{service.name}</h4>
          <p className="text-xs text-muted-foreground mt-1">{service.description}</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <LinkIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              className="pl-8 text-xs h-9"
              placeholder="Paste Square widget URL or embed link here…"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setDirty(e.target.value !== savedUrl);
              }}
            />
          </div>
          <Button
            size="sm"
            variant={dirty ? "default" : "outline"}
            className="h-9 gap-1.5"
            disabled={!dirty}
            onClick={() => {
              onSave(service.slug, url);
              setDirty(false);
            }}
          >
            <Save className="size-3.5" />
            Save
          </Button>
          {url && (
            <Button
              size="sm"
              variant="outline"
              className="h-9 gap-1.5"
              onClick={() => window.open(url, "_blank")}
            >
              <ExternalLink className="size-3.5" />
              Test
            </Button>
          )}
        </div>

        {url && (
          <p className="text-[11px] text-emerald-500 flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-emerald-500 inline-block" />
            Widget linked
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function CategorySection({
  category,
  widgets,
  onSave,
}: {
  category: CategoryDef;
  widgets: Record<string, string>;
  onSave: (slug: string, url: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const linkedCount = category.services.filter((s) => widgets[`widget:${s.slug}`]).length;

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left"
      >
        <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
          {category.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">{category.label}</h3>
          <p className="text-xs text-muted-foreground">
            {linkedCount}/{category.services.length} widgets linked
          </p>
        </div>
        {open ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          {category.services.map((service) => (
            <ServiceWidgetCard
              key={service.slug}
              service={service}
              savedUrl={widgets[`widget:${service.slug}`] || ""}
              onSave={onSave}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ServiceWidgetsPage() {
  const widgets = useQuery(api.systemSettings.getMultiple, { keys: ALL_WIDGET_KEYS });
  const setSetting = useMutation(api.systemSettings.set);
  const [saving, setSaving] = useState<string | null>(null);

  const handleSave = async (slug: string, url: string) => {
    setSaving(slug);
    try {
      await setSetting({ key: `widget:${slug}`, value: url });
    } finally {
      setSaving(null);
    }
  };

  const totalLinked = widgets
    ? ALL_WIDGET_KEYS.filter((k) => widgets[k]).length
    : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Service Widgets</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Paste a Square booking widget URL for each service. When customers click the button, they'll be taken directly to that widget.
        </p>
        {widgets && (
          <p className="text-xs text-muted-foreground mt-2">
            {totalLinked}/{ALL_WIDGET_KEYS.length} services linked
          </p>
        )}
      </div>

      {/* Loading */}
      {!widgets && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Loading widgets…
        </div>
      )}

      {/* Category sections */}
      {widgets &&
        SERVICE_CATEGORIES.map((cat) => (
          <CategorySection
            key={cat.key}
            category={cat}
            widgets={widgets}
            onSave={handleSave}
          />
        ))}
    </div>
  );
}
