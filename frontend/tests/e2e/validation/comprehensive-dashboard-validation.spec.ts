import { test, expect } from '@playwright/test';

test.describe('Comprehensive Dashboard - Schema Validation Fixed', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/agents/personal-todos-agent/pages/comprehensive-dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('NO validation errors should be present', async ({ page }) => {
    // Critical check: NO "Component Validation Error" text
    const validationErrorText = await page.textContent('body');
    expect(validationErrorText).not.toContain('Component Validation Error');
    expect(validationErrorText).not.toContain('Issues found');

    // NO validation error components
    const errorCount = await page.locator('[data-testid="validation-error"]').count();
    expect(errorCount).toBe(0);

    // Take screenshot for evidence
    await page.screenshot({
      path: 'test-results/comprehensive-dashboard-no-errors.png',
      fullPage: true
    });
  });

  test('Page should NOT show JSON fallback', async ({ page }) => {
    // Should NOT see "Page Data" heading
    const pageDataHeading = page.locator('h3:has-text("Page Data")');
    await expect(pageDataHeading).not.toBeVisible();

    // Should see actual page title (using specific locator to avoid multiple h1 elements)
    const pageTitle = page.locator('h1:has-text("Personal Todos")');
    await expect(pageTitle).toBeVisible();
  });

  test('All components should render correctly', async ({ page }) => {
    // Check for specific headings that should exist on dashboard
    await expect(page.locator('h3:has-text("Priority Distribution")')).toBeVisible();
    await expect(page.locator('h3:has-text("Task Status Breakdown")')).toBeVisible();
    await expect(page.locator('h3:has-text("Recent Tasks")')).toBeVisible();
    await expect(page.locator('h3:has-text("Quick Actions")')).toBeVisible();
    await expect(page.locator('h3:has-text("Performance")')).toBeVisible();

    // Check for Badge components (priority badges)
    await expect(page.locator('text=P0 Critical').first()).toBeVisible();
    await expect(page.locator('text=P1 High').first()).toBeVisible();

    // Check for Button components
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(0);

    await page.screenshot({
      path: 'test-results/comprehensive-dashboard-rendered.png',
      fullPage: true
    });
  });

  test('NO console errors during page load', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Filter out known infrastructure warnings (WebSocket, network)
    const criticalErrors = consoleErrors.filter(err =>
      !err.includes('React Router') &&
      !err.includes('Future Flag Warning') &&
      !err.includes('WebSocket') &&
      !err.includes('ERR_CONNECTION_REFUSED') &&
      !err.includes('Failed to load resource')
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('Responsive design - Mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForLoadState('networkidle');

    // Should still render without errors
    const validationErrorText = await page.textContent('body');
    expect(validationErrorText).not.toContain('Component Validation Error');

    await page.screenshot({
      path: 'test-results/comprehensive-dashboard-mobile.png',
      fullPage: true
    });
  });

  test('Responsive design - Desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForLoadState('networkidle');

    // Should still render without errors
    const validationErrorText = await page.textContent('body');
    expect(validationErrorText).not.toContain('Component Validation Error');

    await page.screenshot({
      path: 'test-results/comprehensive-dashboard-desktop.png',
      fullPage: true
    });
  });
});
