/**
 * Comprehensive Analytics Page Debug Script
 * Captures all potential causes of white screen issues
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

class AnalyticsPageDebugger {
  constructor() {
    this.errors = [];
    this.networkRequests = [];
    this.consoleMessages = [];
    this.componentErrors = [];
    this.failedResources = [];
    this.reactMountingIssues = [];
    this.importErrors = [];
  }

  async debug() {
    console.log('🔍 Starting Analytics Page Debug Session...');

    const browser = await chromium.launch({
      headless: false,
      slowMo: 1000,
      devtools: true,
      args: [
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--enable-logging',
        '--v=1'
      ]
    });

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      recordVideo: {
        dir: './debug-videos/',
        size: { width: 1920, height: 1080 }
      }
    });

    const page = await context.newPage();

    // Enable detailed logging
    await page.addInitScript(() => {
      // Override console methods to capture all logs
      const originalLog = console.log;
      const originalError = console.error;
      const originalWarn = console.warn;

      window.debugLogs = [];

      console.log = (...args) => {
        window.debugLogs.push({ type: 'log', args, timestamp: Date.now() });
        originalLog.apply(console, args);
      };

      console.error = (...args) => {
        window.debugLogs.push({ type: 'error', args, timestamp: Date.now() });
        originalError.apply(console, args);
      };

      console.warn = (...args) => {
        window.debugLogs.push({ type: 'warn', args, timestamp: Date.now() });
        originalWarn.apply(console, args);
      };

      // Capture React errors
      window.addEventListener('error', (event) => {
        window.debugLogs.push({
          type: 'globalError',
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error?.stack,
          timestamp: Date.now()
        });
      });

      // Capture unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        window.debugLogs.push({
          type: 'unhandledRejection',
          reason: event.reason,
          promise: event.promise,
          timestamp: Date.now()
        });
      });
    });

    // Listen to all console messages
    page.on('console', (msg) => {
      const message = {
        type: msg.type(),
        text: msg.text(),
        location: msg.location(),
        timestamp: Date.now()
      };
      this.consoleMessages.push(message);
      console.log(`📝 Console [${msg.type()}]:`, msg.text());
    });

    // Listen to all page errors
    page.on('pageerror', (error) => {
      const errorInfo = {
        message: error.message,
        stack: error.stack,
        name: error.name,
        timestamp: Date.now()
      };
      this.errors.push(errorInfo);
      console.log('❌ Page Error:', error.message);
    });

    // Monitor network requests
    page.on('request', (request) => {
      const requestInfo = {
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        resourceType: request.resourceType(),
        timestamp: Date.now()
      };
      this.networkRequests.push({ ...requestInfo, type: 'request' });
      console.log(`🌐 Request: ${request.method()} ${request.url()}`);
    });

    page.on('response', (response) => {
      const responseInfo = {
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
        headers: response.headers(),
        timestamp: Date.now()
      };
      this.networkRequests.push({ ...responseInfo, type: 'response' });

      if (response.status() >= 400) {
        console.log(`🚨 Failed Request: ${response.status()} ${response.url()}`);
        this.failedResources.push(responseInfo);
      }
    });

    // Monitor failed requests
    page.on('requestfailed', (request) => {
      const failureInfo = {
        url: request.url(),
        method: request.method(),
        failure: request.failure(),
        timestamp: Date.now()
      };
      this.failedResources.push(failureInfo);
      console.log(`💥 Request Failed: ${request.url()} - ${request.failure()?.errorText}`);
    });

    try {
      console.log('🚀 Navigating to analytics page...');

      // Navigate with extended timeout and wait for network idle
      await page.goto('http://127.0.0.1:5173/analytics', {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // Wait for potential React components to mount
      await page.waitForTimeout(3000);

      // Check if page is blank
      const bodyContent = await page.evaluate(() => {
        const body = document.body;
        return {
          innerHTML: body.innerHTML,
          textContent: body.textContent?.trim(),
          childElementCount: body.childElementCount,
          hasReactRoot: !!document.getElementById('root'),
          reactRootContent: document.getElementById('root')?.innerHTML || 'NO ROOT FOUND'
        };
      });

      // Capture React-specific debugging info
      const reactDebugInfo = await page.evaluate(() => {
        const reactInfo = {
          reactVersion: window.React?.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED?.ReactCurrentActQueue || 'React not detected',
          reactDevTools: !!window.__REACT_DEVTOOLS_GLOBAL_HOOK__,
          reactErrors: [],
          componentStack: [],
          errorBoundaries: []
        };

        // Check for React error boundaries
        const errorBoundaryElements = document.querySelectorAll('[data-react-error-boundary]');
        reactInfo.errorBoundaries = Array.from(errorBoundaryElements).map(el => ({
          tagName: el.tagName,
          className: el.className,
          id: el.id,
          textContent: el.textContent?.substring(0, 200)
        }));

        // Check for common React error indicators
        const errorIndicators = [
          'Something went wrong',
          'Error Boundary',
          'Component Error',
          'Failed to render',
          'React Error'
        ];

        errorIndicators.forEach(indicator => {
          if (document.body.textContent?.includes(indicator)) {
            reactInfo.reactErrors.push({
              indicator,
              found: true,
              context: document.body.textContent?.substring(
                Math.max(0, document.body.textContent.indexOf(indicator) - 100),
                document.body.textContent.indexOf(indicator) + 100
              )
            });
          }
        });

        return reactInfo;
      });

      // Capture all browser logs that were collected by our init script
      const browserLogs = await page.evaluate(() => window.debugLogs || []);

      // Check for import/module errors
      const moduleErrors = browserLogs.filter(log =>
        log.type === 'error' && (
          JSON.stringify(log.args).includes('import') ||
          JSON.stringify(log.args).includes('module') ||
          JSON.stringify(log.args).includes('Cannot resolve') ||
          JSON.stringify(log.args).includes('404')
        )
      );

      // Take a screenshot for visual debugging
      await page.screenshot({
        path: './debug-analytics-screenshot.png',
        fullPage: true
      });

      // Generate comprehensive report
      const debugReport = {
        timestamp: new Date().toISOString(),
        pageInfo: {
          url: page.url(),
          title: await page.title(),
          bodyContent,
          reactDebugInfo
        },
        errors: {
          pageErrors: this.errors,
          consoleErrors: this.consoleMessages.filter(msg => msg.type === 'error'),
          moduleErrors,
          componentErrors: this.componentErrors,
          reactMountingIssues: this.reactMountingIssues
        },
        network: {
          totalRequests: this.networkRequests.filter(req => req.type === 'request').length,
          failedRequests: this.failedResources,
          slowRequests: this.networkRequests.filter(req =>
            req.type === 'response' && req.timestamp > Date.now() - 5000
          )
        },
        logs: {
          allConsoleMessages: this.consoleMessages,
          browserLogs,
          errorCount: this.consoleMessages.filter(msg => msg.type === 'error').length,
          warningCount: this.consoleMessages.filter(msg => msg.type === 'warning').length
        },
        analysis: this.analyzeIssues(bodyContent, this.errors, this.failedResources, moduleErrors)
      };

      // Save detailed report
      fs.writeFileSync(
        './analytics-debug-report.json',
        JSON.stringify(debugReport, null, 2)
      );

      // Generate human-readable summary
      this.generateSummaryReport(debugReport);

      console.log('📊 Debug session completed. Check analytics-debug-report.json and summary.md');

    } catch (error) {
      console.error('🚨 Debug session failed:', error);
      this.errors.push({
        message: error.message,
        stack: error.stack,
        type: 'debug-session-error',
        timestamp: Date.now()
      });
    } finally {
      await context.close();
      await browser.close();
    }
  }

  analyzeIssues(bodyContent, errors, failedResources, moduleErrors) {
    const analysis = {
      likelyIssues: [],
      severity: 'unknown',
      recommendations: []
    };

    // Check if page is completely blank
    if (!bodyContent.textContent || bodyContent.textContent.length < 10) {
      analysis.likelyIssues.push({
        type: 'blank_page',
        severity: 'critical',
        description: 'Page appears to be completely blank',
        possibleCauses: [
          'JavaScript errors preventing React from mounting',
          'Missing or broken main bundle',
          'CSS issues hiding all content',
          'Router configuration problems'
        ]
      });
      analysis.severity = 'critical';
    }

    // Analyze JavaScript errors
    if (errors.length > 0) {
      analysis.likelyIssues.push({
        type: 'javascript_errors',
        severity: 'high',
        description: `Found ${errors.length} JavaScript error(s)`,
        errors: errors.map(err => ({
          message: err.message,
          stack: err.stack?.substring(0, 500)
        }))
      });
    }

    // Analyze module/import errors
    if (moduleErrors.length > 0) {
      analysis.likelyIssues.push({
        type: 'module_errors',
        severity: 'high',
        description: `Found ${moduleErrors.length} module/import error(s)`,
        errors: moduleErrors
      });
    }

    // Analyze failed network requests
    if (failedResources.length > 0) {
      analysis.likelyIssues.push({
        type: 'network_failures',
        severity: 'medium',
        description: `Found ${failedResources.length} failed network request(s)`,
        failures: failedResources
      });
    }

    // Generate recommendations
    if (analysis.likelyIssues.length === 0) {
      analysis.recommendations.push('No obvious issues found. The problem might be related to specific component logic or styling.');
    } else {
      analysis.recommendations.push('Check browser console for detailed error messages');
      analysis.recommendations.push('Verify all dependencies are installed (npm install)');
      analysis.recommendations.push('Check if the development server is running correctly');
      analysis.recommendations.push('Examine React component mounting and error boundaries');
    }

    return analysis;
  }

  generateSummaryReport(debugReport) {
    const summary = `# Analytics Page Debug Report

Generated: ${debugReport.timestamp}

## Quick Summary
- **Page Status**: ${debugReport.pageInfo.bodyContent.textContent ? 'Content Found' : '⚠️ BLANK PAGE'}
- **Total Errors**: ${debugReport.errors.pageErrors.length + debugReport.errors.consoleErrors.length}
- **Failed Requests**: ${debugReport.network.failedRequests.length}
- **React Root**: ${debugReport.pageInfo.bodyContent.hasReactRoot ? '✅ Found' : '❌ Missing'}

## Critical Issues

${debugReport.analysis.likelyIssues.map(issue => `
### ${issue.type.toUpperCase()} (${issue.severity})
${issue.description}

**Possible Causes:**
${issue.possibleCauses ? issue.possibleCauses.map(cause => `- ${cause}`).join('\n') : 'See detailed report for specifics'}
`).join('\n')}

## Error Details

### JavaScript Errors
${debugReport.errors.pageErrors.map((error, i) => `
${i + 1}. **${error.name || 'Error'}**: ${error.message}
   - File: ${error.filename || 'Unknown'}
   - Line: ${error.lineno || 'Unknown'}
   - Stack: \`${error.stack?.substring(0, 200) || 'No stack trace'}...\`
`).join('\n')}

### Console Errors
${debugReport.errors.consoleErrors.map((msg, i) => `
${i + 1}. **[${msg.type}]** ${msg.text}
   - Location: ${msg.location?.url || 'Unknown'}:${msg.location?.lineNumber || '?'}
`).join('\n')}

### Failed Network Requests
${debugReport.network.failedRequests.map((req, i) => `
${i + 1}. **${req.status || 'FAILED'}** ${req.url}
   - Status: ${req.status || 'Network Error'}
   - Error: ${req.failure?.errorText || req.statusText || 'Unknown'}
`).join('\n')}

## Recommendations

${debugReport.analysis.recommendations.map(rec => `- ${rec}`).join('\n')}

## Page Content Analysis
- Body HTML Length: ${debugReport.pageInfo.bodyContent.innerHTML?.length || 0} characters
- Text Content: "${debugReport.pageInfo.bodyContent.textContent?.substring(0, 200) || 'EMPTY'}..."
- Child Elements: ${debugReport.pageInfo.bodyContent.childElementCount}
- React Root Content: "${debugReport.pageInfo.bodyContent.reactRootContent?.substring(0, 200) || 'EMPTY'}..."

---
*Full details available in analytics-debug-report.json*
`;

    fs.writeFileSync('./analytics-debug-summary.md', summary);
  }
}

// Run the debugger
if (require.main === module) {
  const debuggerInstance = new AnalyticsPageDebugger();
  debuggerInstance.debug().catch(console.error);
}

export default AnalyticsPageDebugger;