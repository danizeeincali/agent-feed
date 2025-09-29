import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Agent Feed Application Screenshot Evidence', () => {
  let screenshotDir;
  let consoleErrors = [];
  let networkErrors = [];
  let evidenceReport = {
    timestamp: new Date().toISOString(),
    testRun: 'playwright-screenshot-evidence',
    results: {},
    errors: {
      console: [],
      network: [],
      runtime: []
    }
  };

  test.beforeAll(async () => {
    screenshotDir = path.join(__dirname, 'screenshots', 'api-fix');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    // Reset error collectors
    consoleErrors = [];
    networkErrors = [];

    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const error = {
          timestamp: new Date().toISOString(),
          message: msg.text(),
          location: msg.location()
        };
        consoleErrors.push(error);
        evidenceReport.errors.console.push(error);
      }
    });

    // Listen for network errors
    page.on('response', response => {
      if (response.status() >= 400) {
        const error = {
          timestamp: new Date().toISOString(),
          url: response.url(),
          status: response.status(),
          statusText: response.statusText(),
          method: response.request().method()
        };
        networkErrors.push(error);
        evidenceReport.errors.network.push(error);
      }
    });

    // Listen for page errors
    page.on('pageerror', error => {
      const errorInfo = {
        timestamp: new Date().toISOString(),
        message: error.message,
        stack: error.stack
      };
      evidenceReport.errors.runtime.push(errorInfo);
    });
  });

  test('Capture homepage loading and state', async ({ page }) => {
    console.log('🔍 Starting homepage documentation...');

    try {
      // Navigate to homepage
      await page.goto('http://localhost:5173', {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // Wait for application to potentially load
      await page.waitForTimeout(3000);

      // Capture initial load screenshot
      const homepageScreenshot = path.join(screenshotDir, 'homepage-initial-load.png');
      await page.screenshot({
        path: homepageScreenshot,
        fullPage: true
      });

      console.log('📸 Homepage initial load screenshot captured');

      // Check if there's any content loaded
      const bodyText = await page.textContent('body');
      const hasContent = bodyText && bodyText.trim().length > 50;

      // Try to find common React app indicators
      const reactRoot = await page.locator('#root, #app, .app, [data-reactroot]').count();
      const hasReactIndicators = reactRoot > 0;

      // Check for loading states
      const loadingIndicators = await page.locator('[data-testid*="loading"], .loading, .spinner, .loader').count();
      const hasLoadingStates = loadingIndicators > 0;

      // Capture page title and meta information
      const pageTitle = await page.title();
      const pageUrl = page.url();

      // Document results
      evidenceReport.results.homepage = {
        url: pageUrl,
        title: pageTitle,
        hasContent,
        hasReactIndicators,
        hasLoadingStates,
        screenshot: homepageScreenshot,
        consoleErrors: consoleErrors.length,
        networkErrors: networkErrors.length,
        bodyLength: bodyText ? bodyText.length : 0
      };

      console.log(`📊 Homepage analysis: Content=${hasContent}, React=${hasReactIndicators}, Loading=${hasLoadingStates}`);

    } catch (error) {
      console.error('❌ Homepage capture failed:', error.message);
      evidenceReport.results.homepage = {
        error: error.message,
        failed: true
      };

      // Try to capture error state anyway
      try {
        await page.screenshot({
          path: path.join(screenshotDir, 'homepage-error-state.png'),
          fullPage: true
        });
      } catch (screenshotError) {
        console.error('❌ Error state screenshot failed:', screenshotError.message);
      }
    }
  });

  test('Capture agents page and routing', async ({ page }) => {
    console.log('🔍 Starting agents page documentation...');

    try {
      // Navigate directly to agents route
      await page.goto('http://localhost:5173/agents', {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // Wait for potential loading
      await page.waitForTimeout(3000);

      // Capture agents page screenshot
      const agentsScreenshot = path.join(screenshotDir, 'agents-page-direct-load.png');
      await page.screenshot({
        path: agentsScreenshot,
        fullPage: true
      });

      console.log('📸 Agents page direct load screenshot captured');

      // Analyze agents page content
      const bodyText = await page.textContent('body');
      const hasContent = bodyText && bodyText.trim().length > 50;

      // Look for agent-related content
      const agentElements = await page.locator('[data-testid*="agent"], .agent, [class*="agent"]').count();
      const hasAgentElements = agentElements > 0;

      // Check for error messages
      const errorMessages = await page.locator('.error, [data-testid*="error"], .alert-error').count();
      const hasErrorMessages = errorMessages > 0;

      // Check for API loading states
      const apiLoadingStates = await page.locator('[data-testid*="loading"], .loading, .skeleton').count();
      const hasApiLoading = apiLoadingStates > 0;

      // Document results
      evidenceReport.results.agentsPage = {
        url: page.url(),
        title: await page.title(),
        hasContent,
        hasAgentElements,
        hasErrorMessages,
        hasApiLoading,
        screenshot: agentsScreenshot,
        consoleErrors: consoleErrors.length,
        networkErrors: networkErrors.length,
        bodyLength: bodyText ? bodyText.length : 0
      };

      console.log(`📊 Agents page analysis: Content=${hasContent}, AgentElements=${hasAgentElements}, Errors=${hasErrorMessages}`);

    } catch (error) {
      console.error('❌ Agents page capture failed:', error.message);
      evidenceReport.results.agentsPage = {
        error: error.message,
        failed: true
      };

      // Try to capture error state
      try {
        await page.screenshot({
          path: path.join(screenshotDir, 'agents-page-error-state.png'),
          fullPage: true
        });
      } catch (screenshotError) {
        console.error('❌ Agents error state screenshot failed:', screenshotError.message);
      }
    }
  });

  test('Test navigation flow and capture states', async ({ page }) => {
    console.log('🔍 Starting navigation flow documentation...');

    try {
      // Start from homepage
      await page.goto('http://localhost:5173', {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      await page.waitForTimeout(2000);

      // Capture navigation starting point
      await page.screenshot({
        path: path.join(screenshotDir, 'navigation-start-homepage.png'),
        fullPage: true
      });

      // Try to find and click agents navigation
      const agentsNavigation = page.locator('a[href="/agents"], a[href*="agents"], nav a:has-text("Agents"), [data-testid*="agents"]').first();

      if (await agentsNavigation.count() > 0) {
        console.log('🔗 Found agents navigation, attempting click...');
        await agentsNavigation.click();

        // Wait for navigation
        await page.waitForTimeout(3000);

        // Capture after navigation
        await page.screenshot({
          path: path.join(screenshotDir, 'navigation-after-agents-click.png'),
          fullPage: true
        });

        evidenceReport.results.navigation = {
          foundAgentsNav: true,
          navigationSuccessful: page.url().includes('agents'),
          finalUrl: page.url()
        };
      } else {
        console.log('❌ No agents navigation found, trying manual navigation...');

        // Try manual navigation
        await page.goto('http://localhost:5173/agents');
        await page.waitForTimeout(3000);

        await page.screenshot({
          path: path.join(screenshotDir, 'navigation-manual-agents.png'),
          fullPage: true
        });

        evidenceReport.results.navigation = {
          foundAgentsNav: false,
          manualNavigationUsed: true,
          finalUrl: page.url()
        };
      }

    } catch (error) {
      console.error('❌ Navigation flow capture failed:', error.message);
      evidenceReport.results.navigation = {
        error: error.message,
        failed: true
      };
    }
  });

  test('Capture browser console and network analysis', async ({ page }) => {
    console.log('🔍 Starting browser diagnostics...');

    let allNetworkRequests = [];
    let failedRequests = [];

    // Monitor all network requests
    page.on('request', request => {
      allNetworkRequests.push({
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
        failure: request.failure()?.errorText,
        timestamp: new Date().toISOString()
      });
    });

    try {
      // Visit both pages and collect diagnostics
      await page.goto('http://localhost:5173', {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      await page.waitForTimeout(3000);

      await page.goto('http://localhost:5173/agents', {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      await page.waitForTimeout(3000);

      // Capture final diagnostic state
      await page.screenshot({
        path: path.join(screenshotDir, 'diagnostic-final-state.png'),
        fullPage: true
      });

      // Document network analysis
      evidenceReport.results.diagnostics = {
        totalRequests: allNetworkRequests.length,
        failedRequests: failedRequests.length,
        consoleErrors: consoleErrors.length,
        networkErrors: networkErrors.length,
        requests: allNetworkRequests.slice(0, 10), // First 10 requests
        failures: failedRequests
      };

      console.log(`📊 Diagnostics: Total Requests=${allNetworkRequests.length}, Failed=${failedRequests.length}, Console Errors=${consoleErrors.length}`);

    } catch (error) {
      console.error('❌ Diagnostics capture failed:', error.message);
      evidenceReport.results.diagnostics = {
        error: error.message,
        failed: true
      };
    }
  });

  test.afterAll(async () => {
    // Save comprehensive evidence report
    const reportPath = path.join(screenshotDir, 'evidence-report.json');

    try {
      fs.writeFileSync(reportPath, JSON.stringify(evidenceReport, null, 2));
      console.log(`📄 Evidence report saved to: ${reportPath}`);

      // Create summary
      const summary = {
        timestamp: evidenceReport.timestamp,
        testResults: Object.keys(evidenceReport.results).map(key => ({
          test: key,
          status: evidenceReport.results[key].failed ? 'FAILED' : 'COMPLETED',
          hasErrors: evidenceReport.results[key].consoleErrors > 0 || evidenceReport.results[key].networkErrors > 0
        })),
        totalConsoleErrors: evidenceReport.errors.console.length,
        totalNetworkErrors: evidenceReport.errors.network.length,
        totalRuntimeErrors: evidenceReport.errors.runtime.length,
        screenshotsLocation: screenshotDir
      };

      const summaryPath = path.join(screenshotDir, 'evidence-summary.json');
      fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

      console.log('📊 EVIDENCE COLLECTION SUMMARY:');
      console.log(`- Screenshots saved to: ${screenshotDir}`);
      console.log(`- Console errors: ${summary.totalConsoleErrors}`);
      console.log(`- Network errors: ${summary.totalNetworkErrors}`);
      console.log(`- Runtime errors: ${summary.totalRuntimeErrors}`);
      console.log(`- Report: ${reportPath}`);

    } catch (error) {
      console.error('❌ Failed to save evidence report:', error.message);
    }
  });
});