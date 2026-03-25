import { useMutation, useQuery } from "convex/react";
import {
  Download,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  Upload,
  UserPlus,
  Users,
} from "lucide-react";
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

const sourceColors: Record<string, string> = {
  booking: "bg-blue-100 text-blue-700",
  manual: "bg-gray-100 text-gray-700",
  csv: "bg-green-100 text-green-700",
  square: "bg-purple-100 text-purple-700",
};

function AddCustomerDialog() {
  const [open, setOpen] = useState(false);
  const createCustomer = useMutation(api.customers.create);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    zipCode: "",
    vehicleType: "" as "" | "sedan" | "suv",
    vehicleMake: "",
    vehicleModel: "",
    vehicleYear: "",
    vehicleColor: "",
    notes: "",
  });

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    await createCustomer({
      name: form.name.trim(),
      phone: form.phone || undefined,
      email: form.email || undefined,
      address: form.address || undefined,
      zipCode: form.zipCode || undefined,
      vehicleType: form.vehicleType || undefined,
      vehicleMake: form.vehicleMake || undefined,
      vehicleModel: form.vehicleModel || undefined,
      vehicleYear: form.vehicleYear || undefined,
      vehicleColor: form.vehicleColor || undefined,
      notes: form.notes || undefined,
      source: "manual",
    });
    setOpen(false);
    setForm({
      name: "",
      phone: "",
      email: "",
      address: "",
      zipCode: "",
      vehicleType: "",
      vehicleMake: "",
      vehicleModel: "",
      vehicleYear: "",
      vehicleColor: "",
      notes: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4 mr-2" />
          Add Client
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Client</DialogTitle>
          <DialogDescription>
            Add a client to your database
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Full Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="John Smith"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="(704) 555-1234"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="john@example.com"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-2">
              <Label>Address</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="123 Main St, Charlotte, NC"
              />
            </div>
            <div className="space-y-2">
              <Label>ZIP</Label>
              <Input
                value={form.zipCode}
                onChange={(e) => setForm({ ...form, zipCode: e.target.value })}
                placeholder="28203"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Vehicle Type</Label>
            <Select
              value={form.vehicleType}
              onValueChange={(v) =>
                setForm({ ...form, vehicleType: v as "sedan" | "suv" })
              }
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
                value={form.vehicleYear}
                onChange={(e) =>
                  setForm({ ...form, vehicleYear: e.target.value })
                }
                placeholder="2024"
              />
            </div>
            <div className="space-y-2">
              <Label>Make</Label>
              <Input
                value={form.vehicleMake}
                onChange={(e) =>
                  setForm({ ...form, vehicleMake: e.target.value })
                }
                placeholder="BMW"
              />
            </div>
            <div className="space-y-2">
              <Label>Model</Label>
              <Input
                value={form.vehicleModel}
                onChange={(e) =>
                  setForm({ ...form, vehicleModel: e.target.value })
                }
                placeholder="X5"
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <Input
                value={form.vehicleColor}
                onChange={(e) =>
                  setForm({ ...form, vehicleColor: e.target.value })
                }
                placeholder="Black"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Any notes about this client..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!form.name.trim()}>
            Add Client
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CsvImportDialog() {
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    skipped: number;
    total: number;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bulkImport = useMutation(api.customers.bulkImport);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setResult(null);

    try {
      const text = await file.text();
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) {
        alert("CSV must have at least a header row and one data row");
        setImporting(false);
        return;
      }

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

      // Map common header names to our fields (including Square CSV format)
      const fieldMap: Record<string, string> = {
        name: "name",
        "full name": "name",
        "client name": "name",
        "customer name": "name",
        "first name": "firstName",
        "given name": "firstName",
        "last name": "lastName",
        "family name": "lastName",
        phone: "phone",
        "phone number": "phone",
        telephone: "phone",
        email: "email",
        "email address": "email",
        address: "address",
        "street address": "address",
        "service address": "address",
        "street address 1": "address",
        "address line 1": "address",
        city: "city",
        locality: "city",
        state: "state",
        "administrative district level 1": "state",
        zip: "zipCode",
        "zip code": "zipCode",
        zipcode: "zipCode",
        postal: "zipCode",
        "postal code": "zipCode",
        "vehicle type": "vehicleType",
        type: "vehicleType",
        year: "vehicleYear",
        "vehicle year": "vehicleYear",
        make: "vehicleMake",
        "vehicle make": "vehicleMake",
        model: "vehicleModel",
        "vehicle model": "vehicleModel",
        color: "vehicleColor",
        "vehicle color": "vehicleColor",
        notes: "notes",
        note: "notes",
        "square customer id": "squareCustomerId",
        "customer id": "squareCustomerId",
      };

      const colIndex: Record<string, number> = {};
      headers.forEach((h, i) => {
        const mapped = fieldMap[h];
        if (mapped) colIndex[mapped] = i;
      });

      // Support Square CSV format with separate first/last name columns
      const hasFirstLast = "firstName" in colIndex || "lastName" in colIndex;
      if (!("name" in colIndex) && !hasFirstLast) {
        alert(
          'CSV must have a "Name" column (or "First Name" + "Last Name"). Found columns: ' + headers.join(", "),
        );
        setImporting(false);
        return;
      }

      const customers = [];
      for (let i = 1; i < lines.length; i++) {
        // Simple CSV parse (handles quoted fields with commas)
        const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)?.map(
          (v) => v.replace(/^"|"$/g, "").trim(),
        ) || lines[i].split(",").map((v) => v.trim());

        // Build name from either "name" or "firstName"+"lastName"
        let name = colIndex.name !== undefined ? row[colIndex.name] : "";
        if (!name && hasFirstLast) {
          const first = colIndex.firstName !== undefined ? (row[colIndex.firstName] || "").trim() : "";
          const last = colIndex.lastName !== undefined ? (row[colIndex.lastName] || "").trim() : "";
          name = `${first} ${last}`.trim();
        }
        if (!name) continue;

        // Build full address from parts if separate columns exist
        let address = colIndex.address !== undefined ? row[colIndex.address] || undefined : undefined;
        if (!address && (colIndex.city !== undefined || colIndex.state !== undefined)) {
          const parts = [
            colIndex.address !== undefined ? row[colIndex.address] : "",
            colIndex.city !== undefined ? row[colIndex.city] : "",
            colIndex.state !== undefined ? row[colIndex.state] : "",
          ].filter(Boolean);
          if (parts.length > 0) address = parts.join(", ");
        }

        const vehicleTypeRaw = colIndex.vehicleType !== undefined ? row[colIndex.vehicleType]?.toLowerCase() : undefined;
        const vehicleType = vehicleTypeRaw === "sedan" || vehicleTypeRaw === "car" ? "sedan" as const
          : vehicleTypeRaw === "suv" || vehicleTypeRaw === "truck" ? "suv" as const
          : undefined;

        // Determine source (square if squareCustomerId present)
        const sqId = colIndex.squareCustomerId !== undefined ? row[colIndex.squareCustomerId] || undefined : undefined;
        const source = sqId ? "square" as const : "csv" as const;

        customers.push({
          name,
          phone: colIndex.phone !== undefined ? row[colIndex.phone] || undefined : undefined,
          email: colIndex.email !== undefined ? row[colIndex.email] || undefined : undefined,
          address,
          zipCode: colIndex.zipCode !== undefined ? row[colIndex.zipCode] || undefined : undefined,
          vehicleType,
          vehicleYear: colIndex.vehicleYear !== undefined ? row[colIndex.vehicleYear] || undefined : undefined,
          vehicleMake: colIndex.vehicleMake !== undefined ? row[colIndex.vehicleMake] || undefined : undefined,
          vehicleModel: colIndex.vehicleModel !== undefined ? row[colIndex.vehicleModel] || undefined : undefined,
          vehicleColor: colIndex.vehicleColor !== undefined ? row[colIndex.vehicleColor] || undefined : undefined,
          notes: colIndex.notes !== undefined ? row[colIndex.notes] || undefined : undefined,
          source,
          squareCustomerId: sqId,
        });
      }

      // Import in batches of 50
      let totalImported = 0;
      let totalSkipped = 0;
      for (let i = 0; i < customers.length; i += 50) {
        const batch = customers.slice(i, i + 50);
        const r = await bulkImport({ customers: batch });
        totalImported += r.imported;
        totalSkipped += r.skipped;
      }

      setResult({
        imported: totalImported,
        skipped: totalSkipped,
        total: customers.length,
      });
    } catch (err) {
      console.error(err);
      alert("Import failed: " + (err as Error).message);
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="size-4 mr-2" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Clients from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with client data. Duplicates (matching email or
            phone) will be skipped.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>CSV File</Label>
            <Input
              type="file"
              accept=".csv"
              ref={fileRef}
              onChange={handleImport}
              disabled={importing}
            />
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            <p className="font-medium">Supported formats:</p>
            <p>
              <strong>Standard:</strong> Name (required), Phone, Email, Address, ZIP Code, Vehicle Type, Year, Make, Model, Color, Notes
            </p>
            <p>
              <strong>Square CSV:</strong> First Name, Last Name, Email Address, Phone Number, Street Address 1, City, State, Zip Code
            </p>
          </div>
          {importing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Importing...
            </div>
          )}
          {result && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
              <p className="font-medium text-green-700">Import complete!</p>
              <p className="text-green-600">
                ✅ {result.imported} imported · ⏭️ {result.skipped} skipped
                (duplicates) · {result.total} total rows
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(0)}`;
}

export function CustomersPage() {
  const [search, setSearch] = useState("");
  const customers = useQuery(api.customers.list, {
    search: search || undefined,
  });
  const stats = useQuery(api.customers.stats);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-muted-foreground">
            {stats?.total ?? 0} total clients
          </p>
        </div>
        <div className="flex gap-2">
          <CsvImportDialog />
          <AddCustomerDialog />
        </div>
      </div>

      {/* Stats */}
      {stats && stats.total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-blue-500" />
                <span className="text-2xl font-bold">{stats.total}</span>
              </div>
              <p className="text-xs text-muted-foreground">Total Clients</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2">
                <UserPlus className="size-4 text-green-500" />
                <span className="text-2xl font-bold">
                  {stats.sources.booking}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">From Bookings</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2">
                <Download className="size-4 text-purple-500" />
                <span className="text-2xl font-bold">
                  {stats.sources.csv + stats.sources.square}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Imported</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2">
                <Mail className="size-4 text-orange-500" />
                <span className="text-2xl font-bold">{stats.withEmail}</span>
              </div>
              <p className="text-xs text-muted-foreground">With Email</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Customer List */}
      {customers === undefined ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : customers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="size-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {search ? "No clients found" : "No clients yet"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {search
                ? "Try a different search term"
                : "Clients are automatically added when bookings come in, or you can add them manually"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {customers.map((c) => (
            <Link key={c._id} to={`/customers/${c._id}`}>
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                        {c.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{c.name}</p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          {c.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="size-3" />
                              {c.phone}
                            </span>
                          )}
                          {c.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="size-3" />
                              {c.email}
                            </span>
                          )}
                          {c.zipCode && (
                            <span className="flex items-center gap-1">
                              <MapPin className="size-3" />
                              {c.zipCode}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      {c.vehicleMake && (
                        <span className="text-sm text-muted-foreground hidden sm:inline">
                          {[c.vehicleYear, c.vehicleMake, c.vehicleModel]
                            .filter(Boolean)
                            .join(" ")}
                        </span>
                      )}
                      {c.totalBookings ? (
                        <Badge variant="secondary">
                          {c.totalBookings}{" "}
                          {c.totalBookings === 1 ? "booking" : "bookings"}
                        </Badge>
                      ) : null}
                      {c.totalSpent ? (
                        <span className="text-sm font-medium text-green-600">
                          {formatPrice(c.totalSpent)}
                        </span>
                      ) : null}
                      <Badge className={sourceColors[c.source] || ""}>
                        {c.source}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
