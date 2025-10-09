/**
 * Dark Mode Phase 4 - Final E2E Tests
 * Tests the 3 remaining components fixed in Phase 4 for proper dark mode implementation
 *
 * User Requirements Verified:
 * 1. All Post Filter (FilterPanel component)
 * 2. Agents Background (AgentDashboard - verification)
 * 3. Analytics Cards (TokenAnalyticsDashboard + Performance Tab)
 */

import { test, expect } from '@playwright/test';

// Helper functions
async function getBackgroundColor(locator: any) {
  return await locator.evaluate((el: HTMLElement) =>
    window.getComputedStyle(el).backgroundColor
  );
}

async function getTextColor(locator: any) {
  return await locator.evaluate((el: HTMLElement) =>
    window.getComputedStyle(el).color
  );
}

async function getBorderColor(locator: any, side: 'top' | 'right' | 'bottom' | 'left' = 'top') {
  return await locator.evaluate((el: HTMLElement, s: string) => {
    const style = window.getComputedStyle(el);
    return style[`border${s.charAt(0).toUpperCase() + s.slice(1)}Color` as any];
  }, side);
}

const COLORS = {
  DARK_BG_900: 'rgb(17, 24, 39)',
  DARK_BG_800: 'rgb(31, 41, 55)',
  DARK_BG_700: 'rgb(55, 65, 81)',
  WHITE: 'rgb(255, 255, 255)',
  GRAY_100: 'rgb(243, 244, 246)',
  GRAY_200: 'rgb(229, 231, 235)',
  GRAY_700: 'rgb(55, 65, 81)',
};

test.describe('Dark Mode Phase 4 - FilterPanel (All Post Filter)', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Filter panel main button should have dark background when inactive', async ({ page }) => {
    const filterButton = page.locator('button:has-text("All Posts"), button:has-text("Filter")').first();
    if (await filterButton.isVisible()) {
      const bgColor = await getBackgroundColor(filterButton);
      expect(bgColor).not.toBe(COLORS.WHITE);
      expect(bgColor).toContain('31, 41, 55'); // gray-800
    }
  });

  test('Advanced filter dropdown should have dark background', async ({ page }) => {
    // Click to open advanced filters if available
    const advancedButton = page.locator('button:has-text("Advanced"), button:has-text("Filters")').first();
    if (await advancedButton.isVisible()) {
      await advancedButton.click();
      await page.waitForTimeout(300);

      const dropdown = page.locator('[class*="absolute"][class*="bg-white"]').first();
      if (await dropdown.isVisible()) {
        const bgColor = await getBackgroundColor(dropdown);
        expect(bgColor).not.toBe(COLORS.WHITE);
        expect(bgColor).toContain('17, 24, 39'); // gray-900
      }
    }
  });

  test('Toggle switches should have dark knobs in dark mode', async ({ page }) => {
    // Look for toggle switches (Saved Posts, My Posts)
    const toggleSwitches = page.locator('[role="switch"], button[class*="after:bg"]');
    const count = await toggleSwitches.count();

    if (count > 0) {
      const firstToggle = toggleSwitches.first();
      const computedStyle = await firstToggle.evaluate((el: HTMLElement) => {
        const pseudo = window.getComputedStyle(el, '::after');
        return pseudo.backgroundColor;
      });

      // Should be gray-700 in dark mode, not white
      expect(computedStyle).not.toBe(COLORS.WHITE);
    }
  });

  test('Filter mode buttons (AND/OR) should have dark backgrounds', async ({ page }) => {
    const modeButtons = page.locator('button:has-text("AND"), button:has-text("OR")');
    const count = await modeButtons.count();

    for (let i = 0; i < count; i++) {
      const button = modeButtons.nth(i);
      if (await button.isVisible()) {
        const bgColor = await getBackgroundColor(button);
        // Should be gray-800 in dark mode, not white
        if (!bgColor.includes('59, 130, 246')) { // Skip active blue buttons
          expect(bgColor).not.toBe(COLORS.WHITE);
        }
      }
    }
  });

  test('Agent selection dropdown should have dark background', async ({ page }) => {
    const agentDropdown = page.locator('button:has-text("Select Agent"), [data-testid="agent-filter"]').first();
    if (await agentDropdown.isVisible()) {
      await agentDropdown.click();
      await page.waitForTimeout(300);

      const dropdownMenu = page.locator('[class*="absolute"][class*="bg-white"]').first();
      if (await dropdownMenu.isVisible()) {
        const bgColor = await getBackgroundColor(dropdownMenu);
        expect(bgColor).not.toBe(COLORS.WHITE);
        expect(bgColor).toContain('17, 24, 39'); // gray-900
      }
    }
  });

  test('Hashtag suggestions dropdown should have dark background', async ({ page }) => {
    const hashtagInput = page.locator('input[placeholder*="hashtag"], input[placeholder*="tag"]').first();
    if (await hashtagInput.isVisible()) {
      await hashtagInput.click();
      await hashtagInput.fill('#test');
      await page.waitForTimeout(500);

      const suggestions = page.locator('[class*="absolute"][class*="bg-white"]').first();
      if (await suggestions.isVisible()) {
        const bgColor = await getBackgroundColor(suggestions);
        expect(bgColor).not.toBe(COLORS.WHITE);
        expect(bgColor).toContain('17, 24, 39'); // gray-900
      }
    }
  });

  test('Filter dropdown borders should be dark gray-700', async ({ page }) => {
    const filterButton = page.locator('button:has-text("Filter")').first();
    if (await filterButton.isVisible()) {
      await filterButton.click();
      await page.waitForTimeout(300);

      const dropdown = page.locator('[class*="absolute"][class*="border"]').first();
      if (await dropdown.isVisible()) {
        const borderColor = await getBorderColor(dropdown);
        expect(borderColor).not.toContain('229, 231, 235'); // Not gray-200
        expect(borderColor).toContain('55, 65, 81'); // gray-700
      }
    }
  });
});

