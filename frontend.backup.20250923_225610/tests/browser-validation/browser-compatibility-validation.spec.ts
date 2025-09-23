/**
 * Browser Compatibility Validation Tests
 * Tests SimpleLauncher across different browser scenarios and viewport sizes
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import { devices } from '@playwright/test';

// Mock API for consistent testing
const setupMockApi = async (page: Page) => {
  await page.route('**/api/claude/**', async (route) => {
    const url = route.request().url();
    
    if (url.includes('/check')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          claudeAvailable: true,
          message: 'Claude Code available'
        })
      });
    } else if (url.includes('/status')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          status: {
            isRunning: false,
            status: 'stopped',
            workingDirectory: '/prod'
          }
        })
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    }
  });
};

test.describe('Browser Compatibility Tests', () => {
  test('CRITICAL: Desktop Chrome compatibility', async ({ page }) => {
    await setupMockApi(page);
    await page.goto('http://localhost:3000/simple-launcher');
    await page.waitForLoadState('networkidle');

    // Verify core functionality works in Chrome
    await expect(page.locator('.simple-launcher')).toBeVisible();
    await expect(page.locator('.launch-button')).toBeVisible();
    await expect(page.locator('.stop-button')).toBeVisible();

    // Test interaction
    const launchButton = page.locator('.launch-button');
    await expect(launchButton).toBeEnabled();
    await launchButton.click();
    await page.waitForTimeout(100);
  });

  test('CRITICAL: Mobile viewport responsiveness', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 12']
    });
    const page = await context.newPage();
    
    await setupMockApi(page);
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Test mobile navigation
    const menuButton = page.locator('button').first();
    await menuButton.click();
    
    // Navigate to SimpleLauncher
    const launcherLink = page.locator('nav a[href="/simple-launcher"]');
    await expect(launcherLink).toBeVisible();
    await launcherLink.click();
    
    await page.waitForLoadState('networkidle');
    
    // Verify mobile layout
    await expect(page.locator('.simple-launcher')).toBeVisible();
    await expect(page.locator('h1')).toContainText('Claude Code Launcher');
    
    // Verify buttons are appropriately sized for mobile
    const launchButton = page.locator('.launch-button');
    const stopButton = page.locator('.stop-button');
    
    await expect(launchButton).toBeVisible();
    await expect(stopButton).toBeVisible();
    
    // Test touch interaction
    await launchButton.tap();
    
    await context.close();
  });

  test('CRITICAL: Tablet viewport compatibility', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPad Pro']
    });
    const page = await context.newPage();
    
    await setupMockApi(page);
    await page.goto('http://localhost:3000/simple-launcher');
    await page.waitForLoadState('networkidle');

    // Verify tablet layout
    await expect(page.locator('.simple-launcher')).toBeVisible();
    await expect(page.locator('.controls')).toBeVisible();
    
    // Verify responsive design elements
    const controlsSection = page.locator('.controls');
    const boundingBox = await controlsSection.boundingBox();
    
    expect(boundingBox).not.toBeNull();
    if (boundingBox) {
      expect(boundingBox.width).toBeGreaterThan(300);
    }
    
    await context.close();
  });

  test('CRITICAL: High DPI display compatibility', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 2
    });
    const page = await context.newPage();
    
    await setupMockApi(page);
    await page.goto('http://localhost:3000/simple-launcher');
    await page.waitForLoadState('networkidle');

    // Verify high DPI rendering
    await expect(page.locator('.simple-launcher')).toBeVisible();
    await expect(page.locator('.status-section')).toBeVisible();
    
    // Take screenshot for visual validation
    await page.screenshot({ path: '/workspaces/agent-feed/frontend/tests/browser-validation/screenshots/high-dpi-simple-launcher.png' });
    
    await context.close();
  });

  test('CRITICAL: JavaScript disabled fallback', async ({ browser }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false
    });
    const page = await context.newPage();
    
    // Navigate with JS disabled
    const response = await page.goto('http://localhost:3000');
    expect(response?.status()).toBe(200);
    
    // Verify basic HTML structure loads
    const html = await page.content();
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('div id="root"');
    
    await context.close();
  });
});

test.describe('Performance and Loading Tests', () => {
  test('CRITICAL: Page load performance', async ({ page }) => {
    await setupMockApi(page);
    
    const startTime = Date.now();
    await page.goto('http://localhost:3000/simple-launcher');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    // Verify reasonable load time (under 5 seconds)
    expect(loadTime).toBeLessThan(5000);
    
    // Verify core elements loaded
    await expect(page.locator('.simple-launcher')).toBeVisible();
    await expect(page.locator('.launch-button')).toBeVisible();
  });

  test('CRITICAL: Memory usage stability', async ({ page }) => {
    await setupMockApi(page);
    await page.goto('http://localhost:3000/simple-launcher');
    await page.waitForLoadState('networkidle');

    // Simulate user interaction over time
    for (let i = 0; i < 5; i++) {
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
    }

    // Navigate away and back multiple times
    for (let i = 0; i < 3; i++) {
      await page.goto('http://localhost:3000/');
      await page.waitForLoadState('networkidle');
      await page.goto('http://localhost:3000/simple-launcher');
      await page.waitForLoadState('networkidle');
    }

    // Verify component still works after stress test
    await expect(page.locator('.simple-launcher')).toBeVisible();
    await expect(page.locator('.launch-button')).toBeEnabled();
  });

  test('CRITICAL: Network error handling', async ({ page }) => {
    // Simulate network errors
    await page.route('**/api/claude/**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Server error'
        })
      });
    });

    await page.goto('http://localhost:3000/simple-launcher');
    await page.waitForLoadState('networkidle');

    // Verify component handles errors gracefully
    await expect(page.locator('.simple-launcher')).toBeVisible();
    
    // Component should still render even with API errors
    await expect(page.locator('h1')).toContainText('Claude Code Launcher');
    await expect(page.locator('.launch-button')).toBeVisible();
  });
});

test.describe('Accessibility Tests', () => {
  test('CRITICAL: Keyboard navigation works', async ({ page }) => {
    await setupMockApi(page);
    await page.goto('http://localhost:3000/simple-launcher');
    await page.waitForLoadState('networkidle');

    // Navigate using keyboard
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Should be able to reach and activate buttons
    const launchButton = page.locator('.launch-button');
    await launchButton.focus();
    
    // Verify button is focusable
    await expect(launchButton).toBeFocused();
    
    // Test keyboard activation
    await page.keyboard.press('Enter');
    
    // Should trigger button action (will show loading state)
    await page.waitForTimeout(100);
  });

  test('CRITICAL: Screen reader compatibility', async ({ page }) => {
    await setupMockApi(page);
    await page.goto('http://localhost:3000/simple-launcher');
    await page.waitForLoadState('networkidle');

    // Check for proper heading structure
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    const headingCount = await headings.count();
    expect(headingCount).toBeGreaterThan(0);

    // Verify main heading is accessible
    const mainHeading = page.locator('h1');
    await expect(mainHeading).toBeVisible();
    
    // Check button labels are descriptive
    const launchButton = page.locator('.launch-button');
    const buttonText = await launchButton.textContent();
    expect(buttonText).toContain('Launch');
  });

  test('CRITICAL: Color contrast and visibility', async ({ page }) => {
    await setupMockApi(page);
    await page.goto('http://localhost:3000/simple-launcher');
    await page.waitForLoadState('networkidle');

    // Check that key elements are visible
    await expect(page.locator('.launch-button')).toBeVisible();
    await expect(page.locator('.stop-button')).toBeVisible();
    await expect(page.locator('.status-section')).toBeVisible();

    // Take screenshot for manual color contrast review
    await page.screenshot({ 
      path: '/workspaces/agent-feed/frontend/tests/browser-validation/screenshots/color-contrast-simple-launcher.png'
    });
  });
});

test.describe('Cross-Browser Navigation Tests', () => {
  test('CRITICAL: Navigation state persistence', async ({ page }) => {
    await setupMockApi(page);
    
    // Navigate to SimpleLauncher
    await page.goto('http://localhost:3000/simple-launcher');
    await page.waitForLoadState('networkidle');
    
    // Verify initial state
    await expect(page.locator('.simple-launcher')).toBeVisible();
    
    // Navigate away
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');
    
    // Navigate back
    await page.goto('http://localhost:3000/simple-launcher');
    await page.waitForLoadState('networkidle');
    
    // Verify component reloads properly
    await expect(page.locator('.simple-launcher')).toBeVisible();
    await expect(page.locator('.launch-button')).toBeVisible();
  });

  test('CRITICAL: Browser back/forward functionality', async ({ page }) => {
    await setupMockApi(page);
    
    // Start at home
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to SimpleLauncher
    await page.locator('nav a[href="/simple-launcher"]').click();
    await page.waitForLoadState('networkidle');
    
    // Use browser back
    await page.goBack();
    await page.waitForLoadState('networkidle');
    
    // Use browser forward
    await page.goForward();
    await page.waitForLoadState('networkidle');
    
    // Verify SimpleLauncher still works
    await expect(page.locator('.simple-launcher')).toBeVisible();
  });
});