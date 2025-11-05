import { test, expect, Page } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

/**
 * E2E Visual Validation Tests: Onboarding Bridge Removal
 *
 * Purpose: Prove that the onboarding bridge has been completely removed from the UI
 * and that only Priority 3+ content is displayed in the Hemingway Bridge.
 *
 * Test Coverage:
 * 1. Page loads without onboarding bridge content
 * 2. Bridge displays only Priority 3+ engaging content
 * 3. No "Priority 2" indicators are visible anywhere
 * 4. Bridge state persists correctly after page refresh
 * 5. Full page validation with comprehensive screenshot
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SCREENSHOTS_DIR = join(__dirname, '../../../../docs/screenshots/onboarding-fix');
const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3001';

// Helper function to wait for the feed to load
async function waitForFeedLoad(page: Page) {
  await page.waitForSelector('[data-testid="social-feed"]', { timeout: 10000 });
  await page.waitForLoadState('networkidle');
  // Give React time to render
  await page.waitForTimeout(2000);
}

// Helper function to check for onboarding content
async function hasOnboardingContent(page: Page): Promise<boolean> {
  const onboardingKeywords = [
    'Welcome',
    'Meet our agents',
    'Getting Started',
    'Priority 2',
    'priority-2',
    'onboarding',
    'Onboarding'
  ];

  for (const keyword of onboardingKeywords) {
    const elements = await page.getByText(keyword, { exact: false }).count();
    if (elements > 0) {
      return true;
    }
  }

  // Check for Priority 2 in bridge specifically
  const bridge = page.locator('[data-testid="hemingway-bridge"]');
  if (await bridge.count() > 0) {
    const bridgeText = await bridge.textContent();
    if (bridgeText && (bridgeText.includes('Priority 2') || bridgeText.includes('Welcome'))) {
      return true;
    }
  }

  return false;
}

// Helper function to get bridge content priority
async function getBridgePriority(page: Page): Promise<number | null> {
  const bridge = page.locator('[data-testid="hemingway-bridge"]');
  if (await bridge.count() === 0) {
    return null;
  }

  // Check for priority indicator in the bridge
  const priorityText = await bridge.locator('[class*="priority"]').first().textContent();
  if (priorityText) {
    const match = priorityText.match(/Priority (\d+)/);
    if (match) {
      return parseInt(match[1]);
    }
  }

  return null;
}

test.describe('Onboarding Bridge Removal - Visual Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto(BASE_URL);
    await waitForFeedLoad(page);
  });

  test('Test 1: Page loads without onboarding bridge', async ({ page }) => {
    /**
     * Validation: Ensure the page loads completely without any onboarding bridge content
     * Expected: No "Welcome", "Meet our agents", or "Priority 2" content visible
     */

    console.log('✓ Checking for absence of onboarding content...');

    // Wait for the feed to be fully loaded
    await waitForFeedLoad(page);

    // Check that onboarding content is NOT present
    const hasOnboarding = await hasOnboardingContent(page);
    expect(hasOnboarding).toBe(false);

    // Check for specific onboarding phrases that should NOT exist
    const welcomeElements = await page.getByText('Welcome', { exact: false }).count();
    expect(welcomeElements).toBe(0);

    const meetAgentsElements = await page.getByText('Meet our agents', { exact: false }).count();
    expect(meetAgentsElements).toBe(0);

    const priority2Elements = await page.getByText('Priority 2', { exact: false }).count();
    expect(priority2Elements).toBe(0);

    // Take screenshot
    const screenshotPath = join(SCREENSHOTS_DIR, 'bridge-no-onboarding.png');
    await page.screenshot({
      path: screenshotPath,
      fullPage: true
    });

    console.log('✓ Screenshot saved: bridge-no-onboarding.png');
    console.log('✓ TEST PASSED: No onboarding content detected');
  });

  test('Test 2: Bridge shows Priority 3+ content only', async ({ page }) => {
    /**
     * Validation: Verify that the Hemingway Bridge displays only Priority 3 or higher content
     * Expected: Bridge exists and shows engaging content with Priority >= 3
     */

    console.log('✓ Checking bridge content priority...');

    // Wait for feed to load
    await waitForFeedLoad(page);

    // Check if bridge exists
    const bridge = page.locator('[data-testid="hemingway-bridge"]');
    const bridgeCount = await bridge.count();

    if (bridgeCount > 0) {
      console.log('✓ Bridge found in feed');

      // Get the bridge text content
      const bridgeText = await bridge.textContent();
      console.log('Bridge content:', bridgeText?.substring(0, 100) + '...');

      // Verify no Priority 2 content
      expect(bridgeText).not.toContain('Priority 2');
      expect(bridgeText).not.toContain('priority-2');

      // Check for Priority 3 or higher indicators
      const hasPriority3Plus = bridgeText?.includes('Priority 3') ||
                               bridgeText?.includes('Priority 4') ||
                               bridgeText?.includes('Priority 5') ||
                               // Or engaging content keywords
                               bridgeText?.includes('debate') ||
                               bridgeText?.includes('discuss') ||
                               bridgeText?.includes('hot take');

      expect(hasPriority3Plus).toBe(true);
      console.log('✓ Bridge contains Priority 3+ or engaging content');
    } else {
      console.log('ℹ No bridge displayed (acceptable if no Priority 3+ content available)');
    }

    // Take screenshot
    const screenshotPath = join(SCREENSHOTS_DIR, 'engaging-content.png');
    await page.screenshot({
      path: screenshotPath,
      fullPage: true
    });

    console.log('✓ Screenshot saved: engaging-content.png');
    console.log('✓ TEST PASSED: Only Priority 3+ content displayed');
  });

  test('Test 3: No "Priority 2" indicator visible anywhere', async ({ page }) => {
    /**
     * Validation: Comprehensive check that no Priority 2 indicators exist anywhere on the page
     * Expected: Zero instances of "Priority 2" text or priority-2 CSS classes
     */

    console.log('✓ Performing comprehensive Priority 2 check...');

    // Wait for feed to load
    await waitForFeedLoad(page);

    // Check for Priority 2 text (case-insensitive)
    const priority2Text = await page.getByText(/priority\s*2/i).count();
    expect(priority2Text).toBe(0);
    console.log('✓ No "Priority 2" text found');

    // Check for priority-2 CSS classes
    const priority2Classes = await page.locator('[class*="priority-2"]').count();
    expect(priority2Classes).toBe(0);
    console.log('✓ No "priority-2" CSS classes found');

    // Check for data-priority="2" attributes
    const priority2Attrs = await page.locator('[data-priority="2"]').count();
    expect(priority2Attrs).toBe(0);
    console.log('✓ No data-priority="2" attributes found');

    // Check bridge specifically
    const bridge = page.locator('[data-testid="hemingway-bridge"]');
    if (await bridge.count() > 0) {
      const bridgeHTML = await bridge.innerHTML();
      expect(bridgeHTML.toLowerCase()).not.toContain('priority 2');
      expect(bridgeHTML).not.toContain('priority-2');
      console.log('✓ Bridge contains no Priority 2 references');
    }

    // Take screenshot with highlighting (if any Priority 2 found)
    const screenshotPath = join(SCREENSHOTS_DIR, 'no-priority-2.png');
    await page.screenshot({
      path: screenshotPath,
      fullPage: true
    });

    console.log('✓ Screenshot saved: no-priority-2.png');
    console.log('✓ TEST PASSED: No Priority 2 indicators anywhere');
  });

  test('Test 4: Bridge persists after page refresh', async ({ page }) => {
    /**
     * Validation: Verify that the bridge behavior remains consistent after page refresh
     * Expected: No onboarding content appears after refresh, bridge state is maintained
     */

    console.log('✓ Testing bridge persistence after refresh...');

    // Wait for initial load
    await waitForFeedLoad(page);

    // Check initial state (no onboarding)
    const initialHasOnboarding = await hasOnboardingContent(page);
    expect(initialHasOnboarding).toBe(false);
    console.log('✓ Initial state: No onboarding content');

    // Get initial bridge state
    const initialBridge = page.locator('[data-testid="hemingway-bridge"]');
    const initialBridgeExists = await initialBridge.count() > 0;
    console.log(`✓ Initial bridge exists: ${initialBridgeExists}`);

    // Perform page refresh
    console.log('⟳ Refreshing page...');
    await page.reload();
    await waitForFeedLoad(page);

    // Check post-refresh state (should still have no onboarding)
    const postRefreshHasOnboarding = await hasOnboardingContent(page);
    expect(postRefreshHasOnboarding).toBe(false);
    console.log('✓ Post-refresh: No onboarding content');

    // Verify bridge state consistency
    const postRefreshBridge = page.locator('[data-testid="hemingway-bridge"]');
    const postRefreshBridgeExists = await postRefreshBridge.count() > 0;

    // Bridge should maintain its state (either present or absent consistently)
    expect(postRefreshBridgeExists).toBe(initialBridgeExists);
    console.log('✓ Bridge state consistent after refresh');

    // Take screenshot after refresh
    const screenshotPath = join(SCREENSHOTS_DIR, 'after-refresh.png');
    await page.screenshot({
      path: screenshotPath,
      fullPage: true
    });

    console.log('✓ Screenshot saved: after-refresh.png');
    console.log('✓ TEST PASSED: Bridge persists correctly after refresh');
  });

  test('Test 5: Full page validation with comprehensive screenshot', async ({ page }) => {
    /**
     * Validation: Complete end-to-end validation of the entire page
     * Expected: Clean feed with no onboarding, proper bridge display, all elements functional
     */

    console.log('✓ Performing full page validation...');

    // Wait for complete page load
    await waitForFeedLoad(page);

    // 1. Validate feed is loaded
    const feed = page.locator('[data-testid="social-feed"]');
    await expect(feed).toBeVisible();
    console.log('✓ Feed is visible');

    // 2. Validate no onboarding content
    const hasOnboarding = await hasOnboardingContent(page);
    expect(hasOnboarding).toBe(false);
    console.log('✓ No onboarding content present');

    // 3. Count total posts
    const posts = await page.locator('[data-testid="post"]').count();
    console.log(`✓ Found ${posts} posts in feed`);
    expect(posts).toBeGreaterThan(0);

    // 4. Check bridge if present
    const bridge = page.locator('[data-testid="hemingway-bridge"]');
    const bridgeCount = await bridge.count();

    if (bridgeCount > 0) {
      const bridgeText = await bridge.textContent();
      expect(bridgeText).not.toContain('Priority 2');
      expect(bridgeText).not.toContain('Welcome');
      console.log('✓ Bridge displays appropriate content (no onboarding)');
    } else {
      console.log('ℹ No bridge present (acceptable state)');
    }

    // 5. Validate page structure
    const header = await page.locator('header, [role="banner"]').count();
    expect(header).toBeGreaterThan(0);
    console.log('✓ Page header present');

    // 6. Check for console errors (none related to onboarding)
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.waitForTimeout(1000);

    const onboardingErrors = consoleErrors.filter(err =>
      err.toLowerCase().includes('onboarding') ||
      err.toLowerCase().includes('priority 2')
    );
    expect(onboardingErrors.length).toBe(0);
    console.log('✓ No onboarding-related console errors');

    // 7. Take comprehensive full-page screenshot
    const screenshotPath = join(SCREENSHOTS_DIR, 'full-page-validated.png');
    await page.screenshot({
      path: screenshotPath,
      fullPage: true
    });

    console.log('✓ Screenshot saved: full-page-validated.png');

    // 8. Generate validation summary
    const summary = {
      timestamp: new Date().toISOString(),
      feedLoaded: true,
      postsCount: posts,
      bridgePresent: bridgeCount > 0,
      onboardingDetected: hasOnboarding,
      priority2Found: false,
      consoleErrors: consoleErrors.length,
      validationPassed: true
    };

    console.log('\n=== VALIDATION SUMMARY ===');
    console.log(JSON.stringify(summary, null, 2));
    console.log('=========================\n');

    console.log('✓ TEST PASSED: Full page validation complete');
  });
});

