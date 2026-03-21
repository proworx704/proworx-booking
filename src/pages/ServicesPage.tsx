import { useMutation, useQuery } from "convex/react";
import { Clock, DollarSign, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

interface ServiceForm {
  name: string;
  description: string;
  sedanPrice: string;
  suvPrice: string;
  duration: string;
  isActive: boolean;
  sortOrder: string;
}

const emptyForm: ServiceForm = {
  name: "",
  description: "",
  sedanPrice: "",
  suvPrice: "",
  duration: "",
  isActive: true,
  sortOrder: "0",
};

export function ServicesPage() {
  const services = useQuery(api.services.listAll);
  const seedServices = useMutation(api.services.seed);
  const createService = useMutation(api.services.create);
  const updateService = useMutation(api.services.update);
  const removeService = useMutation(api.services.remove);

  const [editId, setEditId] = useState<Id<"services"> | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState<ServiceForm>(emptyForm);

  useEffect(() => {
    if (services && services.length === 0) {
      seedServices();
    }
  }, [services, seedServices]);

  const openCreate = () => {
    setEditId(null);
    setForm({
      ...emptyForm,
      sortOrder: String((services?.length ?? 0) + 1),
    });
    setShowDialog(true);
  };

  const openEdit = (service: NonNullable<typeof services>[0]) => {
    setEditId(service._id);
    setForm({
      name: service.name,
      description: service.description,
      sedanPrice: (service.sedanPrice / 100).toString(),
      suvPrice: (service.suvPrice / 100).toString(),
      duration: service.duration.toString(),
      isActive: service.isActive,
      sortOrder: service.sortOrder.toString(),
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    const data = {
      name: form.name,
      description: form.description,
      sedanPrice: Math.round(Number.parseFloat(form.sedanPrice) * 100),
      suvPrice: Math.round(Number.parseFloat(form.suvPrice) * 100),
      duration: Number.parseInt(form.duration),
      isActive: form.isActive,
      sortOrder: Number.parseInt(form.sortOrder),
    };

    if (editId) {
      await updateService({ id: editId, ...data });
    } else {
      await createService(data);
    }
    setShowDialog(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Services</h1>
          <p className="text-muted-foreground">
            Manage your detailing packages and pricing
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4 mr-2" />
          Add Service
        </Button>
      </div>

      <div className="space-y-3">
        {services === undefined ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))
        ) : services.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Loading default services...
            </CardContent>
          </Card>
        ) : (
          services.map((service) => (
            <Card key={service._id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{service.name}</h3>
                      {!service.isActive && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {service.description}
                    </p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <DollarSign className="size-3" />
                        Sedan: ${(service.sedanPrice / 100).toFixed(0)}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="size-3" />
                        SUV: ${(service.suvPrice / 100).toFixed(0)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {Math.floor(service.duration / 60)}h{" "}
                        {service.duration % 60 > 0 ? `${service.duration % 60}m` : ""}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(service)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => {
                        if (confirm("Delete this service?")) {
                          removeService({ id: service._id });
                        }
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editId ? "Edit Service" : "New Service"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Service Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Full Detail"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="What's included in this service..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sedan Price ($)</Label>
                <Input
                  type="number"
                  step="1"
                  value={form.sedanPrice}
                  onChange={(e) =>
                    setForm({ ...form, sedanPrice: e.target.value })
                  }
                  placeholder="250"
                />
              </div>
              <div className="space-y-2">
                <Label>SUV Price ($)</Label>
                <Input
                  type="number"
                  step="1"
                  value={form.suvPrice}
                  onChange={(e) =>
                    setForm({ ...form, suvPrice: e.target.value })
                  }
                  placeholder="350"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={form.duration}
                  onChange={(e) =>
                    setForm({ ...form, duration: e.target.value })
                  }
                  placeholder="180"
                />
              </div>
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm({ ...form, sortOrder: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) =>
                  setForm({ ...form, isActive: checked })
                }
              />
              <Label>Active (visible on booking page)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editId ? "Save Changes" : "Create Service"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
