import { useConvexAuth, useMutation } from "convex/react";
import { Link, Navigate } from "react-router-dom";
import { useUserRole } from "@/contexts/RoleContext";
import { SignUp } from "@/components/SignUp";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "../../convex/_generated/api";

export function ClientRegisterPage() {
  const { isAuthenticated } = useConvexAuth();
  const { isClient, isAdmin, isEmployee, isLoading, role } = useUserRole();
  const initClientProfile = useMutation(api.userProfiles.initClientProfile);
  const marketingOptIn = useMutation(api.marketing.optIn);
  const didInit = useRef(false);
  const [wantsMarketing, setWantsMarketing] = useState(true);
  const [profileReady, setProfileReady] = useState(false);

  // When authenticated with no role, immediately create client profile
  // Don't wait for isLoading — that creates a circular dependency
  // (isLoading is true BECAUSE there's no profile)
  useEffect(() => {
    if (!isAuthenticated || didInit.current) return;

    // No role yet → create client profile right away
    if (role === null && !isLoading) {
      didInit.current = true;
      initClientProfile({}).then(() => {
        setProfileReady(true);
        if (wantsMarketing) {
          marketingOptIn({ source: "portal_registration" }).catch(() => {});
        }
      }).catch(() => {
        didInit.current = false;
      });
      return;
    }

    // Still initializing (role null, isLoading true) — RoleProvider's auto-init
    // should create the profile. But add a fallback timer in case it stalls.
    if (role === null && isLoading) {
      const timer = setTimeout(() => {
        if (!didInit.current) {
          didInit.current = true;
          initClientProfile({}).then(() => {
            setProfileReady(true);
            if (wantsMarketing) {
              marketingOptIn({ source: "portal_registration" }).catch(() => {});
            }
          }).catch(() => {
            didInit.current = false;
          });
        }
      }, 2000); // 2s fallback
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, isLoading, role, initClientProfile, marketingOptIn, wantsMarketing]);

  // Redirect authenticated users
  if (isAuthenticated && !isLoading) {
    if (isClient) return <Navigate to="/rewards" replace />;
    if (isAdmin) return <Navigate to="/dashboard" replace />;
    if (isEmployee) return <Navigate to="/my/dashboard" replace />;
  }

  // Fallback redirect if profile was just created
  if (isAuthenticated && profileReady && isClient) {
    return <Navigate to="/rewards" replace />;
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4 relative min-h-svh bg-gradient-to-b from-amber-50/50 to-white dark:from-amber-950/20 dark:to-background">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 right-1/4 size-96 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 size-96 rounded-full bg-orange-500/5 blur-3xl" />
      </div>

      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <img src="/favicon-192.png" alt="ProWorx" className="mx-auto size-14 rounded-xl mb-4" />
          <div className="flex items-center justify-center gap-2">
            <Star className="size-5 text-amber-500" />
            <h1 className="text-2xl font-bold tracking-tight">Join ProWorx Rewards</h1>
            <Star className="size-5 text-amber-500" />
          </div>
          <p className="text-muted-foreground text-sm">
            Create an account to track your loyalty points, view booking history, and redeem rewards
          </p>
        </div>

        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-sm space-y-2">
          <p className="font-semibold text-amber-800 dark:text-amber-300">
            ⭐ Why join?
          </p>
          <ul className="space-y-1 text-amber-700 dark:text-amber-400">
            <li>✓ Earn 1 point for every $1 spent</li>
            <li>✓ Redeem points for discounts & free services</li>
            <li>✓ Exclusive bonus point promotions</li>
            <li>✓ Track your booking history</li>
          </ul>
        </div>

        <SignUp />

        {/* Marketing Opt-In */}
        <label className="flex items-start gap-3 cursor-pointer px-1">
          <input
            type="checkbox"
            checked={wantsMarketing}
            onChange={(e) => setWantsMarketing(e.target.checked)}
            className="mt-0.5 size-4 rounded border-gray-300 accent-amber-500"
          />
          <span className="text-sm text-muted-foreground leading-snug">
            Send me exclusive deals, promotions, and updates from ProWorx Mobile Detailing. You can unsubscribe anytime.
          </span>
        </label>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Button variant="link" className="p-0 h-auto font-medium" asChild>
            <Link to="/rewards/login">Sign in</Link>
          </Button>
        </p>
      </div>
    </div>
  );
}
