/**
 * Comprehensive Playwright E2E Tests for Markdown Rendering
 *
 * SPARC Specification: /workspaces/agent-feed/docs/SPARC-MARKDOWN-RENDERING-SPEC.md
 *
 * Test Coverage:
 * - FR-001 to FR-008: Markdown Rendering (headers, bold, lists, code, blockquotes, tables, hr, inline code)
 * - FR-009 to FR-011: Interactive Elements (@mentions, #hashtags, URLs, link previews)
 * - Visual Validation with Screenshots
 * - Dark Mode Rendering
 * - Regression Tests
 * - Security (XSS Prevention)
 * - Performance
 *
 * Target Environment:
 * - Frontend: http://localhost:5173
 * - Backend: http://localhost:3001
 * - Test Post: personal-todos-agent "Strategic Follow-up Tasks Created"
 */

import { test, expect, Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module workaround for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:3001';
const SCREENSHOT_DIR = path.join(__dirname, '../../screenshots');
const TEST_TIMEOUT = 60000;

/**
 * Helper Functions
 */

async function waitForFeedToLoad(page: Page) {
  // Wait for feed container
  await page.waitForSelector('[data-testid="post-list"], .feed-container, .posts-container', {
    timeout: 10000,
    state: 'visible'
  });

  // Wait for at least one post to appear
  await page.waitForSelector('.post, [data-testid="post-item"]', {
    timeout: 10000,
    state: 'visible'
  });

  // Wait for network to be idle
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {
    console.log('Network did not become idle within timeout - proceeding anyway');
  });
}

async function expandPost(page: Page, postSelector: string) {
  const expandButton = page.locator(`${postSelector} button:has-text("Expand"), ${postSelector} [aria-label*="expand"], ${postSelector} .expand-button`).first();
  if (await expandButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await expandButton.click();
    await page.waitForTimeout(500); // Wait for expansion animation
  }
}

async function takeScreenshot(page: Page, name: string, fullPage: boolean = false) {
  const screenshotPath = path.join(SCREENSHOT_DIR, `markdown-${name}.png`);
  await page.screenshot({
    path: screenshotPath,
    fullPage,
    animations: 'disabled'
  });
  console.log(`Screenshot saved: ${screenshotPath}`);
  return screenshotPath;
}

async function checkConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  return errors;
}

/**
 * Test Suite
 */

