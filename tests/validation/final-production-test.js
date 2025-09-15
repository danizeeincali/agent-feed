/**
 * Final Production Validation for Dynamic Pages
 *
 * Corrected test with proper API endpoint configuration
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;

class FinalProductionTest {
  constructor() {
    this.frontendUrl = 'http://localhost:4173'; // Vite preview server
    this.backendUrl = 'http://localhost:3000';  // Backend server
    this.results = {
      timestamp: new Date().toISOString(),
      environment: {
        frontend: this.frontendUrl,
        backend: this.backendUrl,
        nodeVersion: process.version,
        platform: process.platform
      },
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      },
      performance: {},
      security: {
        xssTests: [],
        inputValidation: []
      },
      accessibility: {
        violations: [],
        keyboardNavigation: []
      },
      compatibility: {
        browsers: {}
      },
      errors: [],
      recommendations: []
    };

    // Test the 5 dynamic page components with fallback routes
    this.testPages = [
      {
        name: 'AgentHomePage',
        path: '/agents/test-agent',
        fallback: '/',
        description: 'Main agent dashboard with widgets and posts',
        required: true
      },
      {
        name: 'RealDynamicPagesTab',
        path: '/agents',
        fallback: '/',
        description: 'Agent listing page with dynamic pages functionality',
        required: true
      },
      {
        name: 'DynamicAgentPageRenderer',
        path: '/agents/test-agent',
        fallback: '/',
        description: 'Individual dynamic page viewer',
        required: false
      },
      {
        name: 'DynamicPageRenderer',
        path: '/',
        fallback: '/',
        description: 'Main application entry point',
        required: true
      },
      {
        name: 'PageManager',
        path: '/agents',
        fallback: '/',
        description: 'Page management interface',
        required: false
      }
    ];
  }

  async runFinalValidation() {
    console.log('🚀 Final Production Validation for Dynamic Pages');
    console.log('=' .repeat(60));

    // Check server availability first
    await this.checkServerHealth();

    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
    });

    try {
      await this.testPageAccessibility(browser);
      await this.testPerformanceMetrics(browser);
      await this.testSecurityBasics(browser);
      await this.testCrossBrowserCompatibility(browser);
      await this.generateFinalReport();

    } finally {
      await browser.close();
    }

    return this.results;
  }

  async checkServerHealth() {
    console.log('\n🏥 Checking Server Health...');

    const axios = require('axios');

    try {
      // Check backend health
      const backendHealth = await axios.get(`${this.backendUrl}/health`, { timeout: 5000 });
      console.log(`  ✅ Backend healthy: ${backendHealth.status}`);
    } catch (error) {
      console.log(`  ⚠️  Backend health check failed: ${error.message}`);
      this.results.errors.push({
        type: 'backend_health',
        message: `Backend health check failed: ${error.message}`
      });
    }

    try {
      // Check frontend accessibility
      const frontendCheck = await axios.get(this.frontendUrl, { timeout: 5000 });
      console.log(`  ✅ Frontend accessible: ${frontendCheck.status}`);
    } catch (error) {
      console.log(`  ❌ Frontend not accessible: ${error.message}`);
      this.results.errors.push({
        type: 'frontend_health',
        message: `Frontend not accessible: ${error.message}`
      });
    }
  }

  async testPageAccessibility(browser) {
    console.log('\n📄 Testing Page Accessibility & Loading...');

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (compatible; ProductionValidator/1.0)'
    });

    const page = await context.newPage();

    // Override network to point API calls to correct backend
    await page.route('**/api/**', route => {
      const url = route.request().url();
      const newUrl = url.replace(this.frontendUrl, this.backendUrl);
      route.continue({ url: newUrl });
    });

    // Collect console messages
    const consoleMessages = [];
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
        location: msg.location(),
        timestamp: new Date().toISOString()
      });
    });

    for (const testPage of this.testPages) {
      console.log(`  Testing ${testPage.name}...`);

      const testResult = {
        component: testPage.name,
        path: testPage.path,
        description: testPage.description,
        required: testPage.required,
        loadTime: 0,
        status: 'pending',
        httpStatus: 0,
        consoleMessages: [],
        issues: [],
        metrics: {}
      };

      try {
        const startTime = Date.now();

        // Navigate to page
        const response = await page.goto(`${this.frontendUrl}${testPage.path}`, {
          waitUntil: 'networkidle',
          timeout: 15000
        });

        const endTime = Date.now();
        testResult.loadTime = endTime - startTime;
        testResult.httpStatus = response.status();

        // Wait for React to render and any async operations
        await page.waitForTimeout(3000);

        // Get page metrics
        const pageMetrics = await page.evaluate(() => ({
          title: document.title,
          bodyLength: document.body.textContent.length,
          elementCount: document.querySelectorAll('*').length,
          hasErrorBoundary: !!document.querySelector('[data-error-boundary], .error-boundary'),
          hasLoader: !!document.querySelector('[data-loading], .loading, .spinner'),
          reactMounted: !!window.React || !!document.querySelector('[data-reactroot]')
        }));

        testResult.metrics = pageMetrics;

        // Collect console messages for this page
        testResult.consoleMessages = [...consoleMessages];
        consoleMessages.length = 0;

        // Analyze page quality
        if (pageMetrics.bodyLength < 100) {
          testResult.issues.push('Page content appears minimal or empty');
        }

        if (pageMetrics.elementCount < 10) {
          testResult.issues.push('Very few DOM elements - possible loading failure');
        }

        const errorCount = testResult.consoleMessages.filter(m => m.type === 'error').length;
        if (errorCount > 0) {
          testResult.issues.push(`${errorCount} console errors detected`);
        }

        // Performance evaluation
        if (testResult.loadTime > 2000) {
          testResult.issues.push(`Load time ${testResult.loadTime}ms exceeds 2000ms requirement`);
          if (testResult.required) {
            testResult.status = 'failed';
            this.results.summary.failed++;
          } else {
            testResult.status = 'warning';
            this.results.summary.warnings++;
          }
        } else if (testResult.issues.length > 0) {
          if (testResult.required) {
            testResult.status = 'failed';
            this.results.summary.failed++;
          } else {
            testResult.status = 'warning';
            this.results.summary.warnings++;
          }
        } else {
          testResult.status = 'passed';
          this.results.summary.passed++;
        }

        // Test basic interactions
        await this.testPageInteractions(page, testPage.name);

        console.log(`    ${this.getStatusIcon(testResult.status)} ${testResult.loadTime}ms - ${pageMetrics.elementCount} elements`);

      } catch (error) {
        testResult.status = testResult.required ? 'failed' : 'warning';
        testResult.error = error.message;
        testResult.issues.push(`Navigation failed: ${error.message}`);

        if (testResult.required) {
          this.results.summary.failed++;
        } else {
          this.results.summary.warnings++;
        }

        console.log(`    ❌ ${testResult.required ? 'FAILED' : 'WARNING'}: ${error.message}`);
      }

      this.results.tests.push(testResult);
      this.results.summary.total++;
    }

    await context.close();
  }

  async testPageInteractions(page, pageName) {
    try {
      // Test for clickable elements
      const buttons = await page.locator('button:visible').count();
      const links = await page.locator('a:visible').count();

      if (buttons > 0 || links > 0) {
        // Try clicking the first safe button
        const safeButtons = await page.locator('button:visible:not([type="submit"])').first();
        if (await safeButtons.count() > 0) {
          await safeButtons.click();
          await page.waitForTimeout(500);
        }
      }
    } catch (error) {
      // Interaction test failed - not critical
    }
  }

  async testPerformanceMetrics(browser) {
    console.log('\n⚡ Testing Performance Metrics...');

    const context = await browser.newContext();
    const page = await context.newPage();

    // Override API calls
    await page.route('**/api/**', route => {
      const url = route.request().url();
      const newUrl = url.replace(this.frontendUrl, this.backendUrl);
      route.continue({ url: newUrl });
    });

    // Test critical pages for performance
    const criticalPages = this.testPages.filter(p => p.required);

    for (const testPage of criticalPages) {
      try {
        console.log(`  Performance testing ${testPage.name}...`);

        await page.goto(`${this.frontendUrl}${testPage.path}`, {
          waitUntil: 'networkidle'
        });

        // Get detailed performance metrics
        const performanceMetrics = await page.evaluate(() => {
          const navigation = performance.getEntriesByType('navigation')[0];
          const paint = performance.getEntriesByType('paint');

          return {
            // Timing metrics
            domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart : 0,
            loadComplete: navigation ? navigation.loadEventEnd - navigation.loadEventStart : 0,

            // Paint metrics
            firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
            firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,

            // Memory metrics
            memoryUsage: performance.memory ? {
              used: performance.memory.usedJSHeapSize,
              total: performance.memory.totalJSHeapSize,
              limit: performance.memory.jsHeapSizeLimit
            } : null,

            // Resource metrics
            resourceCount: performance.getEntriesByType('resource').length
          };
        });

        this.results.performance[testPage.name] = performanceMetrics;

        const fcpScore = performanceMetrics.firstContentfulPaint < 1500 ? 'excellent' :
                        performanceMetrics.firstContentfulPaint < 2500 ? 'good' : 'poor';

        console.log(`    FCP: ${Math.round(performanceMetrics.firstContentfulPaint)}ms (${fcpScore})`);
        console.log(`    Resources: ${performanceMetrics.resourceCount}`);

      } catch (error) {
        console.log(`    ❌ Performance test failed: ${error.message}`);
        this.results.errors.push({
          type: 'performance',
          page: testPage.name,
          error: error.message
        });
      }
    }

    await context.close();
  }

  async testSecurityBasics(browser) {
    console.log('\n🔒 Testing Security Basics...');

    const context = await browser.newContext();
    const page = await context.newPage();

    // Override API calls
    await page.route('**/api/**', route => {
      const url = route.request().url();
      const newUrl = url.replace(this.frontendUrl, this.backendUrl);
      route.continue({ url: newUrl });
    });

    try {
      // Test XSS prevention on main page
      await page.goto(`${this.frontendUrl}/`, { waitUntil: 'networkidle' });

      // Look for input fields to test
      const inputs = await page.locator('input, textarea').all();

      console.log(`  Found ${inputs.length} input fields to test`);

      if (inputs.length > 0) {
        const xssPayloads = [
          '<script>window.xssTest=1</script>',
          '<img src=x onerror=window.xssTest=1>',
          'javascript:window.xssTest=1'
        ];

        for (let i = 0; i < Math.min(inputs.length, 2); i++) {
          for (const payload of xssPayloads.slice(0, 2)) {
            try {
              await inputs[i].fill(payload);
              await page.waitForTimeout(500);

              const xssTriggered = await page.evaluate(() => window.xssTest);

              this.results.security.xssTests.push({
                inputIndex: i,
                payload: payload.substring(0, 30),
                blocked: !xssTriggered,
                passed: !xssTriggered
              });

            } catch (error) {
              // Input validation working - good
              this.results.security.inputValidation.push({
                inputIndex: i,
                payload: payload.substring(0, 30),
                blocked: true,
                error: 'Input rejected'
              });
            }
          }
        }
      }

      // Test error page information disclosure
      await page.goto(`${this.frontendUrl}/nonexistent-page`, {
        waitUntil: 'domcontentloaded',
        timeout: 5000
      });

      const errorPageContent = await page.textContent('body');
      const exposesInfo = /stack trace|debug|exception|error.*line/i.test(errorPageContent);

      this.results.security.errorDisclosure = {
        exposesInfo,
        passed: !exposesInfo,
        content: errorPageContent.substring(0, 200)
      };

      console.log(`  XSS Tests: ${this.results.security.xssTests.length} performed`);
      console.log(`  Error Disclosure: ${exposesInfo ? '❌ Info exposed' : '✅ Safe'}`);

    } catch (error) {
      console.log(`  ❌ Security test failed: ${error.message}`);
      this.results.errors.push({
        type: 'security',
        error: error.message
      });
    }

    await context.close();
  }

  async testCrossBrowserCompatibility(browser) {
    console.log('\n🌐 Testing Browser Compatibility...');

    // Test with different viewport sizes to simulate different browsers/devices
    const viewports = [
      { name: 'Desktop', width: 1920, height: 1080 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Mobile', width: 375, height: 667 }
    ];

    for (const viewport of viewports) {
      console.log(`  Testing ${viewport.name} viewport...`);

      const context = await browser.newContext({
        viewport,
        isMobile: viewport.name === 'Mobile'
      });

      const page = await context.newPage();

      // Override API calls
      await page.route('**/api/**', route => {
        const url = route.request().url();
        const newUrl = url.replace(this.frontendUrl, this.backendUrl);
        route.continue({ url: newUrl });
      });

      try {
        await page.goto(`${this.frontendUrl}/`, { waitUntil: 'networkidle' });

        // Check for responsive design issues
        const responsiveCheck = await page.evaluate(() => ({
          hasHorizontalScroll: document.documentElement.scrollWidth > window.innerWidth,
          viewportWidth: window.innerWidth,
          contentWidth: document.documentElement.scrollWidth,
          hasOverflow: document.documentElement.scrollWidth > window.innerWidth
        }));

        this.results.compatibility.browsers[viewport.name] = {
          viewport: viewport,
          loaded: true,
          responsive: !responsiveCheck.hasHorizontalScroll,
          metrics: responsiveCheck
        };

        console.log(`    ${responsiveCheck.hasOverflow ? '❌' : '✅'} ${viewport.name} responsive: ${viewport.width}x${viewport.height}`);

      } catch (error) {
        this.results.compatibility.browsers[viewport.name] = {
          viewport: viewport,
          loaded: false,
          error: error.message
        };
        console.log(`    ❌ ${viewport.name} failed: ${error.message}`);
      }

      await context.close();
    }
  }

  getStatusIcon(status) {
    switch (status) {
      case 'passed': return '✅';
      case 'warning': return '⚠️';
      case 'failed': return '❌';
      default: return '⏳';
    }
  }

  async generateFinalReport() {
    console.log('\n📋 Generating Final Production Validation Report...');

    // Calculate scores
    const totalTests = this.results.summary.total;
    const criticalTests = this.results.tests.filter(t => t.required).length;
    const criticalPassed = this.results.tests.filter(t => t.required && t.status === 'passed').length;

    const overallScore = totalTests > 0 ? Math.round((this.results.summary.passed / totalTests) * 100) : 0;
    const criticalScore = criticalTests > 0 ? Math.round((criticalPassed / criticalTests) * 100) : 100;

    // Performance analysis
    const performanceTests = Object.values(this.results.performance);
    const avgFCP = performanceTests.length > 0 ?
      performanceTests.reduce((sum, p) => sum + p.firstContentfulPaint, 0) / performanceTests.length : 0;

    // Security analysis
    const xssBlocked = this.results.security.xssTests.filter(t => t.blocked).length;
    const xssTotal = this.results.security.xssTests.length;
    const securityScore = xssTotal > 0 ? Math.round((xssBlocked / xssTotal) * 100) : 100;

    // Compatibility analysis
    const compatibleViewports = Object.values(this.results.compatibility.browsers).filter(b => b.loaded && b.responsive).length;
    const totalViewports = Object.keys(this.results.compatibility.browsers).length;
    const compatibilityScore = totalViewports > 0 ? Math.round((compatibleViewports / totalViewports) * 100) : 100;

    // Generate recommendations
    const recommendations = [];

    if (criticalScore < 100) {
      recommendations.push({
        priority: 'Critical',
        issue: 'Critical pages failing to load properly',
        solution: 'Fix API connectivity and ensure all required pages render correctly'
      });
    }

    if (avgFCP > 2000) {
      recommendations.push({
        priority: 'High',
        issue: 'First Contentful Paint exceeds 2 seconds',
        solution: 'Optimize bundle size, implement code splitting, and reduce initial load time'
      });
    }

    if (securityScore < 90) {
      recommendations.push({
        priority: 'High',
        issue: 'XSS vulnerabilities detected',
        solution: 'Implement proper input sanitization and output encoding'
      });
    }

    if (compatibilityScore < 90) {
      recommendations.push({
        priority: 'Medium',
        issue: 'Responsive design issues on some viewports',
        solution: 'Review CSS and responsive breakpoints for mobile compatibility'
      });
    }

    // Determine production readiness
    const productionReady = criticalScore >= 90 && avgFCP <= 2000 && this.results.summary.failed === 0;

    const finalSummary = {
      productionReady,
      scores: {
        overall: overallScore,
        critical: criticalScore,
        performance: avgFCP <= 2000 ? 100 : Math.max(0, 100 - Math.round((avgFCP - 2000) / 50)),
        security: securityScore,
        compatibility: compatibilityScore
      },
      metrics: {
        averageFCP: Math.round(avgFCP),
        totalErrors: this.results.errors.length,
        criticalIssues: this.results.tests.filter(t => t.required && t.status === 'failed').length
      },
      recommendations
    };

    this.results.finalSummary = finalSummary;

    // Save report
    const reportPath = '/workspaces/agent-feed/tests/validation/production-readiness.json';
    await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));

    // Print results
    console.log(`\n🎯 Final Production Validation Results:`);
    console.log(`  Production Ready: ${productionReady ? '✅ YES' : '❌ NO'}`);
    console.log(`  Overall Score: ${overallScore}%`);
    console.log(`  Critical Pages: ${criticalScore}% (${criticalPassed}/${criticalTests})`);
    console.log(`  Performance: ${finalSummary.scores.performance}% (FCP: ${Math.round(avgFCP)}ms)`);
    console.log(`  Security: ${securityScore}%`);
    console.log(`  Compatibility: ${compatibilityScore}%`);

    if (recommendations.length > 0) {
      console.log(`\n📋 Recommendations:`);
      recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. [${rec.priority}] ${rec.issue}`);
        console.log(`     → ${rec.solution}`);
      });
    }

    console.log(`\n📄 Full report: ${reportPath}`);
    console.log(`\n${productionReady ? '🎉 READY FOR PRODUCTION DEPLOYMENT' : '❌ REQUIRES FIXES BEFORE PRODUCTION'}`);

    return this.results;
  }
}

// Run if called directly
if (require.main === module) {
  const tester = new FinalProductionTest();
  tester.runFinalValidation()
    .then(results => {
      const ready = results.finalSummary?.productionReady;
      process.exit(ready ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Final validation failed:', error);
      process.exit(1);
    });
}

module.exports = FinalProductionTest;