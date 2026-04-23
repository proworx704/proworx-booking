import { useQuery } from "convex/react";
import {
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Eye,
  Plus,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function StatusBadge({ status }: { status: string }) {
  if (status === "pending")
    return (
      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
        <Clock className="size-3 mr-1" /> Pending
      </Badge>
    );
  if (status === "approved")
    return (
      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
        <CheckCircle2 className="size-3 mr-1" /> Approved
      </Badge>
    );
  return (
    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
      <XCircle className="size-3 mr-1" /> Rejected
    </Badge>
  );
}

export function MyChecklistsPage() {
  const submissions = useQuery(api.checklists.listSubmissions, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Checklists</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Your submitted QC checklists
          </p>
        </div>
        <Button asChild size="sm">
          <Link to="/checklists/new">
            <Plus className="size-4 mr-1" /> New Checklist
          </Link>
        </Button>
      </div>

      {/* List */}
      {!submissions ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse h-12 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : submissions.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ClipboardCheck className="size-12 mx-auto text-muted-foreground mb-3 opacity-40" />
            <p className="font-medium text-lg">No checklists yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Fill out a QC checklist after completing a job
            </p>
            <Button asChild>
              <Link to="/checklists/new">
                <Plus className="size-4 mr-1" /> Start First Checklist
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {submissions.map((sub) => (
            <Card key={sub._id} className="hover:bg-accent/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/checklists/${sub._id}`}
                      className="font-medium hover:underline"
                    >
                      {sub.customerName}
                    </Link>
                    <span className="text-muted-foreground text-sm ml-2">
                      — {sub.vehicleYear} {sub.vehicleMake} {sub.vehicleModel}
                    </span>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{sub.templateName}</span>
                      <span>•</span>
                      <span>{sub.jobDate}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      className={
                        sub.overallResult === "pass" ? "bg-emerald-600 text-white" : ""
                      }
                      variant={sub.overallResult === "fail" ? "destructive" : "default"}
                    >
                      {sub.overallResult.toUpperCase()}
                    </Badge>
                    <StatusBadge status={sub.status} />
                    <Button variant="ghost" size="icon" asChild>
                      <Link to={`/checklists/${sub._id}`}>
                        <Eye className="size-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
                {sub.status === "rejected" && sub.reviewNotes && (
                  <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-700 border border-red-200">
                    <strong>Feedback:</strong> {sub.reviewNotes}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
