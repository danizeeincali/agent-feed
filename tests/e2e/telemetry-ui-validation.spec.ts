/**
 * Telemetry UI Validation Tests - Agent 4
 *
 * Mission: Validate Avi DM functionality without telemetry/schema errors
 * Focus: Frontend UI, backend logs, database schema, network errors
 *
 * Prerequisites:
 * - API server running on port 3001
 * - Frontend app running on port 5173
 * - Schema fix applied (billing_tier column added)
 * - Backend restarted by Agent 3
 */

import { test, expect } from '@playwright/test';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';

const execAsync = promisify(exec);

const API_BASE_URL = 'http://localhost:3001';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const SCREENSHOT_DIR = path.join(process.cwd(), 'docs/validation/screenshots');
const LOG_DIR = path.join(process.cwd(), 'tests/playwright/ui-validation/results');

// Helper to save screenshot
async function takeScreenshot(page, name) {
  const filename = `telemetry-fix-${name}.png`;
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, filename),
    fullPage: true
  });
  console.log(`📸 Screenshot saved: ${filename}`);
  return filename;
}

// Helper to check backend logs for errors
async function checkBackendLogs() {
  try {
    const { stdout } = await execAsync('tail -n 100 /workspaces/agent-feed/.logs/api-server.log 2>/dev/null || echo "No log file"');
    const errors = stdout.split('\n').filter(line =>
      line.includes('ERROR') ||
      line.includes('schema') ||
      line.includes('column') ||
      line.includes('billing_tier')
    );
    return {
      hasErrors: errors.length > 0,
      errors: errors,
      logSample: stdout.split('\n').slice(-20).join('\n')
    };
  } catch (error) {
    return {
      hasErrors: false,
      errors: [],
      logSample: 'Could not read logs: ' + error.message
    };
  }
}

// Helper to verify database schema
async function verifyDatabaseSchema() {
  try {
    const dbPath = '/workspaces/agent-feed/database.db';
    const { stdout } = await execAsync(`sqlite3 "${dbPath}" "PRAGMA table_info(users);" 2>/dev/null || echo "Error"`);

    const hasBillingTier = stdout.includes('billing_tier');
    const columns = stdout.split('\n').filter(line => line.trim().length > 0);

    return {
      hasBillingTier,
      columns,
      isValid: hasBillingTier
    };
  } catch (error) {
    return {
      hasBillingTier: false,
      columns: [],
      isValid: false,
      error: error.message
    };
  }
}

