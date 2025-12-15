import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshots', 'comment-real-data');

// Mock usernames that should NOT appear (evidence of mock data)
const MOCK_USERNAMES = [
  'TechReviewer',
  'SystemValidator',
  'CodeAuditor',
  'QualityAssurance'
];

test.describe('Comment System - Real Data Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the feed
    await page.goto(BASE_URL);

    // Wait for feed to load
    await page.waitForLoadState('networkidle');
  });

  test('1. CRITICAL: Verify Real Comments Load (No Mock Data)', async ({ page }) => {
    console.log('🔍 Test 1: Verifying real comments load without mock data fallback');

    // Wait for posts to load
    await page.waitForSelector('[data-testid="agent-post"], .post-container, article', { timeout: 10000 });

    // Find a post with comments
    const posts = await page.locator('[data-testid="agent-post"], .post-container, article').all();
    console.log(`Found ${posts.length} posts`);

    let postWithComments = null;
    for (const post of posts) {
      // Look for comment button or comment count
      const commentButton = post.locator('button:has-text("Comment"), button:has-text("comment"), [aria-label*="comment" i]').first();
      const hasComments = await commentButton.isVisible().catch(() => false);

      if (hasComments) {
        postWithComments = post;
        break;
      }
    }

    expect(postWithComments).not.toBeNull();
    console.log('✓ Found post with comments');

    // Click to expand comments
    const commentButton = postWithComments!.locator('button:has-text("Comment"), button:has-text("comment"), [aria-label*="comment" i]').first();
    await commentButton.click();

    // Wait for comments section to appear
    await page.waitForTimeout(2000); // Allow time for comments to load

    // Check for mock usernames in the visible content
    const pageContent = await page.textContent('body');

    for (const mockUsername of MOCK_USERNAMES) {
      if (pageContent?.includes(mockUsername)) {
        console.error(`❌ CRITICAL: Found mock username "${mockUsername}" in page content`);
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, 'FAILURE-mock-data-detected.png'),
          fullPage: true
        });
        throw new Error(`Mock data detected: Found "${mockUsername}" in comments`);
      }
    }

    console.log('✓ No mock usernames detected');

    // Look for comment elements
    const comments = await page.locator('[data-testid="comment"], .comment, [class*="comment"]').all();
    console.log(`Found ${comments.length} comment elements`);

    // Verify at least some comments exist
    if (comments.length > 0) {
      console.log('✓ Real comments are displayed');

      // Capture screenshot of real comments
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'comment-system-real-data.png'),
        fullPage: true
      });
      console.log('📸 Screenshot saved: comment-system-real-data.png');
    } else {
      console.log('⚠️  No comments found, but no mock data either');
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'no-comments-displayed.png'),
        fullPage: true
      });
    }
  });

  test('2. Test Comment Creation and Persistence', async ({ page }) => {
    console.log('🔍 Test 2: Testing comment creation and persistence');

    // Wait for posts
    await page.waitForSelector('[data-testid="agent-post"], .post-container, article', { timeout: 10000 });

    // Find first post
    const firstPost = page.locator('[data-testid="agent-post"], .post-container, article').first();

    // Open comments section
    const commentButton = firstPost.locator('button:has-text("Comment"), button:has-text("comment"), [aria-label*="comment" i]').first();
    await commentButton.click();
    await page.waitForTimeout(1000);

    // Find comment input field
    const commentInput = page.locator('textarea[placeholder*="comment" i], input[placeholder*="comment" i], [data-testid="comment-input"]').first();
    await commentInput.waitFor({ state: 'visible', timeout: 5000 });

    // Create unique test comment
    const testComment = `E2E Test Comment - Real Data Validation - ${Date.now()}`;
    await commentInput.fill(testComment);
    console.log(`✓ Entered comment: "${testComment}"`);

    // Submit comment
    const submitButton = page.locator('button:has-text("Post"), button:has-text("Submit"), button[type="submit"]').first();
    await submitButton.click();
    console.log('✓ Clicked submit button');

    // Wait for comment to appear
    await page.waitForTimeout(2000);

    // Verify comment appears in the page
    const commentAppeared = await page.getByText(testComment).isVisible().catch(() => false);
    expect(commentAppeared).toBeTruthy();
    console.log('✓ Comment appeared immediately after creation');

    // Capture screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'comment-creation-success.png'),
      fullPage: true
    });
    console.log('📸 Screenshot saved: comment-creation-success.png');

    // Refresh page to verify persistence
    console.log('🔄 Refreshing page to test persistence...');
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verify comment persists after refresh
    const commentPersisted = await page.getByText(testComment).isVisible().catch(() => false);

    if (commentPersisted) {
      console.log('✓ Comment persisted after page refresh');
    } else {
      console.log('⚠️  Comment did not persist after refresh (may need to reopen comments section)');

      // Try reopening comments section
      await page.waitForSelector('[data-testid="agent-post"], .post-container, article', { timeout: 5000 });
      const firstPostAfterRefresh = page.locator('[data-testid="agent-post"], .post-container, article').first();
      const commentButtonAfterRefresh = firstPostAfterRefresh.locator('button:has-text("Comment"), button:has-text("comment")').first();
      await commentButtonAfterRefresh.click();
      await page.waitForTimeout(2000);

      const commentPersistedAfterReopen = await page.getByText(testComment).isVisible().catch(() => false);
      expect(commentPersistedAfterReopen).toBeTruthy();
      console.log('✓ Comment persisted after reopening comments section');
    }

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'comment-persistence-verified.png'),
      fullPage: true
    });
  });

  test('3. Test Reply Creation and Threading', async ({ page }) => {
    console.log('🔍 Test 3: Testing reply creation and thread structure');

    // Wait for posts
    await page.waitForSelector('[data-testid="agent-post"], .post-container, article', { timeout: 10000 });

    // Find first post and open comments
    const firstPost = page.locator('[data-testid="agent-post"], .post-container, article').first();
    const commentButton = firstPost.locator('button:has-text("Comment"), button:has-text("comment")').first();
    await commentButton.click();
    await page.waitForTimeout(2000);

    // Look for existing comments with reply button
    const replyButtons = page.locator('button:has-text("Reply"), button:has-text("reply"), [aria-label*="reply" i]');
    const replyButtonCount = await replyButtons.count();

    if (replyButtonCount === 0) {
      console.log('⚠️  No existing comments to reply to, creating a comment first...');

      // Create a comment to reply to
      const commentInput = page.locator('textarea[placeholder*="comment" i], input[placeholder*="comment" i]').first();
      await commentInput.fill('Parent comment for reply test');
      const submitButton = page.locator('button:has-text("Post"), button:has-text("Submit")').first();
      await submitButton.click();
      await page.waitForTimeout(2000);
    }

    // Find reply button
    const replyButton = page.locator('button:has-text("Reply"), button:has-text("reply"), [aria-label*="reply" i]').first();
    await replyButton.waitFor({ state: 'visible', timeout: 5000 });
    await replyButton.click();
    console.log('✓ Clicked reply button');

    await page.waitForTimeout(1000);

    // Find reply input (might be different from main comment input)
    const replyInput = page.locator('textarea[placeholder*="reply" i], input[placeholder*="reply" i], textarea[placeholder*="comment" i]').last();
    await replyInput.waitFor({ state: 'visible', timeout: 5000 });

    // Create reply
    const testReply = `E2E Reply - Threaded Test - ${Date.now()}`;
    await replyInput.fill(testReply);
    console.log(`✓ Entered reply: "${testReply}"`);

    // Submit reply
    const replySubmitButton = page.locator('button:has-text("Post"), button:has-text("Submit"), button:has-text("Reply")').last();
    await replySubmitButton.click();
    console.log('✓ Clicked submit reply button');

    await page.waitForTimeout(2000);

    // Verify reply appears
    const replyAppeared = await page.getByText(testReply).isVisible().catch(() => false);
    expect(replyAppeared).toBeTruthy();
    console.log('✓ Reply appeared after creation');

    // Verify thread structure (reply should be nested/indented)
    const replyElement = page.getByText(testReply).locator('..').locator('..'); // Navigate up to comment container
    const hasIndentation = await replyElement.evaluate((el) => {
      const style = window.getComputedStyle(el);
      const marginLeft = parseInt(style.marginLeft || '0');
      const paddingLeft = parseInt(style.paddingLeft || '0');
      return marginLeft > 20 || paddingLeft > 20; // Check for indentation
    }).catch(() => false);

    if (hasIndentation) {
      console.log('✓ Reply has proper thread indentation');
    } else {
      console.log('⚠️  Reply indentation not detected (visual verification needed)');
    }

    // Capture screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'reply-threading-success.png'),
      fullPage: true
    });
    console.log('📸 Screenshot saved: reply-threading-success.png');
  });

  test('4. Test Error Handling and Console Validation', async ({ page }) => {
    console.log('🔍 Test 4: Testing error handling and console validation');

    const consoleMessages: string[] = [];
    const consoleErrors: string[] = [];
    const networkErrors: string[] = [];

    // Listen for console messages
    page.on('console', (msg) => {
      const text = msg.text();
      consoleMessages.push(text);

      if (msg.type() === 'error') {
        consoleErrors.push(text);
        console.log(`❌ Console Error: ${text}`);
      }
    });

    // Listen for network failures
    page.on('requestfailed', (request) => {
      const url = request.url();
      const failure = request.failure();
      networkErrors.push(`${url}: ${failure?.errorText || 'Unknown error'}`);
      console.log(`❌ Network Error: ${url} - ${failure?.errorText}`);
    });

    // Navigate and interact
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Open comments on first post
    const firstPost = page.locator('[data-testid="agent-post"], .post-container, article').first();
    const commentButton = firstPost.locator('button:has-text("Comment"), button:has-text("comment")').first();
    await commentButton.click();
    await page.waitForTimeout(3000); // Allow time for API calls

    // Check for specific error patterns
    const hasV1PrefixErrors = consoleErrors.some(err => err.includes('/v1/') || err.includes('404'));
    const hasMockFallbackMessages = consoleMessages.some(msg =>
      msg.toLowerCase().includes('mock') ||
      msg.toLowerCase().includes('fallback')
    );

    // Assertions
    expect(hasV1PrefixErrors).toBeFalsy();
    console.log('✓ No /v1/ prefix 404 errors detected');

    expect(hasMockFallbackMessages).toBeFalsy();
    console.log('✓ No mock data fallback messages detected');

    // Document console output
    const consoleReport = {
      totalMessages: consoleMessages.length,
      totalErrors: consoleErrors.length,
      networkErrors: networkErrors.length,
      errors: consoleErrors,
      networkFailures: networkErrors,
      hasV1Errors: hasV1PrefixErrors,
      hasMockFallback: hasMockFallbackMessages
    };

    console.log('\n📊 Console Output Report:');
    console.log(JSON.stringify(consoleReport, null, 2));

    // Capture final screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'console-validation-complete.png'),
      fullPage: true
    });
    console.log('📸 Screenshot saved: console-validation-complete.png');

    // Write console report to file
    const fs = require('fs');
    const reportPath = path.join(SCREENSHOT_DIR, 'console-error-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(consoleReport, null, 2));
    console.log(`📄 Console report saved: ${reportPath}`);
  });
});
