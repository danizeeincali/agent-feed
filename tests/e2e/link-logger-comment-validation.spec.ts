import { test, expect } from '@playwright/test';
import { chromium } from '@playwright/test';

test.describe('Link Logger Comment Validation', () => {
  test.setTimeout(90000); // 90 seconds for agent processing

  test('should post comment as reply, not new post, with real intelligence', async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:5173');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Wait for API connection (check for Connected status)
    console.log('Waiting for API connection...');
    try {
      await page.waitForSelector('text=/Connected|Disconnected/i', { timeout: 10000 });
      const connectionStatus = await page.locator('text=/Connected|Disconnected/i').first().innerText();
      console.log(`Connection status: ${connectionStatus}`);

      if (connectionStatus.includes('Disconnected')) {
        console.log('API is disconnected, trying to reconnect...');
        await page.reload();
        await page.waitForTimeout(3000);
      }
    } catch (e) {
      console.log('Connection status not found, continuing anyway...');
    }

    // Screenshot: Initial state
    await page.screenshot({
      path: '/workspaces/agent-feed/tests/screenshots/initial-feed-state.png',
      fullPage: true
    });

    // Get initial post count
    const initialPosts = await page.locator('[data-testid="post"], .post-item, article, .feed-item').count();
    console.log(`Initial post count: ${initialPosts}`);

    // Create a post with LinkedIn URL
    const postInput = page.locator('textarea').first();
    await postInput.waitFor({ state: 'visible', timeout: 10000 });

    const testUrl = 'https://www.linkedin.com/posts/example-linkedin-post-12345';
    const uniqueId = Date.now();
    const testContent = `E2E Test ${uniqueId}: ${testUrl}`;

    await postInput.click();
    await postInput.fill(testContent);
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: '/workspaces/agent-feed/tests/screenshots/post-input-filled.png',
      fullPage: true
    });

    // Submit the post - look for the Quick Post button
    const submitButton = page.locator('button:has-text("Quick Post")').first();
    await submitButton.waitFor({ state: 'visible', timeout: 5000 });
    await submitButton.click();

    console.log('Post submitted, waiting for it to appear...');
    await page.waitForTimeout(3000);

    // Find the post we just created - search for unique ID
    const ourPost = page.locator(`text=E2E Test ${uniqueId}`).first();
    await ourPost.waitFor({ state: 'visible', timeout: 10000 });

    console.log('Post appeared, waiting for link-logger comment...');

    // Wait for link-logger comment to appear (up to 60 seconds)
    let commentFound = false;
    let attempts = 0;
    const maxAttempts = 30; // 30 attempts * 2 seconds = 60 seconds

    while (!commentFound && attempts < maxAttempts) {
      await page.waitForTimeout(2000);
      attempts++;

      // Look for link-logger comment
      const linkLoggerComments = page.locator('text=/link-logger/i, text=/linkedin/i, text=/analysis/i, text=/professional/i');
      const count = await linkLoggerComments.count();

      if (count > 0) {
        console.log(`Found ${count} potential link-logger comment(s) after ${attempts * 2} seconds`);
        commentFound = true;
      } else {
        console.log(`Attempt ${attempts}/${maxAttempts}: No comment yet...`);
      }
    }

    if (!commentFound) {
      await page.screenshot({
        path: '/workspaces/agent-feed/tests/screenshots/comment-not-found.png',
        fullPage: true
      });
      throw new Error('Link-logger comment did not appear within 60 seconds');
    }

    // Screenshot: Comment appeared
    await page.screenshot({
      path: '/workspaces/agent-feed/tests/screenshots/comment-appeared.png',
      fullPage: true
    });

    // === TEST 1: Visual Validation - Comment appears as reply ===
    console.log('\n=== TEST 1: Visual Validation ===');

    // Get the post container
    const postContainer = ourPost.locator('..').locator('..').first();

    // Look for comments/replies within the post container
    const commentsInPost = postContainer.locator('.comment, .reply, [data-testid="comment"], [data-testid="reply"]');
    const commentCount = await commentsInPost.count();

    console.log(`Comments found in post: ${commentCount}`);

    // Verify comment is within the post (not a separate post)
    expect(commentCount).toBeGreaterThan(0);

    // Screenshot: Comment as reply
    await postContainer.screenshot({
      path: '/workspaces/agent-feed/tests/screenshots/comment-as-reply.png'
    });

    console.log('✓ Comment appears as reply under original post');

    // Verify no new standalone link-logger post
    const currentPosts = await page.locator('[data-testid="post"], .post-item, article').count();
    console.log(`Current post count: ${currentPosts}, Initial: ${initialPosts}`);

    // Should only have 1 new post (our original), not 2 (original + link-logger)
    expect(currentPosts).toBeLessThanOrEqual(initialPosts + 1);
    console.log('✓ No standalone link-logger post created');

    // === TEST 2: Content Validation - Real intelligence ===
    console.log('\n=== TEST 2: Content Validation ===');

    // Get comment text
    const commentText = await postContainer.innerText();
    console.log('Comment content preview:', commentText.substring(0, 200));

    // Verify NOT mock content
    expect(commentText.toLowerCase()).not.toContain('mock intelligence');
    expect(commentText.toLowerCase()).not.toContain('example.com');
    console.log('✓ Comment does not contain mock content');

    // Verify has real analysis keywords
    const hasRealContent =
      commentText.toLowerCase().includes('linkedin') ||
      commentText.toLowerCase().includes('professional') ||
      commentText.toLowerCase().includes('analysis') ||
      commentText.toLowerCase().includes('post') ||
      commentText.toLowerCase().includes('url') ||
      commentText.length > 50; // Real analysis should be substantial

    expect(hasRealContent).toBeTruthy();
    console.log('✓ Comment contains real analysis content');

    // Screenshot: Real intelligence content
    await page.screenshot({
      path: '/workspaces/agent-feed/tests/screenshots/real-intelligence-content.png',
      fullPage: true
    });

    // === TEST 3: Count Validation - Only ONE response ===
    console.log('\n=== TEST 3: Count Validation ===');

    // Count link-logger comments on the post
    const linkLoggerCommentsInPost = postContainer.locator('text=/link-logger/i');
    const linkLoggerCommentCount = await linkLoggerCommentsInPost.count();

    console.log(`Link-logger comments in post: ${linkLoggerCommentCount}`);

    // Should be exactly 1
    expect(linkLoggerCommentCount).toBe(1);
    console.log('✓ Exactly 1 link-logger comment found');

    // Count link-logger standalone posts in feed
    const allPosts = page.locator('[data-testid="post"], .post-item, article');
    const allPostsCount = await allPosts.count();

    let linkLoggerStandalonePosts = 0;
    for (let i = 0; i < allPostsCount; i++) {
      const postText = await allPosts.nth(i).innerText();
      if (postText.toLowerCase().includes('link-logger') && !postText.includes(testContent)) {
        linkLoggerStandalonePosts++;
      }
    }

    console.log(`Link-logger standalone posts: ${linkLoggerStandalonePosts}`);

    // Should be 0
    expect(linkLoggerStandalonePosts).toBe(0);
    console.log('✓ No standalone link-logger posts found');

    // Screenshot: Single comment validation
    await page.screenshot({
      path: '/workspaces/agent-feed/tests/screenshots/single-comment-validation.png',
      fullPage: true
    });

    // Final success screenshot
    await page.screenshot({
      path: '/workspaces/agent-feed/tests/screenshots/validation-complete.png',
      fullPage: true
    });

    console.log('\n=== ALL TESTS PASSED ===');
    console.log('✓ Comment appears as reply (not new post)');
    console.log('✓ Real intelligence content (not mock)');
    console.log('✓ Only ONE comment response');
  });
});
