import { useConvexAuth } from "convex/react";
import { ArrowRight, Calendar, LogIn } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { APP_NAME } from "@/lib/constants";
import { Button } from "./ui/button";

export function Header() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const location = useLocation();

  const isAuthPage =
    location.pathname === "/login" || location.pathname === "/signup";
  const isBookingPage = location.pathname === "/book";

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
      <div className="container">
        <div className="flex h-16 items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2.5 font-semibold text-lg hover:opacity-80 transition-opacity"
          >
            <img src="/favicon-192.png" alt="ProWorx" className="size-8 rounded-lg" />
            <span className="hidden sm:inline">{APP_NAME}</span>
          </Link>

          <nav className="flex items-center gap-2">
            {!isBookingPage && (
              <Button size="sm" asChild className="bg-blue-600 hover:bg-blue-700">
                <Link to="/book">
                  Book Now
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            )}
            {isLoading ? null : isAuthenticated ? (
              <Button size="sm" variant="outline" asChild>
                <Link to="/dashboard">
                  Admin
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            ) : (
              !isAuthPage && (
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/login">
                    <LogIn className="size-4" />
                    Admin
                  </Link>
                </Button>
              )
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
