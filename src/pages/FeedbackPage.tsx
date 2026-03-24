import { useMutation, useQuery } from "convex/react";
import {
  CheckCircle2,
  Frown,
  MessageSquare,
  Star,
  ExternalLink,
  Send,
  Sparkles,
  Heart,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { BUSINESS_NAME, BUSINESS_PHONE, REVIEW_URL } from "@/lib/constants";
import { api } from "../../convex/_generated/api";

// ─── Star Rating Component ───────────────────────────────────────────────────

function StarRating({
  value,
  onChange,
  size = 40,
  disabled = false,
}: {
  value: number;
  onChange: (rating: number) => void;
  size?: number;
  disabled?: boolean;
}) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex gap-1 justify-center">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= (hover || value);
        return (
          <button
            key={star}
            type="button"
            disabled={disabled}
            className={`transition-all duration-200 ${
              disabled ? "cursor-default" : "cursor-pointer hover:scale-110"
            } ${filled ? "text-yellow-400" : "text-gray-300"}`}
            onClick={() => onChange(star)}
            onMouseEnter={() => !disabled && setHover(star)}
            onMouseLeave={() => !disabled && setHover(0)}
          >
            <Star
              style={{ width: size, height: size }}
              className={`transition-all duration-200 ${
                filled ? "fill-yellow-400 drop-shadow-md" : ""
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}

// ─── Confetti Effect ─────────────────────────────────────────────────────────

function Confetti() {
  const colors = [
    "#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1",
    "#96E6A1", "#DDA0DD", "#F7DC6F", "#FF8C00",
  ];

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {Array.from({ length: 50 }).map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 2;
        const duration = 2 + Math.random() * 3;
        const color = colors[i % colors.length];
        const rotation = Math.random() * 360;
        const size = 6 + Math.random() * 8;

        return (
          <div
            key={i}
            className="absolute animate-confetti"
            style={{
              left: `${left}%`,
              top: "-10px",
              width: `${size}px`,
              height: `${size * 0.6}px`,
              backgroundColor: color,
              borderRadius: "2px",
              transform: `rotate(${rotation}deg)`,
              animation: `confetti-fall ${duration}s ease-in ${delay}s forwards`,
            }}
          />
        );
      })}
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ─── Rating Labels ───────────────────────────────────────────────────────────

const ratingLabels: Record<number, { label: string; emoji: string; color: string }> = {
  1: { label: "Poor", emoji: "😞", color: "text-red-500" },
  2: { label: "Below Average", emoji: "😕", color: "text-orange-500" },
  3: { label: "Average", emoji: "😐", color: "text-yellow-600" },
  4: { label: "Great!", emoji: "😊", color: "text-green-500" },
  5: { label: "Amazing!", emoji: "🤩", color: "text-green-600" },
};

const feedbackCategories = [
  "Quality of work",
  "Timeliness",
  "Communication",
  "Value for price",
  "Professionalism",
  "Other",
];

// ─── Main Component ──────────────────────────────────────────────────────────

export function FeedbackPage() {
  const [params] = useSearchParams();
  const code = params.get("code") || "";
  const booking = useQuery(
    api.bookings.getByConfirmation,
    code ? { code } : "skip",
  );
  const submitFeedback = useMutation(api.bookings.submitFeedback);
  const trackReviewClick = useMutation(api.bookings.trackReviewClick);

  const [step, setStep] = useState<"rate" | "happy" | "unhappy" | "thankyou">("rate");
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Check if already submitted
  useEffect(() => {
    if (booking?.satisfaction === "yes") setStep("happy");
    else if (booking?.satisfaction === "no") setStep("thankyou");
  }, [booking?.satisfaction]);

  const handleRating = useCallback(
    async (stars: number) => {
      setRating(stars);

      if (stars >= 4) {
        // Happy path — submit immediately and show Google review prompt
        setSubmitting(true);
        try {
          await submitFeedback({
            confirmationCode: code,
            satisfaction: "yes",
            rating: stars,
          });
          setShowConfetti(true);
          setTimeout(() => setStep("happy"), 800);
        } catch (e) {
          console.error("Feedback submit failed:", e);
        } finally {
          setSubmitting(false);
        }
      } else {
        // Unhappy path — show feedback form
        setStep("unhappy");
      }
    },
    [code, submitFeedback],
  );

  const handleUnhappySubmit = async () => {
    setSubmitting(true);
    try {
      const categoryPrefix =
        selectedCategories.length > 0
          ? `[${selectedCategories.join(", ")}] `
          : "";
      await submitFeedback({
        confirmationCode: code,
        satisfaction: "no",
        rating,
        note: categoryPrefix + note,
      });
      setStep("thankyou");
    } catch (e) {
      console.error("Feedback submit failed:", e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviewClick = async () => {
    try {
      await trackReviewClick({ confirmationCode: code });
    } catch {
      // Non-critical — just tracking
    }
    window.open(REVIEW_URL, "_blank", "noopener,noreferrer");
  };

  // ─── Loading/Error States ────────────────────────────────────────────────

  if (!code) {
    return (
      <div className="container max-w-lg py-16 text-center">
        <MessageSquare className="size-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Feedback</h1>
        <p className="text-muted-foreground">
          Invalid feedback link. Please use the link from your confirmation
          email or text.
        </p>
      </div>
    );
  }

  if (booking === undefined) {
    return (
      <div className="container max-w-lg py-16 text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48 mx-auto" />
          <div className="h-4 bg-muted rounded w-64 mx-auto" />
          <div className="flex gap-2 justify-center">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="size-10 bg-muted rounded-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="container max-w-lg py-16 text-center">
        <Frown className="size-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Booking Not Found</h1>
        <p className="text-muted-foreground">
          We couldn't find a booking with that code. Please check the link.
        </p>
      </div>
    );
  }

  // ─── Happy Path — Google Review Prompt ───────────────────────────────────

  if (step === "happy") {
    return (
      <div className="container max-w-lg py-12">
        {showConfetti && <Confetti />}
        <div className="text-center space-y-6">
          <div className="relative inline-block">
            <Sparkles className="size-16 text-yellow-500 mx-auto animate-pulse" />
          </div>

          <div>
            <h1 className="text-3xl font-bold mb-2">
              Thank You, {booking.customerName.split(" ")[0]}! 🎉
            </h1>
            <p className="text-muted-foreground text-lg">
              We're thrilled you loved your {booking.serviceName}!
            </p>
          </div>

          <Card className="border-yellow-200 bg-yellow-50/50">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-center gap-2">
                <Star className="size-5 fill-yellow-400 text-yellow-400" />
                <Star className="size-5 fill-yellow-400 text-yellow-400" />
                <Star className="size-5 fill-yellow-400 text-yellow-400" />
                <Star className="size-5 fill-yellow-400 text-yellow-400" />
                <Star className="size-5 fill-yellow-400 text-yellow-400" />
              </div>

              <p className="text-center font-medium text-lg">
                Would you share your experience on Google?
              </p>
              <p className="text-sm text-muted-foreground text-center">
                It takes less than 30 seconds and helps other Charlotte car
                owners find us. Every review makes a huge difference! 🙏
              </p>

              <Button
                size="lg"
                className="w-full text-lg py-6 bg-blue-600 hover:bg-blue-700"
                onClick={handleReviewClick}
              >
                <ExternalLink className="size-5 mr-2" />
                Leave a Google Review
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Opens Google in a new tab
              </p>
            </CardContent>
          </Card>

          <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
            <Heart className="size-3 fill-red-400 text-red-400" />
            {BUSINESS_NAME} · Thank you for your support
          </p>
        </div>
      </div>
    );
  }

  // ─── Unhappy Path — Private Feedback Form ────────────────────────────────

  if (step === "unhappy") {
    const ratingInfo = ratingLabels[rating] || ratingLabels[3];

    return (
      <div className="container max-w-lg py-12">
        <Card>
          <CardHeader className="text-center">
            <div className="text-4xl mb-2">{ratingInfo.emoji}</div>
            <CardTitle className="text-2xl">
              We Want to Make It Right
            </CardTitle>
            <CardDescription>
              We're sorry your experience wasn't perfect,{" "}
              {booking.customerName.split(" ")[0]}. Your feedback goes directly
              to the owner — not posted publicly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Star display */}
            <div className="text-center">
              <StarRating value={rating} onChange={setRating} size={28} />
              <p className={`text-sm mt-1 font-medium ${ratingInfo.color}`}>
                {ratingInfo.label}
              </p>
            </div>

            {/* Category chips */}
            <div>
              <p className="text-sm font-medium mb-2">
                What area could we improve?{" "}
                <span className="text-muted-foreground font-normal">
                  (select all that apply)
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                {feedbackCategories.map((cat) => {
                  const selected = selectedCategories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        selected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border hover:bg-accent"
                      }`}
                      onClick={() =>
                        setSelectedCategories((prev) =>
                          selected
                            ? prev.filter((c) => c !== cat)
                            : [...prev, cat],
                        )
                      }
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Note */}
            <div>
              <p className="text-sm font-medium mb-2">
                Tell us more{" "}
                <span className="text-muted-foreground font-normal">
                  (optional but helpful)
                </span>
              </p>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What happened? How can we do better next time?"
                rows={4}
                className="resize-none"
              />
            </div>

            <Button
              size="lg"
              className="w-full"
              onClick={handleUnhappySubmit}
              disabled={submitting}
            >
              {submitting ? (
                "Sending..."
              ) : (
                <>
                  <Send className="size-4 mr-2" />
                  Send Private Feedback
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              🔒 This goes directly to the owner — it will never be posted
              publicly.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Thank You (after unhappy feedback) ──────────────────────────────────

  if (step === "thankyou") {
    return (
      <div className="container max-w-lg py-16 text-center">
        <CheckCircle2 className="size-14 text-blue-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Thank You for Your Feedback</h1>
        <p className="text-muted-foreground mb-6">
          We've received your feedback and the owner will be reviewing it
          personally. We take every response seriously and will reach out if
          needed.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
          <p className="font-medium text-blue-900 mb-1">
            Need immediate help?
          </p>
          <p className="text-blue-700">
            Call us at{" "}
            <a href={`tel:${BUSINESS_PHONE}`} className="font-medium underline">
              {BUSINESS_PHONE}
            </a>{" "}
            — we'll make it right.
          </p>
        </div>
        <p className="text-xs text-muted-foreground mt-6">
          {BUSINESS_NAME} · Your satisfaction is our top priority
        </p>
      </div>
    );
  }

  // ─── Initial Rating Screen ───────────────────────────────────────────────

  return (
    <div className="container max-w-lg py-12">
      <Card className="overflow-hidden">
        {/* Header with gradient */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 text-center">
          <div className="size-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-3">
            <Star className="size-8 text-yellow-400 fill-yellow-400" />
          </div>
          <h1 className="text-2xl font-bold mb-1">How Was Your Detail?</h1>
          <p className="text-white/70 text-sm">
            Hi {booking.customerName.split(" ")[0]}! We recently completed your{" "}
            <span className="text-white font-medium">{booking.serviceName}</span>.
          </p>
        </div>

        <CardContent className="p-6 space-y-6">
          {/* Star Rating */}
          <div className="text-center space-y-3">
            <p className="text-sm font-medium text-muted-foreground">
              Tap a star to rate your experience
            </p>
            <StarRating
              value={rating}
              onChange={handleRating}
              size={48}
              disabled={submitting}
            />
            {rating > 0 && (
              <p
                className={`text-lg font-semibold transition-all duration-300 ${
                  ratingLabels[rating]?.color || ""
                }`}
              >
                {ratingLabels[rating]?.emoji} {ratingLabels[rating]?.label}
              </p>
            )}
            {submitting && (
              <p className="text-sm text-muted-foreground animate-pulse">
                Submitting...
              </p>
            )}
          </div>

          {/* Trust indicators */}
          <div className="border-t pt-4">
            <div className="grid grid-cols-3 gap-3 text-center text-xs text-muted-foreground">
              <div>
                <p className="text-lg font-bold text-foreground">12+</p>
                <p>Years in business</p>
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">50+</p>
                <p>Google reviews</p>
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">⭐ 5.0</p>
                <p>Average rating</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            {BUSINESS_NAME} · Your feedback takes 10 seconds
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
