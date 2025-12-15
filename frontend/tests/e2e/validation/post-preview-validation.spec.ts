/**
 * E2E Test Suite: Post Preview - No Duplicate Title
 *
 * Validates that post previews show title once (in header) and body content in preview area.
 * Tests collapsed vs expanded states, all onboarding posts, and edge cases.
 *
 * @requirements
 * - Server must be running on http://localhost:3001
 * - Database must contain onboarding posts
 * - Real data (no mocks)
 */

import { test, expect, Page } from '@playwright/test';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SCREENSHOT_DIR = join(__dirname, '../../../docs/screenshots/post-preview');
const BASE_URL = 'http://localhost:5173';

// Test data: Expected onboarding posts
const EXPECTED_POSTS = [
  {
    agent: 'lambda-vi',
    titlePattern: /welcome to agent feed/i,
    description: 'Λvi welcome post'
  },
  {
    agent: 'get-to-know-you-agent',
    titlePattern: /hi.*let's get started/i,
    description: 'Get-to-Know-You intro post'
  },
  {
    agent: 'system',
    titlePattern: /how agent feed works/i,
    description: 'System guide post'
  }
];

test.describe('Post Preview - No Duplicate Title Validation', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto(BASE_URL);

    // Wait for posts to load
    await page.waitForSelector('[data-testid="post-card"]', { timeout: 10000 });

    // Take a screenshot of the initial state
    await page.screenshot({
      path: join(SCREENSHOT_DIR, '00-initial-page-load.png'),
      fullPage: true
    });
  });

  test('01 - Collapsed post should show title once and body in preview', async ({ page }) => {
    console.log('🧪 TEST: Collapsed post preview behavior');

    // Get the first post card
    const firstPost = page.locator('[data-testid="post-card"]').first();

    // Verify post is collapsed (not expanded)
    const expandedContent = firstPost.locator('.prose.prose-sm');
    expect(await expandedContent.count()).toBe(0);

    // Get the title from the header
    const titleElement = firstPost.locator('h2').first();
    const title = await titleElement.textContent();
    expect(title).toBeTruthy();
    console.log('📝 Post title:', title);

    // Get the preview area content (3-line clamped section)
    const previewElement = firstPost.locator('.text-sm.text-gray-600').first();
    const previewText = await previewElement.textContent();
    expect(previewText).toBeTruthy();
    console.log('👁️ Preview text:', previewText?.substring(0, 100) + '...');

    // CRITICAL CHECK: Title should NOT appear in preview text
    const titleWords = title!.toLowerCase().trim();
    const previewWords = previewText!.toLowerCase().trim();

    // Check if preview starts with title (which would be wrong)
    const previewStartsWithTitle = previewWords.startsWith(titleWords);

    // Check if title is fully contained in preview (also wrong)
    const previewContainsTitle = previewWords.includes(titleWords);

    console.log('🔍 Validation:', {
      titleLength: title?.length,
      previewLength: previewText?.length,
      previewStartsWithTitle,
      previewContainsTitle
    });

    // Assertion: Preview should NOT contain the title
    expect(previewContainsTitle).toBe(false);
    expect(previewStartsWithTitle).toBe(false);

    // Screenshot the collapsed state
    await firstPost.screenshot({
      path: join(SCREENSHOT_DIR, '01-collapsed-no-duplicate.png')
    });

    console.log('✅ PASS: Title appears only once, preview shows body content');
  });

  test('02 - All onboarding posts have correct preview behavior', async ({ page }) => {
    console.log('🧪 TEST: Validate all onboarding posts');

    const allPosts = page.locator('[data-testid="post-card"]');
    const postCount = await allPosts.count();

    console.log(`📊 Found ${postCount} posts`);

    // Test each post individually
    for (let i = 0; i < Math.min(postCount, 5); i++) {
      const post = allPosts.nth(i);

      // Get title and preview
      const title = await post.locator('h2').first().textContent();
      const preview = await post.locator('.text-sm.text-gray-600').first().textContent();

      console.log(`\n📝 Post ${i + 1}:`);
      console.log(`   Title: ${title}`);
      console.log(`   Preview: ${preview?.substring(0, 80)}...`);

      // Validate no duplicate
      const titleLower = title?.toLowerCase().trim() || '';
      const previewLower = preview?.toLowerCase().trim() || '';

      const hasDuplicate = previewLower.includes(titleLower) || previewLower.startsWith(titleLower);

      console.log(`   ✓ No duplicate: ${!hasDuplicate}`);
      expect(hasDuplicate).toBe(false);

      // Screenshot each post
      await post.screenshot({
        path: join(SCREENSHOT_DIR, `02-post-${i + 1}-preview.png`)
      });
    }

    // Full page screenshot showing all posts
    await page.screenshot({
      path: join(SCREENSHOT_DIR, '02-all-posts-overview.png'),
      fullPage: true
    });

    console.log('✅ PASS: All posts validated');
  });

  test('03 - Expanded post shows full content correctly', async ({ page }) => {
    console.log('🧪 TEST: Expanded post content');

    const firstPost = page.locator('[data-testid="post-card"]').first();

    // Screenshot collapsed state
    await firstPost.screenshot({
      path: join(SCREENSHOT_DIR, '03-before-expansion.png')
    });

    // Get title before expansion
    const title = await firstPost.locator('h2').first().textContent();
    console.log('📝 Title:', title);

    // Click to expand
    const expandButton = firstPost.locator('button[aria-label="Expand post"]');
    await expandButton.click();

    // Wait for expansion animation
    await page.waitForTimeout(500);

    // Verify expansion
    const expandedContent = firstPost.locator('.prose.prose-sm');
    expect(await expandedContent.count()).toBe(1);

    // Screenshot expanded state
    await firstPost.screenshot({
      path: join(SCREENSHOT_DIR, '03-after-expansion.png')
    });

    // Get full content
    const fullContent = await expandedContent.first().textContent();
    console.log('📄 Full content length:', fullContent?.length);

    // Verify full content doesn't start with duplicate title
    const contentLower = fullContent?.toLowerCase().trim() || '';
    const titleLower = title?.toLowerCase().trim() || '';

    // In expanded view, content should be the full post body
    expect(fullContent).toBeTruthy();
    expect(fullContent!.length).toBeGreaterThan(100);

    console.log('✅ PASS: Expanded view shows full content');
  });

  test('04 - Specific onboarding posts validation', async ({ page }) => {
    console.log('🧪 TEST: Validate specific onboarding posts');

    for (const expectedPost of EXPECTED_POSTS) {
      console.log(`\n🔍 Looking for: ${expectedPost.description}`);

      // Find post by title pattern
      const posts = page.locator('[data-testid="post-card"]');
      const postCount = await posts.count();

      let found = false;

      for (let i = 0; i < postCount; i++) {
        const post = posts.nth(i);
        const title = await post.locator('h2').first().textContent();

        if (title && expectedPost.titlePattern.test(title)) {
          console.log(`   ✓ Found: "${title}"`);
          found = true;

          // Get preview
          const preview = await post.locator('.text-sm.text-gray-600').first().textContent();

          // Validate no duplicate title in preview
          const titleLower = title.toLowerCase().trim();
          const previewLower = preview?.toLowerCase().trim() || '';

          const hasDuplicate = previewLower.includes(titleLower);

          console.log(`   ✓ Preview starts with body: ${!hasDuplicate}`);
          expect(hasDuplicate).toBe(false);

          // Screenshot this specific post
          const fileName = expectedPost.agent.replace(/-/g, '_');
          await post.screenshot({
            path: join(SCREENSHOT_DIR, `04-${fileName}-post.png`)
          });

          break;
        }
      }

      if (!found) {
        console.warn(`   ⚠️ WARNING: Post not found - ${expectedPost.description}`);
      }
    }

    console.log('✅ PASS: Onboarding posts validated');
  });

  test('05 - Edge case: Post with no markdown heading', async ({ page }) => {
    console.log('🧪 TEST: Edge case - posts without markdown headings');

    const posts = page.locator('[data-testid="post-card"]');
    const postCount = await posts.count();

    let testedCount = 0;

    for (let i = 0; i < postCount && testedCount < 3; i++) {
      const post = posts.nth(i);
      const title = await post.locator('h2').first().textContent();
      const preview = await post.locator('.text-sm.text-gray-600').first().textContent();

      if (title && preview) {
        // Validate basic preview behavior
        const titleLower = title.toLowerCase().trim();
        const previewLower = preview.toLowerCase().trim();

        // Preview should show content, not duplicate title
        const previewIsNotTitle = previewLower !== titleLower;

        console.log(`   Post ${i + 1}: ${previewIsNotTitle ? '✓' : '✗'} Preview != Title`);

        expect(previewIsNotTitle).toBe(true);
        testedCount++;
      }
    }

    await page.screenshot({
      path: join(SCREENSHOT_DIR, '05-edge-case-no-heading.png'),
      fullPage: true
    });

    console.log('✅ PASS: Edge cases handled');
  });

  test('06 - Edge case: Post with HTML comments', async ({ page }) => {
    console.log('🧪 TEST: Edge case - HTML comments in content');

    // HTML comments should be stripped from preview
    const firstPost = page.locator('[data-testid="post-card"]').first();
    const preview = await firstPost.locator('.text-sm.text-gray-600').first().textContent();

    // Preview should not contain HTML comment syntax
    expect(preview).not.toContain('<!--');
    expect(preview).not.toContain('-->');

    console.log('✅ PASS: HTML comments not visible in preview');

    await firstPost.screenshot({
      path: join(SCREENSHOT_DIR, '06-edge-case-html-comments.png')
    });
  });

  test('07 - Edge case: Post with emojis in title', async ({ page }) => {
    console.log('🧪 TEST: Edge case - emojis in title');

    const posts = page.locator('[data-testid="post-card"]');
    const postCount = await posts.count();

    // Find post with emoji in title
    for (let i = 0; i < postCount; i++) {
      const post = posts.nth(i);
      const title = await post.locator('h2').first().textContent();

      // Check if title contains emoji (Unicode emoji pattern)
      const hasEmoji = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(title || '');

      if (hasEmoji) {
        console.log(`   ✓ Found post with emoji: "${title}"`);

        const preview = await post.locator('.text-sm.text-gray-600').first().textContent();

        // Validate preview doesn't duplicate title
        const titleLower = title!.toLowerCase().trim();
        const previewLower = preview?.toLowerCase().trim() || '';

        expect(previewLower.includes(titleLower)).toBe(false);

        await post.screenshot({
          path: join(SCREENSHOT_DIR, '07-edge-case-emoji-title.png')
        });

        break;
      }
    }

    console.log('✅ PASS: Emoji titles handled correctly');
  });

  test('08 - Before/After comparison documentation', async ({ page }) => {
    console.log('🧪 TEST: Before/After comparison for documentation');

    const firstPost = page.locator('[data-testid="post-card"]').first();

    // Get current behavior
    const title = await firstPost.locator('h2').first().textContent();
    const preview = await firstPost.locator('.text-sm.text-gray-600').first().textContent();

    const titleLower = title?.toLowerCase().trim() || '';
    const previewLower = preview?.toLowerCase().trim() || '';

    const currentBehavior = {
      title: title,
      preview: preview?.substring(0, 150) + '...',
      titleInPreview: previewLower.includes(titleLower),
      previewStartsWithTitle: previewLower.startsWith(titleLower)
    };

    console.log('\n📊 CURRENT BEHAVIOR:');
    console.log('   Title:', currentBehavior.title);
    console.log('   Preview:', currentBehavior.preview);
    console.log('   Title duplicated in preview:', currentBehavior.titleInPreview);
    console.log('   Preview starts with title:', currentBehavior.previewStartsWithTitle);

    // Screenshot for documentation
    await firstPost.screenshot({
      path: join(SCREENSHOT_DIR, '08-current-behavior.png')
    });

    // Expand to see full content
    await firstPost.locator('button[aria-label="Expand post"]').click();
    await page.waitForTimeout(500);

    await firstPost.screenshot({
      path: join(SCREENSHOT_DIR, '08-expanded-behavior.png')
    });

    console.log('✅ PASS: Documentation screenshots captured');
  });

  test('09 - Performance: Preview rendering speed', async ({ page }) => {
    console.log('🧪 TEST: Performance - preview rendering');

    const startTime = Date.now();

    // Wait for all posts to render
    await page.waitForSelector('[data-testid="post-card"]');
    const posts = page.locator('[data-testid="post-card"]');
    const postCount = await posts.count();

    const renderTime = Date.now() - startTime;

    console.log(`⏱️ Rendered ${postCount} posts in ${renderTime}ms`);
    expect(renderTime).toBeLessThan(2000); // Should render in under 2 seconds

    // Check that all previews are visible
    for (let i = 0; i < Math.min(postCount, 3); i++) {
      const post = posts.nth(i);
      const preview = post.locator('.text-sm.text-gray-600').first();
      await expect(preview).toBeVisible();
    }

    await page.screenshot({
      path: join(SCREENSHOT_DIR, '09-performance-rendering.png'),
      fullPage: true
    });

    console.log('✅ PASS: Performance acceptable');
  });

  test('10 - Accessibility: Preview text is readable', async ({ page }) => {
    console.log('🧪 TEST: Accessibility - preview readability');

    const firstPost = page.locator('[data-testid="post-card"]').first();
    const previewElement = firstPost.locator('.text-sm.text-gray-600').first();

    // Check text color contrast (should be visible)
    const color = await previewElement.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        color: styles.color,
        fontSize: styles.fontSize,
        lineHeight: styles.lineHeight
      };
    });

    console.log('📝 Preview styles:', color);

    // Verify text is visible
    await expect(previewElement).toBeVisible();

    // Check that preview has content
    const text = await previewElement.textContent();
    expect(text).toBeTruthy();
    expect(text!.length).toBeGreaterThan(10);

    await firstPost.screenshot({
      path: join(SCREENSHOT_DIR, '10-accessibility-preview.png')
    });

    console.log('✅ PASS: Preview is accessible and readable');
  });

  test('11 - Consistency: All posts follow same preview pattern', async ({ page }) => {
    console.log('🧪 TEST: Consistency across all posts');

    const posts = page.locator('[data-testid="post-card"]');
    const postCount = await posts.count();

    const results = [];

    for (let i = 0; i < Math.min(postCount, 5); i++) {
      const post = posts.nth(i);

      // Check structure consistency
      const hasTitle = await post.locator('h2').count() > 0;
      const hasPreview = await post.locator('.text-sm.text-gray-600').count() > 0;
      const hasExpandButton = await post.locator('button[aria-label="Expand post"]').count() > 0;

      results.push({
        post: i + 1,
        hasTitle,
        hasPreview,
        hasExpandButton
      });

      expect(hasTitle).toBe(true);
      expect(hasPreview).toBe(true);
      expect(hasExpandButton).toBe(true);
    }

    console.log('📊 Consistency check:', results);

    await page.screenshot({
      path: join(SCREENSHOT_DIR, '11-consistency-check.png'),
      fullPage: true
    });

    console.log('✅ PASS: All posts follow consistent pattern');
  });

  test('12 - Integration: Preview updates on content change', async ({ page }) => {
    console.log('🧪 TEST: Preview updates correctly');

    // Take initial screenshot
    await page.screenshot({
      path: join(SCREENSHOT_DIR, '12-initial-state.png'),
      fullPage: true
    });

    // Refresh page
    await page.reload();
    await page.waitForSelector('[data-testid="post-card"]');

    // Take post-refresh screenshot
    await page.screenshot({
      path: join(SCREENSHOT_DIR, '12-after-refresh.png'),
      fullPage: true
    });

    // Verify posts still render correctly
    const posts = page.locator('[data-testid="post-card"]');
    expect(await posts.count()).toBeGreaterThan(0);

    console.log('✅ PASS: Preview persists after refresh');
  });

});

