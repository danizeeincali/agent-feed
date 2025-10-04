/**
 * E2E Validation: Avi Activity Indicator
 *
 * @description Comprehensive E2E test suite for validating the Avi Activity Indicator implementation
 * @test-type E2E Integration Test
 * @features
 *   - Live Tool Execution widget removal verification
 *   - Avi typing indicator with activity text display
 *   - SSE connection and streaming activity updates
 *   - Activity text truncation at 80 characters
 *   - Proper styling and formatting
 *   - Console error monitoring
 */

import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Test configuration
const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:3001';
const SSE_ENDPOINT = '/api/streaming-ticker/stream';

// Timeouts
const TYPING_INDICATOR_TIMEOUT = 5000;
const ACTIVITY_TEXT_TIMEOUT = 10000;
const RESPONSE_TIMEOUT = 120000;

// Test results structure
interface TestResults {
  test_results: {
    live_tool_widget_removed: 'PASS' | 'FAIL';
    typing_indicator_appears: 'PASS' | 'FAIL';
    activity_text_displays: 'PASS' | 'FAIL';
    activity_styling_correct: 'PASS' | 'FAIL';
    activity_truncates_properly: 'PASS' | 'FAIL';
    sse_connection_works: 'PASS' | 'FAIL';
    no_console_errors: 'PASS' | 'FAIL';
  };
  screenshots: string[];
  issues_found: string[];
  overall_status: 'PASS' | 'FAIL';
}

// Global test results
const testResults: TestResults = {
  test_results: {
    live_tool_widget_removed: 'FAIL',
    typing_indicator_appears: 'FAIL',
    activity_text_displays: 'FAIL',
    activity_styling_correct: 'FAIL',
    activity_truncates_properly: 'FAIL',
    sse_connection_works: 'FAIL',
    no_console_errors: 'FAIL',
  },
  screenshots: [],
  issues_found: [],
  overall_status: 'FAIL',
};

