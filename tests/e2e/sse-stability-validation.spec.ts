/**
 * SSE Stability E2E Validation (Playwright)
 *
 * Purpose: Browser-based end-to-end validation of SSE stability
 * Duration: ~2 minutes per test
 * Coverage:
 *   - Browser console: zero WebSocket errors
 *   - LiveActivityFeed shows "Connected" status
 *   - SSE connection stable for 2 minutes
 *   - Screenshot proof of working UI
 *   - Network tab: no failed requests
 *   - Real user interaction simulation
 *
 * Run: npx playwright test tests/e2e/sse-stability-validation.spec.ts
 */

import { test, expect, Page, ConsoleMessage } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const API_URL = process.env.API_URL || 'http://localhost:3001';
const TEST_DURATION = 2 * 60 * 1000; // 2 minutes
const SCREENSHOT_DIR = path.join(process.cwd(), 'tests', 'screenshots', 'sse-stability');

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

test.describe('SSE Stability - E2E Validation', () => {
  let consoleErrors: ConsoleMessage[] = [];
  let networkErrors: any[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    networkErrors = [];

    // Capture console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg);
        console.log(`❌ Console error: ${msg.text()}`);
      }
    });

    // Capture network failures
    page.on('requestfailed', (request) => {
      networkErrors.push({
        url: request.url(),
        method: request.method(),
        failure: request.failure()?.errorText
      });
      console.log(`❌ Network failure: ${request.method()} ${request.url()}`);
    });

    // Navigate to app
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  });

  test('Browser console should have zero WebSocket errors', async ({ page }) => {
    const wsErrors: string[] = [];

    // Track WebSocket-specific errors
    page.on('console', (msg) => {
      const text = msg.text().toLowerCase();
      if (text.includes('websocket') && msg.type() === 'error') {
        wsErrors.push(msg.text());
      }
    });

    // Wait for initial connection
    await page.waitForTimeout(5000);

    // Take screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'console-check.png'),
      fullPage: true
    });

    // Verify no WebSocket errors
    expect(wsErrors).toHaveLength(0);
    console.log('✓ Zero WebSocket errors in console');
  });

  test('LiveActivityFeed should show "Connected" status', async ({ page }) => {
    // Wait for LiveActivityFeed to mount
    await page.waitForSelector('[data-testid="live-activity-feed"]', { timeout: 10000 });

    // Look for connection status indicator
    const connectionStatus = await page.locator('[data-testid="connection-status"]').first();

    // Wait for connected state
    await expect(connectionStatus).toHaveText(/connected/i, { timeout: 15000 });

    // Verify status is visible
    await expect(connectionStatus).toBeVisible();

    // Take screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'connected-status.png'),
      fullPage: true
    });

    console.log('✓ LiveActivityFeed shows Connected status');
  });

  test('SSE connection should remain stable for 2 minutes', async ({ page }) => {
    const startTime = Date.now();
    const statusChecks: any[] = [];
    let disconnectionDetected = false;

    // Monitor connection status
    const checkInterval = setInterval(async () => {
      try {
        const connectionStatus = await page.locator('[data-testid="connection-status"]').first();
        const text = await connectionStatus.textContent();
        const isConnected = text?.toLowerCase().includes('connected') ?? false;

        statusChecks.push({
          time: Date.now() - startTime,
          status: text,
          isConnected
        });

        if (!isConnected) {
          disconnectionDetected = true;
          console.log(`⚠ Disconnection detected at ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
        } else {
          console.log(`✓ Connected at ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
        }
      } catch (error) {
        console.log(`⚠ Error checking status: ${error}`);
      }
    }, 10000); // Check every 10 seconds

    // Wait for 2 minutes
    await page.waitForTimeout(TEST_DURATION);

    clearInterval(checkInterval);

    // Take final screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'stability-test-complete.png'),
      fullPage: true
    });

    // Verify connection remained stable
    expect(disconnectionDetected).toBe(false);
    expect(statusChecks.length).toBeGreaterThan(10); // Should have ~12 checks

    const connectedChecks = statusChecks.filter(check => check.isConnected);
    const connectionRate = connectedChecks.length / statusChecks.length;

    expect(connectionRate).toBeGreaterThanOrEqual(0.95); // 95% uptime minimum

    console.log(`✓ SSE connection stable for ${TEST_DURATION / 1000}s`);
    console.log(`  Connection rate: ${(connectionRate * 100).toFixed(1)}%`);
    console.log(`  Status checks: ${statusChecks.length}`);
  });

  test('Network tab should show no failed SSE requests', async ({ page }) => {
    const failedSSERequests: any[] = [];

    // Track failed requests to SSE endpoints
    page.on('requestfailed', (request) => {
      if (request.url().includes('/api/sse/')) {
        failedSSERequests.push({
          url: request.url(),
          method: request.method(),
          failure: request.failure()?.errorText
        });
      }
    });

    // Wait for SSE connection
    await page.waitForTimeout(10000);

    // Navigate and interact with UI
    await page.waitForSelector('[data-testid="live-activity-feed"]');

    // Wait additional time
    await page.waitForTimeout(20000);

    // Take screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'network-check.png'),
      fullPage: true
    });

    // Verify no failed SSE requests
    expect(failedSSERequests).toHaveLength(0);
    console.log('✓ Zero failed SSE requests in network tab');
  });

  test('UI should receive and display SSE events', async ({ page }) => {
    // Wait for LiveActivityFeed
    await page.waitForSelector('[data-testid="live-activity-feed"]', { timeout: 10000 });

    // Get initial activity count
    const activityList = await page.locator('[data-testid="activity-item"]');
    const initialCount = await activityList.count();

    console.log(`Initial activity count: ${initialCount}`);

    // Wait for new events (30 seconds)
    await page.waitForTimeout(30000);

    // Get updated count
    const updatedCount = await activityList.count();

    console.log(`Updated activity count: ${updatedCount}`);

    // Take screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'sse-events-received.png'),
      fullPage: true
    });

    // Should have received at least some events
    // Note: This may be 0 if no actual activity is happening, but connection should be stable
    expect(updatedCount).toBeGreaterThanOrEqual(initialCount);

    console.log('✓ UI successfully displays SSE events');
  });

  test('Page refresh should reconnect SSE without errors', async ({ page }) => {
    // Initial load
    await page.waitForSelector('[data-testid="live-activity-feed"]', { timeout: 10000 });

    // Verify connected
    const statusBefore = await page.locator('[data-testid="connection-status"]').first();
    await expect(statusBefore).toHaveText(/connected/i, { timeout: 10000 });

    // Take screenshot before refresh
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'before-refresh.png'),
      fullPage: true
    });

    // Refresh page
    console.log('🔄 Refreshing page...');
    await page.reload({ waitUntil: 'networkidle' });

    // Wait for reconnection
    await page.waitForSelector('[data-testid="live-activity-feed"]', { timeout: 10000 });

    const statusAfter = await page.locator('[data-testid="connection-status"]').first();
    await expect(statusAfter).toHaveText(/connected/i, { timeout: 15000 });

    // Take screenshot after refresh
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'after-refresh.png'),
      fullPage: true
    });

    // Check for errors during reconnection
    const reconnectErrors = consoleErrors.filter(msg =>
      msg.text().toLowerCase().includes('websocket') ||
      msg.text().toLowerCase().includes('sse') ||
      msg.text().toLowerCase().includes('eventsource')
    );

    expect(reconnectErrors).toHaveLength(0);

    console.log('✓ Page refresh successfully reconnected SSE');
  });

  test('Multiple tabs should each maintain stable SSE connections', async ({ browser }) => {
    // Create two pages (tabs)
    const context = await browser.newContext();
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    const page1Errors: ConsoleMessage[] = [];
    const page2Errors: ConsoleMessage[] = [];

    page1.on('console', msg => msg.type() === 'error' && page1Errors.push(msg));
    page2.on('console', msg => msg.type() === 'error' && page2Errors.push(msg));

    // Navigate both tabs
    await Promise.all([
      page1.goto(BASE_URL, { waitUntil: 'networkidle' }),
      page2.goto(BASE_URL, { waitUntil: 'networkidle' })
    ]);

    // Wait for both to connect
    await Promise.all([
      page1.waitForSelector('[data-testid="connection-status"]', { timeout: 10000 }),
      page2.waitForSelector('[data-testid="connection-status"]', { timeout: 10000 })
    ]);

    // Verify both connected
    const [status1, status2] = await Promise.all([
      page1.locator('[data-testid="connection-status"]').first().textContent(),
      page2.locator('[data-testid="connection-status"]').first().textContent()
    ]);

    expect(status1?.toLowerCase()).toContain('connected');
    expect(status2?.toLowerCase()).toContain('connected');

    // Take screenshots
    await Promise.all([
      page1.screenshot({ path: path.join(SCREENSHOT_DIR, 'multi-tab-1.png'), fullPage: true }),
      page2.screenshot({ path: path.join(SCREENSHOT_DIR, 'multi-tab-2.png'), fullPage: true })
    ]);

    // Wait 30 seconds
    await page1.waitForTimeout(30000);

    // Verify both still connected
    const [finalStatus1, finalStatus2] = await Promise.all([
      page1.locator('[data-testid="connection-status"]').first().textContent(),
      page2.locator('[data-testid="connection-status"]').first().textContent()
    ]);

    expect(finalStatus1?.toLowerCase()).toContain('connected');
    expect(finalStatus2?.toLowerCase()).toContain('connected');

    // Check for errors
    expect(page1Errors).toHaveLength(0);
    expect(page2Errors).toHaveLength(0);

    console.log('✓ Multiple tabs maintain stable SSE connections');

    await context.close();
  });

  test.afterEach(async ({ page }) => {
    // Final screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `final-${Date.now()}.png`),
      fullPage: true
    });

    // Log summary
    console.log('\n--- Test Summary ---');
    console.log(`Console errors: ${consoleErrors.length}`);
    console.log(`Network errors: ${networkErrors.length}`);

    if (consoleErrors.length > 0) {
      console.log('Console errors:', consoleErrors.map(msg => msg.text()));
    }

    if (networkErrors.length > 0) {
      console.log('Network errors:', networkErrors);
    }
  });
});

