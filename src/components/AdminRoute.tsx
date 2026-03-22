import { Navigate, Outlet } from "react-router-dom";
import { useUserRole } from "@/contexts/RoleContext";

/**
 * Route guard that only allows owner/admin users.
 * Employees get redirected to their personal dashboard.
 * While loading, renders nothing (prevents flash).
 */
export function AdminRoute() {
  const { isEmployee, isLoading } = useUserRole();

  if (isLoading) return null;

  if (isEmployee) {
    return <Navigate to="/my/dashboard" replace />;
  }

  // If no role assigned yet, still let them see admin pages
  // (Tyler or new signups before being assigned a role)
  return <Outlet />;
}
