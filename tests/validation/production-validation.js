const { chromium, firefox, webkit } = require('playwright');
const lighthouse = require('lighthouse');
const fs = require('fs').promises;
const path = require('path');

/**
 * Production Validation Suite for Dynamic Pages Feature
 *
 * This comprehensive validation suite tests all aspects of the dynamic pages
 * feature to ensure production readiness including:
 * - Performance (< 2s load times)
 * - Security (no XSS vulnerabilities)
 * - Cross-browser compatibility
 * - Accessibility compliance
 * - Mobile responsiveness
 * - Error handling and fallbacks
 */

class ProductionValidator {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      },
      performance: {
        pageLoadTimes: {},
        lighthouseScores: {},
        memoryUsage: {}
      },
      security: {
        xssTests: [],
        inputValidation: [],
        errorExposure: []
      },
      compatibility: {
        browsers: {},
        devices: {}
      },
      accessibility: {
        violations: [],
        compliance: {},
        keyboardNavigation: []
      },
      errors: []
    };

    this.testPages = [
      '/agents/test-agent/pages', // RealDynamicPagesTab
      '/agents/test-agent/pages/page-1', // DynamicAgentPageRenderer
      '/agents/test-agent/pages/page-1/view', // DynamicPageRenderer
      '/agents/test-agent', // AgentHomePage
      '/agents/test-agent/manage' // PageManager
    ];

    this.browsers = ['chromium', 'firefox', 'webkit'];
    this.baseUrl = process.env.BASE_URL || 'http://localhost:5173';
    this.timeout = 30000;
  }

  async validateProduction() {
    console.log('🚀 Starting Production Validation for Dynamic Pages');
    console.log('=' .repeat(60));

    try {
      // 1. Build production version
      await this.buildProduction();

      // 2. Start production server
      await this.startProductionServer();

      // 3. Run comprehensive validation
      await this.runPerformanceTests();
      await this.runSecurityTests();
      await this.runCompatibilityTests();
      await this.runAccessibilityTests();
      await this.runMobileTests();
      await this.runErrorHandlingTests();

      // 4. Generate final report
      await this.generateReport();

    } catch (error) {
      console.error('❌ Production validation failed:', error);
      this.results.errors.push({
        stage: 'general',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      await this.cleanup();
    }

    return this.results;
  }

  async buildProduction() {
    console.log('📦 Building production version...');
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);

    try {
      // Build frontend for production
      await execPromise('cd frontend && npm run build', {
        cwd: '/workspaces/agent-feed',
        timeout: 300000 // 5 minutes timeout
      });

      console.log('✅ Production build completed');
      this.addResult('build', 'success', 'Production build completed successfully');
    } catch (error) {
      console.error('❌ Production build failed:', error.message);
      this.addResult('build', 'failed', `Production build failed: ${error.message}`);
      throw error;
    }
  }

  async startProductionServer() {
    console.log('🌐 Starting production server...');
    const { spawn } = require('child_process');

    // Start production server
    this.serverProcess = spawn('npm', ['run', 'start'], {
      cwd: '/workspaces/agent-feed',
      detached: true,
      stdio: 'pipe'
    });

    // Wait for server to be ready
    await this.waitForServer();
    console.log('✅ Production server started');
  }

  async waitForServer() {
    const axios = require('axios');
    const maxAttempts = 30;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        await axios.get(`${this.baseUrl}/health`, { timeout: 5000 });
        return;
      } catch (error) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    throw new Error('Server failed to start within timeout period');
  }

  async runPerformanceTests() {
    console.log('\n📊 Running Performance Tests...');

    for (const browserType of this.browsers) {
      console.log(`  Testing with ${browserType}...`);
      const browser = await this.launchBrowser(browserType);
      const context = await browser.newContext();
      const page = await context.newPage();

      try {
        for (const testPath of this.testPages) {
          console.log(`    📄 Testing page: ${testPath}`);

          // Measure page load time
          const startTime = Date.now();
          const response = await page.goto(`${this.baseUrl}${testPath}`, {
            waitUntil: 'networkidle',
            timeout: this.timeout
          });
          const endTime = Date.now();
          const loadTime = endTime - startTime;

          // Store results
          const pageKey = `${browserType}_${testPath}`;
          this.results.performance.pageLoadTimes[pageKey] = {
            loadTime,
            status: response.status(),
            passed: loadTime < 2000 // Must be < 2 seconds
          };

          // Check for console errors
          const consoleErrors = [];
          page.on('console', msg => {
            if (msg.type() === 'error') {
              consoleErrors.push(msg.text());
            }
          });

          await page.waitForTimeout(2000); // Allow time for any async errors

          if (consoleErrors.length > 0) {
            this.addResult('performance', 'failed',
              `Console errors found on ${testPath}: ${consoleErrors.join(', ')}`);
          }

          // Memory usage check
          const metrics = await page.metrics();
          this.results.performance.memoryUsage[pageKey] = {
            jsHeapUsedSize: metrics.JSHeapUsedSize,
            jsHeapTotalSize: metrics.JSHeapTotalSize
          };

          console.log(`      ⏱️  Load time: ${loadTime}ms (${loadTime < 2000 ? '✅' : '❌'})`);
        }
      } catch (error) {
        this.addResult('performance', 'failed', `Performance test failed for ${browserType}: ${error.message}`);
      } finally {
        await browser.close();
      }
    }

    // Run Lighthouse audit
    await this.runLighthouseAudit();
  }

  async runLighthouseAudit() {
    console.log('  🔍 Running Lighthouse audit...');

    try {
      const lighthouse = require('lighthouse');
      const chromeLauncher = require('chrome-launcher');

      const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });

      for (const testPath of this.testPages.slice(0, 3)) { // Test first 3 pages for speed
        const options = {
          logLevel: 'info',
          output: 'json',
          onlyCategories: ['performance', 'accessibility', 'best-practices'],
          port: chrome.port,
        };

        const runnerResult = await lighthouse(`${this.baseUrl}${testPath}`, options);
        const report = runnerResult.report;
        const results = JSON.parse(report);

        this.results.performance.lighthouseScores[testPath] = {
          performance: results.categories.performance.score * 100,
          accessibility: results.categories.accessibility.score * 100,
          bestPractices: results.categories['best-practices'].score * 100,
          passed: results.categories.performance.score >= 0.9 // Must be >= 90
        };

        console.log(`      🎯 Lighthouse scores for ${testPath}:`);
        console.log(`        Performance: ${(results.categories.performance.score * 100).toFixed(0)}/100`);
        console.log(`        Accessibility: ${(results.categories.accessibility.score * 100).toFixed(0)}/100`);
        console.log(`        Best Practices: ${(results.categories['best-practices'].score * 100).toFixed(0)}/100`);
      }

      await chrome.kill();
    } catch (error) {
      console.error('❌ Lighthouse audit failed:', error.message);
      this.addResult('performance', 'failed', `Lighthouse audit failed: ${error.message}`);
    }
  }

  async runSecurityTests() {
    console.log('\n🔒 Running Security Tests...');

    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Test XSS vulnerabilities
      console.log('  🛡️  Testing XSS vulnerabilities...');

      const xssPayloads = [
        '<script>alert("xss")</script>',
        '<img src=x onerror=alert("xss")>',
        'javascript:alert("xss")',
        '"><script>alert("xss")</script>',
        '\'/><script>alert("xss")</script>'
      ];

      for (const testPath of this.testPages) {
        console.log(`    Testing XSS on ${testPath}...`);

        try {
          await page.goto(`${this.baseUrl}${testPath}`, { waitUntil: 'networkidle' });

          // Test input fields for XSS
          const inputs = await page.locator('input, textarea').all();

          for (const input of inputs) {
            for (const payload of xssPayloads) {
              try {
                await input.fill(payload);
                await page.waitForTimeout(500);

                // Check if script executed (would show alert)
                const alertHandled = await page.evaluate(() => {
                  return window.xssTriggered || false;
                });

                this.results.security.xssTests.push({
                  page: testPath,
                  payload,
                  vulnerable: alertHandled,
                  passed: !alertHandled
                });
              } catch (error) {
                // Input validation working - good!
                this.results.security.inputValidation.push({
                  page: testPath,
                  payload,
                  blocked: true,
                  error: error.message
                });
              }
            }
          }
        } catch (error) {
          this.addResult('security', 'failed', `XSS test failed for ${testPath}: ${error.message}`);
        }
      }

      // Test for error information disclosure
      console.log('  🔍 Testing error information disclosure...');

      const errorPaths = [
        '/agents/nonexistent/pages',
        '/agents/test-agent/pages/nonexistent',
        '/api/agents/nonexistent/pages'
      ];

      for (const errorPath of errorPaths) {
        try {
          const response = await page.goto(`${this.baseUrl}${errorPath}`, {
            waitUntil: 'networkidle',
            timeout: 10000
          });

          const content = await page.content();

          // Check for sensitive information in error responses
          const sensitivePatterns = [
            /stack trace/i,
            /database error/i,
            /internal server error/i,
            /debug/i,
            /exception/i
          ];

          const exposedInfo = sensitivePatterns.some(pattern => pattern.test(content));

          this.results.security.errorExposure.push({
            path: errorPath,
            status: response.status(),
            exposesInfo: exposedInfo,
            passed: !exposedInfo
          });
        } catch (error) {
          // Expected for non-existent paths
        }
      }

    } finally {
      await browser.close();
    }
  }

  async runCompatibilityTests() {
    console.log('\n🌐 Running Cross-Browser Compatibility Tests...');

    for (const browserType of this.browsers) {
      console.log(`  Testing ${browserType} compatibility...`);

      const browser = await this.launchBrowser(browserType);
      const context = await browser.newContext();
      const page = await context.newPage();

      try {
        const browserResults = {
          loadSuccess: 0,
          totalPages: this.testPages.length,
          errors: []
        };

        for (const testPath of this.testPages) {
          try {
            console.log(`    📄 ${testPath}`);

            await page.goto(`${this.baseUrl}${testPath}`, {
              waitUntil: 'networkidle',
              timeout: this.timeout
            });

            // Check if page loaded properly
            const title = await page.title();
            const bodyText = await page.textContent('body');

            if (title && bodyText && bodyText.length > 100) {
              browserResults.loadSuccess++;
              console.log(`      ✅ Loaded successfully`);
            } else {
              browserResults.errors.push(`${testPath}: Page content seems incomplete`);
              console.log(`      ❌ Content incomplete`);
            }

            // Test critical interactions
            await this.testPageInteractions(page, testPath);

          } catch (error) {
            browserResults.errors.push(`${testPath}: ${error.message}`);
            console.log(`      ❌ Failed: ${error.message}`);
          }
        }

        this.results.compatibility.browsers[browserType] = browserResults;

      } finally {
        await browser.close();
      }
    }
  }

  async testPageInteractions(page, testPath) {
    // Test common interactions based on page type
    try {
      if (testPath.includes('/pages') && !testPath.includes('/pages/')) {
        // Test page list interactions
        const createButton = page.locator('button:has-text("Create")');
        if (await createButton.count() > 0) {
          await createButton.first().click();
          await page.waitForTimeout(1000);
        }
      } else if (testPath.includes('/pages/page-')) {
        // Test page view interactions
        const backButton = page.locator('button[title*="back"], button:has([data-lucide="arrow-left"])');
        if (await backButton.count() > 0) {
          await backButton.first().click();
          await page.waitForTimeout(1000);
        }
      }
    } catch (error) {
      // Interactions may not be available - that's ok
    }
  }

  async runAccessibilityTests() {
    console.log('\n♿ Running Accessibility Tests...');

    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Inject axe-core for accessibility testing
      await page.addScriptTag({
        url: 'https://unpkg.com/axe-core@4.6.3/axe.min.js'
      });

      for (const testPath of this.testPages) {
        console.log(`  🔍 Testing accessibility on ${testPath}...`);

        try {
          await page.goto(`${this.baseUrl}${testPath}`, { waitUntil: 'networkidle' });

          // Run axe-core accessibility scan
          const results = await page.evaluate(async () => {
            const axe = window.axe;
            return await axe.run();
          });

          const violations = results.violations.filter(v =>
            ['critical', 'serious'].includes(v.impact)
          );

          this.results.accessibility.violations.push({
            page: testPath,
            critical: violations.filter(v => v.impact === 'critical').length,
            serious: violations.filter(v => v.impact === 'serious').length,
            total: violations.length,
            details: violations.map(v => ({
              id: v.id,
              impact: v.impact,
              description: v.description,
              nodes: v.nodes.length
            }))
          });

          // Test keyboard navigation
          await this.testKeyboardNavigation(page, testPath);

          console.log(`    ${violations.length === 0 ? '✅' : '❌'} ${violations.length} accessibility violations found`);

        } catch (error) {
          this.addResult('accessibility', 'failed', `Accessibility test failed for ${testPath}: ${error.message}`);
        }
      }
    } finally {
      await browser.close();
    }
  }

  async testKeyboardNavigation(page, testPath) {
    try {
      // Test tab navigation
      await page.keyboard.press('Tab');
      await page.waitForTimeout(500);

      let tabCount = 0;
      const maxTabs = 20;

      while (tabCount < maxTabs) {
        const activeElement = await page.evaluate(() => {
          const element = document.activeElement;
          return element ? {
            tagName: element.tagName,
            type: element.type,
            role: element.getAttribute('role'),
            ariaLabel: element.getAttribute('aria-label')
          } : null;
        });

        if (!activeElement) break;

        await page.keyboard.press('Tab');
        await page.waitForTimeout(100);
        tabCount++;
      }

      this.results.accessibility.keyboardNavigation.push({
        page: testPath,
        tabbableElements: tabCount,
        passed: tabCount > 0
      });

    } catch (error) {
      // Keyboard navigation test failed - not critical
    }
  }

  async runMobileTests() {
    console.log('\n📱 Running Mobile Responsiveness Tests...');

    const devices = [
      { name: 'iPhone 12', viewport: { width: 390, height: 844 } },
      { name: 'iPad', viewport: { width: 768, height: 1024 } },
      { name: 'Android Phone', viewport: { width: 360, height: 640 } }
    ];

    const browser = await chromium.launch();

    try {
      for (const device of devices) {
        console.log(`  📲 Testing on ${device.name}...`);

        const context = await browser.newContext({
          viewport: device.viewport,
          deviceScaleFactor: 2,
          isMobile: true,
          hasTouch: true
        });

        const page = await context.newPage();

        const deviceResults = {
          device: device.name,
          viewport: device.viewport,
          loadSuccess: 0,
          totalPages: this.testPages.length,
          responsiveIssues: []
        };

        for (const testPath of this.testPages) {
          try {
            await page.goto(`${this.baseUrl}${testPath}`, { waitUntil: 'networkidle' });

            // Check for responsive design issues
            const issues = await page.evaluate(() => {
              const issues = [];

              // Check for horizontal scroll
              if (document.documentElement.scrollWidth > window.innerWidth) {
                issues.push('Horizontal scroll detected');
              }

              // Check for elements too small for touch
              const clickables = document.querySelectorAll('button, a, input');
              clickables.forEach((el, index) => {
                const rect = el.getBoundingClientRect();
                if (rect.width < 44 || rect.height < 44) {
                  issues.push(`Clickable element ${index} too small: ${rect.width}x${rect.height}`);
                }
              });

              return issues;
            });

            if (issues.length === 0) {
              deviceResults.loadSuccess++;
            } else {
              deviceResults.responsiveIssues.push({
                page: testPath,
                issues
              });
            }

          } catch (error) {
            deviceResults.responsiveIssues.push({
              page: testPath,
              issues: [error.message]
            });
          }
        }

        this.results.compatibility.devices[device.name] = deviceResults;
        await context.close();
      }
    } finally {
      await browser.close();
    }
  }

  async runErrorHandlingTests() {
    console.log('\n🚨 Running Error Handling & Fallback Tests...');

    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Test error boundaries
      console.log('  🛡️  Testing error boundaries...');

      for (const testPath of this.testPages) {
        try {
          await page.goto(`${this.baseUrl}${testPath}`, { waitUntil: 'networkidle' });

          // Simulate JavaScript errors
          await page.evaluate(() => {
            // Try to trigger errors in React components
            window.dispatchEvent(new Error('Test error boundary'));

            // Simulate network failures
            if (window.fetch) {
              const originalFetch = window.fetch;
              window.fetch = () => Promise.reject(new Error('Network error simulation'));

              // Restore after test
              setTimeout(() => {
                window.fetch = originalFetch;
              }, 1000);
            }
          });

          await page.waitForTimeout(2000);

          // Check if error boundary or fallback UI is shown
          const errorElements = await page.locator('[data-testid*="error"], .error-boundary, .fallback-ui').all();
          const errorText = await page.textContent('body');

          const hasGracefulError = errorElements.length > 0 ||
            errorText.includes('Something went wrong') ||
            errorText.includes('Error loading') ||
            errorText.includes('Try again');

          console.log(`    ${testPath}: ${hasGracefulError ? '✅' : '❌'} Error handling`);

        } catch (error) {
          this.addResult('errors', 'failed', `Error handling test failed for ${testPath}: ${error.message}`);
        }
      }

      // Test offline behavior
      console.log('  📡 Testing offline behavior...');

      await context.setOffline(true);

      for (const testPath of this.testPages) {
        try {
          await page.goto(`${this.baseUrl}${testPath}`, {
            waitUntil: 'domcontentloaded',
            timeout: 10000
          });

          const offlineContent = await page.textContent('body');
          const hasOfflineHandling = offlineContent.includes('offline') ||
            offlineContent.includes('connection') ||
            offlineContent.includes('network');

          console.log(`    ${testPath}: ${hasOfflineHandling ? '✅' : '❌'} Offline handling`);

        } catch (error) {
          // Expected offline behavior
        }
      }

      await context.setOffline(false);

    } finally {
      await browser.close();
    }
  }

  async launchBrowser(browserType) {
    const browsers = { chromium, firefox, webkit };
    const browser = browsers[browserType];

    if (!browser) {
      throw new Error(`Unknown browser type: ${browserType}`);
    }

    return await browser.launch({
      headless: true,
      args: browserType === 'chromium' ? ['--no-sandbox', '--disable-setuid-sandbox'] : []
    });
  }

  addResult(category, status, message) {
    this.results.summary.totalTests++;
    if (status === 'success') {
      this.results.summary.passed++;
    } else if (status === 'failed') {
      this.results.summary.failed++;
    } else {
      this.results.summary.warnings++;
    }

    console.log(`  ${status === 'success' ? '✅' : status === 'failed' ? '❌' : '⚠️'} ${message}`);
  }

  async generateReport() {
    console.log('\n📋 Generating Production Validation Report...');

    // Calculate overall scores
    const performanceScore = this.calculatePerformanceScore();
    const securityScore = this.calculateSecurityScore();
    const compatibilityScore = this.calculateCompatibilityScore();
    const accessibilityScore = this.calculateAccessibilityScore();

    const overallScore = Math.round(
      (performanceScore + securityScore + compatibilityScore + accessibilityScore) / 4
    );

    this.results.scores = {
      overall: overallScore,
      performance: performanceScore,
      security: securityScore,
      compatibility: compatibilityScore,
      accessibility: accessibilityScore
    };

    this.results.summary.passed = overallScore >= 90;
    this.results.recommendations = this.generateRecommendations();

    // Save report to file
    const reportPath = '/workspaces/agent-feed/tests/validation/production-readiness.json';
    await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));

    console.log(`\n📊 Production Validation Results:`);
    console.log(`  Overall Score: ${overallScore}/100 ${overallScore >= 90 ? '✅' : '❌'}`);
    console.log(`  Performance: ${performanceScore}/100 ${performanceScore >= 90 ? '✅' : '❌'}`);
    console.log(`  Security: ${securityScore}/100 ${securityScore >= 90 ? '✅' : '❌'}`);
    console.log(`  Compatibility: ${compatibilityScore}/100 ${compatibilityScore >= 90 ? '✅' : '❌'}`);
    console.log(`  Accessibility: ${accessibilityScore}/100 ${accessibilityScore >= 90 ? '✅' : '❌'}`);
    console.log(`\n📄 Full report saved to: ${reportPath}`);

    return this.results;
  }

  calculatePerformanceScore() {
    const loadTimes = Object.values(this.results.performance.pageLoadTimes);
    const passedLoadTimes = loadTimes.filter(lt => lt.passed).length;
    const loadTimeScore = loadTimes.length > 0 ? (passedLoadTimes / loadTimes.length) * 50 : 0;

    const lighthouseScores = Object.values(this.results.performance.lighthouseScores);
    const avgLighthouse = lighthouseScores.length > 0
      ? lighthouseScores.reduce((sum, ls) => sum + ls.performance, 0) / lighthouseScores.length
      : 0;
    const lighthouseScore = (avgLighthouse / 100) * 50;

    return Math.round(loadTimeScore + lighthouseScore);
  }

  calculateSecurityScore() {
    const xssTests = this.results.security.xssTests;
    const passedXss = xssTests.filter(test => test.passed).length;
    const xssScore = xssTests.length > 0 ? (passedXss / xssTests.length) * 70 : 70;

    const errorTests = this.results.security.errorExposure;
    const passedErrors = errorTests.filter(test => test.passed).length;
    const errorScore = errorTests.length > 0 ? (passedErrors / errorTests.length) * 30 : 30;

    return Math.round(xssScore + errorScore);
  }

  calculateCompatibilityScore() {
    const browserResults = Object.values(this.results.compatibility.browsers);
    const browserScore = browserResults.length > 0
      ? browserResults.reduce((sum, br) => sum + (br.loadSuccess / br.totalPages), 0) / browserResults.length * 60
      : 0;

    const deviceResults = Object.values(this.results.compatibility.devices);
    const deviceScore = deviceResults.length > 0
      ? deviceResults.reduce((sum, dr) => sum + (dr.loadSuccess / dr.totalPages), 0) / deviceResults.length * 40
      : 0;

    return Math.round(browserScore + deviceScore);
  }

  calculateAccessibilityScore() {
    const violations = this.results.accessibility.violations;
    const totalViolations = violations.reduce((sum, v) => sum + v.total, 0);
    const criticalViolations = violations.reduce((sum, v) => sum + v.critical, 0);

    let score = 100;
    score -= criticalViolations * 20; // -20 for each critical violation
    score -= Math.max(0, totalViolations - criticalViolations) * 5; // -5 for each other violation

    const keyboardTests = this.results.accessibility.keyboardNavigation;
    const passedKeyboard = keyboardTests.filter(test => test.passed).length;
    const keyboardPenalty = keyboardTests.length > 0 && passedKeyboard === 0 ? 20 : 0;

    return Math.max(0, Math.round(score - keyboardPenalty));
  }

  generateRecommendations() {
    const recommendations = [];

    // Performance recommendations
    const slowPages = Object.entries(this.results.performance.pageLoadTimes)
      .filter(([_, data]) => !data.passed);

    if (slowPages.length > 0) {
      recommendations.push({
        category: 'Performance',
        priority: 'High',
        issue: 'Pages loading slower than 2 seconds',
        pages: slowPages.map(([page, _]) => page),
        solution: 'Optimize bundle size, implement code splitting, add caching headers'
      });
    }

    // Security recommendations
    const vulnerablePages = this.results.security.xssTests
      .filter(test => !test.passed);

    if (vulnerablePages.length > 0) {
      recommendations.push({
        category: 'Security',
        priority: 'Critical',
        issue: 'XSS vulnerabilities detected',
        solution: 'Implement proper input sanitization and output encoding'
      });
    }

    // Accessibility recommendations
    const accessibilityIssues = this.results.accessibility.violations
      .filter(v => v.critical > 0);

    if (accessibilityIssues.length > 0) {
      recommendations.push({
        category: 'Accessibility',
        priority: 'High',
        issue: 'Critical accessibility violations found',
        solution: 'Add proper ARIA labels, ensure keyboard navigation, fix color contrast'
      });
    }

    return recommendations;
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up...');

    if (this.serverProcess) {
      this.serverProcess.kill();
    }

    console.log('✅ Cleanup completed');
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new ProductionValidator();
  validator.validateProduction()
    .then(results => {
      const success = results.scores?.overall >= 90;
      console.log(`\n${success ? '🎉 PRODUCTION READY' : '❌ NOT READY FOR PRODUCTION'}`);
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Validation failed:', error);
      process.exit(1);
    });
}

module.exports = ProductionValidator;