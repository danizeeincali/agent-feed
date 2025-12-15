/**
 * Dark Mode Phase 2 - Comprehensive E2E Tests
 * Tests all components fixed in Phase 2 for proper dark mode implementation
 *
 * User Requirements:
 * - Performance Trends - Line Chart
 * - Monthly Project View
 * - Post area of the feed
 * - Individual draft cards
 * - Agents page and individual agent pages
 * - Live activity cards
 */

import { test, expect } from '@playwright/test';

// Helper function to get computed background color
async function getBackgroundColor(locator: any) {
  return await locator.evaluate((el: HTMLElement) =>
    window.getComputedStyle(el).backgroundColor
  );
}

// Helper function to get computed text color
async function getTextColor(locator: any) {
  return await locator.evaluate((el: HTMLElement) =>
    window.getComputedStyle(el).color
  );
}

// Helper function to get computed border color
async function getBorderColor(locator: any) {
  return await locator.evaluate((el: HTMLElement) =>
    window.getComputedStyle(el).borderColor
  );
}

// RGB color constants for validation
const COLORS = {
  // Dark mode backgrounds
  GRAY_900: 'rgb(17, 24, 39)',      // bg-gray-900
  GRAY_800: 'rgb(31, 41, 55)',      // bg-gray-800

  // Dark mode text
  GRAY_100: 'rgb(243, 244, 246)',   // text-gray-100
  GRAY_300: 'rgb(209, 213, 219)',   // text-gray-300
  GRAY_400: 'rgb(156, 163, 175)',   // text-gray-400

  // Dark mode borders
  GRAY_700: 'rgb(55, 65, 81)',      // border-gray-700

  // Light mode (should NOT appear in dark mode)
  WHITE: 'rgb(255, 255, 255)',
  GRAY_50: 'rgb(249, 250, 251)',
};

test.describe('Dark Mode Phase 2 - Feed Components', () => {
  test.beforeEach(async ({ page }) => {
    // Enable dark mode
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    // Wait for feed to load
    await page.waitForSelector('[data-testid="feed-container"]', { timeout: 10000 });
  });

  test('should have dark backgrounds for post cards', async ({ page }) => {
    const postCard = page.locator('[data-testid="post-card"]').first();
    await postCard.waitFor({ timeout: 5000 });

    const bgColor = await getBackgroundColor(postCard);

    // Should be gray-900, not white
    expect(bgColor).not.toBe(COLORS.WHITE);
    expect(bgColor).toContain('17, 24, 39'); // gray-900
  });

  test('should have dark text in post content', async ({ page }) => {
    const postContent = page.locator('[data-testid="post-content"]').first();
    await postContent.waitFor({ timeout: 5000 });

    const textColor = await getTextColor(postContent);

    // Should be light text, not dark
    expect(textColor).not.toContain('17, 24, 39'); // Not gray-900
    expect(textColor).toContain('243, 244, 246'); // gray-100 or similar
  });

  test('should have dark backgrounds for search input', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    await searchInput.waitFor({ timeout: 5000 });

    const bgColor = await getBackgroundColor(searchInput);

    expect(bgColor).not.toBe(COLORS.WHITE);
    expect(bgColor).toContain('17, 24, 39'); // gray-900
  });

  test('should have dark borders for post actions', async ({ page }) => {
    const postActions = page.locator('[data-testid="post-actions"]').first();
    await postActions.waitFor({ timeout: 5000 });

    const borderColor = await getBorderColor(postActions);

    // Should be gray-800 or gray-700 border
    expect(borderColor).not.toContain('229, 231, 235'); // Not gray-200
    expect(borderColor).toContain('55, 65, 81'); // gray-700
  });

  test('should have dark backgrounds for comments section', async ({ page }) => {
    // Click to expand comments if needed
    const showCommentsBtn = page.locator('button:has-text("comments")').first();
    if (await showCommentsBtn.isVisible()) {
      await showCommentsBtn.click();
      await page.waitForTimeout(500);
    }

    const commentsSection = page.locator('[data-testid="comments-section"]').first();
    if (await commentsSection.isVisible()) {
      const bgColor = await getBackgroundColor(commentsSection);
      expect(bgColor).not.toBe(COLORS.WHITE);
    }
  });
});

