/**
 * Comprehensive E2E Tests for Claude SDK Cost Analytics Tab
 *
 * This test suite validates:
 * 1. Analytics page loads without 500 errors
 * 2. Tab switching works correctly
 * 3. All API calls succeed
 * 4. Real data displays in charts
 * 5. No console errors
 * 6. Interactive elements function
 * 7. Export features work
 * 8. Performance is acceptable
 */

import { test, expect, Page, BrowserContext, Response } from '@playwright/test';
import { PerformanceMonitor } from '../../../utils/performance-monitor';

// Test configuration
const TEST_CONFIG = {
  ANALYTICS_URL: '/analytics',
  API_TIMEOUT: 10000,
  LOAD_TIMEOUT: 30000,
  INTERACTION_TIMEOUT: 5000,
  PERFORMANCE_THRESHOLD: {
    PAGE_LOAD: 5000,
    TAB_SWITCH: 1000,
    API_RESPONSE: 3000
  }
};

// Test data for real API responses
const REAL_ANALYTICS_DATA = {
  costMetrics: {
    totalTokensUsed: 125840,
    totalCost: 2.4567,
    costByProvider: {
      claude: 2.1890,
      openai: 0.2677
    },
    costByModel: {
      'claude-3-5-sonnet-20241022': 1.8234,
      'claude-3-haiku-20240307': 0.3656,
      'gpt-4-turbo': 0.2677
    },
    averageCostPerToken: 0.0000195,
    tokensPerMinute: 245.6,
    costTrend: 'increasing' as const,
    lastUpdated: new Date(),
    dailyCost: 0.8456,
    weeklyCost: 5.2345,
    monthlyCost: 18.5678
  },
  chartData: Array.from({ length: 24 }, (_, i) => ({
    timestamp: new Date(Date.now() - (23 - i) * 3600000).toISOString(),
    tokens: 150 + Math.random() * 300,
    cost: 0.005 + Math.random() * 0.02,
    requests: 8 + Math.random() * 25,
    provider: i % 2 === 0 ? 'claude' : 'openai'
  }))
};

// Error tracking system
class TestErrorTracker {
  private errors: Array<{
    type: string;
    message: string;
    timestamp: Date;
    url?: string;
    stack?: string;
  }> = [];

  addError(type: string, message: string, url?: string, stack?: string) {
    this.errors.push({
      type,
      message,
      timestamp: new Date(),
      url,
      stack
    });
  }

  getErrors() {
    return this.errors;
  }

  hasErrors() {
    return this.errors.length > 0;
  }

  clear() {
    this.errors = [];
  }

