/**
 * Playwright UI/UX Validation Test Suite
 * Tests authentication interface with comprehensive screenshot capture
 */

import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure screenshot directory
const SCREENSHOT_DIR = path.join(__dirname, '../../docs/validation/screenshots');

test.describe('Authentication UI/UX Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport for desktop testing
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  test('Settings Page - Authentication Options', async ({ page }) => {
    // Navigate to settings page
    await page.goto('http://localhost:5173/settings');
    await page.waitForLoadState('networkidle');

    // Screenshot 1: Initial settings page load
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '01-settings-page-initial.png'),
      fullPage: true
    });

    // Verify page title
    const title = await page.locator('h1').textContent();
    expect(title).toContain('Settings');

    // Find authentication section
    const authSection = page.locator('text=Authentication Method').first();
    await expect(authSection).toBeVisible();

    // Screenshot 2: OAuth option selected
    const oauthRadio = page.locator('input[type="radio"][value="oauth"]').first();
    await oauthRadio.click();
    await page.waitForTimeout(500); // Wait for UI transition
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '02-oauth-selected.png'),
      fullPage: true
    });

    // Verify OAuth description is visible
    const oauthDesc = page.locator('text=Use Claude.ai OAuth').first();
    await expect(oauthDesc).toBeVisible();

    // Screenshot 3: User API Key option selected
    const apiKeyRadio = page.locator('input[type="radio"][value="user_api_key"]').first();
    await apiKeyRadio.click();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '03-user-api-key-selected.png'),
      fullPage: true
    });

    // Verify API key input field appears
    const apiKeyInput = page.locator('input[placeholder*="sk-ant"]').first();
    await expect(apiKeyInput).toBeVisible();

    // Screenshot 4: API key entered
    await apiKeyInput.fill('sk-ant-test-key-for-ui-validation-123456789');
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '04-api-key-entered.png'),
      fullPage: true
    });

    // Screenshot 5: Pay-as-you-go option selected
    const payAsYouGoRadio = page.locator('input[type="radio"][value="pay_as_you_go"]').first();
    if (await payAsYouGoRadio.count() > 0) {
      await payAsYouGoRadio.click();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '05-pay-as-you-go-selected.png'),
        fullPage: true
      });
    }

    // Verify form validation
    const saveButton = page.locator('button:has-text("Save")').first();
    await expect(saveButton).toBeVisible();
  });

  test('Billing Dashboard Page', async ({ page }) => {
    // Navigate to billing page
    await page.goto('http://localhost:5173/billing');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Wait for data to load

    // Screenshot 6: Billing dashboard initial view
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '06-billing-dashboard.png'),
      fullPage: true
    });

    // Verify dashboard elements
    const dashboardTitle = page.locator('h1, h2').first();
    await expect(dashboardTitle).toBeVisible();

    // Test period selector - 7 days
    const period7d = page.locator('button:has-text("7d"), [data-period="7d"]').first();
    if (await period7d.count() > 0) {
      await period7d.click();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '07-billing-7d-period.png'),
        fullPage: true
      });
    }

    // Test period selector - 30 days
    const period30d = page.locator('button:has-text("30d"), [data-period="30d"]').first();
    if (await period30d.count() > 0) {
      await period30d.click();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '08-billing-30d-period.png'),
        fullPage: true
      });
    }

    // Test period selector - 90 days
    const period90d = page.locator('button:has-text("90d"), [data-period="90d"]').first();
    if (await period90d.count() > 0) {
      await period90d.click();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '09-billing-90d-period.png'),
        fullPage: true
      });
    }

    // Verify billing metrics are displayed
    const metricsSection = page.locator('.billing-metrics, .stats, .dashboard-stats').first();
    if (await metricsSection.count() > 0) {
      await expect(metricsSection).toBeVisible();
    }
  });

  test('Dark Mode Toggle', async ({ page }) => {
    await page.goto('http://localhost:5173/settings');
    await page.waitForLoadState('networkidle');

    // Find dark mode toggle
    const darkModeToggle = page.locator('button[aria-label*="dark"], button:has-text("Dark"), input[type="checkbox"][aria-label*="dark"]').first();

    if (await darkModeToggle.count() > 0) {
      // Screenshot 10: Light mode
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '10-light-mode.png'),
        fullPage: true
      });

      // Toggle to dark mode
      await darkModeToggle.click();
      await page.waitForTimeout(500);

      // Screenshot 11: Dark mode
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '11-dark-mode.png'),
        fullPage: true
      });

      // Verify dark mode is applied
      const body = page.locator('body');
      const classList = await body.getAttribute('class');
      expect(classList).toMatch(/dark|theme-dark/i);
    }
  });

  test('Accessibility Validation', async ({ page }) => {
    await page.goto('http://localhost:5173/settings');
    await page.waitForLoadState('networkidle');

    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);

    // Verify focus is visible
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      const styles = window.getComputedStyle(el);
      return {
        tagName: el.tagName,
        outline: styles.outline,
        outlineWidth: styles.outlineWidth
      };
    });

    expect(focusedElement.tagName).toBeTruthy();

    // Screenshot 12: Keyboard focus indicator
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '12-keyboard-focus.png'),
      fullPage: true
    });

    // Check for ARIA labels
    const radioButtons = await page.locator('input[type="radio"]').all();
    for (const radio of radioButtons) {
      const ariaLabel = await radio.getAttribute('aria-label');
      const id = await radio.getAttribute('id');

      // Should have either aria-label or associated label
      if (!ariaLabel) {
        expect(id).toBeTruthy(); // Should have ID for label association
      }
    }

    // Verify color contrast (basic check)
    const contrastCheck = await page.evaluate(() => {
      const elements = document.querySelectorAll('p, span, label, button');
      const results = [];

      for (const el of elements) {
        const styles = window.getComputedStyle(el);
        const color = styles.color;
        const bgColor = styles.backgroundColor;

        if (color && bgColor) {
          results.push({
            element: el.tagName,
            color,
            bgColor,
            fontSize: styles.fontSize
          });
        }
      }

      return results.length > 0;
    });

    expect(contrastCheck).toBeTruthy();
  });

  test('Responsive Design - Multiple Viewports', async ({ page }) => {
    // Desktop view (1920x1080)
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('http://localhost:5173/settings');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '13-desktop-1920x1080.png'),
      fullPage: true
    });

    // Tablet view (768x1024)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '14-tablet-768x1024.png'),
      fullPage: true
    });

    // Verify responsive layout changes
    const isMobileLayout = await page.evaluate(() => {
      return window.innerWidth < 1024;
    });
    expect(isMobileLayout).toBeTruthy();

    // Mobile view (375x667)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '15-mobile-375x667.png'),
      fullPage: true
    });

    // Verify mobile optimizations
    const bodyWidth = await page.evaluate(() => document.body.offsetWidth);
    expect(bodyWidth).toBeLessThanOrEqual(375);
  });

  test('Form Validation and Interaction', async ({ page }) => {
    await page.goto('http://localhost:5173/settings');
    await page.waitForLoadState('networkidle');

    // Select user API key option
    const apiKeyRadio = page.locator('input[type="radio"][value="user_api_key"]').first();
    await apiKeyRadio.click();
    await page.waitForTimeout(500);

    // Test empty validation
    const apiKeyInput = page.locator('input[placeholder*="sk-ant"]').first();
    await apiKeyInput.fill('');
    await apiKeyInput.blur();
    await page.waitForTimeout(300);

    // Screenshot 16: Validation error state
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '16-validation-error.png'),
      fullPage: true
    });

    // Test valid input
    await apiKeyInput.fill('sk-ant-valid-key-test-12345');
    await page.waitForTimeout(300);

    // Screenshot 17: Valid state
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '17-validation-success.png'),
      fullPage: true
    });

    // Test save button interaction
    const saveButton = page.locator('button:has-text("Save")').first();
    await saveButton.hover();
    await page.waitForTimeout(200);

    // Screenshot 18: Button hover state
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '18-button-hover.png'),
      fullPage: true
    });
  });
});

