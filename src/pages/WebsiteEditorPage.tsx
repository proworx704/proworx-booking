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
  Loader2,
  ShieldCheck,
  Plus,
  Trash2,
  ExternalLink,
  Image as ImageIcon,
  Upload,
  X,
  ChevronRight,
  Home,
  Car,
  Anchor,
  Shield,
  Truck,
  MapPinned,
  Paintbrush,
  Settings2,
  Eye,
  FileText,
  Check,

} from "lucide-react";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════════════════ */
/* PAGE DEFINITIONS — Each page's editable content fields + image slots       */
/* ═══════════════════════════════════════════════════════════════════════════ */

interface TextField {
  key: string;
  label: string;
  default: string;
  type: "text" | "textarea";
  group?: string;
}

interface ImageSlot {
  slot: string;
  label: string;
  fallback: string;
  aspect?: string; // "video" | "square" | "wide"
  group?: string;
}

interface PageDef {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  liveUrl?: string;
  textFields: TextField[];
  imageSlots: ImageSlot[];
}

const PAGES: PageDef[] = [
  {
    id: "home",
    title: "Home Page",
    icon: <Home className="size-4" />,
    description: "Main landing page — hero section, service cards, features, and CTA",
    liveUrl: "https://proworxdetailing.com",
    textFields: [
      { key: "hero_badge", label: "Hero Badge", default: "5-Star Rated · Charlotte, NC", type: "text", group: "Hero Section" },
      { key: "hero_title", label: "Hero Title", default: "Premium Mobile\nAuto Detailing", type: "textarea", group: "Hero Section" },
      { key: "hero_subtitle", label: "Hero Subtitle", default: "We come to you. Top-of-the-line products, eco-friendly approach, and 12+ years of experience. Book your detail today.", type: "textarea", group: "Hero Section" },
      { key: "cta_primary", label: "Primary Button Text", default: "Book Now", type: "text", group: "Hero Section" },
      { key: "cta_phone", label: "Phone Button Text", default: "Call (980) 272-1903", type: "text", group: "Hero Section" },
      { key: "why_title", label: "Why Choose Us — Title", default: "Why Choose ProWorx Mobile Detailing?", type: "text", group: "Features Section" },
      { key: "feature_1_title", label: "Feature 1 Title", default: "We Come to You", type: "text", group: "Features Section" },
      { key: "feature_1_desc", label: "Feature 1 Description", default: "Fully mobile and self-reliant. We bring our own water, power, and premium products to your location.", type: "textarea", group: "Features Section" },
      { key: "feature_2_title", label: "Feature 2 Title", default: "Eco-Friendly", type: "text", group: "Features Section" },
      { key: "feature_2_desc", label: "Feature 2 Description", default: "Top-of-the-line, environmentally friendly products that protect your car and the planet.", type: "textarea", group: "Features Section" },
      { key: "feature_3_title", label: "Feature 3 Title", default: "12+ Years Experience", type: "text", group: "Features Section" },
      { key: "feature_3_desc", label: "Feature 3 Description", default: "From express washes to ceramic coatings, our precision detailing delivers showroom results every time.", type: "textarea", group: "Features Section" },
      { key: "footer_cta", label: "Footer CTA Title", default: "Ready to Get Started?", type: "text", group: "Footer CTA" },
      { key: "footer_cta_desc", label: "Footer CTA Description", default: "Pick your service, choose a time that works, and we'll handle the rest. Quick online booking — no phone calls needed.", type: "textarea", group: "Footer CTA" },
    ],
    imageSlots: [
      { slot: "homepage-hero", label: "Hero Background", fallback: "/images/escalade-front.jpg", aspect: "wide", group: "Hero Section" },
      { slot: "card-full-detail", label: "Full Detail Card", fallback: "/images/ferrari-van.jpg", group: "Service Cards" },
      { slot: "card-paint", label: "Paint Correction Card", fallback: "/images/corvette-rear.jpg", group: "Service Cards" },
      { slot: "card-ceramic", label: "Ceramic Coating Card", fallback: "/images/escalade-rear.jpg", group: "Service Cards" },
      { slot: "card-exterior", label: "Maintenance Plans Card", fallback: "/images/rangerover-front.jpg", group: "Service Cards" },
      { slot: "card-fleet", label: "Fleet Detailing Card", fallback: "/images/fleet-real.jpg", group: "Service Cards" },
      { slot: "card-boat", label: "Boat Detailing Card", fallback: "/images/boat-exterior.webp", group: "Service Cards" },
    ],
  },
  {
    id: "services",
    title: "Services",
    icon: <Car className="size-4" />,
    description: "Full detail packages, pricing, and add-on services",
    liveUrl: "https://proworxdetailing.com/services",
    textFields: [
      { key: "services_title", label: "Page Title", default: "Our Services", type: "text" },
      { key: "services_subtitle", label: "Page Subtitle", default: "Professional mobile detailing services tailored to your vehicle.", type: "textarea" },
    ],
    imageSlots: [
      { slot: "services-hero", label: "Services Hero Image", fallback: "/images/corvette-side.webp", aspect: "wide" },
    ],
  },
  {
    id: "boat-detailing",
    title: "Boat Detailing",
    icon: <Anchor className="size-4" />,
    description: "Marine detailing services and ceramic coating for boats",
    liveUrl: "https://proworxdetailing.com/boat-detailing",
    textFields: [
      { key: "boat_title", label: "Page Title", default: "Marine Detailing & Ceramic Coating", type: "text", group: "Hero" },
      { key: "boat_subtitle", label: "Subtitle", default: "Professional mobile detailing and ceramic protection for boats of all sizes. Lake Norman & Charlotte area.", type: "textarea", group: "Hero" },
      { key: "boat_why_title", label: "Why Section Title", default: "Why Choose ProWorx for Your Boat?", type: "text", group: "Why Section" },
    ],
    imageSlots: [
      { slot: "boat-hero", label: "Boat Hero Image", fallback: "/images/boat-hero.webp", aspect: "wide", group: "Hero" },
      { slot: "boat-exterior", label: "Boat Exterior", fallback: "/images/boat-exterior.webp", group: "Gallery" },
      { slot: "boat-interior", label: "Boat Interior", fallback: "/images/boat-interior.webp", group: "Gallery" },
      { slot: "boat-wash", label: "Boat Wash", fallback: "/images/boat-wash.webp", group: "Gallery" },
    ],
  },
  {
    id: "ceramic-coating",
    title: "Ceramic Coating",
    icon: <Shield className="size-4" />,
    description: "Ceramic coating packages, pricing tiers, and deposit links",
    liveUrl: "https://proworxdetailing.com/ceramic-coating",
    textFields: [
      { key: "ceramic_title", label: "Page Title", default: "Professional Ceramic Coating", type: "text" },
      { key: "ceramic_subtitle", label: "Subtitle", default: "Gyeon & IGL certified ceramic coating installation. Years of lasting protection.", type: "textarea" },
    ],
    imageSlots: [
      { slot: "ceramic-hero", label: "Ceramic Hero Image", fallback: "/images/escalade-rear.jpg", aspect: "wide" },
    ],
  },
  {
    id: "paint-correction",
    title: "Paint Correction",
    icon: <Paintbrush className="size-4" />,
    description: "Paint correction and polishing services",
    liveUrl: "https://proworxdetailing.com/paint-correction",
    textFields: [
      { key: "paint_title", label: "Page Title", default: "Paint Correction", type: "text" },
      { key: "paint_subtitle", label: "Subtitle", default: "Remove swirl marks, scratches, and oxidation. Restore your vehicle's finish.", type: "textarea" },
    ],
    imageSlots: [
      { slot: "paint-hero", label: "Paint Correction Hero", fallback: "/images/corvette-rear.jpg", aspect: "wide" },
    ],
  },
  {
    id: "memberships",
    title: "Memberships",
    icon: <ShieldCheck className="size-4" />,
    description: "Maintenance membership plans and subscription details",
    liveUrl: "https://proworxdetailing.com/services#memberships",
    textFields: [
      { key: "mem_title", label: "Page Title", default: "Maintenance Memberships", type: "text", group: "Header" },
      { key: "mem_subtitle", label: "Subtitle", default: "Keep your vehicle looking showroom-fresh year-round with scheduled monthly maintenance detailing.", type: "textarea", group: "Header" },
      { key: "mem_step_1", label: "Step 1", default: "Book any full detailing service with us first. This is required before joining a membership.", type: "textarea", group: "How It Works" },
      { key: "mem_step_2", label: "Step 2", default: "Enroll in your chosen membership tier within the same month as your initial detail.", type: "textarea", group: "How It Works" },
      { key: "mem_step_3", label: "Step 3", default: "Your recurring maintenance service begins the following month. We'll schedule your preferred day each month.", type: "textarea", group: "How It Works" },
      { key: "mem_details_title", label: "Details Section Title", default: "Important Membership Details", type: "text", group: "Details" },
      { key: "mem_details_content", label: "Details Content", default: "An initial full detail is required before joining any membership.\nYou must sign up within 30 days of your initial detail.\nMonthly service begins the following month.\nMemberships billed monthly through Square. Cancel anytime with 7 days' notice.", type: "textarea", group: "Details" },
    ],
    imageSlots: [],
  },
  {
    id: "fleet",
    title: "Fleet Detailing",
    icon: <Truck className="size-4" />,
    description: "Commercial fleet services, volume pricing, and business solutions",
    liveUrl: "https://proworxdetailing.com/fleet",
    textFields: [
      { key: "fleet_title", label: "Page Title", default: "Fleet Detailing Services", type: "text" },
      { key: "fleet_subtitle", label: "Subtitle", default: "Professional fleet detailing with volume pricing for businesses of all sizes.", type: "textarea" },
    ],
    imageSlots: [
      { slot: "fleet-hero", label: "Fleet Hero Image", fallback: "/images/fleet-real.jpg", aspect: "wide" },
    ],
  },
  {
    id: "areas",
    title: "Service Areas",
    icon: <MapPinned className="size-4" />,
    description: "Geographic service area coverage and zip codes",
    liveUrl: "https://proworxdetailing.com/areas",
    textFields: [
      { key: "areas_title", label: "Page Title", default: "Service Areas", type: "text" },
      { key: "areas_subtitle", label: "Subtitle", default: "We serve the greater Charlotte metro area and surrounding communities.", type: "textarea" },
    ],
    imageSlots: [],
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/* IMAGE SLOT COMPONENT                                                       */
/* ═══════════════════════════════════════════════════════════════════════════ */

function ImageSlotEditor({
  slot,
  label,
  fallback,
  aspect = "video",
  photos,
  onUpload,
  uploading,
}: {
  slot: string;
  label: string;
  fallback: string;
  aspect?: string;
  photos: Array<{ _id: Id<"sitePhotos">; url: string; section: string; filename: string }> | undefined;
  onUpload: (slot: string, file: File) => Promise<void>;
  uploading: string | null;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const matchingPhoto = photos?.find((p) => p.section === slot);
  const imageUrl = matchingPhoto?.url || fallback;
  const isUploading = uploading === slot;
  const aspectClass = aspect === "wide" ? "aspect-[21/9]" : aspect === "square" ? "aspect-square" : "aspect-video";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium flex items-center gap-2">
          <ImageIcon className="size-3.5 text-muted-foreground" />
          {label}
        </Label>
        {matchingPhoto && (
          <Badge variant="outline" className="text-[10px] text-green-600 border-green-200 bg-green-50">
            Custom
          </Badge>
        )}
      </div>
      <div
        className={cn(
          "relative group rounded-lg overflow-hidden border bg-muted cursor-pointer",
          aspectClass,
        )}
        onClick={() => fileRef.current?.click()}
      >
        <img
          src={imageUrl}
          alt={label}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://placehold.co/600x300/1a1a2e/white?text=${encodeURIComponent(label)}`;
          }}
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
          {isUploading ? (
            <div className="bg-white/90 backdrop-blur rounded-lg px-4 py-2 flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              <span className="text-sm font-medium">Uploading...</span>
            </div>
          ) : (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center gap-1">
              <div className="bg-white/90 backdrop-blur rounded-lg px-4 py-2 flex items-center gap-2">
                <Upload className="size-4" />
                <span className="text-sm font-medium">Change Image</span>
              </div>
              <span className="text-white/80 text-[10px]">{slot}</span>
            </div>
          )}
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) await onUpload(slot, file);
          if (fileRef.current) fileRef.current.value = "";
        }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* MEMBERSHIP EDITOR                                                          */