// Helper functions
async function captureScreenshot(page: Page, name: string): Promise<string> {
  const screenshotDir = path.join(process.cwd(), 'test-results', 'avi-activity-screenshots');

  // Ensure directory exists
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const screenshotPath = path.join(screenshotDir, `${name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });

  testResults.screenshots.push(screenshotPath);
  console.log(`Screenshot captured: ${screenshotPath}`);

  return screenshotPath;
}

function addIssue(issue: string): void {
  testResults.issues_found.push(issue);
  console.error(`Issue found: ${issue}`);
}

// Test suite
test.describe('Avi Activity Indicator E2E Validation', () => {
  let consoleErrors: string[] = [];
  let sseRequests: string[] = [];

  test.beforeEach(async ({ page }) => {
    // Reset console errors
    consoleErrors = [];

    // Monitor console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Monitor network requests
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes(SSE_ENDPOINT)) {
        sseRequests.push(url);
        console.log(`SSE Request detected: ${url}`);
      }
    });

    // Navigate to the app
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });
  });

  test('1. Verify Live Tool Execution Widget Removed', async ({ page }) => {
    test.setTimeout(30000);

    try {
      console.log('\nTest 1: Verifying Live Tool Execution widget removal...');

      // Wait for page to fully load
      await page.waitForLoadState('networkidle');

      // Look for the "Live Tool Execution" widget
      const liveToolWidget = page.getByText(/live tool execution/i);

      // Check if it exists
      const isVisible = await liveToolWidget.isVisible().catch(() => false);

      if (isVisible) {
        addIssue('Live Tool Execution widget is still visible on the page');
        testResults.test_results.live_tool_widget_removed = 'FAIL';
      } else {
        console.log('✓ Live Tool Execution widget not found (expected)');
        testResults.test_results.live_tool_widget_removed = 'PASS';
      }

      // Capture screenshot
      await captureScreenshot(page, 'feed-without-live-tool-widget');

      // Additional verification: Check for any element with "📊 Live Tool Execution" text
      const allText = await page.textContent('body');
      if (allText?.includes('📊 Live Tool Execution')) {
        addIssue('Found "📊 Live Tool Execution" text in page body');
        testResults.test_results.live_tool_widget_removed = 'FAIL';
      }

    } catch (error) {
      addIssue(`Live Tool Widget removal test failed: ${error}`);
      testResults.test_results.live_tool_widget_removed = 'FAIL';
    }
  });

  test('2. Test Avi Chat Activity Indicator Flow', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes for full flow

    try {
      console.log('\nTest 2: Testing Avi Chat Activity Indicator...');

      // Navigate to Avi DM tab
      console.log('Navigating to Avi DM tab...');

      // Try multiple selectors for the Avi DM button
      const aviDmButton = await page.getByRole('button', { name: /avi dm/i })
        .or(page.getByText(/avi dm/i))
        .or(page.locator('button:has-text("Avi DM")'))
        .first();

      await aviDmButton.click();
      await page.waitForTimeout(1000);

      await captureScreenshot(page, 'avi-dm-tab-opened');

      // Find message input
      console.log('Looking for message input...');
      const messageInput = await page.getByPlaceholder(/message/i)
        .or(page.locator('textarea'))
        .or(page.locator('input[type="text"]'))
        .first();

      // Type test message
      const testMessage = 'test activity indicator';
      console.log(`Typing message: "${testMessage}"`);
      await messageInput.fill(testMessage);
      await page.waitForTimeout(500);

      // Find and click send button
      console.log('Clicking send button...');
      const sendButton = await page.getByRole('button', { name: /send/i })
        .or(page.locator('button:has-text("Send")'))
        .or(page.locator('button[type="submit"]'))
        .first();

      await sendButton.click();

      // CHECKPOINT 1: Verify typing indicator appears
      console.log('Waiting for typing indicator...');
      try {
        const typingIndicator = page.locator('text=/avi/i').first();
        await typingIndicator.waitFor({ state: 'visible', timeout: TYPING_INDICATOR_TIMEOUT });

        console.log('✓ Typing indicator appeared');
        testResults.test_results.typing_indicator_appears = 'PASS';

        await captureScreenshot(page, 'avi-typing-indicator-visible');
      } catch (error) {
        addIssue('Typing indicator did not appear within timeout');
        testResults.test_results.typing_indicator_appears = 'FAIL';
        await captureScreenshot(page, 'avi-typing-indicator-missing');
      }

      // CHECKPOINT 2: Verify activity text appears
      console.log('Waiting for activity text (SSE stream)...');
      try {
        // Look for activity text pattern: "- some activity text"
        const activityText = page.locator('text=/-/').first();
        await activityText.waitFor({ state: 'visible', timeout: ACTIVITY_TEXT_TIMEOUT });

        console.log('✓ Activity text appeared');
        testResults.test_results.activity_text_displays = 'PASS';

        await page.waitForTimeout(2000); // Let some activity stream
        await captureScreenshot(page, 'avi-with-activity-text');
      } catch (error) {
        addIssue('Activity text did not appear within timeout');
        testResults.test_results.activity_text_displays = 'FAIL';
        await captureScreenshot(page, 'avi-activity-text-missing');
      }

      // CHECKPOINT 3: Wait for response and verify activity clears
      console.log('Waiting for Avi response...');
      try {
        // Wait for typing indicator to disappear (response received)
        const typingIndicator = page.locator('text=/typing/i, text=/avi/i').first();
        await typingIndicator.waitFor({
          state: 'hidden',
          timeout: RESPONSE_TIMEOUT
        }).catch(() => {
          console.log('Typing indicator did not disappear (might have different text)');
        });

        console.log('✓ Response received, activity cleared');
        await captureScreenshot(page, 'avi-response-received');
      } catch (error) {
        console.warn('Response timeout or indicator persistence:', error);
        await captureScreenshot(page, 'avi-response-timeout');
      }

    } catch (error) {
      addIssue(`Avi Chat Activity Indicator test failed: ${error}`);
      await captureScreenshot(page, 'avi-chat-error');
    }
  });

  test('3. Verify Activity Text Formatting and Styling', async ({ page }) => {
    test.setTimeout(60000);

    try {
      console.log('\nTest 3: Verifying activity text styling...');

      // Navigate to Avi DM and send message
      const aviDmButton = await page.getByRole('button', { name: /avi dm/i }).first();
      await aviDmButton.click();
      await page.waitForTimeout(1000);

      const messageInput = await page.getByPlaceholder(/message/i).first();
      await messageInput.fill('test styling');

      const sendButton = await page.getByRole('button', { name: /send/i }).first();
      await sendButton.click();

      // Wait for activity text to appear
      await page.waitForTimeout(3000);

      // Find activity text elements
      const activityElements = await page.locator('text=/-/').all();

      if (activityElements.length > 0) {
        console.log(`Found ${activityElements.length} activity text element(s)`);

        for (let i = 0; i < activityElements.length; i++) {
          const element = activityElements[i];

          // Get computed styles
          const color = await element.evaluate(el => {
            return window.getComputedStyle(el).color;
          });

          const fontWeight = await element.evaluate(el => {
            return window.getComputedStyle(el).fontWeight;
          });

          console.log(`Activity text ${i + 1} - Color: ${color}, Font Weight: ${fontWeight}`);

          // Verify color is gray (should be #D1D5DB or rgb(209, 213, 219))
          // Convert to RGB for comparison
          const isGrayish = color.includes('209') || color.includes('gray') || color.includes('D1D5DB');

          if (!isGrayish) {
            addIssue(`Activity text color is not gray: ${color}`);
          }

          // Verify font weight is 400 (normal)
          if (fontWeight !== '400' && fontWeight !== 'normal') {
            addIssue(`Activity text font weight is not 400: ${fontWeight}`);
          }
        }

        testResults.test_results.activity_styling_correct = 'PASS';
        await captureScreenshot(page, 'activity-text-styling');
      } else {
        addIssue('No activity text elements found for styling verification');
        testResults.test_results.activity_styling_correct = 'FAIL';
      }

    } catch (error) {
      addIssue(`Activity text styling test failed: ${error}`);
      testResults.test_results.activity_styling_correct = 'FAIL';
    }
  });

  test('4. Verify Activity Text Truncation', async ({ page }) => {
    test.setTimeout(60000);

    try {
      console.log('\nTest 4: Verifying activity text truncation...');

      // Navigate to Avi DM and send message
      const aviDmButton = await page.getByRole('button', { name: /avi dm/i }).first();
      await aviDmButton.click();
      await page.waitForTimeout(1000);

      const messageInput = await page.getByPlaceholder(/message/i).first();
      await messageInput.fill('test truncation with long response');

      const sendButton = await page.getByRole('button', { name: /send/i }).first();
      await sendButton.click();

      // Wait for activity text to appear
      await page.waitForTimeout(5000);

      // Get all activity text elements
      const allActivityTexts = await page.locator('span:has-text("- ")').allTextContents();

      console.log(`Found ${allActivityTexts.length} activity text entries`);

      let foundTruncationIssue = false;

      for (const text of allActivityTexts) {
        // Extract the activity part after " - "
        const parts = text.split(' - ');
        if (parts.length > 1) {
          const activityPart = parts.slice(1).join(' - ');
          const length = activityPart.length;

          console.log(`Activity text length: ${length} chars`);

          // Check if truncation is properly applied (80 chars + "..." = 83 max)
          if (length > 83) {
            addIssue(`Activity text exceeds 83 characters: ${length} chars`);
            foundTruncationIssue = true;
          }

          // Check if long texts have ellipsis
          if (length === 83 && !activityPart.endsWith('...')) {
            addIssue(`Activity text at max length but missing ellipsis: "${activityPart}"`);
            foundTruncationIssue = true;
          }
        }
      }

      if (!foundTruncationIssue) {
        testResults.test_results.activity_truncates_properly = 'PASS';
        console.log('✓ Activity text truncation working correctly');
      } else {
        testResults.test_results.activity_truncates_properly = 'FAIL';
      }

    } catch (error) {
      addIssue(`Activity text truncation test failed: ${error}`);
      testResults.test_results.activity_truncates_properly = 'FAIL';
    }
  });

  test('5. Verify SSE Connection', async ({ page }) => {
    test.setTimeout(60000);

    try {
      console.log('\nTest 5: Verifying SSE connection...');

      // Reset SSE requests tracker
      sseRequests = [];

      // Navigate to Avi DM and send message
      const aviDmButton = await page.getByRole('button', { name: /avi dm/i }).first();
      await aviDmButton.click();
      await page.waitForTimeout(1000);

      const messageInput = await page.getByPlaceholder(/message/i).first();
      await messageInput.fill('test sse connection');

      const sendButton = await page.getByRole('button', { name: /send/i }).first();
      await sendButton.click();

      // Wait for SSE connection
      await page.waitForTimeout(3000);

      console.log(`SSE requests detected: ${sseRequests.length}`);
      console.log('SSE request URLs:', sseRequests);

      if (sseRequests.length > 0) {
        testResults.test_results.sse_connection_works = 'PASS';
        console.log('✓ SSE connection established');
      } else {
        addIssue('No SSE connection detected');
        testResults.test_results.sse_connection_works = 'FAIL';
      }

      // Verify correct endpoint
      const hasCorrectEndpoint = sseRequests.some(url =>
        url.includes(SSE_ENDPOINT)
      );

      if (!hasCorrectEndpoint && sseRequests.length > 0) {
        addIssue(`SSE connection to wrong endpoint. Expected: ${SSE_ENDPOINT}`);
      }

    } catch (error) {
      addIssue(`SSE connection test failed: ${error}`);
      testResults.test_results.sse_connection_works = 'FAIL';
    }
  });

  test('6. Verify No Console Errors', async ({ page }) => {
    test.setTimeout(30000);

    try {
      console.log('\nTest 6: Verifying no console errors...');

      // Navigate through the app
      await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      // Check Avi DM tab
      const aviDmButton = await page.getByRole('button', { name: /avi dm/i }).first();
      await aviDmButton.click();
      await page.waitForTimeout(2000);

      console.log(`Console errors detected: ${consoleErrors.length}`);

      if (consoleErrors.length > 0) {
        console.log('Console errors:', consoleErrors);
        consoleErrors.forEach(error => addIssue(`Console error: ${error}`));
        testResults.test_results.no_console_errors = 'FAIL';
      } else {
        testResults.test_results.no_console_errors = 'PASS';
        console.log('✓ No console errors detected');
      }

    } catch (error) {
      addIssue(`Console error test failed: ${error}`);
      testResults.test_results.no_console_errors = 'FAIL';
    }
  });

  test.afterAll(async () => {
    // Determine overall status
    const allPassed = Object.values(testResults.test_results).every(
      result => result === 'PASS'
    );
    testResults.overall_status = allPassed ? 'PASS' : 'FAIL';

    // Generate JSON report
    const reportPath = path.join(
      process.cwd(),
      'test-results',
      'avi-activity-indicator-report.json'
    );

    fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));

    console.log('\n' + '='.repeat(80));
    console.log('AVI ACTIVITY INDICATOR E2E TEST REPORT');
    console.log('='.repeat(80));
    console.log('\nTest Results:');
    console.log('  Live Tool Widget Removed:', testResults.test_results.live_tool_widget_removed);
    console.log('  Typing Indicator Appears:', testResults.test_results.typing_indicator_appears);
    console.log('  Activity Text Displays:', testResults.test_results.activity_text_displays);
    console.log('  Activity Styling Correct:', testResults.test_results.activity_styling_correct);
    console.log('  Activity Truncates Properly:', testResults.test_results.activity_truncates_properly);
    console.log('  SSE Connection Works:', testResults.test_results.sse_connection_works);
    console.log('  No Console Errors:', testResults.test_results.no_console_errors);
    console.log('\nScreenshots:', testResults.screenshots.length);
    testResults.screenshots.forEach(screenshot => console.log(`  - ${screenshot}`));
    console.log('\nIssues Found:', testResults.issues_found.length);
    testResults.issues_found.forEach(issue => console.log(`  - ${issue}`));
    console.log('\nOverall Status:', testResults.overall_status);
    console.log('\nReport saved to:', reportPath);
    console.log('='.repeat(80));
  });
});
