import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  Copy,
  DollarSign,
  ExternalLink,
  Headphones,
  Loader2,
  MapPin,
  Plus,
  Sparkles,
  User,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  { key: "service", label: "Service", icon: Sparkles },
  { key: "size", label: "Size", icon: ChevronRight },
  { key: "addons", label: "Add-Ons", icon: Plus },
  { key: "summary", label: "Summary", icon: DollarSign },
  { key: "customer", label: "Customer", icon: User },
  { key: "schedule", label: "Schedule", icon: Calendar },
  { key: "confirm", label: "Confirm", icon: Check },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

const SERVICE_TYPES = [
  { value: "full-detail", label: "Full Detail", category: "core" },
  { value: "interior", label: "Interior Only", category: "core" },
  { value: "exterior", label: "Exterior Only", category: "core" },
  { value: "boat", label: "Boat Detail", category: "boatDetailing" },
  { value: "paint-correction", label: "Paint Correction", category: "paintCorrection" },
  { value: "ceramic", label: "Ceramic Coating", category: "ceramicCoating" },
] as const;

type ServiceType = (typeof SERVICE_TYPES)[number]["value"];

const TIER_OPTIONS: Record<string, Array<{ value: string; label: string; slug: string; badge?: string; description?: string }>> = {
  "full-detail": [
    { value: "standard", label: "Standard", slug: "standard-inside-out", description: "Full interior + exterior refresh" },
    { value: "premium-interior", label: "Premium — Interior Focus", slug: "premium-inside-out-interior", badge: "Popular", description: "+Leather, Steam, Fragrance, UV Protection (10% off add-ons)" },
    { value: "premium-exterior", label: "Premium — Exterior Focus", slug: "premium-inside-out-exterior", badge: "Popular", description: "+Clay Bar, Iron Decon, 6mo Sealant, Trim Restore (10% off add-ons)" },
    { value: "elite", label: "Elite Ceramic", slug: "elite-inside-out", badge: "Best Protection", description: "+All add-ons with ceramic upgrades — Leather Shield, Ceramic Tire & Trim, 12mo Ceramic Wax (15% off)" },
  ],
  interior: [
    { value: "standard", label: "Standard", slug: "standard-interior-only", description: "Complete interior detail" },
    { value: "premium", label: "Premium", slug: "premium-interior-only", badge: "Recommended", description: "+Leather, Steam, Fragrance, UV Protection (10% off add-ons)" },
    { value: "elite", label: "Elite Ceramic", slug: "elite-interior-only", badge: "Best Protection", description: "+Steam, Fragrance, Fabric Protection, GYEON Leather Shield (15% off)" },
  ],
  exterior: [
    { value: "standard", label: "Standard", slug: "standard-exterior-only", description: "Professional exterior refresh" },
    { value: "premium", label: "Premium", slug: "premium-exterior-only", badge: "Most Popular", description: "+Clay Bar, Iron Decon, Sealant, Trim Restore (10% off add-ons)" },
    { value: "elite", label: "Elite Ceramic", slug: "elite-exterior-only", badge: "Best Protection", description: "+Clay Bar, Iron Decon, Ceramic Tire & Trim, 12mo Ceramic Wax (15% off)" },
  ],
};

const VEHICLE_SIZES = [
  { value: "Coupe/Sedan", label: "Coupe / Sedan" },
  { value: "Small SUV/Truck", label: "Small SUV / Truck" },
  { value: "Large 3-Row SUV/Off-Road Truck", label: "Large 3-Row SUV / Off-Road Truck" },
  { value: "Vans", label: "Van" },
] as const;

// Map (serviceType, tier) → add-on slugs already bundled in that package.
// These are hidden from the Add-Ons step so the customer doesn't double-select.
const TIER_INCLUDED_ADDONS: Record<string, Record<string, string[]>> = {
  "full-detail": {
    standard: [],
    "premium-interior": ["leather-clean", "steam-cleaning", "premium-fragrance", "uv-protection"],
    "premium-exterior": ["clay-bar", "iron-decontamination", "paint-protection", "trim-restoration"],
    elite: [
      "leather-clean", "steam-cleaning", "premium-fragrance", "uv-protection",
      "clay-bar", "iron-decontamination", "paint-protection", "trim-restoration",
      "gyeon-leather", "ceramic-tire", "plastic-ceramic",
    ],
  },
  interior: {
    standard: [],
    premium: ["leather-clean", "steam-cleaning", "premium-fragrance", "uv-protection"],
    elite: ["steam-cleaning", "premium-fragrance", "fabric-protection", "gyeon-leather"],
  },
  exterior: {
    standard: [],
    premium: ["clay-bar", "iron-decontamination", "paint-protection", "trim-restoration"],
    elite: ["clay-bar", "iron-decontamination", "ceramic-tire", "plastic-ceramic"],
  },
};

