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
  Image as ImageIcon,
  Upload,
  BookOpen,
  X,
  GripVertical,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Tab = "contact" | "hours" | "links" | "memberships" | "photos" | "pages" | "content";

function TabNav({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "contact", label: "Contact Info", icon: <Phone className="h-4 w-4" /> },
    { id: "hours", label: "Hours", icon: <Clock className="h-4 w-4" /> },
    { id: "links", label: "Links & Social", icon: <Link2 className="h-4 w-4" /> },
    { id: "memberships", label: "Memberships", icon: <ShieldCheck className="h-4 w-4" /> },
    { id: "photos", label: "Photos", icon: <ImageIcon className="h-4 w-4" /> },
    { id: "pages", label: "Page Text", icon: <BookOpen className="h-4 w-4" /> },
    { id: "content", label: "SEO", icon: <FileText className="h-4 w-4" /> },
  ];
  return (
    <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
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

/* ────── Photo Section ────── */

const PHOTO_SECTIONS = [
  { value: "hero", label: "Homepage Hero" },
  { value: "gallery", label: "Photo Gallery" },
  { value: "services", label: "Services" },
  { value: "boats", label: "Boat Detailing" },
  { value: "ceramic", label: "Ceramic Coating" },
  { value: "memberships", label: "Memberships" },
  { value: "about", label: "About / Team" },
  { value: "before-after", label: "Before & After" },
] as const;

function PhotosTab() {
  const photos = useQuery(api.sitePhotos.list);
  const generateUploadUrl = useMutation(api.sitePhotos.generateUploadUrl);
  const createPhoto = useMutation(api.sitePhotos.create);
  const updatePhoto = useMutation(api.sitePhotos.update);
  const removePhoto = useMutation(api.sitePhotos.remove);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSection, setUploadSection] = useState("gallery");
  const [filterSection, setFilterSection] = useState("all");

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        // Get upload URL
        const url = await generateUploadUrl();
        // Upload file
        const result = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        const { storageId } = await result.json();
        // Create record
        await createPhoto({
          storageId,
          filename: file.name,
          section: uploadSection,
        });
      }
      toast.success(`Uploaded ${files.length} photo${files.length > 1 ? "s" : ""}`);
    } catch (e) {
      toast.error("Upload failed");
      console.error(e);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (id: Id<"sitePhotos">) => {
    if (!confirm("Delete this photo?")) return;
    try {
      await removePhoto({ id });
      toast.success("Photo deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleSectionChange = async (id: Id<"sitePhotos">, section: string) => {
    try {
      await updatePhoto({ id, section });
      toast.success("Section updated");
    } catch {
      toast.error("Failed to update");
    }
  };

  const filtered = photos?.filter(
    (p) => filterSection === "all" || p.section === filterSection,
  ) ?? [];

  // Group by section
  const grouped: Record<string, typeof filtered> = {};
  for (const p of filtered) {
    (grouped[p.section] ??= []).push(p);
  }

  return (
    <div className="space-y-6">
      {/* Upload area */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Upload Photos</CardTitle>
          <CardDescription>
            Upload images to use on your website. Assign them to sections to control where they appear.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
            <div className="space-y-1.5 flex-1">
              <Label className="text-sm">Section</Label>
              <Select value={uploadSection} onValueChange={setUploadSection}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PHOTO_SECTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleUpload(e.target.files)}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                {uploading ? "Uploading..." : "Choose Photos"}
              </Button>
            </div>
          </div>

          {/* Drop zone */}
          <div
            className="mt-4 border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleUpload(e.dataTransfer.files);
            }}
          >
            <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Drag & drop photos here, or click to browse
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Label className="text-sm text-muted-foreground">Filter:</Label>
        <div className="flex gap-1 flex-wrap">
          <button
            type="button"
            onClick={() => setFilterSection("all")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filterSection === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            All ({photos?.length ?? 0})
          </button>
          {PHOTO_SECTIONS.map((s) => {
            const count = photos?.filter((p) => p.section === s.value).length ?? 0;
            if (count === 0) return null;
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => setFilterSection(s.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filterSection === s.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {s.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Photo grid */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ImageIcon className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p>No photos uploaded yet.</p>
            <p className="text-sm mt-1">Upload photos above to start managing your site images.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((photo) => (
            <Card key={photo._id} className="overflow-hidden group">
              <div className="relative aspect-video bg-muted">
                <img
                  src={photo.url}
                  alt={photo.alt || photo.filename}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleDelete(photo._id)}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <CardContent className="p-3 space-y-2">
                <p className="text-xs font-medium truncate" title={photo.filename}>
                  {photo.filename}
                </p>
                <Select
                  value={photo.section}
                  onValueChange={(v) => handleSectionChange(photo._id, v)}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PHOTO_SECTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ────── Pages Tab ────── */

interface PageSection {
  key: string;
  label: string;
  content: string;
  type: "text" | "textarea" | "html";
}

interface PageData {
  _id?: Id<"sitePages">;
  slug: string;
  title: string;
  sections: PageSection[];
}

const DEFAULT_PAGES: PageData[] = [
  {
    slug: "home",
    title: "Home Page",
    sections: [
      { key: "hero_badge", label: "Hero Badge", content: "5-Star Rated · Charlotte, NC", type: "text" },
      { key: "hero_title", label: "Hero Title", content: "Premium Mobile\nAuto Detailing", type: "text" },
      { key: "hero_subtitle", label: "Hero Subtitle", content: "We come to you. Top-of-the-line products, eco-friendly approach, and 12+ years of experience. Book your detail today.", type: "textarea" },
      { key: "cta_primary", label: "Primary Button Text", content: "Book Now", type: "text" },
      { key: "cta_phone", label: "Phone Button", content: "Call (980) 272-1903", type: "text" },
      { key: "why_title", label: "Why Choose Us Title", content: "Why Choose ProWorx Mobile Detailing?", type: "text" },
      { key: "feature_1_title", label: "Feature 1 Title", content: "We Come to You", type: "text" },
      { key: "feature_1_desc", label: "Feature 1 Description", content: "Fully mobile and self-reliant. We bring our own water, power, and premium products to your location.", type: "textarea" },
      { key: "feature_2_title", label: "Feature 2 Title", content: "Eco-Friendly", type: "text" },
      { key: "feature_2_desc", label: "Feature 2 Description", content: "Top-of-the-line, environmentally friendly products that protect your car and the planet.", type: "textarea" },
      { key: "feature_3_title", label: "Feature 3 Title", content: "12+ Years Experience", type: "text" },
      { key: "feature_3_desc", label: "Feature 3 Description", content: "From express washes to ceramic coatings, our precision detailing delivers showroom results every time.", type: "textarea" },
      { key: "footer_cta", label: "Footer CTA Title", content: "Ready to Get Started?", type: "text" },
      { key: "footer_cta_desc", label: "Footer CTA Description", content: "Pick your service, choose a time that works, and we'll handle the rest. Quick online booking — no phone calls needed.", type: "textarea" },
    ],
  },
  {
    slug: "book",
    title: "Booking Page",
    sections: [
      { key: "page_title", label: "Page Title", content: "Book Your Detail", type: "text" },
      { key: "page_subtitle", label: "Subtitle", content: "Choose your service, pick a time, and we'll come to you.", type: "textarea" },
    ],
  },
  {
    slug: "boat-detailing",
    title: "Boat Detailing Page",
    sections: [
      { key: "page_title", label: "Page Title", content: "Marine Detailing & Ceramic Coating", type: "text" },
      { key: "page_subtitle", label: "Subtitle", content: "Professional mobile detailing and ceramic protection for boats of all sizes. Lake Norman & Charlotte area.", type: "textarea" },
      { key: "why_title", label: "Why Section Title", content: "Why Choose ProWorx for Your Boat?", type: "text" },
    ],
  },
  {
    slug: "memberships",
    title: "Memberships Page",
    sections: [
      { key: "page_title", label: "Page Title", content: "Maintenance Memberships", type: "text" },
      { key: "page_subtitle", label: "Subtitle", content: "Keep your vehicle looking showroom-fresh year-round with scheduled monthly maintenance detailing.", type: "textarea" },
      { key: "step_1", label: "Step 1 Text", content: "Book any full detailing service with us first. This is required before joining a membership.", type: "textarea" },
      { key: "step_2", label: "Step 2 Text", content: "Enroll in your chosen membership tier within the same month as your initial detail.", type: "textarea" },
      { key: "step_3", label: "Step 3 Text", content: "Your recurring maintenance service begins the following month. We'll schedule your preferred day each month.", type: "textarea" },
      { key: "details_title", label: "Details Title", content: "Important Membership Details", type: "text" },
      { key: "details_content", label: "Details Content", content: "An initial full detail is required before joining any membership.\nYou must sign up within 30 days of your initial detail.\nMonthly service begins the following month.\nMemberships billed monthly through Square. Cancel anytime with 7 days' notice.", type: "textarea" },
    ],
  },
];

function PagesTab() {
  const savedPages = useQuery(api.sitePages.list);
  const upsertPage = useMutation(api.sitePages.upsert);
  const [pages, setPages] = useState<PageData[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["home"]));
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (savedPages !== undefined && !loaded) {
      // Merge saved data with defaults
      const merged = DEFAULT_PAGES.map((def) => {
        const saved = savedPages.find((s) => s.slug === def.slug);
        if (saved) {
          // Merge: use saved sections where they exist, fill in missing with defaults
          const mergedSections = def.sections.map((defSec) => {
            const savedSec = saved.sections.find((s) => s.key === defSec.key);
            return savedSec ?? defSec;
          });
          return { ...def, _id: saved._id, sections: mergedSections };
        }
        return def;
      });
      setPages(merged);
      setLoaded(true);
    }
  }, [savedPages, loaded]);

  const updateSection = (pageSlug: string, sectionKey: string, content: string) => {
    setPages((prev) =>
      prev.map((p) =>
        p.slug === pageSlug
          ? {
              ...p,
              sections: p.sections.map((s) =>
                s.key === sectionKey ? { ...s, content } : s,
              ),
            }
          : p,
      ),
    );
    setDirty(true);
  };

  const toggleExpand = (slug: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const page of pages) {
        await upsertPage({
          slug: page.slug,
          title: page.title,
          sections: page.sections,
        });
      }
      setDirty(false);
      toast.success("All page content saved!");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Edit the text shown on each page of your website. Click a page to expand and edit.
        </p>
        <Button onClick={handleSave} disabled={!dirty || saving} size="sm">
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Pages
        </Button>
      </div>

      {pages.map((page) => {
        const isExpanded = expanded.has(page.slug);
        return (
          <Card key={page.slug}>
            <button
              type="button"
              className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors rounded-t-lg"
              onClick={() => toggleExpand(page.slug)}
            >
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <div>
                  <p className="font-semibold text-sm">{page.title}</p>
                  <p className="text-xs text-muted-foreground">/{page.slug === "home" ? "" : page.slug}</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs">
                {page.sections.length} fields
              </Badge>
            </button>
            {isExpanded && (
              <CardContent className="pt-0 pb-4 space-y-4 border-t">
                {page.sections.map((section) => (
                  <div key={section.key}>
                    <Label className="text-sm mb-1.5 text-muted-foreground">{section.label}</Label>
                    {section.type === "textarea" ? (
                      <Textarea
                        value={section.content}
                        onChange={(e) => updateSection(page.slug, section.key, e.target.value)}
                        rows={3}
                      />
                    ) : (
                      <Input
                        value={section.content}
                        onChange={(e) => updateSection(page.slug, section.key, e.target.value)}
                      />
                    )}
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        );
      })}
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
  price: number;
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
        <div>
          <Label className="text-sm mb-1.5">Description</Label>
          <Textarea
            value={mem.description}
            onChange={(e) => onChange({ ...mem, description: e.target.value })}
            rows={2}
            placeholder="Short description shown on membership page..."
          />
        </div>
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

/* ════════════════════════════════════════════════════════════════════════════ */
/* MAIN COMPONENT                                                             */
/* ════════════════════════════════════════════════════════════════════════════ */

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

  // Membership edits
  const [membershipEdits, setMembershipEdits] = useState<MembershipEdit[]>([]);
  const [membershipLoaded, setMembershipLoaded] = useState(false);

  useEffect(() => {
    if (rawConfig && !loaded) {
      setConfig({ ...SITE_DEFAULTS, ...rawConfig });
      setLoaded(true);
    }
  }, [rawConfig, loaded]);

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
      const entries = Object.entries(config).map(([key, value]) => ({ key, value }));
      await setMany({ entries });

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

  // Photos and Pages tabs manage their own saves
  const isAutoSaveTab = tab === "photos" || tab === "pages";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Website Editor</h1>
          <p className="text-muted-foreground text-sm">
            Manage your website content, contact info, photos, and links
          </p>
        </div>
        {!isAutoSaveTab && (
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
        )}
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

      {tab === "photos" && <PhotosTab />}

      {tab === "pages" && <PagesTab />}

      {tab === "content" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>SEO & Meta</CardTitle>
              <CardDescription>Search engine optimization settings for Google.</CardDescription>
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
        </div>
      )}
    </div>
  );
}
