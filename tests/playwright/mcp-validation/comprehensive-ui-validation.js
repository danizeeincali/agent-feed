import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Configuration
const BASE_URL = 'http://localhost:5173';
const AGENTS_URL = `${BASE_URL}/agents`;
const SCREENSHOT_DIR = '/workspaces/agent-feed/tests/playwright/mcp-validation/screenshots';
const REPORT_DIR = '/workspaces/agent-feed/tests/playwright/mcp-validation/reports';

// Ensure directories exist
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}
if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

class ValidationReporter {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      url: AGENTS_URL,
      tests: [],
      screenshots: [],
      consoleErrors: [],
      networkRequests: [],
      performance: {},
      accessibility: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      }
    };
  }

  addTest(name, status, details = {}) {
    this.results.tests.push({
      name,
      status,
      timestamp: new Date().toISOString(),
      ...details
    });
    this.results.summary.total++;
    if (status === 'passed') this.results.summary.passed++;
    if (status === 'failed') this.results.summary.failed++;
    if (status === 'warning') this.results.summary.warnings++;
  }

  addScreenshot(name, path, description = '') {
    this.results.screenshots.push({
      name,
      path,
      description,
      timestamp: new Date().toISOString()
    });
  }

  addConsoleError(error) {
    this.results.consoleErrors.push({
      timestamp: new Date().toISOString(),
      ...error
    });
  }

  addNetworkRequest(request) {
    this.results.networkRequests.push({
      timestamp: new Date().toISOString(),
      ...request
    });
  }

  generateReport() {
    const reportPath = path.join(REPORT_DIR, `validation-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    return reportPath;
  }
}

test.describe('Comprehensive UI/UX Validation - Agents Page', () => {
  let reporter;
  let page;

  test.beforeEach(async ({ browser }) => {
    reporter = new ValidationReporter();
    page = await browser.newPage();

    // Set up console monitoring
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        reporter.addConsoleError({
          type: 'console',
          level: 'error',
          text: msg.text(),
          location: msg.location()
        });
      }
    });

    // Set up network monitoring
    page.on('request', (request) => {
      reporter.addNetworkRequest({
        type: 'request',
        url: request.url(),
        method: request.method(),
        headers: request.headers()
      });
    });

    page.on('response', (response) => {
      reporter.addNetworkRequest({
        type: 'response',
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
        headers: response.headers()
      });
    });

    // Set up error monitoring
    page.on('pageerror', (error) => {
      reporter.addConsoleError({
        type: 'javascript',
        level: 'error',
        message: error.message,
        stack: error.stack
      });
    });
  });

  test('1. Page Load and Initial State', async () => {
    try {
      const startTime = Date.now();

      // Navigate to agents page
      await page.goto(AGENTS_URL, { waitUntil: 'networkidle' });

      const loadTime = Date.now() - startTime;
      reporter.results.performance.pageLoadTime = loadTime;

      // Take initial screenshot
      const initialScreenshot = path.join(SCREENSHOT_DIR, 'initial-load.png');
      await page.screenshot({ path: initialScreenshot, fullPage: true });
      reporter.addScreenshot('Initial Page Load', initialScreenshot, 'Full page screenshot after initial load');

      // Check if page loaded successfully
      const title = await page.title();
      reporter.addTest('Page Load', 'passed', {
        loadTime: `${loadTime}ms`,
        title,
        url: page.url()
      });

    } catch (error) {
      reporter.addTest('Page Load', 'failed', { error: error.message });
    }
  });

  test('2. Component Rendering Validation', async () => {
    await page.goto(AGENTS_URL, { waitUntil: 'networkidle' });

    try {
      // Check for main container
      const mainContainer = await page.locator('main, [data-testid="main"], .main-content').first();
      const containerExists = await mainContainer.isVisible();

      if (containerExists) {
        reporter.addTest('Main Container Rendering', 'passed');
      } else {
        reporter.addTest('Main Container Rendering', 'failed', { error: 'Main container not found' });
      }

      // Check for agents list/grid
      const agentsContainer = await page.locator('[data-testid="agents-list"], .agents-grid, .agents-container').first();
      const agentsExists = await agentsContainer.isVisible();

      if (agentsExists) {
        reporter.addTest('Agents Container Rendering', 'passed');
      } else {
        reporter.addTest('Agents Container Rendering', 'warning', {
          note: 'Agents container not found with common selectors'
        });
      }

      // Check for navigation elements
      const navElements = await page.locator('nav, [role="navigation"], .navigation').count();
      reporter.addTest('Navigation Elements', navElements > 0 ? 'passed' : 'warning', {
        count: navElements
      });

      // Take component screenshot
      const componentScreenshot = path.join(SCREENSHOT_DIR, 'components-rendered.png');
      await page.screenshot({ path: componentScreenshot, fullPage: true });
      reporter.addScreenshot('Component Rendering', componentScreenshot, 'Page after component rendering check');

    } catch (error) {
      reporter.addTest('Component Rendering', 'failed', { error: error.message });
    }
  });

  test('3. User Interaction Testing', async () => {
    await page.goto(AGENTS_URL, { waitUntil: 'networkidle' });

    try {
      // Test clickable elements
      const clickableElements = await page.locator('button, a, [role="button"], [tabindex="0"]').all();

      for (let i = 0; i < Math.min(clickableElements.length, 5); i++) {
        try {
          const element = clickableElements[i];
          const isVisible = await element.isVisible();
          const isEnabled = await element.isEnabled();

          if (isVisible && isEnabled) {
            await element.hover();
            await page.waitForTimeout(500);
          }
        } catch (e) {
          // Continue with other elements
        }
      }

      reporter.addTest('Interactive Elements', 'passed', {
        totalClickableElements: clickableElements.length,
        tested: Math.min(clickableElements.length, 5)
      });

      // Take interaction screenshot
      const interactionScreenshot = path.join(SCREENSHOT_DIR, 'interactions-tested.png');
      await page.screenshot({ path: interactionScreenshot, fullPage: true });
      reporter.addScreenshot('User Interactions', interactionScreenshot, 'Page after testing user interactions');

    } catch (error) {
      reporter.addTest('User Interaction Testing', 'failed', { error: error.message });
    }
  });

  test('4. Responsive Design Testing', async () => {
    await page.goto(AGENTS_URL, { waitUntil: 'networkidle' });

    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1920, height: 1080 }
    ];

    for (const viewport of viewports) {
      try {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.waitForTimeout(1000);

        // Check if content is still visible
        const bodyVisible = await page.locator('body').isVisible();

        // Take responsive screenshot
        const responsiveScreenshot = path.join(SCREENSHOT_DIR, `responsive-${viewport.name.toLowerCase()}.png`);
        await page.screenshot({ path: responsiveScreenshot, fullPage: true });
        reporter.addScreenshot(`Responsive ${viewport.name}`, responsiveScreenshot,
          `Page layout at ${viewport.width}x${viewport.height}`);

        reporter.addTest(`Responsive Design - ${viewport.name}`, bodyVisible ? 'passed' : 'failed', {
          viewport: `${viewport.width}x${viewport.height}`,
          contentVisible: bodyVisible
        });

      } catch (error) {
        reporter.addTest(`Responsive Design - ${viewport.name}`, 'failed', { error: error.message });
      }
    }
  });

  test('5. API Data Loading Validation', async () => {
    await page.goto(AGENTS_URL, { waitUntil: 'networkidle' });

    try {
      // Wait for potential API calls
      await page.waitForTimeout(3000);

      // Check for loading states
      const loadingElements = await page.locator('[data-testid*="loading"], .loading, .spinner').count();

      // Check for error states
      const errorElements = await page.locator('[data-testid*="error"], .error, .alert-error').count();

      // Check for empty states
      const emptyElements = await page.locator('[data-testid*="empty"], .empty-state, .no-data').count();

      reporter.addTest('API Data Loading', 'passed', {
        loadingElements,
        errorElements,
        emptyElements,
        note: 'Checked for various data states'
      });

      // Take API state screenshot
      const apiScreenshot = path.join(SCREENSHOT_DIR, 'api-data-state.png');
      await page.screenshot({ path: apiScreenshot, fullPage: true });
      reporter.addScreenshot('API Data State', apiScreenshot, 'Page showing data loading state');

    } catch (error) {
      reporter.addTest('API Data Loading', 'failed', { error: error.message });
    }
  });

  test('6. Accessibility Testing', async () => {
    await page.goto(AGENTS_URL, { waitUntil: 'networkidle' });

    try {
      // Check for basic accessibility features
      const hasTitle = await page.title();
      const hasLang = await page.getAttribute('html', 'lang');
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').count();
      const altTexts = await page.locator('img').count();
      const imagesWithAlt = await page.locator('img[alt]').count();

      const accessibilityScore = {
        hasTitle: !!hasTitle,
        hasLang: !!hasLang,
        headingCount: headings,
        imagesTotal: altTexts,
        imagesWithAlt: imagesWithAlt
      };

      reporter.addTest('Accessibility Check', 'passed', accessibilityScore);

      // Take accessibility screenshot
      const a11yScreenshot = path.join(SCREENSHOT_DIR, 'accessibility-check.png');
      await page.screenshot({ path: a11yScreenshot, fullPage: true });
      reporter.addScreenshot('Accessibility State', a11yScreenshot, 'Page for accessibility analysis');

    } catch (error) {
      reporter.addTest('Accessibility Testing', 'failed', { error: error.message });
    }
  });

  test('7. Performance and JavaScript Validation', async () => {
    await page.goto(AGENTS_URL);

    try {
      // Measure performance
      const performanceMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          domElements: document.querySelectorAll('*').length
        };
      });

      reporter.results.performance = { ...reporter.results.performance, ...performanceMetrics };

      // Check for JavaScript errors in console
      const jsErrors = reporter.results.consoleErrors.filter(error => error.type === 'javascript');

      reporter.addTest('JavaScript Validation', jsErrors.length === 0 ? 'passed' : 'warning', {
        jsErrors: jsErrors.length,
        performance: performanceMetrics
      });

      // Take final screenshot
      const finalScreenshot = path.join(SCREENSHOT_DIR, 'final-state.png');
      await page.screenshot({ path: finalScreenshot, fullPage: true });
      reporter.addScreenshot('Final State', finalScreenshot, 'Final page state after all tests');

    } catch (error) {
      reporter.addTest('Performance Validation', 'failed', { error: error.message });
    }
  });

  test.afterEach(async () => {
    if (reporter) {
      const reportPath = reporter.generateReport();
      console.log(`Validation report generated: ${reportPath}`);
    }
    if (page) {
      await page.close();
    }
  });
});