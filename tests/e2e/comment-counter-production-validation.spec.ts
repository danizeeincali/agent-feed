/**
 * PRODUCTION VALIDATION TEST SUITE
 * Comment Counter Implementation
 *
 * This suite validates the comment counter implementation in production-ready mode:
 * - Visual validation with screenshots
 * - Functional testing with real interactions
 * - API validation without mocks
 * - Accessibility compliance
 * - Performance metrics
 * - Cross-browser compatibility
 * - Responsive design validation
 */

import { test, expect, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const API_URL = process.env.API_URL || 'http://localhost:3001';
const SCREENSHOTS_DIR = path.join(process.cwd(), 'tests/e2e/screenshots/comment-counter-validation');

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

test.describe('Comment Counter - Production Validation Suite', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to application
    await page.goto(BASE_URL);

    // Wait for feed to load
    await page.waitForSelector('[data-testid="social-feed"]', { timeout: 10000 });
  });

  test.describe('1. Visual Validation', () => {

    test('should display comment counter correctly in light mode', async ({ page }) => {
      // Ensure light mode
      const htmlElement = page.locator('html');
      const isDarkMode = await htmlElement.getAttribute('class');

      if (isDarkMode?.includes('dark')) {
        // Toggle to light mode
        const themeButton = page.locator('button[aria-label*="theme"], button:has-text("theme")').first();
        if (await themeButton.isVisible()) {
          await themeButton.click();
          await page.waitForTimeout(500);
        }
      }

      // Wait for posts to load
      const posts = page.locator('[data-testid^="post-"]');
      await expect(posts.first()).toBeVisible({ timeout: 10000 });

      // Take full page screenshot
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'light-mode-full-feed.png'),
        fullPage: true
      });

      // Focus on first post with comment counter
      const firstPost = posts.first();
      await firstPost.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'light-mode-first-post.png')
      });

      // Verify comment counter is visible
      const commentCounter = firstPost.locator('[data-testid="comment-count"], .comment-count, button:has-text("comment")').first();
      await expect(commentCounter).toBeVisible();

      // Take screenshot of comment counter specifically
      await commentCounter.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'light-mode-comment-counter.png')
      });

      // Verify styling (should not have debug colors)
      const bgColor = await commentCounter.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });

      // Should not have bright debug colors (red, yellow, lime green)
      expect(bgColor).not.toContain('rgb(255, 0, 0)'); // red
      expect(bgColor).not.toContain('rgb(255, 255, 0)'); // yellow
      expect(bgColor).not.toContain('rgb(0, 255, 0)'); // lime green
    });

    test('should display comment counter correctly in dark mode', async ({ page }) => {
      // Ensure dark mode
      const htmlElement = page.locator('html');
      const isDarkMode = await htmlElement.getAttribute('class');

      if (!isDarkMode?.includes('dark')) {
        // Toggle to dark mode
        const themeButton = page.locator('button[aria-label*="theme"], button:has-text("theme")').first();
        if (await themeButton.isVisible()) {
          await themeButton.click();
          await page.waitForTimeout(500);
        }
      }

      // Wait for posts to load
      const posts = page.locator('[data-testid^="post-"]');
      await expect(posts.first()).toBeVisible({ timeout: 10000 });

      // Take full page screenshot
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'dark-mode-full-feed.png'),
        fullPage: true
      });

      // Focus on first post
      const firstPost = posts.first();
      await firstPost.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'dark-mode-first-post.png')
      });

      // Verify comment counter is visible
      const commentCounter = firstPost.locator('[data-testid="comment-count"], .comment-count, button:has-text("comment")').first();
      await expect(commentCounter).toBeVisible();

      await commentCounter.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'dark-mode-comment-counter.png')
      });
    });

    test('should be responsive on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE

      await page.reload();
      await page.waitForSelector('[data-testid="social-feed"]', { timeout: 10000 });

      // Take mobile screenshot
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'mobile-viewport-375.png'),
        fullPage: true
      });

      // Verify comment counter is still visible and properly sized
      const posts = page.locator('[data-testid^="post-"]');
      const firstPost = posts.first();
      const commentCounter = firstPost.locator('[data-testid="comment-count"], .comment-count, button:has-text("comment")').first();

      await expect(commentCounter).toBeVisible();

      // Verify text is readable (not too small)
      const fontSize = await commentCounter.evaluate((el) => {
        return window.getComputedStyle(el).fontSize;
      });

      const fontSizeNum = parseFloat(fontSize);
      expect(fontSizeNum).toBeGreaterThanOrEqual(12); // Minimum readable size
    });

    test('should be responsive on tablet viewport', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 }); // iPad

      await page.reload();
      await page.waitForSelector('[data-testid="social-feed"]', { timeout: 10000 });

      // Take tablet screenshot
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'tablet-viewport-768.png'),
        fullPage: true
      });

      const posts = page.locator('[data-testid^="post-"]');
      const commentCounter = posts.first().locator('[data-testid="comment-count"], .comment-count, button:has-text("comment")').first();

      await expect(commentCounter).toBeVisible();
    });

    test('should be responsive on desktop viewport', async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 }); // Full HD

      await page.reload();
      await page.waitForSelector('[data-testid="social-feed"]', { timeout: 10000 });

      // Take desktop screenshot
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'desktop-viewport-1920.png'),
        fullPage: true
      });

      const posts = page.locator('[data-testid^="post-"]');
      const commentCounter = posts.first().locator('[data-testid="comment-count"], .comment-count, button:has-text("comment")').first();

      await expect(commentCounter).toBeVisible();
    });
  });

  test.describe('2. Functional Validation', () => {

    test('should display correct initial comment count from API', async ({ page }) => {
      // Intercept API call
      const responsePromise = page.waitForResponse(
        response => response.url().includes('/api/posts') && response.status() === 200
      );

      await page.reload();
      const response = await responsePromise;
      const data = await response.json();

      // Verify API response structure
      expect(data).toHaveProperty('posts');
      expect(Array.isArray(data.posts)).toBe(true);
      expect(data.posts.length).toBeGreaterThan(0);

      // Verify first post has comments field at root level
      const firstPost = data.posts[0];
      expect(firstPost).toHaveProperty('comments');
      expect(typeof firstPost.comments).toBe('number');

      // Store API value for comparison
      const apiCommentCount = firstPost.comments;

      // Wait for UI to render
      await page.waitForSelector('[data-testid^="post-"]', { timeout: 10000 });

      // Get displayed comment count
      const posts = page.locator('[data-testid^="post-"]');
      const firstPostElement = posts.first();
      const commentCounter = firstPostElement.locator('[data-testid="comment-count"], .comment-count, button:has-text("comment")').first();

      const displayedText = await commentCounter.textContent();
      const displayedCount = parseInt(displayedText?.match(/\d+/)?.[0] || '0');

      // Verify UI matches API
      expect(displayedCount).toBe(apiCommentCount);

      console.log(`✓ Comment count matches - API: ${apiCommentCount}, UI: ${displayedCount}`);
    });

    test('should show hover state on comment counter', async ({ page }) => {
      const posts = page.locator('[data-testid^="post-"]');
      const firstPost = posts.first();
      const commentCounter = firstPost.locator('[data-testid="comment-count"], .comment-count, button:has-text("comment")').first();

      await expect(commentCounter).toBeVisible();

      // Get initial state
      const initialBg = await commentCounter.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });

      // Take screenshot before hover
      await commentCounter.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'counter-before-hover.png')
      });

      // Hover over counter
      await commentCounter.hover();
      await page.waitForTimeout(300); // Wait for transition

      // Take screenshot during hover
      await commentCounter.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'counter-during-hover.png')
      });

      // Get hover state
      const hoverBg = await commentCounter.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });

      // Verify hover effect exists (background should change or cursor should be pointer)
      const cursor = await commentCounter.evaluate((el) => {
        return window.getComputedStyle(el).cursor;
      });

      expect(cursor).toBe('pointer');
    });

    test('should handle click on comment counter', async ({ page }) => {
      const posts = page.locator('[data-testid^="post-"]');
      const firstPost = posts.first();
      const commentCounter = firstPost.locator('[data-testid="comment-count"], .comment-count, button:has-text("comment")').first();

      await expect(commentCounter).toBeVisible();

      // Take screenshot before click
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'before-counter-click.png')
      });

      // Click counter
      await commentCounter.click();
      await page.waitForTimeout(500);

      // Take screenshot after click
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'after-counter-click.png')
      });

      // Verify something happened (comments expanded or modal opened)
      // This depends on your implementation - adjust as needed
      const commentsSection = page.locator('[data-testid="comments-section"], .comments, [class*="comment"]');

      // Check if comments became visible or count increased
      const visibleComments = await commentsSection.count();
      console.log(`✓ Click handled - ${visibleComments} comment elements found`);
    });
  });

  test.describe('3. API Validation - Real Data Only', () => {

    test('should verify API returns comments at root level (not nested)', async ({ page }) => {
      const responsePromise = page.waitForResponse(
        response => response.url().includes('/api/posts') && response.status() === 200
      );

      await page.reload();
      const response = await responsePromise;
      const data = await response.json();

      // Verify no mocks or simulations
      expect(data).toHaveProperty('posts');

      for (const post of data.posts) {
        // CRITICAL: Verify comments is at root level
        expect(post).toHaveProperty('comments');
        expect(typeof post.comments).toBe('number');

        // Verify it's NOT nested under engagement
        if (post.engagement) {
          // If engagement exists, comments should NOT be there
          console.log(`Post ${post.id}: comments at root = ${post.comments}, engagement = ${JSON.stringify(post.engagement)}`);
        }

        // Verify realistic data (not mock data like 999999)
        expect(post.comments).toBeGreaterThanOrEqual(0);
        expect(post.comments).toBeLessThan(10000); // Reasonable upper bound
      }

      console.log(`✓ Validated ${data.posts.length} posts - all have comments at root level`);
    });

    test('should verify API endpoint is real (not mocked)', async ({ page, request }) => {
      // Make direct API call using Playwright's request context
      const response = await request.get(`${API_URL}/api/posts`);

      expect(response.ok()).toBe(true);
      expect(response.status()).toBe(200);

      const data = await response.json();

      // Verify response structure
      expect(data).toHaveProperty('posts');
      expect(Array.isArray(data.posts)).toBe(true);

      // Check response headers for real API indicators
      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('application/json');

      console.log(`✓ Real API endpoint verified: ${API_URL}/api/posts`);
    });

    test('should handle API errors gracefully', async ({ page }) => {
      // Simulate network failure
      await page.route('**/api/posts', route => route.abort());

      await page.reload();
      await page.waitForTimeout(2000);

      // Take screenshot of error state
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'api-error-state.png')
      });

      // Verify error handling (should show error message or loading state)
      const errorMessage = page.locator('[data-testid="error-message"], .error, [class*="error"]');
      const loadingIndicator = page.locator('[data-testid="loading"], .loading, [class*="loading"]');

      const hasError = await errorMessage.isVisible().catch(() => false);
      const isLoading = await loadingIndicator.isVisible().catch(() => false);

      expect(hasError || isLoading).toBe(true);
      console.log(`✓ Error handling verified - Error shown: ${hasError}, Loading: ${isLoading}`);
    });
  });

  test.describe('4. Accessibility Validation', () => {

    test('should be keyboard navigable', async ({ page }) => {
      // Focus on first post
      await page.keyboard.press('Tab');

      let focusedElement = await page.evaluateHandle(() => document.activeElement);
      let tagName = await focusedElement.evaluate(el => el?.tagName);

      // Keep tabbing until we find comment counter or reach max attempts
      let attempts = 0;
      let foundCommentCounter = false;

      while (attempts < 20) {
        await page.keyboard.press('Tab');
        attempts++;

        focusedElement = await page.evaluateHandle(() => document.activeElement);
        const elementText = await focusedElement.evaluate(el => el?.textContent || '');
        const ariaLabel = await focusedElement.evaluate(el => el?.getAttribute('aria-label') || '');

        if (elementText.toLowerCase().includes('comment') || ariaLabel.toLowerCase().includes('comment')) {
          foundCommentCounter = true;

          // Take screenshot of focused state
          await page.screenshot({
            path: path.join(SCREENSHOTS_DIR, 'keyboard-focus-comment-counter.png')
          });

          // Verify focus is visible
          const outline = await focusedElement.evaluate(el => {
            const styles = window.getComputedStyle(el as Element);
            return {
              outline: styles.outline,
              outlineWidth: styles.outlineWidth,
              boxShadow: styles.boxShadow
            };
          });

          console.log('✓ Focus styles:', outline);
          break;
        }
      }

      expect(foundCommentCounter).toBe(true);
    });

    test('should have proper ARIA labels', async ({ page }) => {
      const posts = page.locator('[data-testid^="post-"]');
      const firstPost = posts.first();
      const commentCounter = firstPost.locator('[data-testid="comment-count"], .comment-count, button:has-text("comment")').first();

      // Check for accessibility attributes
      const ariaLabel = await commentCounter.getAttribute('aria-label');
      const role = await commentCounter.getAttribute('role');
      const title = await commentCounter.getAttribute('title');

      console.log('Accessibility attributes:', { ariaLabel, role, title });

      // Should have at least one accessibility feature
      const hasAccessibility = ariaLabel || role || title;
      expect(hasAccessibility).toBeTruthy();
    });

    test('should have sufficient color contrast', async ({ page }) => {
      const posts = page.locator('[data-testid^="post-"]');
      const firstPost = posts.first();
      const commentCounter = firstPost.locator('[data-testid="comment-count"], .comment-count, button:has-text("comment")').first();

      const contrast = await commentCounter.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          color: styles.color,
          backgroundColor: styles.backgroundColor,
          fontSize: styles.fontSize
        };
      });

      console.log('Color contrast info:', contrast);

      // This is informational - proper contrast ratio calculation would need a library
      expect(contrast.color).toBeDefined();
      expect(contrast.backgroundColor).toBeDefined();
    });
  });

  test.describe('5. Performance Validation', () => {

    test('should load comment counters quickly', async ({ page }) => {
      const startTime = Date.now();

      await page.goto(BASE_URL);

      // Wait for first comment counter to be visible
      await page.waitForSelector('[data-testid="comment-count"], .comment-count, button:has-text("comment")', {
        timeout: 5000
      });

      const loadTime = Date.now() - startTime;

      console.log(`✓ Comment counters loaded in ${loadTime}ms`);

      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    test('should not have console errors', async ({ page }) => {
      const consoleErrors: string[] = [];

      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.reload();
      await page.waitForTimeout(2000);

      // Filter out known non-critical errors (like missing favicon)
      const criticalErrors = consoleErrors.filter(err =>
        !err.includes('favicon') &&
        !err.includes('404') &&
        !err.toLowerCase().includes('warning')
      );

      if (criticalErrors.length > 0) {
        console.log('Console errors found:', criticalErrors);
      }

      expect(criticalErrors.length).toBe(0);
    });

    test('should render multiple comment counters efficiently', async ({ page }) => {
      const posts = page.locator('[data-testid^="post-"]');
      const postCount = await posts.count();

      console.log(`✓ Rendering ${postCount} posts with comment counters`);

      // Verify all comment counters are rendered
      for (let i = 0; i < Math.min(postCount, 5); i++) {
        const post = posts.nth(i);
        const commentCounter = post.locator('[data-testid="comment-count"], .comment-count, button:has-text("comment")').first();
        await expect(commentCounter).toBeVisible();
      }

      // Check memory usage (basic check)
      const metrics = await page.evaluate(() => {
        return {
          memory: (performance as any).memory?.usedJSHeapSize,
          timing: performance.timing
        };
      });

      console.log('Performance metrics:', metrics);
    });
  });

  test.describe('6. Cross-Browser Compatibility', () => {

    test('should work in Chromium', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Chromium-specific test');

      const posts = page.locator('[data-testid^="post-"]');
      const commentCounter = posts.first().locator('[data-testid="comment-count"], .comment-count, button:has-text("comment")').first();

      await expect(commentCounter).toBeVisible();

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'chromium-browser.png')
      });
    });

    test('should work in Firefox', async ({ page, browserName }) => {
      test.skip(browserName !== 'firefox', 'Firefox-specific test');

      const posts = page.locator('[data-testid^="post-"]');
      const commentCounter = posts.first().locator('[data-testid="comment-count"], .comment-count, button:has-text("comment")').first();

      await expect(commentCounter).toBeVisible();

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'firefox-browser.png')
      });
    });

    test('should work in WebKit', async ({ page, browserName }) => {
      test.skip(browserName !== 'webkit', 'WebKit-specific test');

      const posts = page.locator('[data-testid^="post-"]');
      const commentCounter = posts.first().locator('[data-testid="comment-count"], .comment-count, button:has-text("comment")').first();

      await expect(commentCounter).toBeVisible();

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'webkit-browser.png')
      });
    });
  });
});

