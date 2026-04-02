import { useAuthActions } from "@convex-dev/auth/react";
import { useAction, useMutation, useQuery } from "convex/react";
import { Bot, ChevronRight, CreditCard, Eye, EyeOff, Loader2, Megaphone, Moon, Palette, RefreshCw, Sun, User } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useUserRole } from "@/contexts/RoleContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/contexts/ThemeContext";
import { api } from "../../convex/_generated/api";

export function SettingsPage() {
  const user = useQuery(api.auth.currentUser);
  const { theme, toggleTheme, switchable } = useTheme();
  const { signIn, signOut } = useAuthActions();
  const deleteAccount = useMutation(api.users.deleteAccount);
  const navigate = useNavigate();

  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [passwordStep, setPasswordStep] = useState<"request" | "verify">(
    "request",
  );

  const handleRequestPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData();
    formData.append("email", user?.email || "");
    formData.append("flow", "reset");

    try {
      await signIn("password", formData);
      setPasswordStep("verify");
    } catch {
      setError("Could not send reset code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.append("email", user?.email || "");
    formData.append("flow", "reset-verification");

    try {
      await signIn("password", formData);
      setSuccess("Password changed successfully!");
      setTimeout(() => {
        setChangePasswordOpen(false);
        setPasswordStep("request");
        setSuccess("");
      }, 1500);
    } catch {
      setError("Invalid code or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    setError("");

    try {
      await deleteAccount();
      await signOut();
      navigate("/");
    } catch {
      setError("Could not delete account. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">Page subtitle goes here</p>
      </div>

      <Card className="overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
        <CardContent className="-mt-10 pb-6">
          <div className="flex items-end gap-4">
            <Avatar className="size-16 border-4 border-background shadow-lg">
              <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                {user?.name?.charAt(0).toUpperCase() || (
                  <User className="size-6" />
                )}
              </AvatarFallback>
            </Avatar>
            <div className="pb-1">
              <p className="font-semibold">{user?.name || "User"}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="size-4 text-muted-foreground" />
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {switchable ? (
            <div className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50">
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-full bg-secondary flex items-center justify-center">
                  {theme === "light" ? (
                    <Moon className="size-5 text-foreground" />
                  ) : (
                    <Sun className="size-5 text-foreground" />
                  )}
                </div>
                <div>
                  <Label htmlFor="dark-mode" className="font-medium">
                    Dark mode
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Toggle description goes here
                  </p>
                </div>
              </div>
              <Switch
                id="dark-mode"
                checked={theme === "dark"}
                onCheckedChange={toggleTheme}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground px-4 py-2">
              Theme follows your system preference
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="size-4 text-muted-foreground" />
            Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <button
            onClick={() => setChangePasswordOpen(true)}
            className="w-full flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50 text-left"
          >
            <div>
              <p className="font-medium text-sm">Change password</p>
              <p className="text-sm text-muted-foreground">
                Update your password
              </p>
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => setDeleteAccountOpen(true)}
            className="w-full flex items-center justify-between rounded-lg border border-destructive/20 p-4 transition-colors hover:bg-destructive/5 text-left"
          >
            <div>
              <p className="font-medium text-sm text-destructive">
                Delete account
              </p>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account
              </p>
            </div>
            <ChevronRight className="size-4 text-destructive" />
          </button>
        </CardContent>
      </Card>

      {/* AI Assistant API Key — owner/admin only */}
      <GeminiApiKeyCard />

      {/* Square Access Token — owner/admin only */}
      <SquareAccessTokenCard />

      {/* Square Customer Sync — owner/admin only */}
      <SquareCustomerSyncCard />

      {/* Ad Integrations — owner/admin only */}
      <AdIntegrationsCard />

      <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              {passwordStep === "request"
                ? "We'll send a verification code to your email."
                : "Enter the code from your email and your new password."}
            </DialogDescription>
          </DialogHeader>

          {passwordStep === "request" ? (
            <form onSubmit={handleRequestPasswordReset}>
              <div className="py-4">
                <p className="text-sm text-muted-foreground">
                  A reset code will be sent to:{" "}
                  <span className="font-medium text-foreground">
                    {user?.email}
                  </span>
                </p>
              </div>
              {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2 mb-4">
                  {error}
                </p>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setChangePasswordOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="size-4 animate-spin" />}
                  Send Code
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Verification Code</Label>
                <Input
                  id="code"
                  name="code"
                  type="text"
                  placeholder="Enter code from email"
                  autoComplete="one-time-code"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  placeholder="••••••••"
                  minLength={6}
                  autoComplete="new-password"
                  required
                />
              </div>
              {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
              {success && (
                <p className="text-sm text-success bg-success/10 rounded-lg px-3 py-2">
                  {success}
                </p>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPasswordStep("request");
                    setError("");
                  }}
                >
                  Back
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="size-4 animate-spin" />}
                  Change Password
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteAccountOpen} onOpenChange={setDeleteAccountOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete your
              account and remove all your data.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete your account?
            </p>
          </div>
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteAccountOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={loading}
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              Delete Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Ad Integrations Card (owner/admin only) ─────────────────────────────────

const AD_SETTINGS_FIELDS = [
  {
    section: "Google Ads",
    fields: [
      { key: "google_ads_client_id", label: "Client ID", placeholder: "xxxxxxxxx.apps.googleusercontent.com", help: "From Google Cloud Console → Credentials" },
      { key: "google_ads_client_secret", label: "Client Secret", placeholder: "GOCSPX-xxxx", help: "" },
      { key: "google_ads_refresh_token", label: "Refresh Token", placeholder: "1//xxxxxxx", help: "OAuth2 refresh token" },
      { key: "google_ads_developer_token", label: "Developer Token", placeholder: "xxxxxxxxxxxxxxxx", help: "From Google Ads API Center" },
      { key: "google_ads_customer_id", label: "Customer ID", placeholder: "1234567890", help: "Your Google Ads account number (no dashes)" },
    ],
  },
  {
    section: "Meta Ads (Facebook & Instagram)",
    fields: [
      { key: "meta_ads_access_token", label: "Access Token", placeholder: "EAAxxxxxxx...", help: "Long-lived user access token from Meta Business" },
      { key: "meta_ads_account_id", label: "Ad Account ID", placeholder: "act_123456789", help: "From Meta Business Settings → Ad Accounts" },
    ],
  },
] as const;

function AdIntegrationsCard() {
  const { isAdmin } = useUserRole();
  const setSetting = useMutation(api.systemSettings.set);
  const connectionStatus = useQuery(api.adSync.getConnectionStatus, {});
  const [fields, setFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  if (!isAdmin) return null;

  const handleSave = async (key: string) => {
    const val = fields[key]?.trim();
    if (!val) return;
    setSaving(key);
    try {
      await setSetting({ key, value: val });
      toast.success("Saved");
      setFields((prev) => ({ ...prev, [key]: "" }));
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(null);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Megaphone className="size-4 text-muted-foreground" />
          Ad Integrations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Connect your ad platforms to automatically sync campaign performance data into the Marketing dashboard.
        </p>

        {/* Status indicators */}
        <div className="flex gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className={`w-2.5 h-2.5 rounded-full ${connectionStatus?.googleAds.configured ? "bg-green-500" : "bg-gray-300"}`} />
            Google Ads {connectionStatus?.googleAds.configured ? "✓" : "—"}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className={`w-2.5 h-2.5 rounded-full ${connectionStatus?.metaAds.configured ? "bg-green-500" : "bg-gray-300"}`} />
            Meta Ads {connectionStatus?.metaAds.configured ? "✓" : "—"}
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={() => setExpanded(!expanded)}>
          {expanded ? "Hide" : "Configure"} Credentials
        </Button>

        {expanded && (
          <div className="space-y-6 pt-2">
            {AD_SETTINGS_FIELDS.map((section) => (
              <div key={section.section}>
                <h4 className="text-sm font-medium mb-3">{section.section}</h4>
                <div className="space-y-3">
                  {section.fields.map((field) => (
                    <div key={field.key} className="space-y-1">
                      <Label className="text-xs">{field.label}</Label>
                      {field.help && (
                        <p className="text-xs text-muted-foreground">{field.help}</p>
                      )}
                      <div className="flex gap-2">
                        <Input
                          type="password"
                          placeholder={field.placeholder}
                          value={fields[field.key] || ""}
                          onChange={(e) =>
                            setFields((prev) => ({ ...prev, [field.key]: e.target.value }))
                          }
                          className="flex-1 font-mono text-xs"
                        />
                        <Button
                          onClick={() => handleSave(field.key)}
                          disabled={!fields[field.key]?.trim() || saving === field.key}
                          size="sm"
                          variant="outline"
                        >
                          {saving === field.key && <Loader2 className="size-3 animate-spin mr-1" />}
                          Save
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Gemini API Key Card (owner/admin only) ─────────────────────────────────

function GeminiApiKeyCard() {
  const { isAdmin } = useUserRole();
  const currentKey = useQuery(api.systemSettings.get, { key: "gemini_api_key" });
  const setSetting = useMutation(api.systemSettings.set);
  const [keyInput, setKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!isAdmin) return null;

  const maskedKey = currentKey
    ? currentKey.slice(0, 10) + "•".repeat(Math.max(0, currentKey.length - 14)) + currentKey.slice(-4)
    : null;

  const handleSave = async () => {
    const trimmed = keyInput.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await setSetting({ key: "gemini_api_key", value: trimmed });
      toast.success("API key saved");
      setKeyInput("");
      setShowKey(false);
    } catch {
      toast.error("Failed to save API key");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="size-4 text-muted-foreground" />
          AI Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <Label className="text-sm font-medium">Gemini API Key</Label>
          <p className="text-xs text-muted-foreground">
            Powers the AI Assistant. Get a free key from{" "}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              Google AI Studio
            </a>
          </p>
        </div>

        {currentKey && (
          <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
            <code className="flex-1 text-sm font-mono text-muted-foreground">
              {showKey ? currentKey : maskedKey}
            </code>
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        )}

        <div className="flex gap-2">
          <Input
            type="password"
            placeholder={currentKey ? "Enter new key to replace…" : "Paste your Gemini API key…"}
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            className="flex-1 font-mono text-sm"
          />
          <Button onClick={handleSave} disabled={!keyInput.trim() || saving} size="sm">
            {saving && <Loader2 className="size-4 animate-spin mr-1" />}
            {currentKey ? "Update" : "Save"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Square Access Token Card (owner/admin only) ───────────────────────────────

function SquareAccessTokenCard() {
  const { isAdmin } = useUserRole();
  const currentToken = useQuery(api.systemSettings.get, { key: "square_access_token" });
  const syncStatus = useQuery(api.squareBookingSync.getSyncStatus);
  const setSetting = useMutation(api.systemSettings.set);
  const [tokenInput, setTokenInput] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!isAdmin) return null;

  const maskedToken = currentToken
    ? currentToken.slice(0, 8) + "•".repeat(Math.max(0, currentToken.length - 12)) + currentToken.slice(-4)
    : null;

  const handleSave = async () => {
    const trimmed = tokenInput.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await setSetting({ key: "square_access_token", value: trimmed });
      toast.success("Square access token saved — bookings will now auto-sync!");
      setTokenInput("");
      setShowToken(false);
    } catch {
      toast.error("Failed to save token");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <CreditCard className="size-4 text-muted-foreground" />
          Square Booking Sync
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <Label className="text-sm font-medium">Square Access Token</Label>
          <p className="text-xs text-muted-foreground">
            Enables auto-sync of new bookings to Square. Get your token from{" "}
            <a
              href="https://developer.squareup.com/apps"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              Square Developer Dashboard
            </a>
            {" "}→ your app → Credentials → Production Access Token.
          </p>
        </div>

        {currentToken && (
          <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
            <code className="flex-1 text-sm font-mono text-muted-foreground">
              {showToken ? currentToken : maskedToken}
            </code>
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {showToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        )}

        {currentToken && syncStatus && (
          <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
            <p className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-green-500 inline-block" />
              <strong>Active</strong> — new bookings auto-sync to Square
            </p>
            <p className="text-muted-foreground text-xs">
              {syncStatus.synced} synced • {syncStatus.unsynced} pending
            </p>
          </div>
        )}

        {!currentToken && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-3 text-sm text-amber-700 dark:text-amber-400">
            ⚠️ No token set — bookings won't sync to Square until you add one.
          </div>
        )}

        <div className="flex gap-2">
          <Input
            type="password"
            placeholder={currentToken ? "Enter new token to replace…" : "Paste your Square access token…"}
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            className="flex-1 font-mono text-sm"
          />
          <Button onClick={handleSave} disabled={!tokenInput.trim() || saving} size="sm">
            {saving && <Loader2 className="size-4 animate-spin mr-1" />}
            {currentToken ? "Update" : "Save"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Square Customer Sync Card (owner/admin only) ──────────────────────────────
function SquareCustomerSyncCard() {
  const { isAdmin } = useUserRole();
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<{
    totalImported: number;
    totalSkipped: number;
    batchesProcessed: number;
  } | null>(null);
  const syncAction = useAction(api.squareCustomerSync.syncAllCustomers);

  if (!isAdmin) return null;

  const handleSync = async () => {
    setSyncing(true);
    setResult(null);
    try {
      const r = await syncAction();
      setResult(r);
      toast.success(
        `Synced ${r.totalImported} new customers (${r.totalSkipped} already existed)`,
      );
    } catch (err) {
      toast.error(
        `Sync failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <RefreshCw className="size-4 text-muted-foreground" />
          Square Customer Sync
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Import customers from your Square account. Duplicates are
          automatically skipped.
        </p>

        {result && (
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <p>
              ✅ <strong>{result.totalImported}</strong> new customers imported
            </p>
            <p>
              ⏭️ <strong>{result.totalSkipped}</strong> already existed (skipped)
            </p>
            <p className="text-muted-foreground text-xs mt-1">
              Processed {result.batchesProcessed} batch
              {result.batchesProcessed !== 1 ? "es" : ""}
            </p>
          </div>
        )}

        <Button
          onClick={handleSync}
          disabled={syncing}
          size="sm"
          className="w-full sm:w-auto"
        >
          {syncing ? (
            <>
              <Loader2 className="size-4 animate-spin mr-2" />
              Syncing customers…
            </>
          ) : (
            <>
              <RefreshCw className="size-4 mr-2" />
              Sync from Square
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
