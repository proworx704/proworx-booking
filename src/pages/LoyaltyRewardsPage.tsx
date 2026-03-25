import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, Edit, Gift, Plus, Trash2 } from "lucide-react";
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
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

const REWARD_TYPE_LABELS: Record<string, string> = {
  discount_fixed: "$ Off",
  discount_percent: "% Off",
  free_service: "Free Service",
  custom: "Custom",
};

type RewardForm = {
  name: string;
  description: string;
  pointsCost: string;
  rewardType: string;
  discountAmount: string;
  discountPercent: string;
  icon: string;
  sortOrder: string;
};

const emptyForm: RewardForm = {
  name: "",
  description: "",
  pointsCost: "",
  rewardType: "discount_fixed",
  discountAmount: "",
  discountPercent: "",
  icon: "🎁",
  sortOrder: "0",
};

export function LoyaltyRewardsPage() {
  const rewards = useQuery(api.loyalty.listRewards);
  const createReward = useMutation(api.loyalty.createReward);
  const updateReward = useMutation(api.loyalty.updateReward);
  const deleteReward = useMutation(api.loyalty.deleteReward);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<Id<"loyaltyRewards"> | null>(null);
  const [form, setForm] = useState<RewardForm>(emptyForm);

  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(r: any) {
    setForm({
      name: r.name,
      description: r.description,
      pointsCost: String(r.pointsCost),
      rewardType: r.rewardType,
      discountAmount: r.discountAmount ? String(r.discountAmount / 100) : "",
      discountPercent: r.discountPercent ? String(r.discountPercent) : "",
      icon: r.icon || "🎁",
      sortOrder: String(r.sortOrder || 0),
    });
    setEditingId(r._id);
    setShowForm(true);
  }

  async function handleSave() {
    const pts = parseInt(form.pointsCost);
    if (!form.name || isNaN(pts) || pts <= 0) {
      toast.error("Fill in all required fields");
      return;
    }

    try {
      const data: any = {
        name: form.name,
        description: form.description,
        pointsCost: pts,
        rewardType: form.rewardType as any,
        icon: form.icon,
        sortOrder: parseInt(form.sortOrder) || 0,
      };
      if (form.rewardType === "discount_fixed" && form.discountAmount) {
        data.discountAmount = Math.round(parseFloat(form.discountAmount) * 100);
      }
      if (form.rewardType === "discount_percent" && form.discountPercent) {
        data.discountPercent = parseInt(form.discountPercent);
      }

      if (editingId) {
        await updateReward({ id: editingId, ...data });
        toast.success("Reward updated");
      } else {
        await createReward(data);
        toast.success("Reward created");
      }
      setShowForm(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleToggle(id: Id<"loyaltyRewards">, currentActive: boolean) {
    await updateReward({ id, isActive: !currentActive });
  }

  async function handleDelete(id: Id<"loyaltyRewards">) {
    if (!confirm("Delete this reward?")) return;
    await deleteReward({ id });
    toast.success("Reward deleted");
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
            <h1 className="text-2xl font-bold">Rewards</h1>
            <p className="text-muted-foreground">
              Configure what clients can redeem points for
            </p>
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4 mr-1" /> Add Reward
        </Button>
      </div>

      {!rewards || rewards.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Gift className="size-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No rewards yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Create rewards for clients to redeem their points
            </p>
            <Button onClick={openCreate}>
              <Plus className="size-4 mr-1" /> Create First Reward
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rewards.map((r) => (
            <Card
              key={r._id}
              className={!r.isActive ? "opacity-60" : ""}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">
                    {r.icon} {r.name}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={r.isActive}
                      onCheckedChange={() => handleToggle(r._id, r.isActive)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  {r.description}
                </p>
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="secondary">
                    {r.pointsCost.toLocaleString()} pts
                  </Badge>
                  <Badge variant="outline">{REWARD_TYPE_LABELS[r.rewardType]}</Badge>
                </div>
                {r.rewardType === "discount_fixed" && r.discountAmount && (
                  <p className="text-sm font-medium">
                    ${(r.discountAmount / 100).toFixed(0)} off
                  </p>
                )}
                {r.rewardType === "discount_percent" && r.discountPercent && (
                  <p className="text-sm font-medium">{r.discountPercent}% off</p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  {r.totalRedemptions} redemption{r.totalRedemptions !== 1 ? "s" : ""}
                </p>
                <div className="flex gap-2 mt-3 pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => openEdit(r)}
                  >
                    <Edit className="size-3 mr-1" /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(r._id)}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit" : "Create"} Reward</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-[60px_1fr] gap-3">
              <div className="space-y-2">
                <Label>Icon</Label>
                <Input
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  className="text-center text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. $25 Off Service"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What the client gets"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Points Cost *</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.pointsCost}
                  onChange={(e) => setForm({ ...form, pointsCost: e.target.value })}
                  placeholder="500"
                />
              </div>
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reward Type</Label>
              <Select
                value={form.rewardType}
                onValueChange={(v) => setForm({ ...form, rewardType: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="discount_fixed">Fixed $ Off</SelectItem>
                  <SelectItem value="discount_percent">Percent % Off</SelectItem>
                  <SelectItem value="free_service">Free Service</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.rewardType === "discount_fixed" && (
              <div className="space-y-2">
                <Label>Discount Amount ($)</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.discountAmount}
                  onChange={(e) => setForm({ ...form, discountAmount: e.target.value })}
                  placeholder="25"
                />
              </div>
            )}
            {form.rewardType === "discount_percent" && (
              <div className="space-y-2">
                <Label>Discount Percent (%)</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={form.discountPercent}
                  onChange={(e) => setForm({ ...form, discountPercent: e.target.value })}
                  placeholder="10"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingId ? "Save Changes" : "Create Reward"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
