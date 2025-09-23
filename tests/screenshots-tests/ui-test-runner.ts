#!/usr/bin/env node

import { BrowserManager, VIEWPORT_PRESETS } from './browser-setup';
import { promises as fs } from 'fs';
import path from 'path';

interface TestConfig {
  baseUrl: string;
  outputDir: string;
  browsers: ('chromium' | 'firefox' | 'webkit')[];
  viewports: string[];
  pages: Array<{
    name: string;
    url: string;
    waitForSelector?: string;
    actions?: Array<{
      type: 'click' | 'type' | 'scroll' | 'hover';
      selector?: string;
      text?: string;
      x?: number;
      y?: number;
    }>;
  }>;
}

class UITestRunner {
  private config: TestConfig;
  private browserManager: BrowserManager;
  private results: any[] = [];

  constructor(config: TestConfig) {
    this.config = config;
    this.browserManager = new BrowserManager();
  }

  async run() {
    console.log('🚀 Starting comprehensive UI testing...');
    console.log(`Testing ${this.config.pages.length} pages across ${this.config.browsers.length} browsers and ${this.config.viewports.length} viewports`);

    // Ensure output directory exists
    await fs.mkdir(this.config.outputDir, { recursive: true });

    const startTime = Date.now();

    for (const browserType of this.config.browsers) {
      console.log(`\n📱 Testing with ${browserType}...`);

      for (const viewportName of this.config.viewports) {
        const viewport = VIEWPORT_PRESETS[viewportName as keyof typeof VIEWPORT_PRESETS];
        if (!viewport) continue;

        console.log(`  📐 Viewport: ${viewportName} (${viewport.width}x${viewport.height})`);

        const browserSetup = await this.browserManager.setupBrowser(browserType, { viewport });

        for (const pageConfig of this.config.pages) {
          await this.testPage(browserSetup, pageConfig, viewportName);
        }

        await browserSetup.context.close();
      }
    }

    await this.browserManager.closeAll();

    const duration = Date.now() - startTime;
    console.log(`\n✅ Testing completed in ${duration}ms`);

    await this.generateReport();
  }

  private async testPage(browserSetup: any, pageConfig: any, viewportName: string) {
    const { page, browserName } = browserSetup;
    const url = `${this.config.baseUrl}${pageConfig.url}`;

    console.log(`    🔍 Testing: ${pageConfig.name} at ${url}`);

    const testResult = {
      page: pageConfig.name,
      url,
      browser: browserName,
      viewport: viewportName,
      timestamp: new Date().toISOString(),
      success: false,
      loadTime: 0,
      screenshots: [],
      errors: [],
      issues: []
    };

    const startTime = Date.now();

    try {
      // Navigate to page
      const response = await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      if (!response || !response.ok()) {
        testResult.errors.push(`HTTP ${response?.status()}: Failed to load page`);
      }

      // Wait for specific selector if provided
      if (pageConfig.waitForSelector) {
        try {
          await page.waitForSelector(pageConfig.waitForSelector, { timeout: 10000 });
        } catch (e) {
          testResult.issues.push(`Selector not found: ${pageConfig.waitForSelector}`);
        }
      }

      // Wait for content to stabilize
      await page.waitForTimeout(2000);

      // Execute actions if provided
      if (pageConfig.actions) {
        for (const action of pageConfig.actions) {
          try {
            await this.executeAction(page, action);
          } catch (e) {
            testResult.issues.push(`Action failed: ${action.type} - ${e}`);
          }
        }
      }

      // Take screenshots
      const screenshotBaseName = `${pageConfig.name}-${viewportName}-${browserName}`;

      // Full page screenshot
      const fullPagePath = path.join(this.config.outputDir, `${screenshotBaseName}-full.png`);
      await page.screenshot({
        path: fullPagePath,
        fullPage: true,
        quality: 90
      });
      testResult.screenshots.push(`${screenshotBaseName}-full.png`);

      // Viewport screenshot
      const viewportPath = path.join(this.config.outputDir, `${screenshotBaseName}-viewport.png`);
      await page.screenshot({
        path: viewportPath,
        fullPage: false,
        quality: 90
      });
      testResult.screenshots.push(`${screenshotBaseName}-viewport.png`);

      // Check for errors on page
      const pageErrors = await this.detectPageErrors(page);
      testResult.errors.push(...pageErrors);

      // Check for common issues
      const pageIssues = await this.detectPageIssues(page);
      testResult.issues.push(...pageIssues);

      testResult.success = testResult.errors.length === 0;
      testResult.loadTime = Date.now() - startTime;

    } catch (error) {
      testResult.errors.push(`Test execution error: ${error}`);
      testResult.loadTime = Date.now() - startTime;
    }

    this.results.push(testResult);

    // Log result
    const status = testResult.success ? '✅' : '❌';
    console.log(`      ${status} ${testResult.loadTime}ms - ${testResult.errors.length} errors, ${testResult.issues.length} issues`);
  }