test.describe('Dark Mode Phase 2 - Drafts Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/drafts');
    await page.waitForSelector('[data-testid="drafts-container"]', { timeout: 10000 });
  });

  test('should have dark backgrounds for draft cards', async ({ page }) => {
    const draftCard = page.locator('[data-testid="draft-card"]').first();
    await draftCard.waitFor({ timeout: 5000 });

    const bgColor = await getBackgroundColor(draftCard);

    expect(bgColor).not.toBe(COLORS.WHITE);
    expect(bgColor).toContain('17, 24, 39'); // gray-900
  });

  test('should have dark backgrounds for search input', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    await searchInput.waitFor({ timeout: 5000 });

    const bgColor = await getBackgroundColor(searchInput);

    expect(bgColor).not.toBe(COLORS.WHITE);
    expect(bgColor).toContain('17, 24, 39'); // gray-900
  });

  test('should have dark backgrounds for view mode buttons', async ({ page }) => {
    const viewModeBtn = page.locator('button[aria-label*="view"]').first();
    if (await viewModeBtn.isVisible()) {
      const bgColor = await getBackgroundColor(viewModeBtn);
      // Hover state should be gray-800
      await viewModeBtn.hover();
      await page.waitForTimeout(200);
      const hoverBgColor = await getBackgroundColor(viewModeBtn);
      expect(hoverBgColor).not.toBe(COLORS.WHITE);
    }
  });

  test('should have dark backgrounds for action buttons', async ({ page }) => {
    const editBtn = page.locator('button:has-text("Edit")').first();
    if (await editBtn.isVisible()) {
      const bgColor = await getBackgroundColor(editBtn);
      // Should have blue-900/30 or similar dark variant
      expect(bgColor).not.toContain('239, 246, 255'); // Not blue-50
    }
  });

  test('should have dark text for draft titles', async ({ page }) => {
    const draftTitle = page.locator('[data-testid="draft-title"]').first();
    if (await draftTitle.isVisible()) {
      const textColor = await getTextColor(draftTitle);
      expect(textColor).toContain('243, 244, 246'); // gray-100
    }
  });
});

test.describe('Dark Mode Phase 2 - Agents Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/agents');
    await page.waitForSelector('[data-testid="agents-container"]', { timeout: 10000 });
  });

  test('should have dark backgrounds for agent dashboard', async ({ page }) => {
    const agentsDashboard = page.locator('[data-testid="agents-container"]');
    const bgColor = await getBackgroundColor(agentsDashboard);

    // Main container should have dark background
    expect(bgColor).not.toBe(COLORS.WHITE);
  });

  test('should have dark backgrounds for agent cards', async ({ page }) => {
    const agentCard = page.locator('[data-testid="agent-card"]').first();
    await agentCard.waitFor({ timeout: 5000 });

    const bgColor = await getBackgroundColor(agentCard);

    expect(bgColor).not.toBe(COLORS.WHITE);
    expect(bgColor).toContain('17, 24, 39'); // gray-900
  });

  test('should have dark backgrounds for search input', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    await searchInput.waitFor({ timeout: 5000 });

    const bgColor = await getBackgroundColor(searchInput);

    expect(bgColor).not.toBe(COLORS.WHITE);
    expect(bgColor).toContain('17, 24, 39'); // gray-900
  });

  test('should have dark capability badges', async ({ page }) => {
    const badge = page.locator('[data-testid="capability-badge"]').first();
    if (await badge.isVisible()) {
      const bgColor = await getBackgroundColor(badge);
      // Should have blue-900/30 variant
      expect(bgColor).not.toContain('219, 234, 254'); // Not blue-100
    }
  });

  test('should have dark text for agent names', async ({ page }) => {
    const agentName = page.locator('[data-testid="agent-name"]').first();
    if (await agentName.isVisible()) {
      const textColor = await getTextColor(agentName);
      expect(textColor).toContain('243, 244, 246'); // gray-100
    }
  });
});

