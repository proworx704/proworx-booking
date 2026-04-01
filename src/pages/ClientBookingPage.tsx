import { BookingPage } from "./BookingPage";

/**
 * Thin wrapper that renders the BookingPage inside the Client Portal layout.
 * The BookingPage automatically detects it's inside /rewards/* and adapts:
 * - Pre-fills customer info from profile
 * - Skips account creation step (user is already authenticated)
 * - Shows portal-aware success screen with "View My Bookings" link
 */
export function ClientBookingPage() {
  return <BookingPage />;
}
