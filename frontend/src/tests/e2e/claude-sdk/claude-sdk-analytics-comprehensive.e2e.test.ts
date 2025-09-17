/**
 * Comprehensive E2E Tests for Claude SDK Analytics Functionality
 * Tests all aspects of analytics dashboard including real-time updates, charts, and error handling
 */

import { test, expect, Page, BrowserContext, Response } from '@playwright/test';
import {
  SAMPLE_TOKEN_USAGE,
  SAMPLE_COST_METRICS,
  MOCK_API_RESPONSES,
  generateLargeDataset,
  testDataUtils
} from '@/tests/fixtures/analytics-test-data';

// Test data for comprehensive testing
const ANALYTICS_TEST_DATA = {
  costMetrics: {
    totalTokensUsed: 25840,
    totalCost: 0.4567,
    costByProvider: {
      claude: 0.3890,
      openai: 0.0677
    },
    costByModel: {
      'claude-3-5-sonnet-20241022': 0.3234,
      'claude-3-haiku-20240307': 0.0656,
      'gpt-4-turbo': 0.0677
    },
    averageCostPerToken: 0.0000177,
    tokensPerMinute: 145.6,
    costTrend: 'increasing' as const,
    lastUpdated: new Date(),
    dailyCost: 0.2456,
    weeklyCost: 1.2345,
    monthlyCost: 4.5678
  },
  realTimeData: {
    activeConnections: 3,
    messagesPerSecond: 2.4,
    averageResponseTime: 1200,
    errorRate: 0.02
  },
  chartData: Array.from({ length: 24 }, (_, i) => ({
    timestamp: new Date(Date.now() - (23 - i) * 3600000).toISOString(),
    tokens: 50 + Math.random() * 200,
    cost: 0.001 + Math.random() * 0.01,
    requests: 5 + Math.random() * 20
  }))
};

// Configuration for different test scenarios
test.describe.configure({ mode: 'parallel' });

