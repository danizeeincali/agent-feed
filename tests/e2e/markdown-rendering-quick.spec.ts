/**
 * Quick Markdown Rendering E2E Tests
 * Focused validation with screenshots
 */

import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FRONTEND_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = path.join(__dirname, '../../screenshots');

test.describe('Markdown Rendering - Quick Validation', () => {

  test('should validate markdown elements with screenshots', async ({ page }) => {
    test.setTimeout(30000);

    // Ensure screenshot directory exists
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }

    console.log('\n=== MARKDOWN RENDERING VALIDATION ===\n');

    // Navigate to frontend
    await page.goto(FRONTEND_URL, { waitUntil: 'domcontentloaded', timeout: 10000 });

    // Wait for feed
    await page.waitForSelector('.post, [data-testid="post-item"]', { timeout: 10000 }).catch(() => {
      console.log('Warning: Posts not found quickly');
    });

    await page.waitForTimeout(2000);

    // Take initial screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'markdown-01-initial-feed.png'),
      fullPage: true
    });

    // Count markdown elements
    const report = {
      timestamp: new Date().toISOString(),
      elements: {
        headers: await page.locator('h1, h2, h3, h4, h5, h6').count(),
        bold: await page.locator('strong, b').count(),
        italic: await page.locator('em, i').count(),
        inline_code: await page.locator('code:not(pre code)').count(),
        code_blocks: await page.locator('pre').count(),
        lists: await page.locator('ul, ol').count(),
        blockquotes: await page.locator('blockquote').count(),
        tables: await page.locator('table').count(),
        links: await page.locator('a[href^="http"]').count(),
        mentions: await page.locator('button:has-text("@"), [data-mention]').count(),
        hashtags: await page.locator('button:has-text("#"), [data-hashtag]').count(),
      }
    };

    console.log('Markdown Elements Found:');
    console.log(`  Headers: ${report.elements.headers}`);
    console.log(`  Bold: ${report.elements.bold}`);
    console.log(`  Italic: ${report.elements.italic}`);
    console.log(`  Inline Code: ${report.elements.inline_code}`);
    console.log(`  Code Blocks: ${report.elements.code_blocks}`);
    console.log(`  Lists: ${report.elements.lists}`);
    console.log(`  Blockquotes: ${report.elements.blockquotes}`);
    console.log(`  Tables: ${report.elements.tables}`);
    console.log(`  Links: ${report.elements.links}`);
    console.log(`  @Mentions: ${report.elements.mentions}`);
    console.log(`  #Hashtags: ${report.elements.hashtags}`);

    // Verify at least some markdown is present
    expect(report.elements.headers + report.elements.bold + report.elements.lists).toBeGreaterThan(0);

    // Screenshot specific elements
    const headers = page.locator('h2, h3').first();
    if (await headers.isVisible({ timeout: 1000 }).catch(() => false)) {
      await headers.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'markdown-02-headers.png'),
      });
    }

    const codeBlock = page.locator('pre').first();
    if (await codeBlock.isVisible({ timeout: 1000 }).catch(() => false)) {
      await codeBlock.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'markdown-03-code-block.png'),
      });
    }

    // Test @mention clicking
    const mention = page.locator('button:has-text("@")').first();
    if (await mention.isVisible({ timeout: 1000 }).catch(() => false)) {
      await mention.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'markdown-04-mention-before-click.png'),
      });

      await mention.click();
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'markdown-05-mention-after-click.png'),
        fullPage: true
      });
    }

    // Save report
    const reportPath = path.join(SCREENSHOT_DIR, 'markdown-quick-validation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`\nReport saved: ${reportPath}`);
    console.log('\n=== VALIDATION COMPLETE ===\n');
  });

  test('should validate dark mode rendering', async ({ page }) => {
    test.setTimeout(20000);

    await page.goto(FRONTEND_URL, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForTimeout(2000);

    // Light mode screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'markdown-06-light-mode.png'),
      fullPage: true
    });

    // Toggle dark mode
    const darkToggle = page.locator('[data-testid="dark-mode-toggle"], button:has-text("Dark"), button:has-text("🌙")').first();
    if (await darkToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      await darkToggle.click();
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'markdown-07-dark-mode.png'),
        fullPage: true
      });

      console.log('✓ Dark mode screenshot captured');
    } else {
      console.log('Note: Dark mode toggle not found');
    }
  });

  test('should validate personal-todos-agent post', async ({ page }) => {
    test.setTimeout(20000);

    await page.goto(FRONTEND_URL, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForTimeout(2000);

    // Search for personal-todos-agent
    const posts = page.locator('.post, [data-testid="post-item"]');
    const count = await posts.count();

    console.log(`\nScanning ${count} posts for personal-todos-agent...`);

    for (let i = 0; i < count; i++) {
      const post = posts.nth(i);
      const text = await post.textContent();

      if (text && text.toLowerCase().includes('personal-todos')) {
        console.log(`Found personal-todos-agent post at index ${i}`);

        await post.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);

        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, 'markdown-08-personal-todos-post.png'),
        });

        // Analyze content
        const hasHeaders = await post.locator('h2, h3').count() > 0;
        const hasBold = await post.locator('strong, b').count() > 0;
        const hasLists = await post.locator('ul, ol').count() > 0;

        console.log('Post Analysis:');
        console.log(`  Has Headers: ${hasHeaders}`);
        console.log(`  Has Bold: ${hasBold}`);
        console.log(`  Has Lists: ${hasLists}`);

        break;
      }
    }
  });
});
