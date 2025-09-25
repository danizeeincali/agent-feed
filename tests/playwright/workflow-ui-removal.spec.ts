/**
 * TDD SPARC REFINEMENT: Workflow UI/UX Validation Test Suite (Playwright)
 *
 * Moved from Jest to Playwright directory for proper test execution
 */

import { test, expect } from '@playwright/test';

test.describe('TDD GREEN PHASE VALIDATION: Workflow UI Removal', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('should NOT display Workflows link in sidebar navigation', async ({ page }) => {
    const workflowLink = page.locator('nav a', { hasText: 'Workflows' });
    await expect(workflowLink).not.toBeVisible();
  });

  test('should display 8 navigation items without Workflows', async ({ page }) => {
    const navLinks = page.locator('nav a[href^="/"]');
    await expect(navLinks).toHaveCount(8);
  });

  test('should redirect /workflows route to 404 or home', async ({ page }) => {
    await page.goto('http://localhost:3000/workflows');

    // Should not show workflow content
    await expect(page.locator('[data-testid="workflow-visualization-fixed"]')).not.toBeVisible();

    // Should show valid fallback
    await expect(
      page.locator('[data-testid="not-found-fallback"]')
        .or(page.locator('[data-testid="app-root"]'))
    ).toBeVisible();
  });

  test('should maintain core navigation functionality', async ({ page }) => {
    // Test that other routes still work
    await page.click('nav a[href="/agents"]');
    await expect(page).toHaveURL(/.*\/agents/);

    await page.click('nav a[href="/analytics"]');
    await expect(page).toHaveURL(/.*\/analytics/);
  });
});