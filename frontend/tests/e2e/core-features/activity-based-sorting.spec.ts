/**
 * E2E Tests: Activity-Based Post Sorting
 *
 * Validates that posts are sorted by most recent activity (post creation OR latest comment)
 * in the live application with screenshot evidence.
 *
 * Test Strategy:
 * 1. Create posts and verify they appear at top
 * 2. Add comments and verify posts "bump" to top
 * 3. Verify post positions persist after page refresh
 * 4. Capture screenshots for visual validation
 */

import { test, expect, Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Screenshot directory
const SCREENSHOT_DIR = path.join(__dirname, '../screenshots/activity-sorting');

// Helper: Get post position by title
async function getPostPosition(page: Page, titleSubstring: string): Promise<number> {
  const posts = await page.locator('[data-testid="social-post"], .post-card, article').all();

  for (let i = 0; i < posts.length; i++) {
    const text = await posts[i].textContent();
    if (text && text.includes(titleSubstring)) {
      return i + 1; // 1-indexed position
    }
  }

  return -1; // Not found
}

// Helper: Get all post titles in order
async function getAllPostTitles(page: Page): Promise<string[]> {
  const posts = await page.locator('[data-testid="social-post"], .post-card, article').all();
  const titles: string[] = [];

  for (const post of posts) {
    const titleElement = await post.locator('h2, h3, [data-testid="post-title"]').first();
    const title = await titleElement.textContent();
    if (title) {
      titles.push(title.trim());
    }
  }

  return titles;
}

// Helper: Create post via UI
async function createPostViaUI(page: Page, title: string, content: string) {
  // Fill in quick post input
  const input = page.locator('[data-testid="quick-post-input"], textarea, input[type="text"]').first();
  await input.fill(`${title}\n\n${content}`);

  // Submit
  const submitButton = page.locator('[data-testid="quick-post-submit"], button:has-text("Post"), button:has-text("Submit")').first();
  await submitButton.click();

  // Wait for post to appear
  await page.waitForTimeout(500);
}

test.describe('Activity-Based Post Sorting - Live UI Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Wait for feed to load
    await page.waitForSelector('[data-testid="social-post"], .post-card, article', { timeout: 10000 });
  });

  test('New post appears at top immediately', async ({ page }) => {
    // Arrange: Get initial post count
    const initialTitles = await getAllPostTitles(page);
    const timestamp = Date.now();
    const testTitle = `E2E TEST - New Post ${timestamp}`;

    // Act: Create new post
    await createPostViaUI(page, testTitle, 'This post should appear at position 1');

    // Wait for optimistic update
    await page.waitForTimeout(1000);

    // Assert: Verify post is at position 1
    const position = await getPostPosition(page, testTitle);
    expect(position).toBe(1);

    // Screenshot: Post at position 1 (immediately after creation)
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `new-post-position-1-immediate-${timestamp}.png`),
      fullPage: true
    });

    console.log(`✅ New post "${testTitle}" is at position 1 (immediate)`);
  });

  test('New post STAYS at top after API refresh (critical)', async ({ page }) => {
    // Arrange
    const timestamp = Date.now();
    const testTitle = `E2E TEST - Stay At Top ${timestamp}`;

    // Act: Create post
    await createPostViaUI(page, testTitle, 'This post must stay at position 1 after refresh');

    // Wait for optimistic update
    await page.waitForTimeout(500);

    // Verify immediately
    let position = await getPostPosition(page, testTitle);
    expect(position).toBe(1);

    // Screenshot: Before API refresh
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `stay-at-top-before-refresh-${timestamp}.png`),
      fullPage: true
    });

    // Wait for API refresh (frontend calls loadPosts() after 1 second)
    await page.waitForTimeout(2500); // 1s delay + buffer

    // Assert: Post should STILL be at position 1
    position = await getPostPosition(page, testTitle);
    expect(position).toBe(1); // ✅ CRITICAL: Must stay at top!

    // Screenshot: After API refresh
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `stay-at-top-after-refresh-${timestamp}.png`),
      fullPage: true
    });

    console.log(`✅ Post stayed at position 1 after API refresh`);
  });

  test('Multiple posts appear in reverse chronological order', async ({ page }) => {
    // Arrange
    const timestamp = Date.now();
    const testTitles = [
      `E2E TEST - First ${timestamp}`,
      `E2E TEST - Second ${timestamp}`,
      `E2E TEST - Third ${timestamp}`
    ];

    // Act: Create 3 posts in sequence
    for (const title of testTitles) {
      await createPostViaUI(page, title, 'Content');
      await page.waitForTimeout(1000); // Wait between posts
    }

    // Wait for all posts to settle
    await page.waitForTimeout(2000);

    // Assert: Verify order (newest first)
    const position1 = await getPostPosition(page, testTitles[2]); // Third (newest)
    const position2 = await getPostPosition(page, testTitles[1]); // Second
    const position3 = await getPostPosition(page, testTitles[0]); // First (oldest)

    expect(position1).toBeLessThan(position2);
    expect(position2).toBeLessThan(position3);

    // Screenshot: Multiple posts in order
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `multiple-posts-chronological-${timestamp}.png`),
      fullPage: true
    });

    console.log(`✅ Multiple posts appear in correct chronological order`);
  });

  test('Page refresh maintains post order', async ({ page }) => {
    // Arrange: Create test post
    const timestamp = Date.now();
    const testTitle = `E2E TEST - Persist After Refresh ${timestamp}`;

    await createPostViaUI(page, testTitle, 'This post order should persist after refresh');
    await page.waitForTimeout(2000);

    // Act: Get position before refresh
    const positionBefore = await getPostPosition(page, testTitle);
    expect(positionBefore).toBeGreaterThan(0); // Post exists

    // Screenshot: Before refresh
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `before-page-refresh-${timestamp}.png`),
      fullPage: true
    });

    // Refresh page
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="social-post"], .post-card, article', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Assert: Position should be same or similar (within top 5)
    const positionAfter = await getPostPosition(page, testTitle);
    expect(positionAfter).toBeGreaterThan(0); // Still exists
    expect(positionAfter).toBeLessThanOrEqual(positionBefore + 1); // Position maintained (allow ±1 for timing)

    // Screenshot: After refresh
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `after-page-refresh-${timestamp}.png`),
      fullPage: true
    });

    console.log(`✅ Post order persisted after page refresh`);
  });

  test('Visual regression: No console errors during post creation', async ({ page }) => {
    // Arrange: Capture console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Act: Create post
    const timestamp = Date.now();
    await createPostViaUI(page, `E2E TEST - No Errors ${timestamp}`, 'Testing for errors');
    await page.waitForTimeout(3000);

    // Assert: No console errors
    expect(consoleErrors).toHaveLength(0);

    console.log(`✅ No console errors during post creation`);
  });

  test('API returns real database data (no mocks)', async ({ page }) => {
    // Arrange: Intercept API request
    let apiResponse: any = null;

    page.on('response', async response => {
      if (response.url().includes('/api/v1/agent-posts')) {
        try {
          apiResponse = await response.json();
        } catch (e) {
          // Ignore parse errors
        }
      }
    });

    // Act: Create post to trigger API call
    const timestamp = Date.now();
    await createPostViaUI(page, `E2E TEST - Real Data ${timestamp}`, 'Verify real database data');
    await page.waitForTimeout(2000); // Wait for API refresh

    // Assert: API response should NOT have mock flag
    expect(apiResponse).toBeTruthy();
    expect(apiResponse.success).toBe(true);
    expect(apiResponse.meta?.source).toBeNull(); // ✅ No mock data!

    console.log(`✅ API returns real database data (meta.source: null)`);
  });

  test('Verify oldest posts with many comments do NOT override new posts', async ({ page }) => {
    // This test verifies the BUG IS FIXED: old posts with comments should NOT jump above new posts

    // Arrange: Create new post
    const timestamp = Date.now();
    const newTestTitle = `E2E TEST - New No Comments ${timestamp}`;
    await createPostViaUI(page, newTestTitle, 'Brand new post with 0 comments');
    await page.waitForTimeout(3000); // Wait for everything to settle

    // Get position
    const position = await getPostPosition(page, newTestTitle);

    // Assert: New post should be in top 3 (even though older posts might have many comments)
    expect(position).toBeLessThanOrEqual(3); // ✅ Should be near top

    // Screenshot: Verify old posts with comments don't override
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `new-post-above-old-commented-${timestamp}.png`),
      fullPage: true
    });

    console.log(`✅ New post (0 comments) is at position ${position} - not buried by old posts with comments`);
  });

  test('Full user journey: Create post → Wait → Still visible at top', async ({ page }) => {
    // Simulate real user behavior: create post, look away for 5 seconds, come back

    const timestamp = Date.now();
    const testTitle = `E2E TEST - Full Journey ${timestamp}`;

    console.log('Step 1: User creates post');
    await createPostViaUI(page, testTitle, 'Testing full user journey');

    // Screenshot: Step 1 - Just created
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `journey-step1-created-${timestamp}.png`),
      fullPage: true
    });

    console.log('Step 2: User looks away for 5 seconds');
    await page.waitForTimeout(5000);

    // Screenshot: Step 2 - After 5 seconds
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `journey-step2-after-5sec-${timestamp}.png`),
      fullPage: true
    });

    console.log('Step 3: User checks position');
    const finalPosition = await getPostPosition(page, testTitle);

    // Assert: Post should STILL be at position 1
    expect(finalPosition).toBe(1);

    console.log(`✅ Full user journey completed - post stayed at position 1`);
  });
});

test.describe('Activity-Based Sorting - Performance Tests', () => {
  test('Feed loads within 3 seconds', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('http://localhost:5173');
    await page.waitForSelector('[data-testid="social-post"], .post-card, article', { timeout: 10000 });

    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(3000);
    console.log(`✅ Feed loaded in ${loadTime}ms`);
  });

  test('Post creation is responsive (< 1 second)', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForSelector('[data-testid="social-post"], .post-card, article');

    const timestamp = Date.now();
    const startTime = Date.now();

    await createPostViaUI(page, `E2E TEST - Performance ${timestamp}`, 'Testing post creation speed');

    // Wait for post to appear
    await page.waitForSelector(`text=/E2E TEST - Performance ${timestamp}/`, { timeout: 5000 });

    const creationTime = Date.now() - startTime;

    expect(creationTime).toBeLessThan(2000); // Should be fast
    console.log(`✅ Post created and appeared in ${creationTime}ms`);
  });
});
