# Dashboard Analytics & Reports - Todo

## Clickable Dashboard Stat Cards
- [x] Update `convex/bookings.ts` - add `paymentStatus`, `startDate`, `endDate` filters
- [x] Update `src/pages/DashboardPage.tsx` - make stat cards clickable `<Link>` components
- [x] Update `src/pages/BookingsPage.tsx` - support URL search params (`view=today|upcoming|unpaid`)
- [x] Add payment status filter dropdown to BookingsPage
- [x] Add active filter banner + clear filters button

## Reports & Analytics Page
- [x] Create `convex/analytics.ts` with queries (overview, revenueOverTime, servicePerformance, staffProductivity, customerInsights, statusBreakdown)
- [x] Create `src/pages/ReportsPage.tsx` with full analytics UI
- [x] Add `/reports` route to `App.tsx`
- [x] Add "Reports" to sidebar with BarChart3 icon

## Deploy
- [x] Build passes (`bun run sync:build`)
- [x] Screenshots taken for dashboard, reports, unpaid filter
- [x] Push to GitHub
- [x] Deploy to preview: https://preview-proworx-booking-8ee2b7c6.viktor.space
- [x] Notify Tyler with preview + screenshots
- [ ] Await Tyler's approval
- [ ] Deploy to production
