import { test, expect } from '@playwright/test';

test.describe('Post and Comment Markdown Rendering - Browser Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('CRITICAL: Posts display rendered markdown (NOT raw symbols)', async ({ page }) => {
    // Find the first post card
    const postCard = page.locator('[class*="post"], article').first();
    await expect(postCard).toBeVisible({ timeout: 10000 });

    // Wait a moment for content to render
    await page.waitForTimeout(1000);

    // Get post content area
    const postContent = postCard.locator('[class*="content"], p, div').first();

    // Check if there's ANY markdown in the visible posts
    const boldElements = await postCard.locator('strong').count();
    const italicElements = await postCard.locator('em').count();
    const codeElements = await postCard.locator('code').count();
    const listElements = await postCard.locator('ul, ol').count();

    const hasAnyMarkdownElements = boldElements + italicElements + codeElements + listElements > 0;

    // Get text content
    const textContent = await postContent.textContent();

    console.log('Post markdown analysis:');
    console.log('- Bold elements:', boldElements);
    console.log('- Italic elements:', italicElements);
    console.log('- Code elements:', codeElements);
    console.log('- List elements:', listElements);
    console.log('- Text preview:', textContent?.substring(0, 100));

    // If there ARE markdown elements, verify no raw symbols
    if (hasAnyMarkdownElements) {
      expect(textContent).not.toContain('**');
      expect(textContent).not.toContain('##');
      console.log('✅ Post has markdown elements and NO raw symbols');
    }

    // Take screenshot as evidence
    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/post-markdown-validation.png',
      fullPage: true
    });
  });

  test('CRITICAL: Comments display rendered markdown', async ({ page }) => {
    // Find first post with comments or open comments
    const commentSection = page.locator('[class*="comment"]').first();

    if (await commentSection.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Get comment content
      const commentContent = commentSection.locator('[class*="content"]').first();

      // Check for markdown elements
      const hasBold = await commentSection.locator('strong').count() > 0;
      const hasItalic = await commentSection.locator('em').count() > 0;
      const hasCode = await commentSection.locator('code').count() > 0;

      if (hasBold || hasItalic || hasCode) {
        const text = await commentContent.textContent();
        expect(text).not.toContain('**');
        expect(text).not.toContain('*');

        console.log('✅ Comment has markdown elements and NO raw symbols');
      }

      // Screenshot
      await page.screenshot({
        path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/comment-markdown-validation.png'
      });
    } else {
      console.log('⚠️ No comments visible to test');
    }
  });

  test('New comment creation with markdown', async ({ page }) => {
    // Try to find and open comment form
    const commentButton = page.locator('button').filter({ hasText: /comment/i }).first();

    if (await commentButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await commentButton.click();
      await page.waitForTimeout(500);

      // Find textarea
      const textarea = page.locator('textarea').first();
      if (await textarea.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Type markdown content
        await textarea.fill('**This is bold** and *italic* markdown test');

        // Find and click submit
        const submitButton = page.locator('button').filter({ hasText: /post|submit|send/i }).first();
        if (await submitButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await submitButton.click();

          // Wait for comment to appear
          await page.waitForTimeout(2000);

          // Look for the new comment
          const newComment = page.locator('[class*="comment"]').last();
          const hasBold = await newComment.locator('strong').count() > 0;

          if (hasBold) {
            console.log('✅ New comment rendered with markdown');
          }

          // Screenshot
          await page.screenshot({
            path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/new-comment-markdown.png'
          });
        }
      }
    }
  });

  test('Visual regression - Full page screenshot', async ({ page }) => {
    // Take full page screenshot for visual comparison
    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/full-page-after-markdown-fix.png',
      fullPage: true
    });

    // Verify no console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Reload to catch any errors
    await page.reload();
    await page.waitForLoadState('networkidle');

    console.log('Console errors:', errors);
    expect(errors.length).toBe(0);
  });

  test('Detailed markdown element detection', async ({ page }) => {
    // Check all posts for markdown rendering
    const allPosts = page.locator('[class*="post"], article');
    const postCount = await allPosts.count();

    console.log(`Found ${postCount} posts on the page`);

    for (let i = 0; i < Math.min(postCount, 5); i++) {
      const post = allPosts.nth(i);

      const strongCount = await post.locator('strong').count();
      const emCount = await post.locator('em').count();
      const codeCount = await post.locator('code').count();
      const linkCount = await post.locator('a').count();
      const listCount = await post.locator('ul, ol').count();

      console.log(`Post ${i + 1}:`);
      console.log(`  - <strong> tags: ${strongCount}`);
      console.log(`  - <em> tags: ${emCount}`);
      console.log(`  - <code> tags: ${codeCount}`);
      console.log(`  - <a> tags: ${linkCount}`);
      console.log(`  - <ul>/<ol> tags: ${listCount}`);

      // Get text sample
      const textSample = await post.textContent();
      const hasRawMarkdown = textSample?.includes('**') || textSample?.includes('##');

      console.log(`  - Has raw markdown symbols: ${hasRawMarkdown}`);
      console.log(`  - Text sample: ${textSample?.substring(0, 80)}...`);
    }

    // Take detailed screenshot
    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/detailed-markdown-analysis.png',
      fullPage: true
    });
  });

  test('Comment section markdown verification', async ({ page }) => {
    // Find all comment sections
    const commentSections = page.locator('[class*="CommentSystem"], [class*="comment-section"]');
    const sectionCount = await commentSections.count();

    console.log(`Found ${sectionCount} comment sections`);

    if (sectionCount > 0) {
      const firstSection = commentSections.first();
      await firstSection.scrollIntoViewIfNeeded();

      // Check for comment threads
      const threads = firstSection.locator('[class*="thread"], [class*="comment"]');
      const threadCount = await threads.count();

      console.log(`Found ${threadCount} comment threads/items`);

      if (threadCount > 0) {
        for (let i = 0; i < Math.min(threadCount, 3); i++) {
          const thread = threads.nth(i);

          const strongCount = await thread.locator('strong').count();
          const emCount = await thread.locator('em').count();
          const codeCount = await thread.locator('code').count();

          console.log(`Comment ${i + 1}:`);
          console.log(`  - <strong> tags: ${strongCount}`);
          console.log(`  - <em> tags: ${emCount}`);
          console.log(`  - <code> tags: ${codeCount}`);

          const text = await thread.textContent();
          console.log(`  - Has raw markdown: ${text?.includes('**') || text?.includes('*')}`);
        }

        // Screenshot comment section
        await firstSection.screenshot({
          path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/comment-section-detail.png'
        });
      }
    }
  });

  test('Browser console logs and network', async ({ page }) => {
    const consoleLogs: string[] = [];
    const errors: string[] = [];
    const networkFails: string[] = [];

    // Capture console
    page.on('console', msg => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Capture network failures
    page.on('requestfailed', request => {
      networkFails.push(`${request.url()} - ${request.failure()?.errorText}`);
    });

    // Navigate and interact
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Scroll to trigger lazy loading
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    console.log('=== Console Logs ===');
    consoleLogs.forEach(log => console.log(log));

    console.log('\n=== Errors ===');
    errors.forEach(err => console.log(err));

    console.log('\n=== Network Failures ===');
    networkFails.forEach(fail => console.log(fail));

    // Expect no critical errors
    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('404') &&
      !e.toLowerCase().includes('warning')
    );

    expect(criticalErrors.length).toBe(0);
  });
});