  private async executeAction(page: any, action: any) {
    switch (action.type) {
      case 'click':
        if (action.selector) {
          await page.click(action.selector);
        }
        break;
      case 'type':
        if (action.selector && action.text) {
          await page.fill(action.selector, action.text);
        }
        break;
      case 'scroll':
        if (action.x !== undefined && action.y !== undefined) {
          await page.evaluate((coords) => {
            window.scrollTo(coords.x, coords.y);
          }, { x: action.x, y: action.y });
        }
        break;
      case 'hover':
        if (action.selector) {
          await page.hover(action.selector);
        }
        break;
    }
    await page.waitForTimeout(1000); // Wait after each action
  }

  private async detectPageErrors(page: any): Promise<string[]> {
    const errors: string[] = [];

    // Check for error elements
    const errorSelectors = [
      'text="Internal Server Error"',
      'text="500"',
      'text="404"',
      '[class*="error"]',
      '[data-testid*="error"]'
    ];

    for (const selector of errorSelectors) {
      try {
        const element = await page.locator(selector).first();
        if (await element.count() > 0) {
          const text = await element.textContent();
          if (text) {
            errors.push(`Error element found: ${text.trim()}`);
          }
        }
      } catch (e) {
        // Selector not found, which is expected
      }
    }

    // Check page title for error indicators
    const title = await page.title();
    if (title.includes('404') || title.includes('Error') || title.includes('500')) {
      errors.push(`Error in page title: ${title}`);
    }

    return errors;
  }

  private async detectPageIssues(page: any): Promise<string[]> {
    const issues: string[] = [];

    try {
      // Check for empty page
      const bodyText = await page.textContent('body');
      if (!bodyText || bodyText.trim().length < 50) {
        issues.push('Page appears to be mostly empty');
      }

      // Check for missing images
      const images = await page.locator('img').count();
      const brokenImages = await page.locator('img[alt*="error"], img[src=""], img[src*="404"]').count();
      if (brokenImages > 0) {
        issues.push(`${brokenImages} potentially broken images found`);
      }

      // Check for loading indicators that might be stuck
      const loadingElements = await page.locator('[aria-busy="true"], .loading, .spinner, text="Loading..."').count();
      if (loadingElements > 0) {
        issues.push(`${loadingElements} loading indicators still visible`);
      }

      // Check for broken links (basic check)
      const links = await page.locator('a[href^="#"]').count();
      if (links > 10) {
        issues.push('Many hash-only links found - might indicate broken navigation');
      }

    } catch (e) {
      issues.push(`Issue detection failed: ${e}`);
    }

    return issues;
  }