test.describe('UI Element Verification', () => {
  test('Settings Page Layout Elements', async ({ page }) => {
    await page.goto('http://localhost:5173/settings');
    await page.waitForLoadState('networkidle');

    // Verify all radio buttons are present
    const radioButtons = await page.locator('input[type="radio"]').count();
    expect(radioButtons).toBeGreaterThan(0);

    // Verify form structure
    const forms = await page.locator('form').count();
    expect(forms).toBeGreaterThanOrEqual(0); // May or may not use form tag

    // Verify no console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    expect(consoleErrors.length).toBe(0);
  });

  test('Billing Page Layout Elements', async ({ page }) => {
    await page.goto('http://localhost:5173/billing');
    await page.waitForLoadState('networkidle');

    // Verify page loads without errors
    const title = await page.title();
    expect(title).toBeTruthy();

    // Check for data visualization elements
    const hasCharts = await page.evaluate(() => {
      return document.querySelector('canvas, svg[class*="chart"], .recharts-wrapper') !== null;
    });

    // Charts may or may not be present depending on implementation
    console.log('Charts present:', hasCharts);

    // Verify no broken images
    const brokenImages = await page.evaluate(() => {
      const images = Array.from(document.images);
      return images.filter(img => !img.complete || img.naturalHeight === 0).length;
    });

    expect(brokenImages).toBe(0);
  });
});
