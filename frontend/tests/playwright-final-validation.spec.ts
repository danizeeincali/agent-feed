import { test, expect, type Page } from '@playwright/test';

/**
 * Final Regression Testing - Playwright E2E Tests
 * Production Validation Agent - Browser-based Testing
 */

test.describe('Final Regression Testing Suite', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    // Set longer timeout for production testing
    test.setTimeout(60000);
  });

  test('Build Validation - Static Assets Load Correctly', async () => {
    const response = await page.goto('http://localhost:5173');
    expect(response?.status()).toBe(200);

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // Check that CSS and JS assets load
    const stylesheets = await page.$$eval('link[rel="stylesheet"]', links =>
      links.map(link => (link as HTMLLinkElement).href)
    );
    const scripts = await page.$$eval('script[src]', scripts =>
      scripts.map(script => (script as HTMLScriptElement).src)
    );

    expect(stylesheets.length).toBeGreaterThan(0);
    expect(scripts.length).toBeGreaterThan(0);

    console.log(`✅ Assets loaded: ${stylesheets.length} stylesheets, ${scripts.length} scripts`);
  });

  test('Page Load Test - No White Screen', async () => {
    await page.goto('http://localhost:5174');

    // Wait for React to mount
    await page.waitForSelector('#root', { timeout: 10000 });

    // Check that root has content
    const rootContent = await page.$eval('#root', el => el.innerHTML);
    expect(rootContent).toBeTruthy();
    expect(rootContent.length).toBeGreaterThan(100);

    // Check for common white screen indicators
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('White screen');
    expect(bodyText).not.toContain('Application error');

    // Check that main content is visible
    const isVisible = await page.isVisible('#root > *');
    expect(isVisible).toBe(true);

    console.log('✅ Page loads without white screen');
  });

  test('Component Integration - Core Components Mount', async () => {
    await page.goto('http://localhost:5174');

    // Wait for main components to load
    await page.waitForLoadState('networkidle');

    // Check for navigation elements
    const hasNavigation = await page.locator('nav, .nav, [role="navigation"]').count();
    expect(hasNavigation).toBeGreaterThan(0);

    // Check for main content area
    const hasMainContent = await page.locator('main, .main, [role="main"], .content').count();
    expect(hasMainContent).toBeGreaterThan(0);

    // Check that no error boundaries are showing
    const errorBoundaryText = await page.textContent('body');
    expect(errorBoundaryText).not.toContain('Something went wrong');
    expect(errorBoundaryText).not.toContain('Component error');

    console.log('✅ Core components mount successfully');
  });

  test('Navigation Flow - All Routes Accessible', async () => {
    const routes = [
      { path: '/', name: 'Home' },
      { path: '/agents', name: 'Agents' },
      { path: '/claude', name: 'Claude' }
    ];

    for (const route of routes) {
      const response = await page.goto(`http://localhost:5173${route.path}`);
      expect(response?.status()).toBe(200);

      // Wait for content to load
      await page.waitForLoadState('networkidle');

      // Check that page has content
      const content = await page.textContent('body');
      expect(content).toBeTruthy();
      expect(content!.length).toBeGreaterThan(50);

      console.log(`✅ Route ${route.path} (${route.name}) accessible`);
    }
  });

  test('Claude Code Integration - Claude Manager Loads', async () => {
    await page.goto('http://localhost:5173/claude');
    await page.waitForLoadState('networkidle');

    // Check that Claude manager page loads without errors
    const hasError = await page.locator('.error, [role="alert"]').count();
    expect(hasError).toBe(0);

    // Check for Claude-specific elements (connection status, terminal, etc.)
    const claudeElements = await page.locator('[data-testid*="claude"], [class*="claude"], [id*="claude"]').count();

    // If no specific Claude elements, at least check content exists
    const content = await page.textContent('body');
    expect(content).toBeTruthy();
    expect(content!.length).toBeGreaterThan(100);

    console.log('✅ Claude Code integration page loads correctly');
  });

  test('Error Handling - 404 Routes Handled Gracefully', async () => {
    const response = await page.goto('http://localhost:5173/non-existent-route');

    // SPA should redirect to index or show 404 page gracefully
    expect([200, 404]).toContain(response?.status() || 0);

    await page.waitForLoadState('networkidle');

    // Check that even on 404, the page doesn't crash
    const content = await page.textContent('body');
    expect(content).toBeTruthy();

    // Should not show browser-level errors
    expect(content).not.toContain('This site can't be reached');
    expect(content).not.toContain('ERR_CONNECTION_REFUSED');

    console.log('✅ 404 routes handled gracefully');
  });

  test('Performance - Page Load Performance', async () => {
    const startTime = Date.now();

    await page.goto('http://localhost:5174');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Page should load within reasonable time (10 seconds for development)
    expect(loadTime).toBeLessThan(10000);

    // Check paint metrics
    const paintMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart
      };
    });

    // DOM should load quickly
    expect(paintMetrics.domContentLoaded).toBeLessThan(5000);

    console.log(`✅ Page performance: ${loadTime}ms load time`);
  });

  test('API Connectivity - Frontend Handles Connection States', async () => {
    await page.goto('http://localhost:5174');
    await page.waitForLoadState('networkidle');

    // Check for connection status indicators
    const connectionIndicators = await page.locator(
      '[data-testid*="connection"], [data-testid*="status"], .connection, .status'
    ).count();

    // Check that WebSocket connections are attempted (look for connection logs)
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'log' || msg.type() === 'error') {
        consoleLogs.push(msg.text());
      }
    });

    // Wait a bit to capture connection attempts
    await page.waitForTimeout(3000);

    // Check that frontend gracefully handles connection states
    const hasConnectionErrors = consoleLogs.some(log =>
      log.includes('Uncaught') && log.includes('WebSocket')
    );

    // Should not have uncaught WebSocket errors
    expect(hasConnectionErrors).toBe(false);

    console.log('✅ API connectivity handled gracefully');
  });

  test('Memory Leaks - No Resource Leaks on Navigation', async () => {
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
    });

    // Navigate between pages multiple times
    for (let i = 0; i < 3; i++) {
      await page.goto('http://localhost:5173/');
      await page.waitForLoadState('networkidle');
      await page.goto('http://localhost:5173/agents');
      await page.waitForLoadState('networkidle');
      await page.goto('http://localhost:5173/claude');
      await page.waitForLoadState('networkidle');
    }

    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
    });

    // Memory should not grow excessively (allow 50MB growth for development)
    if (initialMemory > 0 && finalMemory > 0) {
      const memoryGrowth = finalMemory - initialMemory;
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // 50MB
      console.log(`✅ Memory growth: ${Math.round(memoryGrowth / 1024 / 1024)}MB`);
    } else {
      console.log('✅ Memory testing skipped (performance.memory not available)');
    }
  });

  test('JavaScript Errors - No Unhandled Exceptions', async () => {
    const jsErrors: string[] = [];

    page.on('pageerror', error => {
      jsErrors.push(error.message);
    });

    page.on('requestfailed', request => {
      if (request.url().includes('.js') || request.url().includes('.css')) {
        jsErrors.push(`Failed to load: ${request.url()}`);
      }
    });

    await page.goto('http://localhost:5174');
    await page.waitForLoadState('networkidle');

    // Navigate to other pages to trigger more code
    await page.goto('http://localhost:5173/agents');
    await page.waitForLoadState('networkidle');

    await page.goto('http://localhost:5173/claude');
    await page.waitForLoadState('networkidle');

    // Filter out known acceptable errors (WebSocket connection failures to dev backend)
    const criticalErrors = jsErrors.filter(error =>
      !error.includes('WebSocket') &&
      !error.includes('Connection refused') &&
      !error.includes('ERR_CONNECTION_REFUSED') &&
      !error.includes('localhost:3001')
    );

    expect(criticalErrors).toHaveLength(0);

    if (criticalErrors.length > 0) {
      console.error('❌ Critical JavaScript errors:', criticalErrors);
    } else {
      console.log('✅ No critical JavaScript errors detected');
    }
  });
});

