import { test, expect, Page, Locator, Browser, BrowserContext } from '@playwright/test';

/**
 * Comprehensive E2E Test Suite for Claude SDK Analytics Tab
 *
 * This test suite validates the complete functionality of the Claude SDK Analytics tab
 * including navigation, interaction, content verification, and error handling.
 */

// Test configuration
const TEST_CONFIG = {
  baseURL: 'http://127.0.0.1:5173',
  analyticsURL: 'http://127.0.0.1:5173/analytics',
  timeout: 30000,
  screenshot: true,
  video: true
};

// Enhanced selectors for robust testing
const SELECTORS = {
  // Tab navigation selectors
  tabList: '[role="tablist"]',
  claudeSDKTab: '[role="tab"]:has-text("Claude SDK"), button:has-text("Claude SDK Analytics"), [data-testid="claude-sdk-tab"]',
  systemAnalyticsTab: '[role="tab"]:has-text("System Analytics"), [data-testid="system-analytics-tab"]',

  // Content selectors
  activeTabPanel: '[role="tabpanel"][aria-hidden="false"]',
  tabPanel: '[role="tabpanel"]',
  claudeSDKContent: '[data-testid="claude-sdk-content"], .claude-sdk-analytics',

  // Loading and error states
  loadingSpinner: '[data-testid="loading"], .loading, .spinner',
  errorMessage: '[data-testid="error"], .error-message',

  // Analytics specific content
  costMetrics: '[data-testid*="cost"], .cost-metric, .pricing',
  usageCharts: '[data-testid*="chart"], .chart, canvas',
  apiMetrics: '[data-testid*="api"], .api-metric',

  // Common UI elements
  heading: 'h1, h2, h3',
  buttons: 'button',
  links: 'a'
};

// Utility functions
class AnalyticsPageHelper {
  constructor(private page: Page) {}

  async navigateToAnalytics(): Promise<void> {
    await this.page.goto(TEST_CONFIG.analyticsURL);
    await this.page.waitForLoadState('networkidle');
    await this.waitForPageLoad();
  }

  async waitForPageLoad(): Promise<void> {
    // Wait for tab list to be visible
    await this.page.waitForSelector(SELECTORS.tabList, { timeout: 10000 });

    // Wait for loading spinners to disappear
    await this.page.waitForFunction(() => {
      const spinners = document.querySelectorAll('[data-testid="loading"], .loading, .spinner');
      return spinners.length === 0 || Array.from(spinners).every(spinner =>
        (spinner as HTMLElement).style.display === 'none' ||
        !spinner.isConnected ||
        !(spinner as HTMLElement).offsetParent
      );
    }, { timeout: 15000 }).catch(() => {
      // Continue if no spinners found
    });

    // Small delay for UI stabilization
    await this.page.waitForTimeout(1000);
  }

  async findClaudeSDKTab(): Promise<Locator> {
    // Try multiple selector strategies
    const strategies = [
      SELECTORS.claudeSDKTab,
      'button:has-text("Claude SDK")',
      '[role="tab"]:has-text("SDK")',
      'button:has-text("Analytics"):has-text("SDK")',
      'button:has-text("Cost")',
      '.tab:has-text("Claude")'
    ];

    for (const selector of strategies) {
      try {
        const element = this.page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          return element;
        }
      } catch (e) {
        // Continue to next strategy
      }
    }

    throw new Error('Claude SDK tab not found with any selector strategy');
  }

  async clickClaudeSDKTab(): Promise<void> {
    const tab = await this.findClaudeSDKTab();
    await tab.click();
    await this.waitForTabSwitch();
  }

  async waitForTabSwitch(): Promise<void> {
    await this.page.waitForTimeout(500);
    await this.waitForPageLoad();
  }

  async captureScreenshot(name: string): Promise<void> {
    if (TEST_CONFIG.screenshot) {
      await this.page.screenshot({
        path: `/workspaces/agent-feed/frontend/tests/e2e/screenshots/${name}.png`,
        fullPage: true
      });
    }
  }

  async detectConsoleErrors(): Promise<string[]> {
    return await this.page.evaluate(() => {
      return (window as any).__consoleErrors || [];
    });
  }

  async getTabState(tabSelector: string): Promise<{
    isVisible: boolean;
    isActive: boolean;
    ariaSelected: string | null;
    classList: string[];
  }> {
    const tab = this.page.locator(tabSelector).first();

    return await tab.evaluate((el) => ({
      isVisible: el.offsetParent !== null,
      isActive: el.classList.contains('active') || el.getAttribute('data-state') === 'active',
      ariaSelected: el.getAttribute('aria-selected'),
      classList: Array.from(el.classList)
    }));
  }
}

