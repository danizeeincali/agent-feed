import { test, expect } from '@playwright/test';

/**
 * FINAL VALIDATION: Quick Post Database Integration
 *
 * Validates complete end-to-end functionality with real servers:
 * - Frontend: http://localhost:5173
 * - API: http://localhost:3001
 * - Database: SQLite (real persistence)
 *
 * NO MOCKS - 100% real functionality validation
 */

test.describe('Quick Post Database Validation', () => {
  const frontendUrl = 'http://localhost:5173';
  const apiUrl = 'http://localhost:3001';

  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto(frontendUrl);

    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');
  });

  test('should create post and verify database persistence', async ({ page }) => {
    // Track network requests
    const requests: Array<{ method: string; url: string; status: number | null }> = [];

    page.on('request', request => {
      if (request.url().includes('localhost:3001')) {
        requests.push({
          method: request.method(),
          url: request.url(),
          status: null
        });
      }
    });

    page.on('response', response => {
      if (response.url().includes('localhost:3001')) {
        const req = requests.find(r => r.url === response.url() && r.status === null);
        if (req) {
          req.status = response.status();
        }
      }
    });

    // STEP 1: Verify Quick Post tab exists (no "Post" tab)
    console.log('STEP 1: Verifying Quick Post tab exists...');

    const quickPostTab = page.locator('button:has-text("Quick Post")');
    await expect(quickPostTab).toBeVisible({ timeout: 10000 });

    // Verify old "Post" tab does NOT exist
    const oldPostTab = page.locator('button:text-is("Post")');
    await expect(oldPostTab).toHaveCount(0);

    console.log('✓ Quick Post tab exists, old Post tab removed');

    // STEP 2: Create a new unique post with timestamp
    const timestamp = new Date().toISOString();
    const postTitle = `E2E Test Post - ${timestamp}`;
    const postContent = `This is a validation test post created at ${timestamp}. Testing real database persistence with no mocks.`;

    console.log(`STEP 2: Creating post with title: ${postTitle}`);

    // Click Quick Post tab to ensure it's active
    await quickPostTab.click();
    await page.waitForTimeout(500);

    // Find and fill the title input
    const titleInput = page.locator('input[placeholder*="Title"], input[name="title"], textarea[placeholder*="Title"]').first();
    await expect(titleInput).toBeVisible({ timeout: 5000 });
    await titleInput.fill(postTitle);

    // Find and fill the content textarea
    const contentTextarea = page.locator('textarea[placeholder*="content"], textarea[placeholder*="thinking"], textarea[name="content"]').first();
    await expect(contentTextarea).toBeVisible({ timeout: 5000 });
    await contentTextarea.fill(postContent);

    // Wait a moment for character counter to update
    await page.waitForTimeout(500);

    // Capture screenshot before posting
    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/database-validation-before-submit.png',
      fullPage: true
    });
    console.log('✓ Screenshot saved: database-validation-before-submit.png');

    // Find and click the Post/Submit button
    const submitButton = page.locator('button:has-text("Post"), button:has-text("Submit"), button[type="submit"]').first();
    await expect(submitButton).toBeVisible({ timeout: 5000 });
    await expect(submitButton).toBeEnabled();

    // Click submit and wait for response
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/api/posts') && response.request().method() === 'POST',
      { timeout: 10000 }
    );

    await submitButton.click();
    console.log('✓ Submit button clicked');

    const response = await responsePromise;
    const responseStatus = response.status();
    const responseBody = await response.json().catch(() => null);

    console.log(`✓ POST request completed with status: ${responseStatus}`);
    if (responseBody) {
      console.log(`✓ Response body:`, JSON.stringify(responseBody, null, 2));
    }

    expect(responseStatus).toBe(201);
    expect(responseBody).toHaveProperty('id');

    const createdPostId = responseBody.id;
    console.log(`✓ Post created with ID: ${createdPostId}`);

    // STEP 3: Verify post appears in feed immediately
    console.log('STEP 3: Verifying post appears in feed...');

    // Wait for feed to update
    await page.waitForTimeout(2000);

    // Switch to Feed tab if needed
    const feedTab = page.locator('button:has-text("Feed")');
    if (await feedTab.isVisible()) {
      await feedTab.click();
      await page.waitForTimeout(1000);
    }

    // Look for the post in the feed
    const postInFeed = page.locator(`text="${postTitle}"`).first();
    await expect(postInFeed).toBeVisible({ timeout: 10000 });

    console.log('✓ Post appears in feed immediately');

    // STEP 4: Capture screenshot of post in feed
    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/database-validation-post-in-feed.png',
      fullPage: true
    });
    console.log('✓ Screenshot saved: database-validation-post-in-feed.png');

    // STEP 5: Refresh page to verify persistence
    console.log('STEP 5: Refreshing page to verify persistence...');

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // STEP 6: Verify post still appears after refresh
    console.log('STEP 6: Verifying post persists after refresh...');

    // Ensure we're on Feed tab
    const feedTabAfterRefresh = page.locator('button:has-text("Feed")');
    if (await feedTabAfterRefresh.isVisible()) {
      await feedTabAfterRefresh.click();
      await page.waitForTimeout(1000);
    }

    // Verify post still exists
    const postAfterRefresh = page.locator(`text="${postTitle}"`).first();
    await expect(postAfterRefresh).toBeVisible({ timeout: 10000 });

    console.log('✓ Post persists after page refresh');

    // STEP 7: Capture screenshot after refresh
    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/database-validation-after-refresh.png',
      fullPage: true
    });
    console.log('✓ Screenshot saved: database-validation-after-refresh.png');

    // STEP 8: Print network activity summary
    console.log('\n=== NETWORK ACTIVITY SUMMARY ===');
    requests.forEach(req => {
      console.log(`${req.method} ${req.url} - Status: ${req.status || 'pending'}`);
    });

    // STEP 9: Database verification via API
    console.log('\n=== DATABASE VERIFICATION ===');

    const verifyResponse = await page.request.get(`${apiUrl}/api/posts/${createdPostId}`);
    expect(verifyResponse.status()).toBe(200);

    const verifiedPost = await verifyResponse.json();
    console.log('Post from database:', JSON.stringify(verifiedPost, null, 2));

    expect(verifiedPost.title).toBe(postTitle);
    expect(verifiedPost.content).toBe(postContent);

    console.log('✓ Database verification successful');

    // Final summary
    console.log('\n=== VALIDATION SUMMARY ===');
    console.log('✓ Quick Post tab exists');
    console.log('✓ Old Post tab removed');
    console.log(`✓ Post created successfully (ID: ${createdPostId})`);
    console.log('✓ Post appears in feed immediately');
    console.log('✓ Post persists after page refresh');
    console.log('✓ Database contains correct post data');
    console.log('✓ All screenshots captured');
    console.log('\n=== ALL VALIDATION CHECKS PASSED ===');
  });

  test('should verify character counter and validation', async ({ page }) => {
    console.log('BONUS TEST: Verifying character counter and validation...');

    // Click Quick Post tab
    const quickPostTab = page.locator('button:has-text("Quick Post")');
    await quickPostTab.click();
    await page.waitForTimeout(500);

    // Find content textarea
    const contentTextarea = page.locator('textarea[placeholder*="content"], textarea[placeholder*="thinking"], textarea[name="content"]').first();
    await expect(contentTextarea).toBeVisible();

    // Type text and verify character counter
    const testText = 'Testing character counter';
    await contentTextarea.fill(testText);
    await page.waitForTimeout(500);

    // Look for character counter
    const characterCounter = page.locator('text=/\\d+\\/10000/');
    await expect(characterCounter).toBeVisible();

    const counterText = await characterCounter.textContent();
    console.log(`✓ Character counter visible: ${counterText}`);

    // Verify counter shows correct count
    expect(counterText).toContain(testText.length.toString());

    // Capture screenshot of character counter
    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/database-validation-character-counter.png',
      fullPage: true
    });
    console.log('✓ Screenshot saved: database-validation-character-counter.png');

    console.log('✓ Character counter validation passed');
  });
});
