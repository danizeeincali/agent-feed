#!/usr/bin/env node

/**
 * Simplified CSS Validation Script using Puppeteer
 * Validates CSS functionality and performance
 */

import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import { execSync } from 'child_process';

const FRONTEND_URL = 'http://localhost:5173';
const TIMEOUT = 30000;

class SimpleCSSValidator {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      status: 'running',
      tests: {},
      performance: {},
      console: { errors: [], warnings: [] },
      summary: { passed: 0, failed: 0, total: 0 }
    };
  }

  async validateCSS() {
    console.log('🚀 Starting CSS Validation...\n');

    try {
      // Check if frontend is running
      await this.checkServerStatus();

      // Run validation tests
      await this.validatePageRendering();
      await this.validatePerformance();
      await this.validateResponsive();
      await this.validateConsole();

      // Generate report
      await this.generateSimpleReport();

    } catch (error) {
      console.error('❌ Validation failed:', error.message);
      this.results.status = 'failed';
    }
  }

  async checkServerStatus() {
    console.log('🔍 Checking server status...');

    try {
      const response = await fetch(FRONTEND_URL);
      if (response.ok) {
        console.log('✅ Frontend server is running');
        this.results.tests.serverStatus = { status: 'passed', url: FRONTEND_URL };
        this.results.summary.passed++;
      } else {
        throw new Error(`Server returned ${response.status}`);
      }
    } catch (error) {
      console.log('❌ Frontend server is not accessible');
      this.results.tests.serverStatus = { status: 'failed', error: error.message };
      this.results.summary.failed++;
    }

    this.results.summary.total++;
  }

  async validatePageRendering() {
    console.log('📸 Validating page rendering...');

    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.goto(FRONTEND_URL, { waitUntil: 'networkidle2', timeout: TIMEOUT });

      // Check page content and styles
      const pageAnalysis = await page.evaluate(() => {
        const body = document.body;
        const computed = window.getComputedStyle(body);

        return {
          hasContent: body.textContent.trim().length > 0,
          backgroundColor: computed.backgroundColor,
          color: computed.color,
          fontFamily: computed.fontFamily,
          titleText: document.title,
          elementCount: document.querySelectorAll('*').length,
          hasCSS: document.styleSheets.length > 0,
          cssFiles: Array.from(document.styleSheets).map(sheet => sheet.href).filter(Boolean)
        };
      });

      // Take screenshot
      await page.screenshot({
        path: '/workspaces/agent-feed/docs/current-page-validation.png',
        fullPage: true
      });

      this.results.tests.pageRendering = {
        status: pageAnalysis.hasContent && pageAnalysis.hasCSS ? 'passed' : 'failed',
        analysis: pageAnalysis
      };

      if (pageAnalysis.hasContent && pageAnalysis.hasCSS) {
        console.log('✅ Page renders correctly with styles');
        this.results.summary.passed++;
      } else {
        console.log('❌ Page rendering issues detected');
        this.results.summary.failed++;
      }

    } catch (error) {
      console.log('❌ Page rendering test failed:', error.message);
      this.results.tests.pageRendering = { status: 'failed', error: error.message };
      this.results.summary.failed++;
    } finally {
      if (browser) await browser.close();
    }

    this.results.summary.total++;
  }

  async validatePerformance() {
    console.log('⚡ Validating CSS performance...');

    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();

      // Track performance
      await page.goto(FRONTEND_URL, { waitUntil: 'networkidle2' });

      const performanceMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        const resources = performance.getEntriesByType('resource');
        const cssResources = resources.filter(r =>
          r.name.includes('.css') ||
          r.initiatorType === 'css' ||
          r.name.includes('tailwind') ||
          r.name.includes('style')
        );

        return {
          domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart,
          loadComplete: navigation?.loadEventEnd - navigation?.loadEventStart,
          totalResources: resources.length,
          cssResources: cssResources.length,
          totalCSSSize: cssResources.reduce((sum, css) => sum + (css.transferSize || 0), 0),
          cssLoadTime: cssResources.reduce((max, css) =>
            Math.max(max, css.responseEnd - css.requestStart), 0)
        };
      });

      this.results.performance = performanceMetrics;

      // Check if performance is acceptable
      const isPerformant =
        performanceMetrics.domContentLoaded < 5000 &&
        performanceMetrics.totalCSSSize < 500000; // 500KB limit

      this.results.tests.performance = {
        status: isPerformant ? 'passed' : 'warning',
        metrics: performanceMetrics
      };

      if (isPerformant) {
        console.log('✅ CSS performance is acceptable');
        console.log(`   - DOM Content Loaded: ${performanceMetrics.domContentLoaded}ms`);
        console.log(`   - Total CSS Size: ${Math.round(performanceMetrics.totalCSSSize/1024)}KB`);
        this.results.summary.passed++;
      } else {
        console.log('⚠️  CSS performance could be improved');
        this.results.summary.failed++;
      }

    } catch (error) {
      console.log('❌ Performance test failed:', error.message);
      this.results.tests.performance = { status: 'failed', error: error.message };
      this.results.summary.failed++;
    } finally {
      if (browser) await browser.close();
    }

    this.results.summary.total++;
  }

  async validateResponsive() {
    console.log('📱 Validating responsive design...');

    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      const viewports = [
        { name: 'mobile', width: 375, height: 667 },
        { name: 'tablet', width: 768, height: 1024 },
        { name: 'desktop', width: 1920, height: 1080 }
      ];

      const responsiveResults = {};

      for (const viewport of viewports) {
        await page.setViewport(viewport);
        await page.goto(FRONTEND_URL, { waitUntil: 'networkidle2' });

        const metrics = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          hasHorizontalScroll: document.documentElement.scrollWidth > window.innerWidth
        }));

        responsiveResults[viewport.name] = {
          viewport,
          responsive: !metrics.hasHorizontalScroll,
          metrics
        };

        await page.screenshot({
          path: `/workspaces/agent-feed/docs/responsive-${viewport.name}.png`
        });
      }

      const allResponsive = Object.values(responsiveResults).every(r => r.responsive);

      this.results.tests.responsive = {
        status: allResponsive ? 'passed' : 'failed',
        results: responsiveResults
      };

      if (allResponsive) {
        console.log('✅ Responsive design working correctly');
        this.results.summary.passed++;
      } else {
        console.log('❌ Responsive design issues detected');
        this.results.summary.failed++;
      }

    } catch (error) {
      console.log('❌ Responsive test failed:', error.message);
      this.results.tests.responsive = { status: 'failed', error: error.message };
      this.results.summary.failed++;
    } finally {
      if (browser) await browser.close();
    }

    this.results.summary.total++;
  }

  async validateConsole() {
    console.log('🐛 Checking console for CSS errors...');

    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      const consoleMessages = [];

      page.on('console', msg => {
        consoleMessages.push({
          type: msg.type(),
          text: msg.text(),
          timestamp: new Date().toISOString()
        });
      });

      page.on('pageerror', error => {
        consoleMessages.push({
          type: 'error',
          text: error.message,
          timestamp: new Date().toISOString()
        });
      });

      await page.goto(FRONTEND_URL, { waitUntil: 'networkidle2' });
      await page.waitForTimeout(3000);

      const errors = consoleMessages.filter(msg => msg.type === 'error');
      const warnings = consoleMessages.filter(msg => msg.type === 'warning');
      const cssRelated = consoleMessages.filter(msg =>
        msg.text.toLowerCase().includes('css') ||
        msg.text.toLowerCase().includes('style') ||
        msg.text.toLowerCase().includes('tailwind')
      );

      this.results.console = { errors, warnings, cssRelated };

      this.results.tests.console = {
        status: errors.length === 0 ? 'passed' : 'failed',
        errorCount: errors.length,
        warningCount: warnings.length,
        cssErrorCount: cssRelated.length
      };

      if (errors.length === 0) {
        console.log('✅ No console errors detected');
        this.results.summary.passed++;
      } else {
        console.log(`❌ Found ${errors.length} console errors`);
        this.results.summary.failed++;
      }

    } catch (error) {
      console.log('❌ Console test failed:', error.message);
      this.results.tests.console = { status: 'failed', error: error.message };
      this.results.summary.failed++;
    } finally {
      if (browser) await browser.close();
    }

    this.results.summary.total++;
  }

  async generateSimpleReport() {
    console.log('\n📋 Generating validation report...');

    this.results.status = this.results.summary.failed > 0 ? 'failed' : 'passed';
    const successRate = ((this.results.summary.passed / this.results.summary.total) * 100).toFixed(1);

    const report = `# CSS Fix Production Validation Report

## Executive Summary
- **Status**: ${this.results.status.toUpperCase()}
- **Timestamp**: ${this.results.timestamp}
- **Success Rate**: ${successRate}%
- **Tests Passed**: ${this.results.summary.passed}/${this.results.summary.total}

## Test Results

### 1. Server Status
**Status**: ${this.results.tests.serverStatus?.status || 'unknown'}
${this.results.tests.serverStatus?.status === 'passed' ?
  '✅ Frontend server is accessible and responding' :
  `❌ Server issue: ${this.results.tests.serverStatus?.error || 'Unknown error'}`}

### 2. Page Rendering
**Status**: ${this.results.tests.pageRendering?.status || 'unknown'}
${this.results.tests.pageRendering?.status === 'passed' ?
  `✅ Page renders correctly with styles
- Elements: ${this.results.tests.pageRendering?.analysis?.elementCount || 0}
- CSS Files: ${this.results.tests.pageRendering?.analysis?.cssFiles?.length || 0}
- Has Content: ${this.results.tests.pageRendering?.analysis?.hasContent ? 'Yes' : 'No'}` :
  `❌ Rendering issues detected: ${this.results.tests.pageRendering?.error || 'Unknown error'}`}

### 3. CSS Performance
**Status**: ${this.results.tests.performance?.status || 'unknown'}
${this.results.tests.performance?.status === 'passed' ?
  `✅ Performance metrics are acceptable
- DOM Content Loaded: ${this.results.performance?.domContentLoaded || 0}ms
- CSS Load Time: ${this.results.performance?.cssLoadTime || 0}ms
- Total CSS Size: ${Math.round((this.results.performance?.totalCSSSize || 0)/1024)}KB` :
  `⚠️  Performance could be improved: ${this.results.tests.performance?.error || 'Check metrics'}`}

### 4. Responsive Design
**Status**: ${this.results.tests.responsive?.status || 'unknown'}
${this.results.tests.responsive?.status === 'passed' ?
  '✅ Responsive design working across all viewport sizes' :
  `❌ Responsive issues: ${this.results.tests.responsive?.error || 'Layout problems detected'}`}

### 5. Console Errors
**Status**: ${this.results.tests.console?.status || 'unknown'}
${this.results.tests.console?.status === 'passed' ?
  '✅ No console errors detected' :
  `❌ Console issues found
- Errors: ${this.results.tests.console?.errorCount || 0}
- Warnings: ${this.results.tests.console?.warningCount || 0}
- CSS-related: ${this.results.tests.console?.cssErrorCount || 0}`}

## Overall Assessment

${this.results.status === 'passed' ?
  '🚀 **APPROVED FOR PRODUCTION**\n\nAll CSS fixes are working correctly. The application is ready for production deployment.' :
  '⚠️  **REQUIRES ATTENTION**\n\nSome issues were detected that should be addressed before production deployment.'}

## Recommendations

${this.results.status === 'passed' ?
  '- CSS implementation is solid\n- Performance is within acceptable limits\n- No critical issues detected\n- Ready for user testing' :
  '- Review failed test cases above\n- Address console errors if any\n- Optimize performance if needed\n- Re-run validation after fixes'}

## Files Generated
- Screenshot: /workspaces/agent-feed/docs/current-page-validation.png
- Responsive screenshots: /workspaces/agent-feed/docs/responsive-*.png
- Raw results: /workspaces/agent-feed/docs/css-validation-results.json

---
*Generated on ${new Date().toLocaleString()} by CSS Validation Suite*
`;

    // Save files
    await fs.writeFile('/workspaces/agent-feed/docs/CSS_FIX_VALIDATION.md', report);
    await fs.writeFile('/workspaces/agent-feed/docs/css-validation-results.json',
      JSON.stringify(this.results, null, 2));

    console.log('✅ Validation report saved to /workspaces/agent-feed/docs/CSS_FIX_VALIDATION.md');
    console.log(`\n🎯 Final Status: ${this.results.status.toUpperCase()}`);
    console.log(`📊 Success Rate: ${successRate}%\n`);

    return this.results.status === 'passed';
  }
}

// Run validation
const validator = new SimpleCSSValidator();
validator.validateCSS().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Validation failed:', error);
  process.exit(1);
});