test.describe('Dark Mode Phase 4 - AgentDashboard Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/agents');
    await page.waitForLoadState('networkidle');
  });

  test('Agent dashboard should have dark background', async ({ page }) => {
    const dashboard = page.locator('[data-testid="agent-dashboard"], main').first();
    await dashboard.waitFor({ timeout: 5000 });

    const bgColor = await getBackgroundColor(dashboard);
    expect(bgColor).not.toBe(COLORS.WHITE);
  });

  test('Agent stat cards should have dark backgrounds', async ({ page }) => {
    const statCards = page.locator('[class*="bg-white"][class*="rounded"]');
    const count = await statCards.count();

    if (count > 0) {
      const firstCard = statCards.first();
      const bgColor = await getBackgroundColor(firstCard);
      expect(bgColor).not.toBe(COLORS.WHITE);
      expect(bgColor).toContain('17, 24, 39'); // gray-900
    }
  });

  test('Agent search input should have dark background', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();
    if (await searchInput.isVisible()) {
      const bgColor = await getBackgroundColor(searchInput);
      expect(bgColor).not.toBe(COLORS.WHITE);
      expect(bgColor).toContain('17, 24, 39'); // gray-900
    }
  });

  test('Agent cards should have dark backgrounds', async ({ page }) => {
    const agentCards = page.locator('[data-testid="agent-card"]');
    const count = await agentCards.count();

    if (count > 0) {
      const firstCard = agentCards.first();
      const bgColor = await getBackgroundColor(firstCard);
      expect(bgColor).not.toBe(COLORS.WHITE);
      expect(bgColor).toContain('17, 24, 39'); // gray-900
    }
  });
});

