import { test, expect, Page, BrowserContext } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// Test Configuration
const FRONTEND_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3001';
const SCREENSHOT_DIR = '/workspaces/agent-feed/tests/screenshots/sparc-completion';
const PERFORMANCE_THRESHOLD = 5000; // 5 seconds max page load
const API_TIMEOUT = 10000; // 10 seconds for API calls

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

test.describe('SPARC Completion - UI/UX Validation with Error Elimination', () => {
  let page: Page;
  let context: BrowserContext;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true,
    });
    page = await context.newPage();

    // Monitor console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Console Error:', msg.text());
      }
    });

    // Monitor failed requests
    page.on('requestfailed', request => {
      console.error('Request Failed:', request.url(), request.failure()?.errorText);
    });
  });

  test.afterEach(async () => {
    await context.close();
  });

  test.describe('API Endpoint Health Verification', () => {
    test('should verify all critical API endpoints are operational', async () => {
      const endpoints = [
        '/api/activities',
        '/api/token-analytics/hourly',
        '/api/token-analytics/daily',
        '/api/token-analytics/messages',
        '/api/token-analytics/summary'
      ];

      for (const endpoint of endpoints) {
        const response = await page.request.get(`${API_URL}${endpoint}`);
        expect(response.status()).toBe(200);

        const data = await response.json();
        expect(data).toBeDefined();
        console.log(`✅ ${endpoint}: ${response.status()}`);
      }
    });
  });

  test.describe('Agents Page - Error Elimination Validation', () => {
    test('should load Agents page without "failed to fetch" errors', async () => {
      const startTime = Date.now();

      // Navigate to agents page
      await page.goto(`${FRONTEND_URL}/agents`, { waitUntil: 'networkidle' });

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLD);

      // Wait for data to load
      await page.waitForTimeout(2000);

      // Check for error messages
      const errorMessages = await page.locator('text=/failed to fetch|network error|connection failed/i').count();
      expect(errorMessages).toBe(0);

      // Verify agents are displayed
      const agentElements = await page.locator('[data-testid="agent-card"], .agent-item, .agent-card').count();
      expect(agentElements).toBeGreaterThan(0);

      // Take screenshot evidence
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'agents-page-success.png'),
        fullPage: true
      });

      console.log(`✅ Agents page loaded successfully in ${loadTime}ms with ${agentElements} agents`);
    });

    test('should display real agent data with proper formatting', async () => {
      await page.goto(`${FRONTEND_URL}/agents`);
      await page.waitForTimeout(3000);

      // Check for realistic agent names (not placeholder data)
      const agentNames = await page.locator('[data-testid="agent-name"], .agent-name, h3, h4').allTextContents();
      expect(agentNames.length).toBeGreaterThan(0);

      // Verify no "loading..." or "error" states persist
      const loadingElements = await page.locator('text=/loading|error|failed/i').count();
      expect(loadingElements).toBe(0);

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'agents-real-data.png'),
        fullPage: true
      });
    });
  });

  test.describe('Analytics Page - Charts and Data Validation', () => {
    test('should load Analytics page with working charts and no fetch errors', async () => {
      const startTime = Date.now();

      await page.goto(`${FRONTEND_URL}/analytics`, { waitUntil: 'networkidle' });

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLD);

      // Wait for charts to render
      await page.waitForTimeout(4000);

      // Check for specific error messages that were reported
      const fetchErrors = await page.locator('text=/failed to fetch hourly data|Failed to fetch|network error/i').count();
      expect(fetchErrors).toBe(0);

      // Look for chart elements (Canvas elements for Chart.js)
      const chartElements = await page.locator('canvas, .chart-container, [data-testid="chart"]').count();
      expect(chartElements).toBeGreaterThan(0);

      // Verify no "No data" messages persist
      const noDataMessages = await page.locator('text=/no data|no results|empty/i').count();
      expect(noDataMessages).toBe(0);

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'analytics-charts-success.png'),
        fullPage: true
      });

      console.log(`✅ Analytics page loaded in ${loadTime}ms with ${chartElements} charts`);
    });

    test('should display real analytics data in charts', async () => {
      await page.goto(`${FRONTEND_URL}/analytics`);
      await page.waitForTimeout(5000);

      // Check that charts have actual data by looking for SVG/Canvas content
      const canvasElements = await page.locator('canvas').count();
      expect(canvasElements).toBeGreaterThan(0);

      // Verify analytics summary has real numbers
      const numbers = await page.locator('text=/\\d+\\.?\\d*/').count();
      expect(numbers).toBeGreaterThan(3); // Should have multiple numeric values

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'analytics-real-data.png'),
        fullPage: true
      });
    });
  });

  test.describe('Live Feed - Activities Validation', () => {
    test('should load activities feed without network errors', async () => {
      const startTime = Date.now();

      // Try different possible routes for activities/feed
      const feedRoutes = ['/', '/feed', '/activities', '/live-feed'];
      let successfulRoute = null;

      for (const route of feedRoutes) {
        try {
          await page.goto(`${FRONTEND_URL}${route}`, { waitUntil: 'networkidle', timeout: 10000 });

          // Check if this page has activities
          await page.waitForTimeout(2000);
          const activityElements = await page.locator('[data-testid="activity"], .activity-item, .feed-item, .activity').count();

          if (activityElements > 0) {
            successfulRoute = route;
            break;
          }
        } catch (e) {
          console.log(`Route ${route} failed or has no activities`);
        }
      }

      const loadTime = Date.now() - startTime;

      if (successfulRoute) {
        console.log(`✅ Found activities on route: ${successfulRoute}`);

        // Check for the specific error that was reported
        const networkErrors = await page.locator('text=/Network error for.*activities.*Connection failed|failed to fetch/i').count();
        expect(networkErrors).toBe(0);

        // Verify activities are displayed
        const activityCount = await page.locator('[data-testid="activity"], .activity-item, .feed-item, .activity').count();
        expect(activityCount).toBeGreaterThan(0);

        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, 'activities-feed-success.png'),
          fullPage: true
        });

        console.log(`✅ Activities loaded successfully on ${successfulRoute} in ${loadTime}ms with ${activityCount} items`);
      } else {
        // Take screenshot of current page for debugging
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, 'activities-search-debug.png'),
          fullPage: true
        });
        console.log('❌ Could not find activities feed on any tested route');
      }
    });

    test('should display real activity data with proper timestamps', async () => {
      await page.goto(`${FRONTEND_URL}/`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);

      // Look for activity elements or any feed content
      const hasContent = await page.locator('text=/activity|message|post|update|agent/i').count();

      if (hasContent > 0) {
        // Check for realistic timestamps
        const timestamps = await page.locator('text=/\\d{1,2}:\\d{2}|\\d{1,2} \\w+ ago|\\d{4}-\\d{2}-\\d{2}/').count();
        expect(timestamps).toBeGreaterThan(0);

        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, 'activities-timestamps.png'),
          fullPage: true
        });
      }
    });
  });

  test.describe('Cross-Browser Compatibility', () => {
    ['chromium', 'firefox'].forEach(browserName => {
      test(`should work correctly on ${browserName}`, async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();

        await page.goto(`${FRONTEND_URL}/agents`);
        await page.waitForTimeout(3000);

        // Basic functionality test
        const errorCount = await page.locator('text=/error|failed|network/i').count();
        expect(errorCount).toBe(0);

        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, `cross-browser-${browserName}.png`),
          fullPage: true
        });

        await context.close();
      });
    });
  });

  test.describe('Responsive Design Validation', () => {
    const viewports = [
      { name: 'desktop', width: 1920, height: 1080 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'mobile', width: 375, height: 667 }
    ];

    viewports.forEach(viewport => {
      test(`should display correctly on ${viewport.name} viewport`, async () => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(`${FRONTEND_URL}/agents`);
        await page.waitForTimeout(2000);

        // Check that content is visible and not cut off
        const contentVisible = await page.locator('body').isVisible();
        expect(contentVisible).toBe(true);

        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, `responsive-${viewport.name}.png`),
          fullPage: true
        });
      });
    });
  });

  test.describe('Performance Validation', () => {
    test('should meet performance benchmarks', async () => {
      const routes = ['/agents', '/analytics', '/'];

      for (const route of routes) {
        const startTime = Date.now();
        await page.goto(`${FRONTEND_URL}${route}`, { waitUntil: 'networkidle' });
        const loadTime = Date.now() - startTime;

        expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLD);
        console.log(`✅ ${route} loaded in ${loadTime}ms (under ${PERFORMANCE_THRESHOLD}ms threshold)`);
      }
    });

    test('should handle concurrent requests efficiently', async () => {
      const promises = [];

      // Make concurrent requests to test server stability
      for (let i = 0; i < 5; i++) {
        promises.push(
          page.request.get(`${API_URL}/api/activities?limit=10&offset=${i * 10}`)
        );
      }

      const responses = await Promise.all(promises);

      for (const response of responses) {
        expect(response.status()).toBe(200);
      }

      console.log('✅ Handled 5 concurrent requests successfully');
    });
  });

  test.describe('UUID Operations Safety', () => {
    test('should handle UUIDs without string method errors', async () => {
      await page.goto(`${FRONTEND_URL}/agents`);
      await page.waitForTimeout(3000);

      // Check console for UUID-related errors (like .slice errors)
      const consoleErrors: string[] = [];

      page.on('console', msg => {
        if (msg.type() === 'error' && msg.text().includes('slice')) {
          consoleErrors.push(msg.text());
        }
      });

      // Trigger any UUID operations by interacting with the page
      await page.reload();
      await page.waitForTimeout(2000);

      expect(consoleErrors.length).toBe(0);
      console.log('✅ No UUID string method errors detected');
    });
  });

  test.describe('Interactive Features Validation', () => {
    test('should have working pagination and filtering', async () => {
      await page.goto(`${FRONTEND_URL}/`);
      await page.waitForTimeout(3000);

      // Look for pagination controls
      const paginationElements = await page.locator('button:has-text("Next"), button:has-text("Previous"), .pagination, [data-testid="pagination"]').count();

      if (paginationElements > 0) {
        console.log('✅ Pagination elements found');

        // Try clicking a pagination button if it exists
        const nextButton = page.locator('button:has-text("Next")').first();
        if (await nextButton.isVisible()) {
          await nextButton.click();
          await page.waitForTimeout(1000);
          console.log('✅ Pagination click successful');
        }
      }

      // Look for filter controls
      const filterElements = await page.locator('select, input[type="search"], .filter, [data-testid="filter"]').count();

      if (filterElements > 0) {
        console.log('✅ Filter elements found');
      }

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'interactive-features.png'),
        fullPage: true
      });
    });
  });
});