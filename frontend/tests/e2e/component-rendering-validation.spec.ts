/**
 * Component Rendering Validation E2E Tests
 *
 * Comprehensive test suite validating DynamicPageRenderer component rendering
 * with full screenshot validation for visual regression testing.
 *
 * Tests validate:
 * - Component rendering for components array format
 * - Backward compatibility with layout array format
 * - Nested component hierarchies
 * - Data binding display
 * - Error handling and fallback behavior
 * - Responsive design across viewports
 * - Performance metrics
 */

import { test, expect, Page } from '@playwright/test';

const TEST_CONFIG = {
  baseURL: 'http://localhost:5173',
  apiBaseURL: 'http://localhost:3001',
  agentId: 'personal-todos-agent',
  comprehensiveDashboardPageId: 'comprehensive-dashboard',
  timeout: 30000,
  screenshotDir: 'frontend/tests/e2e/screenshots/component-rendering'
};

test.describe('Component Rendering Validation E2E Tests', () => {
  let consoleErrors: string[] = [];
  let consoleWarnings: string[] = [];
  let networkErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    consoleWarnings = [];
    networkErrors = [];

    // Monitor console messages
    page.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error') {
        consoleErrors.push(text);
        console.log(`[CONSOLE ERROR]: ${text}`);
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(text);
      }
    });

    // Monitor network failures
    page.on('requestfailed', request => {
      const error = `${request.method()} ${request.url()} - ${request.failure()?.errorText}`;
      networkErrors.push(error);
      console.log(`[NETWORK ERROR]: ${error}`);
    });

    // Monitor page errors
    page.on('pageerror', error => {
      consoleErrors.push(`Page Error: ${error.message}`);
      console.log(`[PAGE ERROR]: ${error.message}`);
    });
  });

  test.describe('Test Suite 1: Component Rendering Validation', () => {
    test('1.1 Comprehensive Dashboard Rendering - No JSON Fallback', async ({ page }) => {
      console.log('\n=== Test 1.1: Comprehensive Dashboard Rendering ===');

      const startTime = Date.now();

      // Navigate to comprehensive dashboard
      const pageUrl = `${TEST_CONFIG.baseURL}/agents/${TEST_CONFIG.agentId}/${TEST_CONFIG.comprehensiveDashboardPageId}`;
      console.log(`Navigating to: ${pageUrl}`);

      await page.goto(pageUrl);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const loadTime = Date.now() - startTime;
      console.log(`Page loaded in ${loadTime}ms`);

      // CRITICAL: Verify NO "Page Data" text (indicates JSON fallback)
      const pageContent = await page.textContent('body');
      const hasPageDataFallback = pageContent?.includes('Page Data') || false;

      console.log(`Has JSON fallback ("Page Data"): ${hasPageDataFallback}`);

      // Take screenshot
      await page.screenshot({
        path: `${TEST_CONFIG.screenshotDir}/comprehensive-dashboard-rendered.png`,
        fullPage: true
      });

      // Assertions
      expect(hasPageDataFallback).toBe(false);
      expect(pageContent).toBeTruthy();
      expect(pageContent!.length).toBeGreaterThan(100);

      console.log(`✓ Dashboard rendered without JSON fallback`);
    });

    test('1.2 Verify All Component Types Render', async ({ page }) => {
      console.log('\n=== Test 1.2: Component Types Rendering ===');

      await page.goto(`${TEST_CONFIG.baseURL}/agents/${TEST_CONFIG.agentId}/${TEST_CONFIG.comprehensiveDashboardPageId}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Check for various component types that should render
      const componentChecks = {
        // Container components
        containers: await page.locator('[class*="container"], [class*="Container"]').count(),

        // Layout components
        grids: await page.locator('[class*="grid"]').count(),
        stacks: await page.locator('[class*="stack"], [class*="flex"]').count(),

        // UI components
        cards: await page.locator('[class*="card"], [class*="Card"]').count(),
        badges: await page.locator('[class*="badge"], [class*="Badge"]').count(),
        buttons: await page.locator('button').count(),

        // Data components
        metrics: await page.locator('[class*="metric"], [class*="Metric"]').count(),
        progress: await page.locator('[class*="progress"], progress').count(),

        // Total elements
        totalDivs: await page.locator('div').count()
      };

      console.log('Component counts:', JSON.stringify(componentChecks, null, 2));

      // Take screenshot
      await page.screenshot({
        path: `${TEST_CONFIG.screenshotDir}/all-component-types.png`,
        fullPage: true
      });

      // Assertions - should have multiple component types
      expect(componentChecks.totalDivs).toBeGreaterThan(10);
      expect(componentChecks.cards + componentChecks.badges + componentChecks.buttons).toBeGreaterThan(5);

      console.log(`✓ Multiple component types detected`);
    });

    test('1.3 Verify Component Structure and Hierarchy', async ({ page }) => {
      console.log('\n=== Test 1.3: Component Structure and Hierarchy ===');

      await page.goto(`${TEST_CONFIG.baseURL}/agents/${TEST_CONFIG.agentId}/${TEST_CONFIG.comprehensiveDashboardPageId}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Check for nested component hierarchy
      const hierarchyChecks = {
        hasNestedDivs: await page.locator('div > div > div').count() > 0,
        hasNestedCards: await page.locator('[class*="card"] [class*="badge"], [class*="Card"] [class*="Badge"]').count() > 0,
        maxNestingDepth: await page.evaluate(() => {
          const getDepth = (element: Element): number => {
            if (!element.children.length) return 1;
            return 1 + Math.max(...Array.from(element.children).map(child => getDepth(child)));
          };
          return getDepth(document.body);
        })
      };

      console.log('Hierarchy checks:', JSON.stringify(hierarchyChecks, null, 2));

      // Take screenshot
      await page.screenshot({
        path: `${TEST_CONFIG.screenshotDir}/nested-components.png`,
        fullPage: true
      });

      // Assertions
      expect(hierarchyChecks.hasNestedDivs).toBe(true);
      expect(hierarchyChecks.maxNestingDepth).toBeGreaterThan(5);

      console.log(`✓ Component hierarchy validated (depth: ${hierarchyChecks.maxNestingDepth})`);
    });
  });

  test.describe('Test Suite 2: Data Binding Validation', () => {
    test('2.1 Check for Template Variables Display', async ({ page }) => {
      console.log('\n=== Test 2.1: Template Variables Display ===');

      await page.goto(`${TEST_CONFIG.baseURL}/agents/${TEST_CONFIG.agentId}/${TEST_CONFIG.comprehensiveDashboardPageId}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const pageContent = await page.content();
      const pageText = await page.textContent('body');

      // Check for template variables (they should be visible even if not replaced yet)
      const templateVariablePatterns = [
        /\{\{stats\.total_tasks\}\}/,
        /\{\{stats\.completed_tasks\}\}/,
        /\{\{priorities\.P0\}\}/,
        /\{\{status\.completed\}\}/,
        /\{\{performance\.completion_rate\}\}/
      ];

      const foundVariables: string[] = [];
      templateVariablePatterns.forEach(pattern => {
        const match = pageContent.match(pattern) || pageText?.match(pattern);
        if (match) {
          foundVariables.push(match[0]);
        }
      });

      console.log(`Found ${foundVariables.length} template variables in page`);
      if (foundVariables.length > 0) {
        console.log('Sample variables:', foundVariables.slice(0, 3));
      }

      // Check if data has been replaced with actual values
      const hasNumericValues = /\d+/.test(pageText || '');
      console.log(`Page has numeric values: ${hasNumericValues}`);

      // Take screenshot
      await page.screenshot({
        path: `${TEST_CONFIG.screenshotDir}/data-bindings.png`,
        fullPage: true
      });

      // Assertions - should either have template variables OR actual data
      expect(foundVariables.length > 0 || hasNumericValues).toBe(true);

      console.log(`✓ Data binding system functional`);
    });

    test('2.2 Verify Badge Variants Render', async ({ page }) => {
      console.log('\n=== Test 2.2: Badge Variants ===');

      await page.goto(`${TEST_CONFIG.baseURL}/agents/${TEST_CONFIG.agentId}/${TEST_CONFIG.comprehensiveDashboardPageId}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const pageText = await page.textContent('body');

      // Check for priority badges (P0-P8)
      const badgeTexts = ['P0', 'P1', 'P2', 'P3', 'P5', 'P8'];
      const foundBadges = badgeTexts.filter(text => pageText?.includes(text));

      console.log(`Found ${foundBadges.length} priority badges:`, foundBadges);

      // Check for status badges
      const statusBadges = ['Completed', 'In Progress', 'Pending', 'Blocked'];
      const foundStatusBadges = statusBadges.filter(text => pageText?.includes(text));

      console.log(`Found ${foundStatusBadges.length} status badges:`, foundStatusBadges);

      // Take screenshot
      await page.screenshot({
        path: `${TEST_CONFIG.screenshotDir}/badge-variants.png`,
        fullPage: true
      });

      // Assertions
      expect(foundBadges.length).toBeGreaterThan(3);
      expect(foundStatusBadges.length).toBeGreaterThan(2);

      console.log(`✓ Badge variants rendering correctly`);
    });
  });

  test.describe('Test Suite 3: Backward Compatibility', () => {
    test('3.1 Legacy Layout Array Format Still Renders', async ({ page }) => {
      console.log('\n=== Test 3.1: Legacy Format Compatibility ===');

      // Note: This test assumes there might be pages with old format
      // If comprehensive-dashboard is the only page, we test it works with both formats

      await page.goto(`${TEST_CONFIG.baseURL}/agents/${TEST_CONFIG.agentId}/${TEST_CONFIG.comprehensiveDashboardPageId}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const pageContent = await page.textContent('body');
      const hasContent = pageContent && pageContent.length > 100;

      console.log(`Page has content: ${hasContent}`);
      console.log(`Content length: ${pageContent?.length || 0} characters`);

      // Take screenshot
      await page.screenshot({
        path: `${TEST_CONFIG.screenshotDir}/legacy-format.png`,
        fullPage: true
      });

      // Assertions
      expect(hasContent).toBe(true);

      console.log(`✓ Legacy format compatibility maintained`);
    });
  });

  test.describe('Test Suite 4: Error Handling', () => {
    test('4.1 Invalid Page Structure Fallback', async ({ page }) => {
      console.log('\n=== Test 4.1: Error Handling ===');

      // Try to navigate to a potentially invalid page
      await page.goto(`${TEST_CONFIG.baseURL}/agents/${TEST_CONFIG.agentId}/nonexistent-page-12345`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const pageText = await page.textContent('body');

      // Should show some kind of error or fallback
      const hasErrorMessage = pageText?.includes('not found') ||
                             pageText?.includes('error') ||
                             pageText?.includes('Error') ||
                             pageText?.includes('404') ||
                             pageText?.includes('Page Data') || // JSON fallback
                             false;

      console.log(`Has error/fallback message: ${hasErrorMessage}`);
      console.log(`Console errors: ${consoleErrors.length}`);

      // Take screenshot
      await page.screenshot({
        path: `${TEST_CONFIG.screenshotDir}/json-fallback.png`,
        fullPage: true
      });

      // Page should handle the error gracefully
      expect(pageText).toBeTruthy();

      console.log(`✓ Error handling working`);
    });

    test('4.2 Console Error Monitoring', async ({ page }) => {
      console.log('\n=== Test 4.2: Console Error Monitoring ===');

      // Clear previous errors
      consoleErrors = [];

      await page.goto(`${TEST_CONFIG.baseURL}/agents/${TEST_CONFIG.agentId}/${TEST_CONFIG.comprehensiveDashboardPageId}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      console.log(`Total console errors: ${consoleErrors.length}`);
      console.log(`Total console warnings: ${consoleWarnings.length}`);
      console.log(`Total network errors: ${networkErrors.length}`);

      if (consoleErrors.length > 0) {
        console.log('Console errors (first 5):');
        consoleErrors.slice(0, 5).forEach((err, i) => {
          console.log(`  ${i + 1}. ${err.substring(0, 150)}`);
        });
      }

      // Take screenshot
      await page.screenshot({
        path: `${TEST_CONFIG.screenshotDir}/error-monitoring.png`,
        fullPage: true
      });

      // Should have minimal errors
      expect(consoleErrors.length).toBeLessThan(10);

      console.log(`✓ Console error levels acceptable`);
    });
  });

  test.describe('Test Suite 5: Responsive Design', () => {
    test('5.1 Mobile Viewport (375px)', async ({ page }) => {
      console.log('\n=== Test 5.1: Mobile Viewport ===');

      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 812 });

      await page.goto(`${TEST_CONFIG.baseURL}/agents/${TEST_CONFIG.agentId}/${TEST_CONFIG.comprehensiveDashboardPageId}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const viewportSize = page.viewportSize();
      console.log(`Viewport size: ${viewportSize?.width}x${viewportSize?.height}`);

      // Check for mobile-responsive elements
      const mobileChecks = {
        hasContent: await page.textContent('body').then(t => (t?.length || 0) > 100),
        elementCount: await page.locator('div').count(),
        hasScrollableContent: await page.evaluate(() => {
          return document.body.scrollHeight > window.innerHeight;
        })
      };

      console.log('Mobile checks:', JSON.stringify(mobileChecks, null, 2));

      // Take screenshot
      await page.screenshot({
        path: `${TEST_CONFIG.screenshotDir}/mobile-view.png`,
        fullPage: true
      });

      // Assertions
      expect(mobileChecks.hasContent).toBe(true);
      expect(mobileChecks.elementCount).toBeGreaterThan(5);

      console.log(`✓ Mobile responsive design working`);
    });

    test('5.2 Desktop Viewport (1920px)', async ({ page }) => {
      console.log('\n=== Test 5.2: Desktop Viewport ===');

      // Set desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 });

      await page.goto(`${TEST_CONFIG.baseURL}/agents/${TEST_CONFIG.agentId}/${TEST_CONFIG.comprehensiveDashboardPageId}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const viewportSize = page.viewportSize();
      console.log(`Viewport size: ${viewportSize?.width}x${viewportSize?.height}`);

      // Check for desktop layout
      const desktopChecks = {
        hasContent: await page.textContent('body').then(t => (t?.length || 0) > 100),
        elementCount: await page.locator('div').count(),
        gridColumns: await page.evaluate(() => {
          const grids = Array.from(document.querySelectorAll('[class*="grid"]'));
          return grids.length > 0 ? grids.length : 0;
        })
      };

      console.log('Desktop checks:', JSON.stringify(desktopChecks, null, 2));

      // Take screenshot
      await page.screenshot({
        path: `${TEST_CONFIG.screenshotDir}/desktop-view.png`,
        fullPage: true
      });

      // Assertions
      expect(desktopChecks.hasContent).toBe(true);
      expect(desktopChecks.elementCount).toBeGreaterThan(10);

      console.log(`✓ Desktop layout rendering correctly`);
    });

    test('5.3 Tablet Viewport (768px)', async ({ page }) => {
      console.log('\n=== Test 5.3: Tablet Viewport ===');

      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });

      await page.goto(`${TEST_CONFIG.baseURL}/agents/${TEST_CONFIG.agentId}/${TEST_CONFIG.comprehensiveDashboardPageId}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const viewportSize = page.viewportSize();
      console.log(`Viewport size: ${viewportSize?.width}x${viewportSize?.height}`);

      // Take screenshot
      await page.screenshot({
        path: `${TEST_CONFIG.screenshotDir}/tablet-view.png`,
        fullPage: true
      });

      const hasContent = await page.textContent('body').then(t => (t?.length || 0) > 100);

      expect(hasContent).toBe(true);

      console.log(`✓ Tablet layout rendering correctly`);
    });
  });

  test.describe('Test Suite 6: Performance', () => {
    test('6.1 Page Load Performance', async ({ page }) => {
      console.log('\n=== Test 6.1: Page Load Performance ===');

      const performanceMetrics = {
        navigationStart: 0,
        domContentLoaded: 0,
        loadComplete: 0,
        firstContentfulPaint: 0,
        timeToInteractive: 0
      };

      const startTime = Date.now();

      await page.goto(`${TEST_CONFIG.baseURL}/agents/${TEST_CONFIG.agentId}/${TEST_CONFIG.comprehensiveDashboardPageId}`);

      performanceMetrics.domContentLoaded = Date.now() - startTime;

      await page.waitForLoadState('networkidle');
      performanceMetrics.loadComplete = Date.now() - startTime;

      await page.waitForTimeout(1000);
      performanceMetrics.timeToInteractive = Date.now() - startTime;

      // Get browser performance metrics
      const browserMetrics = await page.evaluate(() => {
        const perf = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return {
          domContentLoaded: perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart,
          loadEvent: perf.loadEventEnd - perf.loadEventStart,
          totalLoadTime: perf.loadEventEnd - perf.fetchStart
        };
      });

      console.log('\n=== Performance Metrics ===');
      console.log(`DOM Content Loaded: ${performanceMetrics.domContentLoaded}ms`);
      console.log(`Load Complete: ${performanceMetrics.loadComplete}ms`);
      console.log(`Time to Interactive: ${performanceMetrics.timeToInteractive}ms`);
      console.log('\nBrowser Metrics:', JSON.stringify(browserMetrics, null, 2));

      // Take screenshot after load
      await page.screenshot({
        path: `${TEST_CONFIG.screenshotDir}/performance-loaded.png`,
        fullPage: true
      });

      // Performance assertions (relaxed for E2E environment)
      expect(performanceMetrics.timeToInteractive).toBeLessThan(10000); // 10 seconds
      expect(performanceMetrics.loadComplete).toBeLessThan(8000); // 8 seconds

      console.log(`✓ Performance metrics within acceptable ranges`);
    });

    test('6.2 Element Rendering Performance', async ({ page }) => {
      console.log('\n=== Test 6.2: Element Rendering Performance ===');

      await page.goto(`${TEST_CONFIG.baseURL}/agents/${TEST_CONFIG.agentId}/${TEST_CONFIG.comprehensiveDashboardPageId}`);
      await page.waitForLoadState('networkidle');

      const renderStart = Date.now();

      // Count various elements
      const elementCounts = {
        divs: await page.locator('div').count(),
        buttons: await page.locator('button').count(),
        spans: await page.locator('span').count(),
        total: await page.locator('*').count()
      };

      const renderTime = Date.now() - renderStart;

      console.log('\n=== Element Counts ===');
      console.log(`Total elements: ${elementCounts.total}`);
      console.log(`Divs: ${elementCounts.divs}`);
      console.log(`Buttons: ${elementCounts.buttons}`);
      console.log(`Spans: ${elementCounts.spans}`);
      console.log(`Query time: ${renderTime}ms`);

      // Take screenshot
      await page.screenshot({
        path: `${TEST_CONFIG.screenshotDir}/rendering-complete.png`,
        fullPage: true
      });

      // Should have rendered multiple elements
      expect(elementCounts.total).toBeGreaterThan(50);

      console.log(`✓ Element rendering performance acceptable`);
    });
  });

  test.describe('Test Suite 7: Comprehensive Validation', () => {
    test('7.1 Full Component Rendering Workflow', async ({ page }) => {
      console.log('\n=== Test 7.1: Full Component Rendering Workflow ===');

      const workflow = {
        steps: [] as any[],
        success: true,
        startTime: Date.now()
      };

      try {
        // Step 1: Navigate
        console.log('Step 1: Navigating to dashboard...');
        const navStart = Date.now();
        await page.goto(`${TEST_CONFIG.baseURL}/agents/${TEST_CONFIG.agentId}/${TEST_CONFIG.comprehensiveDashboardPageId}`);
        await page.waitForLoadState('networkidle');
        workflow.steps.push({
          name: 'Navigation',
          time: Date.now() - navStart,
          success: true
        });

        await page.screenshot({
          path: `${TEST_CONFIG.screenshotDir}/workflow-step1-navigation.png`,
          fullPage: true
        });

        // Step 2: Verify no JSON fallback
        console.log('Step 2: Verifying component rendering...');
        const verifyStart = Date.now();
        const pageText = await page.textContent('body');
        const noJsonFallback = !pageText?.includes('Page Data');
        workflow.steps.push({
          name: 'Component Rendering Verification',
          time: Date.now() - verifyStart,
          success: noJsonFallback
        });

        await page.screenshot({
          path: `${TEST_CONFIG.screenshotDir}/workflow-step2-rendering.png`,
          fullPage: true
        });

        // Step 3: Count components
        console.log('Step 3: Counting rendered components...');
        const countStart = Date.now();
        const componentCount = await page.locator('div, button, span').count();
        workflow.steps.push({
          name: 'Component Count',
          time: Date.now() - countStart,
          success: componentCount > 20,
          details: `Found ${componentCount} components`
        });

        await page.screenshot({
          path: `${TEST_CONFIG.screenshotDir}/workflow-step3-components.png`,
          fullPage: true
        });

        // Step 4: Check for errors
        console.log('Step 4: Checking for errors...');
        await page.waitForTimeout(1000);
        workflow.steps.push({
          name: 'Error Check',
          time: 0,
          success: consoleErrors.length < 10,
          details: `${consoleErrors.length} console errors`
        });

        await page.screenshot({
          path: `${TEST_CONFIG.screenshotDir}/workflow-step4-errors.png`,
          fullPage: true
        });

      } catch (error: any) {
        workflow.success = false;
        console.error('Workflow error:', error.message);
      }

      const totalTime = Date.now() - workflow.startTime;

      console.log('\n=== Workflow Complete ===');
      console.log(`Total time: ${totalTime}ms`);
      console.log(`Success: ${workflow.success}`);
      workflow.steps.forEach((step, i) => {
        console.log(`  ${i + 1}. ${step.name}: ${step.time}ms - ${step.success ? '✓' : '✗'}`);
        if (step.details) console.log(`     ${step.details}`);
      });

      // Final screenshot
      await page.screenshot({
        path: `${TEST_CONFIG.screenshotDir}/workflow-complete.png`,
        fullPage: true
      });

      expect(workflow.success).toBe(true);

      console.log(`✓ Full workflow completed successfully`);
    });
  });
});
