/**
 * COMPREHENSIVE NOTIFICATIONS REMOVAL TESTING - PRE-REMOVAL BASELINE
 *
 * Purpose: Capture screenshots and state before notification component removal
 *
 * Test Categories:
 * - Visual baseline capture at all breakpoints
 * - Component presence verification
 * - Interaction state documentation
 * - Header layout measurements
 */

import { test, expect } from '@playwright/test';

test.describe('Pre-Removal Baseline - Notifications Component', () => {
  test.beforeEach(async ({ page }) => {
    // Set up comprehensive error logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`Console Error: ${msg.text()}`);
      }
    });

    page.on('pageerror', error => {
      console.log(`Page Error: ${error.message}`);
    });

    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="app-root"]', { timeout: 15000 });
  });

  test('01-Desktop Baseline - Notifications Present', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Wait for notifications component to load
    await page.waitForSelector('[data-testid="real-time-notifications"]', { timeout: 10000 });

    // Verify component is present
    const notificationsComponent = await page.locator('[data-testid="real-time-notifications"]');
    await expect(notificationsComponent).toBeVisible();

    // Verify notification button is present
    const notificationButton = await page.locator('[data-testid="notifications-button"]');
    await expect(notificationButton).toBeVisible();

    // Capture full page baseline
    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/notifications-removal/screenshots/01-desktop-baseline-full.png',
      fullPage: true
    });

    // Capture header-focused baseline
    await page.locator('[data-testid="header"]').screenshot({
      path: '/workspaces/agent-feed/frontend/tests/notifications-removal/screenshots/01-desktop-baseline-header.png'
    });
  });

  test('02-Tablet Baseline - Notifications Present', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.waitForSelector('[data-testid="real-time-notifications"]', { timeout: 10000 });

    // Verify component is present on tablet
    const notificationsComponent = await page.locator('[data-testid="real-time-notifications"]');
    await expect(notificationsComponent).toBeVisible();

    // Capture tablet baseline
    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/notifications-removal/screenshots/02-tablet-baseline-full.png',
      fullPage: true
    });

    await page.locator('[data-testid="header"]').screenshot({
      path: '/workspaces/agent-feed/frontend/tests/notifications-removal/screenshots/02-tablet-baseline-header.png'
    });
  });

  test('03-Mobile Baseline - Notifications Present', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.waitForSelector('[data-testid="real-time-notifications"]', { timeout: 10000 });

    // Verify component is present on mobile
    const notificationsComponent = await page.locator('[data-testid="real-time-notifications"]');
    await expect(notificationsComponent).toBeVisible();

    // Capture mobile baseline
    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/notifications-removal/screenshots/03-mobile-baseline-full.png',
      fullPage: true
    });

    await page.locator('[data-testid="header"]').screenshot({
      path: '/workspaces/agent-feed/frontend/tests/notifications-removal/screenshots/03-mobile-baseline-header.png'
    });
  });

  test('04-Notifications Interaction Baseline', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });

    await page.waitForSelector('[data-testid="notifications-button"]', { timeout: 10000 });

    // Capture notification button hover state
    await page.locator('[data-testid="notifications-button"]').hover();
    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/notifications-removal/screenshots/04-notifications-hover-state.png'
    });

    // Click and capture dropdown
    await page.locator('[data-testid="notifications-button"]').click();
    await page.waitForSelector('[data-testid="notifications-dropdown"]', { timeout: 5000 });

    // Verify dropdown elements
    await expect(page.locator('[data-testid="notifications-dropdown"]')).toBeVisible();
    await expect(page.locator('[data-testid="mark-all-read"]')).toBeVisible();

    // Capture dropdown state
    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/notifications-removal/screenshots/04-notifications-dropdown-open.png'
    });

    // Close dropdown by clicking outside
    await page.locator('[data-testid="notifications-overlay"]').click();
    await expect(page.locator('[data-testid="notifications-dropdown"]')).not.toBeVisible();

    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/notifications-removal/screenshots/04-notifications-dropdown-closed.png'
    });
  });

  test('05-Header Layout Measurements - Pre-Removal', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });

    await page.waitForSelector('[data-testid="header"]', { timeout: 10000 });

    // Measure header dimensions with notifications
    const headerBounds = await page.locator('[data-testid="header"]').boundingBox();
    const notificationsBounds = await page.locator('[data-testid="real-time-notifications"]').boundingBox();

    expect(headerBounds).not.toBeNull();
    expect(notificationsBounds).not.toBeNull();

    // Log measurements for comparison
    console.log('PRE-REMOVAL MEASUREMENTS:');
    console.log('Header bounds:', headerBounds);
    console.log('Notifications bounds:', notificationsBounds);

    // Save measurements to file for post-removal comparison
    const measurements = {
      timestamp: new Date().toISOString(),
      phase: 'pre-removal',
      header: headerBounds,
      notifications: notificationsBounds,
      viewportSize: { width: 1920, height: 1080 }
    };

    await page.evaluate((data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pre-removal-measurements.json';
      a.click();
    }, measurements);
  });

  test('06-Console Errors Baseline - Pre-Removal', async ({ page }) => {
    const consoleMessages: Array<{type: string, text: string}> = [];
    const pageErrors: Array<string> = [];

    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    page.on('pageerror', error => {
      pageErrors.push(error.message);
    });

    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

    // Wait for app to fully load
    await page.waitForSelector('[data-testid="app-root"]', { timeout: 15000 });
    await page.waitForTimeout(2000); // Allow time for any delayed errors

    // Interact with notifications to check for interaction errors
    await page.locator('[data-testid="notifications-button"]').click();
    await page.waitForTimeout(1000);
    await page.locator('[data-testid="notifications-overlay"]').click();
    await page.waitForTimeout(1000);

    // Log baseline error state
    console.log('PRE-REMOVAL CONSOLE STATE:');
    console.log('Console messages:', consoleMessages.filter(m => m.type === 'error'));
    console.log('Page errors:', pageErrors);

    // Expect no critical errors with notifications present
    const criticalErrors = [
      ...consoleMessages.filter(m => m.type === 'error' && !m.text.includes('favicon')),
      ...pageErrors
    ];

    expect(criticalErrors.length).toBe(0);
  });

  test('07-Network Requests Baseline - Pre-Removal', async ({ page }) => {
    const networkRequests: Array<{url: string, status: number, method: string}> = [];

    page.on('response', response => {
      networkRequests.push({
        url: response.url(),
        status: response.status(),
        method: response.request().method()
      });
    });

    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

    // Wait and interact with notifications
    await page.waitForSelector('[data-testid="notifications-button"]', { timeout: 10000 });
    await page.locator('[data-testid="notifications-button"]').click();
    await page.waitForTimeout(1000);

    // Log network activity for baseline
    console.log('PRE-REMOVAL NETWORK REQUESTS:');
    console.log('Total requests:', networkRequests.length);
    console.log('Failed requests:', networkRequests.filter(r => r.status >= 400));

    // Verify no failed requests
    const failedRequests = networkRequests.filter(r => r.status >= 400 && !r.url.includes('favicon'));
    expect(failedRequests.length).toBe(0);
  });
});