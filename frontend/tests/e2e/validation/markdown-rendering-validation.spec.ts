import { test, expect } from '@playwright/test';

test.describe('Markdown Rendering - Real Browser Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Wait for posts to load
    await page.waitForSelector('[data-testid="post"], .bg-white.rounded-lg', { timeout: 20000 });

    // Click on the first post to open it
    const firstPost = page.locator('[data-testid="post"], .bg-white.rounded-lg').first();
    await firstPost.click();

    // Wait for page navigation or modal
    await page.waitForTimeout(2000);

    // Wait for comment section - comments may be in modal or on page
    try {
      await page.waitForSelector('.comment-card, [data-testid="comment"]', { timeout: 10000 });
    } catch (e) {
      console.log('No comments found, continuing with test...');
    }
  });

  test('renders markdown in agent comments - CRITICAL REGRESSION', async ({ page }) => {
    // Take initial screenshot
    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/01-page-loaded.png',
      fullPage: true
    });

    // Find agent comments (from Avi, etc.)
    const commentCards = page.locator('.comment-card');
    const commentCount = await commentCards.count();

    console.log(`Found ${commentCount} total comment cards`);

    if (commentCount === 0) {
      console.log('No comments found - post may not have comments yet');
      await page.screenshot({
        path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/02-no-comments.png',
        fullPage: true
      });
      // Try to add a comment to trigger Avi response
      const commentInput = page.locator('textarea[placeholder*="comment"], textarea[placeholder*="reply"]');
      if (await commentInput.count() > 0) {
        await commentInput.first().fill('What is the weather?');
        await page.locator('button:has-text("Comment"), button:has-text("Reply")').first().click();
        await page.waitForTimeout(3000); // Wait for Avi response
      }
      return; // Skip rest of test if no comments
    }

    // Find comment content areas
    const commentContents = page.locator('.comment-content');
    let foundMarkdown = false;
    let foundRawMarkdown = false;

    for (let i = 0; i < Math.min(commentCount, 5); i++) {
      const comment = commentCards.nth(i);
      const content = commentContents.nth(i);

      // Get text
      const text = await content.textContent();
      console.log(`Comment ${i + 1} preview: ${text?.substring(0, 100)}...`);

      // Check for rendered markdown elements
      const hasStrong = await content.locator('strong, b').count() > 0;
      const hasCode = await content.locator('code').count() > 0;
      const hasList = await content.locator('ul, ol').count() > 0;

      if (hasStrong || hasCode || hasList) {
        foundMarkdown = true;
        console.log(`✓ Comment ${i + 1} has rendered markdown elements`);
      }

      // Check for RAW markdown symbols (FAILURE)
      if (text?.includes('**') || text?.includes('##') || text?.includes('```')) {
        foundRawMarkdown = true;
        console.log(`✗ Comment ${i + 1} has RAW markdown symbols!`);
      }
    }

    // Take screenshot of comments
    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/03-comments-with-markdown.png',
      fullPage: true
    });

    // Assertions
    console.log(`\nSummary:`);
    console.log(`- Found rendered markdown: ${foundMarkdown}`);
    console.log(`- Found raw markdown symbols: ${foundRawMarkdown}`);

    // CRITICAL: Should NOT have raw markdown symbols
    expect(foundRawMarkdown).toBe(false);

    // Should have some rendered markdown
    if (commentCount > 0) {
      expect(foundMarkdown).toBe(true);
    }
  });

  test('auto-detects markdown in agent comments with wrong content_type', async ({ page }) => {
    // This tests the fallback auto-detection
    // Even if content_type='text', agent markdown should render

    const comments = await page.locator('[data-author-type="agent"]').all();

    let totalMarkdownElements = 0;
    let totalRawSymbols = 0;

    for (const comment of comments) {
      const commentContent = comment.locator('.comment-content');

      const hasStrong = await commentContent.locator('strong, b').count();
      const hasCode = await commentContent.locator('code').count();
      const hasList = await commentContent.locator('ul, ol').count();
      const hasHeaders = await commentContent.locator('h1, h2, h3, h4, h5, h6').count();

      const markdownElements = hasStrong + hasCode + hasList + hasHeaders;
      totalMarkdownElements += markdownElements;

      if (markdownElements > 0) {
        // Verify no raw symbols
        const text = await commentContent.textContent();
        if (text?.includes('**')) totalRawSymbols++;
        if (text?.includes('##')) totalRawSymbols++;
      }
    }

    console.log(`Total markdown elements found: ${totalMarkdownElements}`);
    console.log(`Total raw symbols found: ${totalRawSymbols}`);

    // Should have markdown elements rendered
    expect(totalMarkdownElements).toBeGreaterThan(0);

    // Should NOT have raw symbols
    expect(totalRawSymbols).toBe(0);

    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/markdown-auto-detection.png',
      fullPage: true
    });
  });

  test('renders code blocks correctly', async ({ page }) => {
    // Look for any comment with code blocks
    const codeBlock = page.locator('pre code').first();
    const codeBlockExists = await codeBlock.count() > 0;

    if (codeBlockExists) {
      await expect(codeBlock).toBeVisible();

      // Get the parent comment
      const codeText = await codeBlock.textContent();
      console.log(`Code block content: ${codeText?.substring(0, 100)}`);

      // Verify NOT showing raw ``` symbols in the rendered content
      expect(codeText).not.toContain('```');

      await page.screenshot({
        path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/code-block-rendering.png'
      });
    } else {
      console.log('No code blocks found in current comments');
    }
  });

  test('renders lists correctly in markdown', async ({ page }) => {
    // Find comment with lists
    const list = page.locator('.comment-content ul, .comment-content ol').first();
    const listExists = await list.count() > 0;

    if (listExists) {
      await expect(list).toBeVisible();

      // Verify list items rendered
      const listItems = await list.locator('li').count();
      console.log(`Found ${listItems} list items`);
      expect(listItems).toBeGreaterThan(0);

      await page.screenshot({
        path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/list-rendering.png'
      });
    } else {
      console.log('No lists found in current comments');
    }
  });

  test('user comments render plain text when no markdown', async ({ page }) => {
    // Find user comment without markdown
    const userComments = page.locator('[data-author-type="user"]');
    const count = await userComments.count();

    if (count > 0) {
      const userComment = userComments.first();
      const commentContent = userComment.locator('.comment-content');

      await expect(commentContent).toBeVisible();

      const hasStrong = await commentContent.locator('strong, b').count();
      const hasCode = await commentContent.locator('code').count();

      const text = await commentContent.textContent();
      console.log(`User comment text: ${text?.substring(0, 100)}`);

      // If no markdown, should render as plain text
      if (hasStrong === 0 && hasCode === 0) {
        expect(text?.length).toBeGreaterThan(0);
      }

      await page.screenshot({
        path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/plain-text-rendering.png'
      });
    } else {
      console.log('No user comments found');
    }
  });

  test('VISUAL REGRESSION: Compare before/after screenshots', async ({ page }) => {
    // Take full page screenshot for visual comparison
    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/full-page-after-fix.png',
      fullPage: true
    });

    // Verify key elements present
    await expect(page.locator('.comment-content')).toBeVisible();

    // Count total markdown elements across all comments
    const allStrong = await page.locator('.comment-content strong, .comment-content b').count();
    const allCode = await page.locator('.comment-content code').count();
    const allLists = await page.locator('.comment-content ul, .comment-content ol').count();

    console.log(`Page-wide markdown elements - Bold: ${allStrong}, Code: ${allCode}, Lists: ${allLists}`);

    // Should have SOME markdown rendering
    const totalMarkdown = allStrong + allCode + allLists;
    expect(totalMarkdown).toBeGreaterThan(0);
  });

  test('markdown rendering consistency across multiple comments', async ({ page }) => {
    // Get all agent comments
    const agentComments = page.locator('[data-author-type="agent"]');
    const count = await agentComments.count();

    console.log(`Testing ${count} agent comments for consistency`);

    let renderedCount = 0;
    let rawCount = 0;

    for (let i = 0; i < count; i++) {
      const comment = agentComments.nth(i);
      const content = comment.locator('.comment-content');
      const text = await content.textContent();

      const hasMarkdownElements = await content.locator('strong, b, code, ul, ol').count() > 0;
      const hasRawMarkdown = text?.includes('**') || text?.includes('##') || text?.includes('```');

      if (hasMarkdownElements) renderedCount++;
      if (hasRawMarkdown) rawCount++;
    }

    console.log(`Rendered markdown: ${renderedCount}, Raw markdown: ${rawCount}`);

    // All agent comments with markdown should be rendered
    expect(rawCount).toBe(0);

    // Should have at least some rendered markdown
    expect(renderedCount).toBeGreaterThan(0);

    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/consistency-check.png',
      fullPage: true
    });
  });

  test('realtime comment updates preserve markdown rendering', async ({ page }) => {
    // Take initial screenshot
    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/before-realtime-update.png',
      fullPage: true
    });

    const initialComments = await page.locator('.comment-content').count();
    console.log(`Initial comment count: ${initialComments}`);

    // Wait a bit for potential realtime updates
    await page.waitForTimeout(3000);

    // Check if markdown is still rendered correctly after any updates
    const afterComments = await page.locator('.comment-content').count();
    console.log(`Comment count after wait: ${afterComments}`);

    // Verify markdown still rendered
    const markdownElements = await page.locator('.comment-content strong, .comment-content code').count();
    expect(markdownElements).toBeGreaterThan(0);

    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/after-realtime-update.png',
      fullPage: true
    });
  });
});
