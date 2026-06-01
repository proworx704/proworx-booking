import { useMutation, useQuery } from "convex/react";
import {
  Clock,
  Crown,
  Edit2,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Phone,
  Plus,
  RefreshCw,
  Send,
  Shield,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type Role = "owner" | "admin" | "employee";

const roleBadge = (role: Role) => {
  switch (role) {
    case "owner":
      return (
        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 gap-1">
          <Crown className="size-3" />
          Owner
        </Badge>
      );
    case "admin":
      return (
        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 gap-1">
          <Shield className="size-3" />
          Admin
        </Badge>
      );
    case "employee":
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100 gap-1">
          <UserCheck className="size-3" />
          Employee
        </Badge>
      );
  }
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function TeamPage() {
  const profiles = useQuery(api.userProfiles.list);
  const allUsers = useQuery(api.userProfiles.listAllUsers);
  const staffList = useQuery(api.staff.list);
  const workersList = useQuery(api.payrollWorkers.list);
  const invites = useQuery(api.teamInvites.list);

  const upsertProfile = useMutation(api.userProfiles.upsert);
  const removeProfile = useMutation(api.userProfiles.remove);
  const createInvite = useMutation(api.teamInvites.create);
  const cancelInvite = useMutation(api.teamInvites.cancel);
  const resendInvite = useMutation(api.teamInvites.resend);

  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [_editingProfile, setEditingProfile] = useState<any>(null);
  const [form, setForm] = useState({
    targetUserId: "" as string,
    displayName: "",
    role: "employee" as Role,
    staffId: "" as string,
    payrollWorkerId: "" as string,
  });
  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "employee" as "admin" | "employee",
    sendVia: "email" as "email" | "sms" | "both",
  });
  const [inviteSending, setInviteSending] = useState(false);

  // Users who don't have a profile yet AND are not customers
  const unassignedUsers = allUsers?.filter(
    (u) => !u.profile && !u.email?.includes("@test.") && !(u as any).isCustomer
  ) ?? [];

  const pendingInvites = invites?.filter((i) => i.status === "pending") ?? [];
  const pastInvites = invites?.filter((i) => i.status !== "pending") ?? [];

  const openAdd = () => {
    setForm({
      targetUserId: "",
      displayName: "",
      role: "employee",
      staffId: "",
      payrollWorkerId: "",
    });
    setAddOpen(true);
  };

  const openEdit = (p: any) => {
    setEditingProfile(p);
    setForm({
      targetUserId: p.userId,
      displayName: p.displayName ?? p.userName ?? "",
      role: p.role,
      staffId: p.staffId ?? "",
      payrollWorkerId: p.payrollWorkerId ?? "",
    });
    setEditOpen(true);
  };

  const openInvite = () => {
    setInviteForm({
      name: "",
      email: "",
      phone: "",
      role: "employee",
      sendVia: "email",
    });
    setInviteOpen(true);
  };

  const handleSave = async () => {
    try {
      if (!form.targetUserId) {
        toast.error("Please select a user");
        return;
      }
      await upsertProfile({
        targetUserId: form.targetUserId as Id<"users">,
        displayName: form.displayName || "Team Member",
        role: form.role,
        ...(form.staffId ? { staffId: form.staffId as Id<"staff"> } : {}),
        ...(form.payrollWorkerId
          ? { payrollWorkerId: form.payrollWorkerId as Id<"payrollWorkers"> }
          : {}),
      });
      toast.success(editOpen ? "Profile updated!" : "Team member added!");
      setEditOpen(false);
      setAddOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save");
    }
  };

  const handleDelete = async (profileId: Id<"userProfiles">, name: string) => {
    if (!confirm(`Remove ${name} from the team?`)) return;
    try {
      await removeProfile({ id: profileId });
      toast.success("Team member removed");
    } catch (error: any) {
      toast.error(error.message || "Failed to remove");
    }
  };

  const handleSendInvite = async () => {
    try {
      setInviteSending(true);
      if (!inviteForm.name.trim()) {
        toast.error("Please enter a name");
        return;
      }
      if (!inviteForm.email && !inviteForm.phone) {
        toast.error("Please enter an email or phone number");
        return;
      }

      await createInvite({
        name: inviteForm.name.trim(),
        email: inviteForm.email.trim() || undefined,
        phone: inviteForm.phone.trim() || undefined,
        role: inviteForm.role,
        sendVia: inviteForm.sendVia,
      });

      toast.success(`Invite sent to ${inviteForm.name}!`);
      setInviteOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to send invite");
    } finally {
      setInviteSending(false);
    }
  };

  const handleCancelInvite = async (id: Id<"teamInvites">, name: string) => {
    if (!confirm(`Cancel invite for ${name}?`)) return;
    try {
      await cancelInvite({ id });
      toast.success("Invite cancelled");
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel");
    }
  };

  const handleResendInvite = async (id: Id<"teamInvites">, name: string) => {
    try {
      await resendInvite({ id });
      toast.success(`Invite resent to ${name}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to resend");
    }
  };

  const formDialog = (
    <div className="space-y-4 pt-2">
      {/* User selection (only for add) */}
      {!editOpen && (
        <div>
          <Label>User Account</Label>
          {unassignedUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-1">
              No unassigned users found. Use <strong>Invite Member</strong> to send someone a signup link.
            </p>
          ) : (
            <Select
              value={form.targetUserId}
              onValueChange={(v) => {
                const user = unassignedUsers.find((u) => u.userId === v);
                setForm({
                  ...form,
                  targetUserId: v,
                  displayName: user?.name || user?.email?.split("@")[0] || "",
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select user..." />
              </SelectTrigger>
              <SelectContent>
                {unassignedUsers.map((u) => (
                  <SelectItem key={u.userId} value={u.userId}>
                    {u.email} {u.name ? `(${u.name})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      <div>
        <Label>Display Name</Label>
        <Input
          value={form.displayName}
          onChange={(e) => setForm({ ...form, displayName: e.target.value })}
          placeholder="e.g. Tyler York"
        />
      </div>

      <div>
        <Label>Role</Label>
        <Select
          value={form.role}
          onValueChange={(v) => setForm({ ...form, role: v as Role })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="owner">
              <div className="flex items-center gap-2">
                <Crown className="size-3 text-amber-600" />
                Owner — Full access
              </div>
            </SelectItem>
            <SelectItem value="admin">
              <div className="flex items-center gap-2">
                <Shield className="size-3 text-blue-600" />
                Admin — Full access
              </div>
            </SelectItem>
            <SelectItem value="employee">
              <div className="flex items-center gap-2">
                <UserCheck className="size-3 text-green-600" />
                Employee — Portal only
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">
          {form.role === "employee"
            ? "Can log hours, view pay, and see their schedule"
            : "Can access all admin pages including payroll, bookings, and settings"}
        </p>
      </div>

      {/* Link to staff record */}
      {staffList && staffList.length > 0 && (
        <div>
          <Label>Link to Staff Record (optional)</Label>
          <Select
            value={form.staffId || "__none__"}
            onValueChange={(v) => setForm({ ...form, staffId: v === "__none__" ? "" : v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Not linked" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Not linked</SelectItem>
              {staffList.map((s: any) => (
                <SelectItem key={s._id} value={s._id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Link to payroll worker */}
      {workersList && workersList.length > 0 && (
        <div>
          <Label>Link to Payroll Worker (optional)</Label>
          <Select
            value={form.payrollWorkerId || "__none__"}
            onValueChange={(v) =>
              setForm({ ...form, payrollWorkerId: v === "__none__" ? "" : v })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Not linked" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Not linked</SelectItem>
              {workersList.map((w: any) => (
                <SelectItem key={w._id} value={w._id}>
                  {w.name} (${Number(w.hourlyRate).toFixed(2)}/hr)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Button onClick={handleSave} className="w-full">
        {editOpen ? "Save Changes" : "Add Team Member"}
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="size-6" />
            Team Management
          </h1>
          <p className="text-muted-foreground">
            Manage employee accounts, roles, and portal access
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={openAdd}>
            <Plus className="size-4 mr-1" />
            Add Existing
          </Button>
          <Button onClick={openInvite}>
            <UserPlus className="size-4 mr-1" />
            Invite Member
          </Button>
        </div>
      </div>

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-blue-800">
              <Send className="size-4" />
              Pending Invites ({pendingInvites.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingInvites.map((inv) => (
                <div
                  key={inv._id}
                  className="flex items-center justify-between p-3 rounded-lg border border-blue-200 bg-white"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                      {inv.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{inv.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {inv.role}
                        </Badge>
                        <Badge variant="secondary" className="text-xs gap-1">
                          {inv.sentVia === "email" && <Mail className="size-3" />}
                          {inv.sentVia === "sms" && <MessageSquare className="size-3" />}
                          {inv.sentVia === "both" && <><Mail className="size-3" /><MessageSquare className="size-3" /></>}
                          {inv.sentVia}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {inv.email && <span>{inv.email}</span>}
                        {inv.email && inv.phone && <span> · </span>}
                        {inv.phone && <span>{inv.phone}</span>}
                        <span className="ml-2">
                          <Clock className="size-3 inline mr-0.5" />
                          {timeAgo(inv.createdAt)}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResendInvite(inv._id, inv.name)}
                      title="Resend invite"
                    >
                      <RefreshCw className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCancelInvite(inv._id, inv.name)}
                      className="text-destructive hover:text-destructive"
                      title="Cancel invite"
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle>
            Team Members ({profiles?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {profiles === undefined ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : profiles.length === 0 ? (
            <p className="text-muted-foreground">No team members yet. Invite someone to get started!</p>
          ) : (
            <div className="space-y-3">
              {profiles
                .sort((a: any, b: any) => {
                  const order = { owner: 0, admin: 1, employee: 2 };
                  return (order[a.role as Role] ?? 3) - (order[b.role as Role] ?? 3);
                })
                .map((p: any) => (
                  <div
                    key={p._id}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="flex items-center gap-4">
                      <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                        {(p.displayName || p.userName || "?").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {p.displayName || p.userName || "Unknown"}
                          </span>
                          {roleBadge(p.role)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {p.email || "No email"}
                          {p.workerName && ` · Payroll: ${p.workerName}`}
                          {p.staffName && ` · Staff: ${p.staffName}`}
                        </p>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(p)}>
                          <Edit2 className="size-4" />
                          Edit Role
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(p._id, p.displayName || p.userName)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="size-4" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unassigned users alert */}
      {unassignedUsers.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="pt-4">
            <p className="text-sm font-medium text-amber-800">
              {unassignedUsers.length} user{unassignedUsers.length !== 1 ? "s" : ""} signed up but not yet assigned a role:
            </p>
            <div className="mt-2 space-y-1">
              {unassignedUsers.map((u) => (
                <p key={u.userId} className="text-sm text-amber-700">
                  {u.email} {u.name ? `(${u.name})` : ""}
                </p>
              ))}
            </div>
            <Button size="sm" className="mt-3" onClick={openAdd}>
              Assign Roles
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Past Invites */}
      {pastInvites.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Invite History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pastInvites.slice(0, 10).map((inv) => (
                <div
                  key={inv._id}
                  className="flex items-center justify-between p-3 rounded-lg border opacity-70"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-semibold text-xs">
                      {inv.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="text-sm font-medium">{inv.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {inv.email || inv.phone}
                      </span>
                    </div>
                  </div>
                  <Badge
                    variant={inv.status === "accepted" ? "default" : "secondary"}
                    className={
                      inv.status === "accepted"
                        ? "bg-green-100 text-green-800"
                        : inv.status === "cancelled"
                          ? "bg-red-100 text-red-800"
                          : ""
                    }
                  >
                    {inv.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
          </DialogHeader>
          {formDialog}
        </DialogContent>
      </Dialog>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
          </DialogHeader>
          {formDialog}
        </DialogContent>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="size-5" />
              Invite Team Member
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Name *</Label>
              <Input
                value={inviteForm.name}
                onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                placeholder="e.g. John Smith"
              />
            </div>

            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                placeholder="john@example.com"
              />
            </div>

            <div>
              <Label>Phone</Label>
              <Input
                type="tel"
                value={inviteForm.phone}
                onChange={(e) => setInviteForm({ ...inviteForm, phone: e.target.value })}
                placeholder="(555) 123-4567"
              />
            </div>

            <div>
              <Label>Role</Label>
              <Select
                value={inviteForm.role}
                onValueChange={(v) => setInviteForm({ ...inviteForm, role: v as "admin" | "employee" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">
                    <div className="flex items-center gap-2">
                      <UserCheck className="size-3 text-green-600" />
                      Employee — Portal only
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="size-3 text-blue-600" />
                      Admin — Full access
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {inviteForm.role === "employee"
                  ? "Can log hours, view pay, and see their schedule"
                  : "Can access all admin pages including payroll, bookings, and settings"}
              </p>
            </div>

            <div>
              <Label>Send invite via</Label>
              <Select
                value={inviteForm.sendVia}
                onValueChange={(v) => setInviteForm({ ...inviteForm, sendVia: v as "email" | "sms" | "both" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">
                    <div className="flex items-center gap-2">
                      <Mail className="size-3" />
                      Email only
                    </div>
                  </SelectItem>
                  <SelectItem value="sms">
                    <div className="flex items-center gap-2">
                      <Phone className="size-3" />
                      Text message only
                    </div>
                  </SelectItem>
                  <SelectItem value="both">
                    <div className="flex items-center gap-2">
                      <Send className="size-3" />
                      Both email & text
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleSendInvite}
              className="w-full"
              disabled={inviteSending}
            >
              {inviteSending ? (
                <>
                  <RefreshCw className="size-4 mr-1 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="size-4 mr-1" />
                  Send Invite
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