interface AddonSelection {
  catalogItemId: Id<"serviceCatalog">;
  name: string;
  variantLabel: string;
  price: number;
  durationMin: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtDuration(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function getAddonCategories(serviceType: ServiceType): string[] {
  switch (serviceType) {
    case "interior":
      return ["interiorAddon"];
    case "exterior":
      return ["exteriorAddon"];
    case "full-detail":
      return ["interiorAddon", "exteriorAddon"];
    case "paint-correction":
      return ["exteriorAddon"];
    case "ceramic":
      return ["ceramicAddon"];
    case "boat":
      return ["boatAddon", "boatCeramic"];
    default:
      return [];
  }
}

function matchesVehicleSize(variantLabel: string, selectedSize: string): boolean {
  const label = variantLabel.toLowerCase();
  const size = selectedSize.toLowerCase();

  if (size.includes("coupe") || size.includes("sedan")) {
    return label.includes("coupe") || label.includes("sedan") || label.includes("compact") || label.includes("all");
  }
  if (size.includes("small suv")) {
    return label.includes("small suv") || label.includes("small truck") || label.includes("midsize") || label.includes("all");
  }
  if (size.includes("large") || size.includes("3-row")) {
    return label.includes("large") || label.includes("suv/truck") || label.includes("3rd row") || label.includes("3-row") || label.includes("off-road") || label.includes("all");
  }
  if (size.includes("van")) {
    return label.includes("van") || label.includes("all");
  }
  return label.includes("all") || label.includes(size);
}

// ─── Step Components ──────────────────────────────────────────────────────────

function ServiceStep({
  value,
  tier,
  onChange,
  onTierChange,
}: {
  value: ServiceType | "";
  tier: string;
  onChange: (v: ServiceType) => void;
  onTierChange: (t: string) => void;
}) {
  const tiers = value ? TIER_OPTIONS[value] : null;
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold mb-1">What service?</h2>
        <p className="text-sm text-muted-foreground">Select the primary service for this booking</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SERVICE_TYPES.map((s) => (
          <button
            type="button"
            key={s.value}
            onClick={() => onChange(s.value)}
            className={`relative flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
              value === s.value
                ? "border-blue-600 bg-blue-50 dark:bg-blue-950/30 ring-1 ring-blue-600/30"
                : "border-border hover:border-blue-300 hover:bg-muted/50"
            }`}
          >
            <div
              className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${
                value === s.value
                  ? "bg-blue-600 text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <Sparkles className="size-5" />
            </div>
            <span className="font-semibold">{s.label}</span>
            {value === s.value && (
              <Check className="size-5 text-blue-600 absolute right-3" />
            )}
          </button>
        ))}
      </div>

      {/* Tier selection for core services */}
      {tiers && (
        <div className="mt-2 space-y-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-1">Choose Tier</h3>
            <p className="text-xs text-muted-foreground">Premium & Elite bundle popular add-ons at a discount</p>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {tiers.map((t) => {
              const isSelected = tier === t.value;
              return (
                <button
                  type="button"
                  key={t.value}
                  onClick={() => onTierChange(t.value)}
                  className={`relative flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                    isSelected
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-950/30 ring-1 ring-blue-600/30"
                      : "border-border hover:border-blue-300 hover:bg-muted/50"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{t.label}</span>
                      {t.badge && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                          {t.badge}
                        </span>
                      )}
                    </div>
                    {t.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                    )}
                  </div>
                  {isSelected && <Check className="size-5 text-blue-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SizeStep({
  serviceType,
  vehicleSize,
  boatLength,
  catalogItems,
  selectedSubService,
  onVehicleSizeChange,
  onBoatLengthChange,
  onSubServiceChange,
}: {
  serviceType: ServiceType;
  vehicleSize: string;
  boatLength: string;
  catalogItems: Array<{
    _id: Id<"serviceCatalog">;
    name: string;
    slug: string;
    category: string;
    variants: Array<{ label: string; price: number; durationMin: number }>;
  }>;
  selectedSubService: string;
  onVehicleSizeChange: (v: string) => void;
  onBoatLengthChange: (v: string) => void;
  onSubServiceChange: (v: string) => void;
}) {
  const isBoat = serviceType === "boat";
  const needsSubService = ["boat", "paint-correction", "ceramic"].includes(serviceType);

  // Get relevant sub-services for paint correction, ceramic, boat
  const subServices = useMemo(() => {
    if (!needsSubService) return [];
    const type = SERVICE_TYPES.find((s) => s.value === serviceType);
    if (!type) return [];
    return catalogItems.filter((c) => c.category === type.category);
  }, [catalogItems, serviceType, needsSubService]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold mb-1">
          {isBoat ? "Boat Size" : needsSubService ? "Service & Size" : "Vehicle Size"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {isBoat
            ? "Enter the boat length to calculate pricing"
            : needsSubService
              ? "Select the specific service and vehicle size"
              : "Select the customer's vehicle size"}
        </p>
      </div>

      {needsSubService && subServices.length > 0 && (
        <div className="space-y-2">
          <Label className="font-semibold">Specific Service</Label>
          <Select value={selectedSubService} onValueChange={onSubServiceChange}>
            <SelectTrigger className="h-12 text-base">
              <SelectValue placeholder="Select service..." />
            </SelectTrigger>
            <SelectContent>
              {subServices.map((s) => (
                <SelectItem key={s._id} value={s._id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {isBoat ? (
        <div className="space-y-3">
          <Label className="font-semibold">Boat Length (feet)</Label>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              placeholder="e.g., 25"
              value={boatLength}
              onChange={(e) => onBoatLengthChange(e.target.value)}
              className="h-14 text-2xl font-bold text-center max-w-[160px]"
              min={10}
              max={50}
            />
            <span className="text-lg text-muted-foreground">feet</span>
          </div>
          {boatLength && (
            <p className="text-sm text-muted-foreground">
              Size bracket:{" "}
              <span className="font-semibold text-foreground">
                {Number(boatLength) <= 20
                  ? "Up to 20 ft"
                  : Number(boatLength) <= 25
                    ? "21–25 ft"
                    : Number(boatLength) <= 30
                      ? "26–30 ft"
                      : "31–35 ft"}
              </span>
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <Label className="font-semibold">Vehicle Size</Label>
          <div className="grid grid-cols-1 gap-2">
            {VEHICLE_SIZES.map((vs) => (
              <button
                type="button"
                key={vs.value}
                onClick={() => onVehicleSizeChange(vs.value)}
                className={`flex items-center justify-between rounded-xl border-2 p-4 transition-all ${
                  vehicleSize === vs.value
                    ? "border-blue-600 bg-blue-50 dark:bg-blue-950/30"
                    : "border-border hover:border-blue-300"
                }`}
              >
                <span className="font-medium">{vs.label}</span>
                {vehicleSize === vs.value && (
                  <Check className="size-5 text-blue-600" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AddonsStep({
  serviceType,
  addonItems,
  selectedAddons,
  onToggleAddon,
  excludedSlugs = [],
}: {
  serviceType: ServiceType;
  addonItems: Array<{
    _id: Id<"serviceCatalog">;
    name: string;
    slug?: string;
    category: string;
    variants: Array<{ label: string; price: number; durationMin: number }>;
  }>;
  selectedAddons: AddonSelection[];
  onToggleAddon: (
    item: {
      _id: Id<"serviceCatalog">;
      name: string;
      variants: Array<{ label: string; price: number; durationMin: number }>;
    },
    variantIdx: number,
  ) => void;
  excludedSlugs?: string[];
}) {
  const categories = getAddonCategories(serviceType);
  const excludeSet = new Set(excludedSlugs);
  const relevant = addonItems.filter(
    (a) => categories.includes(a.category) && !excludeSet.has(a.slug ?? ""),
  );

  if (relevant.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Add-Ons</h2>
        <p className="text-muted-foreground">No add-ons available for this service.</p>
      </div>
    );
  }

  // Group by category
  const grouped = categories.reduce(
    (acc, cat) => {
      const items = relevant.filter((a) => a.category === cat);
      if (items.length) acc[cat] = items;
      return acc;
    },
    {} as Record<string, typeof relevant>,
  );

  const catLabels: Record<string, string> = {
    interiorAddon: "Interior Add-Ons",
    exteriorAddon: "Exterior Add-Ons",
    ceramicAddon: "Ceramic Add-Ons",
    boatAddon: "Boat Add-Ons",
    boatCeramic: "Boat Ceramic Coatings",
  };

  const totalAddonPrice = selectedAddons.reduce((sum, a) => sum + a.price, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold mb-1">Add-Ons</h2>
          <p className="text-sm text-muted-foreground">Select additional services</p>
        </div>
        {totalAddonPrice > 0 && (
          <Badge variant="secondary" className="text-base font-bold px-3 py-1">
            +{fmt(totalAddonPrice)}
          </Badge>
        )}
      </div>

      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat} className="space-y-2">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
            {catLabels[cat] ?? cat}
          </h3>
          <div className="space-y-1.5">
            {items.map((item) =>
              item.variants.map((v, vi) => {
                const isSelected = selectedAddons.some(
                  (a) => a.catalogItemId === item._id && a.variantLabel === v.label,
                );
                return (
                  <button
                    type="button"
                    key={`${item._id}-${vi}`}
                    onClick={() => onToggleAddon(item, vi)}
                    className={`w-full flex items-center justify-between rounded-lg border p-3 transition-all text-left ${
                      isSelected
                        ? "border-blue-600 bg-blue-50 dark:bg-blue-950/30"
                        : "border-border hover:border-blue-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox checked={isSelected} className="pointer-events-none" />
                      <div>
                        <p className="font-medium text-sm">
                          {item.name}
                          {item.variants.length > 1 && (
                            <span className="text-muted-foreground"> — {v.label}</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="size-3" />
                          {fmtDuration(v.durationMin)}
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-sm whitespace-nowrap">
                      {fmt(v.price)}
                    </span>
                  </button>
                );
              }),
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function SummaryStep({
  serviceType,
  serviceName,
  vehicleSize,
  boatLength,
  basePrice,
  baseDuration,
  selectedAddons,
  notes,
  onNotesChange,
}: {
  serviceType: ServiceType;
  serviceName: string;
  vehicleSize: string;
  boatLength: string;
  basePrice: number;
  baseDuration: number;
  selectedAddons: AddonSelection[];
  notes: string;
  onNotesChange: (v: string) => void;
}) {
  const addonTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0);
  const addonDuration = selectedAddons.reduce((sum, a) => sum + a.durationMin, 0);
  const total = basePrice + addonTotal;
  const totalDur = baseDuration + addonDuration;

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold">Booking Summary</h2>

      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{serviceName}</p>
              <p className="text-sm text-muted-foreground">
                {serviceType === "boat"
                  ? `${boatLength} ft boat`
                  : vehicleSize || "—"}
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold text-lg">{fmt(basePrice)}</p>
              <p className="text-xs text-muted-foreground">{fmtDuration(baseDuration)}</p>
            </div>
          </div>

          {selectedAddons.length > 0 && (
            <>
              <div className="border-t pt-3 space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Add-Ons
                </p>
                {selectedAddons.map((a, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span>
                      {a.name}
                      {a.variantLabel !== "Standard" && ` — ${a.variantLabel}`}
                    </span>
                    <span className="font-semibold">{fmt(a.price)}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="border-t pt-3 flex items-center justify-between">
            <div>
              <p className="font-bold text-lg">Total</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="size-3" />
                Est. {fmtDuration(totalDur)}
              </p>
            </div>
            <p className="text-2xl font-black text-blue-600">{fmt(total)}</p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Label className="font-semibold">Notes</Label>
        <Textarea
          placeholder="Gate codes, special instructions, vehicle condition..."
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          className="min-h-[80px]"
        />
      </div>
    </div>
  );
}

function CustomerStep({
  name,
  phone,
  email,
  address,
  city,
  zip,
  vehicleInfo,
  customerNotes,
  onChange,
}: {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  zip: string;
  vehicleInfo: string;
  customerNotes: string;
  onChange: (field: string, value: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold mb-1">Customer Info</h2>
        <p className="text-sm text-muted-foreground">Capture customer details for this booking</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="font-semibold">Full Name *</Label>
          <Input
            placeholder="John Smith"
            value={name}
            onChange={(e) => onChange("name", e.target.value)}
            className="h-12 text-base"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="font-semibold">Phone *</Label>
          <Input
            type="tel"
            placeholder="(980) 555-1234"
            value={phone}
            onChange={(e) => onChange("phone", e.target.value)}
            className="h-12 text-base"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="font-semibold">Email</Label>
          <Input
            type="email"
            placeholder="john@example.com"
            value={email}
            onChange={(e) => onChange("email", e.target.value)}
            className="h-12 text-base"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="font-semibold">Service Address *</Label>
          <Input
            placeholder="123 Main St"
            value={address}
            onChange={(e) => onChange("address", e.target.value)}
            className="h-12 text-base"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="font-semibold">City</Label>
          <Input
            placeholder="Charlotte"
            value={city}
            onChange={(e) => onChange("city", e.target.value)}
            className="h-12 text-base"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="font-semibold">ZIP Code *</Label>
          <Input
            placeholder="28205"
            value={zip}
            onChange={(e) => onChange("zip", e.target.value)}
            className="h-12 text-base"
            maxLength={5}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="font-semibold">Vehicle / Boat Details</Label>
          <Input
            placeholder="2024 BMW X5, Black"
            value={vehicleInfo}
            onChange={(e) => onChange("vehicleInfo", e.target.value)}
            className="h-12 text-base"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="font-semibold">Additional Notes</Label>
          <Textarea
            placeholder="Any other details..."
            value={customerNotes}
            onChange={(e) => onChange("customerNotes", e.target.value)}
            className="min-h-[60px]"
          />
        </div>
      </div>
    </div>
  );
}

function ScheduleStep({
  date,
  time,
  zip,
  duration,
  onDateChange,
  onTimeChange,
}: {
  date: string;
  time: string;
  zip: string;
  duration: number;
  onDateChange: (v: string) => void;
  onTimeChange: (v: string) => void;
}) {
  // Session variable: track ZIP changes to reset date/time selection
  const prevZipRef = useRef(zip);
  useEffect(() => {
    if (prevZipRef.current && prevZipRef.current !== zip) {
      // ZIP changed (user went back and edited it) — clear stale selection
      onDateChange("");
      onTimeChange("");
    }
    prevZipRef.current = zip;
  }, [zip, onDateChange, onTimeChange]);

  const slots = useQuery(
    api.availability.getAvailableSlots,
    date ? { date, durationMinutes: duration, zipCode: zip || undefined } : "skip",
  );

  // Generate next 21 available dates (3 weeks out)
  const availableDates = useMemo(() => {
    const dates: string[] = [];
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() + 1);
    for (let i = 0; i < 45 && dates.length < 21; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const dayOfWeek = d.getDay();
      if (dayOfWeek !== 0) {
        const dateStr = d.toISOString().split("T")[0];
        dates.push(dateStr);
      }
    }
    return dates;
  }, []);

  // Date range for ZIP clustering query
  const dateRange = useMemo(() => {
    if (availableDates.length === 0) return null;
    return { start: availableDates[0], end: availableDates[availableDates.length - 1] };
  }, [availableDates]);

  // Tier 1: exact ZIP match dates
  const zipDateCounts = useQuery(
    api.availability.getRecommendedDatesByZip,
    zip && zip.trim().length >= 3 && dateRange
      ? { zipCode: zip.trim(), startDate: dateRange.start, endDate: dateRange.end }
      : "skip",
  );

  // Tier 1.5: nearby ZIP (same 3-digit prefix) dates
  const nearbyZipDates = useQuery(
    api.availability.getNearbyZipDates,
    zip && zip.trim().length >= 3 && dateRange
      ? { zipCode: zip.trim(), startDate: dateRange.start, endDate: dateRange.end }
      : "skip",
  );

  // Split dates into tiers
  const { tier1Dates, tier15Dates, tier2Dates } = useMemo(() => {
    const t1: string[] = [];
    const t15: string[] = [];
    const t2: string[] = [];
    for (const d of availableDates) {
      if (zipDateCounts && zipDateCounts[d]) {
        t1.push(d);
      } else if (nearbyZipDates && nearbyZipDates[d]) {
        t15.push(d);
      } else {
        t2.push(d);
      }
    }
    return { tier1Dates: t1, tier15Dates: t15, tier2Dates: t2 };
  }, [availableDates, zipDateCounts, nearbyZipDates]);

  const hasZipClustering = !!(zip && zip.trim().length >= 3);
  const hasTier1 = tier1Dates.length > 0;
  const hasTier15 = tier15Dates.length > 0;

  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${dayNames[d.getUTCDay()]} ${monthNames[d.getUTCMonth()]} ${d.getUTCDate()}`;
  };

  const formatTime12 = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
  };

  // Separate recommended from regular time slots
  const recommended = (slots || []).filter((s: { time: string; recommended: boolean }) => s.recommended);
  const regular = (slots || []).filter((s: { time: string; recommended: boolean }) => !s.recommended);

  const DateButton = ({ d, tier }: { d: string; tier: "exact" | "nearby" | "other" }) => {
    const isSelected = date === d;
    const count = tier === "exact" ? (zipDateCounts as Record<string, number>)?.[d] : tier === "nearby" ? (nearbyZipDates as Record<string, { count: number; zips: string[] }>)?.[d]?.count : 0;
    return (
      <button
        type="button"
        onClick={() => { onDateChange(d); onTimeChange(""); }}
        className={`rounded-lg border-2 p-2.5 text-center transition-all text-sm font-medium relative ${
          isSelected
            ? "border-blue-600 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 ring-2 ring-blue-300"
            : tier === "exact"
              ? "border-amber-300 bg-amber-50/60 dark:border-amber-700 dark:bg-amber-950/20 hover:border-amber-500 hover:bg-amber-50"
              : tier === "nearby"
                ? "border-orange-200 bg-orange-50/40 dark:border-orange-800 dark:bg-orange-950/10 hover:border-orange-400"
                : "border-border hover:border-blue-300"
        }`}
      >
        {formatDateLabel(d)}
        {tier === "exact" && !!count && !isSelected && (
          <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white text-[10px] font-bold rounded-full size-4 flex items-center justify-center">
            {count}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold mb-1">Schedule</h2>
        <p className="text-sm text-muted-foreground">
          {hasZipClustering
            ? `Smart scheduling for ZIP ${zip} — route-optimized dates shown first`
            : "Pick a date and time for this booking"}
        </p>
      </div>

      {/* Date selection — Tiered */}
      <div className="space-y-3">
        {/* Tier 1: Exact ZIP match */}
        {hasZipClustering && hasTier1 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="size-4 text-amber-500" />
              <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                Best Dates — same area ({zip})
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {tier1Dates.map((d) => (
                <DateButton key={d} d={d} tier="exact" />
              ))}
            </div>
          </div>
        )}

        {/* Tier 1.5: Nearby ZIP */}
        {hasZipClustering && hasTier15 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <MapPin className="size-4 text-orange-400" />
              <span className="text-sm font-semibold text-orange-500 dark:text-orange-400">
                Nearby Area Dates
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {tier15Dates.map((d) => (
                <DateButton key={d} d={d} tier="nearby" />
              ))}
            </div>
          </div>
        )}

        {/* Tier 2: All other dates (always shown as fallback) */}
        <div className="space-y-2">
          {hasZipClustering && (hasTier1 || hasTier15) ? (
            <span className="text-sm font-semibold text-muted-foreground">All Other Available Dates</span>
          ) : (
            <Label className="font-semibold">Select Date</Label>
          )}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {(hasZipClustering ? tier2Dates : availableDates).map((d) => (
              <DateButton key={d} d={d} tier="other" />
            ))}
          </div>
        </div>

        {/* Manual date fallback */}
        <div className="flex items-center gap-2 pt-1">
          <Label className="text-sm text-muted-foreground whitespace-nowrap">Or pick:</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => {
              onDateChange(e.target.value);
              onTimeChange("");
            }}
            className="h-10 max-w-[180px]"
          />
        </div>
      </div>

      {/* Time selection */}
      {date && (
        <div className="space-y-2">
          <Label className="font-semibold">Select Time</Label>
          {!slots ? (
            <div className="flex items-center gap-2 text-muted-foreground py-4">
              <Loader2 className="size-4 animate-spin" />
              Loading available times...
            </div>
          ) : slots.length === 0 ? (
            <p className="text-muted-foreground py-4">No available times on this date.</p>
          ) : (
            <div className="space-y-3">
              {recommended.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Zap className="size-4 text-amber-500" />
                    <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                      Recommended — same area
                    </span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {recommended.map((s: { time: string; recommended: boolean }) => (
                      <button
                        type="button"
                        key={s.time}
                        onClick={() => onTimeChange(s.time)}
                        className={`rounded-lg border-2 p-2.5 text-center font-medium text-sm transition-all ${
                          time === s.time
                            ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-700"
                            : "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/10 hover:border-amber-400"
                        }`}
                      >
                        {formatTime12(s.time)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {regular.length > 0 && (
                <div className="space-y-2">
                  {recommended.length > 0 && (
                    <span className="text-sm font-semibold text-muted-foreground">Other times</span>
                  )}
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {regular.map((s: { time: string; recommended: boolean }) => (
                      <button
                        type="button"
                        key={s.time}
                        onClick={() => onTimeChange(s.time)}
                        className={`rounded-lg border-2 p-2.5 text-center font-medium text-sm transition-all ${
                          time === s.time
                            ? "border-blue-600 bg-blue-50 dark:bg-blue-950/30 text-blue-700"
                            : "border-border hover:border-blue-300"
                        }`}
                      >
                        {formatTime12(s.time)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// ─── Main Page ────────────────────────────────────────────────────────────────

export function ReceptionistPage({ standalone = false }: { standalone?: boolean }) {
  const navigate = useNavigate();
  const catalog = useQuery(api.catalog.listActive, {});
  const createBooking = useMutation(api.bookings.create);

  // State
  const [step, setStep] = useState<StepKey>("service");
  const [serviceType, setServiceType] = useState<ServiceType | "">("");
  const [tier, setTier] = useState("");
  const [subService, setSubService] = useState("");
  const [vehicleSize, setVehicleSize] = useState("");
  const [boatLength, setBoatLength] = useState("");
  const [selectedAddons, setSelectedAddons] = useState<AddonSelection[]>([]);
  const [notes, setNotes] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerCity, setCustomerCity] = useState("");
  const [customerZip, setCustomerZip] = useState("");
  const [vehicleInfo, setVehicleInfo] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const stepIdx = STEPS.findIndex((s) => s.key === step);

  // Reset dependent state when service changes
  useEffect(() => {
    setTier("");
    setVehicleSize("");
    setBoatLength("");
    setSubService("");
    setSelectedAddons([]);
  }, [serviceType]);

  // Resolve catalog item + price
  const { catalogItemId, serviceName, basePrice, baseDuration } = useMemo(() => {
    if (!catalog || !serviceType) return { catalogItemId: null, serviceName: "", basePrice: 0, baseDuration: 120 };

    const svc = SERVICE_TYPES.find((s) => s.value === serviceType);
    if (!svc) return { catalogItemId: null, serviceName: "", basePrice: 0, baseDuration: 120 };

    // For sub-service types, use the sub-service selection
    if (["boat", "paint-correction", "ceramic"].includes(serviceType) && subService) {
      const item = catalog.find((c) => c._id === subService);
      if (item) {
        // For boats, find variant by boat length bracket
        if (serviceType === "boat" && boatLength) {
          const len = Number(boatLength);
          const bracket =
            len <= 20 ? "Up to 20" : len <= 25 ? "21" : len <= 30 ? "26" : "31";
          const variant = item.variants.find((v) =>
            v.label.includes(bracket),
          ) || item.variants[0];
          return {
            catalogItemId: item._id,
            serviceName: item.name,
            basePrice: variant?.price || 0,
            baseDuration: variant?.durationMin || 120,
          };
        }
        // For paint correction/ceramic with vehicle size
        if (vehicleSize) {
          const variant = item.variants.find((v) =>
            matchesVehicleSize(v.label, vehicleSize),
          ) || item.variants[0];
          return {
            catalogItemId: item._id,
            serviceName: item.name,
            basePrice: variant?.price || 0,
            baseDuration: variant?.durationMin || 120,
          };
        }
        return {
          catalogItemId: item._id,
          serviceName: item.name,
          basePrice: item.variants[0]?.price || 0,
          baseDuration: item.variants[0]?.durationMin || 120,
        };
      }
    }

    // For core services, resolve slug from tier selection
    const tiers = TIER_OPTIONS[serviceType as string];
    const resolvedSlug = tiers
      ? (tiers.find((t) => t.value === tier)?.slug ?? "")
      : "";

    if (resolvedSlug) {
      const item = catalog.find((c) => c.slug === resolvedSlug);
      if (item && vehicleSize) {
        const variant = item.variants.find((v) =>
          matchesVehicleSize(v.label, vehicleSize),
        ) || item.variants[0];
        return {
          catalogItemId: item._id,
          serviceName: item.name,
          basePrice: variant?.price || 0,
          baseDuration: variant?.durationMin || 120,
        };
      }
      if (item) {
        return {
          catalogItemId: item._id,
          serviceName: item.name,
          basePrice: item.variants[0]?.price || 0,
          baseDuration: item.variants[0]?.durationMin || 120,
        };
      }
    }

    return { catalogItemId: null, serviceName: svc.label, basePrice: 0, baseDuration: 120 };
  }, [catalog, serviceType, tier, vehicleSize, boatLength, subService]);

  // Resolve selected variant label
  const selectedVariantLabel = useMemo(() => {
    if (!catalog || !catalogItemId) return undefined;
    const item = catalog.find((c) => c._id === catalogItemId);
    if (!item) return undefined;

    if (serviceType === "boat" && boatLength) {
      const len = Number(boatLength);
      const bracket = len <= 20 ? "Up to 20" : len <= 25 ? "21" : len <= 30 ? "26" : "31";
      const variant = item.variants.find((v) => v.label.includes(bracket));
      return variant?.label;
    }
    if (vehicleSize) {
      const variant = item.variants.find((v) => matchesVehicleSize(v.label, vehicleSize));
      return variant?.label;
    }
    return item.variants[0]?.label;
  }, [catalog, catalogItemId, serviceType, vehicleSize, boatLength]);

  // Toggle addon
  const toggleAddon = useCallback(
    (
      item: {
        _id: Id<"serviceCatalog">;
        name: string;
        variants: Array<{ label: string; price: number; durationMin: number }>;
      },
      variantIdx: number,
    ) => {
      const v = item.variants[variantIdx];
      if (!v) return;
      setSelectedAddons((prev) => {
        const exists = prev.findIndex(
          (a) => a.catalogItemId === item._id && a.variantLabel === v.label,
        );
        if (exists >= 0) return prev.filter((_, i) => i !== exists);
        return [
          ...prev,
          {
            catalogItemId: item._id,
            name: item.name,
            variantLabel: v.label,
            price: v.price,
            durationMin: v.durationMin,
          },
        ];
      });
    },
    [],
  );

  // Step validation
  const canAdvance = useMemo(() => {
    switch (step) {
      case "service": {
        if (!serviceType) return false;
        const tiers = TIER_OPTIONS[serviceType as string];
        return tiers ? !!tier : true;
      }
      case "size":
        if (serviceType === "boat") return !!boatLength && !!subService;
        if (["paint-correction", "ceramic"].includes(serviceType as string))
          return !!vehicleSize && !!subService;
        return !!vehicleSize;
      case "addons":
        return true; // optional
      case "summary":
        return true;
      case "customer":
        return !!customerName && !!customerPhone && !!customerAddress && !!customerZip;
      case "schedule":
        return !!date && !!time;
      case "confirm":
        return true;
      default:
        return false;
    }
  }, [step, serviceType, tier, vehicleSize, boatLength, subService, customerName, customerPhone, customerAddress, customerZip, date, time]);

  const goNext = () => {
    const idx = stepIdx + 1;
    if (idx < STEPS.length) setStep(STEPS[idx].key);
  };
  const goBack = () => {
    const idx = stepIdx - 1;
    if (idx >= 0) setStep(STEPS[idx].key);
  };

  // Submit booking
  const handleSubmit = async () => {
    if (!catalogItemId) return;
    setSubmitting(true);
    try {
      const addonTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0);
      const addonDuration = selectedAddons.reduce((sum, a) => sum + a.durationMin, 0);

      const fullAddress = [customerAddress, customerCity, customerZip]
        .filter(Boolean)
        .join(", ");

      const allNotes = [
        notes,
        vehicleInfo ? `Vehicle: ${vehicleInfo}` : "",
        customerNotes,
        serviceType === "boat" && boatLength ? `Boat length: ${boatLength} ft` : "",
      ]
        .filter(Boolean)
        .join("\n");

      await createBooking({
        customerName,
        customerPhone,
        customerEmail: customerEmail || "",
        serviceAddress: fullAddress,
        zipCode: customerZip || undefined,
        catalogItemId,
        selectedVariant: selectedVariantLabel,
        addons: selectedAddons.map((a) => ({
          catalogItemId: a.catalogItemId,
          name: a.name,
          variantLabel: a.variantLabel,
          price: a.price,
          durationMin: a.durationMin,
        })),
        serviceName,
        price: basePrice,
        totalPrice: basePrice + addonTotal,
        totalDuration: baseDuration + addonDuration,
        date,
        time,
        notes: allNotes || undefined,
      });

      toast.success("Booking created!", { description: `${serviceName} for ${customerName}` });
      if (standalone) {
        // Reset form for next booking in standalone mode
        setStep("service");
        setServiceType("");
        setTier("");
        setSubService("");
        setVehicleSize("");
        setBoatLength("");
        setSelectedAddons([]);
        setNotes("");
        setCustomerName("");
        setCustomerPhone("");
        setCustomerEmail("");
        setDate("");
        setTime("");
      } else {
        navigate("/bookings");
      }
    } catch (err) {
      toast.error("Failed to create booking", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const totalPrice = basePrice + selectedAddons.reduce((sum, a) => sum + a.price, 0);
  const totalDuration = baseDuration + selectedAddons.reduce((sum, a) => sum + a.durationMin, 0);

  const handleCustomerFieldChange = (field: string, value: string) => {
    switch (field) {
      case "name": setCustomerName(value); break;
      case "phone": setCustomerPhone(value); break;
      case "email": setCustomerEmail(value); break;
      case "address": setCustomerAddress(value); break;
      case "city": setCustomerCity(value); break;
      case "zip": setCustomerZip(value); break;
      case "vehicleInfo": setVehicleInfo(value); break;
      case "customerNotes": setCustomerNotes(value); break;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="size-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Headphones className="size-5" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Receptionist Booking</h1>
            <p className="text-sm text-blue-100">Fast phone intake → quote → book</p>
          </div>
          {/* Share link button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-medium transition-colors"
              onClick={() => {
                const url = `${window.location.origin}/intake`;
                navigator.clipboard.writeText(url);
                toast.success("Customer booking link copied!");
              }}
              title="Copy customer booking link"
            >
              <Copy className="size-3.5" /> Copy Link
            </button>
            <a
              href="/intake"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-medium transition-colors"
              title="Open customer intake page"
            >
              <ExternalLink className="size-3.5" /> Preview
            </a>
          </div>
          {totalPrice > 0 && (
            <div className="text-right">
              <p className="text-2xl font-black">{fmt(totalPrice)}</p>
              <p className="text-xs text-blue-200">{fmtDuration(totalDuration)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Step indicator */}
      <div className="border-b bg-muted/30">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center gap-1 overflow-x-auto">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isActive = i === stepIdx;
              const isDone = i < stepIdx;
              return (
                <button
                  type="button"
                  key={s.key}
                  onClick={() => {
                    if (i < stepIdx) setStep(s.key);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : isDone
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 cursor-pointer hover:bg-blue-200"
                        : "text-muted-foreground"
                  }`}
                  disabled={i > stepIdx}
                >
                  {isDone ? (
                    <Check className="size-3.5" />
                  ) : (
                    <Icon className="size-3.5" />
                  )}
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {step === "service" && (
            <ServiceStep value={serviceType} tier={tier} onChange={setServiceType} onTierChange={setTier} />
          )}
          {step === "size" && (
            <SizeStep
              serviceType={serviceType as ServiceType}
              vehicleSize={vehicleSize}
              boatLength={boatLength}
              catalogItems={catalog ?? []}
              selectedSubService={subService}
              onVehicleSizeChange={setVehicleSize}
              onBoatLengthChange={setBoatLength}
              onSubServiceChange={setSubService}
            />
          )}
          {step === "addons" && (
            <AddonsStep
              serviceType={serviceType as ServiceType}
              addonItems={catalog ?? []}
              selectedAddons={selectedAddons}
              onToggleAddon={toggleAddon}
              excludedSlugs={TIER_INCLUDED_ADDONS[serviceType]?.[tier] ?? []}
            />
          )}
          {step === "summary" && (
            <SummaryStep
              serviceType={serviceType as ServiceType}
              serviceName={serviceName}
              vehicleSize={vehicleSize}
              boatLength={boatLength}
              basePrice={basePrice}
              baseDuration={baseDuration}
              selectedAddons={selectedAddons}
              notes={notes}
              onNotesChange={setNotes}
            />
          )}
          {step === "customer" && (
            <CustomerStep
              name={customerName}
              phone={customerPhone}
              email={customerEmail}
              address={customerAddress}
              city={customerCity}
              zip={customerZip}
              vehicleInfo={vehicleInfo}
              customerNotes={customerNotes}
              onChange={handleCustomerFieldChange}
            />
          )}
          {step === "schedule" && (
            <ScheduleStep
              date={date}
              time={time}
              zip={customerZip}
              duration={totalDuration}
              onDateChange={setDate}
              onTimeChange={setTime}
            />
          )}
          {step === "confirm" && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold">Confirm & Book</h2>
              <Card>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start gap-3">
                    <User className="size-5 text-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold">{customerName}</p>
                      <p className="text-sm text-muted-foreground">{customerPhone}{customerEmail ? ` · ${customerEmail}` : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="size-5 text-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm">{customerAddress}</p>
                      <p className="text-sm text-muted-foreground">
                        {[customerCity, customerZip].filter(Boolean).join(", ")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Sparkles className="size-5 text-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold">{serviceName}</p>
                      <p className="text-sm text-muted-foreground">
                        {serviceType === "boat" ? `${boatLength} ft` : vehicleSize}
                        {selectedAddons.length > 0 && ` + ${selectedAddons.length} add-on${selectedAddons.length > 1 ? "s" : ""}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="size-5 text-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold">
                        {new Date(date + "T12:00:00").toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {(() => {
                          const [h, m] = time.split(":").map(Number);
                          const ampm = h >= 12 ? "PM" : "AM";
                          const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
                          return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
                        })()}{" "}
                        · Est. {fmtDuration(totalDuration)}
                      </p>
                    </div>
                  </div>
                  <div className="border-t pt-3 flex items-center justify-between">
                    <span className="font-bold text-lg">Total</span>
                    <span className="text-2xl font-black text-blue-600">{fmt(totalPrice)}</span>
                  </div>
                </CardContent>
              </Card>
              <Button
                size="lg"
                className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-5 animate-spin" />
                    Creating Booking...
                  </>
                ) : (
                  <>
                    <Check className="size-5" />
                    Confirm Booking
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom nav */}
      {step !== "confirm" && (
        <div className="border-t bg-background">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={goBack}
              disabled={stepIdx === 0}
              className="h-11"
            >
              <ArrowLeft className="size-4" />
              Back
            </Button>
            <Button
              onClick={goNext}
              disabled={!canAdvance}
              className="h-11 bg-blue-600 hover:bg-blue-700 font-semibold px-6"
            >
              {step === "schedule" ? "Review" : "Next"}
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
