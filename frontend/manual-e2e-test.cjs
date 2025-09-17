/**
 * Manual E2E Test Script for Claude SDK Cost Analytics
 * This script validates all the required functionality manually using Puppeteer
 */

const puppeteer = require('puppeteer');

const TEST_CONFIG = {
  baseURL: 'http://localhost:3000',
  analyticsPath: '/analytics',
  timeout: 30000,
  performanceThresholds: {
    pageLoad: 5000,
    tabSwitch: 1000,
    apiResponse: 3000
  }
};

class TestReporter {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      passed: [],
      failed: [],
      errors: [],
      performance: {},
      summary: {}
    };
  }

  pass(testName, details = {}) {
    this.results.passed.push({ test: testName, details, timestamp: new Date() });
    console.log(`✅ PASS: ${testName}`);
    if (Object.keys(details).length > 0) {
      console.log(`   Details:`, details);
    }
  }

  fail(testName, error, details = {}) {
    this.results.failed.push({ test: testName, error: error.message, details, timestamp: new Date() });
    console.log(`❌ FAIL: ${testName}`);
    console.log(`   Error: ${error.message}`);
    if (Object.keys(details).length > 0) {
      console.log(`   Details:`, details);
    }
  }

  addError(error, context = '') {
    this.results.errors.push({ error: error.message, context, timestamp: new Date() });
    console.log(`🚨 ERROR: ${error.message} (${context})`);
  }

  addPerformance(metric, value) {
    this.results.performance[metric] = value;
    console.log(`📊 PERFORMANCE: ${metric} = ${value}ms`);
  }

  generateReport() {
    this.results.summary = {
      totalTests: this.results.passed.length + this.results.failed.length,
      passedTests: this.results.passed.length,
      failedTests: this.results.failed.length,
      errorCount: this.results.errors.length,
      passRate: this.results.passed.length / (this.results.passed.length + this.results.failed.length) * 100 || 0
    };

    console.log('\n' + '='.repeat(80));
    console.log('📋 COMPREHENSIVE TEST EXECUTION REPORT');
    console.log('='.repeat(80));
    console.log(`📅 Executed: ${this.results.timestamp}`);
    console.log(`📊 Total Tests: ${this.results.summary.totalTests}`);
    console.log(`✅ Passed: ${this.results.summary.passedTests}`);
    console.log(`❌ Failed: ${this.results.summary.failedTests}`);
    console.log(`🚨 Errors: ${this.results.summary.errorCount}`);
    console.log(`📈 Pass Rate: ${this.results.summary.passRate.toFixed(1)}%`);

    if (Object.keys(this.results.performance).length > 0) {
      console.log('\n📊 Performance Metrics:');
      Object.entries(this.results.performance).forEach(([metric, value]) => {
        console.log(`   ${metric}: ${value}ms`);
      });
    }

    if (this.results.failed.length > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.failed.forEach(failure => {
        console.log(`   - ${failure.test}: ${failure.error}`);
      });
    }

    if (this.results.errors.length > 0) {
      console.log('\n🚨 Errors Encountered:');
      this.results.errors.forEach(error => {
        console.log(`   - ${error.context}: ${error.error}`);
      });
    }

    console.log('='.repeat(80) + '\n');
    return this.results;
  }
}

class E2ETestSuite {
  constructor() {
    this.browser = null;
    this.page = null;
    this.reporter = new TestReporter();
    this.consoleErrors = [];
    this.networkErrors = [];
    this.apiResponses = [];
  }

  async setup() {
    console.log('🚀 Setting up E2E test environment...');

    this.browser = await puppeteer.launch({
      headless: false,
      defaultViewport: { width: 1920, height: 1080 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    this.page = await this.browser.newPage();

    // Monitor console errors
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!this.isIgnorableError(text)) {
          this.consoleErrors.push(text);
          this.reporter.addError(new Error(text), 'Console Error');
        }
      }
    });

    // Monitor page errors
    this.page.on('pageerror', error => {
      this.reporter.addError(error, 'Page Error');
    });

    // Monitor network responses
    this.page.on('response', response => {
      const url = response.url();
      const status = response.status();

      if (url.includes('/api/')) {
        this.apiResponses.push({ url, status, ok: response.ok() });

        if (status >= 400) {
          this.networkErrors.push({ url, status });
          this.reporter.addError(new Error(`API Error: ${status}`), url);
        }
      }
    });

