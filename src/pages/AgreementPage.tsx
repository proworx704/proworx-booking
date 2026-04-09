import { useMutation, useQuery } from "convex/react";
import {
  CheckCircle2,
  FileText,
  Clock,
  MapPin,
  Car,
  DollarSign,
  AlertCircle,
  Shield,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BUSINESS_NAME, BUSINESS_PHONE, BUSINESS_EMAIL } from "@/lib/constants";
import { api } from "../../convex/_generated/api";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime12h(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function formatDateReadable(dateStr: string): string {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, mo - 1, d);
  return dt.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// ─── Agreement Sections ──────────────────────────────────────────────────────

const AGREEMENT_SECTIONS = [
  {
    icon: Clock,
    title: "Punctuality & Availability",
    content:
      "I agree to be present and available at the designated service address at the scheduled appointment time. If I need to reschedule, I will contact ProWorx Mobile Detailing at least 24 hours in advance.",
  },
  {
    icon: Car,
    title: "Vehicle Preparation",
    content:
      "I agree to have my vehicle(s) pulled out and accessible with adequate room to work around all sides. The immediate area will be clear of obstacles, other vehicles, or structures that may impede the detailing process.",
  },
  {
    icon: DollarSign,
    title: "Payment",
    content:
      "I understand that payment is due and will be collected upon completion of each appointment. I will have an accepted form of payment available at the time of service.",
  },
  {
    icon: AlertCircle,
    title: "Pricing & Scope of Work",
    content:
      "I understand that my appointment is initially based on standard times, labor, and pricing for the selected service. Actual costs may vary depending on the current condition of my vehicle. If any additional labor or charges are needed beyond the original quote, the ProWorx team will communicate this to me and receive my approval before proceeding with any additional work.",
  },
  {
    icon: FileText,
    title: "Vehicle Access & Personal Items",
    content:
      "If interior services are included, I will ensure the vehicle is unlocked and keys are accessible for the technician. I will remove all valuable personal items from the vehicle prior to the appointment. ProWorx Mobile Detailing is not responsible for personal items left in the vehicle.",
  },
  {
    icon: Shield,
    title: "Pre-Existing Conditions",
    content:
      "I acknowledge that ProWorx Mobile Detailing is not liable for any pre-existing damage, defects, or wear on the vehicle, including but not limited to paint imperfections, scratches, dents, or interior damage that existed prior to service.",
  },
  {
    icon: Clock,
    title: "Weather Policy",
    content:
      "In the event of inclement weather that may affect the quality of service, ProWorx Mobile Detailing reserves the right to reschedule the appointment. I will be notified as soon as possible and a new time will be arranged.",
  },
  {
    icon: AlertCircle,
    title: "Cancellation & No-Show Policy",
    content:
      "Cancellations made less than 24 hours before the scheduled appointment may be subject to a cancellation fee. Failure to be present at the scheduled time without prior notice (no-show) may result in a fee.",
  },
  {
    icon: Shield,
    title: "Safety",
    content:
      "For the safety of our technicians, I agree to keep pets secured and away from the work area during the appointment. Professional-grade chemicals and equipment are used during the detailing process.",
  },
  {
    icon: CheckCircle2,
    title: "Satisfaction",
    content:
      "ProWorx Mobile Detailing takes pride in quality work. If I have any concerns about the completed service, I will bring them to the attention of the technician before they leave so they can be addressed on-site.",
  },
];

// ─── Main Component ──────────────────────────────────────────────────────────

export function AgreementPage() {
  const [searchParams] = useSearchParams();
  const code = searchParams.get("code") || "";

  const booking = useQuery(api.agreements.getByCode, code ? { code } : "skip");
  const signAgreement = useMutation(api.agreements.sign);

  const [signerName, setSignerName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [error, setError] = useState("");

  // ── No code provided ──
  if (!code) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="size-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Missing Confirmation Code</h2>
            <p className="text-muted-foreground">
              This page requires a valid booking confirmation code. Please use the
              link from your booking confirmation email.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Loading ──
  if (booking === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  // ── Not found ──
  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="size-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Booking Not Found</h2>
            <p className="text-muted-foreground">
              We couldn't find a booking with that confirmation code. Please check
              the link in your email and try again.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Already signed ──
  if (booking.agreementSigned || signed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-green-50 to-white">
        <Card className="max-w-lg w-full shadow-lg">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="size-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="size-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-green-800">Agreement Signed ✅</h2>
            <p className="text-muted-foreground">
              Thank you, <strong>{booking.agreementSignerName || signerName}</strong>!
              Your pre-appointment agreement for your{" "}
              <strong>{booking.serviceName}</strong> on{" "}
              <strong>{formatDateReadable(booking.date)}</strong> has been received.
            </p>
            <div className="bg-green-50 rounded-lg p-4 text-sm text-green-700">
              <p className="font-medium">We're looking forward to seeing you!</p>
              <p className="mt-1">
                📅 {formatDateReadable(booking.date)} at {formatTime12h(booking.time)}
              </p>
              <p>📍 {booking.serviceAddress}</p>
            </div>
            <p className="text-xs text-muted-foreground pt-2">
              Questions? Contact us at {BUSINESS_PHONE} or {BUSINESS_EMAIL}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Handle sign ──
  const handleSign = async () => {
    if (!signerName.trim()) {
      setError("Please enter your full name to sign the agreement.");
      return;
    }
    if (!agreed) {
      setError("Please check the box to confirm you agree to the terms.");
      return;
    }

    setSigning(true);
    setError("");
    try {
      await signAgreement({
        confirmationCode: code,
        signerName: signerName.trim(),
      });
      setSigned(true);
    } catch (err: any) {
      setError(err.message || "Failed to sign. Please try again.");
    } finally {
      setSigning(false);
    }
  };

  const variant = booking.selectedVariant ? ` (${booking.selectedVariant})` : "";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <FileText className="size-6 text-primary" />
            <h1 className="text-2xl font-bold">Pre-Appointment Agreement</h1>
          </div>
          <p className="text-muted-foreground">
            {BUSINESS_NAME}
          </p>
        </div>

        {/* Booking Summary */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Customer:</span>
                <span className="font-medium">{booking.customerName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Service:</span>
                <span className="font-medium">
                  {booking.serviceName}{variant}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="size-3.5 text-muted-foreground" />
                <span className="font-medium">
                  {formatDateReadable(booking.date)} at {formatTime12h(booking.time)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="size-3.5 text-muted-foreground" />
                <span className="font-medium">{booking.serviceAddress}</span>
              </div>
              {(booking.totalPrice || booking.price) > 0 && (
                <div className="flex items-center gap-2">
                  <DollarSign className="size-3.5 text-muted-foreground" />
                  <span className="font-medium">
                    {formatPrice(booking.totalPrice ?? booking.price)}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Confirmation:</span>
                <code className="font-mono text-xs bg-white px-2 py-0.5 rounded border">
                  {booking.confirmationCode}
                </code>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Agreement Terms */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Terms & Expectations</CardTitle>
            <p className="text-sm text-muted-foreground">
              Please review each section below. By signing, you acknowledge and agree
              to the following terms for your upcoming appointment.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            {AGREEMENT_SECTIONS.map((section, i) => {
              const Icon = section.icon;
              return (
                <div key={i} className="flex gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="size-8 rounded-full bg-slate-100 flex items-center justify-center">
                      <Icon className="size-4 text-slate-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm mb-1">
                      {i + 1}. {section.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {section.content}
                    </p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Signature Section */}
        <Card className="border-primary/30 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Sign Agreement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signerName">Full Name (as your signature)</Label>
              <Input
                id="signerName"
                placeholder="Enter your full name"
                value={signerName}
                onChange={(e) => {
                  setSignerName(e.target.value);
                  setError("");
                }}
                className="text-lg h-12"
              />
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => {
                  setAgreed(e.target.checked);
                  setError("");
                }}
                className="mt-1 size-4 rounded border-gray-300"
              />
              <span className="text-sm text-muted-foreground leading-relaxed">
                I have read and agree to the terms and expectations outlined above for
                my appointment with {BUSINESS_NAME}. I understand that this is a
                binding acknowledgment of the service conditions.
              </span>
            </label>

            {error && (
              <div className="text-sm text-destructive flex items-center gap-2">
                <AlertCircle className="size-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <Button
              onClick={handleSign}
              disabled={signing || !signerName.trim() || !agreed}
              className="w-full h-12 text-base"
              size="lg"
            >
              {signing ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Signing...
                </>
              ) : (
                <>
                  <FileText className="size-4 mr-2" />
                  Sign Agreement
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              By signing, you agree to the terms above. A record of your signature
              will be stored securely. Date: {new Date().toLocaleDateString()}
            </p>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground pb-8 space-y-1">
          <p>
            <strong>{BUSINESS_NAME}</strong> · Charlotte, NC & Surrounding Areas
          </p>
          <p>
            {BUSINESS_PHONE} · {BUSINESS_EMAIL}
          </p>
        </div>
      </div>
    </div>
  );
}
