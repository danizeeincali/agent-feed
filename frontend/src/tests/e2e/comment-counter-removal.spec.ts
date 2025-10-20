/**
 * Test Suite 4: Playwright E2E Tests - Comment Counter Removal
 *
 * Purpose: End-to-end validation of comment header behavior in real browser environment
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Test Suite 4: Comment Counter Removal - E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173');

    // Wait for app to be ready
    await page.waitForLoadState('networkidle');
  });

  test.describe('Test 8: User flow from post card to comments', () => {
    test('should show header without counter when clicking into comments', async ({ page }) => {
      // Wait for posts to load
      await page.waitForSelector('[data-testid="post-card"]', { timeout: 10000 });

      // Find and click on a post's comment button
      const commentButton = page.locator('[data-testid="comment-button"]').first();
      await commentButton.waitFor({ state: 'visible' });
      await commentButton.click();

      // Wait for comment system to load
      await page.waitForSelector('h3:has-text("Comments")', { timeout: 5000 });

      // Get the header text
      const header = page.locator('h3').filter({ hasText: 'Comments' }).first();
      const headerText = await header.textContent();

      // Verify header shows "Comments" without counter
      expect(headerText?.trim()).toBe('Comments');

      // Verify it doesn't contain any number pattern
      expect(headerText).not.toMatch(/\(\d+\)/);
      expect(headerText).not.toMatch(/:\s*\d+/);

      // Take screenshot for visual validation
      await page.screenshot({
        path: '/workspaces/agent-feed/frontend/src/tests/screenshots/comment-header-after-removal.png',
        fullPage: false
      });
    });

    test('should maintain header text when navigating between posts', async ({ page }) => {
      // Click on first post's comments
      await page.click('[data-testid="comment-button"]');
      await page.waitForSelector('h3:has-text("Comments")');

      const firstHeaderText = await page.locator('h3').filter({ hasText: 'Comments' }).first().textContent();
      expect(firstHeaderText?.trim()).toBe('Comments');

      // Navigate back
      await page.goBack();
      await page.waitForLoadState('networkidle');

      // Click on another post's comments
      const secondCommentButton = page.locator('[data-testid="comment-button"]').nth(1);
      if (await secondCommentButton.count() > 0) {
        await secondCommentButton.click();
        await page.waitForSelector('h3:has-text("Comments")');

        const secondHeaderText = await page.locator('h3').filter({ hasText: 'Comments' }).first().textContent();
        expect(secondHeaderText?.trim()).toBe('Comments');
      }
    });

    test('should keep header static when scrolling through comments', async ({ page }) => {
      // Open comments
      await page.click('[data-testid="comment-button"]');
      await page.waitForSelector('h3:has-text("Comments")');

      const headerBeforeScroll = await page.locator('h3').filter({ hasText: 'Comments' }).first().textContent();

      // Scroll down the comment section
      await page.evaluate(() => {
        const commentSection = document.querySelector('.comment-threads');
        if (commentSection) {
          commentSection.scrollTop = 100;
        }
      });

      await page.waitForTimeout(500);

      const headerAfterScroll = await page.locator('h3').filter({ hasText: 'Comments' }).first().textContent();

      // Header should remain unchanged
      expect(headerAfterScroll?.trim()).toBe('Comments');
      expect(headerBeforeScroll).toBe(headerAfterScroll);
    });
  });

  test.describe('Test 9: Stats line visible and functional', () => {
    test('should display stats line below header', async ({ page }) => {
      // Open comments
      await page.click('[data-testid="comment-button"]');
      await page.waitForSelector('h3:has-text("Comments")');

      // Check if stats are visible
      const threadsText = await page.locator('text=/\\d+ threads/').first();
      await expect(threadsText).toBeVisible();

      // Get the stats text
      const statsContent = await threadsText.textContent();
      expect(statsContent).toMatch(/\d+ threads/);
    });

    test('should separate header from stats visually', async ({ page }) => {
      await page.click('[data-testid="comment-button"]');
      await page.waitForSelector('h3:has-text("Comments")');

      // Get header element
      const header = page.locator('h3').filter({ hasText: 'Comments' }).first();

      // Get stats element
      const stats = page.locator('text=/\\d+ threads/').first();

      // Both should be visible
      await expect(header).toBeVisible();
      await expect(stats).toBeVisible();

      // Stats should not be inside the header
      const headerBox = await header.boundingBox();
      const statsBox = await stats.boundingBox();

      expect(headerBox).toBeTruthy();
      expect(statsBox).toBeTruthy();

      // Stats should be positioned differently than header
      if (headerBox && statsBox) {
        expect(statsBox.y).not.toBe(headerBox.y);
      }
    });

    test('should show correct stats format', async ({ page }) => {
      await page.click('[data-testid="comment-button"]');
      await page.waitForSelector('h3:has-text("Comments")');

      // Check for expected stat formats
      const statsSection = page.locator('.comment-system-header');

      // Should contain threads count
      await expect(statsSection.locator('text=/\\d+ threads/')).toBeVisible();

      // May contain max depth (if comments have depth)
      const maxDepthVisible = await statsSection.locator('text=/Max depth: \\d+/').count();
      // This is optional, so we just verify it's a valid count
      expect(maxDepthVisible).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Test 10: Add comment interaction', () => {
    test('should not change header when opening comment form', async ({ page }) => {
      await page.click('[data-testid="comment-button"]');
      await page.waitForSelector('h3:has-text("Comments")');

      const headerBefore = await page.locator('h3').filter({ hasText: 'Comments' }).first().textContent();

      // Click "Add Comment" button
      const addButton = page.locator('button:has-text("Add Comment")');
      await addButton.click();

      // Wait for form to appear
      await page.waitForSelector('textarea', { timeout: 3000 });

      const headerAfter = await page.locator('h3').filter({ hasText: 'Comments' }).first().textContent();

      // Header should remain unchanged
      expect(headerAfter?.trim()).toBe('Comments');
      expect(headerBefore).toBe(headerAfter);
    });

    test('should show comment form without affecting header structure', async ({ page }) => {
      await page.click('[data-testid="comment-button"]');
      await page.waitForSelector('h3:has-text("Comments")');

      // Open form
      await page.click('button:has-text("Add Comment")');

      // Verify both header and form are visible
      const header = page.locator('h3').filter({ hasText: 'Comments' }).first();
      const form = page.locator('textarea');

      await expect(header).toBeVisible();
      await expect(form).toBeVisible();

      // Header should still say "Comments"
      const headerText = await header.textContent();
      expect(headerText?.trim()).toBe('Comments');
    });
  });

  test.describe('Test 11: Dark mode consistency', () => {
    test('should maintain header format in dark mode', async ({ page }) => {
      // Enable dark mode (assuming there's a dark mode toggle)
      await page.click('[data-testid="comment-button"]');
      await page.waitForSelector('h3:has-text("Comments")');

      // Add dark class to body (simulate dark mode)
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });

      await page.waitForTimeout(500);

      // Header should still say "Comments"
      const header = page.locator('h3').filter({ hasText: 'Comments' }).first();
      const headerText = await header.textContent();

      expect(headerText?.trim()).toBe('Comments');

      // Take dark mode screenshot
      await page.screenshot({
        path: '/workspaces/agent-feed/frontend/src/tests/screenshots/comment-header-dark-mode.png',
        fullPage: false
      });
    });

    test('should render stats in dark mode correctly', async ({ page }) => {
      await page.click('[data-testid="comment-button"]');
      await page.waitForSelector('h3:has-text("Comments")');

      // Enable dark mode
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });

      // Stats should be visible in dark mode
      const stats = page.locator('text=/\\d+ threads/').first();
      await expect(stats).toBeVisible();

      // Header should be separate from stats
      const header = page.locator('h3').filter({ hasText: 'Comments' }).first();
      expect(await header.textContent()).toBe('Comments');
    });
  });

  test.describe('Test 12: Mobile responsiveness', () => {
    test('should display header correctly on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await page.click('[data-testid="comment-button"]');
      await page.waitForSelector('h3:has-text("Comments")');

      const header = page.locator('h3').filter({ hasText: 'Comments' }).first();
      const headerText = await header.textContent();

      // Header should still be "Comments" on mobile
      expect(headerText?.trim()).toBe('Comments');

      // Take mobile screenshot
      await page.screenshot({
        path: '/workspaces/agent-feed/frontend/src/tests/screenshots/comment-header-mobile.png',
        fullPage: false
      });
    });

    test('should show stats line on mobile without counter in header', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await page.click('[data-testid="comment-button"]');
      await page.waitForSelector('h3:has-text("Comments")');

      // Header should be simple
      const header = page.locator('h3').filter({ hasText: 'Comments' }).first();
      expect(await header.textContent()).toBe('Comments');

      // Stats should still be visible
      await expect(page.locator('text=/\\d+ threads/')).toBeVisible();
    });
  });
});
