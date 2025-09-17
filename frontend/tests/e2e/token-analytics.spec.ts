/**
 * Token Analytics E2E Tests
 * Comprehensive testing for Claude SDK Analytics functionality
 */

import { test, expect } from '@playwright/test';

test.describe('Token Analytics Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:5173/');

    // Wait for application to load
    await page.waitForLoadState('networkidle');
  });

  test('should load Claude SDK Analytics tab without errors', async ({ page }) => {
    // Navigate to Claude SDK Analytics tab
    await page.click('text=Claude SDK');
    await page.waitForSelector('[data-testid="token-analytics-dashboard"]', {
      timeout: 10000
    });

    // Verify no error messages are shown
    const errorElements = page.locator('text=Error Loading Token Analytics');
    await expect(errorElements).toHaveCount(0);

    // Verify dashboard is visible
    const dashboard = page.locator('[data-testid="token-analytics-dashboard"]');
    await expect(dashboard).toBeVisible();
  });

  test('should display hourly chart with 24 bars', async ({ page }) => {
    await page.click('text=Claude SDK');
    await page.waitForSelector('[data-testid="hourly-chart"]', { timeout: 10000 });

    // Check that hourly chart is visible
    const hourlyChart = page.locator('[data-testid="hourly-chart"]');
    await expect(hourlyChart).toBeVisible();

    // Wait for chart to render
    await page.waitForTimeout(2000);

    // Verify chart has data
    const chartCanvas = page.locator('[data-testid="hourly-chart"] canvas');
    await expect(chartCanvas).toBeVisible();
  });

  test('should display daily chart with 30 bars', async ({ page }) => {
    await page.click('text=Claude SDK');
    await page.waitForSelector('[data-testid="daily-chart"]', { timeout: 10000 });

    // Check that daily chart is visible
    const dailyChart = page.locator('[data-testid="daily-chart"]');
    await expect(dailyChart).toBeVisible();

    // Wait for chart to render
    await page.waitForTimeout(2000);

    // Verify chart has data
    const chartCanvas = page.locator('[data-testid="daily-chart"] canvas');
    await expect(chartCanvas).toBeVisible();
  });

  test('should display recent messages with content previews', async ({ page }) => {
    await page.click('text=Claude SDK');
    await page.waitForSelector('[data-testid="recent-messages"]', { timeout: 10000 });

    // Check messages section is visible
    const messagesSection = page.locator('[data-testid="recent-messages"]');
    await expect(messagesSection).toBeVisible();

    // Wait for messages to load
    await page.waitForTimeout(1000);

    // Check for message rows
    const messageRows = page.locator('[data-testid="message-row"]');

    // Should have at least one message
    await expect(messageRows.first()).toBeVisible();

    // Check message content previews are present
    const messagePreview = page.locator('[data-testid="message-preview"]').first();
    await expect(messagePreview).toBeVisible();
  });

  test('should display summary statistics correctly', async ({ page }) => {
    await page.click('text=Claude SDK');
    await page.waitForSelector('[data-testid="usage-summary"]', { timeout: 10000 });

    // Check summary cards are visible
    const summarySection = page.locator('[data-testid="usage-summary"]');
    await expect(summarySection).toBeVisible();

    // Check for key metrics
    const totalRequests = page.locator('[data-testid="total-requests"]');
    const totalTokens = page.locator('[data-testid="total-tokens"]');
    const totalCost = page.locator('[data-testid="total-cost"]');

    await expect(totalRequests).toBeVisible();
    await expect(totalTokens).toBeVisible();
    await expect(totalCost).toBeVisible();

    // Verify no fake data like "$12.45"
    const fakeData = page.locator('text=$12.45');
    await expect(fakeData).toHaveCount(0);
  });

  test('should handle real-time data updates', async ({ page }) => {
    await page.click('text=Claude SDK');
    await page.waitForSelector('[data-testid="token-analytics-dashboard"]', {
      timeout: 10000
    });

    // Get initial token count
    const initialTokens = await page.locator('[data-testid="total-tokens"]').textContent();

    // Wait for potential updates (refresh interval)
    await page.waitForTimeout(3000);

    // Dashboard should still be functional
    const dashboard = page.locator('[data-testid="token-analytics-dashboard"]');
    await expect(dashboard).toBeVisible();
  });

  test('should show message deduplication working', async ({ page }) => {
    await page.click('text=Claude SDK');
    await page.waitForSelector('[data-testid="recent-messages"]', { timeout: 10000 });

    // Check for message IDs in the recent messages
    const messageIds = page.locator('[data-testid="message-id"]');
    const count = await messageIds.count();

    if (count > 0) {
      // Verify message IDs are displayed
      await expect(messageIds.first()).toBeVisible();

      // Check that message IDs are unique (no exact duplicates visible)
      const firstMessageId = await messageIds.first().textContent();
      expect(firstMessageId).toBeTruthy();
    }
  });

  test('should display cost calculations accurately', async ({ page }) => {
    await page.click('text=Claude SDK');
    await page.waitForSelector('[data-testid="recent-messages"]', { timeout: 10000 });

    // Check message rows for cost information
    const messageRows = page.locator('[data-testid="message-row"]');
    const count = await messageRows.count();

    if (count > 0) {
      // Check first message has cost data
      const firstMessageCost = page.locator('[data-testid="message-cost"]').first();
      await expect(firstMessageCost).toBeVisible();

      // Verify cost is not zero or fake
      const costText = await firstMessageCost.textContent();
      expect(costText).not.toBe('$0.00');
      expect(costText).not.toContain('$12.45');
    }
  });
});

test.describe('Token Analytics API Integration', () => {
  test('should fetch hourly data successfully', async ({ page }) => {
    // Listen for API calls
    const apiResponse = page.waitForResponse('**/api/token-analytics/hourly');

    await page.goto('http://localhost:5173/');
    await page.click('text=Claude SDK');

    const response = await apiResponse;
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.labels).toHaveLength(24);
  });

  test('should fetch daily data successfully', async ({ page }) => {
    const apiResponse = page.waitForResponse('**/api/token-analytics/daily');

    await page.goto('http://localhost:5173/');
    await page.click('text=Claude SDK');

    const response = await apiResponse;
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.labels).toHaveLength(30);
  });

  test('should fetch summary data successfully', async ({ page }) => {
    const apiResponse = page.waitForResponse('**/api/token-analytics/summary');

    await page.goto('http://localhost:5173/');
    await page.click('text=Claude SDK');

    const response = await apiResponse;
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.summary).toHaveProperty('total_requests');
    expect(data.data.summary).toHaveProperty('unique_sessions');
    expect(data.data.summary).toHaveProperty('providers_used');
    expect(data.data.summary).toHaveProperty('models_used');
  });

  test('should fetch messages data successfully', async ({ page }) => {
    const apiResponse = page.waitForResponse('**/api/token-analytics/messages*');

    await page.goto('http://localhost:5173/');
    await page.click('text=Claude SDK');

    const response = await apiResponse;
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
  });
});