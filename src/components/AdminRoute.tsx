import { Navigate, Outlet } from "react-router-dom";
import { useUserRole } from "@/contexts/RoleContext";

/**
 * Route guard that only allows owner/admin users.
 * Everyone else (employees AND users without a profile) gets
 * redirected to the employee portal.
 */
export function AdminRoute() {
  const { isAdmin, isLoading } = useUserRole();

  if (isLoading) return null;

  // Only owner/admin roles can access admin routes.
  // Employees and unassigned users go to the employee dashboard.
  if (!isAdmin) {
    return <Navigate to="/my/dashboard" replace />;
  }

  return <Outlet />;
}
