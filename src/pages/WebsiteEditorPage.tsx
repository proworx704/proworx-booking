import { useQuery, useMutation } from "convex/react";
import {
  Save,
  Phone,
  Mail,
  MapPin,
  Clock,
  Link2,
  Globe,
  Instagram,
  Facebook,
  FileText,
  Loader2,
  ShieldCheck,
  Plus,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type Tab = "contact" | "hours" | "links" | "memberships" | "content";

function TabNav({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "contact", label: "Contact Info", icon: <Phone className="h-4 w-4" /> },
    { id: "hours", label: "Business Hours", icon: <Clock className="h-4 w-4" /> },
    { id: "links", label: "Links & Social", icon: <Link2 className="h-4 w-4" /> },
    { id: "memberships", label: "Memberships", icon: <ShieldCheck className="h-4 w-4" /> },
    { id: "content", label: "Site Content", icon: <FileText className="h-4 w-4" /> },
  ];
  return (
    <div className="flex gap-1 overflow-x-auto pb-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
            active === t.id
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          {t.icon}
          {t.label}
        </button>
      ))}
    </div>
  );
}

function EditableField({
  label,
  configKey,
  config,
  onChange,
  icon,
  placeholder,
  type = "text",
}: {
  label: string;
  configKey: string;
  config: Record<string, string>;
  onChange: (key: string, value: string) => void;
  icon?: React.ReactNode;
  placeholder?: string;
  type?: "text" | "url" | "email" | "tel";
}) {
  return (
    <div>
      <Label className="text-sm flex items-center gap-2 mb-1.5">
        {icon}
        {label}
      </Label>
      <Input
        type={type}
        value={config[configKey] ?? ""}
        onChange={(e) => onChange(configKey, e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

/* ────── Membership editor types ────── */
interface MembershipEdit {
  _id: Id<"serviceCatalog">;
  name: string;
  slug: string;
  description: string;
  features: string[];
  subscriptionUrl: string;
  price: number; // cents — first variant price
}

const TIER_GRADIENTS: Record<string, string> = {
  "membership-clean": "from-slate-500 to-slate-400",
  "membership-shield": "from-blue-600 to-cyan-500",
  "membership-armor": "from-amber-500 to-orange-500",
};

const DEFAULT_FEATURES: Record<string, string[]> = {
  "membership-clean": [
    "Monthly exterior hand wash",
    "Tire & wheel clean",
    "Exterior window cleaning",
    "Door jamb wipe-down",
    "Tire shine & dressing",
  ],
  "membership-shield": [
    "Monthly interior detail",
    "Full vacuum & wipe-down",
    "Dashboard & console detail",
    "Leather / vinyl conditioning",
    "Interior windows",
    "Air freshener",
  ],
  "membership-armor": [
    "Full inside & out detail",
    "Everything in Exterior + Interior",
    "Ceramic wet-coat protection",
    "Paint sealant refresh",
    "Tire shine & trim dressing",
    "Priority scheduling",
  ],
};

function MembershipCard({
  mem,
  onChange,
}: {
  mem: MembershipEdit;
  onChange: (updated: MembershipEdit) => void;
}) {
  const gradient = TIER_GRADIENTS[mem.slug] ?? "from-gray-500 to-gray-400";
  const price = mem.price / 100;

  const updateFeature = (idx: number, value: string) => {
    const next = [...mem.features];
    next[idx] = value;
    onChange({ ...mem, features: next });
  };

  const addFeature = () => {
    onChange({ ...mem, features: [...mem.features, ""] });
  };

  const removeFeature = (idx: number) => {
    onChange({ ...mem, features: mem.features.filter((_, i) => i !== idx) });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div
            className={`size-10 rounded-xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center shrink-0`}
          >
            <ShieldCheck className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg">{mem.name}</CardTitle>
            <CardDescription>
              ${price.toFixed(0)}/month &middot; {mem.slug}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Description */}
        <div>
          <Label className="text-sm mb-1.5">Description</Label>
          <Textarea
            value={mem.description}
            onChange={(e) => onChange({ ...mem, description: e.target.value })}
            rows={2}
            placeholder="Short description shown on membership page..."
          />
        </div>

        {/* Subscription URL */}
        <div>
          <Label className="text-sm flex items-center gap-2 mb-1.5">
            <ExternalLink className="h-3.5 w-3.5" />
            Subscription Link
          </Label>
          <Input
            type="url"
            value={mem.subscriptionUrl}
            onChange={(e) => onChange({ ...mem, subscriptionUrl: e.target.value })}
            placeholder="https://square.link/u/... (paste Square subscription link)"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Paste the Square subscription link here. The membership button will link to this instead of showing "Call to Join".
          </p>
        </div>

        {/* Features */}
        <div>
          <Label className="text-sm mb-1.5">Feature Bullets</Label>
          <div className="space-y-2">
            {mem.features.map((feat, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-5 text-right shrink-0">
                  {idx + 1}.
                </span>
                <Input
                  value={feat}
                  onChange={(e) => updateFeature(idx, e.target.value)}
                  placeholder="Feature description..."
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => removeFeature(idx)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={addFeature}
          >
            <Plus className="size-3.5 mr-1" /> Add Feature
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ────── Site Defaults ────── */
const SITE_DEFAULTS: Record<string, string> = {
  businessName: "ProWorx Mobile Detailing",
  phone: "(704) 995-3299",
  email: "detailing@proworxdetailing.com",
  address: "Charlotte, NC",
  serviceArea: "Charlotte Metro Area, NC",
};

export function WebsiteEditorPage() {
  const rawConfig = useQuery(api.siteConfig.getAll);
  const setMany = useMutation(api.siteConfig.setMany);

  // Catalog data for memberships
  const catalog = useQuery(api.catalog.listAll);
  const updateCatalog = useMutation(api.catalog.update);

  const [config, setConfig] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>("contact");
  const [loaded, setLoaded] = useState(false);

  // Membership edits (separate from siteConfig)
  const [membershipEdits, setMembershipEdits] = useState<MembershipEdit[]>([]);
  const [membershipLoaded, setMembershipLoaded] = useState(false);

  useEffect(() => {
    if (rawConfig && !loaded) {
      setConfig({ ...SITE_DEFAULTS, ...rawConfig });
      setLoaded(true);
    }
  }, [rawConfig, loaded]);

  // Load membership data from catalog
  useEffect(() => {
    if (catalog && !membershipLoaded) {
      const memberships = catalog
        .filter((c) => c.category === "membership")
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((item) => ({
          _id: item._id,
          name: item.name,
          slug: item.slug,
          description: item.description,
          features: item.features ?? DEFAULT_FEATURES[item.slug] ?? [],
          subscriptionUrl: item.subscriptionUrl ?? "",
          price: item.variants[0]?.price ?? 0,
        }));
      setMembershipEdits(memberships);
      setMembershipLoaded(true);
    }
  }, [catalog, membershipLoaded]);

  const updateField = useCallback((key: string, value: string) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }, []);

  const updateMembership = useCallback((idx: number, updated: MembershipEdit) => {
    setMembershipEdits((prev) => {
      const next = [...prev];
      next[idx] = updated;
      return next;
    });
    setDirty(true);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save site config
      const entries = Object.entries(config).map(([key, value]) => ({
        key,
        value,
      }));
      await setMany({ entries });

      // Save membership changes
      for (const mem of membershipEdits) {
        await updateCatalog({
          id: mem._id,
          description: mem.description,
          features: mem.features.filter((f) => f.trim() !== ""),
          subscriptionUrl: mem.subscriptionUrl || undefined,
        });
      }

      setDirty(false);
      toast.success("All changes saved!");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (rawConfig === undefined || catalog === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Website Editor</h1>
          <p className="text-muted-foreground">
            Manage your website content, contact info, and links
          </p>
        </div>
        <div className="flex items-center gap-3">
          {dirty && (
            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
              Unsaved changes
            </Badge>
          )}
          <Button onClick={handleSave} disabled={!dirty || saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save All
          </Button>
        </div>
      </div>

      <TabNav active={tab} onChange={setTab} />

      {tab === "contact" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Business Contact</CardTitle>
              <CardDescription>Main contact details displayed on your website.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <EditableField
                label="Business Name"
                configKey="businessName"
                config={config}
                onChange={updateField}
                icon={<Globe className="h-3.5 w-3.5" />}
                placeholder="ProWorx Mobile Detailing"
              />
              <EditableField
                label="Phone"
                configKey="phone"
                config={config}
                onChange={updateField}
                icon={<Phone className="h-3.5 w-3.5" />}
                placeholder="(704) 995-3299"
                type="tel"
              />
              <EditableField
                label="Email"
                configKey="email"
                config={config}
                onChange={updateField}
                icon={<Mail className="h-3.5 w-3.5" />}
                placeholder="detailing@proworxdetailing.com"
                type="email"
              />
              <EditableField
                label="Address"
                configKey="address"
                config={config}
                onChange={updateField}
                icon={<MapPin className="h-3.5 w-3.5" />}
                placeholder="Charlotte, NC"
              />
              <EditableField
                label="Service Area"
                configKey="serviceArea"
                config={config}
                onChange={updateField}
                placeholder="Charlotte Metro Area, NC"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "hours" && (
        <Card>
          <CardHeader>
            <CardTitle>Business Hours</CardTitle>
            <CardDescription>
              Set your operating hours. Leave blank to mark a day as closed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(
              (day) => (
                <div key={day} className="flex items-center gap-4">
                  <span className="text-sm font-medium w-24">{day}</span>
                  <Input
                    value={config[`hours_${day.toLowerCase()}`] ?? ""}
                    onChange={(e) => updateField(`hours_${day.toLowerCase()}`, e.target.value)}
                    placeholder="8:00 AM – 6:00 PM"
                    className="max-w-xs"
                  />
                </div>
              ),
            )}
          </CardContent>
        </Card>
      )}

      {tab === "links" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Booking & Payment Links</CardTitle>
              <CardDescription>Square booking and deposit links used on your site.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <EditableField
                label="Main Booking Link"
                configKey="bookingLink"
                config={config}
                onChange={updateField}
                icon={<Link2 className="h-3.5 w-3.5" />}
                placeholder="https://square.site/book/..."
                type="url"
              />
              <EditableField
                label="Ceramic Coating Deposit — Coupe/Sedan"
                configKey="ceramicDepositSedan"
                config={config}
                onChange={updateField}
                placeholder="https://square.link/..."
                type="url"
              />
              <EditableField
                label="Ceramic Coating Deposit — SUV/Truck"
                configKey="ceramicDepositSuv"
                config={config}
                onChange={updateField}
                placeholder="https://square.link/..."
                type="url"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Social Media</CardTitle>
              <CardDescription>Social profile links shown on your website.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <EditableField
                label="Instagram"
                configKey="instagram"
                config={config}
                onChange={updateField}
                icon={<Instagram className="h-3.5 w-3.5" />}
                placeholder="https://instagram.com/proworxdetailing"
                type="url"
              />
              <EditableField
                label="Facebook"
                configKey="facebook"
                config={config}
                onChange={updateField}
                icon={<Facebook className="h-3.5 w-3.5" />}
                placeholder="https://facebook.com/proworxdetailing"
                type="url"
              />
              <EditableField
                label="Google Business"
                configKey="google"
                config={config}
                onChange={updateField}
                icon={<Globe className="h-3.5 w-3.5" />}
                placeholder="https://g.page/proworxdetailing"
                type="url"
              />
              <EditableField
                label="Yelp"
                configKey="yelp"
                config={config}
                onChange={updateField}
                placeholder="https://yelp.com/biz/proworx-detailing"
                type="url"
              />
              <EditableField
                label="TikTok"
                configKey="tiktok"
                config={config}
                onChange={updateField}
                placeholder="https://tiktok.com/@proworxdetailing"
                type="url"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "memberships" && (
        <div className="space-y-6">
          <Card className="bg-blue-50/50 dark:bg-blue-950/10 border-blue-200/50">
            <CardContent className="pt-4 pb-3">
              <p className="text-sm text-muted-foreground">
                Edit your membership tiers below. Add subscription links to replace the "Call to Join"
                button with a direct sign-up link. Changes to features and descriptions are shown on
                the public <a href="/memberships" className="text-primary underline">Memberships page</a>.
              </p>
            </CardContent>
          </Card>

          {membershipEdits.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <ShieldCheck className="h-8 w-8 mx-auto mb-3 opacity-50" />
                <p>No membership tiers found in your service catalog.</p>
                <p className="text-sm mt-1">
                  Add membership items in{" "}
                  <a href="/catalog" className="text-primary underline">
                    Service Catalog
                  </a>{" "}
                  first.
                </p>
              </CardContent>
            </Card>
          ) : (
            membershipEdits.map((mem, idx) => (
              <MembershipCard
                key={mem._id}
                mem={mem}
                onChange={(updated) => updateMembership(idx, updated)}
              />
            ))
          )}
        </div>
      )}

      {tab === "content" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Homepage Content</CardTitle>
              <CardDescription>Key text content shown on your landing page.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="mb-1.5">Hero Tagline</Label>
                <Input
                  value={config.heroTagline ?? ""}
                  onChange={(e) => updateField("heroTagline", e.target.value)}
                  placeholder="Charlotte's Premier Mobile Detailing"
                />
              </div>
              <div>
                <Label className="mb-1.5">Hero Subtitle</Label>
                <Textarea
                  value={config.heroSubtitle ?? ""}
                  onChange={(e) => updateField("heroSubtitle", e.target.value)}
                  placeholder="Professional auto detailing that comes to you..."
                  rows={3}
                />
              </div>
              <div>
                <Label className="mb-1.5">About Section</Label>
                <Textarea
                  value={config.aboutText ?? ""}
                  onChange={(e) => updateField("aboutText", e.target.value)}
                  placeholder="About ProWorx Mobile Detailing..."
                  rows={5}
                />
              </div>
              <div>
                <Label className="mb-1.5">Footer Text</Label>
                <Input
                  value={config.footerText ?? ""}
                  onChange={(e) => updateField("footerText", e.target.value)}
                  placeholder="© 2026 ProWorx Mobile Detailing. All rights reserved."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SEO & Meta</CardTitle>
              <CardDescription>Search engine optimization settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="mb-1.5">Page Title</Label>
                <Input
                  value={config.seoTitle ?? ""}
                  onChange={(e) => updateField("seoTitle", e.target.value)}
                  placeholder="ProWorx Mobile Detailing | Charlotte, NC"
                />
              </div>
              <div>
                <Label className="mb-1.5">Meta Description</Label>
                <Textarea
                  value={config.seoDescription ?? ""}
                  onChange={(e) => updateField("seoDescription", e.target.value)}
                  placeholder="Professional mobile auto detailing in Charlotte, NC..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
