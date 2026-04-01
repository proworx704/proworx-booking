import { useAction, useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
  Mail,
  MailPlus,
  Megaphone,
  Percent,
  Send,
  Tag,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// ═══════════════════════════════════════════════════════════════════════
// TYPES & CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

type TemplateType =
  | "coupon"
  | "announcement"
  | "seasonal"
  | "thank_you"
  | "newsletter"
  | "custom";

type AudienceType = "all" | "recent" | "inactive" | "high_value";

type Step = "list" | "template" | "design" | "audience" | "review" | "preview";

const TEMPLATE_OPTIONS: {
  value: TemplateType;
  label: string;
  desc: string;
  icon: string;
}[] = [
  {
    value: "coupon",
    label: "Offer a Coupon",
    desc: "Send a discount code to drive bookings",
    icon: "🏷️",
  },
  {
    value: "announcement",
    label: "New Service / Update",
    desc: "Announce a new package or business update",
    icon: "📢",
  },
  {
    value: "seasonal",
    label: "Seasonal Promotion",
    desc: "Spring, summer, holiday specials",
    icon: "🌸",
  },
  {
    value: "thank_you",
    label: "Thank You / Loyalty",
    desc: "Show appreciation to your best customers",
    icon: "💚",
  },
  {
    value: "newsletter",
    label: "Newsletter",
    desc: "General update or tips for car owners",
    icon: "📰",
  },
  {
    value: "custom",
    label: "Custom Email",
    desc: "Write from scratch",
    icon: "✏️",
  },
];

const AUDIENCE_OPTIONS: {
  value: AudienceType;
  label: string;
  desc: string;
}[] = [
  {
    value: "all",
    label: "All Customers",
    desc: "Send to everyone with an email on file",
  },
  {
    value: "recent",
    label: "Recent Customers",
    desc: "Booked in the last 90 days",
  },
  {
    value: "inactive",
    label: "Win-Back",
    desc: "Haven't booked in 90+ days",
  },
  {
    value: "high_value",
    label: "VIP / High Spenders",
    desc: "Top 20% by lifetime spend",
  },
];

const STATUS_BADGE: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
  draft: { variant: "secondary", label: "Draft" },
  scheduled: { variant: "outline", label: "Scheduled" },
  sending: { variant: "default", label: "Sending…" },
  sent: { variant: "default", label: "Sent" },
  failed: { variant: "destructive", label: "Failed" },
};

// ═══════════════════════════════════════════════════════════════════════
// TEMPLATE HTML GENERATORS
// ═══════════════════════════════════════════════════════════════════════

