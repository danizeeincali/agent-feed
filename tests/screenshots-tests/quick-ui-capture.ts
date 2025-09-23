#!/usr/bin/env node

import { chromium, Page, Browser } from 'playwright';
import { promises as fs } from 'fs';
import path from 'path';

interface PageResult {
  name: string;
  url: string;
  status: 'success' | 'error' | 'not_found';
  loadTime: number;
  screenshots: string[];
  issues: string[];
  errors: string[];
}

class QuickUICapture {
  private browser!: Browser;
  private page!: Page;
  private results: PageResult[] = [];
  private screenshotDir = '/workspaces/agent-feed/tests/screenshots';

  // Comprehensive list of pages from App.tsx
  private readonly pages = [
    { name: 'Homepage (Feed)', url: '/' },
    { name: 'Interactive Control', url: '/interactive-control' },
    { name: 'Claude Manager', url: '/claude-manager' },
    { name: 'Create Post', url: '/posting' },
    { name: 'Mention Demo', url: '/mention-demo' },
    { name: 'Drafts', url: '/drafts' },
    { name: 'Agents', url: '/agents' },
    { name: 'Workflows', url: '/workflows' },
    { name: 'Claude Code', url: '/claude-code' },
    { name: 'Live Activity', url: '/activity' },
    { name: 'Analytics', url: '/analytics' },
    { name: 'Performance Monitor', url: '/performance-monitor' },
    { name: 'Settings', url: '/settings' },
    { name: 'Dashboard', url: '/dashboard' },
    { name: 'Debug Posts', url: '/debug-posts' },
    { name: 'Mention Debug', url: '/mention-debug' },
    { name: '404 Error Page', url: '/non-existent-page' }
  ];

