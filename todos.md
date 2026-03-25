# Dashboard Enhancements for Tyler

## Part 1: Clickable Stat Cards (Quick Win)
- [x] Update `bookings.list` query to support `paymentStatus` and date range filters
- [x] Update `BookingsPage.tsx` to read URL search params + add payment status filter
- [x] Make dashboard stat cards clickable links to filtered bookings views
- [x] Add hover effects / cursor pointer to stat cards

## Part 2: Reports & Analytics Section
- [x] Create `convex/analytics.ts` backend with aggregation queries
  - Revenue by period (daily/weekly/monthly)
  - Booking counts by status, service, staff
  - Customer insights (new vs returning, top customers)
  - Service performance (most popular, highest revenue)
  - Staff productivity (bookings per staff, revenue per staff)
- [x] Create `src/pages/ReportsPage.tsx` with full analytics dashboard
  - Date range picker
  - KPI summary cards
  - Revenue trend chart (line/bar)
  - Bookings by service (pie/bar chart)
  - Staff performance table
  - Customer insights
- [x] Add route to App.tsx
- [x] Add "Reports" to sidebar navigation
- [x] Wire up filters (date range, service, staff, status)

## Part 3: Build & Deploy
- [ ] `bun run sync:build`
- [ ] Take screenshots
- [ ] Deploy preview
- [ ] Notify Tyler with screenshots
- [ ] Wait for approval → deploy production
