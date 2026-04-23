import { useMutation, useQuery } from "convex/react";
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Plus,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

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

function ResultBadge({ result }: { result: string }) {
  if (result === "pass")
    return <Badge className="bg-emerald-600 text-white">PASS</Badge>;
  return <Badge variant="destructive">FAIL</Badge>;
}

export function ChecklistsPage() {
  const stats = useQuery(api.checklists.getStats);
  const templates = useQuery(api.checklists.listAllTemplates);
  const allSubmissions = useQuery(api.checklists.listSubmissions, {});
  const pendingSubmissions = useQuery(api.checklists.listSubmissions, { status: "pending" });
  const seedTemplates = useMutation(api.seedChecklists.seedAllTemplates);
  const toggleTemplate = useMutation(api.checklists.toggleTemplate);
  const [activeTab, setActiveTab] = useState("pending");
  const [seeding, setSeeding] = useState(false);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const result = await seedTemplates();
      toast.success(`Templates ready: ${result.created} created, ${result.updated} updated`);
    } catch {
      toast.error("Failed to seed templates");
    }
    setSeeding(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">QC Checklists</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Quality control submissions from your team
          </p>
        </div>
        <div className="flex gap-2">
          {templates && templates.length === 0 && (
            <Button variant="outline" size="sm" onClick={handleSeed} disabled={seeding}>
              <RefreshCw className={`size-4 mr-1 ${seeding ? "animate-spin" : ""}`} />
              {seeding ? "Setting up..." : "Setup Templates"}
            </Button>
          )}
          <Button asChild size="sm">
            <Link to="/checklists/new">
              <Plus className="size-4 mr-1" /> New Checklist
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100">
                  <Clock className="size-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                  <p className="text-xs text-muted-foreground">Pending Review</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100">
                  <CheckCircle2 className="size-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.approved}</p>
                  <p className="text-xs text-muted-foreground">Approved</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100">
                  <XCircle className="size-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.rejected}</p>
                  <p className="text-xs text-muted-foreground">Rejected</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <ClipboardCheck className="size-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.thisWeek}</p>
                  <p className="text-xs text-muted-foreground">This Week</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Submissions */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending" className="gap-1.5">
            Pending {stats?.pending ? <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{stats.pending}</Badge> : null}
          </TabsTrigger>
          <TabsTrigger value="all">All Submissions</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <SubmissionList submissions={pendingSubmissions} showActions />
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          <SubmissionList submissions={allSubmissions} />
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          {templates && templates.length > 0 ? (
            <div className="space-y-2">
              {templates.map((t) => (
                <Card key={t._id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ClipboardCheck className="size-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{t.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.sections.length} sections •{" "}
                          {t.sections.reduce((sum, s) => sum + s.items.length, 0)} items
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={t.isActive ? "default" : "secondary"}>
                        {t.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleTemplate({ templateId: t._id })}
                      >
                        {t.isActive ? (
                          <ToggleRight className="size-5 text-emerald-600" />
                        ) : (
                          <ToggleLeft className="size-5 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Button variant="outline" size="sm" onClick={handleSeed} disabled={seeding} className="mt-2">
                <RefreshCw className={`size-4 mr-1 ${seeding ? "animate-spin" : ""}`} />
                Re-sync Templates
              </Button>
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <ClipboardCheck className="size-10 mx-auto text-muted-foreground mb-3" />
                <p className="font-medium">No templates yet</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Set up the 7 ProWorx QC checklist templates to get started.
                </p>
                <Button onClick={handleSeed} disabled={seeding}>
                  <RefreshCw className={`size-4 mr-1 ${seeding ? "animate-spin" : ""}`} />
                  Setup Templates
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SubmissionList({
  submissions,
  showActions,
}: {
  submissions: typeof import("../../convex/_generated/api").api.checklists.listSubmissions._returnType | undefined;
  showActions?: boolean;
}) {
  const review = useMutation(api.checklists.reviewSubmission);

  if (!submissions) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="animate-pulse h-12 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <ClipboardCheck className="size-8 mx-auto mb-2 opacity-40" />
          <p>No submissions found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {submissions.map((sub) => (
        <Card key={sub._id} className="hover:bg-accent/30 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    to={`/checklists/${sub._id}`}
                    className="font-medium hover:underline"
                  >
                    {sub.customerName}
                  </Link>
                  <span className="text-muted-foreground text-sm">
                    — {sub.vehicleYear} {sub.vehicleMake} {sub.vehicleModel}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span>{sub.templateName}</span>
                  <span>•</span>
                  <span>{sub.jobDate}</span>
                  <span>•</span>
                  <span>by {sub.submittedByName}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <ResultBadge result={sub.overallResult} />
                <StatusBadge status={sub.status} />
                {showActions && sub.status === "pending" && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        Review <ChevronDown className="size-3 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to={`/checklists/${sub._id}`}>
                          <Eye className="size-4 mr-2" /> View Details
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-emerald-600"
                        onClick={async () => {
                          await review({ submissionId: sub._id, decision: "approved" });
                          toast.success("Approved");
                        }}
                      >
                        <CheckCircle2 className="size-4 mr-2" /> Approve
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={async () => {
                          await review({ submissionId: sub._id, decision: "rejected" });
                          toast.error("Rejected");
                        }}
                      >
                        <XCircle className="size-4 mr-2" /> Reject
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                {!showActions && (
                  <Button variant="ghost" size="icon" asChild>
                    <Link to={`/checklists/${sub._id}`}>
                      <Eye className="size-4" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
