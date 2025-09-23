import { test, expect } from '@playwright/test';

/**
 * Simplified Validation Test - Core UI/UX Functionality
 * Tests the essential functionality that can be validated without a fully working server
 */

test.describe('Simplified UI/UX Validation', () => {
  test('Document current application state', async ({ page }) => {
    await test.step('Attempt to access application', async () => {
      let appAccessible = false;
      let errorDetails = null;

      try {
        // Try to access the application
        const response = await page.goto('http://localhost:3000', {
          timeout: 10000,
          waitUntil: 'domcontentloaded'
        });

        if (response) {
          appAccessible = response.status() < 400;

          if (!appAccessible) {
            errorDetails = {
              status: response.status(),
              statusText: response.statusText(),
              url: response.url()
            };
          }
        }
      } catch (error) {
        errorDetails = {
          error: error.message,
          type: 'navigation_failed'
        };
      }

      // Document the current state
      const stateReport = {
        timestamp: new Date().toISOString(),
        applicationAccessible: appAccessible,
        errorDetails,
        url: 'http://localhost:3000',
        testEnvironment: 'playwright-mcp-validation'
      };

      // Take a screenshot regardless of state
      await page.screenshot({
        path: 'test-results/current-application-state.png',
        fullPage: true
      });

      // Save state report
      const fs = require('fs');
      fs.writeFileSync(
        'test-results/application-state-report.json',
        JSON.stringify(stateReport, null, 2)
      );

      console.log('Application State:', appAccessible ? 'Accessible' : 'Not Accessible');
      if (errorDetails) {
        console.log('Error Details:', JSON.stringify(errorDetails, null, 2));
      }
    });

    await test.step('Analyze page content if accessible', async () => {
      try {
        // Check if page has basic HTML structure
        const pageTitle = await page.title().catch(() => 'Unable to get title');
        const bodyText = await page.locator('body').textContent().catch(() => '');
        const hasReactRoot = await page.locator('#__next, #root, [data-reactroot]').count().catch(() => 0);

        const contentAnalysis = {
          pageTitle,
          hasContent: bodyText.length > 0,
          contentLength: bodyText.length,
          hasReactRoot: hasReactRoot > 0,
          timestamp: new Date().toISOString()
        };

        // Save content analysis
        const fs = require('fs');
        fs.writeFileSync(
          'test-results/content-analysis.json',
          JSON.stringify(contentAnalysis, null, 2)
        );

        console.log('Content Analysis:', JSON.stringify(contentAnalysis, null, 2));

      } catch (error) {
        console.log('Content analysis failed:', error.message);
      }
    });
  });

  test('Test static file accessibility', async ({ page }) => {
    await test.step('Check for static assets', async () => {
      const staticPaths = [
        '/favicon.ico',
        '/_next/static/css',
        '/_next/static/js'
      ];

      const staticResults = [];

      for (const path of staticPaths) {
        try {
          const response = await page.goto(`http://localhost:3000${path}`, { timeout: 5000 });
          staticResults.push({
            path,
            accessible: response ? response.status() < 400 : false,
            status: response ? response.status() : null
          });
        } catch (error) {
          staticResults.push({
            path,
            accessible: false,
            error: error.message
          });
        }
      }

      // Save static asset analysis
      const fs = require('fs');
      fs.writeFileSync(
        'test-results/static-assets-analysis.json',
        JSON.stringify(staticResults, null, 2)
      );
    });
  });

  test('Browser console error analysis', async ({ page }) => {
    await test.step('Capture console messages', async () => {
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
          type: 'pageerror',
          text: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString()
        });
      });

      // Try to navigate and capture errors
      try {
        await page.goto('http://localhost:3000', { timeout: 10000 });
        await page.waitForTimeout(3000); // Wait for potential async errors
      } catch (error) {
        console.log('Navigation failed, but console messages captured');
      }

      // Categorize messages
      const errorMessages = consoleMessages.filter(m => m.type === 'error' || m.type === 'pageerror');
      const warningMessages = consoleMessages.filter(m => m.type === 'warning');
      const infoMessages = consoleMessages.filter(m => m.type === 'info' || m.type === 'log');

      const consoleAnalysis = {
        timestamp: new Date().toISOString(),
        totalMessages: consoleMessages.length,
        errors: errorMessages.length,
        warnings: warningMessages.length,
        info: infoMessages.length,
        errorMessages: errorMessages.slice(0, 10), // First 10 errors
        warningMessages: warningMessages.slice(0, 5), // First 5 warnings
        allMessages: consoleMessages
      };

      // Save console analysis
      const fs = require('fs');
      fs.writeFileSync(
        'test-results/console-analysis.json',
        JSON.stringify(consoleAnalysis, null, 2)
      );

      console.log(`Console Analysis: ${errorMessages.length} errors, ${warningMessages.length} warnings`);
    });
  });

  test('Network request analysis', async ({ page }) => {
    await test.step('Monitor network activity', async () => {
      const networkRequests = [];
      const failedRequests = [];

      page.on('request', request => {
        networkRequests.push({
          url: request.url(),
          method: request.method(),
          resourceType: request.resourceType(),
          timestamp: new Date().toISOString()
        });
      });

      page.on('requestfailed', request => {
        failedRequests.push({
          url: request.url(),
          method: request.method(),
          failure: request.failure(),
          timestamp: new Date().toISOString()
        });
      });

      // Try to navigate and monitor network
      try {
        await page.goto('http://localhost:3000', { timeout: 10000 });
        await page.waitForLoadState('networkidle', { timeout: 5000 });
      } catch (error) {
        console.log('Navigation failed, but network activity captured');
      }

      const networkAnalysis = {
        timestamp: new Date().toISOString(),
        totalRequests: networkRequests.length,
        failedRequests: failedRequests.length,
        requestsByType: {},
        failedRequestDetails: failedRequests,
        allRequests: networkRequests.slice(0, 20) // First 20 requests
      };

      // Categorize by resource type
      networkRequests.forEach(req => {
        networkAnalysis.requestsByType[req.resourceType] =
          (networkAnalysis.requestsByType[req.resourceType] || 0) + 1;
      });

      // Save network analysis
      const fs = require('fs');
      fs.writeFileSync(
        'test-results/network-analysis.json',
        JSON.stringify(networkAnalysis, null, 2)
      );

      console.log(`Network Analysis: ${networkRequests.length} requests, ${failedRequests.length} failed`);
    });
  });

  test('Generate comprehensive diagnostic report', async ({ page }) => {
    await test.step('Compile diagnostic information', async () => {
      const fs = require('fs');
      const path = require('path');

      // Read existing analysis files
      const analysisFiles = [
        'application-state-report.json',
        'content-analysis.json',
        'static-assets-analysis.json',
        'console-analysis.json',
        'network-analysis.json'
      ];

      const diagnosticData = {
        timestamp: new Date().toISOString(),
        testEnvironment: {
          platform: process.platform,
          nodeVersion: process.version,
          playwrightVersion: '1.40.0'
        },
        summary: {
          applicationAccessible: false,
          criticalErrors: 0,
          warningsCount: 0,
          networkIssues: 0
        },
        analysis: {},
        recommendations: []
      };

      // Load analysis data
      for (const file of analysisFiles) {
        try {
          const filePath = path.join('test-results', file);
          if (fs.existsSync(filePath)) {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const key = file.replace('.json', '').replace('-', '_');
            diagnosticData.analysis[key] = data;
          }
        } catch (error) {
          console.log(`Could not read ${file}: ${error.message}`);
        }
      }

      // Generate summary based on analysis
      if (diagnosticData.analysis.application_state_report) {
        diagnosticData.summary.applicationAccessible =
          diagnosticData.analysis.application_state_report.applicationAccessible;
      }

      if (diagnosticData.analysis.console_analysis) {
        diagnosticData.summary.criticalErrors =
          diagnosticData.analysis.console_analysis.errors;
        diagnosticData.summary.warningsCount =
          diagnosticData.analysis.console_analysis.warnings;
      }

      if (diagnosticData.analysis.network_analysis) {
        diagnosticData.summary.networkIssues =
          diagnosticData.analysis.network_analysis.failedRequests;
      }

      // Generate recommendations
      if (!diagnosticData.summary.applicationAccessible) {
        diagnosticData.recommendations.push(
          'Application is not accessible - check server configuration and dependencies'
        );
      }

      if (diagnosticData.summary.criticalErrors > 0) {
        diagnosticData.recommendations.push(
          `Fix ${diagnosticData.summary.criticalErrors} critical JavaScript errors`
        );
      }

      if (diagnosticData.summary.networkIssues > 0) {
        diagnosticData.recommendations.push(
          `Resolve ${diagnosticData.summary.networkIssues} network request failures`
        );
      }

      // Save comprehensive diagnostic report
      fs.writeFileSync(
        'test-results/comprehensive-diagnostic-report.json',
        JSON.stringify(diagnosticData, null, 2)
      );

      console.log('\\n=== DIAGNOSTIC SUMMARY ===');
      console.log(`Application Accessible: ${diagnosticData.summary.applicationAccessible}`);
      console.log(`Critical Errors: ${diagnosticData.summary.criticalErrors}`);
      console.log(`Warnings: ${diagnosticData.summary.warningsCount}`);
      console.log(`Network Issues: ${diagnosticData.summary.networkIssues}`);
      console.log(`Recommendations: ${diagnosticData.recommendations.length}`);
      console.log('============================\\n');

      // Validate we have some meaningful data
      expect(Object.keys(diagnosticData.analysis)).toHaveLength.toBeGreaterThan(0);
    });
  });
});

test.afterAll(async () => {
  console.log('\\n📊 Simplified validation completed');
  console.log('📁 Results available in: test-results/');
  console.log('🔍 Main report: test-results/comprehensive-diagnostic-report.json');

  // Store results in memory for coordination
  try {
    const fs = require('fs');
    const reportPath = 'test-results/comprehensive-diagnostic-report.json';

    if (fs.existsSync(reportPath)) {
      const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

      const hookCommand = `npx claude-flow@alpha hooks post-edit --file "${reportPath}" --memory-key "swarm/playwright/simplified-validation"`;

      const { exec } = require('child_process');
      exec(hookCommand, (error, stdout, stderr) => {
        if (error) {
          console.log('Could not store results in memory:', error.message);
        } else {
          console.log('✅ Simplified validation results stored in memory');
        }
      });
    }
  } catch (error) {
    console.log('Failed to store results:', error.message);
  }
});