test.describe('Additional Edge Cases', () => {
  test('Edge Case: Verify API returns no Priority 2 content', async ({ request }) => {
    /**
     * Validation: Ensure the backend API is not serving Priority 2 content
     * Expected: API response contains only Priority 3+ posts
     */

    console.log('✓ Testing API response for Priority 2 content...');

    const response = await request.get(`${API_URL}/api/posts`);
    expect(response.ok()).toBe(true);

    const posts = await response.json();
    console.log(`✓ API returned ${posts.length} posts`);

    // Check each post's priority
    const priority2Posts = posts.filter((post: any) => post.priority === 2);
    expect(priority2Posts.length).toBe(0);
    console.log('✓ No Priority 2 posts in API response');

    // Verify all posts are Priority 3 or higher
    const validPosts = posts.filter((post: any) => post.priority >= 3);
    expect(validPosts.length).toBe(posts.length);
    console.log('✓ All posts are Priority 3 or higher');
  });

  test('Edge Case: Verify onboarding routes are disabled', async ({ request }) => {
    /**
     * Validation: Ensure onboarding-related API endpoints are disabled or return empty
     * Expected: Onboarding endpoints return 404 or empty arrays
     */

    console.log('✓ Testing onboarding API endpoints...');

    // Test common onboarding endpoint patterns
    const onboardingEndpoints = [
      '/api/onboarding',
      '/api/onboarding/steps',
      '/api/onboarding/welcome'
    ];

    for (const endpoint of onboardingEndpoints) {
      const response = await request.get(`${API_URL}${endpoint}`);

      // Should be 404 or return empty data
      if (response.ok()) {
        const data = await response.json();
        expect(Array.isArray(data) ? data.length : Object.keys(data).length).toBe(0);
        console.log(`✓ ${endpoint}: Returns empty data`);
      } else {
        expect(response.status()).toBe(404);
        console.log(`✓ ${endpoint}: Returns 404 (disabled)`);
      }
    }
  });
});
