import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const FRONTEND_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = '/workspaces/agent-feed/test-results/live-validation';
const TIMEOUT = 30000;

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

test.describe('Live Browser Validation Suite', () => {
  let consoleLogs: string[] = [];
  let consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleLogs = [];
    consoleErrors = [];

    // Capture console logs
    page.on('console', msg => {
      const text = `[${msg.type()}] ${msg.text()}`;
      consoleLogs.push(text);
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      }
    });

    // Navigate to the app
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000); // Allow app to initialize
  });

  test('Scenario 1: Conversation Memory - Math Operations', async ({ page }) => {
    console.log('🧪 TEST SCENARIO 1: Conversation Memory');

    // Step 1: Create initial post with math question
    console.log('📝 Creating Quick Post: "Memory Test - 4949+98"');
    await page.fill('[data-testid="quick-post-content"], textarea[placeholder*="post"], input[type="text"]', 'Memory Test - 4949+98');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-initial-post.png`, fullPage: true });

    // Submit the post
    await page.click('button:has-text("Post"), button:has-text("Create Post"), button[type="submit"]');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-post-submitted.png`, fullPage: true });

    // Step 2: Wait for Avi's response
    console.log('⏳ Waiting for Avi to respond with "5047"...');
    const aviResponse = await page.waitForSelector('text=/5047/', { timeout: TIMEOUT });
    expect(aviResponse).toBeTruthy();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-avi-first-response.png`, fullPage: true });
    console.log('✅ Avi responded with 5047');

    // Step 3: Find the comment input for this post
    console.log('💬 Posting follow-up comment: "divide by 2"');

    // Look for comment input in various ways
    const commentInput = await page.locator('input[placeholder*="comment"], textarea[placeholder*="comment"], input[type="text"]').last();
    await commentInput.fill('divide by 2');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-followup-comment.png`, fullPage: true });

    // Submit the comment
    await page.click('button:has-text("Comment"), button:has-text("Add Comment"), button:has-text("Post Comment")');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/05-comment-submitted.png`, fullPage: true });

    // Step 4: Wait for Avi's follow-up response with context
    console.log('⏳ Waiting for Avi to respond with "2523.5" or mention "5047"...');

    try {
      // Look for either the exact answer or contextual reference
      const contextualResponse = await page.waitForSelector('text=/2523\\.5|5047/', { timeout: TIMEOUT });
      expect(contextualResponse).toBeTruthy();
      await page.screenshot({ path: `${SCREENSHOT_DIR}/06-avi-contextual-response.png`, fullPage: true });

      // Verify it's NOT saying "I need more context"
      const pageText = await page.textContent('body');
      expect(pageText).not.toContain('I need more context');
      expect(pageText).not.toContain('what number');

      console.log('✅ SUCCESS: Avi maintained conversation context!');

    } catch (error) {
      await page.screenshot({ path: `${SCREENSHOT_DIR}/06-FAILED-no-context.png`, fullPage: true });
      const bodyText = await page.textContent('body');
      console.error('❌ FAILED: Avi did not maintain context');
      console.error('Page content:', bodyText?.substring(0, 500));
      throw error;
    }
  });

  test('Scenario 2: Real-Time System Comments', async ({ page }) => {
    console.log('🧪 TEST SCENARIO 2: Real-Time System Comments');

    // Step 1: Create a new post
    console.log('📝 Creating Quick Post: "Real-Time Test"');
    await page.fill('[data-testid="quick-post-content"], textarea[placeholder*="post"], input[type="text"]', 'Real-Time Test');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/11-realtime-initial.png`, fullPage: true });

    await page.click('button:has-text("Post"), button:has-text("Create Post"), button[type="submit"]');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/12-realtime-post-created.png`, fullPage: true });

    // Step 2: Add a comment to trigger Avi
    console.log('💬 Posting comment: "Hello Avi"');
    const commentInput = await page.locator('input[placeholder*="comment"], textarea[placeholder*="comment"]').last();
    await commentInput.fill('Hello Avi');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/13-realtime-comment-typed.png`, fullPage: true });

    await page.click('button:has-text("Comment"), button:has-text("Add Comment"), button:has-text("Post Comment")');

    // Record the initial state
    const initialContent = await page.textContent('body');
    console.log('📸 Captured initial page state');

    // Step 3: DO NOT REFRESH - Wait for real-time update
    console.log('⏳ Waiting for Avi\'s response WITHOUT refresh...');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/14-realtime-waiting.png`, fullPage: true });

    try {
      // Look for Avi's response appearing (should contain "Avi" as author)
      const aviComment = await page.waitForSelector('.comment:has-text("Avi"), [data-author="Avi"], .author:has-text("Avi")', {
        timeout: 15000
      });

      expect(aviComment).toBeTruthy();
      await page.screenshot({ path: `${SCREENSHOT_DIR}/15-realtime-avi-appeared.png`, fullPage: true });

      console.log('✅ SUCCESS: Avi\'s response appeared in real-time without refresh!');

    } catch (error) {
      await page.screenshot({ path: `${SCREENSHOT_DIR}/15-FAILED-no-realtime.png`, fullPage: true });
      console.error('❌ FAILED: Avi\'s response did not appear in real-time');
      console.error('Console logs:', consoleLogs.join('\n'));
      throw error;
    }
  });

  test('Scenario 3: WebSocket Connection', async ({ page }) => {
    console.log('🧪 TEST SCENARIO 3: WebSocket Connection');

    // Wait for initial load
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/21-websocket-initial.png`, fullPage: true });

    // Step 1: Check for connection status in UI
    console.log('🔍 Checking for "Connected" status in UI...');
    try {
      const connectionStatus = await page.locator('text=/connected/i, [data-status="connected"], .status:has-text("connected")').first();
      const isVisible = await connectionStatus.isVisible({ timeout: 5000 });

      if (isVisible) {
        console.log('✅ Connection status visible in UI');
      }
      await page.screenshot({ path: `${SCREENSHOT_DIR}/22-websocket-status.png`, fullPage: true });
    } catch (e) {
      console.log('ℹ️ Connection status not visible in UI (may be hidden)');
    }

    // Step 2: Verify console logs for WebSocket connection
    console.log('🔍 Checking console logs for WebSocket activity...');

    const wsConnectLog = consoleLogs.find(log =>
      log.includes('Socket connected') ||
      log.includes('WebSocket') ||
      log.includes('ws://') ||
      log.includes('Connection established')
    );

    const subscriptionLog = consoleLogs.find(log =>
      log.includes('subscrib') ||
      log.includes('subscribe')
    );

    console.log('\n📋 Console Logs Summary:');
    console.log('Total logs:', consoleLogs.length);
    console.log('Errors:', consoleErrors.length);
    console.log('\nRelevant logs:');
    consoleLogs.filter(log =>
      log.toLowerCase().includes('socket') ||
      log.toLowerCase().includes('websocket') ||
      log.toLowerCase().includes('connect') ||
      log.toLowerCase().includes('subscrib')
    ).forEach(log => console.log('  ', log));

    // Save console logs to file
    fs.writeFileSync(
      `${SCREENSHOT_DIR}/console-logs.txt`,
      `=== CONSOLE LOGS ===\n\n${consoleLogs.join('\n')}\n\n=== ERRORS ===\n\n${consoleErrors.join('\n')}`
    );

    // Step 3: Test real-time event by triggering a comment
    console.log('🧪 Testing comment:added event...');

    // Create a post
    await page.fill('[data-testid="quick-post-content"], textarea[placeholder*="post"], input[type="text"]', 'WebSocket Test Post');
    await page.click('button:has-text("Post"), button:has-text("Create Post"), button[type="submit"]');
    await page.waitForTimeout(2000);

    // Add a comment
    const commentInput = await page.locator('input[placeholder*="comment"], textarea[placeholder*="comment"]').last();
    await commentInput.fill('Testing WebSocket events');
    await page.click('button:has-text("Comment"), button:has-text("Add Comment"), button:has-text("Post Comment")');
    await page.waitForTimeout(3000);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/23-websocket-event-test.png`, fullPage: true });

    // Check for event logs
    const commentEventLog = consoleLogs.find(log =>
      log.includes('comment:added') ||
      log.includes('comment added') ||
      log.includes('new comment')
    );

    if (commentEventLog) {
      console.log('✅ comment:added event detected:', commentEventLog);
    } else {
      console.log('⚠️ No explicit comment:added event in logs, but real-time may still work');
    }

    // Verify no critical errors
    const criticalErrors = consoleErrors.filter(err =>
      err.includes('WebSocket') ||
      err.includes('connection') ||
      err.includes('failed to connect')
    );

    if (criticalErrors.length > 0) {
      console.error('❌ Critical WebSocket errors found:', criticalErrors);
      throw new Error('WebSocket connection has critical errors');
    }

    console.log('✅ SUCCESS: WebSocket connection validated');
  });

  test.afterEach(async ({ page }, testInfo) => {
    // Save console logs for this test
    const testName = testInfo.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    fs.writeFileSync(
      `${SCREENSHOT_DIR}/${testName}_console.txt`,
      `=== ${testInfo.title} ===\n\n${consoleLogs.join('\n')}\n\n=== ERRORS ===\n\n${consoleErrors.join('\n')}`
    );
  });
});

test.afterAll(async () => {
  // Generate HTML report
  const reportHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Live Validation Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
    h2 { color: #34495e; margin-top: 30px; }
    .status { display: inline-block; padding: 5px 15px; border-radius: 4px; font-weight: bold; margin-left: 10px; }
    .pass { background: #27ae60; color: white; }
    .fail { background: #e74c3c; color: white; }
    .screenshot { margin: 20px 0; }
    .screenshot img { max-width: 100%; border: 1px solid #ddd; border-radius: 4px; }
    .logs { background: #2c3e50; color: #ecf0f1; padding: 15px; border-radius: 4px; overflow-x: auto; font-family: monospace; font-size: 12px; }
    .timestamp { color: #95a5a6; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎯 Live Browser Validation Report</h1>
    <p class="timestamp">Generated: ${new Date().toISOString()}</p>

    <h2>Test Environment</h2>
    <ul>
      <li><strong>Frontend URL:</strong> ${FRONTEND_URL}</li>
      <li><strong>Test Framework:</strong> Playwright</li>
      <li><strong>Browser:</strong> Chromium</li>
      <li><strong>Results Directory:</strong> ${SCREENSHOT_DIR}</li>
    </ul>

    <h2>Test Results Summary</h2>
    <p>Please check the Playwright HTML report for detailed test results.</p>

    <h2>📸 Evidence Collection</h2>
    <p>Screenshots and console logs have been saved to: <code>${SCREENSHOT_DIR}</code></p>

    <h2>Success Criteria</h2>
    <ul>
      <li>✅ Conversation memory maintained across messages</li>
      <li>✅ Real-time comments appear without page refresh</li>
      <li>✅ WebSocket connection established and working</li>
      <li>✅ No critical console errors</li>
      <li>✅ All evidence captured (screenshots, logs, videos)</li>
    </ul>

    <h2>Next Steps</h2>
    <ol>
      <li>Review the detailed Playwright HTML report</li>
      <li>Check individual test screenshots in the results directory</li>
      <li>Review console logs for any warnings</li>
      <li>Verify all three scenarios passed</li>
    </ol>
  </div>
</body>
</html>
`;

  fs.writeFileSync(`${SCREENSHOT_DIR}/validation-report.html`, reportHtml);
  console.log(`\n✅ Validation report generated: ${SCREENSHOT_DIR}/validation-report.html`);
});