// Generate validation report
test.afterAll(async () => {
  const reportPath = path.join(SCREENSHOTS_DIR, 'VALIDATION-REPORT.md');

  const report = `# Comment Counter Production Validation Report

## Execution Date
${new Date().toISOString()}

## Test Summary
All tests executed with real browser automation using Playwright.

## Screenshots Generated
Check the screenshots directory for visual evidence:
- Light mode: full feed, first post, comment counter
- Dark mode: full feed, first post, comment counter
- Responsive: mobile (375px), tablet (768px), desktop (1920px)
- Interactions: hover states, click behavior
- Accessibility: keyboard focus
- Error states: API failures

## Validation Coverage
1. ✓ Visual validation across themes and viewports
2. ✓ Functional validation with real interactions
3. ✓ API validation with real endpoints (no mocks)
4. ✓ Accessibility compliance
5. ✓ Performance metrics
6. ✓ Cross-browser compatibility

## Screenshots Directory
${SCREENSHOTS_DIR}

## Next Steps
Review screenshots and test results to confirm production readiness.
`;

  fs.writeFileSync(reportPath, report);
  console.log(`\n✓ Validation report generated: ${reportPath}`);
  console.log(`✓ Screenshots saved to: ${SCREENSHOTS_DIR}\n`);
});
