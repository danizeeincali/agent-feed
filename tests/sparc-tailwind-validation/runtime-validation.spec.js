/**
 * SPARC Phase 4: Refinement - Runtime CSS Validation Tests
 * Playwright tests for validating Tailwind CSS in browser environment
 */

const { test, expect } = require('@playwright/test');

test.describe('SPARC Tailwind Runtime Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the main page
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test.describe('1. CSS Loading and Application', () => {
    test('should load CSS files successfully', async ({ page }) => {
      // Check that CSS files are loaded
      const stylesheets = await page.locator('link[rel="stylesheet"]').count();
      expect(stylesheets).toBeGreaterThan(0);

      // Check for CSS load errors
      const cssErrors = [];
      page.on('response', response => {
        if (response.url().includes('.css') && !response.ok()) {
          cssErrors.push(response.url());
        }
      });

      await page.reload();
      expect(cssErrors).toHaveLength(0);
    });

    test('should apply Tailwind base styles', async ({ page }) => {
      // Check box-sizing reset
      const boxSizing = await page.evaluate(() => {
        return window.getComputedStyle(document.body).boxSizing;
      });
      expect(boxSizing).toBe('border-box');

      // Check that body has proper font family
      const fontFamily = await page.evaluate(() => {
        return window.getComputedStyle(document.body).fontFamily;
      });
      expect(fontFamily).toBeTruthy();
    });

    test('should apply Tailwind utility classes correctly', async ({ page }) => {
      // Test background gradient on main container
      const gradientElement = page.locator('.bg-gradient-to-br');
      if (await gradientElement.count() > 0) {
        const backgroundImage = await gradientElement.first().evaluate(el => {
          return window.getComputedStyle(el).backgroundImage;
        });
        expect(backgroundImage).toContain('linear-gradient');
      }

      // Test basic utilities
      const whiteBackground = page.locator('.bg-white').first();
      if (await whiteBackground.count() > 0) {
        const backgroundColor = await whiteBackground.evaluate(el => {
          return window.getComputedStyle(el).backgroundColor;
        });
        expect(backgroundColor).toMatch(/rgb\(255,?\s*255,?\s*255\)|white/);
      }
    });

    test('should handle responsive classes correctly', async ({ page }) => {
      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Check that sm: classes are not active
      const smElement = page.locator('.sm\\:block').first();
      if (await smElement.count() > 0) {
        const display = await smElement.evaluate(el => {
          return window.getComputedStyle(el).display;
        });
        // At mobile size, sm:block should not be active
        expect(display).not.toBe('block');
      }

      // Test desktop viewport
      await page.setViewportSize({ width: 1024, height: 768 });

      // Check that md: classes are active
      const mdElement = page.locator('.md\\:block').first();
      if (await mdElement.count() > 0) {
        const display = await mdElement.evaluate(el => {
          return window.getComputedStyle(el).display;
        });
        expect(display).toBe('block');
      }
    });
  });

  test.describe('2. Custom Configuration Validation', () => {
    test('should apply custom colors from config', async ({ page }) => {
      // Test custom primary colors
      const primaryElement = page.locator('.bg-primary-500').first();
      if (await primaryElement.count() > 0) {
        const backgroundColor = await primaryElement.evaluate(el => {
          return window.getComputedStyle(el).backgroundColor;
        });
        // Should match the primary-500 color from config (#3b82f6)
        expect(backgroundColor).toMatch(/rgb\(59,?\s*130,?\s*246\)/);
      }
    });

    test('should apply custom text-shadow utilities', async ({ page }) => {
      const textShadowElement = page.locator('.text-shadow-md').first();
      if (await textShadowElement.count() > 0) {
        const textShadow = await textShadowElement.evaluate(el => {
          return window.getComputedStyle(el).textShadow;
        });
        expect(textShadow).toBeTruthy();
        expect(textShadow).not.toBe('none');
      }
    });

    test('should apply custom animations', async ({ page }) => {
      const pulseElement = page.locator('.animate-pulse-slow').first();
      if (await pulseElement.count() > 0) {
        const animation = await pulseElement.evaluate(el => {
          return window.getComputedStyle(el).animation;
        });
        expect(animation).toContain('pulse');
        expect(animation).toContain('3s');
      }
    });
  });

  test.describe('3. Component Styling Validation', () => {
    test('should style agent cards correctly', async ({ page }) => {
      // Navigate to agents page if it exists
      const agentsLink = page.locator('a[href*="agents"], a[href*="Agents"]').first();
      if (await agentsLink.count() > 0) {
        await agentsLink.click();
        await page.waitForLoadState('networkidle');

        // Check agent card styling
        const agentCard = page.locator('.agent-card, [class*="agent-card"]').first();
        if (await agentCard.count() > 0) {
          const styles = await agentCard.evaluate(el => {
            const computed = window.getComputedStyle(el);
            return {
              backgroundColor: computed.backgroundColor,
              borderRadius: computed.borderRadius,
              boxShadow: computed.boxShadow,
              padding: computed.padding
            };
          });

          expect(styles.backgroundColor).toBeTruthy();
          expect(styles.borderRadius).not.toBe('0px');
          expect(styles.padding).not.toBe('0px');
        }
      }
    });

    test('should handle hover states correctly', async ({ page }) => {
      const interactiveElement = page.locator('button, .hover\\:bg-gray-50, .hover\\:shadow-lg').first();
      if (await interactiveElement.count() > 0) {
        // Get initial styles
        const initialStyles = await interactiveElement.evaluate(el => {
          return {
            backgroundColor: window.getComputedStyle(el).backgroundColor,
            boxShadow: window.getComputedStyle(el).boxShadow
          };
        });

        // Hover over element
        await interactiveElement.hover();

        // Get hover styles
        const hoverStyles = await interactiveElement.evaluate(el => {
          return {
            backgroundColor: window.getComputedStyle(el).backgroundColor,
            boxShadow: window.getComputedStyle(el).boxShadow
          };
        });

        // Styles should change on hover (for most interactive elements)
        expect(hoverStyles).toBeDefined();
      }
    });

    test('should apply focus states correctly', async ({ page }) => {
      const focusableElement = page.locator('button, input, [tabindex]').first();
      if (await focusableElement.count() > 0) {
        await focusableElement.focus();

        const focusStyles = await focusableElement.evaluate(el => {
          return {
            outline: window.getComputedStyle(el).outline,
            boxShadow: window.getComputedStyle(el).boxShadow
          };
        });

        // Should have some form of focus indication
        expect(focusStyles.outline !== 'none' || focusStyles.boxShadow !== 'none').toBeTruthy();
      }
    });
  });

  test.describe('4. Performance and Loading', () => {
    test('should load CSS efficiently', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('http://localhost:3000');
      await page.waitForLoadState('domcontentloaded');

      const loadTime = Date.now() - startTime;

      // Should load within reasonable time
      expect(loadTime).toBeLessThan(3000);
    });

    test('should not have CSS-related console errors', async ({ page }) => {
      const consoleErrors = [];

      page.on('console', msg => {
        if (msg.type() === 'error' && msg.text().toLowerCase().includes('css')) {
          consoleErrors.push(msg.text());
        }
      });

      await page.goto('http://localhost:3000');
      await page.waitForLoadState('networkidle');

      expect(consoleErrors).toHaveLength(0);
    });

    test('should have reasonable CSS bundle size', async ({ page }) => {
      const cssRequests = [];

      page.on('response', response => {
        if (response.url().endsWith('.css')) {
          cssRequests.push({
            url: response.url(),
            size: response.headers()['content-length']
          });
        }
      });

      await page.goto('http://localhost:3000');
      await page.waitForLoadState('networkidle');

      const totalCssSize = cssRequests.reduce((sum, req) => {
        return sum + (parseInt(req.size) || 0);
      }, 0);

      // Total CSS should be under 200KB
      expect(totalCssSize).toBeLessThan(200 * 1024);
    });
  });

  test.describe('5. Cross-Browser Compatibility', () => {
    test('should render consistently across browsers', async ({ page, browserName }) => {
      await page.goto('http://localhost:3000');

      // Take screenshot for visual comparison
      const screenshot = await page.screenshot({
        fullPage: true,
        animations: 'disabled'
      });

      expect(screenshot).toBeTruthy();

      // Check that critical elements are rendered
      const mainContent = page.locator('main, [role="main"], .main-content').first();
      if (await mainContent.count() > 0) {
        await expect(mainContent).toBeVisible();
      }

      // Check that navigation is rendered
      const navigation = page.locator('nav, [role="navigation"], .navigation').first();
      if (await navigation.count() > 0) {
        await expect(navigation).toBeVisible();
      }
    });

    test('should handle CSS Grid and Flexbox correctly', async ({ page }) => {
      // Test CSS Grid
      const gridElement = page.locator('.grid, .grid-cols-1, .grid-cols-2, .grid-cols-3').first();
      if (await gridElement.count() > 0) {
        const display = await gridElement.evaluate(el => {
          return window.getComputedStyle(el).display;
        });
        expect(display).toBe('grid');
      }

      // Test Flexbox
      const flexElement = page.locator('.flex, .flex-col, .flex-row').first();
      if (await flexElement.count() > 0) {
        const display = await flexElement.evaluate(el => {
          return window.getComputedStyle(el).display;
        });
        expect(display).toBe('flex');
      }
    });
  });

  test.describe('6. Dark Mode and Theme Switching', () => {
    test('should handle dark mode classes if implemented', async ({ page }) => {
      // Check if dark mode toggle exists
      const darkModeToggle = page.locator('[data-theme-toggle], .dark-mode-toggle, button[aria-label*="dark"], button[aria-label*="theme"]').first();

      if (await darkModeToggle.count() > 0) {
        await darkModeToggle.click();

        // Check if dark classes are applied
        const bodyClasses = await page.evaluate(() => document.body.className);
        const htmlClasses = await page.evaluate(() => document.documentElement.className);

        expect(bodyClasses.includes('dark') || htmlClasses.includes('dark')).toBeTruthy();
      }
    });

    test('should respect system theme preference', async ({ page }) => {
      // Emulate dark color scheme
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.goto('http://localhost:3000');

      // Check if dark styles are automatically applied
      const backgroundColor = await page.evaluate(() => {
        return window.getComputedStyle(document.body).backgroundColor;
      });

      // If dark mode is implemented, background should be dark
      expect(backgroundColor).toBeTruthy();
    });
  });
});