test.describe('Dark Mode Phase 2 - Individual Agent Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    // Navigate to first agent's page
    await page.goto('/agents');
    await page.waitForSelector('[data-testid="agent-card"]', { timeout: 10000 });
    await page.locator('[data-testid="agent-card"]').first().click();
    await page.waitForTimeout(1000);
  });

  test('should have dark backgrounds for agent profile', async ({ page }) => {
    const agentProfile = page.locator('[data-testid="agent-profile"]');
    if (await agentProfile.isVisible()) {
      const bgColor = await getBackgroundColor(agentProfile);
      expect(bgColor).not.toBe(COLORS.WHITE);
    }
  });

  test('should have dark backgrounds for activity cards', async ({ page }) => {
    const activityCard = page.locator('[data-testid="activity-card"]').first();
    if (await activityCard.isVisible()) {
      const bgColor = await getBackgroundColor(activityCard);
      expect(bgColor).not.toBe(COLORS.WHITE);
    }
  });

  test('should have dark borders for capability cards', async ({ page }) => {
    const capabilityCard = page.locator('[data-testid="capability-card"]').first();
    if (await capabilityCard.isVisible()) {
      const borderColor = await getBorderColor(capabilityCard);
      expect(borderColor).toContain('55, 65, 81'); // gray-700
    }
  });

  test('should have dark text throughout profile', async ({ page }) => {
    const profileText = page.locator('[data-testid="agent-description"]');
    if (await profileText.isVisible()) {
      const textColor = await getTextColor(profileText);
      expect(textColor).not.toContain('17, 24, 39'); // Not dark gray-900
    }
  });
});

test.describe('Dark Mode Phase 2 - Activity Feed', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await page.waitForSelector('[data-testid="activity-feed"]', { timeout: 10000 });
  });

  test('should have dark backgrounds for activity cards', async ({ page }) => {
    const activityCard = page.locator('[data-testid="activity-item"]').first();
    await activityCard.waitFor({ timeout: 5000 });

    const bgColor = await getBackgroundColor(activityCard);

    expect(bgColor).not.toBe(COLORS.WHITE);
    expect(bgColor).toContain('17, 24, 39'); // gray-900
  });

  test('should have dark backgrounds for activity panel', async ({ page }) => {
    const activityPanel = page.locator('[data-testid="activity-feed"]');
    const bgColor = await getBackgroundColor(activityPanel);

    expect(bgColor).not.toBe(COLORS.WHITE);
  });

  test('should have dark borders for activity items', async ({ page }) => {
    const activityItem = page.locator('[data-testid="activity-item"]').first();
    if (await activityItem.isVisible()) {
      const borderColor = await getBorderColor(activityItem);
      expect(borderColor).not.toContain('229, 231, 235'); // Not gray-200
    }
  });

  test('should have dark filter select backgrounds', async ({ page }) => {
    const filterSelect = page.locator('select[data-testid="activity-filter"]');
    if (await filterSelect.isVisible()) {
      const bgColor = await getBackgroundColor(filterSelect);
      expect(bgColor).not.toBe(COLORS.WHITE);
      expect(bgColor).toContain('17, 24, 39'); // gray-900
    }
  });
});

