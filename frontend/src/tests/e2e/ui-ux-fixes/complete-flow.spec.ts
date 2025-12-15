import { test, expect } from '@playwright/test';

/**
 * E2E Test Suite: UI/UX Fixes - Complete Flow
 *
 * Tests all 7 acceptance criteria from SPARC-UI-UX-FIXES-SYSTEM-INITIALIZATION.md
 * Each test includes screenshot capture for visual validation
 *
 * Prerequisites:
 * - Frontend server running on http://localhost:5173
 * - Backend API server running on http://localhost:3000
 * - Database initialized with welcome posts
 */

test.describe('UI/UX Fixes - Complete Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app and wait for network to be idle
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Wait for posts to load
    await page.waitForSelector('article', { timeout: 10000 });
  });

  test('AC-1: Posts appear in correct order (Λvi first)', async ({ page }) => {
    // Get all posts in the feed
    const posts = await page.locator('article').all();
    expect(posts.length).toBeGreaterThanOrEqual(3);

    // Verify first post is Λvi welcome
    const firstPostTitle = await posts[0].locator('h2').textContent();
    expect(firstPostTitle).toContain('Welcome to Agent Feed');

    // Verify second post is Get-to-Know-You
    const secondPostTitle = await posts[1].locator('h2').textContent();
    expect(secondPostTitle).toContain("Hi! Let's Get Started");

    // Verify third post is Reference Guide
    const thirdPostTitle = await posts[2].locator('h2').textContent();
    expect(thirdPostTitle).toContain('How Agent Feed Works');

    // Capture full page screenshot showing correct order
    await page.screenshot({
      path: '/workspaces/agent-feed/docs/screenshots/ui-ux/01-correct-post-order.png',
      fullPage: true
    });
  });

  test('AC-2: No "Lambda" text visible', async ({ page }) => {
    // Get the first post (Λvi welcome)
    const firstPost = page.locator('article').first();
    const content = await firstPost.textContent();

    // Verify "Λvi" is present
    expect(content).toContain('Λvi');

    // Verify no "Lambda-vi" or "Lambda vi" text
    expect(content.toLowerCase()).not.toContain('lambda-vi');
    expect(content.toLowerCase()).not.toContain('lambda vi');

    // Capture screenshot of first post
    await page.screenshot({
      path: '/workspaces/agent-feed/docs/screenshots/ui-ux/02-no-lambda-text.png',
      clip: {
        x: 0,
        y: 0,
        width: 1920,
        height: 800
      }
    });
  });

  test('AC-3: Expansion indicator visible', async ({ page }) => {
    // Check if expansion indicator is visible on collapsed posts
    const expandIndicator = page.locator('text=Click to expand').first();
    await expect(expandIndicator).toBeVisible({ timeout: 5000 });

    // Capture screenshot showing expansion indicator
    await page.screenshot({
      path: '/workspaces/agent-feed/docs/screenshots/ui-ux/03-expansion-indicator.png',
      clip: {
        x: 0,
        y: 0,
        width: 1920,
        height: 800
      }
    });
  });

  test('AC-4: Title appears only once when expanded', async ({ page }) => {
    // Get the first post
    const firstPost = page.locator('article').first();

    // Click the expand button
    const expandButton = firstPost.locator('[aria-label="Expand post"]');
    await expandButton.click();

    // Wait for expansion animation
    await page.waitForTimeout(500);

    // Count how many times the title appears
    const titleCount = await firstPost.locator('text=Welcome to Agent Feed!').count();
    expect(titleCount).toBe(1);

    // Capture screenshot of expanded post
    await page.screenshot({
      path: '/workspaces/agent-feed/docs/screenshots/ui-ux/04-single-title-expanded.png',
      clip: {
        x: 0,
        y: 0,
        width: 1920,
        height: 1200
      }
    });
  });

  test('AC-5: Agent name shows correctly (not "User")', async ({ page }) => {
    // Get the first post and expand it
    const firstPost = page.locator('article').first();
    await firstPost.locator('[aria-label="Expand post"]').click();

    // Wait for expansion
    await page.waitForTimeout(500);

    // Get the agent name from the header
    const agentName = await firstPost.locator('h3').textContent();

    // Verify it shows "Λvi" and not "User"
    expect(agentName).toContain('Λvi');
    expect(agentName).not.toContain('User');

    // Capture screenshot showing correct agent name
    await page.screenshot({
      path: '/workspaces/agent-feed/docs/screenshots/ui-ux/05-correct-agent-name.png',
      clip: {
        x: 0,
        y: 0,
        width: 1920,
        height: 800
      }
    });
  });

  test('AC-6: Mentions render as clickable buttons (no placeholders)', async ({ page }) => {
    // Expand the reference guide (third post)
    const thirdPost = page.locator('article').nth(2);
    await thirdPost.locator('[aria-label="Expand post"]').click();

    // Wait for expansion
    await page.waitForTimeout(500);

    // Find a mention button in the content
    const mention = thirdPost.locator('[data-type="mention"]').first();
    await expect(mention).toBeVisible({ timeout: 5000 });

    // Get mention text and verify it's properly formatted
    const mentionText = await mention.textContent();
    expect(mentionText).toMatch(/@[a-z-]+/);
    expect(mentionText).not.toContain('___MENTION');

    // Capture screenshot showing clickable mentions
    await page.screenshot({
      path: '/workspaces/agent-feed/docs/screenshots/ui-ux/06-clickable-mentions.png',
      clip: {
        x: 0,
        y: 0,
        width: 1920,
        height: 1200
      }
    });

    // Click the mention and verify filter is applied
    await mention.click();
    await page.waitForTimeout(1000);

    // Capture screenshot showing filtered feed
    await page.screenshot({
      path: '/workspaces/agent-feed/docs/screenshots/ui-ux/07-mention-filter-applied.png',
      fullPage: true
    });
  });

  test('AC-7: No bridge errors in console', async ({ page }) => {
    // Collect console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (text.includes('Failed to fetch bridge') || text.includes('bridge')) {
          errors.push(text);
        }
      }
    });

    // Wait and let the page fully load
    await page.waitForTimeout(2000);

    // Verify no bridge-related errors occurred
    expect(errors.length).toBe(0);

    // Capture screenshot showing clean console (no errors visible in UI)
    await page.screenshot({
      path: '/workspaces/agent-feed/docs/screenshots/ui-ux/08-no-bridge-errors.png',
      fullPage: true
    });
  });

  test('BONUS: Complete user flow - expand, scroll, interact', async ({ page }) => {
    // This test demonstrates a complete user interaction flow

    // 1. Verify feed loads with correct order
    const posts = await page.locator('article').all();
    expect(posts.length).toBeGreaterThanOrEqual(3);

    // 2. Expand first post (Λvi welcome)
    await posts[0].locator('[aria-label="Expand post"]').click();
    await page.waitForTimeout(500);

    // 3. Scroll to see full content
    await page.evaluate(() => window.scrollTo(0, 300));
    await page.waitForTimeout(300);

    // 4. Expand second post (Get-to-Know-You)
    await posts[1].locator('[aria-label="Expand post"]').click();
    await page.waitForTimeout(500);

    // 5. Expand third post (Reference Guide)
    await posts[2].locator('[aria-label="Expand post"]').click();
    await page.waitForTimeout(500);

    // 6. Find and click a mention in the reference guide
    const mention = posts[2].locator('[data-type="mention"]').first();
    if (await mention.count() > 0) {
      await mention.click();
      await page.waitForTimeout(1000);
    }

    // 7. Verify all posts are still visible and correctly formatted
    const expandedPosts = await page.locator('article').all();
    expect(expandedPosts.length).toBeGreaterThan(0);

    // Capture final state
    await page.screenshot({
      path: '/workspaces/agent-feed/docs/screenshots/ui-ux/09-complete-flow-end-state.png',
      fullPage: true
    });
  });
});

/**
 * Test Summary:
 *
 * AC-1: ✅ Post order validation (Λvi → Get-to-Know-You → Reference)
 * AC-2: ✅ No "Lambda" text validation
 * AC-3: ✅ Expansion indicator visibility
 * AC-4: ✅ Single title in expanded view
 * AC-5: ✅ Correct agent names (not "User")
 * AC-6: ✅ Clickable mentions (no placeholders)
 * AC-7: ✅ No bridge console errors
 * BONUS: ✅ Complete user interaction flow
 *
 * Total: 8 tests
 * Screenshots: 9 images
 */
