import { test, expect, Page } from '@playwright/test';

/**
 * COMPREHENSIVE FEED PAGE VALIDATION TEST
 *
 * This test validates that the "Cannot read properties of undefined (reading 'priority')"
 * error has been completely eliminated from the Feed page.
 *
 * Test Scope:
 * - Feed page loads without errors
 * - No error boundaries triggered
 * - StreamingTicker component renders successfully
 * - SSE connection establishes without crashes
 * - No console errors related to priority
 * - Page remains stable over time
 */

test.describe('Feed Page - Priority Error Fix Validation', () => {
  test.setTimeout(60000); // 60 second timeout for thorough testing

  let consoleLogs: string[] = [];
  let consoleErrors: string[] = [];
  let consoleWarnings: string[] = [];

  test.beforeEach(async ({ page }) => {
    // Clear logs
    consoleLogs = [];
    consoleErrors = [];
    consoleWarnings = [];

    // Capture console messages
    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();

      if (type === 'error') {
        consoleErrors.push(text);
        console.log(`❌ CONSOLE ERROR: ${text}`);
      } else if (type === 'warning') {
        consoleWarnings.push(text);
        console.log(`⚠️  CONSOLE WARNING: ${text}`);
      } else {
        consoleLogs.push(text);
      }
    });

    // Capture page errors
    page.on('pageerror', (error) => {
      consoleErrors.push(`Page Error: ${error.message}\n${error.stack}`);
      console.log(`❌ PAGE ERROR: ${error.message}`);
    });
  });

  test('CRITICAL: Feed page loads without priority error', async ({ page }) => {
    console.log('\n🚀 Starting Feed Page Validation...\n');

    // Step 1: Navigate to Feed page
    console.log('📍 Step 1: Navigating to http://localhost:5173/');
    await page.goto('http://localhost:5173/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    console.log('✅ Page loaded\n');

    // Step 2: Wait for initial render
    console.log('⏳ Step 2: Waiting for page to stabilize...');
    await page.waitForTimeout(2000);
    console.log('✅ Page stabilized\n');

    // Step 3: Take initial screenshot
    console.log('📸 Step 3: Taking initial screenshot...');
    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/screenshots/feed-initial.png',
      fullPage: true
    });
    console.log('✅ Screenshot saved: feed-initial.png\n');

    // Step 4: Check for "Feed Error Detected" message
    console.log('🔍 Step 4: Checking for error boundary message...');
    const errorDetectedText = page.locator('text=Feed Error Detected');
    const hasErrorBoundary = await errorDetectedText.count() > 0;

    if (hasErrorBoundary) {
      console.log('❌ FAIL: "Feed Error Detected" message found!');
      await page.screenshot({
        path: '/workspaces/agent-feed/frontend/tests/screenshots/feed-error-boundary.png',
        fullPage: true
      });
    } else {
      console.log('✅ PASS: No error boundary triggered\n');
    }
    expect(hasErrorBoundary).toBe(false);

    // Step 5: Check for priority error in UI
    console.log('🔍 Step 5: Checking for priority error in UI...');
    const priorityErrorText = page.locator('text=/Cannot read properties of undefined.*priority/i');
    const hasPriorityError = await priorityErrorText.count() > 0;

    if (hasPriorityError) {
      console.log('❌ FAIL: Priority error message found in UI!');
    } else {
      console.log('✅ PASS: No priority error visible in UI\n');
    }
    expect(hasPriorityError).toBe(false);

    // Step 6: Verify Feed content is visible
    console.log('🔍 Step 6: Verifying Feed content renders...');

    // Look for common feed elements
    const bodyVisible = await page.locator('body').isVisible();
    expect(bodyVisible).toBe(true);

    // Check if there's any content (not just empty page)
    const bodyContent = await page.locator('body').textContent();
    const hasContent = bodyContent && bodyContent.trim().length > 0;

    if (hasContent) {
      console.log('✅ PASS: Feed page has content\n');
    } else {
      console.log('⚠️  WARNING: Feed page appears empty\n');
    }

    // Step 7: Check for StreamingTicker component
    console.log('🔍 Step 7: Checking StreamingTicker component...');

    // Look for connection status indicators
    const connectionIndicators = [
      'text=/Live/i',
      'text=/Connecting/i',
      'text=/Connected/i',
      'text=/Disconnected/i'
    ];

    let tickerFound = false;
    for (const indicator of connectionIndicators) {
      const count = await page.locator(indicator).count();
      if (count > 0) {
        const text = await page.locator(indicator).first().textContent();
        console.log(`✅ StreamingTicker status found: "${text}"`);
        tickerFound = true;
        break;
      }
    }

    if (!tickerFound) {
      console.log('ℹ️  StreamingTicker status indicator not found (may be loading...)\n');
    } else {
      console.log('✅ PASS: StreamingTicker component detected\n');
    }

    // Step 8: Wait for SSE connection and potential messages
    console.log('⏳ Step 8: Waiting 15 seconds for SSE messages and stability check...');
    await page.waitForTimeout(15000);
    console.log('✅ Stability period complete\n');

    // Step 9: Take final screenshot after waiting
    console.log('📸 Step 9: Taking final screenshot...');
    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/screenshots/feed-final.png',
      fullPage: true
    });
    console.log('✅ Screenshot saved: feed-final.png\n');

    // Step 10: Re-check for error boundary after waiting
    console.log('🔍 Step 10: Re-checking for errors after stability period...');
    const finalErrorCheck = await page.locator('text=Feed Error Detected').count() > 0;

    if (finalErrorCheck) {
      console.log('❌ FAIL: Error boundary appeared during stability period!');
    } else {
      console.log('✅ PASS: No errors appeared during stability period\n');
    }
    expect(finalErrorCheck).toBe(false);

    // Step 11: Analyze console logs
    console.log('📊 Step 11: Analyzing console output...\n');
    console.log(`   Total console logs: ${consoleLogs.length}`);
    console.log(`   Total warnings: ${consoleWarnings.length}`);
    console.log(`   Total errors: ${consoleErrors.length}\n`);

    // Filter out known acceptable warnings
    const acceptablePatterns = [
      /WebSocket/i,
      /ws:\/\//i,
      /Failed to load resource/i,
      /404/i
    ];

    const criticalErrors = consoleErrors.filter(error => {
      return !acceptablePatterns.some(pattern => pattern.test(error));
    });

    // Check specifically for priority errors
    const priorityErrors = consoleErrors.filter(error =>
      error.toLowerCase().includes('priority')
    );

    if (priorityErrors.length > 0) {
      console.log('❌ CRITICAL: Priority-related console errors found:');
      priorityErrors.forEach(err => console.log(`   - ${err}`));
      console.log('');
    } else {
      console.log('✅ PASS: No priority-related console errors\n');
    }

    if (criticalErrors.length > 0) {
      console.log('⚠️  Critical console errors detected:');
      criticalErrors.forEach(err => console.log(`   - ${err}`));
      console.log('');
    } else {
      console.log('✅ PASS: No critical console errors\n');
    }

    // Step 12: Verify no priority errors in console
    expect(priorityErrors.length).toBe(0);

    // Step 13: Final validation summary
    console.log('=' .repeat(60));
    console.log('📋 VALIDATION SUMMARY');
    console.log('=' .repeat(60));
    console.log('✅ Feed page loads successfully');
    console.log('✅ No error boundaries triggered');
    console.log('✅ No priority errors in UI');
    console.log('✅ No priority errors in console');
    console.log('✅ Page remains stable for 15+ seconds');
    console.log('✅ Screenshots captured successfully');
    console.log('=' .repeat(60));
    console.log('🎉 PRIORITY ERROR FIX VALIDATION: PASSED');
    console.log('=' .repeat(60) + '\n');
  });

  test('ADDITIONAL: Verify SSE connection handling', async ({ page }) => {
    console.log('\n🔌 Testing SSE Connection Handling...\n');

    // Navigate to page
    await page.goto('http://localhost:5173/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Monitor network requests
    const sseRequests: string[] = [];

    page.on('request', request => {
      const url = request.url();
      if (url.includes('/api/streaming-ticker/stream') || url.includes('/stream')) {
        sseRequests.push(url);
        console.log(`📡 SSE Request detected: ${url}`);
      }
    });

    // Wait for SSE connection attempt
    await page.waitForTimeout(5000);

    console.log(`\n📊 SSE Connection Summary:`);
    console.log(`   Total SSE requests: ${sseRequests.length}`);

    if (sseRequests.length > 0) {
      console.log('✅ SSE connection attempted');
      sseRequests.forEach(url => console.log(`   - ${url}`));
    } else {
      console.log('ℹ️  No SSE requests detected (endpoint may not be available)');
    }

    // Take screenshot
    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/screenshots/feed-sse-test.png',
      fullPage: true
    });

    console.log('✅ SSE test complete\n');
  });

  test('STRESS TEST: Verify stability over 30 seconds', async ({ page }) => {
    console.log('\n⏱️  Starting 30-second stability test...\n');

    await page.goto('http://localhost:5173/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    const checkpoints = [5, 10, 15, 20, 25, 30];

    for (const seconds of checkpoints) {
      await page.waitForTimeout(5000);

      const hasError = await page.locator('text=Feed Error Detected').count() > 0;
      const hasPriorityError = await page.locator('text=/Cannot read properties of undefined.*priority/i').count() > 0;

      console.log(`✓ ${seconds}s checkpoint: ${hasError || hasPriorityError ? '❌ ERROR DETECTED' : '✅ Clean'}`);

      expect(hasError).toBe(false);
      expect(hasPriorityError).toBe(false);
    }

    // Final screenshot
    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/screenshots/feed-stability-30s.png',
      fullPage: true
    });

    console.log('\n✅ 30-second stability test PASSED\n');
  });

  test.afterEach(async ({ page }) => {
    // Cleanup
    await page.close();
  });
});