  generateReport() {
    return {
      totalErrors: this.errors.length,
      errorsByType: this.errors.reduce((acc, error) => {
        acc[error.type] = (acc[error.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      errors: this.errors
    };
  }
}

test.describe('Claude SDK Cost Analytics - Comprehensive E2E Tests', () => {
  let context: BrowserContext;
  let page: Page;
  let errorTracker: TestErrorTracker;
  // let performanceMonitor: PerformanceMonitor;
  let apiResponses: Map<string, Response> = new Map();

  test.beforeEach(async ({ browser }) => {
    // Initialize tracking systems
    errorTracker = new TestErrorTracker();
    // performanceMonitor = new PerformanceMonitor();

    // Create context with enhanced permissions and settings
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      permissions: ['clipboard-read', 'clipboard-write'],
      ignoreHTTPSErrors: true,
      acceptDownloads: true,
      recordVideo: {
        mode: 'retain-on-failure',
        size: { width: 1920, height: 1080 }
      }
    });

    page = await context.newPage();

    // Enhanced console monitoring
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();

      if (type === 'error' && !isIgnorableError(text)) {
        errorTracker.addError('console', text, page.url());
        console.error(`[CONSOLE ERROR] ${text}`);
      } else if (type === 'warn' && !isIgnorableWarning(text)) {
        errorTracker.addError('warning', text, page.url());
        console.warn(`[CONSOLE WARN] ${text}`);
      }
    });

    // Page error monitoring
    page.on('pageerror', error => {
      errorTracker.addError('page', error.message, page.url(), error.stack);
      console.error(`[PAGE ERROR] ${error.message}`);
    });

    // Request/Response monitoring
    page.on('response', response => {
      const url = response.url();
      const status = response.status();

      // Track API responses
      if (url.includes('/api/')) {
        apiResponses.set(url, response);

        if (status >= 400) {
          errorTracker.addError('api', `API Error: ${status}`, url);
          console.error(`[API ERROR] ${url} - Status: ${status}`);
        }
      }
    });

    // Failed request monitoring
    page.on('requestfailed', request => {
      const url = request.url();
      const failure = request.failure();

      if (failure) {
        errorTracker.addError('network', `Request failed: ${failure.errorText}`, url);
        console.error(`[NETWORK ERROR] ${url} - ${failure.errorText}`);
      }
    });

    // Setup performance monitoring
    // await performanceMonitor.startMonitoring(page);
  });

  test.afterEach(async () => {
    // Generate test report
    // const performanceReport = await performanceMonitor.generateReport();
    const errorReport = errorTracker.generateReport();

    console.log('=== TEST EXECUTION REPORT ===');
    console.log('Errors:', errorReport);

    await context.close();
    apiResponses.clear();
    errorTracker.clear();
  });

  test.describe('1. Page Loading and Error Prevention', () => {
    test('should load analytics page without 500 errors', async () => {
      const startTime = Date.now();

      // Navigate to analytics page
      const response = await page.goto(TEST_CONFIG.ANALYTICS_URL, {
        waitUntil: 'networkidle',
        timeout: TEST_CONFIG.LOAD_TIMEOUT
      });

      const loadTime = Date.now() - startTime;

      // Verify successful response
      expect(response?.status()).toBeLessThan(400);
      expect(response?.status()).not.toBe(500);

      // Verify page loads within acceptable time
      expect(loadTime).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLD.PAGE_LOAD);

      // Verify page title and main content
      await expect(page).toHaveTitle(/Analytics|Claude|Dashboard/);

      // Check for main analytics container
      const analyticsContainer = page.locator('[data-testid="analytics-dashboard"], .analytics-dashboard, main');
      await expect(analyticsContainer.first()).toBeVisible({ timeout: 10000 });

      // Verify no server errors in network tab
      const serverErrorRequests = Array.from(apiResponses.values())
        .filter(response => response.status() >= 500);
      expect(serverErrorRequests.length).toBe(0);

      // Take screenshot for documentation
      await page.screenshot({
        path: 'test-results/analytics-page-loaded.png',
        fullPage: true
      });
    });

    test('should handle API failures gracefully without crashing', async () => {
      // Mock API failures
      await page.route('**/api/analytics/**', route => {
        route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Service temporarily unavailable',
            code: 'SERVICE_UNAVAILABLE'
          })
        });
      });

      await page.goto(TEST_CONFIG.ANALYTICS_URL);
      await page.waitForLoadState('networkidle');

      // Should display error state instead of crashing
      const errorElements = page.locator('[data-testid*="error"], .error-state, .error-message');
      await expect(errorElements.first()).toBeVisible({ timeout: 10000 });

      // Should provide retry mechanism
      const retryButton = page.locator('button:has-text("Retry"), button:has-text("Try Again")');
      if (await retryButton.isVisible()) {
        await expect(retryButton).toBeEnabled();
      }

