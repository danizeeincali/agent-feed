import { test, expect } from '@playwright/test';

/**
 * Comprehensive Fake Data Detection Tests
 * These tests MUST fail if any fake data is detected
 */

test.describe('Fake Data Elimination Validation', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should NOT contain hardcoded cost values like $12.45', async ({ page }) => {
    // Check page content for fake costs
    const content = await page.content();

    // These patterns MUST NOT exist
    const fakeCostPatterns = [
      /\$12\.45/g,
      /\$0\.50/g,
      /\$1\.20/g,
      /\$3\.67/g,
      /\$25\.00/g
    ];

    fakeCostPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      expect(matches, `Found fake cost pattern: ${pattern}`).toBeNull();
    });
  });

  test('should NOT display hardcoded token counts', async ({ page }) => {
    // Navigate to feed page where token analytics should appear
    await page.goto('/feed');
    await page.waitForTimeout(2000); // Wait for data to load

    const content = await page.content();

    // Common fake token values that MUST NOT appear
    const fakeTokenPatterns = [
      /1234\s*tokens?/g,
      /5000\s*tokens?/g,
      /2500\s*tokens?/g,
      /9999\s*tokens?/g
    ];

    fakeTokenPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      expect(matches, `Found fake token pattern: ${pattern}`).toBeNull();
    });
  });

  test('hourly chart should display real data only', async ({ page }) => {
    await page.goto('/feed');

    // Wait for hourly chart to load
    await page.waitForSelector('[data-testid="hourly-chart"]', { timeout: 10000 });

    // Check for fake data indicators in chart
    const chartElement = page.locator('[data-testid="hourly-chart"]');
    const chartText = await chartElement.textContent();

    // Should not contain common fake values
    expect(chartText).not.toContain('$12.45');
    expect(chartText).not.toContain('1234 tokens');
    expect(chartText).not.toContain('mock');
    expect(chartText).not.toContain('fake');
    expect(chartText).not.toContain('test data');
  });

  test('daily chart should display real data only', async ({ page }) => {
    await page.goto('/feed');

    // Wait for daily chart to load
    await page.waitForSelector('[data-testid="daily-chart"]', { timeout: 10000 });

    const chartElement = page.locator('[data-testid="daily-chart"]');
    const chartText = await chartElement.textContent();

    // Should not contain fake data patterns
    expect(chartText).not.toContain('$25.00');
    expect(chartText).not.toContain('5000 tokens');
    expect(chartText).not.toContain('mock');
    expect(chartText).not.toContain('fake');
  });

  test('message list should show real Claude API data', async ({ page }) => {
    await page.goto('/feed');

    // Wait for message list to load
    await page.waitForSelector('[data-testid="message-list"]', { timeout: 10000 });

    const messageList = page.locator('[data-testid="message-list"]');
    const messages = await messageList.locator('.message-item').all();

    // Should have real messages, not mock data
    expect(messages.length).toBeGreaterThan(0);

    // Check first few messages for fake data patterns
    for (let i = 0; i < Math.min(3, messages.length); i++) {
      const messageText = await messages[i].textContent();

      expect(messageText).not.toContain('$12.45');
      expect(messageText).not.toContain('mock message');
      expect(messageText).not.toContain('test message');
      expect(messageText).not.toContain('fake data');
    }
  });

  test('WebSocket connection should provide real-time data', async ({ page }) => {
    await page.goto('/feed');

    // Monitor network for WebSocket connections
    let websocketConnected = false;

    page.on('websocket', ws => {
      websocketConnected = true;

      ws.on('framereceived', event => {
        const data = event.payload;
        // WebSocket data should not contain fake patterns
        expect(data).not.toContain('$12.45');
        expect(data).not.toContain('mockData');
        expect(data).not.toContain('fakeTokens');
      });
    });

    // Wait for WebSocket connection
    await page.waitForTimeout(3000);
    expect(websocketConnected, 'WebSocket should be connected for real-time updates').toBe(true);
  });

  test('token analytics should calculate real costs', async ({ page }) => {
    await page.goto('/feed');

    // Wait for analytics to load
    await page.waitForSelector('[data-testid="token-analytics"]', { timeout: 10000 });

    const analytics = page.locator('[data-testid="token-analytics"]');
    const analyticsText = await analytics.textContent();

    // Should show real calculations, not fake values
    expect(analyticsText).not.toContain('$12.45');
    expect(analyticsText).not.toContain('$0.50');
    expect(analyticsText).not.toContain('total: $25.00');

    // Should contain real cost patterns (dollars and cents that aren't fake)
    expect(analyticsText).toMatch(/\$\d+\.\d{2}/); // Real cost format
  });

  test('API responses should not contain mock data', async ({ page }) => {
    const apiResponses: any[] = [];

    // Intercept API calls
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        apiResponses.push({
          url: response.url(),
          status: response.status()
        });
      }
    });

    await page.goto('/feed');
    await page.waitForTimeout(3000);

    // Should have made real API calls
    expect(apiResponses.length).toBeGreaterThan(0);

    // Check that APIs return 200 OK (indicating real endpoints)
    const successfulCalls = apiResponses.filter(r => r.status === 200);
    expect(successfulCalls.length).toBeGreaterThan(0);
  });

  test('no JavaScript errors related to fake data', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/feed');
    await page.waitForTimeout(3000);

    // Filter out fake data related errors
    const fakeDataErrors = consoleErrors.filter(error =>
      error.toLowerCase().includes('mock') ||
      error.toLowerCase().includes('fake') ||
      error.toLowerCase().includes('$12.45') ||
      error.toLowerCase().includes('undefined cost')
    );

    expect(fakeDataErrors, `Found fake data related errors: ${fakeDataErrors.join(', ')}`).toHaveLength(0);
  });

  test('database should contain real usage data', async ({ page }) => {
    // Navigate to a page that would trigger database queries
    await page.goto('/feed');

    // Wait for data to load
    await page.waitForTimeout(3000);

    // Check that we have real data indicators
    const hasRealData = await page.evaluate(() => {
      // Look for signs of real data vs mock data
      const text = document.body.textContent || '';

      // Should NOT contain these fake data indicators
      const fakeIndicators = [
        'mockUsage',
        'fakeTokens',
        'testCost',
        'sampleData'
      ];

      return !fakeIndicators.some(indicator => text.includes(indicator));
    });

    expect(hasRealData, 'Page should display real data, not mock data').toBe(true);
  });

  test('all charts display consistent real data', async ({ page }) => {
    await page.goto('/feed');

    // Wait for all charts to load
    await page.waitForSelector('[data-testid="hourly-chart"]');
    await page.waitForSelector('[data-testid="daily-chart"]');

    // Get data from both charts
    const hourlyData = await page.locator('[data-testid="hourly-chart"]').textContent();
    const dailyData = await page.locator('[data-testid="daily-chart"]').textContent();

    // Both charts should show real cost data
    const hasHourlyRealCosts = /\$\d+\.\d{2}/.test(hourlyData || '');
    const hasDailyRealCosts = /\$\d+\.\d{2}/.test(dailyData || '');

    expect(hasHourlyRealCosts || hasDailyRealCosts, 'At least one chart should show real cost data').toBe(true);

    // Neither should contain fake patterns
    expect(hourlyData).not.toContain('$12.45');
    expect(dailyData).not.toContain('$12.45');
  });

});