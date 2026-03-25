import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import {
  BarChart3,
  Bot,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  ChevronRight,
  Clock,
  ClipboardList,
  Contact,
  Gift,
  Globe,
  Headphones,
  LayoutDashboard,
  List,
  LogOut,
  Moon,
  Receipt,
  Rocket,
  Settings,
  Snowflake,
  Sparkles,
  Star,
  Sun,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import { useUserRole } from "@/contexts/RoleContext";
import { APP_NAME } from "@/lib/constants";
import { api } from "../../convex/_generated/api";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "./ui/sidebar";

// ─── Navigation Definitions ──────────────────────────────────────────────────

const mainNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/ai-assistant", label: "AI Assistant", icon: Bot },
  { href: "/customers", label: "Clients", icon: Contact },
  { href: "/staff", label: "Staff", icon: Users },
];

const payrollNav = [
  { href: "/team", label: "Team Accounts", icon: UserCog },
  { href: "/payroll/workers", label: "Workers", icon: Users },
  { href: "/payroll/time-entries", label: "Time Entries", icon: ClipboardList },
  { href: "/payroll/payouts", label: "Payouts", icon: Wallet },
  { href: "/payroll/tax-settings", label: "Tax Settings", icon: Receipt },
];

const loyaltyNav = [
  { href: "/loyalty", label: "Overview", icon: Star },
  { href: "/loyalty/rewards", label: "Rewards", icon: Gift },
  { href: "/loyalty/amplifiers", label: "Amplifiers", icon: Rocket },
  { href: "/loyalty/settings", label: "Settings", icon: Settings },
];

const toolsNav = [
  { href: "/receptionist", label: "Receptionist", icon: Headphones },
  { href: "/website", label: "Website Editor", icon: Globe },
];

const manageNav = [
  { href: "/catalog", label: "Service Catalog", icon: List },
  { href: "/services", label: "Legacy Services", icon: Sparkles },
  { href: "/availability", label: "Availability", icon: Clock },
  { href: "/schedule-blocks", label: "Schedule Blocks", icon: CalendarClock },
  { href: "/service-freeze", label: "Service Freeze", icon: Snowflake },
];

const employeeNav = [
  { href: "/my/dashboard", label: "My Dashboard", icon: LayoutDashboard },
  { href: "/my/calendar", label: "My Schedule", icon: CalendarDays },
  { href: "/my/time-entries", label: "My Time", icon: ClipboardList },
  { href: "/my/pay", label: "My Pay", icon: Wallet },
];

// ─── Components ──────────────────────────────────────────────────────────────

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

function NavLink({
  href,
  label,
  icon: Icon,
  isActive,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
}) {
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive}>
        <Link to={href} onClick={() => setOpenMobile(false)}>
          <Icon />
          <span>{label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function CollapsibleNavSection({
  label,
  icon: SectionIcon,
  items,
  pathname,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
  pathname: string;
}) {
  const { setOpenMobile } = useSidebar();

  // Auto-expand if current page is in this section
  const isActiveSection = items.some(
    (item) =>
      pathname === item.href || pathname.startsWith(item.href + "/"),
  );

  return (
    <Collapsible defaultOpen={isActiveSection} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton className="font-medium">
            <SectionIcon />
            <span>{label}</span>
            <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {items.map((item) => {
              const isActive =
                pathname === item.href ||
                pathname.startsWith(item.href + "/");
              return (
                <SidebarMenuSubItem key={item.href}>
                  <SidebarMenuSubButton asChild isActive={isActive}>
                    <Link to={item.href} onClick={() => setOpenMobile(false)}>
                      <item.icon className="size-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

function AdminSidebarNav() {
  const location = useLocation();
  const p = location.pathname;

  return (
    <SidebarContent>
      <SidebarMenu className="px-2 py-2 gap-1">
        {/* Main nav — always visible */}
        {mainNav.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            isActive={
              p === item.href ||
              (item.href === "/bookings" && p.startsWith("/bookings")) ||
              (item.href === "/customers" && p.startsWith("/customers")) ||
              (item.href === "/staff" && p.startsWith("/staff"))
            }
          />
        ))}

        {/* Collapsible sections */}
        <CollapsibleNavSection
          label="Loyalty"
          icon={Star}
          items={loyaltyNav}
          pathname={p}
        />
        <CollapsibleNavSection
          label="Payroll"
          icon={Wallet}
          items={payrollNav}
          pathname={p}
        />
        <CollapsibleNavSection
          label="Tools"
          icon={Headphones}
          items={toolsNav}
          pathname={p}
        />
        <CollapsibleNavSection
          label="Manage"
          icon={Settings}
          items={manageNav}
          pathname={p}
        />
      </SidebarMenu>
    </SidebarContent>
  );
}

function EmployeeSidebarNav() {
  const location = useLocation();
  const p = location.pathname;

  return (
    <SidebarContent>
      <SidebarMenu className="px-2 py-2 gap-1">
        {employeeNav.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            isActive={p === item.href || p.startsWith(item.href + "/")}
          />
        ))}
      </SidebarMenu>
    </SidebarContent>
  );
}

function SidebarUserMenu() {
  const user = useQuery(api.auth.currentUser);
  const { signOut } = useAuthActions();
  const { theme, toggleTheme, switchable } = useTheme();
  const { setOpenMobile } = useSidebar();
  const { role, displayName } = useUserRole();

  const roleBadge =
    role === "owner" ? "Owner" : role === "admin" ? "Admin" : role === "employee" ? "Employee" : "";

  return (
    <SidebarFooter className="border-t border-sidebar-border">
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton size="lg">
                <Avatar className="size-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                    {(displayName || user?.name || "U").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start text-left min-w-0">
                  <span className="text-sm font-medium truncate">
                    {displayName || user?.name || "User"}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {roleBadge ? `${roleBadge} · ` : ""}{user?.email}
                  </span>
                </div>
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              align="start"
              className="w-[--radix-dropdown-menu-trigger-width]"
            >
              {role !== "employee" && (
                <DropdownMenuItem asChild>
                  <Link to="/settings" onClick={() => setOpenMobile(false)}>
                    <Settings className="size-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
              )}
              {switchable && (
                <DropdownMenuItem onClick={toggleTheme}>
                  {theme === "light" ? (
                    <Moon className="size-4" />
                  ) : (
                    <Sun className="size-4" />
                  )}
                  {theme === "light" ? "Dark mode" : "Light mode"}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut()}
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <LogOut className="size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  );
}

function SidebarHeaderContent() {
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarHeader className="border-b border-sidebar-border">
      <Link
        to="/"
        onClick={() => setOpenMobile(false)}
        className="flex items-center gap-2.5 px-2 py-1 font-semibold text-lg"
      >
        <img src="/favicon-192.png" alt="ProWorx" className="size-8 rounded-lg" />
        <span>{APP_NAME}</span>
      </Link>
    </SidebarHeader>
  );
}

export function AppSidebar() {
  const { isAdmin } = useUserRole();

  return (
    <Sidebar>
      <SidebarHeaderContent />
      {isAdmin ? <AdminSidebarNav /> : <EmployeeSidebarNav />}
      <SidebarUserMenu />
    </Sidebar>
  );
}