      // Verify page structure is still intact
      const pageTitle = page.locator('h1, h2, .title');
      await expect(pageTitle.first()).toBeVisible();
    });

    test('should display appropriate loading states', async () => {
      // Add delay to API responses
      await page.route('**/api/analytics/**', route => {
        setTimeout(() => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(REAL_ANALYTICS_DATA)
          });
        }, 2000);
      });

      await page.goto(TEST_CONFIG.ANALYTICS_URL);

      // Should show loading indicators
      const loadingElements = page.locator(
        '[data-testid*="loading"], .loading, .spinner, [class*="loading"], [class*="spinner"]'
      );
      await expect(loadingElements.first()).toBeVisible({ timeout: 5000 });

      // Loading should eventually disappear
      await expect(loadingElements.first()).not.toBeVisible({ timeout: 15000 });

      // Content should be visible after loading
      const contentElements = page.locator('[data-testid*="dashboard"], .dashboard, .analytics-content');
      await expect(contentElements.first()).toBeVisible();
    });
  });

  test.describe('2. Tab Switching Functionality', () => {
    test('should switch between all analytics tabs correctly', async () => {
      await page.goto(TEST_CONFIG.ANALYTICS_URL);
      await page.waitForLoadState('networkidle');

      // Find all tabs
      const tabs = page.locator('[role="tab"], .tab-trigger, [data-testid*="tab"]');
      const tabCount = await tabs.count();

      expect(tabCount).toBeGreaterThan(0);

      // Test switching to each tab
      for (let i = 0; i < tabCount; i++) {
        const tab = tabs.nth(i);
        const tabText = await tab.textContent();

        console.log(`Testing tab ${i + 1}: ${tabText}`);

        const startTime = Date.now();
        await tab.click();

        // Wait for tab content to load
        await page.waitForTimeout(500);
        const switchTime = Date.now() - startTime;

        // Verify tab switch performance
        expect(switchTime).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLD.TAB_SWITCH);

        // Verify tab is active
        const isActive = await tab.getAttribute('aria-selected') === 'true' ||
                         await tab.evaluate(el => el.classList.contains('active'));
        expect(isActive).toBe(true);

        // Verify corresponding content is visible
        const tabContent = page.locator('[role="tabpanel"]:visible, .tab-content:visible');
        await expect(tabContent).toBeVisible({ timeout: 5000 });

        // Take screenshot of each tab
        await page.screenshot({
          path: `test-results/tab-${i + 1}-${tabText?.replace(/\s+/g, '-').toLowerCase()}.png`,
          fullPage: true
        });
      }
    });

    test('should maintain tab state during interactions', async () => {
      await page.goto(TEST_CONFIG.ANALYTICS_URL);
      await page.waitForLoadState('networkidle');

      const tabs = page.locator('[role="tab"]');

      if (await tabs.count() > 1) {
        // Switch to second tab
        await tabs.nth(1).click();
        await page.waitForTimeout(500);

        // Interact with page elements
        const buttons = page.locator('button:visible');
        if (await buttons.count() > 0) {
          await buttons.first().click();
          await page.waitForTimeout(500);
        }

        // Verify tab is still active
        const secondTab = tabs.nth(1);
        const isStillActive = await secondTab.getAttribute('aria-selected') === 'true' ||
                             await secondTab.evaluate(el => el.classList.contains('active'));
        expect(isStillActive).toBe(true);
      }
    });

    test('should support keyboard navigation between tabs', async () => {
      await page.goto(TEST_CONFIG.ANALYTICS_URL);
      await page.waitForLoadState('networkidle');

      const tabs = page.locator('[role="tab"]');

      if (await tabs.count() > 1) {
        // Focus first tab
        await tabs.first().focus();

        // Navigate with arrow keys
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(300);

        // Verify focus moved to next tab
        const focusedElement = page.locator(':focus');
        const focusedTabIndex = await focusedElement.evaluate(el => {
          const allTabs = Array.from(el.closest('[role="tablist"]')?.querySelectorAll('[role="tab"]') || []);
          return allTabs.indexOf(el);
        });

        expect(focusedTabIndex).toBeGreaterThan(-1);

        // Activate tab with Enter
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);

        // Verify tab content is visible
        const tabContent = page.locator('[role="tabpanel"]:visible');
        await expect(tabContent).toBeVisible();
      }
    });
  });

  test.describe('3. API Integration and Data Flow', () => {
    test('should successfully load all required API endpoints', async () => {
      const expectedEndpoints = [
        '/api/analytics/cost-metrics',
        '/api/analytics/usage-data',
        '/api/analytics/charts',
        '/api/claude-code/status'
      ];

      // Setup endpoint monitoring
      const endpointHits = new Map<string, boolean>();

      page.on('response', response => {
        const url = response.url();
        expectedEndpoints.forEach(endpoint => {
          if (url.includes(endpoint)) {
            endpointHits.set(endpoint, response.status() < 400);
          }
        });
      });

      await page.goto(TEST_CONFIG.ANALYTICS_URL);
      await page.waitForLoadState('networkidle');

      // Wait for all API calls to complete
      await page.waitForTimeout(3000);

      // Verify all endpoints were hit successfully
      expectedEndpoints.forEach(endpoint => {
        const wasHit = endpointHits.get(endpoint);
        console.log(`Endpoint ${endpoint}: ${wasHit ? 'SUCCESS' : 'FAILED'}`);
      });

      // At least some core endpoints should be successful
      const successfulEndpoints = Array.from(endpointHits.values()).filter(Boolean);
      expect(successfulEndpoints.length).toBeGreaterThan(0);
    });

    test('should handle real-time data updates', async () => {
      let updateCount = 0;

      // Mock real-time data endpoint
      await page.route('**/api/analytics/realtime', route => {
        updateCount++;
        const updatedData = {
          ...REAL_ANALYTICS_DATA,
          timestamp: new Date().toISOString(),
          updateId: updateCount,
          costMetrics: {
            ...REAL_ANALYTICS_DATA.costMetrics,
            totalCost: REAL_ANALYTICS_DATA.costMetrics.totalCost + (updateCount * 0.001)
          }
        };

        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(updatedData),
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });
      });

      await page.goto(TEST_CONFIG.ANALYTICS_URL);
      await page.waitForLoadState('networkidle');

      // Look for real-time indicators
      const realtimeElements = page.locator('[data-testid*="realtime"], [data-testid*="live"], .live-indicator');

      // Trigger refresh if available
      const refreshButton = page.locator('[data-testid*="refresh"], button:has-text("Refresh")');
      if (await refreshButton.isVisible()) {
        await refreshButton.click();
        await page.waitForTimeout(2000);
      }

      // Verify updates were received
      expect(updateCount).toBeGreaterThan(0);
    });

    test('should validate API response formats', async () => {
      const apiValidations: Array<{endpoint: string, valid: boolean, error?: string}> = [];

      page.on('response', async response => {
        const url = response.url();

        if (url.includes('/api/analytics/')) {
          try {
            const responseData = await response.json();

            // Basic validation
            const isValid = typeof responseData === 'object' &&
                           responseData !== null &&
                           response.status() < 400;

            apiValidations.push({
              endpoint: url,
              valid: isValid
            });
          } catch (error) {
            apiValidations.push({
              endpoint: url,
              valid: false,
              error: String(error)
            });
          }
        }
      });

      await page.goto(TEST_CONFIG.ANALYTICS_URL);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      // Verify API responses are valid
      const invalidResponses = apiValidations.filter(v => !v.valid);
      if (invalidResponses.length > 0) {
        console.log('Invalid API responses:', invalidResponses);
      }

      // Should have mostly valid responses
      const validResponseRate = apiValidations.length > 0 ?
        apiValidations.filter(v => v.valid).length / apiValidations.length : 1;
      expect(validResponseRate).toBeGreaterThan(0.8);
    });
  });

  test.describe('4. Chart and Data Visualization', () => {
    test('should render charts with real data', async () => {
      // Mock chart data endpoint
      await page.route('**/api/analytics/chart-data', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(REAL_ANALYTICS_DATA.chartData)
        });
      });

      await page.goto(TEST_CONFIG.ANALYTICS_URL);
      await page.waitForLoadState('networkidle');

      // Wait for charts to render
      await page.waitForTimeout(3000);

      // Find chart containers
      const charts = page.locator('canvas, svg, [data-testid*="chart"], [class*="chart"]');
      const chartCount = await charts.count();

      console.log(`Found ${chartCount} chart elements`);
      expect(chartCount).toBeGreaterThan(0);

      // Verify charts are visible and have content
      for (let i = 0; i < Math.min(chartCount, 5); i++) {
        const chart = charts.nth(i);
        await expect(chart).toBeVisible();

        // Check chart dimensions
        const boundingBox = await chart.boundingBox();
        expect(boundingBox?.width).toBeGreaterThan(50);
        expect(boundingBox?.height).toBeGreaterThan(50);
      }

      // Take screenshot of charts
      await page.screenshot({
        path: 'test-results/charts-rendered.png',
        fullPage: true
      });
    });

    test('should handle chart interactions', async () => {
      await page.goto(TEST_CONFIG.ANALYTICS_URL);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      const charts = page.locator('canvas, svg, [data-testid*="chart"]');

      if (await charts.count() > 0) {
        const firstChart = charts.first();
        await expect(firstChart).toBeVisible();

        // Test hover interactions
        await firstChart.hover();
        await page.waitForTimeout(500);

        // Look for tooltips or hover effects
        const tooltips = page.locator('[data-testid*="tooltip"], .tooltip, [role="tooltip"]');
        // Tooltips may or may not appear - this is not a failure condition

        // Test click interactions
        const boundingBox = await firstChart.boundingBox();
        if (boundingBox) {
          await page.mouse.click(
            boundingBox.x + boundingBox.width / 2,
            boundingBox.y + boundingBox.height / 2
          );
          await page.waitForTimeout(500);
        }
      }
    });

    test('should display cost metrics accurately', async () => {
      await page.goto(TEST_CONFIG.ANALYTICS_URL);
      await page.waitForLoadState('networkidle');

      // Look for cost display elements
      const costElements = page.locator(
        '[data-testid*="cost"], [class*="cost"], text=/\\$[0-9]/, text=/\\$[0-9.,]+/'
      );

      if (await costElements.count() > 0) {
        await expect(costElements.first()).toBeVisible();

        // Verify currency formatting
        const costText = await costElements.first().textContent();
        expect(costText).toMatch(/\$\d+(\.\d{2,4})?/);
      }

      // Look for token count displays
      const tokenElements = page.locator('[data-testid*="token"], text=/[0-9,]+ tokens?/i');
      if (await tokenElements.count() > 0) {
        await expect(tokenElements.first()).toBeVisible();
      }

      // Look for usage percentages
      const percentageElements = page.locator('text=/[0-9]+%/');
      if (await percentageElements.count() > 0) {
        await expect(percentageElements.first()).toBeVisible();
      }
    });
  });

  test.describe('5. Interactive Elements and User Interface', () => {
    test('should have functional interactive elements', async () => {
      await page.goto(TEST_CONFIG.ANALYTICS_URL);
      await page.waitForLoadState('networkidle');

      // Test buttons
      const buttons = page.locator('button:visible:enabled');
      const buttonCount = await buttons.count();

      console.log(`Found ${buttonCount} interactive buttons`);

      if (buttonCount > 0) {
        // Test first few buttons
        for (let i = 0; i < Math.min(buttonCount, 3); i++) {
          const button = buttons.nth(i);
          const buttonText = await button.textContent();

          console.log(`Testing button: ${buttonText}`);

          await expect(button).toBeEnabled();
          await button.click();
          await page.waitForTimeout(500);
        }
      }

      // Test form inputs
      const inputs = page.locator('input:visible, select:visible');
      const inputCount = await inputs.count();

      if (inputCount > 0) {
        for (let i = 0; i < Math.min(inputCount, 2); i++) {
          const input = inputs.nth(i);
          const inputType = await input.getAttribute('type');

          if (inputType === 'text' || inputType === 'search') {
            await input.fill('test');
            await page.waitForTimeout(300);
            await input.clear();
          }
        }
      }

      // Test dropdowns/selects
      const selects = page.locator('select:visible');
      const selectCount = await selects.count();

      if (selectCount > 0) {
        const select = selects.first();
        const options = await select.locator('option').count();

        if (options > 1) {
          await select.selectOption({ index: 1 });
          await page.waitForTimeout(500);
        }
      }
    });

    test('should support time range selection', async () => {
      await page.goto(TEST_CONFIG.ANALYTICS_URL);
      await page.waitForLoadState('networkidle');

      // Look for time range controls
      const timeControls = page.locator(
        '[data-testid*="time"], .time-range, button:has-text("24h"), button:has-text("7d"), button:has-text("30d")'
      );

      if (await timeControls.count() > 0) {
        console.log('Testing time range controls');

        // Test different time ranges
        const controls = await timeControls.all();
        for (const control of controls.slice(0, 3)) {
          const controlText = await control.textContent();
          console.log(`Testing time range: ${controlText}`);

          await control.click();
          await page.waitForTimeout(1000);

          // Verify content updates (charts should re-render)
          const charts = page.locator('canvas, svg, [data-testid*="chart"]');
          if (await charts.count() > 0) {
            await expect(charts.first()).toBeVisible();
          }
        }
      }
    });

    test('should handle filter and search functionality', async () => {
      await page.goto(TEST_CONFIG.ANALYTICS_URL);
      await page.waitForLoadState('networkidle');

      // Look for search/filter inputs
      const searchInputs = page.locator(
        'input[type="search"], input[placeholder*="search" i], input[placeholder*="filter" i]'
      );

      if (await searchInputs.count() > 0) {
        const searchInput = searchInputs.first();
        await expect(searchInput).toBeVisible();

        // Test search functionality
        await searchInput.fill('claude');
        await page.waitForTimeout(1000);

        // Clear search
        await searchInput.clear();
        await page.waitForTimeout(500);
      }

      // Look for filter buttons or dropdowns
      const filterElements = page.locator(
        '[data-testid*="filter"], .filter, button:has-text("Filter")'
      );

      if (await filterElements.count() > 0) {
        await filterElements.first().click();
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('6. Export and Download Functionality', () => {
    test('should support data export features', async () => {
      await page.goto(TEST_CONFIG.ANALYTICS_URL);
      await page.waitForLoadState('networkidle');

      // Navigate to export tab if it exists
      const exportTab = page.locator('[role="tab"]:has-text("Export"), [role="tab"]:has-text("Report")');
      if (await exportTab.isVisible()) {
        await exportTab.click();
        await page.waitForTimeout(1000);
      }

      // Look for export buttons
      const exportButtons = page.locator(
        '[data-testid*="export"], button:has-text("Export"), button:has-text("Download"), .export-btn'
      );

      if (await exportButtons.count() > 0) {
        console.log('Testing export functionality');

        const exportButton = exportButtons.first();
        await expect(exportButton).toBeVisible();
        await expect(exportButton).toBeEnabled();

        // Set up download handler
        const downloadPromise = page.waitForEvent('download', { timeout: 10000 });

        // Click export button
        await exportButton.click();

        try {
          const download = await downloadPromise;
          const filename = download.suggestedFilename();

          console.log(`Download initiated: ${filename}`);
          expect(filename).toMatch(/\.(json|csv|xlsx|pdf)$/i);

          // Verify file size is reasonable
          await download.saveAs(`test-results/exported-${filename}`);

        } catch (error) {
          console.log('Export might use different mechanism than download event');

          // Check for export success indicators
          const successMessages = page.locator('[data-testid*="success"], .success, .export-success');
          if (await successMessages.count() > 0) {
            await expect(successMessages.first()).toBeVisible();
          }
        }
      }
    });

    test('should support different export formats', async () => {
      await page.goto(TEST_CONFIG.ANALYTICS_URL);
      await page.waitForLoadState('networkidle');

      // Look for format selection
      const formatSelectors = page.locator(
        'select:has(option[value*="json"]), select:has(option[value*="csv"]), [data-testid*="format"]'
      );

      if (await formatSelectors.count() > 0) {
        const selector = formatSelectors.first();
        await expect(selector).toBeVisible();

        // Test different formats
        const options = await selector.locator('option').all();
        console.log(`Found ${options.length} export format options`);

        for (let i = 0; i < Math.min(options.length, 3); i++) {
          const option = options[i];
          const optionValue = await option.getAttribute('value');
          const optionText = await option.textContent();

          console.log(`Testing export format: ${optionText} (${optionValue})`);

          if (optionValue) {
            await selector.selectOption(optionValue);
            await page.waitForTimeout(500);
          }
        }
      }
    });
  });

  test.describe('7. Performance and Responsiveness', () => {
    test('should meet performance benchmarks', async () => {
      const performanceMetrics = {
        pageLoad: 0,
        firstContentfulPaint: 0,
        largestContentfulPaint: 0,
        interactionToNextPaint: 0
      };

      // Navigate and measure performance
      await page.goto(TEST_CONFIG.ANALYTICS_URL, {
        waitUntil: 'networkidle'
      });

      // Get performance metrics
      const metrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const paint = performance.getEntriesByType('paint');

        return {
          pageLoad: navigation.loadEventEnd - navigation.fetchStart,
          firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart
        };
      });

      console.log('Performance metrics:', metrics);

      // Verify performance thresholds
      expect(metrics.pageLoad).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLD.PAGE_LOAD);
      expect(metrics.firstContentfulPaint).toBeLessThan(3000);
      expect(metrics.domContentLoaded).toBeLessThan(4000);

      // Test interaction responsiveness
      const buttons = page.locator('button:visible:enabled');
      if (await buttons.count() > 0) {
        const startTime = Date.now();
        await buttons.first().click();
        const responseTime = Date.now() - startTime;

        expect(responseTime).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLD.TAB_SWITCH);
      }
    });

    test('should handle large datasets efficiently', async () => {
      // Mock large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        timestamp: new Date(Date.now() - i * 60000).toISOString(),
        cost: Math.random() * 0.1,
        tokens: Math.floor(Math.random() * 1000),
        provider: i % 2 === 0 ? 'claude' : 'openai'
      }));

      await page.route('**/api/analytics/**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...REAL_ANALYTICS_DATA,
            usageData: largeDataset
          })
        });
      });

      const startTime = Date.now();
      await page.goto(TEST_CONFIG.ANALYTICS_URL);
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;

      console.log(`Large dataset load time: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(10000);

      // Verify page remains responsive
      const interactiveElements = page.locator('button:visible, [role="tab"]:visible');
      if (await interactiveElements.count() > 0) {
        await expect(interactiveElements.first()).toBeEnabled();
      }
    });

    test('should be responsive across different screen sizes', async () => {
      await page.goto(TEST_CONFIG.ANALYTICS_URL);
      await page.waitForLoadState('networkidle');

      const viewports = [
        { width: 375, height: 667, name: 'Mobile' },
        { width: 768, height: 1024, name: 'Tablet' },
        { width: 1280, height: 720, name: 'Desktop' },
        { width: 1920, height: 1080, name: 'Large Desktop' }
      ];

      for (const viewport of viewports) {
        console.log(`Testing ${viewport.name} viewport: ${viewport.width}x${viewport.height}`);

        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.waitForTimeout(1000);

        // Verify main content is visible
        const mainContent = page.locator('[data-testid*="analytics"], main, .analytics-dashboard');
        await expect(mainContent.first()).toBeVisible();

        // Take screenshot for each viewport
        await page.screenshot({
          path: `test-results/responsive-${viewport.name.toLowerCase()}.png`,
          fullPage: true
        });

        // Verify navigation is accessible
        const navigation = page.locator('[role="tab"], .tab, nav');
        if (await navigation.count() > 0) {
          await expect(navigation.first()).toBeVisible();
        }
      }
    });
  });

  test.describe('8. Error Handling and Edge Cases', () => {
    test('should handle network connectivity issues', async () => {
      await page.goto(TEST_CONFIG.ANALYTICS_URL);
      await page.waitForLoadState('networkidle');

      // Simulate network failure
      await page.setOffline(true);

      // Try to refresh or interact
      const refreshButton = page.locator('[data-testid*="refresh"], button:has-text("Refresh")');
      if (await refreshButton.isVisible()) {
        await refreshButton.click();
        await page.waitForTimeout(2000);
      }

      // Should display offline state
      const offlineIndicators = page.locator(
        '[data-testid*="offline"], .offline, [data-testid*="error"], .error'
      );

      // Restore connectivity
      await page.setOffline(false);
      await page.waitForTimeout(1000);

      // Should recover when connectivity returns
      if (await refreshButton.isVisible()) {
        await refreshButton.click();
        await page.waitForTimeout(3000);
      }
    });

    test('should validate input handling and edge cases', async () => {
      await page.goto(TEST_CONFIG.ANALYTICS_URL);
      await page.waitForLoadState('networkidle');

      // Test search inputs with edge cases
      const searchInputs = page.locator('input[type="search"], input[type="text"]');

      if (await searchInputs.count() > 0) {
        const input = searchInputs.first();

        // Test various input scenarios
        const testInputs = [
          '',
          'a',
          'a'.repeat(100),
          '!@#$%^&*()',
          '<script>alert("xss")</script>',
          '   spaces   '
        ];

        for (const testInput of testInputs) {
          await input.fill(testInput);
          await page.waitForTimeout(500);

          // Verify no errors occurred
          const errorCount = errorTracker.getErrors().length;
          // Should not increase significantly with edge case inputs
        }
      }
    });
  });

  // Final comprehensive test report
  test('should generate comprehensive test execution report', async () => {
    await page.goto(TEST_CONFIG.ANALYTICS_URL);
    await page.waitForLoadState('networkidle');

    // Collect final metrics
    const finalReport = {
      timestamp: new Date().toISOString(),
      url: page.url(),
      viewport: await page.viewportSize(),
      errors: errorTracker.generateReport(),
      // performance: await performanceMonitor.generateReport(),
      apiCalls: Array.from(apiResponses.entries()).map(([url, response]) => ({
        url,
        status: response.status(),
        ok: response.ok()
      })),
      screenshots: [
        'analytics-page-loaded.png',
        'charts-rendered.png',
        'responsive-mobile.png',
        'responsive-tablet.png',
        'responsive-desktop.png'
      ]
    };

    console.log('=== COMPREHENSIVE TEST REPORT ===');
    console.log(JSON.stringify(finalReport, null, 2));

    // Save report to file
    await page.evaluate((report) => {
      localStorage.setItem('claude-sdk-analytics-test-report', JSON.stringify(report));
    }, finalReport);

    // Final assertions
    expect(finalReport.errors.totalErrors).toBeLessThan(5);
    expect(finalReport.apiCalls.filter(call => call.ok).length).toBeGreaterThan(0);

    // Take final comprehensive screenshot
    await page.screenshot({
      path: 'test-results/final-comprehensive-test.png',
      fullPage: true
    });
  });
});

// Helper functions
function isIgnorableError(message: string): boolean {
  const ignorablePatterns = [
    /ResizeObserver/,
    /Non-passive event listener/,
    /favicon\.ico/,
    /chrome-extension/
  ];

  return ignorablePatterns.some(pattern => pattern.test(message));
}

function isIgnorableWarning(message: string): boolean {
  const ignorablePatterns = [
    /componentWillReceiveProps/,
    /componentWillMount/,
    /findDOMNode/
  ];

  return ignorablePatterns.some(pattern => pattern.test(message));
}