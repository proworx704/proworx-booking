import { useQuery, useMutation } from "convex/react";
import { Plus, Pencil, Trash2, UserCheck, UserX } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/dateUtils";

export function PayrollWorkersPage() {
  const workers = useQuery(api.payrollWorkers.list) ?? [];
  const createWorker = useMutation(api.payrollWorkers.create);
  const updateWorker = useMutation(api.payrollWorkers.update);
  const removeWorker = useMutation(api.payrollWorkers.remove);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<"payrollWorkers"> | null>(null);
  const [name, setName] = useState("");
  const [hourlyRate, setHourlyRate] = useState("15");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<Id<"payrollWorkers"> | null>(null);

  const openCreate = () => {
    setEditingId(null);
    setName("");
    setHourlyRate("15");
    setPhone("");
    setEmail("");
    setDialogOpen(true);
  };

  const openEdit = (worker: (typeof workers)[0]) => {
    setEditingId(worker._id);
    setName(worker.name);
    setHourlyRate(String(worker.hourlyRate));
    setPhone(worker.phone ?? "");
    setEmail(worker.email ?? "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    const rate = Number.parseFloat(hourlyRate);
    if (Number.isNaN(rate) || rate <= 0) {
      toast.error("Enter a valid hourly rate");
      return;
    }
    try {
      if (editingId) {
        await updateWorker({
          id: editingId,
          name: name.trim(),
          hourlyRate: rate,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
        });
        toast.success("Worker updated");
      } else {
        await createWorker({
          name: name.trim(),
          hourlyRate: rate,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
        });
        toast.success("Worker added");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Something went wrong");
    }
  };

  const handleToggleActive = async (worker: (typeof workers)[0]) => {
    await updateWorker({ id: worker._id, isActive: !worker.isActive });
    toast.success(worker.isActive ? "Worker deactivated" : "Worker activated");
  };

  const handleDelete = async (id: Id<"payrollWorkers">) => {
    try {
      await removeWorker({ id });
      toast.success("Worker removed");
      setDeleteConfirm(null);
    } catch {
      toast.error("Could not delete worker");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workers</h1>
          <p className="text-muted-foreground">
            Manage your team members and hourly rates
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Worker
        </Button>
      </div>

      {workers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="text-lg mb-2">No workers yet</p>
            <p className="mb-4">Add your team members to start tracking hours.</p>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add First Worker
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workers.map((worker) => (
            <Card key={worker._id} className={!worker.isActive ? "opacity-60" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{worker.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatCurrency(worker.hourlyRate)}/hr
                    </p>
                  </div>
                  <Badge variant={worker.isActive ? "default" : "secondary"}>
                    {worker.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {worker.phone && (
                  <p className="text-sm text-muted-foreground">📱 {worker.phone}</p>
                )}
                {worker.email && (
                  <p className="text-sm text-muted-foreground">✉️ {worker.email}</p>
                )}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(worker)}>
                    <Pencil className="mr-1 h-3 w-3" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleToggleActive(worker)}>
                    {worker.isActive ? <UserX className="mr-1 h-3 w-3" /> : <UserCheck className="mr-1 h-3 w-3" />}
                    {worker.isActive ? "Deactivate" : "Activate"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteConfirm(worker._id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Worker" : "Add Worker"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Update worker details and hourly rate." : "Add a new team member. They'll start as active."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Worker name" />
            </div>
            <div>
              <Label htmlFor="rate">Hourly Rate ($) *</Label>
              <Input
                id="rate"
                type="number"
                step="0.50"
                min="0"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                placeholder="15.00"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 555-5555" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="worker@email.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>{editingId ? "Save Changes" : "Add Worker"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Worker?</DialogTitle>
            <DialogDescription>
              This will permanently remove this worker. Their time entries and payouts will remain in the system.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
