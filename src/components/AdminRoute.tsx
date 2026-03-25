import { Navigate, Outlet } from "react-router-dom";
import { useUserRole } from "@/contexts/RoleContext";

/**
 * Route guard that only allows owner/admin users.
 * Clients → rewards portal, employees → employee portal.
 */
export function AdminRoute() {
  const { isAdmin, isClient, isLoading } = useUserRole();

  if (isLoading) return null;

  if (isClient) return <Navigate to="/rewards" replace />;

  // Only owner/admin roles can access admin routes.
  // Employees and unassigned users go to the employee dashboard.
  if (!isAdmin) {
    return <Navigate to="/my/dashboard" replace />;
  }

  return <Outlet />;
}
