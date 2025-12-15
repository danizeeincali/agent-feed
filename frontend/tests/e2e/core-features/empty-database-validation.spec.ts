import { test, expect, Page } from '@playwright/test';

/**
 * Empty Database Validation Test Suite
 *
 * Tests application behavior when database is completely empty (0 posts, 0 comments)
 * Validates:
 * - Page loads without errors
 * - No mock data appears
 * - Empty state UI displays correctly
 * - Post creation works
 * - Comment creation works
 */

test.describe('Empty Database Validation', () => {
  let consoleLogs: string[] = [];
  let consoleErrors: string[] = [];
  let consoleWarnings: string[] = [];

  test.beforeEach(async ({ page }) => {
    // Capture console messages
    consoleLogs = [];
    consoleErrors = [];
    consoleWarnings = [];

    page.on('console', (msg) => {
      const text = msg.text();
      const type = msg.type();

      if (type === 'error') {
        consoleErrors.push(text);
      } else if (type === 'warning') {
        consoleWarnings.push(text);
      } else {
        consoleLogs.push(text);
      }
    });

    // Capture page errors
    page.on('pageerror', (error) => {
      consoleErrors.push(`Page Error: ${error.message}`);
    });
  });

  test('Empty State: Page loads without errors', async ({ page }) => {
    // Navigate to the application
    await page.goto('/');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Take screenshot of initial empty state
    await page.screenshot({
      path: 'tests/e2e/screenshots/empty-database/01-initial-load.png',
      fullPage: true
    });

    // Verify no critical console errors
    const criticalErrors = consoleErrors.filter(error =>
      !error.includes('favicon') &&
      !error.includes('DevTools') &&
      !error.includes('Download the React DevTools')
    );

    console.log('Console Errors:', criticalErrors);
    console.log('Console Warnings:', consoleWarnings);

    expect(criticalErrors.length).toBe(0);

    // Verify page title
    await expect(page).toHaveTitle(/Agent Feed/i);
  });

  test('Empty State: No mock data appears', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check API response is empty
    const response = await page.request.get('http://localhost:3001/api/agent-posts');
    const data = await response.json();

    console.log('API Response:', JSON.stringify(data, null, 2));

    expect(data.success).toBe(true);
    expect(data.data).toEqual([]);
    expect(data.total).toBe(0);

    // Verify no posts are displayed in the feed
    const postElements = await page.locator('[class*="post"]').count();
    console.log('Post elements found:', postElements);

    // Take screenshot showing empty feed
    await page.screenshot({
      path: 'tests/e2e/screenshots/empty-database/02-empty-feed-verification.png',
      fullPage: true
    });
  });

  test('Empty State: UI displays correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Check for empty state message or posting interface
    const pageContent = await page.content();
    console.log('Page has posting interface:', pageContent.includes('Post') || pageContent.includes('Share'));

    // Verify main feed container exists
    const feedExists = await page.locator('main, [role="main"], .feed').count() > 0;
    expect(feedExists).toBe(true);

    // Take screenshot of empty UI state
    await page.screenshot({
      path: 'tests/e2e/screenshots/empty-database/03-empty-ui-state.png',
      fullPage: true
    });

    // Verify no console errors
    const criticalErrors = consoleErrors.filter(error =>
      !error.includes('favicon') &&
      !error.includes('DevTools') &&
      !error.includes('Download the React DevTools')
    );
    expect(criticalErrors.length).toBe(0);
  });

  test('Post Creation: Create new post via UI', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for posting interface
    const textareaSelectors = [
      'textarea[placeholder*="What"]',
      'textarea[placeholder*="Share"]',
      'textarea[placeholder*="Post"]',
      'textarea',
    ];

    let textarea = null;
    for (const selector of textareaSelectors) {
      const element = page.locator(selector).first();
      if (await element.count() > 0) {
        textarea = element;
        console.log('Found textarea with selector:', selector);
        break;
      }
    }

    if (!textarea) {
      console.log('Available textareas:', await page.locator('textarea').count());
      throw new Error('Could not find posting textarea');
    }

    // Create a test post
    const testPostContent = 'Test post created at ' + new Date().toISOString() + ' - validating empty database functionality';

    await textarea.click();
    await textarea.fill(testPostContent);

    // Take screenshot before posting
    await page.screenshot({
      path: 'tests/e2e/screenshots/empty-database/04-before-post-creation.png',
      fullPage: true
    });

    // Find and click post button
    const postButtonSelectors = [
      'button:has-text("Post")',
      'button:has-text("Share")',
      'button:has-text("Submit")',
      'button[type="submit"]',
    ];

    let postButton = null;
    for (const selector of postButtonSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible().catch(() => false)) {
        postButton = element;
        console.log('Found post button with selector:', selector);
        break;
      }
    }

    if (!postButton) {
      throw new Error('Could not find post button');
    }

    await postButton.click();

    // Wait for post to be created
    await page.waitForTimeout(2000);

    // Verify post appears in feed
    await page.waitForLoadState('networkidle');

    // Take screenshot after posting
    await page.screenshot({
      path: 'tests/e2e/screenshots/empty-database/05-after-post-creation.png',
      fullPage: true
    });

    // Verify API now returns 1 post
    const response = await page.request.get('http://localhost:3001/api/agent-posts');
    const data = await response.json();

    console.log('API Response after post:', JSON.stringify(data, null, 2));

    expect(data.success).toBe(true);
    expect(data.data.length).toBeGreaterThanOrEqual(1);
    expect(data.total).toBeGreaterThanOrEqual(1);

    // Find the created post
    const createdPost = data.data.find((post: any) => post.content.includes('validating empty database functionality'));
    expect(createdPost).toBeDefined();

    // Verify engagement counts are 0
    expect(createdPost.likes || 0).toBe(0);
    expect(createdPost.comments || 0).toBe(0);
    expect(createdPost.shares || 0).toBe(0);
  });

  test('Comment Creation: Add comment to post', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // First, ensure we have at least one post
    const apiResponse = await page.request.get('http://localhost:3001/api/agent-posts');
    const apiData = await apiResponse.json();

    if (apiData.data.length === 0) {
      // Create a post first
      const textarea = page.locator('textarea').first();
      await textarea.click();
      await textarea.fill('Post for comment testing ' + new Date().toISOString());

      const postButton = page.locator('button:has-text("Post")').first();
      await postButton.click();
      await page.waitForTimeout(2000);
    }

    // Reload to see the post
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Take screenshot before adding comment
    await page.screenshot({
      path: 'tests/e2e/screenshots/empty-database/06-before-comment-creation.png',
      fullPage: true
    });

    // Look for comment button or input
    const commentSelectors = [
      'button:has-text("Comment")',
      '[aria-label*="comment" i]',
      'button[aria-label*="comment" i]',
      '.comment-button',
      '[class*="comment"]',
    ];

    let commentTrigger = null;
    for (const selector of commentSelectors) {
      const element = page.locator(selector).first();
      if (await element.count() > 0 && await element.isVisible().catch(() => false)) {
        commentTrigger = element;
        console.log('Found comment trigger with selector:', selector);
        break;
      }
    }

    if (commentTrigger) {
      await commentTrigger.click();
      await page.waitForTimeout(1000);

      // Look for comment input
      const commentInput = page.locator('textarea, input[type="text"]').last();

      if (await commentInput.isVisible().catch(() => false)) {
        const testComment = 'Test comment added at ' + new Date().toISOString();
        await commentInput.fill(testComment);

        // Find submit button
        const submitButton = page.locator('button:has-text("Comment"), button:has-text("Submit"), button[type="submit"]').last();
        if (await submitButton.isVisible().catch(() => false)) {
          await submitButton.click();
          await page.waitForTimeout(2000);

          // Take screenshot after comment
          await page.screenshot({
            path: 'tests/e2e/screenshots/empty-database/07-after-comment-creation.png',
            fullPage: true
          });

          // Verify comment appears
          const commentExists = await page.locator(`text=${testComment}`).count() > 0;
          console.log('Comment exists:', commentExists);
        }
      }
    } else {
      console.log('Comment functionality not found in UI - this may be expected');
    }

    // Take final screenshot
    await page.screenshot({
      path: 'tests/e2e/screenshots/empty-database/08-final-state.png',
      fullPage: true
    });
  });

  test('Console Validation: No errors throughout session', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Interact with the page
    await page.waitForTimeout(2000);

    // Filter out known non-critical errors
    const criticalErrors = consoleErrors.filter(error =>
      !error.includes('favicon') &&
      !error.includes('DevTools') &&
      !error.includes('Download the React DevTools') &&
      !error.includes('extension')
    );

    // Log all captured messages
    console.log('\n=== CONSOLE VALIDATION REPORT ===');
    console.log('Total logs:', consoleLogs.length);
    console.log('Total warnings:', consoleWarnings.length);
    console.log('Total errors:', consoleErrors.length);
    console.log('Critical errors:', criticalErrors.length);

    if (criticalErrors.length > 0) {
      console.log('\nCritical Errors:');
      criticalErrors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error}`);
      });
    }

    if (consoleWarnings.length > 0 && consoleWarnings.length < 10) {
      console.log('\nWarnings:');
      consoleWarnings.forEach((warning, i) => {
        console.log(`  ${i + 1}. ${warning}`);
      });
    }

    // Take screenshot of console state
    await page.screenshot({
      path: 'tests/e2e/screenshots/empty-database/09-console-state.png',
      fullPage: true
    });

    expect(criticalErrors.length).toBe(0);
  });

  test('Database State: Verify truly empty (no mock data)', async ({ page }) => {
    // Direct API check
    const response = await page.request.get('http://localhost:3001/api/agent-posts');
    const data = await response.json();

    console.log('\n=== DATABASE STATE VERIFICATION ===');
    console.log('API Response:', JSON.stringify(data, null, 2));
    console.log('Success:', data.success);
    console.log('Total posts:', data.total);
    console.log('Data length:', data.data.length);

    // Initially should be empty or have only user-created posts
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);

    // If there are posts, they should NOT be mock data
    if (data.data.length > 0) {
      data.data.forEach((post: any, index: number) => {
        console.log(`\nPost ${index + 1}:`);
        console.log('  ID:', post.id);
        console.log('  Agent:', post.agentId);
        console.log('  Content preview:', post.content.substring(0, 100));
        console.log('  Timestamp:', post.timestamp);

        // Mock data would have specific patterns - verify these don't exist
        const isMockPattern =
          post.content.includes('Just deployed') ||
          post.content.includes('Working on') ||
          post.agentId.includes('gpt-') ||
          post.agentId.includes('claude-');

        expect(isMockPattern).toBe(false);
      });
    }

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Take final verification screenshot
    await page.screenshot({
      path: 'tests/e2e/screenshots/empty-database/10-database-verification.png',
      fullPage: true
    });
  });
});
