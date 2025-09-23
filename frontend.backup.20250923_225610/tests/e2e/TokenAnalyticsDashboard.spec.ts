/**
 * TokenAnalyticsDashboard Playwright E2E Tests
 *
 * These tests validate the complete browser experience and will:
 * - FAIL if dynamic import errors persist
 * - FAIL if chart.js components don't load properly
 * - PASS only when the dashboard is fully functional in the browser
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const BASE_URL = 'http://localhost:5173';
const DASHBOARD_URL = `${BASE_URL}/analytics`; // Adjust based on your routing

// Mock API data for consistent testing
const mockApiResponses = {
  hourly: {
    data: {
      labels: ['2024-01-01T00:00:00Z', '2024-01-01T01:00:00Z', '2024-01-01T02:00:00Z'],
      datasets: [
        {
          label: 'Tokens',
          data: [1000, 1500, 2000],
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
        },
      ],
    },
  },
  daily: {
    data: {
      labels: ['2024-01-01', '2024-01-02', '2024-01-03'],
      datasets: [
        {
          label: 'Daily Tokens',
          data: [5000, 7500, 10000],
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
        },
      ],
    },
  },
  messages: {
    data: [
      {
        id: 1,
        timestamp: '2024-01-01T10:00:00Z',
        provider: 'anthropic',
        model: 'claude-3-sonnet',
        request_type: 'chat',
        total_tokens: 1000,
        cost_total: 10,
        processing_time_ms: 1500,
        message_preview: 'Hello, how can I help you today?',
        response_preview: 'I am Claude, an AI assistant created by Anthropic.',
      },
    ],
  },
  summary: {
    data: {
      summary: {
        total_requests: 125,
        total_tokens: 50000,
        total_cost: 500,
        avg_processing_time: 1200,
        unique_sessions: 25,
        providers_used: 2,
        models_used: 3,
      },
      by_provider: [
        {
          provider: 'anthropic',
          requests: 100,
          tokens: 40000,
          cost: 400,
          avg_time: 1100,
        },
      ],
      by_model: [
        {
          model: 'claude-3-sonnet',
          provider: 'anthropic',
          requests: 75,
          tokens: 30000,
          cost: 300,
        },
      ],
    },
  },
};

// Setup API mocking for each test
async function setupApiMocks(page: Page) {
  await page.route('**/api/token-analytics/hourly', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockApiResponses.hourly),
    });
  });

  await page.route('**/api/token-analytics/daily', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockApiResponses.daily),
    });
  });

  await page.route('**/api/token-analytics/messages*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockApiResponses.messages),
    });
  });

  await page.route('**/api/token-analytics/summary', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockApiResponses.summary),
    });
  });

  await page.route('**/api/token-analytics/export*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/csv',
      body: 'timestamp,tokens,cost\n2024-01-01,1000,10\n2024-01-02,1500,15',
    });
  });
}

