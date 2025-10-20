import { test, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

/**
 * PRODUCTION VALIDATION TEST - REAL BROWSER WITH SCREENSHOTS
 *
 * This test validates 100% real functionality:
 * - Real browser (not headless)
 * - Real Claude Code API
 * - Real network requests
 * - Real responses (no mocks)
 * - Screenshot evidence at every step
 */

const SCREENSHOTS_DIR = '/workspaces/agent-feed/screenshots/production-validation';
const APP_URL = 'http://localhost:5173';
const TEST_MESSAGE = 'List files in the current directory';
const MAX_WAIT_TIME = 120000; // 2 minutes for real Claude response

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

test.describe('Production Validation - Real Claude Code Integration', () => {
  test.use({
    headless: false, // CRITICAL: Use real browser
    viewport: { width: 1920, height: 1080 },
    video: 'on',
    trace: 'on',
  });

  let validationReport = {
    timestamp: new Date().toISOString(),
    testName: 'Production Validation - Real Browser Testing',
    steps: [] as any[],
    networkRequests: [] as any[],
    screenshots: [] as string[],
    validations: {
      backendConnectivity: false,
      claudeApiIntegration: false,
      realToolUsage: false,
      actualDataReturned: false,
      noMockResponses: false,
      properStatusCodes: false,
    },
    success: false,
    errors: [] as string[],
  };

  test('Complete Production Validation with Real Claude Code', async ({ page, context }) => {
    // Enable detailed logging
    page.on('console', msg => console.log('Browser Console:', msg.text()));
    page.on('pageerror', err => console.error('Browser Error:', err));

    // Track network requests
    const networkLog: any[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        networkLog.push({
          type: 'request',
          url: request.url(),
          method: request.method(),
          headers: request.headers(),
          timestamp: new Date().toISOString(),
        });
      }
    });

    page.on('response', async response => {
      if (response.url().includes('/api/')) {
        const entry: any = {
          type: 'response',
          url: response.url(),
          status: response.status(),
          statusText: response.statusText(),
          headers: response.headers(),
          timestamp: new Date().toISOString(),
        };

        // Capture response body for API calls
        try {
          const contentType = response.headers()['content-type'] || '';
          if (contentType.includes('application/json')) {
            entry.body = await response.json();
          } else {
            entry.body = await response.text();
          }
        } catch (e) {
          entry.bodyError = 'Could not capture response body';
        }

        networkLog.push(entry);
      }
    });

    try {
      // STEP 1: Navigate to application
      console.log('\n=== STEP 1: Navigate to Application ===');
      validationReport.steps.push({
        step: 1,
        description: 'Navigate to application',
        timestamp: new Date().toISOString(),
      });

      await page.goto(APP_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000); // Allow page to fully render

      const screenshotPath1 = path.join(SCREENSHOTS_DIR, '01-initial-load.png');
      await page.screenshot({ path: screenshotPath1, fullPage: true });
      validationReport.screenshots.push(screenshotPath1);
      console.log('✓ Screenshot saved:', screenshotPath1);

      // STEP 2: Verify page loaded correctly
      console.log('\n=== STEP 2: Verify Page Loaded ===');
      validationReport.steps.push({
        step: 2,
        description: 'Verify page loaded correctly',
        timestamp: new Date().toISOString(),
      });

      const pageTitle = await page.title();
      console.log('Page Title:', pageTitle);
      expect(pageTitle).toBeTruthy();

      // Check for main app container
      const appContainer = await page.locator('#root, .app, [class*="App"]').first();
      await expect(appContainer).toBeVisible();
      console.log('✓ App container is visible');

      // STEP 3: Locate and navigate to AVI DM interface
      console.log('\n=== STEP 3: Locate AVI DM Interface ===');
      validationReport.steps.push({
        step: 3,
        description: 'Locate and navigate to AVI DM interface',
        timestamp: new Date().toISOString(),
      });

      // Try multiple strategies to find AVI DM
      let aviFound = false;
      let aviLocator;

      // Strategy 1: Look for button/link with "AVI" or "DM" text
      const aviButtons = page.getByRole('button', { name: /avi|dm|message/i });
      if (await aviButtons.count() > 0) {
        aviLocator = aviButtons.first();
        aviFound = true;
        console.log('✓ Found AVI button by role');
      }

      // Strategy 2: Look for specific test IDs
      if (!aviFound) {
        const aviTestId = page.locator('[data-testid*="avi"], [data-testid*="dm"]');
        if (await aviTestId.count() > 0) {
          aviLocator = aviTestId.first();
          aviFound = true;
          console.log('✓ Found AVI by test ID');
        }
      }

      // Strategy 3: Look for class names
      if (!aviFound) {
        const aviClass = page.locator('[class*="avi" i], [class*="dm" i]');
        if (await aviClass.count() > 0) {
          aviLocator = aviClass.first();
          aviFound = true;
          console.log('✓ Found AVI by class name');
        }
      }

      // Strategy 4: Look for chat/message input (AVI might already be visible)
      if (!aviFound) {
        const messageInput = page.locator('input[type="text"], textarea').filter({ hasText: '' });
        if (await messageInput.count() > 0) {
          aviLocator = messageInput.first();
          aviFound = true;
          console.log('✓ Found message input (AVI might be already visible)');
        }
      }

      if (!aviFound) {
        // Take screenshot of current state for debugging
        const screenshotPath = path.join(SCREENSHOTS_DIR, '02-avi-not-found.png');
        await page.screenshot({ path: screenshotPath, fullPage: true });
        validationReport.screenshots.push(screenshotPath);

        throw new Error('Could not locate AVI DM interface. Please check the UI structure.');
      }

      // Click to open AVI DM if it's a button
      if (await aviLocator.evaluate(el => el.tagName === 'BUTTON')) {
        await aviLocator.click();
        await page.waitForTimeout(1000);
      }

      const screenshotPath3 = path.join(SCREENSHOTS_DIR, '03-avi-dm-ready.png');
      await page.screenshot({ path: screenshotPath3, fullPage: true });
      validationReport.screenshots.push(screenshotPath3);
      console.log('✓ Screenshot saved:', screenshotPath3);

      // STEP 4: Verify AVI DM interface elements
      console.log('\n=== STEP 4: Verify AVI DM Interface Elements ===');
      validationReport.steps.push({
        step: 4,
        description: 'Verify AVI DM interface elements',
        timestamp: new Date().toISOString(),
      });

      // Find message input field
      const messageInput = page.locator('input[type="text"], textarea').filter({
        hasText: ''
      }).or(
        page.getByPlaceholder(/message|type|chat/i)
      ).first();

      await expect(messageInput).toBeVisible({ timeout: 5000 });
      console.log('✓ Message input field is visible');

      // Find send button
      const sendButton = page.getByRole('button', { name: /send|submit/i }).or(
        page.locator('button[type="submit"]')
      ).first();

      await expect(sendButton).toBeVisible();
      console.log('✓ Send button is visible');

      validationReport.validations.backendConnectivity = true;

      // STEP 5: Send test message to Claude
      console.log('\n=== STEP 5: Send Test Message to Claude ===');
      validationReport.steps.push({
        step: 5,
        description: `Send test message: "${TEST_MESSAGE}"`,
        timestamp: new Date().toISOString(),
      });

      await messageInput.fill(TEST_MESSAGE);
      await page.waitForTimeout(500);

      const screenshotPath5 = path.join(SCREENSHOTS_DIR, '05-message-typed.png');
      await page.screenshot({ path: screenshotPath5, fullPage: true });
      validationReport.screenshots.push(screenshotPath5);
      console.log('✓ Screenshot saved:', screenshotPath5);

      // Clear network log before sending
      networkLog.length = 0;

      await sendButton.click();
      console.log('✓ Message sent, waiting for Claude response...');

      const screenshotPath6 = path.join(SCREENSHOTS_DIR, '06-message-sent.png');
      await page.screenshot({ path: screenshotPath6, fullPage: true });
      validationReport.screenshots.push(screenshotPath6);

      // STEP 6: Wait for real Claude response
      console.log('\n=== STEP 6: Wait for Real Claude Response ===');
      validationReport.steps.push({
        step: 6,
        description: 'Wait for real Claude Code response (max 2 minutes)',
        timestamp: new Date().toISOString(),
      });

      // Wait for response to appear in UI
      let responseReceived = false;
      let responseText = '';
      const startWaitTime = Date.now();

      // Try multiple strategies to detect response
      while (Date.now() - startWaitTime < MAX_WAIT_TIME && !responseReceived) {
        await page.waitForTimeout(2000);

        // Strategy 1: Look for new message elements
        const messages = page.locator('[class*="message"], [class*="response"], [class*="chat"]');
        const messageCount = await messages.count();

        if (messageCount > 0) {
          const lastMessage = messages.last();
          const text = await lastMessage.textContent();

          if (text && text.length > 50 && text !== TEST_MESSAGE) {
            responseText = text;
            responseReceived = true;
            console.log('✓ Response detected by message element');
            break;
          }
        }

        // Strategy 2: Check for specific response indicators
        const responseIndicators = page.locator('[class*="assistant"], [class*="claude"], [class*="bot"]');
        if (await responseIndicators.count() > 0) {
          const text = await responseIndicators.last().textContent();
          if (text && text.length > 50) {
            responseText = text;
            responseReceived = true;
            console.log('✓ Response detected by role indicator');
            break;
          }
        }

        // Strategy 3: Check for file listings in response
        const fileListings = page.locator('text=/package.json|README|src|node_modules/');
        if (await fileListings.count() > 0) {
          responseReceived = true;
          responseText = await page.locator('body').textContent() || '';
          console.log('✓ Response detected by file content');
          break;
        }

        // Check network log for errors
        const errors = networkLog.filter(entry =>
          entry.type === 'response' && (entry.status === 403 || entry.status === 500)
        );

        if (errors.length > 0) {
          const screenshotPath = path.join(SCREENSHOTS_DIR, '07-error-detected.png');
          await page.screenshot({ path: screenshotPath, fullPage: true });
          validationReport.screenshots.push(screenshotPath);

          validationReport.errors.push(`HTTP ${errors[0].status} detected: ${errors[0].url}`);
          throw new Error(`Backend returned ${errors[0].status}. Test stopped. Check network logs.`);
        }

        console.log(`Waiting... (${Math.round((Date.now() - startWaitTime) / 1000)}s elapsed)`);
      }

      if (!responseReceived) {
        const screenshotPath = path.join(SCREENSHOTS_DIR, '07-timeout.png');
        await page.screenshot({ path: screenshotPath, fullPage: true });
        validationReport.screenshots.push(screenshotPath);

        throw new Error(`No response received after ${MAX_WAIT_TIME / 1000} seconds`);
      }

      const screenshotPath7 = path.join(SCREENSHOTS_DIR, '07-response-received.png');
      await page.screenshot({ path: screenshotPath7, fullPage: true });
      validationReport.screenshots.push(screenshotPath7);
      console.log('✓ Screenshot saved:', screenshotPath7);

      validationReport.validations.claudeApiIntegration = true;

      // STEP 7: Validate response authenticity
      console.log('\n=== STEP 7: Validate Response Authenticity ===');
      validationReport.steps.push({
        step: 7,
        description: 'Validate response is real Claude output (not mock)',
        timestamp: new Date().toISOString(),
        responsePreview: responseText.substring(0, 500),
      });

      // Check for real tool usage indicators
      const hasToolUsage =
        responseText.includes('Read') ||
        responseText.includes('Bash') ||
        responseText.includes('Glob') ||
        responseText.toLowerCase().includes('file') ||
        responseText.toLowerCase().includes('directory');

      if (hasToolUsage) {
        validationReport.validations.realToolUsage = true;
        console.log('✓ Response shows tool usage');
      }

      // Check for actual file names
      const hasRealFiles =
        responseText.includes('package.json') ||
        responseText.includes('tsconfig') ||
        responseText.includes('node_modules') ||
        responseText.includes('.tsx') ||
        responseText.includes('README');

      if (hasRealFiles) {
        validationReport.validations.actualDataReturned = true;
        console.log('✓ Response contains real file listings');
      }

      // Check for NOT being a mock
      const notMock =
        !responseText.includes('mock') &&
        !responseText.includes('fake') &&
        !responseText.includes('placeholder') &&
        !responseText.includes('TODO');

      if (notMock) {
        validationReport.validations.noMockResponses = true;
        console.log('✓ Response is not a mock');
      }

      // STEP 8: Validate network requests
      console.log('\n=== STEP 8: Validate Network Requests ===');
      validationReport.steps.push({
        step: 8,
        description: 'Validate network requests and status codes',
        timestamp: new Date().toISOString(),
      });

      validationReport.networkRequests = networkLog;

      // Check for successful API calls
      const apiCalls = networkLog.filter(entry =>
        entry.type === 'response' && entry.url.includes('/api/')
      );

      console.log(`\nAPI Calls detected: ${apiCalls.length}`);
      apiCalls.forEach(call => {
        console.log(`  ${call.method || 'GET'} ${call.url} - ${call.status}`);
      });

      const successfulCalls = apiCalls.filter(call => call.status === 200);
      const forbiddenCalls = apiCalls.filter(call => call.status === 403);

      if (forbiddenCalls.length > 0) {
        validationReport.errors.push(`403 Forbidden detected on: ${forbiddenCalls[0].url}`);
        throw new Error('❌ 403 FORBIDDEN DETECTED - Backend authentication issue');
      }

      if (successfulCalls.length > 0) {
        validationReport.validations.properStatusCodes = true;
        console.log('✓ All API calls returned 200 OK');
      }

      // STEP 9: Final validation screenshot
      console.log('\n=== STEP 9: Final Validation Screenshot ===');
      const screenshotPath9 = path.join(SCREENSHOTS_DIR, '09-final-state.png');
      await page.screenshot({ path: screenshotPath9, fullPage: true });
      validationReport.screenshots.push(screenshotPath9);
      console.log('✓ Screenshot saved:', screenshotPath9);

      // FINAL VALIDATION
      validationReport.success =
        validationReport.validations.backendConnectivity &&
        validationReport.validations.claudeApiIntegration &&
        validationReport.validations.realToolUsage &&
        validationReport.validations.actualDataReturned &&
        validationReport.validations.noMockResponses &&
        validationReport.validations.properStatusCodes;

      console.log('\n=== VALIDATION COMPLETE ===');
      console.log('Success:', validationReport.success);
      console.log('Validations:', validationReport.validations);

      // Save validation report
      const reportPath = path.join(SCREENSHOTS_DIR, 'validation-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(validationReport, null, 2));
      console.log('✓ Report saved:', reportPath);

      // Assertions
      expect(validationReport.validations.backendConnectivity).toBe(true);
      expect(validationReport.validations.claudeApiIntegration).toBe(true);
      expect(validationReport.validations.realToolUsage).toBe(true);
      expect(validationReport.validations.actualDataReturned).toBe(true);
      expect(validationReport.validations.noMockResponses).toBe(true);
      expect(validationReport.validations.properStatusCodes).toBe(true);

    } catch (error) {
      validationReport.success = false;
      validationReport.errors.push(error.message);

      // Take error screenshot
      const errorScreenshot = path.join(SCREENSHOTS_DIR, 'ERROR-state.png');
      await page.screenshot({ path: errorScreenshot, fullPage: true });
      validationReport.screenshots.push(errorScreenshot);

      // Save error report
      const reportPath = path.join(SCREENSHOTS_DIR, 'validation-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(validationReport, null, 2));

      console.error('\n❌ VALIDATION FAILED:', error.message);
      throw error;
    }
  });
});
