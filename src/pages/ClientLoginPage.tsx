import { useConvexAuth } from "convex/react";
import { Link, Navigate } from "react-router-dom";
import { useUserRole } from "@/contexts/RoleContext";
import { SignIn } from "@/components/SignIn";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";

export function ClientLoginPage() {
  const { isAuthenticated } = useConvexAuth();
  const { isClient, isAdmin, isEmployee, isLoading } = useUserRole();

  // If already authenticated, redirect to appropriate area
  if (isAuthenticated && !isLoading) {
    if (isClient) return <Navigate to="/rewards" replace />;
    if (isAdmin) return <Navigate to="/dashboard" replace />;
    if (isEmployee) return <Navigate to="/my/dashboard" replace />;
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4 relative min-h-svh bg-gradient-to-b from-amber-50/50 to-white dark:from-amber-950/20 dark:to-background">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/4 size-96 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 size-96 rounded-full bg-orange-500/5 blur-3xl" />
      </div>

      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <img src="/favicon-192.png" alt="ProWorx" className="mx-auto size-14 rounded-xl mb-4" />
          <div className="flex items-center justify-center gap-2">
            <Star className="size-5 text-amber-500" />
            <h1 className="text-2xl font-bold tracking-tight">ProWorx Rewards</h1>
            <Star className="size-5 text-amber-500" />
          </div>
          <p className="text-muted-foreground text-sm">
            Sign in to view your loyalty points and rewards
          </p>
        </div>

        <SignIn />

        <p className="text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Button variant="link" className="p-0 h-auto font-medium" asChild>
            <Link to="/rewards/register">Create one</Link>
          </Button>
        </p>

        <p className="text-center text-xs text-muted-foreground">
          Looking for the team portal?{" "}
          <Button variant="link" className="p-0 h-auto text-xs" asChild>
            <Link to="/login">Staff login →</Link>
          </Button>
        </p>
      </div>
    </div>
  );
}
