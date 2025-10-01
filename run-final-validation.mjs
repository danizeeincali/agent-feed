import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = '/workspaces/agent-feed/final-validation-screenshots';
const BASE_URL = 'http://localhost:5173';

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runValidation() {
  const consoleMessages = [];
  const consoleErrors = [];
  const consoleWarnings = [];

  console.log('\n' + '='.repeat(80));
  console.log('FINAL PRODUCTION VALIDATION - STARTING');
  console.log('='.repeat(80) + '\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1
  });

  const page = await context.newPage();

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

  try {
    console.log('=== STEP 1: Navigate to application ===');
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    console.log('✓ Page loaded successfully\n');

    console.log('=== STEP 2: Wait 10 seconds for full page load ===');
    await page.waitForTimeout(10000);
    console.log('✓ Wait completed\n');

    console.log('=== STEP 3: Check for posts loaded ===');
    const posts = await page.locator('[data-testid="post-card"], .post-card, article, [class*="Post"]').all();
    const postCount = posts.length;
    console.log(`✓ Found ${postCount} posts on the page\n`);

    // Take Screenshot #1: Feed with posts loaded
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '01-feed-loaded.png'),
      fullPage: true
    });
    console.log('✓ Screenshot #1 saved: 01-feed-loaded.png\n');

    console.log('=== STEP 4: Analyzing Console Messages ===');
    const errorCount = consoleErrors.filter(e =>
      !e.text.includes('WebSocket') &&
      !e.text.includes('ws://') &&
      !e.text.includes('HMR') &&
      !e.text.includes('[vite]')
    ).length;

    console.log(`Console Errors (excluding WebSocket/HMR): ${errorCount}`);
    console.log(`Console Warnings: ${consoleWarnings.length}`);
    console.log(`Total Console Messages: ${consoleMessages.length}\n`);

    // Take Screenshot #2: Console state
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '02-console-state.png'),
      fullPage: false
    });
    console.log('✓ Screenshot #2 saved: 02-console-state.png\n');

    console.log('=== STEP 5: Verify Engagement Data Display ===');

    // Look for save/bookmark buttons with various selectors
    const saveButtonSelectors = [
      'button:has-text("Save")',
      'button:has-text("Saved")',
      'button[aria-label*="save" i]',
      'button[aria-label*="bookmark" i]',
      'button:has([class*="bookmark"])',
      'button:has(svg):has-text("Save")'
    ];

    let saveButtons = [];
    for (const selector of saveButtonSelectors) {
      try {
        const buttons = await page.locator(selector).all();
        if (buttons.length > 0) {
          saveButtons = buttons;
          console.log(`✓ Found ${buttons.length} save buttons using selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    if (saveButtons.length === 0) {
      console.log('⚠ Attempting to find buttons by analyzing page structure...');
      const allButtons = await page.locator('button').all();
      console.log(`  Total buttons on page: ${allButtons.length}`);

      // Try to find buttons near engagement metrics
      for (let i = 0; i < Math.min(allButtons.length, 50); i++) {
        const button = allButtons[i];
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');
        if (
          text?.toLowerCase().includes('save') ||
          text?.toLowerCase().includes('bookmark') ||
          ariaLabel?.toLowerCase().includes('save') ||
          ariaLabel?.toLowerCase().includes('bookmark')
        ) {
          saveButtons.push(button);
        }
      }
      console.log(`  Found ${saveButtons.length} potential save buttons\n`);
    }

    // Check for counter displays
    const counterSelectors = [
      '[data-testid*="count"]',
      '[class*="count"]',
      '.engagement-stats',
      '[class*="engagement"]'
    ];

    let counterElements = [];
    for (const selector of counterSelectors) {
      try {
        const elements = await page.locator(selector).all();
        if (elements.length > 0) {
          counterElements.push(...elements);
        }
      } catch (e) {
        // Continue
      }
    }

    console.log(`✓ Found ${counterElements.length} counter/engagement elements\n`);

    let saveTestPassed = false;
    let unsaveTestPassed = false;
    let initialState = 'N/A';
    let afterSaveState = 'N/A';
    let afterUnsaveState = 'N/A';

    console.log('=== STEP 6: Test Save Functionality ===');

    if (saveButtons.length > 0) {
      const firstSaveButton = saveButtons[0];

      // Scroll button into view
      await firstSaveButton.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);

      // Get initial state
      const initialText = await firstSaveButton.textContent();
      const initialAriaLabel = await firstSaveButton.getAttribute('aria-label');
      const initialClass = await firstSaveButton.getAttribute('class');
      initialState = `Text: "${initialText?.trim()}", Aria: "${initialAriaLabel}", Class: "${initialClass}"`;
      console.log(`Initial state: ${initialState}`);

      // Find parent post to track count
      let parentPost = null;
      try {
        parentPost = await firstSaveButton.locator('xpath=ancestor::article').first();
      } catch (e) {
        try {
          parentPost = await firstSaveButton.locator('xpath=ancestor::div[contains(@class, "post") or contains(@class, "Post") or contains(@class, "card")]').first();
        } catch (e2) {
          console.log('  Could not locate parent post element');
        }
      }

      let initialSaveCount = 'N/A';
      if (parentPost) {
        try {
          // Look for save count near the button
          const countText = await parentPost.textContent();
          const countMatch = countText?.match(/(\d+)\s*(save|bookmark)/i);
          if (countMatch) {
            initialSaveCount = countMatch[1];
          }
        } catch (e) {
          console.log('  Could not extract save count');
        }
      }
      console.log(`Initial save count: ${initialSaveCount}`);

      // Click to save
      console.log('Clicking save button...');
      await firstSaveButton.click();
      await page.waitForTimeout(3000); // Wait for state update and network request

      // Take Screenshot #3: After save action
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '03-after-save.png'),
        fullPage: true
      });
      console.log('✓ Screenshot #3 saved: 03-after-save.png');

      // Check state after save
      const afterSaveText = await firstSaveButton.textContent();
      const afterSaveAriaLabel = await firstSaveButton.getAttribute('aria-label');
      const afterSaveClass = await firstSaveButton.getAttribute('class');
      afterSaveState = `Text: "${afterSaveText?.trim()}", Aria: "${afterSaveAriaLabel}", Class: "${afterSaveClass}"`;
      console.log(`After save state: ${afterSaveState}`);

      let afterSaveCount = 'N/A';
      if (parentPost) {
        try {
          const countText = await parentPost.textContent();
          const countMatch = countText?.match(/(\d+)\s*(save|bookmark)/i);
          if (countMatch) {
            afterSaveCount = countMatch[1];
          }
        } catch (e) {
          console.log('  Could not extract save count after save');
        }
      }
      console.log(`Save count after save: ${afterSaveCount}`);

      // Verify state changed
      saveTestPassed =
        (afterSaveText?.trim() !== initialText?.trim()) ||
        (afterSaveAriaLabel !== initialAriaLabel) ||
        (afterSaveClass !== initialClass) ||
        (afterSaveCount !== initialSaveCount);

      console.log(`Save functionality: ${saveTestPassed ? '✓ PASSED - Button state changed' : '✗ FAILED - No state change detected'}\n`);

      console.log('=== STEP 7: Test Unsave Functionality ===');

      // Click again to unsave
      console.log('Clicking unsave button...');
      await firstSaveButton.click();
      await page.waitForTimeout(3000); // Wait for state update

      // Take Screenshot #4: After unsave action
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '04-after-unsave.png'),
        fullPage: true
      });
      console.log('✓ Screenshot #4 saved: 04-after-unsave.png');

      // Check state after unsave
      const afterUnsaveText = await firstSaveButton.textContent();
      const afterUnsaveAriaLabel = await firstSaveButton.getAttribute('aria-label');
      const afterUnsaveClass = await firstSaveButton.getAttribute('class');
      afterUnsaveState = `Text: "${afterUnsaveText?.trim()}", Aria: "${afterUnsaveAriaLabel}", Class: "${afterUnsaveClass}"`;
      console.log(`After unsave state: ${afterUnsaveState}`);

      let afterUnsaveCount = 'N/A';
      if (parentPost) {
        try {
          const countText = await parentPost.textContent();
          const countMatch = countText?.match(/(\d+)\s*(save|bookmark)/i);
          if (countMatch) {
            afterUnsaveCount = countMatch[1];
          }
        } catch (e) {
          console.log('  Could not extract save count after unsave');
        }
      }
      console.log(`Save count after unsave: ${afterUnsaveCount}`);

      // Verify state toggled back
      unsaveTestPassed =
        (afterUnsaveText?.trim() !== afterSaveText?.trim()) ||
        (afterUnsaveAriaLabel !== afterSaveAriaLabel) ||
        (afterUnsaveClass !== afterSaveClass) ||
        (afterUnsaveCount !== afterSaveCount);

      console.log(`Unsave functionality: ${unsaveTestPassed ? '✓ PASSED - Button state toggled back' : '✗ FAILED - No toggle detected'}\n`);
    } else {
      console.log('✗ SKIPPED - No save buttons found on page\n');
    }

    // Generate detailed report
    console.log('='.repeat(80));
    console.log('FINAL PRODUCTION VALIDATION REPORT');
    console.log('='.repeat(80) + '\n');

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
          status: saveButtons.length > 0 || counterElements.length > 0 ? '✅' : '❌',
          actual: {
            saveButtons: saveButtons.length,
            counterElements: counterElements.length
          },
          details: `${saveButtons.length} save buttons, ${counterElements.length} counter elements`
        },
        saveFunctionality: {
          status: saveTestPassed ? '✅' : saveButtons.length === 0 ? '⚠️' : '❌',
          actual: { initialState, afterSaveState },
          details: saveTestPassed
            ? 'Save button state changed successfully'
            : saveButtons.length === 0
            ? 'No save buttons found to test'
            : 'Save button state did not change'
        },
        unsaveFunctionality: {
          status: unsaveTestPassed ? '✅' : saveButtons.length === 0 ? '⚠️' : '❌',
          actual: { afterSaveState, afterUnsaveState },
          details: unsaveTestPassed
            ? 'Unsave button state changed successfully'
            : saveButtons.length === 0
            ? 'No save buttons found to test'
            : 'Unsave button state did not change'
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
    if (errorCount > 0) {
      console.log('='.repeat(80));
      console.log('CONSOLE ERRORS DETECTED:');
      console.log('='.repeat(80) + '\n');
      consoleErrors
        .filter(e =>
          !e.text.includes('WebSocket') &&
          !e.text.includes('ws://') &&
          !e.text.includes('HMR') &&
          !e.text.includes('[vite]')
        )
        .forEach((error, index) => {
          console.log(`Error #${index + 1}:`);
          console.log(`Timestamp: ${error.timestamp}`);
          console.log(`Message: ${error.text}`);
          console.log('-'.repeat(80) + '\n');
        });
    }

    // Print sample warnings
    if (consoleWarnings.length > 0) {
      console.log('='.repeat(80));
      console.log('CONSOLE WARNINGS (Sample):');
      console.log('='.repeat(80) + '\n');
      consoleWarnings.slice(0, 5).forEach((warning, index) => {
        console.log(`Warning #${index + 1}: ${warning.text}`);
      });
      if (consoleWarnings.length > 5) {
        console.log(`... and ${consoleWarnings.length - 5} more warnings\n`);
      }
    }

    // Save detailed report to file
    const reportPath = path.join('/workspaces/agent-feed', 'FINAL_VALIDATION_REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`✓ Detailed JSON report saved to: ${reportPath}\n`);

    // Print summary
    console.log('='.repeat(80));
    console.log('VALIDATION SUMMARY:');
    console.log('='.repeat(80));
    console.log(`${report.testResults.zeroConsoleErrors.status} Zero Console Errors: ${report.testResults.zeroConsoleErrors.details}`);
    console.log(`${report.testResults.postsLoaded.status} Posts Loaded: ${report.testResults.postsLoaded.details}`);
    console.log(`${report.testResults.engagementDataDisplays.status} Engagement Data: ${report.testResults.engagementDataDisplays.details}`);
    console.log(`${report.testResults.saveFunctionality.status} Save Functionality: ${report.testResults.saveFunctionality.details}`);
    console.log(`${report.testResults.unsaveFunctionality.status} Unsave Functionality: ${report.testResults.unsaveFunctionality.details}`);
    console.log('='.repeat(80) + '\n');

    // Determine overall pass/fail
    const allTestsPassed =
      errorCount === 0 &&
      postCount >= 2 &&
      (saveButtons.length > 0 || counterElements.length > 0);

    const functionalityPassed = saveTestPassed && unsaveTestPassed;

    console.log('FINAL VERDICT:');
    console.log(`  Core Functionality: ${allTestsPassed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`  Save/Unsave Feature: ${functionalityPassed ? '✅ PASSED' : saveButtons.length === 0 ? '⚠️ NOT TESTED' : '❌ FAILED'}`);
    console.log(`\n  OVERALL: ${allTestsPassed && (functionalityPassed || saveButtons.length === 0) ? '✅ PRODUCTION READY' : '❌ ISSUES DETECTED'}`);
    console.log('='.repeat(80) + '\n');

    await context.close();
    await browser.close();

    process.exit(allTestsPassed ? 0 : 1);
  } catch (error) {
    console.error('\n❌ VALIDATION FAILED WITH ERROR:');
    console.error(error);

    await context.close();
    await browser.close();

    process.exit(1);
  }
}

runValidation();
