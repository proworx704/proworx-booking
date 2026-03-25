# ProWorx Loyalty Program - Build Plan

## Phase 1: Backend Schema & Functions
- [ ] Add loyalty tables to schema.ts (loyaltyAccounts, loyaltyTransactions, loyaltyRewards, loyaltyAmplifiers)
- [ ] Add "client" role to userProfiles
- [ ] Create convex/loyalty.ts — core functions (earn, redeem, adjust, balance)
- [ ] Create convex/loyaltyRewards.ts — CRUD for rewards
- [ ] Create convex/loyaltyAmplifiers.ts — CRUD for amplifiers
- [ ] Sync & verify schema pushes

## Phase 2: Admin Pages
- [ ] LoyaltyDashboardPage.tsx — overview of program stats, top customers
- [ ] LoyaltyRewardsPage.tsx — manage rewards (create/edit/toggle)
- [ ] LoyaltyAmplifiersPage.tsx — manage promos (create/edit/toggle)
- [ ] Add loyalty tab to CustomerDetailPage.tsx — see/adjust individual customer points
- [ ] Add routes in App.tsx

## Phase 3: Client Portal
- [ ] Client login/signup flow (links to customer record)
- [ ] ClientDashboardPage.tsx — points balance, booking history, active promos
- [ ] ClientProfilePage.tsx — profile info, vehicle
- [ ] ClientRewardsPage.tsx — browse & redeem rewards
- [ ] Client-facing layout & navigation
- [ ] Add routes in App.tsx

## Phase 4: Integration
- [ ] Auto-award points when booking marked completed/paid
- [ ] Apply amplifiers during point calculation
- [ ] Point redemption flow at checkout (admin side)

## Phase 5: Polish & Deploy
- [ ] E2E tests
- [ ] sync:build
- [ ] Screenshots
- [ ] Deploy preview
- [ ] Notify Tyler
- [ ] Deploy production (after approval)
