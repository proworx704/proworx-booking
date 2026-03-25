import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, Edit, Plus, Rocket, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

const DAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

type AmpForm = {
  name: string;
  description: string;
  amplifierType: "multiplier" | "bonus";
  multiplier: string;
  bonusPoints: string;
  daysOfWeek: number[];
  serviceCategories: string;
  minSpendCents: string;
  startDate: string;
  endDate: string;
};

const emptyForm: AmpForm = {
  name: "",
  description: "",
  amplifierType: "multiplier",
  multiplier: "2",
  bonusPoints: "50",
  daysOfWeek: [],
  serviceCategories: "",
  minSpendCents: "",
  startDate: new Date().toISOString().split("T")[0],
  endDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
};

export function LoyaltyAmplifiersPage() {
  const amplifiers = useQuery(api.loyalty.listAmplifiers);
  const catalog = useQuery(api.catalog.listAll);
  const createAmplifier = useMutation(api.loyalty.createAmplifier);
  const updateAmplifier = useMutation(api.loyalty.updateAmplifier);
  const deleteAmplifier = useMutation(api.loyalty.deleteAmplifier);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<Id<"loyaltyAmplifiers"> | null>(null);
  const [form, setForm] = useState<AmpForm>(emptyForm);

  const today = new Date().toISOString().split("T")[0];

  // Get unique categories from catalog
  const categories = [
    ...new Set((catalog || []).map((c: any) => c.category).filter(Boolean)),
  ] as string[];

  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(a: any) {
    setForm({
      name: a.name,
      description: a.description,
      amplifierType: a.amplifierType,
      multiplier: a.multiplier ? String(a.multiplier) : "2",
      bonusPoints: a.bonusPoints ? String(a.bonusPoints) : "50",
      daysOfWeek: a.daysOfWeek || [],
      serviceCategories: (a.serviceCategories || []).join(", "),
      minSpendCents: a.minSpendCents ? String(a.minSpendCents / 100) : "",
      startDate: a.startDate,
      endDate: a.endDate,
    });
    setEditingId(a._id);
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.name || !form.startDate || !form.endDate) {
      toast.error("Fill in all required fields");
      return;
    }

    try {
      const data: any = {
        name: form.name,
        description: form.description,
        amplifierType: form.amplifierType,
        startDate: form.startDate,
        endDate: form.endDate,
      };

      if (form.amplifierType === "multiplier") {
        data.multiplier = parseFloat(form.multiplier) || 2;
      } else {
        data.bonusPoints = parseInt(form.bonusPoints) || 50;
      }

      if (form.daysOfWeek.length > 0) data.daysOfWeek = form.daysOfWeek;
      if (form.serviceCategories.trim()) {
        data.serviceCategories = form.serviceCategories
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }
      if (form.minSpendCents) {
        data.minSpendCents = Math.round(parseFloat(form.minSpendCents) * 100);
      }

      if (editingId) {
        await updateAmplifier({ id: editingId, ...data });
        toast.success("Amplifier updated");
      } else {
        await createAmplifier(data);
        toast.success("Amplifier created");
      }
      setShowForm(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleToggle(id: Id<"loyaltyAmplifiers">, currentActive: boolean) {
    await updateAmplifier({ id, isActive: !currentActive });
  }

  async function handleDelete(id: Id<"loyaltyAmplifiers">) {
    if (!confirm("Delete this amplifier?")) return;
    await deleteAmplifier({ id });
    toast.success("Amplifier deleted");
  }

  function getStatus(a: any) {
    if (!a.isActive) return { label: "Disabled", color: "bg-gray-100 text-gray-600" };
    if (a.startDate > today) return { label: "Upcoming", color: "bg-blue-100 text-blue-700" };
    if (a.endDate < today) return { label: "Expired", color: "bg-red-100 text-red-700" };
    return { label: "Active", color: "bg-green-100 text-green-700" };
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/loyalty">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Promotional Amplifiers</h1>
            <p className="text-muted-foreground">
              Create bonus point promotions to drive bookings
            </p>
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4 mr-1" /> Add Amplifier
        </Button>
      </div>

      {!amplifiers || amplifiers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Rocket className="size-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No amplifiers yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Create promotions like 2x Tuesday or bonus points on ceramic coatings
            </p>
            <Button onClick={openCreate}>
              <Plus className="size-4 mr-1" /> Create First Amplifier
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {amplifiers.map((a) => {
            const status = getStatus(a);
            return (
              <Card key={a._id} className={!a.isActive ? "opacity-60" : ""}>
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{a.name}</h3>
                        <Badge className={status.color}>{status.label}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{a.description}</p>

                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="secondary">
                          {a.amplifierType === "multiplier"
                            ? `${a.multiplier}x Points`
                            : `+${a.bonusPoints} Bonus`}
                        </Badge>
                        <Badge variant="outline">
                          {new Date(a.startDate + "T12:00:00").toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}{" "}
                          →{" "}
                          {new Date(a.endDate + "T12:00:00").toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </Badge>
                        {a.daysOfWeek && a.daysOfWeek.length > 0 && a.daysOfWeek.length < 7 && (
                          <Badge variant="outline">
                            {a.daysOfWeek.map((d) => DAYS[d].label).join(", ")}
                          </Badge>
                        )}
                        {a.serviceCategories && a.serviceCategories.length > 0 && (
                          <Badge variant="outline">{a.serviceCategories.join(", ")}</Badge>
                        )}
                        {a.minSpendCents && a.minSpendCents > 0 && (
                          <Badge variant="outline">Min ${a.minSpendCents / 100}</Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Switch
                        checked={a.isActive}
                        onCheckedChange={() => handleToggle(a._id, a.isActive)}
                      />
                      <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(a)}>
                        <Edit className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive"
                        onClick={() => handleDelete(a._id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit" : "Create"} Amplifier</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. 2x Tuesdays"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Earn double points on all services every Tuesday!"
              />
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label>Amplifier Type</Label>
              <Select
                value={form.amplifierType}
                onValueChange={(v) => setForm({ ...form, amplifierType: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="multiplier">Point Multiplier (e.g. 2x, 3x)</SelectItem>
                  <SelectItem value="bonus">Flat Bonus Points</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.amplifierType === "multiplier" ? (
              <div className="space-y-2">
                <Label>Multiplier</Label>
                <Input
                  type="number"
                  min="1.5"
                  step="0.5"
                  value={form.multiplier}
                  onChange={(e) => setForm({ ...form, multiplier: e.target.value })}
                  placeholder="2"
                />
                <p className="text-xs text-muted-foreground">
                  2 = double points, 3 = triple, 1.5 = 50% extra
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Bonus Points</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.bonusPoints}
                  onChange={(e) => setForm({ ...form, bonusPoints: e.target.value })}
                  placeholder="50"
                />
                <p className="text-xs text-muted-foreground">
                  Flat bonus added on top of regular points
                </p>
              </div>
            )}

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date *</Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </div>
            </div>

            {/* Conditions */}
            <div className="space-y-3 pt-2 border-t">
              <p className="text-sm font-medium">
                Conditions{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </p>

              {/* Days of Week */}
              <div className="space-y-2">
                <Label className="text-sm">Days of Week</Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((day) => (
                    <label
                      key={day.value}
                      className="flex items-center gap-1.5 cursor-pointer"
                    >
                      <Checkbox
                        checked={form.daysOfWeek.includes(day.value)}
                        onCheckedChange={(checked) => {
                          setForm({
                            ...form,
                            daysOfWeek: checked
                              ? [...form.daysOfWeek, day.value]
                              : form.daysOfWeek.filter((d) => d !== day.value),
                          });
                        }}
                      />
                      <span className="text-sm">{day.label}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Leave empty = applies every day
                </p>
              </div>

              {/* Service Categories */}
              <div className="space-y-2">
                <Label className="text-sm">Service Categories</Label>
                <Input
                  value={form.serviceCategories}
                  onChange={(e) => setForm({ ...form, serviceCategories: e.target.value })}
                  placeholder="e.g. Ceramic Coating, Full Detail"
                />
                <p className="text-xs text-muted-foreground">
                  Comma-separated. Leave empty = all services.
                  {categories.length > 0 && (
                    <> Your categories: {categories.join(", ")}</>
                  )}
                </p>
              </div>

              {/* Min Spend */}
              <div className="space-y-2">
                <Label className="text-sm">Minimum Spend ($)</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.minSpendCents}
                  onChange={(e) => setForm({ ...form, minSpendCents: e.target.value })}
                  placeholder="0 = no minimum"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingId ? "Save Changes" : "Create Amplifier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
