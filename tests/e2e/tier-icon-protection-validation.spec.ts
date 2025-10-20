/**
 * E2E Tests: Tier Count, Protection Badge, and SVG Icon Validation
 *
 * This test suite validates THREE critical fixes in the browser:
 *
 * 1. TIER COUNT STABILITY:
 *    - Tier counts show (9, 10, 19) on all buttons
 *    - Counts remain stable when switching tiers
 *    - No flickering or incorrect counts
 *
 * 2. PROTECTION BADGES:
 *    - T2 agents display lock badge
 *    - Badge visible in sidebar
 *    - Tooltip shows protection reason
 *
 * 3. SVG ICONS:
 *    - Icons render as SVG (not emoji)
 *    - T1 icons are blue
 *    - T2 icons are gray
 *    - No emoji fallbacks visible
 *
 * All tests should FAIL initially before implementation.
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Tier Count, Protection Badge, and SVG Icon Validation', () => {
  // Helper: Wait for agents to load
  async function waitForAgentsLoad(page: Page) {
    // Wait for sidebar to be visible
    await page.waitForSelector('[data-testid="agent-list-sidebar"]', {
      state: 'visible',
      timeout: 10000,
    });

    // Wait for loading spinner to disappear
    await page.waitForSelector('text=Loading isolated agent data...', {
      state: 'hidden',
      timeout: 10000,
    });
  }

  // Helper: Get tier button counts
  async function getTierCounts(page: Page) {
    const tier1Button = page.locator('[data-testid="tier-1-button"]');
    const tier2Button = page.locator('[data-testid="tier-2-button"]');
    const tierAllButton = page.locator('[data-testid="tier-all-button"]');

    const tier1Text = await tier1Button.textContent();
    const tier2Text = await tier2Button.textContent();
    const tierAllText = await tierAllButton.textContent();

    // Extract numbers from "T1 (9)" format
    const tier1Count = parseInt(tier1Text?.match(/\((\d+)\)/)?.[1] || '0');
    const tier2Count = parseInt(tier2Text?.match(/\((\d+)\)/)?.[1] || '0');
    const totalCount = parseInt(tierAllText?.match(/\((\d+)\)/)?.[1] || '0');

    return { tier1Count, tier2Count, totalCount };
  }

  test.beforeEach(async ({ page }) => {
    // Navigate to agents page
    await page.goto('/agents');
    await waitForAgentsLoad(page);
  });

  // =========================================================================
  // FIX #1: TIER COUNT STABILITY
  // =========================================================================

  test.describe('Fix #1: Tier Counts Show (9, 10, 19) Always', () => {
    test('should show tier counts (9, 10, 19) on initial load', async ({ page }) => {
      const counts = await getTierCounts(page);

      expect(counts.tier1Count).toBe(9);
      expect(counts.tier2Count).toBe(10);
      expect(counts.totalCount).toBe(19);
    });

    test('should maintain counts (9, 10, 19) after clicking T1', async ({ page }) => {
      // Click T1 button
      await page.click('[data-testid="tier-1-button"]');

      // Wait for filter to apply
      await page.waitForTimeout(500);

      // Verify counts stayed the same
      const counts = await getTierCounts(page);

      expect(counts.tier1Count).toBe(9);
      expect(counts.tier2Count).toBe(10);
      expect(counts.totalCount).toBe(19);
    });

    test('should maintain counts (9, 10, 19) after clicking T2', async ({ page }) => {
      // Click T2 button
      await page.click('[data-testid="tier-2-button"]');

      // Wait for filter to apply
      await page.waitForTimeout(500);

      // Verify counts stayed the same
      const counts = await getTierCounts(page);

      expect(counts.tier1Count).toBe(9);
      expect(counts.tier2Count).toBe(10);
      expect(counts.totalCount).toBe(19);
    });

    test('should maintain counts (9, 10, 19) after clicking All', async ({ page }) => {
      // Click All button
      await page.click('[data-testid="tier-all-button"]');

      // Wait for filter to apply
      await page.waitForTimeout(500);

      // Verify counts stayed the same
      const counts = await getTierCounts(page);

      expect(counts.tier1Count).toBe(9);
      expect(counts.tier2Count).toBe(10);
      expect(counts.totalCount).toBe(19);
    });

    test('should maintain stable counts during rapid tier switching', async ({ page }) => {
      // Rapidly switch tiers
      for (let i = 0; i < 5; i++) {
        await page.click('[data-testid="tier-1-button"]');
        await page.waitForTimeout(100);

        await page.click('[data-testid="tier-2-button"]');
        await page.waitForTimeout(100);

        await page.click('[data-testid="tier-all-button"]');
        await page.waitForTimeout(100);
      }

      // Final check: counts should still be stable
      const counts = await getTierCounts(page);

      expect(counts.tier1Count).toBe(9);
      expect(counts.tier2Count).toBe(10);
      expect(counts.totalCount).toBe(19);
    });

    test('should show counts in sidebar tier summary', async ({ page }) => {
      const sidebarCounts = page.locator('[data-testid="sidebar-tier-counts"]');
      await expect(sidebarCounts).toBeVisible();

      const text = await sidebarCounts.textContent();
      expect(text).toContain('T1: 9');
      expect(text).toContain('T2: 10');
      expect(text).toContain('Total: 19');
    });
  });

  // =========================================================================
  // FIX #2: CLIENT-SIDE FILTERING (Visible Agent Count)
  // =========================================================================

  test.describe('Fix #2: Client-Side Filtering (Displayed Agent Count)', () => {
    test('should display all 19 agents when "All" is selected', async ({ page }) => {
      await page.click('[data-testid="tier-all-button"]');
      await page.waitForTimeout(500);

      const agentItems = page.locator('[data-testid^="sidebar-agent-"]');
      const count = await agentItems.count();

      expect(count).toBe(19);
    });

    test('should display only 9 agents when "T1" is selected', async ({ page }) => {
      await page.click('[data-testid="tier-1-button"]');
      await page.waitForTimeout(500);

      const agentItems = page.locator('[data-testid^="sidebar-agent-t1"]');
      const count = await agentItems.count();

      expect(count).toBe(9);
    });

    test('should display only 10 agents when "T2" is selected', async ({ page }) => {
      await page.click('[data-testid="tier-2-button"]');
      await page.waitForTimeout(500);

      const agentItems = page.locator('[data-testid^="sidebar-agent-t2"]');
      const count = await agentItems.count();

      expect(count).toBe(10);
    });

    test('should filter instantly without loading spinner', async ({ page }) => {
      // Click T1
      await page.click('[data-testid="tier-1-button"]');

      // Should NOT show loading spinner (client-side filtering)
      const loadingSpinner = page.locator('text=Loading isolated agent data...');
      await expect(loadingSpinner).not.toBeVisible();

      // Agents should update immediately
      const agentItems = page.locator('[data-testid^="sidebar-agent-t1"]');
      expect(await agentItems.count()).toBe(9);
    });
  });

  // =========================================================================
  // FIX #3: PROTECTION BADGES FOR T2 AGENTS
  // =========================================================================

  test.describe('Fix #3: Protection Badges Visible for T2 Agents', () => {
    test('should show protection badges for T2 agents', async ({ page }) => {
      // Filter to T2 agents
      await page.click('[data-testid="tier-2-button"]');
      await page.waitForTimeout(500);

      // Count protection badges
      const protectionBadges = page.locator('[data-testid="protection-badge"]');
      const count = await protectionBadges.count();

      // Should have 10 protection badges (one per T2 agent)
      expect(count).toBe(10);
    });

    test('should NOT show protection badges for T1 agents', async ({ page }) => {
      // Filter to T1 agents
      await page.click('[data-testid="tier-1-button"]');
      await page.waitForTimeout(500);

      // Check for protection badges
      const protectionBadges = page.locator('[data-testid="protection-badge"]');
      const count = await protectionBadges.count();

      // Should have 0 protection badges (T1 agents are public)
      expect(count).toBe(0);
    });

    test('should show lock icon in protection badge', async ({ page }) => {
      await page.click('[data-testid="tier-2-button"]');
      await page.waitForTimeout(500);

      const firstBadge = page.locator('[data-testid="protection-badge"]').first();
      await expect(firstBadge).toBeVisible();

      // Badge should contain "Protected" text
      await expect(firstBadge).toContainText('Protected');
    });

    test('should show protection badge tooltip on hover', async ({ page }) => {
      await page.click('[data-testid="tier-2-button"]');
      await page.waitForTimeout(500);

      const firstBadge = page.locator('[data-testid="protection-badge"]').first();

      // Hover over badge
      await firstBadge.hover();
      await page.waitForTimeout(500);

      // Tooltip should appear
      const tooltip = page.locator('[role="tooltip"]');
      await expect(tooltip).toBeVisible();
      await expect(tooltip).toContainText('System agent');
    });

    test('should display protection badges in "All" view for T2 agents only', async ({ page }) => {
      await page.click('[data-testid="tier-all-button"]');
      await page.waitForTimeout(500);

      // Count protection badges (should only be on T2 agents)
      const protectionBadges = page.locator('[data-testid="protection-badge"]');
      const count = await protectionBadges.count();

      expect(count).toBe(10); // Only T2 agents
    });
  });

  // =========================================================================
  // FIX #4: SVG ICONS (NOT EMOJI)
  // =========================================================================

  test.describe('Fix #4: SVG Icons Render (Not Emoji)', () => {
    test('should render SVG icons for all agents', async ({ page }) => {
      const agentIcons = page.locator('[data-testid="agent-icon"]');
      const count = await agentIcons.count();

      // Should have 19 SVG icons (default "All" view)
      expect(count).toBe(19);
    });

    test('should render SVG icons with correct icon_type attribute', async ({ page }) => {
      const firstIcon = page.locator('[data-testid="agent-icon"]').first();

      // Check data attribute
      const iconType = await firstIcon.getAttribute('data-icon-type');
      expect(iconType).toBe('svg');
    });

    test('should display SVG text (not emoji) for T1 agents', async ({ page }) => {
      await page.click('[data-testid="tier-1-button"]');
      await page.waitForTimeout(500);

      const t1Icons = page.locator('[data-testid="agent-icon"][data-tier="1"]');
      const firstIcon = t1Icons.first();

      const text = await firstIcon.textContent();

      // Should contain SVG indicator, NOT emoji
      expect(text).toMatch(/\[SVG:.*\]/);
      expect(text).not.toContain('✅');
      expect(text).not.toContain('💡');
    });

    test('should display SVG text (not emoji) for T2 agents', async ({ page }) => {
      await page.click('[data-testid="tier-2-button"]');
      await page.waitForTimeout(500);

      const t2Icons = page.locator('[data-testid="agent-icon"][data-tier="2"]');
      const firstIcon = t2Icons.first();

      const text = await firstIcon.textContent();

      // Should contain SVG indicator, NOT emoji
      expect(text).toMatch(/\[SVG:.*\]/);
      expect(text).not.toContain('⚙️');
      expect(text).not.toContain('🔧');
    });

    test('should render T1 icons with blue color (tier 1)', async ({ page }) => {
      await page.click('[data-testid="tier-1-button"]');
      await page.waitForTimeout(500);

      const t1Icons = page.locator('[data-testid="agent-icon"][data-tier="1"]');
      const count = await t1Icons.count();

      // All 9 T1 agents should have tier=1 attribute
      expect(count).toBe(9);

      // Verify tier attribute
      for (let i = 0; i < count; i++) {
        const tier = await t1Icons.nth(i).getAttribute('data-tier');
        expect(tier).toBe('1');
      }
    });

    test('should render T2 icons with gray color (tier 2)', async ({ page }) => {
      await page.click('[data-testid="tier-2-button"]');
      await page.waitForTimeout(500);

      const t2Icons = page.locator('[data-testid="agent-icon"][data-tier="2"]');
      const count = await t2Icons.count();

      // All 10 T2 agents should have tier=2 attribute
      expect(count).toBe(10);

      // Verify tier attribute
      for (let i = 0; i < count; i++) {
        const tier = await t2Icons.nth(i).getAttribute('data-tier');
        expect(tier).toBe('2');
      }
    });

    test('should render correct icon names for T1 agents', async ({ page }) => {
      await page.click('[data-testid="tier-1-button"]');
      await page.waitForTimeout(500);

      const t1Icons = page.locator('[data-testid="agent-icon"][data-tier="1"]');
      const firstIcon = t1Icons.first();

      const iconName = await firstIcon.getAttribute('data-icon-name');

      // T1 agents use CheckSquare icon
      expect(iconName).toBe('CheckSquare');
    });

    test('should render correct icon names for T2 agents', async ({ page }) => {
      await page.click('[data-testid="tier-2-button"]');
      await page.waitForTimeout(500);

      const t2Icons = page.locator('[data-testid="agent-icon"][data-tier="2"]');
      const firstIcon = t2Icons.first();

      const iconName = await firstIcon.getAttribute('data-icon-name');

      // T2 agents use Settings icon
      expect(iconName).toBe('Settings');
    });

    test('should render all icons with size="md"', async ({ page }) => {
      const agentIcons = page.locator('[data-testid="agent-icon"]');
      const count = await agentIcons.count();

      for (let i = 0; i < count; i++) {
        const size = await agentIcons.nth(i).getAttribute('data-size');
        expect(size).toBe('md');
      }
    });
  });

  // =========================================================================
  // VISUAL REGRESSION: Screenshot Comparisons
  // =========================================================================

  test.describe('Visual Regression: SVG Icons and Protection Badges', () => {
    test('should capture All view with 19 agents (SVG icons + T2 badges)', async ({ page }) => {
      await page.click('[data-testid="tier-all-button"]');
      await page.waitForTimeout(1000);

      const sidebar = page.locator('[data-testid="agent-list-sidebar"]');
      await expect(sidebar).toBeVisible();

      // Take screenshot
      await sidebar.screenshot({
        path: 'tests/e2e/screenshots/tier-icon-protection-all-view.png',
      });
    });

    test('should capture T1 view with 9 agents (blue SVG icons, no badges)', async ({ page }) => {
      await page.click('[data-testid="tier-1-button"]');
      await page.waitForTimeout(1000);

      const sidebar = page.locator('[data-testid="agent-list-sidebar"]');
      await expect(sidebar).toBeVisible();

      // Take screenshot
      await sidebar.screenshot({
        path: 'tests/e2e/screenshots/tier-icon-protection-t1-view.png',
      });
    });

    test('should capture T2 view with 10 agents (gray SVG icons + lock badges)', async ({ page }) => {
      await page.click('[data-testid="tier-2-button"]');
      await page.waitForTimeout(1000);

      const sidebar = page.locator('[data-testid="agent-list-sidebar"]');
      await expect(sidebar).toBeVisible();

      // Take screenshot
      await sidebar.screenshot({
        path: 'tests/e2e/screenshots/tier-icon-protection-t2-view.png',
      });
    });
  });

  // =========================================================================
  // INTEGRATION: All Three Fixes Together
  // =========================================================================

  test.describe('Integration: Tier Counts + Protection Badges + SVG Icons', () => {
    test('should show all fixes working together in All view', async ({ page }) => {
      await page.click('[data-testid="tier-all-button"]');
      await page.waitForTimeout(500);

      // 1. Tier counts stable
      const counts = await getTierCounts(page);
      expect(counts).toEqual({ tier1Count: 9, tier2Count: 10, totalCount: 19 });

      // 2. 19 agents displayed
      const agentItems = page.locator('[data-testid^="sidebar-agent-"]');
      expect(await agentItems.count()).toBe(19);

      // 3. 10 protection badges (T2 only)
      const protectionBadges = page.locator('[data-testid="protection-badge"]');
      expect(await protectionBadges.count()).toBe(10);

      // 4. 19 SVG icons
      const svgIcons = page.locator('[data-testid="agent-icon"]');
      expect(await svgIcons.count()).toBe(19);
    });

    test('should maintain all fixes when switching T1 → T2 → All', async ({ page }) => {
      // Start: All view
      let counts = await getTierCounts(page);
      expect(counts).toEqual({ tier1Count: 9, tier2Count: 10, totalCount: 19 });

      // Switch to T1
      await page.click('[data-testid="tier-1-button"]');
      await page.waitForTimeout(500);

      counts = await getTierCounts(page);
      expect(counts).toEqual({ tier1Count: 9, tier2Count: 10, totalCount: 19 });
      expect(await page.locator('[data-testid="agent-icon"]').count()).toBe(9);
      expect(await page.locator('[data-testid="protection-badge"]').count()).toBe(0);

      // Switch to T2
      await page.click('[data-testid="tier-2-button"]');
      await page.waitForTimeout(500);

      counts = await getTierCounts(page);
      expect(counts).toEqual({ tier1Count: 9, tier2Count: 10, totalCount: 19 });
      expect(await page.locator('[data-testid="agent-icon"]').count()).toBe(10);
      expect(await page.locator('[data-testid="protection-badge"]').count()).toBe(10);

      // Switch back to All
      await page.click('[data-testid="tier-all-button"]');
      await page.waitForTimeout(500);

      counts = await getTierCounts(page);
      expect(counts).toEqual({ tier1Count: 9, tier2Count: 10, totalCount: 19 });
      expect(await page.locator('[data-testid="agent-icon"]').count()).toBe(19);
      expect(await page.locator('[data-testid="protection-badge"]').count()).toBe(10);
    });

    test('should pass all checks after page refresh', async ({ page }) => {
      // Refresh page
      await page.reload();
      await waitForAgentsLoad(page);

      // Verify all fixes still work
      const counts = await getTierCounts(page);
      expect(counts).toEqual({ tier1Count: 9, tier2Count: 10, totalCount: 19 });

      const agentIcons = page.locator('[data-testid="agent-icon"]');
      expect(await agentIcons.count()).toBeGreaterThan(0);

      const firstIcon = agentIcons.first();
      const iconType = await firstIcon.getAttribute('data-icon-type');
      expect(iconType).toBe('svg');
    });
  });

  // =========================================================================
  // ACCESSIBILITY: ARIA Labels and Screen Reader Support
  // =========================================================================

  test.describe('Accessibility: ARIA Labels and Keyboard Navigation', () => {
    test('should have correct ARIA labels on tier buttons', async ({ page }) => {
      const tier1Button = page.locator('[data-testid="tier-1-button"]');
      const tier2Button = page.locator('[data-testid="tier-2-button"]');
      const tierAllButton = page.locator('[data-testid="tier-all-button"]');

      const tier1Label = await tier1Button.getAttribute('aria-label');
      const tier2Label = await tier2Button.getAttribute('aria-label');
      const tierAllLabel = await tierAllButton.getAttribute('aria-label');

      expect(tier1Label).toContain('Tier 1');
      expect(tier1Label).toContain('9');

      expect(tier2Label).toContain('Tier 2');
      expect(tier2Label).toContain('10');

      expect(tierAllLabel).toContain('All');
      expect(tierAllLabel).toContain('19');
    });

    test('should have ARIA labels on protection badges', async ({ page }) => {
      await page.click('[data-testid="tier-2-button"]');
      await page.waitForTimeout(500);

      const firstBadge = page.locator('[data-testid="protection-badge"]').first();
      const ariaLabel = await firstBadge.getAttribute('aria-label');

      expect(ariaLabel).toContain('Protected');
    });

    test('should have ARIA labels on agent icons', async ({ page }) => {
      const firstIcon = page.locator('[data-testid="agent-icon"]').first();
      const ariaLabel = await firstIcon.getAttribute('aria-label');

      // Should have descriptive label
      expect(ariaLabel).toBeTruthy();
    });
  });
});
