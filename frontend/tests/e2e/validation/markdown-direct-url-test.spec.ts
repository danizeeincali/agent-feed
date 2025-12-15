import { test, expect } from '@playwright/test';

/**
 * DIRECT URL TEST - Navigate to specific post with markdown comments
 *
 * This test validates markdown rendering by going directly to a known post
 * that contains agent comments with markdown syntax.
 */

test.describe('Markdown Rendering - Direct URL Validation', () => {
  const POST_WITH_MARKDOWN = 'post-1761286275490'; // Post with System Status Report

  test('renders markdown in real agent comment - System Status Report', async ({ page }) => {
    console.log('Step 1: Navigate directly to post with markdown...');

    // Navigate directly to the specific post
    await page.goto(`http://localhost:5173/feed#${POST_WITH_MARKDOWN}`);
    await page.waitForLoadState('networkidle');

    // Wait a bit for any client-side routing
    await page.waitForTimeout(2000);

    // Take initial screenshot
    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/direct-url-01-page-load.png',
      fullPage: true
    });

    console.log('Step 2: Click on the post to view comments...');

    // Find and click the post
    const postCard = page.locator(`[data-post-id="${POST_WITH_MARKDOWN}"], .post-card`).first();
    if (await postCard.count() > 0) {
      await postCard.click();
      await page.waitForTimeout(2000);
    }

    // Take screenshot after clicking
    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/direct-url-02-post-opened.png',
      fullPage: true
    });

    console.log('Step 3: Find comments and verify markdown rendering...');

    // Find all comment cards
    const commentCards = page.locator('.comment-card');
    const commentCount = await commentCards.count();

    console.log(`Found ${commentCount} comment cards`);

    // Find all comment content areas
    const commentContents = page.locator('.comment-content');
    let foundMarkdownRendered = false;
    let foundRawMarkdownSymbols = false;
    const details: string[] = [];

    for (let i = 0; i < commentCount; i++) {
      const content = commentContents.nth(i);
      const text = await content.textContent();

      if (!text) continue;

      // Check for RENDERED markdown elements
      const hasHeaders = await content.locator('h1, h2, h3, h4').count();
      const hasBold = await content.locator('strong, b').count();
      const hasLists = await content.locator('ul, ol').count();
      const hasCode = await content.locator('code').count();

      const hasRenderedMarkdown = hasHeaders + hasBold + hasLists + hasCode > 0;

      // Check for RAW markdown symbols (FAILURE CONDITION)
      const hasRawHeaders = text.includes('##');
      const hasRawBold = text.includes('**');
      const hasRawCode = text.includes('```');

      const hasRawSymbols = hasRawHeaders || hasRawBold || hasRawCode;

      if (hasRenderedMarkdown) {
        foundMarkdownRendered = true;
        details.push(`✓ Comment ${i + 1}: Has rendered markdown (headers:${hasHeaders}, bold:${hasBold}, lists:${hasLists}, code:${hasCode})`);
      }

      if (hasRawSymbols) {
        foundRawMarkdownSymbols = true;
        details.push(`✗ Comment ${i + 1}: Has RAW markdown symbols! (##:${hasRawHeaders}, **:${hasRawBold}, \`\`\`:${hasRawCode})`);
        details.push(`   Preview: ${text.substring(0, 200)}...`);
      }

      console.log(`Comment ${i + 1}: rendered=${hasRenderedMarkdown}, raw=${hasRawSymbols}`);
    }

    // Take final screenshot
    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/direct-url-03-comments-analyzed.png',
      fullPage: true
    });

    // Print detailed results
    console.log('\n=== MARKDOWN RENDERING VALIDATION RESULTS ===');
    console.log(`Total comments: ${commentCount}`);
    console.log(`Found rendered markdown: ${foundMarkdownRendered}`);
    console.log(`Found RAW markdown symbols: ${foundRawMarkdownSymbols}`);
    console.log('\nDetailed Analysis:');
    details.forEach(line => console.log(line));
    console.log('==========================================\n');

    // CRITICAL ASSERTIONS
    // Should have rendered markdown elements
    expect(foundMarkdownRendered).toBe(true);

    // Should NOT have raw markdown symbols
    expect(foundRawMarkdownSymbols).toBe(false);

    // Log success
    console.log('✅ TEST PASSED: Markdown is properly rendered, no raw symbols found');
  });

  test('specific markdown elements render correctly', async ({ page }) => {
    console.log('Testing specific markdown element rendering...');

    await page.goto(`http://localhost:5173`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Click on a post
    const firstPost = page.locator('.post-card, [data-testid="post"]').first();
    if (await firstPost.count() > 0) {
      await firstPost.click();
      await page.waitForTimeout(2000);
    }

    // Count markdown elements across all comments
    const headers = await page.locator('.comment-content h2, .comment-content h3').count();
    const bold = await page.locator('.comment-content strong, .comment-content b').count();
    const lists = await page.locator('.comment-content ul, .comment-content ol').count();
    const code = await page.locator('.comment-content code').count();

    console.log(`Markdown elements found:`);
    console.log(`- Headers (h2/h3): ${headers}`);
    console.log(`- Bold text: ${bold}`);
    console.log(`- Lists: ${lists}`);
    console.log(`- Code: ${code}`);

    const totalMarkdown = headers + bold + lists + code;

    // Take evidence screenshot
    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/markdown-elements-evidence.png',
      fullPage: true
    });

    // Should have SOME markdown elements rendered
    expect(totalMarkdown).toBeGreaterThan(0);

    console.log(`✅ Found ${totalMarkdown} rendered markdown elements`);
  });
});