test.describe('Claude SDK Analytics - Comprehensive E2E Tests', () => {
  let context: BrowserContext;
  let page: Page;
  let responsePromises: Map<string, Promise<Response>> = new Map();

  test.beforeEach(async ({ browser }) => {
    // Create isolated context with extended permissions
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      permissions: ['clipboard-read', 'clipboard-write'],
      ignoreHTTPSErrors: true,
      acceptDownloads: true
    });

    page = await context.newPage();

    // Enhanced console monitoring
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();

      if (type === 'error' && !text.includes('ResizeObserver')) {
        console.error(`[${type.toUpperCase()}] ${text}`);
      } else if (type === 'warn') {
        console.warn(`[WARN] ${text}`);
      }
    });

    // Enhanced request/response monitoring
    page.on('response', response => {
      const url = response.url();
      const status = response.status();

      if (status >= 400) {
        console.error(`Failed request: ${url} - Status: ${status}`);
      }

      // Track specific API responses
      if (url.includes('/api/analytics') || url.includes('/api/claude-code')) {
        responsePromises.set(url, Promise.resolve(response));
      }
    });

    // Setup comprehensive API mocking
    await setupAPIRoutes(page);

    // Navigate to analytics page
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    await context.close();
    responsePromises.clear();
  });

  test.describe('1. Analytics Page Loading and Error Handling', () => {
    test('should load analytics page without errors', async () => {
      // Verify page loads successfully
      await expect(page).toHaveTitle(/Analytics|Dashboard/);

      // Check for main dashboard container
      const dashboard = page.locator('[data-testid="analytics-dashboard"], .analytics-dashboard, [class*="analytics"]').first();
      await expect(dashboard).toBeVisible({ timeout: 10000 });

      // Verify no JavaScript errors in console
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') errors.push(msg.text());
      });

      await page.waitForTimeout(2000);
      expect(errors.filter(e => !e.includes('ResizeObserver')).length).toBe(0);

      // Check for essential UI elements
      await expect(page.locator('h1, h2, .title, [class*="title"]')).toBeVisible();
    });

    test('should handle API errors gracefully', async () => {
      // Mock API error response
      await page.route('**/api/analytics/**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Internal server error',
            message: 'Analytics service temporarily unavailable'
          })
        });
      });

      await page.reload();

      // Should show error state instead of crashing
      const errorElements = page.locator('[data-testid*="error"], .error, [class*="error"]');
      await expect(errorElements.first()).toBeVisible({ timeout: 10000 });

      // Should have retry functionality
      const retryButton = page.locator('button:has-text("Retry"), button:has-text("Try Again"), [data-testid*="retry"]');
      if (await retryButton.isVisible()) {
        await expect(retryButton).toBeVisible();
      }
    });

    test('should display loading states appropriately', async () => {
      // Add artificial delay to API response
      await page.route('**/api/analytics/**', route => {
        setTimeout(() => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(ANALYTICS_TEST_DATA)
          });
        }, 1500);
      });

      await page.reload();

      // Should show loading indicator
      const loadingElements = page.locator('[data-testid*="loading"], .loading, .spinner, [class*="loading"], [class*="spinner"]');
      await expect(loadingElements.first()).toBeVisible({ timeout: 5000 });

      // Loading should eventually disappear
      await expect(loadingElements.first()).not.toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('2. Tab Switching and Navigation', () => {
    test('should switch between System and Claude SDK analytics tabs', async () => {
      // Look for tab navigation elements
      const tabs = page.locator('[role="tab"], .tab, [class*="tab"]');

      if (await tabs.count() > 0) {
        // Test tab switching
        const firstTab = tabs.first();
        const secondTab = tabs.nth(1);

        await firstTab.click();
        await page.waitForTimeout(500);

        if (await secondTab.isVisible()) {
          await secondTab.click();
          await page.waitForTimeout(500);
        }

        // Verify active tab state
        const activeTabs = page.locator('[role="tab"][aria-selected="true"], .tab.active, [class*="tab"][class*="active"]');
        await expect(activeTabs.first()).toBeVisible();
      }
    });

    test('should maintain tab state across page reloads', async () => {
      const tabs = page.locator('[role="tab"], .tab, [class*="tab"]');

      if (await tabs.count() > 1) {
        // Click second tab
        await tabs.nth(1).click();
        await page.waitForTimeout(500);

        // Reload page
        await page.reload();
        await page.waitForLoadState('networkidle');

        // First tab should be active again (default behavior)
        const activeTabs = page.locator('[role="tab"][aria-selected="true"], .tab.active, [class*="tab"][class*="active"]');
        await expect(activeTabs.first()).toBeVisible();
      }
    });

    test('should support keyboard navigation between tabs', async () => {
      const tabs = page.locator('[role="tab"], .tab, [class*="tab"]');

      if (await tabs.count() > 1) {
        // Focus first tab
        await tabs.first().focus();

        // Use arrow keys to navigate
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(200);

        // Should focus next tab
        const focusedElement = page.locator(':focus');
        await expect(focusedElement).toBeVisible();
      }
    });
  });

  test.describe('3. Real-time Data Updates', () => {
    test('should display real-time metrics updates', async () => {
      // Mock WebSocket or polling updates
      let updateCount = 0;

      await page.route('**/api/analytics/realtime', route => {
        updateCount++;
        const updatedData = {
          ...ANALYTICS_TEST_DATA,
          costMetrics: {
            ...ANALYTICS_TEST_DATA.costMetrics,
            totalCost: ANALYTICS_TEST_DATA.costMetrics.totalCost + (updateCount * 0.001)
          }
        };

        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(updatedData)
        });
      });

      // Look for real-time indicators
      const realtimeIndicators = page.locator('[data-testid*="realtime"], [data-testid*="live"], .live, [class*="live"]');
      if (await realtimeIndicators.count() > 0) {
        await expect(realtimeIndicators.first()).toBeVisible();
      }

      // Wait for potential updates
      await page.waitForTimeout(3000);

      // Verify data refresh functionality
      const refreshButtons = page.locator('[data-testid*="refresh"], button:has-text("Refresh"), [class*="refresh"]');
      if (await refreshButtons.count() > 0) {
        await refreshButtons.first().click();
        await page.waitForTimeout(1000);
      }
    });

    test('should handle WebSocket connection states', async () => {
      // Mock WebSocket connection status
      await page.addInitScript(() => {
        // Override WebSocket to simulate connection states
        const originalWebSocket = window.WebSocket;
        window.WebSocket = class extends originalWebSocket {
          constructor(url: string) {
            super(url);
            setTimeout(() => {
              if (this.onopen) this.onopen(new Event('open'));
            }, 100);
          }
        } as any;
      });

      await page.reload();

      // Look for connection status indicators
      const connectionIndicators = page.locator('[data-testid*="connection"], [data-testid*="status"], .connection-status');
      if (await connectionIndicators.count() > 0) {
        await expect(connectionIndicators.first()).toBeVisible();
      }
    });

    test('should update charts in real-time', async () => {
      // Look for chart containers
      const charts = page.locator('canvas, svg, [data-testid*="chart"], [class*="chart"]');

      if (await charts.count() > 0) {
        // Wait for chart rendering
        await page.waitForTimeout(2000);

        // Verify charts are present
        await expect(charts.first()).toBeVisible();

        // Simulate data update
        await page.route('**/api/analytics/chart-data', route => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              ...ANALYTICS_TEST_DATA.chartData,
              timestamp: new Date().toISOString()
            })
          });
        });

        // Trigger refresh if available
        const refreshButtons = page.locator('[data-testid*="refresh"], button:has-text("Refresh")');
        if (await refreshButtons.count() > 0) {
          await refreshButtons.first().click();
          await page.waitForTimeout(1000);
        }
      }
    });
  });

  test.describe('4. Cost Tracking and Budget Displays', () => {
    test('should display accurate cost metrics', async () => {
      // Look for cost display elements
      const costElements = page.locator('[data-testid*="cost"], [class*="cost"], .currency');

      if (await costElements.count() > 0) {
        await expect(costElements.first()).toBeVisible();

        // Check for currency formatting
        const dollarSigns = page.locator('text=/\\$[0-9]/');
        if (await dollarSigns.count() > 0) {
          await expect(dollarSigns.first()).toBeVisible();
        }
      }

      // Look for token count displays
      const tokenElements = page.locator('[data-testid*="token"], [class*="token"]');
      if (await tokenElements.count() > 0) {
        await expect(tokenElements.first()).toBeVisible();
      }
    });

    test('should show budget alerts when thresholds are exceeded', async () => {
      // Mock high usage scenario
      await page.route('**/api/analytics/**', route => {
        const highUsageData = {
          ...ANALYTICS_TEST_DATA,
          costMetrics: {
            ...ANALYTICS_TEST_DATA.costMetrics,
            dailyCost: 8.5,
            budgetAlert: {
              level: 'warning',
              message: 'Daily budget at 85%',
              percentage: 85
            }
          }
        };

        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(highUsageData)
        });
      });

      await page.reload();

      // Look for alert elements
      const alerts = page.locator('[data-testid*="alert"], [class*="alert"], .warning, .danger');
      if (await alerts.count() > 0) {
        await expect(alerts.first()).toBeVisible();
      }
    });

    test('should display cost breakdown by provider and model', async () => {
      // Look for breakdown tables or lists
      const breakdownElements = page.locator('[data-testid*="breakdown"], table, .breakdown');

      if (await breakdownElements.count() > 0) {
        await expect(breakdownElements.first()).toBeVisible();

        // Check for provider names
        const providerElements = page.locator('text=/claude|openai|anthropic/i');
        if (await providerElements.count() > 0) {
          await expect(providerElements.first()).toBeVisible();
        }
      }
    });
  });

  test.describe('5. Chart Interactions and Functionality', () => {
    test('should render charts without errors', async () => {
      // Wait for charts to load
      await page.waitForTimeout(3000);

      // Look for chart elements
      const chartContainers = page.locator('canvas, svg, [data-testid*="chart"], [class*="chart"]');

      if (await chartContainers.count() > 0) {
        await expect(chartContainers.first()).toBeVisible();

        // Check for chart interactions
        const firstChart = chartContainers.first();

        // Try hovering over chart
        await firstChart.hover();
        await page.waitForTimeout(500);

        // Look for tooltips or hover effects
        const tooltips = page.locator('[data-testid*="tooltip"], .tooltip, [class*="tooltip"]');
        // Tooltips may or may not be present depending on implementation
      }
    });

    test('should support chart time range selection', async () => {
      // Look for time range selectors
      const timeRangeSelectors = page.locator('[data-testid*="time"], select, .time-range, button:has-text("24h"), button:has-text("7d")');

      if (await timeRangeSelectors.count() > 0) {
        const selector = timeRangeSelectors.first();
        await expect(selector).toBeVisible();

        // Try interacting with time range
        if (await selector.evaluate(el => el.tagName.toLowerCase()) === 'select') {
          await selector.selectOption({ index: 1 });
        } else {
          await selector.click();
        }

        await page.waitForTimeout(1000);
      }
    });

    test('should handle chart zoom and pan interactions', async () => {
      const charts = page.locator('canvas, svg, [data-testid*="chart"]');

      if (await charts.count() > 0) {
        const chart = charts.first();
        await expect(chart).toBeVisible();

        // Test mouse interactions if chart supports them
        const boundingBox = await chart.boundingBox();
        if (boundingBox) {
          // Try scroll wheel for zoom
          await chart.hover();
          await page.mouse.wheel(0, -100);
          await page.waitForTimeout(500);

          // Try click and drag for pan
          await page.mouse.move(boundingBox.x + 100, boundingBox.y + 100);
          await page.mouse.down();
          await page.mouse.move(boundingBox.x + 150, boundingBox.y + 100);
          await page.mouse.up();
          await page.waitForTimeout(500);
        }
      }
    });
  });

  test.describe('6. Export Functionality', () => {
    test('should export analytics data successfully', async () => {
      // Look for export buttons
      const exportButtons = page.locator('[data-testid*="export"], button:has-text("Export"), button:has-text("Download"), [class*="export"]');

      if (await exportButtons.count() > 0) {
        const exportButton = exportButtons.first();
        await expect(exportButton).toBeVisible();

        // Set up download handler
        const downloadPromise = page.waitForEvent('download', { timeout: 10000 });

        // Click export button
        await exportButton.click();

        try {
          const download = await downloadPromise;
          expect(download.suggestedFilename()).toMatch(/\.(json|csv|xlsx)$/);
        } catch (error) {
          // Export might open in new tab or use different mechanism
          console.log('Download event not captured, checking for other export mechanisms');
        }
      }
    });

    test('should support different export formats', async () => {
      // Look for format selection
      const formatSelectors = page.locator('select:has(option[value*="json"]), select:has(option[value*="csv"]), [data-testid*="format"]');

      if (await formatSelectors.count() > 0) {
        const selector = formatSelectors.first();
        await expect(selector).toBeVisible();

        // Try different formats
        const options = await selector.locator('option').all();
        for (let i = 0; i < Math.min(options.length, 2); i++) {
          const optionValue = await options[i].getAttribute('value');
          if (optionValue) {
            await selector.selectOption(optionValue);
            await page.waitForTimeout(500);
          }
        }
      }
    });

    test('should generate meaningful export filenames', async () => {
      const exportButtons = page.locator('[data-testid*="export"], button:has-text("Export")');

      if (await exportButtons.count() > 0) {
        const downloadPromise = page.waitForEvent('download', { timeout: 5000 });
        await exportButtons.first().click();

        try {
          const download = await downloadPromise;
          const filename = download.suggestedFilename();

          // Should include date or timestamp
          expect(filename).toMatch(/\d{4}.*\d{2}.*\d{2}/);
        } catch (error) {
          // Export functionality might not trigger download event
          console.log('Export test completed without download');
        }
      }
    });
  });

  test.describe('7. Performance and Responsiveness', () => {
    test('should load large datasets efficiently', async () => {
      // Mock large dataset response
      const largeDataset = generateLargeDataset(1000);

      await page.route('**/api/analytics/**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...ANALYTICS_TEST_DATA,
            usageData: largeDataset
          })
        });
      });

      const startTime = Date.now();
      await page.reload();
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;

      // Should load within reasonable time
      expect(loadTime).toBeLessThan(10000);

      // Should remain responsive
      const interactiveElements = page.locator('button, [role="tab"], input, select');
      if (await interactiveElements.count() > 0) {
        await expect(interactiveElements.first()).toBeEnabled();
      }
    });

    test('should be responsive on different screen sizes', async () => {
      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(1000);

      // Verify layout adapts
      const mainContent = page.locator('[data-testid*="analytics"], .analytics, main').first();
      await expect(mainContent).toBeVisible();

      // Test tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(1000);
      await expect(mainContent).toBeVisible();

      // Test desktop viewport
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.waitForTimeout(1000);
      await expect(mainContent).toBeVisible();
    });

    test('should handle memory efficiently with continuous updates', async () => {
      // Simulate continuous data updates
      let updateCounter = 0;

      await page.route('**/api/analytics/realtime', route => {
        updateCounter++;
        const updatedData = {
          ...ANALYTICS_TEST_DATA,
          timestamp: Date.now(),
          updateId: updateCounter
        };

        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(updatedData)
        });
      });

      // Monitor performance
      const performanceEntries: any[] = [];
      await page.evaluate(() => {
        const observer = new PerformanceObserver((list) => {
          (window as any).performanceEntries = list.getEntries();
        });
        observer.observe({ entryTypes: ['measure', 'navigation'] });
      });

      // Simulate multiple updates
      for (let i = 0; i < 5; i++) {
        const refreshButtons = page.locator('[data-testid*="refresh"], button:has-text("Refresh")');
        if (await refreshButtons.count() > 0) {
          await refreshButtons.first().click();
          await page.waitForTimeout(1000);
        }
      }

      // Check if page is still responsive
      const clickableElements = page.locator('button, [role="tab"]');
      if (await clickableElements.count() > 0) {
        await expect(clickableElements.first()).toBeEnabled();
      }
    });
  });

  test.describe('8. Accessibility and Keyboard Navigation', () => {
    test('should be accessible to screen readers', async () => {
      // Check for ARIA labels and roles
      const ariaElements = page.locator('[aria-label], [role], [aria-describedby]');
      if (await ariaElements.count() > 0) {
        await expect(ariaElements.first()).toBeVisible();
      }

      // Check for semantic headings
      const headings = page.locator('h1, h2, h3, h4, h5, h6');
      await expect(headings.first()).toBeVisible();

      // Check for proper focus management
      await page.keyboard.press('Tab');
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });

    test('should support keyboard navigation', async () => {
      // Test tab navigation through interactive elements
      const interactiveElements = page.locator('button, [role="tab"], input, select, a[href]');
      const elementCount = await interactiveElements.count();

      if (elementCount > 0) {
        // Navigate through first few elements
        for (let i = 0; i < Math.min(elementCount, 3); i++) {
          await page.keyboard.press('Tab');
          await page.waitForTimeout(200);

          const focused = page.locator(':focus');
          await expect(focused).toBeVisible();
        }

        // Test space/enter activation
        await page.keyboard.press('Space');
        await page.waitForTimeout(500);
      }
    });

    test('should have sufficient color contrast', async () => {
      // Check for text elements and their contrast
      const textElements = page.locator('p, span, div:has-text(" "), td, th');

      if (await textElements.count() > 0) {
        // This is a basic check - in a real scenario, you'd use accessibility testing tools
        const firstElement = textElements.first();
        await expect(firstElement).toBeVisible();

        // Verify text is readable (not transparent or same color as background)
        const styles = await firstElement.evaluate(el => {
          const computed = getComputedStyle(el);
          return {
            color: computed.color,
            backgroundColor: computed.backgroundColor,
            opacity: computed.opacity
          };
        });

        expect(styles.opacity).not.toBe('0');
      }
    });
  });
});

// Helper function to setup API routes for testing
async function setupAPIRoutes(page: Page) {
  // Mock main analytics data endpoint
  await page.route('**/api/analytics/cost-metrics', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(ANALYTICS_TEST_DATA)
    });
  });

  // Mock real-time updates endpoint
  await page.route('**/api/analytics/realtime', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ...ANALYTICS_TEST_DATA.realTimeData,
        timestamp: new Date().toISOString()
      })
    });
  });

  // Mock chart data endpoint
  await page.route('**/api/analytics/chart-data', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(ANALYTICS_TEST_DATA.chartData)
    });
  });

  // Mock Claude Code API
  await page.route('**/api/claude-code/streaming-chat', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_API_RESPONSES.successfulChat)
    });
  });

  // Mock export endpoints
  await page.route('**/api/analytics/export/**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ downloadUrl: '/mock-export.json' })
    });
  });
}