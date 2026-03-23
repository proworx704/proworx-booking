import { chromium } from "playwright";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP = join(__dirname, "..", "tmp");

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  
  const url = process.env.APP_URL || "http://localhost:4199";
  console.log("Navigating to", url);
  
  // Load the app
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  
  // Click "Admin" button to get to sign-in
  const adminBtn = page.getByText("Admin");
  if (await adminBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log("Clicking Admin...");
    await adminBtn.click();
    await page.waitForTimeout(3000);
  }
  
  console.log("URL after Admin click:", page.url());
  
  // Now sign in - look for "Continue as Test User" or email form
  const testUserBtn = page.getByText("Continue as Test User");
  if (await testUserBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log("Clicking 'Continue as Test User'...");
    await testUserBtn.click();
    await page.waitForTimeout(5000);
  } else {
    const emailInput = page.locator("input[placeholder='you@example.com']");
    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log("Filling email/password...");
      await emailInput.fill("agent@test.local");
      await page.locator("input[type='password']").fill("TestAgent123!");
      
      const signInBtn = page.locator("button").filter({ hasText: /^Sign In$/ });
      await signInBtn.click();
      await page.waitForTimeout(5000);
    }
  }
  
  console.log("After login, URL:", page.url());
  
  // Navigate to bookings
  await page.goto(url + "/bookings", { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  
  const links = page.locator("a[href^='/bookings/']");
  const count = await links.count();
  console.log(`Found ${count} booking links`);
  
  if (count > 0) {
    await links.first().click();
    await page.waitForTimeout(3000);
    
    const content = await page.textContent("body") || "";
    const hasTakePayment = content.includes("Take Payment");
    const hasUndoPayment = content.includes("Undo Payment");
    console.log("Take Payment:", hasTakePayment, "| Undo Payment:", hasUndoPayment);
    
    // If unpaid, mark as paid via dialog
    if (hasTakePayment) {
      console.log("Marking as paid via Cash...");
      await page.getByRole("button", { name: /Take Payment/i }).click();
      await page.waitForTimeout(1500);
      
      // Switch to cash
      const combobox = page.locator("[role='combobox']").first();
      if (await combobox.isVisible().catch(() => false)) {
        await combobox.click();
        await page.waitForTimeout(500);
        const cashItem = page.locator("[role='option']").filter({ hasText: "Cash" });
        if (await cashItem.isVisible().catch(() => false)) {
          await cashItem.click();
          await page.waitForTimeout(500);
        }
      }
      
      const confirmBtn = page.getByRole("button", { name: /Confirm Payment/i });
      if (await confirmBtn.isVisible().catch(() => false)) {
        await confirmBtn.click();
        await page.waitForTimeout(3000);
        console.log("Marked as paid!");
      }
    }
    
    // Screenshot the paid state with Undo button
    await page.waitForTimeout(2000);
    await page.screenshot({ path: join(TMP, "undo-paid-state.png") });
    console.log("Saved: undo-paid-state.png");
    
    // Click Undo Payment
    const undoBtn = page.getByText("Undo Payment");
    if (await undoBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await undoBtn.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: join(TMP, "undo-confirm-dialog.png") });
      console.log("Saved: undo-confirm-dialog.png");
    }
  } else {
    await page.screenshot({ path: join(TMP, "undo-no-bookings.png") });
    console.log("No bookings in dev DB");
  }
  
  await browser.close();
  console.log("Done!");
}

main().catch(e => {
  console.error("Error:", e.message);
  process.exit(1);
});
