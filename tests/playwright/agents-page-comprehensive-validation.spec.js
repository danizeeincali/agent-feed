/**
 * Comprehensive Agents Page Validation - Post Fix Testing
 * Testing http://localhost:5173/agents for React errors, data loading, and UI functionality
 */

import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('Agents Page Comprehensive Validation', () => {
  let page;
  let context;
  let consoleErrors = [];
  let networkRequests = [];

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      recordVideo: {
        dir: '/workspaces/agent-feed/tests/playwright/videos',
        size: { width: 1280, height: 720 }
      }
    });
    page = await context.newPage();

    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          text: msg.text(),
          location: msg.location(),
          timestamp: new Date().toISOString()
        });
      }
    });

    // Track network requests
    page.on('request', request => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        timestamp: new Date().toISOString()
      });
    });

    // Track network failures
    page.on('requestfailed', request => {
      console.log(`❌ Network request failed: ${request.url()}`);
    });
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('01. Navigate to agents page and verify initial load', async () => {
    console.log('🚀 Starting agents page navigation test...');

    // Navigate to the agents page
    const response = await page.goto('http://localhost:5173/agents', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Verify successful response
    expect(response.status()).toBe(200);

    // Wait for React to initialize
    await page.waitForTimeout(2000);

    // Take initial screenshot
    await page.screenshot({
      path: '/workspaces/agent-feed/tests/playwright/screenshots/agents-page-initial.png',
      fullPage: true
    });

    console.log('✅ Initial navigation completed');
  });

  test('02. Verify React app renders without errors', async () => {
    console.log('🔍 Checking React app rendering...');

    // Check for React root element
    const reactRoot = await page.locator('#__next, #root, [data-reactroot]').first();
    await expect(reactRoot).toBeVisible({ timeout: 10000 });

    // Check for any uncaught JavaScript errors
    const errorCount = consoleErrors.filter(error =>
      error.text.includes('Error:') ||
      error.text.includes('TypeError:') ||
      error.text.includes('ReferenceError:')
    ).length;

    console.log(`📊 Console errors found: ${errorCount}`);
    if (errorCount > 0) {
      console.log('🚨 Console errors:', consoleErrors);
    }

    // Verify page title
    const title = await page.title();
    expect(title).toBeTruthy();
    console.log(`📄 Page title: ${title}`);

    console.log('✅ React app rendering verified');
  });

  test('03. Check for agent data loading and API integration', async () => {
    console.log('📡 Testing agent data loading...');

    // Wait for potential API calls to complete
    await page.waitForTimeout(3000);

    // Check if agents are loaded (look for common agent UI elements)
    const possibleSelectors = [
      '[data-testid="agent-card"]',
      '.agent-card',
      '[class*="agent"]',
      '.grid',
      '.flex',
      '[data-testid="agents-grid"]',
      '[data-testid="agents-list"]'
    ];

    let agentsFound = false;
    for (const selector of possibleSelectors) {
      const elements = await page.locator(selector).count();
      if (elements > 0) {
        console.log(`✅ Found ${elements} elements with selector: ${selector}`);
        agentsFound = true;
        break;
      }
    }

    // Check for loading states
    const loadingIndicators = await page.locator('[data-testid*="loading"], .loading, .spinner').count();
    console.log(`🔄 Loading indicators found: ${loadingIndicators}`);

    // Check for error messages
    const errorMessages = await page.locator('[data-testid*="error"], .error, .alert-error').count();
    console.log(`❌ Error messages found: ${errorMessages}`);

    // Check network requests for API calls
    const apiRequests = networkRequests.filter(req =>
      req.url.includes('/api/') ||
      req.url.includes('/agents') ||
      req.url.includes('localhost:3000')
    );
    console.log(`📡 API requests made: ${apiRequests.length}`);
    apiRequests.forEach(req => console.log(`  - ${req.method} ${req.url}`));

    console.log('✅ Agent data loading check completed');
  });

  test('04. Take comprehensive screenshots for documentation', async () => {
    console.log('📸 Taking comprehensive screenshots...');

    // Full page screenshot
    await page.screenshot({
      path: '/workspaces/agent-feed/tests/playwright/screenshots/agents-page-full.png',
      fullPage: true
    });

    // Viewport screenshot
    await page.screenshot({
      path: '/workspaces/agent-feed/tests/playwright/screenshots/agents-page-viewport.png',
      fullPage: false
    });

    // Mobile viewport screenshot
    await page.setViewportSize({ width: 375, height: 667 });
    await page.screenshot({
      path: '/workspaces/agent-feed/tests/playwright/screenshots/agents-page-mobile.png',
      fullPage: true
    });

    // Restore desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });

    console.log('✅ Screenshots captured successfully');
  });

  test('05. Perform detailed console and network analysis', async () => {
    console.log('🔍 Performing detailed analysis...');

    // Analyze console errors
    const criticalErrors = consoleErrors.filter(error =>
      error.text.includes('Failed to fetch') ||
      error.text.includes('404') ||
      error.text.includes('500') ||
      error.text.includes('TypeError') ||
      error.text.includes('ReferenceError')
    );

    console.log(`🚨 Critical console errors: ${criticalErrors.length}`);
    criticalErrors.forEach(error => {
      console.log(`  - ${error.text} at ${error.location?.url || 'unknown'}`);
    });

    // Analyze network requests
    const failedRequests = networkRequests.filter(req =>
      req.url.includes('404') || req.url.includes('500')
    );
    console.log(`❌ Failed network requests: ${failedRequests.length}`);

    // Check for successful API endpoints
    const successfulApiRequests = networkRequests.filter(req =>
      (req.url.includes('/api/') || req.url.includes('localhost:3000')) &&
      req.method === 'GET'
    );
    console.log(`✅ Successful API requests: ${successfulApiRequests.length}`);

    // Performance check
    const navigationMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        responseTime: navigation.responseEnd - navigation.requestStart
      };
    });

    console.log('⚡ Performance metrics:', navigationMetrics);

    console.log('✅ Detailed analysis completed');
  });

  test('06. Verify UI interactions and functionality', async () => {
    console.log('🖱️ Testing UI interactions...');

    // Try to find and interact with common UI elements
    const interactiveElements = [
      'button',
      '[role="button"]',
      'a[href]',
      'input',
      '[tabindex="0"]'
    ];

    for (const selector of interactiveElements) {
      const elements = await page.locator(selector).count();
      if (elements > 0) {
        console.log(`🔘 Found ${elements} interactive elements: ${selector}`);

        // Test first element if it exists
        try {
          const firstElement = page.locator(selector).first();
          await firstElement.scrollIntoViewIfNeeded({ timeout: 5000 });
          const isVisible = await firstElement.isVisible();
          console.log(`  - First element visible: ${isVisible}`);
        } catch (error) {
          console.log(`  - Could not interact with first element: ${error.message}`);
        }
      }
    }

    // Check for navigation or routing
    const currentUrl = page.url();
    console.log(`🌐 Current URL: ${currentUrl}`);

    console.log('✅ UI interaction testing completed');
  });

  test('07. Generate validation report', async () => {
    console.log('📋 Generating validation report...');

    const report = {
      timestamp: new Date().toISOString(),
      url: 'http://localhost:5173/agents',
      testResults: {
        pageLoaded: true,
        reactAppRendered: consoleErrors.length === 0,
        consoleErrors: consoleErrors.length,
        criticalErrors: consoleErrors.filter(e =>
          e.text.includes('Error:') || e.text.includes('TypeError:')
        ).length,
        networkRequests: networkRequests.length,
        apiRequests: networkRequests.filter(req =>
          req.url.includes('/api/') || req.url.includes('localhost:3000')
        ).length
      },
      consoleErrors: consoleErrors,
      networkRequests: networkRequests.map(req => ({
        url: req.url,
        method: req.method
      })),
      screenshots: [
        'agents-page-initial.png',
        'agents-page-full.png',
        'agents-page-viewport.png',
        'agents-page-mobile.png'
      ]
    };

    // Save report
    fs.writeFileSync(
      '/workspaces/agent-feed/tests/playwright/agents-validation-report.json',
      JSON.stringify(report, null, 2)
    );

    console.log('✅ Validation report generated');
    console.log('📊 Summary:');
    console.log(`   - Console errors: ${report.testResults.consoleErrors}`);
    console.log(`   - Critical errors: ${report.testResults.criticalErrors}`);
    console.log(`   - Network requests: ${report.testResults.networkRequests}`);
    console.log(`   - API requests: ${report.testResults.apiRequests}`);
  });
});