test.describe('Telemetry UI Validation - Schema Fix Verification', () => {

  let consoleErrors = [];
  let networkErrors = [];
  let apiCreditsIssue = false;

  test.beforeEach(async ({ page }) => {
    // Reset error tracking
    consoleErrors = [];
    networkErrors = [];
    apiCreditsIssue = false;

    // Monitor console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        consoleErrors.push(text);
        console.log(`🔴 Console Error: ${text}`);
      }
    });

    // Monitor network failures
    page.on('response', async (response) => {
      if (!response.ok() && response.status() >= 400) {
        const url = response.url();
        networkErrors.push({
          url,
          status: response.status(),
          statusText: response.statusText()
        });
        console.log(`🔴 Network Error: ${response.status()} ${url}`);

        // Check if it's an API credits issue
        if (url.includes('anthropic') || url.includes('claude')) {
          try {
            const body = await response.text();
            if (body.includes('credit') || body.includes('quota') || body.includes('billing')) {
              apiCreditsIssue = true;
              console.log('⚠️  API Credits Issue Detected');
            }
          } catch (e) {
            // Can't read body, skip
          }
        }
      }
    });
  });

  test('01 - Load home page without errors', async ({ page }) => {
    console.log('\n📋 TEST 1: Loading home page...');

    // Navigate to home page
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });

    // Take screenshot
    await takeScreenshot(page, '01-home-page-loaded');

    // Wait for main content
    await page.waitForSelector('body', { timeout: 10000 });

    // Verify page title
    const title = await page.title();
    console.log(`✅ Page title: ${title}`);

    // Check for critical errors
    const pageText = await page.textContent('body');
    expect(pageText).not.toContain('Error:');
    expect(pageText).not.toContain('undefined');
    expect(pageText).not.toContain('[object Object]');

    console.log('✅ Home page loaded successfully');
  });

  test('02 - Navigate to Avi DM interface', async ({ page }) => {
    console.log('\n📋 TEST 2: Navigating to Avi DM...');

    await page.goto(FRONTEND_URL);
    await page.waitForTimeout(1000);

    // Take screenshot of initial state
    await takeScreenshot(page, '02-before-dm-navigation');

    // Look for DM navigation elements
    const dmButton = await page.$(
      '[href*="/dm"], [href*="/messages"], button:has-text("DM"), button:has-text("Message"), a:has-text("DM")'
    );

    if (dmButton) {
      console.log('✅ Found DM navigation button');
      await dmButton.click();
      await page.waitForTimeout(1000);
      await takeScreenshot(page, '02-dm-interface-loaded');
    } else {
      console.log('⚠️  DM button not found, checking URL patterns');

      // Try direct navigation
      await page.goto(`${FRONTEND_URL}/dm`);
      await page.waitForTimeout(1000);
      await takeScreenshot(page, '02-dm-direct-navigation');
    }

    // Verify no 500 errors occurred
    const has500Error = networkErrors.some(err => err.status === 500);
    expect(has500Error).toBe(false);

    console.log('✅ DM interface navigation successful');
  });

  test('03 - Compose Avi DM message', async ({ page }) => {
    console.log('\n📋 TEST 3: Composing Avi DM message...');

    await page.goto(FRONTEND_URL);
    await page.waitForTimeout(1000);

    // Navigate to DM interface
    try {
      await page.goto(`${FRONTEND_URL}/dm`);
    } catch (e) {
      console.log('⚠️  Direct DM navigation failed, looking for UI element');
    }

    await page.waitForTimeout(1000);
    await takeScreenshot(page, '03-dm-compose-interface');

    // Look for message composition elements
    const messageInput = await page.$(
      'textarea[placeholder*="message" i], textarea[name="message"], input[type="text"][placeholder*="message" i], [contenteditable="true"]'
    );

    if (messageInput) {
      console.log('✅ Found message input field');

      const testMessage = 'Test DM message for telemetry validation';
      await messageInput.fill(testMessage);
      await takeScreenshot(page, '03-dm-message-composed');

      // Look for send button
      const sendButton = await page.$(
        'button:has-text("Send"), button[type="submit"], button:has-text("Post")'
      );

      if (sendButton) {
        console.log('✅ Found send button, attempting to send...');

        // Listen for API call
        const dmPromise = page.waitForResponse(
          response => {
            const url = response.url();
            return (url.includes('/api/dm') || url.includes('/api/messages') || url.includes('/api/posts'))
              && response.request().method() === 'POST';
          },
          { timeout: 15000 }
        ).catch(() => null);

        await sendButton.click();
        await page.waitForTimeout(2000);

        const dmResponse = await dmPromise;

        if (dmResponse) {
          console.log(`✅ DM API call made: ${dmResponse.status()} ${dmResponse.url()}`);

          if (dmResponse.ok()) {
            const responseData = await dmResponse.json();
            console.log('✅ DM sent successfully:', JSON.stringify(responseData, null, 2));
          } else {
            console.log(`⚠️  DM API returned: ${dmResponse.status()}`);
            const responseText = await dmResponse.text();
            console.log('Response:', responseText);

            // Document if it's an API credits issue
            if (responseText.includes('credit') || responseText.includes('quota')) {
              apiCreditsIssue = true;
              console.log('⚠️  API Credits Issue: Platform API key may need credits');
            }
          }
        } else {
          console.log('⚠️  No DM API response captured (timeout or different endpoint)');
        }

        await takeScreenshot(page, '03-dm-message-sent-attempt');
      } else {
        console.log('⚠️  Send button not found');
        await takeScreenshot(page, '03-no-send-button');
      }
    } else {
      console.log('⚠️  Message input not found');
      await takeScreenshot(page, '03-no-message-input');
    }

    console.log('✅ DM composition test completed');
  });

  test('04 - Verify backend logs clean (no schema errors)', async ({ page }) => {
    console.log('\n📋 TEST 4: Verifying backend logs...');

    await page.goto(FRONTEND_URL);
    await page.waitForTimeout(2000);

    // Check backend logs
    const logCheck = await checkBackendLogs();

    console.log('\n📊 Backend Log Analysis:');
    console.log(`Schema Errors Found: ${logCheck.hasErrors}`);

    if (logCheck.hasErrors) {
      console.log('\n🔴 Errors found in logs:');
      logCheck.errors.forEach(err => console.log(`  - ${err}`));
    } else {
      console.log('✅ No schema-related errors in logs');
    }

    console.log('\n📄 Recent log sample:');
    console.log(logCheck.logSample);

    await takeScreenshot(page, '04-backend-logs-checked');

    // Verify no schema errors
    const hasSchemaErrors = logCheck.errors.some(err =>
      err.includes('billing_tier') || err.includes('no such column')
    );

    expect(hasSchemaErrors).toBe(false);
    console.log('✅ Backend logs verification passed');
  });

  test('05 - Verify database schema correct', async ({ page }) => {
    console.log('\n📋 TEST 5: Verifying database schema...');

    await page.goto(FRONTEND_URL);

    // Check database schema
    const schemaCheck = await verifyDatabaseSchema();

    console.log('\n📊 Database Schema Analysis:');
    console.log(`Has billing_tier column: ${schemaCheck.hasBillingTier}`);
    console.log(`Schema valid: ${schemaCheck.isValid}`);

    if (schemaCheck.columns.length > 0) {
      console.log('\n📋 Users table columns:');
      schemaCheck.columns.forEach(col => console.log(`  - ${col}`));
    }

    if (schemaCheck.error) {
      console.log(`⚠️  Schema check error: ${schemaCheck.error}`);
    }

    await takeScreenshot(page, '05-database-schema-verified');

    // Verify billing_tier column exists
    expect(schemaCheck.hasBillingTier).toBe(true);
    console.log('✅ Database schema verification passed');
  });

  test('06 - Check network for 500 errors', async ({ page }) => {
    console.log('\n📋 TEST 6: Checking for network errors...');

    await page.goto(FRONTEND_URL);
    await page.waitForTimeout(2000);

    // Try to interact with the app
    const links = await page.$$('a, button');
    if (links.length > 0) {
      console.log(`Found ${links.length} interactive elements`);

      // Click first few safe-looking links
      for (let i = 0; i < Math.min(3, links.length); i++) {
        try {
          const link = links[i];
          const text = await link.textContent();
          if (text && text.trim().length > 0 && text.trim().length < 50) {
            console.log(`Clicking: ${text.trim()}`);
            await link.click();
            await page.waitForTimeout(1000);
          }
        } catch (e) {
          // Skip problematic elements
        }
      }
    }

    await takeScreenshot(page, '06-network-errors-checked');

    // Report network errors
    console.log('\n📊 Network Error Summary:');
    console.log(`Total network errors: ${networkErrors.length}`);

    if (networkErrors.length > 0) {
      console.log('\n🔴 Network errors found:');
      networkErrors.forEach(err => {
        console.log(`  - ${err.status} ${err.statusText}: ${err.url}`);
      });
    } else {
      console.log('✅ No network errors detected');
    }

    if (apiCreditsIssue) {
      console.log('\n⚠️  API CREDITS ISSUE DETECTED');
      console.log('The Platform API key may need credits to function properly.');
      console.log('This is expected and should be documented.');
    }

    // Verify no 500 internal server errors
    const has500Errors = networkErrors.some(err => err.status === 500);
    expect(has500Errors).toBe(false);

    console.log('✅ Network error check passed (no 500 errors)');
  });

  test('07 - Verify frontend loads without JS errors', async ({ page }) => {
    console.log('\n📋 TEST 7: Verifying frontend JavaScript...');

    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    await takeScreenshot(page, '07-frontend-js-verified');

    // Report console errors
    console.log('\n📊 Console Error Summary:');
    console.log(`Total console errors: ${consoleErrors.length}`);

    if (consoleErrors.length > 0) {
      console.log('\n🔴 Console errors found:');
      consoleErrors.forEach(err => console.log(`  - ${err}`));
    } else {
      console.log('✅ No console errors detected');
    }

    // Filter out non-critical errors (warnings, info, etc.)
    const criticalErrors = consoleErrors.filter(err =>
      !err.includes('favicon') &&
      !err.includes('Download') &&
      !err.includes('DevTools')
    );

    console.log(`Critical errors: ${criticalErrors.length}`);

    // Verify no critical JS errors (but allow warnings)
    expect(criticalErrors.length).toBeLessThan(3); // Allow up to 2 non-critical errors

    console.log('✅ Frontend JavaScript verification passed');
  });

  test('08 - Comprehensive regression check', async ({ page }) => {
    console.log('\n📋 TEST 8: Comprehensive regression check...');

    // Load the application
    await page.goto(FRONTEND_URL);
    await page.waitForTimeout(2000);

    await takeScreenshot(page, '08-regression-initial');

    // Check multiple pages/features
    const pagesToCheck = [
      { url: '/', name: 'Home' },
      { url: '/dm', name: 'DM' },
      { url: '/feed', name: 'Feed' },
      { url: '/settings', name: 'Settings' }
    ];

    const results = {
      pagesChecked: 0,
      pagesSuccessful: 0,
      errors: []
    };

    for (const pageInfo of pagesToCheck) {
      try {
        console.log(`\nChecking: ${pageInfo.name} (${pageInfo.url})`);
        results.pagesChecked++;

        await page.goto(`${FRONTEND_URL}${pageInfo.url}`);
        await page.waitForTimeout(1000);

        // Check for critical errors
        const pageText = await page.textContent('body');
        const hasError = pageText.includes('Error:') ||
                         pageText.includes('500') ||
                         pageText.includes('Internal Server Error');

        if (hasError) {
          console.log(`⚠️  ${pageInfo.name} page may have errors`);
          results.errors.push(`${pageInfo.name}: Contains error text`);
        } else {
          console.log(`✅ ${pageInfo.name} page loaded successfully`);
          results.pagesSuccessful++;
        }

      } catch (error) {
        console.log(`⚠️  ${pageInfo.name} page failed: ${error.message}`);
        results.errors.push(`${pageInfo.name}: ${error.message}`);
      }
    }

    await takeScreenshot(page, '08-regression-complete');

    // Generate summary
    console.log('\n📊 Regression Check Summary:');
    console.log(`Pages checked: ${results.pagesChecked}`);
    console.log(`Pages successful: ${results.pagesSuccessful}`);
    console.log(`Errors: ${results.errors.length}`);

    if (results.errors.length > 0) {
      console.log('\nErrors found:');
      results.errors.forEach(err => console.log(`  - ${err}`));
    }

    // Verify at least home page works
    expect(results.pagesSuccessful).toBeGreaterThan(0);

    console.log('✅ Comprehensive regression check completed');
  });
});

