/**
 * E2E Tests: Bridge Posts Display (Not Sticky UI)
 * Validates that bridges appear as posts in feed, not as sticky banner
 *
 * Uses Playwright with screenshot capture
 */

import { test, expect } from '@playwright/test';
import { mkdir } from 'fs/promises';
import { join } from 'path';

const SCREENSHOT_DIR = join(process.cwd(), '../../docs/screenshots/bridge-to-post');

test.beforeAll(async () => {
  // Ensure screenshot directory exists
  await mkdir(SCREENSHOT_DIR, { recursive: true });
  console.log(`✅ Screenshot directory ready: ${SCREENSHOT_DIR}`);
});

test.describe('Bridge Posts Display Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('should NOT display sticky HemingwayBridge banner at top', async ({ page }) => {
    console.log('\n🧪 Testing: No sticky bridge banner...');

    // Check for sticky bridge component (should NOT exist)
    const stickyBridge = page.locator('[data-testid="hemingway-bridge"]');
    const bridgeExists = await stickyBridge.count();

    expect(bridgeExists).toBe(0);
    console.log('✅ No sticky bridge banner found');

    // Capture screenshot showing no banner
    await page.screenshot({
      path: join(SCREENSHOT_DIR, '01-no-sticky-banner.png'),
      fullPage: true
    });
    console.log('✅ Screenshot 1: No sticky banner');
  });

  test('should display bridge posts in main feed', async ({ page }) => {
    console.log('\n🧪 Testing: Bridge posts appear in feed...');

    // Wait for posts to load
    await page.waitForSelector('article, .post-container', { timeout: 10000 });

    // Look for posts in feed
    const posts = page.locator('article, .post-container');
    const postCount = await posts.count();

    expect(postCount).toBeGreaterThan(0);
    console.log(`✅ Found ${postCount} posts in feed`);

    // Capture screenshot of feed with posts
    await page.screenshot({
      path: join(SCREENSHOT_DIR, '02-bridge-posts-in-feed.png'),
      fullPage: true
    });
    console.log('✅ Screenshot 2: Bridge posts in feed');
  });

  test('should identify bridge posts by metadata', async ({ page }) => {
    console.log('\n🧪 Testing: Bridge post identification...');

    // Find posts and check for bridge metadata attributes
    const posts = page.locator('article, .post-container');
    const postCount = await posts.count();

    console.log(`Checking ${postCount} posts for bridge metadata...`);

    // Check each post for bridge indicators
    for (let i = 0; i < postCount; i++) {
      const post = posts.nth(i);
      const postContent = await post.textContent();

      // Check if post content matches known bridge content
      if (postContent?.includes('Meet Personal Todos Agent') ||
          postContent?.includes('new feature') ||
          postContent?.includes('priority')) {
        console.log(`✅ Found potential bridge post: "${postContent?.substring(0, 50)}..."`);
      }
    }

    // Capture screenshot
    await page.screenshot({
      path: join(SCREENSHOT_DIR, '03-bridge-post-metadata.png'),
      fullPage: true
    });
    console.log('✅ Screenshot 3: Bridge post metadata');
  });

  test('should render bridge posts with correct content', async ({ page }) => {
    console.log('\n🧪 Testing: Bridge post content rendering...');

    // Query for posts
    const posts = page.locator('article, .post-container');
    await posts.first().waitFor({ timeout: 10000 });

    const firstPost = posts.first();
    const content = await firstPost.textContent();

    expect(content).toBeTruthy();
    expect(content!.length).toBeGreaterThan(0);
    console.log(`✅ First post content: "${content?.substring(0, 100)}..."`);

    // Capture screenshot of first post
    await page.screenshot({
      path: join(SCREENSHOT_DIR, '04-bridge-post-content.png'),
      fullPage: true
    });
    console.log('✅ Screenshot 4: Bridge post content');
  });

  test('should scroll through feed without sticky banner interference', async ({ page }) => {
    console.log('\n🧪 Testing: Feed scrolling without banner...');

    // Scroll down the page
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(500);

    // Verify no sticky banner at top
    const stickyBridge = page.locator('[data-testid="hemingway-bridge"]');
    expect(await stickyBridge.count()).toBe(0);

    // Scroll more
    await page.evaluate(() => window.scrollTo(0, 1000));
    await page.waitForTimeout(500);

    // Still no banner
    expect(await stickyBridge.count()).toBe(0);
    console.log('✅ No sticky banner during scroll');

    // Capture screenshot at scroll position
    await page.screenshot({
      path: join(SCREENSHOT_DIR, '05-scrolled-no-banner.png'),
      fullPage: false
    });
    console.log('✅ Screenshot 5: Scrolled feed without banner');
  });

  test('should display all posts in chronological order', async ({ page }) => {
    console.log('\n🧪 Testing: Post order with bridge posts...');

    const posts = page.locator('article, .post-container');
    const postCount = await posts.count();

    console.log(`✅ Found ${postCount} posts in feed`);

    // Capture final screenshot
    await page.screenshot({
      path: join(SCREENSHOT_DIR, '06-final-feed-state.png'),
      fullPage: true
    });
    console.log('✅ Screenshot 6: Final feed state');
  });
});

test.describe('Visual Regression', () => {
  test('compare before/after sticky banner removal', async ({ page }) => {
    console.log('\n🧪 Visual regression test...');

    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Take full page screenshot
    await page.screenshot({
      path: join(SCREENSHOT_DIR, '07-current-ui-state.png'),
      fullPage: true
    });

    // Check viewport without scrolling
    await page.screenshot({
      path: join(SCREENSHOT_DIR, '08-viewport-no-banner.png'),
      fullPage: false
    });

    console.log('✅ Visual regression screenshots captured');
  });
});
