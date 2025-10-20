import { test, expect } from '@playwright/test';

/**
 * TIER FILTERING BUG FIX - SIMPLE BROWSER VALIDATION
 *
 * Validates that clicking tier buttons does NOT cause "Route Disconnected" error
 */

test.describe('Tier Filter Bug Fix - Simple Validation', () => {
  let consoleErrors: string[] = [];
  let routeDisconnectedFound = false;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    routeDisconnectedFound = false;

    // Capture console messages
    page.on('console', msg => {
      const text = msg.text();

      if (msg.type() === 'error' || text.includes('error') || text.includes('Error')) {
        consoleErrors.push(text);

        if (text.includes('Route Disconnected')) {
          routeDisconnectedFound = true;
          console.log('❌ CRITICAL BUG DETECTED: Route Disconnected error found!');
        }
      }

      // Log important messages
      if (text.includes('Tier filter changed') ||
          text.includes('Loaded') ||
          text.includes('Cleaning up') ||
          text.includes('Destroying')) {
        console.log(`[BROWSER LOG]: ${text}`);
      }
    });

    await page.goto('http://localhost:5173/agents', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000); // Let page stabilize
  });

  test('should NOT show Route Disconnected when clicking Tier 1', async ({ page }) => {
    // Find tier button - use first() to avoid strict mode violation
    const tier1Button = page.getByRole('button', { name: /Tier 1|T1/i }).first();

    await expect(tier1Button).toBeVisible({ timeout: 10000 });

    // Clear errors before clicking
    consoleErrors = [];
    routeDisconnectedFound = false;

    // Click the button
    await tier1Button.click();

    // Wait for response
    await page.waitForTimeout(2000);

    // Verify NO Route Disconnected error
    expect(routeDisconnectedFound).toBe(false);

    const routeDisconnectedErrors = consoleErrors.filter(e => e.includes('Route Disconnected'));
    expect(routeDisconnectedErrors.length).toBe(0);

    console.log('✅ TEST PASSED: Tier 1 click - NO Route Disconnected error');
  });

  test('should NOT show Route Disconnected when clicking Tier 2', async ({ page }) => {
    const tier2Button = page.getByRole('button', { name: /Tier 2|T2/i }).first();

    await expect(tier2Button).toBeVisible({ timeout: 10000 });

    consoleErrors = [];
    routeDisconnectedFound = false;

    await tier2Button.click();
    await page.waitForTimeout(2000);

    expect(routeDisconnectedFound).toBe(false);

    const routeDisconnectedErrors = consoleErrors.filter(e => e.includes('Route Disconnected'));
    expect(routeDisconnectedErrors.length).toBe(0);

    console.log('✅ TEST PASSED: Tier 2 click - NO Route Disconnected error');
  });

  test('should NOT show Route Disconnected when clicking All', async ({ page }) => {
    const allButton = page.getByRole('button', { name: /All/i }).first();

    await expect(allButton).toBeVisible({ timeout: 10000 });

    consoleErrors = [];
    routeDisconnectedFound = false;

    await allButton.click();
    await page.waitForTimeout(2000);

    expect(routeDisconnectedFound).toBe(false);

    const routeDisconnectedErrors = consoleErrors.filter(e => e.includes('Route Disconnected'));
    expect(routeDisconnectedErrors.length).toBe(0);

    console.log('✅ TEST PASSED: All click - NO Route Disconnected error');
  });

  test('should NOT show Cleaning up or Destroying logs on tier change', async ({ page }) => {
    const cleanupLogs: string[] = [];

    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Cleaning up') || text.includes('Destroying API Service')) {
        cleanupLogs.push(text);
      }
    });

    const tier1Button = page.getByRole('button', { name: /Tier 1|T1/i }).first();
    const tier2Button = page.getByRole('button', { name: /Tier 2|T2/i }).first();

    await tier1Button.click();
    await page.waitForTimeout(1000);
    await tier2Button.click();
    await page.waitForTimeout(1000);

    expect(cleanupLogs.length).toBe(0);

    console.log('✅ TEST PASSED: No cleanup/destruction logs during tier changes');
  });

  test('should handle multiple rapid tier clicks', async ({ page }) => {
    const tier1Button = page.getByRole('button', { name: /Tier 1|T1/i }).first();
    const tier2Button = page.getByRole('button', { name: /Tier 2|T2/i }).first();
    const allButton = page.getByRole('button', { name: /All/i }).first();

    consoleErrors = [];
    routeDisconnectedFound = false;

    // Rapid clicking
    await tier1Button.click();
    await page.waitForTimeout(300);
    await tier2Button.click();
    await page.waitForTimeout(300);
    await allButton.click();
    await page.waitForTimeout(300);
    await tier1Button.click();
    await page.waitForTimeout(300);
    await tier2Button.click();
    await page.waitForTimeout(1000);

    expect(routeDisconnectedFound).toBe(false);

    const routeDisconnectedErrors = consoleErrors.filter(e => e.includes('Route Disconnected'));
    expect(routeDisconnectedErrors.length).toBe(0);

    console.log('✅ TEST PASSED: Rapid clicking - NO Route Disconnected errors');
  });
});
