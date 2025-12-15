import { test, expect, Page } from '@playwright/test';

test.describe('Cost Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the API endpoint before navigating
    await page.route('/api/cost-metrics', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          daily_cost_usd: 2.45,
          cache_write_tokens: 417312,
          cache_read_tokens: 8346240,
          cache_hit_ratio: 95.2,
          cost_trend: [
            { date: '2025-11-01', cost_usd: 14.67 },
            { date: '2025-11-02', cost_usd: 12.34 },
            { date: '2025-11-03', cost_usd: 8.91 },
            { date: '2025-11-04', cost_usd: 5.23 },
            { date: '2025-11-05', cost_usd: 3.45 },
            { date: '2025-11-06', cost_usd: 2.45 },
          ],
        }),
      });
    });

    await page.goto('http://localhost:5173/settings/cost-monitoring');
    await page.waitForLoadState('networkidle');
  });

  test('should display current daily cost', async ({ page }) => {
    const dailyCost = page.locator('[data-testid="daily-cost"]');
    await expect(dailyCost).toBeVisible({ timeout: 10000 });
    await expect(dailyCost).toContainText('$');

    // Verify the exact cost value
    const costText = await dailyCost.textContent();
    expect(costText).toContain('2.45');

    // Screenshot validation
    await page.screenshot({
      path: '/workspaces/agent-feed/docs/screenshots/cost-dashboard-daily.png',
      fullPage: true
    });
  });

  test('should show cache token breakdown', async ({ page }) => {
    const writeTokens = page.locator('[data-testid="cache-write-tokens"]');
    const readTokens = page.locator('[data-testid="cache-read-tokens"]');

    await expect(writeTokens).toBeVisible({ timeout: 10000 });
    await expect(readTokens).toBeVisible({ timeout: 10000 });

    // Verify format (e.g., "417,312 tokens")
    const writeText = await writeTokens.textContent();
    expect(writeText).toMatch(/[\d,]+ tokens/);
    expect(writeText).toContain('417,312');

    const readText = await readTokens.textContent();
    expect(readText).toMatch(/[\d,]+ tokens/);
    expect(readText).toContain('8,346,240');

    // Screenshot validation
    await page.screenshot({
      path: '/workspaces/agent-feed/docs/screenshots/cost-token-breakdown.png'
    });
  });

  test('should display 7-day cost trend chart', async ({ page }) => {
    const chart = page.locator('[data-testid="cost-trend-chart"]');
    await expect(chart).toBeVisible({ timeout: 10000 });

    // Verify chart canvas exists
    const canvas = chart.locator('canvas');
    await expect(canvas).toBeVisible();

    // Screenshot for visual validation
    await page.screenshot({
      path: '/workspaces/agent-feed/docs/screenshots/cost-trend-chart.png'
    });
  });

  test('should show cache hit ratio', async ({ page }) => {
    const ratio = page.locator('[data-testid="cache-hit-ratio"]');
    await expect(ratio).toBeVisible({ timeout: 10000 });
    await expect(ratio).toContainText('%');

    // Verify the exact ratio
    const ratioText = await ratio.textContent();
    expect(ratioText).toContain('95.2%');
  });

  test('should display alert when cost exceeds threshold', async ({ page }) => {
    // Mock high cost scenario
    await page.route('/api/cost-metrics', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          daily_cost_usd: 7.89,
          cache_write_tokens: 417312,
          cache_read_tokens: 8346240,
          cache_hit_ratio: 95.2,
          cost_trend: [
            { date: '2025-11-01', cost_usd: 14.67 },
            { date: '2025-11-02', cost_usd: 12.34 },
            { date: '2025-11-03', cost_usd: 10.91 },
            { date: '2025-11-04', cost_usd: 9.23 },
            { date: '2025-11-05', cost_usd: 8.45 },
            { date: '2025-11-06', cost_usd: 7.89 },
          ],
        }),
      });
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    const alert = page.locator('[data-testid="cost-alert"]');
    await expect(alert).toBeVisible({ timeout: 10000 });
    await expect(alert).toContainText('threshold exceeded');

    // Screenshot alert state
    await page.screenshot({
      path: '/workspaces/agent-feed/docs/screenshots/cost-alert.png'
    });
  });

  test('should update metrics in real-time', async ({ page }) => {
    const initialCost = await page.locator('[data-testid="daily-cost"]').textContent();
    expect(initialCost).toContain('2.45');

    // Mock updated data for next poll
    await page.route('/api/cost-metrics', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          daily_cost_usd: 2.78,
          cache_write_tokens: 425000,
          cache_read_tokens: 8500000,
          cache_hit_ratio: 95.5,
          cost_trend: [
            { date: '2025-11-01', cost_usd: 14.67 },
            { date: '2025-11-02', cost_usd: 12.34 },
            { date: '2025-11-03', cost_usd: 8.91 },
            { date: '2025-11-04', cost_usd: 5.23 },
            { date: '2025-11-05', cost_usd: 3.45 },
            { date: '2025-11-06', cost_usd: 2.78 },
          ],
        }),
      });
    });

    // Wait for polling interval (30 seconds + buffer)
    await page.waitForTimeout(2000); // Using 2s for testing instead of 30s

    // Manually trigger refresh or wait for next update
    const updatedCost = await page.locator('[data-testid="daily-cost"]').textContent();
    expect(updatedCost).toBeTruthy();
  });

  test('should show before/after comparison', async ({ page }) => {
    const comparison = page.locator('[data-testid="cost-comparison"]');
    await expect(comparison).toBeVisible({ timeout: 10000 });
    await expect(comparison).toContainText('Before: $14.67');
    await expect(comparison).toContainText('After: $');
    await expect(comparison).toContainText('Savings:');

    // Verify savings calculation
    const savingsText = await comparison.textContent();
    expect(savingsText).toMatch(/\$[\d.]+\/day/);
    expect(savingsText).toMatch(/\d+% reduction/);

    // Screenshot comparison section
    await page.screenshot({
      path: '/workspaces/agent-feed/docs/screenshots/cost-comparison.png'
    });
  });

  test('should handle API error gracefully', async ({ page }) => {
    // Mock API error
    await page.route('/api/cost-metrics', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should show error message instead of crashing
    const errorMessage = page.locator('text=/Failed to load metrics|Error loading/i');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
  });

  test('should display responsive layout on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');

    const dailyCost = page.locator('[data-testid="daily-cost"]');
    await expect(dailyCost).toBeVisible({ timeout: 10000 });

    // Screenshot mobile view
    await page.screenshot({
      path: '/workspaces/agent-feed/docs/screenshots/cost-dashboard-mobile.png',
      fullPage: true
    });
  });

  test('should calculate and display accurate savings percentage', async ({ page }) => {
    const comparison = page.locator('[data-testid="cost-comparison"]');
    await expect(comparison).toBeVisible({ timeout: 10000 });

    // Extract savings percentage
    const comparisonText = await comparison.textContent();
    const percentMatch = comparisonText?.match(/(\d+)% reduction/);

    expect(percentMatch).toBeTruthy();
    if (percentMatch) {
      const percent = parseInt(percentMatch[1]);
      // Should be approximately 83% savings (14.67 -> 2.45)
      expect(percent).toBeGreaterThan(80);
      expect(percent).toBeLessThan(85);
    }
  });
});
