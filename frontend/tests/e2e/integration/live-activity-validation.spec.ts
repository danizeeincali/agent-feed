import { test, expect, type Page } from '@playwright/test';

/**
 * COMPREHENSIVE LIVE ACTIVITY PAGE VALIDATION TEST
 *
 * Purpose: Validate that the api.ts fixes have eliminated the "Connection failed" error
 * Target: http://localhost:5173/activity
 *
 * Success Criteria:
 * 1. NO "Network error for /activities" message visible
 * 2. NO "Connection failed" errors
 * 3. Activities data loads successfully
 * 4. Network requests use relative URLs (/api/activities)
 * 5. At least 10 activity items displayed
 * 6. No red error boxes in UI
 * 7. Console has no API errors
 * 8. Page remains stable for 30+ seconds
 */

test.describe('Live Activity Page Validation - api.ts Fix Verification', () => {
  let consoleLogs: string[] = [];
  let consoleErrors: string[] = [];
  let networkRequests: Array<{url: string, status: number, method: string}> = [];

  test.beforeEach(async ({ page }) => {
    // Capture console logs
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(`[${msg.type()}] ${text}`);
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      }
    });

    // Capture network requests
    page.on('request', request => {
      networkRequests.push({
        url: request.url(),
        status: 0,
        method: request.method()
      });
    });

    page.on('response', response => {
      const request = networkRequests.find(r => r.url === response.url() && r.status === 0);
      if (request) {
        request.status = response.status();
      }
    });
  });

  test('CRITICAL: Verify Live Activity page loads without "Connection failed" error', async ({ page }) => {
    console.log('\n=== STARTING COMPREHENSIVE LIVE ACTIVITY VALIDATION ===\n');

    // Navigate to Live Activity page
    console.log('Step 1: Navigating to http://localhost:5173/activity...');
    await page.goto('http://localhost:5173/activity', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Wait for page to be fully loaded
    await page.waitForTimeout(2000);

    // Take initial screenshot
    console.log('Step 2: Capturing initial page state...');
    await page.screenshot({
      path: 'tests/screenshots/live-activity-initial.png',
      fullPage: true
    });

    // VALIDATION 1: Check for "Network error" message (should NOT exist)
    console.log('\n--- VALIDATION 1: Checking for error messages ---');
    const networkErrorVisible = await page.locator('text=/Network error for .?\/activities/i').isVisible().catch(() => false);
    console.log(`Network error message visible: ${networkErrorVisible}`);
    expect(networkErrorVisible, 'CRITICAL: "Network error" message should NOT be visible').toBe(false);

    // VALIDATION 2: Check for "Connection failed" message (should NOT exist)
    const connectionFailedVisible = await page.locator('text=/Connection failed/i').isVisible().catch(() => false);
    console.log(`Connection failed message visible: ${connectionFailedVisible}`);
    expect(connectionFailedVisible, 'CRITICAL: "Connection failed" message should NOT be visible').toBe(false);

    // VALIDATION 3: Check for any error boxes (red backgrounds)
    const errorBoxes = await page.locator('[class*="error"], [class*="Error"], [style*="background-color: rgb(254, 226, 226)"]').count();
    console.log(`Error boxes found: ${errorBoxes}`);
    expect(errorBoxes, 'No error boxes should be visible').toBe(0);

    // VALIDATION 4: Verify "Live Activity Feed" heading is present
    console.log('\n--- VALIDATION 2: Checking page structure ---');
    const headingVisible = await page.locator('text=/Live Activity Feed/i').isVisible();
    console.log(`"Live Activity Feed" heading visible: ${headingVisible}`);
    expect(headingVisible, 'Live Activity Feed heading should be visible').toBe(true);

    // VALIDATION 5: Check for activity items
    console.log('\n--- VALIDATION 3: Checking activity data ---');

    // Wait for activities to load (look for activity items)
    const activityListSelector = '[class*="activity"], [class*="feed"], [class*="item"]';
    await page.waitForSelector(activityListSelector, { timeout: 10000 }).catch(() => null);

    // Count activity items
    const activityItems = await page.locator('[class*="activity-item"], [class*="ActivityItem"], li').count();
    console.log(`Activity items found: ${activityItems}`);
    expect(activityItems, 'At least 10 activity items should be displayed').toBeGreaterThanOrEqual(10);

    // VALIDATION 6: Verify network requests use relative URLs
    console.log('\n--- VALIDATION 4: Checking network requests ---');
    const activitiesRequests = networkRequests.filter(r => r.url.includes('/activities'));
    console.log('\nActivities API Requests:');
    activitiesRequests.forEach(req => {
      console.log(`  ${req.method} ${req.url} - Status: ${req.status}`);
    });

    // Check that we're using relative URLs (through Vite proxy)
    const relativeUrlUsed = activitiesRequests.some(r => {
      const url = new URL(r.url);
      return url.pathname.includes('/api/activities');
    });
    console.log(`Relative URL used (/api/activities): ${relativeUrlUsed}`);
    expect(relativeUrlUsed, 'Should use relative URL /api/activities').toBe(true);

    // Check for direct localhost:3000 requests (should NOT exist)
    const directBackendRequests = networkRequests.filter(r => r.url.includes('localhost:3000'));
    console.log(`Direct localhost:3000 requests: ${directBackendRequests.length}`);
    expect(directBackendRequests.length, 'Should NOT make direct requests to localhost:3000').toBe(0);

    // VALIDATION 7: Verify successful API response
    const successfulRequest = activitiesRequests.find(r => r.status === 200);
    console.log(`Successful 200 response received: ${!!successfulRequest}`);
    expect(successfulRequest, 'Should receive 200 OK response for activities').toBeDefined();

    // VALIDATION 8: Check console for API errors
    console.log('\n--- VALIDATION 5: Checking console logs ---');
    const apiErrors = consoleErrors.filter(err =>
      err.includes('api') ||
      err.includes('fetch') ||
      err.includes('network') ||
      err.includes('failed')
    );
    console.log(`API-related console errors: ${apiErrors.length}`);
    if (apiErrors.length > 0) {
      console.log('Console errors found:');
      apiErrors.forEach(err => console.log(`  - ${err}`));
    }
    expect(apiErrors.length, 'Console should have no API-related errors').toBe(0);

    // Take screenshot after validation
    await page.screenshot({
      path: 'tests/screenshots/live-activity-validated.png',
      fullPage: true
    });

    // VALIDATION 9: Monitor stability for 30 seconds
    console.log('\n--- VALIDATION 6: Monitoring stability for 30 seconds ---');
    const startTime = Date.now();
    let stabilityErrors = 0;

    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(5000);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`  ${elapsed}s - Checking page state...`);

      // Check if error appeared
      const errorAppeared = await page.locator('text=/error|failed/i').isVisible().catch(() => false);
      if (errorAppeared) {
        stabilityErrors++;
        console.log(`  ⚠️ Error detected at ${elapsed}s`);
      } else {
        console.log(`  ✓ Page stable`);
      }
    }

    console.log(`\nStability check complete. Errors during monitoring: ${stabilityErrors}`);
    expect(stabilityErrors, 'Page should remain stable for 30 seconds').toBe(0);

    // Final screenshot
    await page.screenshot({
      path: 'tests/screenshots/live-activity-stable-30s.png',
      fullPage: true
    });

    // FINAL SUMMARY
    console.log('\n=== VALIDATION SUMMARY ===');
    console.log(`✓ NO "Network error" message visible`);
    console.log(`✓ NO "Connection failed" message visible`);
    console.log(`✓ NO error boxes in UI`);
    console.log(`✓ "Live Activity Feed" heading present`);
    console.log(`✓ ${activityItems} activity items displayed`);
    console.log(`✓ Relative URLs used (/api/activities)`);
    console.log(`✓ NO direct localhost:3000 requests`);
    console.log(`✓ Successful 200 OK response received`);
    console.log(`✓ NO API-related console errors`);
    console.log(`✓ Page stable for 30 seconds`);
    console.log('\n=== ALL VALIDATIONS PASSED ===\n');
  });

  test('DETAILED: Network tab analysis - verify correct URL usage', async ({ page }) => {
    console.log('\n=== DETAILED NETWORK ANALYSIS ===\n');

    await page.goto('http://localhost:5173/activity', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    await page.waitForTimeout(3000);

    // Analyze all network requests
    console.log('\n--- ALL NETWORK REQUESTS ---');
    const apiRequests = networkRequests.filter(r => r.url.includes('/api/'));

    console.log(`\nTotal API requests: ${apiRequests.length}`);
    apiRequests.forEach((req, idx) => {
      const url = new URL(req.url);
      console.log(`\n${idx + 1}. ${req.method} ${url.pathname}${url.search}`);
      console.log(`   Full URL: ${req.url}`);
      console.log(`   Status: ${req.status}`);
    });

    // Verify activities endpoint specifically
    const activitiesReq = apiRequests.find(r => r.url.includes('/api/activities'));
    expect(activitiesReq, 'Should make request to /api/activities').toBeDefined();

    if (activitiesReq) {
      const url = new URL(activitiesReq.url);
      console.log('\n--- ACTIVITIES ENDPOINT DETAILS ---');
      console.log(`Path: ${url.pathname}`);
      console.log(`Query: ${url.search}`);
      console.log(`Status: ${activitiesReq.status}`);
      console.log(`Expected: /api/activities?limit=20&offset=0`);

      expect(url.pathname, 'Path should be /api/activities').toBe('/api/activities');
      expect(activitiesReq.status, 'Status should be 200').toBe(200);
    }

    await page.screenshot({
      path: 'tests/screenshots/live-activity-network-validated.png',
      fullPage: true
    });

    console.log('\n=== NETWORK ANALYSIS COMPLETE ===\n');
  });

  test('UI/UX: Verify data display and formatting', async ({ page }) => {
    console.log('\n=== UI/UX VALIDATION ===\n');

    await page.goto('http://localhost:5173/activity', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    await page.waitForTimeout(2000);

    // Check for WebSocket status indicator
    console.log('Checking for WebSocket status indicator...');
    const wsStatus = await page.locator('text=/connected|disconnected|connecting/i').isVisible().catch(() => false);
    console.log(`WebSocket status visible: ${wsStatus}`);

    // Verify activity list structure
    console.log('\nVerifying activity list structure...');
    const listVisible = await page.locator('ul, ol, [role="list"]').isVisible();
    console.log(`Activity list container visible: ${listVisible}`);
    expect(listVisible, 'Activity list should be visible').toBe(true);

    // Check for proper data formatting (timestamps, types, etc.)
    const activityText = await page.locator('body').textContent();
    const hasTimestamps = activityText?.includes('ago') || activityText?.includes('AM') || activityText?.includes('PM');
    console.log(`Activity timestamps present: ${hasTimestamps}`);

    // Verify no loading spinners stuck
    const loadingSpinners = await page.locator('[class*="loading"], [class*="spinner"]').count();
    console.log(`Loading spinners visible: ${loadingSpinners}`);
    expect(loadingSpinners, 'No loading spinners should be stuck').toBe(0);

    await page.screenshot({
      path: 'tests/screenshots/live-activity-ui-validated.png',
      fullPage: true
    });

    console.log('\n=== UI/UX VALIDATION COMPLETE ===\n');
  });
});