import { useQuery, useMutation } from "convex/react";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Car,
  CalendarDays,
  Clock,
  Crown,
  MapPin,
  Plus,
  Search,
  Trash2,
  Pencil,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

const TIER_LABELS: Record<string, string> = {
  exterior: "Exterior Only",
  interior: "Interior Only",
  full: "Inside & Out",
};
const TIER_COLORS: Record<string, string> = {
  exterior: "bg-blue-100 text-blue-800",
  interior: "bg-purple-100 text-purple-800",
  full: "bg-emerald-100 text-emerald-800",
};
const PLAN_LABELS: Record<string, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Annual",
};
const PLAN_FREQ: Record<string, number> = {
  monthly: 30,
  quarterly: 90,
  yearly: 365,
};

type MemberForm = {
  name: string;
  phone: string;
  email: string;
  address: string;
  zipCode: string;
  vehicleYear: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleColor: string;
  vehicleType: "sedan" | "suv" | "";
  planType: "monthly" | "quarterly" | "yearly";
  membershipTier: "exterior" | "interior" | "full";
  nextServiceDate: string;
  planStartDate: string;
  planEndDate: string;
  notes: string;
};

const emptyForm: MemberForm = {
  name: "",
  phone: "",
  email: "",
  address: "",
  zipCode: "",
  vehicleYear: "",
  vehicleMake: "",
  vehicleModel: "",
  vehicleColor: "",
  vehicleType: "",
  planType: "monthly",
  membershipTier: "full",
  nextServiceDate: "",
  planStartDate: "",
  planEndDate: "",
  notes: "",
};

