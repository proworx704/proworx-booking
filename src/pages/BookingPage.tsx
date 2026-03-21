import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  ArrowRight,
  Calendar as CalendarIcon,
  Check,
  CheckCircle2,
  Clock,
  Mail,
  MapPin,
  Phone,
  ShoppingCart,
  Sparkles,
  User,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
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

type BookingStep = "service" | "addons" | "info" | "datetime" | "confirm";

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
  membership: "Maintenance Plans",
  interiorAddon: "Interior Add-Ons",
  exteriorAddon: "Exterior Add-Ons",
  ceramicAddon: "Ceramic Add-Ons",
  boatAddon: "Boat Add-Ons",
};

const CORE_CATEGORIES = ["core", "paintCorrection", "ceramicCoating", "boatDetailing"];
const ADDON_CATEGORIES = ["interiorAddon", "exteriorAddon", "ceramicAddon"];

// When a ceramic coating package is selected, only show ceramic-relevant add-ons
const CERAMIC_ADDON_CATEGORIES = ["ceramicAddon"];

// ─── Step 1: Service Selection ────────────────────────────────────────────────

function ServiceStep({
  data,
  onSelect,
  catalog,
  filterCategory,
  isMembership,
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
}) {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

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
                        <p className="text-sm text-muted-foreground line-clamp-2">
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
  // When a ceramic coating package is selected, only show ceramic add-ons
  const allowedCategories =
    selectedServiceCategory === "ceramicCoating"
      ? CERAMIC_ADDON_CATEGORIES
      : ADDON_CATEGORIES;

  const defaultTab =
    selectedServiceCategory === "ceramicCoating"
      ? "ceramicAddon"
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

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold">Pick a Date & Time</h2>
        <p className="text-muted-foreground">
          Select an available appointment slot (~{formatDuration(totalDuration)})
        </p>
      </div>

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
            className="rounded-lg border shadow-sm"
          />
        </div>

        <div className="flex-1">
          {data.date ? (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <CalendarIcon className="size-4" />
                {formatDate(data.date)}
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
}: {
  confirmationCode: string;
  data: BookingData;
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

      <p className="text-sm text-muted-foreground mb-4">
        Questions? Call us at{" "}
        <a
          href={`tel:${BUSINESS_PHONE}`}
          className="text-primary font-medium"
        >
          {BUSINESS_PHONE}
        </a>
      </p>

      <Button asChild variant="outline">
        <Link to="/book">Book Another Appointment</Link>
      </Button>
    </div>
  );
}

// ─── Main Booking Page ────────────────────────────────────────────────────────

export function BookingPage() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<BookingStep>("service");
  const [data, setData] = useState<BookingData>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState<string | null>(null);

  const catalog = useQuery(api.catalog.listActive, {});
  const createBooking = useMutation(api.bookings.create);

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

  const steps: BookingStep[] = [
    "service",
    "addons",
    "info",
    "datetime",
    "confirm",
  ];
  const stepIndex = steps.indexOf(step);
  const stepLabels = [
    "Service",
    "Add-Ons",
    "Your Info",
    "Date & Time",
    "Confirm",
  ];

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
        });
        setConfirmationCode(result.confirmationCode);
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
        <SuccessScreen confirmationCode={confirmationCode} data={data} />
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
