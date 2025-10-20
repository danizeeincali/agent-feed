/**
 * TDD E2E Test Suite: Tier Filtering Bug Fix Validation
 * Playwright Tests
 *
 * EXPECTED BEHAVIOR: All tests should FAIL initially (bugs exist)
 * After fix implementation: All tests should PASS
 *
 * User-Reported Issue: "Route Disconnected" error when clicking tier buttons
 * Root Cause: apiService.destroy() called on tier change due to useEffect dependency chain
 */

import { test, expect, Page } from '@playwright/test';

// Helper to wait for API calls to complete
async function waitForApiCall(page: Page, urlPattern: RegExp) {
  return page.waitForResponse(
    response => urlPattern.test(response.url()) && response.status() === 200,
    { timeout: 10000 }
  );
}

// Helper to check for console errors
function setupConsoleErrorTracking(page: Page) {
  const consoleErrors: string[] = [];
  const consoleWarnings: string[] = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    } else if (msg.type() === 'warning') {
      consoleWarnings.push(msg.text());
    }
  });

  return { consoleErrors, consoleWarnings };
}

test.describe('TDD: Tier Filtering Bug Fix Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to agents page
    await page.goto('http://localhost:5173/agents', { waitUntil: 'networkidle' });

    // Wait for initial load
    await page.waitForSelector('[data-testid="isolated-agent-manager"]', { timeout: 10000 });
  });

  test.describe('Bug #1: "Route Disconnected" error on tier change', () => {
    test('should NOT show "Route Disconnected" when clicking T1 button', async ({ page }) => {
      // Arrange: Track console errors
      const { consoleErrors } = setupConsoleErrorTracking(page);

      // Wait for initial agents to load
      await page.waitForSelector('text=Agent Manager', { timeout: 5000 });

      // Act: Click Tier 1 button
      const tier1Button = page.locator('button:has-text("T1")').first();
      await tier1Button.click();

      // Wait a moment for any errors to appear
      await page.waitForTimeout(1000);

      // Assert: Should NOT show "Route Disconnected" error
      // BUG: Currently FAILS - error message IS displayed
      const routeDisconnectedMessage = page.locator('text=Route Disconnected');
      await expect(routeDisconnectedMessage).not.toBeVisible();

      // Should NOT show cleanup message
      const cleanupMessage = page.locator('text=This component has been cleaned up');
      await expect(cleanupMessage).not.toBeVisible();

      // No destroy-related console errors
      const destroyErrors = consoleErrors.filter(err =>
        err.includes('destroyed') || err.includes('Destroying API Service')
      );
      expect(destroyErrors).toHaveLength(0);
    });

    test('should NOT show "Route Disconnected" when clicking T2 button', async ({ page }) => {
      // Arrange
      const { consoleErrors } = setupConsoleErrorTracking(page);

      await page.waitForSelector('text=Agent Manager');

      // Act: Click Tier 2 button
      const tier2Button = page.locator('button:has-text("T2")').first();
      await tier2Button.click();

      await page.waitForTimeout(1000);

      // Assert: Should NOT show error
      // BUG: Currently FAILS - error IS shown
      const routeDisconnectedMessage = page.locator('text=Route Disconnected');
      await expect(routeDisconnectedMessage).not.toBeVisible();

      const cleanupMessage = page.locator('text=This component has been cleaned up');
      await expect(cleanupMessage).not.toBeVisible();

      // No destroy errors in console
      const destroyErrors = consoleErrors.filter(err => err.includes('destroyed'));
      expect(destroyErrors).toHaveLength(0);
    });

    test('should NOT show "Route Disconnected" when clicking All button', async ({ page }) => {
      // Arrange
      const { consoleErrors } = setupConsoleErrorTracking(page);

      await page.waitForSelector('text=Agent Manager');

      // Act: Click All button
      const allButton = page.locator('button:has-text("All")').first();
      await allButton.click();

      await page.waitForTimeout(1000);

      // Assert: Should NOT show error
      const routeDisconnectedMessage = page.locator('text=Route Disconnected');
      await expect(routeDisconnectedMessage).not.toBeVisible();

      const cleanupMessage = page.locator('text=This component has been cleaned up');
      await expect(cleanupMessage).not.toBeVisible();

      expect(consoleErrors.filter(err => err.includes('destroyed'))).toHaveLength(0);
    });

    test('should NOT show "Route Disconnected" during rapid tier changes', async ({ page }) => {
      // Arrange
      await page.waitForSelector('text=Agent Manager');

      // Act: Rapid tier changes (simulating frustrated user clicking)
      const tier2Button = page.locator('button:has-text("T2")').first();
      const allButton = page.locator('button:has-text("All")').first();
      const tier1Button = page.locator('button:has-text("T1")').first();

      await tier2Button.click();
      await page.waitForTimeout(200);

      await allButton.click();
      await page.waitForTimeout(200);

      await tier1Button.click();
      await page.waitForTimeout(200);

      await tier2Button.click();
      await page.waitForTimeout(1000);

      // Assert: Should NEVER show error during any tier change
      const routeDisconnectedMessage = page.locator('text=Route Disconnected');
      await expect(routeDisconnectedMessage).not.toBeVisible();
    });
  });

  test.describe('Bug #2: Agents not displaying after tier change', () => {
    test('should display agents after clicking T1 button', async ({ page }) => {
      // Arrange
      await page.waitForSelector('text=Agent Manager');

      // Act: Click T1 button
      const tier1Button = page.locator('button:has-text("T1")').first();
      await tier1Button.click();

      // Wait for API call
      await page.waitForTimeout(1000);

      // Assert: Should show agents (sidebar should have agent items)
      // BUG: Currently might FAIL if apiService is destroyed
      const agentListSidebar = page.locator('[data-testid="agent-list-sidebar"]');
      await expect(agentListSidebar).toBeVisible();

      // Should have agent items in sidebar
      const agentItems = page.locator('.agent-item, [role="button"]:has-text("Agent")');
      const count = await agentItems.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should display agents after clicking T2 button', async ({ page }) => {
      // Arrange
      await page.waitForSelector('text=Agent Manager');

      // Act: Click T2 button
      const tier2Button = page.locator('button:has-text("T2")').first();
      await tier2Button.click();

      await page.waitForTimeout(1000);

      // Assert: Should show tier 2 agents
      const agentListSidebar = page.locator('[data-testid="agent-list-sidebar"]');
      await expect(agentListSidebar).toBeVisible();

      // Should have agents displayed
      const noAgentsMessage = page.locator('text=No agents available');
      await expect(noAgentsMessage).not.toBeVisible();
    });

    test('should display all agents after clicking All button', async ({ page }) => {
      // Arrange
      await page.waitForSelector('text=Agent Manager');

      // Act: Click All button
      const allButton = page.locator('button:has-text("All")').first();
      await allButton.click();

      await page.waitForTimeout(1000);

      // Assert: Should show all agents (both T1 and T2)
      const agentListSidebar = page.locator('[data-testid="agent-list-sidebar"]');
      await expect(agentListSidebar).toBeVisible();

      // Should have more agents than individual tiers
      const agentItems = page.locator('.agent-item, [role="button"]:has-text("Agent")');
      const count = await agentItems.count();
      expect(count).toBeGreaterThan(5); // Should have at least several agents
    });

    test('should update agent count when switching tiers', async ({ page }) => {
      // Arrange
      await page.waitForSelector('text=Agent Manager');

      // Get initial count (default T1)
      await page.waitForTimeout(500);
      const initialAgents = page.locator('.agent-item, [role="button"]:has-text("Agent")');
      const initialCount = await initialAgents.count();

      // Act: Switch to All
      const allButton = page.locator('button:has-text("All")').first();
      await allButton.click();
      await page.waitForTimeout(1000);

      // Get new count
      const allAgents = page.locator('.agent-item, [role="button"]:has-text("Agent")');
      const allCount = await allAgents.count();

      // Assert: All agents should be more than tier 1 only
      expect(allCount).toBeGreaterThan(initialCount);
    });
  });

  test.describe('Bug #3: Console errors on tier button clicks', () => {
    test('should have NO console errors after clicking T1 button', async ({ page }) => {
      // Arrange: Track console errors
      const { consoleErrors } = setupConsoleErrorTracking(page);

      await page.waitForSelector('text=Agent Manager');

      // Act: Click T1 button
      const tier1Button = page.locator('button:has-text("T1")').first();
      await tier1Button.click();

      await page.waitForTimeout(1000);

      // Assert: No errors in console
      // Filter out non-critical errors (like network timing)
      const criticalErrors = consoleErrors.filter(err =>
        err.includes('destroyed') ||
        err.includes('API Service') ||
        err.includes('Failed to') ||
        err.includes('Error:')
      );

      expect(criticalErrors).toHaveLength(0);
    });

    test('should have NO console errors after clicking T2 button', async ({ page }) => {
      // Arrange
      const { consoleErrors } = setupConsoleErrorTracking(page);

      await page.waitForSelector('text=Agent Manager');

      // Act
      const tier2Button = page.locator('button:has-text("T2")').first();
      await tier2Button.click();

      await page.waitForTimeout(1000);

      // Assert
      const criticalErrors = consoleErrors.filter(err =>
        err.includes('destroyed') ||
        err.includes('API Service') ||
        err.includes('Failed to')
      );

      expect(criticalErrors).toHaveLength(0);
    });

    test('should have NO console errors after clicking All button', async ({ page }) => {
      // Arrange
      const { consoleErrors } = setupConsoleErrorTracking(page);

      await page.waitForSelector('text=Agent Manager');

      // Act
      const allButton = page.locator('button:has-text("All")').first();
      await allButton.click();

      await page.waitForTimeout(1000);

      // Assert
      const criticalErrors = consoleErrors.filter(err =>
        err.includes('destroyed') ||
        err.includes('API Service')
      );

      expect(criticalErrors).toHaveLength(0);
    });

    test('should have NO "Destroying API Service" logs during tier changes', async ({ page }) => {
      // Arrange: Track console logs
      const consoleLogs: string[] = [];

      page.on('console', msg => {
        consoleLogs.push(msg.text());
      });

      await page.waitForSelector('text=Agent Manager');

      // Act: Multiple tier changes
      const tier2Button = page.locator('button:has-text("T2")').first();
      const allButton = page.locator('button:has-text("All")').first();

      await tier2Button.click();
      await page.waitForTimeout(500);

      await allButton.click();
      await page.waitForTimeout(500);

      // Assert: Should NOT see "Destroying API Service" log
      // BUG: Currently FAILS - destroy log IS present
      const destroyLogs = consoleLogs.filter(log =>
        log.includes('🧹 Destroying API Service') ||
        log.includes('Cleaning up IsolatedRealAgentManager')
      );

      expect(destroyLogs).toHaveLength(0);
    });
  });

  test.describe('Bug #4: API status shows "Destroyed" after tier change', () => {
    test('should show API status as "Active" after clicking T1', async ({ page }) => {
      // Arrange
      await page.waitForSelector('text=Agent Manager');

      // Act: Click T1
      const tier1Button = page.locator('button:has-text("T1")').first();
      await tier1Button.click();

      await page.waitForTimeout(1000);

      // Assert: Debug status bar should show "Active"
      const statusText = page.locator('text=API Status:').first();
      await expect(statusText).toContainText('Active');

      // Should NOT contain "Destroyed"
      const destroyedStatus = page.locator('text=API Status: Destroyed');
      await expect(destroyedStatus).not.toBeVisible();
    });

    test('should show API status as "Active" after clicking T2', async ({ page }) => {
      // Arrange
      await page.waitForSelector('text=Agent Manager');

      // Act
      const tier2Button = page.locator('button:has-text("T2")').first();
      await tier2Button.click();

      await page.waitForTimeout(1000);

      // Assert
      const statusText = page.locator('text=API Status:').first();
      await expect(statusText).toContainText('Active');
    });

    test('should maintain Active status through multiple tier changes', async ({ page }) => {
      // Arrange
      await page.waitForSelector('text=Agent Manager');

      // Act: Multiple changes
      const tier2Button = page.locator('button:has-text("T2")').first();
      const allButton = page.locator('button:has-text("All")').first();
      const tier1Button = page.locator('button:has-text("T1")').first();

      await tier2Button.click();
      await page.waitForTimeout(500);

      await allButton.click();
      await page.waitForTimeout(500);

      await tier1Button.click();
      await page.waitForTimeout(1000);

      // Assert: Should ALWAYS show Active
      const statusText = page.locator('text=API Status:').first();
      await expect(statusText).toContainText('Active');

      const destroyedStatus = page.locator('text=Destroyed');
      await expect(destroyedStatus).not.toBeVisible();
    });
  });

  test.describe('Bug #5: Tier buttons become non-clickable', () => {
    test('should keep T1 button clickable after initial click', async ({ page }) => {
      // Arrange
      await page.waitForSelector('text=Agent Manager');

      const tier1Button = page.locator('button:has-text("T1")').first();

      // Act: Click multiple times
      await tier1Button.click();
      await page.waitForTimeout(500);

      await tier1Button.click();
      await page.waitForTimeout(500);

      await tier1Button.click();
      await page.waitForTimeout(500);

      // Assert: Button should still be clickable (not disabled)
      await expect(tier1Button).toBeEnabled();
      await expect(tier1Button).toBeVisible();
    });

    test('should keep all tier buttons clickable after tier changes', async ({ page }) => {
      // Arrange
      await page.waitForSelector('text=Agent Manager');

      const tier1Button = page.locator('button:has-text("T1")').first();
      const tier2Button = page.locator('button:has-text("T2")').first();
      const allButton = page.locator('button:has-text("All")').first();

      // Act: Switch between tiers
      await tier2Button.click();
      await page.waitForTimeout(500);

      await allButton.click();
      await page.waitForTimeout(500);

      // Assert: All buttons should still be enabled
      await expect(tier1Button).toBeEnabled();
      await expect(tier2Button).toBeEnabled();
      await expect(allButton).toBeEnabled();
    });
  });

  test.describe('Visual regression - Screenshots at each tier state', () => {
    test('should capture T1 state without errors', async ({ page }) => {
      // Arrange
      await page.waitForSelector('text=Agent Manager');

      // Act: Click T1
      const tier1Button = page.locator('button:has-text("T1")').first();
      await tier1Button.click();
      await page.waitForTimeout(1000);

      // Assert: Take screenshot
      await page.screenshot({
        path: 'tests/e2e/screenshots/tier-filter-bug-fix-t1-state.png',
        fullPage: true
      });

      // Should NOT see error message in screenshot
      const routeDisconnectedMessage = page.locator('text=Route Disconnected');
      await expect(routeDisconnectedMessage).not.toBeVisible();
    });

    test('should capture T2 state without errors', async ({ page }) => {
      // Arrange
      await page.waitForSelector('text=Agent Manager');

      // Act: Click T2
      const tier2Button = page.locator('button:has-text("T2")').first();
      await tier2Button.click();
      await page.waitForTimeout(1000);

      // Assert: Take screenshot
      await page.screenshot({
        path: 'tests/e2e/screenshots/tier-filter-bug-fix-t2-state.png',
        fullPage: true
      });

      const routeDisconnectedMessage = page.locator('text=Route Disconnected');
      await expect(routeDisconnectedMessage).not.toBeVisible();
    });

    test('should capture All state without errors', async ({ page }) => {
      // Arrange
      await page.waitForSelector('text=Agent Manager');

      // Act: Click All
      const allButton = page.locator('button:has-text("All")').first();
      await allButton.click();
      await page.waitForTimeout(1000);

      // Assert: Take screenshot
      await page.screenshot({
        path: 'tests/e2e/screenshots/tier-filter-bug-fix-all-state.png',
        fullPage: true
      });

      const routeDisconnectedMessage = page.locator('text=Route Disconnected');
      await expect(routeDisconnectedMessage).not.toBeVisible();
    });

    test('should capture tier transition sequence', async ({ page }) => {
      // Arrange
      await page.waitForSelector('text=Agent Manager');

      // Act & Screenshot: T1
      const tier1Button = page.locator('button:has-text("T1")').first();
      await tier1Button.click();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: 'tests/e2e/screenshots/tier-sequence-1-t1.png',
        fullPage: true
      });

      // T2
      const tier2Button = page.locator('button:has-text("T2")').first();
      await tier2Button.click();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: 'tests/e2e/screenshots/tier-sequence-2-t2.png',
        fullPage: true
      });

      // All
      const allButton = page.locator('button:has-text("All")').first();
      await allButton.click();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: 'tests/e2e/screenshots/tier-sequence-3-all.png',
        fullPage: true
      });

      // Assert: No errors in any state
      const routeDisconnectedMessage = page.locator('text=Route Disconnected');
      await expect(routeDisconnectedMessage).not.toBeVisible();
    });
  });

  test.describe('User workflow validation', () => {
    test('should complete full user workflow: browse tiers, select agent, view details', async ({ page }) => {
      // Arrange
      await page.waitForSelector('text=Agent Manager');

      // Act: User browses tier 1
      const tier1Button = page.locator('button:has-text("T1")').first();
      await tier1Button.click();
      await page.waitForTimeout(500);

      // User switches to tier 2
      const tier2Button = page.locator('button:has-text("T2")').first();
      await tier2Button.click();
      await page.waitForTimeout(500);

      // User views all agents
      const allButton = page.locator('button:has-text("All")').first();
      await allButton.click();
      await page.waitForTimeout(500);

      // User selects an agent (click first agent in sidebar)
      const firstAgent = page.locator('.agent-item, [role="button"]:has-text("Agent")').first();
      if (await firstAgent.isVisible()) {
        await firstAgent.click();
        await page.waitForTimeout(500);
      }

      // Assert: Should complete without errors
      const routeDisconnectedMessage = page.locator('text=Route Disconnected');
      await expect(routeDisconnectedMessage).not.toBeVisible();

      // Agent details should be visible
      const agentProfile = page.locator('[data-testid="agent-profile"]');
      await expect(agentProfile).toBeVisible();
    });
  });
});
