import { useQuery } from "convex/react";
import { createContext, useContext, type ReactNode } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

type UserRole = "owner" | "admin" | "employee" | null;

interface RoleContextValue {
  role: UserRole;
  isAdmin: boolean;       // owner or admin
  isEmployee: boolean;    // employee only
  isLoading: boolean;
  displayName: string;
  staffId: Id<"staff"> | null;
  payrollWorkerId: Id<"payrollWorkers"> | null;
  userId: Id<"users"> | null;
  email: string | null;
}

const RoleContext = createContext<RoleContextValue>({
  role: null,
  isAdmin: false,
  isEmployee: false,
  isLoading: true,
  displayName: "",
  staffId: null,
  payrollWorkerId: null,
  userId: null,
  email: null,
});

export function RoleProvider({ children }: { children: ReactNode }) {
  const profile = useQuery(api.userProfiles.getMyProfile);

  const value: RoleContextValue = {
    role: profile?.role ?? null,
    isAdmin: profile?.role === "owner" || profile?.role === "admin",
    isEmployee: profile?.role === "employee",
    isLoading: profile === undefined,
    displayName: profile?.profile?.displayName || profile?.name || profile?.email || "",
    staffId: (profile?.profile?.staffId as Id<"staff">) ?? null,
    payrollWorkerId: (profile?.profile?.payrollWorkerId as Id<"payrollWorkers">) ?? null,
    userId: profile?.userId ?? null,
    email: profile?.email ?? null,
  };

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useUserRole() {
  return useContext(RoleContext);
}
