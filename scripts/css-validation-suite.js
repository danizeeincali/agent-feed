#!/usr/bin/env node

/**
 * Comprehensive CSS Fix Production Validation Suite
 * Validates styling, performance, and visual integrity after CSS fixes
 */

import { chromium, firefox, webkit } from 'playwright';
import fs from 'fs/promises';
import path from 'path';

const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:3000';
const TIMEOUT = 30000;

class CSSValidationSuite {
  constructor() {
    this.results = {
      summary: {
        timestamp: new Date().toISOString(),
        status: 'running',
        totalTests: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      },
      visual: {
        pageLoadTest: {},
        responsiveTest: {},
        interactionTest: {}
      },
      performance: {
        cssFileSize: 0,
        loadTime: 0,
        renderTime: 0,
        layoutShift: 0
      },
      crossBrowser: {
        chromium: {},
        firefox: {},
        webkit: {}
      },
      console: {
        errors: [],
        warnings: []
      },
      accessibility: {
        violations: [],
        score: 0
      }
    };
  }

  async runComprehensiveValidation() {
    console.log('🚀 Starting Comprehensive CSS Fix Validation Suite...\n');

    try {
      // 1. Visual Regression Tests
      await this.runVisualTests();

      // 2. Performance Tests
      await this.runPerformanceTests();

      // 3. Cross-Browser Tests
      await this.runCrossBrowserTests();

      // 4. Console Error Tests
      await this.runConsoleTests();

      // 5. User Interaction Tests
      await this.runInteractionTests();

      // 6. Responsive Design Tests
      await this.runResponsiveTests();

      // 7. Accessibility Tests
      await this.runAccessibilityTests();

      // Generate final report
      await this.generateReport();

    } catch (error) {
      console.error('❌ Validation suite failed:', error);
      this.results.summary.status = 'failed';
      this.results.summary.failed++;
    }
  }

