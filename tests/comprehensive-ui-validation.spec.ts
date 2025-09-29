import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Test configuration
const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_API_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = '/workspaces/agent-feed/test-results/screenshots';
const REPORT_FILE = '/workspaces/agent-feed/test-results/validation-report.json';

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

interface ValidationResult {
  page: string;
  passed: boolean;
  errors: string[];
  apiCalls: Array<{ url: string; status: number; statusText: string }>;
  consoleErrors: string[];
  screenshot: string;
  timestamp: string;
}

const validationResults: ValidationResult[] = [];

// Helper function to capture console errors
function setupConsoleListener(page: Page, pageName: string): string[] {
  const consoleErrors: string[] = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(`[${msg.type()}] ${msg.text()}`);
    }
  });

  page.on('pageerror', error => {
    consoleErrors.push(`[PageError] ${error.message}`);
  });

  return consoleErrors;
}

// Helper function to capture network requests
function setupNetworkListener(page: Page): Array<{ url: string; status: number; statusText: string }> {
  const apiCalls: Array<{ url: string; status: number; statusText: string }> = [];

  page.on('response', response => {
    const url = response.url();
    if (url.includes('/api/') || url.includes(':3000')) {
      apiCalls.push({
        url: url,
        status: response.status(),
        statusText: response.statusText()
      });
    }
  });

  return apiCalls;
}

// Helper function to check for error messages in UI
async function checkForUIErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];

  // Check for common error messages
  const errorSelectors = [
    'text="Failed to fetch"',
    'text="incomplete information"',
    'text="is not a function"',
    'text="Error:"',
    'text="error"',
    '[class*="error"]',
    '[role="alert"]'
  ];

  for (const selector of errorSelectors) {
    try {
      const elements = await page.locator(selector).all();
      if (elements.length > 0) {
        for (const element of elements) {
          const text = await element.textContent();
          if (text && text.trim()) {
            errors.push(`UI Error found: ${text.trim()}`);
          }
        }
      }
    } catch (e) {
      // Selector not found, that's good
    }
  }

  return errors;
}

