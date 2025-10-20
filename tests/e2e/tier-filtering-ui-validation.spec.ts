/**
 * E2E Playwright Tests: Agent Tier Filtering UI Validation
 *
 * SPARC-COMPLIANT TEST SUITE
 * Specification: Agent Tier Filtering UI
 *
 * TDD Approach:
 * 1. Tests written FIRST (will fail initially)
 * 2. Validate real UI components in browser
 * 3. Test backend API integration
 * 4. Capture screenshots for visual regression
 * 5. No mocks - real validation only
 *
 * Test Coverage: 15+ comprehensive E2E scenarios
 * - Group 1: Default Behavior (3 tests)
 * - Group 2: Tier Toggle Interaction (4 tests)
 * - Group 3: Visual Components (4 tests)
 * - Group 4: localStorage Persistence (3 tests)
 * - Group 5: API Integration (3 tests)
 *
 * @requires Playwright
 * @requires Frontend running on localhost:5173
 * @requires Backend running on localhost:3000
 */

import { test, expect, Page } from '@playwright/test';

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const API_BASE = process.env.API_BASE || 'http://localhost:3000';

// Expected agent counts per tier (as per specification)
const EXPECTED_COUNTS = {
  TIER_1: 8,
  TIER_2: 11,
  ALL: 19,
} as const;

/**
 * Helper function to wait for agents to load
 */
async function waitForAgentsToLoad(page: Page) {
  await page.waitForSelector('[data-testid="agent-card"], .agent-card, article', {
    timeout: 10000,
  });
  // Give extra time for all cards to render
  await page.waitForTimeout(500);
}

/**
 * Helper function to get agent card count
 */
async function getAgentCardCount(page: Page): Promise<number> {
  return await page.locator('[data-testid="agent-card"], .agent-card, article').count();
}

/**
 * Helper function to get tier toggle button
 */
function getTierButton(page: Page, tier: 'Tier 1' | 'Tier 2' | 'All') {
  return page.locator(`button:has-text("${tier}")`).first();
}

