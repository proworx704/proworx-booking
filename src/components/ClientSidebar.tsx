import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import {
  CalendarCheck,
  Gift,
  LayoutDashboard,
  LogOut,
  Moon,
  Rocket,
  Star,
  Sun,
  User,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import { useUserRole } from "@/contexts/RoleContext";
import { api } from "../../convex/_generated/api";
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
  useSidebar,
} from "./ui/sidebar";

const clientNav = [
  { href: "/rewards", label: "Dashboard", icon: LayoutDashboard },
  { href: "/rewards/points", label: "My Points", icon: Star },
  { href: "/rewards/bookings", label: "My Bookings", icon: CalendarCheck },
  { href: "/rewards/redeem", label: "Rewards", icon: Gift },
  { href: "/rewards/promos", label: "Bonus Promos", icon: Rocket },
  { href: "/rewards/profile", label: "My Profile", icon: User },
];

export function ClientSidebar() {
  const location = useLocation();
  const p = location.pathname;
  const user = useQuery(api.auth.currentUser);
  const { signOut } = useAuthActions();
  const { theme, toggleTheme, switchable } = useTheme();
  const { displayName } = useUserRole();
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar>
      {/* Header */}
      <SidebarHeader className="border-b border-sidebar-border">
        <Link
          to="/rewards"
          onClick={() => setOpenMobile(false)}
          className="flex items-center gap-2.5 px-2 py-1 font-semibold text-lg"
        >
          <img src="/favicon-192.png" alt="ProWorx" className="size-8 rounded-lg" />
          <span>ProWorx Rewards</span>
        </Link>
      </SidebarHeader>

      {/* Nav */}
      <SidebarContent>
        <SidebarMenu className="px-2 py-2 gap-1">
          {clientNav.map((item) => {
            const isActive =
              (item.href === "/rewards" && p === "/rewards") ||
              (item.href !== "/rewards" && p.startsWith(item.href));
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={isActive}>
                  <Link to={item.href} onClick={() => setOpenMobile(false)}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      {/* Footer — user menu */}
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg">
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-amber-500 text-white text-sm font-medium">
                      {(displayName || user?.name || "C").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-left min-w-0">
                    <span className="text-sm font-medium truncate">
                      {displayName || user?.name || "Client"}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {user?.email}
                    </span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="start"
                className="w-[--radix-dropdown-menu-trigger-width]"
              >
                {switchable && (
                  <DropdownMenuItem onClick={toggleTheme}>
                    {theme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
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
    </Sidebar>
  );
}