  async init() {
    console.log('🚀 Initializing Quick UI Capture...');

    // Ensure screenshot directory exists
    await fs.mkdir(this.screenshotDir, { recursive: true });

    // Launch browser
    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows'
      ]
    });

    const context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });

    this.page = await context.newPage();

    // Enable console logging
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`Console Error: ${msg.text()}`);
      }
    });

    this.page.on('pageerror', error => {
      console.log(`Page Error: ${error.message}`);
    });
  }

  async captureAllPages() {
    console.log(`📸 Capturing ${this.pages.length} pages...`);

    for (let i = 0; i < this.pages.length; i++) {
      const pageConfig = this.pages[i];
      console.log(`[${i + 1}/${this.pages.length}] Testing: ${pageConfig.name}`);

      await this.capturePage(pageConfig);

      // Add delay between pages to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  async capturePage(pageConfig: { name: string; url: string }) {
    const startTime = Date.now();
    const result: PageResult = {
      name: pageConfig.name,
      url: pageConfig.url,
      status: 'success',
      loadTime: 0,
      screenshots: [],
      issues: [],
      errors: []
    };

    try {
      const baseUrl = 'http://localhost:3000';
      const fullUrl = `${baseUrl}${pageConfig.url}`;

      // Navigate to page
      const response = await this.page.goto(fullUrl, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      if (!response || !response.ok()) {
        result.status = 'error';
        result.errors.push(`HTTP ${response?.status()}: Failed to load page`);

        if (response?.status() === 404) {
          result.status = 'not_found';
        }
      }

      // Wait for React to render
      await this.page.waitForTimeout(3000);

      // Check for error content
      const pageContent = await this.page.content();

      if (pageContent.includes('404') && pageConfig.url !== '/non-existent-page') {
        result.status = 'not_found';
        result.errors.push('Page shows 404 error');
      }

      if (pageContent.includes('Internal Server Error') || pageContent.includes('"statusCode":500')) {
        result.status = 'error';
        result.errors.push('Internal Server Error detected (Status 500)');
      }

      // Check for loading states
      try {
        const loadingElements = await this.page.locator('[aria-busy="true"], .loading, .spinner, text="Loading..."').count();
        if (loadingElements > 0) {
          result.issues.push(`${loadingElements} loading indicators still visible`);
        }
      } catch (e) {
        // Ignore
      }

      // Check for error elements
      try {
        const errorElements = await this.page.locator('[class*="error"], [data-testid*="error"], text="Error"').count();
        if (errorElements > 0) {
          result.issues.push(`${errorElements} error elements found`);
        }
      } catch (e) {
        // Ignore
      }

      // Capture screenshots
      const safeName = pageConfig.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();

      // Full page screenshot
      const fullPagePath = path.join(this.screenshotDir, `${safeName}-fullpage.png`);
      await this.page.screenshot({
        path: fullPagePath,
        fullPage: true,
        quality: 90
      });
      result.screenshots.push(`${safeName}-fullpage.png`);

      // Viewport screenshot
      const viewportPath = path.join(this.screenshotDir, `${safeName}-viewport.png`);
      await this.page.screenshot({
        path: viewportPath,
        fullPage: false,
        quality: 90
      });
      result.screenshots.push(`${safeName}-viewport.png`);

      result.loadTime = Date.now() - startTime;

      // Log result
      const statusIcon = result.status === 'success' ? '✅' : result.status === 'not_found' ? '🔍' : '❌';
      console.log(`  ${statusIcon} ${result.loadTime}ms - ${result.errors.length} errors, ${result.issues.length} issues`);

    } catch (error) {
      result.status = 'error';
      result.errors.push(`Capture failed: ${error}`);
      result.loadTime = Date.now() - startTime;
      console.log(`  ❌ ${result.loadTime}ms - ${error}`);
    }

    this.results.push(result);
  }

  async generateReport() {
    const timestamp = new Date().toISOString();
    const successCount = this.results.filter(r => r.status === 'success').length;
    const errorCount = this.results.filter(r => r.status === 'error').length;
    const notFoundCount = this.results.filter(r => r.status === 'not_found').length;
    const totalIssues = this.results.reduce((sum, r) => sum + r.issues.length, 0);
    const totalErrors = this.results.reduce((sum, r) => sum + r.errors.length, 0);
    const avgLoadTime = this.results.reduce((sum, r) => sum + r.loadTime, 0) / this.results.length;

    const report = {
      timestamp,
      summary: {
        totalPages: this.results.length,
        successfulPages: successCount,
        errorPages: errorCount,
        notFoundPages: notFoundCount,
        totalIssues,
        totalErrors,
        avgLoadTime: Math.round(avgLoadTime)
      },
      results: this.results
    };

    // Save JSON report
    const jsonPath = path.join(this.screenshotDir, 'quick-ui-report.json');
    await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));

    // Generate HTML report
    const htmlReport = this.generateHTMLReport(report);
    const htmlPath = path.join(this.screenshotDir, 'quick-ui-report.html');
    await fs.writeFile(htmlPath, htmlReport);

    console.log('\n📊 UI Capture Report Generated:');
    console.log(`   JSON: ${jsonPath}`);
    console.log(`   HTML: ${htmlPath}`);
    console.log(`   Screenshots: ${this.screenshotDir}`);

    console.log('\n📈 Summary:');
    console.log(`   Total pages: ${report.summary.totalPages}`);
    console.log(`   Successful: ${report.summary.successfulPages}`);
    console.log(`   Errors: ${report.summary.errorPages}`);
    console.log(`   Not found: ${report.summary.notFoundPages}`);
    console.log(`   Total issues: ${report.summary.totalIssues}`);
    console.log(`   Total errors: ${report.summary.totalErrors}`);
    console.log(`   Average load time: ${report.summary.avgLoadTime}ms`);

    return report;
  }

  generateHTMLReport(report: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Quick UI Capture Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f7fa;
            line-height: 1.6;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        .header h1 { margin: 0 0 10px 0; font-size: 2.5em; font-weight: 700; }
        .header p { margin: 0; opacity: 0.9; font-size: 1.1em; }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 30px;
            padding: 40px;
            background: #f8f9fa;
        }
        .stat {
            background: white;
            padding: 25px;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            border-left: 5px solid #667eea;
        }
        .stat h3 { margin: 0 0 10px 0; font-size: 2.5em; color: #2d3748; font-weight: 700; }
        .stat p { margin: 0; color: #718096; font-weight: 500; font-size: 1.1em; }
        .results { padding: 40px; }
        .results h2 { margin: 0 0 30px 0; color: #2d3748; font-size: 2em; }
        .page-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 25px;
        }
        .page-card {
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            overflow: hidden;
            background: white;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .page-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 25px rgba(0,0,0,0.1);
        }
        .page-header {
            padding: 20px;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #f8f9fa;
        }
        .page-title { font-weight: 600; color: #2d3748; font-size: 1.2em; }
        .page-url { color: #718096; font-size: 0.9em; margin-top: 5px; }
        .status-badge {
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: 600;
            text-transform: uppercase;
        }
        .status-success { background: #c6f6d5; color: #22543d; }
        .status-error { background: #fed7d7; color: #742a2a; }
        .status-not_found { background: #fefcbf; color: #744210; }
        .page-content { padding: 20px; }
        .screenshots {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 20px;
        }
        .screenshot {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            overflow: hidden;
        }
        .screenshot img {
            width: 100%;
            height: 150px;
            object-fit: cover;
            display: block;
        }
        .screenshot-label {
            padding: 8px 12px;
            background: #f8f9fa;
            font-size: 0.85em;
            color: #718096;
            text-align: center;
        }
        .issues, .errors { margin-top: 15px; }
        .issues h4, .errors h4 {
            margin: 0 0 10px 0;
            font-size: 1em;
            color: #2d3748;
        }
        .error-list {
            background: #fed7d7;
            border: 1px solid #f56565;
            border-radius: 6px;
            padding: 12px;
            font-size: 0.9em;
        }
        .issue-list {
            background: #fefcbf;
            border: 1px solid #ecc94b;
            border-radius: 6px;
            padding: 12px;
            font-size: 0.9em;
        }
        .error-list ul, .issue-list ul { margin: 0; padding-left: 20px; }
        .error-list li, .issue-list li { margin-bottom: 5px; }
        .load-time {
            font-weight: 600;
            color: #667eea;
            font-size: 0.9em;
        }
        .no-issues {
            color: #38a169;
            font-style: italic;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Quick UI Capture Report</h1>
            <p>Generated: ${report.timestamp}</p>
        </div>

        <div class="summary">
            <div class="stat">
                <h3>${report.summary.totalPages}</h3>
                <p>Total Pages</p>
            </div>
            <div class="stat">
                <h3>${report.summary.successfulPages}</h3>
                <p>Successful</p>
            </div>
            <div class="stat">
                <h3>${report.summary.errorPages}</h3>
                <p>Errors</p>
            </div>
            <div class="stat">
                <h3>${report.summary.notFoundPages}</h3>
                <p>Not Found</p>
            </div>
            <div class="stat">
                <h3>${report.summary.avgLoadTime}ms</h3>
                <p>Avg Load Time</p>
            </div>
            <div class="stat">
                <h3>${report.summary.totalIssues + report.summary.totalErrors}</h3>
                <p>Total Issues</p>
            </div>
        </div>

        <div class="results">
            <h2>Page Results</h2>
            <div class="page-grid">
                ${report.results.map((result: any) => `
                    <div class="page-card">
                        <div class="page-header">
                            <div>
                                <div class="page-title">${result.name}</div>
                                <div class="page-url">${result.url}</div>
                            </div>
                            <div>
                                <span class="status-badge status-${result.status}">
                                    ${result.status.replace('_', ' ')}
                                </span>
                                <div class="load-time">${result.loadTime}ms</div>
                            </div>
                        </div>
                        <div class="page-content">
                            <div class="screenshots">
                                ${result.screenshots.map((screenshot: string) => `
                                    <div class="screenshot">
                                        <img src="${screenshot}" alt="${result.name} screenshot" loading="lazy">
                                        <div class="screenshot-label">${screenshot.includes('fullpage') ? 'Full Page' : 'Viewport'}</div>
                                    </div>
                                `).join('')}
                            </div>

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
                            ` : `
                                <div class="no-issues">✅ No issues detected</div>
                            `}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    </div>
</body>
</html>
    `;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Run the capture
async function main() {
  const capture = new QuickUICapture();

  try {
    await capture.init();
    await capture.captureAllPages();
    const report = await capture.generateReport();

    // Print key findings
    const criticalErrors = report.results.filter((r: any) => r.status === 'error' && !r.url.includes('non-existent')).length;
    const workingPages = report.results.filter((r: any) => r.status === 'success').length;

    console.log('\n🎯 KEY FINDINGS:');
    console.log(`   ✅ ${workingPages} pages are working correctly`);
    console.log(`   ❌ ${criticalErrors} pages have critical errors`);

    if (criticalErrors === 0) {
      console.log('\n🎉 All application pages are functional!');
    } else {
      console.log('\n⚠️  Some pages need attention - check the report for details');
    }

  } catch (error) {
    console.error('❌ Capture failed:', error);
  } finally {
    await capture.cleanup();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export default QuickUICapture;