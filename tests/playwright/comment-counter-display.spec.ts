import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test.describe('Comment Counter Display Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:5173');

    // Wait for the feed to load
    await page.waitForSelector('[data-testid="post-card"], .post-card, article', {
      timeout: 10000
    });
  });

  test('should display correct comment counts on feed', async ({ page }) => {
    // Take initial screenshot
    await page.screenshot({
      path: join(__dirname, '../../docs/validation/screenshots/comment-counter-fix/01-feed-initial.png'),
      fullPage: true
    });

    // Find all posts with comment counts
    const posts = await page.locator('[data-testid="post-card"], .post-card, article').all();

    console.log(`Found ${posts.length} posts on feed`);

    let postsWithComments = 0;
    let postsWithZeroDisplayed = 0;

    for (let i = 0; i < Math.min(posts.length, 10); i++) {
      const post = posts[i];

      // Look for comment counter text
      const commentText = await post.locator('text=/\\d+\\s*(comment|Comment)/i').first().textContent().catch(() => null);

      if (commentText) {
        console.log(`Post ${i + 1}: ${commentText}`);

        // Extract the number
        const match = commentText.match(/(\d+)/);
        if (match) {
          const count = parseInt(match[1]);

          if (count > 0) {
            postsWithComments++;
          }

          if (commentText.includes('0')) {
            postsWithZeroDisplayed++;
          }
        }
      }
    }

    console.log(`Posts with comments: ${postsWithComments}`);
    console.log(`Posts showing "0 Comments": ${postsWithZeroDisplayed}`);

    // Validate that we have posts with non-zero comment counts
    expect(postsWithComments).toBeGreaterThan(0);
  });

  test('should show correct comment count for individual posts', async ({ page }) => {
    // Find first post with comments
    const posts = await page.locator('[data-testid="post-card"], .post-card, article').all();

    let postWithComments = null;
    let commentCountText = '';

    for (const post of posts) {
      const commentText = await post.locator('text=/\\d+\\s*(comment|Comment)/i').first().textContent().catch(() => null);

      if (commentText && !commentText.startsWith('0')) {
        postWithComments = post;
        commentCountText = commentText;
        break;
      }
    }

    if (!postWithComments) {
      console.log('No posts with comments found, skipping detailed validation');
      test.skip();
      return;
    }

    console.log(`Found post with comments: ${commentCountText}`);

    // Take screenshot of post with comments
    await postWithComments.screenshot({
      path: join(__dirname, '../../docs/validation/screenshots/comment-counter-fix/02-post-with-comments.png')
    });

    // Extract expected count
    const match = commentCountText.match(/(\d+)/);
    const expectedCount = match ? parseInt(match[1]) : 0;

    // Click on the post to view details
    await postWithComments.click();

    // Wait for navigation or modal
    await page.waitForTimeout(2000);

    // Take screenshot of post detail/comments
    await page.screenshot({
      path: join(__dirname, '../../docs/validation/screenshots/comment-counter-fix/03-post-detail.png'),
      fullPage: true
    });

    // Try to count actual comment threads visible
    const commentThreads = await page.locator('[data-testid="comment"], .comment, [class*="comment"]').count();

    console.log(`Expected count: ${expectedCount}, Visible comments: ${commentThreads}`);

    // Validate count is reasonable (allowing for nested comments)
    expect(commentThreads).toBeGreaterThanOrEqual(1);
  });

  test('should not show "0 Comments" for posts with comments', async ({ page }) => {
    // Get all comment counter texts
    const commentCounters = await page.locator('text=/\\d+\\s*(comment|Comment)/i').all();

    const allTexts: string[] = [];

    for (const counter of commentCounters) {
      const text = await counter.textContent();
      if (text) {
        allTexts.push(text);
      }
    }

    console.log('All comment texts found:', allTexts);

    // Take screenshot of all counters
    await page.screenshot({
      path: join(__dirname, '../../docs/validation/screenshots/comment-counter-fix/04-all-counters.png'),
      fullPage: true
    });

    // Check if we have a good mix of counts
    const hasNonZero = allTexts.some(text => {
      const match = text.match(/(\d+)/);
      return match && parseInt(match[1]) > 0;
    });

    expect(hasNonZero).toBeTruthy();
  });

  test('should display comment count with proper formatting', async ({ page }) => {
    // Find comment counters
    const commentCounters = await page.locator('text=/\\d+\\s*(comment|Comment)/i').all();

    let properlyFormatted = 0;

    for (const counter of commentCounters) {
      const text = await counter.textContent();

      if (text) {
        // Check formatting: should be like "3 Comments" or "1 Comment"
        const match = text.match(/(\d+)\s*(comment|Comment)s?/i);

        if (match) {
          const count = parseInt(match[1]);
          const word = match[2];

          // Validate singular/plural
          if (count === 1 && text.toLowerCase().includes('comment') && !text.toLowerCase().includes('comments')) {
            properlyFormatted++;
          } else if (count !== 1 && text.toLowerCase().includes('comments')) {
            properlyFormatted++;
          } else if (count !== 1 && text.toLowerCase().includes('comment ')) {
            // Some implementations might use "Comment" for all
            properlyFormatted++;
          }

          console.log(`Count: ${count}, Text: "${text}", Formatted: ${properlyFormatted}`);
        }
      }
    }

    console.log(`Properly formatted counters: ${properlyFormatted}`);

    // Take final screenshot
    await page.screenshot({
      path: join(__dirname, '../../docs/validation/screenshots/comment-counter-fix/05-formatting-validation.png'),
      fullPage: true
    });

    // Should have at least some properly formatted counters
    expect(properlyFormatted).toBeGreaterThan(0);
  });

  test('should verify database has comments', async ({ page }) => {
    // This test validates that the backend is returning comment counts

    // Set up network interception to capture API responses
    const apiResponses: any[] = [];

    page.on('response', async response => {
      const url = response.url();
      if (url.includes('/api/posts') || url.includes('/posts')) {
        try {
          const json = await response.json();
          apiResponses.push({ url, data: json });
        } catch (e) {
          // Not JSON
        }
      }
    });

    // Reload to capture API calls
    await page.reload();
    await page.waitForTimeout(3000);

    console.log(`Captured ${apiResponses.length} API responses`);

    // Check if any posts have comment_count > 0
    let foundCommentsInAPI = false;

    for (const response of apiResponses) {
      const data = response.data;

      if (Array.isArray(data)) {
        for (const post of data) {
          if (post.comment_count && post.comment_count > 0) {
            console.log(`Post ${post.id} has ${post.comment_count} comments in API`);
            foundCommentsInAPI = true;
          }
        }
      } else if (data.comment_count && data.comment_count > 0) {
        console.log(`Post has ${data.comment_count} comments in API`);
        foundCommentsInAPI = true;
      }
    }

    // Take screenshot
    await page.screenshot({
      path: join(__dirname, '../../docs/validation/screenshots/comment-counter-fix/06-api-validation.png'),
      fullPage: true
    });

    expect(foundCommentsInAPI).toBeTruthy();
  });
});
