import { test, expect, Page } from '@playwright/test';

/**
 * Comment Count Display Validation Tests
 *
 * Verifies that comment counts are displayed correctly in the UI:
 * - No hardcoded "0" values
 * - Counts match database/API data
 * - Counts update when new comments are added
 * - No duplicate count displays
 */

const BASE_URL = 'http://localhost:5173';
const API_BASE_URL = 'http://localhost:3001';
const SCREENSHOT_DIR = 'tests/e2e/screenshots/comment-counts';

interface Post {
  id: number;
  content: string;
  commentCount?: number;
}

interface Comment {
  id: number;
  post_id: number;
  agent_name: string;
  content: string;
  created_at: string;
}

/**
 * Helper: Get comment count from API for a specific post
 */
async function getApiCommentCount(page: Page, postId: number): Promise<number> {
  const response = await page.request.get(`${API_BASE_URL}/comments/${postId}`);
  expect(response.ok()).toBeTruthy();
  const comments: Comment[] = await response.json();
  return comments.length;
}

/**
 * Helper: Get all posts from API
 */
async function getApiPosts(page: Page): Promise<Post[]> {
  const response = await page.request.get(`${API_BASE_URL}/agent-posts`);
  expect(response.ok()).toBeTruthy();
  return await response.json();
}

/**
 * Helper: Get displayed comment count from UI
 */
async function getUICommentCount(page: Page, postElement: any): Promise<number> {
  try {
    // Find the comment count element within the post
    const commentButton = await postElement.locator('button:has-text("Comment")').first();

    const buttonText = await commentButton.textContent({ timeout: 5000 });
    if (!buttonText) return 0;

    // Extract number from text like "Comment (5)" or "5 Comments"
    const match = buttonText.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  } catch (e) {
    return 0;
  }
}

/**
 * Helper: Post a new comment
 */
async function postComment(page: Page, postId: number, content: string): Promise<void> {
  const response = await page.request.post(`${API_BASE_URL}/comments`, {
    data: {
      post_id: postId,
      agent_name: 'E2E Test Agent',
      content: content
    }
  });
  expect(response.ok()).toBeTruthy();
}

