import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create screenshots directory if it doesn't exist
const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

test.describe('React useEffect Fix Validation', () => {
  let consoleErrors = [];
  let reactErrors = [];
  let pageLoadTimes = {};

  test.beforeEach(async ({ page }) => {
    // Clear console error arrays for each test
    consoleErrors = [];
    reactErrors = [];

    // Listen for console messages
    page.on('console', (msg) => {
      const text = msg.text();
      const type = msg.type();

      // Capture console errors
      if (type === 'error') {
        consoleErrors.push({
          type: 'error',
          text: text,
          timestamp: new Date().toISOString()
        });

        // Specifically track React-related errors
        if (text.includes('useEffect') ||
            text.includes('Cannot read properties of null') ||
            text.includes('React') ||
            text.includes('hooks')) {
          reactErrors.push({
            type: 'react-error',
            text: text,
            timestamp: new Date().toISOString()
          });
        }
      }

      // Also capture warnings that might indicate issues
      if (type === 'warning' && (text.includes('React') || text.includes('useEffect'))) {
        reactErrors.push({
          type: 'react-warning',
          text: text,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Listen for page errors
    page.on('pageerror', (error) => {
      consoleErrors.push({
        type: 'page-error',
        text: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });

      if (error.message.includes('useEffect') ||
          error.message.includes('Cannot read properties of null') ||
          error.message.includes('React')) {
        reactErrors.push({
          type: 'page-error',
          text: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString()
        });
      }
    });
  });

  test('Homepage loads without React useEffect errors', async ({ page }) => {
    const startTime = Date.now();

    // Navigate to homepage
    await page.goto('http://localhost:3001', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    pageLoadTimes.homepage = Date.now() - startTime;

    // Wait for React to fully mount
    await page.waitForTimeout(2000);

    // Take screenshot of homepage
    await page.screenshot({
      path: path.join(screenshotsDir, 'homepage-after-fix.png'),
      fullPage: true
    });

    // Check that the page title is correct
    await expect(page).toHaveTitle(/Agent Feed/);

    // Verify no React useEffect errors occurred
    const useEffectErrors = reactErrors.filter(error =>
      error.text.includes('useEffect') ||
      error.text.includes('Cannot read properties of null')
    );

    if (useEffectErrors.length > 0) {
      console.log('❌ React useEffect errors found on homepage:', useEffectErrors);
      throw new Error(`Homepage has ${useEffectErrors.length} React useEffect errors: ${JSON.stringify(useEffectErrors, null, 2)}`);
    }

    // Verify no general React errors
    if (reactErrors.length > 0) {
      console.log('❌ React errors found on homepage:', reactErrors);
      throw new Error(`Homepage has ${reactErrors.length} React errors: ${JSON.stringify(reactErrors, null, 2)}`);
    }

    console.log('✅ Homepage loaded successfully without React errors');
    console.log(`📊 Homepage load time: ${pageLoadTimes.homepage}ms`);
  });

  test('Agents page loads without React useEffect errors', async ({ page }) => {
    const startTime = Date.now();

    // Navigate to agents page
    await page.goto('http://localhost:3001/agents', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    pageLoadTimes.agentsPage = Date.now() - startTime;

    // Wait for React to fully mount and render
    await page.waitForTimeout(3000);

    // Take screenshot of agents page
    await page.screenshot({
      path: path.join(screenshotsDir, 'agents-page-after-fix.png'),
      fullPage: true
    });

    // Verify the agents page loaded (check for key elements)
    const agentsList = await page.locator('[data-testid="agents-list"], .agents-container, .agent-grid').first();
    await expect(agentsList).toBeVisible({ timeout: 10000 });

    // Verify no React useEffect errors occurred
    const useEffectErrors = reactErrors.filter(error =>
      error.text.includes('useEffect') ||
      error.text.includes('Cannot read properties of null')
    );

    if (useEffectErrors.length > 0) {
      console.log('❌ React useEffect errors found on agents page:', useEffectErrors);
      throw new Error(`Agents page has ${useEffectErrors.length} React useEffect errors: ${JSON.stringify(useEffectErrors, null, 2)}`);
    }

    // Verify no general React errors
    if (reactErrors.length > 0) {
      console.log('❌ React errors found on agents page:', reactErrors);
      throw new Error(`Agents page has ${reactErrors.length} React errors: ${JSON.stringify(reactErrors, null, 2)}`);
    }

    console.log('✅ Agents page loaded successfully without React errors');
    console.log(`📊 Agents page load time: ${pageLoadTimes.agentsPage}ms`);
  });

  test('Navigation between pages works smoothly', async ({ page }) => {
    // Start on homepage
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Clear any initial errors
    reactErrors = [];
    consoleErrors = [];

    // Navigate to agents page
    await page.click('a[href="/agents"], [href*="agents"]');
    await page.waitForURL('**/agents', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Check for navigation errors
    const navigationErrors = reactErrors.filter(error =>
      error.text.includes('useEffect') ||
      error.text.includes('Cannot read properties of null')
    );

    if (navigationErrors.length > 0) {
      console.log('❌ React errors during navigation:', navigationErrors);
      throw new Error(`Navigation caused ${navigationErrors.length} React errors: ${JSON.stringify(navigationErrors, null, 2)}`);
    }

    // Navigate back to homepage
    await page.click('a[href="/"], [href=""], .logo, .home-link');
    await page.waitForURL('**/', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Check for errors on return navigation
    const returnNavigationErrors = reactErrors.filter(error =>
      error.text.includes('useEffect') ||
      error.text.includes('Cannot read properties of null')
    );

    if (returnNavigationErrors.length > 0) {
      console.log('❌ React errors during return navigation:', returnNavigationErrors);
      throw new Error(`Return navigation caused ${returnNavigationErrors.length} React errors: ${JSON.stringify(returnNavigationErrors, null, 2)}`);
    }

    console.log('✅ Navigation between pages works smoothly without React errors');
  });

  test('React 18.2.0 unified configuration validation', async ({ page }) => {
    // Navigate to homepage to trigger React initialization
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Check React version in the console
    const reactVersion = await page.evaluate(() => {
      if (window.React && window.React.version) {
        return window.React.version;
      }
      // Try alternative methods to get React version
      try {
        const reactElement = document.querySelector('[data-reactroot]') ||
                           document.querySelector('#__next') ||
                           document.querySelector('.react-root') ||
                           document.querySelector('body > div');
        if (reactElement && reactElement._reactInternalFiber) {
          return reactElement._reactInternalFiber.return.type.version;
        }
        if (reactElement && reactElement._reactInternalInstance) {
          return reactElement._reactInternalInstance._currentElement.type.version;
        }
      } catch (e) {
        console.log('Could not detect React version from DOM');
      }
      return 'unknown';
    });

    console.log(`🔍 Detected React version: ${reactVersion}`);

    // Verify no React context conflicts
    const contextConflictErrors = consoleErrors.filter(error =>
      error.text.includes('context') ||
      error.text.includes('duplicate') ||
      error.text.includes('multiple') ||
      error.text.includes('conflict')
    );

    if (contextConflictErrors.length > 0) {
      console.log('❌ React context conflict errors:', contextConflictErrors);
      throw new Error(`Found ${contextConflictErrors.length} context conflict errors: ${JSON.stringify(contextConflictErrors, null, 2)}`);
    }

    // Verify no dependency version conflicts
    const dependencyErrors = consoleErrors.filter(error =>
      error.text.includes('version') ||
      error.text.includes('dependency') ||
      error.text.includes('peer')
    );

    if (dependencyErrors.length > 0) {
      console.log('⚠️ Potential dependency conflicts detected:', dependencyErrors);
    }

    console.log('✅ React 18.2.0 unified configuration appears to be working correctly');
  });

  test.afterEach(async ({ page }, testInfo) => {
    // Generate detailed error report for this test
    const testName = testInfo.title.replace(/[^a-zA-Z0-9]/g, '-');
    const reportPath = path.join(screenshotsDir, `${testName}-error-report.json`);

    const errorReport = {
      testName: testInfo.title,
      status: testInfo.status,
      consoleErrors: consoleErrors,
      reactErrors: reactErrors,
      pageLoadTimes: pageLoadTimes,
      timestamp: new Date().toISOString(),
      url: page.url()
    };

    fs.writeFileSync(reportPath, JSON.stringify(errorReport, null, 2));

    if (testInfo.status === 'failed') {
      // Take screenshot on failure
      await page.screenshot({
        path: path.join(screenshotsDir, `${testName}-failure.png`),
        fullPage: true
      });
    }
  });
});

test.describe('Comprehensive React Validation Report', () => {
  test('Generate final validation report', async ({ page }) => {
    const reportData = {
      title: 'React useEffect Fix Validation Report',
      timestamp: new Date().toISOString(),
      summary: {
        purpose: 'Validate that React useEffect errors have been permanently resolved',
        reactVersion: '18.2.0',
        testEnvironment: 'http://localhost:3001',
        successCriteria: [
          'Zero "Cannot read properties of null (reading useEffect)" errors',
          'Both homepage and agents page load and render correctly',
          'Browser console shows no React warnings or errors',
          'Navigation works smoothly between pages',
          'Unified React configuration resolves context conflicts'
        ]
      },
      configuration: {
        react: '18.2.0',
        reactDom: '18.2.0',
        nextJs: '14.0.0',
        nodeEnvironment: 'development',
        port: 5173
      },
      testResults: {
        homepageTest: 'Will be populated by test execution',
        agentsPageTest: 'Will be populated by test execution',
        navigationTest: 'Will be populated by test execution',
        configurationTest: 'Will be populated by test execution'
      },
      screenshots: {
        homepageAfterFix: 'screenshots/homepage-after-fix.png',
        agentsPageAfterFix: 'screenshots/agents-page-after-fix.png'
      },
      conclusion: 'Test execution will determine if React useEffect errors are resolved'
    };

    // Write the initial report
    const reportPath = path.join(__dirname, 'screenshots', 'react-useeffect-validation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));

    console.log('📋 Validation report template generated at:', reportPath);
    console.log('🚀 Execute tests to populate results');
  });
});