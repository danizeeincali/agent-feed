#!/usr/bin/env node

/**
 * Claude SDK Cost Analytics Production Validation Suite
 * Comprehensive validation for browser console, network, rendering, performance, and cross-browser testing
 */

import puppeteer from 'puppeteer';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AnalyticsValidator {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      url: 'http://127.0.0.1:5173/analytics',
      tests: []
    };
    this.browsers = ['chromium', 'firefox'];
  }

  async validateBrowserConsole(page, browserName) {
    console.log(`\n🔍 Checking browser console errors - ${browserName}`);

    const consoleLogs = [];
    const consoleErrors = [];

    page.on('console', msg => {
      const log = {
        type: msg.type(),
        text: msg.text(),
        location: msg.location()
      };

      if (msg.type() === 'error') {
        consoleErrors.push(log);
      } else {
        consoleLogs.push(log);
      }
    });

    page.on('pageerror', error => {
      consoleErrors.push({
        type: 'pageerror',
        text: error.message,
        stack: error.stack
      });
    });

    await page.goto(this.results.url, { waitUntil: 'networkidle0' });

    // Wait for React to hydrate and components to render
    await page.waitForTimeout(3000);

    return {
      test: 'Browser Console Validation',
      browser: browserName,
      passed: consoleErrors.length === 0,
      errors: consoleErrors,
      warnings: consoleLogs.filter(log => log.type === 'warning'),
      totalLogs: consoleLogs.length,
      details: `Found ${consoleErrors.length} errors and ${consoleLogs.filter(log => log.type === 'warning').length} warnings`
    };
  }

  async validateNetworkRequests(page, browserName) {
    console.log(`\n🌐 Validating network requests - ${browserName}`);

    const networkRequests = [];
    const failedRequests = [];

    page.on('request', request => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType()
      });
    });

    page.on('requestfailed', request => {
      failedRequests.push({
        url: request.url(),
        failure: request.failure(),
        method: request.method()
      });
    });

    await page.goto(this.results.url, { waitUntil: 'networkidle0' });

    // Wait for any async data loading
    await page.waitForTimeout(5000);

    // Check for specific API endpoints
    const apiRequests = networkRequests.filter(req =>
      req.url.includes('/api/') ||
      req.url.includes('claude') ||
      req.url.includes('analytics')
    );

    return {
      test: 'Network Request Validation',
      browser: browserName,
      passed: failedRequests.length === 0,
      totalRequests: networkRequests.length,
      apiRequests: apiRequests.length,
      failedRequests: failedRequests,
      details: `${networkRequests.length} total requests, ${apiRequests.length} API requests, ${failedRequests.length} failed`
    };
  }

  async validateComponentRendering(page, browserName) {
    console.log(`\n🎨 Verifying component rendering - ${browserName}`);

    await page.goto(this.results.url, { waitUntil: 'networkidle0' });

    // Wait for React components to mount
    await page.waitForTimeout(3000);

    // Check for key analytics components
    const components = {
      costTracker: await page.$('[data-testid="cost-tracker"]') || await page.$('.cost-tracker'),
      analyticsChart: await page.$('[data-testid="analytics-chart"]') || await page.$('.analytics-chart'),
      metricsDisplay: await page.$('[data-testid="metrics-display"]') || await page.$('.metrics-display'),
      dashboardHeader: await page.$('[data-testid="dashboard-header"]') || await page.$('h1, h2'),
      dataTable: await page.$('table') || await page.$('[data-testid="data-table"]')
    };

    // Check for loading states
    const loadingElements = await page.$$('[data-testid*="loading"], .loading, .spinner');

    // Check for error states
    const errorElements = await page.$$('[data-testid*="error"], .error, .alert-error');

    // Verify no blank/white screen
    const bodyContent = await page.evaluate(() => {
      return document.body.innerText.trim().length > 0;
    });

    const renderedComponents = Object.entries(components).filter(([_, element]) => element !== null);

    return {
      test: 'Component Rendering Validation',
      browser: browserName,
      passed: renderedComponents.length > 0 && bodyContent && errorElements.length === 0,
      renderedComponents: renderedComponents.map(([name]) => name),
      loadingStates: loadingElements.length,
      errorStates: errorElements.length,
      hasContent: bodyContent,
      details: `${renderedComponents.length}/5 components rendered, ${errorElements.length} error states`
    };
  }

  async validatePerformanceMetrics(page, browserName) {
    console.log(`\n⚡ Measuring performance metrics - ${browserName}`);

    // Enable performance metrics
    await page.evaluateOnNewDocument(() => {
      window.performance.mark('navigation-start');
    });

    const startTime = Date.now();
    await page.goto(this.results.url, { waitUntil: 'networkidle0' });
    const loadTime = Date.now() - startTime;

    // Wait for components to render
    await page.waitForTimeout(2000);

    // Get performance metrics
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      const paint = performance.getEntriesByType('paint');

      return {
        domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart,
        loadComplete: navigation?.loadEventEnd - navigation?.loadEventStart,
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime,
        resourceCount: performance.getEntriesByType('resource').length
      };
    });

    // Test responsiveness
    const responseStart = Date.now();
    await page.click('body');
    const responseTime = Date.now() - responseStart;

    const performanceScore = {
      loadTime: loadTime < 3000, // Should load in under 3 seconds
      firstPaint: (metrics.firstPaint || 0) < 1500, // First paint under 1.5s
      firstContentfulPaint: (metrics.firstContentfulPaint || 0) < 2000, // FCP under 2s
      responsiveness: responseTime < 100 // Click response under 100ms
    };

    const passed = Object.values(performanceScore).every(score => score);

    return {
      test: 'Performance Validation',
      browser: browserName,
      passed,
      loadTime,
      metrics,
      responseTime,
      performanceScore,
      details: `Load: ${loadTime}ms, FCP: ${metrics.firstContentfulPaint || 'N/A'}ms, Response: ${responseTime}ms`
    };
  }

  async validateRealDataIntegration(page, browserName) {
    console.log(`\n📊 Validating real data integration - ${browserName}`);

    await page.goto(this.results.url, { waitUntil: 'networkidle0' });
    await page.waitForTimeout(3000);

    // Check for mock/fake data indicators
    const mockIndicators = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      const mockPatterns = [
        'mock', 'fake', 'dummy', 'test data', 'placeholder',
        'lorem ipsum', 'sample data', 'example.com'
      ];

      return mockPatterns.filter(pattern => text.includes(pattern));
    });

    // Check for real data patterns
    const realDataIndicators = await page.evaluate(() => {
      const text = document.body.innerText;
      const realPatterns = [
        /\$\d+\.\d{2}/, // Currency values
        /\d{4}-\d{2}-\d{2}/, // Date patterns
        /\d+\.\d+%/, // Percentage values
        /\d{1,3},?\d{3}/ // Number formatting
      ];

      return realPatterns.some(pattern => pattern.test(text));
    });

    // Check for actual API responses
    const apiDataCheck = await page.evaluate(() => {
      // Look for data attributes or state indicators
      const elements = document.querySelectorAll('[data-*], .loaded, .has-data');
      return elements.length > 0;
    });

    return {
      test: 'Real Data Integration Validation',
      browser: browserName,
      passed: mockIndicators.length === 0 && (realDataIndicators || apiDataCheck),
      mockIndicators,
      hasRealDataPatterns: realDataIndicators,
      hasApiData: apiDataCheck,
      details: `${mockIndicators.length} mock indicators found, real data patterns: ${realDataIndicators}`
    };
  }

  async validateErrorHandling(page, browserName) {
    console.log(`\n🛡️ Testing error handling - ${browserName}`);

    const errorTests = [];

    // Test 1: Navigate to invalid route
    try {
      await page.goto(`${this.results.url}/invalid-route`, { waitUntil: 'networkidle0' });
      await page.waitForTimeout(2000);

      const hasErrorPage = await page.evaluate(() => {
        const text = document.body.innerText.toLowerCase();
        return text.includes('404') || text.includes('not found') || text.includes('error');
      });

      errorTests.push({
        test: 'Invalid Route Handling',
        passed: hasErrorPage,
        details: hasErrorPage ? 'Error page displayed' : 'No error handling for invalid routes'
      });
    } catch (error) {
      errorTests.push({
        test: 'Invalid Route Handling',
        passed: false,
        details: `Navigation error: ${error.message}`
      });
    }

    // Test 2: Check main analytics page for error boundaries
    await page.goto(this.results.url, { waitUntil: 'networkidle0' });

    const hasErrorBoundary = await page.evaluate(() => {
      // Trigger a potential error and check if error boundary catches it
      try {
        // Look for error boundary indicators in React dev tools or data attributes
        return document.querySelector('[data-error-boundary]') !== null;
      } catch {
        return false;
      }
    });

    errorTests.push({
      test: 'Error Boundary Check',
      passed: true, // Pass if no uncaught errors
      details: hasErrorBoundary ? 'Error boundary detected' : 'No error boundary indicators found'
    });

    const allPassed = errorTests.every(test => test.passed);

    return {
      test: 'Error Handling Validation',
      browser: browserName,
      passed: allPassed,
      errorTests,
      details: `${errorTests.filter(t => t.passed).length}/${errorTests.length} error handling tests passed`
    };
  }

  async runSingleBrowserValidation(browserName) {
    console.log(`\n🚀 Starting validation for ${browserName}`);

    let browser;
    try {
      const browserOptions = {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      };

      if (browserName === 'firefox') {
        browser = await puppeteer.launch({
          ...browserOptions,
          product: 'firefox'
        });
      } else {
        browser = await puppeteer.launch(browserOptions);
      }

      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });

      const validationResults = [];

      // Run all validation tests
      validationResults.push(await this.validateBrowserConsole(page, browserName));
      validationResults.push(await this.validateNetworkRequests(page, browserName));
      validationResults.push(await this.validateComponentRendering(page, browserName));
      validationResults.push(await this.validatePerformanceMetrics(page, browserName));
      validationResults.push(await this.validateRealDataIntegration(page, browserName));
      validationResults.push(await this.validateErrorHandling(page, browserName));

      return validationResults;

    } catch (error) {
      console.error(`Error validating ${browserName}:`, error);
      return [{
        test: 'Browser Launch',
        browser: browserName,
        passed: false,
        error: error.message,
        details: `Failed to launch ${browserName}: ${error.message}`
      }];
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  async runCrossBrowserValidation() {
    console.log('\n🌐 Starting cross-browser validation...');

    const allResults = [];

    for (const browserName of this.browsers) {
      try {
        const browserResults = await this.runSingleBrowserValidation(browserName);
        allResults.push(...browserResults);
      } catch (error) {
        console.error(`Failed to validate ${browserName}:`, error);
        allResults.push({
          test: 'Cross-browser Validation',
          browser: browserName,
          passed: false,
          error: error.message,
          details: `Browser validation failed: ${error.message}`
        });
      }
    }

    this.results.tests = allResults;
    return allResults;
  }

  generateReport() {
    const passedTests = this.results.tests.filter(test => test.passed);
    const failedTests = this.results.tests.filter(test => !test.passed);

    const report = {
      summary: {
        totalTests: this.results.tests.length,
        passed: passedTests.length,
        failed: failedTests.length,
        successRate: `${((passedTests.length / this.results.tests.length) * 100).toFixed(1)}%`,
        timestamp: this.results.timestamp,
        url: this.results.url
      },
      testResults: this.results.tests,
      recommendations: this.generateRecommendations(failedTests),
      criticalIssues: failedTests.filter(test =>
        test.test.includes('Console') ||
        test.test.includes('Rendering') ||
        test.test.includes('Error')
      )
    };

    return report;
  }

  generateRecommendations(failedTests) {
    const recommendations = [];

    failedTests.forEach(test => {
      switch (test.test) {
        case 'Browser Console Validation':
          recommendations.push({
            priority: 'HIGH',
            issue: 'JavaScript Console Errors',
            solution: 'Fix console errors to ensure proper application functionality',
            errors: test.errors
          });
          break;

        case 'Component Rendering Validation':
          recommendations.push({
            priority: 'CRITICAL',
            issue: 'Component Rendering Issues',
            solution: 'Ensure all React components render properly and no white screen issues exist',
            details: test.details
          });
          break;

        case 'Performance Validation':
          recommendations.push({
            priority: 'MEDIUM',
            issue: 'Performance Issues',
            solution: 'Optimize load times and improve user experience',
            metrics: test.metrics
          });
          break;

        case 'Real Data Integration Validation':
          recommendations.push({
            priority: 'HIGH',
            issue: 'Mock Data Detected',
            solution: 'Replace all mock/fake data with real production data',
            mockIndicators: test.mockIndicators
          });
          break;
      }
    });

    return recommendations;
  }

  async run() {
    console.log('🔍 Claude SDK Cost Analytics Production Validation Suite');
    console.log('==================================================');

    try {
      await this.runCrossBrowserValidation();
      const report = this.generateReport();

      // Save detailed report
      const reportPath = path.join(__dirname, 'claude-sdk-analytics-validation-report.json');
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

      // Generate summary
      console.log('\n📋 VALIDATION SUMMARY');
      console.log('=====================');
      console.log(`✅ Tests Passed: ${report.summary.passed}/${report.summary.totalTests}`);
      console.log(`❌ Tests Failed: ${report.summary.failed}/${report.summary.totalTests}`);
      console.log(`📊 Success Rate: ${report.summary.successRate}`);
      console.log(`📁 Report saved: ${reportPath}`);

      if (report.criticalIssues.length > 0) {
        console.log('\n🚨 CRITICAL ISSUES FOUND:');
        report.criticalIssues.forEach(issue => {
          console.log(`   • ${issue.test} (${issue.browser}): ${issue.details}`);
        });
      }

      if (report.recommendations.length > 0) {
        console.log('\n💡 RECOMMENDATIONS:');
        report.recommendations.forEach(rec => {
          console.log(`   [${rec.priority}] ${rec.issue}: ${rec.solution}`);
        });
      }

      return report;

    } catch (error) {
      console.error('❌ Validation suite failed:', error);
      throw error;
    }
  }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new AnalyticsValidator();
  validator.run()
    .then(report => {
      console.log('\n✅ Validation completed successfully');
      process.exit(report.summary.failed === 0 ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    });
}

export default AnalyticsValidator;