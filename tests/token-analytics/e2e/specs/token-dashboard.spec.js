/**
 * E2E Tests for Token Analytics Dashboard
 * Validates real data display in user interface
 */

const { test, expect } = require('@playwright/test');

test.describe('Token Analytics Dashboard', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to token analytics dashboard
    await page.goto('/dashboard/token-analytics');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('should display real token usage data in dashboard', async ({ page }) => {
    // Wait for token usage data to load
    await page.waitForSelector('[data-testid="token-usage-chart"]', { timeout: 10000 });

    // Check for real data indicators
    const chartData = await page.locator('[data-testid="token-usage-chart"]').textContent();

    // Should not contain fake data patterns
    expect(chartData).not.toMatch(/\$12\.45|\$42\.00|\$99\.99/);
    expect(chartData).not.toMatch(/mock|fake|dummy|test/i);
    expect(chartData).not.toMatch(/lorem ipsum/i);

    // Should contain realistic cost patterns
    expect(chartData).toMatch(/\$0\.\d+/); // Real costs should be small decimals

    // Validate chart has real data points
    const dataPoints = await page.locator('[data-testid="chart-data-point"]').count();
    if (dataPoints > 0) {
      // Check individual data points for real values
      for (let i = 0; i < Math.min(dataPoints, 5); i++) {
        const dataPoint = page.locator('[data-testid="chart-data-point"]').nth(i);
        const value = await dataPoint.getAttribute('data-value');

        if (value) {
          const numValue = parseFloat(value);
          expect(numValue).toBeGreaterThan(0);
          expect(numValue).not.toBeCloseTo(12.45, 2);
          expect(numValue).not.toBeCloseTo(42.00, 2);
        }
      }

      global.e2eRealDataValidations = (global.e2eRealDataValidations || 0) + 1;
    }
  });

  test('should show real-time token updates', async ({ page }) => {
    // Wait for initial load
    await page.waitForSelector('[data-testid="real-time-counter"]', { timeout: 10000 });

    const initialValue = await page.locator('[data-testid="real-time-counter"]').textContent();

    // Wait for potential updates (real-time systems should update)
    await page.waitForTimeout(5000);

    const updatedValue = await page.locator('[data-testid="real-time-counter"]').textContent();

    // Values should be realistic
    if (initialValue && updatedValue) {
      expect(initialValue).not.toMatch(/\$12\.45|\$42\.00/);
      expect(updatedValue).not.toMatch(/\$12\.45|\$42\.00/);

      // Should contain realistic cost format
      expect(initialValue).toMatch(/\$0\.\d{3,}/);

      global.e2eRealDataValidations = (global.e2eRealDataValidations || 0) + 1;
    }
  });

  test('should display accurate hourly usage chart', async ({ page }) => {
    // Navigate to hourly view
    await page.click('[data-testid="hourly-view-tab"]');
    await page.waitForSelector('[data-testid="hourly-chart"]', { timeout: 10000 });

    // Get chart data
    const chartContainer = page.locator('[data-testid="hourly-chart"]');
    await expect(chartContainer).toBeVisible();

    // Check for realistic hourly data
    const hourlyData = await page.evaluate(() => {
      const chart = document.querySelector('[data-testid="hourly-chart"]');
      return chart ? chart.getAttribute('data-chart-values') : null;
    });

    if (hourlyData) {
      const values = JSON.parse(hourlyData);

      // Validate realistic hourly token usage
      values.forEach(value => {
        expect(value).toBeGreaterThan(0);
        expect(value).toBeLessThan(1000000); // Reasonable hourly limit
        expect(value).not.toBeCloseTo(12.45, 2);
        expect(value).not.toBeCloseTo(42.00, 2);
      });

      global.e2eRealDataValidations = (global.e2eRealDataValidations || 0) + 1;
    }
  });

  test('should display accurate daily cost trends', async ({ page }) => {
    // Navigate to daily view
    await page.click('[data-testid="daily-view-tab"]');
    await page.waitForSelector('[data-testid="daily-chart"]', { timeout: 10000 });

    // Get daily cost data
    const costTrend = await page.locator('[data-testid="daily-cost-trend"]').textContent();

    if (costTrend) {
      // Should not contain fake patterns
      expect(costTrend).not.toMatch(/\$12\.45|\$42\.00|\$99\.99/);
      expect(costTrend).not.toMatch(/mock|fake|sample/i);

      // Should contain realistic daily costs
      const costMatches = costTrend.match(/\$(\d+\.\d+)/g);
      if (costMatches) {
        costMatches.forEach(costStr => {
          const cost = parseFloat(costStr.replace('$', ''));
          expect(cost).toBeGreaterThan(0);
          expect(cost).toBeLessThan(1000); // Reasonable daily cost limit
        });
      }

      global.e2eRealDataValidations = (global.e2eRealDataValidations || 0) + 1;
    }
  });

  test('should show real API usage history', async ({ page }) => {
    // Navigate to usage history
    await page.click('[data-testid="usage-history-tab"]');
    await page.waitForSelector('[data-testid="usage-history-table"]', { timeout: 10000 });

    // Get usage history rows
    const historyRows = await page.locator('[data-testid="usage-row"]').count();

    if (historyRows > 0) {
      // Check first few rows for real data
      for (let i = 0; i < Math.min(historyRows, 3); i++) {
        const row = page.locator('[data-testid="usage-row"]').nth(i);

        // Check timestamp is recent and realistic
        const timestamp = await row.locator('[data-testid="usage-timestamp"]').textContent();
        if (timestamp) {
          const date = new Date(timestamp);
          const now = new Date();
          const hoursDiff = (now - date) / (1000 * 60 * 60);
          expect(hoursDiff).toBeLessThan(24 * 7); // Within last week
        }

        // Check cost is realistic
        const cost = await row.locator('[data-testid="usage-cost"]').textContent();
        if (cost) {
          expect(cost).not.toMatch(/\$12\.45|\$42\.00/);
          expect(cost).toMatch(/\$0\.\d+/);
        }

        // Check provider is real
        const provider = await row.locator('[data-testid="usage-provider"]').textContent();
        if (provider) {
          expect(provider).not.toMatch(/mock|fake|test/i);
          expect(provider).toMatch(/^(claude|openai)$/i);
        }
      }

      global.e2eRealDataValidations = (global.e2eRealDataValidations || 0) + 1;
    }
  });

  test('should handle cost alerts with real thresholds', async ({ page }) => {
    // Look for cost alert components
    const costAlert = page.locator('[data-testid="cost-alert"]');

    if (await costAlert.isVisible()) {
      const alertText = await costAlert.textContent();

      // Alert should contain realistic cost information
      expect(alertText).not.toMatch(/\$12\.45|\$42\.00|\$99\.99/);
      expect(alertText).not.toMatch(/mock|fake|test/i);

      // Should contain realistic threshold values
      const thresholdMatch = alertText.match(/\$(\d+\.\d+)/);
      if (thresholdMatch) {
        const threshold = parseFloat(thresholdMatch[1]);
        expect(threshold).toBeGreaterThan(0);
        expect(threshold).toBeLessThan(1000);
      }

      global.e2eRealDataValidations = (global.e2eRealDataValidations || 0) + 1;
    }
  });

  test('should validate exported data contains real values', async ({ page }) => {
    // Look for export functionality
    const exportButton = page.locator('[data-testid="export-data-button"]');

    if (await exportButton.isVisible()) {
      // Set up download listener
      const downloadPromise = page.waitForEvent('download');

      await exportButton.click();

      const download = await downloadPromise;
      const path = await download.path();

      if (path) {
        const fs = require('fs');
        const exportData = fs.readFileSync(path, 'utf8');

        // Validate exported data doesn't contain fake patterns
        expect(exportData).not.toMatch(/\$12\.45|\$42\.00|\$99\.99/);
        expect(exportData).not.toMatch(/mock|fake|dummy|test/i);
        expect(exportData).not.toMatch(/lorem ipsum/i);

        // Should contain realistic data patterns
        expect(exportData).toMatch(/\$0\.\d{3,}/); // Real costs
        expect(exportData).toMatch(/claude|anthropic/i); // Real providers

        global.e2eRealDataValidations = (global.e2eRealDataValidations || 0) + 1;
      }
    }
  });

  test('should fail if fake data is detected in UI', async ({ page }) => {
    // Comprehensive check for fake data in entire page
    const pageContent = await page.content();

    // Check for obvious fake data patterns
    const fakePatterns = [
      /\$12\.45/g,
      /\$42\.00/g,
      /\$99\.99/g,
      /mock.*token/gi,
      /fake.*cost/gi,
      /dummy.*usage/gi,
      /lorem ipsum/gi,
      /sample.*data/gi
    ];

    fakePatterns.forEach(pattern => {
      const matches = pageContent.match(pattern);
      if (matches) {
        const violation = `Fake data pattern detected in UI: ${pattern.toString()}`;
        global.e2eFakeDataViolations = global.e2eFakeDataViolations || [];
        global.e2eFakeDataViolations.push(violation);

        // Immediately fail the test
        expect(matches).toBeNull();
      }
    });

    // If we get here, no fake data was detected
    global.e2eRealDataValidations = (global.e2eRealDataValidations || 0) + 1;
  });
});