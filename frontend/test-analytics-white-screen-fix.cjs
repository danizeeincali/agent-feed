#!/usr/bin/env node

/**
 * White Screen Fix Test for Analytics Page
 * Tests the comprehensive white screen fixes implemented in RealAnalytics.tsx
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const FRONTEND_URL = 'http://localhost:5173';
const ANALYTICS_URL = `${FRONTEND_URL}/analytics`;
const TEST_TIMEOUT = 60000; // 60 seconds
const SCREENSHOT_DIR = '/workspaces/agent-feed/frontend/test-results';

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const testResults = {
  timestamp: new Date().toISOString(),
  tests: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    errors: []
  }
};

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function takeScreenshot(page, name, description) {
  const filename = `${name}-${Date.now()}.png`;
  const filepath = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({
    path: filepath,
    fullPage: true
  });
  console.log(`📸 Screenshot saved: ${filename} - ${description}`);
  return filename;
}

async function logTest(testName, result, details = {}) {
  const test = {
    name: testName,
    result,
    timestamp: new Date().toISOString(),
    details
  };

  testResults.tests.push(test);
  testResults.summary.total++;

  if (result === 'PASS') {
    testResults.summary.passed++;
    console.log(`✅ ${testName}: PASSED`);
  } else {
    testResults.summary.failed++;
    testResults.summary.errors.push(`${testName}: ${details.error || 'Unknown error'}`);
    console.log(`❌ ${testName}: FAILED - ${details.error || 'Unknown error'}`);
  }

  if (details.screenshot) {
    test.screenshot = details.screenshot;
  }
}

async function checkConsoleErrors(page) {
  const logs = [];
  const errors = [];

  page.on('console', msg => {
    const text = msg.text();
    logs.push({
      type: msg.type(),
      text,
      timestamp: new Date().toISOString()
    });

    if (msg.type() === 'error') {
      errors.push(text);
      console.log(`🔴 Console Error: ${text}`);
    } else if (msg.type() === 'warn') {
      console.log(`🟡 Console Warning: ${text}`);
    }
  });

  page.on('pageerror', error => {
    errors.push(error.message);
    console.log(`🔴 Page Error: ${error.message}`);
  });

  return { logs, errors };
}

async function testPageLoad(browser) {
  const page = await browser.newPage();
  const consoleMonitor = await checkConsoleErrors(page);

  try {
    console.log('🚀 Testing Analytics Page Load...');

    // Set viewport to simulate desktop
    await page.setViewport({ width: 1280, height: 720 });

    // Navigate to analytics page with timeout
    const response = await page.goto(ANALYTICS_URL, {
      waitUntil: 'networkidle0',
      timeout: TEST_TIMEOUT
    });

    if (!response || !response.ok()) {
      throw new Error(`HTTP ${response?.status() || 'unknown'}: Failed to load page`);
    }

    // Wait for React to render
    await delay(2000);

    // Take initial screenshot
    const screenshot = await takeScreenshot(page, 'analytics-initial-load', 'Analytics page initial load');

    // Check if the page has loaded properly (not a white screen)
    const pageContent = await page.evaluate(() => {
      const body = document.body;
      const analytics = document.querySelector('[data-testid="real-analytics"]');
      const loading = document.querySelector('[data-testid="real-analytics-loading"]');
      const error = document.querySelector('[data-testid="analytics-fallback-error"]');

      return {
        hasBody: !!body,
        bodyText: body?.innerText?.trim() || '',
        hasAnalytics: !!analytics,
        hasLoading: !!loading,
        hasError: !!error,
        bodyHTML: body?.innerHTML?.substring(0, 500) || ''
      };
    });

    // Check for white screen
    const isWhiteScreen = !pageContent.hasBody ||
                         pageContent.bodyText.length < 50 ||
                         (!pageContent.hasAnalytics && !pageContent.hasLoading && !pageContent.hasError);

    if (isWhiteScreen) {
      await logTest('Page Load - White Screen Check', 'FAIL', {
        error: 'White screen detected',
        screenshot,
        pageContent
      });
    } else {
      await logTest('Page Load - White Screen Check', 'PASS', {
        screenshot,
        pageContent
      });
    }

    // Check for console errors
    if (consoleMonitor.errors.length > 0) {
      await logTest('Page Load - Console Errors', 'FAIL', {
        error: `${consoleMonitor.errors.length} console errors found`,
        errors: consoleMonitor.errors
      });
    } else {
      await logTest('Page Load - Console Errors', 'PASS');
    }

    return { page, consoleMonitor, pageContent };

  } catch (error) {
    const screenshot = await takeScreenshot(page, 'analytics-load-error', 'Analytics page load error');
    await logTest('Page Load - Basic Navigation', 'FAIL', {
      error: error.message,
      screenshot
    });
    return { page, consoleMonitor, error };
  }
}

async function testComponentRendering(page) {
  try {
    console.log('🧩 Testing Component Rendering...');

    // Wait for components to render
    await delay(3000);

    const components = await page.evaluate(() => {
      const selectors = [
        '[data-testid="real-analytics"]',
        '[data-testid="real-analytics-loading"]',
        '[data-testid="analytics-fallback-error"]',
        '[data-testid="claude-sdk-container"]',
        '[data-testid="claude-sdk-loading"]'
      ];

      const results = {};
      selectors.forEach(selector => {
        const element = document.querySelector(selector);
        results[selector] = {
          exists: !!element,
          visible: element ? element.offsetParent !== null : false,
          text: element ? element.innerText.substring(0, 100) : ''
        };
      });

      // Check for specific UI elements
      results.tabs = {
        systemTab: !!document.querySelector('button:has-text("System Analytics")'),
        claudeTab: !!document.querySelector('button:has-text("Claude SDK")'),
        tabCount: document.querySelectorAll('[role="tab"], button[class*="border-b"]').length
      };

      results.metrics = {
        metricCards: document.querySelectorAll('.grid .bg-white.border').length,
        hasCharts: document.querySelectorAll('svg, canvas').length > 0,
        hasData: document.querySelectorAll('.text-2xl.font-bold').length > 0
      };

      return results;
    });

    const screenshot = await takeScreenshot(page, 'analytics-components', 'Component rendering check');

    // Verify main analytics component is present
    if (components['[data-testid="real-analytics"]'].exists) {
      await logTest('Component Rendering - Main Analytics', 'PASS', {
        screenshot,
        components
      });
    } else if (components['[data-testid="real-analytics-loading"]'].exists) {
      await logTest('Component Rendering - Loading State', 'PASS', {
        screenshot,
        components
      });
    } else {
      await logTest('Component Rendering - Main Analytics', 'FAIL', {
        error: 'No analytics component found',
        screenshot,
        components
      });
    }

    // Check for metric cards
    if (components.metrics.metricCards >= 4) {
      await logTest('Component Rendering - Metric Cards', 'PASS', {
        cardCount: components.metrics.metricCards
      });
    } else {
      await logTest('Component Rendering - Metric Cards', 'FAIL', {
        error: `Expected 4+ metric cards, found ${components.metrics.metricCards}`,
        components: components.metrics
      });
    }

    return components;

  } catch (error) {
    const screenshot = await takeScreenshot(page, 'analytics-component-error', 'Component rendering error');
    await logTest('Component Rendering - Error', 'FAIL', {
      error: error.message,
      screenshot
    });
    return null;
  }
}

async function testTabSwitching(page) {
  try {
    console.log('🔄 Testing Tab Switching...');

    // Find and click tabs
    const tabResults = await page.evaluate(() => {
      const systemTab = document.querySelector('button[class*="border-b"]:has-text("System"), button:has-text("System Analytics")');
      const claudeTab = document.querySelector('button[class*="border-b"]:has-text("Claude"), button:has-text("Claude SDK")');

      return {
        systemTab: !!systemTab,
        claudeTab: !!claudeTab,
        systemTabText: systemTab ? systemTab.innerText : '',
        claudeTabText: claudeTab ? claudeTab.innerText : ''
      };
    });

    if (!tabResults.systemTab || !tabResults.claudeTab) {
      await logTest('Tab Switching - Tab Detection', 'FAIL', {
        error: 'Could not find both tabs',
        tabResults
      });
      return;
    }

    // Test System tab (should be active by default)
    const systemScreenshot = await takeScreenshot(page, 'analytics-system-tab', 'System tab view');

    // Click Claude SDK tab
    await page.click('button:has-text("Claude SDK"), button:has-text("Claude")');
    await delay(2000);

    const claudeScreenshot = await takeScreenshot(page, 'analytics-claude-tab', 'Claude SDK tab view');

    // Check if content changed
    const contentAfterSwitch = await page.evaluate(() => {
      const claudeContainer = document.querySelector('[data-testid="claude-sdk-container"]');
      const claudeLoading = document.querySelector('[data-testid="claude-sdk-loading"]');
      const fallbackError = document.querySelector('[data-testid="analytics-fallback-error"]');

      return {
        hasClaudeContainer: !!claudeContainer,
        hasClaudeLoading: !!claudeLoading,
        hasFallbackError: !!fallbackError,
        activeTabText: document.querySelector('button[class*="border-blue"]')?.innerText || ''
      };
    });

    if (contentAfterSwitch.hasClaudeContainer || contentAfterSwitch.hasClaudeLoading || contentAfterSwitch.hasFallbackError) {
      await logTest('Tab Switching - Claude SDK Tab', 'PASS', {
        screenshot: claudeScreenshot,
        contentAfterSwitch
      });
    } else {
      await logTest('Tab Switching - Claude SDK Tab', 'FAIL', {
        error: 'Claude SDK tab content not loaded',
        screenshot: claudeScreenshot,
        contentAfterSwitch
      });
    }

    // Switch back to System tab
    await page.click('button:has-text("System Analytics"), button:has-text("System")');
    await delay(1000);

    await logTest('Tab Switching - Tab Navigation', 'PASS', {
      systemScreenshot,
      claudeScreenshot
    });

  } catch (error) {
    const screenshot = await takeScreenshot(page, 'analytics-tab-error', 'Tab switching error');
    await logTest('Tab Switching - Error', 'FAIL', {
      error: error.message,
      screenshot
    });
  }
}

async function testDataDisplay(page) {
  try {
    console.log('📊 Testing Data Display...');

    const dataElements = await page.evaluate(() => {
      const elements = {
        metricValues: [],
        charts: [],
        statusIndicators: [],
        timestamps: []
      };

      // Check for metric values
      document.querySelectorAll('.text-2xl.font-bold').forEach(el => {
        elements.metricValues.push(el.innerText.trim());
      });

      // Check for charts and visualizations
      document.querySelectorAll('svg, canvas').forEach(el => {
        elements.charts.push({
          tag: el.tagName,
          className: el.className
        });
      });

      // Check for status indicators
      document.querySelectorAll('.bg-green-500, .text-green-600, .animate-pulse').forEach(el => {
        elements.statusIndicators.push(el.innerText.trim());
      });

      // Check for timestamps
      document.querySelectorAll('*').forEach(el => {
        const text = el.innerText;
        if (text && (text.includes(':') || text.includes('ago') || text.includes('Just now'))) {
          elements.timestamps.push(text.trim());
        }
      });

      return elements;
    });

    const screenshot = await takeScreenshot(page, 'analytics-data-display', 'Data display check');

    // Check if we have real data or placeholders
    const hasMetricValues = dataElements.metricValues.length > 0;
    const hasRealData = dataElements.metricValues.some(val =>
      val !== '0' && val !== '0%' && val !== 'N/A' && val.length > 0
    );

    if (hasMetricValues) {
      await logTest('Data Display - Metric Values', 'PASS', {
        screenshot,
        metricCount: dataElements.metricValues.length,
        sampleValues: dataElements.metricValues.slice(0, 5)
      });
    } else {
      await logTest('Data Display - Metric Values', 'FAIL', {
        error: 'No metric values found',
        screenshot,
        dataElements
      });
    }

    // Check for status indicators
    if (dataElements.statusIndicators.length > 0) {
      await logTest('Data Display - Status Indicators', 'PASS', {
        indicators: dataElements.statusIndicators
      });
    } else {
      await logTest('Data Display - Status Indicators', 'FAIL', {
        error: 'No status indicators found'
      });
    }

    return dataElements;

  } catch (error) {
    const screenshot = await takeScreenshot(page, 'analytics-data-error', 'Data display error');
    await logTest('Data Display - Error', 'FAIL', {
      error: error.message,
      screenshot
    });
    return null;
  }
}

async function runAllTests() {
  let browser;

  try {
    console.log('🔧 Starting White Screen Fix Validation for Analytics Page...\n');

    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    // Test 1: Basic page load and white screen prevention
    const { page, consoleMonitor } = await testPageLoad(browser);

    if (!page) {
      throw new Error('Failed to load analytics page');
    }

    // Test 2: Component rendering
    await testComponentRendering(page);

    // Test 3: Tab switching functionality
    await testTabSwitching(page);

    // Test 4: Data display
    await testDataDisplay(page);

    await page.close();

  } catch (error) {
    console.error('❌ Test execution failed:', error);
    testResults.summary.errors.push(`Test execution: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  // Generate final report
  const reportPath = path.join(SCREENSHOT_DIR, `white-screen-fix-test-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));

  console.log('\n📋 TEST SUMMARY');
  console.log('================');
  console.log(`Total Tests: ${testResults.summary.total}`);
  console.log(`Passed: ${testResults.summary.passed}`);
  console.log(`Failed: ${testResults.summary.failed}`);
  console.log(`Success Rate: ${((testResults.summary.passed / testResults.summary.total) * 100).toFixed(1)}%`);

  if (testResults.summary.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    testResults.summary.errors.forEach(error => console.log(`  - ${error}`));
  }

  console.log(`\n📄 Full report saved: ${reportPath}`);
  console.log(`📸 Screenshots saved in: ${SCREENSHOT_DIR}`);

  return testResults;
}

// Run tests if called directly
if (require.main === module) {
  runAllTests()
    .then(results => {
      process.exit(results.summary.failed === 0 ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runAllTests, testResults };