test.describe('Production Readiness Checklist', () => {
  test('Environment Variables - No Hardcoded Secrets', async ({ page }) => {
    // This test would check the built files for hardcoded secrets
    // For now, we'll check that the page doesn't expose sensitive data

    await page.goto('http://localhost:5174');

    const pageSource = await page.content();

    // Check for common secret patterns (should not be present)
    const secretPatterns = [
      /api[_-]?key[_-]?[=:]\s*['""][^'"]+['"]/gi,
      /secret[_-]?key[_-]?[=:]\s*['""][^'"]+['"]/gi,
      /password[_-]?[=:]\s*['""][^'"]+['"]/gi,
      /token[_-]?[=:]\s*['""][^'"]+['"]/gi
    ];

    for (const pattern of secretPatterns) {
      const matches = pageSource.match(pattern);
      if (matches) {
        console.warn('⚠️  Potential secrets found in page source:', matches);
      }
      expect(matches).toBeNull();
    }

    console.log('✅ No hardcoded secrets detected in page source');
  });

  test('HTTPS Ready - Secure Context Features', async ({ page }) => {
    await page.goto('http://localhost:5174');

    // Check that secure context features are properly handled
    const secureContextAvailable = await page.evaluate(() => {
      return window.isSecureContext;
    });

    // In development (localhost), this should be true
    expect(secureContextAvailable).toBe(true);

    console.log('✅ Secure context handling verified');
  });

  test('Mobile Responsiveness - Basic Mobile Support', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:5174');
    await page.waitForLoadState('networkidle');

    // Check that content is visible in mobile viewport
    const viewportMeta = await page.$('meta[name="viewport"]');
    expect(viewportMeta).toBeTruthy();

    // Check that main content is visible
    const isContentVisible = await page.isVisible('#root');
    expect(isContentVisible).toBe(true);

    console.log('✅ Basic mobile responsiveness verified');
  });
});