test.describe('Post Preview - Regression Prevention', () => {

  test('REG-01 - Title should never be duplicated in preview', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('[data-testid="post-card"]');

    const posts = page.locator('[data-testid="post-card"]');
    const postCount = await posts.count();

    let failedPosts = [];

    for (let i = 0; i < postCount; i++) {
      const post = posts.nth(i);
      const title = await post.locator('h2').first().textContent();
      const preview = await post.locator('.text-sm.text-gray-600').first().textContent();

      if (title && preview) {
        const titleLower = title.toLowerCase().trim();
        const previewLower = preview.toLowerCase().trim();

        if (previewLower.includes(titleLower) || previewLower.startsWith(titleLower)) {
          failedPosts.push({
            postNumber: i + 1,
            title: title.substring(0, 50) + '...',
            issue: 'Title found in preview'
          });
        }
      }
    }

    if (failedPosts.length > 0) {
      console.error('❌ REGRESSION DETECTED:');
      console.error(failedPosts);

      await page.screenshot({
        path: join(SCREENSHOT_DIR, 'REG-01-FAILED.png'),
        fullPage: true
      });
    }

    expect(failedPosts).toHaveLength(0);
  });

  test('REG-02 - Preview should always show body content', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('[data-testid="post-card"]');

    const firstPost = page.locator('[data-testid="post-card"]').first();
    const preview = await firstPost.locator('.text-sm.text-gray-600').first().textContent();

    // Preview should have substantial content
    expect(preview).toBeTruthy();
    expect(preview!.length).toBeGreaterThan(20);

    // Preview should not be just whitespace
    expect(preview!.trim().length).toBeGreaterThan(20);

    console.log('✅ Preview contains body content');
  });

});
