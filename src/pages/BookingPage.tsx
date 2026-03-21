import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  ArrowRight,
  Calendar as CalendarIcon,
  Car,
  CheckCircle2,
  Clock,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  Truck,
  User,
  Zap,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BUSINESS_PHONE } from "@/lib/constants";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(0)}`;
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

type BookingStep = "service" | "vehicle" | "datetime" | "info" | "confirm";

interface BookingData {
  serviceId: Id<"services"> | null;
  serviceName: string;
  vehicleType: "sedan" | "suv" | null;
  date: string;
  time: string;
  price: number;
  duration: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  serviceAddress: string;
  zipCode: string;
  notes: string;
}

const initialData: BookingData = {
  serviceId: null,
  serviceName: "",
  vehicleType: null,
  date: "",
  time: "",
  price: 0,
  duration: 0,
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  serviceAddress: "",
  zipCode: "",
  notes: "",
};

// ─── Step 1: Select Service ──────────────────────────
function ServiceStep({
  data,
  onSelect,
}: {
  data: BookingData;
  onSelect: (
    id: Id<"services">,
    name: string,
    duration: number,
  ) => void;
}) {
  const services = useQuery(api.services.listActive);

  if (!services) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 rounded-xl bg-muted animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold">Select a Service</h2>
        <p className="text-muted-foreground">Choose the detailing package that fits your needs</p>
      </div>
      {services.map((service) => (
        <Card
          key={service._id}
          className={`cursor-pointer transition-all hover:shadow-md hover:border-primary/50 ${data.serviceId === service._id ? "border-primary ring-2 ring-primary/20" : ""}`}
          onClick={() =>
            onSelect(service._id, service.name, service.duration)
          }
        >
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="size-4 text-primary" />
                  <h3 className="font-semibold text-lg">{service.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {service.description}
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {Math.floor(service.duration / 60)}h{" "}
                    {service.duration % 60 > 0 ? `${service.duration % 60}m` : ""}
                  </span>
                </div>
              </div>
              <div className="flex sm:flex-col items-center gap-2 sm:text-right">
                <Badge variant="secondary" className="text-sm font-semibold px-3">
                  <Car className="size-3 mr-1" />
                  {formatPrice(service.sedanPrice)}
                </Badge>
                <Badge variant="outline" className="text-sm font-semibold px-3">
                  <Truck className="size-3 mr-1" />
                  {formatPrice(service.suvPrice)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Step 2: Vehicle Type ──────────────────────────
function VehicleStep({
  data,
  services,
  onSelect,
}: {
  data: BookingData;
  services:
    | Array<{
        _id: Id<"services">;
        sedanPrice: number;
        suvPrice: number;
      }>
    | undefined;
  onSelect: (type: "sedan" | "suv", price: number) => void;
}) {
  const service = services?.find((s) => s._id === data.serviceId);

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold">Vehicle Type</h2>
        <p className="text-muted-foreground">
          Pricing varies by vehicle size for {data.serviceName}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card
          className={`cursor-pointer transition-all hover:shadow-md hover:border-primary/50 ${data.vehicleType === "sedan" ? "border-primary ring-2 ring-primary/20" : ""}`}
          onClick={() => onSelect("sedan", service?.sedanPrice || 0)}
        >
          <CardContent className="p-6 text-center">
            <Car className="size-12 mx-auto mb-3 text-primary" />
            <h3 className="font-semibold text-lg mb-1">Sedan / Car</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Cars, coupes, sedans, small crossovers
            </p>
            <div className="text-2xl font-bold text-primary">
              {formatPrice(service?.sedanPrice || 0)}
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all hover:shadow-md hover:border-primary/50 ${data.vehicleType === "suv" ? "border-primary ring-2 ring-primary/20" : ""}`}
          onClick={() => onSelect("suv", service?.suvPrice || 0)}
        >
          <CardContent className="p-6 text-center">
            <Truck className="size-12 mx-auto mb-3 text-primary" />
            <h3 className="font-semibold text-lg mb-1">SUV / Truck</h3>
            <p className="text-sm text-muted-foreground mb-3">
              SUVs, trucks, vans, large vehicles
            </p>
            <div className="text-2xl font-bold text-primary">
              {formatPrice(service?.suvPrice || 0)}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Step 3: Date & Time ──────────────────────────