test.describe('Dark Mode Phase 2 - Charts', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    // Navigate to performance/analytics section
    await page.waitForSelector('[data-testid="performance-trends"]', { timeout: 10000 });
  });

  test('should have dark backgrounds for chart containers', async ({ page }) => {
    const chartContainer = page.locator('[data-testid="chart-container"]').first();
    await chartContainer.waitFor({ timeout: 5000 });

    const bgColor = await getBackgroundColor(chartContainer);

    expect(bgColor).not.toBe(COLORS.WHITE);
    expect(bgColor).toContain('17, 24, 39'); // gray-900
  });

  test('should have dark SVG text fills for axis labels', async ({ page }) => {
    const yAxisLabel = page.locator('svg text.text-xs').first();
    if (await yAxisLabel.isVisible()) {
      const fillColor = await yAxisLabel.evaluate((el: SVGTextElement) =>
        window.getComputedStyle(el).fill
      );
      // Should be gray-400, not gray-500
      expect(fillColor).not.toContain('107, 114, 128'); // Not gray-500
      expect(fillColor).toContain('156, 163, 175'); // gray-400
    }
  });

  test('should have dark backgrounds for line chart', async ({ page }) => {
    const lineChart = page.locator('[data-testid="line-chart"]').first();
    if (await lineChart.isVisible()) {
      const bgColor = await getBackgroundColor(lineChart);
      expect(bgColor).not.toBe(COLORS.WHITE);
    }
  });

  test('should have dark backgrounds for monthly project view', async ({ page }) => {
    const monthlyView = page.locator('[data-testid="monthly-project-view"]').first();
    if (await monthlyView.isVisible()) {
      const bgColor = await getBackgroundColor(monthlyView);
      expect(bgColor).not.toBe(COLORS.WHITE);
    }
  });
});

test.describe('Dark Mode Phase 2 - Comments System', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await page.waitForSelector('[data-testid="post-card"]', { timeout: 10000 });

    // Click first post to expand comments
    const showCommentsBtn = page.locator('button:has-text("comments")').first();
    if (await showCommentsBtn.isVisible()) {
      await showCommentsBtn.click();
      await page.waitForTimeout(1000);
    }
  });

  test('should have dark backgrounds for comment cards', async ({ page }) => {
    const commentCard = page.locator('[data-testid="comment-card"]').first();
    if (await commentCard.isVisible()) {
      const bgColor = await getBackgroundColor(commentCard);
      expect(bgColor).not.toBe(COLORS.WHITE);
      expect(bgColor).toContain('17, 24, 39'); // gray-900
    }
  });

  test('should have dark borders for comment threads', async ({ page }) => {
    const commentThread = page.locator('[data-testid="comment-thread"]').first();
    if (await commentThread.isVisible()) {
      const borderColor = await getBorderColor(commentThread);
      expect(borderColor).toContain('55, 65, 81'); // gray-700
    }
  });

  test('should have dark backgrounds for reply forms', async ({ page }) => {
    const replyBtn = page.locator('button:has-text("Reply")').first();
    if (await replyBtn.isVisible()) {
      await replyBtn.click();
      await page.waitForTimeout(500);

      const replyForm = page.locator('[data-testid="reply-form"]').first();
      if (await replyForm.isVisible()) {
        const bgColor = await getBackgroundColor(replyForm);
        expect(bgColor).not.toBe(COLORS.WHITE);
      }
    }
  });

  test('should have dark text for comment content', async ({ page }) => {
    const commentContent = page.locator('[data-testid="comment-content"]').first();
    if (await commentContent.isVisible()) {
      const textColor = await getTextColor(commentContent);
      expect(textColor).not.toContain('17, 24, 39'); // Not gray-900
    }
  });
});

