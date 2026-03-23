import { useAction, useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  DollarSign,
  ExternalLink,
  Link2,
  Loader2,
  MapPin,
  Navigation,
  Phone,
  User,
} from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
}

function formatDuration(min: number) {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
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

// ─── Payment Dialog (Employee Version) ────────────────────────────────────────

function EmployeePaymentDialog({
  bookingId,
  price,
  squarePaymentLinkUrl,
  serviceName,
  customerName,
  confirmationCode,
}: {
  bookingId: Id<"bookings">;
  price: number;
  squarePaymentLinkUrl?: string;
  serviceName: string;
  customerName: string;
  confirmationCode: string;
}) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState("card");
  const [cardMode, setCardMode] = useState<"reader" | "link">("reader");
  const [amount, setAmount] = useState((price / 100).toFixed(2));
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [readerOpened, setReaderOpened] = useState(false);
  const [manualUrl, setManualUrl] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const [deepLinkFailed, setDeepLinkFailed] = useState(false);

  const markPaid = useMutation(api.employeePortal.markMyJobPaid);
  const createSquareLink = useAction(api.squarePayments.createPaymentLink);
  const setManualLink = useMutation(api.squarePayments.setPaymentLinkManual);

  const amountCents = Math.round(Number.parseFloat(amount) * 100);
  const amountFormatted = `$${Number.parseFloat(amount).toFixed(2)}`;

  const buildPosUrl = () => {
    const noteText = `ProWorx ${confirmationCode} - ${serviceName} for ${customerName}`;
    const dataParameter = {
      amount_money: { amount: String(amountCents), currency_code: "USD" },
      callback_url: window.location.origin + "/pos-callback",
      client_id: "sq0idp-K_iDYBH6KaPt8scVIgjv6w",
      version: "1.3",
      notes: noteText,
      options: { supported_tender_types: ["CREDIT_CARD", "CASH", "OTHER", "SQUARE_GIFT_CARD", "CARD_ON_FILE"] },
    };
    return "square-commerce-v1://payment/create?data=" + encodeURIComponent(JSON.stringify(dataParameter));
  };

  const handleChargeWithReader = () => {
    const posUrl = buildPosUrl();
    window.location.href = posUrl;
    navigator.clipboard.writeText(amount).catch(() => {});
    const startTime = Date.now();
    let didLeave = false;
    const handleBlur = () => { didLeave = true; };
    window.addEventListener("blur", handleBlur);
    const handleVisibility = () => { if (document.hidden) didLeave = true; };
    document.addEventListener("visibilitychange", handleVisibility);
    setTimeout(() => {
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (!didLeave && Date.now() - startTime < 3000) setDeepLinkFailed(true);
      setReaderOpened(true);
    }, 2500);
  };

  const handleGenerateLink = async () => {
    setIsGenerating(true);
    try {
      const result = await createSquareLink({ bookingId, serviceName, amountCents, customerName, confirmationCode });
      if (!result.success) { setShowManualInput(true); }
    } catch {
      setShowManualInput(true);
    } finally { setIsGenerating(false); }
  };

  const handleSaveManualLink = async () => {
    if (!manualUrl.trim()) return;
    try {
      await setManualLink({ bookingId, url: manualUrl.trim() });
      setShowManualInput(false);
      setManualUrl("");
    } catch (e) { console.error(e); }
  };

  const handleCopyLink = async () => {
    if (squarePaymentLinkUrl) {
      await navigator.clipboard.writeText(squarePaymentLinkUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const handleTextLink = () => {
    if (squarePaymentLinkUrl) {
      const message = `Hi ${customerName.split(" ")[0]}! Here's your payment link for your ProWorx appointment: ${squarePaymentLinkUrl}`;
      window.open(`sms:?body=${encodeURIComponent(message)}`, "_blank");
    }
  };

  const handleMarkPaid = async (payMethod: string) => {
    setIsProcessing(true);
    try {
      await markPaid({ id: bookingId, paymentMethod: payMethod, paymentAmount: amountCents });
      setOpen(false);
      setReaderOpened(false);
    } catch (e) {
      console.error(e);
      alert("Payment recording failed");
    } finally { setIsProcessing(false); }
  };

  const handlePayment = async () => {
    if (method === "card" && squarePaymentLinkUrl && cardMode === "link") {
      window.open(squarePaymentLinkUrl, "_blank");
      await handleMarkPaid("card");
      return;
    }
    await handleMarkPaid(method);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setReaderOpened(false); setDeepLinkFailed(false); } }}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-green-600 hover:bg-green-700">
          <CreditCard className="size-4" />
          Take Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>{customerName} — {serviceName}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
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
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="card">💳 Credit/Debit Card (Square)</SelectItem>
                <SelectItem value="cash">💵 Cash</SelectItem>
                <SelectItem value="zelle">📱 Zelle</SelectItem>
                <SelectItem value="venmo">📲 Venmo</SelectItem>
                <SelectItem value="other">📝 Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Square Card Section */}
          {method === "card" && (
            <div className="space-y-3 p-3 bg-muted/50 rounded-lg border">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={cardMode === "reader" ? "default" : "outline"}
                  onClick={() => setCardMode("reader")}
                  className="flex-1 text-xs"
                >
                  Charge with Reader
                </Button>
                <Button
                  size="sm"
                  variant={cardMode === "link" ? "default" : "outline"}
                  onClick={() => setCardMode("link")}
                  className="flex-1 text-xs"
                >
                  Send Payment Link
                </Button>
              </div>
              {cardMode === "reader" && !readerOpened && (
                <div className="space-y-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-2"
                    onClick={handleChargeWithReader}
                  >
                    <ExternalLink className="size-3.5" />
                    Open Square POS — {amountFormatted}
                  </Button>
                  <p className="text-[11px] text-muted-foreground text-center">
                    Opens Square POS with {amountFormatted} ready to charge.
                  </p>
                </div>
              )}
              {cardMode === "reader" && readerOpened && (
                <div className="space-y-2 text-sm">
                  {deepLinkFailed && (
                    <div className="p-2 bg-amber-50 border border-amber-200 rounded text-amber-800 text-xs">
                      <p className="font-medium">⚠️ Square POS didn't open automatically</p>
                      <p className="mt-1">
                        Open Square POS manually and charge <span className="font-bold">{amountFormatted}</span>
                      </p>
                    </div>
                  )}
                  <p className="font-medium text-center">
                    {deepLinkFailed ? "After charging in Square:" : "Did the payment go through in Square?"}
                  </p>
                </div>
              )}
              {cardMode === "link" && (
                <div className="space-y-2">
                  {squarePaymentLinkUrl ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs" onClick={handleCopyLink}>
                          <Copy className="size-3" />
                          {linkCopied ? "Copied!" : "Copy Link"}
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs" onClick={handleTextLink}>
                          <Phone className="size-3" />
                          Text to Customer
                        </Button>
                      </div>
                      <p className="text-[11px] text-muted-foreground text-center truncate">
                        {squarePaymentLinkUrl}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Button size="sm" variant="outline" className="w-full gap-1" onClick={handleGenerateLink} disabled={isGenerating}>
                        {isGenerating ? <Loader2 className="size-3.5 animate-spin" /> : <Link2 className="size-3.5" />}
                        Generate Payment Link
                      </Button>
                      {showManualInput && (
                        <div className="flex gap-2">
                          <Input size={1} placeholder="Paste Square link..." value={manualUrl} onChange={(e) => setManualUrl(e.target.value)} className="text-xs" />
                          <Button size="sm" onClick={handleSaveManualLink}>Save</Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handlePayment} disabled={isProcessing} className="w-full gap-2">
            {isProcessing ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            {method === "card" && squarePaymentLinkUrl && cardMode === "link"
              ? "Open Link & Mark Paid"
              : `Mark Paid — ${amountFormatted}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function MyJobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const booking = useQuery(api.employeePortal.getMyJob, { id: id as Id<"bookings"> });
  const updateStatus = useMutation(api.employeePortal.updateMyJobStatus);
  const updateNotes = useMutation(api.employeePortal.updateMyJobNotes);
  const [notes, setNotes] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (booking === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (booking === null) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/my/calendar"><ArrowLeft className="size-4 mr-1" /> Back to Calendar</Link>
        </Button>
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Job not found or not assigned to you.</p>
        </Card>
      </div>
    );
  }

  const handleStatusChange = async (status: "confirmed" | "in_progress" | "completed") => {
    await updateStatus({ id: booking._id, status });
  };

  const handleSaveNotes = async () => {
    if (notes === null) return;
    setSaving(true);
    try {
      await updateNotes({ id: booking._id, notes });
    } finally { setSaving(false); }
  };

  const totalPrice = booking.totalPrice || booking.price || 0;
  const displayNotes = notes ?? booking.notes ?? "";

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Back + header */}
      <Button variant="ghost" size="sm" asChild>
        <Link to="/my/calendar"><ArrowLeft className="size-4 mr-1" /> My Schedule</Link>
      </Button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{booking.customerName}</h1>
          <p className="text-muted-foreground">{booking.serviceName}
            {booking.selectedVariant && ` · ${booking.selectedVariant}`}
          </p>
          <p className="text-xs text-muted-foreground font-mono mt-1">#{booking.confirmationCode}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={statusColors[booking.status] || ""}>{booking.status.replace("_", " ")}</Badge>
          <Badge className={paymentColors[booking.paymentStatus] || ""}>{booking.paymentStatus}</Badge>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        {booking.status === "confirmed" && (
          <Button variant="default" className="gap-2 bg-purple-600 hover:bg-purple-700" onClick={() => handleStatusChange("in_progress")}>
            🚗 Start Job
          </Button>
        )}
        {booking.status === "in_progress" && (
          <Button variant="default" className="gap-2 bg-green-600 hover:bg-green-700" onClick={() => handleStatusChange("completed")}>
            <CheckCircle2 className="size-4" /> Complete Job
          </Button>
        )}
        {booking.paymentStatus !== "paid" && totalPrice > 0 && (
          <EmployeePaymentDialog
            bookingId={booking._id}
            price={totalPrice}
            squarePaymentLinkUrl={booking.squarePaymentLinkUrl}
            serviceName={booking.serviceName}
            customerName={booking.customerName}
            confirmationCode={booking.confirmationCode}
          />
        )}
        {booking.paymentStatus === "paid" && (
          <Badge className="bg-green-100 text-green-800 text-sm py-1.5 px-3">
            <CheckCircle2 className="size-4 mr-1" /> Payment Collected
          </Badge>
        )}
      </div>

      {/* Details cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Appointment Info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Appointment</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-muted-foreground shrink-0" />
              <span>{formatDate(booking.date)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-muted-foreground shrink-0" />
              <span>
                {formatTime(booking.time)}
                {booking.totalDuration && ` · ${formatDuration(booking.totalDuration)}`}
              </span>
            </div>
            {totalPrice > 0 && (
              <div className="flex items-center gap-2">
                <DollarSign className="size-4 text-muted-foreground shrink-0" />
                <span className="font-medium">{formatPrice(totalPrice)}</span>
                {booking.paymentMethod && (
                  <span className="text-muted-foreground">via {booking.paymentMethod}</span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Customer</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <User className="size-4 text-muted-foreground shrink-0" />
              <span>{booking.customerName}</span>
            </div>
            {booking.customerPhone && (
              <div className="flex items-center gap-2">
                <Phone className="size-4 text-muted-foreground shrink-0" />
                <a href={`tel:${booking.customerPhone}`} className="text-blue-600 underline">
                  {booking.customerPhone}
                </a>
              </div>
            )}
            {booking.serviceAddress && (
              <div className="flex items-start gap-2">
                <MapPin className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span>{booking.serviceAddress}</span>
                  <div className="flex gap-2">
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(booking.serviceAddress)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 text-xs underline inline-flex items-center gap-1"
                    >
                      <Navigation className="size-3" /> Navigate
                    </a>
                    <a
                      href={`https://maps.apple.com/?q=${encodeURIComponent(booking.serviceAddress)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 text-xs underline inline-flex items-center gap-1"
                    >
                      Apple Maps
                    </a>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Crew */}
      {((booking as any).staffNames?.length > 1 || ((booking as any).staffNames?.length === 1 && (booking as any).staffNames[0])) && (
        <Card>
          <CardHeader><CardTitle className="text-base">Crew on This Job</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {((booking as any).staffNames || [booking.staffName]).filter(Boolean).map((name: string, i: number) => (
                <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-muted/60 rounded-full">
                  <div className="size-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-medium">
                    {name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                  </div>
                  <span className="text-sm font-medium">{name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add-ons */}
      {booking.addons && booking.addons.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Add-Ons</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {booking.addons.map((addon: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <span className="text-sm">{addon.name}{addon.variantLabel && ` (${addon.variantLabel})`}</span>
                  <span className="text-sm font-medium">{formatPrice(addon.price)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      <Card>
        <CardHeader><CardTitle className="text-base">Job Notes</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            placeholder="Add notes about this job..."
            value={displayNotes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
          {notes !== null && notes !== (booking.notes ?? "") && (
            <Button size="sm" onClick={handleSaveNotes} disabled={saving}>
              {saving ? <Loader2 className="size-3 animate-spin mr-1" /> : null}
              Save Notes
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
