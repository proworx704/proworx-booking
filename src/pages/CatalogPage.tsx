import { useMutation, useQuery } from "convex/react";
import {
  ChevronDown,
  ChevronRight,
  DollarSign,
  Edit2,
  Eye,
  EyeOff,
  GripVertical,
  List,
  Plus,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

// ─── Types ────────────────────────────────────────────────────────────────────

type CatalogItem = {
  _id: Id<"serviceCatalog">;
  _creationTime: number;
  name: string;
  slug: string;
  description: string;
  category: string;
  variants: Array<{ label: string; price: number; durationMin: number }>;
  isActive: boolean;
  sortOrder: number;
  deposit?: number;
  popular?: boolean;
};

type Variant = { label: string; price: number; durationMin: number };

const CATEGORIES = [
  { value: "core", label: "Standard Detailing" },
  { value: "paintCorrection", label: "Paint Correction" },
  { value: "ceramicCoating", label: "Ceramic Coating" },
  { value: "interiorAddon", label: "Interior Add-Ons" },
  { value: "exteriorAddon", label: "Exterior Add-Ons" },
  { value: "ceramicAddon", label: "Ceramic Add-Ons" },
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  core: "bg-blue-100 text-blue-800 border-blue-200",
  paintCorrection: "bg-orange-100 text-orange-800 border-orange-200",
  ceramicCoating: "bg-purple-100 text-purple-800 border-purple-200",
  interiorAddon: "bg-green-100 text-green-800 border-green-200",
  exteriorAddon: "bg-cyan-100 text-cyan-800 border-cyan-200",
  ceramicAddon: "bg-pink-100 text-pink-800 border-pink-200",
};

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ─── Edit / Create Dialog ─────────────────────────────────────────────────────

function CatalogItemDialog({
  open,
  onOpenChange,
  item,
  onSave,
  saving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: CatalogItem | null; // null = create new
  onSave: (data: {
    name: string;
    slug: string;
    description: string;
    category: string;
    variants: Variant[];
    isActive: boolean;
    sortOrder: number;
    deposit?: number;
    popular?: boolean;
  }) => void;
  saving: boolean;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("core");
  const [variants, setVariants] = useState<Variant[]>([
    { label: "Standard", price: 0, durationMin: 60 },
  ]);
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState(99);
  const [deposit, setDeposit] = useState<string>("");
  const [popular, setPopular] = useState(false);
  const [autoSlug, setAutoSlug] = useState(true);

  useEffect(() => {
    if (item) {
      setName(item.name);
      setSlug(item.slug);
      setDescription(item.description);
      setCategory(item.category);
      setVariants(item.variants.length > 0 ? [...item.variants] : [{ label: "Standard", price: 0, durationMin: 60 }]);
      setIsActive(item.isActive);
      setSortOrder(item.sortOrder);
      setDeposit(item.deposit ? (item.deposit / 100).toString() : "");
      setPopular(item.popular ?? false);
      setAutoSlug(false);
    } else {
      setName("");
      setSlug("");
      setDescription("");
      setCategory("core");
      setVariants([{ label: "Standard", price: 0, durationMin: 60 }]);
      setIsActive(true);
      setSortOrder(99);
      setDeposit("");
      setPopular(false);
      setAutoSlug(true);
    }
  }, [item, open]);

  useEffect(() => {
    if (autoSlug && name) {
      setSlug(slugify(name));
    }
  }, [name, autoSlug]);

  const addVariant = () => {
    setVariants([...variants, { label: "", price: 0, durationMin: 60 }]);
  };

  const removeVariant = (index: number) => {
    if (variants.length <= 1) return;
    setVariants(variants.filter((_, i) => i !== index));
  };

  const updateVariant = (index: number, field: keyof Variant, value: string | number) => {
    setVariants(
      variants.map((v, i) => (i === index ? { ...v, [field]: value } : v)),
    );
  };

  const handleSubmit = () => {
    onSave({
      name: name.trim(),
      slug: slug.trim(),
      description: description.trim(),
      category,
      variants: variants.map((v) => ({
        label: v.label.trim() || "Standard",
        price: typeof v.price === "string" ? Math.round(parseFloat(v.price as any) * 100) || 0 : v.price,
        durationMin: typeof v.durationMin === "string" ? parseInt(v.durationMin as any) || 60 : v.durationMin,
      })),
      isActive,
      sortOrder,
      deposit: deposit ? Math.round(parseFloat(deposit) * 100) : undefined,
      popular: popular || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {item ? "Edit Service" : "Add New Service"}
          </DialogTitle>
          <DialogDescription>
            {item
              ? "Update service details, pricing, and variants."
              : "Create a new service or add-on for customers to book."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Name + slug */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Service Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Standard Inside & Out"
              />
            </div>
            <div className="space-y-2">
              <Label>
                URL Slug{" "}
                <span className="text-muted-foreground text-xs">
                  (for deep links)
                </span>
              </Label>
              <Input
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setAutoSlug(false);
                }}
                placeholder="standard-inside-out"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this service..."
              rows={2}
            />
          </div>

          {/* Category + sort + flags */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>Category *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sort Order</Label>
              <Input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label>Deposit ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={deposit}
                onChange={(e) => setDeposit(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <Label>Active</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={popular} onCheckedChange={setPopular} />
              <Label className="flex items-center gap-1">
                <Star className="size-3.5" /> Popular
              </Label>
            </div>
          </div>

          {/* Variants / Pricing */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">
                Pricing Variants
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addVariant}
              >
                <Plus className="size-3.5 mr-1" /> Add Variant
              </Button>
            </div>
            <p className="text-xs text-muted-foreground -mt-1">
              Add one row per pricing tier (e.g. Sedan, SUV, Truck). Use
              "Standard" for flat-rate items.
            </p>

            <div className="space-y-2">
              {variants.map((variant, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30"
                >
                  <GripVertical className="size-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <Input
                      placeholder="Label (e.g. Sedan)"
                      value={variant.label}
                      onChange={(e) =>
                        updateVariant(idx, "label", e.target.value)
                      }
                    />
                    <div className="relative">
                      <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Price"
                        className="pl-7"
                        value={
                          typeof variant.price === "number" && variant.price > 0
                            ? (variant.price / 100).toFixed(2)
                            : ""
                        }
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          updateVariant(
                            idx,
                            "price",
                            isNaN(val) ? 0 : Math.round(val * 100),
                          );
                        }}
                      />
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        placeholder="Duration (min)"
                        value={variant.durationMin || ""}
                        onChange={(e) =>
                          updateVariant(
                            idx,
                            "durationMin",
                            parseInt(e.target.value) || 0,
                          )
                        }
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        min
                      </span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0"
                    onClick={() => removeVariant(idx)}
                    disabled={variants.length <= 1}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !name.trim()}>
            {saving ? "Saving..." : item ? "Save Changes" : "Create Service"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Confirmation Dialog ───────────────────────────────────────────────

function DeleteDialog({
  open,
  onOpenChange,
  item,
  onConfirm,
  deleting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: CatalogItem | null;
  onConfirm: () => void;
  deleting: boolean;
}) {
  if (!item) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Service</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete{" "}
            <strong>{item.name}</strong>? This can't be undone. Existing
            bookings that reference this service won't be affected.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function CatalogPage() {
  const items = useQuery(api.catalog.listAll);
  const createItem = useMutation(api.catalog.create);
  const updateItem = useMutation(api.catalog.update);
  const removeItem = useMutation(api.catalog.remove);

  const [editItem, setEditItem] = useState<CatalogItem | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<CatalogItem | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(CATEGORIES.map((c) => c.value)),
  );

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const handleSave = async (data: any) => {
    setSaving(true);
    try {
      if (editItem) {
        await updateItem({ id: editItem._id, ...data });
      } else {
        await createItem(data);
      }
      setEditOpen(false);
      setEditItem(null);
    } catch (e) {
      console.error(e);
      alert("Failed to save. Check the console for details.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      await removeItem({ id: deleteItem._id });
      setDeleteOpen(false);
      setDeleteItem(null);
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleActive = async (item: CatalogItem) => {
    await updateItem({ id: item._id, isActive: !item.isActive });
  };

  // Group items by category
  const grouped = CATEGORIES.reduce(
    (acc, cat) => {
      const catItems = (items || []).filter(
        (i) =>
          i.category === cat.value &&
          (filterCategory === "all" || i.category === filterCategory),
      );
      if (catItems.length) acc[cat.value] = catItems;
      return acc;
    },
    {} as Record<string, CatalogItem[]>,
  );

  const totalItems = items?.length || 0;
  const activeItems = items?.filter((i) => i.isActive).length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <List className="size-6" />
            Service Catalog
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {activeItems} active / {totalItems} total services & add-ons
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => {
              setEditItem(null);
              setEditOpen(true);
            }}
          >
            <Plus className="size-4 mr-1" />
            Add Service
          </Button>
        </div>
      </div>

      {/* Catalog list */}
      {!items ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No catalog items found. Click "Add Service" to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {CATEGORIES.filter((c) => grouped[c.value]).map((cat) => {
            const catItems = grouped[cat.value];
            const isExpanded = expandedCategories.has(cat.value);
            const activeCount = catItems.filter((i) => i.isActive).length;

            return (
              <div key={cat.value}>
                <button
                  type="button"
                  className="flex items-center gap-2 w-full text-left mb-2 group"
                  onClick={() => toggleCategory(cat.value)}
                >
                  {isExpanded ? (
                    <ChevronDown className="size-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="size-4 text-muted-foreground" />
                  )}
                  <Badge
                    className={`${CATEGORY_COLORS[cat.value]} text-xs`}
                    variant="outline"
                  >
                    {cat.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {activeCount}/{catItems.length} active
                  </span>
                </button>

                {isExpanded && (
                  <div className="space-y-1.5 ml-6">
                    {catItems.map((item) => (
                      <Card
                        key={item._id}
                        className={`transition-all ${!item.isActive ? "opacity-50" : ""}`}
                      >
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex items-start gap-3">
                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-semibold text-sm">
                                  {item.name}
                                </h4>
                                {item.popular && (
                                  <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">
                                    <Star className="size-2.5 mr-0.5" />{" "}
                                    Popular
                                  </Badge>
                                )}
                                {!item.isActive && (
                                  <Badge variant="secondary" className="text-[10px]">
                                    Inactive
                                  </Badge>
                                )}
                                {item.deposit && (
                                  <Badge variant="outline" className="text-[10px]">
                                    Deposit: {formatPrice(item.deposit)}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                {item.description}
                              </p>

                              {/* Variants summary */}
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {item.variants.map((v, i) => (
                                  <span
                                    key={i}
                                    className="text-xs px-2 py-0.5 rounded-md bg-muted border"
                                  >
                                    {v.label}:{" "}
                                    <strong>{formatPrice(v.price)}</strong>
                                    <span className="text-muted-foreground ml-1">
                                      ({formatDuration(v.durationMin)})
                                    </span>
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                title={
                                  item.isActive ? "Deactivate" : "Activate"
                                }
                                onClick={() => handleToggleActive(item)}
                              >
                                {item.isActive ? (
                                  <Eye className="size-4 text-green-600" />
                                ) : (
                                  <EyeOff className="size-4 text-muted-foreground" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                title="Edit"
                                onClick={() => {
                                  setEditItem(item);
                                  setEditOpen(true);
                                }}
                              >
                                <Edit2 className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                title="Delete"
                                onClick={() => {
                                  setDeleteItem(item);
                                  setDeleteOpen(true);
                                }}
                              >
                                <Trash2 className="size-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <CatalogItemDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        item={editItem}
        onSave={handleSave}
        saving={saving}
      />
      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        item={deleteItem}
        onConfirm={handleDelete}
        deleting={deleting}
      />
    </div>
  );
}
