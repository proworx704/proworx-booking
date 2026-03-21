import { runTest } from "./auth";

runTest("Address Link Screenshot", async (helper) => {
  const { page } = helper;

  // Go to bookings list
  await helper.goto("/bookings");
  await page.waitForTimeout(2500);

  // Click the first booking
  const firstBooking = page.locator('a[href^="/bookings/"]').first();
  await firstBooking.click();
  await page.waitForTimeout(2000);

  // Hover over the address to show the "Open in Google Maps" text
  const addressLink = page.locator('a[href*="google.com/maps"]');
  await addressLink.hover();
  await page.waitForTimeout(500);

  await helper.screenshot("phase3-clickable-address.png");
  console.log("📸 Clickable address with Google Maps link");
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
