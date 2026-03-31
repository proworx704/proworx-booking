import { useAction, useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  Calendar,
  Car,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  DollarSign,
  ExternalLink,
  Link2,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Navigation,
  Phone,
  Truck,
  Undo2,
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
import { EditBookingDialog } from "@/components/EditBookingDialog";
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
  const [zettleOpened, setZettleOpened] = useState(false);
  // zettleDeepLinkFailed removed — we skip deep links entirely
  const [zelleDetailsCopied, setZelleDetailsCopied] = useState(false);
  const [manualUrl, setManualUrl] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const markPaid = useMutation(api.bookings.markPaid);
  const createSquareLink = useAction(api.squarePayments.createPaymentLink);
  const setManualLink = useMutation(api.squarePayments.setPaymentLinkManual);

  const amountCents = Math.round(Number.parseFloat(amount) * 100);
  const amountFormatted = `$${Number.parseFloat(amount).toFixed(2)}`;

  const [deepLinkFailed, setDeepLinkFailed] = useState(false);

  // Zelle business details
  const ZELLE_BUSINESS_NAME = "ProWorx Detailing LLC";
  const ZELLE_TAG = "proworxdetailingllc";
  const ZELLE_EMAIL = "detailing@proworxdetailing.com";

  // Build the Square POS deep link URL (matches Square docs exactly)
  // Docs: https://developer.squareup.com/docs/pos-api/build-mobile-web
  const buildPosUrl = () => {
    const noteText = `ProWorx ${confirmationCode} - ${serviceName} for ${customerName}`;
    const dataParameter = {
      amount_money: {
        amount: String(amountCents),  // Square docs: amount is a string
        currency_code: "USD",
      },
      callback_url: window.location.origin + "/pos-callback",
      client_id: "sq0idp-K_iDYBH6KaPt8scVIgjv6w",
      version: "1.3",
      notes: noteText,
      options: {
        supported_tender_types: ["CREDIT_CARD", "CASH", "OTHER", "SQUARE_GIFT_CARD", "CARD_ON_FILE"],
      },
    };
    return "square-commerce-v1://payment/create?data=" + encodeURIComponent(JSON.stringify(dataParameter));
  };

  // Try to open a POS app via deep link with fallback detection
  const openPosApp = (
    deepLinkUrl: string,
    onOpened: () => void,
    onFailed: () => void,
  ) => {
    window.location.href = deepLinkUrl;
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
      if (!didLeave && Date.now() - startTime < 3000) {
        onFailed();
      }
      onOpened();
    }, 2500);
  };

  const handleChargeWithReader = () => {
    openPosApp(
      buildPosUrl(),
      () => setReaderOpened(true),
      () => setDeepLinkFailed(true),
    );
  };

  const handleChargeWithZettle = () => {
    // Copy amount to clipboard, then skip straight to "opened" state
    // (deep links like izettle:// don't work in iOS Safari PWAs)
    navigator.clipboard.writeText(amount).catch(() => {});
    setZettleOpened(true);
  };

  const handleGenerateLink = async () => {
    setIsGenerating(true);
    try {
      const result = await createSquareLink({
        bookingId,
        serviceName,
        amountCents,
        customerName,
        confirmationCode,
      });
      if (!result.success) {
        alert(
          "Could not generate link automatically. You can paste a Square link manually."
        );
        setShowManualInput(true);
      }
    } catch (e) {
      console.error("Failed to generate Square link:", e);
      alert(
        "Could not generate link automatically. You can paste a Square link manually."
      );
      setShowManualInput(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveManualLink = async () => {
    if (!manualUrl.trim()) return;
    try {
      await setManualLink({ bookingId, url: manualUrl.trim() });
      setShowManualInput(false);
      setManualUrl("");
    } catch (e) {
      console.error("Failed to save link:", e);
    }
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

  const handleCopyZelleDetails = () => {
    const details = `Send ${amountFormatted} via Zelle to:\n${ZELLE_BUSINESS_NAME}\n${ZELLE_EMAIL}`;
    navigator.clipboard.writeText(details).catch(() => {});
    setZelleDetailsCopied(true);
    setTimeout(() => setZelleDetailsCopied(false), 2000);
  };

  const handleTextZelleDetails = () => {
    const message = `Hi ${customerName.split(" ")[0]}! Please send ${amountFormatted} via Zelle to:\n\nProWorx Detailing LLC\n${ZELLE_EMAIL}\n\nThank you!`;
    window.open(`sms:?body=${encodeURIComponent(message)}`, "_blank");
  };

  const handleMarkPaid = async (payMethod: string) => {
    setIsProcessing(true);
    try {
      await markPaid({
        id: bookingId,
        paymentMethod: payMethod,
        paymentAmount: amountCents,
      });
      setOpen(false);
      setReaderOpened(false);
      setZettleOpened(false);
    } catch (e) {
      console.error("Payment failed:", e);
      alert("Payment recording failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayment = async () => {
    if (method === "card" && squarePaymentLinkUrl && cardMode === "link") {
      window.open(squarePaymentLinkUrl, "_blank");
      await handleMarkPaid("card");
      return;
    }
    await handleMarkPaid(method);
  };

  // Reset sub-states when method changes
  const handleMethodChange = (newMethod: string) => {
    setMethod(newMethod);
    setReaderOpened(false);
    setZettleOpened(false);
    setDeepLinkFailed(false);
    setZettleDeepLinkFailed(false);
    setZelleDetailsCopied(false);
  };

  // Whether the footer "Confirm" button should be hidden (reader flows have their own buttons)
  const hideFooterConfirm =
    (method === "card" && cardMode === "reader") ||
    (method === "zettle") ||
    (method === "zelle") ||
    (method === "paypal");

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setReaderOpened(false);
          setZettleOpened(false);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button className="w-full" size="lg">
          <CreditCard className="size-4 mr-2" />
          Take Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Process Payment</DialogTitle>
          <DialogDescription>
            {formatPrice(price)} for {serviceName}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Payment Method Selector */}
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select value={method} onValueChange={handleMethodChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="card">
                  💳 Credit/Debit Card (Square)
                </SelectItem>
                <SelectItem value="zettle">
                  💳 Credit/Debit Card (PayPal Zettle)
                </SelectItem>
                <SelectItem value="zelle">⚡ Zelle</SelectItem>
                <SelectItem value="cash">💵 Cash</SelectItem>
                <SelectItem value="venmo">💜 Venmo</SelectItem>
                <SelectItem value="paypal">🅿️ PayPal</SelectItem>
                <SelectItem value="check">📝 Check</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ═══════════════════════════════════════════════ */}
          {/* SQUARE CARD SECTION                            */}
          {/* ═══════════════════════════════════════════════ */}
          {method === "card" && (
            <div className="space-y-3">
              {/* Toggle: Reader vs Payment Link */}
              <div className="flex rounded-lg border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setCardMode("reader")}
                  className={`flex-1 py-2.5 px-3 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${
                    cardMode === "reader"
                      ? "bg-black text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Phone className="size-3.5" />
                  Charge with Reader
                </button>
                <button
                  type="button"
                  onClick={() => setCardMode("link")}
                  className={`flex-1 py-2.5 px-3 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${
                    cardMode === "link"
                      ? "bg-black text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Link2 className="size-3.5" />
                  Payment Link
                </button>
              </div>

              {/* READER MODE */}
              {cardMode === "reader" && !readerOpened && (
                <div className="space-y-3">
                  <div className="p-4 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl text-white text-center">
                    <p className="text-3xl font-bold tracking-tight">
                      {amountFormatted}
                    </p>
                    <p className="text-gray-400 text-xs mt-1">
                      {serviceName} — {customerName}
                    </p>
                  </div>
                  <Button
                    className="w-full h-12 text-base font-semibold bg-black hover:bg-gray-800"
                    onClick={handleChargeWithReader}
                  >
                    <Phone className="size-5 mr-2" />
                    Open Square POS — {amountFormatted}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Opens Square POS with {amountFormatted} ready to charge.
                    <br />
                    Tap to Pay, insert card, or swipe — tip prompt included.
                  </p>
                </div>
              )}

              {/* READER MODE — after opening Square POS */}
              {cardMode === "reader" && readerOpened && (
                <div className="space-y-3">
                  <div className="p-4 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl text-white text-center">
                    <p className="text-3xl font-bold tracking-tight">
                      {amountFormatted}
                    </p>
                    <p className="text-gray-400 text-xs mt-1">
                      {serviceName} — {customerName}
                    </p>
                    <p className="text-gray-500 text-[10px] mt-1">
                      Amount copied to clipboard
                    </p>
                  </div>

                  {/* Deep link failed — show manual instructions */}
                  {deepLinkFailed && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2.5">
                      <p className="text-xs font-medium text-amber-900 text-center">
                        ⚠️ Square POS didn't open automatically
                      </p>
                      {/* Direct deep link - user taps this directly */}
                      <a
                        href={buildPosUrl()}
                        className="block w-full text-center py-2 px-3 bg-black text-white text-sm font-medium rounded-lg"
                      >
                        Tap here to open Square POS →
                      </a>
                      <p className="text-[11px] text-amber-700 text-center">
                        If that doesn't work either, open Square POS manually and charge <span className="font-bold">{amountFormatted}</span>
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs"
                          onClick={() => {
                            navigator.clipboard.writeText(amount).catch(() => {});
                          }}
                        >
                          <Copy className="size-3 mr-1" />
                          Copy ${amount}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs"
                          onClick={() => {
                            window.open("https://squareup.com/dashboard/sales/transactions/new", "_blank");
                          }}
                        >
                          <ExternalLink className="size-3 mr-1" />
                          Open Square
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Standard flow — Square POS opened or manual charge */}
                  {!deepLinkFailed && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-xs text-amber-800 text-center">
                        Charge <span className="font-bold">{amountFormatted}</span> in Square POS, then tap the green button below to record it.
                      </p>
                    </div>
                  )}

                  <Button
                    className="w-full h-12 bg-green-600 hover:bg-green-700"
                    onClick={() => handleMarkPaid("card")}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <Loader2 className="size-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="size-5 mr-2" />
                    )}
                    {isProcessing
                      ? "Recording..."
                      : "I Charged in Square ✓"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-muted-foreground"
                    onClick={() => { setReaderOpened(false); setDeepLinkFailed(false); }}
                  >
                    ← Try again
                  </Button>
                </div>
              )}

              {/* LINK MODE */}
              {cardMode === "link" && (
                <div className="space-y-3">
                  {squarePaymentLinkUrl ? (
                    <>
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="font-medium text-green-700 flex items-center gap-1.5 text-sm">
                          <CheckCircle2 className="size-4" />
                          Square Payment Link Ready
                        </p>
                        <p className="text-xs text-green-600 mt-1 truncate">
                          {squarePaymentLinkUrl}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={handleCopyLink}
                        >
                          {linkCopied ? (
                            <CheckCircle2 className="size-3.5 mr-1.5 text-green-500" />
                          ) : (
                            <Copy className="size-3.5 mr-1.5" />
                          )}
                          {linkCopied ? "Copied!" : "Copy Link"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={handleTextLink}
                        >
                          <MessageSquare className="size-3.5 mr-1.5" />
                          Text to Customer
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            window.open(squarePaymentLinkUrl, "_blank")
                          }
                        >
                          <ExternalLink className="size-3.5" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="font-medium text-blue-700 text-sm flex items-center gap-1.5">
                          <Link2 className="size-4" />
                          Generate a Square checkout link
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          Creates a payment link you can text to the customer or
                          open on their phone.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          className="flex-1"
                          onClick={handleGenerateLink}
                          disabled={isGenerating}
                        >
                          {isGenerating ? (
                            <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <CreditCard className="size-3.5 mr-1.5" />
                          )}
                          {isGenerating
                            ? "Generating..."
                            : "Generate Square Link"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setShowManualInput(!showManualInput)
                          }
                        >
                          Paste Link
                        </Button>
                      </div>
                      {showManualInput && (
                        <div className="flex gap-2">
                          <Input
                            placeholder="https://square.link/u/..."
                            value={manualUrl}
                            onChange={(e) => setManualUrl(e.target.value)}
                            className="text-sm"
                          />
                          <Button
                            size="sm"
                            onClick={handleSaveManualLink}
                            disabled={!manualUrl.trim()}
                          >
                            Save
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════ */}
          {/* ZETTLE (PayPal) CARD READER SECTION            */}
          {/* ═══════════════════════════════════════════════ */}
          {method === "zettle" && (
            <div className="space-y-3">
              {!zettleOpened ? (
                <div className="space-y-3">
                  <div className="p-4 bg-gradient-to-br from-blue-900 to-blue-800 rounded-xl text-white text-center">
                    <p className="text-3xl font-bold tracking-tight">
                      {amountFormatted}
                    </p>
                    <p className="text-blue-300 text-xs mt-1">
                      {serviceName} — {customerName}
                    </p>
                  </div>
                  <Button
                    className="w-full h-12 text-base font-semibold bg-blue-700 hover:bg-blue-800"
                    onClick={handleChargeWithZettle}
                  >
                    <CreditCard className="size-5 mr-2" />
                    Open Zettle — {amountFormatted}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Opens PayPal Zettle app. Enter {amountFormatted} and process card.
                    <br />
                    Tap to Pay, insert, or swipe with your Zettle reader.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 bg-gradient-to-br from-blue-900 to-blue-800 rounded-xl text-white text-center">
                    <p className="text-3xl font-bold tracking-tight">
                      {amountFormatted}
                    </p>
                    <p className="text-blue-300 text-xs mt-1">
                      {serviceName} — {customerName}
                    </p>
                    <p className="text-blue-400 text-[10px] mt-1">
                      Amount copied to clipboard
                    </p>
                  </div>

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2.5">
                    <p className="text-xs text-blue-800 text-center">
                      Open <span className="font-semibold">Zettle Go</span> app, charge <span className="font-bold">{amountFormatted}</span>, then confirm below.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => {
                        navigator.clipboard.writeText(amount).catch(() => {});
                      }}
                    >
                      <Copy className="size-3 mr-1" />
                      Copy ${amount}
                    </Button>
                  </div>

                  <Button
                    className="w-full h-12 bg-green-600 hover:bg-green-700"
                    onClick={() => handleMarkPaid("zettle")}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <Loader2 className="size-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="size-5 mr-2" />
                    )}
                    {isProcessing
                      ? "Recording..."
                      : "I Charged in Zettle ✓"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-muted-foreground"
                    onClick={() => { setZettleOpened(false); setZettleDeepLinkFailed(false); }}
                  >
                    ← Try again
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════ */}
          {/* ZELLE SECTION                                  */}
          {/* ═══════════════════════════════════════════════ */}
          {method === "zelle" && (
            <div className="space-y-3">
              {/* Payment details card */}
              <div className="p-4 bg-gradient-to-br from-purple-900 to-purple-800 rounded-xl text-white">
                <p className="text-3xl font-bold tracking-tight text-center">
                  {amountFormatted}
                </p>
                <p className="text-purple-300 text-xs mt-1 text-center">
                  {serviceName} — {customerName}
                </p>
                <div className="mt-3 pt-3 border-t border-purple-700 space-y-1.5">
                  <p className="text-purple-200 text-[10px] uppercase tracking-wider font-medium">
                    Send Zelle to
                  </p>
                  <p className="text-white text-sm font-semibold">
                    {ZELLE_BUSINESS_NAME}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <Mail className="size-3 text-purple-300" />
                    <p className="text-purple-100 text-xs">{ZELLE_EMAIL}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <User className="size-3 text-purple-300" />
                    <p className="text-purple-100 text-xs">@{ZELLE_TAG}</p>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handleCopyZelleDetails}
                >
                  {zelleDetailsCopied ? (
                    <CheckCircle2 className="size-3.5 mr-1.5 text-green-500" />
                  ) : (
                    <Copy className="size-3.5 mr-1.5" />
                  )}
                  {zelleDetailsCopied ? "Copied!" : "Copy Details"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handleTextZelleDetails}
                >
                  <MessageSquare className="size-3.5 mr-1.5" />
                  Text to Customer
                </Button>
              </div>

              {/* Confirm payment received */}
              <Button
                className="w-full h-12 bg-green-600 hover:bg-green-700"
                onClick={() => handleMarkPaid("zelle")}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-5 mr-2" />
                )}
                {isProcessing
                  ? "Recording..."
                  : "I Received Zelle Payment ✓"}
              </Button>
            </div>
          )}

          {/* ═══════════════════════════════════════════════ */}
          {/* PAYPAL SECTION                                 */}
          {/* ═══════════════════════════════════════════════ */}
          {method === "paypal" && (
            <div className="space-y-3">
              <div className="p-4 bg-gradient-to-br from-blue-700 to-blue-600 rounded-xl text-white text-center">
                <p className="text-3xl font-bold tracking-tight">
                  {amountFormatted}
                </p>
                <p className="text-blue-200 text-xs mt-1">
                  {serviceName} — {customerName}
                </p>
              </div>
              <div className="bg-white border rounded-xl p-4 flex flex-col items-center">
                <p className="text-xs text-muted-foreground mb-2">
                  Customer scans to pay via PayPal
                </p>
                <img
                  src="/paypal-qr.png"
                  alt="PayPal QR Code"
                  className="w-48 h-48 mx-auto"
                />
                <p className="text-xs text-muted-foreground mt-2 font-medium">
                  Proworx Mobile Detailing
                </p>
              </div>
              <Button
                className="w-full h-12 bg-green-600 hover:bg-green-700"
                onClick={() => handleMarkPaid("paypal")}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-5 mr-2" />
                )}
                {isProcessing
                  ? "Recording..."
                  : "I Received PayPal Payment ✓"}
              </Button>
            </div>
          )}

          {/* Amount */}
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
          {!hideFooterConfirm && (
            <Button onClick={handlePayment} disabled={isProcessing}>
              {isProcessing
                ? "Processing..."
                : method === "card" && squarePaymentLinkUrl
                  ? "Open Square Checkout →"
                  : method === "card"
                    ? "Record Card Payment"
                    : "Confirm Payment"}
            </Button>
          )}
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
  const markUnpaid = useMutation(api.bookings.markUnpaid);
  const [notes, setNotes] = useState<string | null>(null);
  const [savingNotes, setSavingNotes] = useState(false);
  const [undoingPayment, setUndoingPayment] = useState(false);
  const [showUndoConfirm, setShowUndoConfirm] = useState(false);

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
        <EditBookingDialog booking={booking} />
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
            <CardContent className="space-y-3">
              {/* Show all currently assigned staff */}
              {(() => {
                const ids: string[] = (booking as any).staffIds ?? (booking.staffId ? [booking.staffId] : []);
                const names: string[] = (booking as any).staffNames ?? (booking.staffName ? [booking.staffName] : []);
                if (ids.length === 0) return (
                  <p className="text-sm text-muted-foreground">No staff assigned yet</p>
                );
                return ids.map((sid: string, i: number) => (
                  <div key={sid} className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                        {(names[i] || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium">{names[i] || "Unknown"}</p>
                        {i === 0 && ids.length > 1 && (
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Lead</span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => unassignStaff({ id: booking._id, staffId: sid as Id<"staff"> })}
                    >
                      Remove
                    </Button>
                  </div>
                ));
              })()}
              {/* Add another staff member */}
              {(() => {
                const ids: string[] = (booking as any).staffIds ?? (booking.staffId ? [booking.staffId] : []);
                const available = activeStaff?.filter((s) => !ids.includes(s._id));
                if (!available || available.length === 0) return null;
                return (
                  <Select
                    key={ids.join(",")}
                    onValueChange={(staffId) =>
                      assignStaff({ id: booking._id, staffId: staffId as Id<"staff"> })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={ids.length > 0 ? "Add another staff member..." : "Assign a staff member..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {available.map((s) => (
                        <SelectItem key={s._id} value={s._id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                );
              })()}
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
                <div className="text-center py-4 space-y-3">
                  <div>
                    <CheckCircle2 className="size-10 text-green-500 mx-auto mb-2" />
                    <p className="font-semibold text-green-700">Paid</p>
                    <p className="text-sm text-muted-foreground">
                      {formatPrice(booking.paymentAmount ?? booking.totalPrice ?? booking.price)} via{" "}
                      {booking.paymentMethod}
                    </p>
                    {booking.paidAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(booking.paidAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                  {!showUndoConfirm ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => setShowUndoConfirm(true)}
                    >
                      <Undo2 className="size-3.5 mr-1.5" />
                      Undo Payment
                    </Button>
                  ) : (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-2">
                      <p className="text-xs text-red-700 font-medium">
                        Mark this booking as unpaid?
                      </p>
                      <div className="flex gap-2 justify-center">
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={undoingPayment}
                          onClick={async () => {
                            setUndoingPayment(true);
                            try {
                              await markUnpaid({ id: booking._id });
                              setShowUndoConfirm(false);
                            } catch (e) {
                              console.error("Failed to undo payment:", e);
                              alert("Failed to undo payment");
                            } finally {
                              setUndoingPayment(false);
                            }
                          }}
                        >
                          {undoingPayment ? (
                            <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                          ) : null}
                          {undoingPayment ? "Undoing..." : "Yes, Undo"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowUndoConfirm(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
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
                      {formatPrice(booking.totalPrice ?? booking.price)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {(booking.totalPrice ?? booking.price) === 0
                        ? "Included in membership"
                        : "Amount due"}
                    </p>
                  </div>
                  {(booking.totalPrice ?? booking.price) > 0 && (
                    <PaymentDialog
                      bookingId={booking._id}
                      price={booking.totalPrice ?? booking.price}
                      squarePaymentLinkUrl={booking.squarePaymentLinkUrl}
                      serviceName={booking.serviceName}
                      customerName={booking.customerName}
                      confirmationCode={booking.confirmationCode}
                    />
                  )}
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

          {/* Notification Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="size-4" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Confirmation Email</span>
                {booking.confirmationEmailSent ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">✅ Sent</Badge>
                ) : (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800">⏳ Pending</Badge>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Confirmation SMS</span>
                {booking.confirmationSmsSent ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">✅ Sent</Badge>
                ) : (
                  <Badge variant="outline" className="bg-zinc-50 text-zinc-500 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-700">— Not configured</Badge>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">24h Reminder</span>
                {booking.reminder24hSent ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">✅ Sent</Badge>
                ) : (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">🔔 Scheduled</Badge>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">2h Reminder</span>
                {booking.reminder2hSent ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">✅ Sent</Badge>
                ) : (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">🔔 Scheduled</Badge>
                )}
              </div>
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