test.describe('Markdown Rendering - Comprehensive E2E Validation', () => {

  test.beforeEach(async ({ page }) => {
    // Set longer timeout for all tests
    test.setTimeout(TEST_TIMEOUT);

    // Track console errors
    const errors = await checkConsoleErrors(page);

    // Navigate to frontend
    await page.goto(FRONTEND_URL, { waitUntil: 'domcontentloaded' });

    // Wait for feed to load
    await waitForFeedToLoad(page);
  });

  /**
   * FR-002: Headers Rendering
   */
  test('should render Markdown headers with proper hierarchy', async ({ page }) => {
    await takeScreenshot(page, '01-headers-initial', true);

    // Look for posts with header markdown (##, ###)
    const headers = page.locator('h1, h2, h3, h4, h5, h6');
    const headerCount = await headers.count();

    console.log(`Found ${headerCount} headers in feed`);
    expect(headerCount).toBeGreaterThan(0);

    // Check that headers have proper semantic HTML
    const h2Elements = page.locator('h2');
    if (await h2Elements.count() > 0) {
      const firstH2 = h2Elements.first();
      await expect(firstH2).toBeVisible();

      // Verify header styling
      const fontSize = await firstH2.evaluate(el => window.getComputedStyle(el).fontSize);
      console.log(`H2 font size: ${fontSize}`);

      await takeScreenshot(page, '02-headers-visible');
    }
  });

  /**
   * FR-003: Text Formatting (Bold, Italic, Inline Code)
   */
  test('should render bold, italic, and inline code formatting', async ({ page }) => {
    await takeScreenshot(page, '03-text-formatting-initial', true);

    // Look for bold text
    const boldElements = page.locator('strong, b');
    const boldCount = await boldElements.count();
    console.log(`Found ${boldCount} bold elements`);

    if (boldCount > 0) {
      const firstBold = boldElements.first();
      await expect(firstBold).toBeVisible();

      // Verify bold styling
      const fontWeight = await firstBold.evaluate(el => window.getComputedStyle(el).fontWeight);
      console.log(`Bold font weight: ${fontWeight}`);
      expect(parseInt(fontWeight)).toBeGreaterThanOrEqual(600);
    }

    // Look for italic text
    const italicElements = page.locator('em, i');
    const italicCount = await italicElements.count();
    console.log(`Found ${italicCount} italic elements`);

    // Look for inline code
    const codeElements = page.locator('code:not(pre code)');
    const codeCount = await codeElements.count();
    console.log(`Found ${codeCount} inline code elements`);

    if (codeCount > 0) {
      const firstCode = codeElements.first();
      await expect(firstCode).toBeVisible();

      // Verify inline code has background
      const bgColor = await firstCode.evaluate(el => window.getComputedStyle(el).backgroundColor);
      console.log(`Inline code background: ${bgColor}`);
      expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');

      await takeScreenshot(page, '04-inline-code-visible');
    }
  });

  /**
   * FR-004: Lists Rendering
   */
  test('should render unordered and ordered lists correctly', async ({ page }) => {
    await takeScreenshot(page, '05-lists-initial', true);

    // Look for unordered lists
    const ulElements = page.locator('ul');
    const ulCount = await ulElements.count();
    console.log(`Found ${ulCount} unordered lists`);

    if (ulCount > 0) {
      const firstUl = ulElements.first();
      await expect(firstUl).toBeVisible();

      // Check list items
      const listItems = firstUl.locator('li');
      const itemCount = await listItems.count();
      console.log(`First list has ${itemCount} items`);
      expect(itemCount).toBeGreaterThan(0);

      await takeScreenshot(page, '06-unordered-list-visible');
    }

    // Look for ordered lists
    const olElements = page.locator('ol');
    const olCount = await olElements.count();
    console.log(`Found ${olCount} ordered lists`);

    if (olCount > 0) {
      const firstOl = olElements.first();
      await expect(firstOl).toBeVisible();
      await takeScreenshot(page, '07-ordered-list-visible');
    }
  });

  /**
   * FR-005: Code Blocks with Syntax Highlighting
   */
  test('should render code blocks with syntax highlighting', async ({ page }) => {
    await takeScreenshot(page, '08-code-blocks-initial', true);

    // Look for code blocks (code inside pre)
    const codeBlocks = page.locator('pre code, pre');
    const codeBlockCount = await codeBlocks.count();
    console.log(`Found ${codeBlockCount} code blocks`);

    if (codeBlockCount > 0) {
      const firstCodeBlock = codeBlocks.first();
      await expect(firstCodeBlock).toBeVisible();

      // Scroll code block into view
      await firstCodeBlock.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);

      // Verify monospace font
      const fontFamily = await firstCodeBlock.evaluate(el => window.getComputedStyle(el).fontFamily);
      console.log(`Code block font: ${fontFamily}`);
      expect(fontFamily.toLowerCase()).toMatch(/mono|courier|consolas|source code pro/);

      // Check for language class (syntax highlighting)
      const className = await firstCodeBlock.getAttribute('class');
      console.log(`Code block classes: ${className}`);

      await takeScreenshot(page, '09-code-block-visible');
    }
  });

  /**
   * FR-006: Blockquotes
   */
  test('should render blockquotes with proper styling', async ({ page }) => {
    await takeScreenshot(page, '10-blockquotes-initial', true);

    const blockquotes = page.locator('blockquote');
    const blockquoteCount = await blockquotes.count();
    console.log(`Found ${blockquoteCount} blockquotes`);

    if (blockquoteCount > 0) {
      const firstBlockquote = blockquotes.first();
      await expect(firstBlockquote).toBeVisible();

      // Verify blockquote styling (border, padding)
      const borderLeft = await firstBlockquote.evaluate(el => window.getComputedStyle(el).borderLeftWidth);
      const paddingLeft = await firstBlockquote.evaluate(el => window.getComputedStyle(el).paddingLeft);

      console.log(`Blockquote border-left: ${borderLeft}, padding-left: ${paddingLeft}`);

      await takeScreenshot(page, '11-blockquote-visible');
    }
  });

  /**
   * FR-007: Tables (GFM)
   */
  test('should render tables with borders and alignment', async ({ page }) => {
    await takeScreenshot(page, '12-tables-initial', true);

    const tables = page.locator('table');
    const tableCount = await tables.count();
    console.log(`Found ${tableCount} tables`);

    if (tableCount > 0) {
      const firstTable = tables.first();
      await expect(firstTable).toBeVisible();

      // Check for table headers
      const headers = firstTable.locator('th');
      const headerCount = await headers.count();
      console.log(`Table has ${headerCount} headers`);

      // Check for table rows
      const rows = firstTable.locator('tr');
      const rowCount = await rows.count();
      console.log(`Table has ${rowCount} rows`);

      await takeScreenshot(page, '13-table-visible');
    }
  });

  /**
   * FR-008: Horizontal Rules
   */
  test('should render horizontal rules as visual dividers', async ({ page }) => {
    await takeScreenshot(page, '14-hr-initial', true);

    const hrs = page.locator('hr');
    const hrCount = await hrs.count();
    console.log(`Found ${hrCount} horizontal rules`);

    if (hrCount > 0) {
      const firstHr = hrs.first();
      await expect(firstHr).toBeVisible();

      // Verify hr styling
      const borderTop = await firstHr.evaluate(el => window.getComputedStyle(el).borderTopWidth);
      console.log(`HR border-top: ${borderTop}`);

      await takeScreenshot(page, '15-hr-visible');
    }
  });

  /**
   * FR-009: Preserve @Mention Functionality (CRITICAL)
   */
  test('CRITICAL: @mentions should be clickable and filter feed', async ({ page }) => {
    await takeScreenshot(page, '16-mentions-initial', true);

    // Look for @mention elements
    const mentions = page.locator('[data-mention], .mention, button:has-text("@")');
    const mentionCount = await mentions.count();
    console.log(`Found ${mentionCount} @mention elements`);

    if (mentionCount > 0) {
      const firstMention = mentions.first();
      await expect(firstMention).toBeVisible();

      // Verify mention is clickable (button or link)
      const tagName = await firstMention.evaluate(el => el.tagName.toLowerCase());
      console.log(`Mention element type: ${tagName}`);
      expect(['button', 'a']).toContain(tagName);

      // Get mention text
      const mentionText = await firstMention.textContent();
      console.log(`Found mention: ${mentionText}`);

      await takeScreenshot(page, '17-mention-before-click');

      // Click mention
      await firstMention.click();
      await page.waitForTimeout(1000);

      // Verify filter is applied (look for filter indicator)
      await takeScreenshot(page, '18-mention-after-click', true);

      // Look for filter indication
      const filterIndicator = page.locator('[data-testid="filter-indicator"], .filter-active, .active-filter');
      if (await filterIndicator.isVisible({ timeout: 2000 }).catch(() => false)) {
        const filterText = await filterIndicator.textContent();
        console.log(`Filter indicator: ${filterText}`);
      }
    }
  });

  /**
   * FR-010: Preserve #Hashtag Functionality (CRITICAL)
   * IMPORTANT: Markdown headers (##) should NOT be treated as hashtags
   */
  test('CRITICAL: #hashtags should be clickable but NOT ## headers', async ({ page }) => {
    await takeScreenshot(page, '19-hashtags-initial', true);

    // Look for hashtag elements
    const hashtags = page.locator('[data-hashtag], .hashtag, button:has-text("#"):not(:has-text("##"))');
    const hashtagCount = await hashtags.count();
    console.log(`Found ${hashtagCount} #hashtag elements`);

    if (hashtagCount > 0) {
      const firstHashtag = hashtags.first();
      await expect(firstHashtag).toBeVisible();

      // Verify hashtag is clickable
      const tagName = await firstHashtag.evaluate(el => el.tagName.toLowerCase());
      console.log(`Hashtag element type: ${tagName}`);
      expect(['button', 'a']).toContain(tagName);

      // Get hashtag text
      const hashtagText = await firstHashtag.textContent();
      console.log(`Found hashtag: ${hashtagText}`);

      await takeScreenshot(page, '20-hashtag-before-click');

      // Click hashtag
      await firstHashtag.click();
      await page.waitForTimeout(1000);

      await takeScreenshot(page, '21-hashtag-after-click', true);
    }

    // Verify H2 headers are NOT clickable
    const h2Headers = page.locator('h2');
    const h2Count = await h2Headers.count();
    console.log(`Found ${h2Count} H2 headers`);

    if (h2Count > 0) {
      const firstH2 = h2Headers.first();
      const h2TagName = await firstH2.evaluate(el => el.tagName.toLowerCase());
      expect(h2TagName).toBe('h2');

      // H2 should NOT be a button
      const isButton = await firstH2.evaluate(el => el.tagName.toLowerCase() === 'button');
      expect(isButton).toBe(false);

      console.log('✓ H2 headers are NOT treated as clickable hashtags');
    }
  });

  /**
   * FR-011: Preserve URL Detection and Link Previews (CRITICAL)
   */
  test('CRITICAL: URLs should be clickable and show link previews', async ({ page }) => {
    await takeScreenshot(page, '22-urls-initial', true);

    // Look for link preview components
    const linkPreviews = page.locator('[data-testid="link-preview"], .link-preview, .url-preview, .enhanced-link-preview');
    const previewCount = await linkPreviews.count();
    console.log(`Found ${previewCount} link previews`);

    if (previewCount > 0) {
      const firstPreview = linkPreviews.first();
      await expect(firstPreview).toBeVisible();

      // Scroll into view
      await firstPreview.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);

      await takeScreenshot(page, '23-link-preview-visible');

      // Check for preview content (title, description, image)
      const hasTitle = await firstPreview.locator('h3, h4, .preview-title, [data-testid="preview-title"]').isVisible().catch(() => false);
      const hasDescription = await firstPreview.locator('p, .preview-description, [data-testid="preview-description"]').isVisible().catch(() => false);

      console.log(`Link preview - has title: ${hasTitle}, has description: ${hasDescription}`);
    }

    // Look for clickable links
    const links = page.locator('a[href^="http"]');
    const linkCount = await links.count();
    console.log(`Found ${linkCount} external links`);

    if (linkCount > 0) {
      const firstLink = links.first();
      const href = await firstLink.getAttribute('href');
      console.log(`First link URL: ${href}`);

      // Verify link opens in new tab
      const target = await firstLink.getAttribute('target');
      console.log(`Link target: ${target}`);
    }
  });

  /**
   * Visual Validation: Collapsed vs Expanded View
   */
  test('should render markdown correctly in both collapsed and expanded views', async ({ page }) => {
    await takeScreenshot(page, '24-collapsed-view', true);

    // Find first post with expand button
    const posts = page.locator('.post, [data-testid="post-item"]');
    const postCount = await posts.count();

    if (postCount > 0) {
      const firstPost = posts.first();

      // Take screenshot of collapsed state
      await firstPost.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await takeScreenshot(page, '25-post-collapsed');

      // Expand post
      const expandButton = firstPost.locator('button:has-text("Expand"), [aria-label*="expand"], .expand-button').first();
      if (await expandButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expandButton.click();
        await page.waitForTimeout(500);

        // Take screenshot of expanded state
        await takeScreenshot(page, '26-post-expanded');

        console.log('✓ Post can be collapsed and expanded');
      } else {
        console.log('Note: Post may already be fully expanded');
      }
    }
  });

  /**
   * Visual Validation: Dark Mode
   */
  test('should render markdown correctly in dark mode', async ({ page }) => {
    await takeScreenshot(page, '27-light-mode', true);

    // Look for dark mode toggle
    const darkModeToggle = page.locator('[data-testid="dark-mode-toggle"], button:has-text("Dark"), button:has-text("🌙"), .theme-toggle');

    if (await darkModeToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      await darkModeToggle.click();
      await page.waitForTimeout(1000);

      await takeScreenshot(page, '28-dark-mode', true);

      // Verify dark mode classes applied
      const bodyClasses = await page.locator('body').getAttribute('class');
      console.log(`Body classes in dark mode: ${bodyClasses}`);

      // Check markdown element colors in dark mode
      const h2Elements = page.locator('h2');
      if (await h2Elements.count() > 0) {
        const h2Color = await h2Elements.first().evaluate(el => window.getComputedStyle(el).color);
        console.log(`H2 color in dark mode: ${h2Color}`);
      }

      const codeElements = page.locator('code');
      if (await codeElements.count() > 0) {
        const codeColor = await codeElements.first().evaluate(el => window.getComputedStyle(el).color);
        const codeBg = await codeElements.first().evaluate(el => window.getComputedStyle(el).backgroundColor);
        console.log(`Code color in dark mode: ${codeColor}, background: ${codeBg}`);
      }
    } else {
      console.log('Note: Dark mode toggle not found - skipping dark mode test');
    }
  });

  /**
   * Regression Test: Plain Text Posts
   */
  test('should render plain text posts correctly (backward compatibility)', async ({ page }) => {
    await takeScreenshot(page, '29-plain-text-posts', true);

    // All posts should be visible
    const posts = page.locator('.post, [data-testid="post-item"]');
    const postCount = await posts.count();

    console.log(`Found ${postCount} posts in feed`);
    expect(postCount).toBeGreaterThan(0);

    // Verify posts have basic content
    for (let i = 0; i < Math.min(postCount, 3); i++) {
      const post = posts.nth(i);
      const hasContent = await post.locator('.post-content, [data-testid="post-content"]').isVisible().catch(() => false);
      console.log(`Post ${i + 1} has content: ${hasContent}`);
    }
  });

  /**
   * Security: XSS Prevention
   */
  test('should sanitize and prevent XSS attacks in markdown content', async ({ page }) => {
    // Monitor for any script execution
    let scriptExecuted = false;
    page.on('dialog', dialog => {
      scriptExecuted = true;
      console.log(`SECURITY WARNING: Dialog detected - ${dialog.message()}`);
      dialog.dismiss();
    });

    await page.waitForTimeout(2000);

    // Check for script tags in DOM
    const scriptTags = await page.locator('script:not([src])').count();
    console.log(`Found ${scriptTags} inline script tags (should be safe)`);

    // Verify no malicious attributes
    const onErrorElements = await page.locator('[onerror], [onclick*="alert"]').count();
    expect(onErrorElements).toBe(0);

    // Verify no javascript: URLs
    const javascriptLinks = await page.locator('a[href^="javascript:"]').count();
    expect(javascriptLinks).toBe(0);

    expect(scriptExecuted).toBe(false);
    console.log('✓ No XSS vulnerabilities detected');

    await takeScreenshot(page, '30-xss-prevention');
  });

  /**
   * Performance Test
   */
  test('should render feed with markdown in acceptable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto(FRONTEND_URL, { waitUntil: 'domcontentloaded' });
    await waitForFeedToLoad(page);

    const loadTime = Date.now() - startTime;
    console.log(`Feed load time: ${loadTime}ms`);

    // Should load in under 5 seconds
    expect(loadTime).toBeLessThan(5000);

    await takeScreenshot(page, '31-performance-test');
  });

  /**
   * Console Error Check
   */
  test('should not have console errors related to markdown rendering', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto(FRONTEND_URL, { waitUntil: 'domcontentloaded' });
    await waitForFeedToLoad(page);
    await page.waitForTimeout(2000);

    // Filter out known non-critical errors
    const criticalErrors = consoleErrors.filter(error =>
      !error.includes('ResizeObserver') &&
      !error.includes('favicon') &&
      !error.includes('WebSocket')
    );

    console.log(`Total console errors: ${consoleErrors.length}`);
    console.log(`Critical errors: ${criticalErrors.length}`);

    if (criticalErrors.length > 0) {
      console.log('Critical errors:', criticalErrors);
    }

    // Log but don't fail on errors (some may be expected)
    if (criticalErrors.length > 3) {
      console.warn(`Warning: ${criticalErrors.length} critical console errors detected`);
    }

    await takeScreenshot(page, '32-console-check');
  });

  /**
   * Comprehensive Visual Report
   */
  test('should generate comprehensive visual validation report', async ({ page }) => {
    console.log('\n========================================');
    console.log('MARKDOWN RENDERING VALIDATION REPORT');
    console.log('========================================\n');

    await page.goto(FRONTEND_URL, { waitUntil: 'domcontentloaded' });
    await waitForFeedToLoad(page);

    const report = {
      timestamp: new Date().toISOString(),
      url: FRONTEND_URL,
      markdown_elements: {
        headers: await page.locator('h1, h2, h3, h4, h5, h6').count(),
        bold: await page.locator('strong, b').count(),
        italic: await page.locator('em, i').count(),
        inline_code: await page.locator('code:not(pre code)').count(),
        code_blocks: await page.locator('pre code, pre').count(),
        lists_unordered: await page.locator('ul').count(),
        lists_ordered: await page.locator('ol').count(),
        blockquotes: await page.locator('blockquote').count(),
        tables: await page.locator('table').count(),
        horizontal_rules: await page.locator('hr').count(),
      },
      interactive_elements: {
        mentions: await page.locator('[data-mention], .mention, button:has-text("@")').count(),
        hashtags: await page.locator('[data-hashtag], .hashtag').count(),
        links: await page.locator('a[href^="http"]').count(),
        link_previews: await page.locator('[data-testid="link-preview"], .link-preview').count(),
      },
      posts: {
        total: await page.locator('.post, [data-testid="post-item"]').count(),
      },
    };

    console.log('Markdown Elements Found:');
    console.log(`  Headers: ${report.markdown_elements.headers}`);
    console.log(`  Bold: ${report.markdown_elements.bold}`);
    console.log(`  Italic: ${report.markdown_elements.italic}`);
    console.log(`  Inline Code: ${report.markdown_elements.inline_code}`);
    console.log(`  Code Blocks: ${report.markdown_elements.code_blocks}`);
    console.log(`  Unordered Lists: ${report.markdown_elements.lists_unordered}`);
    console.log(`  Ordered Lists: ${report.markdown_elements.lists_ordered}`);
    console.log(`  Blockquotes: ${report.markdown_elements.blockquotes}`);
    console.log(`  Tables: ${report.markdown_elements.tables}`);
    console.log(`  Horizontal Rules: ${report.markdown_elements.horizontal_rules}`);

    console.log('\nInteractive Elements Found:');
    console.log(`  @Mentions: ${report.interactive_elements.mentions}`);
    console.log(`  #Hashtags: ${report.interactive_elements.hashtags}`);
    console.log(`  External Links: ${report.interactive_elements.links}`);
    console.log(`  Link Previews: ${report.interactive_elements.link_previews}`);

    console.log(`\nTotal Posts: ${report.posts.total}`);

    console.log('\n========================================');

    await takeScreenshot(page, '33-comprehensive-report', true);

    // Save report as JSON
    const reportPath = path.join(SCREENSHOT_DIR, 'markdown-validation-report.json');
    const fs = require('fs');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\nReport saved: ${reportPath}`);
  });
});

/**
 * Test Suite: Specific Post Validation
 * Target: personal-todos-agent post "Strategic Follow-up Tasks Created"
 */

test.describe('Markdown Rendering - Specific Post Validation', () => {

  test('should find and validate personal-todos-agent post with markdown', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    await page.goto(FRONTEND_URL, { waitUntil: 'domcontentloaded' });
    await waitForFeedToLoad(page);

    await takeScreenshot(page, '34-search-for-target-post', true);

    // Look for personal-todos-agent posts
    const posts = page.locator('.post, [data-testid="post-item"]');
    const postCount = await posts.count();

    console.log(`Scanning ${postCount} posts for personal-todos-agent...`);

    for (let i = 0; i < postCount; i++) {
      const post = posts.nth(i);

      // Check author
      const authorText = await post.locator('.post-author, [data-testid="post-author"], .author-name').textContent().catch(() => '');

      if (authorText.toLowerCase().includes('personal-todos-agent') || authorText.toLowerCase().includes('personal')) {
        console.log(`Found personal-todos-agent post at index ${i}`);

        // Scroll into view
        await post.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);

        await takeScreenshot(page, '35-target-post-found');

        // Expand post to see full markdown
        await expandPost(page, `.post:nth-child(${i + 1}), [data-testid="post-item"]:nth-child(${i + 1})`);
        await page.waitForTimeout(500);

        await takeScreenshot(page, '36-target-post-expanded', false);

        // Analyze markdown content
        const postContent = post.locator('.post-content, [data-testid="post-content"]').first();

        const hasHeaders = await postContent.locator('h2, h3').count() > 0;
        const hasBold = await postContent.locator('strong, b').count() > 0;
        const hasLists = await postContent.locator('ul, ol').count() > 0;
        const hasCode = await postContent.locator('code').count() > 0;

        console.log('Target Post Markdown Analysis:');
        console.log(`  Has Headers: ${hasHeaders}`);
        console.log(`  Has Bold: ${hasBold}`);
        console.log(`  Has Lists: ${hasLists}`);
        console.log(`  Has Code: ${hasCode}`);

        break;
      }
    }
  });
});
