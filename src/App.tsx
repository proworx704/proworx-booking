import { Navigate, Route, Routes } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";
import { AdminRoute } from "./components/AdminRoute";
import { AppLayout } from "./components/AppLayout";
import { ClientLayout } from "./components/ClientLayout";
import { ClientRoute } from "./components/ClientRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { PublicLayout } from "./components/PublicLayout";
import { PublicOnlyRoute } from "./components/PublicOnlyRoute";
import { Toaster } from "./components/ui/sonner";
import { ThemeProvider } from "./contexts/ThemeContext";
import {
  AvailabilityPage,
  BookingDetailPage,
  BookingPage,
  BookingsPage,
  CustomerDetailPage,
  CustomersPage,
  DashboardPage,
  FeedbackPage,
  LandingPage,
  LoginPage,
  ServiceFreezePage,
  ServicesPage,
  SettingsPage,
  SignupPage,
  StaffDetailPage,
  StaffPage,
} from "./pages";
import { BoatDetailingPage } from "./pages/BoatDetailingPage";
import { CatalogPage } from "./pages/CatalogPage";
import { IntakePage } from "./pages/IntakePage";
import { MembershipPage } from "./pages/MembershipPage";
import { ReceptionistPage } from "./pages/ReceptionistPage";
import { CalendarViewPage } from "./pages/CalendarViewPage";
import { ScheduleBlocksPage } from "./pages/ScheduleBlocksPage";
import { PayrollWorkersPage } from "./pages/PayrollWorkersPage";
import { PayrollTimeEntriesPage } from "./pages/PayrollTimeEntriesPage";
import { PayrollPayoutsPage } from "./pages/PayrollPayoutsPage";
import { PayrollTaxSettingsPage } from "./pages/PayrollTaxSettingsPage";
import { WebsiteEditorPage } from "./pages/WebsiteEditorPage";
import { EmployeeDashboardPage } from "./pages/EmployeeDashboardPage";
import { TeamPage } from "./pages/TeamPage";
import { MyTimeEntriesPage } from "./pages/MyTimeEntriesPage";
import { MyPayPage } from "./pages/MyPayPage";
import { StandaloneReceptionistPage } from "./pages/StandaloneReceptionistPage";
import PosCallbackPage from "./pages/PosCallbackPage";
import { MyCalendarPage } from "./pages/MyCalendarPage";
import { MyJobDetailPage } from "./pages/MyJobDetailPage";
// Loyalty — Admin
import { ReportsPage } from "./pages/ReportsPage";
import { AiAssistantPage } from "./pages/AiAssistantPage";
import { MarketingPage } from "./pages/MarketingPage";
import { ClientSupportPage } from "./pages/ClientSupportPage";
import { LoyaltyDashboardPage } from "./pages/LoyaltyDashboardPage";
import { LoyaltyRewardsPage } from "./pages/LoyaltyRewardsPage";
import { LoyaltyAmplifiersPage } from "./pages/LoyaltyAmplifiersPage";
import { LoyaltySettingsPage } from "./pages/LoyaltySettingsPage";
// Loyalty — Client Portal
import { ClientLoginPage } from "./pages/ClientLoginPage";
import { ClientRegisterPage } from "./pages/ClientRegisterPage";
import { ClientDashboardPage } from "./pages/ClientDashboardPage";
import { ClientPointsPage } from "./pages/ClientPointsPage";
import { ClientBookingsPage } from "./pages/ClientBookingsPage";
import { ClientRedeemPage } from "./pages/ClientRedeemPage";
import { ClientPromosPage } from "./pages/ClientPromosPage";
import { ClientProfilePage } from "./pages/ClientProfilePage";

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <Toaster />
        <ScrollToTop />
        <Routes>
          {/* Public pages */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/book" element={<BookingPage />} />
            <Route path="/boat-detailing" element={<BoatDetailingPage />} />
            <Route path="/memberships" element={<MembershipPage />} />
            <Route path="/feedback" element={<FeedbackPage />} />
            <Route element={<PublicOnlyRoute />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
            </Route>
          </Route>

          {/* Authenticated pages */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              {/* Employee portal routes (accessible by all roles) */}
              <Route path="/my/dashboard" element={<EmployeeDashboardPage />} />
              <Route path="/my/calendar" element={<MyCalendarPage />} />
              <Route path="/my/jobs/:id" element={<MyJobDetailPage />} />
              <Route path="/my/time-entries" element={<MyTimeEntriesPage />} />
              <Route path="/my/pay" element={<MyPayPage />} />

              {/* Admin-only routes (employees redirected to /my/dashboard) */}
              <Route element={<AdminRoute />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/calendar" element={<CalendarViewPage />} />
                <Route path="/bookings" element={<BookingsPage />} />
                <Route path="/bookings/:id" element={<BookingDetailPage />} />
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/customers/:id" element={<CustomerDetailPage />} />
                <Route path="/staff" element={<StaffPage />} />
                <Route path="/staff/:id" element={<StaffDetailPage />} />
                <Route path="/catalog" element={<CatalogPage />} />
                <Route path="/services" element={<ServicesPage />} />
                <Route path="/availability" element={<AvailabilityPage />} />
                <Route path="/schedule-blocks" element={<ScheduleBlocksPage />} />
                <Route path="/service-freeze" element={<ServiceFreezePage />} />
                <Route path="/receptionist" element={<ReceptionistPage />} />
                <Route path="/payroll/workers" element={<PayrollWorkersPage />} />
                <Route path="/payroll/time-entries" element={<PayrollTimeEntriesPage />} />
                <Route path="/payroll/payouts" element={<PayrollPayoutsPage />} />
                <Route path="/payroll/tax-settings" element={<PayrollTaxSettingsPage />} />
                <Route path="/website" element={<WebsiteEditorPage />} />
                <Route path="/team" element={<TeamPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/marketing" element={<MarketingPage />} />
                <Route path="/ai-assistant" element={<AiAssistantPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                {/* Loyalty Admin */}
                <Route path="/loyalty" element={<LoyaltyDashboardPage />} />
                <Route path="/loyalty/rewards" element={<LoyaltyRewardsPage />} />
                <Route path="/loyalty/amplifiers" element={<LoyaltyAmplifiersPage />} />
                <Route path="/loyalty/settings" element={<LoyaltySettingsPage />} />
              </Route>
            </Route>
          </Route>
          {/* Client Rewards Portal */}
          <Route element={<ProtectedRoute />}>
            <Route element={<ClientLayout />}>
              <Route element={<ClientRoute />}>
                <Route path="/rewards" element={<ClientDashboardPage />} />
                <Route path="/rewards/points" element={<ClientPointsPage />} />
                <Route path="/rewards/bookings" element={<ClientBookingsPage />} />
                <Route path="/rewards/redeem" element={<ClientRedeemPage />} />
                <Route path="/rewards/promos" element={<ClientPromosPage />} />
                <Route path="/rewards/support" element={<ClientSupportPage />} />
                <Route path="/rewards/profile" element={<ClientProfilePage />} />
              </Route>
            </Route>
          </Route>

          {/* Client Login/Register (public) */}
          <Route path="/rewards/login" element={<ClientLoginPage />} />
          <Route path="/rewards/register" element={<ClientRegisterPage />} />

          {/* Square POS callback — redirects back to dashboard after payment */}
          <Route path="/pos-callback" element={<PosCallbackPage />} />

          {/* Public standalone pages — shareable links, no login needed */}
          <Route path="/intake" element={<IntakePage />} />
          <Route path="/reception" element={<StandaloneReceptionistPage />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