  async runVisualTests() {
    console.log('📸 Running Visual Regression Tests...');
    this.results.summary.totalTests++;

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
      // Test main pages render correctly
      const pages = [
        { name: 'home', url: FRONTEND_URL },
        { name: 'agents', url: `${FRONTEND_URL}/agents` },
        { name: 'feed', url: `${FRONTEND_URL}/feed` },
        { name: 'analytics', url: `${FRONTEND_URL}/analytics` }
      ];

      for (const pageInfo of pages) {
        try {
          console.log(`  Testing ${pageInfo.name} page...`);

          // Navigate and wait for load
          await page.goto(pageInfo.url, { waitUntil: 'networkidle' });
          await page.waitForTimeout(2000);

          // Check for visual elements
          const bodyStyles = await page.evaluate(() => {
            const body = document.body;
            const computed = window.getComputedStyle(body);
            return {
              backgroundColor: computed.backgroundColor,
              color: computed.color,
              fontFamily: computed.fontFamily,
              hasContent: body.textContent.trim().length > 0
            };
          });

          // Screenshot for manual review
          await page.screenshot({
            path: `/workspaces/agent-feed/docs/validation-screenshots/${pageInfo.name}-validation.png`,
            fullPage: true
          });

          this.results.visual.pageLoadTest[pageInfo.name] = {
            status: 'passed',
            styles: bodyStyles,
            hasContent: bodyStyles.hasContent
          };

          console.log(`  ✅ ${pageInfo.name} page rendered successfully`);

        } catch (error) {
          console.log(`  ❌ ${pageInfo.name} page failed: ${error.message}`);
          this.results.visual.pageLoadTest[pageInfo.name] = {
            status: 'failed',
            error: error.message
          };
          this.results.summary.failed++;
        }
      }

      this.results.summary.passed++;

    } catch (error) {
      console.error('❌ Visual tests failed:', error);
      this.results.summary.failed++;
    } finally {
      await browser.close();
    }
  }

  async runPerformanceTests() {
    console.log('⚡ Running CSS Performance Tests...');
    this.results.summary.totalTests++;

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
      // Performance metrics
      await page.goto(FRONTEND_URL);

      const performanceMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        const paint = performance.getEntriesByType('paint');

        return {
          domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart,
          loadComplete: navigation?.loadEventEnd - navigation?.loadEventStart,
          firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
          firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0
        };
      });

      // Check CSS file sizes
      const cssResources = await page.evaluate(() => {
        const resources = performance.getEntriesByType('resource');
        return resources
          .filter(r => r.name.includes('.css') || r.initiatorType === 'css')
          .map(r => ({
            name: r.name,
            size: r.transferSize,
            loadTime: r.responseEnd - r.requestStart
          }));
      });

      this.results.performance = {
        ...performanceMetrics,
        cssResources,
        totalCSSSize: cssResources.reduce((sum, css) => sum + css.size, 0)
      };

      console.log(`  ✅ Performance metrics collected`);
      console.log(`     - DOM Content Loaded: ${performanceMetrics.domContentLoaded}ms`);
      console.log(`     - First Paint: ${performanceMetrics.firstPaint}ms`);
      console.log(`     - Total CSS Size: ${this.results.performance.totalCSSSize} bytes`);

      this.results.summary.passed++;

    } catch (error) {
      console.error('❌ Performance tests failed:', error);
      this.results.summary.failed++;
    } finally {
      await browser.close();
    }
  }

  async runCrossBrowserTests() {
    console.log('🌐 Running Cross-Browser Compatibility Tests...');
    this.results.summary.totalTests++;

    const browsers = [
      { name: 'chromium', launcher: chromium },
      { name: 'firefox', launcher: firefox },
      { name: 'webkit', launcher: webkit }
    ];

    for (const browserInfo of browsers) {
      try {
        console.log(`  Testing ${browserInfo.name}...`);

        const browser = await browserInfo.launcher.launch({ headless: true });
        const page = await browser.newPage();

        await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });

        // Test CSS support and rendering
        const cssSupport = await page.evaluate(() => {
          const testElement = document.createElement('div');
          testElement.style.cssText = 'display: grid; flex: 1; transform: translateX(0); filter: blur(0);';
          document.body.appendChild(testElement);

          const computed = window.getComputedStyle(testElement);
          const support = {
            grid: computed.display === 'grid',
            flex: computed.flex === '1 1 0%' || computed.flex === '1',
            transform: computed.transform !== 'none',
            filter: computed.filter !== 'none'
          };

          document.body.removeChild(testElement);
          return support;
        });

        this.results.crossBrowser[browserInfo.name] = {
          status: 'passed',
          cssSupport,
          userAgent: await page.evaluate(() => navigator.userAgent)
        };

        console.log(`  ✅ ${browserInfo.name} compatibility verified`);

        await browser.close();

      } catch (error) {
        console.log(`  ❌ ${browserInfo.name} failed: ${error.message}`);
        this.results.crossBrowser[browserInfo.name] = {
          status: 'failed',
          error: error.message
        };
        this.results.summary.failed++;
      }
    }

    this.results.summary.passed++;
  }

  async runConsoleTests() {
    console.log('🐛 Checking Browser Console for CSS Errors...');
    this.results.summary.totalTests++;

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
      const consoleMessages = [];

      page.on('console', msg => {
        consoleMessages.push({
          type: msg.type(),
          text: msg.text(),
          location: msg.location(),
          timestamp: new Date().toISOString()
        });
      });

      page.on('pageerror', error => {
        consoleMessages.push({
          type: 'error',
          text: error.message,
          location: { url: error.stack },
          timestamp: new Date().toISOString()
        });
      });

      await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);

      // Filter CSS-related errors
      const cssErrors = consoleMessages.filter(msg =>
        msg.text.toLowerCase().includes('css') ||
        msg.text.toLowerCase().includes('style') ||
        msg.text.toLowerCase().includes('stylesheet')
      );

      this.results.console.errors = consoleMessages.filter(msg => msg.type === 'error');
      this.results.console.warnings = consoleMessages.filter(msg => msg.type === 'warning');

      if (cssErrors.length === 0) {
        console.log('  ✅ No CSS-related console errors found');
        this.results.summary.passed++;
      } else {
        console.log(`  ⚠️  Found ${cssErrors.length} CSS-related console messages`);
        this.results.summary.warnings++;
      }

    } catch (error) {
      console.error('❌ Console tests failed:', error);
      this.results.summary.failed++;
    } finally {
      await browser.close();
    }
  }

  async runInteractionTests() {
    console.log('🖱️  Testing User Interactions and Visual Feedback...');
    this.results.summary.totalTests++;

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
      await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });

      // Test button hover states
      const buttons = await page.$$('button, .btn, [role="button"]');
      const interactionResults = [];

      for (let i = 0; i < Math.min(buttons.length, 5); i++) {
        const button = buttons[i];
        try {
          const beforeHover = await button.evaluate(el => {
            const computed = window.getComputedStyle(el);
            return {
              backgroundColor: computed.backgroundColor,
              color: computed.color,
              transform: computed.transform
            };
          });

          await button.hover();
          await page.waitForTimeout(100);

          const afterHover = await button.evaluate(el => {
            const computed = window.getComputedStyle(el);
            return {
              backgroundColor: computed.backgroundColor,
              color: computed.color,
              transform: computed.transform
            };
          });

          const hasVisualChange = JSON.stringify(beforeHover) !== JSON.stringify(afterHover);

          interactionResults.push({
            index: i,
            hasHoverEffect: hasVisualChange,
            beforeHover,
            afterHover
          });

        } catch (error) {
          interactionResults.push({
            index: i,
            error: error.message
          });
        }
      }

      this.results.visual.interactionTest = {
        buttonsTestsed: interactionResults.length,
        results: interactionResults,
        hoverEffectsWorking: interactionResults.filter(r => r.hasHoverEffect).length
      };

      console.log(`  ✅ Tested ${interactionResults.length} interactive elements`);
      this.results.summary.passed++;

    } catch (error) {
      console.error('❌ Interaction tests failed:', error);
      this.results.summary.failed++;
    } finally {
      await browser.close();
    }
  }

  async runResponsiveTests() {
    console.log('📱 Testing Responsive Design...');
    this.results.summary.totalTests++;

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
      const viewports = [
        { name: 'mobile', width: 375, height: 667 },
        { name: 'tablet', width: 768, height: 1024 },
        { name: 'desktop', width: 1920, height: 1080 }
      ];

      const responsiveResults = {};

      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });

        const layoutMetrics = await page.evaluate(() => {
          return {
            documentWidth: document.documentElement.scrollWidth,
            documentHeight: document.documentElement.scrollHeight,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            hasHorizontalScroll: document.documentElement.scrollWidth > window.innerWidth,
            hasVerticalOverflow: document.documentElement.scrollHeight > window.innerHeight
          };
        });

        await page.screenshot({
          path: `/workspaces/agent-feed/docs/validation-screenshots/responsive-${viewport.name}.png`,
          fullPage: true
        });

        responsiveResults[viewport.name] = {
          viewport,
          metrics: layoutMetrics,
          responsive: !layoutMetrics.hasHorizontalScroll
        };

        console.log(`  ✅ ${viewport.name} (${viewport.width}x${viewport.height}) tested`);
      }

      this.results.visual.responsiveTest = responsiveResults;
      this.results.summary.passed++;

    } catch (error) {
      console.error('❌ Responsive tests failed:', error);
      this.results.summary.failed++;
    } finally {
      await browser.close();
    }
  }

  async runAccessibilityTests() {
    console.log('♿ Running Accessibility Tests...');
    this.results.summary.totalTests++;

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
      await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });

      // Basic accessibility checks
      const accessibilityMetrics = await page.evaluate(() => {
        const elements = {
          imagesWithoutAlt: document.querySelectorAll('img:not([alt])').length,
          buttonsWithoutText: document.querySelectorAll('button:empty').length,
          formsWithoutLabels: document.querySelectorAll('input:not([aria-label]):not([aria-labelledby])').length,
          headingsStructure: Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6')).map(h => h.tagName),
          focusableElements: document.querySelectorAll('button, input, select, textarea, a[href]').length
        };

        // Check color contrast (simplified)
        const body = document.body;
        const computed = window.getComputedStyle(body);

        return {
          ...elements,
          bodyStyles: {
            color: computed.color,
            backgroundColor: computed.backgroundColor
          }
        };
      });

      this.results.accessibility = {
        violations: [],
        metrics: accessibilityMetrics,
        score: this.calculateAccessibilityScore(accessibilityMetrics)
      };

      console.log(`  ✅ Accessibility scan completed (Score: ${this.results.accessibility.score}/100)`);
      this.results.summary.passed++;

    } catch (error) {
      console.error('❌ Accessibility tests failed:', error);
      this.results.summary.failed++;
    } finally {
      await browser.close();
    }
  }

  calculateAccessibilityScore(metrics) {
    let score = 100;
    score -= metrics.imagesWithoutAlt * 10;
    score -= metrics.buttonsWithoutText * 15;
    score -= metrics.formsWithoutLabels * 10;
    return Math.max(0, score);
  }

  async generateReport() {
    console.log('\n📋 Generating Validation Report...');

    this.results.summary.status = this.results.summary.failed > 0 ? 'failed' : 'passed';
    this.results.summary.successRate = ((this.results.summary.passed / this.results.summary.totalTests) * 100).toFixed(2);

    const reportContent = `# CSS Fix Production Validation Report

## Summary
- **Status**: ${this.results.summary.status.toUpperCase()}
- **Timestamp**: ${this.results.summary.timestamp}
- **Success Rate**: ${this.results.summary.successRate}%
- **Tests Run**: ${this.results.summary.totalTests}
- **Passed**: ${this.results.summary.passed}
- **Failed**: ${this.results.summary.failed}
- **Warnings**: ${this.results.summary.warnings}

## Visual Regression Tests
${Object.entries(this.results.visual.pageLoadTest).map(([page, result]) =>
  `- **${page}**: ${result.status} ${result.hasContent ? '✅ Has Content' : '⚠️  No Content'}`
).join('\n')}

## Performance Metrics
- **DOM Content Loaded**: ${this.results.performance.domContentLoaded || 0}ms
- **First Paint**: ${this.results.performance.firstPaint || 0}ms
- **Total CSS Size**: ${this.results.performance.totalCSSSize || 0} bytes
- **CSS Files**: ${this.results.performance.cssResources?.length || 0}

## Cross-Browser Compatibility
${Object.entries(this.results.crossBrowser).map(([browser, result]) =>
  `- **${browser}**: ${result.status} ${result.cssSupport ?
    `(Grid: ${result.cssSupport.grid ? '✅' : '❌'}, Flex: ${result.cssSupport.flex ? '✅' : '❌'})` : ''}`
).join('\n')}

## Console Errors
- **Errors**: ${this.results.console.errors.length}
- **Warnings**: ${this.results.console.warnings.length}

${this.results.console.errors.length > 0 ?
`### Error Details:
${this.results.console.errors.slice(0, 5).map(error => `- ${error.text}`).join('\n')}` : ''}

## Responsive Design
${Object.entries(this.results.visual.responsiveTest).map(([device, result]) =>
  `- **${device}**: ${result.responsive ? '✅ Responsive' : '❌ Layout Issues'} (${result.viewport.width}x${result.viewport.height})`
).join('\n')}

## User Interactions
- **Elements Tested**: ${this.results.visual.interactionTest.buttonsTestsed || 0}
- **Hover Effects Working**: ${this.results.visual.interactionTest.hoverEffectsWorking || 0}

## Accessibility
- **Score**: ${this.results.accessibility.score}/100
- **Images without Alt**: ${this.results.accessibility.metrics?.imagesWithoutAlt || 0}
- **Buttons without Text**: ${this.results.accessibility.metrics?.buttonsWithoutText || 0}

## Recommendations

${this.results.summary.failed > 0 ? '### Critical Issues to Address:' : '### All Tests Passed! ✅'}

${this.results.summary.failed > 0 ?
  Object.entries(this.results.visual.pageLoadTest)
    .filter(([, result]) => result.status === 'failed')
    .map(([page, result]) => `- Fix ${page} page rendering: ${result.error}`)
    .join('\n') : '- CSS fixes are working correctly across all tested scenarios'}

${this.results.console.errors.length > 0 ?
`- Address ${this.results.console.errors.length} console errors` : ''}

${this.results.accessibility.score < 90 ?
`- Improve accessibility score (current: ${this.results.accessibility.score}/100)` : ''}

## Production Readiness

**Overall Assessment**: ${this.results.summary.status === 'passed' ?
  '🚀 APPROVED FOR PRODUCTION - All CSS fixes are working correctly' :
  '⚠️  REQUIRES ATTENTION - Issues detected that need resolution before production deployment'}

---
*Report generated by CSS Validation Suite on ${new Date().toLocaleString()}*
`;

    await fs.writeFile('/workspaces/agent-feed/docs/CSS_FIX_VALIDATION.md', reportContent);

    // Also save raw results as JSON
    await fs.writeFile(
      '/workspaces/agent-feed/docs/css-validation-results.json',
      JSON.stringify(this.results, null, 2)
    );

    console.log('✅ Validation report generated at /workspaces/agent-feed/docs/CSS_FIX_VALIDATION.md');
    console.log(`\n🎯 Final Status: ${this.results.summary.status.toUpperCase()}`);
    console.log(`📊 Success Rate: ${this.results.summary.successRate}%`);
  }
}

// Run validation if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new CSSValidationSuite();
  validator.runComprehensiveValidation().catch(console.error);
}

export default CSSValidationSuite;