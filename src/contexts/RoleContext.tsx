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
  isLoading: boolean;     // true only while query is in-flight
  hasProfile: boolean;    // true if user has a userProfile record
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
  hasProfile: false,
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

  // Only auto-init for EXISTING profiles that need linking (employee payroll/staff).
  // New user profile creation is handled by register/login pages directly.
  useEffect(() => {
    if (!profile || !profile.userId || didInit.current) return;

    // Only auto-link for employees missing payroll/staff links
    const needsLink =
      profile.role === "employee" &&
      profile.profile &&
      (!profile.profile.payrollWorkerId || !profile.profile.staffId);

    if (needsLink) {
      didInit.current = true;
      initProfile().catch(() => {
        didInit.current = false;
      });
    }
  }, [profile, initProfile]);

  const value: RoleContextValue = {
    role: profile?.role ?? null,
    isAdmin: profile?.role === "owner" || profile?.role === "admin",
    isEmployee: profile?.role === "employee",
    isClient: profile?.role === "client",
    // isLoading = true only when query hasn't resolved yet (not when profile is missing)
    isLoading: profile === undefined,
    hasProfile: !!profile?.profile,
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
