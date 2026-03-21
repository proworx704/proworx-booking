import { useMutation, useQuery } from "convex/react";
import { CheckCircle2, Frown, MessageSquare, Star, ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { BUSINESS_NAME, REVIEW_URL } from "@/lib/constants";
import { api } from "../../convex/_generated/api";

export function FeedbackPage() {
  const [params] = useSearchParams();
  const code = params.get("code") || "";
  const booking = useQuery(
    api.bookings.getByConfirmation,
    code ? { code } : "skip",
  );
  const submitFeedback = useMutation(api.bookings.submitFeedback);
  const [submitted, setSubmitted] = useState(false);
  const [satisfaction, setSatisfaction] = useState<"yes" | "no" | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!code) {
    return (
      <div className="container max-w-lg py-16 text-center">
        <MessageSquare className="size-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Feedback</h1>
        <p className="text-muted-foreground">
          Invalid feedback link. Please use the link from your confirmation email.
        </p>
      </div>
    );
  }

  if (booking === undefined) {
    return (
      <div className="container max-w-lg py-16 text-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="container max-w-lg py-16 text-center">
        <Frown className="size-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Booking Not Found</h1>
        <p className="text-muted-foreground">
          We couldn't find a booking with that code.
        </p>
      </div>
    );
  }

  // Already submitted or just submitted "yes"
  if (booking.satisfaction === "yes" || (submitted && satisfaction === "yes")) {
    return (
      <div className="container max-w-lg py-16 text-center">
        <Star className="size-12 text-yellow-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">
          Thank You, {booking.customerName}! 🎉
        </h1>
        <p className="text-muted-foreground mb-6">
          We're so glad you loved your detail! Would you mind leaving us a quick
          review? It means the world to us.
        </p>
        <Button size="lg" asChild className="text-lg px-8 py-6">
          <a href={REVIEW_URL} target="_blank" rel="noopener noreferrer">
            <Star className="size-5 mr-2 fill-current" />
            Leave a Review
          </a>
        </Button>
      </div>
    );
  }

  // Already submitted "no"
  if (booking.satisfaction === "no" || (submitted && satisfaction === "no")) {
    return (
      <div className="container max-w-lg py-16 text-center">
        <CheckCircle2 className="size-12 text-blue-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Thank You for the Feedback</h1>
        <p className="text-muted-foreground">
          We've noted your concerns and will be reaching out to make things
          right. Your satisfaction is our top priority.
        </p>
      </div>
    );
  }

  const handleSubmit = async (answer: "yes" | "no") => {
    setSatisfaction(answer);
    setSubmitting(true);
    try {
      await submitFeedback({
        confirmationCode: code,
        satisfaction: answer,
        note: note || undefined,
      });
      setSubmitted(true);
    } catch (e) {
      console.error("Feedback failed:", e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container max-w-lg py-12">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            How was your experience?
          </CardTitle>
          <CardDescription>
            Hi {booking.customerName}! We recently completed your{" "}
            <strong>{booking.serviceName}</strong>. We'd love to know how it
            went.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Any comments? (optional)"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Button
              size="lg"
              variant="outline"
              className="h-24 flex-col gap-2 border-red-200 hover:bg-red-50 hover:border-red-400"
              onClick={() => handleSubmit("no")}
              disabled={submitting}
            >
              <ThumbsDown className="size-8 text-red-500" />
              <span className="font-medium">Not Satisfied</span>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-24 flex-col gap-2 border-green-200 hover:bg-green-50 hover:border-green-400"
              onClick={() => handleSubmit("yes")}
              disabled={submitting}
            >
              <ThumbsUp className="size-8 text-green-500" />
              <span className="font-medium">Loved It!</span>
            </Button>
          </div>
          <p className="text-xs text-center text-muted-foreground">
            {BUSINESS_NAME} · Your feedback helps us improve
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