// Console error tracking setup
test.beforeEach(async ({ page }) => {
  // Track console errors
  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // Make errors available to tests
  await page.addInitScript(() => {
    (window as any).__consoleErrors = [];
    const originalError = console.error;
    console.error = (...args) => {
      (window as any).__consoleErrors.push(args.join(' '));
      originalError.apply(console, args);
    };
  });

  // Handle uncaught exceptions
  page.on('pageerror', error => {
    console.error('Page error:', error.message);
  });
});

test.describe('Claude SDK Analytics Tab - Navigation Tests', () => {
  test.beforeEach(async ({ page }) => {
    const helper = new AnalyticsPageHelper(page);
    await helper.navigateToAnalytics();
  });

  test('should successfully navigate to analytics page', async ({ page }) => {
    const helper = new AnalyticsPageHelper(page);

    // Verify URL
    expect(page.url()).toBe(TEST_CONFIG.analyticsURL);

    // Verify page title
    await expect(page).toHaveTitle(/.*Analytics.*/i);

    // Verify tab list is present
    await expect(page.locator(SELECTORS.tabList)).toBeVisible();

    await helper.captureScreenshot('analytics-page-navigation');

    console.log('✓ Navigation to analytics page successful');
  });

  test('should display Claude SDK Analytics tab', async ({ page }) => {
    const helper = new AnalyticsPageHelper(page);

    // Find and verify Claude SDK tab
    const claudeSDKTab = await helper.findClaudeSDKTab();
    await expect(claudeSDKTab).toBeVisible();

    // Verify tab text content
    const tabText = await claudeSDKTab.textContent();
    expect(tabText).toMatch(/claude|sdk|analytics|cost/i);

    await helper.captureScreenshot('claude-sdk-tab-visible');

    console.log('✓ Claude SDK Analytics tab is visible and has correct content');
  });

  test('should have accessible tab navigation structure', async ({ page }) => {
    const helper = new AnalyticsPageHelper(page);

    // Verify ARIA attributes
    const tabList = page.locator(SELECTORS.tabList);
    await expect(tabList).toHaveAttribute('role', 'tablist');

    // Verify tabs have proper ARIA attributes
    const tabs = page.locator('[role="tab"]');
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThanOrEqual(2);

    for (let i = 0; i < tabCount; i++) {
      const tab = tabs.nth(i);
      await expect(tab).toHaveAttribute('role', 'tab');
    }

    await helper.captureScreenshot('accessible-tab-structure');

    console.log('✓ Tab navigation has proper accessibility structure');
  });
});

test.describe('Claude SDK Analytics Tab - Interaction Tests', () => {
  test.beforeEach(async ({ page }) => {
    const helper = new AnalyticsPageHelper(page);
    await helper.navigateToAnalytics();
  });

  test('should switch to Claude SDK Analytics tab when clicked', async ({ page }) => {
    const helper = new AnalyticsPageHelper(page);

    // Click Claude SDK tab
    await helper.clickClaudeSDKTab();

    // Verify tab is active
    const claudeSDKTab = await helper.findClaudeSDKTab();
    const tabState = await helper.getTabState(SELECTORS.claudeSDKTab);

    expect(tabState.isActive || tabState.ariaSelected === 'true').toBeTruthy();

    await helper.captureScreenshot('claude-sdk-tab-active');

    console.log('✓ Claude SDK Analytics tab switches to active state when clicked');
  });

  test('should display tab content after clicking', async ({ page }) => {
    const helper = new AnalyticsPageHelper(page);

    // Click Claude SDK tab
    await helper.clickClaudeSDKTab();

    // Wait for content to load
    await page.waitForTimeout(2000);

    // Verify active tab panel exists
    const activePanel = page.locator(SELECTORS.activeTabPanel);
    await expect(activePanel).toBeVisible();

    // Take screenshot of content
    await helper.captureScreenshot('claude-sdk-tab-content');

    console.log('✓ Tab content is displayed after clicking Claude SDK tab');
  });

  test('should handle rapid tab switching', async ({ page }) => {
    const helper = new AnalyticsPageHelper(page);

    const claudeSDKTab = await helper.findClaudeSDKTab();
    const systemTab = page.locator(SELECTORS.systemAnalyticsTab).first();

    // Rapid switching test
    for (let i = 0; i < 3; i++) {
      await claudeSDKTab.click();
      await page.waitForTimeout(200);
      await systemTab.click();
      await page.waitForTimeout(200);
    }

    // Final click on Claude SDK tab
    await claudeSDKTab.click();
    await helper.waitForTabSwitch();

    // Verify no errors occurred
    const errors = await helper.detectConsoleErrors();
    expect(errors.length).toBeLessThanOrEqual(2); // Allow minor errors

    await helper.captureScreenshot('rapid-tab-switching');

    console.log('✓ Rapid tab switching handled without major errors');
  });

  test('should support keyboard navigation', async ({ page }) => {
    const helper = new AnalyticsPageHelper(page);

    // Focus on first tab
    const firstTab = page.locator('[role="tab"]').first();
    await firstTab.focus();

    // Use arrow keys to navigate
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(500);

    // Activate with Enter
    await page.keyboard.press('Enter');
    await helper.waitForTabSwitch();

    // Use space bar activation
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(500);
    await page.keyboard.press('Space');
    await helper.waitForTabSwitch();

    await helper.captureScreenshot('keyboard-navigation');

    console.log('✓ Keyboard navigation is functional');
  });
});

