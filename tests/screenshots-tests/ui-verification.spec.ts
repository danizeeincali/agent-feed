import { test, expect, Page, Browser } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';

interface UITestReport {
  timestamp: string;
  testResults: Array<{
    page: string;
    url: string;
    viewport: string;
    browser: string;
    status: 'pass' | 'fail' | 'error';
    screenshots: string[];
    issues: string[];
    loadTime: number;
    errors: string[];
    accessibility: any;
  }>;
  summary: {
    totalPages: number;
    totalIssues: number;
    passedTests: number;
    failedTests: number;
    avgLoadTime: number;
  };
}

class UIVerificationAgent {
  private report: UITestReport;
  private screenshotDir: string;

  constructor() {
    this.screenshotDir = '/workspaces/agent-feed/tests/screenshots';
    this.report = {
      timestamp: new Date().toISOString(),
      testResults: [],
      summary: {
        totalPages: 0,
        totalIssues: 0,
        passedTests: 0,
        failedTests: 0,
        avgLoadTime: 0
      }
    };
  }

  async ensureScreenshotDir() {
    try {
      await fs.mkdir(this.screenshotDir, { recursive: true });
    } catch (error) {
      console.log('Screenshot directory already exists or error creating:', error);
    }
  }

  async captureFullPageScreenshot(page: Page, name: string, viewport: string, browser: string): Promise<string> {
    const filename = `${name}-${viewport}-${browser}-${Date.now()}.png`;
    const filepath = path.join(this.screenshotDir, filename);

    await page.screenshot({
      path: filepath,
      fullPage: true,
      quality: 95
    });

    return filename;
  }

  async captureViewportScreenshot(page: Page, name: string, viewport: string, browser: string): Promise<string> {
    const filename = `${name}-viewport-${viewport}-${browser}-${Date.now()}.png`;
    const filepath = path.join(this.screenshotDir, filename);

    await page.screenshot({
      path: filepath,
      fullPage: false,
      quality: 95
    });

    return filename;
  }

  async detectErrors(page: Page): Promise<string[]> {
    const errors: string[] = [];

    // Check for console errors
    const consoleMessages = await page.evaluate(() => {
      return (window as any).__playwrightErrors || [];
    });

    // Check for error text content
    const errorSelectors = [
      'text="Internal Server Error"',
      'text="500"',
      'text="Error"',
      '[class*="error"]',
      '[data-testid*="error"]',
      '.error-message',
      '.error-container'
    ];

    for (const selector of errorSelectors) {
      try {
        const errorElement = await page.locator(selector).first();
        if (await errorElement.count() > 0) {
          const errorText = await errorElement.textContent();
          if (errorText) {
            errors.push(`Error found: ${errorText.trim()}`);
          }
        }
      } catch (e) {
        // Selector not found, which is good
      }
    }

    // Check for 404 or error status
    const title = await page.title();
    if (title.includes('404') || title.includes('Error')) {
      errors.push(`Error in page title: ${title}`);
    }

    return errors;
  }

  async analyzeLoadingStates(page: Page): Promise<string[]> {
    const issues: string[] = [];

    // Check for loading indicators that might be stuck
    const loadingSelectors = [
      '[data-testid="loading"]',
      '.loading',
      '.spinner',
      'text="Loading..."',
      '[aria-busy="true"]'
    ];

    for (const selector of loadingSelectors) {
      try {
        const loadingElement = await page.locator(selector).first();
        if (await loadingElement.count() > 0) {
          // Wait a bit to see if loading disappears
          await page.waitForTimeout(2000);
          if (await loadingElement.count() > 0) {
            issues.push(`Persistent loading state found: ${selector}`);
          }
        }
      } catch (e) {
        // Loading selector not found, which is normal
      }
    }

    return issues;
  }

  async discoverNavigation(page: Page): Promise<string[]> {
    const navigationUrls: string[] = [];

    // Look for navigation links
    const navSelectors = [
      'nav a[href]',
      '[role="navigation"] a[href]',
      '.nav-link[href]',
      '.navigation a[href]',
      'header a[href]',
      '.menu a[href]'
    ];

    for (const selector of navSelectors) {
      try {
        const links = await page.locator(selector).all();
        for (const link of links) {
          const href = await link.getAttribute('href');
          if (href && href.startsWith('/') && !href.includes('#')) {
            navigationUrls.push(href);
          }
        }
      } catch (e) {
        // Selector not found
      }
    }

    // Remove duplicates and sort
    return [...new Set(navigationUrls)].sort();
  }

