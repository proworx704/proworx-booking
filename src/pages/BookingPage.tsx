import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  ArrowRight,
  Calendar as CalendarIcon,
  Check,
  CheckCircle2,
  Clock,
  Lock,
  LogIn,
  Mail,
  MapPin,
  Phone,
  ShoppingCart,
  Sparkles,
  Star,
  User,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BUSINESS_PHONE } from "@/lib/constants";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

// ─── Types ────────────────────────────────────────────────────────────────────

type CatalogItem = {
  _id: Id<"serviceCatalog">;
  name: string;
  slug: string;
  description: string;
  category: string;
  variants: Array<{ label: string; price: number; durationMin: number }>;
  isActive: boolean;
  sortOrder: number;
  deposit?: number;
  popular?: boolean;
};

type AddonSelection = {
  catalogItemId: Id<"serviceCatalog">;
  name: string;
  variantLabel?: string;
  price: number;
  durationMin: number;
};

type BookingStep = "service" | "addons" | "info" | "account" | "datetime" | "confirm";

interface BookingData {
  catalogItemId: Id<"serviceCatalog"> | null;
  serviceName: string;
  serviceCategory: string;
  selectedVariant: string;
  basePrice: number;
  baseDuration: number;
  addons: AddonSelection[];
  date: string;
  time: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  serviceAddress: string;
  zipCode: string;
  notes: string;
}

