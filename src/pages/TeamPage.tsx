import { useMutation, useQuery } from "convex/react";
import {
  Crown,
  Edit2,
  Mail,
  MoreHorizontal,
  Plus,
  Shield,
  Trash2,
  UserCheck,
  Users,
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

export function TeamPage() {
  const profiles = useQuery(api.userProfiles.list);
  const allUsers = useQuery(api.userProfiles.listAllUsers);
  const staffList = useQuery(api.staff.list);
  const workersList = useQuery(api.payrollWorkers.list);

  const upsertProfile = useMutation(api.userProfiles.upsert);
  const removeProfile = useMutation(api.userProfiles.remove);

  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [_editingProfile, setEditingProfile] = useState<any>(null);
  const [form, setForm] = useState({
    targetUserId: "" as string,
    displayName: "",
    role: "employee" as Role,
    staffId: "" as string,
    payrollWorkerId: "" as string,
  });

  // Users who don't have a profile yet AND are not customers
  // Customers who signed up through booking are completely separate from staff
  const unassignedUsers = allUsers?.filter(
    (u) => !u.profile && !u.email?.includes("@test.") && !(u as any).isCustomer
  ) ?? [];

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

  const formDialog = (
    <div className="space-y-4 pt-2">
      {/* User selection (only for add) */}
      {!editOpen && (
        <div>
          <Label>User Account</Label>
          {unassignedUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-1">
              No unassigned users. Have the employee sign up first at the login page, then come back here to assign their role.
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
        <Button onClick={openAdd}>
          <Plus className="size-4 mr-1" />
          Add Member
        </Button>
      </div>

      {/* How it works */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Mail className="size-5 text-muted-foreground mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">How to add an employee:</p>
              <ol className="list-decimal list-inside text-muted-foreground mt-1 space-y-0.5">
                <li>Have them sign up at your booking app login page</li>
                <li>Come back here and click "Add Member"</li>
                <li>Select their account and set role to Employee</li>
                <li>Link their payroll worker record (if applicable)</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

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
            <p className="text-muted-foreground">No team members yet.</p>
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
    </div>
  );
}