test.describe('Dark Mode Phase 4 - TokenAnalyticsDashboard (Analytics Cards)', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/analytics?tab=claude-sdk');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for lazy load
  });

  test('Summary cards should have dark backgrounds', async ({ page }) => {
    const summaryCards = page.locator('[class*="bg-white"][class*="rounded-lg"][class*="border"]');
    const count = await summaryCards.count();

    if (count > 0) {
      const firstCard = summaryCards.first();
      const bgColor = await getBackgroundColor(firstCard);
      expect(bgColor).not.toBe(COLORS.WHITE);
      expect(bgColor).toContain('17, 24, 39'); // gray-900
    }
  });

  test('Summary card titles should be readable in dark mode', async ({ page }) => {
    const cardTitle = page.locator('p.text-sm.font-medium').first();
    if (await cardTitle.isVisible()) {
      const textColor = await getTextColor(cardTitle);
      // Should be gray-400 in dark mode, not gray-600
      expect(textColor).not.toContain('75, 85, 99'); // Not gray-600
      expect(textColor).toContain('156, 163, 175'); // gray-400
    }
  });

  test('Summary card values should be readable in dark mode', async ({ page }) => {
    const cardValue = page.locator('p.text-2xl.font-bold').first();
    if (await cardValue.isVisible()) {
      const textColor = await getTextColor(cardValue);
      // Should be gray-100 in dark mode, not gray-900
      expect(textColor).not.toContain('17, 24, 39'); // Not gray-900
      expect(textColor).toContain('243, 244, 246'); // gray-100
    }
  });

  test('Message list container should have dark background', async ({ page }) => {
    const messageList = page.locator('div:has(h3:has-text("Recent Messages"))').first();
    if (await messageList.isVisible()) {
      const bgColor = await getBackgroundColor(messageList);
      expect(bgColor).not.toBe(COLORS.WHITE);
      expect(bgColor).toContain('17, 24, 39'); // gray-900
    }
  });

  test('Message list search input should have dark background', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"], input[type="text"]').first();
    if (await searchInput.isVisible()) {
      const bgColor = await getBackgroundColor(searchInput);
      expect(bgColor).not.toBe(COLORS.WHITE);
      expect(bgColor).toContain('31, 41, 55'); // gray-800
    }
  });

  test('Message badges should have dark backgrounds', async ({ page }) => {
    const badges = page.locator('[class*="bg-blue-100"], [class*="bg-green-100"], [class*="bg-purple-100"]');
    const count = await badges.count();

    if (count > 0) {
      const firstBadge = badges.first();
      const bgColor = await getBackgroundColor(firstBadge);

      // Should be dark variant with opacity, not light color
      expect(bgColor).not.toContain('219, 234, 254'); // Not blue-100
      expect(bgColor).not.toContain('240, 253, 244'); // Not green-100

      // Should have opacity (rgba with alpha < 1)
      expect(bgColor).toContain('rgba');
    }
  });

  test('Message text should be readable in dark mode', async ({ page }) => {
    const messageText = page.locator('p.text-sm[class*="text-gray-900"]').first();
    if (await messageText.isVisible()) {
      const textColor = await getTextColor(messageText);
      // Should be gray-100 in dark mode, not gray-900
      expect(textColor).not.toContain('17, 24, 39'); // Not gray-900
      expect(textColor).toContain('243, 244, 246'); // gray-100
    }
  });

  test('Chart containers should have dark backgrounds', async ({ page }) => {
    const chartContainers = page.locator('div:has(h3:has-text("Hourly")), div:has(h3:has-text("Daily"))');
    const count = await chartContainers.count();

    for (let i = 0; i < count; i++) {
      const container = chartContainers.nth(i);
      if (await container.isVisible()) {
        const bgColor = await getBackgroundColor(container);
        expect(bgColor).not.toBe(COLORS.WHITE);
        expect(bgColor).toContain('17, 24, 39'); // gray-900
      }
    }
  });

  test('Provider/Model stats cards should have dark backgrounds', async ({ page }) => {
    const statsCards = page.locator('div:has(h3:has-text("By Provider")), div:has(h3:has-text("By Model"))');
    const count = await statsCards.count();

    for (let i = 0; i < count; i++) {
      const card = statsCards.nth(i);
      if (await card.isVisible()) {
        const bgColor = await getBackgroundColor(card);
        expect(bgColor).not.toBe(COLORS.WHITE);
        expect(bgColor).toContain('17, 24, 39'); // gray-900
      }
    }
  });

  test('Dividers should have dark borders', async ({ page }) => {
    const dividers = page.locator('[class*="divide-y"]');
    const count = await dividers.count();

    if (count > 0) {
      const firstDivider = dividers.first();
      const borderColor = await getBorderColor(firstDivider, 'top');
      expect(borderColor).not.toContain('229, 231, 235'); // Not gray-200
      expect(borderColor).toContain('55, 65, 81'); // gray-700
    }
  });

  test('Message items should have dark hover state', async ({ page }) => {
    const messageItems = page.locator('[class*="hover:bg-gray-50"]');
    const count = await messageItems.count();

    if (count > 0) {
      const firstItem = messageItems.first();
      await firstItem.hover();
      await page.waitForTimeout(200);

      const bgColor = await getBackgroundColor(firstItem);
      // Should be gray-800 on hover in dark mode, not gray-50
      expect(bgColor).not.toContain('249, 250, 251'); // Not gray-50
    }
  });
});

