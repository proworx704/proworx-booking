import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  Calendar,
  Car,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Mail,
  MapPin,
  Navigation,
  Phone,
  Truck,
  User,
  Users,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
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

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  in_progress: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const paymentColors: Record<string, string> = {
  unpaid: "bg-orange-100 text-orange-800",
  paid: "bg-green-100 text-green-800",
  refunded: "bg-gray-100 text-gray-800",
};

function PaymentDialog({
  bookingId,
  price,
  squarePaymentLinkUrl,
}: {
  bookingId: Id<"bookings">;
  price: number;
  squarePaymentLinkUrl?: string;
}) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState("card");
  const [amount, setAmount] = useState((price / 100).toFixed(2));
  const [isProcessing, setIsProcessing] = useState(false);
  const markPaid = useMutation(api.bookings.markPaid);

  const handlePayment = async () => {
    if (method === "card" && squarePaymentLinkUrl) {
      // Open Square payment link and mark as paid
      window.open(squarePaymentLinkUrl, "_blank");
      setIsProcessing(true);
      try {
        await markPaid({
          id: bookingId,
          paymentMethod: "card",
          paymentAmount: Math.round(Number.parseFloat(amount) * 100),
        });
        setOpen(false);
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    setIsProcessing(true);
    try {
      await markPaid({
        id: bookingId,
        paymentMethod: method,
        paymentAmount: Math.round(Number.parseFloat(amount) * 100),
      });
      setOpen(false);
    } catch (e) {
      console.error("Payment failed:", e);
      alert("Payment recording failed");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" size="lg">
          <CreditCard className="size-4 mr-2" />
          Take Payment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Process Payment</DialogTitle>
          <DialogDescription>
            Record payment for this appointment
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="card">
                  💳 Credit/Debit Card (Square)
                </SelectItem>
                <SelectItem value="cash">💵 Cash</SelectItem>
                <SelectItem value="zelle">Zelle</SelectItem>
                <SelectItem value="venmo">Venmo</SelectItem>
                <SelectItem value="paypal">PayPal</SelectItem>
                <SelectItem value="check">Check</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {method === "card" && squarePaymentLinkUrl && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
              <p className="font-medium text-blue-700 flex items-center gap-1">
                <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm4 3h6v2H9V8zm0 4h6v2H9v-2z" />
                </svg>
                Square Payment Link ready
              </p>
              <p className="text-blue-600 mt-1">
                Clicking &quot;Pay with Square&quot; will open the Square checkout page
                for the customer.
              </p>
            </div>
          )}

          {method === "card" && !squarePaymentLinkUrl && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
              <p className="font-medium text-amber-700">
                ⏳ Square link not generated yet
              </p>
              <p className="text-amber-600 mt-1">
                Payment will be recorded manually. Ask Viktor to generate a
                Square payment link for this booking.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Amount</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handlePayment} disabled={isProcessing}>
            {isProcessing
              ? "Processing..."
              : method === "card" && squarePaymentLinkUrl
                ? "Pay with Square →"
                : "Confirm Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const booking = useQuery(
    api.bookings.get,
    id ? { id: id as Id<"bookings"> } : "skip",
  );
  const activeStaff = useQuery(api.staff.listActive);
  const updateStatus = useMutation(api.bookings.updateStatus);
  const updateNotes = useMutation(api.bookings.updateNotes);
  const assignStaff = useMutation(api.bookings.assignStaff);
  const unassignStaff = useMutation(api.bookings.unassignStaff);
  const [notes, setNotes] = useState<string | null>(null);
  const [savingNotes, setSavingNotes] = useState(false);

  if (!booking) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-muted-foreground">Loading booking...</div>
      </div>
    );
  }

  const handleStatusChange = async (
    status:
      | "pending"
      | "confirmed"
      | "in_progress"
      | "completed"
      | "cancelled",
  ) => {
    await updateStatus({ id: booking._id, status });
  };

  const handleSaveNotes = async () => {
    if (notes === null) return;
    setSavingNotes(true);
    try {
      await updateNotes({ id: booking._id, notes });
      setNotes(null);
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/bookings">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{booking.customerName}</h1>
          <p className="text-muted-foreground font-mono text-sm">
            {booking.confirmationCode}
          </p>
        </div>
        <Badge variant="outline" className={`text-sm py-1 px-3 ${statusColors[booking.status]}`}>
          {booking.status.replace("_", " ")}
        </Badge>
        <Badge variant="outline" className={`text-sm py-1 px-3 ${paymentColors[booking.paymentStatus]}`}>
          {booking.paymentStatus}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Service Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Service Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  {booking.vehicleType === "suv" ? (
                    <Truck className="size-6 text-primary" />
                  ) : (
                    <Car className="size-6 text-primary" />
                  )}
                  <div>
                    <p className="font-semibold text-lg">
                      {booking.serviceName}
                    </p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {booking.selectedVariant
                        ? booking.selectedVariant
                        : booking.vehicleType === "suv"
                          ? "SUV / Truck"
                          : booking.vehicleType === "sedan"
                            ? "Sedan / Car"
                            : ""}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">
                    {formatPrice(booking.totalPrice ?? booking.price)}
                  </p>
                  {booking.totalPrice && booking.totalPrice !== booking.price && (
                    <p className="text-xs text-muted-foreground">
                      Base: {formatPrice(booking.price)}
                    </p>
                  )}
                  {booking.paymentAmount &&
                    booking.paymentAmount !== (booking.totalPrice ?? booking.price) && (
                      <p className="text-sm text-muted-foreground">
                        Paid: {formatPrice(booking.paymentAmount)}
                      </p>
                    )}
                </div>
              </div>

              {/* Add-ons breakdown */}
              {booking.addons && booking.addons.length > 0 && (
                <div className="px-4 space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Add-Ons</p>
                  {booking.addons.map((addon: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span>
                        {addon.name}
                        {addon.variantLabel && addon.variantLabel !== "Standard" && (
                          <span className="text-muted-foreground"> — {addon.variantLabel}</span>
                        )}
                      </span>
                      <span className="font-medium text-muted-foreground">
                        +{formatPrice(addon.price)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="size-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="font-medium">{formatDate(booking.date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Time</p>
                    <p className="font-medium">{formatTime(booking.time)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <User className="size-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className="font-medium">{booking.customerName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <Phone className="size-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <a
                    href={`tel:${booking.customerPhone}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {booking.customerPhone}
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <Mail className="size-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <a
                    href={`mailto:${booking.customerEmail}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {booking.customerEmail}
                  </a>
                </div>
              </div>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(booking.serviceAddress + (booking.zipCode ? ` ${booking.zipCode}` : ""))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 p-3 rounded-lg border hover:bg-blue-50 hover:border-blue-200 transition-colors group cursor-pointer"
              >
                <MapPin className="size-5 text-muted-foreground mt-0.5 group-hover:text-blue-600" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">
                    Service Address
                  </p>
                  <p className="font-medium group-hover:text-blue-600">
                    {booking.serviceAddress}
                    {booking.zipCode && (
                      <span className="ml-2 text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                        ZIP {booking.zipCode}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-blue-600 flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Navigation className="size-3" />
                    Open in Google Maps
                  </p>
                </div>
                <Navigation className="size-4 text-blue-500 mt-1 opacity-60 group-hover:opacity-100" />
              </a>
            </CardContent>
          </Card>

          {/* Staff Assignment */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="size-4" />
                Assigned Staff
              </CardTitle>
            </CardHeader>
            <CardContent>
              {booking.staffName ? (
                <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                      {booking.staffName.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                    </div>
                    <p className="font-medium">{booking.staffName}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => unassignStaff({ id: booking._id })}
                  >
                    Unassign
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground mb-2">No staff assigned yet</p>
                  <Select
                    onValueChange={(staffId) =>
                      assignStaff({ id: booking._id, staffId: staffId as Id<"staff"> })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Assign a staff member..." />
                    </SelectTrigger>
                    <SelectContent>
                      {activeStaff?.map((s) => (
                        <SelectItem key={s._id} value={s._id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Notes</CardTitle>
              <CardDescription>Internal notes about this appointment</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notes ?? booking.notes ?? ""}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this appointment..."
                rows={3}
              />
              {notes !== null && notes !== (booking.notes ?? "") && (
                <div className="flex justify-end mt-2">
                  <Button
                    size="sm"
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                  >
                    {savingNotes ? "Saving..." : "Save Notes"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Actions */}
        <div className="space-y-4">
          {/* Payment */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Payment</CardTitle>
            </CardHeader>
            <CardContent>
              {booking.paymentStatus === "paid" ? (
                <div className="text-center py-4">
                  <CheckCircle2 className="size-10 text-green-500 mx-auto mb-2" />
                  <p className="font-semibold text-green-700">Paid</p>
                  <p className="text-sm text-muted-foreground">
                    {formatPrice(booking.paymentAmount || booking.price)} via{" "}
                    {booking.paymentMethod}
                  </p>
                  {booking.paidAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(booking.paidAt).toLocaleString()}
                    </p>
                  )}
                </div>
              ) : booking.status === "cancelled" ? (
                <div className="text-center py-4">
                  <XCircle className="size-10 text-red-400 mx-auto mb-2" />
                  <p className="font-semibold text-red-600">Cancelled</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-center py-2">
                    <p className="text-3xl font-bold">
                      {formatPrice(booking.price)}
                    </p>
                    <p className="text-sm text-muted-foreground">Amount due</p>
                  </div>
                  <PaymentDialog
                    bookingId={booking._id}
                    price={booking.price}
                    squarePaymentLinkUrl={booking.squarePaymentLinkUrl}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Update Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {booking.status !== "confirmed" && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleStatusChange("confirmed")}
                >
                  <CheckCircle2 className="size-4 mr-2 text-blue-500" />
                  Mark Confirmed
                </Button>
              )}
              {booking.status !== "in_progress" && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleStatusChange("in_progress")}
                >
                  <Clock className="size-4 mr-2 text-purple-500" />
                  Start Service
                </Button>
              )}
              {booking.status !== "completed" && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleStatusChange("completed")}
                >
                  <CheckCircle2 className="size-4 mr-2 text-green-500" />
                  Mark Completed
                </Button>
              )}
              {booking.status !== "cancelled" && (
                <Button
                  variant="outline"
                  className="w-full justify-start text-destructive hover:text-destructive"
                  onClick={() => handleStatusChange("cancelled")}
                >
                  <XCircle className="size-4 mr-2" />
                  Cancel Appointment
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Satisfaction (if completed) */}
          {booking.status === "completed" && booking.satisfaction && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Customer Feedback</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-2">
                  {booking.satisfaction === "yes" ? (
                    <>
                      <CheckCircle2 className="size-10 text-green-500 mx-auto mb-2" />
                      <p className="font-semibold text-green-700">
                        Satisfied! ⭐
                      </p>
                    </>
                  ) : (
                    <>
                      <XCircle className="size-10 text-orange-500 mx-auto mb-2" />
                      <p className="font-semibold text-orange-700">
                        Needs Follow-up
                      </p>
                    </>
                  )}
                  {booking.followUpNote && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {booking.followUpNote}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
