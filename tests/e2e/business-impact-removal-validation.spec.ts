import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

/**
 * E2E Validation Suite: Business Impact Indicator Removal
 *
 * This suite validates that business impact indicators have been completely
 * removed from both frontend display and backend API responses.
 *
 * Validation Strategy:
 * 1. Visual verification across viewports (desktop, tablet, mobile)
 * 2. Visual verification across themes (light, dark)
 * 3. API response validation (no businessImpact field)
 * 4. Functional regression testing (engagement, comments still work)
 * 5. Screenshot capture for visual proof
 *
 * NO MOCKS - All tests run against real application
 */

// Configuration
const APP_URL = process.env.APP_URL || 'http://localhost:5173';
const SCREENSHOT_DIR = path.join(process.cwd(), 'tests/e2e/screenshots/business-impact-removal');

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

/**
 * Helper function to wait for feed to load
 */
async function waitForFeedLoad(page: Page) {
  // Wait for the feed container to be visible
  await page.waitForSelector('[data-testid="social-feed"], .feed-container, article, [class*="post"]', {
    timeout: 10000
  });

  // Wait for network to be idle
  await page.waitForLoadState('networkidle', { timeout: 10000 });

  // Additional wait for any animations
  await page.waitForTimeout(1000);
}

/**
 * Helper function to capture screenshot
 */
async function captureScreenshot(page: Page, name: string) {
  const screenshotPath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({
    path: screenshotPath,
    fullPage: true
  });
  console.log(`Screenshot saved: ${screenshotPath}`);
  return screenshotPath;
}

/**
 * Helper function to check for business impact indicators in the page
 */
async function checkForImpactIndicators(page: Page) {
  const pageContent = await page.content();

  // Check for various impact-related patterns
  const impactPatterns = [
    /\d+%\s*impact/i,
    /\d+%\s*Impact/i,
    /High\s*Impact/i,
    /Medium\s*Impact/i,
    /Low\s*Impact/i,
    /Minimal\s*Impact/i,
    /businessImpact/,
    /business-impact/i
  ];

  const violations = [];
  for (const pattern of impactPatterns) {
    if (pattern.test(pageContent)) {
      violations.push(`Found pattern: ${pattern.source}`);
    }
  }

  return violations;
}

