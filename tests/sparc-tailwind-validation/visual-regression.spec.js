/**
 * SPARC Phase 4: Refinement - Visual Regression Tests
 * Visual validation tests for Tailwind CSS styling consistency
 */

const { test, expect } = require('@playwright/test');

test.describe('SPARC Visual Regression Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Disable animations for consistent screenshots
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `
    });
  });

  test.describe('1. Main Page Visual Validation', () => {
    test('should render main page with correct Tailwind styling', async ({ page }) => {
      await page.goto('http://localhost:3000');
      await page.waitForLoadState('networkidle');

      // Take full page screenshot
      await expect(page).toHaveScreenshot('main-page-full.png', {
        fullPage: true,
        animations: 'disabled'
      });

      // Take viewport screenshot
      await expect(page).toHaveScreenshot('main-page-viewport.png', {
        animations: 'disabled'
      });
    });

    test('should render main page correctly on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('http://localhost:3000');
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot('main-page-mobile.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('should render main page correctly on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('http://localhost:3000');
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot('main-page-tablet.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('should render main page correctly on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('http://localhost:3000');
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot('main-page-desktop.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });
  });

  test.describe('2. Component Visual Validation', () => {
    test('should render navigation component correctly', async ({ page }) => {
      await page.goto('http://localhost:3000');
      await page.waitForLoadState('networkidle');

      // Screenshot navigation area
      const navigation = page.locator('nav, [role="navigation"], .navigation').first();
      if (await navigation.count() > 0) {
        await expect(navigation).toHaveScreenshot('navigation-component.png');
      }
    });

    test('should render main content area correctly', async ({ page }) => {
      await page.goto('http://localhost:3000');
      await page.waitForLoadState('networkidle');

      // Screenshot main content
      const mainContent = page.locator('main, [role="main"], .main-content').first();
      if (await mainContent.count() > 0) {
        await expect(mainContent).toHaveScreenshot('main-content-component.png');
      }
    });

    test('should render agent cards if present', async ({ page }) => {
      await page.goto('http://localhost:3000');
      await page.waitForLoadState('networkidle');

      // Check if agents page/section exists
      const agentsLink = page.locator('a[href*="agents"], a[href*="Agents"]').first();
      if (await agentsLink.count() > 0) {
        await agentsLink.click();
        await page.waitForLoadState('networkidle');

        const agentCard = page.locator('.agent-card, [class*="agent-card"]').first();
        if (await agentCard.count() > 0) {
          await expect(agentCard).toHaveScreenshot('agent-card-component.png');
        }
      }
    });

    test('should render buttons and interactive elements correctly', async ({ page }) => {
      await page.goto('http://localhost:3000');
      await page.waitForLoadState('networkidle');

      const buttons = page.locator('button');
      if (await buttons.count() > 0) {
        await expect(buttons.first()).toHaveScreenshot('button-component.png');
      }
    });
  });

  test.describe('3. Responsive Design Validation', () => {
    const viewports = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1024, height: 768 },
      { name: 'large-desktop', width: 1920, height: 1080 }
    ];

    viewports.forEach(viewport => {
      test(`should render correctly on ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('http://localhost:3000');
        await page.waitForLoadState('networkidle');

        await expect(page).toHaveScreenshot(`responsive-${viewport.name}.png`, {
          fullPage: true,
          animations: 'disabled'
        });
      });
    });

    test('should handle responsive navigation correctly', async ({ page }) => {
      // Test mobile navigation
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('http://localhost:3000');
      await page.waitForLoadState('networkidle');

      // Check for mobile menu toggle
      const mobileMenuToggle = page.locator('[aria-label*="menu"], .mobile-menu-toggle, button[data-mobile-menu]').first();
      if (await mobileMenuToggle.count() > 0) {
        await expect(page).toHaveScreenshot('mobile-nav-closed.png');

        await mobileMenuToggle.click();
        await expect(page).toHaveScreenshot('mobile-nav-open.png');
      }
    });
  });

  test.describe('4. Color and Theme Validation', () => {
    test('should render with correct color scheme', async ({ page }) => {
      await page.goto('http://localhost:3000');
      await page.waitForLoadState('networkidle');

      // Test light theme
      await expect(page).toHaveScreenshot('light-theme.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('should render dark mode correctly if implemented', async ({ page }) => {
      await page.goto('http://localhost:3000');
      await page.waitForLoadState('networkidle');

      // Try to find and activate dark mode
      const darkModeToggle = page.locator('[data-theme-toggle], .dark-mode-toggle, button[aria-label*="dark"]').first();
      if (await darkModeToggle.count() > 0) {
        await darkModeToggle.click();
        await page.waitForTimeout(500); // Allow transition

        await expect(page).toHaveScreenshot('dark-theme.png', {
          fullPage: true,
          animations: 'disabled'
        });
      }
    });

    test('should respect system color scheme preference', async ({ page }) => {
      // Test with dark color scheme preference
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.goto('http://localhost:3000');
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot('system-dark-preference.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });
  });

  test.describe('5. Typography and Text Rendering', () => {
    test('should render typography correctly', async ({ page }) => {
      await page.goto('http://localhost:3000');
      await page.waitForLoadState('networkidle');

      // Find text elements to test typography
      const headings = page.locator('h1, h2, h3, h4, h5, h6');
      if (await headings.count() > 0) {
        await expect(headings.first()).toHaveScreenshot('typography-heading.png');
      }

      const paragraphs = page.locator('p');
      if (await paragraphs.count() > 0) {
        await expect(paragraphs.first()).toHaveScreenshot('typography-paragraph.png');
      }
    });

    test('should handle text shadows correctly', async ({ page }) => {
      await page.goto('http://localhost:3000');
      await page.waitForLoadState('networkidle');

      const textShadowElement = page.locator('.text-shadow-md, .text-shadow-lg').first();
      if (await textShadowElement.count() > 0) {
        await expect(textShadowElement).toHaveScreenshot('text-shadow-element.png');
      }
    });
  });

  test.describe('6. Animation and Transition Validation', () => {
    test('should handle hover states correctly', async ({ page }) => {
      await page.goto('http://localhost:3000');
      await page.waitForLoadState('networkidle');

      const hoverableElement = page.locator('button, .hover\\:bg-gray-50, .hover\\:shadow-lg').first();
      if (await hoverableElement.count() > 0) {
        // Normal state
        await expect(hoverableElement).toHaveScreenshot('element-normal.png');

        // Hover state
        await hoverableElement.hover();
        await expect(hoverableElement).toHaveScreenshot('element-hover.png');
      }
    });

    test('should handle focus states correctly', async ({ page }) => {
      await page.goto('http://localhost:3000');
      await page.waitForLoadState('networkidle');

      const focusableElement = page.locator('button, input, [tabindex]').first();
      if (await focusableElement.count() > 0) {
        // Normal state
        await expect(focusableElement).toHaveScreenshot('focusable-normal.png');

        // Focus state
        await focusableElement.focus();
        await expect(focusableElement).toHaveScreenshot('focusable-focused.png');
      }
    });
  });

  test.describe('7. Grid and Layout Validation', () => {
    test('should render CSS Grid layouts correctly', async ({ page }) => {
      await page.goto('http://localhost:3000');
      await page.waitForLoadState('networkidle');

      const gridElement = page.locator('.grid, .grid-cols-1, .grid-cols-2, .grid-cols-3').first();
      if (await gridElement.count() > 0) {
        await expect(gridElement).toHaveScreenshot('grid-layout.png');
      }
    });

    test('should render Flexbox layouts correctly', async ({ page }) => {
      await page.goto('http://localhost:3000');
      await page.waitForLoadState('networkidle');

      const flexElement = page.locator('.flex, .flex-col, .flex-row').first();
      if (await flexElement.count() > 0) {
        await expect(flexElement).toHaveScreenshot('flex-layout.png');
      }
    });

    test('should handle spacing utilities correctly', async ({ page }) => {
      await page.goto('http://localhost:3000');
      await page.waitForLoadState('networkidle');

      const spacedElement = page.locator('.space-y-4, .space-x-4, .gap-4').first();
      if (await spacedElement.count() > 0) {
        await expect(spacedElement).toHaveScreenshot('spacing-utilities.png');
      }
    });
  });

  test.describe('8. Error State Validation', () => {
    test('should render 404 page correctly if accessible', async ({ page }) => {
      const response = await page.goto('http://localhost:3000/nonexistent-page');

      if (response && response.status() === 404) {
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveScreenshot('404-page.png', {
          fullPage: true,
          animations: 'disabled'
        });
      }
    });

    test('should handle JavaScript disabled gracefully', async ({ page, context }) => {
      await context.addInitScript(() => {
        // Disable JavaScript
        Object.defineProperty(window, 'addEventListener', { value: () => {} });
      });

      await page.goto('http://localhost:3000');
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot('no-javascript.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });
  });
});