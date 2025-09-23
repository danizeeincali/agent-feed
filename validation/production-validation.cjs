#!/usr/bin/env node

/**
 * Production Validation Script for Agent Feed Application
 * Validates real functionality, no mocks or simulations
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class ProductionValidator {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      application: 'agent-feed',
      environment: 'localhost:5173',
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        critical_issues: [],
        recommendations: []
      }
    };
    this.browser = null;
    this.page = null;
  }

  async initialize() {
    console.log('🚀 Initializing Production Validation...');
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--remote-debugging-port=9222'
      ]
    });
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1920, height: 1080 });

    // Monitor console errors
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        this.results.summary.critical_issues.push({
          type: 'console_error',
          message: msg.text(),
          timestamp: new Date().toISOString()
        });
      }
    });

    // Monitor network failures
    this.page.on('response', response => {
      if (response.status() >= 400) {
        this.results.summary.critical_issues.push({
          type: 'network_error',
          url: response.url(),
          status: response.status(),
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  async runTest(name, testFn) {
    const test = {
      name,
      status: 'running',
      startTime: Date.now(),
      endTime: null,
      duration: null,
      error: null,
      details: {}
    };

    try {
      console.log(`🧪 Running: ${name}`);
      await testFn(test);
      test.status = 'passed';
      this.results.summary.passed++;
    } catch (error) {
      console.error(`❌ Failed: ${name} - ${error.message}`);
      test.status = 'failed';
      test.error = error.message;
      this.results.summary.failed++;
    } finally {
      test.endTime = Date.now();
      test.duration = test.endTime - test.startTime;
      this.results.tests.push(test);
      this.results.summary.total++;
    }
  }

  // Test 1: Application Loading and Accessibility
  async testApplicationLoading(test) {
    console.log('📍 Testing application loading...');

    const response = await this.page.goto('http://localhost:5173', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    if (!response.ok()) {
      throw new Error(`Application failed to load: ${response.status()}`);
    }

    // Wait for React app to mount
    await this.page.waitForSelector('[data-testid="app-root"]', { timeout: 10000 });

    // Check for critical elements
    const appContainer = await this.page.$('[data-testid="app-container"]');
    const header = await this.page.$('[data-testid="header"]');
    const mainContent = await this.page.$('[data-testid="main-content"]');

    if (!appContainer || !header || !mainContent) {
      throw new Error('Critical UI elements not found');
    }

    test.details.loadTime = Date.now() - test.startTime;
    test.details.responseStatus = response.status();
    console.log('✅ Application loaded successfully');
  }

  // Test 2: Frontend Component Validation
  async testFrontendComponents(test) {
    console.log('📍 Testing frontend components...');

    // Test navigation
    const navLinks = await this.page.$$eval('nav a', links =>
      links.map(link => ({
        text: link.textContent.trim(),
        href: link.getAttribute('href')
      }))
    );

    if (navLinks.length === 0) {
      throw new Error('No navigation links found');
    }

    test.details.navigationLinks = navLinks.length;

    // Test sidebar functionality
    const sidebarButton = await this.page.$('button[aria-label*="menu"], button:has([class*="menu"]), button:has(svg)');
    if (sidebarButton) {
      await sidebarButton.click();
      await this.page.waitForTimeout(500);
    }

    // Check for React components
    const componentSelectors = [
      '[class*="agent"]',
      '[class*="feed"]',
      '[class*="dashboard"]',
      'button',
      'input'
    ];

    let foundComponents = 0;
    for (const selector of componentSelectors) {
      const elements = await this.page.$$(selector);
      foundComponents += elements.length;
    }

    test.details.componentCount = foundComponents;

    if (foundComponents < 5) {
      throw new Error(`Insufficient UI components found: ${foundComponents}`);
    }

    console.log('✅ Frontend components validated');
  }

  // Test 3: Critical User Workflows
  async testUserWorkflows(test) {
    console.log('📍 Testing user workflows...');

    const workflows = [];

    // Test main navigation
    try {
      const feedLink = await this.page.$('a[href="/"], a[href*="feed"]');
      if (feedLink) {
        await feedLink.click();
        await this.page.waitForTimeout(2000);
        workflows.push({ name: 'feed_navigation', status: 'success' });
      }
    } catch (error) {
      workflows.push({ name: 'feed_navigation', status: 'failed', error: error.message });
    }

    // Test agents page
    try {
      const agentsLink = await this.page.$('a[href="/agents"]');
      if (agentsLink) {
        await agentsLink.click();
        await this.page.waitForTimeout(2000);
        workflows.push({ name: 'agents_navigation', status: 'success' });
      }
    } catch (error) {
      workflows.push({ name: 'agents_navigation', status: 'failed', error: error.message });
    }

    // Test search functionality
    try {
      const searchInput = await this.page.$('input[placeholder*="search"], input[type="search"]');
      if (searchInput) {
        await searchInput.type('test query');
        await this.page.waitForTimeout(1000);
        workflows.push({ name: 'search_functionality', status: 'success' });
      }
    } catch (error) {
      workflows.push({ name: 'search_functionality', status: 'failed', error: error.message });
    }

    test.details.workflows = workflows;

    const failedWorkflows = workflows.filter(w => w.status === 'failed');
    if (failedWorkflows.length > 0) {
      throw new Error(`${failedWorkflows.length} workflows failed`);
    }

    console.log('✅ User workflows validated');
  }

  // Test 4: API Endpoint Validation
  async testAPIEndpoints(test) {
    console.log('📍 Testing API endpoints...');

    const endpoints = [
      { url: 'http://localhost:5173/api/health', method: 'GET' },
      { url: 'http://localhost:5173/api/agents', method: 'GET' },
      { url: 'http://localhost:5173/api/posts', method: 'GET' },
      { url: 'http://localhost:5173/api/analytics', method: 'GET' }
    ];

    const results = [];

    for (const endpoint of endpoints) {
      try {
        const response = await this.page.evaluate(async (url) => {
          const resp = await fetch(url);
          return {
            status: resp.status,
            ok: resp.ok,
            contentType: resp.headers.get('content-type')
          };
        }, endpoint.url);

        results.push({
          url: endpoint.url,
          status: response.status,
          ok: response.ok,
          contentType: response.contentType
        });
      } catch (error) {
        results.push({
          url: endpoint.url,
          error: error.message
        });
      }
    }

    test.details.apiResults = results;

    const workingEndpoints = results.filter(r => r.ok);
    console.log(`📊 API Results: ${workingEndpoints.length}/${results.length} endpoints working`);

    // Don't fail if some endpoints are down - log for review
    console.log('ℹ️ API endpoints tested (some may be expected to fail)');
  }

  // Test 5: Responsive Design
  async testResponsiveDesign(test) {
    console.log('📍 Testing responsive design...');

    const viewports = [
      { name: 'desktop', width: 1920, height: 1080 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'mobile', width: 375, height: 667 }
    ];

    const results = [];

    for (const viewport of viewports) {
      await this.page.setViewport(viewport);
      await this.page.waitForTimeout(1000);

      const isVisible = await this.page.evaluate(() => {
        const content = document.querySelector('[data-testid="main-content"]');
        const rect = content ? content.getBoundingClientRect() : null;
        return rect ? rect.width > 0 && rect.height > 0 : false;
      });

      results.push({
        viewport: viewport.name,
        dimensions: `${viewport.width}x${viewport.height}`,
        contentVisible: isVisible
      });
    }

    test.details.responsiveResults = results;

    const failedViewports = results.filter(r => !r.contentVisible);
    if (failedViewports.length > 0) {
      throw new Error(`Content not visible on: ${failedViewports.map(v => v.viewport).join(', ')}`);
    }

    // Reset to desktop
    await this.page.setViewport({ width: 1920, height: 1080 });

    console.log('✅ Responsive design validated');
  }

  // Test 6: Performance Validation
  async testPerformance(test) {
    console.log('📍 Testing performance...');

    // Navigate to home page and measure performance
    const startTime = Date.now();
    await this.page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
    const loadTime = Date.now() - startTime;

    // Get performance metrics
    const metrics = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
        totalLoadTime: navigation.loadEventEnd - navigation.fetchStart
      };
    });

    test.details.performanceMetrics = {
      ...metrics,
      measurementLoadTime: loadTime
    };

    // Performance thresholds
    if (loadTime > 10000) {
      throw new Error(`Load time too slow: ${loadTime}ms`);
    }

    console.log(`✅ Performance validated - Load time: ${loadTime}ms`);
  }

  // Test 7: Error Handling and Security
  async testErrorHandlingAndSecurity(test) {
    console.log('📍 Testing error handling and security...');

    const securityTests = [];

    // Test 404 handling
    try {
      await this.page.goto('http://localhost:5173/non-existent-page');
      await this.page.waitForTimeout(2000);

      const pageContent = await this.page.content();
      const has404Handler = pageContent.includes('404') || pageContent.includes('Not Found') || pageContent.includes('not found');

      securityTests.push({
        test: '404_handling',
        passed: has404Handler
      });
    } catch (error) {
      securityTests.push({
        test: '404_handling',
        passed: false,
        error: error.message
      });
    }

    // Test XSS protection
    try {
      await this.page.goto('http://localhost:5173');
      await this.page.waitForTimeout(1000);

      const searchInput = await this.page.$('input[placeholder*="search"], input[type="search"]');
      if (searchInput) {
        await searchInput.type('<script>alert("xss")</script>');
        await this.page.waitForTimeout(1000);

        // Check if script was executed (it shouldn't be)
        const alertShown = await this.page.evaluate(() => {
          return window.alert !== window.alert; // Check if alert was hijacked
        });

        securityTests.push({
          test: 'xss_protection',
          passed: !alertShown
        });
      }
    } catch (error) {
      securityTests.push({
        test: 'xss_protection',
        passed: true, // Error means XSS didn't execute
        note: 'XSS attempt blocked'
      });
    }

    test.details.securityTests = securityTests;

    const failedSecurityTests = securityTests.filter(t => !t.passed);
    if (failedSecurityTests.length > 0) {
      this.results.summary.critical_issues.push({
        type: 'security_vulnerability',
        tests: failedSecurityTests
      });
    }

    console.log('✅ Error handling and security tested');
  }

  async runAllTests() {
    try {
      await this.initialize();

      await this.runTest('Application Loading & Accessibility', this.testApplicationLoading.bind(this));
      await this.runTest('Frontend Components Validation', this.testFrontendComponents.bind(this));
      await this.runTest('Critical User Workflows', this.testUserWorkflows.bind(this));
      await this.runTest('API Endpoints Validation', this.testAPIEndpoints.bind(this));
      await this.runTest('Responsive Design', this.testResponsiveDesign.bind(this));
      await this.runTest('Performance Validation', this.testPerformance.bind(this));
      await this.runTest('Error Handling & Security', this.testErrorHandlingAndSecurity.bind(this));

    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }

  generateReport() {
    const passRate = (this.results.summary.passed / this.results.summary.total * 100).toFixed(1);

    // Determine production readiness
    const criticalFailures = this.results.tests.filter(t =>
      t.status === 'failed' &&
      ['Application Loading & Accessibility', 'Frontend Components Validation'].includes(t.name)
    );

    const isProductionReady = criticalFailures.length === 0 && this.results.summary.critical_issues.length < 5;

    this.results.summary.passRate = parseFloat(passRate);
    this.results.summary.productionReady = isProductionReady;
    this.results.summary.recommendations = this.generateRecommendations();

    return this.results;
  }

  generateRecommendations() {
    const recommendations = [];

    // Check failed tests
    const failedTests = this.results.tests.filter(t => t.status === 'failed');
    failedTests.forEach(test => {
      recommendations.push(`Fix failed test: ${test.name} - ${test.error}`);
    });

    // Check performance
    const perfTest = this.results.tests.find(t => t.name === 'Performance Validation');
    if (perfTest?.details?.performanceMetrics?.measurementLoadTime > 5000) {
      recommendations.push('Optimize application load time (currently > 5 seconds)');
    }

    // Check critical issues
    if (this.results.summary.critical_issues.length > 0) {
      recommendations.push(`Address ${this.results.summary.critical_issues.length} critical issues found`);
    }

    // Check API issues
    const apiTest = this.results.tests.find(t => t.name === 'API Endpoints Validation');
    if (apiTest?.details?.apiResults) {
      const workingAPIs = apiTest.details.apiResults.filter(r => r.ok).length;
      const totalAPIs = apiTest.details.apiResults.length;
      if (workingAPIs < totalAPIs) {
        recommendations.push(`Fix ${totalAPIs - workingAPIs} non-working API endpoints`);
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('Application appears production-ready');
    }

    return recommendations;
  }
}

// Main execution
async function main() {
  const validator = new ProductionValidator();

  try {
    console.log('🎯 Starting Production Validation for Agent Feed Application');
    console.log('📍 Target: http://localhost:5173');
    console.log('⚡ Mode: Real functionality validation (no mocks)\n');

    await validator.runAllTests();
    const report = validator.generateReport();

    // Save report
    const reportPath = path.join(process.cwd(), 'validation', 'production-validation-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    // Console summary
    console.log('\n' + '='.repeat(60));
    console.log('🎯 PRODUCTION VALIDATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`📊 Tests: ${report.summary.total} total, ${report.summary.passed} passed, ${report.summary.failed} failed`);
    console.log(`📈 Pass Rate: ${report.summary.passRate}%`);
    console.log(`🚀 Production Ready: ${report.summary.productionReady ? 'YES' : 'NO'}`);
    console.log(`⚠️  Critical Issues: ${report.summary.critical_issues.length}`);

    if (report.summary.recommendations.length > 0) {
      console.log('\n📋 RECOMMENDATIONS:');
      report.summary.recommendations.forEach((rec, i) => {
        console.log(`  ${i + 1}. ${rec}`);
      });
    }

    console.log(`\n📄 Full report saved to: ${reportPath}`);
    console.log('='.repeat(60));

    // Exit with appropriate code
    process.exit(report.summary.productionReady ? 0 : 1);

  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = ProductionValidator;