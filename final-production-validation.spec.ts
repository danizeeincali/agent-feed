import { test, expect, chromium, Page, Browser } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOT_DIR = '/workspaces/agent-feed/final-validation-screenshots';
const BASE_URL = 'http://localhost:5173';

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

test.describe('Final Production Validation', () => {
  let browser: Browser;
  let page: Page;
  let consoleMessages: any[] = [];
  let consoleErrors: any[] = [];
  let consoleWarnings: any[] = [];

  test.beforeAll(async () => {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  });

  test.afterAll(async () => {
    await browser?.close();
  });

  test('Complete Production Validation Flow', async () => {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1
    });

    page = await context.newPage();

    // Capture all console messages
    page.on('console', msg => {
      const text = msg.text();
      const type = msg.type();

      consoleMessages.push({ type, text, timestamp: new Date().toISOString() });

      if (type === 'error') {
        consoleErrors.push({ text, timestamp: new Date().toISOString() });
      } else if (type === 'warning') {
        consoleWarnings.push({ text, timestamp: new Date().toISOString() });
      }
    });

    // Capture page errors
    page.on('pageerror', error => {
      consoleErrors.push({
        text: `PageError: ${error.message}\nStack: ${error.stack}`,
        timestamp: new Date().toISOString()
      });
    });

    console.log('\n=== STEP 1: Navigate to application ===');
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });

    console.log('\n=== STEP 2: Wait 10 seconds for full page load ===');
    await page.waitForTimeout(10000);

    console.log('\n=== STEP 3: Check for posts loaded ===');
    const posts = await page.locator('[data-testid="post-card"], .post-card, article').all();
    const postCount = posts.length;
    console.log(`✓ Found ${postCount} posts on the page`);

    // Take Screenshot #1: Feed with posts loaded
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '01-feed-loaded.png'),
      fullPage: true
    });
    console.log('✓ Screenshot #1 saved: 01-feed-loaded.png');

    // Open DevTools console (simulate by capturing console state)
    console.log('\n=== STEP 4: Analyzing Console Messages ===');
    const errorCount = consoleErrors.filter(e =>
      !e.text.includes('WebSocket') &&
      !e.text.includes('ws://') &&
      !e.text.includes('HMR')
    ).length;

    console.log(`Console Errors (excluding WebSocket): ${errorCount}`);
    console.log(`Console Warnings: ${consoleWarnings.length}`);
    console.log(`Total Console Messages: ${consoleMessages.length}`);

    // Take Screenshot #2: Console state (we'll capture page with DevTools info)
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '02-console-state.png'),
      fullPage: false
    });
    console.log('✓ Screenshot #2 saved: 02-console-state.png');

    console.log('\n=== STEP 5: Verify Engagement Data Display ===');

    // Look for engagement counters (saves, likes, etc.)
    const engagementElements = await page.locator('[data-testid*="save"], [aria-label*="save"], button:has-text("Save"), button:has-text("Saved")').all();
    console.log(`✓ Found ${engagementElements.length} engagement elements (save buttons)`);

    // Check for counter displays
    const counterElements = await page.locator('[data-testid*="count"], .count, [class*="count"]').all();
    console.log(`✓ Found ${counterElements.length} counter elements`);

    console.log('\n=== STEP 6: Test Save Functionality ===');

    // Find first save button
    const saveButtons = await page.locator('button:has-text("Save"), button[aria-label*="save" i]').all();

    if (saveButtons.length === 0) {
      console.log('⚠ Warning: No save buttons found, attempting alternative selectors');
      const allButtons = await page.locator('button').all();
      console.log(`Found ${allButtons.length} total buttons on page`);

      // Try to find by icon or class
      const iconButtons = await page.locator('button svg, button [class*="bookmark"], button [class*="save"]').all();
      console.log(`Found ${iconButtons.length} buttons with bookmark/save icons`);
    }

    let saveTestPassed = false;
    let unsaveTestPassed = false;
    let initialSaveCount = 'N/A';
    let afterSaveCount = 'N/A';
    let afterUnsaveCount = 'N/A';

    if (saveButtons.length > 0) {
      const firstSaveButton = saveButtons[0];

      // Get initial state
      const initialText = await firstSaveButton.textContent();
      const initialAriaLabel = await firstSaveButton.getAttribute('aria-label');
      console.log(`Initial button state - Text: "${initialText}", Aria-label: "${initialAriaLabel}"`);

      // Try to get save count
      try {
        const parentPost = await firstSaveButton.locator('xpath=ancestor::article | ancestor::div[contains(@class, "post")]').first();
        const countElement = await parentPost.locator('[data-testid*="save-count"], [class*="save"] [class*="count"]').first();
        if (countElement) {
          initialSaveCount = await countElement.textContent() || 'N/A';
        }
      } catch (e) {
        console.log('Could not locate save count element');
      }

      console.log(`Initial save count: ${initialSaveCount}`);

      // Click to save
      await firstSaveButton.click();
      await page.waitForTimeout(2000); // Wait for state update

      // Take Screenshot #3: After save action
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '03-after-save.png'),
        fullPage: true
      });
      console.log('✓ Screenshot #3 saved: 03-after-save.png');

      // Check state after save
      const afterSaveText = await firstSaveButton.textContent();
      const afterSaveAriaLabel = await firstSaveButton.getAttribute('aria-label');
      console.log(`After save - Text: "${afterSaveText}", Aria-label: "${afterSaveAriaLabel}"`);

      // Try to get updated save count
      try {
        const parentPost = await firstSaveButton.locator('xpath=ancestor::article | ancestor::div[contains(@class, "post")]').first();
        const countElement = await parentPost.locator('[data-testid*="save-count"], [class*="save"] [class*="count"]').first();
        if (countElement) {
          afterSaveCount = await countElement.textContent() || 'N/A';
        }
      } catch (e) {
        console.log('Could not locate save count element after save');
      }

      console.log(`Save count after save: ${afterSaveCount}`);

      // Verify state changed
      saveTestPassed =
        (afterSaveText !== initialText) ||
        (afterSaveAriaLabel !== initialAriaLabel) ||
        (afterSaveCount !== initialSaveCount);

      console.log(`Save functionality test: ${saveTestPassed ? '✓ PASSED' : '✗ FAILED'}`);

      console.log('\n=== STEP 7: Test Unsave Functionality ===');

      // Click again to unsave
      await firstSaveButton.click();
      await page.waitForTimeout(2000); // Wait for state update

      // Take Screenshot #4: After unsave action
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '04-after-unsave.png'),
        fullPage: true
      });
      console.log('✓ Screenshot #4 saved: 04-after-unsave.png');

      // Check state after unsave
      const afterUnsaveText = await firstSaveButton.textContent();
      const afterUnsaveAriaLabel = await firstSaveButton.getAttribute('aria-label');
      console.log(`After unsave - Text: "${afterUnsaveText}", Aria-label: "${afterUnsaveAriaLabel}"`);

      // Try to get updated save count
      try {
        const parentPost = await firstSaveButton.locator('xpath=ancestor::article | ancestor::div[contains(@class, "post")]').first();
        const countElement = await parentPost.locator('[data-testid*="save-count"], [class*="save"] [class*="count"]').first();
        if (countElement) {
          afterUnsaveCount = await countElement.textContent() || 'N/A';
        }
      } catch (e) {
        console.log('Could not locate save count element after unsave');
      }

      console.log(`Save count after unsave: ${afterUnsaveCount}`);

      // Verify state returned to original or toggled back
      unsaveTestPassed =
        (afterUnsaveText !== afterSaveText) ||
        (afterUnsaveAriaLabel !== afterSaveAriaLabel) ||
        (afterUnsaveCount !== afterSaveCount);

      console.log(`Unsave functionality test: ${unsaveTestPassed ? '✓ PASSED' : '✗ FAILED'}`);
    } else {
      console.log('✗ Could not test save/unsave functionality - no save buttons found');
    }

    // Generate detailed report
    console.log('\n' + '='.repeat(80));
    console.log('FINAL PRODUCTION VALIDATION REPORT');
    console.log('='.repeat(80));

    const report = {
      timestamp: new Date().toISOString(),
      testResults: {
        zeroConsoleErrors: {
          status: errorCount === 0 ? '✅' : '❌',
          actual: errorCount,
          details: errorCount === 0 ? 'No console errors detected' : `${errorCount} console errors found`
        },
        postsLoaded: {
          status: postCount >= 2 ? '✅' : '❌',
          actual: postCount,
          details: `${postCount} posts loaded (minimum required: 2)`
        },
        engagementDataDisplays: {
          status: engagementElements.length > 0 || counterElements.length > 0 ? '✅' : '❌',
          actual: { engagementElements: engagementElements.length, counterElements: counterElements.length },
          details: `${engagementElements.length} engagement elements, ${counterElements.length} counter elements`
        },
        saveFunctionality: {
          status: saveTestPassed ? '✅' : '❌',
          actual: { initialSaveCount, afterSaveCount },
          details: saveTestPassed ? 'Save button state changed successfully' : 'Save button state did not change'
        },
        unsaveFunctionality: {
          status: unsaveTestPassed ? '✅' : '❌',
          actual: { afterSaveCount, afterUnsaveCount },
          details: unsaveTestPassed ? 'Unsave button state changed successfully' : 'Unsave button state did not change'
        }
      },
      screenshots: [
        `${SCREENSHOT_DIR}/01-feed-loaded.png`,
        `${SCREENSHOT_DIR}/02-console-state.png`,
        `${SCREENSHOT_DIR}/03-after-save.png`,
        `${SCREENSHOT_DIR}/04-after-unsave.png`
      ],
      consoleAnalysis: {
        totalMessages: consoleMessages.length,
        errors: consoleErrors.length,
        errorsExcludingWebSocket: errorCount,
        warnings: consoleWarnings.length
      }
    };

    // Print full error list if any errors found
    if (consoleErrors.length > 0) {
      console.log('\n' + '='.repeat(80));
      console.log('CONSOLE ERRORS DETECTED:');
      console.log('='.repeat(80));
      consoleErrors.forEach((error, index) => {
        console.log(`\nError #${index + 1}:`);
        console.log(`Timestamp: ${error.timestamp}`);
        console.log(`Message: ${error.text}`);
        console.log('-'.repeat(80));
      });
    }

    // Print warnings if any
    if (consoleWarnings.length > 0) {
      console.log('\n' + '='.repeat(80));
      console.log('CONSOLE WARNINGS:');
      console.log('='.repeat(80));
      consoleWarnings.slice(0, 10).forEach((warning, index) => {
        console.log(`Warning #${index + 1}: ${warning.text}`);
      });
      if (consoleWarnings.length > 10) {
        console.log(`... and ${consoleWarnings.length - 10} more warnings`);
      }
    }

    // Save detailed report to file
    const reportPath = path.join('/workspaces/agent-feed', 'FINAL_VALIDATION_REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n✓ Detailed report saved to: ${reportPath}`);

    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('VALIDATION SUMMARY:');
    console.log('='.repeat(80));
    console.log(`${report.testResults.zeroConsoleErrors.status} Zero Console Errors: ${report.testResults.zeroConsoleErrors.details}`);
    console.log(`${report.testResults.postsLoaded.status} Posts Loaded: ${report.testResults.postsLoaded.details}`);
    console.log(`${report.testResults.engagementDataDisplays.status} Engagement Data: ${report.testResults.engagementDataDisplays.details}`);
    console.log(`${report.testResults.saveFunctionality.status} Save Functionality: ${report.testResults.saveFunctionality.details}`);
    console.log(`${report.testResults.unsaveFunctionality.status} Unsave Functionality: ${report.testResults.unsaveFunctionality.details}`);
    console.log('='.repeat(80));

    // Determine overall pass/fail
    const allTestsPassed =
      errorCount === 0 &&
      postCount >= 2 &&
      (engagementElements.length > 0 || counterElements.length > 0) &&
      saveTestPassed &&
      unsaveTestPassed;

    console.log(`\nOVERALL RESULT: ${allTestsPassed ? '✅ PRODUCTION READY' : '❌ ISSUES DETECTED'}`);
    console.log('='.repeat(80) + '\n');

    // Assertions for test framework
    expect(errorCount, 'Should have zero console errors (excluding WebSocket)').toBe(0);
    expect(postCount, 'Should have at least 2 posts loaded').toBeGreaterThanOrEqual(2);
    expect(engagementElements.length + counterElements.length, 'Should have engagement elements').toBeGreaterThan(0);

    await context.close();
  });
});
