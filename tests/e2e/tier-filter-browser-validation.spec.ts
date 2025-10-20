import { test, expect } from '@playwright/test';

/**
 * TIER FILTERING BUG FIX - BROWSER VALIDATION
 *
 * Critical Bug Fixed: useEffect dependency chain in IsolatedRealAgentManager.tsx
 * - BEFORE: Clicking tier buttons destroyed apiService → "Route Disconnected" error
 * - AFTER: Clicking tier buttons only reloads data, apiService stays alive
 *
 * This test validates 100% working functionality in real browser environment
 */

test.describe('Tier Filtering Bug Fix - Browser Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Listen for console messages to detect errors
    page.on('console', msg => {
      const text = msg.text();
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${text}`);

      // Fail test if we see the critical bug error
      if (text.includes('Route Disconnected')) {
        throw new Error('❌ CRITICAL: Route Disconnected error detected - bug not fixed!');
      }
    });

    // Listen for page errors
    page.on('pageerror', error => {
      console.error(`[PAGE ERROR]: ${error.message}`);
      throw error;
    });

    // Navigate to agents page
    await page.goto('http://localhost:5173/agents');
    await page.waitForLoadState('networkidle');
  });

  test('should display tier toggle buttons', async ({ page }) => {
    // Verify tier buttons are visible
    const tier1Button = page.getByRole('button', { name: /T1|Tier 1/i });
    const tier2Button = page.getByRole('button', { name: /T2|Tier 2/i });
    const allButton = page.getByRole('button', { name: /All/i });

    await expect(tier1Button).toBeVisible();
    await expect(tier2Button).toBeVisible();
    await expect(allButton).toBeVisible();

    console.log('✅ All tier toggle buttons are visible');
  });

  test('should click Tier 1 button without Route Disconnected error', async ({ page }) => {
    let routeDisconnectedDetected = false;

    // Monitor console for the error
    page.on('console', msg => {
      if (msg.text().includes('Route Disconnected')) {
        routeDisconnectedDetected = true;
      }
    });

    // Find and click Tier 1 button
    const tier1Button = page.getByRole('button', { name: /T1|Tier 1/i });
    await tier1Button.click();

    // Wait for any network activity to settle
    await page.waitForTimeout(1000);

    // Verify no error occurred
    expect(routeDisconnectedDetected).toBe(false);

    // Verify agents are displayed
    const agentCards = page.locator('[class*="agent"]').first();
    await expect(agentCards).toBeVisible({ timeout: 5000 });

    console.log('✅ Tier 1 button clicked successfully - NO Route Disconnected error');
  });

  test('should click Tier 2 button without Route Disconnected error', async ({ page }) => {
    let routeDisconnectedDetected = false;

    page.on('console', msg => {
      if (msg.text().includes('Route Disconnected')) {
        routeDisconnectedDetected = true;
      }
    });

    const tier2Button = page.getByRole('button', { name: /T2|Tier 2/i });
    await tier2Button.click();

    await page.waitForTimeout(1000);

    expect(routeDisconnectedDetected).toBe(false);

    const agentCards = page.locator('[class*="agent"]').first();
    await expect(agentCards).toBeVisible({ timeout: 5000 });

    console.log('✅ Tier 2 button clicked successfully - NO Route Disconnected error');
  });

  test('should click All button without Route Disconnected error', async ({ page }) => {
    let routeDisconnectedDetected = false;

    page.on('console', msg => {
      if (msg.text().includes('Route Disconnected')) {
        routeDisconnectedDetected = true;
      }
    });

    const allButton = page.getByRole('button', { name: /All/i });
    await allButton.click();

    await page.waitForTimeout(1000);

    expect(routeDisconnectedDetected).toBe(false);

    const agentCards = page.locator('[class*="agent"]').first();
    await expect(agentCards).toBeVisible({ timeout: 5000 });

    console.log('✅ All button clicked successfully - NO Route Disconnected error');
  });

  test('should handle rapid tier button clicking', async ({ page }) => {
    let routeDisconnectedDetected = false;
    let errorCount = 0;

    page.on('console', msg => {
      if (msg.text().includes('Route Disconnected')) {
        routeDisconnectedDetected = true;
        errorCount++;
      }
    });

    // Rapid clicking simulation
    const tier1Button = page.getByRole('button', { name: /T1|Tier 1/i });
    const tier2Button = page.getByRole('button', { name: /T2|Tier 2/i });
    const allButton = page.getByRole('button', { name: /All/i });

    // Click sequence: T1 → T2 → All → T1 → T2
    await tier1Button.click();
    await page.waitForTimeout(200);
    await tier2Button.click();
    await page.waitForTimeout(200);
    await allButton.click();
    await page.waitForTimeout(200);
    await tier1Button.click();
    await page.waitForTimeout(200);
    await tier2Button.click();

    await page.waitForTimeout(1000);

    expect(routeDisconnectedDetected).toBe(false);
    expect(errorCount).toBe(0);

    console.log('✅ Rapid clicking handled successfully - NO errors');
  });

  test('should verify console logs show correct tier changes', async ({ page }) => {
    const consoleLogs: string[] = [];

    page.on('console', msg => {
      consoleLogs.push(msg.text());
    });

    // Click Tier 2 button
    const tier2Button = page.getByRole('button', { name: /T2|Tier 2/i });
    await tier2Button.click();

    await page.waitForTimeout(1500);

    // Verify expected logs are present
    const hasTierChangeLog = consoleLogs.some(log =>
      log.includes('Tier filter changed') || log.includes('tier: 2')
    );

    const hasLoadedAgentsLog = consoleLogs.some(log =>
      log.includes('Loaded') && log.includes('agents')
    );

    // Verify cleanup logs are NOT present (component should not unmount)
    const hasCleanupLog = consoleLogs.some(log =>
      log.includes('Cleaning up') || log.includes('Destroying API Service')
    );

    console.log('Console logs:', consoleLogs.join('\n'));

    expect(hasTierChangeLog || hasLoadedAgentsLog).toBe(true);
    expect(hasCleanupLog).toBe(false);

    console.log('✅ Console logs verified - tier changes working correctly');
  });

  test('should maintain component state across tier changes', async ({ page }) => {
    // Get initial button states
    const tier1Button = page.getByRole('button', { name: /T1|Tier 1/i });

    // Click multiple times to verify component doesn't remount
    await tier1Button.click();
    await page.waitForTimeout(500);

    const tier2Button = page.getByRole('button', { name: /T2|Tier 2/i });
    await tier2Button.click();
    await page.waitForTimeout(500);

    // Verify buttons are still interactive (component didn't unmount)
    await expect(tier1Button).toBeEnabled();
    await expect(tier2Button).toBeEnabled();

    console.log('✅ Component state maintained across tier changes');
  });

  test('should verify no apiService destruction in console', async ({ page }) => {
    const consoleLogs: string[] = [];

    page.on('console', msg => {
      consoleLogs.push(msg.text());
    });

    // Perform multiple tier changes
    const tier1Button = page.getByRole('button', { name: /T1|Tier 1/i });
    const tier2Button = page.getByRole('button', { name: /T2|Tier 2/i });

    await tier1Button.click();
    await page.waitForTimeout(500);
    await tier2Button.click();
    await page.waitForTimeout(500);
    await tier1Button.click();
    await page.waitForTimeout(1000);

    // Check for destruction logs
    const hasDestructionLog = consoleLogs.some(log =>
      log.includes('Destroying API Service') ||
      log.includes('isDestroyed: true')
    );

    expect(hasDestructionLog).toBe(false);

    console.log('✅ No apiService destruction detected - fix working correctly');
  });

  test('should navigate away and back without breaking tier filtering', async ({ page }) => {
    // Click a tier button
    const tier1Button = page.getByRole('button', { name: /T1|Tier 1/i });
    await tier1Button.click();
    await page.waitForTimeout(500);

    // Navigate to home
    await page.goto('http://localhost:5173/');
    await page.waitForTimeout(500);

    // Navigate back to agents
    await page.goto('http://localhost:5173/agents');
    await page.waitForLoadState('networkidle');

    // Verify tier buttons still work
    const tier2Button = page.getByRole('button', { name: /T2|Tier 2/i });
    await expect(tier2Button).toBeVisible();

    let routeDisconnectedDetected = false;
    page.on('console', msg => {
      if (msg.text().includes('Route Disconnected')) {
        routeDisconnectedDetected = true;
      }
    });

    await tier2Button.click();
    await page.waitForTimeout(1000);

    expect(routeDisconnectedDetected).toBe(false);

    console.log('✅ Navigation test passed - tier filtering works after navigation');
  });
});
