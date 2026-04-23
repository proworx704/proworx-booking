import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Image as ImageIcon,
  Square,
  SquareCheck,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useUserRole } from "@/contexts/RoleContext";

export function ChecklistReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin: isAdminRole } = useUserRole();
  const isAdmin = isAdminRole;
  const submission = useQuery(
    api.checklists.getSubmission,
    id ? { submissionId: id as Id<"checklistSubmissions"> } : "skip"
  );
  const review = useMutation(api.checklists.reviewSubmission);

  const [reviewNotes, setReviewNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  if (!submission) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to={isAdmin ? "/checklists" : "/my-checklists"}>
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <div className="animate-pulse h-6 w-48 bg-muted rounded" />
        </div>
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse h-24 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const handleReview = async (decision: "approved" | "rejected") => {
    setSubmitting(true);
    try {
      await review({
        submissionId: id as Id<"checklistSubmissions">,
        decision,
        reviewNotes: reviewNotes || undefined,
      });
      toast.success(decision === "approved" ? "Approved!" : "Rejected");
      navigate("/checklists");
    } catch {
      toast.error("Failed to submit review");
    }
    setSubmitting(false);
  };

  const beforeImages = submission.images.filter((img) => img.type === "before");
  const afterImages = submission.images.filter((img) => img.type === "after");

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to={isAdmin ? "/checklists" : "/my-checklists"}>
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{submission.customerName}</h1>
          <p className="text-sm text-muted-foreground">
            {submission.vehicleYear} {submission.vehicleMake} {submission.vehicleModel}
            {submission.vehicleColor ? ` • ${submission.vehicleColor}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={submission.overallResult === "pass" ? "bg-emerald-600" : "bg-red-600"}>
            {submission.overallResult.toUpperCase()}
          </Badge>
          {submission.status === "pending" && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              <Clock className="size-3 mr-1" /> Pending
            </Badge>
          )}
          {submission.status === "approved" && (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
              <CheckCircle2 className="size-3 mr-1" /> Approved
            </Badge>
          )}
          {submission.status === "rejected" && (
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
              <XCircle className="size-3 mr-1" /> Rejected
            </Badge>
          )}
        </div>
      </div>

      {/* Job Info */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Service:</span>
              <p className="font-medium">{submission.templateName}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Date:</span>
              <p className="font-medium">{submission.jobDate}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Technician:</span>
              <p className="font-medium">{submission.submittedByName}</p>
            </div>
            {submission.licensePlate && (
              <div>
                <span className="text-muted-foreground">Plate:</span>
                <p className="font-medium">{submission.licensePlate}</p>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Submitted:</span>
              <p className="font-medium">
                {new Date(submission.createdAt).toLocaleString()}
              </p>
            </div>
            {submission.reviewedByName && (
              <div>
                <span className="text-muted-foreground">Reviewed by:</span>
                <p className="font-medium">{submission.reviewedByName}</p>
              </div>
            )}
          </div>
          {submission.notes && (
            <div className="mt-3 pt-3 border-t">
              <span className="text-muted-foreground text-sm">Notes:</span>
              <p className="text-sm mt-1">{submission.notes}</p>
            </div>
          )}
          {submission.reviewNotes && (
            <div className="mt-3 pt-3 border-t">
              <span className="text-muted-foreground text-sm">Review Notes:</span>
              <p className="text-sm mt-1 italic">{submission.reviewNotes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Before & After Images */}
      {submission.images.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ImageIcon className="size-4" /> Photos ({submission.images.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium mb-2 text-muted-foreground">Before</p>
                {beforeImages.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {beforeImages.map((img) =>
                      img.url ? (
                        <button
                          key={img._id}
                          type="button"
                          onClick={() => setLightboxUrl(img.url!)}
                          className="rounded-lg overflow-hidden border hover:ring-2 ring-primary transition-all"
                        >
                          <img
                            src={img.url}
                            alt="Before"
                            className="w-full h-24 object-cover"
                          />
                        </button>
                      ) : null
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No before photos</p>
                )}
              </div>
              <div>
                <p className="text-sm font-medium mb-2 text-muted-foreground">After</p>
                {afterImages.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {afterImages.map((img) =>
                      img.url ? (
                        <button
                          key={img._id}
                          type="button"
                          onClick={() => setLightboxUrl(img.url!)}
                          className="rounded-lg overflow-hidden border hover:ring-2 ring-primary transition-all"
                        >
                          <img
                            src={img.url}
                            alt="After"
                            className="w-full h-24 object-cover"
                          />
                        </button>
                      ) : null
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No after photos</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Checklist Items */}
      {submission.template?.sections.map((section, si) => {
        const sectionResponses = submission.responses.filter(
          (r) => r.sectionIndex === si
        );
        return (
          <Card key={si}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="flex items-center justify-center size-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  {si + 1}
                </span>
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {section.items.map((item, ii) => {
                const resp = sectionResponses.find((r) => r.itemIndex === ii);
                return (
                  <div
                    key={ii}
                    className="flex items-center gap-3 py-1.5 px-2 rounded-md"
                  >
                    {item.type === "check" ? (
                      resp?.checked ? (
                        <SquareCheck className="size-5 text-emerald-600 shrink-0" />
                      ) : (
                        <Square className="size-5 text-muted-foreground shrink-0" />
                      )
                    ) : (
                      <div className="shrink-0">
                        {resp?.passFail === "pass" && (
                          <Badge className="bg-emerald-600 text-white text-xs px-1.5">Pass</Badge>
                        )}
                        {resp?.passFail === "fail" && (
                          <Badge variant="destructive" className="text-xs px-1.5">Fail</Badge>
                        )}
                        {resp?.passFail === "na" && (
                          <Badge variant="secondary" className="text-xs px-1.5">N/A</Badge>
                        )}
                        {!resp?.passFail && (
                          <Badge variant="outline" className="text-xs px-1.5 text-muted-foreground">
                            —
                          </Badge>
                        )}
                      </div>
                    )}
                    <span
                      className={`text-sm ${
                        resp?.checked || resp?.passFail === "pass" || resp?.passFail === "na"
                          ? "text-muted-foreground"
                          : resp?.passFail === "fail"
                            ? "text-red-600 font-medium"
                            : !resp?.checked && item.type === "check"
                              ? "text-muted-foreground"
                              : ""
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      {/* Admin Review Actions */}
      {isAdmin && submission.status === "pending" && (
        <Card className="border-2 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Review This Submission</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Optional notes (feedback for the technician)..."
              rows={2}
            />
            <div className="flex gap-3">
              <Button
                onClick={() => handleReview("approved")}
                disabled={submitting}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle2 className="size-4 mr-2" /> Approve
              </Button>
              <Button
                onClick={() => handleReview("rejected")}
                disabled={submitting}
                variant="destructive"
                className="flex-1"
              >
                <XCircle className="size-4 mr-2" /> Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Image Lightbox */}
      <Dialog open={!!lightboxUrl} onOpenChange={() => setLightboxUrl(null)}>
        <DialogContent className="max-w-3xl p-2">
          {lightboxUrl && (
            <img
              src={lightboxUrl}
              alt="Full size"
              className="w-full rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
