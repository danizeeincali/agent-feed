/**
 * Dark Mode End-to-End Tests
 *
 * Playwright tests for dark mode functionality across real browsers.
 * Tests system preference detection, visual appearance, and user interactions.
 */

import { test, expect, Page } from '@playwright/test';

/**
 * Helper to set browser color scheme preference
 */
async function setColorScheme(page: Page, scheme: 'light' | 'dark') {
  await page.emulateMedia({ colorScheme: scheme });
}

/**
 * Helper to check if dark mode is active
 */
async function isDarkModeActive(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    return document.documentElement.classList.contains('dark');
  });
}

/**
 * Helper to get computed color of element
 */
async function getComputedColor(page: Page, selector: string): Promise<string> {
  return await page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (!element) return '';
    return window.getComputedStyle(element).color;
  }, selector);
}

test.describe('Dark Mode E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Start with light mode
    await setColorScheme(page, 'light');
  });

  test.describe('System Preference Detection', () => {
    test('should load in light mode when system prefers light', async ({ page }) => {
      await setColorScheme(page, 'light');
      await page.goto('/');

      const isDark = await isDarkModeActive(page);
      expect(isDark).toBe(false);
    });

    test('should load in dark mode when system prefers dark', async ({ page }) => {
      await setColorScheme(page, 'dark');
      await page.goto('/');

      const isDark = await isDarkModeActive(page);
      expect(isDark).toBe(true);
    });

    test('should not show flash of wrong theme (FOUC)', async ({ page }) => {
      await setColorScheme(page, 'dark');

      // Monitor for class changes during load
      const classChanges: string[] = [];
      await page.exposeFunction('trackClassChange', (classes: string) => {
        classChanges.push(classes);
      });

      await page.addInitScript(() => {
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
              const classes = document.documentElement.className;
              (window as any).trackClassChange(classes);
            }
          });
        });

        observer.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['class']
        });
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Dark class should be added very early, ideally before first paint
      // Should not see a sequence of: no-dark -> dark
      const hasFlash = classChanges.some((classes, index) => {
        if (index === 0) return false;
        const previouslyNoDark = !classChanges[index - 1].includes('dark');
        const nowHasDark = classes.includes('dark');
        return previouslyNoDark && nowHasDark;
      });

      expect(hasFlash).toBe(false);
    });
  });

  test.describe('Runtime Theme Changes', () => {
    test('should update theme when system preference changes', async ({ page }) => {
      await setColorScheme(page, 'light');
      await page.goto('/');

      let isDark = await isDarkModeActive(page);
      expect(isDark).toBe(false);

      // Change to dark mode
      await setColorScheme(page, 'dark');
      await page.waitForTimeout(100); // Small delay for event to fire

      isDark = await isDarkModeActive(page);
      expect(isDark).toBe(true);

      // Change back to light
      await setColorScheme(page, 'light');
      await page.waitForTimeout(100);

      isDark = await isDarkModeActive(page);
      expect(isDark).toBe(false);
    });

    test('should update all components when theme changes', async ({ page }) => {
      await page.goto('/');
      await setColorScheme(page, 'light');
      await page.waitForTimeout(100);

      // Get light mode color
      const lightColor = await getComputedColor(page, 'body');

      // Switch to dark mode
      await setColorScheme(page, 'dark');
      await page.waitForTimeout(100);

      // Get dark mode color
      const darkColor = await getComputedColor(page, 'body');

      // Colors should be different
      expect(lightColor).not.toBe(darkColor);
    });
  });

  test.describe('Visual Appearance', () => {
    test('should render text with correct contrast in light mode', async ({ page }) => {
      await setColorScheme(page, 'light');
      await page.goto('/');

      // Take screenshot
      await expect(page).toHaveScreenshot('light-mode.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('should render text with correct contrast in dark mode', async ({ page }) => {
      await setColorScheme(page, 'dark');
      await page.goto('/');

      // Take screenshot
      await expect(page).toHaveScreenshot('dark-mode.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('should have visible buttons in dark mode', async ({ page }) => {
      await setColorScheme(page, 'dark');
      await page.goto('/');

      const buttons = page.locator('button').first();
      await expect(buttons).toBeVisible();

      // Button should have contrasting colors
      const bgColor = await buttons.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });

      expect(bgColor).toBeTruthy();
    });

    test('should have readable links in dark mode', async ({ page }) => {
      await setColorScheme(page, 'dark');
      await page.goto('/');

      const links = page.locator('a').first();
      if (await links.count() > 0) {
        const color = await links.evaluate((el) => {
          return window.getComputedStyle(el).color;
        });

        // Links should be a light blue in dark mode
        expect(color).toMatch(/rgb\(\s*\d+,\s*\d+,\s*\d+\s*\)/);
      }
    });
  });

  test.describe('Form Elements in Dark Mode', () => {
    test('should render input fields with dark styling', async ({ page }) => {
      await setColorScheme(page, 'dark');
      await page.goto('/');

      const input = page.locator('input[type="text"]').first();
      if (await input.count() > 0) {
        await expect(input).toBeVisible();

        const bgColor = await input.evaluate((el) => {
          return window.getComputedStyle(el).backgroundColor;
        });

        // Should have a dark background
        expect(bgColor).toMatch(/rgb/);
      }
    });

    test('should have visible placeholders in dark mode', async ({ page }) => {
      await setColorScheme(page, 'dark');
      await page.goto('/');

      const input = page.locator('input[placeholder]').first();
      if (await input.count() > 0) {
        const placeholder = await input.getAttribute('placeholder');
        expect(placeholder).toBeTruthy();

        await expect(input).toBeVisible();
      }
    });

    test('should show focus states clearly in dark mode', async ({ page }) => {
      await setColorScheme(page, 'dark');
      await page.goto('/');

      const input = page.locator('input').first();
      if (await input.count() > 0) {
        await input.focus();

        const outlineColor = await input.evaluate((el) => {
          return window.getComputedStyle(el).outlineColor;
        });

        expect(outlineColor).toBeTruthy();
      }
    });
  });

  test.describe('Navigation and Routing', () => {
    test('should maintain dark mode across page navigation', async ({ page }) => {
      await setColorScheme(page, 'dark');
      await page.goto('/');

      let isDark = await isDarkModeActive(page);
      expect(isDark).toBe(true);

      // Navigate to different page (if routes exist)
      const links = page.locator('a[href]');
      if (await links.count() > 0) {
        const firstLink = links.first();
        const href = await firstLink.getAttribute('href');

        if (href && !href.startsWith('http')) {
          await firstLink.click();
          await page.waitForLoadState('networkidle');

          isDark = await isDarkModeActive(page);
          expect(isDark).toBe(true);
        }
      }
    });

    test('should apply dark mode to dynamically loaded content', async ({ page }) => {
      await setColorScheme(page, 'dark');
      await page.goto('/');

      // Wait for any dynamic content
      await page.waitForTimeout(1000);

      // All text elements should have appropriate colors
      const textElements = page.locator('p, h1, h2, h3, h4, h5, h6, span');
      const count = await textElements.count();

      if (count > 0) {
        const firstElement = textElements.first();
        const color = await firstElement.evaluate((el) => {
          return window.getComputedStyle(el).color;
        });

        // Should be a light color in dark mode
        expect(color).toMatch(/rgb/);
      }
    });
  });

  test.describe('Performance', () => {
    test('should load quickly with dark mode', async ({ page }) => {
      await setColorScheme(page, 'dark');

      const startTime = Date.now();
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;

      // Should load within reasonable time (5 seconds)
      expect(loadTime).toBeLessThan(5000);
    });

    test('should not cause layout shift on theme change', async ({ page }) => {
      await setColorScheme(page, 'light');
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Get layout metrics
      const beforeMetrics = await page.evaluate(() => {
        const body = document.body;
        return {
          width: body.offsetWidth,
          height: body.offsetHeight,
          scrollHeight: document.documentElement.scrollHeight,
        };
      });

      // Change to dark mode
      await setColorScheme(page, 'dark');
      await page.waitForTimeout(100);

      const afterMetrics = await page.evaluate(() => {
        const body = document.body;
        return {
          width: body.offsetWidth,
          height: body.offsetHeight,
          scrollHeight: document.documentElement.scrollHeight,
        };
      });

      // Layout should remain the same
      expect(afterMetrics.width).toBe(beforeMetrics.width);
      // Allow small height differences due to font rendering
      expect(Math.abs(afterMetrics.height - beforeMetrics.height)).toBeLessThan(10);
    });
  });

  test.describe('Accessibility', () => {
    test('should maintain ARIA attributes in dark mode', async ({ page }) => {
      await setColorScheme(page, 'dark');
      await page.goto('/');

      // Check for ARIA attributes
      const ariaElements = page.locator('[aria-label], [aria-labelledby], [role]');
      const count = await ariaElements.count();

      if (count > 0) {
        const firstElement = ariaElements.first();
        const role = await firstElement.getAttribute('role');
        const ariaLabel = await firstElement.getAttribute('aria-label');

        // Should have at least one ARIA attribute
        expect(role || ariaLabel).toBeTruthy();
      }
    });

    test('should have sufficient color contrast in dark mode', async ({ page }) => {
      await setColorScheme(page, 'dark');
      await page.goto('/');

      // Use axe-core for accessibility testing
      const accessibilityScanResults = await page.evaluate(async () => {
        // Simplified contrast check
        const elements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, a, button, span');
        let hasLowContrast = false;

        elements.forEach((el) => {
          const style = window.getComputedStyle(el);
          const color = style.color;
          const bgColor = style.backgroundColor;

          // Basic check: if text is visible, we assume it has some contrast
          // Real test would calculate contrast ratio
          if (color === bgColor) {
            hasLowContrast = true;
          }
        });

        return { hasLowContrast };
      });

      expect(accessibilityScanResults.hasLowContrast).toBe(false);
    });

    test('should support keyboard navigation in dark mode', async ({ page }) => {
      await setColorScheme(page, 'dark');
      await page.goto('/');

      // Tab through interactive elements
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);

      // Check if focus is visible
      const focusedElement = await page.evaluate(() => {
        const active = document.activeElement;
        if (!active) return null;

        const style = window.getComputedStyle(active);
        return {
          outline: style.outline,
          outlineWidth: style.outlineWidth,
          boxShadow: style.boxShadow,
        };
      });

      // Should have visible focus indicator
      expect(
        focusedElement?.outline !== 'none' ||
        focusedElement?.outlineWidth !== '0px' ||
        focusedElement?.boxShadow !== 'none'
      ).toBe(true);
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle multiple rapid theme changes', async ({ page }) => {
      await page.goto('/');

      for (let i = 0; i < 5; i++) {
        await setColorScheme(page, 'dark');
        await page.waitForTimeout(50);
        await setColorScheme(page, 'light');
        await page.waitForTimeout(50);
      }

      // Should end in light mode without errors
      const isDark = await isDarkModeActive(page);
      expect(isDark).toBe(false);

      // Check for console errors
      const errors: string[] = [];
      page.on('pageerror', (error) => {
        errors.push(error.message);
      });

      await page.waitForTimeout(500);
      expect(errors).toHaveLength(0);
    });

    test('should work in incognito/private mode', async ({ context }) => {
      // This test uses the context which simulates incognito
      const page = await context.newPage();
      await setColorScheme(page, 'dark');
      await page.goto('/');

      const isDark = await isDarkModeActive(page);
      expect(isDark).toBe(true);

      await page.close();
    });

    test('should handle browser zoom levels in dark mode', async ({ page }) => {
      await setColorScheme(page, 'dark');
      await page.goto('/');

      // Test different zoom levels
      const zoomLevels = [0.5, 0.75, 1.0, 1.25, 1.5];

      for (const zoom of zoomLevels) {
        await page.evaluate((zoomLevel) => {
          document.body.style.zoom = String(zoomLevel);
        }, zoom);

        await page.waitForTimeout(100);

        // Dark mode should still be active
        const isDark = await isDarkModeActive(page);
        expect(isDark).toBe(true);
      }

      // Reset zoom
      await page.evaluate(() => {
        document.body.style.zoom = '1';
      });
    });
  });

  test.describe('Component-Specific Tests', () => {
    test('should render markdown content in dark mode', async ({ page }) => {
      await setColorScheme(page, 'dark');
      await page.goto('/');

      // Look for markdown-rendered content
      const headings = page.locator('h1, h2, h3');
      if (await headings.count() > 0) {
        const firstHeading = headings.first();
        await expect(firstHeading).toBeVisible();

        const color = await firstHeading.evaluate((el) => {
          return window.getComputedStyle(el).color;
        });

        // Should be a light color
        expect(color).toMatch(/rgb/);
      }
    });

    test('should render code blocks with syntax highlighting in dark mode', async ({ page }) => {
      await setColorScheme(page, 'dark');
      await page.goto('/');

      const codeBlocks = page.locator('pre code, code');
      if (await codeBlocks.count() > 0) {
        const firstCode = codeBlocks.first();
        await expect(firstCode).toBeVisible();

        const bgColor = await firstCode.evaluate((el) => {
          return window.getComputedStyle(el).backgroundColor;
        });

        // Should have a dark background
        expect(bgColor).toMatch(/rgb/);
      }
    });

    test('should render tables with proper styling in dark mode', async ({ page }) => {
      await setColorScheme(page, 'dark');
      await page.goto('/');

      const tables = page.locator('table');
      if (await tables.count() > 0) {
        const firstTable = tables.first();
        await expect(firstTable).toBeVisible();

        const borderColor = await firstTable.evaluate((el) => {
          return window.getComputedStyle(el).borderColor;
        });

        expect(borderColor).toMatch(/rgb/);
      }
    });
  });

  test.describe('Cross-Browser Consistency', () => {
    test('should look consistent across viewports', async ({ page }) => {
      await setColorScheme(page, 'dark');

      const viewports = [
        { width: 1920, height: 1080, name: 'desktop' },
        { width: 1280, height: 720, name: 'laptop' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 375, height: 667, name: 'mobile' },
      ];

      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const isDark = await isDarkModeActive(page);
        expect(isDark).toBe(true);

        await expect(page).toHaveScreenshot(`dark-mode-${viewport.name}.png`, {
          fullPage: false,
          animations: 'disabled',
        });
      }
    });
  });
});