function generateEmailHTML(opts: {
  templateType: TemplateType;
  headline: string;
  bodyText: string;
  couponCode?: string;
  couponAmount?: number;
  couponPercent?: number;
  couponExpiry?: string;
  ctaText?: string;
  ctaUrl?: string;
}): string {
  const {
    headline,
    bodyText,
    couponCode,
    couponAmount,
    couponPercent,
    couponExpiry,
    ctaText = "Book Now",
    ctaUrl = "https://book.proworxdetailing.com",
  } = opts;

  const couponSection =
    couponCode || couponAmount || couponPercent
      ? `
    <div style="background: linear-gradient(135deg, #16a34a, #15803d); border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
      <p style="color: #fff; font-size: 32px; font-weight: 800; margin: 0;">
        ${couponPercent ? `${couponPercent}% OFF` : couponAmount ? `$${(couponAmount / 100).toFixed(0)} OFF` : "SPECIAL DEAL"}
      </p>
      <p style="color: #bbf7d0; font-size: 14px; font-weight: 600; margin: 8px 0 0 0;">
        ${couponCode ? `Use code: <span style="background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 6px; font-family: monospace; letter-spacing: 2px;">${couponCode}</span>` : "Mention this email when booking"}
      </p>
      ${couponExpiry ? `<p style="color: #86efac; font-size: 11px; margin: 8px 0 0 0;">Expires ${couponExpiry}</p>` : ""}
    </div>`
      : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#ffffff;">

  <!-- HEADER -->
  <div style="background: linear-gradient(135deg, #18181b, #27272a); padding: 32px; text-align: center;">
    <img src="https://proworx-booking-8ee2b7c6.viktor.space/logo192.png" alt="ProWorx" style="width:56px;height:56px;border-radius:12px;" />
    <p style="color: #a1a1aa; font-size: 13px; margin: 12px 0 0 0; letter-spacing: 1px;">PROWORX MOBILE DETAILING</p>
  </div>

  <!-- BODY -->
  <div style="padding: 32px 24px;">
    <h1 style="color: #18181b; font-size: 24px; font-weight: 700; margin: 0 0 16px 0; text-align: center;">
      ${headline}
    </h1>
    <p style="color: #52525b; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0; text-align: center;">
      ${bodyText.replace(/\n/g, "<br/>")}
    </p>

    ${couponSection}

    <!-- CTA -->
    <div style="text-align: center; margin: 28px 0 16px 0;">
      <a href="${ctaUrl}" style="display: inline-block; background: #dc2626; color: #fff; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-weight: 700; font-size: 15px; letter-spacing: 0.5px;">
        ${ctaText}
      </a>
    </div>
  </div>

  <!-- FOOTER -->
  <div style="background: #fafafa; padding: 24px; text-align: center; border-top: 1px solid #e4e4e7;">
    <p style="color: #71717a; font-size: 12px; margin: 0 0 8px 0;">
      ProWorx Mobile Detailing · Charlotte, NC
    </p>
    <p style="color: #a1a1aa; font-size: 11px; margin: 0;">
      <a href="tel:+17047697891" style="color: #a1a1aa; text-decoration: none;">(704) 769-7891</a> ·
      <a href="https://proworxdetailing.com" style="color: #a1a1aa; text-decoration: none;">proworxdetailing.com</a>
    </p>
    <div style="margin-top: 12px;">
      <a href="https://www.instagram.com/proworxdetailing/" style="text-decoration:none;margin:0 4px;color:#a1a1aa;font-size:12px;">Instagram</a> ·
      <a href="https://www.facebook.com/ProWorxDetailing/" style="text-decoration:none;margin:0 4px;color:#a1a1aa;font-size:12px;">Facebook</a>
    </div>
  </div>

</div>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════════════
// DEFAULT CONTENT BY TEMPLATE
// ═══════════════════════════════════════════════════════════════════════

function getDefaults(t: TemplateType) {
  switch (t) {
    case "coupon":
      return {
        name: "Customer Appreciation Coupon",
        subject: "A Special Thank You from ProWorx Mobile Detailing",
        headline: "Thanks for your support!",
        bodyText:
          "As a small token of our appreciation, here's a reward you can use on your next detail. We truly value your business!",
        ctaText: "Book Now & Save",
        couponCode: "THANKYOU",
        couponAmount: 500,
        couponPercent: undefined as number | undefined,
        couponExpiry: "",
      };
    case "announcement":
      return {
        name: "New Service Announcement",
        subject: "New at ProWorx — Check This Out!",
        headline: "Something new for you!",
        bodyText:
          "We've added a brand-new service to our lineup. Whether you're looking for deeper cleaning, ceramic protection, or something special for your boat — we've got you covered.",
        ctaText: "See Our Services",
        couponCode: "",
        couponAmount: undefined as number | undefined,
        couponPercent: undefined as number | undefined,
        couponExpiry: "",
      };
    case "seasonal":
      return {
        name: "Spring Detailing Special",
        subject: "Spring is Here — Time to Shine!",
        headline: "Spring Detailing Special 🌸",
        bodyText:
          "Winter's over and your car deserves a refresh. Book a full detail this month and get a special spring discount. Pollen season is coming — protect your paint now!",
        ctaText: "Book Your Spring Detail",
        couponCode: "SPRING2026",
        couponAmount: undefined as number | undefined,
        couponPercent: 15,
        couponExpiry: "",
      };
    case "thank_you":
      return {
        name: "Customer Thank You",
        subject: "Thank You for Choosing ProWorx!",
        headline: "We appreciate you!",
        bodyText:
          "Thank you for trusting ProWorx Mobile Detailing with your vehicle. Your satisfaction means the world to us. We'd love to see you again soon!",
        ctaText: "Book Again",
        couponCode: "",
        couponAmount: undefined as number | undefined,
        couponPercent: undefined as number | undefined,
        couponExpiry: "",
      };
    case "newsletter":
      return {
        name: "Monthly Newsletter",
        subject: "ProWorx Monthly Update",
        headline: "What's New at ProWorx",
        bodyText:
          "Here's what's been happening at ProWorx Mobile Detailing. Check out our latest work, tips for keeping your car clean between details, and upcoming specials.",
        ctaText: "Visit Our Site",
        couponCode: "",
        couponAmount: undefined as number | undefined,
        couponPercent: undefined as number | undefined,
        couponExpiry: "",
      };
    case "custom":
    default:
      return {
        name: "Custom Campaign",
        subject: "",
        headline: "",
        bodyText: "",
        ctaText: "Book Now",
        couponCode: "",
        couponAmount: undefined as number | undefined,
        couponPercent: undefined as number | undefined,
        couponExpiry: "",
      };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export function EmailCampaignsPage() {
  const [step, setStep] = useState<Step>("list");
  const [selectedTemplate, setSelectedTemplate] =
    useState<TemplateType>("coupon");

  // Form state
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [headline, setHeadline] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [ctaText, setCtaText] = useState("Book Now");
  const [audience, setAudience] = useState<AudienceType>("all");
  const [couponCode, setCouponCode] = useState("");
  const [couponAmount, setCouponAmount] = useState("");
  const [couponPercent, setCouponPercent] = useState("");
  const [couponExpiry, setCouponExpiry] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Queries
  const campaigns = useQuery(api.emailCampaigns.list);
  const audienceCount = useQuery(api.emailCampaigns.getAudienceCount, {
    audience,
  });

  // Mutations
  const createCampaign = useMutation(api.emailCampaigns.create);
  const deleteCampaign = useMutation(api.emailCampaigns.remove);
  const sendCampaign = useAction(api.emailCampaigns.sendCampaign);

  // Reset form when choosing a template
  function pickTemplate(t: TemplateType) {
    setSelectedTemplate(t);
    const d = getDefaults(t);
    setName(d.name);
    setSubject(d.subject);
    setHeadline(d.headline);
    setBodyText(d.bodyText);
    setCtaText(d.ctaText);
    setCouponCode(d.couponCode || "");
    setCouponAmount(
      d.couponAmount ? String(d.couponAmount / 100) : "",
    );
    setCouponPercent(
      d.couponPercent ? String(d.couponPercent) : "",
    );
    setCouponExpiry(d.couponExpiry || "");
    setAudience("all");
    setStep("design");
  }

  // Build HTML preview
  const previewHTML = useMemo(
    () =>
      generateEmailHTML({
        templateType: selectedTemplate,
        headline,
        bodyText,
        couponCode: couponCode || undefined,
        couponAmount: couponAmount ? Number(couponAmount) * 100 : undefined,
        couponPercent: couponPercent ? Number(couponPercent) : undefined,
        couponExpiry: couponExpiry || undefined,
        ctaText,
      }),
    [
      selectedTemplate,
      headline,
      bodyText,
      couponCode,
      couponAmount,
      couponPercent,
      couponExpiry,
      ctaText,
    ],
  );

  // Create + Send
  async function handleSend() {
    if (!subject.trim() || !headline.trim()) {
      toast.error("Subject and headline are required");
      return;
    }
    setIsSending(true);
    try {
      const id = await createCampaign({
        name: name || subject,
        subject,
        body: previewHTML,
        templateType: selectedTemplate,
        audience,
        couponCode: couponCode || undefined,
        couponAmount: couponAmount ? Number(couponAmount) * 100 : undefined,
        couponPercent: couponPercent ? Number(couponPercent) : undefined,
        couponExpiry: couponExpiry || undefined,
      });
      const result = await sendCampaign({ id });
      toast.success(
        `Campaign sent! ${result.sent} delivered, ${result.failed} failed`,
      );
      setStep("list");
    } catch (err) {
      toast.error("Failed to send campaign");
      console.error(err);
    } finally {
      setIsSending(false);
    }
  }

  // Save as draft
  async function handleSaveDraft() {
    if (!subject.trim()) {
      toast.error("Subject is required");
      return;
    }
    try {
      await createCampaign({
        name: name || subject,
        subject,
        body: previewHTML,
        templateType: selectedTemplate,
        audience,
        couponCode: couponCode || undefined,
        couponAmount: couponAmount ? Number(couponAmount) * 100 : undefined,
        couponPercent: couponPercent ? Number(couponPercent) : undefined,
        couponExpiry: couponExpiry || undefined,
      });
      toast.success("Draft saved!");
      setStep("list");
    } catch (err) {
      toast.error("Failed to save draft");
    }
  }

  // Send an existing draft
  async function handleSendExisting(id: Id<"emailCampaigns">) {
    setIsSending(true);
    try {
      const result = await sendCampaign({ id });
      toast.success(
        `Sent! ${result.sent} delivered, ${result.failed} failed`,
      );
    } catch (err) {
      toast.error("Failed to send");
    } finally {
      setIsSending(false);
    }
  }

  // ─── CAMPAIGN LIST ─────────────────────────────────────────────────────
  if (step === "list") {
    const drafts = (campaigns || []).filter((c) => c.status === "draft");
    const sent = (campaigns || []).filter((c) => c.status !== "draft");

    return (
      <div className="space-y-6 p-4 md:p-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Mail className="h-6 w-6" /> Email Campaigns
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Create and send email campaigns to your customers
            </p>
          </div>
          <Button onClick={() => setStep("template")} className="gap-2">
            <MailPlus className="h-4 w-4" /> Create Campaign
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold">
                {sent.filter((c) => c.status === "sent").length}
              </p>
              <p className="text-xs text-muted-foreground">Campaigns Sent</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold">
                {sent.reduce((s, c) => s + (c.totalSent || 0), 0)}
              </p>
              <p className="text-xs text-muted-foreground">Emails Delivered</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold">{drafts.length}</p>
              <p className="text-xs text-muted-foreground">Drafts</p>
            </CardContent>
          </Card>
        </div>

        {/* Drafts */}
        {drafts.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Drafts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {drafts.map((c) => (
                <div
                  key={c._id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {c.subject}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <Badge variant="secondary">Draft</Badge>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleSendExisting(c._id)}
                      disabled={isSending}
                      className="gap-1"
                    >
                      {isSending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Send className="h-3 w-3" />
                      )}
                      Send
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        await deleteCampaign({ id: c._id });
                        toast.success("Draft deleted");
                      }}
                    >
                      <Trash2 className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Sent Campaigns */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Campaign History</CardTitle>
          </CardHeader>
          <CardContent>
            {sent.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-6">
                No campaigns sent yet. Create your first one!
              </p>
            ) : (
              <div className="space-y-2">
                {sent.map((c) => {
                  const badge = STATUS_BADGE[c.status] || STATUS_BADGE.draft;
                  return (
                    <div
                      key={c._id}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">
                          {c.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {c.sentAt
                            ? new Date(c.sentAt).toLocaleDateString()
                            : "—"}{" "}
                          · {c.totalSent || 0} sent
                          {(c.totalFailed || 0) > 0 &&
                            ` · ${c.totalFailed} failed`}
                        </p>
                      </div>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── STEP 1: CHOOSE TEMPLATE ────────────────────────────────────────────
  if (step === "template") {
    return (
      <div className="space-y-6 p-4 md:p-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setStep("list")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold">Choose a Campaign</h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TEMPLATE_OPTIONS.map((t) => (
            <Card
              key={t.value}
              className="cursor-pointer hover:ring-2 hover:ring-primary transition-all"
              onClick={() => pickTemplate(t.value)}
            >
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{t.icon}</span>
                  <div>
                    <p className="font-semibold text-sm">{t.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t.desc}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ─── STEP 2: DESIGN ────────────────────────────────────────────────────
  if (step === "design") {
    return (
      <div className="space-y-6 p-4 md:p-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep("template")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold">Design Your Campaign</h1>
        </div>

        <Card>
          <CardContent className="pt-5 space-y-4">
            <div>
              <Label>Campaign Name (internal)</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Spring 2026 Coupon"
              />
            </div>
            <div>
              <Label>Email Subject Line *</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="What your customers see in their inbox"
              />
            </div>
            <div>
              <Label>Headline *</Label>
              <Input
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Big text at the top of the email"
              />
            </div>
            <div>
              <Label>Body Text</Label>
              <Textarea
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                placeholder="Your message to customers..."
                rows={4}
              />
            </div>
            <div>
              <Label>Button Text</Label>
              <Input
                value={ctaText}
                onChange={(e) => setCtaText(e.target.value)}
                placeholder="Book Now"
              />
            </div>

            {/* Coupon Fields */}
            {(selectedTemplate === "coupon" ||
              selectedTemplate === "seasonal") && (
              <div className="border-t pt-4 space-y-3">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Tag className="h-4 w-4" /> Coupon Details
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Code</Label>
                    <Input
                      value={couponCode}
                      onChange={(e) =>
                        setCouponCode(e.target.value.toUpperCase())
                      }
                      placeholder="SPRING2026"
                    />
                  </div>
                  <div>
                    <Label>Expiry Date</Label>
                    <Input
                      type="date"
                      value={couponExpiry}
                      onChange={(e) => setCouponExpiry(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>$ Off</Label>
                    <Input
                      type="number"
                      value={couponAmount}
                      onChange={(e) => {
                        setCouponAmount(e.target.value);
                        if (e.target.value) setCouponPercent("");
                      }}
                      placeholder="5"
                    />
                  </div>
                  <div>
                    <Label>% Off</Label>
                    <Input
                      type="number"
                      value={couponPercent}
                      onChange={(e) => {
                        setCouponPercent(e.target.value);
                        if (e.target.value) setCouponAmount("");
                      }}
                      placeholder="15"
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setStep("preview")}
          >
            <Eye className="h-4 w-4 mr-2" /> Preview
          </Button>
          <Button className="flex-1" onClick={() => setStep("audience")}>
            Next: Audience <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
          </Button>
        </div>
      </div>
    );
  }

  // ─── PREVIEW ───────────────────────────────────────────────────────────
  if (step === "preview") {
    return (
      <div className="space-y-4 p-4 md:p-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setStep("design")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold">Email Preview</h1>
        </div>

        {/* Phone mockup frame */}
        <div className="mx-auto max-w-[375px]">
          <div className="bg-gray-900 rounded-[2rem] p-3">
            <div className="bg-white rounded-[1.5rem] overflow-hidden">
              <div className="bg-gray-100 px-4 py-2 text-xs text-muted-foreground border-b">
                <p className="font-semibold text-foreground text-sm truncate">
                  {subject || "(no subject)"}
                </p>
                <p className="truncate">From: ProWorx Mobile Detailing</p>
              </div>
              <div
                className="email-preview"
                dangerouslySetInnerHTML={{ __html: previewHTML }}
                style={{ maxHeight: 500, overflowY: "auto" }}
              />
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => setStep("design")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Editor
        </Button>
      </div>
    );
  }

  // ─── STEP 3: AUDIENCE ──────────────────────────────────────────────────
  if (step === "audience") {
    return (
      <div className="space-y-6 p-4 md:p-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setStep("design")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold">Who do you want to reach?</h1>
        </div>

        <div className="space-y-3">
          {AUDIENCE_OPTIONS.map((a) => (
            <Card
              key={a.value}
              className={`cursor-pointer transition-all ${
                audience === a.value
                  ? "ring-2 ring-primary bg-primary/5"
                  : "hover:bg-muted/50"
              }`}
              onClick={() => setAudience(a.value)}
            >
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">{a.label}</p>
                    <p className="text-xs text-muted-foreground">{a.desc}</p>
                  </div>
                  {audience === a.value && (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="pt-4 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Total Audience</span>
            </div>
            <span className="text-lg font-bold">
              {audienceCount ?? "…"} subscribers
            </span>
          </CardContent>
        </Card>

        <Button className="w-full" onClick={() => setStep("review")}>
          Next: Review & Send{" "}
          <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
        </Button>
      </div>
    );
  }

  // ─── STEP 4: REVIEW & SEND ─────────────────────────────────────────────
  if (step === "review") {
    return (
      <div className="space-y-6 p-4 md:p-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep("audience")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold">Review & Send</h1>
        </div>

        <Card>
          <CardContent className="pt-5 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Campaign</span>
              <span className="font-medium">{name || subject}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subject</span>
              <span className="font-medium truncate ml-4">{subject}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Template</span>
              <span className="font-medium">
                {
                  TEMPLATE_OPTIONS.find((t) => t.value === selectedTemplate)
                    ?.label
                }
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Audience</span>
              <span className="font-medium">
                {AUDIENCE_OPTIONS.find((a) => a.value === audience)?.label} (
                {audienceCount ?? "…"})
              </span>
            </div>
            {couponCode && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Coupon</span>
                <span className="font-medium font-mono">{couponCode}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mini preview */}
        <div className="mx-auto max-w-[320px]">
          <div className="bg-gray-900 rounded-[1.5rem] p-2">
            <div className="bg-white rounded-[1.2rem] overflow-hidden">
              <div
                dangerouslySetInnerHTML={{ __html: previewHTML }}
                style={{
                  maxHeight: 280,
                  overflowY: "hidden",
                  transform: "scale(0.85)",
                  transformOrigin: "top center",
                }}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleSaveDraft}
          >
            Save as Draft
          </Button>
          <Button
            className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
            onClick={handleSend}
            disabled={isSending}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {isSending ? "Sending…" : `Send to ${audienceCount ?? "…"} People`}
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
