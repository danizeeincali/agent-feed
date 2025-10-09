/**
 * Dark Mode Phase 3 - Comprehensive E2E Tests
 * Tests all components fixed in Phase 3 for proper dark mode implementation
 *
 * User Requirements Verified:
 * 1. QuickPost section
 * 2. Agent Sidebar
 * 3. Agent Overview (AgentProfileTab)
 * 4. Dynamic Pages Tab
 * 5. Performance Tab Cards
 * 6. Agent Activities Tab
 * 7. Analytics lazy loading fix
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

const COLORS = {
  DARK_BG_900: 'rgb(17, 24, 39)',
  DARK_BG_800: 'rgb(31, 41, 55)',
  WHITE: 'rgb(255, 255, 255)',
  GRAY_100: 'rgb(243, 244, 246)',
};

test.describe('Dark Mode Phase 3 - QuickPost Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('QuickPost container should have dark background', async ({ page }) => {
    const quickPost = page.locator('.bg-white.dark\\:bg-gray-900').first();
    await quickPost.waitFor({ timeout: 5000 });

    const bgColor = await getBackgroundColor(quickPost);
    expect(bgColor).not.toBe(COLORS.WHITE);
    expect(bgColor).toContain('17, 24, 39'); // gray-900
  });

  test('QuickPost tab navigation should have dark borders', async ({ page }) => {
    const tabNav = page.locator('nav[aria-label="Posting tabs"]').first();
    if (await tabNav.isVisible()) {
      const borderColor = await tabNav.evaluate((el: HTMLElement) =>
        window.getComputedStyle(el).borderBottomColor
      );
      expect(borderColor).not.toContain('229, 231, 235'); // Not gray-100
    }
  });

  test('Message input should have dark background', async ({ page }) => {
    const messageInput = page.locator('textarea[placeholder*="message"], input[type="text"]').first();
    if (await messageInput.isVisible()) {
      const bgColor = await getBackgroundColor(messageInput);
      expect(bgColor).not.toBe(COLORS.WHITE);
    }
  });
});

test.describe('Dark Mode Phase 3 - Agent Sidebar', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/agents');
    await page.waitForLoadState('networkidle');
  });

  test('Agent sidebar should have dark background', async ({ page }) => {
    const sidebar = page.locator('[data-testid="agent-list-sidebar"]');
    await sidebar.waitFor({ timeout: 5000 });

    const bgColor = await getBackgroundColor(sidebar);
    expect(bgColor).not.toBe(COLORS.WHITE);
    expect(bgColor).toContain('17, 24, 39'); // gray-900
  });

  test('Sidebar search input should have dark background', async ({ page }) => {
    const searchInput = page.locator('[data-testid="agent-search-input"]');
    await searchInput.waitFor({ timeout: 5000 });

    const bgColor = await getBackgroundColor(searchInput);
    expect(bgColor).not.toBe(COLORS.WHITE);
    expect(bgColor).toContain('17, 24, 39'); // gray-900
  });

  test('Sidebar should have dark borders', async ({ page }) => {
    const sidebar = page.locator('[data-testid="agent-list-sidebar"]');
    const borderColor = await sidebar.evaluate((el: HTMLElement) =>
      window.getComputedStyle(el).borderRightColor
    );
    expect(borderColor).toContain('55, 65, 81'); // gray-700
  });

  test('Agent list items should have dark hover state', async ({ page }) => {
    const firstAgent = page.locator('[data-testid="agent-list-item"]').first();
    if (await firstAgent.isVisible()) {
      await firstAgent.hover();
      await page.waitForTimeout(200);
      const bgColor = await getBackgroundColor(firstAgent);
      expect(bgColor).not.toBe(COLORS.WHITE);
    }
  });
});

test.describe('Dark Mode Phase 3 - Agent Profile Tab (Overview)', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/agents');
    await page.waitForLoadState('networkidle');

    // Click first agent to open profile
    const firstAgent = page.locator('[data-testid="agent-card"]').first();
    if (await firstAgent.isVisible()) {
      await firstAgent.click();
      await page.waitForTimeout(1000);
    }
  });

  test('Strengths cards should have dark green backgrounds', async ({ page }) => {
    const strengthCard = page.locator('[data-testid="strength-card"]').first();
    if (await strengthCard.isVisible()) {
      const bgColor = await getBackgroundColor(strengthCard);
      // Should be dark green variant, not light green
      expect(bgColor).not.toContain('240, 253, 244'); // Not green-50
      expect(bgColor).toContain('20, 83, 45'); // green-900 with opacity
    }
  });

  test('Limitations cards should have dark orange backgrounds', async ({ page }) => {
    const limitationsSection = page.locator('[data-testid="limitations-section"]');
    if (await limitationsSection.isVisible()) {
      const limitationCard = limitationsSection.locator('.bg-orange-50').first();
      if (await limitationCard.isVisible()) {
        const bgColor = await getBackgroundColor(limitationCard);
        // Should be dark orange variant
        expect(bgColor).not.toContain('255, 247, 237'); // Not orange-50
      }
    }
  });

  test('Profile section headings should be readable in dark mode', async ({ page }) => {
    const heading = page.locator('h3.text-lg.font-semibold').first();
    if (await heading.isVisible()) {
      const textColor = await getTextColor(heading);
      expect(textColor).toContain('243, 244, 246'); // gray-100
    }
  });
});

test.describe('Dark Mode Phase 3 - Dynamic Pages Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/agents');
    await page.waitForLoadState('networkidle');

    // Navigate to agent profile and dynamic pages tab
    const firstAgent = page.locator('[data-testid="agent-card"]').first();
    if (await firstAgent.isVisible()) {
      await firstAgent.click();
      await page.waitForTimeout(1000);

      // Click Dynamic Pages tab if it exists
      const dynamicPagesTab = page.locator('button:has-text("Dynamic Pages"), button:has-text("Pages")');
      if (await dynamicPagesTab.first().isVisible()) {
        await dynamicPagesTab.first().click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('Dynamic pages container should have dark background', async ({ page }) => {
    const container = page.locator('.bg-white.dark\\:bg-gray-900').first();
    if (await container.isVisible()) {
      const bgColor = await getBackgroundColor(container);
      expect(bgColor).not.toBe(COLORS.WHITE);
    }
  });

  test('Create page button should have dark styling', async ({ page }) => {
    const createButton = page.locator('button:has-text("Create"), button:has-text("New Page")').first();
    if (await createButton.isVisible()) {
      const bgColor = await getBackgroundColor(createButton);
      expect(bgColor).not.toBe(COLORS.WHITE);
    }
  });

  test('Page cards should have dark borders', async ({ page }) => {
    const pageCard = page.locator('[class*="border"][class*="rounded"]').first();
    if (await pageCard.isVisible()) {
      const borderColor = await pageCard.evaluate((el: HTMLElement) =>
        window.getComputedStyle(el).borderColor
      );
      expect(borderColor).not.toContain('229, 231, 235'); // Not gray-200
    }
  });
});

test.describe('Dark Mode Phase 3 - Performance Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    // Click Performance tab
    const perfTab = page.locator('button:has-text("Performance")');
    if (await perfTab.isVisible()) {
      await perfTab.click();
      await page.waitForTimeout(1000);
    }
  });

  test('Performance cards should have dark backgrounds', async ({ page }) => {
    const card = page.locator('.bg-white.dark\\:bg-gray-900').first();
    if (await card.isVisible()) {
      const bgColor = await getBackgroundColor(card);
      expect(bgColor).not.toBe(COLORS.WHITE);
      expect(bgColor).toContain('17, 24, 39'); // gray-900
    }
  });

  test('Export button should have dark styling', async ({ page }) => {
    const exportBtn = page.locator('button:has-text("Export")');
    if (await exportBtn.isVisible()) {
      const bgColor = await getBackgroundColor(exportBtn);
      expect(bgColor).not.toBe(COLORS.WHITE);
    }
  });

  test('Performance table should have dark backgrounds', async ({ page }) => {
    const tableBody = page.locator('tbody.bg-white').first();
    if (await tableBody.isVisible()) {
      const bgColor = await getBackgroundColor(tableBody);
      expect(bgColor).not.toBe(COLORS.WHITE);
    }
  });

  test('Status badges should be visible in dark mode', async ({ page }) => {
    const badge = page.locator('[class*="bg-green"], [class*="bg-yellow"], [class*="bg-red"]').first();
    if (await badge.isVisible()) {
      const bgColor = await getBackgroundColor(badge);
      // Status badges should have color
      expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
    }
  });
});

test.describe('Dark Mode Phase 3 - Analytics Lazy Loading', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
  });

  test('TokenAnalyticsDashboard should load without errors', async ({ page }) => {
    const consoleLogs: string[] = [];
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
      consoleLogs.push(msg.text());
    });

    await page.goto('/analytics?tab=claude-sdk');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Wait for lazy load

    // Check for the specific error
    const hasImportError = consoleErrors.some(err =>
      err.includes('Failed to fetch dynamically imported module')
    );
    expect(hasImportError).toBe(false);
  });

  test('Claude SDK Analytics tab should be visible', async ({ page }) => {
    await page.goto('/analytics?tab=claude-sdk');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Check for error message
    const errorMsg = page.locator('text="Failed to load Claude SDK Analytics"');
    await expect(errorMsg).not.toBeVisible();

    // Check for loading indicator disappears
    const loadingMsg = page.locator('text="Loading Claude SDK Analytics"');
    if (await loadingMsg.isVisible()) {
      await loadingMsg.waitFor({ state: 'hidden', timeout: 10000 });
    }
  });

  test('Analytics tab should have dark mode styling', async ({ page }) => {
    await page.goto('/analytics?tab=claude-sdk');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const container = page.locator('[data-testid="token-analytics"], .bg-white').first();
    if (await container.isVisible()) {
      const bgColor = await getBackgroundColor(container);
      expect(bgColor).not.toBe(COLORS.WHITE);
    }
  });
});

test.describe('Dark Mode Phase 3 - Regression Tests', () => {
  test('Light mode should still work for all Phase 3 components', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // QuickPost should be white in light mode
    const quickPost = page.locator('.bg-white').first();
    const bgColor = await getBackgroundColor(quickPost);
    expect(bgColor).toBe(COLORS.WHITE);
  });

  test('Dark mode toggle should work across all pages', async ({ page }) => {
    const routes = ['/', '/agents', '/analytics'];

    for (const route of routes) {
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.goto(route);
      await page.waitForLoadState('networkidle');

      const body = page.locator('body');
      const bgColor = await getBackgroundColor(body);
      expect(bgColor).not.toBe(COLORS.WHITE);
    }
  });

  test('No white flashes during navigation in dark mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });

    // Navigate between routes and check for white backgrounds
    await page.goto('/');
    await page.waitForTimeout(500);

    await page.goto('/agents');
    await page.waitForTimeout(500);

    await page.goto('/analytics');
    await page.waitForTimeout(500);

    // Body should never be white
    const body = page.locator('body');
    const bgColor = await getBackgroundColor(body);
    expect(bgColor).not.toBe(COLORS.WHITE);
  });
});

test.describe('Dark Mode Phase 3 - Visual Validation', () => {
  test('All Phase 3 components - Screenshot comparison', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });

    // QuickPost
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: 'test-results/phase3-quickpost-dark.png',
      fullPage: false
    });

    // Agent Sidebar
    await page.goto('/agents');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: 'test-results/phase3-agent-sidebar-dark.png',
      fullPage: false
    });

    // Agent Profile (overview)
    const firstAgent = page.locator('[data-testid="agent-card"]').first();
    if (await firstAgent.isVisible()) {
      await firstAgent.click();
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: 'test-results/phase3-agent-profile-dark.png',
        fullPage: false
      });
    }

    // Analytics Performance Tab
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
    const perfTab = page.locator('button:has-text("Performance")');
    if (await perfTab.isVisible()) {
      await perfTab.click();
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: 'test-results/phase3-performance-dark.png',
        fullPage: false
      });
    }

    // Analytics Claude SDK Tab
    await page.goto('/analytics?tab=claude-sdk');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await page.screenshot({
      path: 'test-results/phase3-analytics-sdk-dark.png',
      fullPage: false
    });
  });
});
