#!/usr/bin/env node

/**
 * AVI DM PRODUCTION VALIDATION - PUPPETEER SCRIPT
 *
 * Validates complete debug log sequence from request to response display.
 * This script automates the browser testing and captures all debug logs.
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCREENSHOT_DIR = path.join(__dirname, 'validation-screenshots', 'puppeteer-test');
const APP_URL = 'http://localhost:5173';
const TEST_MESSAGE = 'hello what directory are you in?';
const MAX_WAIT_TIME = 90000; // 90 seconds

// Expected debug logs in sequence
const EXPECTED_LOGS = [
  '🔍 DEBUG: Calling Avi Claude Code with message:',
  '🔍 DEBUG: Fetching from /api/claude-code/streaming-chat',
  '🔍 DEBUG: Response status:',
  '🔍 DEBUG: Parsed JSON data:',
  '🔍 DEBUG: Received response:',
  '🔍 DEBUG: Adding response to chat history:',
  '🔍 DEBUG: New chat history length:'
];

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

console.log('='.repeat(80));
console.log('🧪 AVI DM PRODUCTION VALIDATION - PUPPETEER');
console.log('='.repeat(80));
console.log('\n📋 Configuration:');
console.log(`   App URL: ${APP_URL}`);
console.log(`   Test Message: "${TEST_MESSAGE}"`);
console.log(`   Max Wait Time: ${MAX_WAIT_TIME / 1000}s`);
console.log(`   Screenshots: ${SCREENSHOT_DIR}\n`);

// Validation results
const results = {
  testStartTime: Date.now(),
  appLoaded: false,
  aviTabFound: false,
  messageInputFound: false,
  messageSent: false,
  responseReceived: false,
  responseTime: 0,
  responseContent: '',
  consoleLogs: [],
  debugLogsFound: EXPECTED_LOGS.map(log => ({ pattern: log, found: false, timestamp: 0 })),
  errors: [],
  screenshots: []
};

async function takeScreenshot(page, name) {
  const screenshotPath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  results.screenshots.push(screenshotPath);
  console.log(`📸 Screenshot saved: ${name}.png`);
  return screenshotPath;
}

async function runValidation() {
  let browser;

  try {
    // Launch browser
    console.log('🚀 Launching browser (headless mode)...');
    browser = await puppeteer.launch({
      headless: 'new', // Use new headless mode
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--single-process'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Capture console logs
    page.on('console', msg => {
      const text = msg.text();
      const timestamp = Date.now();

      results.consoleLogs.push({
        type: msg.type(),
        text: text,
        timestamp: timestamp,
        elapsed: timestamp - results.testStartTime
      });

      // Check if this matches any expected debug log
      results.debugLogsFound.forEach(log => {
        if (!log.found && text.includes(log.pattern)) {
          log.found = true;
          log.timestamp = timestamp;
          log.elapsed = timestamp - results.testStartTime;
          console.log(`✅ Debug log found: ${log.pattern}`);
        }
      });

      // Track errors
      if (msg.type() === 'error') {
        results.errors.push(text);
        console.error(`❌ Console error: ${text}`);
      }
    });

    // STEP 1: Navigate to app
    console.log('\n📍 STEP 1: Navigating to application...');
    await page.goto(APP_URL, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    results.appLoaded = true;
    console.log('✅ App loaded');
    await takeScreenshot(page, '01-app-loaded');

    // STEP 2: Click Avi DM tab
    console.log('\n📍 STEP 2: Looking for Avi DM tab...');
    await page.waitForTimeout(2000);

    // Find button containing "Avi DM" text
    const aviTab = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => btn.textContent.includes('Avi DM'));
    });

    if (aviTab && aviTab.asElement()) {
      await aviTab.asElement().click();
      results.aviTabFound = true;
      console.log('✅ Clicked Avi DM tab');
      await page.waitForTimeout(2000);
      await takeScreenshot(page, '02-avi-tab-opened');
    } else {
      throw new Error('Avi DM tab not found');
    }

    // STEP 3: Find message input
    console.log('\n📍 STEP 3: Looking for message input...');
    await page.waitForSelector('input[placeholder*="Type your message"]', {
      visible: true,
      timeout: 10000
    });
    results.messageInputFound = true;
    console.log('✅ Message input found');

    // STEP 4: Type and send message
    console.log('\n📍 STEP 4: Typing and sending message...');
    await page.type('input[placeholder*="Type your message"]', TEST_MESSAGE);
    await page.waitForTimeout(500);
    await takeScreenshot(page, '03-message-typed');
    console.log(`✅ Typed: "${TEST_MESSAGE}"`);

    // Clear previous logs
    results.consoleLogs = [];
    results.errors = [];

    const sendStartTime = Date.now();
    console.log(`\n⏱️  Sending message at: ${new Date(sendStartTime).toISOString()}`);

    // Click Send button
    const sendButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => btn.textContent.includes('Send'));
    });

    if (sendButton && sendButton.asElement()) {
      await sendButton.asElement().click();
      results.messageSent = true;
      console.log('✅ Message sent');
    } else {
      throw new Error('Send button not found');
    }

    // STEP 5: Wait for response
    console.log('\n📍 STEP 5: Waiting for response (max 90s)...');
    console.log('   Monitoring debug logs...\n');

    let responseFound = false;
    const checkInterval = 2000; // Check every 2 seconds
    const maxAttempts = Math.ceil(MAX_WAIT_TIME / checkInterval);

    for (let i = 0; i < maxAttempts && !responseFound; i++) {
      await page.waitForTimeout(checkInterval);

      const elapsed = Date.now() - sendStartTime;
      const debugCount = results.debugLogsFound.filter(l => l.found).length;

      console.log(`   ⏱️  ${(elapsed / 1000).toFixed(1)}s | Debug logs: ${debugCount}/${EXPECTED_LOGS.length}`);

      // Check if response appeared in UI
      try {
        const messages = await page.$$('.chat-message, [data-sender="avi"]');
        if (messages.length >= 2) { // User message + Avi response
          const lastMessage = messages[messages.length - 1];
          const text = await page.evaluate(el => el.textContent, lastMessage);

          if (text && text.length > 20 && !text.includes(TEST_MESSAGE)) {
            responseFound = true;
            results.responseReceived = true;
            results.responseTime = Date.now() - sendStartTime;
            results.responseContent = text;
            console.log(`\n✅ Response received after ${(results.responseTime / 1000).toFixed(1)}s!`);
            break;
          }
        }
      } catch (e) {
        // Continue waiting
      }

      // Check for timeout errors
      const hasTimeoutError = results.errors.some(err =>
        err.toLowerCase().includes('timeout') ||
        err.includes('Failed to fetch') ||
        err.includes('Empty reply')
      );

      if (hasTimeoutError) {
        console.error('\n❌ Timeout or network error detected!');
        break;
      }
    }

    await takeScreenshot(page, '04-after-response');

    // STEP 6: Validate results
    console.log('\n📍 STEP 6: Validating results...\n');

    // Generate report
    generateReport();

    // In headless mode, no need to keep browser open

  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    results.errors.push(error.message);
    generateReport();
  } finally {
    if (browser) {
      await browser.close();
      console.log('\n✅ Browser closed');
    }
  }
}

function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 PRODUCTION VALIDATION REPORT');
  console.log('='.repeat(80));

  const testDuration = Date.now() - results.testStartTime;

  console.log('\n🎯 Test Execution:');
  console.log(`   Duration: ${(testDuration / 1000).toFixed(1)}s`);
  console.log(`   App Loaded: ${results.appLoaded ? '✅' : '❌'}`);
  console.log(`   Avi Tab Found: ${results.aviTabFound ? '✅' : '❌'}`);
  console.log(`   Message Input Found: ${results.messageInputFound ? '✅' : '❌'}`);
  console.log(`   Message Sent: ${results.messageSent ? '✅' : '❌'}`);
  console.log(`   Response Received: ${results.responseReceived ? '✅' : '❌'}`);

  if (results.responseReceived) {
    console.log(`   Response Time: ${(results.responseTime / 1000).toFixed(1)}s`);
  }

  console.log('\n🔍 Debug Logs Analysis:');
  const foundCount = results.debugLogsFound.filter(l => l.found).length;
  const totalCount = results.debugLogsFound.length;
  console.log(`   Found: ${foundCount}/${totalCount}`);

  results.debugLogsFound.forEach((log, index) => {
    const status = log.found ? '✅' : '❌';
    const timeStr = log.found ? `(+${(log.elapsed / 1000).toFixed(2)}s)` : '';
    console.log(`   ${status} ${index + 1}. ${log.pattern} ${timeStr}`);
  });

  if (results.responseContent) {
    console.log('\n📝 Response Content:');
    console.log(`   Length: ${results.responseContent.length} characters`);
    console.log(`   Preview: ${results.responseContent.substring(0, 200)}...`);

    const hasWorkingDir = results.responseContent.includes('/workspaces/agent-feed') ||
                          results.responseContent.includes('workspaces') ||
                          results.responseContent.includes('/prod');
    console.log(`   Contains working directory: ${hasWorkingDir ? '✅' : '❌'}`);
  }

  console.log('\n❌ Errors:');
  if (results.errors.length === 0) {
    console.log('   None ✅');
  } else {
    results.errors.forEach(err => console.log(`   - ${err}`));
  }

  console.log('\n📸 Screenshots:');
  results.screenshots.forEach(path => console.log(`   - ${path}`));

  // Success criteria
  console.log('\n✅ SUCCESS CRITERIA:');
  const criteria = [
    { name: 'All debug logs present', pass: foundCount === totalCount },
    { name: 'Response received', pass: results.responseReceived },
    { name: 'Response time < 60s', pass: results.responseTime < 60000 },
    { name: 'No timeout errors', pass: results.errors.length === 0 },
    { name: 'Contains working directory', pass: results.responseContent.includes('/workspaces') }
  ];

  criteria.forEach(c => {
    console.log(`   ${c.pass ? '✅' : '❌'} ${c.name}`);
  });

  const allPassed = criteria.every(c => c.pass);

  console.log('\n' + '='.repeat(80));
  if (allPassed) {
    console.log('🎉 VALIDATION PASSED - PRODUCTION READY!');
  } else {
    console.log('❌ VALIDATION FAILED - ISSUES DETECTED');
  }
  console.log('='.repeat(80) + '\n');

  // Save report to file
  const reportPath = path.join(SCREENSHOT_DIR, 'validation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`📄 Report saved: ${reportPath}\n`);

  // Save console transcript
  const transcriptPath = path.join(SCREENSHOT_DIR, 'console-transcript.txt');
  const transcript = results.consoleLogs
    .map(log => `[+${(log.elapsed / 1000).toFixed(2)}s] [${log.type}] ${log.text}`)
    .join('\n');
  fs.writeFileSync(transcriptPath, transcript);
  console.log(`📄 Console transcript saved: ${transcriptPath}\n`);
}

// Run validation
runValidation().catch(console.error);