  private async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: this.results.length,
        passedTests: this.results.filter(r => r.success).length,
        failedTests: this.results.filter(r => !r.success).length,
        avgLoadTime: this.results.reduce((sum, r) => sum + r.loadTime, 0) / this.results.length,
        totalErrors: this.results.reduce((sum, r) => sum + r.errors.length, 0),
        totalIssues: this.results.reduce((sum, r) => sum + r.issues.length, 0)
      },
      results: this.results
    };

    // Save JSON report
    const jsonReportPath = path.join(this.config.outputDir, 'ui-test-report.json');
    await fs.writeFile(jsonReportPath, JSON.stringify(report, null, 2));

    // Generate HTML report
    const htmlReport = await this.generateHTMLReport(report);
    const htmlReportPath = path.join(this.config.outputDir, 'ui-test-report.html');
    await fs.writeFile(htmlReportPath, htmlReport);

    console.log(`\n📊 Reports generated:`);
    console.log(`   JSON: ${jsonReportPath}`);
    console.log(`   HTML: ${htmlReportPath}`);
    console.log(`\n📈 Summary:`);
    console.log(`   Total tests: ${report.summary.totalTests}`);
    console.log(`   Passed: ${report.summary.passedTests}`);
    console.log(`   Failed: ${report.summary.failedTests}`);
    console.log(`   Average load time: ${Math.round(report.summary.avgLoadTime)}ms`);
    console.log(`   Total errors: ${report.summary.totalErrors}`);
    console.log(`   Total issues: ${report.summary.totalIssues}`);

    return report;
  }

  private async generateHTMLReport(report: any): Promise<string> {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>UI Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 2em; }
        .header p { margin: 10px 0 0 0; opacity: 0.9; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; padding: 30px; }
        .stat { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #667eea; }
        .stat h3 { margin: 0; font-size: 2em; color: #333; }
        .stat p { margin: 10px 0 0 0; color: #666; font-weight: 500; }
        .results { padding: 0 30px 30px 30px; }
        .test-result { border: 1px solid #dee2e6; margin-bottom: 20px; border-radius: 8px; overflow: hidden; }
        .test-header { padding: 15px 20px; background: #f8f9fa; border-bottom: 1px solid #dee2e6; display: flex; justify-content: space-between; align-items: center; }
        .test-title { font-weight: 600; color: #333; }
        .test-meta { font-size: 0.9em; color: #666; }
        .test-status { padding: 4px 12px; border-radius: 20px; font-size: 0.8em; font-weight: 600; }
        .status-pass { background: #d4edda; color: #155724; }
        .status-fail { background: #f8d7da; color: #721c24; }
        .test-content { padding: 20px; }
        .screenshots { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px; margin-top: 15px; }
        .screenshot { border: 1px solid #dee2e6; border-radius: 4px; overflow: hidden; }
        .screenshot img { width: 100%; height: auto; display: block; }
        .screenshot-label { padding: 8px 12px; background: #f8f9fa; font-size: 0.9em; color: #666; }
        .issues, .errors { margin-top: 15px; }
        .issues h4, .errors h4 { margin: 0 0 10px 0; font-size: 1em; }
        .error-list { background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; padding: 15px; }
        .issue-list { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 15px; }
        .error-list ul, .issue-list ul { margin: 0; padding-left: 20px; }
        .error-list li, .issue-list li { margin-bottom: 5px; }
        .load-time { font-weight: 600; color: #667eea; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>UI Test Report</h1>
            <p>Generated: ${report.timestamp}</p>
        </div>

        <div class="summary">
            <div class="stat">
                <h3>${report.summary.totalTests}</h3>
                <p>Total Tests</p>
            </div>
            <div class="stat">
                <h3>${report.summary.passedTests}</h3>
                <p>Passed Tests</p>
            </div>
            <div class="stat">
                <h3>${report.summary.failedTests}</h3>
                <p>Failed Tests</p>
            </div>
            <div class="stat">
                <h3>${Math.round(report.summary.avgLoadTime)}ms</h3>
                <p>Avg Load Time</p>
            </div>
            <div class="stat">
                <h3>${report.summary.totalErrors}</h3>
                <p>Total Errors</p>
            </div>
            <div class="stat">
                <h3>${report.summary.totalIssues}</h3>
                <p>Total Issues</p>
            </div>
        </div>

        <div class="results">
            <h2>Test Results</h2>
            ${report.results.map((result: any) => `
                <div class="test-result">
                    <div class="test-header">
                        <div>
                            <div class="test-title">${result.page}</div>
                            <div class="test-meta">${result.browser} • ${result.viewport} • ${result.url}</div>
                        </div>
                        <div>
                            <span class="test-status ${result.success ? 'status-pass' : 'status-fail'}">
                                ${result.success ? 'PASS' : 'FAIL'}
                            </span>
                            <span class="load-time">${result.loadTime}ms</span>
                        </div>
                    </div>
                    <div class="test-content">
                        ${result.errors.length > 0 ? `
                            <div class="errors">
                                <h4>Errors (${result.errors.length})</h4>
                                <div class="error-list">
                                    <ul>
                                        ${result.errors.map((error: string) => `<li>${error}</li>`).join('')}
                                    </ul>
                                </div>
                            </div>
                        ` : ''}

                        ${result.issues.length > 0 ? `
                            <div class="issues">
                                <h4>Issues (${result.issues.length})</h4>
                                <div class="issue-list">
                                    <ul>
                                        ${result.issues.map((issue: string) => `<li>${issue}</li>`).join('')}
                                    </ul>
                                </div>
                            </div>
                        ` : ''}

                        <div class="screenshots">
                            ${result.screenshots.map((screenshot: string) => `
                                <div class="screenshot">
                                    <img src="${screenshot}" alt="${result.page} screenshot" loading="lazy">
                                    <div class="screenshot-label">${screenshot}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>
    `;
  }
}

// Default configuration
const defaultConfig: TestConfig = {
  baseUrl: 'http://localhost:3000',
  outputDir: '/workspaces/agent-feed/tests/screenshots',
  browsers: ['chromium', 'firefox', 'webkit'],
  viewports: ['mobile-portrait', 'tablet-portrait', 'desktop-small', 'desktop-large'],
  pages: [
    {
      name: 'homepage',
      url: '/',
      waitForSelector: 'body'
    },
    {
      name: 'agents-page',
      url: '/agents',
      waitForSelector: 'body'
    },
    {
      name: 'error-404',
      url: '/non-existent-page',
      waitForSelector: 'body'
    }
  ]
};

// Run if called directly
if (require.main === module) {
  const runner = new UITestRunner(defaultConfig);
  runner.run().catch(console.error);
}

export { UITestRunner, TestConfig };