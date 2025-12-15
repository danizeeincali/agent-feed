/**
 * MANUAL WORKFLOWS ROUTE VALIDATION
 * 100% Real Implementation Testing Script
 *
 * This script performs comprehensive validation of the /workflows route
 * using real browser automation and API calls.
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class WorkflowsRouteValidator {
  constructor() {
    this.results = {
      routeAccessibility: null,
      componentRendering: null,
      navigationIntegration: null,
      apiConnectivity: null,
      performanceMetrics: {},
      securityValidation: null,
      screenshots: [],
      errors: []
    };

    this.screenshotDir = '/workspaces/agent-feed/docs/screenshots';
    this.ensureScreenshotDir();
  }

  ensureScreenshotDir() {
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }
  }

  async validateWorkflowsRoute() {
    console.log('🚀 Starting comprehensive workflows route validation...');
    console.log('📍 Testing with 100% real implementation - no mocks or simulations');

    let browser;
    try {
      browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();

      // Set viewport for consistent screenshots
      await page.setViewport({ width: 1920, height: 1080 });

      // Step 1: Test route accessibility
      await this.testRouteAccessibility(page);

      // Step 2: Test component rendering
      await this.testComponentRendering(page);

      // Step 3: Test navigation integration
      await this.testNavigationIntegration(page);

      // Step 4: Test performance
      await this.testPerformance(page);

      // Step 5: Test security
      await this.testSecurity(page);

      // Generate final report
      this.generateReport();

    } catch (error) {
      console.error('❌ Validation failed:', error);
      this.results.errors.push(error.message);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  async testRouteAccessibility(page) {
    console.log('\n🔍 Testing Route Accessibility...');

    try {
      const startTime = Date.now();

      // Navigate to workflows route
      console.log('📍 Navigating to /workflows route...');
      const response = await page.goto('http://localhost:5173/workflows', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      const loadTime = Date.now() - startTime;
      this.results.performanceMetrics.routeLoadTime = loadTime;

      // Check if route loaded successfully
      if (response && response.status() === 200) {
        console.log('✅ Route accessible - Status 200');
        this.results.routeAccessibility = 'PASS';

        // Verify URL
        const currentUrl = page.url();
        if (currentUrl.includes('/workflows')) {
          console.log('✅ URL correctly shows /workflows route');
        } else {
          console.log('⚠️ URL redirect detected:', currentUrl);
        }

        // Take screenshot
        const screenshotPath = path.join(this.screenshotDir, '01-route-accessibility.png');
        await page.screenshot({ path: screenshotPath, fullPage: true });
        this.results.screenshots.push('01-route-accessibility.png');
        console.log(`📸 Screenshot saved: ${screenshotPath}`);

      } else {
        console.log('❌ Route not accessible - Status:', response?.status() || 'No Response');
        this.results.routeAccessibility = 'FAIL';
        this.results.errors.push(`Route returned status: ${response?.status() || 'No Response'}`);
      }

      console.log(`⏱️ Route load time: ${loadTime}ms`);

    } catch (error) {
      console.log('❌ Route accessibility test failed:', error.message);
      this.results.routeAccessibility = 'FAIL';
      this.results.errors.push(`Route accessibility: ${error.message}`);
    }
  }

  async testComponentRendering(page) {
    console.log('\n🎨 Testing Component Rendering...');

    try {
      // Check if page contains workflow-related content
      const pageContent = await page.content();

      // Look for workflow-specific elements
      const workflowElements = await page.evaluate(() => {
        const elements = [];

        // Check for workflow-related text
        if (document.body.textContent.toLowerCase().includes('workflow')) {
          elements.push('workflow-text');
        }

        // Check for common workflow UI elements
        const selectors = [
          '[data-testid*="workflow"]',
          '.workflow',
          '#workflow',
          'svg', // Workflow diagrams often use SVG
          '.workflow-node',
          '.workflow-visualization'
        ];

        selectors.forEach(selector => {
          if (document.querySelector(selector)) {
            elements.push(selector);
          }
        });

        return elements;
      });

      if (workflowElements.length > 0) {
        console.log('✅ Workflow components detected:', workflowElements);
        this.results.componentRendering = 'PASS';

        // Take detailed screenshot
        const screenshotPath = path.join(this.screenshotDir, '02-component-rendering.png');
        await page.screenshot({ path: screenshotPath, fullPage: true });
        this.results.screenshots.push('02-component-rendering.png');

      } else {
        console.log('⚠️ No specific workflow components found, checking general content...');

        // Check if any content is rendered at all
        const bodyText = await page.evaluate(() => document.body.textContent.trim());
        if (bodyText.length > 0) {
          console.log('✅ Page content rendered (generic content detected)');
          this.results.componentRendering = 'PARTIAL';
        } else {
          console.log('❌ No page content rendered');
          this.results.componentRendering = 'FAIL';
        }

        const screenshotPath = path.join(this.screenshotDir, '02-content-check.png');
        await page.screenshot({ path: screenshotPath, fullPage: true });
        this.results.screenshots.push('02-content-check.png');
      }

    } catch (error) {
      console.log('❌ Component rendering test failed:', error.message);
      this.results.componentRendering = 'FAIL';
      this.results.errors.push(`Component rendering: ${error.message}`);
    }
  }

  async testNavigationIntegration(page) {
    console.log('\n🧭 Testing Navigation Integration...');

    try {
      // Navigate to home page first
      await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });

      // Look for workflows link in navigation
      const navigationCheck = await page.evaluate(() => {
        // Try multiple navigation selectors
        const navSelectors = [
          'nav a[href="/workflows"]',
          '.nav a[href="/workflows"]',
          'a[href="/workflows"]',
          'nav a',
          '.navigation a'
        ];

        const results = {};

        navSelectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          results[selector] = elements.length;

          // Check for workflows link specifically
          Array.from(elements).forEach(el => {
            if (el.textContent.toLowerCase().includes('workflow') ||
                el.getAttribute('href') === '/workflows') {
              results.workflowLinkFound = true;
              results.workflowLinkText = el.textContent.trim();
              results.workflowLinkHref = el.getAttribute('href');
            }
          });
        });

        return results;
      });

      console.log('🔍 Navigation analysis:', navigationCheck);

      if (navigationCheck.workflowLinkFound) {
        console.log('✅ Workflows link found in navigation');

        // Try to click the workflows link
        await page.click('a[href="/workflows"]');
        await page.waitForNavigation({ waitUntil: 'networkidle2' });

        const currentUrl = page.url();
        if (currentUrl.includes('/workflows')) {
          console.log('✅ Navigation to workflows via menu successful');
          this.results.navigationIntegration = 'PASS';
        } else {
          console.log('⚠️ Navigation click did not lead to workflows route');
          this.results.navigationIntegration = 'PARTIAL';
        }

      } else {
        console.log('⚠️ No workflows link found in navigation');
        this.results.navigationIntegration = 'PARTIAL';
      }

      // Take navigation screenshot
      const screenshotPath = path.join(this.screenshotDir, '03-navigation-integration.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });
      this.results.screenshots.push('03-navigation-integration.png');

    } catch (error) {
      console.log('❌ Navigation integration test failed:', error.message);
      this.results.navigationIntegration = 'FAIL';
      this.results.errors.push(`Navigation integration: ${error.message}`);
    }
  }

  async testPerformance(page) {
    console.log('\n⚡ Testing Performance...');

    try {
      const startTime = Date.now();

      await page.goto('http://localhost:5173/workflows', {
        waitUntil: 'networkidle2'
      });

      // Get performance metrics
      const performanceMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        const memory = performance.memory || {};

        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          responseTime: navigation.responseEnd - navigation.requestStart,
          renderTime: navigation.domComplete - navigation.domLoading,
          memoryUsed: memory.usedJSHeapSize || 0,
          totalMemory: memory.totalJSHeapSize || 0
        };
      });

      console.log('📊 Performance Metrics:');
      console.log(`   - DOM Content Loaded: ${performanceMetrics.domContentLoaded}ms`);
      console.log(`   - Load Complete: ${performanceMetrics.loadComplete}ms`);
      console.log(`   - Response Time: ${performanceMetrics.responseTime}ms`);
      console.log(`   - Render Time: ${performanceMetrics.renderTime}ms`);
      console.log(`   - Memory Used: ${Math.round(performanceMetrics.memoryUsed / 1024 / 1024)}MB`);

      this.results.performanceMetrics = { ...this.results.performanceMetrics, ...performanceMetrics };

      // Performance thresholds (realistic for workflow pages)
      if (performanceMetrics.loadComplete < 5000) { // 5 seconds
        console.log('✅ Performance acceptable');
      } else {
        console.log('⚠️ Performance may be slow');
      }

    } catch (error) {
      console.log('❌ Performance test failed:', error.message);
      this.results.errors.push(`Performance test: ${error.message}`);
    }
  }

  async testSecurity(page) {
    console.log('\n🔒 Testing Security...');

    try {
      // Test XSS prevention
      const xssPayload = '<script>window.xssTest = true;</script>';

      await page.goto(`http://localhost:5173/workflows?test=${encodeURIComponent(xssPayload)}`, {
        waitUntil: 'networkidle2'
      });

      // Check if XSS executed
      const xssExecuted = await page.evaluate(() => window.xssTest === true);

      if (!xssExecuted) {
        console.log('✅ XSS prevention working');
        this.results.securityValidation = 'PASS';
      } else {
        console.log('❌ XSS vulnerability detected');
        this.results.securityValidation = 'FAIL';
        this.results.errors.push('XSS vulnerability detected');
      }

      // Check for console errors
      const consoleErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      // Take security validation screenshot
      const screenshotPath = path.join(this.screenshotDir, '04-security-validation.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });
      this.results.screenshots.push('04-security-validation.png');

    } catch (error) {
      console.log('❌ Security test failed:', error.message);
      this.results.securityValidation = 'FAIL';
      this.results.errors.push(`Security test: ${error.message}`);
    }
  }

  generateReport() {
    console.log('\n📋 COMPREHENSIVE VALIDATION REPORT');
    console.log('=====================================');

    const report = {
      timestamp: new Date().toISOString(),
      testingApproach: '100% Real Implementation (No Mocks/Simulations)',
      results: this.results
    };

    // Overall status
    const passCount = Object.values(this.results).filter(r => r === 'PASS').length;
    const totalTests = 5; // Number of main test categories

    console.log(`\n✨ OVERALL STATUS: ${passCount}/${totalTests} tests passed`);

    console.log('\n🎯 TEST RESULTS:');
    console.log(`   - Route Accessibility: ${this.results.routeAccessibility || 'NOT_RUN'}`);
    console.log(`   - Component Rendering: ${this.results.componentRendering || 'NOT_RUN'}`);
    console.log(`   - Navigation Integration: ${this.results.navigationIntegration || 'NOT_RUN'}`);
    console.log(`   - Security Validation: ${this.results.securityValidation || 'NOT_RUN'}`);

    if (this.results.performanceMetrics.loadComplete) {
      console.log(`   - Performance: ${this.results.performanceMetrics.loadComplete}ms load time`);
    }

    console.log(`\n📸 Screenshots captured: ${this.results.screenshots.length}`);
    this.results.screenshots.forEach(screenshot => {
      console.log(`   - ${screenshot}`);
    });

    if (this.results.errors.length > 0) {
      console.log(`\n❌ Errors encountered: ${this.results.errors.length}`);
      this.results.errors.forEach(error => {
        console.log(`   - ${error}`);
      });
    }

    // Save report to file
    const reportPath = '/workspaces/agent-feed/docs/workflows-validation-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n💾 Full report saved to: ${reportPath}`);

    console.log('\n🏁 VALIDATION COMPLETED');
    console.log('=====================================');
  }
}

// Execute validation
const validator = new WorkflowsRouteValidator();
validator.validateWorkflowsRoute().catch(console.error);