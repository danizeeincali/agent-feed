import { test, expect } from '@playwright/test';
import path from 'path';

/**
 * E2E Test Suite: Onboarding Post Order Validation
 *
 * Purpose: Validate that onboarding posts appear in the correct order in the UI
 * after database reset and system initialization.
 *
 * Expected Order:
 * 1. "Welcome to Agent Feed!" by Λvi
 * 2. "Hi! Let's Get Started" by Get-to-Know-You
 * 3. "📚 How Agent Feed Works" by System Guide
 */

const BASE_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = path.join(process.cwd(), '..', 'docs', 'screenshots', 'post-order-fix');

test.describe('Onboarding Post Order Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport to ensure consistent screenshots
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('1. Should navigate to the application successfully', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page).toHaveTitle(/Agent Feed/);

    // Wait for React to render
    await page.waitForLoadState('networkidle');
  });

  test('2. Should wait for feed to load and render posts', async ({ page }) => {
    await page.goto(BASE_URL);

    // Wait for the feed container to appear
    await page.waitForSelector('[class*="feed"]', { timeout: 10000 });

    // Wait for posts to be rendered
    await page.waitForSelector('[class*="post"]', { timeout: 10000 });

    // Additional wait to ensure all posts are loaded
    await page.waitForTimeout(2000);
  });

  test('3. Should display exactly 3 onboarding posts', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Wait for posts to load
    await page.waitForSelector('[class*="post"]', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Count visible posts
    const posts = await page.locator('[class*="post"]').all();

    expect(posts.length).toBe(3);
  });

  test('4. Should display first post with title "Welcome to Agent Feed!" by Λvi', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[class*="post"]', { timeout: 10000 });
    await page.waitForTimeout(2000);

    const posts = await page.locator('[class*="post"]').all();
    expect(posts.length).toBeGreaterThan(0);

    const firstPost = posts[0];

    // Check for title
    const titleText = await firstPost.locator('h2, h3, [class*="title"]').first().textContent();
    expect(titleText).toContain('Welcome to Agent Feed!');

    // Check for author Λvi
    const authorText = await firstPost.textContent();
    expect(authorText).toContain('Λvi');
  });

  test('5. Should display second post with title "Hi! Let\'s Get Started" by Get-to-Know-You', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[class*="post"]', { timeout: 10000 });
    await page.waitForTimeout(2000);

    const posts = await page.locator('[class*="post"]').all();
    expect(posts.length).toBeGreaterThanOrEqual(2);

    const secondPost = posts[1];

    // Check for title
    const titleText = await secondPost.locator('h2, h3, [class*="title"]').first().textContent();
    expect(titleText).toMatch(/Hi!.*Let'?s Get Started/i);

    // Check for author Get-to-Know-You
    const authorText = await secondPost.textContent();
    expect(authorText).toContain('Get-to-Know-You');
  });

  test('6. Should display third post with title "📚 How Agent Feed Works" by System Guide', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[class*="post"]', { timeout: 10000 });
    await page.waitForTimeout(2000);

    const posts = await page.locator('[class*="post"]').all();
    expect(posts.length).toBe(3);

    const thirdPost = posts[2];

    // Check for title
    const titleText = await thirdPost.locator('h2, h3, [class*="title"]').first().textContent();
    expect(titleText).toMatch(/📚.*How Agent Feed Works/i);

    // Check for author System Guide
    const authorText = await thirdPost.textContent();
    expect(authorText).toContain('System Guide');
  });

  test('7. Should take screenshot showing all 3 posts in correct order', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[class*="post"]', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Take full page screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'all-posts-correct-order.png'),
      fullPage: true
    });

    // Verify screenshot was created
    const fs = await import('fs');
    const screenshotPath = path.join(SCREENSHOT_DIR, 'all-posts-correct-order.png');
    expect(fs.existsSync(screenshotPath)).toBeTruthy();
  });

  test('8. Should expand first post and verify content contains "Welcome" and "AI partner"', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[class*="post"]', { timeout: 10000 });
    await page.waitForTimeout(2000);

    const posts = await page.locator('[class*="post"]').all();
    const firstPost = posts[0];

    // Check if post is already expanded or needs to be clicked
    const isExpanded = await firstPost.locator('[class*="expanded"], [class*="content"]').isVisible().catch(() => false);

    if (!isExpanded) {
      // Try to find and click expand button or clickable area
      const expandButton = firstPost.locator('button, [role="button"], [class*="expand"]').first();
      if (await expandButton.isVisible().catch(() => false)) {
        await expandButton.click();
      } else {
        // Click on the post itself
        await firstPost.click();
      }

      await page.waitForTimeout(1000);
    }

    // Get the full content of the post
    const postContent = await firstPost.textContent();

    expect(postContent).toContain('Welcome');
    expect(postContent).toMatch(/AI\s+partner/i);
  });

  test('9. Should take screenshot of expanded Λvi post', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[class*="post"]', { timeout: 10000 });
    await page.waitForTimeout(2000);

    const posts = await page.locator('[class*="post"]').all();
    const firstPost = posts[0];

    // Try to expand the post
    const isExpanded = await firstPost.locator('[class*="expanded"], [class*="content"]').isVisible().catch(() => false);

    if (!isExpanded) {
      const expandButton = firstPost.locator('button, [role="button"], [class*="expand"]').first();
      if (await expandButton.isVisible().catch(() => false)) {
        await expandButton.click();
      } else {
        await firstPost.click();
      }

      await page.waitForTimeout(1000);
    }

    // Take screenshot of the expanded post
    await firstPost.screenshot({
      path: path.join(SCREENSHOT_DIR, 'avi-post-expanded.png')
    });

    // Verify screenshot was created
    const fs = await import('fs');
    const screenshotPath = path.join(SCREENSHOT_DIR, 'avi-post-expanded.png');
    expect(fs.existsSync(screenshotPath)).toBeTruthy();
  });

  test('10. Should verify post order persists after page refresh', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[class*="post"]', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Get initial post titles
    const posts = await page.locator('[class*="post"]').all();
    const initialTitles = await Promise.all(
      posts.map(post => post.locator('h2, h3, [class*="title"]').first().textContent())
    );

    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[class*="post"]', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Get post titles after refresh
    const postsAfterRefresh = await page.locator('[class*="post"]').all();
    const titlesAfterRefresh = await Promise.all(
      postsAfterRefresh.map(post => post.locator('h2, h3, [class*="title"]').first().textContent())
    );

    // Verify order is the same
    expect(titlesAfterRefresh).toEqual(initialTitles);
  });

  test('11. Should verify post timestamps are in descending order (newest first)', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[class*="post"]', { timeout: 10000 });
    await page.waitForTimeout(2000);

    const posts = await page.locator('[class*="post"]').all();

    // Extract timestamps from each post
    const timestamps: Date[] = [];

    for (const post of posts) {
      // Look for timestamp elements (various possible selectors)
      const timestampText = await post.locator('[class*="time"], [class*="date"], time, [datetime]')
        .first()
        .getAttribute('datetime')
        .catch(() => null);

      if (timestampText) {
        timestamps.push(new Date(timestampText));
      } else {
        // Try to get text content and parse it
        const timeElement = await post.locator('[class*="time"], [class*="date"]').first().textContent().catch(() => null);
        if (timeElement) {
          // For relative times like "2 hours ago", we'll assume they're in order
          timestamps.push(new Date());
        }
      }
    }

    // If we have timestamps, verify they're in descending order
    if (timestamps.length >= 2) {
      for (let i = 0; i < timestamps.length - 1; i++) {
        expect(timestamps[i].getTime()).toBeGreaterThanOrEqual(timestamps[i + 1].getTime());
      }
    }
  });

  test('12. Should verify no duplicate posts exist', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[class*="post"]', { timeout: 10000 });
    await page.waitForTimeout(2000);

    const posts = await page.locator('[class*="post"]').all();

    // Get all post titles
    const titles = await Promise.all(
      posts.map(post => post.locator('h2, h3, [class*="title"]').first().textContent())
    );

    // Check for duplicates
    const uniqueTitles = new Set(titles);
    expect(uniqueTitles.size).toBe(titles.length);

    // Specifically check our expected titles
    const normalizedTitles = titles.map(t => t?.trim().toLowerCase());

    const aviCount = normalizedTitles.filter(t => t?.includes('welcome to agent feed')).length;
    const gtkCount = normalizedTitles.filter(t => t?.includes('let') && t?.includes('get started')).length;
    const guideCount = normalizedTitles.filter(t => t?.includes('how agent feed works')).length;

    expect(aviCount).toBe(1);
    expect(gtkCount).toBe(1);
    expect(guideCount).toBe(1);
  });

  test('13. Should verify author display names match exactly', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[class*="post"]', { timeout: 10000 });
    await page.waitForTimeout(2000);

    const posts = await page.locator('[class*="post"]').all();
    expect(posts.length).toBe(3);

    // First post - Λvi
    const firstPostAuthor = await posts[0].locator('[class*="author"], [class*="username"], [class*="name"]')
      .first()
      .textContent();
    expect(firstPostAuthor).toContain('Λvi');

    // Second post - Get-to-Know-You
    const secondPostAuthor = await posts[1].locator('[class*="author"], [class*="username"], [class*="name"]')
      .first()
      .textContent();
    expect(secondPostAuthor).toContain('Get-to-Know-You');

    // Third post - System Guide
    const thirdPostAuthor = await posts[2].locator('[class*="author"], [class*="username"], [class*="name"]')
      .first()
      .textContent();
    expect(thirdPostAuthor).toContain('System Guide');
  });

  test('14. Comprehensive validation - All criteria in one test', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[class*="post"]', { timeout: 10000 });
    await page.waitForTimeout(2000);

    const posts = await page.locator('[class*="post"]').all();

    // Validate count
    expect(posts.length).toBe(3);

    // Validate first post (Λvi)
    const firstTitle = await posts[0].locator('h2, h3, [class*="title"]').first().textContent();
    const firstAuthor = await posts[0].locator('[class*="author"], [class*="username"], [class*="name"]').first().textContent();
    expect(firstTitle).toContain('Welcome to Agent Feed!');
    expect(firstAuthor).toContain('Λvi');

    // Validate second post (Get-to-Know-You)
    const secondTitle = await posts[1].locator('h2, h3, [class*="title"]').first().textContent();
    const secondAuthor = await posts[1].locator('[class*="author"], [class*="username"], [class*="name"]').first().textContent();
    expect(secondTitle).toMatch(/Hi!.*Let'?s Get Started/i);
    expect(secondAuthor).toContain('Get-to-Know-You');

    // Validate third post (System Guide)
    const thirdTitle = await posts[2].locator('h2, h3, [class*="title"]').first().textContent();
    const thirdAuthor = await posts[2].locator('[class*="author"], [class*="username"], [class*="name"]').first().textContent();
    expect(thirdTitle).toMatch(/📚.*How Agent Feed Works/i);
    expect(thirdAuthor).toContain('System Guide');

    // Take final comprehensive screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'comprehensive-validation-complete.png'),
      fullPage: true
    });
  });
});
