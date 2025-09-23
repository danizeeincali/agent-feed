import { test, expect, Page } from '@playwright/test';

// Visual regression test suite for style validation
test.describe('Visual Style Validation', () => {

  test.beforeEach(async ({ page }) => {
    // Wait for any animations to settle
    await page.addInitScript(() => {
      // Disable CSS animations and transitions
      const style = document.createElement('style');
      style.textContent = `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `;
      document.head.appendChild(style);
    });
  });

  test('Homepage visual validation', async ({ page }) => {
    await page.goto('/');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Take full page screenshot
    await expect(page).toHaveScreenshot('homepage-full.png', {
      fullPage: true,
      animations: 'disabled'
    });

    // Take viewport screenshot
    await expect(page).toHaveScreenshot('homepage-viewport.png', {
      animations: 'disabled'
    });
  });

  test('Agent Feed Dashboard visual validation', async ({ page }) => {
    await page.goto('/');

    // Wait for dashboard to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Check if dashboard is visible
    const dashboard = page.locator('[data-testid="agent-dashboard"], .agent-dashboard, #agent-dashboard');
    if (await dashboard.count() > 0) {
      await expect(dashboard.first()).toBeVisible();
      await expect(dashboard.first()).toHaveScreenshot('agent-dashboard.png');
    }

    // Take full page screenshot
    await expect(page).toHaveScreenshot('agent-feed-dashboard.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('Terminal interface visual validation', async ({ page }) => {
    await page.goto('/');

    // Wait for page load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Look for terminal component
    const terminal = page.locator('[data-testid="terminal"], .terminal, #terminal, .xterm');
    if (await terminal.count() > 0) {
      await expect(terminal.first()).toBeVisible();
      await expect(terminal.first()).toHaveScreenshot('terminal-interface.png');
    }

    // Take screenshot of area where terminal should be
    const terminalArea = page.locator('.terminal-container, .terminal-wrapper');
    if (await terminalArea.count() > 0) {
      await expect(terminalArea.first()).toHaveScreenshot('terminal-area.png');
    }
  });

  test('Navigation components visual validation', async ({ page }) => {
    await page.goto('/');

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Check for navigation elements
    const nav = page.locator('nav, .nav, .navigation, header');
    if (await nav.count() > 0) {
      await expect(nav.first()).toHaveScreenshot('navigation.png');
    }

    // Check for menu items
    const menuItems = page.locator('.menu-item, .nav-item, [role="menuitem"]');
    if (await menuItems.count() > 0) {
      await expect(menuItems.first()).toHaveScreenshot('menu-items.png');
    }
  });

  test('Button components visual validation', async ({ page }) => {
    await page.goto('/');

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Find all buttons
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    if (buttonCount > 0) {
      // Take screenshot of first few buttons
      for (let i = 0; i < Math.min(5, buttonCount); i++) {
        const button = buttons.nth(i);
        if (await button.isVisible()) {
          await expect(button).toHaveScreenshot(`button-${i}.png`);
        }
      }
    }

    // Take screenshot of all buttons together
    const buttonContainer = page.locator('body');
    await expect(buttonContainer).toHaveScreenshot('all-buttons.png', {
      mask: [page.locator('.terminal, .xterm, [data-testid="terminal"]')]
    });
  });

  test('Card components visual validation', async ({ page }) => {
    await page.goto('/');

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Look for card-like components
    const cards = page.locator('.card, .panel, .widget, [class*="card"]');
    const cardCount = await cards.count();

    if (cardCount > 0) {
      for (let i = 0; i < Math.min(3, cardCount); i++) {
        const card = cards.nth(i);
        if (await card.isVisible()) {
          await expect(card).toHaveScreenshot(`card-${i}.png`);
        }
      }
    }
  });

  test('Loading states visual validation', async ({ page }) => {
    await page.goto('/');

    // Capture loading state if visible
    const loadingSpinner = page.locator('.loading, .spinner, [data-testid="loading"]');
    if (await loadingSpinner.count() > 0) {
      await expect(loadingSpinner.first()).toHaveScreenshot('loading-spinner.png');
    }

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Capture final loaded state
    await expect(page).toHaveScreenshot('loaded-state.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('Error states visual validation', async ({ page }) => {
    await page.goto('/');

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Look for error messages or error states
    const errorElements = page.locator('.error, .alert-error, [role="alert"]');
    if (await errorElements.count() > 0) {
      await expect(errorElements.first()).toHaveScreenshot('error-state.png');
    }

    // Test 404 or non-existent route
    await page.goto('/non-existent-route');
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('404-page.png');
  });

  test('Modal and overlay visual validation', async ({ page }) => {
    await page.goto('/');

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Look for modal triggers and open them
    const modalTriggers = page.locator('[data-testid*="modal"], button[aria-haspopup="dialog"]');
    if (await modalTriggers.count() > 0) {
      await modalTriggers.first().click();
      await page.waitForTimeout(500);

      const modal = page.locator('[role="dialog"], .modal');
      if (await modal.count() > 0) {
        await expect(modal.first()).toHaveScreenshot('modal.png');
      }
    }
  });
});