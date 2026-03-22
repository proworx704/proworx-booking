import { Navigate, Route, Routes } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";
import { AppLayout } from "./components/AppLayout";
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
import { MyTimeEntriesPage } from "./pages/MyTimeEntriesPage";
import { MyPayPage } from "./pages/MyPayPage";

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

          {/* Admin pages (auth required) */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
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
              <Route path="/settings" element={<SettingsPage />} />
              {/* Employee portal routes */}
              <Route path="/my/dashboard" element={<EmployeeDashboardPage />} />
              <Route path="/my/time-entries" element={<MyTimeEntriesPage />} />
              <Route path="/my/pay" element={<MyPayPage />} />
            </Route>
          </Route>

          {/* Public standalone intake page — shareable link, no login needed */}
          <Route path="/intake" element={<IntakePage />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
