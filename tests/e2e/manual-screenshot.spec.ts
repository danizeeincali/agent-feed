import { test } from '@playwright/test';

/**
 * Manual screenshot capture for ticket status badge verification
 */

test.describe('Manual UI Screenshot Capture', () => {
  test.setTimeout(60000); // 1 minute

  test('Capture initial feed state with badges', async ({ page }) => {
    console.log('Navigating to application...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 30000 });

    console.log('Waiting for feed to load...');
    await page.waitForTimeout(3000);

    // Scroll to see more content
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(1000);

    console.log('Capturing full page screenshot...');
    await page.screenshot({
      path: '/workspaces/agent-feed/tests/screenshots/manual-feed-state.png',
      fullPage: true
    });

    console.log('Capturing viewport screenshot...');
    await page.screenshot({
      path: '/workspaces/agent-feed/tests/screenshots/manual-feed-viewport.png',
      fullPage: false
    });

    // Try to find any badges
    const badges = page.locator('[role="status"]');
    const badgeCount = await badges.count();
    console.log(`Found ${badgeCount} badge elements`);

    if (badgeCount > 0) {
      for (let i = 0; i < Math.min(badgeCount, 3); i++) {
        const badge = badges.nth(i);
        const text = await badge.textContent();
        console.log(`Badge ${i + 1}: "${text}"`);
      }
    }

    console.log('✓ Screenshots captured successfully');
  });

  test('Check for existing posts with LinkedIn URLs', async ({ page }) => {
    console.log('Navigating to application...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    console.log('Searching for LinkedIn URLs in posts...');
    const linkedinLinks = page.locator('a[href*="linkedin.com"]');
    const linkCount = await linkedinLinks.count();
    console.log(`Found ${linkCount} LinkedIn links`);

    // Get page content to search for badges
    const content = await page.content();
    const hasBadgeText = content.includes('Waiting for') ||
                         content.includes('analyzing') ||
                         content.includes('Analyzed by');

    console.log(`Badge text found in page: ${hasBadgeText}`);

    // Take screenshot
    await page.screenshot({
      path: '/workspaces/agent-feed/tests/screenshots/manual-existing-posts.png',
      fullPage: true
    });

    console.log('✓ Post analysis complete');
  });
});
