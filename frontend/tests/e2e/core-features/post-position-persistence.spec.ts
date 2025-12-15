import { test, expect, type Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCREENSHOT_DIR = path.join(__dirname, '../screenshots/post-position');

/**
 * @test Post Position Persistence
 * @description Validates that newly created posts remain at the top of the feed
 * and are not incorrectly moved to position 6 due to mock data interference
 *
 * Bug Fix Validation:
 * - Posts should stay at position 0 after creation
 * - No mock data should interfere with real posts
 * - Comment count sorting should work correctly
 */

test.describe('Post Position Persistence - Bug Fix Validation', () => {
  let page: Page;
  const timestamp = Date.now();

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    // Wait for feed to load
    await page.waitForSelector('[data-testid="post-list"]', { timeout: 10000 });
  });

  test('Post Creation - Immediate Position Validation', async () => {
    const postTitle = `Bug Fix Test Post ${timestamp}`;
    const postContent = 'This post should remain at the top of the feed, not jump to position 6.';

    // Create a new post using PostCreator inputs
    await page.fill('input[placeholder*="compelling title"]', postTitle);
    await page.fill('textarea[placeholder*="Share your insights"]', postContent);
    await page.click('[data-testid="submit-post"]');

    // Wait for post to appear
    await page.waitForSelector(`text="${postTitle}"`, { timeout: 5000 });

    // Screenshot 1: Immediately after creation
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `${timestamp}-01-immediate-after-creation.png`),
      fullPage: true
    });

    // Verify post is at position 0 (first post)
    const firstPost = page.locator('[data-testid="post-card"]').first();
    await expect(firstPost).toContainText(postTitle);

    // Get the position explicitly
    const allPosts = page.locator('[data-testid="post-card"]');
    const postCount = await allPosts.count();

    let postPosition = -1;
    for (let i = 0; i < postCount; i++) {
      const post = allPosts.nth(i);
      const text = await post.textContent();
      if (text?.includes(postTitle)) {
        postPosition = i;
        break;
      }
    }

    expect(postPosition).toBe(0);

    // Wait 2 seconds to ensure post doesn't move
    await page.waitForTimeout(2000);

    // Screenshot 2: After 2 seconds - post should still be at top
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `${timestamp}-02-after-2-seconds-still-top.png`),
      fullPage: true
    });

    // Verify post is STILL at position 0
    const firstPostAfterWait = page.locator('[data-testid="post-card"]').first();
    await expect(firstPostAfterWait).toContainText(postTitle);

    // Verify position again
    const allPostsAfterWait = page.locator('[data-testid="post-card"]');
    const postCountAfterWait = await allPostsAfterWait.count();

    let postPositionAfterWait = -1;
    for (let i = 0; i < postCountAfterWait; i++) {
      const post = allPostsAfterWait.nth(i);
      const text = await post.textContent();
      if (text?.includes(postTitle)) {
        postPositionAfterWait = i;
        break;
      }
    }

    expect(postPositionAfterWait).toBe(0);
    expect(postPositionAfterWait).not.toBe(6); // Ensure it's NOT at the buggy position 6
  });

  test('Multiple Posts - Creation Order Validation', async () => {
    const posts = [
      { title: `Multi Post 1 ${timestamp}`, content: 'First post' },
      { title: `Multi Post 2 ${timestamp}`, content: 'Second post' },
      { title: `Multi Post 3 ${timestamp}`, content: 'Third post' }
    ];

    // Create 3 posts rapidly
    for (let i = 0; i < posts.length; i++) {
      await page.fill('input[placeholder*="compelling title"]', posts[i].title);
      await page.fill('textarea[placeholder*="Share your insights"]', posts[i].content);
      await page.click('[data-testid="submit-post"]');

      // Wait for post to appear
      await page.waitForSelector(`text="${posts[i].title}"`, { timeout: 5000 });

      // Brief pause between posts
      await page.waitForTimeout(500);
    }

    // Screenshot: All 3 posts created
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `${timestamp}-03-three-posts-created.png`),
      fullPage: true
    });

    // Verify all 3 posts are at the top in REVERSE creation order (newest first)
    const allPosts = page.locator('[data-testid="post-card"]');

    // Most recent post (Post 3) should be at position 0
    const post0Text = await allPosts.nth(0).textContent();
    expect(post0Text).toContain(posts[2].title);

    // Post 2 should be at position 1
    const post1Text = await allPosts.nth(1).textContent();
    expect(post1Text).toContain(posts[1].title);

    // Post 1 should be at position 2
    const post2Text = await allPosts.nth(2).textContent();
    expect(post2Text).toContain(posts[0].title);

    // Wait 5 seconds to ensure posts don't move
    await page.waitForTimeout(5000);

    // Screenshot: After 5 seconds - posts should still be at top
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `${timestamp}-04-five-seconds-still-top.png`),
      fullPage: true
    });

    // Verify positions again
    const post0TextAfter = await allPosts.nth(0).textContent();
    expect(post0TextAfter).toContain(posts[2].title);

    const post1TextAfter = await allPosts.nth(1).textContent();
    expect(post1TextAfter).toContain(posts[1].title);

    const post2TextAfter = await allPosts.nth(2).textContent();
    expect(post2TextAfter).toContain(posts[0].title);
  });

  test('No Mock Data Interference', async () => {
    const consoleLogs: string[] = [];
    const apiResponses: any[] = [];

    // Monitor console for mock data warnings
    page.on('console', (msg) => {
      const text = msg.text().toLowerCase();
      if (text.includes('mock') || text.includes('mock data')) {
        consoleLogs.push(msg.text());
      }
    });

    // Monitor API responses for mock data
    page.on('response', async (response) => {
      if (response.url().includes('/api/agent-posts')) {
        try {
          const data = await response.json();
          apiResponses.push(data);
        } catch (e) {
          // Ignore non-JSON responses
        }
      }
    });

    // Create a post
    const postTitle = `No Mock Test ${timestamp}`;
    await page.fill('input[placeholder*="compelling title"]', postTitle);
    await page.fill('textarea[placeholder*="Share your insights"]', 'Testing for mock data interference');
    await page.click('[data-testid="submit-post"]');

    await page.waitForSelector(`text="${postTitle}"`, { timeout: 5000 });

    // Screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `${timestamp}-05-no-mock-data.png`),
      fullPage: true
    });

    // Wait for any potential API calls
    await page.waitForTimeout(2000);

    // Verify no mock data warnings in console
    expect(consoleLogs.length).toBe(0);

    // Verify no meta.source === 'mock' in API responses
    for (const response of apiResponses) {
      if (Array.isArray(response)) {
        for (const post of response) {
          if (post.meta) {
            expect(post.meta.source).not.toBe('mock');
          }
        }
      }
    }
  });

  test('Comment Count Sorting - Priority Order', async () => {
    // Create post A
    const postATitle = `Post A ${timestamp}`;
    await page.fill('input[placeholder*="compelling title"]', postATitle);
    await page.fill('textarea[placeholder*="Share your insights"]', 'Post A content');
    await page.click('[data-testid="submit-post"]');
    await page.waitForSelector(`text="${postATitle}"`, { timeout: 5000 });
    await page.waitForTimeout(500);

    // Create post B
    const postBTitle = `Post B ${timestamp}`;
    await page.fill('input[placeholder*="compelling title"]', postBTitle);
    await page.fill('textarea[placeholder*="Share your insights"]', 'Post B content');
    await page.click('[data-testid="submit-post"]');
    await page.waitForSelector(`text="${postBTitle}"`, { timeout: 5000 });

    // Screenshot: Initial state - Post B at top
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `${timestamp}-06-before-comment.png`),
      fullPage: true
    });

    // Verify Post B is at position 0 (most recent)
    let allPosts = page.locator('[data-testid="post-card"]');
    let post0Text = await allPosts.nth(0).textContent();
    expect(post0Text).toContain(postBTitle);

    // Add comment to Post B (which is already at top)
    const postBElement = page.locator(`text="${postBTitle}"`).first();
    await postBElement.click();

    // Wait for comment input
    await page.waitForSelector('textarea[placeholder*="comment"]', { timeout: 5000 });
    await page.fill('textarea[placeholder*="comment"]', 'This is a comment on Post B');
    await page.click('button:has-text("Post Comment")');

    // Wait for comment to be added
    await page.waitForTimeout(1000);

    // Navigate back to feed
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="social-feed"]', { timeout: 10000 });

    // Screenshot: After comment - Post B should still be at top (now with higher priority)
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `${timestamp}-07-after-comment.png`),
      fullPage: true
    });

    // Verify Post B (with comment) is at position 0
    allPosts = page.locator('[data-testid="post-card"]');
    post0Text = await allPosts.nth(0).textContent();
    expect(post0Text).toContain(postBTitle);

    // Verify Post A is at position 1 or later (not at position 0)
    const post1Text = await allPosts.nth(1).textContent();
    const isPostAAtPosition1 = post1Text?.includes(postATitle);

    if (!isPostAAtPosition1) {
      // Check position 2
      const post2Text = await allPosts.nth(2).textContent();
      expect(post2Text).toContain(postATitle);
    }

    // Ensure Post B is not at position 6 (the bug position)
    const postCount = await allPosts.count();
    if (postCount > 6) {
      const post6Text = await allPosts.nth(6).textContent();
      expect(post6Text).not.toContain(postBTitle);
    }
  });

  test('Position Stability - Extended Wait', async () => {
    const postTitle = `Stability Test ${timestamp}`;
    const postContent = 'This post should remain stable at the top';

    // Create post
    await page.fill('input[placeholder*="compelling title"]', postTitle);
    await page.fill('textarea[placeholder*="Share your insights"]', postContent);
    await page.click('[data-testid="submit-post"]');
    await page.waitForSelector(`text="${postTitle}"`, { timeout: 5000 });

    // Screenshot: Initial
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `${timestamp}-08-stability-initial.png`),
      fullPage: true
    });

    const allPosts = page.locator('[data-testid="post-card"]');

    // Check position at multiple intervals
    const intervals = [1000, 2000, 3000, 5000, 10000];

    for (let i = 0; i < intervals.length; i++) {
      await page.waitForTimeout(intervals[i] - (i > 0 ? intervals[i - 1] : 0));

      // Screenshot at each interval
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `${timestamp}-09-stability-${intervals[i]}ms.png`),
        fullPage: true
      });

      // Verify position
      const firstPost = await allPosts.nth(0).textContent();
      expect(firstPost).toContain(postTitle);

      // Verify NOT at position 6
      const postCount = await allPosts.count();
      if (postCount > 6) {
        const post6 = await allPosts.nth(6).textContent();
        expect(post6).not.toContain(postTitle);
      }
    }
  });

  test('API Response Structure Validation', async () => {
    let apiResponse: any = null;

    // Intercept API response
    page.on('response', async (response) => {
      if (response.url().includes('/api/agent-posts') && response.request().method() === 'GET') {
        try {
          apiResponse = await response.json();
        } catch (e) {
          // Ignore
        }
      }
    });

    // Reload to trigger API call
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Wait for API response
    await page.waitForTimeout(2000);

    // Screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `${timestamp}-10-api-response-validation.png`),
      fullPage: true
    });

    // Validate API response structure
    expect(apiResponse).toBeTruthy();
    expect(Array.isArray(apiResponse)).toBe(true);

    if (apiResponse && apiResponse.length > 0) {
      // Check first post structure
      const firstPost = apiResponse[0];

      // Should have required fields
      expect(firstPost).toHaveProperty('id');
      expect(firstPost).toHaveProperty('created_at');

      // Should NOT have mock data indicators
      if (firstPost.meta) {
        expect(firstPost.meta.source).not.toBe('mock');
      }

      // Should be sorted by priority (comment_count DESC, created_at DESC)
      if (apiResponse.length > 1) {
        for (let i = 0; i < apiResponse.length - 1; i++) {
          const current = apiResponse[i];
          const next = apiResponse[i + 1];

          // If comment counts are equal, check timestamp
          if (current.comment_count === next.comment_count) {
            const currentTime = new Date(current.created_at).getTime();
            const nextTime = new Date(next.created_at).getTime();
            expect(currentTime).toBeGreaterThanOrEqual(nextTime);
          } else {
            // Comment count should be descending
            expect(current.comment_count).toBeGreaterThanOrEqual(next.comment_count);
          }
        }
      }
    }
  });
});