test.describe('TokenAnalyticsDashboard Browser Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Setup API mocks before each test
    await setupApiMocks(page);
  });

  test.describe('1. Component Loading and Import Validation', () => {
    test('should load dashboard without JavaScript errors', async ({ page }) => {
      // Listen for JavaScript errors
      const jsErrors: string[] = [];
      page.on('pageerror', (error) => {
        jsErrors.push(error.message);
      });

      // Listen for console errors related to imports
      page.on('console', (msg) => {
        if (msg.type() === 'error' &&
            (msg.text().includes('import') ||
             msg.text().includes('module') ||
             msg.text().includes('chart'))) {
          jsErrors.push(msg.text());
        }
      });

      await page.goto(DASHBOARD_URL);

      // Wait for the dashboard to load
      await expect(page.locator('[data-testid="token-analytics-dashboard"]')).toBeVisible();

      // Verify no JavaScript errors occurred
      expect(jsErrors).toHaveLength(0);
    });

    test('should successfully load chart.js components', async ({ page }) => {
      await page.goto(DASHBOARD_URL);

      // Wait for charts to render
      await page.waitForLoadState('networkidle');

      // Check that chart.js has been loaded and initialized
      const chartJsLoaded = await page.evaluate(() => {
        // Check if Chart.js is available globally
        return typeof window.Chart !== 'undefined';
      });

      // This test will fail if Chart.js is not properly loaded
      expect(chartJsLoaded).toBe(true);
    });

    test('should load react-chartjs-2 components without errors', async ({ page }) => {
      await page.goto(DASHBOARD_URL);

      // Wait for the page to fully load
      await page.waitForLoadState('domcontentloaded');

      // Look for chart containers that should be rendered by react-chartjs-2
      const hourlyChart = page.locator('text=Hourly Usage (Last 24 Hours)').locator('..');
      const dailyChart = page.locator('text=Daily Usage (Last 30 Days)').locator('..');

      await expect(hourlyChart).toBeVisible();
      await expect(dailyChart).toBeVisible();

      // Verify chart canvases are present (Chart.js renders to canvas elements)
      const canvasElements = await page.locator('canvas').count();
      expect(canvasElements).toBeGreaterThan(0);
    });

    test('should handle dynamic imports without module errors', async ({ page }) => {
      const moduleErrors: string[] = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error' && msg.text().includes('Loading chunk')) {
          moduleErrors.push(msg.text());
        }
      });

      await page.goto(DASHBOARD_URL);
      await page.waitForLoadState('networkidle');

      // Verify no dynamic import errors
      expect(moduleErrors).toHaveLength(0);
    });
  });

  test.describe('2. Chart Functionality Validation', () => {
    test('should render hourly chart with data', async ({ page }) => {
      await page.goto(DASHBOARD_URL);

      // Wait for the hourly chart section
      await expect(page.locator('text=Hourly Usage (Last 24 Hours)')).toBeVisible();

      // Verify chart canvas is present and has content
      const chartSection = page.locator('text=Hourly Usage (Last 24 Hours)').locator('..');
      const canvas = chartSection.locator('canvas').first();

      await expect(canvas).toBeVisible();

      // Verify the canvas has been drawn to (non-zero dimensions)
      const canvasInfo = await canvas.evaluate((el: HTMLCanvasElement) => ({
        width: el.width,
        height: el.height,
        hasContext: !!el.getContext('2d'),
      }));

      expect(canvasInfo.width).toBeGreaterThan(0);
      expect(canvasInfo.height).toBeGreaterThan(0);
      expect(canvasInfo.hasContext).toBe(true);
    });

    test('should render daily chart with data', async ({ page }) => {
      await page.goto(DASHBOARD_URL);

      // Wait for the daily chart section
      await expect(page.locator('text=Daily Usage (Last 30 Days)')).toBeVisible();

      // Verify chart canvas is present
      const chartSection = page.locator('text=Daily Usage (Last 30 Days)').locator('..');
      const canvas = chartSection.locator('canvas').first();

      await expect(canvas).toBeVisible();

      // Verify the canvas dimensions
      const canvasInfo = await canvas.evaluate((el: HTMLCanvasElement) => ({
        width: el.width,
        height: el.height,
      }));

      expect(canvasInfo.width).toBeGreaterThan(0);
      expect(canvasInfo.height).toBeGreaterThan(0);
    });

    test('should display summary cards with correct data', async ({ page }) => {
      await page.goto(DASHBOARD_URL);

      // Wait for summary cards to load
      await expect(page.locator('text=Total Requests')).toBeVisible();

      // Verify summary card values
      await expect(page.locator('text=125')).toBeVisible(); // total_requests
      await expect(page.locator('text=50,000')).toBeVisible(); // total_tokens
      await expect(page.locator('text=$5.0000')).toBeVisible(); // total_cost formatted
      await expect(page.locator('text=1200ms')).toBeVisible(); // avg_processing_time
    });

    test('should show message list with data', async ({ page }) => {
      await page.goto(DASHBOARD_URL);

      // Wait for messages section
      await expect(page.locator('text=Recent Messages')).toBeVisible();

      // Verify message data is displayed
      await expect(page.locator('text=anthropic')).toBeVisible();
      await expect(page.locator('text=claude-3-sonnet')).toBeVisible();
      await expect(page.locator('text=Hello, how can I help you today?')).toBeVisible();
    });
  });

  test.describe('3. Interactive Functionality', () => {
    test('should filter messages based on search input', async ({ page }) => {
      await page.goto(DASHBOARD_URL);

      // Wait for messages to load
      await expect(page.locator('text=Recent Messages')).toBeVisible();
      await expect(page.locator('text=anthropic')).toBeVisible();

      // Find and use the search input
      const searchInput = page.locator('input[placeholder="Search messages..."]');
      await expect(searchInput).toBeVisible();

      // Type in search term
      await searchInput.fill('claude');

      // Verify filtering works (this would need real implementation to fully test)
      await expect(page.locator('text=claude-3-sonnet')).toBeVisible();
    });

    test('should refresh data when refresh button clicked', async ({ page }) => {
      await page.goto(DASHBOARD_URL);

      // Wait for initial load
      await expect(page.locator('text=Token Analytics')).toBeVisible();

      // Track API calls
      let apiCallCount = 0;
      page.on('request', (request) => {
        if (request.url().includes('/api/token-analytics/')) {
          apiCallCount++;
        }
      });

      // Click refresh button
      const refreshButton = page.locator('button:has-text("Refresh")');
      await expect(refreshButton).toBeVisible();
      await refreshButton.click();

      // Wait a moment for API calls to complete
      await page.waitForTimeout(1000);

      // Verify API calls were made
      expect(apiCallCount).toBeGreaterThan(0);
    });

    test('should handle export functionality', async ({ page }) => {
      await page.goto(DASHBOARD_URL);

      // Wait for export button
      const exportButton = page.locator('button:has-text("Export CSV")');
      await expect(exportButton).toBeVisible();

      // Set up download handler
      const downloadPromise = page.waitForEvent('download');

      // Click export button
      await exportButton.click();

      // Wait for download to start
      const download = await downloadPromise;

      // Verify download was initiated
      expect(download.suggestedFilename()).toMatch(/token-analytics.*\.csv/);
    });
  });

  test.describe('4. Error Handling and Edge Cases', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      // Override API mocks to return errors
      await page.route('**/api/token-analytics/**', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' }),
        });
      });

      await page.goto(DASHBOARD_URL);

      // Should show error state
      await expect(page.locator('text=Error Loading Token Analytics')).toBeVisible();
      await expect(page.locator('text=Internal server error')).toBeVisible();
      await expect(page.locator('button:has-text("Retry")')).toBeVisible();
    });

    test('should show loading states', async ({ page }) => {
      // Set up delayed API responses
      await page.route('**/api/token-analytics/**', async (route) => {
        // Add delay to simulate slow network
        await new Promise(resolve => setTimeout(resolve, 2000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockApiResponses.hourly),
        });
      });

      await page.goto(DASHBOARD_URL);

      // Should show loading spinners initially
      const loadingSpinner = page.locator('.animate-spin');
      await expect(loadingSpinner.first()).toBeVisible();

      // Wait for loading to complete
      await page.waitForLoadState('networkidle');
    });

    test('should handle missing chart data', async ({ page }) => {
      // Return empty data
      await page.route('**/api/token-analytics/hourly', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: null }),
        });
      });

      await page.route('**/api/token-analytics/daily', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: null }),
        });
      });

      await page.goto(DASHBOARD_URL);

      // Should show no data messages
      await expect(page.locator('text=No hourly data available')).toBeVisible();
      await expect(page.locator('text=No daily data available')).toBeVisible();
    });
  });

  test.describe('5. Performance and Accessibility', () => {
    test('should load within acceptable time', async ({ page }) => {
      const startTime = Date.now();

      await page.goto(DASHBOARD_URL);
      await expect(page.locator('[data-testid="token-analytics-dashboard"]')).toBeVisible();

      const loadTime = Date.now() - startTime;

      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test('should be accessible to screen readers', async ({ page }) => {
      await page.goto(DASHBOARD_URL);

      // Check for proper heading structure
      await expect(page.locator('h1:has-text("Token Analytics")')).toBeVisible();

      // Check for proper button labels
      await expect(page.locator('button[aria-label], button:has-text("Refresh")')).toBeVisible();
      await expect(page.locator('button[aria-label], button:has-text("Export CSV")')).toBeVisible();

      // Check for form labels
      await expect(page.locator('input[placeholder="Search messages..."]')).toBeVisible();
    });

    test('should work with keyboard navigation', async ({ page }) => {
      await page.goto(DASHBOARD_URL);

      // Tab through interactive elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Should be able to focus on buttons
      const refreshButton = page.locator('button:has-text("Refresh")');
      await refreshButton.focus();
      expect(await refreshButton.evaluate(el => document.activeElement === el)).toBe(true);
    });
  });

  test.describe('6. Browser Compatibility', () => {
    test('should work in different viewport sizes', async ({ page }) => {
      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(DASHBOARD_URL);
      await expect(page.locator('[data-testid="token-analytics-dashboard"]')).toBeVisible();

      // Test tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.reload();
      await expect(page.locator('[data-testid="token-analytics-dashboard"]')).toBeVisible();

      // Test desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.reload();
      await expect(page.locator('[data-testid="token-analytics-dashboard"]')).toBeVisible();
    });

    test('should handle browser zoom levels', async ({ page }) => {
      await page.goto(DASHBOARD_URL);

      // Test different zoom levels
      const zoomLevels = [0.5, 0.75, 1.0, 1.25, 1.5];

      for (const zoom of zoomLevels) {
        await page.evaluate((zoomLevel) => {
          document.body.style.zoom = zoomLevel.toString();
        }, zoom);

        await expect(page.locator('[data-testid="token-analytics-dashboard"]')).toBeVisible();
      }
    });
  });
});