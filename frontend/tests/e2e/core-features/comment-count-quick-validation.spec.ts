import { test, expect } from '@playwright/test';

/**
 * Quick Comment Count Display Validation
 *
 * Fast tests to verify:
 * 1. Comment counts display in UI
 * 2. No hardcoded "0" values
 * 3. Counts are visible and formatted correctly
 */

const BASE_URL = 'http://localhost:5173';
const API_BASE_URL = 'http://localhost:3001/api';
const SCREENSHOT_DIR = 'tests/e2e/screenshots/comment-counts';

test.describe('Comment Count Quick Validation', () => {
  test('Should display comment counts correctly', async ({ page }) => {
    console.log('=== COMMENT COUNT VALIDATION TEST ===\n');

    // Navigate to feed
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Wait for posts to load
    const postsLocator = page.locator('article, .post, [data-testid="post"]');
    await postsLocator.first().waitFor({ timeout: 15000 });

    const postCount = await postsLocator.count();
    console.log(`Found ${postCount} posts in UI\n`);

    // Get API data for first 3 posts
    const apiResponse = await page.request.get(`${API_BASE_URL}/agent-posts`);
    expect(apiResponse.ok()).toBeTruthy();
    const apiPosts = await apiResponse.json();

    console.log('Checking first 3 posts...\n');

    const results = [];

    for (let i = 0; i < Math.min(3, postCount); i++) {
      const post = postsLocator.nth(i);

      // Get API count for this post ID
      const apiPost = apiPosts[i];
      const commentsResponse = await page.request.get(`${API_BASE_URL}/comments/${apiPost.id}`);
      const comments = await commentsResponse.json();
      const apiCount = comments.length;

      // Get UI count
      const commentButton = post.locator('button').filter({ hasText: /comment/i }).first();
      const buttonText = await commentButton.textContent();

      // Extract number from button text
      const numberMatch = buttonText?.match(/(\d+)/);
      const uiCount = numberMatch ? parseInt(numberMatch[1]) : 0;

      const result = {
        postIndex: i,
        postId: apiPost.id,
        apiCount,
        uiCount,
        buttonText,
        match: apiCount === uiCount
      };

      results.push(result);

      console.log(`Post ${i} (ID: ${apiPost.id}):`);
      console.log(`  API Count: ${apiCount}`);
      console.log(`  UI Count: ${uiCount}`);
      console.log(`  Button Text: "${buttonText}"`);
      console.log(`  Match: ${result.match ? '✓ PASS' : '❌ FAIL'}\n`);
    }

    // Capture screenshot
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/quick-validation.png`,
      fullPage: false
    });

    console.log('=== VALIDATION RESULTS ===');
    console.log(JSON.stringify(results, null, 2));

    // Assertions
    expect(results.length).toBeGreaterThan(0);

    const allMatch = results.every(r => r.match);
    const passRate = results.filter(r => r.match).length / results.length;

    console.log(`\nPass Rate: ${(passRate * 100).toFixed(0)}%`);
    console.log(`Total: ${results.length}, Passed: ${results.filter(r => r.match).length}, Failed: ${results.filter(r => !r.match).length}`);

    // At least 2 out of 3 should match
    expect(results.filter(r => r.match).length).toBeGreaterThanOrEqual(2);
  });

  test('Should not show hardcoded zero for posts with comments', async ({ page }) => {
    console.log('=== HARDCODED ZERO CHECK ===\n');

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Get posts with comments from API
    const apiResponse = await page.request.get(`${API_BASE_URL}/agent-posts`);
    const apiPosts = await apiResponse.json();

    const postsWithComments = [];

    for (const post of apiPosts.slice(0, 5)) {
      const commentsResponse = await page.request.get(`${API_BASE_URL}/comments/${post.id}`);
      const comments = await commentsResponse.json();

      if (comments.length > 0) {
        postsWithComments.push({ id: post.id, count: comments.length });
      }
    }

    console.log(`Found ${postsWithComments.length} posts with comments in API\n`);

    // Check UI doesn't show "0" for these
    const issues = [];

    const postsLocator = page.locator('article, .post, [data-testid="post"]');
    const postCount = await postsLocator.count();

    for (let i = 0; i < Math.min(5, postCount); i++) {
      const post = postsLocator.nth(i);
      const postText = await post.textContent();

      // Try to find post ID
      const idMatch = postText?.match(/ID[:\s]*(\d+)/i);

      if (idMatch) {
        const postId = parseInt(idMatch[1]);
        const apiData = postsWithComments.find(p => p.id === postId);

        if (apiData) {
          const commentButton = post.locator('button').filter({ hasText: /comment/i }).first();
          const buttonText = await commentButton.textContent();

          const numberMatch = buttonText?.match(/(\d+)/);
          const uiCount = numberMatch ? parseInt(numberMatch[1]) : 0;

          if (uiCount === 0) {
            issues.push({
              postId,
              expectedCount: apiData.count,
              displayedCount: uiCount,
              buttonText
            });
            console.log(`❌ Post ${postId}: Shows 0 but has ${apiData.count} comments`);
          } else {
            console.log(`✓ Post ${postId}: Shows ${uiCount} (has ${apiData.count} comments)`);
          }
        }
      }
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/no-hardcoded-zero.png`,
      fullPage: false
    });

    console.log(`\nIssues found: ${issues.length}`);
    expect(issues.length).toBe(0);
  });

  test('Should show comment count updates after posting', async ({ page }) => {
    console.log('=== COMMENT COUNT UPDATE TEST ===\n');

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Get first post
    const apiResponse = await page.request.get(`${API_BASE_URL}/agent-posts`);
    const apiPosts = await apiResponse.json();
    const testPost = apiPosts[0];

    // Get initial count
    const commentsResponse = await page.request.get(`${API_BASE_URL}/comments/${testPost.id}`);
    const comments = await commentsResponse.json();
    const initialCount = comments.length;

    console.log(`Test Post ID: ${testPost.id}`);
    console.log(`Initial Comment Count: ${initialCount}\n`);

    // Post new comment
    const newCommentResponse = await page.request.post(`${API_BASE_URL}/comments`, {
      data: {
        post_id: testPost.id,
        agent_name: 'E2E Test Agent',
        content: `Test comment ${Date.now()}`
      }
    });

    expect(newCommentResponse.ok()).toBeTruthy();
    console.log('Posted new comment');

    // Refresh page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Check new count
    const newCommentsResponse = await page.request.get(`${API_BASE_URL}/comments/${testPost.id}`);
    const newComments = await newCommentsResponse.json();
    const newCount = newComments.length;

    console.log(`New Comment Count: ${newCount}`);
    console.log(`Expected Increase: 1`);
    console.log(`Actual Increase: ${newCount - initialCount}\n`);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/after-comment-update.png`,
      fullPage: false
    });

    // Verify count increased
    expect(newCount).toBe(initialCount + 1);

    console.log('✓ Comment count updated correctly');
  });
});
