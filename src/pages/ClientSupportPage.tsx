import { useMutation, useQuery } from "convex/react";
import {
  CheckCircle2,
  Clock,
  HelpCircle,
  Loader2,
  Mail,
  MessageSquarePlus,
  Phone,
  Send,
  Headphones,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BUSINESS_EMAIL, BUSINESS_PHONE } from "@/lib/constants";
import { api } from "../../convex/_generated/api";

const CATEGORIES = [
  { value: "booking_issue", label: "Booking Issue", icon: "📅" },
  { value: "payment_issue", label: "Payment Question", icon: "💳" },
  { value: "loyalty_question", label: "Loyalty & Rewards", icon: "⭐" },
  { value: "service_feedback", label: "Service Feedback", icon: "🚗" },
  { value: "account_help", label: "Account Help", icon: "👤" },
  { value: "general", label: "General Question", icon: "💬" },
] as const;

type Category = (typeof CATEGORIES)[number]["value"];

function statusBadge(status: string) {
  switch (status) {
    case "open":
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">Open</Badge>;
    case "in_progress":
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">In Progress</Badge>;
    case "resolved":
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">Resolved</Badge>;
    case "closed":
      return <Badge variant="secondary">Closed</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export function ClientSupportPage() {
  const myTickets = useQuery(api.support.myTickets);
  const submitTicket = useMutation(api.support.submitTicket);

  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState<Category | "">("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!category || !subject.trim() || !message.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    setSending(true);
    try {
      await submitTicket({ category: category as Category, subject: subject.trim(), message: message.trim() });
      toast.success("Support request submitted! We'll get back to you soon.");
      setCategory("");
      setSubject("");
      setMessage("");
      setShowForm(false);
    } catch {
      toast.error("Failed to submit. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Headphones className="size-6" />
          Help & Support
        </h1>
        <p className="text-muted-foreground">
          Need help? Submit a request or contact us directly.
        </p>
      </div>

      {/* Contact Info Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <Mail className="size-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Email Us</p>
                <a href={`mailto:${BUSINESS_EMAIL}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                  {BUSINESS_EMAIL}
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <Phone className="size-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Call Us</p>
                <a href={`tel:${BUSINESS_PHONE.replace(/[^\d+]/g, "")}`} className="text-sm text-green-600 dark:text-green-400 hover:underline">
                  {BUSINESS_PHONE}
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Submit Request */}
      {!showForm ? (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="text-center space-y-3">
              <div className="mx-auto size-12 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageSquarePlus className="size-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Submit a Support Request</h3>
                <p className="text-sm text-muted-foreground">
                  Describe your issue and we'll respond as soon as possible
                </p>
              </div>
              <Button onClick={() => setShowForm(true)}>
                <MessageSquarePlus className="size-4" />
                New Request
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>New Support Request</CardTitle>
            <CardDescription>Fill in the details below and we'll get back to you</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
                  <SelectTrigger>
                    <SelectValue placeholder="What do you need help with?" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.icon} {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief description of your issue"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Please describe your issue in detail..."
                  rows={5}
                  required
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setCategory("");
                    setSubject("");
                    setMessage("");
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={sending}>
                  {sending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="size-4" />
                      Submit Request
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* My Tickets */}
      {myTickets && myTickets.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Your Requests</h2>
          {myTickets.map((ticket) => (
            <Card key={ticket._id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{ticket.subject}</span>
                      {statusBadge(ticket.status)}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{ticket.message}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <HelpCircle className="size-3" />
                        {CATEGORIES.find((c) => c.value === ticket.category)?.label || ticket.category}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {new Date(ticket._creationTime).toLocaleDateString()}
                      </span>
                    </div>
                    {ticket.adminNotes && (
                      <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/50 rounded text-sm">
                        <p className="font-medium text-xs text-blue-700 dark:text-blue-300 mb-1">Response from ProWorx:</p>
                        <p className="text-blue-900 dark:text-blue-100">{ticket.adminNotes}</p>
                      </div>
                    )}
                  </div>
                  {ticket.status === "resolved" && (
                    <CheckCircle2 className="size-5 text-green-500 shrink-0 mt-1" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