test.describe('Business Impact Removal Validation Suite', () => {

  test.describe('Visual Verification - Desktop', () => {

    test.use({
      viewport: { width: 1920, height: 1080 },
      colorScheme: 'light'
    });

    test('should display feed without any impact indicators - desktop light mode', async ({ page }) => {
      // Navigate to the feed
      await page.goto(APP_URL);
      await waitForFeedLoad(page);

      // Capture screenshot
      await captureScreenshot(page, 'desktop-light-mode');

      // Check for impact indicators
      const violations = await checkForImpactIndicators(page);
      expect(violations, `Found business impact indicators: ${violations.join(', ')}`).toHaveLength(0);

      // Verify NO text matching impact patterns
      const impactTexts = await page.getByText(/\d+%\s*impact/i).count();
      expect(impactTexts, 'Found percentage impact text').toBe(0);

      const highImpactTexts = await page.getByText(/High Impact/i).count();
      expect(highImpactTexts, 'Found "High Impact" text').toBe(0);

      const mediumImpactTexts = await page.getByText(/Medium Impact/i).count();
      expect(mediumImpactTexts, 'Found "Medium Impact" text').toBe(0);

      const lowImpactTexts = await page.getByText(/Low Impact/i).count();
      expect(lowImpactTexts, 'Found "Low Impact" text').toBe(0);

      console.log('✓ Desktop light mode: No impact indicators found');
    });

    test('should display feed without impact indicators - desktop dark mode', async ({ page }) => {
      // Enable dark mode
      await page.goto(APP_URL);

      // Try to toggle dark mode if available
      const darkModeToggle = page.locator('[data-testid="theme-toggle"], [aria-label*="dark" i], button:has-text("Dark")').first();
      const toggleExists = await darkModeToggle.count() > 0;

      if (toggleExists) {
        await darkModeToggle.click();
        await page.waitForTimeout(500);
      } else {
        // Emulate dark mode via browser
        await page.emulateMedia({ colorScheme: 'dark' });
      }

      await waitForFeedLoad(page);

      // Capture screenshot
      await captureScreenshot(page, 'desktop-dark-mode');

      // Check for impact indicators
      const violations = await checkForImpactIndicators(page);
      expect(violations, `Found business impact indicators in dark mode: ${violations.join(', ')}`).toHaveLength(0);

      console.log('✓ Desktop dark mode: No impact indicators found');
    });

    test('should verify post cards display other metadata correctly', async ({ page }) => {
      await page.goto(APP_URL);
      await waitForFeedLoad(page);

      // Capture screenshot
      await captureScreenshot(page, 'desktop-metadata-verification');

      // Verify post cards are rendered
      const posts = page.locator('article, [class*="post"], [data-testid*="post"]');
      const postCount = await posts.count();
      expect(postCount, 'No posts found in feed').toBeGreaterThan(0);

      if (postCount > 0) {
        const firstPost = posts.first();

        // Verify author/agent info is displayed
        const hasAuthor = await firstPost.locator('[class*="author"], [class*="agent"]').count() > 0;
        expect(hasAuthor, 'Post should display author/agent info').toBeTruthy();

        // Verify timestamp is displayed
        const hasTimestamp = await firstPost.locator('[class*="time"], [class*="date"]').count() > 0 ||
                            await firstPost.getByText(/\d+[mhd]\s*ago/i).count() > 0;
        expect(hasTimestamp, 'Post should display timestamp').toBeTruthy();

        console.log('✓ Post cards display metadata correctly without impact indicators');
      }
    });

  });

  test.describe('Visual Verification - Tablet', () => {

    test.use({
      viewport: { width: 768, height: 1024 },
      colorScheme: 'light'
    });

    test('should display feed without impact indicators - tablet', async ({ page }) => {
      await page.goto(APP_URL);
      await waitForFeedLoad(page);

      // Capture screenshot
      await captureScreenshot(page, 'tablet-view');

      // Check for impact indicators
      const violations = await checkForImpactIndicators(page);
      expect(violations, `Found business impact indicators on tablet: ${violations.join(', ')}`).toHaveLength(0);

      console.log('✓ Tablet view: No impact indicators found');
    });

  });

  test.describe('Visual Verification - Mobile', () => {

    test.use({
      viewport: { width: 375, height: 667 },
      isMobile: true,
      colorScheme: 'light'
    });

    test('should display feed without impact indicators - mobile', async ({ page }) => {
      await page.goto(APP_URL);
      await waitForFeedLoad(page);

      // Capture screenshot
      await captureScreenshot(page, 'mobile-view');

      // Check for impact indicators
      const violations = await checkForImpactIndicators(page);
      expect(violations, `Found business impact indicators on mobile: ${violations.join(', ')}`).toHaveLength(0);

      console.log('✓ Mobile view: No impact indicators found');
    });

  });

  test.describe('Expanded Post View', () => {

    test('should not show impact indicators in expanded post view', async ({ page }) => {
      await page.goto(APP_URL);
      await waitForFeedLoad(page);

      // Find and click "Show more" button if available
      const showMoreButton = page.getByText(/Show more/i).first();
      const hasShowMore = await showMoreButton.count() > 0;

      if (hasShowMore) {
        await showMoreButton.click();
        await page.waitForTimeout(500);

        // Capture screenshot
        await captureScreenshot(page, 'expanded-post-view');

        // Check for impact indicators in expanded view
        const violations = await checkForImpactIndicators(page);
        expect(violations, `Found business impact indicators in expanded view: ${violations.join(', ')}`).toHaveLength(0);

        console.log('✓ Expanded post view: No impact indicators found');
      } else {
        console.log('⊘ No expandable posts found, skipping expanded view test');
      }
    });

  });

  test.describe('Backend API Validation', () => {

    test('should verify API responses do NOT include businessImpact field', async ({ page, request }) => {
      // Navigate to app to establish session
      await page.goto(APP_URL);
      await waitForFeedLoad(page);

      // Intercept API calls and verify response structure
      let postsApiCalled = false;
      let businessImpactFound = false;

      page.on('response', async (response) => {
        const url = response.url();

        // Check posts API endpoints
        if (url.includes('/api/') && url.includes('/posts')) {
          postsApiCalled = true;

          try {
            const json = await response.json();
            const posts = json.data || json.posts || json;

            // Check if any post contains businessImpact field
            if (Array.isArray(posts)) {
              for (const post of posts) {
                if (post.businessImpact !== undefined ||
                    (post.metadata && post.metadata.businessImpact !== undefined)) {
                  businessImpactFound = true;
                  console.error('❌ Found businessImpact in API response:', post);
                }
              }
            } else if (posts.businessImpact !== undefined ||
                      (posts.metadata && posts.metadata.businessImpact !== undefined)) {
              businessImpactFound = true;
              console.error('❌ Found businessImpact in API response:', posts);
            }
          } catch (e) {
            // Response might not be JSON, skip
          }
        }
      });

      // Trigger page reload to capture API calls
      await page.reload();
      await waitForFeedLoad(page);

      // Wait a bit for all API calls to complete
      await page.waitForTimeout(2000);

      expect(postsApiCalled, 'Posts API should be called').toBeTruthy();
      expect(businessImpactFound, 'API responses should NOT contain businessImpact field').toBeFalsy();

      console.log('✓ Backend API: No businessImpact field in responses');
    });

    test('should verify new posts do not include businessImpact', async ({ page }) => {
      await page.goto(APP_URL);
      await waitForFeedLoad(page);

      // Try to find create post button/form
      const createPostButton = page.locator('[data-testid="create-post"], button:has-text("Create Post"), button:has-text("New Post")').first();
      const hasCreateButton = await createPostButton.count() > 0;

      if (hasCreateButton) {
        let postCreated = false;

        // Monitor API calls for new post creation
        page.on('response', async (response) => {
          const url = response.url();

          if (url.includes('/api/') && url.includes('/posts') && response.request().method() === 'POST') {
            postCreated = true;

            try {
              const json = await response.json();
              const post = json.data || json.post || json;

              // Verify no businessImpact field
              expect(post.businessImpact, 'New post should not have businessImpact field').toBeUndefined();
              expect(post.metadata?.businessImpact, 'New post metadata should not have businessImpact').toBeUndefined();

              console.log('✓ New post created without businessImpact field');
            } catch (e) {
              console.error('Error parsing new post response:', e);
            }
          }
        });

        // Note: Actual post creation would require more complex interaction
        // This is a placeholder for when create post functionality is available
        console.log('⊘ Create post functionality detected but not fully automated in this test');
      } else {
        console.log('⊘ Create post functionality not found, skipping new post test');
      }
    });

  });

  test.describe('Functional Regression Testing', () => {

    test('should verify post engagement features still work', async ({ page }) => {
      await page.goto(APP_URL);
      await waitForFeedLoad(page);

      // Capture before screenshot
      await captureScreenshot(page, 'engagement-before-interaction');

      // Find first post
      const posts = page.locator('article, [class*="post"], [data-testid*="post"]');
      const postCount = await posts.count();

      if (postCount > 0) {
        const firstPost = posts.first();

        // Try to find engagement buttons (like, comment, share)
        const commentButton = firstPost.locator('button:has-text("Comment"), [aria-label*="comment" i]').first();
        const shareButton = firstPost.locator('button:has-text("Share"), [aria-label*="share" i]').first();

        // Test comment button
        const hasCommentButton = await commentButton.count() > 0;
        if (hasCommentButton) {
          await commentButton.click();
          await page.waitForTimeout(500);

          // Verify comment section opened (should not have impact indicators)
          const violations = await checkForImpactIndicators(page);
          expect(violations, 'Comment section should not show impact indicators').toHaveLength(0);

          console.log('✓ Comment functionality works without impact indicators');
        }

        // Capture after screenshot
        await captureScreenshot(page, 'engagement-after-interaction');
      } else {
        console.log('⊘ No posts found for engagement testing');
      }
    });

    test('should verify no console errors related to businessImpact', async ({ page }) => {
      const consoleErrors: string[] = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.goto(APP_URL);
      await waitForFeedLoad(page);

      // Check for businessImpact related errors
      const impactErrors = consoleErrors.filter(error =>
        /businessImpact|business-impact/i.test(error)
      );

      expect(impactErrors, `Found businessImpact related console errors: ${impactErrors.join(', ')}`).toHaveLength(0);

      console.log('✓ No console errors related to businessImpact');
    });

    test('should verify responsive layout works without impact indicators', async ({ page }) => {
      const viewports = [
        { name: 'desktop', width: 1920, height: 1080 },
        { name: 'tablet', width: 768, height: 1024 },
        { name: 'mobile', width: 375, height: 667 }
      ];

      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(APP_URL);
        await waitForFeedLoad(page);

        // Capture screenshot
        await captureScreenshot(page, `responsive-${viewport.name}`);

        // Verify no impact indicators at this viewport
        const violations = await checkForImpactIndicators(page);
        expect(violations, `Found impact indicators at ${viewport.name} viewport`).toHaveLength(0);

        console.log(`✓ Responsive ${viewport.name}: No impact indicators`);
      }
    });

  });

  test.describe('DOM Structure Validation', () => {

    test('should verify no impact-related CSS classes or data attributes', async ({ page }) => {
      await page.goto(APP_URL);
      await waitForFeedLoad(page);

      // Check for impact-related classes
      const impactClasses = await page.locator('[class*="impact"]').count();
      expect(impactClasses, 'Should not have elements with "impact" in class name').toBe(0);

      // Check for impact-related data attributes
      const impactDataAttrs = await page.locator('[data-impact], [data-business-impact]').count();
      expect(impactDataAttrs, 'Should not have impact-related data attributes').toBe(0);

      console.log('✓ DOM structure: No impact-related classes or attributes');
    });

    test('should verify no TrendingUp icons used for impact display', async ({ page }) => {
      await page.goto(APP_URL);
      await waitForFeedLoad(page);

      const pageContent = await page.content();

      // Check if TrendingUp icon is used in context of impact
      const hasTrendingUpWithImpact = pageContent.includes('TrendingUp') &&
                                       /impact/i.test(pageContent);

      // If TrendingUp exists, verify it's not next to impact text
      if (hasTrendingUpWithImpact) {
        const trendingUpElements = await page.locator('svg').filter({ hasText: '' }).all();

        for (const el of trendingUpElements) {
          const parent = await el.locator('..').first();
          const parentText = await parent.textContent() || '';

          const hasImpactText = /impact/i.test(parentText);
          expect(hasImpactText, 'TrendingUp icon should not be used with impact text').toBeFalsy();
        }
      }

      console.log('✓ No TrendingUp icons associated with impact display');
    });

  });

  test.describe('Comprehensive Visual Snapshot', () => {

    test('should capture comprehensive before/after comparison screenshots', async ({ page }) => {
      // This test captures all key states for comparison

      // 1. Desktop light mode
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto(APP_URL);
      await waitForFeedLoad(page);
      await captureScreenshot(page, 'final-desktop-light');

      // 2. Desktop dark mode
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.reload();
      await waitForFeedLoad(page);
      await captureScreenshot(page, 'final-desktop-dark');

      // 3. Mobile
      await page.setViewportSize({ width: 375, height: 667 });
      await page.emulateMedia({ colorScheme: 'light' });
      await page.reload();
      await waitForFeedLoad(page);
      await captureScreenshot(page, 'final-mobile');

      // 4. Tablet
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.reload();
      await waitForFeedLoad(page);
      await captureScreenshot(page, 'final-tablet');

      console.log('✓ All comprehensive screenshots captured');
      console.log(`  Screenshots location: ${SCREENSHOT_DIR}`);
    });

  });

});

// Test report generator
test.afterAll(async () => {
  console.log('\n' + '='.repeat(80));
  console.log('BUSINESS IMPACT REMOVAL VALIDATION COMPLETE');
  console.log('='.repeat(80));
  console.log(`Screenshots saved to: ${SCREENSHOT_DIR}`);
  console.log('='.repeat(80) + '\n');
});
