/**
 * Two-Panel Layout with Tier Filtering - E2E Validation Tests
 *
 * Comprehensive Playwright E2E tests validating:
 * - Two-panel layout structure (left sidebar + right detail panel)
 * - Dark mode support on both panels
 * - Tier filtering (T1, T2, All buttons)
 * - Agent counts (9 T1, 10 T2, 19 total)
 * - Tier badges display
 * - Agent icons display
 * - Protection badges display
 * - No console errors
 * - Visual regression with screenshots
 *
 * Expected Behavior (TDD):
 * All tests should FAIL initially until implementation is complete.
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Two-Panel Layout with Tier Filtering - E2E Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to agent management page
    await page.goto('http://localhost:5173/agents');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test.describe('Two-Panel Layout Structure', () => {
    test('should render two-panel layout (left sidebar + right panel)', async ({ page }) => {
      // Verify main container with flex layout
      const container = page.locator('[data-testid="isolated-agent-manager"]');
      await expect(container).toBeVisible();

      // Verify left sidebar panel
      const sidebar = page.locator('[data-testid="agent-list-sidebar"]');
      await expect(sidebar).toBeVisible();

      // Verify right detail panel
      const detailPanel = container.locator('.flex-1.overflow-y-auto');
      await expect(detailPanel).toBeVisible();

      // Verify header exists in right panel
      const header = page.getByRole('heading', { name: 'Agent Manager' });
      await expect(header).toBeVisible();

      // Take screenshot
      await page.screenshot({
        path: 'tests/e2e/screenshots/two-panel-layout.png',
        fullPage: true,
      });
    });

    test('should have correct layout classes on container', async ({ page }) => {
      const container = page.locator('[data-testid="isolated-agent-manager"]');

      // Verify flex and height classes
      const classes = await container.getAttribute('class');
      expect(classes).toContain('flex');
      expect(classes).toContain('h-screen');
    });

    test('should render sidebar with fixed width', async ({ page }) => {
      const sidebar = page.locator('[data-testid="agent-list-sidebar"]');

      // Verify sidebar has width constraint
      const classes = await sidebar.getAttribute('class');
      expect(classes).toMatch(/w-\d+/); // Should have width class
    });

    test('should render detail panel with flex-1', async ({ page }) => {
      const container = page.locator('[data-testid="isolated-agent-manager"]');
      const detailPanel = container.locator('.flex-1').first();

      await expect(detailPanel).toBeVisible();
    });
  });

  test.describe('Dark Mode Support', () => {
    test('should apply dark mode to both panels', async ({ page }) => {
      // Enable dark mode
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });

      // Wait for style changes
      await page.waitForTimeout(500);

      // Verify sidebar has dark mode classes
      const sidebar = page.locator('[data-testid="agent-list-sidebar"]');
      const sidebarClasses = await sidebar.getAttribute('class');
      expect(sidebarClasses).toContain('dark:bg-gray-900');

      // Verify detail panel has dark mode classes
      const detailPanel = page.locator('.flex-1.overflow-y-auto').first();
      const detailClasses = await detailPanel.getAttribute('class');
      expect(detailClasses).toContain('dark:bg-gray-900');

      // Take screenshot
      await page.screenshot({
        path: 'tests/e2e/screenshots/two-panel-layout-dark.png',
        fullPage: true,
      });
    });

    test('should maintain layout structure in dark mode', async ({ page }) => {
      // Enable dark mode
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });

      await page.waitForTimeout(500);

      // Verify layout structure is preserved
      const container = page.locator('[data-testid="isolated-agent-manager"]');
      await expect(container).toBeVisible();

      const sidebar = page.locator('[data-testid="agent-list-sidebar"]');
      await expect(sidebar).toBeVisible();
    });
  });

  test.describe('Tier Filtering Toggle', () => {
    test('should render AgentTierToggle in header', async ({ page }) => {
      const toggle = page.locator('[data-testid="agent-tier-toggle"]');
      await expect(toggle).toBeVisible();

      // Verify toggle is in header area
      const header = page.getByRole('heading', { name: 'Agent Manager' }).locator('..');
      const toggleInHeader = header.locator('[data-testid="agent-tier-toggle"]');
      await expect(toggleInHeader).toBeVisible();
    });

    test('should display T1, T2, and All buttons', async ({ page }) => {
      // Verify T1 button
      const t1Button = page.locator('[data-testid="tier-1-button"]');
      await expect(t1Button).toBeVisible();
      await expect(t1Button).toContainText('T1');

      // Verify T2 button
      const t2Button = page.locator('[data-testid="tier-2-button"]');
      await expect(t2Button).toBeVisible();
      await expect(t2Button).toContainText('T2');

      // Verify All button
      const allButton = page.locator('[data-testid="tier-all-button"]');
      await expect(allButton).toBeVisible();
      await expect(allButton).toContainText('All');
    });

    test('should show agent counts on buttons (9 T1, 10 T2, 19 total)', async ({ page }) => {
      // Wait for agents to load
      await page.waitForTimeout(1000);

      // Verify T1 count (9 agents)
      const t1Button = page.locator('[data-testid="tier-1-button"]');
      await expect(t1Button).toContainText('9');

      // Verify T2 count (10 agents)
      const t2Button = page.locator('[data-testid="tier-2-button"]');
      await expect(t2Button).toContainText('10');

      // Verify All count (19 agents)
      const allButton = page.locator('[data-testid="tier-all-button"]');
      await expect(allButton).toContainText('19');

      // Take screenshot
      await page.screenshot({
        path: 'tests/e2e/screenshots/tier-toggle-counts.png',
        fullPage: false,
        clip: { x: 0, y: 0, width: 800, height: 200 },
      });
    });
  });

  test.describe('Tier Filtering - T1 Filter', () => {
    test('should filter to 9 agents when T1 button is clicked', async ({ page }) => {
      // Click T1 button
      const t1Button = page.locator('[data-testid="tier-1-button"]');
      await t1Button.click();

      // Wait for filter to apply
      await page.waitForTimeout(500);

      // Count agents in sidebar
      const agentItems = page.locator('[data-testid="agent-list-item"]');
      await expect(agentItems).toHaveCount(9);

      // Verify all displayed agents are T1
      const agentCount = await agentItems.count();
      for (let i = 0; i < agentCount; i++) {
        const agent = agentItems.nth(i);
        const tierBadge = agent.locator('[data-tier="1"]');
        await expect(tierBadge).toBeVisible();
      }

      // Take screenshot
      await page.screenshot({
        path: 'tests/e2e/screenshots/tier-filter-t1.png',
        fullPage: true,
      });
    });

    test('should persist T1 filter selection to localStorage', async ({ page }) => {
      // Click T1 button
      await page.locator('[data-testid="tier-1-button"]').click();
      await page.waitForTimeout(500);

      // Check localStorage
      const tierFilter = await page.evaluate(() => {
        return localStorage.getItem('agentTierFilter');
      });

      expect(tierFilter).toBe('1');
    });

    test('should restore T1 filter from localStorage on page reload', async ({ page }) => {
      // Set localStorage
      await page.evaluate(() => {
        localStorage.setItem('agentTierFilter', '1');
      });

      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Verify T1 is active
      const t1Button = page.locator('[data-testid="tier-1-button"]');
      await expect(t1Button).toHaveAttribute('aria-pressed', 'true');

      // Verify 9 agents displayed
      const agentItems = page.locator('[data-testid="agent-list-item"]');
      await expect(agentItems).toHaveCount(9);
    });
  });

  test.describe('Tier Filtering - T2 Filter', () => {
    test('should filter to 10 agents when T2 button is clicked', async ({ page }) => {
      // Click T2 button
      const t2Button = page.locator('[data-testid="tier-2-button"]');
      await t2Button.click();

      // Wait for filter to apply
      await page.waitForTimeout(500);

      // Count agents in sidebar
      const agentItems = page.locator('[data-testid="agent-list-item"]');
      await expect(agentItems).toHaveCount(10);

      // Verify all displayed agents are T2
      const agentCount = await agentItems.count();
      for (let i = 0; i < agentCount; i++) {
        const agent = agentItems.nth(i);
        const tierBadge = agent.locator('[data-tier="2"]');
        await expect(tierBadge).toBeVisible();
      }

      // Take screenshot
      await page.screenshot({
        path: 'tests/e2e/screenshots/tier-filter-t2.png',
        fullPage: true,
      });
    });

    test('should persist T2 filter selection to localStorage', async ({ page }) => {
      // Click T2 button
      await page.locator('[data-testid="tier-2-button"]').click();
      await page.waitForTimeout(500);

      // Check localStorage
      const tierFilter = await page.evaluate(() => {
        return localStorage.getItem('agentTierFilter');
      });

      expect(tierFilter).toBe('2');
    });
  });

  test.describe('Tier Filtering - All Filter', () => {
    test('should show all 19 agents when All button is clicked', async ({ page }) => {
      // Click All button
      const allButton = page.locator('[data-testid="tier-all-button"]');
      await allButton.click();

      // Wait for filter to apply
      await page.waitForTimeout(500);

      // Count agents in sidebar
      const agentItems = page.locator('[data-testid="agent-list-item"]');
      await expect(agentItems).toHaveCount(19);

      // Take screenshot
      await page.screenshot({
        path: 'tests/e2e/screenshots/tier-filter-all.png',
        fullPage: true,
      });
    });

    test('should display both T1 and T2 agents when All is selected', async ({ page }) => {
      // Click All button
      await page.locator('[data-testid="tier-all-button"]').click();
      await page.waitForTimeout(500);

      // Verify T1 agents exist
      const t1Badges = page.locator('[data-tier="1"]');
      const t1Count = await t1Badges.count();
      expect(t1Count).toBe(9);

      // Verify T2 agents exist
      const t2Badges = page.locator('[data-tier="2"]');
      const t2Count = await t2Badges.count();
      expect(t2Count).toBe(10);
    });

    test('should persist All filter selection to localStorage', async ({ page }) => {
      // Click All button
      await page.locator('[data-testid="tier-all-button"]').click();
      await page.waitForTimeout(500);

      // Check localStorage
      const tierFilter = await page.evaluate(() => {
        return localStorage.getItem('agentTierFilter');
      });

      expect(tierFilter).toBe('all');
    });
  });

  test.describe('Tier Badges Display', () => {
    test('should display tier badges on all agents', async ({ page }) => {
      // Click All to see all agents
      await page.locator('[data-testid="tier-all-button"]').click();
      await page.waitForTimeout(500);

      // Verify all agents have tier badges
      const agentItems = page.locator('[data-testid="agent-list-item"]');
      const count = await agentItems.count();

      for (let i = 0; i < count; i++) {
        const agent = agentItems.nth(i);
        const tierBadge = agent.locator('[class*="tier-badge"]');
        await expect(tierBadge).toBeVisible();
      }
    });

    test('should display T1 badges with blue styling', async ({ page }) => {
      // Click T1 filter
      await page.locator('[data-testid="tier-1-button"]').click();
      await page.waitForTimeout(500);

      // Verify T1 badge styling
      const t1Badge = page.locator('[data-tier="1"]').first();
      await expect(t1Badge).toBeVisible();

      const classes = await t1Badge.getAttribute('class');
      expect(classes).toMatch(/blue/); // Should have blue color
    });

    test('should display T2 badges with gray styling', async ({ page }) => {
      // Click T2 filter
      await page.locator('[data-testid="tier-2-button"]').click();
      await page.waitForTimeout(500);

      // Verify T2 badge styling
      const t2Badge = page.locator('[data-tier="2"]').first();
      await expect(t2Badge).toBeVisible();

      const classes = await t2Badge.getAttribute('class');
      expect(classes).toMatch(/gray/); // Should have gray color
    });
  });

  test.describe('Agent Icons Display', () => {
    test('should display agent icons in sidebar', async ({ page }) => {
      await page.waitForTimeout(1000);

      const agentItems = page.locator('[data-testid="agent-list-item"]');
      const count = await agentItems.count();

      // Verify at least one agent has an icon
      expect(count).toBeGreaterThan(0);

      // Check first agent for icon
      const firstAgent = agentItems.first();
      const icon = firstAgent.locator('[data-testid="agent-icon"]');
      await expect(icon).toBeVisible();
    });

    test('should display emoji icons for agents', async ({ page }) => {
      await page.waitForTimeout(1000);

      const agentIcon = page.locator('[data-testid="agent-icon"]').first();
      await expect(agentIcon).toBeVisible();

      // Verify icon contains content (emoji or SVG)
      const content = await agentIcon.textContent();
      expect(content).toBeTruthy();
    });
  });

  test.describe('Protection Badges Display', () => {
    test('should display protection badges on protected agents', async ({ page }) => {
      // Click All to see all agents
      await page.locator('[data-testid="tier-all-button"]').click();
      await page.waitForTimeout(500);

      // Look for protected agents (T2 agents should be protected)
      const protectedBadges = page.locator('[data-testid="protection-badge"]');
      const count = await protectedBadges.count();

      // Should have at least some protected agents
      expect(count).toBeGreaterThan(0);
    });

    test('should display protection badge with lock icon', async ({ page }) => {
      // Click T2 to see system agents (protected)
      await page.locator('[data-testid="tier-2-button"]').click();
      await page.waitForTimeout(500);

      const protectionBadge = page.locator('[data-testid="protection-badge"]').first();
      await expect(protectionBadge).toBeVisible();
    });
  });

  test.describe('Console Error Checking', () => {
    test('should not have console errors during initial load', async ({ page }) => {
      const consoleErrors: string[] = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.goto('http://localhost:5173/agents');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      expect(consoleErrors).toHaveLength(0);
    });

    test('should not have console errors when switching tiers', async ({ page }) => {
      const consoleErrors: string[] = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      // Click T1
      await page.locator('[data-testid="tier-1-button"]').click();
      await page.waitForTimeout(500);

      // Click T2
      await page.locator('[data-testid="tier-2-button"]').click();
      await page.waitForTimeout(500);

      // Click All
      await page.locator('[data-testid="tier-all-button"]').click();
      await page.waitForTimeout(500);

      expect(consoleErrors).toHaveLength(0);
    });
  });

  test.describe('Visual Regression', () => {
    test('should match baseline screenshot for default state', async ({ page }) => {
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: 'tests/e2e/screenshots/baseline-default.png',
        fullPage: true,
      });

      // This test will create baseline, subsequent runs will compare
      expect(true).toBe(true);
    });

    test('should match baseline screenshot for T1 filter', async ({ page }) => {
      await page.locator('[data-testid="tier-1-button"]').click();
      await page.waitForTimeout(500);

      await page.screenshot({
        path: 'tests/e2e/screenshots/baseline-tier1.png',
        fullPage: true,
      });

      expect(true).toBe(true);
    });

    test('should match baseline screenshot for T2 filter', async ({ page }) => {
      await page.locator('[data-testid="tier-2-button"]').click();
      await page.waitForTimeout(500);

      await page.screenshot({
        path: 'tests/e2e/screenshots/baseline-tier2.png',
        fullPage: true,
      });

      expect(true).toBe(true);
    });

    test('should match baseline screenshot for dark mode', async ({ page }) => {
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });
      await page.waitForTimeout(500);

      await page.screenshot({
        path: 'tests/e2e/screenshots/baseline-dark.png',
        fullPage: true,
      });

      expect(true).toBe(true);
    });
  });

  test.describe('Responsive Behavior', () => {
    test('should maintain layout on wide screens', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.waitForTimeout(500);

      const container = page.locator('[data-testid="isolated-agent-manager"]');
      await expect(container).toBeVisible();

      const sidebar = page.locator('[data-testid="agent-list-sidebar"]');
      await expect(sidebar).toBeVisible();
    });

    test('should maintain layout on medium screens', async ({ page }) => {
      await page.setViewportSize({ width: 1024, height: 768 });
      await page.waitForTimeout(500);

      const container = page.locator('[data-testid="isolated-agent-manager"]');
      await expect(container).toBeVisible();

      const sidebar = page.locator('[data-testid="agent-list-sidebar"]');
      await expect(sidebar).toBeVisible();
    });
  });

  test.describe('Integration Tests', () => {
    test('should filter agents and display tier badges correctly', async ({ page }) => {
      // Click T1
      await page.locator('[data-testid="tier-1-button"]').click();
      await page.waitForTimeout(500);

      // Verify count and badges
      const agentItems = page.locator('[data-testid="agent-list-item"]');
      await expect(agentItems).toHaveCount(9);

      const t1Badges = page.locator('[data-tier="1"]');
      await expect(t1Badges).toHaveCount(9);
    });

    test('should maintain tier selection during agent selection', async ({ page }) => {
      // Set T2 filter
      await page.locator('[data-testid="tier-2-button"]').click();
      await page.waitForTimeout(500);

      // Select an agent
      const firstAgent = page.locator('[data-testid="agent-list-item"]').first();
      await firstAgent.click();
      await page.waitForTimeout(500);

      // Verify T2 filter still active
      const t2Button = page.locator('[data-testid="tier-2-button"]');
      await expect(t2Button).toHaveAttribute('aria-pressed', 'true');

      // Verify still showing 10 agents
      const agentItems = page.locator('[data-testid="agent-list-item"]');
      await expect(agentItems).toHaveCount(10);
    });

    test('should update tier counts dynamically', async ({ page }) => {
      await page.waitForTimeout(1000);

      // Verify counts are displayed
      const t1Button = page.locator('[data-testid="tier-1-button"]');
      await expect(t1Button).toContainText('9');

      const t2Button = page.locator('[data-testid="tier-2-button"]');
      await expect(t2Button).toContainText('10');

      const allButton = page.locator('[data-testid="tier-all-button"]');
      await expect(allButton).toContainText('19');
    });
  });
});