function DateTimeStep({
  data,
  onSelectDate,
  onSelectTime,
}: {
  data: BookingData;
  onSelectDate: (date: string) => void;
  onSelectTime: (time: string) => void;
}) {
  const slots = useQuery(
    api.availability.getAvailableSlots,
    data.date
      ? {
          date: data.date,
          durationMinutes: data.duration,
          serviceId: data.serviceId ?? undefined,
          zipCode: data.zipCode.trim() || undefined,
        }
      : "skip",
  );

  const availability = useQuery(api.availability.list);
  const blockedDates = useQuery(api.availability.listBlockedDates);

  const disabledDays = useMemo(() => {
    if (!availability) return [];
    const closedDays = availability
      .filter((a) => !a.isAvailable)
      .map((a) => a.dayOfWeek);
    return closedDays;
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
        <p className="text-muted-foreground">Select an available appointment slot</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex justify-center">
          <Calendar
            mode="single"
            selected={data.date ? new Date(data.date + "T12:00:00") : undefined}
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
                        <strong>⚡ Recommended</strong> — we're already in your area on this day!
                      </span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {slots.map((slot) => (
                      <Button
                        key={slot.time}
                        variant={data.time === slot.time ? "default" : "outline"}
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

// ─── Step 4: Customer Info ──────────────────────────
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
        <p className="text-muted-foreground">Where should we come and how can we reach you?</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="flex items-center gap-2">
            <User className="size-4" />
            Full Name
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
            <Phone className="size-4" />
            Phone Number
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
            <Mail className="size-4" />
            Email Address
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
            <MapPin className="size-4" />
            Service Address
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
            <MapPin className="size-4" />
            ZIP Code
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

// ─── Step 5: Confirmation ──────────────────────────
function ConfirmStep({ data }: { data: BookingData }) {
  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold">Confirm Your Booking</h2>
        <p className="text-muted-foreground">Review your details before confirming</p>
      </div>

      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b">
            <div>
              <p className="font-semibold text-lg">{data.serviceName}</p>
              <p className="text-sm text-muted-foreground capitalize">
                {data.vehicleType === "suv" ? "SUV / Truck" : "Sedan / Car"}
              </p>
            </div>
            <div className="text-2xl font-bold text-primary">
              {formatPrice(data.price)}
            </div>
          </div>

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
              <span>{data.serviceAddress}{data.zipCode ? ` · ${data.zipCode}` : ""}</span>
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

// ─── Success Screen ──────────────────────────
function SuccessScreen({
  confirmationCode,
  data,
}: {
  confirmationCode: string;
  data: BookingData;
}) {
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
              <p className="text-muted-foreground">Price</p>
              <p className="font-medium">{formatPrice(data.price)}</p>
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
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground mb-4">
        Questions? Call us at{" "}
        <a href={`tel:${BUSINESS_PHONE}`} className="text-primary font-medium">
          {BUSINESS_PHONE}
        </a>
      </p>

      <Button asChild variant="outline">
        <Link to="/book">Book Another Appointment</Link>
      </Button>
    </div>
  );
}

// ─── Main Booking Page ──────────────────────────
export function BookingPage() {
  const [step, setStep] = useState<BookingStep>("service");
  const [data, setData] = useState<BookingData>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState<string | null>(null);

  const services = useQuery(api.services.listActive);
  const createBooking = useMutation(api.bookings.create);

  const steps: BookingStep[] = [
    "service",
    "vehicle",
    "info",
    "datetime",
    "confirm",
  ];
  const stepIndex = steps.indexOf(step);
  const stepLabels = ["Service", "Vehicle", "Your Info", "Date & Time", "Confirm"];

  const canGoNext = () => {
    switch (step) {
      case "service":
        return data.serviceId !== null;
      case "vehicle":
        return data.vehicleType !== null;
      case "datetime":
        return data.date !== "" && data.time !== "";
      case "info":
        return (
          data.customerName.trim() !== "" &&
          data.customerPhone.trim() !== "" &&
          data.customerEmail.trim() !== "" &&
          data.serviceAddress.trim() !== ""
        );
      case "confirm":
        return true;
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (step === "confirm") {
      // Submit booking
      setIsSubmitting(true);
      try {
        const result = await createBooking({
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          customerEmail: data.customerEmail,
          serviceAddress: data.serviceAddress,
          zipCode: data.zipCode.trim() || undefined,
          serviceId: data.serviceId!,
          vehicleType: data.vehicleType!,
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

  // If confirmed, show success
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
            style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Content */}
      <div className="min-h-[400px]">
        {step === "service" && (
          <ServiceStep
            data={data}
            onSelect={(id, name, duration) => {
              setData((d) => ({
                ...d,
                serviceId: id,
                serviceName: name,
                duration,
                // Reset downstream selections
                vehicleType: null,
                price: 0,
                date: "",
                time: "",
              }));
              setStep("vehicle");
            }}
          />
        )}

        {step === "vehicle" && (
          <VehicleStep
            data={data}
            services={services}
            onSelect={(type, price) => {
              setData((d) => ({ ...d, vehicleType: type, price }));
              setStep("info");
            }}
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

        {step === "info" && (
          <InfoStep
            data={data}
            onChange={(field, value) =>
              setData((d) => ({ ...d, [field]: value }))
            }
          />
        )}

        {step === "confirm" && <ConfirmStep data={data} />}
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

        {/* Show Next for info, datetime, and confirm steps (service/vehicle auto-advance) */}
        {(step === "info" || step === "datetime" || step === "confirm") && (
          <Button onClick={handleNext} disabled={!canGoNext() || isSubmitting}>
            {step === "confirm" ? (
              isSubmitting ? (
                "Booking..."
              ) : (
                <>
                  Confirm Booking
                  <CheckCircle2 className="size-4 ml-1" />
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
