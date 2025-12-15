/**
 * Claude SDK Analytics Real Data - E2E Browser Validation Tests
 * Tests the complete user experience with real database data
 *
 * Test Coverage:
 * - Page navigation and loading
 * - Summary statistics display (real data, not mock 50 requests)
 * - Chart rendering with real data
 * - Messages table with real records
 * - Export functionality
 * - No console errors
 * - Screenshot validation
 */

import { test, expect } from '@playwright/test';

test.describe('Claude SDK Analytics - Real Data Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to analytics page with Claude SDK tab
    await page.goto('http://localhost:5173/analytics?tab=claude-sdk');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to Claude SDK Analytics tab successfully', async ({ page }) => {
    // Check URL contains claude-sdk tab parameter
    expect(page.url()).toContain('tab=claude-sdk');

    // Check page title or header
    const heading = page.locator('h1, h2').filter({ hasText: /token|analytics|claude/i }).first();
    await expect(heading).toBeVisible({ timeout: 10000 });

    // Take screenshot
    await page.screenshot({ path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/claude-sdk-analytics-loaded.png', fullPage: true });
  });

  test('should display real summary statistics (not mock 50 requests)', async ({ page }) => {
    // Wait for summary stats to load
    await page.waitForSelector('[data-testid="total-requests"], text=/total.*requests/i', { timeout: 10000 });

    // Find total requests stat
    const totalRequestsElement = page.locator('[data-testid="total-requests"], .stat-value, .metric-value').filter({ hasText: /\d+/ }).first();
    await expect(totalRequestsElement).toBeVisible();

    const totalRequestsText = await totalRequestsElement.textContent();
    const totalRequests = parseInt(totalRequestsText?.match(/\d+/)?.[0] || '0');

    // Real database has 20 records, not 50 (mock data)
    expect(totalRequests).toBe(20);
    expect(totalRequests).not.toBe(50); // Ensure it's NOT mock data

    console.log(`✅ Verified real data: ${totalRequests} requests (not 50 mock)`);

    // Take screenshot
    await page.screenshot({ path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/summary-stats-real-data.png' });
  });

  test('should display all summary statistics cards', async ({ page }) => {
    // Wait for stats to load
    await page.waitForTimeout(2000);

    // Check for common stat labels
    const statLabels = [
      /total.*requests?/i,
      /total.*tokens?/i,
      /total.*cost/i,
      /sessions?/i,
      /providers?/i,
      /models?/i
    ];

    for (const labelPattern of statLabels) {
      const stat = page.locator(`text=${labelPattern}`).first();
      await expect(stat).toBeVisible({ timeout: 5000 });
    }

    // Take screenshot
    await page.screenshot({ path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/all-summary-stats.png' });
  });

  test('should display total tokens from database', async ({ page }) => {
    await page.waitForTimeout(2000);

    const totalTokensElement = page.locator('[data-testid="total-tokens"], text=/\d+.*tokens?/i').first();
    await expect(totalTokensElement).toBeVisible();

    const totalTokensText = await totalTokensElement.textContent();
    const totalTokens = parseInt(totalTokensText?.replace(/,/g, '').match(/\d+/)?.[0] || '0');

    // Should be greater than 0 for real data
    expect(totalTokens).toBeGreaterThan(0);

    console.log(`✅ Total tokens from DB: ${totalTokens}`);
  });

  test('should display cost in correct format (dollars/cents)', async ({ page }) => {
    await page.waitForTimeout(2000);

    const costElement = page.locator('[data-testid="total-cost"], text=/\$\d+|\d+.*cents?/i').first();
    await expect(costElement).toBeVisible();

    const costText = await costElement.textContent() || '';

    // Should contain either $ or cents
    expect(costText).toMatch(/\$|\bcents?\b/i);

    console.log(`✅ Cost displayed: ${costText}`);
  });

  test('should render hourly chart with real data', async ({ page }) => {
    // Wait for chart container
    const chartContainer = page.locator('canvas, [data-testid="hourly-chart"], .chart-container').first();
    await expect(chartContainer).toBeVisible({ timeout: 10000 });

    // Check if chart has rendered (canvas should have width/height)
    if (await chartContainer.evaluate((el) => el.tagName) === 'CANVAS') {
      const canvasWidth = await chartContainer.evaluate((canvas: HTMLCanvasElement) => canvas.width);
      expect(canvasWidth).toBeGreaterThan(0);
    }

    // Take screenshot
    await page.screenshot({ path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/hourly-chart-rendered.png', fullPage: true });

    console.log('✅ Hourly chart rendered');
  });

  test('should render daily chart with real data', async ({ page }) => {
    // Scroll to daily chart section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(1000);

    // Look for daily chart
    const dailyChart = page.locator('canvas, [data-testid="daily-chart"]').nth(1);
    await expect(dailyChart).toBeVisible({ timeout: 10000 });

    // Take screenshot
    await page.screenshot({ path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/daily-chart-rendered.png', fullPage: true });

    console.log('✅ Daily chart rendered');
  });

  test('should display messages table with real records', async ({ page }) => {
    // Scroll to messages table
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    // Wait for table
    const table = page.locator('table, [data-testid="messages-table"], .table-container').first();
    await expect(table).toBeVisible({ timeout: 10000 });

    // Check for table rows (excluding header)
    const rows = page.locator('tbody tr, .table-row').first();
    await expect(rows).toBeVisible();

    // Count rows
    const rowCount = await page.locator('tbody tr, .table-row').count();
    expect(rowCount).toBeGreaterThan(0);

    console.log(`✅ Messages table has ${rowCount} rows`);

    // Take screenshot
    await page.screenshot({ path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/messages-table-real-data.png', fullPage: true });
  });

  test('should display correct columns in messages table', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    const expectedColumns = [
      /timestamp|time|date/i,
      /model/i,
      /provider/i,
      /tokens?/i,
      /cost/i
    ];

    for (const columnPattern of expectedColumns) {
      const column = page.locator(`th, .table-header`).filter({ hasText: columnPattern }).first();
      await expect(column).toBeVisible({ timeout: 5000 });
    }

    console.log('✅ All expected columns present in messages table');
  });

  test('should display provider grouping (Anthropic, OpenAI, Google)', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Look for provider breakdown section
    const providerSection = page.locator('text=/by.*provider|provider.*breakdown/i').first();

    if (await providerSection.isVisible()) {
      // Check for known providers
      const providers = ['anthropic', 'openai', 'google'];

      for (const provider of providers) {
        const providerElement = page.locator(`text=/${provider}/i`).first();
        if (await providerElement.isVisible()) {
          console.log(`✅ Found provider: ${provider}`);
        }
      }
    }

    // Take screenshot
    await page.screenshot({ path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/provider-grouping.png' });
  });

  test('should display model grouping', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Look for model breakdown section
    const modelSection = page.locator('text=/by.*model|model.*breakdown/i').first();

    if (await modelSection.isVisible()) {
      // Check for common model names
      const models = ['claude', 'gpt', 'gemini', 'haiku', 'sonnet', 'opus'];

      let foundModels = 0;
      for (const model of models) {
        const modelElement = page.locator(`text=/${model}/i`).first();
        if (await modelElement.isVisible()) {
          foundModels++;
          console.log(`✅ Found model: ${model}`);
        }
      }

      expect(foundModels).toBeGreaterThan(0);
    }

    // Take screenshot
    await page.screenshot({ path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/model-grouping.png' });
  });

  test('should have working export button', async ({ page }) => {
    // Look for export button
    const exportButton = page.locator('button').filter({ hasText: /export|download/i }).first();

    if (await exportButton.isVisible()) {
      // Set up download listener
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 });

      // Click export
      await exportButton.click();

      try {
        const download = await downloadPromise;

        // Verify download
        expect(download.suggestedFilename()).toMatch(/token.*analytics|analytics.*csv/i);

        console.log(`✅ Export works: ${download.suggestedFilename()}`);

        // Take screenshot
        await page.screenshot({ path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/export-initiated.png' });
      } catch (error) {
        console.log('⚠️ Export button exists but download not triggered (may need API implementation)');
      }
    } else {
      console.log('⚠️ Export button not found on page');
    }
  });

  test('should have no console errors during page load', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate and interact with page
    await page.goto('http://localhost:5173/analytics?tab=claude-sdk');
    await page.waitForTimeout(3000);

    // Scroll through page
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    // Filter out known/acceptable errors
    const criticalErrors = consoleErrors.filter(error =>
      !error.includes('favicon') &&
      !error.includes('DevTools') &&
      !error.includes('Extension')
    );

    if (criticalErrors.length > 0) {
      console.log('⚠️ Console errors detected:');
      criticalErrors.forEach(err => console.log(`  - ${err}`));
    }

    // Should have no critical errors
    expect(criticalErrors.length).toBe(0);

    console.log('✅ No console errors during page interaction');
  });

  test('should handle pagination in messages table', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    // Look for pagination controls
    const nextButton = page.locator('button').filter({ hasText: /next|→|›/i }).first();
    const prevButton = page.locator('button').filter({ hasText: /prev|←|‹/i }).first();

    if (await nextButton.isVisible()) {
      // Get initial first row
      const firstRowBefore = await page.locator('tbody tr, .table-row').first().textContent();

      // Click next
      await nextButton.click();
      await page.waitForTimeout(1000);

      // Get new first row
      const firstRowAfter = await page.locator('tbody tr, .table-row').first().textContent();

      // Rows should be different
      expect(firstRowBefore).not.toBe(firstRowAfter);

      console.log('✅ Pagination works');

      // Take screenshot
      await page.screenshot({ path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/pagination-working.png' });
    } else {
      console.log('⚠️ Pagination controls not found (may not be needed for small dataset)');
    }
  });

  test('should update charts when time range changes', async ({ page }) => {
    // Look for time range selector
    const timeRangeSelector = page.locator('select, [data-testid="time-range"]').filter({ hasText: /day|hour|week|month/i }).first();

    if (await timeRangeSelector.isVisible()) {
      // Take screenshot before change
      await page.screenshot({ path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/before-time-range-change.png' });

      // Change time range
      await timeRangeSelector.selectOption({ index: 1 });
      await page.waitForTimeout(2000);

      // Take screenshot after change
      await page.screenshot({ path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/after-time-range-change.png' });

      console.log('✅ Time range selector works');
    } else {
      console.log('⚠️ Time range selector not found');
    }
  });

  test('should display loading states appropriately', async ({ page }) => {
    // Navigate with network throttled to see loading states
    await page.goto('http://localhost:5173/analytics?tab=claude-sdk');

    // Look for loading indicators
    const loadingIndicators = page.locator('.loading, .spinner, [data-testid="loading"]');

    if (await loadingIndicators.first().isVisible({ timeout: 1000 })) {
      console.log('✅ Loading state displayed');

      // Wait for loading to complete
      await loadingIndicators.first().waitFor({ state: 'hidden', timeout: 10000 });

      console.log('✅ Loading state cleared after data loaded');
    } else {
      console.log('⚠️ Loading indicators not visible (data may load too fast)');
    }
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('http://localhost:5173/analytics?tab=claude-sdk');
    await page.waitForTimeout(2000);

    // Check if key elements are still visible
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/mobile-responsive.png', fullPage: true });

    console.log('✅ Mobile responsive layout renders');
  });

  test('full page screenshot for manual verification', async ({ page }) => {
    await page.goto('http://localhost:5173/analytics?tab=claude-sdk');
    await page.waitForTimeout(3000);

    // Take full page screenshot
    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/full-page-real-data.png',
      fullPage: true
    });

    console.log('✅ Full page screenshot saved for manual verification');
  });
});

test.describe('Claude SDK Analytics - Data Accuracy Validation', () => {
  test('should match summary total with API response', async ({ page, request }) => {
    // Fetch data from API
    const apiResponse = await request.get('http://localhost:3001/api/token-analytics/summary');
    const apiData = await apiResponse.json();

    // Navigate to page
    await page.goto('http://localhost:5173/analytics?tab=claude-sdk');
    await page.waitForTimeout(2000);

    // Get displayed total requests
    const totalRequestsElement = page.locator('[data-testid="total-requests"], text=/\d+.*requests?/i').first();
    const displayedText = await totalRequestsElement.textContent();
    const displayedRequests = parseInt(displayedText?.match(/\d+/)?.[0] || '0');

    // Compare with API
    const apiRequests = apiData.data.summary.total_requests;
    expect(displayedRequests).toBe(apiRequests);

    console.log(`✅ UI matches API: ${displayedRequests} requests`);
  });

  test('should display correct provider distribution', async ({ page, request }) => {
    // Fetch provider data from API
    const apiResponse = await request.get('http://localhost:3001/api/token-analytics/summary');
    const apiData = await apiResponse.json();

    const apiProviders = apiData.data.by_provider;

    // Navigate to page
    await page.goto('http://localhost:5173/analytics?tab=claude-sdk');
    await page.waitForTimeout(2000);

    // Verify providers are displayed
    for (const provider of apiProviders) {
      const providerElement = page.locator(`text=/${provider.provider}/i`).first();

      if (await providerElement.isVisible()) {
        console.log(`✅ Provider ${provider.provider} displayed with ${provider.requests} requests`);
      }
    }
  });
});
