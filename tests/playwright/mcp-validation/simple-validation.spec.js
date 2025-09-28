const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:5173';
const AGENTS_URL = `${BASE_URL}/agents`;
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');
const REPORT_DIR = path.join(__dirname, 'reports');

// Ensure directories exist
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}
if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

let validationReport = {
  timestamp: new Date().toISOString(),
  url: AGENTS_URL,
  tests: [],
  screenshots: [],
  consoleErrors: [],
  networkRequests: [],
  performance: {},
  summary: { total: 0, passed: 0, failed: 0, warnings: 0 }
};

function addTestResult(name, status, details = {}) {
  validationReport.tests.push({
    name,
    status,
    timestamp: new Date().toISOString(),
    ...details
  });
  validationReport.summary.total++;
  if (status === 'passed') validationReport.summary.passed++;
  if (status === 'failed') validationReport.summary.failed++;
  if (status === 'warning') validationReport.summary.warnings++;
}

test.describe('MCP UI/UX Validation - Agents Page', () => {
  let page;
  let consoleErrors = [];
  let networkRequests = [];

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    consoleErrors = [];
    networkRequests = [];

    // Monitor console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const error = {
          timestamp: new Date().toISOString(),
          type: 'console',
          level: 'error',
          text: msg.text(),
          location: msg.location()
        };
        consoleErrors.push(error);
        validationReport.consoleErrors.push(error);
      }
    });

    // Monitor network requests
    page.on('request', (request) => {
      networkRequests.push({
        timestamp: new Date().toISOString(),
        type: 'request',
        url: request.url(),
        method: request.method()
      });
    });

    page.on('response', (response) => {
      networkRequests.push({
        timestamp: new Date().toISOString(),
        type: 'response',
        url: response.url(),
        status: response.status()
      });
    });

    // Monitor JavaScript errors
    page.on('pageerror', (error) => {
      const jsError = {
        timestamp: new Date().toISOString(),
        type: 'javascript',
        level: 'error',
        message: error.message,
        stack: error.stack
      };
      consoleErrors.push(jsError);
      validationReport.consoleErrors.push(jsError);
    });
  });

  test('1. Page Load and Screenshot Capture', async () => {
    console.log('🔍 Testing page load and taking screenshots...');

    try {
      const startTime = Date.now();

      // Navigate to agents page
      await page.goto(AGENTS_URL, { waitUntil: 'networkidle', timeout: 30000 });

      const loadTime = Date.now() - startTime;
      validationReport.performance.pageLoadTime = loadTime;

      // Take initial screenshot
      const initialScreenshot = path.join(SCREENSHOT_DIR, 'initial-load.png');
      await page.screenshot({ path: initialScreenshot, fullPage: true });

      validationReport.screenshots.push({
        name: 'Initial Page Load',
        path: initialScreenshot,
        description: 'Full page screenshot after initial load',
        timestamp: new Date().toISOString()
      });

      const title = await page.title();
      const url = page.url();

      addTestResult('Page Load Success', 'passed', {
        loadTime: `${loadTime}ms`,
        title,
        url
      });

      console.log(`✅ Page loaded successfully in ${loadTime}ms`);
      console.log(`📄 Title: ${title}`);
      console.log(`🌐 URL: ${url}`);

    } catch (error) {
      addTestResult('Page Load', 'failed', { error: error.message });
      console.log(`❌ Page load failed: ${error.message}`);
    }
  });

  test('2. Component Rendering Validation', async () => {
    console.log('🧩 Validating component rendering...');

    await page.goto(AGENTS_URL, { waitUntil: 'networkidle' });

    try {
      // Check for various common selectors
      const selectors = [
        'main',
        '[data-testid="main"]',
        '.main-content',
        'body',
        'div',
        'header',
        'nav'
      ];

      let foundComponents = 0;
      const componentDetails = [];

      for (const selector of selectors) {
        try {
          const elements = await page.locator(selector).count();
          if (elements > 0) {
            foundComponents++;
            componentDetails.push({ selector, count: elements });
          }
        } catch (e) {
          // Continue with other selectors
        }
      }

      // Take component screenshot
      const componentScreenshot = path.join(SCREENSHOT_DIR, 'components-rendered.png');
      await page.screenshot({ path: componentScreenshot, fullPage: true });

      validationReport.screenshots.push({
        name: 'Component Rendering',
        path: componentScreenshot,
        description: 'Page after component rendering validation',
        timestamp: new Date().toISOString()
      });

      const status = foundComponents > 0 ? 'passed' : 'warning';
      addTestResult('Component Rendering', status, {
        foundComponents,
        componentDetails,
        note: foundComponents === 0 ? 'No standard components found' : 'Components detected'
      });

      console.log(`${status === 'passed' ? '✅' : '⚠️'} Component rendering: ${foundComponents} component types found`);

    } catch (error) {
      addTestResult('Component Rendering', 'failed', { error: error.message });
      console.log(`❌ Component validation failed: ${error.message}`);
    }
  });

  test('3. Interactive Elements Testing', async () => {
    console.log('🖱️ Testing interactive elements...');

    await page.goto(AGENTS_URL, { waitUntil: 'networkidle' });

    try {
      // Find interactive elements
      const interactiveSelectors = [
        'button',
        'a',
        '[role="button"]',
        '[tabindex="0"]',
        'input',
        'select'
      ];

      let totalInteractive = 0;
      const interactiveDetails = [];

      for (const selector of interactiveSelectors) {
        try {
          const elements = await page.locator(selector).count();
          if (elements > 0) {
            totalInteractive += elements;
            interactiveDetails.push({ selector, count: elements });
          }
        } catch (e) {
          // Continue
        }
      }

      // Test hover on first few clickable elements
      const clickableElements = await page.locator('button, a, [role="button"]').all();
      let hoverTested = 0;

      for (let i = 0; i < Math.min(clickableElements.length, 3); i++) {
        try {
          const element = clickableElements[i];
          const isVisible = await element.isVisible();
          if (isVisible) {
            await element.hover();
            await page.waitForTimeout(500);
            hoverTested++;
          }
        } catch (e) {
          // Continue with other elements
        }
      }

      const interactionScreenshot = path.join(SCREENSHOT_DIR, 'interactions-tested.png');
      await page.screenshot({ path: interactionScreenshot, fullPage: true });

      validationReport.screenshots.push({
        name: 'User Interactions',
        path: interactionScreenshot,
        description: 'Page after testing user interactions',
        timestamp: new Date().toISOString()
      });

      addTestResult('Interactive Elements', 'passed', {
        totalInteractive,
        hoverTested,
        interactiveDetails
      });

      console.log(`✅ Interactive elements: ${totalInteractive} found, ${hoverTested} tested`);

    } catch (error) {
      addTestResult('Interactive Elements', 'failed', { error: error.message });
      console.log(`❌ Interactive testing failed: ${error.message}`);
    }
  });

  test('4. Responsive Design Testing', async () => {
    console.log('📱 Testing responsive design...');

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

        // Check if content is visible
        const bodyVisible = await page.locator('body').isVisible();

        const responsiveScreenshot = path.join(SCREENSHOT_DIR, `responsive-${viewport.name.toLowerCase()}.png`);
        await page.screenshot({ path: responsiveScreenshot, fullPage: true });

        validationReport.screenshots.push({
          name: `Responsive ${viewport.name}`,
          path: responsiveScreenshot,
          description: `Page layout at ${viewport.width}x${viewport.height}`,
          timestamp: new Date().toISOString()
        });

        addTestResult(`Responsive Design - ${viewport.name}`, bodyVisible ? 'passed' : 'failed', {
          viewport: `${viewport.width}x${viewport.height}`,
          contentVisible: bodyVisible
        });

        console.log(`${bodyVisible ? '✅' : '❌'} ${viewport.name}: ${viewport.width}x${viewport.height}`);

      } catch (error) {
        addTestResult(`Responsive Design - ${viewport.name}`, 'failed', { error: error.message });
        console.log(`❌ ${viewport.name} failed: ${error.message}`);
      }
    }
  });

  test('5. Performance and Error Monitoring', async () => {
    console.log('⚡ Monitoring performance and errors...');

    await page.goto(AGENTS_URL);

    try {
      // Get performance metrics
      const performanceMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        return {
          domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart : 0,
          loadComplete: navigation ? navigation.loadEventEnd - navigation.loadEventStart : 0,
          domElements: document.querySelectorAll('*').length
        };
      });

      validationReport.performance = { ...validationReport.performance, ...performanceMetrics };
      validationReport.networkRequests = networkRequests;

      const finalScreenshot = path.join(SCREENSHOT_DIR, 'final-state.png');
      await page.screenshot({ path: finalScreenshot, fullPage: true });

      validationReport.screenshots.push({
        name: 'Final State',
        path: finalScreenshot,
        description: 'Final page state after all tests',
        timestamp: new Date().toISOString()
      });

      const jsErrors = consoleErrors.filter(error => error.type === 'javascript');
      const consoleErrs = consoleErrors.filter(error => error.type === 'console');

      addTestResult('Performance Monitoring', 'passed', {
        performanceMetrics,
        jsErrors: jsErrors.length,
        consoleErrors: consoleErrs.length,
        networkRequests: networkRequests.length
      });

      console.log(`✅ Performance: DOM ${performanceMetrics.domElements} elements`);
      console.log(`📊 Network: ${networkRequests.length} requests`);
      console.log(`${jsErrors.length === 0 ? '✅' : '⚠️'} JS Errors: ${jsErrors.length}`);
      console.log(`${consoleErrs.length === 0 ? '✅' : '⚠️'} Console Errors: ${consoleErrs.length}`);

    } catch (error) {
      addTestResult('Performance Monitoring', 'failed', { error: error.message });
      console.log(`❌ Performance monitoring failed: ${error.message}`);
    }
  });

  test.afterAll(async () => {
    // Generate final report
    const reportPath = path.join(REPORT_DIR, `validation-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(validationReport, null, 2));

    console.log('\n' + '='.repeat(80));
    console.log('🎯 COMPREHENSIVE UI/UX VALIDATION SUMMARY');
    console.log('='.repeat(80));
    console.log(`📅 Timestamp: ${validationReport.timestamp}`);
    console.log(`🌐 URL: ${validationReport.url}`);
    console.log(`📊 Tests: ${validationReport.summary.total} total`);
    console.log(`✅ Passed: ${validationReport.summary.passed}`);
    console.log(`❌ Failed: ${validationReport.summary.failed}`);
    console.log(`⚠️ Warnings: ${validationReport.summary.warnings}`);
    console.log(`📸 Screenshots: ${validationReport.screenshots.length}`);
    console.log(`🐛 Console Errors: ${validationReport.consoleErrors.length}`);
    console.log(`🌐 Network Requests: ${validationReport.networkRequests.length}`);

    if (validationReport.performance.pageLoadTime) {
      console.log(`⚡ Page Load: ${validationReport.performance.pageLoadTime}ms`);
    }

    console.log(`📁 Report: ${reportPath}`);
    console.log(`📸 Screenshots: ${SCREENSHOT_DIR}`);
    console.log('='.repeat(80));
  });
});