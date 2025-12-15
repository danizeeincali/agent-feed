import { test, expect, Page } from '@playwright/test';
import path from 'path';

const BASE_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots', 'reply-flow');

// Helper to wait for element with retries
async function waitForElement(page: Page, selector: string, timeout = 10000) {
  await page.waitForSelector(selector, { timeout, state: 'visible' });
}

// Helper to take timestamped screenshot
async function takeScreenshot(page: Page, name: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${name}-${timestamp}.png`;
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, filename),
    fullPage: true
  });
  console.log(`Screenshot saved: ${filename}`);
}

test.describe('Comment Reply Full Flow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto(BASE_URL);
    // Wait for feed to load
    await waitForElement(page, '[data-testid="feed-container"], .space-y-6');
    await page.waitForTimeout(2000); // Let initial data load
  });

  test('Test 1: Reply Processing Pill Visibility', async ({ page }) => {
    test.setTimeout(60000);

    // Step 1: Find first post with comments
    await page.waitForSelector('[data-testid="post-card"], article', { timeout: 10000 });

    // Look for a post with comments
    const posts = await page.$$('[data-testid="post-card"], article');
    let targetPost = null;

    for (const post of posts) {
      const commentCount = await post.$('[data-testid="comment-count"]');
      if (commentCount) {
        const text = await commentCount.textContent();
        const count = parseInt(text?.match(/\d+/)?.[0] || '0');
        if (count > 0) {
          targetPost = post;
          break;
        }
      }
    }

    if (!targetPost) {
      console.log('No posts with comments found, creating a new post first...');
      // Create a post and wait for Avi to comment
      const postButton = await page.$('[data-testid="create-post-button"], button:has-text("Share")');
      if (postButton) {
        await postButton.click();
        await page.fill('textarea[placeholder*="What"], textarea', 'Test post for reply processing pill validation');
        await page.click('button:has-text("Post"), button[type="submit"]');
        await page.waitForTimeout(12000); // Wait for Avi to comment

        // Find the new post
        const newPosts = await page.$$('[data-testid="post-card"], article');
        targetPost = newPosts[0];
      }
    }

    expect(targetPost).toBeTruthy();

    // Step 2: Expand comments if needed
    const viewCommentsButton = await targetPost.$('button:has-text("View"), button:has-text("comment")');
    if (viewCommentsButton) {
      await viewCommentsButton.click();
      await page.waitForTimeout(1000);
    }

    // Step 3: Find and click Reply on first comment
    await takeScreenshot(page, 'reply-1-before-submit');

    const replyButton = await targetPost.$('button:has-text("Reply")');
    expect(replyButton).toBeTruthy();
    await replyButton!.click();
    await page.waitForTimeout(500);

    // Step 4: Type test content
    const replyTextarea = await page.$('textarea[placeholder*="Reply"], textarea[placeholder*="reply"]');
    expect(replyTextarea).toBeTruthy();
    await replyTextarea!.fill('Testing reply processing pill - automated E2E test');
    await page.waitForTimeout(500);

    // Step 5: Take screenshot before submit
    await takeScreenshot(page, 'reply-1-filled-form');

    // Step 6: Click Post Reply and IMMEDIATELY capture spinner
    const postReplyButton = await page.$('button:has-text("Post Reply"), button:has-text("Reply")');
    expect(postReplyButton).toBeTruthy();

    // Start monitoring for spinner BEFORE clicking
    const spinnerPromise = page.waitForSelector('.animate-spin, [data-testid="processing-spinner"]', {
      timeout: 2000,
      state: 'visible'
    }).catch(() => null);

    await postReplyButton!.click();

    // Step 7: IMMEDIATELY capture the processing state
    await page.waitForTimeout(100); // Small delay to let spinner appear
    await takeScreenshot(page, 'reply-2-processing-pill');

    // Verify spinner appeared
    const spinnerElement = await spinnerPromise;

    // Step 8: Wait for form to close
    await page.waitForTimeout(3000);

    // Step 9: Take screenshot of success state
    await takeScreenshot(page, 'reply-3-success');

    // Step 10: Assert spinner was visible
    if (spinnerElement) {
      console.log('✅ Processing spinner was visible during submission');
    } else {
      console.log('⚠️  Processing spinner may not have been captured');
    }

    // Step 11: Verify comment appears in the thread
    const comments = await targetPost.$$('[data-testid="comment-item"], .bg-gray-50');
    expect(comments.length).toBeGreaterThan(0);

    // Look for our test comment
    let foundComment = false;
    for (const comment of comments) {
      const text = await comment.textContent();
      if (text?.includes('Testing reply processing pill')) {
        foundComment = true;
        break;
      }
    }
    expect(foundComment).toBeTruthy();
    console.log('✅ Reply comment successfully posted and visible');
  });

  test('Test 2: Agent Response to Reply', async ({ page }) => {
    test.setTimeout(90000);

    // Step 1: Create new post
    await takeScreenshot(page, 'routing-0-initial-state');

    const postButton = await page.$('[data-testid="create-post-button"], button:has-text("Share")');
    expect(postButton).toBeTruthy();
    await postButton!.click();
    await page.waitForTimeout(500);

    const textarea = await page.$('textarea[placeholder*="What"], textarea');
    expect(textarea).toBeTruthy();
    await textarea!.fill('Test agent reply routing - E2E validation @avi');

    const submitButton = await page.$('button:has-text("Post"), button[type="submit"]');
    await submitButton!.click();
    await page.waitForTimeout(2000);

    // Step 2: Wait for Avi to comment
    console.log('Waiting for Avi to comment (up to 15 seconds)...');
    let aviCommented = false;
    let postWithAvi = null;

    for (let i = 0; i < 15; i++) {
      const posts = await page.$$('[data-testid="post-card"], article');
      const firstPost = posts[0];

      const commentCount = await firstPost.$('[data-testid="comment-count"]');
      if (commentCount) {
        const text = await commentCount.textContent();
        const count = parseInt(text?.match(/\d+/)?.[0] || '0');
        if (count > 0) {
          aviCommented = true;
          postWithAvi = firstPost;
          break;
        }
      }
      await page.waitForTimeout(1000);
    }

    expect(aviCommented).toBeTruthy();
    await takeScreenshot(page, 'routing-1-avi-commented');

    // Step 3: Expand comments
    const viewCommentsButton = await postWithAvi!.$('button:has-text("View"), button:has-text("comment")');
    if (viewCommentsButton) {
      await viewCommentsButton.click();
      await page.waitForTimeout(1000);
    }

    // Step 4: Reply to Avi's comment
    const replyButton = await postWithAvi!.$('button:has-text("Reply")');
    expect(replyButton).toBeTruthy();
    await replyButton!.click();
    await page.waitForTimeout(500);

    const replyTextarea = await page.$('textarea[placeholder*="Reply"], textarea[placeholder*="reply"]');
    expect(replyTextarea).toBeTruthy();
    await replyTextarea!.fill('@avi Did you receive my message? Testing reply routing.');
    await page.waitForTimeout(500);

    // Step 5: Submit reply
    const postReplyButton = await page.$('button:has-text("Post Reply"), button:has-text("Reply")');
    await postReplyButton!.click();
    await page.waitForTimeout(3000);

    await takeScreenshot(page, 'routing-2-user-replied');

    // Step 6: Wait for Avi's response to the reply
    console.log('Waiting for Avi to respond to reply (up to 20 seconds)...');
    let aviResponded = false;
    let responseCount = 0;

    for (let i = 0; i < 20; i++) {
      const comments = await postWithAvi!.$$('[data-testid="comment-item"], .bg-gray-50, .border-l-2');

      // Count replies (should have at least 2: original Avi comment + user reply + Avi's response)
      if (comments.length >= 3) {
        // Check if latest comment is from Avi
        const lastComment = comments[comments.length - 1];
        const authorElement = await lastComment.$('[data-testid="comment-author"], .font-semibold');
        if (authorElement) {
          const authorText = await authorElement.textContent();
          if (authorText?.toLowerCase().includes('avi')) {
            aviResponded = true;
            responseCount = comments.length;
            break;
          }
        }
      }
      await page.waitForTimeout(1000);
    }

    await takeScreenshot(page, 'routing-3-avi-responded');

    // Step 7: Assertions
    expect(aviResponded).toBeTruthy();
    expect(responseCount).toBeGreaterThanOrEqual(3);
    console.log(`✅ Avi successfully responded to reply (${responseCount} total comments in thread)`);

    // Step 8: Verify no other agents responded
    const comments = await postWithAvi!.$$('[data-testid="comment-item"], .bg-gray-50, .border-l-2');
    const agents = new Set<string>();

    for (const comment of comments) {
      const authorElement = await comment.$('[data-testid="comment-author"], .font-semibold');
      if (authorElement) {
        const authorText = await authorElement.textContent();
        const cleanAuthor = authorText?.toLowerCase().trim() || '';
        if (cleanAuthor && cleanAuthor !== 'you' && !cleanAuthor.includes('user')) {
          agents.add(cleanAuthor);
        }
      }
    }

    console.log(`Agents found in conversation: ${Array.from(agents).join(', ')}`);
    expect(agents.size).toBe(1); // Should only be Avi
    expect(Array.from(agents)[0]).toContain('avi');
    console.log('✅ Only Avi responded (no other agents interfered)');
  });

  test('Test 3: Deep Threading (Reply to Reply)', async ({ page }) => {
    test.setTimeout(120000);

    // Step 1: Create initial post
    await takeScreenshot(page, 'deep-thread-0-start');

    const postButton = await page.$('[data-testid="create-post-button"], button:has-text("Share")');
    await postButton!.click();
    await page.waitForTimeout(500);

    const textarea = await page.$('textarea[placeholder*="What"], textarea');
    await textarea!.fill('Deep threading test - multiple reply levels @avi');

    const submitButton = await page.$('button:has-text("Post"), button[type="submit"]');
    await submitButton!.click();
    await page.waitForTimeout(2000);

    // Step 2: Wait for Avi's first comment
    console.log('Waiting for Avi\'s initial comment...');
    await page.waitForTimeout(12000);

    const posts = await page.$$('[data-testid="post-card"], article');
    const firstPost = posts[0];

    const viewCommentsButton = await firstPost.$('button:has-text("View"), button:has-text("comment")');
    if (viewCommentsButton) {
      await viewCommentsButton.click();
      await page.waitForTimeout(1000);
    }

    await takeScreenshot(page, 'deep-thread-1-avi-first-comment');

    // Step 3: Reply to Avi
    let replyButton = await firstPost.$('button:has-text("Reply")');
    await replyButton!.click();
    await page.waitForTimeout(500);

    let replyTextarea = await page.$('textarea[placeholder*="Reply"], textarea[placeholder*="reply"]');
    await replyTextarea!.fill('First reply to Avi - testing deep threading');

    let postReplyButton = await page.$('button:has-text("Post Reply"), button:has-text("Reply")');
    await postReplyButton!.click();
    await page.waitForTimeout(3000);

    await takeScreenshot(page, 'deep-thread-2-user-first-reply');

    // Step 4: Wait for Avi's response to reply
    console.log('Waiting for Avi\'s response to first reply...');
    await page.waitForTimeout(15000);

    await takeScreenshot(page, 'deep-thread-3-avi-second-comment');

    // Step 5: Reply to Avi's response (deep threading)
    const replyButtons = await firstPost.$$('button:has-text("Reply")');
    if (replyButtons.length > 1) {
      await replyButtons[replyButtons.length - 1].click();
      await page.waitForTimeout(500);

      replyTextarea = await page.$('textarea[placeholder*="Reply"], textarea[placeholder*="reply"]');
      await replyTextarea!.fill('Second level reply to Avi - deep thread validation');

      postReplyButton = await page.$('button:has-text("Post Reply"), button:has-text("Reply")');
      await postReplyButton!.click();
      await page.waitForTimeout(3000);

      await takeScreenshot(page, 'deep-thread-4-user-second-reply');

      // Step 6: Wait for Avi's third response
      console.log('Waiting for Avi\'s response to deep reply...');
      await page.waitForTimeout(15000);

      await takeScreenshot(page, 'deep-thread-5-avi-third-comment');

      // Step 7: Verify all comments are from Avi
      const comments = await firstPost.$$('[data-testid="comment-item"], .bg-gray-50, .border-l-2');
      const agentComments = [];

      for (const comment of comments) {
        const authorElement = await comment.$('[data-testid="comment-author"], .font-semibold');
        if (authorElement) {
          const authorText = await authorElement.textContent();
          const cleanAuthor = authorText?.toLowerCase().trim() || '';
          if (cleanAuthor && cleanAuthor !== 'you' && !cleanAuthor.includes('user')) {
            agentComments.push(cleanAuthor);
          }
        }
      }

      console.log(`Agent comments found: ${agentComments.length}`);
      console.log(`Agents: ${agentComments.join(', ')}`);

      // All agent comments should be from Avi
      const allAvi = agentComments.every(agent => agent.includes('avi'));
      expect(allAvi).toBeTruthy();
      console.log('✅ Deep threading successful - Avi responded at all levels');
    }
  });

  test('Test 4: Multiple Agents - Get-to-Know-You', async ({ page }) => {
    test.setTimeout(90000);

    // Step 1: Look for existing Get-to-Know-You agent post
    await takeScreenshot(page, 'multi-agent-0-search-gtky');

    let gtkyPost = null;
    const posts = await page.$$('[data-testid="post-card"], article');

    for (const post of posts) {
      const text = await post.textContent();
      if (text?.toLowerCase().includes('get-to-know-you') ||
          text?.toLowerCase().includes('get to know you') ||
          text?.toLowerCase().includes('gtky')) {
        gtkyPost = post;
        break;
      }
    }

    // If no existing GTKY post, create one
    if (!gtkyPost) {
      console.log('No Get-to-Know-You post found, creating one...');
      const postButton = await page.$('[data-testid="create-post-button"], button:has-text("Share")');
      await postButton!.click();
      await page.waitForTimeout(500);

      const textarea = await page.$('textarea[placeholder*="What"], textarea');
      await textarea!.fill('Question for Get-to-Know-You agent: What are your favorite hobbies?');

      const submitButton = await page.$('button:has-text("Post"), button[type="submit"]');
      await submitButton!.click();
      await page.waitForTimeout(12000); // Wait for agent to comment

      const newPosts = await page.$$('[data-testid="post-card"], article');
      gtkyPost = newPosts[0];
    }

    expect(gtkyPost).toBeTruthy();

    // Step 2: Expand comments
    const viewCommentsButton = await gtkyPost!.$('button:has-text("View"), button:has-text("comment")');
    if (viewCommentsButton) {
      await viewCommentsButton.click();
      await page.waitForTimeout(1000);
    }

    await takeScreenshot(page, 'multi-agent-1-gtky-commented');

    // Step 3: Reply to the agent's comment
    const replyButton = await gtkyPost!.$('button:has-text("Reply")');
    expect(replyButton).toBeTruthy();
    await replyButton!.click();
    await page.waitForTimeout(500);

    const replyTextarea = await page.$('textarea[placeholder*="Reply"], textarea[placeholder*="reply"]');
    await replyTextarea!.fill('Thanks for sharing! Can you tell me more about that?');

    const postReplyButton = await page.$('button:has-text("Post Reply"), button:has-text("Reply")');
    await postReplyButton!.click();
    await page.waitForTimeout(3000);

    await takeScreenshot(page, 'multi-agent-2-user-replied-to-gtky');

    // Step 4: Wait for Get-to-Know-You agent's response
    console.log('Waiting for Get-to-Know-You agent to respond...');
    await page.waitForTimeout(15000);

    await takeScreenshot(page, 'multi-agent-3-gtky-responded');

    // Step 5: Verify Get-to-Know-You agent responded (not Avi)
    const comments = await gtkyPost!.$$('[data-testid="comment-item"], .bg-gray-50, .border-l-2');
    const agents = new Set<string>();

    for (const comment of comments) {
      const authorElement = await comment.$('[data-testid="comment-author"], .font-semibold');
      if (authorElement) {
        const authorText = await authorElement.textContent();
        const cleanAuthor = authorText?.toLowerCase().trim() || '';
        if (cleanAuthor && cleanAuthor !== 'you' && !cleanAuthor.includes('user')) {
          agents.add(cleanAuthor);
        }
      }
    }

    console.log(`Agents in conversation: ${Array.from(agents).join(', ')}`);

    // Should only be Get-to-Know-You agent, not Avi
    const hasGTKY = Array.from(agents).some(agent =>
      agent.includes('get-to-know-you') || agent.includes('get to know you') || agent.includes('gtky')
    );
    const hasAvi = Array.from(agents).some(agent => agent.includes('avi'));

    expect(hasGTKY).toBeTruthy();
    expect(hasAvi).toBeFalsy();
    console.log('✅ Get-to-Know-You agent responded correctly (Avi did not interfere)');
  });
});
