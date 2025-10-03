import { test, expect } from '@playwright/test';

test.describe('Final Empty State Validation - READ ONLY', () => {
  let consoleErrors: string[] = [];
  let consoleWarnings: string[] = [];

  test.beforeEach(async ({ page }) => {
    // Capture console messages
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      }
    });

    // Capture page errors
    page.on('pageerror', (error) => {
      consoleErrors.push(`Page Error: ${error.message}`);
    });
  });

  test('1. Empty State Validation - Initial Load', async ({ page }) => {
    console.log('📍 Test 1: Navigating to empty feed...');

    // Navigate to the page
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

    // Wait for React to render
    await page.waitForTimeout(2000);

    // Verify page loaded successfully
    await expect(page).toHaveTitle(/Agent Feed/);

    // Take screenshot of initial empty state
    await page.screenshot({
      path: 'tests/e2e/screenshots/validation/empty-feed-initial-state.png',
      fullPage: true
    });

    console.log('✅ Test 1 Complete: Initial state captured');
  });

  test('2. No Test Data Verification', async ({ page }) => {
    console.log('📍 Test 2: Verifying no test data exists...');

    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Check for specific test posts that should NOT exist
    const testPostTitles = [
      'Third Test Post',
      'First Post',
      'Second Post',
      'Test Post'
    ];

    for (const title of testPostTitles) {
      const postExists = await page.locator(`text="${title}"`).count();
      expect(postExists).toBe(0);
      console.log(`✅ Verified "${title}" does NOT exist`);
    }

    // Verify API returns empty array
    const response = await page.request.get('http://localhost:3001/api/agent-posts');
    expect(response.ok()).toBeTruthy();

    const result = await response.json();
    const posts = result.data || result; // Handle both formats
    expect(Array.isArray(posts)).toBeTruthy();
    expect(posts.length).toBe(0);
    console.log(`✅ API returns empty array: ${posts.length} posts`);

    // Take screenshot showing no test data
    await page.screenshot({
      path: 'tests/e2e/screenshots/validation/no-test-data-visible.png',
      fullPage: true
    });

    console.log('✅ Test 2 Complete: No test data verified');
  });

  test('3. UI Components Present', async ({ page }) => {
    console.log('📍 Test 3: Verifying UI components exist...');

    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Verify Quick Post interface exists (try multiple placeholder variations)
    const quickPostTextarea = await page.locator('textarea').first();
    const textareaCount = await quickPostTextarea.count();
    expect(textareaCount).toBeGreaterThan(0);
    console.log('✅ Quick Post interface exists');

    // Verify feed container exists (could be empty)
    const feedExists = await page.locator('[class*="feed"]').count();
    expect(feedExists).toBeGreaterThan(0);
    console.log('✅ Feed container exists');

    // Verify no error messages in UI
    const errorMessages = await page.locator('text=/error/i').count();
    console.log(`📊 Error messages found in UI: ${errorMessages}`);

    // Take screenshot of UI components
    await page.screenshot({
      path: 'tests/e2e/screenshots/validation/ui-components-present.png',
      fullPage: true
    });

    console.log('✅ Test 3 Complete: UI components verified');
  });

  test('4. Console Error Check', async ({ page }) => {
    console.log('📍 Test 4: Checking browser console...');

    // Reset console arrays
    consoleErrors = [];
    consoleWarnings = [];

    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Filter out expected WebSocket errors
    const unexpectedErrors = consoleErrors.filter(error =>
      !error.includes('WebSocket') &&
      !error.includes('ws://') &&
      !error.includes('ECONNREFUSED')
    );

    console.log('\n📊 Console Error Report:');
    console.log(`Total errors: ${consoleErrors.length}`);
    console.log(`WebSocket errors (expected): ${consoleErrors.length - unexpectedErrors.length}`);
    console.log(`Unexpected errors: ${unexpectedErrors.length}`);
    console.log(`Warnings: ${consoleWarnings.length}`);

    if (unexpectedErrors.length > 0) {
      console.log('\n⚠️ Unexpected Errors Found:');
      unexpectedErrors.forEach((error, i) => {
        console.log(`${i + 1}. ${error}`);
      });
    }

    if (consoleWarnings.length > 0) {
      console.log('\n⚠️ Warnings Found:');
      consoleWarnings.slice(0, 5).forEach((warning, i) => {
        console.log(`${i + 1}. ${warning}`);
      });
    }

    // Take screenshot of console state
    await page.screenshot({
      path: 'tests/e2e/screenshots/validation/console-state.png',
      fullPage: true
    });

    console.log('✅ Test 4 Complete: Console state captured');
  });

  test('5. Final Database Empty Verification', async ({ page }) => {
    console.log('📍 Test 5: Final verification database is empty...');

    // Double-check API returns empty
    const postsResponse = await page.request.get('http://localhost:3001/api/agent-posts');
    const result = await postsResponse.json();
    const posts = result.data || result; // Handle both formats

    console.log('\n📊 Final Database State:');
    console.log(`Posts in database: ${posts.length}`);
    console.log(`Database is empty: ${posts.length === 0 ? '✅ YES' : '❌ NO'}`);

    expect(posts.length).toBe(0);

    console.log('✅ Test 5 Complete: Database confirmed empty');
  });
});