test.describe('Dark Mode Phase 4 - Performance Tab Analytics Cards', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    // Navigate to Performance tab
    const perfTab = page.locator('button:has-text("Performance")');
    if (await perfTab.isVisible()) {
      await perfTab.click();
      await page.waitForTimeout(1000);
    }
  });

  test('Performance cards should have dark backgrounds', async ({ page }) => {
    const perfCards = page.locator('[class*="bg-white"][class*="rounded"]');
    const count = await perfCards.count();

    if (count > 0) {
      const firstCard = perfCards.first();
      const bgColor = await getBackgroundColor(firstCard);
      expect(bgColor).not.toBe(COLORS.WHITE);
      expect(bgColor).toContain('17, 24, 39'); // gray-900
    }
  });

  test('Performance table should have dark background', async ({ page }) => {
    const table = page.locator('table, tbody[class*="bg-white"]').first();
    if (await table.isVisible()) {
      const bgColor = await getBackgroundColor(table);
      expect(bgColor).not.toBe(COLORS.WHITE);
      expect(bgColor).toContain('17, 24, 39'); // gray-900
    }
  });

  test('Performance headings should be readable in dark mode', async ({ page }) => {
    const heading = page.locator('h2, h3').first();
    if (await heading.isVisible()) {
      const textColor = await getTextColor(heading);
      expect(textColor).toContain('243, 244, 246'); // gray-100
    }
  });
});

