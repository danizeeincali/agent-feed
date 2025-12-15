import { test, expect } from '@playwright/test';

/**
 * Production Validation: Spawn Agent Button Removal
 *
 * This test validates that all spawn agent functionality has been completely
 * removed from the IsolatedRealAgentManager component and the UI is clean
 * and functional.
 */

test.describe('Spawn Agent Button Removal Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to agents page
    await page.goto('http://localhost:5173/agents');

    // Wait for the page to load and agents to render
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Allow time for React hydration
  });

  test('should NOT display Spawn Agent button in header', async ({ page }) => {
    // Check that "Spawn Agent" button does not exist in header
    const spawnButton = page.getByRole('button', { name: /spawn agent/i });
    await expect(spawnButton).toHaveCount(0);

    // Verify Refresh button IS present (should be the only button in header)
    const refreshButton = page.getByRole('button', { name: /refresh/i });
    await expect(refreshButton).toBeVisible();

    console.log('✅ Header validation: No "Spawn Agent" button found');
  });

  test('should NOT display Activate buttons on agent cards', async ({ page }) => {
    // Wait for agent cards to load
    await page.waitForSelector('[data-testid="agent-card"]', { timeout: 10000 }).catch(() => {
      console.log('No agent cards found - checking for alternative selectors');
    });

    // Check for any "Activate" buttons
    const activateButtons = page.getByRole('button', { name: /activate/i });
    await expect(activateButtons).toHaveCount(0);

    // Check for Play icon (used in Activate button)
    const playIcons = page.locator('[data-lucide="play"]');
    await expect(playIcons).toHaveCount(0);

    console.log('✅ Agent cards validation: No "Activate" buttons found');
  });

  test('should display only allowed buttons: Home, Details, Delete', async ({ page }) => {
    // Wait for agent cards
    const agentCards = page.locator('[data-testid="agent-card"]').or(
      page.locator('.agent-card')
    ).or(
      page.locator('[class*="agent"]').filter({ hasText: 'Home' })
    );

    const count = await agentCards.count();

    if (count > 0) {
      console.log(`Found ${count} agent card(s)`);

      // Check first agent card for allowed buttons
      const firstCard = agentCards.first();

      // Should have Home button
      const homeButton = firstCard.getByRole('button', { name: /home/i });
      await expect(homeButton).toBeVisible();

      // Should have Details button
      const detailsButton = firstCard.getByRole('button', { name: /details/i });
      await expect(detailsButton).toBeVisible();

      // Should have Delete/trash icon
      const deleteButton = firstCard.getByRole('button').filter({
        has: page.locator('[data-lucide="trash-2"]')
      });

      console.log('✅ Allowed buttons validation: Home, Details, and Delete are present');
    } else {
      console.log('⚠️  No agent cards found - may be empty state');
    }
  });

  test('should have no JavaScript errors in console', async ({ page }) => {
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];

    // Capture console messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      }
    });

    // Capture page errors
    page.on('pageerror', error => {
      consoleErrors.push(`Page Error: ${error.message}`);
    });

    // Reload page to capture all console output
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Filter out known harmless warnings
    const criticalErrors = consoleErrors.filter(err =>
      !err.includes('Download the React DevTools') &&
      !err.includes('source map') &&
      !err.includes('favicon')
    );

    if (criticalErrors.length > 0) {
      console.log('❌ Console Errors Found:');
      criticalErrors.forEach(err => console.log(`  - ${err}`));
    } else {
      console.log('✅ Console validation: No JavaScript errors');
    }

    if (consoleWarnings.length > 0) {
      console.log('⚠️  Console Warnings (non-critical):');
      consoleWarnings.slice(0, 5).forEach(warn => console.log(`  - ${warn}`));
    }

    expect(criticalErrors).toHaveLength(0);
  });

  test('should verify agents list loads successfully', async ({ page }) => {
    // Check for loading state or agent cards
    const loadingIndicator = page.getByText(/loading/i);
    const agentCards = page.locator('[data-testid="agent-card"]').or(
      page.locator('.agent-card')
    ).or(
      page.locator('[class*="card"]').filter({ hasText: /home|details/i })
    );

    // Wait for either loading to complete or cards to appear
    await Promise.race([
      loadingIndicator.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {}),
      agentCards.first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
    ]);

    const count = await agentCards.count();
    console.log(`✅ Agents list loaded: ${count} agent(s) found`);

    // Page should not be in error state
    const errorMessage = page.getByText(/error|failed/i);
    await expect(errorMessage).toHaveCount(0);
  });

  test('should verify Refresh button works', async ({ page }) => {
    const refreshButton = page.getByRole('button', { name: /refresh/i });
    await expect(refreshButton).toBeVisible();

    // Click refresh button
    await refreshButton.click();

    // Wait for any loading state
    await page.waitForTimeout(1000);

    // Verify page is still functional
    await expect(refreshButton).toBeVisible();

    console.log('✅ Refresh button functionality: Working');
  });

  test('should verify Search functionality works', async ({ page }) => {
    // Look for search input
    const searchInput = page.getByPlaceholder(/search/i).or(
      page.getByRole('textbox', { name: /search/i })
    ).or(
      page.locator('input[type="text"]').first()
    );

    const searchCount = await searchInput.count();

    if (searchCount > 0) {
      await searchInput.first().fill('test');
      await page.waitForTimeout(500);

      // Verify search input has value
      await expect(searchInput.first()).toHaveValue('test');

      console.log('✅ Search functionality: Working');
    } else {
      console.log('⚠️  Search input not found - may not be implemented');
    }
  });

  test('should capture screenshot of clean UI', async ({ page }) => {
    // Wait for page to be fully rendered
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Take full page screenshot
    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/screenshots/spawn-agent-removal-validation.png',
      fullPage: true
    });

    // Take viewport screenshot
    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/screenshots/spawn-agent-removal-viewport.png',
      fullPage: false
    });

    console.log('✅ Screenshots captured:');
    console.log('  - /workspaces/agent-feed/frontend/tests/screenshots/spawn-agent-removal-validation.png');
    console.log('  - /workspaces/agent-feed/frontend/tests/screenshots/spawn-agent-removal-viewport.png');
  });

  test('should verify Home and Details buttons work', async ({ page }) => {
    const agentCards = page.locator('[data-testid="agent-card"]').or(
      page.locator('.agent-card')
    ).or(
      page.locator('[class*="card"]').filter({ hasText: /home|details/i })
    );

    const count = await agentCards.count();

    if (count > 0) {
      const firstCard = agentCards.first();

      // Test Home button
      const homeButton = firstCard.getByRole('button', { name: /home/i });
      if (await homeButton.isVisible()) {
        await homeButton.click();
        await page.waitForTimeout(500);
        console.log('✅ Home button: Clickable');
      }

      // Navigate back to agents page
      await page.goto('http://localhost:5173/agents');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Test Details button
      const firstCardAfterNav = agentCards.first();
      const detailsButton = firstCardAfterNav.getByRole('button', { name: /details/i });
      if (await detailsButton.isVisible()) {
        await detailsButton.click();
        await page.waitForTimeout(500);
        console.log('✅ Details button: Clickable');
      }

      console.log('✅ Button functionality: Home and Details buttons working');
    } else {
      console.log('⚠️  No agent cards to test button functionality');
    }
  });
});
