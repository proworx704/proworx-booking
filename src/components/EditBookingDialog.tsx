import { useMutation, useQuery } from "convex/react";
import {
  Calendar,
  Check,
  ChevronDown,
  Clock,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

// Category display names
const categoryLabels: Record<string, string> = {
  core: "Core Services",
  paintCorrection: "Paint Correction",
  ceramicCoating: "Ceramic Coating",
  interiorAddon: "Interior Add-Ons",
  exteriorAddon: "Exterior Add-Ons",
  ceramicAddon: "Ceramic Add-Ons",
  boatDetailing: "Boat Detailing",
  boatCeramic: "Boat Ceramic",
  boatAddon: "Boat Add-Ons",
  membership: "Memberships",
};

// Categories that can be primary services vs add-ons
const primaryCategories = [
  "core",
  "paintCorrection",
  "ceramicCoating",
  "boatDetailing",
  "boatCeramic",
  "membership",
];
const addonCategories = [
  "interiorAddon",
  "exteriorAddon",
  "ceramicAddon",
  "boatAddon",
  // Also allow core/paint as "add-ons" since some bookings stack services
  "paintCorrection",
];

interface AddonEntry {
  catalogItemId?: Id<"serviceCatalog">;
  name: string;
  variantLabel?: string;
  price: number;
  durationMin: number;
}

interface EditBookingDialogProps {
  booking: {
    _id: Id<"bookings">;
    catalogItemId?: Id<"serviceCatalog">;
    serviceName: string;
    selectedVariant?: string;
    price: number;
    totalPrice?: number;
    addons?: AddonEntry[];
    date: string;
    time: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    serviceAddress: string;
    zipCode?: string;
  };
}

export function EditBookingDialog({ booking }: EditBookingDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"service" | "addons" | "schedule" | "customer">("service");

  // Load the full service catalog
  const catalog = useQuery(api.catalog.listActive, {});
  const editBooking = useMutation(api.bookings.editBooking);

  // ─── Form state ──────────────────────────────────────────────────────────────
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>(
    booking.catalogItemId || ""
  );
  const [selectedVariant, setSelectedVariant] = useState(
    booking.selectedVariant || ""
  );
  const [basePrice, setBasePrice] = useState(booking.price);
  const [serviceName, setServiceName] = useState(booking.serviceName);
  const [addons, setAddons] = useState<AddonEntry[]>(booking.addons || []);

  // Schedule
  const [date, setDate] = useState(booking.date);
  const [time, setTime] = useState(booking.time);

  // Customer
  const [customerName, setCustomerName] = useState(booking.customerName);
  const [customerPhone, setCustomerPhone] = useState(booking.customerPhone);
  const [customerEmail, setCustomerEmail] = useState(booking.customerEmail);
  const [serviceAddress, setServiceAddress] = useState(booking.serviceAddress);
  const [zipCode, setZipCode] = useState(booking.zipCode || "");

  // Add-on picker state
  const [showAddonPicker, setShowAddonPicker] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedCatalogId(booking.catalogItemId || "");
      setSelectedVariant(booking.selectedVariant || "");
      setBasePrice(booking.price);
      setServiceName(booking.serviceName);
      setAddons(booking.addons || []);
      setDate(booking.date);
      setTime(booking.time);
      setCustomerName(booking.customerName);
      setCustomerPhone(booking.customerPhone);
      setCustomerEmail(booking.customerEmail);
      setServiceAddress(booking.serviceAddress);
      setZipCode(booking.zipCode || "");
      setActiveTab("service");
    }
  }, [open, booking]);

  // When a catalog item is selected, update service name + variants
  const selectedItem = catalog?.find((c) => c._id === selectedCatalogId);

  const handleSelectService = (catalogId: string) => {
    const item = catalog?.find((c) => c._id === catalogId);
    if (!item) return;
    setSelectedCatalogId(catalogId);
    setServiceName(item.name);
    // Auto-select first variant
    if (item.variants.length > 0) {
      setSelectedVariant(item.variants[0].label);
      setBasePrice(item.variants[0].price);
    }
  };

  const handleSelectVariant = (variantLabel: string) => {
    setSelectedVariant(variantLabel);
    const variant = selectedItem?.variants.find((v) => v.label === variantLabel);
    if (variant) {
      setBasePrice(variant.price);
    }
  };

  const handleAddAddon = (
    item: { _id: Id<"serviceCatalog">; name: string; variants: { label: string; price: number; durationMin: number }[] },
    variantIdx: number
  ) => {
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

  // Totals
  const addonTotal = addons.reduce((s, a) => s + a.price, 0);
  const totalPrice = basePrice + addonTotal;

  // Check if anything actually changed
  const hasChanges =
    selectedCatalogId !== (booking.catalogItemId || "") ||
    selectedVariant !== (booking.selectedVariant || "") ||
    basePrice !== booking.price ||
    JSON.stringify(addons) !== JSON.stringify(booking.addons || []) ||
    date !== booking.date ||
    time !== booking.time ||
    customerName !== booking.customerName ||
    customerPhone !== booking.customerPhone ||
    customerEmail !== booking.customerEmail ||
    serviceAddress !== booking.serviceAddress ||
    zipCode !== (booking.zipCode || "");

  const handleSave = async () => {
    setSaving(true);
    try {
      await editBooking({
        bookingId: booking._id,
        ...(selectedCatalogId && selectedCatalogId !== (booking.catalogItemId || "")
          ? { catalogItemId: selectedCatalogId as Id<"serviceCatalog"> }
          : {}),
        ...(serviceName !== booking.serviceName ? { serviceName } : {}),
        ...(selectedVariant !== (booking.selectedVariant || "")
          ? { selectedVariant }
          : {}),
        ...(basePrice !== booking.price ? { price: basePrice } : {}),
        ...(JSON.stringify(addons) !== JSON.stringify(booking.addons || [])
          ? { addons }
          : {}),
        ...(date !== booking.date ? { date } : {}),
        ...(time !== booking.time ? { time } : {}),
        ...(customerName !== booking.customerName ? { customerName } : {}),
        ...(customerPhone !== booking.customerPhone ? { customerPhone } : {}),
        ...(customerEmail !== booking.customerEmail ? { customerEmail } : {}),
        ...(serviceAddress !== booking.serviceAddress ? { serviceAddress } : {}),
        ...(zipCode !== (booking.zipCode || "") ? { zipCode } : {}),
      });
      setOpen(false);
    } catch (e) {
      console.error("Failed to update booking:", e);
      alert("Failed to update booking. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Group catalog items for selection
  const primaryServices = catalog?.filter((c) =>
    primaryCategories.includes(c.category)
  ) || [];
  const addonServices = catalog?.filter((c) =>
    addonCategories.includes(c.category)
  ) || [];

  // Group by category for display
  const groupedPrimary: Record<string, typeof primaryServices> = {};
  for (const item of primaryServices) {
    if (!groupedPrimary[item.category]) groupedPrimary[item.category] = [];
    groupedPrimary[item.category].push(item);
  }
  const groupedAddons: Record<string, typeof addonServices> = {};
  for (const item of addonServices) {
    if (!groupedAddons[item.category]) groupedAddons[item.category] = [];
    groupedAddons[item.category].push(item);
  }

  const tabs = [
    { key: "service" as const, label: "Service" },
    { key: "addons" as const, label: `Add-Ons${addons.length > 0 ? ` (${addons.length})` : ""}` },
    { key: "schedule" as const, label: "Schedule" },
    { key: "customer" as const, label: "Customer" },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="size-4 mr-1.5" />
          Edit Booking
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Booking</DialogTitle>
          <DialogDescription>
            Modify the service, add-ons, schedule, or customer info. Price recalculates automatically.
          </DialogDescription>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex border-b -mx-6 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 min-h-0">
          {/* ─── SERVICE TAB ─── */}
          {activeTab === "service" && (
            <div className="space-y-4">
              {/* Service Selector */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Service</Label>
                <Select
                  value={selectedCatalogId}
                  onValueChange={handleSelectService}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select a service..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {Object.entries(groupedPrimary).map(([cat, items]) => (
                      <div key={cat}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {categoryLabels[cat] || cat}
                        </div>
                        {items.map((item) => (
                          <SelectItem key={item._id} value={item._id}>
                            {item.name}
                            {item.variants.length > 0 && (
                              <span className="text-muted-foreground ml-1">
                                — from {formatPrice(item.variants[0].price)}
                              </span>
                            )}
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* If no catalog item selected, show manual name/price */}
              {!selectedCatalogId && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Service Name</Label>
                    <Input
                      value={serviceName}
                      onChange={(e) => setServiceName(e.target.value)}
                      placeholder="e.g. Standard Inside & Out"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Base Price ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={(basePrice / 100).toFixed(2)}
                      onChange={(e) =>
                        setBasePrice(Math.round(Number.parseFloat(e.target.value || "0") * 100))
                      }
                    />
                  </div>
                </div>
              )}

              {/* Variant Selector (vehicle size etc.) */}
              {selectedItem && selectedItem.variants.length > 1 && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Vehicle Size / Variant</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedItem.variants.map((variant) => {
                      const isSelected = selectedVariant === variant.label;
                      return (
                        <button
                          key={variant.label}
                          type="button"
                          onClick={() => handleSelectVariant(variant.label)}
                          className={`relative p-3 rounded-lg border-2 text-left transition-all ${
                            isSelected
                              ? "border-primary bg-primary/5 shadow-sm"
                              : "border-muted hover:border-muted-foreground/30"
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute top-2 right-2">
                              <Check className="size-4 text-primary" />
                            </div>
                          )}
                          <p className="font-medium text-sm">{variant.label}</p>
                          <p className="text-lg font-bold text-primary mt-0.5">
                            {formatPrice(variant.price)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ~{variant.durationMin} min
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Single-variant item — just show the price */}
              {selectedItem && selectedItem.variants.length === 1 && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Price</p>
                  <p className="text-xl font-bold text-primary">
                    {formatPrice(selectedItem.variants[0].price)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ~{selectedItem.variants[0].durationMin} min
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ─── ADD-ONS TAB ─── */}
          {activeTab === "addons" && (
            <div className="space-y-4">
              {/* Current Add-ons */}
              {addons.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Current Add-Ons</Label>
                  {addons.map((addon, i) => (
                    <div
                      key={`${addon.name}-${i}`}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border"
                    >
                      <div>
                        <p className="font-medium text-sm">{addon.name}</p>
                        {addon.variantLabel && (
                          <p className="text-xs text-muted-foreground">
                            {addon.variantLabel}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-sm">
                          +{formatPrice(addon.price)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveAddon(i)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {addons.length === 0 && !showAddonPicker && (
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-sm">No add-ons on this booking</p>
                </div>
              )}

              {/* Add-on Picker */}
              {!showAddonPicker ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowAddonPicker(true)}
                >
                  <Plus className="size-4 mr-1.5" />
                  Add Service / Add-On
                </Button>
              ) : (
                <div className="space-y-3 border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Pick an add-on</Label>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => setShowAddonPicker(false)}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-3">
                    {Object.entries(groupedAddons).map(([cat, items]) => (
                      <div key={cat}>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                          {categoryLabels[cat] || cat}
                        </p>
                        {items.map((item) => (
                          <div key={item._id} className="mb-1.5">
                            {item.variants.length === 1 ? (
                              <button
                                type="button"
                                onClick={() => handleAddAddon(item, 0)}
                                className="w-full flex items-center justify-between p-2.5 rounded-lg border hover:bg-primary/5 hover:border-primary/30 transition-colors text-left"
                              >
                                <span className="text-sm font-medium">
                                  {item.name}
                                </span>
                                <span className="text-sm font-semibold text-primary">
                                  +{formatPrice(item.variants[0].price)}
                                </span>
                              </button>
                            ) : (
                              <div className="border rounded-lg p-2.5">
                                <p className="text-sm font-medium mb-1.5">
                                  {item.name}
                                </p>
                                <div className="grid grid-cols-2 gap-1.5">
                                  {item.variants.map((v, vi) => (
                                    <button
                                      key={v.label}
                                      type="button"
                                      onClick={() => handleAddAddon(item, vi)}
                                      className="text-left p-2 rounded border hover:bg-primary/5 hover:border-primary/30 transition-colors"
                                    >
                                      <p className="text-xs text-muted-foreground">
                                        {v.label}
                                      </p>
                                      <p className="text-sm font-semibold text-primary">
                                        +{formatPrice(v.price)}
                                      </p>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                    {/* Also allow adding core services as add-ons */}
                    {Object.entries(groupedPrimary).map(([cat, items]) => (
                      <div key={`addon-${cat}`}>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                          {categoryLabels[cat] || cat} (as add-on)
                        </p>
                        {items.map((item) => (
                          <div key={item._id} className="mb-1.5">
                            {item.variants.length === 1 ? (
                              <button
                                type="button"
                                onClick={() => handleAddAddon(item, 0)}
                                className="w-full flex items-center justify-between p-2.5 rounded-lg border hover:bg-primary/5 hover:border-primary/30 transition-colors text-left"
                              >
                                <span className="text-sm font-medium">
                                  {item.name}
                                </span>
                                <span className="text-sm font-semibold text-primary">
                                  +{formatPrice(item.variants[0].price)}
                                </span>
                              </button>
                            ) : (
                              <div className="border rounded-lg p-2.5">
                                <p className="text-sm font-medium mb-1.5">
                                  {item.name}
                                </p>
                                <div className="grid grid-cols-2 gap-1.5">
                                  {item.variants.map((v, vi) => (
                                    <button
                                      key={v.label}
                                      type="button"
                                      onClick={() => handleAddAddon(item, vi)}
                                      className="text-left p-2 rounded border hover:bg-primary/5 hover:border-primary/30 transition-colors"
                                    >
                                      <p className="text-xs text-muted-foreground">
                                        {v.label}
                                      </p>
                                      <p className="text-sm font-semibold text-primary">
                                        +{formatPrice(v.price)}
                                      </p>
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
                </div>
              )}
            </div>
          )}

          {/* ─── SCHEDULE TAB ─── */}
          {activeTab === "schedule" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <Calendar className="size-4" /> Date
                </Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <Clock className="size-4" /> Time
                </Label>
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* ─── CUSTOMER TAB ─── */}
          {activeTab === "customer" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">Customer Name</Label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Phone</Label>
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Email</Label>
                <Input
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Service Address</Label>
                <Input
                  value={serviceAddress}
                  onChange={(e) => setServiceAddress(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">ZIP Code</Label>
                <Input
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  maxLength={5}
                />
              </div>
            </div>
          )}
        </div>

        {/* Price Summary + Save */}
        <div className="border-t pt-4 space-y-3">
          {/* Price breakdown */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{serviceName}</span>
              <span className="font-medium">{formatPrice(basePrice)}</span>
            </div>
            {addons.map((addon, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  + {addon.name}
                  {addon.variantLabel ? ` (${addon.variantLabel})` : ""}
                </span>
                <span className="font-medium">{formatPrice(addon.price)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold pt-1.5 border-t">
              <span>Total</span>
              <span className="text-primary text-lg">{formatPrice(totalPrice)}</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !hasChanges}
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="size-4 mr-1.5" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