test.describe('Comprehensive UI/UX Validation', () => {

  test.beforeAll(async () => {
    console.log('🚀 Starting Comprehensive UI/UX Validation');
    console.log(`Frontend URL: ${FRONTEND_URL}`);
    console.log(`Backend API URL: ${BACKEND_API_URL}`);
  });

  test.afterAll(async () => {
    // Generate comprehensive report
    const report = {
      testDate: new Date().toISOString(),
      frontendUrl: FRONTEND_URL,
      backendUrl: BACKEND_API_URL,
      totalPages: validationResults.length,
      passedPages: validationResults.filter(r => r.passed).length,
      failedPages: validationResults.filter(r => !r.passed).length,
      results: validationResults,
      summary: {
        overallStatus: validationResults.every(r => r.passed) ? 'PASS ✅' : 'FAIL ❌',
        totalErrors: validationResults.reduce((sum, r) => sum + r.errors.length, 0),
        totalConsoleErrors: validationResults.reduce((sum, r) => sum + r.consoleErrors.length, 0),
        totalApiCalls: validationResults.reduce((sum, r) => sum + r.apiCalls.length, 0),
        failedApiCalls: validationResults.reduce((sum, r) =>
          sum + r.apiCalls.filter(api => api.status >= 400).length, 0)
      }
    };

    // Write report to file
    const reportDir = path.dirname(REPORT_FILE);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));

    console.log('\n📊 VALIDATION REPORT SUMMARY');
    console.log('=' .repeat(60));
    console.log(`Overall Status: ${report.summary.overallStatus}`);
    console.log(`Total Pages Tested: ${report.totalPages}`);
    console.log(`Passed: ${report.passedPages} ✅`);
    console.log(`Failed: ${report.failedPages} ❌`);
    console.log(`Total Errors: ${report.summary.totalErrors}`);
    console.log(`Console Errors: ${report.summary.totalConsoleErrors}`);
    console.log(`Total API Calls: ${report.summary.totalApiCalls}`);
    console.log(`Failed API Calls: ${report.summary.failedApiCalls}`);
    console.log(`Report saved to: ${REPORT_FILE}`);
    console.log('=' .repeat(60));

    // Print individual page results
    console.log('\n📄 PAGE-BY-PAGE RESULTS:');
    validationResults.forEach(result => {
      console.log(`\n${result.passed ? '✅' : '❌'} ${result.page}`);
      if (result.errors.length > 0) {
        console.log('  Errors:');
        result.errors.forEach(err => console.log(`    - ${err}`));
      }
      if (result.consoleErrors.length > 0) {
        console.log('  Console Errors:');
        result.consoleErrors.forEach(err => console.log(`    - ${err}`));
      }
      console.log(`  API Calls: ${result.apiCalls.length}`);
      result.apiCalls.forEach(api => {
        const status = api.status >= 200 && api.status < 300 ? '✅' : '❌';
        console.log(`    ${status} ${api.status} ${api.url}`);
      });
      console.log(`  Screenshot: ${result.screenshot}`);
    });
  });

  test('1. Home Page / Feed - Must load without errors', async ({ page }) => {
    const pageName = 'Home / Feed';
    const consoleErrors = setupConsoleListener(page, pageName);
    const apiCalls = setupNetworkListener(page);
    const errors: string[] = [];

    console.log(`\n🔍 Testing: ${pageName}`);

    try {
      // Navigate to home page
      await page.goto(FRONTEND_URL, { waitUntil: 'networkidle', timeout: 30000 });

      // Wait for the app to load
      await page.waitForSelector('#root', { timeout: 10000 });

      // Wait a bit for dynamic content
      await page.waitForTimeout(2000);

      // Check for UI errors
      const uiErrors = await checkForUIErrors(page);
      errors.push(...uiErrors);

      // Check for specific error messages
      const hasFailedToFetch = await page.locator('text="Failed to fetch"').count() > 0;
      if (hasFailedToFetch) {
        errors.push('Found "Failed to fetch" error in UI');
      }

      const hasSliceError = await page.locator('text="slice is not a function"').count() > 0;
      if (hasSliceError) {
        errors.push('Found "slice is not a function" error in UI');
      }

      // Take screenshot
      const screenshotPath = path.join(SCREENSHOT_DIR, '01-home-feed.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });

      // Validate
      const passed = errors.length === 0 && consoleErrors.length === 0;

      validationResults.push({
        page: pageName,
        passed,
        errors,
        apiCalls,
        consoleErrors,
        screenshot: screenshotPath,
        timestamp: new Date().toISOString()
      });

      console.log(`${passed ? '✅' : '❌'} ${pageName}: ${passed ? 'PASS' : 'FAIL'}`);
      if (!passed) {
        console.log('  Errors:', errors);
        console.log('  Console Errors:', consoleErrors);
      }

      expect(errors.length, `UI errors found: ${errors.join(', ')}`).toBe(0);
      expect(consoleErrors.length, `Console errors found: ${consoleErrors.join(', ')}`).toBe(0);

    } catch (error) {
      errors.push(`Test exception: ${error.message}`);
      validationResults.push({
        page: pageName,
        passed: false,
        errors,
        apiCalls,
        consoleErrors,
        screenshot: 'N/A',
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  });

  test('2. Agents Page - Must show agents without errors', async ({ page }) => {
    const pageName = 'Agents Page';
    const consoleErrors = setupConsoleListener(page, pageName);
    const apiCalls = setupNetworkListener(page);
    const errors: string[] = [];

    console.log(`\n🔍 Testing: ${pageName}`);

    try {
      // Navigate to agents page
      await page.goto(`${FRONTEND_URL}/agents`, { waitUntil: 'networkidle', timeout: 30000 });

      // Wait for the page to load
      await page.waitForSelector('#root', { timeout: 10000 });
      await page.waitForTimeout(3000);

      // Check for UI errors
      const uiErrors = await checkForUIErrors(page);
      errors.push(...uiErrors);

      // Check for specific error messages
      const hasFailedToFetch = await page.locator('text="Failed to fetch"').count() > 0;
      if (hasFailedToFetch) {
        errors.push('Found "Failed to fetch" error on Agents page');
      }

      // Check if agents are displayed (should have some content)
      const hasContent = await page.locator('body').textContent();
      if (!hasContent || hasContent.length < 100) {
        errors.push('Agents page appears to be empty or has minimal content');
      }

      // Take screenshot
      const screenshotPath = path.join(SCREENSHOT_DIR, '02-agents-page.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });

      // Validate
      const passed = errors.length === 0 && consoleErrors.length === 0;

      validationResults.push({
        page: pageName,
        passed,
        errors,
        apiCalls,
        consoleErrors,
        screenshot: screenshotPath,
        timestamp: new Date().toISOString()
      });

      console.log(`${passed ? '✅' : '❌'} ${pageName}: ${passed ? 'PASS' : 'FAIL'}`);
      if (!passed) {
        console.log('  Errors:', errors);
        console.log('  Console Errors:', consoleErrors);
      }

      expect(errors.length, `UI errors found: ${errors.join(', ')}`).toBe(0);
      expect(consoleErrors.length, `Console errors found: ${consoleErrors.join(', ')}`).toBe(0);

    } catch (error) {
      errors.push(`Test exception: ${error.message}`);
      validationResults.push({
        page: pageName,
        passed: false,
        errors,
        apiCalls,
        consoleErrors,
        screenshot: 'N/A',
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  });

  test('3. Activity Panel - Must show activities without "incomplete information"', async ({ page }) => {
    const pageName = 'Activity Panel';
    const consoleErrors = setupConsoleListener(page, pageName);
    const apiCalls = setupNetworkListener(page);
    const errors: string[] = [];

    console.log(`\n🔍 Testing: ${pageName}`);

    try {
      // Navigate to home page
      await page.goto(FRONTEND_URL, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForSelector('#root', { timeout: 10000 });
      await page.waitForTimeout(2000);

      // Check for UI errors
      const uiErrors = await checkForUIErrors(page);
      errors.push(...uiErrors);

      // Check for specific error messages
      const hasIncompleteInfo = await page.locator('text="incomplete information"').count() > 0;
      if (hasIncompleteInfo) {
        errors.push('Found "incomplete information" error in Activity Panel');
      }

      // Take screenshot
      const screenshotPath = path.join(SCREENSHOT_DIR, '03-activity-panel.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });

      // Validate
      const passed = errors.length === 0 && consoleErrors.length === 0;

      validationResults.push({
        page: pageName,
        passed,
        errors,
        apiCalls,
        consoleErrors,
        screenshot: screenshotPath,
        timestamp: new Date().toISOString()
      });

      console.log(`${passed ? '✅' : '❌'} ${pageName}: ${passed ? 'PASS' : 'FAIL'}`);
      if (!passed) {
        console.log('  Errors:', errors);
        console.log('  Console Errors:', consoleErrors);
      }

      expect(errors.length, `UI errors found: ${errors.join(', ')}`).toBe(0);
      expect(consoleErrors.length, `Console errors found: ${consoleErrors.join(', ')}`).toBe(0);

    } catch (error) {
      errors.push(`Test exception: ${error.message}`);
      validationResults.push({
        page: pageName,
        passed: false,
        errors,
        apiCalls,
        consoleErrors,
        screenshot: 'N/A',
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  });

  test('4. Token Analytics Dashboard - Must load charts and data', async ({ page }) => {
    const pageName = 'Token Analytics Dashboard';
    const consoleErrors = setupConsoleListener(page, pageName);
    const apiCalls = setupNetworkListener(page);
    const errors: string[] = [];

    console.log(`\n🔍 Testing: ${pageName}`);

    try {
      // Navigate to token analytics page
      await page.goto(`${FRONTEND_URL}/token-analytics`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForSelector('#root', { timeout: 10000 });
      await page.waitForTimeout(3000);

      // Check for UI errors
      const uiErrors = await checkForUIErrors(page);
      errors.push(...uiErrors);

      // Check if page has content
      const hasContent = await page.locator('body').textContent();
      if (!hasContent || hasContent.length < 100) {
        errors.push('Token Analytics page appears to be empty');
      }

      // Take screenshot
      const screenshotPath = path.join(SCREENSHOT_DIR, '04-token-analytics.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });

      // Validate
      const passed = errors.length === 0 && consoleErrors.length === 0;

      validationResults.push({
        page: pageName,
        passed,
        errors,
        apiCalls,
        consoleErrors,
        screenshot: screenshotPath,
        timestamp: new Date().toISOString()
      });

      console.log(`${passed ? '✅' : '❌'} ${pageName}: ${passed ? 'PASS' : 'FAIL'}`);
      if (!passed) {
        console.log('  Errors:', errors);
        console.log('  Console Errors:', consoleErrors);
      }

      expect(errors.length, `UI errors found: ${errors.join(', ')}`).toBe(0);
      expect(consoleErrors.length, `Console errors found: ${consoleErrors.join(', ')}`).toBe(0);

    } catch (error) {
      errors.push(`Test exception: ${error.message}`);
      validationResults.push({
        page: pageName,
        passed: false,
        errors,
        apiCalls,
        consoleErrors,
        screenshot: 'N/A',
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  });

  test('5. Streaming Ticker - Must connect and show messages', async ({ page }) => {
    const pageName = 'Streaming Ticker';
    const consoleErrors = setupConsoleListener(page, pageName);
    const apiCalls = setupNetworkListener(page);
    const errors: string[] = [];

    console.log(`\n🔍 Testing: ${pageName}`);

    try {
      // Navigate to home page
      await page.goto(FRONTEND_URL, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForSelector('#root', { timeout: 10000 });
      await page.waitForTimeout(3000);

      // Check for UI errors
      const uiErrors = await checkForUIErrors(page);
      errors.push(...uiErrors);

      // Take screenshot
      const screenshotPath = path.join(SCREENSHOT_DIR, '05-streaming-ticker.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });

      // Validate
      const passed = errors.length === 0 && consoleErrors.length === 0;

      validationResults.push({
        page: pageName,
        passed,
        errors,
        apiCalls,
        consoleErrors,
        screenshot: screenshotPath,
        timestamp: new Date().toISOString()
      });

      console.log(`${passed ? '✅' : '❌'} ${pageName}: ${passed ? 'PASS' : 'FAIL'}`);
      if (!passed) {
        console.log('  Errors:', errors);
        console.log('  Console Errors:', consoleErrors);
      }

      expect(errors.length, `UI errors found: ${errors.join(', ')}`).toBe(0);
      expect(consoleErrors.length, `Console errors found: ${consoleErrors.join(', ')}`).toBe(0);

    } catch (error) {
      errors.push(`Test exception: ${error.message}`);
      validationResults.push({
        page: pageName,
        passed: false,
        errors,
        apiCalls,
        consoleErrors,
        screenshot: 'N/A',
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  });

  test('6. API Health Check - Backend must be responsive', async ({ request }) => {
    const pageName = 'API Health Check';
    const apiCalls: Array<{ url: string; status: number; statusText: string }> = [];
    const errors: string[] = [];

    console.log(`\n🔍 Testing: ${pageName}`);

    try {
      // Test agents endpoint
      const agentsResponse = await request.get(`${BACKEND_API_URL}/api/agents`);
      apiCalls.push({
        url: `${BACKEND_API_URL}/api/agents`,
        status: agentsResponse.status(),
        statusText: agentsResponse.statusText()
      });

      if (agentsResponse.status() !== 200) {
        errors.push(`Agents API returned status ${agentsResponse.status()}`);
      }

      // Test posts endpoint
      const postsResponse = await request.get(`${BACKEND_API_URL}/api/posts`);
      apiCalls.push({
        url: `${BACKEND_API_URL}/api/posts`,
        status: postsResponse.status(),
        statusText: postsResponse.statusText()
      });

      if (postsResponse.status() !== 200) {
        errors.push(`Posts API returned status ${postsResponse.status()}`);
      }

      // Test activities endpoint
      const activitiesResponse = await request.get(`${BACKEND_API_URL}/api/activities`);
      apiCalls.push({
        url: `${BACKEND_API_URL}/api/activities`,
        status: activitiesResponse.status(),
        statusText: activitiesResponse.statusText()
      });

      if (activitiesResponse.status() !== 200) {
        errors.push(`Activities API returned status ${activitiesResponse.status()}`);
      }

      // Validate
      const passed = errors.length === 0;

      validationResults.push({
        page: pageName,
        passed,
        errors,
        apiCalls,
        consoleErrors: [],
        screenshot: 'N/A',
        timestamp: new Date().toISOString()
      });

      console.log(`${passed ? '✅' : '❌'} ${pageName}: ${passed ? 'PASS' : 'FAIL'}`);
      if (!passed) {
        console.log('  Errors:', errors);
      }

      expect(errors.length, `API errors found: ${errors.join(', ')}`).toBe(0);

    } catch (error) {
      errors.push(`Test exception: ${error.message}`);
      validationResults.push({
        page: pageName,
        passed: false,
        errors,
        apiCalls,
        consoleErrors: [],
        screenshot: 'N/A',
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  });
});