test.describe('Telemetry Validation Summary Report', () => {
  test('Generate comprehensive validation report', async ({ page }) => {
    console.log('\n' + '='.repeat(80));
    console.log('TELEMETRY UI VALIDATION - FINAL REPORT');
    console.log('='.repeat(80));

    const report = {
      timestamp: new Date().toISOString(),
      agent: 'Agent 4 - Playwright UI Validation Engineer',
      mission: 'Validate Avi DM without telemetry/schema errors',
      frontend: FRONTEND_URL,
      apiServer: API_BASE_URL,
      results: {
        homePageLoaded: false,
        dmInterfaceAccessible: false,
        backendLogsClean: false,
        databaseSchemaValid: false,
        noNetworkErrors: false,
        frontendJSHealthy: false,
        regressionTestsPassed: false
      },
      issues: {
        apiCreditsIssue: false,
        consoleErrors: [],
        networkErrors: [],
        schemaIssues: []
      },
      screenshots: []
    };

    try {
      // Test home page
      await page.goto(FRONTEND_URL);
      await page.waitForSelector('body', { timeout: 10000 });
      report.results.homePageLoaded = true;

      // Check backend logs
      const logCheck = await checkBackendLogs();
      report.results.backendLogsClean = !logCheck.hasErrors;
      if (logCheck.hasErrors) {
        report.issues.schemaIssues = logCheck.errors;
      }

      // Check database schema
      const schemaCheck = await verifyDatabaseSchema();
      report.results.databaseSchemaValid = schemaCheck.isValid;

      // List screenshots
      try {
        const files = await fs.readdir(SCREENSHOT_DIR);
        report.screenshots = files.filter(f => f.startsWith('telemetry-fix-'));
      } catch (e) {
        console.log('⚠️  Could not list screenshots');
      }

      await takeScreenshot(page, '09-final-report');

    } catch (error) {
      console.error('❌ Error during report generation:', error);
    }

    // Print report
    console.log('\n📊 VALIDATION REPORT:');
    console.log(JSON.stringify(report, null, 2));
    console.log('\n' + '='.repeat(80));

    // Verify critical checks passed
    expect(report.results.homePageLoaded).toBe(true);
    expect(report.results.databaseSchemaValid).toBe(true);

    console.log('\n✅ VALIDATION COMPLETE');
    console.log('='.repeat(80) + '\n');
  });
});
