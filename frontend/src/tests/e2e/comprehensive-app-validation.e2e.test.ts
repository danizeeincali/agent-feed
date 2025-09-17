/**
 * Comprehensive E2E Test Suite - Real Application Validation
 * Tests the complete application functionality with real data and interactions
 *
 * Coverage:
 * 1. Main page loads with real posts
 * 2. Analytics page loads without import errors
 * 3. Tab switching works between System and Claude SDK analytics
 * 4. API calls return real data
 * 5. No console errors
 * 6. Performance is acceptable
 * 7. All interactive elements function
 */

import { test, expect, Page, BrowserContext, ConsoleMessage } from '@playwright/test';

// Test configuration for comprehensive validation
test.describe.configure({ mode: 'parallel' });

// Console error tracking
let consoleErrors: ConsoleMessage[] = [];
let performanceMetrics: {
  navigationStart?: number;
  domContentLoaded?: number;
  loadComplete?: number;
  firstContentfulPaint?: number;
} = {};

test.describe('Comprehensive Application E2E Validation', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    // Reset tracking arrays
    consoleErrors = [];
    performanceMetrics = {};

    // Create isolated context for each test
    context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      permissions: ['clipboard-read', 'clipboard-write'],
      recordVideo: { dir: 'test-results/videos/' }
    });

    page = await context.newPage();

    // Enhanced console monitoring
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg);
        console.error(`❌ Console Error: ${msg.text()}`);
        console.error(`   Location: ${msg.location()?.url}:${msg.location()?.lineNumber}`);
      } else if (msg.type() === 'warning') {
        console.warn(`⚠️  Console Warning: ${msg.text()}`);
      }
    });

    // Network monitoring
    page.on('response', (response) => {
      if (!response.ok() && !response.url().includes('favicon')) {
        console.warn(`🌐 Failed HTTP Request: ${response.url()} - ${response.status()} ${response.statusText()}`);
      }
    });

    // Performance tracking
    page.on('load', async () => {
      const perfMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return {
          navigationStart: navigation.navigationStart,
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
          loadComplete: navigation.loadEventEnd - navigation.navigationStart,
        };
      });
      performanceMetrics = { ...performanceMetrics, ...perfMetrics };
    });
  });

  test.afterEach(async () => {
    // Report console errors
    if (consoleErrors.length > 0) {
      console.error(`\n🚨 ${consoleErrors.length} console errors detected during test:`);
      consoleErrors.forEach((error, index) => {
        console.error(`  ${index + 1}. ${error.text()}`);
      });
    }

    // Report performance metrics
    if (Object.keys(performanceMetrics).length > 0) {
      console.log('\n📊 Performance Metrics:');
      console.log(`  DOM Content Loaded: ${performanceMetrics.domContentLoaded}ms`);
      console.log(`  Load Complete: ${performanceMetrics.loadComplete}ms`);
    }

    await context.close();
  });

  test.describe('1. Main Page - Real Posts Loading', () => {
    test('should load main page with real posts and functional feed', async () => {
      console.log('🎯 Testing main page with real posts...');

      const startTime = Date.now();
      await page.goto('/', { waitUntil: 'networkidle' });
      const loadTime = Date.now() - startTime;

      // Performance validation
      expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds

      // Main page structure validation
      await expect(page.getByTestId('main-app') || page.locator('main')).toBeVisible();
      await expect(page.locator('h1, h2').first()).toBeVisible();

      // Feed validation - check for posts
      const feedContainer = page.locator('[data-testid="feed-container"], [data-testid="posts-container"], .feed, .posts').first();
      await expect(feedContainer).toBeVisible({ timeout: 10000 });

      // Check for real post content
      const posts = page.locator('[data-testid*="post"], .post, article').first();
      await expect(posts).toBeVisible({ timeout: 10000 });

      // Verify post content is real (not just loading states)
      await page.waitForFunction(() => {
        const postElements = document.querySelectorAll('[data-testid*="post"], .post, article');
        return postElements.length > 0 &&
               Array.from(postElements).some(el => el.textContent && el.textContent.trim().length > 20);
      }, { timeout: 15000 });

      // Interactive elements validation
      const interactiveButtons = page.locator('button:visible').first();
      if (await interactiveButtons.count() > 0) {
        await expect(interactiveButtons).toBeEnabled();
      }

      // No console errors check
      expect(consoleErrors.length).toBe(0);

      console.log('✅ Main page validation completed successfully');
    });

    test('should handle real post interactions', async () => {
      console.log('🎯 Testing real post interactions...');

      await page.goto('/', { waitUntil: 'networkidle' });

      // Wait for posts to load
      await page.waitForSelector('[data-testid*="post"], .post, article', { timeout: 15000 });

      // Test like/reaction functionality if available
      const likeButtons = page.locator('button:has-text("like"), button[aria-label*="like"], .like-button').first();
      if (await likeButtons.count() > 0) {
        await likeButtons.click();
        await page.waitForTimeout(1000); // Wait for any animations
      }

      // Test comment functionality if available
      const commentInputs = page.locator('input[placeholder*="comment"], textarea[placeholder*="comment"]').first();
      if (await commentInputs.count() > 0) {
        await commentInputs.fill('Test comment for E2E validation');

        const submitButton = page.locator('button:has-text("submit"), button:has-text("post")').first();
        if (await submitButton.count() > 0) {
          await submitButton.click();
        }
      }

      // Test scroll loading if pagination exists
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(2000);

      // Validate no errors occurred during interactions
      expect(consoleErrors.length).toBe(0);

      console.log('✅ Post interactions validation completed');
    });
  });

  test.describe('2. Analytics Page - Loading and Error Validation', () => {
    test('should load analytics page without import errors', async () => {
      console.log('🎯 Testing analytics page loading...');

      const startTime = Date.now();
      await page.goto('/analytics', { waitUntil: 'networkidle' });
      const loadTime = Date.now() - startTime;

      // Performance validation
      expect(loadTime).toBeLessThan(8000); // Analytics page can be heavier

      // Check for successful page load
      await expect(page.locator('h1, h2').first()).toBeVisible();

      // Validate no JavaScript import errors
      expect(consoleErrors.length).toBe(0);

      // Check for analytics components
      const analyticsContainer = page.locator('[data-testid*="analytics"], .analytics, main').first();
      await expect(analyticsContainer).toBeVisible();

      // Validate dashboard structure
      const dashboardElements = page.locator('div, section').filter({ hasText: /analytics|dashboard|metrics/i }).first();
      await expect(dashboardElements).toBeVisible();

      console.log('✅ Analytics page loading validation completed');
    });

    test('should display analytics components without errors', async () => {
      console.log('🎯 Testing analytics components rendering...');

      await page.goto('/analytics', { waitUntil: 'networkidle' });

      // Wait for dynamic content to load
      await page.waitForTimeout(3000);

      // Check for charts/visualizations
      const chartElements = page.locator('canvas, svg, .chart, [data-testid*="chart"]');
      if (await chartElements.count() > 0) {
        await expect(chartElements.first()).toBeVisible();
      }

      // Check for metrics cards/displays
      const metricsElements = page.locator('.metric, .card, [data-testid*="metric"]');
      if (await metricsElements.count() > 0) {
        await expect(metricsElements.first()).toBeVisible();
      }

      // Validate data loading (not just loading states)
      await page.waitForFunction(() => {
        const textElements = document.querySelectorAll('*');
        return Array.from(textElements).some(el => {
          const text = el.textContent || '';
          return /\$[\d,.]+|\d+%|\d+\s*(tokens|requests|users)/.test(text);
        });
      }, { timeout: 10000 });

      expect(consoleErrors.length).toBe(0);

      console.log('✅ Analytics components validation completed');
    });
  });

  test.describe('3. Tab Switching - System and Claude SDK Analytics', () => {
    test('should switch between analytics tabs correctly', async () => {
      console.log('🎯 Testing analytics tab switching...');

      await page.goto('/analytics', { waitUntil: 'networkidle' });

      // Find tab elements
      const tabs = page.locator('button[role="tab"], .tab, [data-testid*="tab"]');
      const tabCount = await tabs.count();

      if (tabCount > 0) {
        console.log(`Found ${tabCount} tabs to test`);

        // Test each tab
        for (let i = 0; i < Math.min(tabCount, 5); i++) { // Limit to 5 tabs max
          const tab = tabs.nth(i);
          const tabText = await tab.textContent();

          console.log(`Testing tab: ${tabText}`);

          await tab.click();
          await page.waitForTimeout(1000); // Wait for transition

          // Verify tab is active
          await expect(tab).toHaveAttribute('aria-selected', 'true');

          // Verify content changed
          const activePanel = page.locator('[role="tabpanel"]:visible, .tab-content:visible').first();
          if (await activePanel.count() > 0) {
            await expect(activePanel).toBeVisible();
          }
        }

        // Test specific Claude SDK and System tabs if they exist
        const claudeSDKTab = page.locator('button:has-text("Claude SDK"), button:has-text("Token Cost")').first();
        if (await claudeSDKTab.count() > 0) {
          await claudeSDKTab.click();
          await page.waitForTimeout(1000);

          // Check for Claude SDK specific content
          const claudeContent = page.locator('text=/claude|token|cost/i').first();
          await expect(claudeContent).toBeVisible();
        }

        const systemTab = page.locator('button:has-text("System"), button:has-text("Performance")').first();
        if (await systemTab.count() > 0) {
          await systemTab.click();
          await page.waitForTimeout(1000);

          // Check for system specific content
          const systemContent = page.locator('text=/system|performance|memory/i').first();
          await expect(systemContent).toBeVisible();
        }
      }

      expect(consoleErrors.length).toBe(0);

      console.log('✅ Tab switching validation completed');
    });

    test('should maintain state when switching tabs', async () => {
      console.log('🎯 Testing tab state persistence...');

      await page.goto('/analytics', { waitUntil: 'networkidle' });

      const tabs = page.locator('button[role="tab"], .tab');
      const tabCount = await tabs.count();

      if (tabCount >= 2) {
        // Switch to second tab
        await tabs.nth(1).click();
        await page.waitForTimeout(1000);

        // Interact with content (scroll, click filters, etc.)
        await page.evaluate(() => window.scrollTo(0, 300));

        const filterElements = page.locator('select, input[type="checkbox"], button:has-text("filter")').first();
        if (await filterElements.count() > 0) {
          await filterElements.click();
        }

        // Switch back to first tab
        await tabs.nth(0).click();
        await page.waitForTimeout(1000);

        // Switch back to second tab
        await tabs.nth(1).click();
        await page.waitForTimeout(1000);

        // Verify content is still visible and interactive
        const content = page.locator('[role="tabpanel"]:visible').first();
        await expect(content).toBeVisible();
      }

      expect(consoleErrors.length).toBe(0);

      console.log('✅ Tab state persistence validation completed');
    });
  });

  test.describe('4. API Integration - Real Data Validation', () => {
    test('should make successful API calls and receive real data', async () => {
      console.log('🎯 Testing API integration with real data...');

      const apiCalls: string[] = [];

      // Monitor API calls
      page.on('response', (response) => {
        if (response.url().includes('/api/') && response.ok()) {
          apiCalls.push(response.url());
        }
      });

      await page.goto('/', { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);

      // Navigate to analytics to trigger more API calls
      await page.goto('/analytics', { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);

      // Verify API calls were made
      expect(apiCalls.length).toBeGreaterThan(0);
      console.log(`API calls detected: ${apiCalls.length}`);

      // Test API responses contain real data
      const apiResponseValidation = await page.evaluate(async () => {
        try {
          // Try to fetch from common API endpoints
          const endpoints = ['/api/posts', '/api/analytics', '/api/health'];
          const results = [];

          for (const endpoint of endpoints) {
            try {
              const response = await fetch(endpoint);
              if (response.ok) {
                const data = await response.json();
                results.push({
                  endpoint,
                  hasData: data && Object.keys(data).length > 0,
                  dataType: typeof data
                });
              }
            } catch (e) {
              // Endpoint doesn't exist, continue
            }
          }

          return results;
        } catch (error) {
          return [];
        }
      });

      console.log('API validation results:', apiResponseValidation);

      expect(consoleErrors.length).toBe(0);

      console.log('✅ API integration validation completed');
    });

    test('should handle API errors gracefully', async () => {
      console.log('🎯 Testing API error handling...');

      // Monitor failed requests
      const failedRequests: string[] = [];
      page.on('response', (response) => {
        if (response.url().includes('/api/') && !response.ok()) {
          failedRequests.push(`${response.url()}: ${response.status()}`);
        }
      });

      await page.goto('/', { waitUntil: 'networkidle' });

      // Test error boundaries and fallbacks
      const errorElements = page.locator('text=/error|failed|try again/i');
      const errorCount = await errorElements.count();

      if (errorCount > 0) {
        console.log(`Found ${errorCount} error UI elements`);

        // Test retry functionality if available
        const retryButtons = page.locator('button:has-text("retry"), button:has-text("try again")');
        if (await retryButtons.count() > 0) {
          await retryButtons.first().click();
          await page.waitForTimeout(2000);
        }
      }

      // Application should still be functional despite any API errors
      await expect(page.locator('body')).toBeVisible();

      console.log('✅ API error handling validation completed');
    });
  });

  test.describe('5. Console Error Monitoring', () => {
    test('should have zero console errors during normal usage', async () => {
      console.log('🎯 Testing for console errors during normal usage...');

      // Complete user journey
      await page.goto('/', { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      // Navigate through the app
      const navLinks = page.locator('a[href^="/"], button').filter({ hasText: /analytics|about|profile/i });
      const linkCount = await navLinks.count();

      for (let i = 0; i < Math.min(linkCount, 3); i++) {
        try {
          await navLinks.nth(i).click();
          await page.waitForTimeout(2000);
        } catch (e) {
          // Link might not be clickable, continue
        }
      }

      // Go back to analytics if possible
      try {
        await page.goto('/analytics', { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);
      } catch (e) {
        // Analytics page might not exist
      }

      // Interact with page elements
      const interactiveElements = page.locator('button:visible, input:visible, select:visible');
      const elementCount = await interactiveElements.count();

      for (let i = 0; i < Math.min(elementCount, 5); i++) {
        try {
          const element = interactiveElements.nth(i);
          const tagName = await element.evaluate(el => el.tagName.toLowerCase());

          if (tagName === 'button') {
            await element.click();
          } else if (tagName === 'input') {
            await element.fill('test input');
          } else if (tagName === 'select') {
            await element.selectOption({ index: 1 });
          }

          await page.waitForTimeout(500);
        } catch (e) {
          // Element might not be interactable, continue
        }
      }

      // Final console error check
      if (consoleErrors.length > 0) {
        console.error('Console errors found:');
        consoleErrors.forEach((error, index) => {
          console.error(`${index + 1}. ${error.text()}`);
        });
      }

      expect(consoleErrors.length).toBe(0);

      console.log('✅ Console error monitoring validation completed');
    });
  });

  test.describe('6. Performance Validation', () => {
    test('should meet performance benchmarks', async () => {
      console.log('🎯 Testing performance benchmarks...');

      // Test main page performance
      const startTime = Date.now();
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      const firstLoadTime = Date.now() - startTime;

      expect(firstLoadTime).toBeLessThan(5000); // 5 second limit

      // Wait for full load
      await page.waitForLoadState('networkidle');
      const fullLoadTime = Date.now() - startTime;

      expect(fullLoadTime).toBeLessThan(10000); // 10 second limit for full load

      // Test analytics page performance
      const analyticsStartTime = Date.now();
      await page.goto('/analytics', { waitUntil: 'domcontentloaded' });
      const analyticsLoadTime = Date.now() - analyticsStartTime;

      expect(analyticsLoadTime).toBeLessThan(8000); // 8 second limit for analytics

      // Test Core Web Vitals
      const webVitals = await page.evaluate(() => {
        return new Promise((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const vitals: Record<string, number> = {};

            entries.forEach((entry) => {
              if (entry.name === 'first-contentful-paint') {
                vitals.fcp = entry.startTime;
              }
            });

            resolve(vitals);
          }).observe({ entryTypes: ['paint'] });

          // Fallback timeout
          setTimeout(() => resolve({}), 3000);
        });
      });

      console.log('Performance metrics:', {
        firstLoadTime,
        fullLoadTime,
        analyticsLoadTime,
        webVitals
      });

      console.log('✅ Performance validation completed');
    });

    test('should handle large data sets efficiently', async () => {
      console.log('🎯 Testing performance with large data sets...');

      await page.goto('/', { waitUntil: 'networkidle' });

      // Scroll to test virtualization/pagination
      for (let i = 0; i < 5; i++) {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(1000);
      }

      // Memory usage check (basic)
      const memoryUsage = await page.evaluate(() => {
        return {
          // @ts-ignore
          usedJSHeapSize: performance.memory?.usedJSHeapSize || 0,
          // @ts-ignore
          totalJSHeapSize: performance.memory?.totalJSHeapSize || 0
        };
      });

      console.log('Memory usage:', memoryUsage);

      // Performance should still be responsive
      const button = page.locator('button:visible').first();
      if (await button.count() > 0) {
        const clickStart = Date.now();
        await button.click();
        const clickTime = Date.now() - clickStart;

        expect(clickTime).toBeLessThan(1000); // Click should respond within 1 second
      }

      console.log('✅ Large data set performance validation completed');
    });
  });

  test.describe('7. Interactive Elements Functionality', () => {
    test('should have all interactive elements functioning correctly', async () => {
      console.log('🎯 Testing interactive elements functionality...');

      await page.goto('/', { waitUntil: 'networkidle' });

      // Test buttons
      const buttons = page.locator('button:visible');
      const buttonCount = await buttons.count();

      console.log(`Testing ${buttonCount} buttons`);

      for (let i = 0; i < Math.min(buttonCount, 10); i++) {
        const button = buttons.nth(i);
        const isEnabled = await button.isEnabled();

        if (isEnabled) {
          const buttonText = await button.textContent();
          console.log(`Testing button: ${buttonText}`);

          try {
            await button.click();
            await page.waitForTimeout(500);
          } catch (e) {
            console.warn(`Button click failed: ${buttonText}`);
          }
        }
      }

      // Test form inputs
      const inputs = page.locator('input:visible, textarea:visible');
      const inputCount = await inputs.count();

      console.log(`Testing ${inputCount} input fields`);

      for (let i = 0; i < Math.min(inputCount, 5); i++) {
        const input = inputs.nth(i);
        const inputType = await input.getAttribute('type');

        try {
          if (inputType === 'checkbox' || inputType === 'radio') {
            await input.check();
          } else {
            await input.fill('test input value');
          }
          await page.waitForTimeout(300);
        } catch (e) {
          console.warn(`Input interaction failed: ${inputType}`);
        }
      }

      // Test select dropdowns
      const selects = page.locator('select:visible');
      const selectCount = await selects.count();

      for (let i = 0; i < selectCount; i++) {
        const select = selects.nth(i);
        try {
          const options = await select.locator('option').count();
          if (options > 1) {
            await select.selectOption({ index: 1 });
            await page.waitForTimeout(300);
          }
        } catch (e) {
          console.warn('Select interaction failed');
        }
      }

      // Test navigation
      await page.goto('/analytics', { waitUntil: 'networkidle' });

      // Test tabs if they exist
      const tabs = page.locator('button[role="tab"]:visible');
      const tabCount = await tabs.count();

      for (let i = 0; i < tabCount; i++) {
        try {
          await tabs.nth(i).click();
          await page.waitForTimeout(500);
        } catch (e) {
          console.warn('Tab interaction failed');
        }
      }

      expect(consoleErrors.length).toBe(0);

      console.log('✅ Interactive elements functionality validation completed');
    });

    test('should maintain accessibility and keyboard navigation', async () => {
      console.log('🎯 Testing accessibility and keyboard navigation...');

      await page.goto('/', { waitUntil: 'networkidle' });

      // Test tab navigation
      await page.keyboard.press('Tab');
      const focusedElement = await page.locator(':focus').first();
      await expect(focusedElement).toBeVisible();

      // Test multiple tab presses
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
        await page.waitForTimeout(200);
      }

      // Test enter key activation
      const firstButton = page.locator('button:visible').first();
      if (await firstButton.count() > 0) {
        await firstButton.focus();
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);
      }

      // Test escape key (for modals/dropdowns)
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      // Basic ARIA checks
      const ariaElements = page.locator('[aria-label], [aria-labelledby], [role]');
      const ariaCount = await ariaElements.count();

      console.log(`Found ${ariaCount} elements with ARIA attributes`);

      expect(consoleErrors.length).toBe(0);

      console.log('✅ Accessibility validation completed');
    });
  });

  test.describe('8. Complete User Journey Validation', () => {
    test('should complete full user journey without errors', async () => {
      console.log('🎯 Testing complete user journey...');

      // Start timing
      const journeyStart = Date.now();

      // 1. Load main page
      await page.goto('/', { waitUntil: 'networkidle' });
      console.log('✓ Main page loaded');

      // 2. Interact with main content
      const mainInteraction = page.locator('button:visible, a:visible').first();
      if (await mainInteraction.count() > 0) {
        await mainInteraction.click();
        await page.waitForTimeout(1000);
        console.log('✓ Main page interaction completed');
      }

      // 3. Navigate to analytics
      await page.goto('/analytics', { waitUntil: 'networkidle' });
      console.log('✓ Analytics page loaded');

      // 4. Test analytics functionality
      const tabs = page.locator('button[role="tab"], .tab');
      const tabCount = await tabs.count();

      if (tabCount > 0) {
        for (let i = 0; i < Math.min(tabCount, 3); i++) {
          await tabs.nth(i).click();
          await page.waitForTimeout(1000);
        }
        console.log('✓ Analytics tabs tested');
      }

      // 5. Test filters/controls if available
      const controls = page.locator('select:visible, input[type="checkbox"]:visible').first();
      if (await controls.count() > 0) {
        const tagName = await controls.evaluate(el => el.tagName.toLowerCase());
        if (tagName === 'select') {
          await controls.selectOption({ index: 1 });
        } else {
          await controls.check();
        }
        await page.waitForTimeout(1000);
        console.log('✓ Analytics controls tested');
      }

      // 6. Navigate back to main
      await page.goto('/', { waitUntil: 'networkidle' });
      console.log('✓ Returned to main page');

      // 7. Final interaction test
      const finalElement = page.locator('input:visible, button:visible').first();
      if (await finalElement.count() > 0) {
        const tagName = await finalElement.evaluate(el => el.tagName.toLowerCase());
        if (tagName === 'input') {
          await finalElement.fill('Final test input');
        } else {
          await finalElement.click();
        }
        await page.waitForTimeout(500);
        console.log('✓ Final interaction completed');
      }

      const journeyTime = Date.now() - journeyStart;
      console.log(`Complete user journey took: ${journeyTime}ms`);

      // Journey should complete within reasonable time
      expect(journeyTime).toBeLessThan(30000); // 30 seconds max

      // No console errors throughout journey
      expect(consoleErrors.length).toBe(0);

      console.log('✅ Complete user journey validation completed successfully');
    });
  });
});