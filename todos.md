# Phase 2: Staff & Service Control

## Backend (Convex)

### Schema changes
- [x] Add `staff` table (name, phone, email, role, isActive, color for calendar)
- [x] Add `staffServices` table (staffId, serviceId) — many-to-many linking
- [x] Add `staffAvailability` table (staffId, dayOfWeek, startTime, endTime, isAvailable)
- [x] Add `serviceFreeze` table (serviceId, date, reason) — per-service blocked dates
- [x] Add `staffId` field to bookings (optional, for staff assignment)
- [x] Update bookings schema

### Backend functions
- [x] `convex/staff.ts` — CRUD for staff members, seed Tyler as owner
- [x] `convex/staffServices.ts` — Assign/unassign services to staff
- [x] `convex/staffAvailability.ts` — Per-staff schedule management
- [x] `convex/serviceFreeze.ts` — Per-service date blocking
- [x] Update `convex/availability.ts` — getAvailableSlots should consider staff availability + service freezes
- [x] Update `convex/bookings.ts` — Support staff assignment

## Frontend

### New admin pages
- [x] `StaffPage.tsx` — List staff, add/edit/delete, assign services
- [x] `StaffDetailPage.tsx` — Staff details, availability, assigned services
- [x] `ServiceFreezePage.tsx` — Per-service date blocking UI (or add to existing AvailabilityPage)

### Updates to existing pages
- [x] Update `BookingDetailPage.tsx` — Show/assign staff to booking
- [x] Update `BookingsPage.tsx` — Show assigned staff
- [x] Update sidebar/navigation — Add Staff link
- [x] Update booking flow — Factor in service freeze dates

## Build & Deploy
- [x] `bun run sync:build`
- [x] Screenshots
- [x] Deploy preview
- [x] Notify Tyler
