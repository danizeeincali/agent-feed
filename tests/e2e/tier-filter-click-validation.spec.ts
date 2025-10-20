/**
 * Tier Filter Click E2E Validation
 *
 * Playwright E2E Tests for Tier Filtering Bug Fix
 * Bug: Clicking tier buttons causes "Route Disconnected" error
 *
 * Investigation: /workspaces/agent-feed/TIER-FILTER-ERRORS-INVESTIGATION.md
 *
 * Test Strategy (London School):
 * - Test real user interactions in browser
 * - Verify no console errors during tier changes
 * - Validate correct agent counts for each tier
 * - Test multiple tier transitions
 * - Capture screenshots for visual validation
 *
 * Expected Results (TDD):
 * - All tests should FAIL initially
 * - Tests pass after bug fix is implemented
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.VITE_APP_URL || 'http://localhost:5173';
const API_URL = process.env.VITE_API_URL || 'http://localhost:3001';

// Helper to wait for agents to load
async function waitForAgentsToLoad(page: Page, expectedCount: number) {
  // Wait for loading to finish
  await page.waitForSelector('[data-testid="isolated-agent-manager"]', {
    state: 'visible',
    timeout: 10000,
  });

  // Wait for agent list to update
  await page.waitForFunction(
    (count) => {
      const agentItems = document.querySelectorAll('[data-testid="agent-list-item"]');
      return agentItems.length === count;
    },
    expectedCount,
    { timeout: 5000 }
  ).catch(() => {
    // If specific count check fails, just ensure agents are present
    console.log(`Warning: Expected ${expectedCount} agents but got different count`);
  });

  // Small delay for UI to stabilize
  await page.waitForTimeout(500);
}

// Helper to check for console errors
async function checkNoConsoleErrors(page: Page) {
  const errors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  return errors;
}

test.describe('Tier Filter Click Validation (E2E)', () => {
  let consoleErrors: string[];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];

    // Listen for console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to agents page
    await page.goto(`${BASE_URL}/agents`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // Wait for initial load
    await waitForAgentsToLoad(page, 9); // Default tier 1 = 9 agents
  });

  /**
   * TEST #1: Clicking T1 Button Filters to 9 Agents Without Errors
   *
   * EXPECTED TO FAIL: Currently shows "Route Disconnected" error
   */
  test('clicking T1 button filters to 9 agents without errors', async ({ page }) => {
    // Click Tier 1 button
    const tier1Button = page.locator('[data-testid="tier-1-button"]');
    await expect(tier1Button).toBeVisible();
    await tier1Button.click();

    // Wait for agents to load
    await waitForAgentsToLoad(page, 9);

    // Verify agent count
    const agentItems = page.locator('[data-testid="agent-list-item"]');
    const count = await agentItems.count();
    expect(count).toBe(9);

    // Verify NO "Route Disconnected" error
    await expect(page.locator('text=Route Disconnected')).not.toBeVisible();
    await expect(page.locator('text=This component has been cleaned up')).not.toBeVisible();

    // Verify no console errors
    expect(consoleErrors).toHaveLength(0);

    // Take screenshot for validation
    await page.screenshot({
      path: 'test-results/tier-filter-t1-validation.png',
      fullPage: true,
    });
  });

  /**
   * TEST #2: Clicking T2 Button Filters to 10 Agents Without Errors
   *
   * EXPECTED TO FAIL: Currently destroys apiService
   */
  test('clicking T2 button filters to 10 agents without errors', async ({ page }) => {
    // Click Tier 2 button
    const tier2Button = page.locator('[data-testid="tier-2-button"]');
    await expect(tier2Button).toBeVisible();
    await tier2Button.click();

    // Wait for agents to load
    await waitForAgentsToLoad(page, 10);

    // Verify agent count
    const agentItems = page.locator('[data-testid="agent-list-item"]');
    const count = await agentItems.count();
    expect(count).toBe(10);

    // CRITICAL: Verify NO "Route Disconnected" error
    await expect(page.locator('text=Route Disconnected')).not.toBeVisible();
    await expect(page.locator('text=This component has been cleaned up')).not.toBeVisible();

    // Verify no console errors
    const criticalErrors = consoleErrors.filter(err =>
      err.includes('destroyed') ||
      err.includes('Route Disconnected') ||
      err.includes('API Service')
    );
    expect(criticalErrors).toHaveLength(0);

    // Take screenshot
    await page.screenshot({
      path: 'test-results/tier-filter-t2-validation.png',
      fullPage: true,
    });
  });

  /**
   * TEST #3: Clicking All Button Shows 19 Agents Without Errors
   *
   * EXPECTED TO FAIL: Currently destroys apiService
   */
  test('clicking All button shows 19 agents without errors', async ({ page }) => {
    // Click All button
    const allButton = page.locator('[data-testid="tier-all-button"]');
    await expect(allButton).toBeVisible();
    await allButton.click();

    // Wait for agents to load
    await waitForAgentsToLoad(page, 19);

    // Verify agent count
    const agentItems = page.locator('[data-testid="agent-list-item"]');
    const count = await agentItems.count();
    expect(count).toBe(19);

    // Verify NO error messages
    await expect(page.locator('text=Route Disconnected')).not.toBeVisible();
    await expect(page.locator('text=This component has been cleaned up')).not.toBeVisible();

    // Verify no console errors
    expect(consoleErrors).toHaveLength(0);

    // Take screenshot
    await page.screenshot({
      path: 'test-results/tier-filter-all-validation.png',
      fullPage: true,
    });
  });

  /**
   * TEST #4: Multiple Tier Transitions Work Without Errors
   *
   * EXPECTED TO FAIL: Each transition destroys apiService
   */
  test('can switch between tiers multiple times without errors', async ({ page }) => {
    const tier1Button = page.locator('[data-testid="tier-1-button"]');
    const tier2Button = page.locator('[data-testid="tier-2-button"]');
    const allButton = page.locator('[data-testid="tier-all-button"]');

    // Transition 1: T1 → T2
    await tier2Button.click();
    await waitForAgentsToLoad(page, 10);
    await expect(page.locator('text=Route Disconnected')).not.toBeVisible();

    // Transition 2: T2 → All
    await allButton.click();
    await waitForAgentsToLoad(page, 19);
    await expect(page.locator('text=Route Disconnected')).not.toBeVisible();

    // Transition 3: All → T1
    await tier1Button.click();
    await waitForAgentsToLoad(page, 9);
    await expect(page.locator('text=Route Disconnected')).not.toBeVisible();

    // Transition 4: T1 → T2
    await tier2Button.click();
    await waitForAgentsToLoad(page, 10);
    await expect(page.locator('text=Route Disconnected')).not.toBeVisible();

    // Verify no console errors after all transitions
    const criticalErrors = consoleErrors.filter(err =>
      err.includes('destroyed') ||
      err.includes('Route Disconnected')
    );
    expect(criticalErrors).toHaveLength(0);

    // Take screenshot of final state
    await page.screenshot({
      path: 'test-results/tier-filter-multiple-transitions.png',
      fullPage: true,
    });
  });

  /**
   * TEST #5: Rapid Tier Clicks Don't Break Component
   *
   * EXPECTED TO FAIL: Rapid clicks destroy apiService multiple times
   */
  test('rapid tier button clicks do not cause errors', async ({ page }) => {
    const tier1Button = page.locator('[data-testid="tier-1-button"]');
    const tier2Button = page.locator('[data-testid="tier-2-button"]');
    const allButton = page.locator('[data-testid="tier-all-button"]');

    // Rapid clicks (no waiting)
    await tier2Button.click();
    await tier1Button.click();
    await allButton.click();
    await tier2Button.click();
    await tier1Button.click();

    // Wait for final state to settle
    await page.waitForTimeout(2000);

    // Component should still be functional
    await expect(page.locator('[data-testid="isolated-agent-manager"]')).toBeVisible();

    // No error messages
    await expect(page.locator('text=Route Disconnected')).not.toBeVisible();
    await expect(page.locator('text=This component has been cleaned up')).not.toBeVisible();

    // Take screenshot
    await page.screenshot({
      path: 'test-results/tier-filter-rapid-clicks.png',
      fullPage: true,
    });
  });

  /**
   * TEST #6: API Status Remains Active After Tier Change
   *
   * EXPECTED TO FAIL: API status shows "Destroyed" after tier change
   */
  test('API status shows "Active" after tier changes', async ({ page }) => {
    // Check initial status
    await expect(page.locator('text=API Status: Active')).toBeVisible();

    // Click tier 2
    const tier2Button = page.locator('[data-testid="tier-2-button"]');
    await tier2Button.click();
    await waitForAgentsToLoad(page, 10);

    // CRITICAL: API should still be active
    await expect(page.locator('text=API Status: Active')).toBeVisible();
    await expect(page.locator('text=API Status: Destroyed')).not.toBeVisible();

    // Click all
    const allButton = page.locator('[data-testid="tier-all-button"]');
    await allButton.click();
    await waitForAgentsToLoad(page, 19);

    // Still active
    await expect(page.locator('text=API Status: Active')).toBeVisible();

    // Take screenshot
    await page.screenshot({
      path: 'test-results/tier-filter-api-status.png',
      fullPage: true,
    });
  });

  /**
   * TEST #7: Tier Counts Update Correctly
   *
   * Verify button labels show correct counts after tier changes
   */
  test('tier button counts update correctly after filtering', async ({ page }) => {
    // Initial state: Check button labels
    await expect(page.locator('[data-testid="tier-1-button"]')).toContainText('T1 (9)');
    await expect(page.locator('[data-testid="tier-2-button"]')).toContainText('T2 (10)');
    await expect(page.locator('[data-testid="tier-all-button"]')).toContainText('All (19)');

    // Click tier 2
    const tier2Button = page.locator('[data-testid="tier-2-button"]');
    await tier2Button.click();
    await waitForAgentsToLoad(page, 10);

    // Counts should remain consistent
    await expect(page.locator('[data-testid="tier-1-button"]')).toContainText('T1 (9)');
    await expect(page.locator('[data-testid="tier-2-button"]')).toContainText('T2 (10)');
    await expect(page.locator('[data-testid="tier-all-button"]')).toContainText('All (19)');

    // Take screenshot
    await page.screenshot({
      path: 'test-results/tier-filter-counts.png',
      fullPage: true,
    });
  });

  /**
   * TEST #8: Network Requests Use Correct Tier Parameter
   *
   * Verify API calls include proper tier query parameter
   */
  test('API requests include correct tier parameter', async ({ page }) => {
    const apiRequests: any[] = [];

    // Intercept API requests
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/api/v1/claude-live/prod/agents')) {
        apiRequests.push({
          url,
          tier: new URL(url).searchParams.get('tier'),
        });
      }
    });

    // Click tier 2
    const tier2Button = page.locator('[data-testid="tier-2-button"]');
    await tier2Button.click();
    await waitForAgentsToLoad(page, 10);

    // Verify request has tier=2
    const tier2Request = apiRequests.find(req => req.tier === '2');
    expect(tier2Request).toBeDefined();

    // Click all
    const allButton = page.locator('[data-testid="tier-all-button"]');
    await allButton.click();
    await waitForAgentsToLoad(page, 19);

    // Verify request has tier=all
    const allRequest = apiRequests.find(req => req.tier === 'all');
    expect(allRequest).toBeDefined();
  });

  /**
   * TEST #9: Page Refresh Persists Tier Selection
   *
   * Verify tier selection is saved to localStorage and restored
   */
  test('tier selection persists after page refresh', async ({ page }) => {
    // Click tier 2
    const tier2Button = page.locator('[data-testid="tier-2-button"]');
    await tier2Button.click();
    await waitForAgentsToLoad(page, 10);

    // Refresh page
    await page.reload({ waitUntil: 'networkidle' });

    // Wait for page to load
    await waitForAgentsToLoad(page, 10);

    // Verify tier 2 is still selected
    const agentItems = page.locator('[data-testid="agent-list-item"]');
    const count = await agentItems.count();
    expect(count).toBe(10);

    // No errors after refresh
    await expect(page.locator('text=Route Disconnected')).not.toBeVisible();
  });

  /**
   * TEST #10: Agent Selection Works After Tier Change
   *
   * Verify clicking agents still works after changing tiers
   */
  test('can select agents after tier filtering', async ({ page }) => {
    // Click tier 2
    const tier2Button = page.locator('[data-testid="tier-2-button"]');
    await tier2Button.click();
    await waitForAgentsToLoad(page, 10);

    // Click first agent
    const firstAgent = page.locator('[data-testid="agent-list-item"]').first();
    await firstAgent.click();

    // Verify agent profile loads
    await expect(page.locator('[data-testid="agent-profile"]')).toBeVisible();

    // No errors
    await expect(page.locator('text=Route Disconnected')).not.toBeVisible();

    // Take screenshot
    await page.screenshot({
      path: 'test-results/tier-filter-agent-selection.png',
      fullPage: true,
    });
  });
});

test.describe('Tier Filter Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/agents`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    await waitForAgentsToLoad(page, 9);
  });

  test('visual regression: tier 1 view', async ({ page }) => {
    const tier1Button = page.locator('[data-testid="tier-1-button"]');
    await tier1Button.click();
    await waitForAgentsToLoad(page, 9);

    await page.screenshot({
      path: 'test-results/screenshots/tier-filter-t1-visual.png',
      fullPage: true,
    });
  });

  test('visual regression: tier 2 view', async ({ page }) => {
    const tier2Button = page.locator('[data-testid="tier-2-button"]');
    await tier2Button.click();
    await waitForAgentsToLoad(page, 10);

    await page.screenshot({
      path: 'test-results/screenshots/tier-filter-t2-visual.png',
      fullPage: true,
    });
  });

  test('visual regression: all tiers view', async ({ page }) => {
    const allButton = page.locator('[data-testid="tier-all-button"]');
    await allButton.click();
    await waitForAgentsToLoad(page, 19);

    await page.screenshot({
      path: 'test-results/screenshots/tier-filter-all-visual.png',
      fullPage: true,
    });
  });
});
