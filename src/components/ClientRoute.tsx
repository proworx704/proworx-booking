import { Navigate, Outlet } from "react-router-dom";
import { useUserRole } from "@/contexts/RoleContext";

/**
 * Route guard for client-only pages.
 * Admins/employees get redirected to their respective dashboards.
 * Unauthenticated users go to client login.
 */
export function ClientRoute() {
  const { isClient, isAdmin, isEmployee, isLoading } = useUserRole();

  if (isLoading) return null;

  if (isAdmin) return <Navigate to="/dashboard" replace />;
  if (isEmployee) return <Navigate to="/my/dashboard" replace />;
  if (!isClient) return <Navigate to="/rewards/login" replace />;

  return <Outlet />;
}
