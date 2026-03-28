import { useMutation, useQuery } from "convex/react";
import {
  CalendarPlus,
  Check,
  Clock,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

// ─── Types ────────────────────────────────────────────────────────────────────

type CatalogItem = {
  _id: Id<"serviceCatalog">;
  name: string;
  category: string;
  variants: Array<{ label: string; price: number; durationMin: number }>;
  isActive: boolean;
  sortOrder: number;
};

type Customer = {
  _id: Id<"customers">;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  zipCode?: string;
};

type StaffMember = {
  _id: Id<"staff">;
  name: string;
  role: string;
  isActive: boolean;
};

interface AddonEntry {
  catalogItemId?: Id<"serviceCatalog">;
  name: string;
  variantLabel?: string;
  price: number;
  durationMin: number;
}

const addonCategories = [
  "interiorAddon",
  "exteriorAddon",
  "ceramicAddon",
  "boatAddon",
  "paintCorrection",
];

const categoryLabels: Record<string, string> = {
  interiorAddon: "Interior Add-Ons",
  exteriorAddon: "Exterior Add-Ons",
  ceramicAddon: "Ceramic Add-Ons",
  boatAddon: "Boat Add-Ons",
  paintCorrection: "Paint Correction",
  core: "Core Services",
  ceramicCoating: "Ceramic Coating",
  boatDetailing: "Boat Detailing",
  boatCeramic: "Boat Ceramic",
  membership: "Memberships",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
}

function formatTime12(h: number, m: number): string {
  const safeH = Number.isFinite(h) ? h : 0;
  const safeM = Number.isFinite(m) ? m : 0;
  const ampm = safeH >= 12 ? "PM" : "AM";
  const hour = safeH % 12 || 12;
  return `${hour}:${safeM.toString().padStart(2, "0")} ${ampm}`;
}

function formatDateDisplay(dateStr: string): string {
  if (!dateStr || !dateStr.includes("-")) return "—";
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return "—";
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

interface QuickBookDialogProps {
  open: boolean;
  onClose: () => void;
  initialDate: string; // YYYY-MM-DD
  initialTime: string; // HH:MM
}

export function QuickBookDialog({
  open,
  onClose,
  initialDate,
  initialTime,
}: QuickBookDialogProps) {
  const navigate = useNavigate();
  const createBooking = useMutation(api.bookings.adminCreate);
  const catalog = useQuery(api.catalog.listActive, {});
  const customers = useQuery(api.customers.list, { search: "" });
  const staffList = useQuery(api.staff.listActive);

  // ─── Form state ──────────────────────────────────────────
  const [step, setStep] = useState<"service" | "customer" | "review">("service");
  const [submitting, setSubmitting] = useState(false);

  // Service
  const [selectedService, setSelectedService] = useState<CatalogItem | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string>("");
  const [serviceSearch, setServiceSearch] = useState("");

  // Customer
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [serviceAddress, setServiceAddress] = useState("");
  const [zipCode, setZipCode] = useState("");

  // Schedule — default to valid values so first render never crashes
  const [date, setDate] = useState(initialDate || new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState(initialTime || "09:00");

  // Staff
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);

  // Add-ons
  const [addons, setAddons] = useState<AddonEntry[]>([]);
  const [showAddonPicker, setShowAddonPicker] = useState(false);
  const [showCustomItem, setShowCustomItem] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [customDuration, setCustomDuration] = useState("30");

  // Notes
  const [notes, setNotes] = useState("");

  // ─── Reset on open ───────────────────────────────────────
  useEffect(() => {
    if (open) {
      setStep("service");
      setSelectedService(null);
      setSelectedVariant("");
      setServiceSearch("");
      setCustomerSearch("");
      setSelectedCustomer(null);
      setIsNewCustomer(false);
      setCustomerName("");
      setCustomerPhone("");
      setCustomerEmail("");
      setServiceAddress("");
      setZipCode("");
      setDate(initialDate);
      setTime(initialTime);
      setSelectedStaff(null);
      setAddons([]);
      setShowAddonPicker(false);
      setShowCustomItem(false);
      setCustomName("");
      setCustomPrice("");
      setCustomDuration("30");
      setNotes("");
      setSubmitting(false);
    }
  }, [open, initialDate, initialTime]);

  // ─── Filtered catalog ────────────────────────────────────
  const filteredCatalog = useMemo(() => {
    if (!catalog) return [];
    const q = serviceSearch.toLowerCase().trim();
    if (!q) return catalog;
    return catalog.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q),
    );
  }, [catalog, serviceSearch]);

  // Group catalog by category
  const groupedCatalog = useMemo(() => {
    const groups: Record<string, CatalogItem[]> = {};
    for (const item of filteredCatalog) {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    }
    return groups;
  }, [filteredCatalog]);

  // ─── Filtered customers ─────────────────────────────────
  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    const q = customerSearch.toLowerCase().trim();
    if (!q) return customers.slice(0, 8);
    return customers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.phone?.includes(q),
      )
      .slice(0, 8);
  }, [customers, customerSearch]);

  // ─── Selected variant info ──────────────────────────────
  const variantInfo = useMemo(() => {
    if (!selectedService) return null;
    if (selectedService.variants.length === 1) return selectedService.variants[0];
    return selectedService.variants.find((v) => v.label === selectedVariant) || null;
  }, [selectedService, selectedVariant]);

  // ─── Parse time (use initialTime as fallback before effect syncs) ────
  const effectiveTime = time && time.includes(":") ? time : initialTime && initialTime.includes(":") ? initialTime : "09:00";
  const [timeH, timeM] = effectiveTime.split(":").map(Number);

  // ─── Add-on helpers ─────────────────────────────────────
  const addonCatalogItems = useMemo(() => {
    if (!catalog) return [];
    return catalog.filter((c) => addonCategories.includes(c.category));
  }, [catalog]);

  const groupedAddonCatalog = useMemo(() => {
    const groups: Record<string, CatalogItem[]> = {};
    for (const item of addonCatalogItems) {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    }
    return groups;
  }, [addonCatalogItems]);

  const addonTotal = addons.reduce((s, a) => s + a.price, 0);
  const totalPrice = (variantInfo?.price || 0) + addonTotal;
  const totalDuration = (variantInfo?.durationMin || 0) + addons.reduce((s, a) => s + a.durationMin, 0);

  const handleAddAddon = (item: CatalogItem, variantIdx: number) => {
    const variant = item.variants[variantIdx];
    if (!variant) return;
    setAddons((prev) => [
      ...prev,
      {
        catalogItemId: item._id,
        name: item.name,
        variantLabel: variant.label,
        price: variant.price,
        durationMin: variant.durationMin,
      },
    ]);
    setShowAddonPicker(false);
  };

  const handleRemoveAddon = (index: number) => {
    setAddons((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddCustomItem = () => {
    const priceCents = Math.round(Number.parseFloat(customPrice || "0") * 100);
    if (!customName.trim() || priceCents <= 0) return;
    setAddons((prev) => [
      ...prev,
      {
        name: customName.trim(),
        price: priceCents,
        durationMin: Number.parseInt(customDuration || "30", 10),
      },
    ]);
    setCustomName("");
    setCustomPrice("");
    setCustomDuration("30");
    setShowCustomItem(false);
  };

  // ─── Submit ─────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!selectedService || !variantInfo) return;
    const cName = selectedCustomer?.name || customerName;
    const cPhone = selectedCustomer?.phone || customerPhone;
    const cEmail = selectedCustomer?.email || customerEmail;
    const cAddr = selectedCustomer?.address || serviceAddress;
    const cZip = selectedCustomer?.zipCode || zipCode;

    if (!cName.trim()) {
      toast.error("Customer name is required");
      return;
    }

    setSubmitting(true);
    try {
      const result = await createBooking({
        customerName: cName,
        customerPhone: cPhone || "",
        customerEmail: cEmail || "",
        serviceAddress: cAddr || "",
        zipCode: cZip || undefined,
        customerId: selectedCustomer?._id,
        catalogItemId: selectedService._id,
        serviceName: selectedService.name,
        selectedVariant: selectedVariant || undefined,
        price: variantInfo.price,
        totalPrice: totalPrice,
        totalDuration: totalDuration,
        ...(addons.length > 0 ? { addons } : {}),
        date,
        time,
        staffId: selectedStaff?._id,
        staffName: selectedStaff?.name,
        notes: notes || undefined,
      });
      toast.success("Booking created!", {
        description: `${cName} — ${selectedService.name} at ${formatTime12(timeH, timeM)}`,
        action: {
          label: "View",
          onClick: () => navigate(`/bookings/${result.bookingId}`),
        },
      });
      onClose();
    } catch (err: any) {
      toast.error("Failed to create booking", {
        description: err.message || "Unknown error",
      });
    } finally {
      setSubmitting(false);
    }
  }, [
    selectedService,
    variantInfo,
    selectedCustomer,
    customerName,
    customerPhone,
    customerEmail,
    serviceAddress,
    zipCode,
    date,
    time,
    selectedStaff,
    notes,
    addons,
    totalPrice,
    totalDuration,
    createBooking,
    onClose,
    navigate,
    selectedVariant,
    timeH,
    timeM,
  ]);

  // ─── Render ─────────────────────────────────────────────
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm pt-[5vh] sm:pt-[10vh]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg mx-4 bg-background rounded-xl shadow-2xl border overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b bg-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <CalendarPlus className="size-4 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">Quick Book</h2>
              <p className="text-xs text-muted-foreground">
                {formatDateDisplay(date)} · {formatTime12(timeH, timeM)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1 px-5 py-2 border-b bg-muted/10">
          {(["service", "customer", "review"] as const).map((s, i) => (
            <button
              key={s}
              onClick={() => {
                // Only allow going back, not forward
                if (
                  (s === "service") ||
                  (s === "customer" && selectedService) ||
                  (s === "review" && selectedService && (selectedCustomer || customerName))
                ) {
                  setStep(s);
                }
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                step === s
                  ? "bg-primary text-primary-foreground"
                  : i < ["service", "customer", "review"].indexOf(step)
                    ? "bg-primary/10 text-primary cursor-pointer"
                    : "text-muted-foreground"
              }`}
            >
              <span className="size-4 rounded-full border flex items-center justify-center text-[10px]">
                {i < ["service", "customer", "review"].indexOf(step) ? (
                  <Check className="size-3" />
                ) : (
                  i + 1
                )}
              </span>
              <span className="hidden sm:inline capitalize">{s}</span>
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="px-5 py-4 max-h-[55vh] overflow-y-auto">
          {/* ─── Step 1: Service ─────────────────────────────── */}
          {step === "service" && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search services..."
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                  className="pl-9 h-9"
                  autoFocus
                />
              </div>

              {!catalog ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedCatalog).map(([category, items]) => (
                    <div key={category}>
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                        {category}
                      </h3>
                      <div className="space-y-1">
                        {items.map((item) => {
                          const isSelected = selectedService?._id === item._id;
                          return (
                            <button
                              key={item._id}
                              onClick={() => {
                                setSelectedService(item);
                                if (item.variants.length === 1) {
                                  setSelectedVariant(item.variants[0].label);
                                } else {
                                  setSelectedVariant("");
                                }
                              }}
                              className={`w-full text-left px-3 py-2 rounded-lg border transition-all ${
                                isSelected
                                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                  : "border-transparent hover:bg-muted/50"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-sm">
                                  {item.name}
                                </span>
                                {item.variants.length === 1 && (
                                  <span className="text-xs text-muted-foreground">
                                    {formatPrice(item.variants[0].price)} ·{" "}
                                    {item.variants[0].durationMin}min
                                  </span>
                                )}
                              </div>
                              {/* Variant picker for multi-variant services */}
                              {isSelected && item.variants.length > 1 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {item.variants.map((v) => (
                                    <button
                                      key={v.label}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedVariant(v.label);
                                      }}
                                      className={`px-2.5 py-1 rounded-md text-xs border transition-all ${
                                        selectedVariant === v.label
                                          ? "border-primary bg-primary/10 text-primary font-medium"
                                          : "border-border hover:border-primary/40"
                                      }`}
                                    >
                                      {v.label} · {formatPrice(v.price)} ·{" "}
                                      {v.durationMin}min
                                    </button>
                                  ))}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {Object.keys(groupedCatalog).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No services found
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ─── Step 2: Customer ────────────────────────────── */}
          {step === "customer" && (
            <div className="space-y-3">
              {!isNewCustomer ? (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email, or phone..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="pl-9 h-9"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-1">
                    {filteredCustomers.map((c) => (
                      <button
                        key={c._id}
                        onClick={() => {
                          setSelectedCustomer(c);
                          setCustomerName(c.name);
                          setCustomerPhone(c.phone || "");
                          setCustomerEmail(c.email || "");
                          setServiceAddress(c.address || "");
                          setZipCode(c.zipCode || "");
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg border transition-all ${
                          selectedCustomer?._id === c._id
                            ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                            : "border-transparent hover:bg-muted/50"
                        }`}
                      >
                        <div className="font-medium text-sm">{c.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {[c.phone, c.email].filter(Boolean).join(" · ")}
                        </div>
                      </button>
                    ))}
                    {filteredCustomers.length === 0 && customerSearch && (
                      <p className="text-sm text-muted-foreground text-center py-3">
                        No customers found
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setIsNewCustomer(true);
                      setSelectedCustomer(null);
                      // Pre-fill name from search if looks like a name
                      if (customerSearch && !customerSearch.includes("@") && !customerSearch.match(/^\d/)) {
                        setCustomerName(customerSearch);
                      }
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-primary/40 text-primary hover:bg-primary/5 transition-colors text-sm font-medium"
                  >
                    <User className="size-4" />
                    New Customer
                  </button>
                </>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={() => setIsNewCustomer(false)}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    ← Search existing customers
                  </button>
                  <div>
                    <Label className="text-xs">Name *</Label>
                    <Input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="John Smith"
                      className="h-9 mt-1"
                      autoFocus
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Phone</Label>
                      <Input
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="(704) 555-0000"
                        className="h-9 mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Email</Label>
                      <Input
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="john@email.com"
                        className="h-9 mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Service Address</Label>
                    <Input
                      value={serviceAddress}
                      onChange={(e) => setServiceAddress(e.target.value)}
                      placeholder="123 Main St, Charlotte NC"
                      className="h-9 mt-1"
                    />
                  </div>
                  <div className="w-1/3">
                    <Label className="text-xs">Zip Code</Label>
                    <Input
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                      placeholder="28202"
                      className="h-9 mt-1"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── Step 3: Review ──────────────────────────────── */}
          {step === "review" && (
            <div className="space-y-4">
              {/* Date / Time editor */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Date</Label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-9 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Time</Label>
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="h-9 mt-1"
                  />
                </div>
              </div>

              {/* Staff */}
              {staffList && staffList.length > 0 && (
                <div>
                  <Label className="text-xs">Assign Staff</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    <button
                      onClick={() => setSelectedStaff(null)}
                      className={`px-2.5 py-1 rounded-md text-xs border transition-all ${
                        !selectedStaff
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      Unassigned
                    </button>
                    {staffList.map((s) => (
                      <button
                        key={s._id}
                        onClick={() => setSelectedStaff(s)}
                        className={`px-2.5 py-1 rounded-md text-xs border transition-all ${
                          selectedStaff?._id === s._id
                            ? "border-primary bg-primary/10 text-primary font-medium"
                            : "border-border hover:border-primary/40"
                        }`}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary card */}
              <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">
                    {selectedService?.name}
                  </span>
                  {variantInfo && (
                    <Badge variant="secondary" className="text-xs">
                      {formatPrice(variantInfo.price)}
                    </Badge>
                  )}
                </div>
                {selectedVariant && (
                  <div className="text-xs text-muted-foreground">
                    {selectedVariant} ·{" "}
                    {variantInfo?.durationMin}min
                  </div>
                )}
                <div className="border-t pt-2 mt-2 space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="size-3.5 text-muted-foreground" />
                    <span>{selectedCustomer?.name || customerName}</span>
                  </div>
                  {(selectedCustomer?.phone || customerPhone) && (
                    <div className="text-xs text-muted-foreground ml-5">
                      {selectedCustomer?.phone || customerPhone}
                    </div>
                  )}
                  {(selectedCustomer?.address || serviceAddress) && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="size-3.5" />
                      <span>{selectedCustomer?.address || serviceAddress}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="size-3.5" />
                    <span>
                      {formatDateDisplay(date)} at{" "}
                      {formatTime12(timeH, timeM)}
                    </span>
                  </div>
                </div>
              </div>

              {/* ─── Add-ons & Extras ─────────────────────── */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Add-Ons & Extras
                </Label>

                {/* Current add-ons */}
                {addons.length > 0 && (
                  <div className="space-y-1">
                    {addons.map((addon, i) => (
                      <div
                        key={`${addon.name}-${i}`}
                        className="flex items-center justify-between px-2.5 py-1.5 bg-muted/50 rounded-md border text-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="font-medium">{addon.name}</span>
                          {addon.variantLabel && addon.variantLabel !== "Standard" && (
                            <span className="text-xs text-muted-foreground ml-1">
                              ({addon.variantLabel})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          <span className="font-semibold text-primary text-xs">
                            +{formatPrice(addon.price)}
                          </span>
                          <button
                            onClick={() => handleRemoveAddon(i)}
                            className="p-0.5 rounded hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-colors"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Custom Item Inline Form */}
                {showCustomItem && (
                  <div className="space-y-2 border-2 border-dashed border-primary/30 rounded-lg p-2.5 bg-primary/5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">Custom Line Item</span>
                      <button onClick={() => setShowCustomItem(false)} className="p-0.5 rounded hover:bg-muted">
                        <X className="size-3.5" />
                      </button>
                    </div>
                    <Input
                      placeholder="Item name..."
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="h-8 text-sm"
                      autoFocus
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Price ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={customPrice}
                          onChange={(e) => setCustomPrice(e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Duration (min)</Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="30"
                          value={customDuration}
                          onChange={(e) => setCustomDuration(e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="w-full h-7 text-xs"
                      onClick={handleAddCustomItem}
                      disabled={!customName.trim() || !customPrice || Number.parseFloat(customPrice) <= 0}
                    >
                      <Plus className="size-3 mr-1" /> Add
                    </Button>
                  </div>
                )}

                {/* Catalog Add-on Picker */}
                {showAddonPicker && (
                  <div className="border rounded-lg p-2.5 space-y-2 max-h-48 overflow-y-auto">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">Pick an add-on</span>
                      <button onClick={() => setShowAddonPicker(false)} className="p-0.5 rounded hover:bg-muted">
                        <X className="size-3.5" />
                      </button>
                    </div>
                    {Object.entries(groupedAddonCatalog).map(([cat, items]) => (
                      <div key={cat}>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                          {categoryLabels[cat] || cat}
                        </p>
                        {items.map((item) => (
                          <div key={item._id} className="mb-1">
                            {item.variants.length === 1 ? (
                              <button
                                type="button"
                                onClick={() => handleAddAddon(item, 0)}
                                className="w-full flex items-center justify-between px-2 py-1.5 rounded border hover:bg-primary/5 hover:border-primary/30 transition-colors text-left text-xs"
                              >
                                <span className="font-medium">{item.name}</span>
                                <span className="font-semibold text-primary">+{formatPrice(item.variants[0].price)}</span>
                              </button>
                            ) : (
                              <div className="border rounded p-2">
                                <p className="text-xs font-medium mb-1">{item.name}</p>
                                <div className="grid grid-cols-2 gap-1">
                                  {item.variants.map((v, vi) => (
                                    <button
                                      key={v.label}
                                      type="button"
                                      onClick={() => handleAddAddon(item, vi)}
                                      className="text-left p-1.5 rounded border text-[11px] hover:bg-primary/5 hover:border-primary/30 transition-colors"
                                    >
                                      <p className="text-muted-foreground">{v.label}</p>
                                      <p className="font-semibold text-primary">+{formatPrice(v.price)}</p>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                {/* Buttons to open pickers */}
                {!showAddonPicker && !showCustomItem && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowAddonPicker(true)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md border border-dashed text-xs text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                    >
                      <Plus className="size-3" /> Add-On
                    </button>
                    <button
                      onClick={() => setShowCustomItem(true)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md border border-dashed text-xs text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                    >
                      <Pencil className="size-3" /> Custom Item
                    </button>
                  </div>
                )}

                {/* Total with add-ons */}
                {addons.length > 0 && (
                  <div className="flex items-center justify-between px-2.5 py-1.5 bg-primary/5 rounded-md border border-primary/20">
                    <span className="text-xs font-medium">Total</span>
                    <span className="font-bold text-primary">{formatPrice(totalPrice)}</span>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <Label className="text-xs">Notes (optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any notes for this booking..."
                  className="mt-1 min-h-[60px]"
                  rows={2}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t bg-muted/10">
          <div>
            {step !== "service" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setStep(step === "review" ? "customer" : "service")
                }
              >
                ← Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            {step === "service" && (
              <Button
                size="sm"
                disabled={!selectedService || (selectedService.variants.length > 1 && !selectedVariant)}
                onClick={() => setStep("customer")}
              >
                Next →
              </Button>
            )}
            {step === "customer" && (
              <Button
                size="sm"
                disabled={!selectedCustomer && !customerName.trim()}
                onClick={() => setStep("review")}
              >
                Next →
              </Button>
            )}
            {step === "review" && (
              <Button size="sm" disabled={submitting} onClick={handleSubmit}>
                {submitting ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin mr-1.5" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="size-3.5 mr-1.5" />
                    Book It
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