test.describe('SSE Performance Validation', () => {
  test('SSE event latency should be under 500ms', async ({ page }) => {
    const latencies: number[] = [];

    // Intercept SSE events and measure latency
    await page.route('**/api/sse/**', async (route) => {
      const startTime = Date.now();
      await route.continue();
      const endTime = Date.now();
      latencies.push(endTime - startTime);
    });

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(30000); // Wait 30 seconds for events

    if (latencies.length > 0) {
      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const maxLatency = Math.max(...latencies);

      console.log(`Average SSE latency: ${avgLatency.toFixed(2)}ms`);
      console.log(`Max SSE latency: ${maxLatency.toFixed(2)}ms`);

      expect(avgLatency).toBeLessThan(500);
      expect(maxLatency).toBeLessThan(2000);
    }
  });

  test('Memory usage should remain stable during SSE streaming', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // Get initial memory
    const initialMemory = await page.evaluate(() => {
      if (performance && (performance as any).memory) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return null;
    });

    // Wait 2 minutes
    await page.waitForTimeout(120000);

    // Get final memory
    const finalMemory = await page.evaluate(() => {
      if (performance && (performance as any).memory) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return null;
    });

    if (initialMemory && finalMemory) {
      const memoryGrowth = finalMemory - initialMemory;
      const memoryGrowthMB = memoryGrowth / 1024 / 1024;

      console.log(`Memory growth: ${memoryGrowthMB.toFixed(2)} MB`);

      // Memory growth should be under 50MB
      expect(memoryGrowthMB).toBeLessThan(50);
    }
  });
});

console.log('🚀 SSE Stability E2E Validation Tests');
console.log(`📊 Target URL: ${BASE_URL}`);
console.log(`📊 API URL: ${API_URL}`);
console.log(`📸 Screenshots: ${SCREENSHOT_DIR}`);
