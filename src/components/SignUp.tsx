import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { ArrowLeft, Check, Eye, EyeOff, Loader2, Mail } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

function isTestEmail(email: string): boolean {
  return email.endsWith("@test.local");
}

type Step = "signUp" | { email: string } | "verified";

export function SignUp() {
  const { signIn } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();
  const [step, setStep] = useState<Step>("signUp");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordVal, setPasswordVal] = useState("");

  if (step === "signUp") {
    return (
      <Card variant="elevated">
        <CardContent className="pt-6">
          <form
            onSubmit={async e => {
              e.preventDefault();
              setError("");

              // Validate passwords match
              if (passwordVal !== confirmPassword) {
                setError("Passwords do not match.");
                return;
              }

              setLoading(true);

              const formData = new FormData(e.currentTarget);
              const email = formData.get("email") as string;
              const provider = isTestEmail(email) ? "test" : "password";
              try {
                await signIn(provider, formData);
                if (!isTestEmail(email)) {
                  setStep({ email });
                }
              } catch {
                setError("Could not create account. Please try again.");
              } finally {
                setLoading(false);
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Your name"
                autoComplete="name"
                className="h-11"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                className="h-11"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  minLength={6}
                  autoComplete="new-password"
                  className="h-11 pr-11"
                  value={passwordVal}
                  onChange={e => setPasswordVal(e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-11 w-11 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Must be at least 6 characters
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  placeholder="••••••••"
                  minLength={6}
                  autoComplete="new-password"
                  className={`h-11 pr-11 ${confirmPassword && passwordVal !== confirmPassword ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-11 w-11 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowConfirm(!showConfirm)}
                  tabIndex={-1}
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
              {confirmPassword && passwordVal !== confirmPassword && (
                <p className="text-xs text-destructive">Passwords do not match</p>
              )}
              {confirmPassword && passwordVal === confirmPassword && confirmPassword.length >= 6 && (
                <p className="text-xs text-green-600 dark:text-green-400">Passwords match ✓</p>
              )}
            </div>
            <input name="flow" value="signUp" type="hidden" />
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full h-11" disabled={loading || (confirmPassword !== "" && passwordVal !== confirmPassword)}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  // If already authenticated (verification succeeded), show success state
  if (isAuthenticated || step === "verified") {
    return (
      <Card variant="elevated">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="mx-auto size-12 rounded-full bg-green-500 flex items-center justify-center">
              <Check className="size-6 text-white" />
            </div>
            <h2 className="font-semibold text-lg">Email Verified!</h2>
            <p className="text-sm text-muted-foreground">
              Setting up your account...
            </p>
            <Loader2 className="size-5 animate-spin mx-auto text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const verifyEmail = typeof step === "object" ? step.email : "";

  return (
    <Card variant="elevated">
      <CardContent className="pt-6">
        <div className="text-center mb-6">
          <div className="mx-auto size-12 rounded-full bg-primary flex items-center justify-center mb-4">
            <Mail className="size-6 text-primary-foreground" />
          </div>
          <h2 className="font-semibold text-lg">Check your email</h2>
          <p className="text-sm text-muted-foreground">
            We sent a verification code to {verifyEmail}
          </p>
        </div>
        <form
          onSubmit={async e => {
            e.preventDefault();
            setError("");
            setLoading(true);

            const formData = new FormData(e.currentTarget);
            try {
              await signIn("password", formData);
              // Verification succeeded — show success state
              setStep("verified");
            } catch {
              setError("Invalid or expired code. Please try again.");
            } finally {
              setLoading(false);
            }
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="code">Verification Code</Label>
            <Input
              id="code"
              name="code"
              type="text"
              placeholder="Enter code"
              autoComplete="one-time-code"
              className="h-11 text-center tracking-[0.5em] font-mono"
              required
            />
          </div>
          <input name="flow" value="email-verification" type="hidden" />
          <input name="email" value={verifyEmail} type="hidden" />
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full h-11" disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            {loading ? "Verifying..." : "Verify Email"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Didn't receive it? Check spam or{" "}
            <Button
              type="button"
              variant="link"
              className="px-0 h-auto text-sm font-medium"
              onClick={() => { setStep("signUp"); setError(""); }}
            >
              try again
            </Button>
          </p>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => { setStep("signUp"); setError(""); }}
          >
            <ArrowLeft className="size-4" />
            Back to sign up
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
