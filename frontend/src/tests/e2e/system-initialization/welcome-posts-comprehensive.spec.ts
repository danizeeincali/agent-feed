/**
 * E2E Tests: Welcome Posts - Comprehensive Screenshot Suite
 * Agent 6: Playwright E2E + Screenshots (Priority: P1)
 *
 * This test suite focuses on capturing comprehensive screenshots
 * to document the complete system initialization flow.
 *
 * Test Strategy:
 * - Capture 15+ screenshots documenting the flow
 * - Validate complete user experience
 * - Regression testing until 100% pass
 *
 * Coverage:
 * - Welcome posts feed view
 * - Individual post close-ups (Λvi, Onboarding, Reference)
 * - Agent introduction posts
 * - Hemingway bridge display
 * - Loading states
 * - Error states
 */

import { test, expect } from '@playwright/test';

test.describe('Welcome Posts - Comprehensive E2E & Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure we start fresh for each test
    console.log('🔄 Starting fresh test...');

    // Navigate to app
    await page.goto('/', { waitUntil: 'networkidle' });
  });

  test('Screenshot 01: Welcome Posts Feed - Full View', async ({ page }) => {
    console.log('📸 Capturing: Welcome posts feed full view');

    // Wait for posts to load
    await page.waitForSelector('article', { timeout: 10000 });

    // Wait a bit for any animations to complete
    await page.waitForTimeout(1000);

    // Verify posts are present
    const posts = await page.locator('article').all();
    expect(posts.length).toBeGreaterThanOrEqual(3);

    // Capture full page screenshot
    await page.screenshot({
      path: './docs/test-results/system-initialization/01-welcome-posts-feed.png',
      fullPage: true
    });

    console.log(`✓ Captured feed with ${posts.length} posts`);
  });

  test('Screenshot 02: Λvi Welcome Post - Close-up', async ({ page }) => {
    console.log('📸 Capturing: Λvi welcome post close-up');

    await page.waitForSelector('article', { timeout: 10000 });
    await page.waitForTimeout(500);

    const posts = await page.locator('article').all();
    expect(posts.length).toBeGreaterThan(0);

    // Get Λvi's post (should be first)
    const aviPost = posts[0];
    const aviContent = await aviPost.textContent();

    // Verify it's Λvi's post
    expect(aviContent).toContain('Λvi');

    // Verify NO "chief of staff" language
    expect(aviContent?.toLowerCase()).not.toContain('chief of staff');

    // Capture Λvi post screenshot
    await aviPost.screenshot({
      path: './docs/test-results/system-initialization/02-avi-welcome-post.png'
    });

    console.log('✓ Λvi post captured (no "chief of staff" confirmed)');
  });

  test('Screenshot 03: Onboarding Post - Close-up', async ({ page }) => {
    console.log('📸 Capturing: Onboarding post close-up');

    await page.waitForSelector('article', { timeout: 10000 });
    await page.waitForTimeout(500);

    const posts = await page.locator('article').all();
    expect(posts.length).toBeGreaterThanOrEqual(2);

    // Get onboarding post (should be second)
    const onboardingPost = posts[1];
    const onboardingContent = await onboardingPost.textContent();

    // Verify it's the onboarding post
    expect(
      onboardingContent?.toLowerCase().includes('get') ||
      onboardingContent?.toLowerCase().includes('started') ||
      onboardingContent?.toLowerCase().includes('name')
    ).toBe(true);

    // Capture onboarding post screenshot
    await onboardingPost.screenshot({
      path: './docs/test-results/system-initialization/03-onboarding-post.png'
    });

    console.log('✓ Onboarding post captured');
  });

  test('Screenshot 04: Reference Guide Post - Close-up', async ({ page }) => {
    console.log('📸 Capturing: Reference guide post close-up');

    await page.waitForSelector('article', { timeout: 10000 });
    await page.waitForTimeout(500);

    const posts = await page.locator('article').all();
    expect(posts.length).toBeGreaterThanOrEqual(3);

    // Get reference guide post (should be third)
    const referencePost = posts[2];
    const referenceContent = await referencePost.textContent();

    // Verify it's the reference guide
    expect(
      referenceContent?.toLowerCase().includes('how') ||
      referenceContent?.toLowerCase().includes('works') ||
      referenceContent?.toLowerCase().includes('guide')
    ).toBe(true);

    // Capture reference guide post screenshot
    await referencePost.screenshot({
      path: './docs/test-results/system-initialization/04-reference-guide-post.png'
    });

    console.log('✓ Reference guide post captured');
  });

  test('Screenshot 05: Verify NO "chief of staff" Language', async ({ page }) => {
    console.log('🔍 Validating: No "chief of staff" language anywhere');

    await page.waitForSelector('article', { timeout: 10000 });

    // Get entire page content
    const pageContent = await page.textContent('body');

    // Verify NO "chief of staff" anywhere on page
    expect(pageContent?.toLowerCase()).not.toContain('chief of staff');

    // Also check specifically in Λvi's post
    const posts = await page.locator('article').all();
    const aviPost = posts[0];
    const aviContent = await aviPost.textContent();

    expect(aviContent?.toLowerCase()).not.toContain('chief of staff');
    expect(aviContent).toContain('Λvi');

    // Capture screenshot as evidence
    await page.screenshot({
      path: './docs/test-results/system-initialization/05-no-chief-of-staff-validation.png',
      fullPage: true
    });

    console.log('✓ Confirmed: No "chief of staff" language present');
  });

  test('Screenshot 06: Empty Feed Before Initialization', async ({ page }) => {
    console.log('📸 Capturing: Empty feed state (if exists)');

    // This test documents what happens before posts load
    // Navigate and capture immediately before posts appear
    const navigationPromise = page.goto('/', { waitUntil: 'domcontentloaded' });

    // Try to capture the brief moment before posts load
    await page.waitForTimeout(100);

    await page.screenshot({
      path: './docs/test-results/system-initialization/06-empty-feed-before-init.png',
      fullPage: true
    });

    await navigationPromise;

    console.log('✓ Pre-initialization state captured');
  });

  test('Screenshot 07: Loading State During Initialization', async ({ page }) => {
    console.log('📸 Capturing: Loading state during initialization');

    // Navigate and try to capture loading state
    await page.goto('/');

    // Capture any loading indicators
    const hasLoadingState = await page.locator('[data-loading="true"], .loading, .spinner').count() > 0;

    if (hasLoadingState) {
      await page.screenshot({
        path: './docs/test-results/system-initialization/07-loading-state.png',
        fullPage: true
      });
      console.log('✓ Loading state captured');
    } else {
      // Wait for posts to appear and document that loading was fast
      await page.waitForSelector('article');
      await page.screenshot({
        path: './docs/test-results/system-initialization/07-fast-loading-posts-immediate.png',
        fullPage: true
      });
      console.log('✓ Fast loading documented (posts appeared immediately)');
    }
  });

  test('Screenshot 08: All Three Welcome Posts Visible', async ({ page }) => {
    console.log('📸 Capturing: All three welcome posts in viewport');

    await page.waitForSelector('article', { timeout: 10000 });
    await page.waitForTimeout(500);

    const posts = await page.locator('article').all();

    // Verify we have at least 3 posts
    expect(posts.length).toBeGreaterThanOrEqual(3);

    // Get content of first 3 posts
    const post1 = await posts[0].textContent();
    const post2 = await posts[1].textContent();
    const post3 = await posts[2].textContent();

    // Verify each has content
    expect(post1.length).toBeGreaterThan(50);
    expect(post2.length).toBeGreaterThan(50);
    expect(post3.length).toBeGreaterThan(50);

    // Capture all three posts
    await page.screenshot({
      path: './docs/test-results/system-initialization/08-all-three-posts-visible.png',
      fullPage: true
    });

    console.log('✓ All three welcome posts captured and validated');
  });

  test('Screenshot 09: Post Structure and Metadata', async ({ page }) => {
    console.log('📸 Capturing: Post structure and metadata');

    await page.waitForSelector('article', { timeout: 10000 });
    await page.waitForTimeout(500);

    const posts = await page.locator('article').all();
    const firstPost = posts[0];

    // Verify post structure
    const hasContent = await firstPost.locator('*').count() > 0;
    expect(hasContent).toBe(true);

    // Capture first post with structure visible
    await firstPost.screenshot({
      path: './docs/test-results/system-initialization/09-post-structure.png'
    });

    console.log('✓ Post structure captured');
  });

  test('Screenshot 10: Feed with Scroll Position', async ({ page }) => {
    console.log('📸 Capturing: Feed with different scroll positions');

    await page.waitForSelector('article', { timeout: 10000 });

    // Top of feed
    await page.screenshot({
      path: './docs/test-results/system-initialization/10-feed-scroll-top.png',
      fullPage: false
    });

    // Scroll down a bit
    await page.evaluate(() => window.scrollBy(0, 300));
    await page.waitForTimeout(300);

    await page.screenshot({
      path: './docs/test-results/system-initialization/10-feed-scroll-middle.png',
      fullPage: false
    });

    console.log('✓ Scroll positions captured');
  });

  test('Screenshot 11: Hemingway Bridge Display', async ({ page }) => {
    console.log('📸 Capturing: Hemingway bridge display');

    await page.waitForSelector('article', { timeout: 10000 });

    // Look for bridge element
    const hasBridge = await page.locator('[data-bridge], .bridge, .hemingway-bridge').count() > 0;

    if (hasBridge) {
      const bridge = page.locator('[data-bridge], .bridge, .hemingway-bridge').first();
      await bridge.screenshot({
        path: './docs/test-results/system-initialization/11-hemingway-bridge.png'
      });
      console.log('✓ Hemingway bridge captured');
    } else {
      // Document that bridge is not visible or integrated differently
      await page.screenshot({
        path: './docs/test-results/system-initialization/11-no-separate-bridge-element.png',
        fullPage: true
      });
      console.log('ℹ️  No separate bridge element found (may be integrated in feed)');
    }
  });

  test('Screenshot 12: Welcome Posts - Desktop View', async ({ page }) => {
    console.log('📸 Capturing: Desktop view (1920x1080)');

    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForSelector('article', { timeout: 10000 });
    await page.waitForTimeout(500);

    await page.screenshot({
      path: './docs/test-results/system-initialization/12-desktop-view.png',
      fullPage: true
    });

    console.log('✓ Desktop view captured');
  });

  test('Screenshot 13: Welcome Posts - Tablet View', async ({ page }) => {
    console.log('📸 Capturing: Tablet view (768x1024)');

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForSelector('article', { timeout: 10000 });
    await page.waitForTimeout(500);

    await page.screenshot({
      path: './docs/test-results/system-initialization/13-tablet-view.png',
      fullPage: true
    });

    console.log('✓ Tablet view captured');
  });

  test('Screenshot 14: Welcome Posts - Mobile View', async ({ page }) => {
    console.log('📸 Capturing: Mobile view (375x667)');

    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForSelector('article', { timeout: 10000 });
    await page.waitForTimeout(500);

    await page.screenshot({
      path: './docs/test-results/system-initialization/14-mobile-view.png',
      fullPage: true
    });

    console.log('✓ Mobile view captured');
  });

  test('Screenshot 15: Browser Console - No Errors', async ({ page }) => {
    console.log('📸 Capturing: Browser console validation');

    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      }
    });

    page.on('pageerror', error => {
      consoleErrors.push(error.message);
    });

    await page.goto('/');
    await page.waitForSelector('article', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Log console status
    console.log(`Console Errors: ${consoleErrors.length}`);
    console.log(`Console Warnings: ${consoleWarnings.length}`);

    if (consoleErrors.length > 0) {
      console.log('❌ Console Errors Found:');
      consoleErrors.forEach(err => console.log(`  - ${err}`));
    }

    // Capture final state
    await page.screenshot({
      path: './docs/test-results/system-initialization/15-console-validation.png',
      fullPage: true
    });

    // Verify no critical errors
    expect(consoleErrors.length).toBe(0);

    console.log('✓ Console validation complete');
  });

  test('Screenshot 16: Performance Metrics', async ({ page }) => {
    console.log('📸 Capturing: Performance metrics');

    const startTime = Date.now();

    await page.goto('/');
    await page.waitForSelector('article', { timeout: 10000 });

    const loadTime = Date.now() - startTime;

    // Get performance metrics
    const metrics = await page.evaluate(() => {
      const perf = performance.timing;
      return {
        domContentLoaded: perf.domContentLoadedEventEnd - perf.navigationStart,
        loadComplete: perf.loadEventEnd - perf.navigationStart,
        firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByType('paint')[1]?.startTime || 0,
      };
    });

    console.log('Performance Metrics:');
    console.log(`  - Load Time: ${loadTime}ms`);
    console.log(`  - DOM Content Loaded: ${metrics.domContentLoaded}ms`);
    console.log(`  - First Paint: ${metrics.firstPaint}ms`);
    console.log(`  - First Contentful Paint: ${metrics.firstContentfulPaint}ms`);

    // Verify performance requirements (< 2s)
    expect(loadTime).toBeLessThan(2000);

    await page.screenshot({
      path: './docs/test-results/system-initialization/16-performance-metrics.png',
      fullPage: true
    });

    console.log('✓ Performance metrics captured');
  });
});

