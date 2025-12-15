import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:5173';
const SCREENSHOTS_DIR = '/workspaces/agent-feed/screenshots/after';

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function captureScreenshots() {
  console.log('🚀 Starting screenshot capture for simplified posting interface...\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  try {
    // ==========================================
    // DESKTOP SCREENSHOTS (1920x1080)
    // ==========================================
    console.log('📸 Capturing desktop screenshots...');
    const desktopPage = await context.newPage();
    await desktopPage.setViewportSize({ width: 1920, height: 1080 });
    await desktopPage.goto(BASE_URL, { waitUntil: 'networkidle' });

    // Wait for the component to be fully loaded
    await desktopPage.waitForSelector('nav[aria-label="Posting tabs"]', { timeout: 15000 });

    // 1. Desktop - Two tabs only (Quick Post and Avi DM)
    console.log('  ✓ Capturing: Two tabs only view');
    await desktopPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'desktop-two-tabs-only.png'),
      fullPage: false
    });

    // 2. Desktop - Quick Post empty state with 6 rows
    console.log('  ✓ Capturing: Quick Post empty state (6 rows)');
    const textarea = await desktopPage.locator('textarea').first();
    await textarea.click();
    await desktopPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'desktop-quick-post-empty-6rows.png'),
      fullPage: false
    });

    // 3. Desktop - Quick Post with 100 characters (counter HIDDEN)
    console.log('  ✓ Capturing: 100 characters (no counter)');
    await textarea.clear();
    const text100 = 'A'.repeat(100);
    await textarea.fill(text100);
    await desktopPage.waitForTimeout(500); // Wait for counter logic
    await desktopPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'desktop-100chars-no-counter.png'),
      fullPage: false
    });

    // 4. Desktop - Quick Post with 5000 characters (counter HIDDEN)
    console.log('  ✓ Capturing: 5000 characters (no counter)');
    await textarea.clear();
    const text5000 = 'B'.repeat(5000);
    await textarea.fill(text5000);
    await desktopPage.waitForTimeout(500);
    await desktopPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'desktop-5000chars-no-counter.png'),
      fullPage: false
    });

    // 5. Desktop - Quick Post with 9500 characters (counter GRAY)
    console.log('  ✓ Capturing: 9500 characters (gray counter)');
    await textarea.clear();
    const text9500 = 'C'.repeat(9500);
    await textarea.fill(text9500);
    await desktopPage.waitForTimeout(500);
    await desktopPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'desktop-9500chars-gray-counter.png'),
      fullPage: false
    });

    // 6. Desktop - Quick Post with 9700 characters (counter ORANGE)
    console.log('  ✓ Capturing: 9700 characters (orange counter)');
    await textarea.clear();
    const text9700 = 'D'.repeat(9700);
    await textarea.fill(text9700);
    await desktopPage.waitForTimeout(500);
    await desktopPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'desktop-9700chars-orange-counter.png'),
      fullPage: false
    });

    // 7. Desktop - Quick Post with 9900 characters (counter RED)
    console.log('  ✓ Capturing: 9900 characters (red counter)');
    await textarea.clear();
    const text9900 = 'E'.repeat(9900);
    await textarea.fill(text9900);
    await desktopPage.waitForTimeout(500);
    await desktopPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'desktop-9900chars-red-counter.png'),
      fullPage: false
    });

    // 8. Desktop - Textarea comparison showing 6 rows
    console.log('  ✓ Capturing: Textarea 6-row comparison');
    await textarea.clear();
    await textarea.fill('Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6');
    await desktopPage.waitForTimeout(500);
    await desktopPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'desktop-textarea-comparison.png'),
      fullPage: false
    });

    // 9. Desktop - Avi DM tab
    console.log('  ✓ Capturing: Avi DM tab');
    const aviTab = await desktopPage.locator('button:has-text("Avi DM")').first();
    await aviTab.click();
    await desktopPage.waitForTimeout(500);
    await desktopPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'desktop-avi-tab.png'),
      fullPage: false
    });

    await desktopPage.close();

    // ==========================================
    // MOBILE SCREENSHOTS (375x667)
    // ==========================================
    console.log('\n📱 Capturing mobile screenshots...');
    const mobilePage = await context.newPage();
    await mobilePage.setViewportSize({ width: 375, height: 667 });
    await mobilePage.goto(BASE_URL, { waitUntil: 'networkidle' });

    // Wait for the component to be fully loaded
    await mobilePage.waitForSelector('nav[aria-label="Posting tabs"]', { timeout: 15000 });

    // 10. Mobile - Quick Post interface with 6 rows
    console.log('  ✓ Capturing: Mobile Quick Post (6 rows)');
    const mobileTextarea = await mobilePage.locator('textarea').first();
    await mobileTextarea.click();
    await mobileTextarea.fill('Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6');
    await mobilePage.waitForTimeout(500);
    await mobilePage.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'mobile-quick-post-6rows.png'),
      fullPage: false
    });

    await mobilePage.close();

    console.log('\n✅ All screenshots captured successfully!\n');
    console.log('📁 Screenshots saved to:', SCREENSHOTS_DIR);

    // List all captured files
    console.log('\n📋 Captured files:');
    const files = fs.readdirSync(SCREENSHOTS_DIR);
    files.forEach(file => {
      const filePath = path.join(SCREENSHOTS_DIR, file);
      const stats = fs.statSync(filePath);
      console.log(`  - ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
    });

  } catch (error) {
    console.error('❌ Error capturing screenshots:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the script
captureScreenshots()
  .then(() => {
    console.log('\n🎉 Screenshot capture completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Screenshot capture failed:', error);
    process.exit(1);
  });
