import { chromium } from 'playwright';

async function captureScreenshots() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const screenshotsDir = '/workspaces/agent-feed/screenshots/before';
  const baseUrl = 'http://localhost:5173';

  try {
    console.log('Navigating to the posting interface...');
    await page.goto(baseUrl, { waitUntil: 'networkidle' });

    // Wait for the posting interface to load - look for the tab navigation
    await page.waitForSelector('nav[aria-label="Posting tabs"]', { timeout: 10000 });
    await page.waitForTimeout(2000); // Give time for all components to render

    // 1. Desktop view - All tabs visible (Quick Post active by default)
    console.log('Capturing: desktop-all-tabs.png');
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: `${screenshotsDir}/desktop-all-tabs.png`,
      fullPage: false
    });

    // 2. Quick Post tab - empty state
    console.log('Capturing: desktop-quick-post-empty.png');
    // Click Quick Post tab to ensure it's active - use aria-label to be specific
    const quickPostTab = page.locator('nav[aria-label="Posting tabs"] button:has-text("Quick Post")');
    await quickPostTab.click();
    await page.waitForTimeout(500);

    // Clear textarea if there's any content - using placeholder text
    const textarea = page.locator('textarea[placeholder*="What\'s on your mind"]');
    await textarea.clear();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: `${screenshotsDir}/desktop-quick-post-empty.png`,
      fullPage: false
    });

    // 3. Quick Post - partial text (250 chars)
    console.log('Capturing: desktop-quick-post-partial.png');
    const partialText = 'A'.repeat(250);
    await textarea.fill(partialText);
    await page.waitForTimeout(500);

    await page.screenshot({
      path: `${screenshotsDir}/desktop-quick-post-partial.png`,
      fullPage: false
    });

    // 4. Quick Post - at limit (500 chars)
    console.log('Capturing: desktop-quick-post-limit.png');
    const limitText = 'B'.repeat(500);
    await textarea.fill(limitText);
    await page.waitForTimeout(500);

    await page.screenshot({
      path: `${screenshotsDir}/desktop-quick-post-limit.png`,
      fullPage: false
    });

    // Clear for next screenshots
    await textarea.clear();
    await page.waitForTimeout(500);

    // 5. Post tab active
    console.log('Capturing: desktop-post-tab.png');
    const postTab = page.getByRole('button', { name: 'Post', exact: true });
    await postTab.click();
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: `${screenshotsDir}/desktop-post-tab.png`,
      fullPage: false
    });

    // 6. Avi DM tab active
    console.log('Capturing: desktop-avi-tab.png');
    const aviTab = page.locator('nav[aria-label="Posting tabs"] button:has-text("Avi DM")');
    await aviTab.click();
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: `${screenshotsDir}/desktop-avi-tab.png`,
      fullPage: false
    });

    // 7. Mobile view - Quick Post
    console.log('Capturing: mobile-quick-post.png');
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);

    // Go back to Quick Post tab
    const quickPostTabMobile = page.locator('nav[aria-label="Posting tabs"] button:has-text("Quick Post")');
    await quickPostTabMobile.click();
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: `${screenshotsDir}/mobile-quick-post.png`,
      fullPage: false
    });

    console.log('\n✅ All screenshots captured successfully!');
    console.log('\nScreenshots saved to:');
    console.log('- desktop-all-tabs.png');
    console.log('- desktop-quick-post-empty.png');
    console.log('- desktop-quick-post-partial.png');
    console.log('- desktop-quick-post-limit.png');
    console.log('- desktop-post-tab.png');
    console.log('- desktop-avi-tab.png');
    console.log('- mobile-quick-post.png');

  } catch (error) {
    console.error('❌ Error capturing screenshots:', error.message);
    // Take a debug screenshot to see what's on the page
    try {
      await page.screenshot({
        path: `${screenshotsDir}/debug-error.png`,
        fullPage: true
      });
      console.log('Debug screenshot saved to debug-error.png');
    } catch (e) {
      console.error('Could not save debug screenshot');
    }
    throw error;
  } finally {
    await browser.close();
  }
}

captureScreenshots()
  .then(() => {
    console.log('\n✨ Screenshot capture complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Screenshot capture failed:', error);
    process.exit(1);
  });