export function MaintenanceMembersPage() {
  const members = useQuery(api.maintenanceMembers.list) ?? [];
  const createMember = useMutation(api.maintenanceMembers.create);
  const updateMember = useMutation(api.maintenanceMembers.update);
  const removeMember = useMutation(api.maintenanceMembers.remove);
  const markCompleted = useMutation(api.maintenanceMembers.markServiceCompleted);

  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState<string>("all");
  const [filterTier, setFilterTier] = useState<string>("all");
  const [filterZip, setFilterZip] = useState<string>("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<"maintenanceMembers"> | null>(null);
  const [form, setForm] = useState<MemberForm>(emptyForm);

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    id?: Id<"maintenanceMembers">;
    name?: string;
  }>({ open: false });

  const [completeDialog, setCompleteDialog] = useState<{
    open: boolean;
    id?: Id<"maintenanceMembers">;
    name?: string;
    date: string;
  }>({ open: false, date: new Date().toISOString().split("T")[0] });

  // Unique ZIPs for filter
  const uniqueZips = [...new Set(members.map((m) => m.zipCode))].sort();

  // Filter + search
  const filtered = members.filter((m) => {
    if (filterPlan !== "all" && m.planType !== filterPlan) return false;
    if (filterTier !== "all" && m.membershipTier !== filterTier) return false;
    if (filterZip !== "all" && m.zipCode !== filterZip) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        m.name.toLowerCase().includes(q) ||
        m.address.toLowerCase().includes(q) ||
        m.zipCode.includes(q) ||
        m.phone?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        `${m.vehicleYear} ${m.vehicleMake} ${m.vehicleModel}`.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const today = new Date().toISOString().split("T")[0];
  const sevenDays = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

  const totalActive = members.filter((m) => m.isActive).length;
  const totalOverdue = members.filter((m) => m.nextServiceDate && m.nextServiceDate < today).length;
  const totalDueSoon = members.filter(
    (m) => m.nextServiceDate && m.nextServiceDate >= today && m.nextServiceDate <= sevenDays
  ).length;

  const openAddDialog = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (m: (typeof members)[0]) => {
    setEditingId(m._id);
    setForm({
      name: m.name,
      phone: m.phone ?? "",
      email: m.email ?? "",
      address: m.address,
      zipCode: m.zipCode,
      vehicleYear: m.vehicleYear ?? "",
      vehicleMake: m.vehicleMake ?? "",
      vehicleModel: m.vehicleModel ?? "",
      vehicleColor: m.vehicleColor ?? "",
      vehicleType: m.vehicleType ?? "",
      planType: m.planType,
      membershipTier: m.membershipTier,
      nextServiceDate: m.nextServiceDate ?? "",
      planStartDate: m.planStartDate ?? "",
      planEndDate: m.planEndDate ?? "",
      notes: m.notes ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.address || !form.zipCode) {
      toast.error("Name, address, and ZIP code are required");
      return;
    }
    try {
      const data = {
        name: form.name,
        phone: form.phone || undefined,
        email: form.email || undefined,
        address: form.address,
        zipCode: form.zipCode,
        vehicleYear: form.vehicleYear || undefined,
        vehicleMake: form.vehicleMake || undefined,
        vehicleModel: form.vehicleModel || undefined,
        vehicleColor: form.vehicleColor || undefined,
        vehicleType: form.vehicleType === "" ? undefined : (form.vehicleType as "sedan" | "suv"),
        planType: form.planType,
        membershipTier: form.membershipTier,
        serviceFrequencyDays: PLAN_FREQ[form.planType],
        nextServiceDate: form.nextServiceDate || undefined,
        planStartDate: form.planStartDate || undefined,
        planEndDate: form.planEndDate || undefined,
        notes: form.notes || undefined,
      };

      if (editingId) {
        await updateMember({ id: editingId, ...data });
        toast.success("Member updated");
      } else {
        await createMember(data);
        toast.success("Member added");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Failed to save member");
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.id) return;
    try {
      await removeMember({ id: deleteDialog.id });
      toast.success("Member removed");
      setDeleteDialog({ open: false });
    } catch {
      toast.error("Failed to remove member");
    }
  };

  const handleMarkCompleted = async () => {
    if (!completeDialog.id) return;
    try {
      const result = await markCompleted({
        id: completeDialog.id,
        serviceDate: completeDialog.date,
      });
      toast.success(`Service completed. Next due: ${result.nextServiceDate}`);
      setCompleteDialog({ open: false, date: today });
    } catch {
      toast.error("Failed to mark completed");
    }
  };

  const getStatusBadge = (nextDate?: string) => {
    if (!nextDate) return <Badge variant="outline">Not scheduled</Badge>;
    if (nextDate < today) return <Badge variant="destructive">Overdue</Badge>;
    if (nextDate <= sevenDays) return <Badge className="bg-amber-500 hover:bg-amber-600">Due soon</Badge>;
    return <Badge variant="secondary">Upcoming</Badge>;
  };

  const setField = (key: keyof MemberForm, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Maintenance Members</h1>
          <p className="text-muted-foreground">
            Recurring subscription clients — grouped by ZIP for efficient routing
          </p>
        </div>
        <Button onClick={openAddDialog} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Add Member
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActive}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ZIP Areas</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueZips.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Due This Week</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{totalDueSoon}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totalOverdue}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, address, vehicle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={filterZip} onValueChange={setFilterZip}>
            <SelectTrigger className="w-[130px]">
              <Filter className="h-3.5 w-3.5 mr-1" />
              <SelectValue placeholder="ZIP" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ZIPs</SelectItem>
              {uniqueZips.map((z) => (
                <SelectItem key={z} value={z}>
                  {z}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterPlan} onValueChange={setFilterPlan}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Plan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Plans</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="yearly">Annual</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterTier} onValueChange={setFilterTier}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              <SelectItem value="exterior">Exterior Only</SelectItem>
              <SelectItem value="interior">Interior Only</SelectItem>
              <SelectItem value="full">Inside & Out</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Members List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Crown className="mx-auto h-8 w-8 mb-2 opacity-50" />
            <p className="text-lg mb-1">
              {members.length === 0 ? "No members yet" : "No members match filters"}
            </p>
            {members.length === 0 && (
              <p>Add your first maintenance member to start tracking subscriptions.</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => {
            const vehicle = [m.vehicleYear, m.vehicleMake, m.vehicleModel]
              .filter(Boolean)
              .join(" ");

            return (
              <Card key={m._id} className={!m.isActive ? "opacity-60" : ""}>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    {/* Left: member info */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-base">{m.name}</span>
                        <Badge className={TIER_COLORS[m.membershipTier]}>
                          {TIER_LABELS[m.membershipTier]}
                        </Badge>
                        <Badge variant="outline">{PLAN_LABELS[m.planType]}</Badge>
                        {!m.isActive && <Badge variant="destructive">Inactive</Badge>}
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {m.address} · {m.zipCode}
                        </span>
                        {vehicle && (
                          <span className="flex items-center gap-1">
                            <Car className="h-3.5 w-3.5" />
                            {vehicle}
                            {m.vehicleColor ? ` (${m.vehicleColor})` : ""}
                          </span>
                        )}
                      </div>
                      {/* Plan dates */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-muted-foreground">
                        {m.planStartDate && (
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5" />
                            Started: {m.planStartDate}
                          </span>
                        )}
                        {m.planType === "monthly" ? (
                          <span className="text-emerald-600 text-xs font-medium">Ongoing — until cancelled</span>
                        ) : m.planEndDate ? (
                          <span className={`flex items-center gap-1 ${m.planEndDate < today ? "text-red-500 font-medium" : ""}`}>
                            {m.planEndDate < today ? <XCircle className="h-3.5 w-3.5" /> : <CalendarDays className="h-3.5 w-3.5" />}
                            {m.planEndDate < today ? "Expired: " : "Ends: "}{m.planEndDate}
                          </span>
                        ) : null}
                      </div>
                      {(m.phone || m.email) && (
                        <div className="text-sm text-muted-foreground">
                          {m.phone && <span className="mr-3">{m.phone}</span>}
                          {m.email && <span>{m.email}</span>}
                        </div>
                      )}
                      {m.notes && (
                        <p className="text-sm text-muted-foreground italic">{m.notes}</p>
                      )}
                    </div>

                    {/* Right: status + actions */}
                    <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(m.nextServiceDate)}
                        {m.nextServiceDate && (
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {m.nextServiceDate}
                          </span>
                        )}
                      </div>
                      {/* Mobile: full-width buttons */}
                      <div className="flex gap-2 w-full sm:w-auto">
                        <Button
                          size="sm"
                          variant="default"
                          className="flex-1 sm:flex-initial h-8 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700"
                          onClick={() =>
                            setCompleteDialog({
                              open: true,
                              id: m._id,
                              name: m.name,
                              date: today,
                            })
                          }
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span className="sm:hidden">Done</span>
                          <span className="hidden sm:inline">Mark Completed</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                          onClick={() => openEditDialog(m)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 border-red-200"
                          onClick={() =>
                            setDeleteDialog({ open: true, id: m._id, name: m.name })
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Member" : "Add Maintenance Member"}</DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update member details."
                : "Add a recurring subscription client to your maintenance directory."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Contact Info */}
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <CustomerAutocomplete
                  value={form.name}
                  onChange={(name) => setField("name", name)}
                  onSelect={(customer) => {
                    setForm((prev) => ({
                      ...prev,
                      name: customer.name,
                      phone: customer.phone || prev.phone,
                      email: customer.email || prev.email,
                      address: customer.address || prev.address,
                      zipCode: customer.zipCode || prev.zipCode,
                      vehicleYear: customer.vehicleYear || prev.vehicleYear,
                      vehicleMake: customer.vehicleMake || prev.vehicleMake,
                      vehicleModel: customer.vehicleModel || prev.vehicleModel,
                      vehicleColor: customer.vehicleColor || prev.vehicleColor,
                      vehicleType: (customer.vehicleType as "sedan" | "suv" | "") || prev.vehicleType,
                    }));
                  }}
                  disabled={!!editingId}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Email</Label>
                <Input value={form.email} onChange={(e) => setField("email", e.target.value)} />
              </div>
            </div>

            {/* Address */}
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Address *</Label>
                <Input value={form.address} onChange={(e) => setField("address", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>ZIP Code *</Label>
                <Input value={form.zipCode} onChange={(e) => setField("zipCode", e.target.value)} />
              </div>
            </div>

            {/* Vehicle */}
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
              <div className="space-y-1.5">
                <Label>Year</Label>
                <Input value={form.vehicleYear} onChange={(e) => setField("vehicleYear", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Make</Label>
                <Input value={form.vehicleMake} onChange={(e) => setField("vehicleMake", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Model</Label>
                <Input value={form.vehicleModel} onChange={(e) => setField("vehicleModel", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Color</Label>
                <Input value={form.vehicleColor} onChange={(e) => setField("vehicleColor", e.target.value)} />
              </div>
            </div>

            {/* Plan & Tier */}
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Plan Type</Label>
                <Select value={form.planType} onValueChange={(v) => setField("planType", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly (every 30 days)</SelectItem>
                    <SelectItem value="quarterly">Quarterly (every 90 days)</SelectItem>
                    <SelectItem value="yearly">Annual (every 365 days)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Membership Tier</Label>
                <Select value={form.membershipTier} onValueChange={(v) => setField("membershipTier", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exterior">Exterior Only</SelectItem>
                    <SelectItem value="interior">Interior Only</SelectItem>
                    <SelectItem value="full">Inside & Out</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Plan Dates */}
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Plan Start Date</Label>
                <Input
                  type="date"
                  value={form.planStartDate}
                  onChange={(e) => setField("planStartDate", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Plan End Date
                  {form.planType === "monthly" && (
                    <span className="text-xs text-muted-foreground ml-1">(N/A for monthly)</span>
                  )}
                </Label>
                <Input
                  type="date"
                  value={form.planEndDate}
                  onChange={(e) => setField("planEndDate", e.target.value)}
                  disabled={form.planType === "monthly"}
                  placeholder={form.planType === "monthly" ? "Ongoing" : ""}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Next Service Date</Label>
                <Input
                  type="date"
                  value={form.nextServiceDate}
                  onChange={(e) => setField("nextServiceDate", e.target.value)}
                />
              </div>
            </div>

            {/* Vehicle Size */}
            <div className="grid gap-3 grid-cols-1">
              <div className="space-y-1.5">
                <Label>Vehicle Size</Label>
                <Select value={form.vehicleType || "none"} onValueChange={(v) => setField("vehicleType", v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not specified</SelectItem>
                    <SelectItem value="sedan">Sedan / Coupe</SelectItem>
                    <SelectItem value="suv">SUV / Truck</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
                placeholder="Gate code, preferences, etc."
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingId ? "Save Changes" : "Add Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(o) => { if (!o) setDeleteDialog({ open: false }); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>
              Remove <strong>{deleteDialog.name}</strong> from the maintenance directory? This can't be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-1.5" />
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Completed Dialog */}
      <Dialog open={completeDialog.open} onOpenChange={(o) => { if (!o) setCompleteDialog({ open: false, date: today }); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Service Completed</DialogTitle>
            <DialogDescription>
              Record a completed service for <strong>{completeDialog.name}</strong>. The next service date will be auto-calculated.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label>Service Date</Label>
            <Input
              type="date"
              value={completeDialog.date}
              onChange={(e) =>
                setCompleteDialog((prev) => ({ ...prev, date: e.target.value }))
              }
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCompleteDialog({ open: false, date: today })}>
              Cancel
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleMarkCompleted}>
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Mark Completed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Customer Autocomplete ──────────────────────────────────────────────────────

type CustomerResult = {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  zipCode?: string;
  vehicleYear?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  vehicleType?: string;
};

function CustomerAutocomplete({
  value,
  onChange,
  onSelect,
  disabled,
}: {
  value: string;
  onChange: (name: string) => void;
  onSelect: (customer: CustomerResult) => void;
  disabled?: boolean;
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Debounce search query
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const handleChange = useCallback(
    (val: string) => {
      onChange(val);
      clearTimeout(debounceRef.current);
      if (val.trim().length >= 2) {
        debounceRef.current = setTimeout(() => setQuery(val.trim()), 200);
      } else {
        setQuery("");
        setShowDropdown(false);
      }
    },
    [onChange],
  );

  // Fetch matching customers
  const results = useQuery(
    api.customers.list,
    query.length >= 2 ? { search: query } : "skip",
  );

  // Show dropdown when results arrive
  useEffect(() => {
    if (results && results.length > 0 && query.length >= 2) {
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  }, [results, query]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectCustomer = (c: CustomerResult) => {
    onSelect(c);
    setShowDropdown(false);
    setQuery("");
  };

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Start typing to search..."
        disabled={disabled}
        autoComplete="off"
      />
      {showDropdown && results && results.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {results.slice(0, 8).map((c) => (
            <button
              key={c._id}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-muted/60 transition-colors border-b last:border-0"
              onClick={() =>
                selectCustomer({
                  name: c.name,
                  phone: c.phone ?? undefined,
                  email: c.email ?? undefined,
                  address: c.address ?? undefined,
                  zipCode: c.zipCode ?? undefined,
                  vehicleYear: c.vehicleYear ?? undefined,
                  vehicleMake: c.vehicleMake ?? undefined,
                  vehicleModel: c.vehicleModel ?? undefined,
                  vehicleColor: c.vehicleColor ?? undefined,
                  vehicleType: c.vehicleType ?? undefined,
                })
              }
            >
              <p className="font-medium text-sm">{c.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {[c.phone, c.email, c.zipCode].filter(Boolean).join(" · ")}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
