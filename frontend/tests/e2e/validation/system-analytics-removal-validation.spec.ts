import { test, expect, Page } from '@playwright/test';

/**
 * E2E Validation: System Analytics Tab Removal
 *
 * PURPOSE: Validate that the System Analytics tab has been completely removed
 * and the Analytics Dashboard now correctly displays only 2 tabs.
 *
 * WHAT WAS CHANGED:
 * 1. SystemAnalytics.tsx component deleted
 * 2. RealAnalytics.tsx modified: 3 tabs → 2 tabs
 * 3. Default tab changed: 'system' → 'claude-sdk'
 *
 * TEST SCOPE:
 * - ✅ Analytics page loads successfully
 * - ✅ ONLY 2 tabs visible (Claude SDK Analytics, Performance)
 * - ✅ NO "System Analytics" tab visible
 * - ✅ Default tab is "Claude SDK Analytics"
 * - ✅ Tab switching works (Claude SDK ↔ Performance)
 * - ✅ No console errors related to SystemAnalytics
 * - ✅ URL routing works correctly
 * - ✅ No broken imports or missing components
 */

test.describe('System Analytics Removal Validation', () => {
  let consoleErrors: string[] = [];
  let consoleWarnings: string[] = [];

  test.beforeEach(async ({ page }) => {
    // Reset error tracking
    consoleErrors = [];
    consoleWarnings = [];

    // Capture console errors and warnings
    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();

      if (type === 'error') {
        consoleErrors.push(text);
        console.log('❌ Browser Console Error:', text);
      } else if (type === 'warning') {
        consoleWarnings.push(text);
        console.log('⚠️  Browser Console Warning:', text);
      }
    });

    // Capture page errors
    page.on('pageerror', (error) => {
      consoleErrors.push(error.message);
      console.log('❌ Page Error:', error.message);
    });

    // Navigate to Analytics page
    await page.goto('http://localhost:5173/analytics');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
  });

  test('Analytics page loads successfully', async ({ page }) => {
    // Verify page title/header
    await expect(page.locator('h2').filter({ hasText: 'Analytics Dashboard' })).toBeVisible();

    // Verify description is present
    await expect(page.locator('text=Real-time system metrics and performance data')).toBeVisible();

    // Verify time range selector is present
    await expect(page.locator('select').filter({ hasText: 'Last 24 Hours' })).toBeVisible();

    // Verify refresh button is present
    await expect(page.locator('button').filter({ hasText: 'Refresh' })).toBeVisible();

    // Capture screenshot
    await page.screenshot({
      path: 'tests/e2e/screenshots/validation/analytics-dashboard-initial-state.png',
      fullPage: true
    });

    console.log('✅ Analytics page loaded successfully');
  });

  test('ONLY 2 tabs visible (Claude SDK Analytics, Performance)', async ({ page }) => {
    // Wait for tabs to be rendered
    await page.waitForSelector('[role="tablist"]', { state: 'visible' });

    // Get all tab triggers
    const tabList = page.locator('[role="tablist"]');
    const tabTriggers = tabList.locator('[role="tab"]');

    // Count tabs
    const tabCount = await tabTriggers.count();
    expect(tabCount).toBe(2);
    console.log(`✅ Correct number of tabs: ${tabCount}`);

    // Verify tab names
    const tab1Text = await tabTriggers.nth(0).textContent();
    const tab2Text = await tabTriggers.nth(1).textContent();

    expect(tab1Text?.trim()).toBe('Claude SDK Analytics');
    expect(tab2Text?.trim()).toBe('Performance');

    console.log('✅ Tab 1:', tab1Text);
    console.log('✅ Tab 2:', tab2Text);

    // Capture close-up screenshot of tabs
    await tabList.screenshot({
      path: 'tests/e2e/screenshots/validation/analytics-dashboard-two-tabs.png'
    });

    console.log('✅ Only 2 tabs visible with correct names');
  });

  test('NO "System Analytics" tab visible', async ({ page }) => {
    // Wait for tabs to be rendered
    await page.waitForSelector('[role="tablist"]', { state: 'visible' });

    // Search for any text containing "System Analytics" or "System"
    const systemAnalyticsTab = page.locator('[role="tab"]').filter({ hasText: /System Analytics/i });
    const systemTab = page.locator('[role="tab"]').filter({ hasText: /^System$/i });

    // Verify System Analytics tab does NOT exist
    await expect(systemAnalyticsTab).toHaveCount(0);
    await expect(systemTab).toHaveCount(0);

    // Search in entire page for "System Analytics" text (should not find it in tabs)
    const allSystemAnalyticsText = page.locator('text=/System Analytics/i');
    const count = await allSystemAnalyticsText.count();

    // If found, ensure it's not in a tab trigger
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const element = allSystemAnalyticsText.nth(i);
        const role = await element.getAttribute('role');
        expect(role).not.toBe('tab');
      }
    }

    console.log('✅ No "System Analytics" tab found');
  });

  test('Default tab is "Claude SDK Analytics"', async ({ page }) => {
    // Wait for tabs to be rendered
    await page.waitForSelector('[role="tablist"]', { state: 'visible' });

    // Get the active tab (should have data-state="active" or aria-selected="true")
    const activeTab = page.locator('[role="tab"][aria-selected="true"]');

    // Verify active tab exists
    await expect(activeTab).toBeVisible();

    // Verify active tab text
    const activeTabText = await activeTab.textContent();
    expect(activeTabText?.trim()).toBe('Claude SDK Analytics');

    console.log('✅ Default active tab:', activeTabText);

    // Verify Claude SDK content is visible (loading state or actual content)
    const claudeSDKContent = page.locator('[role="tabpanel"]').first();
    await expect(claudeSDKContent).toBeVisible();

    // Check for either loading state or actual content
    const hasLoadingIndicator = await page.locator('[data-testid="claude-sdk-loading"]').isVisible().catch(() => false);
    const hasTokenAnalytics = await page.locator('text=/Token Usage|Claude SDK|Cost Tracking/i').isVisible().catch(() => false);

    expect(hasLoadingIndicator || hasTokenAnalytics).toBe(true);

    console.log('✅ Claude SDK Analytics tab is active by default');
  });

  test('Tab switching works: Claude SDK ↔ Performance', async ({ page }) => {
    // Wait for tabs to be rendered
    await page.waitForSelector('[role="tablist"]', { state: 'visible' });

    // Step 1: Verify Claude SDK tab is active
    const claudeSDKTab = page.locator('[role="tab"]').filter({ hasText: 'Claude SDK Analytics' });
    await expect(claudeSDKTab).toHaveAttribute('aria-selected', 'true');
    console.log('✅ Step 1: Claude SDK tab is initially active');

    // Step 2: Click Performance tab
    const performanceTab = page.locator('[role="tab"]').filter({ hasText: 'Performance' });
    await performanceTab.click();

    // Wait for tab switch animation
    await page.waitForTimeout(300);

    // Verify Performance tab is now active
    await expect(performanceTab).toHaveAttribute('aria-selected', 'true');
    await expect(claudeSDKTab).toHaveAttribute('aria-selected', 'false');
    console.log('✅ Step 2: Performance tab is now active');

    // Verify Performance content is visible
    const performanceContent = page.locator('[data-testid="performance-metrics"]');
    await expect(performanceContent).toBeVisible();

    // Capture screenshot of Performance tab
    await page.screenshot({
      path: 'tests/e2e/screenshots/validation/performance-tab-active.png',
      fullPage: true
    });

    console.log('✅ Step 3: Performance content is visible');

    // Step 3: Switch back to Claude SDK tab
    await claudeSDKTab.click();
    await page.waitForTimeout(300);

    // Verify Claude SDK tab is active again
    await expect(claudeSDKTab).toHaveAttribute('aria-selected', 'true');
    await expect(performanceTab).toHaveAttribute('aria-selected', 'false');
    console.log('✅ Step 4: Switched back to Claude SDK tab');

    // Capture screenshot of tab switching
    await page.screenshot({
      path: 'tests/e2e/screenshots/validation/tab-switching-works.png',
      fullPage: true
    });

    console.log('✅ Tab switching works correctly');
  });

  test('No console errors related to SystemAnalytics', async ({ page }) => {
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Give time for any delayed errors

    // Filter for SystemAnalytics-related errors
    const systemAnalyticsErrors = consoleErrors.filter(error =>
      error.toLowerCase().includes('systemanalytics') ||
      error.toLowerCase().includes('system analytics') ||
      error.includes('SystemAnalytics.tsx') ||
      error.includes('Cannot find module') && error.includes('SystemAnalytics')
    );

    // Verify no SystemAnalytics-related errors
    expect(systemAnalyticsErrors).toHaveLength(0);

    if (systemAnalyticsErrors.length > 0) {
      console.error('❌ SystemAnalytics-related errors found:');
      systemAnalyticsErrors.forEach(error => console.error('  -', error));
    } else {
      console.log('✅ No SystemAnalytics-related console errors');
    }

    // Log all console errors for debugging (but don't fail test)
    if (consoleErrors.length > 0) {
      console.log('ℹ️  Total console errors detected:', consoleErrors.length);
      consoleErrors.forEach((error, i) => {
        console.log(`  ${i + 1}.`, error);
      });
    }

    // Capture screenshot showing console state
    await page.screenshot({
      path: 'tests/e2e/screenshots/validation/no-console-errors.png',
      fullPage: true
    });
  });

  test('URL routing works correctly', async ({ page }) => {
    // Step 1: Verify default URL (no tab parameter)
    await page.goto('http://localhost:5173/analytics');
    await page.waitForLoadState('networkidle');

    let currentURL = page.url();
    console.log('✅ Step 1 - Default URL:', currentURL);

    // Default tab should be claude-sdk (no tab param in URL)
    const claudeSDKTab = page.locator('[role="tab"]').filter({ hasText: 'Claude SDK Analytics' });
    await expect(claudeSDKTab).toHaveAttribute('aria-selected', 'true');

    // Step 2: Click Performance tab and verify URL updates
    const performanceTab = page.locator('[role="tab"]').filter({ hasText: 'Performance' });
    await performanceTab.click();
    await page.waitForTimeout(500);

    currentURL = page.url();
    expect(currentURL).toContain('tab=performance');
    console.log('✅ Step 2 - Performance tab URL:', currentURL);

    // Step 3: Click Claude SDK tab and verify URL updates (param removed)
    await claudeSDKTab.click();
    await page.waitForTimeout(500);

    currentURL = page.url();
    expect(currentURL).not.toContain('tab=');
    console.log('✅ Step 3 - Claude SDK tab URL (param removed):', currentURL);

    // Step 4: Direct navigation to Performance tab via URL
    await page.goto('http://localhost:5173/analytics?tab=performance');
    await page.waitForLoadState('networkidle');

    await expect(performanceTab).toHaveAttribute('aria-selected', 'true');
    console.log('✅ Step 4 - Direct URL navigation to Performance tab works');

    // Step 5: Invalid tab parameter defaults to claude-sdk
    await page.goto('http://localhost:5173/analytics?tab=system');
    await page.waitForLoadState('networkidle');

    await expect(claudeSDKTab).toHaveAttribute('aria-selected', 'true');
    console.log('✅ Step 5 - Invalid tab parameter defaults to Claude SDK');

    console.log('✅ URL routing works correctly');
  });

  test('No broken imports or missing components', async ({ page }) => {
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Filter for import/module errors
    const importErrors = consoleErrors.filter(error =>
      error.toLowerCase().includes('cannot find module') ||
      error.toLowerCase().includes('failed to load module') ||
      error.toLowerCase().includes('import') ||
      error.toLowerCase().includes('is not defined') ||
      error.toLowerCase().includes('undefined')
    );

    // Verify no import errors
    expect(importErrors).toHaveLength(0);

    if (importErrors.length > 0) {
      console.error('❌ Import/module errors found:');
      importErrors.forEach(error => console.error('  -', error));
    } else {
      console.log('✅ No import or module errors');
    }

    // Verify all expected UI elements are present (no missing components)
    await expect(page.locator('h2').filter({ hasText: 'Analytics Dashboard' })).toBeVisible();
    await expect(page.locator('[role="tablist"]')).toBeVisible();
    await expect(page.locator('button').filter({ hasText: 'Refresh' })).toBeVisible();
    await expect(page.locator('select').first()).toBeVisible();

    console.log('✅ All expected UI components are present');
  });
});

test.describe('Visual Regression - Analytics Dashboard', () => {
  test('Full page screenshot - Claude SDK tab', async ({ page }) => {
    await page.goto('http://localhost:5173/analytics');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: 'tests/e2e/screenshots/validation/full-page-claude-sdk.png',
      fullPage: true
    });

    console.log('✅ Captured full page screenshot - Claude SDK tab');
  });

  test('Full page screenshot - Performance tab', async ({ page }) => {
    await page.goto('http://localhost:5173/analytics?tab=performance');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: 'tests/e2e/screenshots/validation/full-page-performance.png',
      fullPage: true
    });

    console.log('✅ Captured full page screenshot - Performance tab');
  });
});
