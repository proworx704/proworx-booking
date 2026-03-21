import { useMutation, useQuery } from "convex/react";
import {
  Mail,
  Phone,
  Plus,
  Shield,
  Sparkles,
  User,
  UserCheck,
  UserX,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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

const STAFF_COLORS = [
  "#2563eb", "#dc2626", "#16a34a", "#d97706", "#7c3aed",
  "#db2777", "#0891b2", "#65a30d", "#ea580c", "#4f46e5",
];

const roleLabels: Record<string, string> = {
  owner: "Owner",
  manager: "Manager",
  technician: "Technician",
};

const roleBadgeVariant: Record<string, "default" | "secondary" | "outline"> = {
  owner: "default",
  manager: "secondary",
  technician: "outline",
};

export function StaffPage() {
  const staff = useQuery(api.staff.listWithServiceCounts);
  const createStaff = useMutation(api.staff.create);
  const updateStaff = useMutation(api.staff.update);
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    role: "technician" as "owner" | "manager" | "technician",
    color: STAFF_COLORS[0],
    notes: "",
  });

  const resetForm = () => {
    setForm({
      name: "",
      phone: "",
      email: "",
      role: "technician",
      color: STAFF_COLORS[Math.floor(Math.random() * STAFF_COLORS.length)],
      notes: "",
    });
    setEditingId(null);
  };

  const handleCreate = () => {
    resetForm();
    setShowDialog(true);
  };

  const handleEdit = (member: any) => {
    setForm({
      name: member.name,
      phone: member.phone || "",
      email: member.email || "",
      role: member.role,
      color: member.color,
      notes: member.notes || "",
    });
    setEditingId(member._id);
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    try {
      if (editingId) {
        await updateStaff({
          id: editingId as any,
          name: form.name,
          phone: form.phone || undefined,
          email: form.email || undefined,
          role: form.role,
          color: form.color,
          notes: form.notes || undefined,
        });
        toast.success("Staff member updated");
      } else {
        await createStaff({
          name: form.name,
          phone: form.phone || undefined,
          email: form.email || undefined,
          role: form.role,
          color: form.color,
          notes: form.notes || undefined,
        });
        toast.success("Staff member added");
      }
      setShowDialog(false);
      resetForm();
    } catch (e) {
      toast.error("Failed to save staff member");
    }
  };

  const handleToggleActive = async (member: any) => {
    await updateStaff({ id: member._id, isActive: !member.isActive });
    toast.success(member.isActive ? "Staff member deactivated" : "Staff member activated");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Staff</h1>
          <p className="text-muted-foreground">Manage your team members and their service assignments</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="size-4 mr-2" />
          Add Staff
        </Button>
      </div>

      {!staff ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : staff.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <User className="size-12 mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium mb-1">No staff members yet</h3>
            <p className="text-muted-foreground mb-4">
              Add your team members to manage their schedules and service assignments.
            </p>
            <Button onClick={handleCreate}>
              <Plus className="size-4 mr-2" />
              Add First Staff Member
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {staff.map((member) => (
            <Card
              key={member._id}
              className={`relative overflow-hidden ${!member.isActive ? "opacity-60" : ""}`}
            >
              <div
                className="absolute top-0 left-0 w-1 h-full"
                style={{ backgroundColor: member.color }}
              />
              <CardContent className="pt-5 pb-4 pl-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="size-10 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                      style={{ backgroundColor: member.color }}
                    >
                      {member.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="font-semibold">{member.name}</h3>
                      <Badge variant={roleBadgeVariant[member.role]} className="text-xs mt-0.5">
                        {roleLabels[member.role]}
                      </Badge>
                    </div>
                  </div>
                  {!member.isActive && (
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      Inactive
                    </Badge>
                  )}
                </div>

                <div className="space-y-1.5 text-sm text-muted-foreground mb-3">
                  {member.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="size-3.5" />
                      <span>{member.phone}</span>
                    </div>
                  )}
                  {member.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="size-3.5" />
                      <span className="truncate">{member.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-3.5" />
                    <span>{member.serviceCount} service{member.serviceCount !== 1 ? "s" : ""} assigned</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button variant="outline" size="sm" asChild className="flex-1">
                    <Link to={`/staff/${member._id}`}>
                      <Wrench className="size-3.5 mr-1" />
                      Manage
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleActive(member)}
                    title={member.isActive ? "Deactivate" : "Activate"}
                  >
                    {member.isActive ? (
                      <UserX className="size-3.5" />
                    ) : (
                      <UserCheck className="size-3.5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(member)}
                  >
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Staff Member" : "Add Staff Member"}</DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update this team member's information."
                : "Add a new team member. You can assign services and set their availability after."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="staff-name">Name *</Label>
              <Input
                id="staff-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="John Smith"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="staff-phone">Phone</Label>
                <Input
                  id="staff-phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <Label htmlFor="staff-email">Email</Label>
                <Input
                  id="staff-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="john@email.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Role</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => setForm({ ...form, role: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">
                      <div className="flex items-center gap-2">
                        <Shield className="size-3.5" />
                        Owner
                      </div>
                    </SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="technician">Technician</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {STAFF_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`size-7 rounded-full border-2 transition-all ${
                        form.color === c
                          ? "border-foreground scale-110"
                          : "border-transparent hover:scale-105"
                      }`}
                      style={{ backgroundColor: c }}
                      onClick={() => setForm({ ...form, color: c })}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="staff-notes">Notes</Label>
              <Textarea
                id="staff-notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Any notes about this team member..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingId ? "Save Changes" : "Add Staff Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
