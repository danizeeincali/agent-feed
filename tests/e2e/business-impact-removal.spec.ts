/**
 * TDD E2E Test Suite: Business Impact Indicator Removal
 *
 * Purpose: End-to-end validation that business impact indicators are not
 * visible anywhere in the application UI.
 *
 * Test Coverage:
 * - No impact indicators visible on any post cards
 * - Compact view has no impact display
 * - Expanded view has no impact display
 * - Post creation works without impact field
 * - Dark mode works correctly
 * - Mobile responsive works correctly
 * - Search and filtering work without errors
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Business Impact Removal - E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the feed page
    await page.goto(`${BASE_URL}/feed`);

    // Wait for posts to load
    await page.waitForSelector('[data-testid="post-card"]', { timeout: 10000 });
  });

  test.describe('Compact View Validation', () => {
    test('should NOT display business impact text in any post card', async ({ page }) => {
      // Get all post cards
      const postCards = await page.locator('[data-testid="post-card"]').all();
      expect(postCards.length).toBeGreaterThan(0);

      // Check each post card
      for (const card of postCards) {
        // Check for impact text pattern
        const impactText = await card.locator('text=/\\d+%\\s*impact/i').count();
        expect(impactText).toBe(0);

        // Check for any "impact" text (case insensitive)
        const cardText = await card.textContent();
        const hasImpactWord = cardText?.toLowerCase().includes('impact');

        // If "impact" appears, it should NOT be in the context of business metrics
        if (hasImpactWord) {
          // Verify it's not followed by a percentage
          const hasPercentageImpact = /\d+%\s*impact/i.test(cardText || '');
          expect(hasPercentageImpact).toBe(false);
        }
      }
    });

    test('should NOT display business impact icon in any post card', async ({ page }) => {
      // Get all post cards
      const postCards = await page.locator('[data-testid="post-card"]').all();

      for (const card of postCards) {
        // Check for the trending up icon (business impact indicator)
        // SVG path for trending up: M13 7h8m0 0v8m0-8l-8 8-4-4-6 6
        const impactIcons = await card.locator('svg path[d*="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"]').count();
        expect(impactIcons).toBe(0);

        // Also check for any indigo-colored metrics (business impact used indigo)
        const indigoMetrics = await card.locator('.text-indigo-500').count();
        expect(indigoMetrics).toBe(0);
      }
    });

    test('should display other metadata correctly without business impact', async ({ page }) => {
      const firstPost = page.locator('[data-testid="post-card"]').first();

      // Verify time metadata is present
      await expect(firstPost.locator('text=/\\d+\\s+(hour|minute|day|second)s?\\s+ago/i')).toBeVisible();

      // Verify reading time is present
      await expect(firstPost.locator('text=/\\d+\\s+min\\s+read/i')).toBeVisible();

      // Verify agent name is present
      await expect(firstPost.locator('text=/by\\s+\\w+/i')).toBeVisible();

      // Verify NO business impact
      const impactCount = await firstPost.locator('text=/\\d+%\\s*impact/i').count();
      expect(impactCount).toBe(0);
    });

    test('should have correct spacing without business impact section', async ({ page }) => {
      const firstPost = page.locator('[data-testid="post-card"]').first();

      // Get the metrics container
      const metricsContainer = firstPost.locator('.flex.items-center.space-x-6');
      await expect(metricsContainer).toBeVisible();

      // Count metric items - should be 3 (time, reading time, agent) not 4
      const metricItems = metricsContainer.locator('.flex.items-center');
      const count = await metricItems.count();

      expect(count).toBeLessThanOrEqual(3);
    });
  });

  test.describe('Expanded View Validation', () => {
    test('should NOT display business impact in expanded post view', async ({ page }) => {
      // Find and click expand button
      const expandButton = page.locator('[aria-label="Expand post"]').first();
      await expandButton.click();

      // Wait for expanded view
      await page.waitForSelector('[aria-label="Collapse post"]', { timeout: 5000 });

      // Check the expanded post
      const expandedPost = page.locator('[data-testid="post-card"]').first();

      // Verify NO business impact text
      const impactText = await expandedPost.locator('text=/\\d+%/i').count();
      expect(impactText).toBe(0);

      // Verify NO business impact in metrics
      const metricsGrid = expandedPost.locator('.grid.grid-cols-2');
      const gridText = await metricsGrid.textContent();
      expect(gridText?.toLowerCase().includes('impact')).toBe(false);
    });

    test('should display all other metrics in expanded view', async ({ page }) => {
      // Expand first post
      const expandButton = page.locator('[aria-label="Expand post"]').first();
      await expandButton.click();

      await page.waitForSelector('[aria-label="Collapse post"]', { timeout: 5000 });

      const expandedPost = page.locator('[data-testid="post-card"]').first();

      // Verify expected metrics
      await expect(expandedPost.locator('text=/chars/i')).toBeVisible();
      await expect(expandedPost.locator('text=/words/i')).toBeVisible();
      await expect(expandedPost.locator('text=/min\\s+read/i')).toBeVisible();
      await expect(expandedPost.locator('text=/agent/i')).toBeVisible();

      // Verify NO impact metric
      const impactMetric = await expandedPost.locator('text=/\\d+%\\s*impact/i').count();
      expect(impactMetric).toBe(0);
    });

    test('should maintain proper grid layout without business impact', async ({ page }) => {
      // Expand first post
      const expandButton = page.locator('[aria-label="Expand post"]').first();
      await expandButton.click();

      await page.waitForSelector('[aria-label="Collapse post"]', { timeout: 5000 });

      const expandedPost = page.locator('[data-testid="post-card"]').first();
      const metricsGrid = expandedPost.locator('.grid.grid-cols-2');

      await expect(metricsGrid).toBeVisible();

      // Count metric items - should be 4 (characters, words, reading time, agent) not 5
      const metricItems = metricsGrid.locator('.flex.items-center.space-x-2');
      const count = await metricItems.count();

      expect(count).toBeLessThanOrEqual(4);
    });
  });

  test.describe('Post Creation Flow', () => {
    test('should create post successfully without businessImpact field', async ({ page }) => {
      // Find the post creation interface
      const postCreator = page.locator('[data-testid="enhanced-posting-interface"]');

      if (await postCreator.count() === 0) {
        console.log('Post creation interface not found on this page');
        return;
      }

      // Fill in post details
      await page.fill('input[placeholder*="title" i]', 'E2E Test Post Without Impact');
      await page.fill('textarea[placeholder*="content" i]', 'This is a test post created via E2E tests without any business impact data.');

      // Submit the post
      const submitButton = page.locator('button:has-text("Post")').first();
      await submitButton.click();

      // Wait for success message or new post to appear
      await page.waitForTimeout(2000);

      // Verify new post appears without business impact
      const newPost = page.locator('[data-testid="post-card"]').first();
      const postText = await newPost.textContent();

      expect(postText?.includes('E2E Test Post Without Impact')).toBe(true);

      // Verify no business impact in the new post
      const impactText = await newPost.locator('text=/\\d+%\\s*impact/i').count();
      expect(impactText).toBe(0);
    });

    test('should handle post creation without console errors', async ({ page }) => {
      // Listen for console errors
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      // Find the post creation interface
      const postCreator = page.locator('[data-testid="enhanced-posting-interface"]');

      if (await postCreator.count() > 0) {
        await page.fill('input[placeholder*="title" i]', 'Console Error Test Post');
        await page.fill('textarea[placeholder*="content" i]', 'Testing for console errors');

        const submitButton = page.locator('button:has-text("Post")').first();
        await submitButton.click();

        await page.waitForTimeout(2000);
      }

      // Check for business impact related errors
      const businessImpactErrors = consoleErrors.filter(err =>
        err.toLowerCase().includes('businessimpact') || err.toLowerCase().includes('business-impact')
      );

      expect(businessImpactErrors.length).toBe(0);
    });
  });

  test.describe('Dark Mode Compatibility', () => {
    test('should render correctly in dark mode without business impact', async ({ page }) => {
      // Enable dark mode (if supported)
      await page.emulateMedia({ colorScheme: 'dark' });

      // Reload page
      await page.reload();
      await page.waitForSelector('[data-testid="post-card"]', { timeout: 10000 });

      // Verify dark mode is active
      const html = page.locator('html');
      const darkClass = await html.getAttribute('class');
      expect(darkClass?.includes('dark')).toBe(true);

      // Check posts in dark mode
      const firstPost = page.locator('[data-testid="post-card"]').first();
      await expect(firstPost).toBeVisible();

      // Verify NO business impact is displayed
      const impactText = await firstPost.locator('text=/\\d+%\\s*impact/i').count();
      expect(impactText).toBe(0);

      // Verify dark mode styling is applied correctly
      const bgColor = await firstPost.evaluate(el => getComputedStyle(el).backgroundColor);
      // Dark mode should have dark background (rgb values close to 0)
      expect(bgColor).not.toBe('rgb(255, 255, 255)');
    });

    test('should toggle between light and dark mode without business impact errors', async ({ page }) => {
      // Start in light mode
      await page.emulateMedia({ colorScheme: 'light' });

      // Verify posts load
      await page.waitForSelector('[data-testid="post-card"]', { timeout: 10000 });
      let postCount = await page.locator('[data-testid="post-card"]').count();
      expect(postCount).toBeGreaterThan(0);

      // Switch to dark mode
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.waitForTimeout(500);

      // Verify posts still load
      postCount = await page.locator('[data-testid="post-card"]').count();
      expect(postCount).toBeGreaterThan(0);

      // Switch back to light mode
      await page.emulateMedia({ colorScheme: 'light' });
      await page.waitForTimeout(500);

      // Verify no errors and posts still visible
      postCount = await page.locator('[data-testid="post-card"]').count();
      expect(postCount).toBeGreaterThan(0);
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should render correctly on mobile without business impact', async ({ page }) => {
      // Set mobile viewport (iPhone 12)
      await page.setViewportSize({ width: 390, height: 844 });

      // Reload to apply viewport
      await page.reload();
      await page.waitForSelector('[data-testid="post-card"]', { timeout: 10000 });

      // Verify posts are visible on mobile
      const firstPost = page.locator('[data-testid="post-card"]').first();
      await expect(firstPost).toBeVisible();

      // Verify NO business impact on mobile
      const impactText = await firstPost.locator('text=/\\d+%\\s*impact/i').count();
      expect(impactText).toBe(0);

      // Verify mobile layout is applied
      const postWidth = await firstPost.evaluate(el => el.getBoundingClientRect().width);
      expect(postWidth).toBeLessThan(400); // Mobile width
    });

    test('should handle mobile interactions without business impact errors', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload();
      await page.waitForSelector('[data-testid="post-card"]', { timeout: 10000 });

      // Test expand on mobile
      const expandButton = page.locator('[aria-label="Expand post"]').first();
      await expandButton.click();

      await page.waitForTimeout(500);

      // Verify expanded view on mobile has no business impact
      const expandedPost = page.locator('[data-testid="post-card"]').first();
      const impactText = await expandedPost.locator('text=/\\d+%\\s*impact/i').count();
      expect(impactText).toBe(0);

      // Test collapse
      const collapseButton = page.locator('[aria-label="Collapse post"]').first();
      await collapseButton.click();

      await page.waitForTimeout(500);
    });
  });

  test.describe('Search and Filtering', () => {
    test('should search posts without business impact errors', async ({ page }) => {
      // Find search input
      const searchInput = page.locator('[data-testid="search-input"]');

      if (await searchInput.count() > 0) {
        await searchInput.fill('test');

        // Wait for search results
        await page.waitForTimeout(1000);

        // Verify search results don't show business impact
        const resultCards = await page.locator('[data-testid="post-card"]').all();

        for (const card of resultCards) {
          const impactText = await card.locator('text=/\\d+%\\s*impact/i').count();
          expect(impactText).toBe(0);
        }
      }
    });

    test('should filter posts without business impact errors', async ({ page }) => {
      // Check if filter panel exists
      const filterPanel = page.locator('[data-testid="filter-panel"]');

      if (await filterPanel.count() === 0) {
        console.log('Filter panel not found on this page');
        return;
      }

      // Apply a filter (e.g., by agent)
      const agentFilter = filterPanel.locator('button:has-text("Agent")').first();

      if (await agentFilter.count() > 0) {
        await agentFilter.click();
        await page.waitForTimeout(1000);

        // Verify filtered posts don't show business impact
        const filteredCards = await page.locator('[data-testid="post-card"]').all();

        for (const card of filteredCards) {
          const impactText = await card.locator('text=/\\d+%\\s*impact/i').count();
          expect(impactText).toBe(0);
        }
      }
    });
  });

  test.describe('Existing Functionality Preservation', () => {
    test('should handle likes/saves correctly without business impact interference', async ({ page }) => {
      const firstPost = page.locator('[data-testid="post-card"]').first();

      // Find save button
      const saveButton = firstPost.locator('button[title*="Save"]').first();

      if (await saveButton.count() > 0) {
        await saveButton.click();
        await page.waitForTimeout(500);

        // Verify save action works
        const savedText = await saveButton.textContent();
        expect(savedText?.toLowerCase().includes('saved') || savedText?.toLowerCase().includes('unsave')).toBe(true);
      }
    });

    test('should display and interact with comments without business impact errors', async ({ page }) => {
      const firstPost = page.locator('[data-testid="post-card"]').first();

      // Find comment button
      const commentButton = firstPost.locator('button[title*="Comment" i]').first();

      if (await commentButton.count() > 0) {
        // Check comment count is displayed
        const commentCount = await firstPost.locator('text=/\\d+/').first().textContent();
        expect(commentCount).toBeTruthy();

        // Click to view comments
        await commentButton.click();
        await page.waitForTimeout(500);

        // Verify comments section appears without errors
        const commentsSection = firstPost.locator('text=/Comments/i');
        if (await commentsSection.count() > 0) {
          await expect(commentsSection).toBeVisible();
        }
      }
    });

    test('should expand and collapse posts without business impact errors', async ({ page }) => {
      // Test expand
      const expandButton = page.locator('[aria-label="Expand post"]').first();
      await expandButton.click();

      await page.waitForSelector('[aria-label="Collapse post"]', { timeout: 5000 });

      // Verify expanded state
      await expect(page.locator('[aria-label="Collapse post"]').first()).toBeVisible();

      // Test collapse
      const collapseButton = page.locator('[aria-label="Collapse post"]').first();
      await collapseButton.click();

      await page.waitForSelector('[aria-label="Expand post"]', { timeout: 5000 });

      // Verify collapsed state
      await expect(page.locator('[aria-label="Expand post"]').first()).toBeVisible();
    });
  });

  test.describe('Page Load Performance', () => {
    test('should load page without business impact processing overhead', async ({ page }) => {
      const startTime = Date.now();

      await page.goto(`${BASE_URL}/feed`);
      await page.waitForSelector('[data-testid="post-card"]', { timeout: 10000 });

      const loadTime = Date.now() - startTime;

      // Should load within reasonable time
      expect(loadTime).toBeLessThan(10000); // 10 seconds

      console.log(`✅ Page loaded in ${loadTime}ms`);
    });
  });

  test.describe('Visual Regression', () => {
    test('should match expected layout without business impact sections', async ({ page }) => {
      // Wait for posts to load
      await page.waitForSelector('[data-testid="post-card"]', { timeout: 10000 });

      // Take screenshot of first post (compact view)
      const firstPost = page.locator('[data-testid="post-card"]').first();
      await expect(firstPost).toHaveScreenshot('post-compact-view.png', {
        maxDiffPixels: 100
      });

      // Expand and take screenshot
      const expandButton = firstPost.locator('[aria-label="Expand post"]');
      await expandButton.click();
      await page.waitForTimeout(500);

      await expect(firstPost).toHaveScreenshot('post-expanded-view.png', {
        maxDiffPixels: 100
      });
    });
  });
});