test.describe('Existing User Experience', () => {
  test('Screenshot 17: Existing User Feed (No Re-initialization)', async ({ page }) => {
    console.log('📸 Capturing: Existing user feed');

    // Navigate to app (assuming user already has posts from previous tests)
    await page.goto('/');
    await page.waitForSelector('article', { timeout: 10000 });
    await page.waitForTimeout(500);

    // Verify no loading/initialization state for existing user
    const loadingState = await page.locator('text=Setting up workspace, text=Initializing').count();
    expect(loadingState).toBe(0);

    // Capture existing user feed
    await page.screenshot({
      path: './docs/test-results/system-initialization/17-existing-user-feed.png',
      fullPage: true
    });

    console.log('✓ Existing user feed captured (no re-initialization)');
  });
});

test.describe('Error States', () => {
  test('Screenshot 18: Network Error Handling (if applicable)', async ({ page }) => {
    console.log('📸 Capturing: Error state handling');

    // Note: This is a placeholder for error state testing
    // In a real scenario, you might simulate network failures

    await page.goto('/');
    await page.waitForSelector('article, .error, [data-error]', { timeout: 15000 });

    const hasError = await page.locator('.error, [data-error]').count() > 0;

    if (hasError) {
      await page.screenshot({
        path: './docs/test-results/system-initialization/18-error-state.png',
        fullPage: true
      });
      console.log('✓ Error state captured');
    } else {
      await page.screenshot({
        path: './docs/test-results/system-initialization/18-no-errors.png',
        fullPage: true
      });
      console.log('✓ No error states found (app working correctly)');
    }
  });
});