const initialData: BookingData = {
  catalogItemId: null,
  serviceName: "",
  serviceCategory: "",
  selectedVariant: "",
  basePrice: 0,
  baseDuration: 0,
  addons: [],
  date: "",
  time: "",
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  serviceAddress: "",
  zipCode: "",
  notes: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

function formatTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const CATEGORY_LABELS: Record<string, string> = {
  core: "Standard Detailing",
  paintCorrection: "Paint Correction",
  ceramicCoating: "Ceramic Coating Packages",
  boatDetailing: "Boat Detailing",
  boatCeramic: "Boat Ceramic Coatings",
  membership: "Maintenance Plans",
  interiorAddon: "Interior Add-Ons",
  exteriorAddon: "Exterior Add-Ons",
  ceramicAddon: "Ceramic Add-Ons",
  boatAddon: "Boat Add-Ons",
};

const CORE_CATEGORIES = ["core", "paintCorrection", "ceramicCoating", "boatDetailing", "boatCeramic"];
const ADDON_CATEGORIES = ["interiorAddon", "exteriorAddon", "ceramicAddon", "boatAddon"];

// When a ceramic coating package is selected, only show ceramic-relevant add-ons
const CERAMIC_ADDON_CATEGORIES = ["ceramicAddon"];

// ─── Step 1: Service Selection ────────────────────────────────────────────────

function ServiceStep({
  data,
  onSelect,
  catalog,
  filterCategory,
  isMembership,
  autoExpandSlug,
}: {
  data: BookingData;
  onSelect: (
    id: Id<"serviceCatalog">,
    name: string,
    category: string,
    variant: string,
    price: number,
    duration: number,
  ) => void;
  catalog: CatalogItem[] | undefined;
  filterCategory?: string | null;
  isMembership?: boolean;
  autoExpandSlug?: string | null;
}) {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const autoExpandedRef = useRef(false);

  // Auto-expand a multi-variant item when deep-linked via ?service=slug
  useEffect(() => {
    if (autoExpandSlug && catalog && !autoExpandedRef.current) {
      const item = catalog.find((c) => c.slug === autoExpandSlug);
      if (item && item.variants.length > 1) {
        setExpandedItem(item._id);
        autoExpandedRef.current = true;
        // Scroll to the item after a brief delay
        setTimeout(() => {
          document.getElementById(`service-${item._id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 200);
      }
    }
  }, [autoExpandSlug, catalog]);

  if (!catalog) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  // If a category filter is set, only show that category
  const categoriesToShow = filterCategory ? [filterCategory] : CORE_CATEGORIES;

  const grouped = categoriesToShow.reduce(
    (acc, cat) => {
      const items = catalog.filter((c) => c.category === cat);
      if (items.length) acc[cat] = items;
      return acc;
    },
    {} as Record<string, CatalogItem[]>,
  );

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold">
          {isMembership ? "Book Your Maintenance Visit" : "Choose Your Service"}
        </h2>
        <p className="text-muted-foreground">
          {isMembership
            ? "Select your membership tier below — no charge, it's included in your plan"
            : "Select a service, then pick the right size for your vehicle"}
        </p>
      </div>

      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat}>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {CATEGORY_LABELS[cat]}
          </h3>
          <div className="space-y-2">
            {items.map((item) => {
              const isExpanded = expandedItem === item._id;
              const isSelected = data.catalogItemId === item._id;
              const minPrice = Math.min(...item.variants.map((v) => v.price));
              const maxPrice = Math.max(...item.variants.map((v) => v.price));
              const singleVariant = item.variants.length === 1;

              return (
                <Card
                  key={item._id}
                  id={`service-${item._id}`}
                  className={`transition-all ${isSelected ? "border-primary ring-2 ring-primary/20" : isExpanded ? "border-primary/40" : "hover:border-primary/30"}`}
                >
                  <CardContent
                    className="p-4 cursor-pointer"
                    onClick={() => {
                      if (singleVariant) {
                        onSelect(
                          item._id,
                          item.name,
                          item.category,
                          item.variants[0].label,
                          item.variants[0].price,
                          item.variants[0].durationMin,
                        );
                      } else {
                        setExpandedItem(isExpanded ? null : item._id);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Sparkles className="size-4 text-primary shrink-0" />
                          <h4 className="font-semibold text-base sm:text-lg">
                            {item.name}
                          </h4>
                          {item.popular && (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">
                              Popular
                            </Badge>
                          )}
                          {item.deposit && (
                            <Badge variant="outline" className="text-[10px]">
                              {formatPrice(item.deposit)} deposit
                            </Badge>
                          )}
                        </div>
                        <p className={`text-sm text-muted-foreground ${isExpanded ? "" : "line-clamp-2"}`}>
                          {item.description}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        {isMembership ? (
                          <div className="text-sm font-medium text-emerald-600">
                            Included
                          </div>
                        ) : (
                          <div className="font-bold text-primary text-lg">
                            {singleVariant
                              ? formatPrice(minPrice)
                              : minPrice === maxPrice
                                ? formatPrice(minPrice)
                                : `${formatPrice(minPrice)}–${formatPrice(maxPrice)}`}
                          </div>
                        )}
                        {!singleVariant && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {isExpanded ? "select your vehicle" : "tap to expand"}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Variant picker */}
                    {isExpanded && !singleVariant && (
                      <div className="mt-4 grid gap-2">
                        {item.variants.map((variant) => (
                          <button
                            key={variant.label}
                            type="button"
                            className={`flex items-center justify-between p-3 rounded-lg border transition-all text-left ${
                              isSelected &&
                              data.selectedVariant === variant.label
                                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                                : "border-border hover:border-primary/40 hover:bg-muted/50"
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelect(
                                item._id,
                                item.name,
                                item.category,
                                variant.label,
                                variant.price,
                                variant.durationMin,
                              );
                            }}
                          >
                            <div>
                              <span className="font-medium text-sm">
                                {variant.label}
                              </span>
                              <span className="text-xs text-muted-foreground ml-2">
                                ~{formatDuration(variant.durationMin)}
                              </span>
                            </div>
                            {isMembership ? (
                              <span className="text-sm font-medium text-emerald-600">
                                ✓ Included
                              </span>
                            ) : (
                              <span className="font-bold text-primary">
                                {formatPrice(variant.price)}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Step 2: Add-Ons ──────────────────────────────────────────────────────────

function AddonsStep({
  data,
  onToggle,
  onChangeVariant,
  catalog,
  selectedServiceCategory,
}: {
  data: BookingData;
  onToggle: (addon: CatalogItem, variant?: CatalogItem["variants"][0]) => void;
  onChangeVariant: (addonId: Id<"serviceCatalog">, variant: CatalogItem["variants"][0]) => void;
  catalog: CatalogItem[] | undefined;
  selectedServiceCategory?: string;
}) {
  // Filter add-ons based on service category
  const BOAT_ADDON_CATEGORIES = ["boatAddon"];
  const isBoatService = selectedServiceCategory === "boatDetailing" || selectedServiceCategory === "boatCeramic";
  const allowedCategories =
    selectedServiceCategory === "ceramicCoating"
      ? CERAMIC_ADDON_CATEGORIES
      : isBoatService
        ? BOAT_ADDON_CATEGORIES
        : ADDON_CATEGORIES.filter((c) => c !== "boatAddon");

  const defaultTab =
    selectedServiceCategory === "ceramicCoating"
      ? "ceramicAddon"
      : isBoatService
        ? "boatAddon"
        : "interiorAddon";

  const [activeTab, setActiveTab] = useState<string>(defaultTab);

  if (!catalog) return <div className="h-40 animate-pulse bg-muted rounded-xl" />;

  const addonItems = catalog.filter((c) => allowedCategories.includes(c.category));
  const tabs = allowedCategories.filter((cat) =>
    addonItems.some((i) => i.category === cat),
  );

  const totalAddons = data.addons.reduce((s, a) => s + a.price, 0);
  const totalPrice = data.basePrice + totalAddons;

  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <h2 className="text-2xl font-bold">Customize Your Detail</h2>
        <p className="text-muted-foreground">
          Add extras to your {data.serviceName}
        </p>
      </div>

      {/* Running total */}
      <div className="flex items-center justify-between px-4 py-3 bg-primary/5 border border-primary/20 rounded-xl">
        <div className="flex items-center gap-2">
          <ShoppingCart className="size-4 text-primary" />
          <span className="text-sm font-medium">
            {data.serviceName}
            {data.addons.length > 0 && (
              <span className="text-muted-foreground">
                {" "}+ {data.addons.length} add-on{data.addons.length > 1 ? "s" : ""}
              </span>
            )}
          </span>
        </div>
        <span className="font-bold text-primary text-lg">{formatPrice(totalPrice)}</span>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg">
        {tabs.map((cat) => (
          <button
            key={cat}
            type="button"
            className={`flex-1 text-xs sm:text-sm font-medium py-2 px-2 rounded-md transition-all ${
              activeTab === cat
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab(cat)}
          >
            {cat === "interiorAddon"
              ? "Interior"
              : cat === "exteriorAddon"
                ? "Exterior"
                : "Ceramic"}
          </button>
        ))}
      </div>

      {/* Add-on list */}
      <div className="space-y-2">
        {addonItems
          .filter((i) => i.category === activeTab)
          .map((item) => {
            const selected = data.addons.find(
              (a) => a.catalogItemId === item._id,
            );
            const singleVariant = item.variants.length === 1;

            return (
              <Card
                key={item._id}
                className={`transition-all ${selected ? "border-primary/50 bg-primary/5" : ""}`}
              >
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start gap-3">
                    {/* Toggle button */}
                    <button
                      type="button"
                      className={`mt-0.5 size-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                        selected
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-muted-foreground/30 hover:border-primary/50"
                      }`}
                      onClick={() => {
                        if (singleVariant) {
                          onToggle(item, item.variants[0]);
                        } else {
                          // Toggle using first variant as default
                          onToggle(item, selected ? undefined : item.variants[0]);
                        }
                      }}
                    >
                      {selected && <Check className="size-3.5" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-medium text-sm">{item.name}</h4>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {item.description}
                          </p>
                        </div>
                        {singleVariant && (
                          <span className="font-semibold text-sm shrink-0">
                            {formatPrice(item.variants[0].price)}
                          </span>
                        )}
                      </div>

                      {/* Multi-variant picker */}
                      {!singleVariant && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {item.variants.map((v) => {
                            const isThisVariant =
                              selected?.variantLabel === v.label;
                            return (
                              <button
                                key={v.label}
                                type="button"
                                className={`text-xs px-2.5 py-1.5 rounded-md border transition-all ${
                                  isThisVariant
                                    ? "border-primary bg-primary/10 text-primary font-semibold"
                                    : "border-border hover:border-primary/40 text-muted-foreground"
                                }`}
                                onClick={() => {
                                  if (!selected) {
                                    onToggle(item, v);
                                  } else {
                                    onChangeVariant(item._id, v);
                                  }
                                }}
                              >
                                {v.label} · {formatPrice(v.price)}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>
    </div>
  );
}

// ─── Step 3: Customer Info ────────────────────────────────────────────────────

function InfoStep({
  data,
  onChange,
}: {
  data: BookingData;
  onChange: (field: keyof BookingData, value: string) => void;
}) {
  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold">Your Information</h2>
        <p className="text-muted-foreground">
          Where should we come and how can we reach you?
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="flex items-center gap-2">
            <User className="size-4" /> Full Name
          </Label>
          <Input
            id="name"
            placeholder="John Smith"
            value={data.customerName}
            onChange={(e) => onChange("customerName", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone" className="flex items-center gap-2">
            <Phone className="size-4" /> Phone Number
          </Label>
          <Input
            id="phone"
            type="tel"
            placeholder="(555) 123-4567"
            value={data.customerPhone}
            onChange={(e) => onChange("customerPhone", e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            By providing your phone number, you consent to receive appointment
            confirmations and reminders via SMS. Reply STOP to opt out.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="flex items-center gap-2">
            <Mail className="size-4" /> Email Address
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="john@example.com"
            value={data.customerEmail}
            onChange={(e) => onChange("customerEmail", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address" className="flex items-center gap-2">
            <MapPin className="size-4" /> Service Address
          </Label>
          <Input
            id="address"
            placeholder="123 Main St, Charlotte, NC"
            value={data.serviceAddress}
            onChange={(e) => onChange("serviceAddress", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="zipCode" className="flex items-center gap-2">
            <MapPin className="size-4" /> ZIP Code
          </Label>
          <Input
            id="zipCode"
            placeholder="28202"
            value={data.zipCode}
            onChange={(e) => onChange("zipCode", e.target.value)}
            maxLength={10}
            className="w-32"
          />
          <p className="text-xs text-muted-foreground">
            Helps us find the best time slot for your area
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Special Notes (optional)</Label>
          <Textarea
            id="notes"
            placeholder="Any special requests or details about your vehicle..."
            value={data.notes}
            onChange={(e) => onChange("notes", e.target.value)}
            rows={3}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Step 3b: Account Creation (for unauthenticated users) ───────────────────

function AccountStep({ data }: { data: BookingData }) {
  const { signIn } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();
  const initClientProfile = useMutation(api.userProfiles.initClientProfile);
  const [mode, setMode] = useState<"signup" | "verify" | "signin">("signup");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState("");
  const didInit = useRef(false);

  // Auto-init client profile when authenticated
  useEffect(() => {
    if (isAuthenticated && !didInit.current) {
      didInit.current = true;
      initClientProfile({}).catch(() => {});
    }
  }, [isAuthenticated, initClientProfile]);

  // Already authenticated — show success state
  if (isAuthenticated) {
    return (
      <div className="space-y-4 max-w-lg mx-auto text-center py-8">
        <div className="size-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
          <CheckCircle2 className="size-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold">Account Ready!</h2>
        <p className="text-muted-foreground">
          You're signed in. Click Next to pick your date & time.
        </p>
      </div>
    );
  }

  if (mode === "verify") {
    return (
      <div className="space-y-4 max-w-lg mx-auto">
        <div className="text-center mb-6">
          <div className="size-14 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-3">
            <Mail className="size-7 text-blue-500" />
          </div>
          <h2 className="text-2xl font-bold">Verify Your Email</h2>
          <p className="text-muted-foreground">
            We sent a verification code to <strong>{verifyEmail}</strong>
          </p>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            setLoading(true);
            const formData = new FormData(e.currentTarget);
            try {
              await signIn("password", formData);
            } catch {
              setError("Invalid or expired code. Please try again.");
            } finally {
              setLoading(false);
            }
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="verify-code">Verification Code</Label>
            <Input
              id="verify-code"
              name="code"
              type="text"
              placeholder="Enter code from your email"
              autoComplete="one-time-code"
              className="h-12 text-center text-lg tracking-[0.3em] font-mono"
              required
            />
          </div>
          <input name="flow" value="email-verification" type="hidden" />
          <input name="email" value={verifyEmail} type="hidden" />
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full h-11" disabled={loading}>
            {loading ? "Verifying..." : "Verify & Continue"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Didn't get the code? Check your spam folder or{" "}
            <Button
              variant="link"
              className="p-0 h-auto text-xs"
              onClick={() => { setMode("signup"); setError(""); }}
            >
              try again
            </Button>
          </p>
        </form>
      </div>
    );
  }

  if (mode === "signin") {
    return (
      <div className="space-y-4 max-w-lg mx-auto">
        <div className="text-center mb-6">
          <div className="size-14 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-3">
            <LogIn className="size-7 text-blue-500" />
          </div>
          <h2 className="text-2xl font-bold">Welcome Back</h2>
          <p className="text-muted-foreground">
            Sign in to your ProWorx account
          </p>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            setLoading(true);
            const formData = new FormData(e.currentTarget);
            try {
              await signIn("password", formData);
            } catch {
              setError("Invalid email or password.");
            } finally {
              setLoading(false);
            }
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="si-email">Email</Label>
            <Input
              id="si-email"
              name="email"
              type="email"
              defaultValue={data.customerEmail}
              autoComplete="email"
              className="h-11"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="si-password">Password</Label>
            <Input
              id="si-password"
              name="password"
              type="password"
              placeholder="Your password"
              autoComplete="current-password"
              className="h-11"
              required
            />
          </div>
          <input name="flow" value="signIn" type="hidden" />
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full h-11" disabled={loading}>
            {loading ? "Signing in..." : "Sign In & Continue"}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Button variant="link" className="p-0 h-auto font-medium" onClick={() => { setMode("signup"); setError(""); }}>
            Create one
          </Button>
        </p>
      </div>
    );
  }

  // Default: signup mode
  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <div className="text-center mb-6">
        <div className="size-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-3">
          <Star className="size-7 text-amber-500" />
        </div>
        <h2 className="text-2xl font-bold">Create Your Account</h2>
        <p className="text-muted-foreground">
          One quick step — then pick your date & time
        </p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-sm space-y-1.5">
        <p className="font-semibold text-amber-800 dark:text-amber-300">⭐ ProWorx Rewards Included</p>
        <ul className="text-amber-700 dark:text-amber-400 space-y-0.5">
          <li>✓ Track your booking status & history</li>
          <li>✓ Earn 1 point for every $1 spent</li>
          <li>✓ Redeem points for discounts & free services</li>
        </ul>
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          setLoading(true);
          const formData = new FormData(e.currentTarget);
          const email = data.customerEmail;
          try {
            await signIn("password", formData);
            setVerifyEmail(email);
            setMode("verify");
          } catch {
            setError("Could not create account. This email may already be registered.");
          } finally {
            setLoading(false);
          }
        }}
        className="space-y-4"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Name</Label>
            <Input value={data.customerName} disabled className="bg-muted/50 h-11" />
            <input name="name" type="hidden" value={data.customerName} />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Email</Label>
            <Input value={data.customerEmail} disabled className="bg-muted/50 h-11" />
            <input name="email" type="hidden" value={data.customerEmail} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="acct-password" className="flex items-center gap-2">
            <Lock className="size-4" /> Choose a Password
          </Label>
          <Input
            id="acct-password"
            name="password"
            type="password"
            placeholder="At least 6 characters"
            minLength={6}
            autoComplete="new-password"
            className="h-11"
            required
          />
        </div>

        <input name="flow" value="signUp" type="hidden" />

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full h-11" disabled={loading}>
          {loading ? "Creating account..." : "Create Account & Continue"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Button variant="link" className="p-0 h-auto font-medium" onClick={() => { setMode("signin"); setError(""); }}>
          Sign in
        </Button>
      </p>
    </div>
  );
}

// ─── Step 4: Date & Time ──────────────────────────────────────────────────────

function DateTimeStep({
  data,
  onSelectDate,
  onSelectTime,
}: {
  data: BookingData;
  onSelectDate: (date: string) => void;
  onSelectTime: (time: string) => void;
}) {
  // Session variable: track ZIP changes to reset date/time when user edits ZIP and returns
  const prevZipRef = useRef(data.zipCode);
  useEffect(() => {
    if (prevZipRef.current && prevZipRef.current !== data.zipCode) {
      onSelectDate("");
      onSelectTime("");
    }
    prevZipRef.current = data.zipCode;
  }, [data.zipCode, onSelectDate, onSelectTime]);

  const totalDuration =
    data.baseDuration +
    data.addons.reduce((s, a) => s + a.durationMin, 0);

  const slots = useQuery(
    api.availability.getAvailableSlots,
    data.date
      ? {
          date: data.date,
          durationMinutes: totalDuration,
          zipCode: data.zipCode.trim() || undefined,
        }
      : "skip",
  );

  const availability = useQuery(api.availability.list);
  const blockedDates = useQuery(api.availability.listBlockedDates);

  // Compute date range for next 60 days for ZIP clustering
  const dateRange = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() + 1);
    const end = new Date(start);
    end.setDate(end.getDate() + 60);
    return {
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
    };
  }, []);

  // Tier 1: exact ZIP match dates
  const zipDateCounts = useQuery(
    api.availability.getRecommendedDatesByZip,
    data.zipCode && data.zipCode.trim().length >= 3
      ? { zipCode: data.zipCode.trim(), startDate: dateRange.start, endDate: dateRange.end }
      : "skip",
  );

  // Tier 1.5: nearby ZIP (same 3-digit prefix) dates
  const nearbyZipDates = useQuery(
    api.availability.getNearbyZipDates,
    data.zipCode && data.zipCode.trim().length >= 3
      ? { zipCode: data.zipCode.trim(), startDate: dateRange.start, endDate: dateRange.end }
      : "skip",
  );

  const hasZipClustering = !!(data.zipCode && data.zipCode.trim().length >= 3);

  const disabledDays = useMemo(() => {
    if (!availability) return [];
    return availability
      .filter((a) => !a.isAvailable)
      .map((a) => a.dayOfWeek);
  }, [availability]);

  const blockedSet = useMemo(() => {
    if (!blockedDates) return new Set<string>();
    return new Set(blockedDates.map((b) => b.date));
  }, [blockedDates]);

  const isDateDisabled = useCallback(
    (date: Date) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (date < today) return true;
      if (disabledDays.includes(date.getDay())) return true;
      const dateStr = date.toISOString().split("T")[0];
      if (blockedSet.has(dateStr)) return true;
      return false;
    },
    [disabledDays, blockedSet],
  );

  // Calendar day modifiers for ZIP clustering highlights
  const modifiers = useMemo(() => {
    const exactDates: Date[] = [];
    const nearbyDates: Date[] = [];
    if (zipDateCounts) {
      for (const d of Object.keys(zipDateCounts)) {
        exactDates.push(new Date(d + "T12:00:00"));
      }
    }
    if (nearbyZipDates) {
      for (const d of Object.keys(nearbyZipDates)) {
        nearbyDates.push(new Date(d + "T12:00:00"));
      }
    }
    return { zipExact: exactDates, zipNearby: nearbyDates };
  }, [zipDateCounts, nearbyZipDates]);

  const modifiersStyles = {
    zipExact: {
      backgroundColor: "rgb(255 251 235)",
      border: "2px solid rgb(245 158 11)",
      borderRadius: "8px",
      fontWeight: 700,
    } as React.CSSProperties,
    zipNearby: {
      backgroundColor: "rgb(255 247 237)",
      border: "2px solid rgb(251 191 36)",
      borderRadius: "8px",
    } as React.CSSProperties,
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold">Pick a Date & Time</h2>
        <p className="text-muted-foreground">
          Select an available appointment slot (~{formatDuration(totalDuration)})
        </p>
      </div>

      {/* ZIP Clustering Legend */}
      {hasZipClustering && (zipDateCounts && Object.keys(zipDateCounts).length > 0 || nearbyZipDates && Object.keys(nearbyZipDates).length > 0) && (
        <div className="flex flex-wrap gap-3 justify-center text-xs">
          {zipDateCounts && Object.keys(zipDateCounts).length > 0 && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-300 rounded-full text-amber-800 font-medium">
              <Zap className="size-3 text-amber-500" />
              Same area ({data.zipCode})
            </span>
          )}
          {nearbyZipDates && Object.keys(nearbyZipDates).length > 0 && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 border border-amber-300 rounded-full text-orange-700 font-medium">
              <MapPin className="size-3 text-orange-400" />
              Nearby area
            </span>
          )}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex justify-center">
          <Calendar
            mode="single"
            selected={
              data.date ? new Date(data.date + "T12:00:00") : undefined
            }
            onSelect={(date) => {
              if (date) {
                const dateStr = date.toISOString().split("T")[0];
                onSelectDate(dateStr);
              }
            }}
            disabled={isDateDisabled}
            modifiers={modifiers}
            modifiersStyles={modifiersStyles}
            className="rounded-lg border shadow-sm"
          />
        </div>

        <div className="flex-1">
          {data.date ? (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <CalendarIcon className="size-4" />
                {formatDate(data.date)}
                {zipDateCounts && zipDateCounts[data.date] && (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-300 text-xs">
                    <Zap className="size-3 mr-1" />
                    {zipDateCounts[data.date]} same-area {zipDateCounts[data.date] === 1 ? "booking" : "bookings"}
                  </Badge>
                )}
                {!zipDateCounts?.[data.date] && nearbyZipDates && nearbyZipDates[data.date] && (
                  <Badge variant="secondary" className="bg-orange-50 text-orange-700 border-orange-300 text-xs">
                    <MapPin className="size-3 mr-1" />
                    Nearby area
                  </Badge>
                )}
              </h3>
              {slots === undefined ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className="h-10 rounded-lg bg-muted animate-pulse"
                    />
                  ))}
                </div>
              ) : slots.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No available slots for this date. Please try another day.
                </p>
              ) : (
                <div>
                  {slots.some((s) => s.recommended) && (
                    <div className="flex items-center gap-2 mb-3 px-2 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                      <Zap className="size-4 text-amber-500 shrink-0" />
                      <span>
                        <strong>⚡ Recommended</strong> — we're already in your
                        area on this day!
                      </span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {slots.map((slot) => (
                      <Button
                        key={slot.time}
                        variant={
                          data.time === slot.time ? "default" : "outline"
                        }
                        size="sm"
                        className={`w-full relative ${
                          slot.recommended && data.time !== slot.time
                            ? "border-amber-400 bg-amber-50 hover:bg-amber-100 text-amber-900"
                            : ""
                        }`}
                        onClick={() => onSelectTime(slot.time)}
                      >
                        {slot.recommended && data.time !== slot.time && (
                          <Zap className="size-3 mr-0.5 text-amber-500" />
                        )}
                        <Clock className="size-3 mr-1" />
                        {formatTime(slot.time)}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>← Select a date to see available times</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Step 5: Confirm ──────────────────────────────────────────────────────────

function ConfirmStep({ data, isMembership }: { data: BookingData; isMembership?: boolean }) {
  const totalAddons = data.addons.reduce((s, a) => s + a.price, 0);
  const totalPrice = data.basePrice + totalAddons;

  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold">Review & Confirm</h2>
        <p className="text-muted-foreground">
          {isMembership
            ? "Your maintenance visit is included in your membership"
            : "Make sure everything looks right"}
        </p>
      </div>

      <Card>
        <CardContent className="p-5 space-y-4">
          {/* Service */}
          <div className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-lg">{data.serviceName}</p>
                <p className="text-sm text-muted-foreground">
                  {data.selectedVariant}
                </p>
              </div>
              {isMembership ? (
                <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                  ✓ Included
                </span>
              ) : (
                <span className="font-bold text-primary text-lg">
                  {formatPrice(data.basePrice)}
                </span>
              )}
            </div>
          </div>

          {/* Add-ons */}
          {data.addons.length > 0 && (
            <div className="pb-3 border-b space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Add-Ons
              </p>
              {data.addons.map((addon, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm"
                >
                  <span>
                    {addon.name}
                    {addon.variantLabel && addon.variantLabel !== "Standard" && (
                      <span className="text-muted-foreground">
                        {" "}
                        — {addon.variantLabel}
                      </span>
                    )}
                  </span>
                  <span className="font-medium">
                    +{formatPrice(addon.price)}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-1 text-sm font-semibold">
                <span>Total</span>
                <span className="text-primary text-lg">
                  {formatPrice(totalPrice)}
                </span>
              </div>
            </div>
          )}

          {/* Schedule */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Date</p>
              <p className="font-medium">{formatDate(data.date)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Time</p>
              <p className="font-medium">{formatTime(data.time)}</p>
            </div>
          </div>

          {/* Customer info */}
          <div className="space-y-2 text-sm border-t pt-3">
            <div className="flex gap-2">
              <User className="size-4 text-muted-foreground shrink-0 mt-0.5" />
              <span>{data.customerName}</span>
            </div>
            <div className="flex gap-2">
              <Phone className="size-4 text-muted-foreground shrink-0 mt-0.5" />
              <span>{data.customerPhone}</span>
            </div>
            <div className="flex gap-2">
              <Mail className="size-4 text-muted-foreground shrink-0 mt-0.5" />
              <span>{data.customerEmail}</span>
            </div>
            <div className="flex gap-2">
              <MapPin className="size-4 text-muted-foreground shrink-0 mt-0.5" />
              <span>
                {data.serviceAddress}
                {data.zipCode ? ` · ${data.zipCode}` : ""}
              </span>
            </div>
            {data.notes && (
              <div className="pt-2 border-t">
                <p className="text-muted-foreground text-xs mb-1">Notes</p>
                <p>{data.notes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Success Screen ───────────────────────────────────────────────────────────

function SuccessScreen({
  confirmationCode,
  data,
  isAuthenticated,
  isInsidePortal,
}: {
  confirmationCode: string;
  data: BookingData;
  isAuthenticated: boolean;
  isInsidePortal: boolean;
}) {
  const totalPrice =
    data.basePrice + data.addons.reduce((s, a) => s + a.price, 0);

  return (
    <div className="max-w-lg mx-auto text-center py-8">
      <div className="size-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 className="size-8 text-green-600" />
      </div>
      <h2 className="text-2xl font-bold mb-2">Booking Confirmed!</h2>
      <p className="text-muted-foreground mb-6">
        Your appointment has been scheduled. We'll see you there!
      </p>

      <Card className="text-left mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Confirmation Details</CardTitle>
          <CardDescription>Save your confirmation code</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-primary/5 rounded-lg p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Confirmation Code
            </p>
            <p className="text-2xl font-mono font-bold text-primary">
              {confirmationCode}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Service</p>
              <p className="font-medium">{data.serviceName}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total</p>
              <p className="font-medium">{formatPrice(totalPrice)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Date</p>
              <p className="font-medium">{formatDate(data.date)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Time</p>
              <p className="font-medium">{formatTime(data.time)}</p>
            </div>
          </div>
          {data.addons.length > 0 && (
            <div className="text-sm pt-2 border-t">
              <p className="text-muted-foreground mb-1">Add-Ons</p>
              <p className="font-medium">
                {data.addons.map((a) => a.name).join(", ")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prompt to create account for non-authenticated users */}
      {!isAuthenticated && (
        <Card className="mb-6 border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30">
          <CardContent className="p-5 text-center">
            <div className="size-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mx-auto mb-3">
              <User className="size-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-semibold mb-1">Create Your Free Profile</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Track your bookings, earn loyalty points, and get rewards on every visit.
            </p>
            <Button asChild className="bg-blue-600 hover:bg-blue-700 w-full">
              <Link to="/rewards/register">
                Create Account
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Already have one?{" "}
              <Link to="/rewards/login" className="text-blue-600 hover:underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      )}

      <p className="text-sm text-muted-foreground mb-4">
        Questions? Call us at{" "}
        <a
          href={`tel:${BUSINESS_PHONE}`}
          className="text-primary font-medium"
        >
          {BUSINESS_PHONE}
        </a>
      </p>

      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        {isInsidePortal ? (
          <>
            <Button asChild>
              <Link to="/rewards/bookings">View My Bookings</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/rewards/book">Book Another</Link>
            </Button>
          </>
        ) : (
          <Button asChild variant="outline">
            <Link to="/book">Book Another Appointment</Link>
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Main Booking Page ────────────────────────────────────────────────────────

export function BookingPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [step, setStep] = useState<BookingStep>("service");
  const [data, setData] = useState<BookingData>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState<string | null>(null);

  const { isAuthenticated } = useConvexAuth();
  const isInsidePortal = location.pathname.startsWith("/rewards");
  const clientProfile = useQuery(
    api.loyalty.getMyProfile,
    isAuthenticated ? {} : "skip",
  );

  const catalog = useQuery(api.catalog.listActive, {});
  const createBooking = useMutation(api.bookings.create);

  // Auto-fill disabled — form always starts blank so customers enter their own info

  // ─── Capture UTM params & referrer on landing (persist in sessionStorage) ──
  useEffect(() => {
    // Only capture once per session
    if (sessionStorage.getItem("pwx_utm_captured")) return;

    const utmSource = searchParams.get("utm_source") || undefined;
    const utmMedium = searchParams.get("utm_medium") || undefined;
    const utmCampaign = searchParams.get("utm_campaign") || undefined;
    const utmContent = searchParams.get("utm_content") || undefined;
    const utmTerm = searchParams.get("utm_term") || undefined;
    const referrerUrl = document.referrer || undefined;
    const landingPage = window.location.pathname + window.location.search;

    // Auto-detect lead source from UTM params or referrer
    let leadSource: string | undefined;
    const src = (utmSource || "").toLowerCase();
    const med = (utmMedium || "").toLowerCase();
    if (src === "google" && (med === "cpc" || med === "paid")) leadSource = "google_ads";
    else if (src === "google" && med === "local") leadSource = "google_local";
    else if ((src === "facebook" || src === "fb") && (med === "cpc" || med === "paid" || med === "social")) leadSource = "facebook_ads";
    else if (src === "instagram" && (med === "cpc" || med === "paid" || med === "social")) leadSource = "instagram_ads";
    else if (src === "google" && med === "organic") leadSource = "google_organic";
    else if (src === "yelp") leadSource = "yelp";
    else if (src && med === "referral") leadSource = "referral";
    else if (!utmSource && referrerUrl) {
      if (referrerUrl.includes("google.com")) leadSource = "google_organic";
      else if (referrerUrl.includes("facebook.com") || referrerUrl.includes("fb.com")) leadSource = "facebook_ads";
      else if (referrerUrl.includes("instagram.com")) leadSource = "instagram_ads";
      else if (referrerUrl.includes("yelp.com")) leadSource = "yelp";
      else leadSource = "referral";
    }
    else if (utmSource) leadSource = "other";

    const utmData = { utmSource, utmMedium, utmCampaign, utmContent, utmTerm, referrerUrl, landingPage, leadSource };
    sessionStorage.setItem("pwx_utm", JSON.stringify(utmData));
    sessionStorage.setItem("pwx_utm_captured", "1");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── URL params for filtering ─────────────────────────────
  const categoryFilter = searchParams.get("category");
  const isMembership = categoryFilter === "membership";

  // ─── Deep link: auto-select service from URL ─────────────
  const serviceSlug = searchParams.get("service");
  useEffect(() => {
    if (serviceSlug && catalog && !data.catalogItemId) {
      const item = catalog.find((c) => c.slug === serviceSlug);
      if (item) {
        if (item.variants.length === 1) {
          setData((d) => ({
            ...d,
            catalogItemId: item._id,
            serviceName: item.name,
            serviceCategory: item.category,
            selectedVariant: item.variants[0].label,
            basePrice: item.variants[0].price,
            baseDuration: item.variants[0].durationMin,
          }));
          setStep("addons");
        } else {
          // Multi-variant — show service step with item expanded
          // Just scroll the user there; they need to pick a variant
        }
      }
    }
  }, [serviceSlug, catalog, data.catalogItemId]);

  // ─── Dynamic steps: skip account step if already authenticated ───────────
  const needsAccount = !isAuthenticated;
  const steps: BookingStep[] = needsAccount
    ? ["service", "addons", "info", "account", "datetime", "confirm"]
    : ["service", "addons", "info", "datetime", "confirm"];
  const stepIndex = steps.indexOf(step);
  const stepLabels = needsAccount
    ? ["Service", "Add-Ons", "Your Info", "Account", "Date & Time", "Confirm"]
    : ["Service", "Add-Ons", "Your Info", "Date & Time", "Confirm"];

  // Auto-advance past account step when user signs up during flow
  useEffect(() => {
    if (step === "account" && isAuthenticated) {
      setStep("datetime");
    }
  }, [isAuthenticated, step]);

  const canGoNext = () => {
    switch (step) {
      case "service":
        return data.catalogItemId !== null && data.selectedVariant !== "";
      case "addons":
        return true; // always can skip
      case "info":
        return (
          data.customerName.trim() !== "" &&
          data.customerPhone.trim() !== "" &&
          data.customerEmail.trim() !== "" &&
          data.serviceAddress.trim() !== ""
        );
      case "account":
        return isAuthenticated; // can proceed once signed in/up
      case "datetime":
        return data.date !== "" && data.time !== "";
      case "confirm":
        return true;
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (step === "confirm") {
      setIsSubmitting(true);
      try {
        const totalAddons = data.addons.reduce((s, a) => s + a.price, 0);
        const totalDuration =
          data.baseDuration +
          data.addons.reduce((s, a) => s + a.durationMin, 0);

        // ─── Retrieve UTM / attribution data from sessionStorage ──
        let utmAttribution: Record<string, string | undefined> = {};
        try {
          const raw = sessionStorage.getItem("pwx_utm") || sessionStorage.getItem("proworx_utm");
          if (raw) utmAttribution = JSON.parse(raw);
        } catch { /* ignore */ }

        const result = await createBooking({
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          customerEmail: data.customerEmail,
          serviceAddress: data.serviceAddress,
          zipCode: data.zipCode.trim() || undefined,
          catalogItemId: data.catalogItemId ?? undefined,
          selectedVariant: data.selectedVariant || undefined,
          serviceName: data.serviceName,
          price: data.basePrice,
          totalPrice: data.basePrice + totalAddons,
          totalDuration,
          addons:
            data.addons.length > 0
              ? data.addons.map((a) => ({
                  catalogItemId: a.catalogItemId,
                  name: a.name,
                  variantLabel: a.variantLabel,
                  price: a.price,
                  durationMin: a.durationMin,
                }))
              : undefined,
          date: data.date,
          time: data.time,
          notes: data.notes || undefined,
          // Marketing attribution
          leadSource: (utmAttribution.leadSource as any) || undefined,
          utmSource: utmAttribution.utmSource || undefined,
          utmMedium: utmAttribution.utmMedium || undefined,
          utmCampaign: utmAttribution.utmCampaign || undefined,
          utmContent: utmAttribution.utmContent || undefined,
          utmTerm: utmAttribution.utmTerm || undefined,
          referrerUrl: utmAttribution.referrerUrl || undefined,
          landingPage: utmAttribution.landingPage || undefined,
        });
        setConfirmationCode(result.confirmationCode);

        // ─── Fire conversion events (GA4 + Google Ads + Meta) ────────
        const totalValue = data.basePrice + data.addons.reduce((s, a) => s + a.price, 0);
        const valueDollars = totalValue / 100; // cents → dollars

        if (typeof window !== "undefined" && typeof (window as any).gtag === "function") {
          // GA4 conversion event
          (window as any).gtag("event", "booking_confirmed", {
            event_category: "conversion",
            event_label: data.serviceName,
            value: valueDollars,
            currency: "USD",
            service_name: data.serviceName,
            service_category: data.serviceCategory || "",
            confirmation_code: result.confirmationCode,
            lead_source: utmAttribution.leadSource || "direct",
          });

          // Google Ads conversion event
          (window as any).gtag("event", "conversion", {
            send_to: "AW-11353787151/booking_confirmed",
            value: valueDollars,
            currency: "USD",
          });
        }

        // Meta Pixel conversion events
        if (typeof window !== "undefined" && typeof (window as any).fbq === "function") {
          // Purchase = primary conversion for Meta Ads ROAS optimization
          (window as any).fbq("track", "Purchase", {
            value: valueDollars,
            currency: "USD",
            content_name: data.serviceName,
            content_category: data.serviceCategory || "Detailing",
            content_type: "product",
          });
          (window as any).fbq("track", "Schedule", {
            value: valueDollars,
            currency: "USD",
            content_name: data.serviceName,
            content_category: data.serviceCategory || "",
          });
        }
      } catch (e) {
        console.error("Booking failed:", e);
        alert("Something went wrong. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }
    const nextIndex = stepIndex + 1;
    if (nextIndex < steps.length) {
      setStep(steps[nextIndex]);
    }
  };

  const handleBack = () => {
    const prevIndex = stepIndex - 1;
    if (prevIndex >= 0) {
      setStep(steps[prevIndex]);
    }
  };

  // Addon toggle handler
  const handleAddonToggle = (
    item: CatalogItem,
    variant?: CatalogItem["variants"][0],
  ) => {
    setData((d) => {
      const exists = d.addons.find((a) => a.catalogItemId === item._id);
      if (exists) {
        // Remove it
        return {
          ...d,
          addons: d.addons.filter((a) => a.catalogItemId !== item._id),
        };
      }
      // Add it
      const v = variant || item.variants[0];
      return {
        ...d,
        addons: [
          ...d.addons,
          {
            catalogItemId: item._id,
            name: item.name,
            variantLabel: v.label,
            price: v.price,
            durationMin: v.durationMin,
          },
        ],
      };
    });
  };

  const handleAddonVariantChange = (
    addonId: Id<"serviceCatalog">,
    variant: CatalogItem["variants"][0],
  ) => {
    setData((d) => ({
      ...d,
      addons: d.addons.map((a) =>
        a.catalogItemId === addonId
          ? {
              ...a,
              variantLabel: variant.label,
              price: variant.price,
              durationMin: variant.durationMin,
            }
          : a,
      ),
    }));
  };

  if (confirmationCode) {
    return (
      <div className="container max-w-2xl py-8">
        <SuccessScreen confirmationCode={confirmationCode} data={data} isAuthenticated={isAuthenticated} isInsidePortal={isInsidePortal} />
      </div>
    );
  }

  return (
    <div className="container max-w-3xl py-6 sm:py-8">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {stepLabels.map((label, i) => (
            <div
              key={label}
              className={`flex items-center gap-1 text-xs sm:text-sm ${
                i <= stepIndex
                  ? "text-primary font-medium"
                  : "text-muted-foreground"
              }`}
            >
              <div
                className={`size-6 sm:size-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  i < stepIndex
                    ? "bg-primary text-primary-foreground"
                    : i === stepIndex
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {i < stepIndex ? "✓" : i + 1}
              </div>
              <span className="hidden sm:inline">{label}</span>
            </div>
          ))}
        </div>
        <div className="w-full bg-muted rounded-full h-1.5">
          <div
            className="bg-primary h-1.5 rounded-full transition-all duration-300"
            style={{
              width: `${((stepIndex + 1) / steps.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Step Content */}
      <div className="min-h-[400px]">
        {step === "service" && (
          <ServiceStep
            data={data}
            catalog={catalog}
            filterCategory={categoryFilter}
            isMembership={isMembership}
            autoExpandSlug={serviceSlug}
            onSelect={(id, name, category, variant, price, duration) => {
              setData((d) => ({
                ...d,
                catalogItemId: id,
                serviceName: name,
                serviceCategory: category,
                selectedVariant: variant,
                basePrice: isMembership ? 0 : price,
                baseDuration: duration,
                addons: [],
                date: "",
                time: "",
              }));
              setStep("addons");
            }}
          />
        )}

        {step === "addons" && (
          <AddonsStep
            data={data}
            catalog={catalog}
            onToggle={handleAddonToggle}
            onChangeVariant={handleAddonVariantChange}
            selectedServiceCategory={data.serviceCategory}
          />
        )}

        {step === "info" && (
          <InfoStep
            data={data}
            onChange={(field, value) =>
              setData((d) => ({ ...d, [field]: value }))
            }
          />
        )}

        {step === "account" && <AccountStep data={data} />}

        {step === "datetime" && (
          <DateTimeStep
            data={data}
            onSelectDate={(date) =>
              setData((d) => ({ ...d, date, time: "" }))
            }
            onSelectTime={(time) => setData((d) => ({ ...d, time }))}
          />
        )}

        {step === "confirm" && <ConfirmStep data={data} isMembership={isMembership} />}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-8 pt-4 border-t">
        <Button
          variant="ghost"
          onClick={handleBack}
          disabled={stepIndex === 0}
        >
          <ArrowLeft className="size-4 mr-1" />
          Back
        </Button>

        {step !== "service" && (
          <Button
            onClick={handleNext}
            disabled={!canGoNext() || isSubmitting}
          >
            {step === "confirm" ? (
              isSubmitting ? (
                "Booking..."
              ) : (
                <>
                  Confirm Booking
                  <CheckCircle2 className="size-4 ml-1" />
                </>
              )
            ) : step === "addons" ? (
              data.addons.length === 0 ? (
                <>
                  Skip Add-Ons
                  <ArrowRight className="size-4 ml-1" />
                </>
              ) : (
                <>
                  Continue with {data.addons.length} Add-On
                  {data.addons.length > 1 ? "s" : ""}
                  <ArrowRight className="size-4 ml-1" />
                </>
              )
            ) : (
              <>
                Next
                <ArrowRight className="size-4 ml-1" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
