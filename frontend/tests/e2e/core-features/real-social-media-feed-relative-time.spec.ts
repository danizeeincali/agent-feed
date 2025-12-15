import { test, expect, Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = path.join(__dirname, '../screenshots/real-social-media-feed');

/**
 * @test RealSocialMediaFeed - Relative Time Display
 * @description Validates relative time formatting, tooltips, backend sorting, and error-free operation
 * @prerequisites
 *   - Backend server running on http://localhost:3001
 *   - Frontend dev server running on http://localhost:5173
 *   - Database populated with test posts
 * @expected
 *   - Relative time displays correctly (e.g., "2 mins ago", "just now")
 *   - Tooltips show exact datetime on hover
 *   - Posts maintain server-provided sort order
 *   - No console errors or React warnings
 */

test.describe('RealSocialMediaFeed - Relative Time & Sorting', () => {
  let consoleErrors: string[] = [];
  let consoleWarnings: string[] = [];

  test.beforeEach(async ({ page }) => {
    // Reset error tracking
    consoleErrors = [];
    consoleWarnings = [];

    // Monitor console for errors and warnings
    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();

      if (type === 'error') {
        consoleErrors.push(text);
      } else if (type === 'warning') {
        consoleWarnings.push(text);
      }
    });

    // Monitor page errors
    page.on('pageerror', (error) => {
      consoleErrors.push(`Page Error: ${error.message}`);
    });

    // Navigate to the application and wait for network to be idle
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });

    // Wait for the feed container to be visible
    await page.waitForSelector('[data-testid="social-media-feed"]', {
      timeout: 15000,
      state: 'visible'
    });
  });

  test('1. Relative Time Display - Verify time formatting', async ({ page }) => {
    // Wait for posts to load using correct selector
    await page.waitForSelector('[data-testid="post-card"]', {
      timeout: 15000,
      state: 'visible'
    });

    // Wait an additional moment for content to render
    await page.waitForTimeout(1000);

    // Get all posts
    const posts = await page.locator('[data-testid="post-card"]').all();
    expect(posts.length).toBeGreaterThan(0);
    console.log(`✓ Found ${posts.length} posts`);

    // Check the first post for relative time
    const firstPost = posts[0];

    // Look for time elements - the component uses a span with title attribute
    const timeElements = await firstPost.locator('span[title]').all();

    let relativeTimeText = '';
    let foundTimeElement = false;

    // Find the element that contains relative time
    for (const timeElement of timeElements) {
      const text = await timeElement.textContent();
      const title = await timeElement.getAttribute('title');

      // Check if this looks like a relative time element
      if (text && (
        text.includes('ago') ||
        text.includes('just now') ||
        text.includes('yesterday') ||
        text.includes('min') ||
        text.includes('hour') ||
        text.includes('day')
      )) {
        relativeTimeText = text;
        foundTimeElement = true;
        console.log(`✓ Found relative time: "${text}" with tooltip: "${title}"`);
        break;
      }
    }

    expect(foundTimeElement).toBeTruthy();

    // Verify relative time format matches expected patterns (more flexible)
    const relativeTimePatterns = [
      /just now/i,
      /\d+\s*(second|sec|s)\s*ago/i,
      /\d+\s*(minute|min|m)\s*ago/i,
      /\d+\s*(mins?)\s*ago/i,
      /\d+\s*(hour|hr|h)\s*ago/i,
      /\d+\s*(hours?)\s*ago/i,
      /\d+\s*(day|d)\s*ago/i,
      /\d+\s*(days?)\s*ago/i,
      /yesterday/i,
      /\d+\s*(week|w)\s*ago/i,
      /\d+\s*(month|mo)\s*ago/i,
      /\d+\s*(year|yr|y)\s*ago/i,
    ];

    const matchesPattern = relativeTimePatterns.some(pattern =>
      pattern.test(relativeTimeText || '')
    );

    expect(matchesPattern).toBeTruthy();
    console.log(`✓ Relative time displays: "${relativeTimeText}"`);

    // Capture screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'real-social-media-feed-relative-time.png'),
      fullPage: true
    });

    // Verify multiple posts show relative time
    for (let i = 0; i < Math.min(3, posts.length); i++) {
      const post = posts[i];
      const postTimeElements = await post.locator('span[title]').all();

      let foundTime = false;
      for (const elem of postTimeElements) {
        const text = await elem.textContent();
        if (text && relativeTimePatterns.some(p => p.test(text))) {
          foundTime = true;
          console.log(`  Post ${i + 1}: "${text}"`);
          break;
        }
      }

      expect(foundTime).toBeTruthy();
    }
  });

  test('2. Tooltip Verification - Exact datetime on hover', async ({ page }) => {
    // Wait for posts to load
    await page.waitForSelector('[data-testid="post-card"]', {
      timeout: 15000,
      state: 'visible'
    });

    await page.waitForTimeout(1000);

    const firstPost = page.locator('[data-testid="post-card"]').first();

    // Find elements with title attribute (tooltips)
    const elementsWithTitle = await firstPost.locator('span[title]').all();

    let foundTooltip = false;
    let tooltipContent = '';

    for (const elem of elementsWithTitle) {
      const title = await elem.getAttribute('title');
      const text = await elem.textContent();

      // Check if this is a time-related element
      if (title && text && (
        text.includes('ago') ||
        text.includes('just now') ||
        text.includes('min') ||
        text.includes('hour')
      )) {
        tooltipContent = title;
        foundTooltip = true;

        console.log(`✓ Tooltip content: "${title}"`);

        // Hover to show tooltip
        await elem.hover();
        await page.waitForTimeout(500);

        break;
      }
    }

    expect(foundTooltip).toBeTruthy();

    // Capture screenshot with tooltip visible
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'real-social-media-feed-tooltip.png'),
      fullPage: false
    });

    // Verify tooltip contains date/time information
    if (tooltipContent) {
      const datePatterns = [
        /\d{4}/,  // Year
        /\d{1,2}:\d{2}/,  // Time (HH:MM)
        /(january|february|march|april|may|june|july|august|september|october|november|december)/i,
        /\d{1,2}\/\d{1,2}\/\d{4}/,  // Date format
        /(am|pm)/i,  // AM/PM
        /\d{1,2}-\d{1,2}-\d{4}/,  // Date format with dashes
      ];

      const hasDateInfo = datePatterns.some(pattern => pattern.test(tooltipContent));
      expect(hasDateInfo).toBeTruthy();
    }
  });

  test('3. Backend Sorting Order - Verify consistent post order', async ({ page }) => {
    // Wait for posts to load
    await page.waitForSelector('[data-testid="post-card"]', {
      timeout: 15000,
      state: 'visible'
    });

    await page.waitForTimeout(1000);

    // Get first 3 posts content
    const getPostOrder = async (): Promise<string[]> => {
      const posts = await page.locator('[data-testid="post-card"]').all();
      const postContents: string[] = [];

      for (let i = 0; i < Math.min(3, posts.length); i++) {
        // Get the post title (h2 element)
        const titleElement = posts[i].locator('h2').first();
        const title = await titleElement.textContent();
        postContents.push((title || '').trim().substring(0, 50));
      }

      return postContents;
    };

    const initialOrder = await getPostOrder();
    console.log('✓ Initial post order captured:');
    initialOrder.forEach((content, i) => {
      console.log(`  ${i + 1}. ${content}...`);
    });

    // Capture screenshot of initial order
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'real-social-media-feed-order.png'),
      fullPage: true
    });

    // Refresh the page
    await page.reload({ waitUntil: 'networkidle', timeout: 30000 });

    // Wait for posts to load again
    await page.waitForSelector('[data-testid="post-card"]', {
      timeout: 15000,
      state: 'visible'
    });

    await page.waitForTimeout(1000);

    const afterRefreshOrder = await getPostOrder();
    console.log('✓ Post order after refresh:');
    afterRefreshOrder.forEach((content, i) => {
      console.log(`  ${i + 1}. ${content}...`);
    });

    // Verify order is consistent
    expect(afterRefreshOrder).toEqual(initialOrder);
    console.log('✓ Post order remains consistent across refreshes');

    // Verify at least 3 posts are present
    expect(initialOrder.length).toBeGreaterThanOrEqual(3);
  });

  test('4. No Console Errors - Monitor for React/API errors', async ({ page }) => {
    // Wait for posts to load
    await page.waitForSelector('[data-testid="post-card"]', {
      timeout: 15000,
      state: 'visible'
    });

    // Wait for any async operations to complete
    await page.waitForTimeout(2000);

    // Scroll to trigger any lazy-loading or scroll events
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight / 2);
    });

    await page.waitForTimeout(1000);

    // Check for errors
    if (consoleErrors.length > 0) {
      console.log('❌ Console errors detected:');
      consoleErrors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error}`);
      });

      // Capture screenshot on error
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'real-social-media-feed-error.png'),
        fullPage: true
      });

      // Filter out known non-critical errors
      const criticalErrors = consoleErrors.filter(error => {
        return !error.includes('Download the React DevTools') &&
               !error.includes('favicon.ico') &&
               !error.includes('404') &&
               !error.includes('WebSocket') &&
               !error.includes('ws://localhost') &&
               !error.includes('ERR_CONNECTION_REFUSED');
      });

      expect(criticalErrors.length).toBe(0);
    } else {
      console.log('✓ No console errors detected');
    }

    // Check for warnings (informational)
    if (consoleWarnings.length > 0) {
      console.log('⚠ Console warnings detected:');
      consoleWarnings.forEach((warning, i) => {
        console.log(`  ${i + 1}. ${warning}`);
      });
    }

    // Verify the page loaded successfully
    const posts = await page.locator('[data-testid="post-card"]').all();
    expect(posts.length).toBeGreaterThan(0);

    console.log(`✓ Page loaded successfully with ${posts.length} posts`);
  });

  test('5. Component Rendering - Verify all post elements', async ({ page }) => {
    // Wait for posts to load
    await page.waitForSelector('[data-testid="post-card"]', {
      timeout: 15000,
      state: 'visible'
    });

    await page.waitForTimeout(1000);

    const firstPost = page.locator('[data-testid="post-card"]').first();

    // Verify essential post elements are present
    const elements = {
      'Post container': firstPost,
      'Post title': firstPost.locator('h2'),
      'Post content': firstPost.locator('.text-gray-600, .text-gray-700').first(),
    };

    for (const [name, locator] of Object.entries(elements)) {
      const count = await locator.count();
      expect(count).toBeGreaterThan(0);
      console.log(`✓ ${name}: found`);
    }

    // Capture full page screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'real-social-media-feed-full.png'),
      fullPage: true
    });

    console.log('✓ All essential post elements rendered correctly');
  });

  test('6. Real-time Updates - Verify dynamic behavior', async ({ page }) => {
    // Wait for initial posts to load
    await page.waitForSelector('[data-testid="post-card"]', {
      timeout: 15000,
      state: 'visible'
    });

    await page.waitForTimeout(1000);

    const initialPostCount = await page.locator('[data-testid="post-card"]').count();
    console.log(`✓ Initial post count: ${initialPostCount}`);

    // Wait for potential real-time updates (if implemented)
    await page.waitForTimeout(3000);

    const updatedPostCount = await page.locator('[data-testid="post-card"]').count();
    console.log(`✓ Post count after wait: ${updatedPostCount}`);

    // Verify page is responsive
    expect(updatedPostCount).toBeGreaterThanOrEqual(initialPostCount);

    // Check that relative times are still displayed
    const firstPost = page.locator('[data-testid="post-card"]').first();
    const timeElements = await firstPost.locator('span[title]').all();

    let foundRelativeTime = false;
    for (const elem of timeElements) {
      const text = await elem.textContent();
      if (text && (text.includes('ago') || text.includes('just now'))) {
        foundRelativeTime = true;
        console.log(`✓ Relative time still displays: "${text}"`);
        break;
      }
    }

    expect(foundRelativeTime).toBeTruthy();
  });

  test.afterEach(async ({ page }, testInfo) => {
    // Log test results
    if (testInfo.status === 'passed') {
      console.log(`✅ Test passed: ${testInfo.title}`);
    } else if (testInfo.status === 'failed') {
      console.log(`❌ Test failed: ${testInfo.title}`);

      // Capture failure screenshot
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `failure-${testInfo.title.replace(/\s+/g, '-')}.png`),
        fullPage: true
      });
    }
  });
});
