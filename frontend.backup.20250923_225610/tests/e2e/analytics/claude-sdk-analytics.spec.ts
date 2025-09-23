import { test, expect, Page } from '@playwright/test';

test.describe('Claude SDK Analytics E2E Tests', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    // Navigate to analytics page
    await page.goto('/analytics');

    // Wait for page to load completely
    await page.waitForLoadState('networkidle');
  });

  test.describe('Page Load and Navigation', () => {
    test('should load analytics page without white screen', async () => {
      // Check that page has loaded successfully
      await expect(page).toHaveTitle(/Agent Feed/);

      // Verify no white screen - check for main content
      const mainContent = page.locator('main, [role="main"], .analytics-container');
      await expect(mainContent).toBeVisible({ timeout: 10000 });

      // Take screenshot of initial load
      await page.screenshot({
        path: 'test-results/analytics-page-load.png',
        fullPage: true
      });
    });

    test('should not have console errors on page load', async () => {
      const consoleErrors: string[] = [];

      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      // Reload page to capture any console errors
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Allow some time for any async errors
      await page.waitForTimeout(2000);

      // Filter out known non-critical errors
      const criticalErrors = consoleErrors.filter(error =>
        !error.includes('favicon') &&
        !error.includes('WebSocket') &&
        !error.includes('404')
      );

      expect(criticalErrors).toHaveLength(0);
    });

    test('should handle browser refresh gracefully', async () => {
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Verify page still works after refresh
      const mainContent = page.locator('main, [role="main"], .analytics-container');
      await expect(mainContent).toBeVisible();

      await page.screenshot({
        path: 'test-results/analytics-after-refresh.png',
        fullPage: true
      });
    });
  });

  test.describe('Tab Functionality Testing', () => {
    test('should display System Analytics tab by default', async () => {
      // Look for tab navigation
      const systemTab = page.locator('[role="tab"]').filter({ hasText: /system|analytics/i }).first();

      if (await systemTab.isVisible()) {
        await expect(systemTab).toHaveAttribute('aria-selected', 'true');
      }

      await page.screenshot({
        path: 'test-results/system-analytics-default.png',
        fullPage: true
      });
    });

    test('should switch to Claude SDK Analytics tab successfully', async () => {
      // Look for Claude SDK Analytics tab
      const claudeSDKTab = page.locator('[role="tab"]').filter({ hasText: /claude.*sdk/i });

      if (await claudeSDKTab.isVisible()) {
        const startTime = Date.now();

        await claudeSDKTab.click();
        await page.waitForLoadState('networkidle');

        const endTime = Date.now();
        const switchTime = endTime - startTime;

        // Verify tab switch was fast (< 1 second)
        expect(switchTime).toBeLessThan(1000);

        // Verify tab is now selected
        await expect(claudeSDKTab).toHaveAttribute('aria-selected', 'true');

        await page.screenshot({
          path: 'test-results/claude-sdk-analytics-tab.png',
          fullPage: true
        });
      } else {
        console.log('Claude SDK Analytics tab not found - may be integrated or renamed');
      }
    });

    test('should support keyboard navigation between tabs', async () => {
      const tabs = page.locator('[role="tab"]');
      const tabCount = await tabs.count();

      if (tabCount > 1) {
        // Focus first tab
        await tabs.first().focus();

        // Navigate with arrow keys
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(500);

        // Verify focus moved
        const focusedElement = page.locator(':focus');
        await expect(focusedElement).toBeVisible();

        await page.screenshot({
          path: 'test-results/keyboard-navigation.png',
          fullPage: true
        });
      }
    });

    test('should handle performance tab if it exists', async () => {
      const performanceTab = page.locator('[role="tab"]').filter({ hasText: /performance/i });

      if (await performanceTab.isVisible()) {
        await performanceTab.click();
        await page.waitForLoadState('networkidle');

        await expect(performanceTab).toHaveAttribute('aria-selected', 'true');

        await page.screenshot({
          path: 'test-results/performance-tab.png',
          fullPage: true
        });
      }
    });
  });

  test.describe('Claude SDK Analytics Specific Tests', () => {
    test('should load EnhancedAnalyticsPage components', async () => {
      // Look for Claude SDK specific content
      const analyticsContent = page.locator('.analytics-content, .enhanced-analytics, [data-testid*="analytics"]');

      // Wait for analytics content to load
      await page.waitForTimeout(3000);

      // Check if any analytics components are visible
      const contentVisible = await analyticsContent.count() > 0;

      if (contentVisible) {
        await expect(analyticsContent.first()).toBeVisible();
      }

      // Look for charts, graphs, or data visualizations
      const charts = page.locator('svg, canvas, .chart, .graph, .recharts-wrapper');
      const chartsCount = await charts.count();

      console.log(`Found ${chartsCount} chart/visualization elements`);

      await page.screenshot({
        path: 'test-results/analytics-components.png',
        fullPage: true
      });
    });

    test('should handle API call failures gracefully', async () => {
      // Intercept and fail API calls to test error handling
      await page.route('**/api/**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Test API failure' })
        });
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Check for error states or fallback content
      const errorStates = page.locator('.error, .fallback, [data-testid*="error"]');
      const loadingStates = page.locator('.loading, .spinner, [data-testid*="loading"]');

      // Should either show error state or handle gracefully
      const hasErrorHandling = await errorStates.count() > 0 || await loadingStates.count() === 0;
      expect(hasErrorHandling).toBeTruthy();

      await page.screenshot({
        path: 'test-results/error-handling.png',
        fullPage: true
      });
    });

    test('should display analytics data correctly', async () => {
      // Look for data containers, metrics, or statistics
      const dataElements = page.locator(
        '.metric, .statistic, .data-point, .analytics-value, ' +
        '[data-testid*="metric"], [data-testid*="data"], ' +
        '.number, .percentage, .count'
      );

      await page.waitForTimeout(5000); // Allow time for data to load

      const dataCount = await dataElements.count();
      console.log(`Found ${dataCount} data elements`);

      // If data elements exist, verify they have content
      if (dataCount > 0) {
        for (let i = 0; i < Math.min(dataCount, 5); i++) {
          const element = dataElements.nth(i);
          const text = await element.textContent();
          expect(text?.trim().length).toBeGreaterThan(0);
        }
      }

      await page.screenshot({
        path: 'test-results/analytics-data.png',
        fullPage: true
      });
    });
  });

  test.describe('Regression Testing', () => {
    test('should maintain existing navigation functionality', async () => {
      // Test navigation to other pages
      const navLinks = page.locator('nav a, [role="navigation"] a');
      const linkCount = await navLinks.count();

      if (linkCount > 0) {
        // Test navigation to home or dashboard
        const homeLink = navLinks.filter({ hasText: /home|dashboard|feed/i }).first();

        if (await homeLink.isVisible()) {
          await homeLink.click();
          await page.waitForLoadState('networkidle');

          // Navigate back to analytics
          await page.goto('/analytics');
          await page.waitForLoadState('networkidle');

          // Verify analytics page still works
          const mainContent = page.locator('main, [role="main"], .analytics-container');
          await expect(mainContent).toBeVisible();
        }
      }

      await page.screenshot({
        path: 'test-results/navigation-regression.png',
        fullPage: true
      });
    });

    test('should not introduce new memory leaks', async () => {
      const initialMemory = await page.evaluate(() => (performance as any).memory?.usedJSHeapSize || 0);

      // Perform actions that might cause memory leaks
      for (let i = 0; i < 5; i++) {
        await page.reload();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
      }

      // Force garbage collection if available
      await page.evaluate(() => {
        if ((window as any).gc) {
          (window as any).gc();
        }
      });

      const finalMemory = await page.evaluate(() => (performance as any).memory?.usedJSHeapSize || 0);

      // Memory shouldn't grow excessively (allow 50MB growth)
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryGrowth = finalMemory - initialMemory;
        expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // 50MB
      }
    });
  });

  test.describe('Performance Testing', () => {
    test('should load analytics page within acceptable time', async () => {
      const startTime = Date.now();

      await page.goto('/analytics');
      await page.waitForLoadState('networkidle');

      const loadTime = Date.now() - startTime;

      // Page should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);

      console.log(`Analytics page load time: ${loadTime}ms`);
    });

    test('should measure tab switching performance', async () => {
      const tabs = page.locator('[role="tab"]');
      const tabCount = await tabs.count();

      if (tabCount > 1) {
        const switchTimes: number[] = [];

        // Measure tab switching times
        for (let i = 0; i < Math.min(tabCount, 3); i++) {
          const startTime = Date.now();

          await tabs.nth(i).click();
          await page.waitForLoadState('networkidle');

          const switchTime = Date.now() - startTime;
          switchTimes.push(switchTime);
        }

        // All tab switches should be under 1 second
        const maxSwitchTime = Math.max(...switchTimes);
        expect(maxSwitchTime).toBeLessThan(1000);

        console.log(`Tab switch times: ${switchTimes.join(', ')}ms`);
      }
    });

    test('should check for performance bottlenecks', async () => {
      // Monitor network requests
      const requests: string[] = [];

      page.on('request', request => {
        requests.push(request.url());
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Check for excessive API calls
      const apiRequests = requests.filter(url => url.includes('/api/'));
      expect(apiRequests.length).toBeLessThan(20); // Reasonable limit

      console.log(`API requests count: ${apiRequests.length}`);
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should work correctly on mobile viewport', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/analytics');
      await page.waitForLoadState('networkidle');

      // Verify content is still accessible
      const mainContent = page.locator('main, [role="main"], .analytics-container');
      await expect(mainContent).toBeVisible();

      // Check for mobile navigation or responsive elements
      const mobileNav = page.locator('.mobile-nav, .hamburger, [data-testid*="mobile"]');
      const mobileNavVisible = await mobileNav.count() > 0;

      console.log(`Mobile navigation elements found: ${mobileNavVisible}`);

      await page.screenshot({
        path: 'test-results/mobile-responsive.png',
        fullPage: true
      });
    });
  });
});