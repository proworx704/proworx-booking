import { runTest } from "./auth";

runTest("Booking Flow - Full E2E", async (helper) => {
  const { page } = helper;

  // 1. Go to booking page
  await helper.goto("/book");
  await page.waitForSelector("text=Select a Service", { timeout: 10000 });

  // Verify services loaded
  const serviceCount = await page.locator("text=Express Detail").count();
  if (serviceCount === 0) throw new Error("Services not loaded");
  console.log("✅ Services loaded");

  // 2. Select "Full Detail"
  await page.locator("text=Full Detail").first().click();
  await page.waitForSelector("text=Vehicle Type", { timeout: 5000 });
  console.log("✅ Selected service, on vehicle step");

  // 3. Select Sedan
  await page.locator("text=Sedan / Car").click();
  await page.waitForSelector("text=Pick a Date & Time", { timeout: 5000 });
  console.log("✅ Selected sedan, on date/time step");

  // 4. Pick a date (click next Monday - first available weekday)
  // Find a non-disabled day button in the calendar
  const availableDays = page.locator(
    'button[name="day"]:not([disabled])',
  );
  const dayCount = await availableDays.count();
  if (dayCount === 0) throw new Error("No available dates in calendar");

  // Click the first available day
  await availableDays.first().click();
  await page.waitForTimeout(1000);

  // Check for time slots
  const timeSlots = page.locator('button:has-text("AM"), button:has-text("PM")');
  const slotCount = await timeSlots.count();
  if (slotCount === 0) throw new Error("No time slots available for selected date");
  console.log(`✅ Found ${slotCount} available time slots`);

  // Select first time slot
  await timeSlots.first().click();
  await page.waitForTimeout(500);

  // Click Next
  await page.locator('button:has-text("Next")').click();
  await page.waitForSelector("text=Your Information", { timeout: 5000 });
  console.log("✅ On customer info step");

  // 5. Fill customer info
  await page.fill("#name", "John Test");
  await page.fill("#phone", "(555) 123-4567");
  await page.fill("#email", "john@test.com");
  await page.fill("#address", "123 Main St, Charlotte, NC 28202");
  await page.fill("#notes", "Test booking from E2E test");

  // Click Next
  await page.locator('button:has-text("Next")').click();
  await page.waitForSelector("text=Confirm Your Booking", { timeout: 5000 });
  console.log("✅ On confirmation step");

  // Verify details shown
  const hasName = await page.locator("text=John Test").isVisible();
  const hasService = await page.locator("text=Full Detail").isVisible();
  const hasPrice = await page.locator("text=$250").isVisible();
  if (!hasName) throw new Error("Customer name not shown on confirmation");
  if (!hasService) throw new Error("Service name not shown on confirmation");
  if (!hasPrice) throw new Error("Price not shown on confirmation");
  console.log("✅ Confirmation details correct");

  // 6. Submit booking
  await page.locator('button:has-text("Confirm Booking")').click();
  await page.waitForSelector("text=Booking Confirmed", { timeout: 10000 });

  // Verify confirmation code
  const codeEl = page.locator("text=PW-");
  const hasCode = await codeEl.isVisible();
  if (!hasCode) throw new Error("Confirmation code not shown");
  console.log("✅ Booking confirmed with confirmation code!");

  // Screenshot the success page
  await page.screenshot({ path: "tmp/test-booking-success.png" });
  console.log("✅ Full booking flow test PASSED");
}).catch(() => process.exit(1));
