import { useMutation, useQuery } from "convex/react";
import {
  CalendarPlus,
  Check,
  Clock,
  Loader2,
  MapPin,
  Plus,
  Search,
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
}

function formatTime12(h: number, m: number): string {
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function formatDateDisplay(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
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

  // Schedule
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(initialTime);

  // Staff
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);

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

  // ─── Parse time ─────────────────────────────────────────
  const [timeH, timeM] = time.split(":").map(Number);

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
        totalDuration: variantInfo.durationMin,
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
                      {formatTime12(
                        parseInt(time.split(":")[0]),
                        parseInt(time.split(":")[1]),
                      )}
                    </span>
                  </div>
                </div>
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
