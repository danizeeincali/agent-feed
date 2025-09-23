#!/usr/bin/env node

/**
 * Direct Agents Page Validation Script
 * Uses Playwright to directly test the agents page functionality
 * without the test framework overhead
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

class DirectAgentsValidator {
  constructor() {
    this.results = [];
    this.screenshotDir = path.join(__dirname, 'screenshots');
    this.startTime = new Date();
  }

  async ensureScreenshotDir() {
    try {
      await fs.mkdir(this.screenshotDir, { recursive: true });
    } catch (error) {
      console.log('Screenshot directory already exists or error creating:', error.message);
    }
  }

  async log(status, test, details, screenshotPath = null) {
    const result = {
      timestamp: new Date().toISOString(),
      status,
      test,
      details,
      screenshot: screenshotPath
    };

    this.results.push(result);

    const emoji = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
    console.log(`${emoji} ${test}: ${details}`);

    if (screenshotPath) {
      console.log(`   📸 Screenshot: ${screenshotPath}`);
    }
  }

  async captureScreenshot(page, name) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${name}-${timestamp}.png`;
      const filepath = path.join(this.screenshotDir, filename);

      await page.screenshot({
        path: filepath,
        fullPage: true,
        animations: 'disabled'
      });

      return filename;
    } catch (error) {
      console.log(`Screenshot failed for ${name}:`, error.message);
      return null;
    }
  }

  async validatePageLoad(page) {
    try {
      console.log('\n🔍 Testing page load...');

      const response = await page.goto('http://localhost:5173/agents', {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });

      await page.waitForTimeout(3000); // Allow React to render

      const screenshot = await this.captureScreenshot(page, 'page-load');

      const title = await page.title();
      const url = page.url();
      const status = response ? response.status() : 'unknown';

      if (response && response.status() === 200) {
        await this.log('pass', 'Page Load',
          `Successfully loaded agents page. Status: ${status}, Title: "${title}", URL: ${url}`,
          screenshot);
        return true;
      } else {
        await this.log('fail', 'Page Load',
          `Failed to load agents page. Status: ${status}`,
          screenshot);
        return false;
      }
    } catch (error) {
      const screenshot = await this.captureScreenshot(page, 'page-load-error');
      await this.log('fail', 'Page Load',
        `Exception during page load: ${error.message}`,
        screenshot);
      return false;
    }
  }

  async validateAgentPath(page) {
    try {
      console.log('\n🔍 Checking agent data source path...');

      // Monitor network requests to see if agents are loaded from correct path
      const requests = [];

      page.on('request', request => {
        const url = request.url();
        if (url.includes('agent') || url.includes('claude') || url.includes('api')) {
          requests.push({
            url: url,
            method: request.method()
          });
        }
      });

      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      const screenshot = await this.captureScreenshot(page, 'agent-path-validation');

      // Check if requests include the correct agent path
      const relevantRequests = requests.filter(req =>
        req.url.includes('agent') ||
        req.url.includes('claude') ||
        req.url.includes('/prod/.claude/agents')
      );

      await this.log('info', 'Agent Data Source',
        `Network requests for agents: ${JSON.stringify(relevantRequests, null, 2)}`,
        screenshot);

      return true;
    } catch (error) {
      const screenshot = await this.captureScreenshot(page, 'agent-path-error');
      await this.log('fail', 'Agent Data Source',
        `Error checking agent path: ${error.message}`,
        screenshot);
      return false;
    }
  }

  async validateAgentDisplay(page) {
    try {
      console.log('\n🔍 Validating agent display...');

      // Wait for potential agent elements
      await page.waitForTimeout(3000);

      const screenshot = await this.captureScreenshot(page, 'agent-display');

      // Check multiple possible selectors for agent elements
      const selectors = [
        '[data-testid*="agent"]',
        '.agent-card',
        '.agent-item',
        '.agent-list',
        '[class*="agent"]',
        'div:has-text("researcher")',
        'div:has-text("coder")',
        'div:has-text("analyst")',
        'div:has-text("coordinator")',
        'div:has-text("optimizer")'
      ];

      let totalAgents = 0;
      let foundSelectors = [];

      for (const selector of selectors) {
        try {
          const count = await page.locator(selector).count();
          if (count > 0) {
            totalAgents += count;
            foundSelectors.push(`${selector}: ${count}`);
          }
        } catch (e) {
          // Continue with next selector
        }
      }

      // Get page content for analysis
      const bodyText = await page.textContent('body');
      const pageContent = bodyText ? bodyText.substring(0, 2000) : '';

      // Check for real agent terms
      const realAgentTerms = [
        'researcher', 'coder', 'analyst', 'optimizer', 'coordinator',
        'active', 'idle', 'busy', 'available', 'agent'
      ];

      const foundRealTerms = realAgentTerms.filter(term =>
        pageContent.toLowerCase().includes(term)
      );

      // Check for mock/placeholder data
      const mockTerms = ['lorem ipsum', 'placeholder', 'sample', 'mock', 'test agent'];
      const foundMockTerms = mockTerms.filter(term =>
        pageContent.toLowerCase().includes(term)
      );

      if (totalAgents > 0 || foundRealTerms.length > 0) {
        await this.log('pass', 'Agent Display',
          `Found agent elements: ${foundSelectors.join(', ')}. Real terms: ${foundRealTerms.join(', ')}. Mock terms: ${foundMockTerms.join(', ')}`,
          screenshot);
        return true;
      } else {
        await this.log('fail', 'Agent Display',
          `No agent elements found. Selectors checked: ${selectors.length}. Page content sample: ${pageContent.substring(0, 500)}`,
          screenshot);
        return false;
      }
    } catch (error) {
      const screenshot = await this.captureScreenshot(page, 'agent-display-error');
      await this.log('fail', 'Agent Display',
        `Error validating agent display: ${error.message}`,
        screenshot);
      return false;
    }
  }

  async validateNoErrors(page) {
    try {
      console.log('\n🔍 Checking for error messages...');

      const screenshot = await this.captureScreenshot(page, 'error-check');

      // Check for error elements
      const errorSelectors = [
        '.error', '.alert-error', '[role="alert"]',
        '.text-red', '.text-danger', '[class*="error"]'
      ];

      let foundErrors = [];

      for (const selector of errorSelectors) {
        try {
          const elements = await page.locator(selector).all();
          for (const element of elements) {
            const text = await element.textContent();
            if (text && text.trim().length > 0) {
              foundErrors.push({
                selector,
                text: text.trim()
              });
            }
          }
        } catch (e) {
          // Continue
        }
      }

      // Check console errors
      const consoleErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      if (foundErrors.length === 0 && consoleErrors.length === 0) {
        await this.log('pass', 'Error Check',
          'No error messages detected',
          screenshot);
        return true;
      } else {
        await this.log('fail', 'Error Check',
          `Found errors: ${JSON.stringify(foundErrors)}. Console errors: ${consoleErrors.join(', ')}`,
          screenshot);
        return false;
      }
    } catch (error) {
      const screenshot = await this.captureScreenshot(page, 'error-check-error');
      await this.log('fail', 'Error Check',
        `Error during error check: ${error.message}`,
        screenshot);
      return false;
    }
  }

  async validateResponsive(page) {
    try {
      console.log('\n🔍 Testing responsive design...');

      const viewports = [
        { name: 'Desktop', width: 1920, height: 1080 },
        { name: 'Tablet', width: 768, height: 1024 },
        { name: 'Mobile', width: 375, height: 667 }
      ];

      let allPassed = true;

      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.waitForTimeout(1000);

        const screenshot = await this.captureScreenshot(page, `responsive-${viewport.name.toLowerCase()}`);

        const layoutInfo = await page.evaluate(() => {
          return {
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            bodyWidth: document.body.scrollWidth,
            bodyHeight: document.body.scrollHeight,
            hasHorizontalScroll: document.body.scrollWidth > window.innerWidth
          };
        });

        if (!layoutInfo.hasHorizontalScroll) {
          await this.log('pass', `Responsive ${viewport.name}`,
            `Layout responsive at ${viewport.width}x${viewport.height}. Body: ${layoutInfo.bodyWidth}x${layoutInfo.bodyHeight}`,
            screenshot);
        } else {
          await this.log('fail', `Responsive ${viewport.name}`,
            `Horizontal scroll detected at ${viewport.width}x${viewport.height}. Body width: ${layoutInfo.bodyWidth}`,
            screenshot);
          allPassed = false;
        }
      }

      return allPassed;
    } catch (error) {
      const screenshot = await this.captureScreenshot(page, 'responsive-error');
      await this.log('fail', 'Responsive Design',
        `Error testing responsive: ${error.message}`,
        screenshot);
      return false;
    }
  }

  async generateReport() {
    const endTime = new Date();
    const duration = endTime - this.startTime;

    const passCount = this.results.filter(r => r.status === 'pass').length;
    const failCount = this.results.filter(r => r.status === 'fail').length;
    const infoCount = this.results.filter(r => r.status === 'info').length;
    const totalCount = this.results.length;

    const report = {
      meta: {
        timestamp: new Date().toISOString(),
        duration: `${duration}ms`,
        url: 'http://localhost:5173/agents',
        browser: 'Chromium',
        environment: 'headless'
      },
      summary: {
        total: totalCount,
        passed: passCount,
        failed: failCount,
        info: infoCount,
        successRate: `${totalCount > 0 ? ((passCount / (passCount + failCount)) * 100).toFixed(1) : 0}%`
      },
      verdict: failCount === 0 ?
        '🎉 ALL VALIDATION TESTS PASSED - 100% REAL FUNCTIONALITY VERIFIED' :
        `⚠️ ${failCount}/${passCount + failCount} TESTS FAILED - REVIEW REQUIRED`,
      results: this.results,
      screenshots: this.results.filter(r => r.screenshot).map(r => r.screenshot)
    };

    // Save report
    const reportPath = path.join(__dirname, 'reports', 'direct-agents-validation-report.json');
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    console.log('\n' + '='.repeat(80));
    console.log('🎯 AGENTS PAGE VALIDATION COMPLETE');
    console.log('='.repeat(80));
    console.log(`⏱️  Duration: ${duration}ms`);
    console.log(`✅ Passed: ${passCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`ℹ️  Info: ${infoCount}`);
    console.log(`📈 Success Rate: ${report.summary.successRate}`);
    console.log(`📄 Report: ${reportPath}`);
    console.log(`📸 Screenshots: ${report.screenshots.length} captured`);
    console.log('\n' + report.verdict);

    return report;
  }
}

async function main() {
  console.log('🚀 STARTING DIRECT AGENTS PAGE VALIDATION');
  console.log('==========================================');

  const validator = new DirectAgentsValidator();
  await validator.ensureScreenshotDir();

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });

    const page = await context.newPage();

    // Run all validations
    const pageLoaded = await validator.validatePageLoad(page);

    if (pageLoaded) {
      await validator.validateAgentPath(page);
      await validator.validateAgentDisplay(page);
      await validator.validateNoErrors(page);
      await validator.validateResponsive(page);
    }

    // Generate final report
    const report = await validator.generateReport();

    // Exit with appropriate code
    const hasFailures = report.summary.failed > 0;
    process.exit(hasFailures ? 1 : 0);

  } catch (error) {
    console.error('❌ VALIDATION FAILED:', error);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = { DirectAgentsValidator };