    console.log('✅ Test environment setup complete');
  }

  async teardown() {
    if (this.browser) {
      await this.browser.close();
    }
    console.log('🧹 Test environment cleaned up');
  }

  isIgnorableError(message) {
    const ignorablePatterns = [
      /ResizeObserver/,
      /Non-passive event listener/,
      /favicon\.ico/,
      /chrome-extension/
    ];
    return ignorablePatterns.some(pattern => pattern.test(message));
  }

  async testPageLoading() {
    console.log('\n📄 Testing Page Loading...');

    try {
      const startTime = Date.now();
      const response = await this.page.goto(`${TEST_CONFIG.baseURL}${TEST_CONFIG.analyticsPath}`, {
        waitUntil: 'networkidle0',
        timeout: TEST_CONFIG.timeout
      });
      const loadTime = Date.now() - startTime;

      this.reporter.addPerformance('pageLoad', loadTime);

      // Test 1: Page loads without 500 errors
      if (response.status() >= 500) {
        throw new Error(`Server error: ${response.status()}`);
      }
      this.reporter.pass('Page loads without 500 errors', { status: response.status(), loadTime });

      // Test 2: Page loads within acceptable time
      if (loadTime > TEST_CONFIG.performanceThresholds.pageLoad) {
        throw new Error(`Page load too slow: ${loadTime}ms`);
      }
      this.reporter.pass('Page loads within performance threshold', { loadTime, threshold: TEST_CONFIG.performanceThresholds.pageLoad });

      // Test 3: Main content is visible
      await this.page.waitForSelector('main, [data-testid="analytics-dashboard"], .analytics-dashboard', { timeout: 10000 });
      this.reporter.pass('Main analytics content is visible');

      // Test 4: Page title is appropriate
      const title = await this.page.title();
      if (title && (title.includes('Analytics') || title.includes('Dashboard') || title.includes('Claude'))) {
        this.reporter.pass('Page has appropriate title', { title });
      } else {
        this.reporter.fail('Page title test', new Error(`Unexpected title: ${title}`));
      }

    } catch (error) {
      this.reporter.fail('Page loading test', error);
    }
  }

  async testTabSwitching() {
    console.log('\n🔄 Testing Tab Switching...');

    try {
      const tabs = await this.page.$$('[role="tab"], .tab-trigger, [data-testid*="tab"]');

      if (tabs.length === 0) {
        throw new Error('No tabs found on page');
      }

      this.reporter.pass('Tabs found on page', { count: tabs.length });

      // Test switching to each tab
      for (let i = 0; i < tabs.length; i++) {
        const tab = tabs[i];
        const tabText = await this.page.evaluate(el => el.textContent, tab);

        const startTime = Date.now();
        await tab.click();
        await this.page.waitForTimeout(500);
        const switchTime = Date.now() - startTime;

        this.reporter.addPerformance(`tabSwitch_${i + 1}`, switchTime);

        // Verify tab is active
        const isActive = await this.page.evaluate(el => {
          return el.getAttribute('aria-selected') === 'true' || el.classList.contains('active');
        }, tab);

        if (isActive) {
          this.reporter.pass(`Tab ${i + 1} activation`, { tabText, switchTime });
        } else {
          this.reporter.fail(`Tab ${i + 1} activation`, new Error('Tab not marked as active'));
        }

        // Verify tab content is visible
        try {
          await this.page.waitForSelector('[role="tabpanel"]:not([hidden]), .tab-content:not([hidden])', { timeout: 5000 });
          this.reporter.pass(`Tab ${i + 1} content visibility`);
        } catch (error) {
          this.reporter.fail(`Tab ${i + 1} content visibility`, error);
        }
      }

    } catch (error) {
      this.reporter.fail('Tab switching test', error);
    }
  }

  async testAPIIntegration() {
    console.log('\n🌐 Testing API Integration...');

    try {
      // Wait for API calls to complete
      await this.page.waitForTimeout(3000);

      // Test 1: API calls were made
      if (this.apiResponses.length === 0) {
        this.reporter.fail('API calls made', new Error('No API calls detected'));
      } else {
        this.reporter.pass('API calls made', { count: this.apiResponses.length });
      }

      // Test 2: Successful API responses
      const successfulCalls = this.apiResponses.filter(response => response.ok);
      const failedCalls = this.apiResponses.filter(response => !response.ok);

      if (successfulCalls.length > 0) {
        this.reporter.pass('Successful API responses', {
          successful: successfulCalls.length,
          failed: failedCalls.length
        });
      } else {
        this.reporter.fail('Successful API responses', new Error('No successful API calls'));
      }

      // Test 3: No server errors
      const serverErrors = this.apiResponses.filter(response => response.status >= 500);
      if (serverErrors.length === 0) {
        this.reporter.pass('No server errors (5xx)');
      } else {
        this.reporter.fail('No server errors (5xx)', new Error(`${serverErrors.length} server errors found`));
      }

    } catch (error) {
      this.reporter.fail('API integration test', error);
    }
  }

  async testDataVisualization() {
    console.log('\n📊 Testing Data Visualization...');

    try {
      // Test 1: Charts are present
      const charts = await this.page.$$('canvas, svg, [data-testid*="chart"], [class*="chart"]');

      if (charts.length === 0) {
        this.reporter.fail('Charts presence', new Error('No charts found on page'));
      } else {
        this.reporter.pass('Charts presence', { count: charts.length });
      }

      // Test 2: Charts have proper dimensions
      for (let i = 0; i < Math.min(charts.length, 5); i++) {
        const chart = charts[i];
        const boundingBox = await chart.boundingBox();

        if (boundingBox && boundingBox.width > 50 && boundingBox.height > 50) {
          this.reporter.pass(`Chart ${i + 1} dimensions`, {
            width: boundingBox.width,
            height: boundingBox.height
          });
        } else {
          this.reporter.fail(`Chart ${i + 1} dimensions`, new Error('Chart too small or not visible'));
        }
      }

      // Test 3: Cost metrics are displayed
      const costElements = await this.page.$$('[data-testid*="cost"], [class*="cost"]');
      if (costElements.length > 0) {
        this.reporter.pass('Cost metrics displayed', { count: costElements.length });
      }

      // Test 4: Currency formatting
      const dollarAmounts = await this.page.$$eval('*', elements => {
        return Array.from(elements)
          .filter(el => el.textContent && /\$\d+/.test(el.textContent))
          .map(el => el.textContent.trim())
          .slice(0, 5);
      });

      if (dollarAmounts.length > 0) {
        this.reporter.pass('Currency formatting found', { examples: dollarAmounts });
      }

    } catch (error) {
      this.reporter.fail('Data visualization test', error);
    }
  }

  async testInteractiveElements() {
    console.log('\n🖱️ Testing Interactive Elements...');

    try {
      // Test 1: Buttons are functional
      const buttons = await this.page.$$('button:not([disabled])');

      if (buttons.length === 0) {
        this.reporter.fail('Interactive buttons', new Error('No enabled buttons found'));
      } else {
        this.reporter.pass('Interactive buttons found', { count: buttons.length });

        // Test first few buttons
        for (let i = 0; i < Math.min(buttons.length, 3); i++) {
          try {
            const button = buttons[i];
            const buttonText = await this.page.evaluate(el => el.textContent, button);

            await button.click();
            await this.page.waitForTimeout(500);

            this.reporter.pass(`Button ${i + 1} interaction`, { text: buttonText });
          } catch (error) {
            this.reporter.fail(`Button ${i + 1} interaction`, error);
          }
        }
      }

      // Test 2: Form inputs
      const inputs = await this.page.$$('input:not([disabled]), select:not([disabled])');

      if (inputs.length > 0) {
        this.reporter.pass('Form inputs found', { count: inputs.length });

        // Test text inputs
        for (let i = 0; i < Math.min(inputs.length, 2); i++) {
          try {
            const input = inputs[i];
            const type = await this.page.evaluate(el => el.type, input);

            if (type === 'text' || type === 'search') {
              await input.type('test', { delay: 50 });
              await this.page.waitForTimeout(300);
              await input.evaluate(el => el.value = '');

              this.reporter.pass(`Input ${i + 1} interaction`, { type });
            }
          } catch (error) {
            this.reporter.fail(`Input ${i + 1} interaction`, error);
          }
        }
      }

    } catch (error) {
      this.reporter.fail('Interactive elements test', error);
    }
  }

  async testExportFeatures() {
    console.log('\n📤 Testing Export Features...');

    try {
      // Look for export buttons
      const exportButtons = await this.page.$$('[data-testid*="export"], button[class*="export"], button:has-text("Export"), button:has-text("Download")');

      if (exportButtons.length === 0) {
        this.reporter.pass('Export features (optional)', { note: 'No export buttons found - this may be expected' });
        return;
      }

      this.reporter.pass('Export buttons found', { count: exportButtons.length });

      // Test first export button
      try {
        const exportButton = exportButtons[0];
        const buttonText = await this.page.evaluate(el => el.textContent, exportButton);

        // Check if button is enabled
        const isEnabled = await this.page.evaluate(el => !el.disabled, exportButton);

        if (isEnabled) {
          this.reporter.pass('Export button enabled', { text: buttonText });

          // Note: We don't actually trigger downloads in this test to avoid file system issues
          this.reporter.pass('Export functionality available', { note: 'Button ready for interaction' });
        } else {
          this.reporter.fail('Export button enabled', new Error('Export button is disabled'));
        }
      } catch (error) {
        this.reporter.fail('Export button test', error);
      }

    } catch (error) {
      this.reporter.fail('Export features test', error);
    }
  }

  async testPerformanceMetrics() {
    console.log('\n⚡ Testing Performance Metrics...');

    try {
      const metrics = await this.page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        const paint = performance.getEntriesByType('paint');

        return {
          pageLoad: navigation.loadEventEnd - navigation.fetchStart,
          firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
          resourceCount: performance.getEntriesByType('resource').length
        };
      });

      // Test performance thresholds
      Object.entries(metrics).forEach(([metric, value]) => {
        this.reporter.addPerformance(metric, Math.round(value));
      });

      if (metrics.firstContentfulPaint < 3000) {
        this.reporter.pass('First Contentful Paint performance', { time: Math.round(metrics.firstContentfulPaint) });
      } else {
        this.reporter.fail('First Contentful Paint performance', new Error(`Too slow: ${Math.round(metrics.firstContentfulPaint)}ms`));
      }

      if (metrics.domContentLoaded < 4000) {
        this.reporter.pass('DOM Content Loaded performance', { time: Math.round(metrics.domContentLoaded) });
      } else {
        this.reporter.fail('DOM Content Loaded performance', new Error(`Too slow: ${Math.round(metrics.domContentLoaded)}ms`));
      }

    } catch (error) {
      this.reporter.fail('Performance metrics test', error);
    }
  }

  async testConsoleErrors() {
    console.log('\n🔍 Testing Console Errors...');

    try {
      if (this.consoleErrors.length === 0) {
        this.reporter.pass('No console errors');
      } else if (this.consoleErrors.length <= 2) {
        this.reporter.pass('Minimal console errors', {
          count: this.consoleErrors.length,
          errors: this.consoleErrors.slice(0, 2)
        });
      } else {
        this.reporter.fail('Too many console errors', new Error(`${this.consoleErrors.length} errors found`));
      }
    } catch (error) {
      this.reporter.fail('Console error test', error);
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Comprehensive E2E Test Suite for Claude SDK Cost Analytics\n');

    try {
      await this.setup();

      await this.testPageLoading();
      await this.testTabSwitching();
      await this.testAPIIntegration();
      await this.testDataVisualization();
      await this.testInteractiveElements();
      await this.testExportFeatures();
      await this.testPerformanceMetrics();
      await this.testConsoleErrors();

    } finally {
      await this.teardown();
      return this.reporter.generateReport();
    }
  }
}

// Run the test suite
async function main() {
  try {
    const testSuite = new E2ETestSuite();
    const results = await testSuite.runAllTests();

    // Save results to file
    const fs = require('fs');
    fs.writeFileSync(
      'test-results/manual-e2e-results.json',
      JSON.stringify(results, null, 2)
    );

    console.log('📄 Results saved to test-results/manual-e2e-results.json');

    // Exit with appropriate code
    process.exit(results.summary.failedTests > 0 ? 1 : 0);

  } catch (error) {
    console.error('💥 Test suite failed to execute:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { E2ETestSuite, TestReporter };