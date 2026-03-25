import { useMutation, useQuery } from "convex/react";
import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

type UserRole = "owner" | "admin" | "employee" | "client" | null;

interface RoleContextValue {
  role: UserRole;
  isAdmin: boolean;       // owner or admin
  isEmployee: boolean;    // employee only
  isClient: boolean;      // client portal user
  isLoading: boolean;
  displayName: string;
  staffId: Id<"staff"> | null;
  payrollWorkerId: Id<"payrollWorkers"> | null;
  customerId: Id<"customers"> | null;
  userId: Id<"users"> | null;
  email: string | null;
}

const RoleContext = createContext<RoleContextValue>({
  role: null,
  isAdmin: false,
  isEmployee: false,
  isClient: false,
  isLoading: true,
  displayName: "",
  staffId: null,
  payrollWorkerId: null,
  customerId: null,
  userId: null,
  email: null,
});

export function RoleProvider({ children }: { children: ReactNode }) {
  const profile = useQuery(api.userProfiles.getMyProfile);
  const initProfile = useMutation(api.userProfiles.initMyProfile);
  const didInit = useRef(false);

  // Auto-create a profile if the user is authenticated but has none,
  // OR auto-link payroll worker / staff if an employee profile is missing them.
  useEffect(() => {
    if (!profile || !profile.userId || didInit.current) return;

    const needsInit = profile.role === null; // no profile yet
    const needsLink =
      profile.role === "employee" &&
      profile.profile &&
      (!profile.profile.payrollWorkerId || !profile.profile.staffId);

    if (needsInit || needsLink) {
      didInit.current = true;
      initProfile().catch(() => {
        // Reset so it can retry on next render
        didInit.current = false;
      });
    }
  }, [profile, initProfile]);

  // Still loading if query hasn't resolved, or if we just triggered init
  const isInitializing = profile?.userId && profile?.role === null;

  const value: RoleContextValue = {
    role: profile?.role ?? null,
    isAdmin: profile?.role === "owner" || profile?.role === "admin",
    isEmployee: profile?.role === "employee",
    isClient: profile?.role === "client",
    isLoading: profile === undefined || isInitializing === true,
    displayName: profile?.profile?.displayName || profile?.name || profile?.email || "",
    staffId: (profile?.profile?.staffId as Id<"staff">) ?? null,
    payrollWorkerId: (profile?.profile?.payrollWorkerId as Id<"payrollWorkers">) ?? null,
    customerId: (profile?.profile?.customerId as Id<"customers">) ?? null,
    userId: profile?.userId ?? null,
    email: profile?.email ?? null,
  };

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useUserRole() {
  return useContext(RoleContext);
}