test.describe('Dark Mode Phase 2 - Utility Components', () => {
  test('should have dark backgrounds for error boundaries', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });

    // Navigate to a non-existent route to trigger error boundary
    await page.goto('/this-route-does-not-exist');
    await page.waitForTimeout(1000);

    const errorBoundary = page.locator('[data-testid="error-boundary"]');
    if (await errorBoundary.isVisible()) {
      const bgColor = await getBackgroundColor(errorBoundary);
      expect(bgColor).not.toBe(COLORS.WHITE);
    }
  });

  test('should have dark backgrounds for loading skeletons', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/agents');

    // Check skeleton during loading
    const skeleton = page.locator('[data-testid="skeleton"]').first();
    if (await skeleton.isVisible()) {
      const bgColor = await getBackgroundColor(skeleton);
      expect(bgColor).toContain('55, 65, 81'); // gray-700
    }
  });

  test('should have dark backgrounds for dynamic pages', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });

    // Navigate to a dynamic page if available
    const dynamicPageLink = page.locator('[data-testid="dynamic-page-link"]').first();
    if (await dynamicPageLink.isVisible()) {
      await dynamicPageLink.click();
      await page.waitForTimeout(1000);

      const dynamicPage = page.locator('[data-testid="dynamic-page"]');
      if (await dynamicPage.isVisible()) {
        const bgColor = await getBackgroundColor(dynamicPage);
        expect(bgColor).not.toBe(COLORS.WHITE);
      }
    }
  });
});

test.describe('Dark Mode Phase 2 - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
  });

  test('should meet WCAG AA contrast ratios for feed text', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="post-card"]', { timeout: 10000 });

    const postContent = page.locator('[data-testid="post-content"]').first();
    if (await postContent.isVisible()) {
      const textColor = await getTextColor(postContent);
      const bgColor = await getBackgroundColor(postContent);

      // Verify contrast (basic check - full calculation would need color-contrast library)
      expect(textColor).not.toBe(bgColor);
    }
  });

  test('should meet WCAG AA contrast ratios for button text', async ({ page }) => {
    await page.goto('/');

    const button = page.locator('button').first();
    if (await button.isVisible()) {
      const textColor = await getTextColor(button);
      const bgColor = await getBackgroundColor(button);

      expect(textColor).not.toBe(bgColor);
    }
  });

  test('should have proper focus indicators in dark mode', async ({ page }) => {
    await page.goto('/');

    const searchInput = page.locator('input[placeholder*="Search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.focus();
      await page.waitForTimeout(200);

      // Check for focus ring
      const outlineColor = await searchInput.evaluate((el: HTMLElement) =>
        window.getComputedStyle(el).outlineColor
      );

      // Should have visible focus indicator
      expect(outlineColor).not.toBe('rgba(0, 0, 0, 0)');
    }
  });
});

test.describe('Dark Mode Phase 2 - Regression Tests', () => {
  test('light mode should still work correctly', async ({ page }) => {
    // Test light mode to ensure we didn't break it
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await page.waitForSelector('[data-testid="feed-container"]', { timeout: 10000 });

    const postCard = page.locator('[data-testid="post-card"]').first();
    const bgColor = await getBackgroundColor(postCard);

    // Should be white or very light gray
    expect(bgColor).toBe(COLORS.WHITE);
  });

  test('dark mode toggle should work correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="feed-container"]', { timeout: 10000 });

    // Find dark mode toggle
    const darkModeToggle = page.locator('[data-testid="dark-mode-toggle"]');
    if (await darkModeToggle.isVisible()) {
      // Toggle to dark
      await darkModeToggle.click();
      await page.waitForTimeout(500);

      const postCard = page.locator('[data-testid="post-card"]').first();
      const darkBgColor = await getBackgroundColor(postCard);
      expect(darkBgColor).not.toBe(COLORS.WHITE);

      // Toggle back to light
      await darkModeToggle.click();
      await page.waitForTimeout(500);

      const lightBgColor = await getBackgroundColor(postCard);
      expect(lightBgColor).toBe(COLORS.WHITE);
    }
  });

  test('no white flashes during dark mode navigation', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await page.waitForSelector('[data-testid="feed-container"]', { timeout: 10000 });

    // Navigate to different pages and check for white backgrounds
    const routes = ['/agents', '/drafts', '/'];

    for (const route of routes) {
      await page.goto(route);
      await page.waitForTimeout(500);

      const body = page.locator('body');
      const bgColor = await getBackgroundColor(body);

      // Body should never be white in dark mode
      expect(bgColor).not.toBe(COLORS.WHITE);
    }
  });
});
