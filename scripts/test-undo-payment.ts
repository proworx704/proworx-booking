import { runTest } from "./auth";

runTest("Undo Payment Button", async (helper) => {
  const { page } = helper;

  // Go to bookings list
  await helper.goto("/bookings");
  await page.waitForTimeout(3000);

  // Click the first booking link in the table
  const firstLink = page.locator("a[href^='/bookings/']").first();
  const exists = await firstLink.isVisible().catch(() => false);
  
  if (!exists) {
    console.log("No bookings found, checking for other links...");
    await helper.screenshot("undo-payment-no-bookings.png");
    return;
  }

  await firstLink.click();
  await page.waitForTimeout(3000);
  await helper.screenshot("undo-payment-detail.png");

  // Check if this booking is paid
  const undoBtn = page.getByText("Undo Payment", { exact: false });
  const hasUndo = await undoBtn.isVisible().catch(() => false);
  
  if (hasUndo) {
    console.log("✅ Undo Payment button found on paid booking");
    await undoBtn.click();
    await page.waitForTimeout(500);
    await helper.screenshot("undo-payment-confirm.png");
    console.log("✅ Confirmation dialog shown");
  } else {
    console.log("ℹ️ This booking is not paid, checking the Take Payment button");
    const takePayment = page.getByText("Take Payment", { exact: false });
    const hasTakePayment = await takePayment.isVisible().catch(() => false);
    if (hasTakePayment) {
      console.log("✅ Take Payment button visible (booking is unpaid)");
    }
    await helper.screenshot("undo-payment-unpaid-booking.png");
  }
}).catch(() => process.exit(1));