/* ═══════════════════════════════════════════════════════════════════════════ */

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
  "membership-exterior-only": "from-slate-500 to-slate-400",
  "membership-interior-only": "from-blue-600 to-cyan-500",
  "membership-full-inside-out": "from-amber-500 to-orange-500",
};

const DEFAULT_FEATURES: Record<string, string[]> = {
  "membership-exterior-only": ["Monthly exterior hand wash", "Tire & wheel clean", "Exterior window cleaning", "Door jamb wipe-down", "Tire shine & dressing"],
  "membership-interior-only": ["Monthly interior detail", "Full vacuum & wipe-down", "Dashboard & console detail", "Leather / vinyl conditioning", "Interior windows", "Air freshener"],
  "membership-full-inside-out": ["Full inside & out detail", "Everything in Exterior + Interior", "Ceramic wet-coat protection", "Paint sealant refresh", "Tire shine & trim dressing", "Priority scheduling"],
};

function MembershipEditor({ mem, onChange }: { mem: MembershipEdit; onChange: (m: MembershipEdit) => void }) {
  const gradient = TIER_GRADIENTS[mem.slug] ?? "from-gray-500 to-gray-400";
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className={`size-9 rounded-lg bg-gradient-to-br ${gradient} text-white flex items-center justify-center shrink-0`}>
            <ShieldCheck className="size-4" />
          </div>
          <div>
            <CardTitle className="text-base">{mem.name}</CardTitle>
            <CardDescription>${(mem.price / 100).toFixed(0)}/month</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-sm mb-1.5">Description</Label>
          <Textarea value={mem.description} onChange={(e) => onChange({ ...mem, description: e.target.value })} rows={2} placeholder="Short description..." />
        </div>
        <div>
          <Label className="text-sm flex items-center gap-2 mb-1.5">
            <ExternalLink className="h-3.5 w-3.5" />
            Subscription Link
          </Label>
          <Input type="url" value={mem.subscriptionUrl} onChange={(e) => onChange({ ...mem, subscriptionUrl: e.target.value })} placeholder="https://square.link/u/..." />
        </div>
        <div>
          <Label className="text-sm mb-1.5">Feature Bullets</Label>
          <div className="space-y-2">
            {mem.features.map((feat, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{idx + 1}.</span>
                <Input value={feat} onChange={(e) => { const next = [...mem.features]; next[idx] = e.target.value; onChange({ ...mem, features: next }); }} className="flex-1" />
                <Button type="button" variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive shrink-0" onClick={() => onChange({ ...mem, features: mem.features.filter((_, i) => i !== idx) })}>
                  <Trash2 className="size-3" />
                </Button>
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => onChange({ ...mem, features: [...mem.features, ""] })}>
            <Plus className="size-3 mr-1" /> Add Feature
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* GLOBAL SETTINGS                                                            */
/* ═══════════════════════════════════════════════════════════════════════════ */

type GlobalTab = "contact" | "hours" | "links" | "seo";

function GlobalSettings({
  config,
  updateField,
}: {
  config: Record<string, string>;
  updateField: (key: string, value: string) => void;
}) {
  const [tab, setTab] = useState<GlobalTab>("contact");

  const tabs: { id: GlobalTab; label: string; icon: React.ReactNode }[] = [
    { id: "contact", label: "Contact", icon: <Phone className="size-3.5" /> },
    { id: "hours", label: "Hours", icon: <Clock className="size-3.5" /> },
    { id: "links", label: "Links & Social", icon: <Link2 className="size-3.5" /> },
    { id: "seo", label: "SEO", icon: <FileText className="size-3.5" /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-1 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              tab === t.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === "contact" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Business Contact Info</CardTitle>
            <CardDescription>Displayed in the header, footer, and contact page.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Business Name" configKey="businessName" icon={<Globe className="size-3.5" />} config={config} onChange={updateField} placeholder="ProWorx Mobile Detailing" />
            <Field label="Phone" configKey="phone" icon={<Phone className="size-3.5" />} config={config} onChange={updateField} placeholder="(704) 995-3299" type="tel" />
            <Field label="Email" configKey="email" icon={<Mail className="size-3.5" />} config={config} onChange={updateField} placeholder="detailing@proworxdetailing.com" type="email" />
            <Field label="Address" configKey="address" icon={<MapPin className="size-3.5" />} config={config} onChange={updateField} placeholder="Charlotte, NC" />
            <Field label="Service Area" configKey="serviceArea" config={config} onChange={updateField} placeholder="Charlotte Metro Area, NC" />
          </CardContent>
        </Card>
      )}

      {tab === "hours" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Business Hours</CardTitle>
            <CardDescription>Shown on your website and Google Business.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
              <div key={day} className="flex items-center gap-4">
                <span className="text-sm font-medium w-24">{day}</span>
                <Input
                  value={config[`hours_${day.toLowerCase()}`] ?? ""}
                  onChange={(e) => updateField(`hours_${day.toLowerCase()}`, e.target.value)}
                  placeholder="8:00 AM – 6:00 PM"
                  className="max-w-xs"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {tab === "links" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Booking & Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Main Booking Link" configKey="bookingLink" icon={<Link2 className="size-3.5" />} config={config} onChange={updateField} placeholder="https://square.site/book/..." type="url" />
              <Field label="Ceramic Deposit — Sedan" configKey="ceramicDepositSedan" config={config} onChange={updateField} placeholder="https://square.link/..." type="url" />
              <Field label="Ceramic Deposit — SUV/Truck" configKey="ceramicDepositSuv" config={config} onChange={updateField} placeholder="https://square.link/..." type="url" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Social Media</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Instagram" configKey="instagram" icon={<Instagram className="size-3.5" />} config={config} onChange={updateField} placeholder="https://instagram.com/proworxdetailing" type="url" />
              <Field label="Facebook" configKey="facebook" icon={<Facebook className="size-3.5" />} config={config} onChange={updateField} placeholder="https://facebook.com/proworxdetailing" type="url" />
              <Field label="Google Business" configKey="google" icon={<Globe className="size-3.5" />} config={config} onChange={updateField} placeholder="https://g.page/proworxdetailing" type="url" />
              <Field label="TikTok" configKey="tiktok" config={config} onChange={updateField} placeholder="https://tiktok.com/@proworxdetailing" type="url" />
              <Field label="Yelp" configKey="yelp" config={config} onChange={updateField} placeholder="https://yelp.com/biz/proworx-detailing" type="url" />
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "seo" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">SEO & Meta</CardTitle>
            <CardDescription>Search engine optimization for Google.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="mb-1.5 text-sm">Page Title</Label>
              <Input value={config.seoTitle ?? ""} onChange={(e) => updateField("seoTitle", e.target.value)} placeholder="ProWorx Mobile Detailing | Charlotte, NC" />
            </div>
            <div>
              <Label className="mb-1.5 text-sm">Meta Description</Label>
              <Textarea value={config.seoDescription ?? ""} onChange={(e) => updateField("seoDescription", e.target.value)} placeholder="Professional mobile auto detailing..." rows={3} />
            </div>
            <div>
              <Label className="mb-1.5 text-sm">Footer Text</Label>
              <Input value={config.footerText ?? ""} onChange={(e) => updateField("footerText", e.target.value)} placeholder="© 2026 ProWorx Mobile Detailing. All rights reserved." />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* HELPER — Editable field                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

function Field({
  label, configKey, config, onChange, icon, placeholder, type = "text",
}: {
  label: string; configKey: string; config: Record<string, string>; onChange: (key: string, value: string) => void;
  icon?: React.ReactNode; placeholder?: string; type?: "text" | "url" | "email" | "tel";
}) {
  return (
    <div>
      <Label className="text-sm flex items-center gap-2 mb-1.5">{icon}{label}</Label>
      <Input type={type} value={config[configKey] ?? ""} onChange={(e) => onChange(configKey, e.target.value)} placeholder={placeholder} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* PAGE EDITOR — Text + Images for a single page                              */
/* ═══════════════════════════════════════════════════════════════════════════ */

function PageEditor({
  page,
  pageData,
  updateSection,
  photos,
  onImageUpload,
  uploadingSlot,
}: {
  page: PageDef;
  pageData: Record<string, string>;
  updateSection: (key: string, value: string) => void;
  photos: Array<{ _id: Id<"sitePhotos">; url: string; section: string; filename: string }> | undefined;
  onImageUpload: (slot: string, file: File) => Promise<void>;
  uploadingSlot: string | null;
}) {
  // Group fields by their group
  const textGroups = useMemo(() => {
    const groups: Record<string, TextField[]> = {};
    for (const f of page.textFields) {
      const g = f.group || "General";
      (groups[g] ??= []).push(f);
    }
    return groups;
  }, [page.textFields]);

  const imageGroups = useMemo(() => {
    const groups: Record<string, ImageSlot[]> = {};
    for (const s of page.imageSlots) {
      const g = s.group || "Images";
      (groups[g] ??= []).push(s);
    }
    return groups;
  }, [page.imageSlots]);

  // Merge all group names in order
  const allGroups = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const f of page.textFields) {
      const g = f.group || "General";
      if (!seen.has(g)) { seen.add(g); result.push(g); }
    }
    for (const s of page.imageSlots) {
      const g = s.group || "Images";
      if (!seen.has(g)) { seen.add(g); result.push(g); }
    }
    return result;
  }, [page.textFields, page.imageSlots]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            {page.icon}
            {page.title}
          </h2>
          <p className="text-sm text-muted-foreground">{page.description}</p>
        </div>
        {page.liveUrl && (
          <Button variant="outline" size="sm" asChild>
            <a href={page.liveUrl} target="_blank" rel="noopener noreferrer">
              <Eye className="size-3.5 mr-1.5" />
              View Live
            </a>
          </Button>
        )}
      </div>

      {/* Grouped sections */}
      {allGroups.map((groupName) => {
        const texts = textGroups[groupName] || [];
        const images = imageGroups[groupName] || [];
        if (texts.length === 0 && images.length === 0) return null;

        return (
          <Card key={groupName}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{groupName}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Images first for visual context */}
              {images.length > 0 && (
                <div className={cn("grid gap-4", images.length > 2 ? "grid-cols-2 lg:grid-cols-3" : images.length === 2 ? "grid-cols-2" : "grid-cols-1")}>
                  {images.map((img) => (
                    <ImageSlotEditor
                      key={img.slot}
                      slot={img.slot}
                      label={img.label}
                      fallback={img.fallback}
                      aspect={img.aspect}
                      photos={photos}
                      onUpload={onImageUpload}
                      uploading={uploadingSlot}
                    />
                  ))}
                </div>
              )}

              {/* Text fields */}
              {texts.map((field) => (
                <div key={field.key}>
                  <Label className="text-sm mb-1.5">{field.label}</Label>
                  {field.type === "textarea" ? (
                    <Textarea
                      value={pageData[field.key] ?? field.default}
                      onChange={(e) => updateSection(field.key, e.target.value)}
                      rows={3}
                      placeholder={field.default}
                    />
                  ) : (
                    <Input
                      value={pageData[field.key] ?? field.default}
                      onChange={(e) => updateSection(field.key, e.target.value)}
                      placeholder={field.default}
                    />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}

      {page.textFields.length === 0 && page.imageSlots.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="size-8 mx-auto mb-3 opacity-50" />
            <p>This page has no editable content fields yet.</p>
            <p className="text-sm mt-1">The page uses service catalog data which you can edit in the Service Catalog section.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* PHOTO LIBRARY PAGE                                                         */
/* ═══════════════════════════════════════════════════════════════════════════ */

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

function PhotoLibrary() {
  const photos = useQuery(api.sitePhotos.list);
  const generateUploadUrl = useMutation(api.sitePhotos.generateUploadUrl);
  const createPhoto = useMutation(api.sitePhotos.create);
  const removePhoto = useMutation(api.sitePhotos.remove);
  const updatePhoto = useMutation(api.sitePhotos.update);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSection, setUploadSection] = useState("gallery");
  const [filter, setFilter] = useState("all");

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const url = await generateUploadUrl();
        const result = await fetch(url, { method: "POST", headers: { "Content-Type": file.type }, body: file });
        const { storageId } = await result.json();
        await createPhoto({ storageId, filename: file.name, section: uploadSection });
      }
      toast.success(`Uploaded ${files.length} photo${files.length > 1 ? "s" : ""}`);
    } catch { toast.error("Upload failed"); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const filtered = photos?.filter((p) => filter === "all" || p.section === filter) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ImageIcon className="size-4" />
          Photo Library
        </h2>
        <p className="text-sm text-muted-foreground">All uploaded images. Assign to sections for use on your website.</p>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
            <div className="space-y-1.5 flex-1">
              <Label className="text-sm">Upload to section</Label>
              <Select value={uploadSection} onValueChange={setUploadSection}>
                <SelectTrigger className="w-full sm:w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PHOTO_SECTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />
              <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Upload className="mr-2 size-4" />}
                {uploading ? "Uploading..." : "Upload Photos"}
              </Button>
            </div>
          </div>
          <div
            className="mt-4 border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleUpload(e.dataTransfer.files); }}
          >
            <ImageIcon className="size-6 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Drag & drop photos here, or click to browse</p>
          </div>
        </CardContent>
      </Card>

      {/* Filter bar */}
      <div className="flex gap-1 flex-wrap">
        <button type="button" onClick={() => setFilter("all")}
          className={cn("px-3 py-1 rounded-full text-xs font-medium transition-colors",
            filter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}>
          All ({photos?.length ?? 0})
        </button>
        {PHOTO_SECTIONS.map((s) => {
          const count = photos?.filter((p) => p.section === s.value).length ?? 0;
          if (count === 0) return null;
          return (
            <button key={s.value} type="button" onClick={() => setFilter(s.value)}
              className={cn("px-3 py-1 rounded-full text-xs font-medium transition-colors",
                filter === s.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}>
              {s.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Photo grid */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ImageIcon className="size-8 mx-auto mb-3 opacity-50" />
            <p>No photos yet. Upload some above!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((photo) => (
            <Card key={photo._id} className="overflow-hidden group">
              <div className="relative aspect-video bg-muted">
                <img src={photo.url} alt={photo.alt || photo.filename} className="w-full h-full object-cover" />
                <button type="button" onClick={() => { if (confirm("Delete?")) removePhoto({ id: photo._id }).then(() => toast.success("Deleted")).catch(() => toast.error("Failed")); }}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600">
                  <X className="size-3.5" />
                </button>
              </div>
              <CardContent className="p-3 space-y-2">
                <p className="text-xs font-medium truncate" title={photo.filename}>{photo.filename}</p>
                <Select value={photo.section} onValueChange={(v) => updatePhoto({ id: photo._id, section: v }).then(() => toast.success("Updated")).catch(() => toast.error("Failed"))}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PHOTO_SECTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
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

/* ═══════════════════════════════════════════════════════════════════════════ */
/* MAIN COMPONENT                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

type NavItem = "page" | "memberships" | "photos" | "settings";

export function WebsiteEditorPage() {
  // Data
  const rawConfig = useQuery(api.siteConfig.getAll);
  const setMany = useMutation(api.siteConfig.setMany);
  const savedPages = useQuery(api.sitePages.list);
  const upsertPage = useMutation(api.sitePages.upsert);
  const photos = useQuery(api.sitePhotos.list);
  const generateUploadUrl = useMutation(api.sitePhotos.generateUploadUrl);
  const createPhoto = useMutation(api.sitePhotos.create);
  const catalog = useQuery(api.catalog.listAll);
  const updateCatalog = useMutation(api.catalog.update);

  // State
  const [navType, setNavType] = useState<NavItem>("page");
  const [selectedPage, setSelectedPage] = useState("home");
  const [config, setConfig] = useState<Record<string, string>>({});
  const [pageData, setPageData] = useState<Record<string, Record<string, string>>>({});
  const [membershipEdits, setMembershipEdits] = useState<MembershipEdit[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [pagesLoaded, setPagesLoaded] = useState(false);
  const [memLoaded, setMemLoaded] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Defaults
  const SITE_DEFAULTS: Record<string, string> = {
    businessName: "ProWorx Mobile Detailing",
    phone: "(704) 995-3299",
    email: "detailing@proworxdetailing.com",
    address: "Charlotte, NC",
    serviceArea: "Charlotte Metro Area, NC",
  };

  // Load config
  useEffect(() => {
    if (rawConfig && !loaded) {
      setConfig({ ...SITE_DEFAULTS, ...rawConfig });
      setLoaded(true);
    }
  }, [rawConfig, loaded]);

  // Load pages
  useEffect(() => {
    if (savedPages !== undefined && !pagesLoaded) {
      const data: Record<string, Record<string, string>> = {};
      for (const page of PAGES) {
        const saved = savedPages.find((s) => s.slug === page.id);
        const pageMap: Record<string, string> = {};
        for (const field of page.textFields) {
          const savedField = saved?.sections.find((s) => s.key === field.key);
          pageMap[field.key] = savedField?.content ?? field.default;
        }
        data[page.id] = pageMap;
      }
      setPageData(data);
      setPagesLoaded(true);
    }
  }, [savedPages, pagesLoaded]);

  // Load memberships
  useEffect(() => {
    if (catalog && !memLoaded) {
      const mems = catalog
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
      setMembershipEdits(mems);
      setMemLoaded(true);
    }
  }, [catalog, memLoaded]);

  const updateField = useCallback((key: string, value: string) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }, []);

  const updatePageSection = useCallback((pageId: string, key: string, value: string) => {
    setPageData((prev) => ({
      ...prev,
      [pageId]: { ...prev[pageId], [key]: value },
    }));
    setDirty(true);
  }, []);

  const handleImageUpload = useCallback(async (slot: string, file: File) => {
    setUploadingSlot(slot);
    try {
      const url = await generateUploadUrl();
      const result = await fetch(url, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      const { storageId } = await result.json();
      await createPhoto({ storageId, filename: file.name, section: slot });
      toast.success("Image uploaded!");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploadingSlot(null);
    }
  }, [generateUploadUrl, createPhoto]);

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      // Save config
      const entries = Object.entries(config).map(([key, value]) => ({ key, value }));
      await setMany({ entries });

      // Save pages
      for (const page of PAGES) {
        const data = pageData[page.id];
        if (!data) continue;
        const sections = page.textFields.map((f) => ({
          key: f.key,
          label: f.label,
          content: data[f.key] ?? f.default,
          type: f.type,
        }));
        await upsertPage({ slug: page.id, title: page.title, sections });
      }

      // Save memberships
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
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentPage = PAGES.find((p) => p.id === selectedPage);

  return (
    <div className="space-y-0">
      {/* Top bar */}
      <div className="flex items-center justify-between pb-4 border-b mb-4">
        <div className="flex items-center gap-3">
          {/* Mobile menu toggle */}
          <button
            type="button"
            className="lg:hidden p-2 rounded-lg hover:bg-muted"
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          >
            <ChevronRight className={cn("size-4 transition-transform", mobileSidebarOpen && "rotate-90")} />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Website Editor</h1>
            <p className="text-muted-foreground text-xs">
              Edit your website content, images, and settings
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-[10px]">
              Unsaved
            </Badge>
          )}
          <Button onClick={handleSaveAll} disabled={!dirty || saving} size="sm">
            {saving ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : dirty ? (
              <Save className="mr-1.5 size-3.5" />
            ) : (
              <Check className="mr-1.5 size-3.5" />
            )}
            {saving ? "Saving..." : dirty ? "Save All" : "Saved"}
          </Button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <aside className={cn(
          "shrink-0 space-y-1",
          "lg:block lg:w-48",
          mobileSidebarOpen ? "block w-48" : "hidden",
        )}>
          {/* Pages */}
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-2 pb-1">Pages</p>
          {PAGES.map((page) => (
            <button
              key={page.id}
              type="button"
              onClick={() => { setNavType("page"); setSelectedPage(page.id); setMobileSidebarOpen(false); }}
              className={cn(
                "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm transition-colors text-left",
                navType === "page" && selectedPage === page.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              {page.icon}
              <span className="truncate">{page.title}</span>
            </button>
          ))}

          <div className="pt-3 pb-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-2 pb-1">Manage</p>
          </div>
          <button
            type="button"
            onClick={() => { setNavType("memberships"); setMobileSidebarOpen(false); }}
            className={cn(
              "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm transition-colors text-left",
              navType === "memberships" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            <ShieldCheck className="size-4" />
            <span>Memberships</span>
          </button>
          <button
            type="button"
            onClick={() => { setNavType("photos"); setMobileSidebarOpen(false); }}
            className={cn(
              "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm transition-colors text-left",
              navType === "photos" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            <ImageIcon className="size-4" />
            <span>Photo Library</span>
          </button>
          <button
            type="button"
            onClick={() => { setNavType("settings"); setMobileSidebarOpen(false); }}
            className={cn(
              "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm transition-colors text-left",
              navType === "settings" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            <Settings2 className="size-4" />
            <span>Global Settings</span>
          </button>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {navType === "page" && currentPage && (
            <PageEditor
              page={currentPage}
              pageData={pageData[currentPage.id] ?? {}}
              updateSection={(key, value) => updatePageSection(currentPage.id, key, value)}
              photos={photos}
              onImageUpload={handleImageUpload}
              uploadingSlot={uploadingSlot}
            />
          )}

          {navType === "memberships" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <ShieldCheck className="size-4" />
                  Membership Plans
                </h2>
                <p className="text-sm text-muted-foreground">Edit descriptions, features, and subscription links for each tier.</p>
              </div>
              {membershipEdits.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <ShieldCheck className="size-8 mx-auto mb-3 opacity-50" />
                    <p>No membership tiers found.</p>
                  </CardContent>
                </Card>
              ) : (
                membershipEdits.map((mem, idx) => (
                  <MembershipEditor key={mem._id} mem={mem} onChange={(updated) => {
                    setMembershipEdits((prev) => { const next = [...prev]; next[idx] = updated; return next; });
                    setDirty(true);
                  }} />
                ))
              )}
            </div>
          )}

          {navType === "photos" && <PhotoLibrary />}

          {navType === "settings" && (
            <GlobalSettings config={config} updateField={updateField} />
          )}
        </main>
      </div>
    </div>
  );
}