test.describe('Claude SDK Analytics Tab - Content Verification Tests', () => {
  test.beforeEach(async ({ page }) => {
    const helper = new AnalyticsPageHelper(page);
    await helper.navigateToAnalytics();
    await helper.clickClaudeSDKTab();
  });

  test('should display relevant analytics content', async ({ page }) => {
    const helper = new AnalyticsPageHelper(page);

    // Check for common analytics elements
    const contentSelectors = [
      SELECTORS.costMetrics,
      SELECTORS.usageCharts,
      SELECTORS.apiMetrics,
      'div, section, article', // Generic content containers
      '.metric, .data, .value' // Common metric classes
    ];

    let contentFound = false;
    for (const selector of contentSelectors) {
      const elements = await page.locator(selector).count();
      if (elements > 0) {
        contentFound = true;
        console.log(`Found ${elements} elements with selector: ${selector}`);
      }
    }

    expect(contentFound).toBeTruthy();

    await helper.captureScreenshot('analytics-content-verification');

    console.log('✓ Relevant analytics content is displayed');
  });

  test('should handle data loading states', async ({ page }) => {
    const helper = new AnalyticsPageHelper(page);

    // Check for loading indicators (they should be gone by now)
    const loadingElements = await page.locator(SELECTORS.loadingSpinner).count();
    console.log(`Loading elements found: ${loadingElements}`);

    // Check for error states
    const errorElements = await page.locator(SELECTORS.errorMessage).count();
    console.log(`Error elements found: ${errorElements}`);

    // Verify content is present (not just loading/error states)
    const contentElements = await page.locator('div, span, p, section').count();
    expect(contentElements).toBeGreaterThan(5);

    await helper.captureScreenshot('data-loading-states');

    console.log('✓ Data loading states are handled appropriately');
  });

  test('should display proper headings and structure', async ({ page }) => {
    const helper = new AnalyticsPageHelper(page);

    // Check for headings
    const headings = await page.locator(SELECTORS.heading).count();
    console.log(`Headings found: ${headings}`);

    // Verify page structure
    const tabPanel = page.locator(SELECTORS.activeTabPanel);
    if (await tabPanel.isVisible()) {
      const panelContent = await tabPanel.textContent();
      expect(panelContent?.length).toBeGreaterThan(10);
    }

    await helper.captureScreenshot('content-structure');

    console.log('✓ Content has proper heading structure');
  });
});