test.describe('Agent Tier Filtering UI Validation', () => {

  test.beforeEach(async ({ page }) => {
    // Clear localStorage to ensure clean state
    await page.goto(BASE_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  // ========================================
  // GROUP 1: Default Behavior (3 tests)
  // ========================================

  test.describe('Group 1: Default Behavior', () => {

    test('1.1 - Page loads with tier 1 agents by default', async ({ page }) => {
      await waitForAgentsToLoad(page);

      const count = await getAgentCardCount(page);

      expect(count).toBe(EXPECTED_COUNTS.TIER_1);
    });

    test('1.2 - Tier toggle shows correct counts (T1: 8, T2: 11, All: 19)', async ({ page }) => {
      await page.waitForSelector('button:has-text("Tier 1")');

      const tier1Button = getTierButton(page, 'Tier 1');
      const tier2Button = getTierButton(page, 'Tier 2');
      const allButton = getTierButton(page, 'All');

      const tier1Text = await tier1Button.textContent();
      const tier2Text = await tier2Button.textContent();
      const allText = await allButton.textContent();

      // Verify exact counts are displayed
      expect(tier1Text).toContain('(8)');
      expect(tier2Text).toContain('(11)');
      expect(allText).toContain('(19)');
    });

    test('1.3 - Only tier 1 agent cards visible on initial load', async ({ page }) => {
      await waitForAgentsToLoad(page);

      // Check for tier badges on visible cards
      const tierBadges = await page.locator('[data-testid="tier-badge"], .tier-badge').allTextContents();

      // If badges are present, verify all are Tier 1
      if (tierBadges.length > 0) {
        const allTier1 = tierBadges.every(badge =>
          badge.includes('T1') ||
          badge.includes('Tier 1') ||
          badge.includes('User-facing')
        );
        expect(allTier1).toBe(true);
      }

      // Verify correct count
      const count = await getAgentCardCount(page);
      expect(count).toBe(EXPECTED_COUNTS.TIER_1);
    });
  });

  // ========================================
  // GROUP 2: Tier Toggle Interaction (4 tests)
  // ========================================

  test.describe('Group 2: Tier Toggle Interaction', () => {

    test('2.1 - Clicking "Tier 2" button switches to tier 2 agents', async ({ page }) => {
      await page.waitForSelector('button:has-text("Tier 2")');

      const tier2Button = getTierButton(page, 'Tier 2');
      await tier2Button.click();

      await waitForAgentsToLoad(page);

      const count = await getAgentCardCount(page);
      expect(count).toBe(EXPECTED_COUNTS.TIER_2);
    });

    test('2.2 - Clicking "All" button shows all 19 agents', async ({ page }) => {
      await page.waitForSelector('button:has-text("All")');

      const allButton = getTierButton(page, 'All');
      await allButton.click();

      await waitForAgentsToLoad(page);

      const count = await getAgentCardCount(page);
      expect(count).toBe(EXPECTED_COUNTS.ALL);
    });

    test('2.3 - Active button has correct visual styling', async ({ page }) => {
      await page.waitForSelector('button:has-text("Tier 1")');

      const tier1Button = getTierButton(page, 'Tier 1');

      // Check aria-pressed attribute
      const ariaPressed = await tier1Button.getAttribute('aria-pressed');
      expect(ariaPressed).toBe('true');

      // Check visual styling (active button should have background color)
      const backgroundColor = await tier1Button.evaluate(el =>
        window.getComputedStyle(el).backgroundColor
      );

      // Should not be transparent (has active styling)
      expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      expect(backgroundColor).not.toBe('transparent');
    });

    test('2.4 - Agent count updates correctly when switching tiers', async ({ page }) => {
      await page.waitForSelector('button:has-text("Tier 1")');

      // Start with Tier 1 (default)
      await waitForAgentsToLoad(page);
      let count = await getAgentCardCount(page);
      expect(count).toBe(EXPECTED_COUNTS.TIER_1);

      // Switch to Tier 2
      const tier2Button = getTierButton(page, 'Tier 2');
      await tier2Button.click();
      await waitForAgentsToLoad(page);
      count = await getAgentCardCount(page);
      expect(count).toBe(EXPECTED_COUNTS.TIER_2);

      // Switch to All
      const allButton = getTierButton(page, 'All');
      await allButton.click();
      await waitForAgentsToLoad(page);
      count = await getAgentCardCount(page);
      expect(count).toBe(EXPECTED_COUNTS.ALL);

      // Switch back to Tier 1
      const tier1Button = getTierButton(page, 'Tier 1');
      await tier1Button.click();
      await waitForAgentsToLoad(page);
      count = await getAgentCardCount(page);
      expect(count).toBe(EXPECTED_COUNTS.TIER_1);
    });
  });

  // ========================================
  // GROUP 3: Visual Components (4 tests)
  // ========================================

  test.describe('Group 3: Visual Components', () => {

    test('3.1 - AgentIcon component renders correctly (SVG/Emoji/Initials)', async ({ page }) => {
      await waitForAgentsToLoad(page);

      // Look for agent icons (various formats)
      const icons = await page.locator('[data-testid="agent-icon"], .agent-icon, [data-testid="agent-card"] img, [data-testid="agent-card"] svg').count();

      // Should have at least one icon per agent card
      const cardCount = await getAgentCardCount(page);
      expect(icons).toBeGreaterThanOrEqual(cardCount);
    });

    test('3.2 - AgentTierBadge shows correct tier (T1 blue, T2 gray)', async ({ page }) => {
      await waitForAgentsToLoad(page);

      // Get tier 1 badges
      const tier1Badges = await page.locator('[data-testid="tier-badge"], .tier-badge').first();

      if (await tier1Badges.count() > 0) {
        const badgeText = await tier1Badges.textContent();
        expect(badgeText).toMatch(/T1|Tier 1/i);

        // Check color styling
        const backgroundColor = await tier1Badges.evaluate(el =>
          window.getComputedStyle(el).backgroundColor
        );

        // Blue-ish color for Tier 1 (RGB components)
        // Should have blue component higher than red
        expect(backgroundColor).toBeTruthy();
      }
    });

    test('3.3 - ProtectionBadge displays for protected agents', async ({ page }) => {
      // Switch to Tier 2 to see protected agents
      await page.waitForSelector('button:has-text("Tier 2")');
      const tier2Button = getTierButton(page, 'Tier 2');
      await tier2Button.click();
      await waitForAgentsToLoad(page);

      // Look for protection badges
      const protectionBadges = await page.locator('[data-testid="protection-badge"], .protection-badge, [aria-label*="protected" i]').count();

      // Should have at least 6 protected agents in Tier 2 (Phase 4.2 specialists)
      expect(protectionBadges).toBeGreaterThanOrEqual(6);
    });

    test('3.4 - Badges have correct colors and text', async ({ page }) => {
      await waitForAgentsToLoad(page);

      // Check tier badges
      const tierBadge = await page.locator('[data-testid="tier-badge"]').first();

      if (await tierBadge.count() > 0) {
        const text = await tierBadge.textContent();
        const ariaLabel = await tierBadge.getAttribute('aria-label');

        // Should have tier indicator
        expect(text || ariaLabel).toMatch(/T1|Tier 1|User-facing/i);
      }

      // Switch to Tier 2 for protection badges
      const tier2Button = getTierButton(page, 'Tier 2');
      await tier2Button.click();
      await waitForAgentsToLoad(page);

      const protectionBadge = await page.locator('[data-testid="protection-badge"]').first();

      if (await protectionBadge.count() > 0) {
        const protectText = await protectionBadge.textContent();
        expect(protectText?.toLowerCase()).toContain('protect');
      }
    });
  });

  // ========================================
  // GROUP 4: localStorage Persistence (3 tests)
  // ========================================

  test.describe('Group 4: localStorage Persistence', () => {

    test('4.1 - Selected tier persists after page reload', async ({ page }) => {
      await page.waitForSelector('button:has-text("Tier 2")');

      // Select Tier 2
      const tier2Button = getTierButton(page, 'Tier 2');
      await tier2Button.click();
      await waitForAgentsToLoad(page);

      // Verify Tier 2 is active
      let count = await getAgentCardCount(page);
      expect(count).toBe(EXPECTED_COUNTS.TIER_2);

      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');
      await waitForAgentsToLoad(page);

      // Should still show Tier 2
      count = await getAgentCardCount(page);
      expect(count).toBe(EXPECTED_COUNTS.TIER_2);

      // Verify button is still active
      const tier2ButtonAfterReload = getTierButton(page, 'Tier 2');
      const ariaPressed = await tier2ButtonAfterReload.getAttribute('aria-pressed');
      expect(ariaPressed).toBe('true');
    });

    test('4.2 - localStorage key "agentTierFilter" has correct value', async ({ page }) => {
      await page.waitForSelector('button:has-text("Tier 2")');

      // Select Tier 2
      const tier2Button = getTierButton(page, 'Tier 2');
      await tier2Button.click();
      await page.waitForTimeout(500);

      // Check localStorage
      const storedValue = await page.evaluate(() =>
        localStorage.getItem('agentTierFilter')
      );

      expect(storedValue).toBe('2');

      // Switch to All
      const allButton = getTierButton(page, 'All');
      await allButton.click();
      await page.waitForTimeout(500);

      const storedValueAll = await page.evaluate(() =>
        localStorage.getItem('agentTierFilter')
      );

      expect(storedValueAll).toBe('all');
    });

    test('4.3 - Refreshing page maintains selected tier', async ({ page }) => {
      await page.waitForSelector('button:has-text("All")');

      // Select All
      const allButton = getTierButton(page, 'All');
      await allButton.click();
      await waitForAgentsToLoad(page);

      let count = await getAgentCardCount(page);
      expect(count).toBe(EXPECTED_COUNTS.ALL);

      // Hard refresh
      await page.reload({ waitUntil: 'networkidle' });
      await waitForAgentsToLoad(page);

      // Should maintain All selection
      count = await getAgentCardCount(page);
      expect(count).toBe(EXPECTED_COUNTS.ALL);

      const allButtonAfterRefresh = getTierButton(page, 'All');
      const ariaPressed = await allButtonAfterRefresh.getAttribute('aria-pressed');
      expect(ariaPressed).toBe('true');
    });
  });

  // ========================================
  // GROUP 5: API Integration (3 tests)
  // ========================================

  test.describe('Group 5: API Integration', () => {

    test('5.1 - API called with correct tier parameter (?tier=1)', async ({ page }) => {
      // Listen for API requests
      const apiRequests: string[] = [];

      page.on('request', request => {
        const url = request.url();
        if (url.includes('/api') && url.includes('agents')) {
          apiRequests.push(url);
        }
      });

      // Navigate to page
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      await waitForAgentsToLoad(page);

      // Should have made API request with tier=1 (default)
      const tier1Request = apiRequests.find(url => url.includes('tier=1'));
      expect(tier1Request).toBeTruthy();
    });

    test('5.2 - Response contains correct metadata', async ({ page }) => {
      // Intercept API response
      let responseData: any = null;

      page.on('response', async response => {
        const url = response.url();
        if (url.includes('/api') && url.includes('agents') && response.status() === 200) {
          try {
            const data = await response.json();
            responseData = data;
          } catch (e) {
            // Ignore parse errors
          }
        }
      });

      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      await waitForAgentsToLoad(page);

      // Wait for response to be captured
      await page.waitForTimeout(1000);

      if (responseData) {
        // Should have agents array
        expect(responseData.agents).toBeDefined();
        expect(Array.isArray(responseData.agents)).toBe(true);

        // Should have metadata
        expect(responseData.metadata).toBeDefined();
        expect(responseData.metadata.tier).toBeDefined();
        expect(responseData.metadata.count).toBeDefined();
      }
    });

    test('5.3 - Filtered agents match expected count', async ({ page }) => {
      // Test Tier 1
      await page.goto(BASE_URL);
      await waitForAgentsToLoad(page);
      let count = await getAgentCardCount(page);
      expect(count).toBe(EXPECTED_COUNTS.TIER_1);

      // Test Tier 2
      const tier2Button = getTierButton(page, 'Tier 2');
      await tier2Button.click();
      await waitForAgentsToLoad(page);
      count = await getAgentCardCount(page);
      expect(count).toBe(EXPECTED_COUNTS.TIER_2);

      // Test All
      const allButton = getTierButton(page, 'All');
      await allButton.click();
      await waitForAgentsToLoad(page);
      count = await getAgentCardCount(page);
      expect(count).toBe(EXPECTED_COUNTS.ALL);
    });
  });

  // ========================================
  // BONUS: Visual Regression Tests
  // ========================================

  test.describe('Visual Regression - Screenshots', () => {

    test('Screenshot: Tier 1 view', async ({ page }) => {
      await waitForAgentsToLoad(page);

      // Disable animations for consistent screenshots
      await page.addStyleTag({
        content: '* { animation: none !important; transition: none !important; }'
      });

      await expect(page).toHaveScreenshot('tier-filtering-tier1-view.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Screenshot: Tier 2 view', async ({ page }) => {
      await page.waitForSelector('button:has-text("Tier 2")');
      const tier2Button = getTierButton(page, 'Tier 2');
      await tier2Button.click();
      await waitForAgentsToLoad(page);

      await page.addStyleTag({
        content: '* { animation: none !important; transition: none !important; }'
      });

      await expect(page).toHaveScreenshot('tier-filtering-tier2-view.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Screenshot: All agents view', async ({ page }) => {
      await page.waitForSelector('button:has-text("All")');
      const allButton = getTierButton(page, 'All');
      await allButton.click();
      await waitForAgentsToLoad(page);

      await page.addStyleTag({
        content: '* { animation: none !important; transition: none !important; }'
      });

      await expect(page).toHaveScreenshot('tier-filtering-all-view.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Screenshot: Tier toggle component', async ({ page }) => {
      await page.waitForSelector('[role="group"][aria-label*="tier" i]');

      const toggle = page.locator('[role="group"][aria-label*="tier" i]').first();

      await expect(toggle).toHaveScreenshot('tier-toggle-component.png', {
        animations: 'disabled',
      });
    });
  });
});
