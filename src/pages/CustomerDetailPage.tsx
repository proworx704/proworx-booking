import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  Calendar,
  Camera,
  Car,
  Loader2,
  Mail,
  MapPin,
  Navigation,
  Pencil,
  Phone,
  Trash2,
  Truck,
  Upload,
  User,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

const statusColors: Record<string, string> = {
  confirmed: "bg-blue-100 text-blue-700",
  pending: "bg-yellow-100 text-yellow-700",
  in_progress: "bg-purple-100 text-purple-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const customer = useQuery(
    api.customers.get,
    id ? { id: id as Id<"customers"> } : "skip",
  );
  const bookings = useQuery(
    api.customers.getBookings,
    id ? { customerId: id as Id<"customers"> } : "skip",
  );
  const updateCustomer = useMutation(api.customers.update);
  const deleteCustomer = useMutation(api.customers.remove);
  const generateUploadUrl = useMutation(api.customers.generateVehicleUploadUrl);

  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (customer === undefined) {
    return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  }
  if (customer === null) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-medium">Client not found</h2>
        <Button variant="link" onClick={() => navigate("/customers")}>
          Back to Clients
        </Button>
      </div>
    );
  }

  const startEdit = () => {
    setForm({
      name: customer.name,
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || "",
      zipCode: customer.zipCode || "",
      vehicleType: customer.vehicleType || "",
      vehicleYear: customer.vehicleYear || "",
      vehicleMake: customer.vehicleMake || "",
      vehicleModel: customer.vehicleModel || "",
      vehicleColor: customer.vehicleColor || "",
      notes: customer.notes || "",
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    await updateCustomer({
      id: customer._id,
      name: form.name || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
      address: form.address || undefined,
      zipCode: form.zipCode || undefined,
      vehicleType:
        form.vehicleType === "sedan" || form.vehicleType === "suv"
          ? form.vehicleType
          : undefined,
      vehicleYear: form.vehicleYear || undefined,
      vehicleMake: form.vehicleMake || undefined,
      vehicleModel: form.vehicleModel || undefined,
      vehicleColor: form.vehicleColor || undefined,
      notes: form.notes || undefined,
    });
    setEditing(false);
  };

  const handleDelete = async () => {
    await deleteCustomer({ id: customer._id });
    navigate("/customers");
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();
      await updateCustomer({ id: customer._id, vehiclePhotoId: storageId });
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = async () => {
    await updateCustomer({ id: customer._id, removeVehiclePhoto: true });
  };

  const vehicleStr = [
    customer.vehicleYear,
    customer.vehicleMake,
    customer.vehicleModel,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/customers")}>
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{customer.name}</h1>
            <p className="text-sm text-muted-foreground capitalize">
              Source: {customer.source}
              {customer.squareCustomerId && " · Square linked"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={startEdit}>
            <Pencil className="size-4 mr-2" />
            Edit
          </Button>
          <Button
            variant="outline"
            className="text-destructive hover:bg-destructive/10"
            onClick={() => setDeleting(true)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <User className="size-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className="font-medium">{customer.name}</p>
                </div>
              </div>
              {customer.phone && (
                <a
                  href={`tel:${customer.phone}`}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <Phone className="size-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="font-medium">{customer.phone}</p>
                  </div>
                </a>
              )}
              {customer.email && (
                <a
                  href={`mailto:${customer.email}`}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <Mail className="size-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="font-medium text-primary">{customer.email}</p>
                  </div>
                </a>
              )}
              {customer.address && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(customer.address + (customer.zipCode ? ` ${customer.zipCode}` : ""))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 p-3 rounded-lg border hover:bg-blue-50 hover:border-blue-200 transition-colors group"
                >
                  <MapPin className="size-5 text-muted-foreground mt-0.5 group-hover:text-blue-600" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Address</p>
                    <p className="font-medium group-hover:text-blue-600">
                      {customer.address}
                      {customer.zipCode && (
                        <span className="ml-2 text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                          {customer.zipCode}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-blue-600 flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Navigation className="size-3" />
                      Open in Google Maps
                    </p>
                  </div>
                </a>
              )}
            </CardContent>
          </Card>

          {/* Vehicle Info */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Vehicle</CardTitle>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <><Loader2 className="size-4 mr-1 animate-spin" /> Uploading...</>
                ) : customer.vehiclePhotoUrl ? (
                  <><Camera className="size-4 mr-1" /> Change Photo</>
                ) : (
                  <><Upload className="size-4 mr-1" /> Add Photo</>
                )}
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Vehicle Photo */}
              {customer.vehiclePhotoUrl && (
                <div className="relative group">
                  <img
                    src={customer.vehiclePhotoUrl}
                    alt={vehicleStr || "Customer vehicle"}
                    className="w-full h-48 object-cover rounded-lg border"
                  />
                  <button
                    onClick={handleRemovePhoto}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                    title="Remove photo"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              )}
              {/* Vehicle Details */}
              {(vehicleStr || customer.vehicleColor || customer.vehicleType) ? (
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  {customer.vehicleType === "suv" ? (
                    <Truck className="size-5 text-muted-foreground" />
                  ) : (
                    <Car className="size-5 text-muted-foreground" />
                  )}
                  <div>
                    {vehicleStr && (
                      <p className="font-medium">{vehicleStr}</p>
                    )}
                    <div className="flex gap-2 text-sm text-muted-foreground">
                      {customer.vehicleType && (
                        <span className="capitalize">
                          {customer.vehicleType === "suv"
                            ? "SUV / Truck"
                            : "Sedan / Car"}
                        </span>
                      )}
                      {customer.vehicleColor && (
                        <span>· {customer.vehicleColor}</span>
                      )}
                    </div>
                  </div>
                </div>
              ) : !customer.vehiclePhotoUrl && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No vehicle info yet. Click Edit to add year, make, model, and color.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {customer.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{customer.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Stats & History */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Client Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Total Bookings
                </span>
                <span className="font-bold text-lg">
                  {customer.totalBookings || bookings?.length || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Total Spent
                </span>
                <span className="font-bold text-lg text-green-600">
                  {customer.totalSpent
                    ? formatPrice(customer.totalSpent)
                    : "$0"}
                </span>
              </div>
              {customer.lastServiceDate && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Last Service
                  </span>
                  <span className="text-sm font-medium">
                    {new Date(
                      customer.lastServiceDate + "T12:00:00",
                    ).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Booking History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="size-4" />
                Booking History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!bookings || bookings.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No bookings yet
                </p>
              ) : (
                <div className="space-y-2">
                  {bookings.map((b) => (
                    <Link
                      key={b._id}
                      to={`/bookings/${b._id}`}
                      className="block p-2 rounded-lg border hover:bg-accent/50 transition-colors text-sm"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{b.serviceName}</p>
                          <p className="text-muted-foreground text-xs">
                            {new Date(b.date + "T12:00:00").toLocaleDateString(
                              "en-US",
                              {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                              },
                            )}{" "}
                            · {b.time}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatPrice(b.price)}</p>
                          <Badge
                            variant="outline"
                            className={`text-xs ${statusColors[b.status] || ""}`}
                          >
                            {b.status}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={form.name || ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={form.phone || ""}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  value={form.email || ""}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-2">
                <Label>Address</Label>
                <Input
                  value={form.address || ""}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>ZIP</Label>
                <Input
                  value={form.zipCode || ""}
                  onChange={(e) =>
                    setForm({ ...form, zipCode: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Vehicle Type</Label>
              <Select
                value={form.vehicleType || ""}
                onValueChange={(v) => setForm({ ...form, vehicleType: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sedan">Sedan / Car</SelectItem>
                  <SelectItem value="suv">SUV / Truck</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-2">
                <Label>Year</Label>
                <Input
                  value={form.vehicleYear || ""}
                  onChange={(e) =>
                    setForm({ ...form, vehicleYear: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Make</Label>
                <Input
                  value={form.vehicleMake || ""}
                  onChange={(e) =>
                    setForm({ ...form, vehicleMake: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Model</Label>
                <Input
                  value={form.vehicleModel || ""}
                  onChange={(e) =>
                    setForm({ ...form, vehicleModel: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <Input
                  value={form.vehicleColor || ""}
                  onChange={(e) =>
                    setForm({ ...form, vehicleColor: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                value={form.notes || ""}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button onClick={saveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleting} onOpenChange={setDeleting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Client</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {customer.name}? This won&apos;t
              affect their existing bookings.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