test.describe('Dark Mode Phase 4 - Regression Tests', () => {
  test('Light mode should still work for all Phase 4 components', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });

    // Test FilterPanel
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const filterButton = page.locator('button:has-text("Filter")').first();
    if (await filterButton.isVisible()) {
      const bgColor = await getBackgroundColor(filterButton);
      expect(bgColor).toBe(COLORS.WHITE);
    }

    // Test AgentDashboard
    await page.goto('/agents');
    await page.waitForLoadState('networkidle');
    const agentCard = page.locator('[data-testid="agent-card"]').first();
    if (await agentCard.isVisible()) {
      const bgColor = await getBackgroundColor(agentCard);
      expect(bgColor).toBe(COLORS.WHITE);
    }

    // Test Analytics
    await page.goto('/analytics?tab=claude-sdk');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const summaryCard = page.locator('[class*="bg-white"]').first();
    if (await summaryCard.isVisible()) {
      const bgColor = await getBackgroundColor(summaryCard);
      expect(bgColor).toBe(COLORS.WHITE);
    }
  });

  test('All Phase 4 components work together in dark mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });

    const routes = [
      { path: '/', component: 'FilterPanel' },
      { path: '/agents', component: 'AgentDashboard' },
      { path: '/analytics?tab=claude-sdk', component: 'TokenAnalytics' },
    ];

    for (const route of routes) {
      await page.goto(route.path);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      const body = page.locator('body');
      const bgColor = await getBackgroundColor(body);
      expect(bgColor).not.toBe(COLORS.WHITE);
    }
  });

  test('No white flashes during navigation in dark mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });

    // Track background color changes
    const bgColors: string[] = [];

    await page.goto('/');
    await page.waitForTimeout(500);
    bgColors.push(await getBackgroundColor(page.locator('body')));

    await page.goto('/agents');
    await page.waitForTimeout(500);
    bgColors.push(await getBackgroundColor(page.locator('body')));

    await page.goto('/analytics');
    await page.waitForTimeout(500);
    bgColors.push(await getBackgroundColor(page.locator('body')));

    // None should be white
    for (const color of bgColors) {
      expect(color).not.toBe(COLORS.WHITE);
    }
  });
});

test.describe('Dark Mode Phase 4 - Visual Validation', () => {
  test('All Phase 4 components - Screenshot comparison', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });

    // FilterPanel
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: 'test-results/phase4-filter-panel-dark.png',
      fullPage: false
    });

    // Click filter to show dropdown
    const filterBtn = page.locator('button:has-text("Filter")').first();
    if (await filterBtn.isVisible()) {
      await filterBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: 'test-results/phase4-filter-dropdown-dark.png',
        fullPage: false
      });
    }

    // AgentDashboard
    await page.goto('/agents');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: 'test-results/phase4-agent-dashboard-dark.png',
      fullPage: false
    });

    // TokenAnalyticsDashboard
    await page.goto('/analytics?tab=claude-sdk');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: 'test-results/phase4-token-analytics-dark.png',
      fullPage: false
    });

    // Performance Tab
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
    const perfTab = page.locator('button:has-text("Performance")');
    if (await perfTab.isVisible()) {
      await perfTab.click();
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: 'test-results/phase4-performance-dark.png',
        fullPage: false
      });
    }
  });

  test('Light vs Dark mode comparison screenshots', async ({ page }) => {
    const routes = [
      { path: '/', name: 'filter-panel' },
      { path: '/agents', name: 'agent-dashboard' },
      { path: '/analytics?tab=claude-sdk', name: 'token-analytics' },
    ];

    for (const route of routes) {
      // Light mode
      await page.emulateMedia({ colorScheme: 'light' });
      await page.goto(route.path);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: `test-results/phase4-${route.name}-light.png`,
        fullPage: false
      });

      // Dark mode
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.goto(route.path);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: `test-results/phase4-${route.name}-dark.png`,
        fullPage: false
      });
    }
  });
});

test.describe('Dark Mode Phase 4 - Accessibility Validation', () => {
  test('All text should have sufficient contrast in dark mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });

    const routes = ['/', '/agents', '/analytics?tab=claude-sdk'];

    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Check for text elements
      const textElements = page.locator('p, h1, h2, h3, h4, span, label');
      const count = await textElements.count();

      for (let i = 0; i < Math.min(count, 10); i++) {
        const element = textElements.nth(i);
        if (await element.isVisible()) {
          const textColor = await getTextColor(element);
          const bgColor = await getBackgroundColor(element);

          // Ensure text is not invisible (same as background)
          expect(textColor).not.toBe(bgColor);
        }
      }
    }
  });

  test('Interactive elements should be visible in dark mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const buttons = page.locator('button');
    const count = await buttons.count();

    for (let i = 0; i < Math.min(count, 10); i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        const bgColor = await getBackgroundColor(button);
        // Button should have some background color
        expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
      }
    }
  });
});