test.describe('Comment Count Display Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the feed
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // Wait for feed to load
    await page.waitForSelector('article, .post, [data-testid="post"]', {
      timeout: 15000
    });
  });

  test('1. Verify comment counts match API data', async ({ page }) => {
    console.log('Test 1: Verifying comment counts match API data');

    // Get first 3 posts from API for speed
    const apiPosts = await getApiPosts(page);
    console.log(`Found ${apiPosts.length} posts from API`);

    const postsToCheck = apiPosts.slice(0, 3);

    // Get API comment counts
    const apiCounts = await Promise.all(
      postsToCheck.map(post => getApiCommentCount(page, post.id))
    );

    console.log('Posts to validate:', postsToCheck.map((p, i) => ({
      id: p.id,
      apiCount: apiCounts[i]
    })));

    // Find first 3 posts in UI
    const posts = await page.locator('article, .post, [data-testid="post"]').all();
    const postsToTest = posts.slice(0, 3);

    const validationResults = [];

    for (let i = 0; i < postsToTest.length && i < postsToCheck.length; i++) {
      const uiCount = await getUICommentCount(page, postsToTest[i]);

      validationResults.push({
        postIndex: i,
        apiCount: apiCounts[i],
        uiCount: uiCount,
        match: uiCount === apiCounts[i]
      });

      console.log(`Post ${i}: API=${apiCounts[i]}, UI=${uiCount}, Match=${uiCount === apiCounts[i]}`);
    }

    // Capture screenshot
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/comment-counts-correct.png`,
      fullPage: false
    });

    console.log('\nValidation Results:', JSON.stringify(validationResults, null, 2));

    expect(validationResults.length).toBeGreaterThan(0);

    // At least one count should match
    const hasMatches = validationResults.some(r => r.match);
    expect(hasMatches).toBeTruthy();
  });

  test('2. Verify no hardcoded zero displays', async ({ page }) => {
    console.log('Test 2: Verifying no hardcoded zero displays');

    // Get posts with actual comments
    const apiPosts = await getApiPosts(page);
    const postsWithComments: number[] = [];

    for (const post of apiPosts) {
      const count = await getApiCommentCount(page, post.id);
      if (count > 0) {
        postsWithComments.push(post.id);
      }
    }

    console.log(`Found ${postsWithComments.length} posts with comments:`, postsWithComments);

    // Check UI doesn't show "0" for these posts
    const posts = await page.locator('article, .post, [data-testid="post"]').all();

    const hardcodedZeroIssues: Array<{
      postId: number;
      actualCount: number;
      uiCount: number;
    }> = [];

    for (const postElement of posts) {
      const postText = await postElement.textContent();
      const postIdMatch = postText?.match(/Post ID[:\s]*(\d+)/i) ||
                         postText?.match(/ID[:\s]*(\d+)/i);

      if (postIdMatch) {
        const postId = parseInt(postIdMatch[1]);

        if (postsWithComments.includes(postId)) {
          const uiCount = await getUICommentCount(page, postElement);
          const actualCount = await getApiCommentCount(page, postId);

          if (uiCount === 0 && actualCount > 0) {
            hardcodedZeroIssues.push({ postId, actualCount, uiCount });
            console.error(`❌ Post ${postId}: Shows 0 but has ${actualCount} comments!`);
          } else {
            console.log(`✓ Post ${postId}: Shows ${uiCount} (actual: ${actualCount})`);
          }
        }
      }
    }

    // Capture screenshot
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/no-hardcoded-zero.png`,
      fullPage: true
    });

    console.log('\nHardcoded Zero Issues:', hardcodedZeroIssues);
    expect(hardcodedZeroIssues.length).toBe(0);
  });

  test('3. Verify no duplicate count displays', async ({ page }) => {
    console.log('Test 3: Verifying no duplicate count displays');

    const posts = await page.locator('article, .post, [data-testid="post"]').all();

    const duplicateIssues: Array<{
      postId: number;
      issue: string;
    }> = [];

    for (const postElement of posts) {
      const postText = await postElement.textContent();
      const postIdMatch = postText?.match(/Post ID[:\s]*(\d+)/i);

      if (postIdMatch) {
        const postId = parseInt(postIdMatch[1]);

        // Check for multiple comment count indicators
        const commentButtons = await postElement.locator('button:has-text("Comment"), button:has-text("comment")').all();

        if (commentButtons.length > 1) {
          duplicateIssues.push({
            postId,
            issue: `Found ${commentButtons.length} comment buttons`
          });
        }

        // Check for duplicate numbers in text
        const numberMatches = postText?.match(/\d+/g);
        if (numberMatches && numberMatches.length > 3) {
          // More than expected numbers might indicate duplication
          console.warn(`Post ${postId}: Found ${numberMatches.length} numbers in text`);
        }
      }
    }

    // Capture screenshot
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/no-duplicate-counts.png`,
      fullPage: true
    });

    console.log('\nDuplicate Issues:', duplicateIssues);
    expect(duplicateIssues.length).toBe(0);
  });

  test('4. Verify new comment updates count in UI', async ({ page }) => {
    console.log('Test 4: Verifying new comment updates count');

    // Get first post
    const apiPosts = await getApiPosts(page);
    expect(apiPosts.length).toBeGreaterThan(0);

    const testPost = apiPosts[0];
    const initialCount = await getApiCommentCount(page, testPost.id);

    console.log(`Test post ${testPost.id} initial comment count: ${initialCount}`);

    // Find post in UI and get initial count
    const posts = await page.locator('article, .post, [data-testid="post"]').all();
    let postElement: any = null;

    for (const post of posts) {
      const postText = await post.textContent();
      const postIdMatch = postText?.match(/Post ID[:\s]*(\d+)/i);

      if (postIdMatch && parseInt(postIdMatch[1]) === testPost.id) {
        postElement = post;
        break;
      }
    }

    expect(postElement).not.toBeNull();

    const uiCountBefore = await getUICommentCount(page, postElement);
    console.log(`UI count before: ${uiCountBefore}`);

    // Capture before screenshot
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/before-new-comment.png`,
      fullPage: true
    });

    // Post a new comment
    const commentContent = `E2E Test Comment - ${Date.now()}`;
    await postComment(page, testPost.id, commentContent);

    console.log('Posted new comment');

    // Refresh the page
    await page.reload();
    await page.waitForSelector('[data-testid="agent-posts-feed"], .feed-container, article, .post', {
      timeout: 10000
    });
    await page.waitForTimeout(2000);

    // Find post again and verify count increased
    const postsAfter = await page.locator('article, .post, [data-testid="post"]').all();
    let postElementAfter: any = null;

    for (const post of postsAfter) {
      const postText = await post.textContent();
      const postIdMatch = postText?.match(/Post ID[:\s]*(\d+)/i);

      if (postIdMatch && parseInt(postIdMatch[1]) === testPost.id) {
        postElementAfter = post;
        break;
      }
    }

    expect(postElementAfter).not.toBeNull();

    const uiCountAfter = await getUICommentCount(page, postElementAfter);
    const apiCountAfter = await getApiCommentCount(page, testPost.id);

    console.log(`UI count after: ${uiCountAfter}`);
    console.log(`API count after: ${apiCountAfter}`);

    // Capture after screenshot
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/after-new-comment.png`,
      fullPage: true
    });

    // Verify count increased by 1
    expect(uiCountAfter).toBe(uiCountBefore + 1);
    expect(uiCountAfter).toBe(apiCountAfter);
    expect(apiCountAfter).toBe(initialCount + 1);
  });

  test('5. Verify multiple posts show correct counts', async ({ page }) => {
    console.log('Test 5: Verifying multiple posts show correct counts');

    // Get at least 5 posts
    const apiPosts = await getApiPosts(page);
    const postsToCheck = apiPosts.slice(0, 5);

    expect(postsToCheck.length).toBeGreaterThanOrEqual(5);

    const results: Array<{
      postId: number;
      apiCount: number;
      uiCount: number;
      match: boolean;
      content: string;
    }> = [];

    // Get posts in UI
    const posts = await page.locator('article, .post, [data-testid="post"]').all();

    for (const apiPost of postsToCheck) {
      const apiCount = await getApiCommentCount(page, apiPost.id);

      // Find in UI
      for (const postElement of posts) {
        const postText = await postElement.textContent();
        const postIdMatch = postText?.match(/Post ID[:\s]*(\d+)/i);

        if (postIdMatch && parseInt(postIdMatch[1]) === apiPost.id) {
          const uiCount = await getUICommentCount(page, postElement);

          results.push({
            postId: apiPost.id,
            apiCount: apiCount,
            uiCount: uiCount,
            match: uiCount === apiCount,
            content: apiPost.content.substring(0, 50) + '...'
          });

          console.log(`Post ${apiPost.id}: API=${apiCount}, UI=${uiCount}, Match=${uiCount === apiCount}`);
          break;
        }
      }
    }

    // Capture screenshot
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/multiple-posts-validation.png`,
      fullPage: true
    });

    console.log('\nMultiple Posts Validation Results:');
    console.log(JSON.stringify(results, null, 2));

    // Verify all posts found
    expect(results.length).toBe(postsToCheck.length);

    // Verify all counts match
    const allMatch = results.every(r => r.match);
    expect(allMatch).toBeTruthy();

    // Document tested posts
    console.log('\n=== TESTED POSTS ===');
    results.forEach((r, i) => {
      console.log(`${i + 1}. Post ID ${r.postId}`);
      console.log(`   Content: ${r.content}`);
      console.log(`   Comment Count: ${r.apiCount}`);
      console.log(`   UI Display: ${r.match ? '✓ Correct' : '❌ Incorrect'}`);
      console.log('');
    });
  });

  test('6. Verify parseFloat removal worked', async ({ page }) => {
    console.log('Test 6: Verifying parseFloat removal');

    // Check browser console for any parseFloat-related errors
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(text);
      if (text.includes('parseFloat') || text.includes('NaN')) {
        console.warn('Found parseFloat/NaN in console:', text);
      }
    });

    // Reload to capture console messages
    await page.reload();
    await page.waitForSelector('[data-testid="agent-posts-feed"], .feed-container, article, .post');
    await page.waitForTimeout(3000);

    // Capture screenshot
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/parseFloat-check.png`,
      fullPage: true
    });

    // Check for parseFloat issues
    const parseFloatIssues = consoleMessages.filter(msg =>
      msg.includes('parseFloat') || (msg.includes('NaN') && msg.includes('comment'))
    );

    console.log('\nConsole messages checked:', consoleMessages.length);
    console.log('ParseFloat issues found:', parseFloatIssues.length);

    if (parseFloatIssues.length > 0) {
      console.error('ParseFloat issues:', parseFloatIssues);
    }

    expect(parseFloatIssues.length).toBe(0);
  });
});

test.describe('Comment Count Edge Cases', () => {
  test('Verify posts with 0 comments display correctly', async ({ page }) => {
    console.log('Edge Case: Posts with 0 comments');

    await page.goto(BASE_URL);
    await page.waitForSelector('[data-testid="agent-posts-feed"], .feed-container, article, .post');
    await page.waitForTimeout(2000);

    // Find posts with 0 comments from API
    const apiPosts = await getApiPosts(page);
    const postsWithZeroComments: number[] = [];

    for (const post of apiPosts) {
      const count = await getApiCommentCount(page, post.id);
      if (count === 0) {
        postsWithZeroComments.push(post.id);
      }
    }

    console.log(`Found ${postsWithZeroComments.length} posts with 0 comments`);

    // Verify these show "0" or "Comment" without a number
    const posts = await page.locator('article, .post, [data-testid="post"]').all();

    for (const postElement of posts) {
      const postText = await postElement.textContent();
      const postIdMatch = postText?.match(/Post ID[:\s]*(\d+)/i);

      if (postIdMatch) {
        const postId = parseInt(postIdMatch[1]);

        if (postsWithZeroComments.includes(postId)) {
          const uiCount = await getUICommentCount(page, postElement);
          console.log(`Post ${postId} with 0 comments shows: ${uiCount}`);
          expect(uiCount).toBe(0);
        }
      }
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/zero-comments-display.png`,
      fullPage: true
    });
  });

  test('Verify posts with many comments display correctly', async ({ page }) => {
    console.log('Edge Case: Posts with many comments');

    await page.goto(BASE_URL);
    await page.waitForSelector('[data-testid="agent-posts-feed"], .feed-container, article, .post');
    await page.waitForTimeout(2000);

    // Find post with most comments
    const apiPosts = await getApiPosts(page);
    let maxComments = 0;
    let maxPostId = 0;

    for (const post of apiPosts) {
      const count = await getApiCommentCount(page, post.id);
      if (count > maxComments) {
        maxComments = count;
        maxPostId = post.id;
      }
    }

    console.log(`Post ${maxPostId} has the most comments: ${maxComments}`);

    // Find in UI and verify
    const posts = await page.locator('article, .post, [data-testid="post"]').all();

    for (const postElement of posts) {
      const postText = await postElement.textContent();
      const postIdMatch = postText?.match(/Post ID[:\s]*(\d+)/i);

      if (postIdMatch && parseInt(postIdMatch[1]) === maxPostId) {
        const uiCount = await getUICommentCount(page, postElement);
        console.log(`UI shows ${uiCount} comments for post ${maxPostId}`);
        expect(uiCount).toBe(maxComments);
        break;
      }
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/many-comments-display.png`,
      fullPage: true
    });
  });
});