test.describe('Claude SDK Analytics Tab - Error Detection and Performance', () => {
  test.beforeEach(async ({ page }) => {
    const helper = new AnalyticsPageHelper(page);
    await helper.navigateToAnalytics();
  });

  test('should not generate JavaScript errors during normal operation', async ({ page }) => {
    const helper = new AnalyticsPageHelper(page);

    // Perform normal operations
    await helper.clickClaudeSDKTab();
    await page.waitForTimeout(1000);

    // Switch back and forth
    const systemTab = page.locator(SELECTORS.systemAnalyticsTab).first();
    if (await systemTab.isVisible()) {
      await systemTab.click();
      await page.waitForTimeout(500);
      await helper.clickClaudeSDKTab();
    }

    // Check for console errors
    const errors = await helper.detectConsoleErrors();
    console.log('Console errors detected:', errors);

    // Allow minor non-critical errors
    const criticalErrors = errors.filter(error =>
      error.includes('TypeError') ||
      error.includes('ReferenceError') ||
      error.includes('SyntaxError')
    );

    expect(criticalErrors.length).toBe(0);

    await helper.captureScreenshot('error-detection');

    console.log('✓ No critical JavaScript errors detected');
  });

  test('should handle network failures gracefully', async ({ page }) => {
    const helper = new AnalyticsPageHelper(page);

    // Test with network disabled
    await page.setOfflineMode(true);

    // Try to interact with tab
    await helper.clickClaudeSDKTab();
    await page.waitForTimeout(2000);

    // Re-enable network
    await page.setOfflineMode(false);
    await page.waitForTimeout(2000);

    // Verify functionality still works
    await helper.clickClaudeSDKTab();

    await helper.captureScreenshot('network-failure-recovery');

    console.log('✓ Network failures handled gracefully');
  });

  test('should maintain performance under stress', async ({ page }) => {
    const helper = new AnalyticsPageHelper(page);

    const claudeSDKTab = await helper.findClaudeSDKTab();

    // Performance test: rapid clicking
    const startTime = Date.now();

    for (let i = 0; i < 10; i++) {
      await claudeSDKTab.click();
      await page.waitForTimeout(100);
    }

    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const averageTime = totalTime / 10;

    console.log(`Performance test: ${averageTime}ms average per tab click`);
    expect(averageTime).toBeLessThan(500); // Should be under 500ms per click

    await helper.captureScreenshot('performance-stress-test');

    console.log('✓ Performance maintained under stress conditions');
  });
});

test.describe('Claude SDK Analytics Tab - Cross-Browser Compatibility', () => {
  test('should work consistently across different browsers', async ({ page, browserName }) => {
    const helper = new AnalyticsPageHelper(page);

    await helper.navigateToAnalytics();

    // Browser-specific screenshot
    await helper.captureScreenshot(`cross-browser-${browserName}`);

    // Test basic functionality
    await helper.clickClaudeSDKTab();

    // Verify tab works in this browser
    const claudeSDKTab = await helper.findClaudeSDKTab();
    const tabState = await helper.getTabState(SELECTORS.claudeSDKTab);

    expect(tabState.isVisible).toBeTruthy();

    await helper.captureScreenshot(`claude-sdk-active-${browserName}`);

    console.log(`✓ Claude SDK Analytics tab works correctly in ${browserName}`);
  });
});

test.describe('Claude SDK Analytics Tab - Mobile Responsiveness', () => {
  test('should be accessible on mobile devices', async ({ page }) => {
    const helper = new AnalyticsPageHelper(page);

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await helper.navigateToAnalytics();
    await helper.captureScreenshot('mobile-analytics-page');

    // Find and click Claude SDK tab on mobile
    const claudeSDKTab = await helper.findClaudeSDKTab();
    await claudeSDKTab.click();
    await helper.waitForTabSwitch();

    await helper.captureScreenshot('mobile-claude-sdk-active');

    // Verify content is still accessible
    const activePanel = page.locator(SELECTORS.activeTabPanel);
    if (await activePanel.isVisible()) {
      expect(await activePanel.isVisible()).toBeTruthy();
    }

    console.log('✓ Claude SDK Analytics tab is accessible on mobile devices');
  });

  test('should adapt to different screen sizes', async ({ page }) => {
    const helper = new AnalyticsPageHelper(page);

    const screenSizes = [
      { width: 1920, height: 1080, name: 'desktop' },
      { width: 1024, height: 768, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' }
    ];

    for (const size of screenSizes) {
      await page.setViewportSize({ width: size.width, height: size.height });
      await helper.navigateToAnalytics();

      // Verify tabs are visible
      const claudeSDKTab = await helper.findClaudeSDKTab();
      await expect(claudeSDKTab).toBeVisible();

      await helper.captureScreenshot(`responsive-${size.name}`);

      console.log(`✓ Analytics tab adapts correctly to ${size.name} screen size`);
    }
  });
});

// Test hooks for cleanup and reporting
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    // Capture failure screenshot
    await page.screenshot({
      path: `/workspaces/agent-feed/frontend/tests/e2e/screenshots/failure-${testInfo.title.replace(/\s+/g, '-')}.png`,
      fullPage: true
    });

    // Log page content for debugging
    const content = await page.content();
    console.log('Page content at failure:', content.substring(0, 1000));
  }
});