  async testPage(page: Page, url: string, pageName: string, viewport: string, browser: string) {
    const startTime = Date.now();
    const issues: string[] = [];
    const screenshots: string[] = [];
    const errors: string[] = [];

    try {
      console.log(`Testing ${pageName} at ${url} (${viewport} - ${browser})`);

      // Navigate to page
      const response = await page.goto(url, { waitUntil: 'networkidle' });

      if (!response?.ok()) {
        errors.push(`HTTP ${response?.status()}: Failed to load page`);
      }

      // Wait for page to be ready
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000); // Allow for any dynamic content

      // Capture screenshots
      const fullPageScreenshot = await this.captureFullPageScreenshot(page, pageName, viewport, browser);
      const viewportScreenshot = await this.captureViewportScreenshot(page, pageName, viewport, browser);
      screenshots.push(fullPageScreenshot, viewportScreenshot);

      // Detect errors
      const pageErrors = await this.detectErrors(page);
      errors.push(...pageErrors);

      // Check loading states
      const loadingIssues = await this.analyzeLoadingStates(page);
      issues.push(...loadingIssues);

      // Test basic interactions
      try {
        // Test if page is interactive
        await page.mouse.move(100, 100);
        await page.waitForTimeout(500);

        // Check if there are clickable elements
        const buttons = await page.locator('button, [role="button"], a, input[type="submit"]').count();
        if (buttons === 0) {
          issues.push('No interactive elements found');
        }

        // Test scroll behavior
        await page.evaluate(() => window.scrollTo(0, 100));
        await page.waitForTimeout(500);
        await page.evaluate(() => window.scrollTo(0, 0));

      } catch (e) {
        issues.push(`Interaction test failed: ${e}`);
      }

      const loadTime = Date.now() - startTime;

      // Add to report
      this.report.testResults.push({
        page: pageName,
        url,
        viewport,
        browser,
        status: errors.length > 0 ? 'fail' : 'pass',
        screenshots,
        issues,
        loadTime,
        errors,
        accessibility: null // Could add accessibility testing here
      });

      if (errors.length === 0) {
        this.report.summary.passedTests++;
      } else {
        this.report.summary.failedTests++;
      }

      this.report.summary.totalIssues += issues.length + errors.length;

    } catch (error) {
      console.error(`Error testing ${pageName}:`, error);
      this.report.testResults.push({
        page: pageName,
        url,
        viewport,
        browser,
        status: 'error',
        screenshots,
        issues: [`Test execution error: ${error}`],
        loadTime: Date.now() - startTime,
        errors: [String(error)],
        accessibility: null
      });
      this.report.summary.failedTests++;
    }
  }

  async generateReport() {
    this.report.summary.totalPages = this.report.testResults.length;
    this.report.summary.avgLoadTime = this.report.testResults.reduce((sum, result) => sum + result.loadTime, 0) / this.report.testResults.length || 0;

    const reportPath = '/workspaces/agent-feed/tests/screenshots/ui-verification-report.json';
    await fs.writeFile(reportPath, JSON.stringify(this.report, null, 2));

    // Generate HTML report
    const htmlReport = this.generateHTMLReport();
    const htmlReportPath = '/workspaces/agent-feed/tests/screenshots/ui-verification-report.html';
    await fs.writeFile(htmlReportPath, htmlReport);

    console.log('UI Verification Report Generated:');
    console.log(`JSON Report: ${reportPath}`);
    console.log(`HTML Report: ${htmlReportPath}`);
    console.log(`Screenshots saved in: ${this.screenshotDir}`);

    return this.report;
  }

  generateHTMLReport(): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>UI Verification Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .stat { background: #e9ecef; padding: 15px; border-radius: 5px; text-align: center; }
        .test-result { border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 5px; }
        .pass { border-left: 5px solid #28a745; }
        .fail { border-left: 5px solid #dc3545; }
        .error { border-left: 5px solid #ffc107; }
        .screenshots img { max-width: 300px; margin: 5px; border: 1px solid #ddd; }
        .issues { background: #fff3cd; padding: 10px; border-radius: 3px; margin: 10px 0; }
        .errors { background: #f8d7da; padding: 10px; border-radius: 3px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>UI Verification Report</h1>
        <p>Generated: ${this.report.timestamp}</p>
    </div>

    <div class="summary">
        <div class="stat">
            <h3>${this.report.summary.totalPages}</h3>
            <p>Total Pages Tested</p>
        </div>
        <div class="stat">
            <h3>${this.report.summary.passedTests}</h3>
            <p>Passed Tests</p>
        </div>
        <div class="stat">
            <h3>${this.report.summary.failedTests}</h3>
            <p>Failed Tests</p>
        </div>
        <div class="stat">
            <h3>${this.report.summary.totalIssues}</h3>
            <p>Total Issues</p>
        </div>
        <div class="stat">
            <h3>${Math.round(this.report.summary.avgLoadTime)}ms</h3>
            <p>Avg Load Time</p>
        </div>
    </div>

    <div class="results">
        ${this.report.testResults.map(result => `
            <div class="test-result ${result.status}">
                <h3>${result.page} (${result.viewport} - ${result.browser})</h3>
                <p><strong>URL:</strong> ${result.url}</p>
                <p><strong>Load Time:</strong> ${result.loadTime}ms</p>
                <p><strong>Status:</strong> ${result.status.toUpperCase()}</p>

                ${result.errors.length > 0 ? `
                    <div class="errors">
                        <h4>Errors:</h4>
                        <ul>${result.errors.map(error => `<li>${error}</li>`).join('')}</ul>
                    </div>
                ` : ''}

                ${result.issues.length > 0 ? `
                    <div class="issues">
                        <h4>Issues:</h4>
                        <ul>${result.issues.map(issue => `<li>${issue}</li>`).join('')}</ul>
                    </div>
                ` : ''}

                <div class="screenshots">
                    <h4>Screenshots:</h4>
                    ${result.screenshots.map(screenshot => `
                        <img src="${screenshot}" alt="${result.page} screenshot" title="${screenshot}">
                    `).join('')}
                </div>
            </div>
        `).join('')}
    </div>
</body>
</html>
    `;
  }
}

// Test suite
test.describe('UI Verification and Screenshot Capture', () => {
  let agent: UIVerificationAgent;

  test.beforeAll(async () => {
    agent = new UIVerificationAgent();
    await agent.ensureScreenshotDir();
  });

  test.afterAll(async () => {
    const report = await agent.generateReport();
    console.log('Final UI Verification Report:', JSON.stringify(report.summary, null, 2));
  });

  test('Homepage - Main Application', async ({ page, browserName }) => {
    const viewport = page.viewportSize();
    const viewportName = `${viewport?.width}x${viewport?.height}`;
    await agent.testPage(page, '/', 'homepage', viewportName, browserName);
  });

  test('Agents Page', async ({ page, browserName }) => {
    const viewport = page.viewportSize();
    const viewportName = `${viewport?.width}x${viewport?.height}`;
    await agent.testPage(page, '/agents', 'agents-page', viewportName, browserName);
  });

  test('Dynamic Navigation Discovery', async ({ page, browserName }) => {
    const viewport = page.viewportSize();
    const viewportName = `${viewport?.width}x${viewport?.height}`;

    // First go to homepage to discover navigation
    await page.goto('/', { waitUntil: 'networkidle' });
    const navigationUrls = await agent.discoverNavigation(page);

    console.log(`Discovered ${navigationUrls.length} navigation URLs:`, navigationUrls);

    // Test discovered pages (limit to prevent too many tests)
    const urlsToTest = navigationUrls.slice(0, 5);

    for (const url of urlsToTest) {
      const pageName = url.replace('/', '').replace(/\//g, '-') || 'root';
      await agent.testPage(page, url, `nav-${pageName}`, viewportName, browserName);
    }
  });

  test('Error State Testing', async ({ page, browserName }) => {
    const viewport = page.viewportSize();
    const viewportName = `${viewport?.width}x${viewport?.height}`;

    // Test non-existent page to capture 404 state
    await agent.testPage(page, '/non-existent-page', 'error-404', viewportName, browserName);
  });

  test('Loading State Testing', async ({ page, browserName }) => {
    const viewport = page.viewportSize();
    const viewportName = `${viewport?.width}x${viewport?.height}`;

    // Test with slow network to capture loading states
    await page.route('**/*', route => {
      setTimeout(() => route.continue(), 1000); // Delay all requests by 1 second
    });

    await agent.testPage(page, '/', 'loading-states', viewportName, browserName);
  });
});

// Additional responsive design tests
test.describe('Responsive Design Verification', () => {
  const viewports = [
    { width: 320, height: 568, name: 'mobile-small' },
    { width: 375, height: 667, name: 'mobile-medium' },
    { width: 414, height: 896, name: 'mobile-large' },
    { width: 768, height: 1024, name: 'tablet-portrait' },
    { width: 1024, height: 768, name: 'tablet-landscape' },
    { width: 1440, height: 900, name: 'laptop' },
    { width: 1920, height: 1080, name: 'desktop' },
    { width: 2560, height: 1440, name: 'large-desktop' }
  ];

  let agent: UIVerificationAgent;

  test.beforeAll(async () => {
    agent = new UIVerificationAgent();
    await agent.ensureScreenshotDir();
  });

  viewports.forEach(viewport => {
    test(`Responsive test - ${viewport.name}`, async ({ page, browserName }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await agent.testPage(page, '/', `responsive-${viewport.name}`, viewport.name, browserName);
    });
  });
});