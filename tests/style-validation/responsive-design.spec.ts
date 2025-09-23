import { test, expect, Page } from '@playwright/test';

// Responsive design validation test suite
test.describe('Responsive Design Validation', () => {

  const viewports = [
    { name: 'mobile-portrait', width: 390, height: 844 },
    { name: 'mobile-landscape', width: 844, height: 390 },
    { name: 'tablet-portrait', width: 768, height: 1024 },
    { name: 'tablet-landscape', width: 1024, height: 768 },
    { name: 'desktop-small', width: 1366, height: 768 },
    { name: 'desktop-large', width: 1920, height: 1080 },
    { name: 'ultrawide', width: 2560, height: 1440 }
  ];

  viewports.forEach(({ name, width, height }) => {
    test(`Layout validation on ${name} (${width}x${height})`, async ({ page }) => {
      // Set viewport size
      await page.setViewportSize({ width, height });
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

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

      // Take full page screenshot
      await expect(page).toHaveScreenshot(`${name}-full-page.png`, {
        fullPage: true,
        animations: 'disabled'
      });

      // Take viewport screenshot
      await expect(page).toHaveScreenshot(`${name}-viewport.png`, {
        animations: 'disabled'
      });

      // Validate no horizontal scroll on mobile/tablet
      if (width < 1024) {
        const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
        expect(bodyWidth).toBeLessThanOrEqual(width + 10); // Allow 10px tolerance
      }

      // Check for responsive navigation
      const nav = page.locator('nav, .navigation, header');
      if (await nav.count() > 0) {
        await expect(nav.first()).toHaveScreenshot(`${name}-navigation.png`);
      }

      // Check mobile menu if on small screen
      if (width < 768) {
        const mobileMenuTrigger = page.locator('.menu-toggle, .hamburger, [aria-label*="menu"]');
        if (await mobileMenuTrigger.count() > 0) {
          await mobileMenuTrigger.first().click();
          await page.waitForTimeout(500);
          await expect(page).toHaveScreenshot(`${name}-mobile-menu.png`);
        }
      }
    });
  });

  test('Breakpoint transitions validation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Test major breakpoint transitions
    const breakpoints = [320, 480, 768, 1024, 1280, 1536];

    for (const width of breakpoints) {
      await page.setViewportSize({ width, height: 1000 });
      await page.waitForTimeout(500);

      // Check layout doesn't break at this breakpoint
      const overflowElements = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('*'));
        return elements.filter(el => {
          const rect = el.getBoundingClientRect();
          return rect.right > window.innerWidth;
        }).length;
      });

      expect(overflowElements).toBe(0);

      await expect(page).toHaveScreenshot(`breakpoint-${width}px.png`);
    }
  });

  test('Text readability across viewports', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    for (const { name, width, height } of viewports) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(500);

      // Check text elements
      const textElements = page.locator('p, h1, h2, h3, h4, h5, h6, span, div');
      const textCount = await textElements.count();

      if (textCount > 0) {
        // Sample first few text elements
        for (let i = 0; i < Math.min(5, textCount); i++) {
          const element = textElements.nth(i);
          if (await element.isVisible()) {
            const styles = await element.evaluate((el) => {
              const computed = window.getComputedStyle(el);
              return {
                fontSize: parseFloat(computed.fontSize),
                lineHeight: computed.lineHeight,
                letterSpacing: computed.letterSpacing
              };
            });

            // Ensure minimum font size for readability
            if (width < 768) {
              expect(styles.fontSize).toBeGreaterThanOrEqual(14); // Minimum 14px on mobile
            } else {
              expect(styles.fontSize).toBeGreaterThanOrEqual(12); // Minimum 12px on desktop
            }
          }
        }
      }

      await expect(page).toHaveScreenshot(`${name}-text-readability.png`);
    }
  });

  test('Touch target sizes on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check button sizes
    const buttons = page.locator('button, a, [role="button"]');
    const buttonCount = await buttons.count();

    if (buttonCount > 0) {
      for (let i = 0; i < Math.min(10, buttonCount); i++) {
        const button = buttons.nth(i);
        if (await button.isVisible()) {
          const size = await button.boundingBox();
          if (size) {
            // Check minimum touch target size (44px recommended)
            expect(Math.min(size.width, size.height)).toBeGreaterThanOrEqual(40);
          }
        }
      }
    }

    await expect(page).toHaveScreenshot('mobile-touch-targets.png');
  });

  test('Image responsiveness validation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    for (const { name, width, height } of viewports.slice(0, 4)) { // Test first 4 viewports
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(500);

      // Check image elements
      const images = page.locator('img');
      const imageCount = await images.count();

      if (imageCount > 0) {
        for (let i = 0; i < Math.min(3, imageCount); i++) {
          const img = images.nth(i);
          if (await img.isVisible()) {
            const imgBox = await img.boundingBox();
            if (imgBox) {
              // Ensure images don't overflow container
              expect(imgBox.width).toBeLessThanOrEqual(width);
            }
          }
        }
      }

      await expect(page).toHaveScreenshot(`${name}-images.png`);
    }
  });

  test('Flexbox and grid responsiveness', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    for (const { name, width, height } of viewports) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(500);

      // Check flex containers
      const flexContainers = page.locator('.flex, [style*="display: flex"]');
      if (await flexContainers.count() > 0) {
        await expect(flexContainers.first()).toHaveScreenshot(`${name}-flex-container.png`);
      }

      // Check grid containers
      const gridContainers = page.locator('.grid, [style*="display: grid"]');
      if (await gridContainers.count() > 0) {
        await expect(gridContainers.first()).toHaveScreenshot(`${name}-grid-container.png`);
      }
    }
  });

  test('Spacing consistency across viewports', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    for (const { name, width, height } of viewports) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(500);

      // Check if spacing scales appropriately
      const spacedElements = page.locator('.p-4, .m-4, .space-x-4, .space-y-4, .gap-4');
      if (await spacedElements.count() > 0) {
        await expect(spacedElements.first()).toHaveScreenshot(`${name}-spacing.png`);
      }

      // Take a screenshot showing overall spacing
      await expect(page).toHaveScreenshot(`${name}-spacing-overview.png`);
    }
  });

  test('Sidebar and drawer responsiveness', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for sidebar on desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);

    const sidebar = page.locator('.sidebar, .drawer, [role="complementary"]');
    if (await sidebar.count() > 0) {
      await expect(sidebar.first()).toHaveScreenshot('desktop-sidebar.png');
    }

    // Check sidebar behavior on mobile
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(500);

    if (await sidebar.count() > 0) {
      // Sidebar should be hidden or collapsed on mobile
      const isVisible = await sidebar.first().isVisible();
      if (isVisible) {
        const styles = await sidebar.first().evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            position: computed.position,
            transform: computed.transform,
            left: computed.left
          };
        });

        // Check if sidebar is properly hidden/transformed on mobile
        expect(
          styles.transform.includes('translate') ||
          styles.left.includes('-') ||
          styles.position === 'absolute'
        ).toBeTruthy();
      }

      await expect(page).toHaveScreenshot('mobile-sidebar.png');
    }
  });

  test('Form responsiveness validation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for forms
    const forms = page.locator('form, .form');
    if (await forms.count() > 0) {
      for (const { name, width, height } of viewports.slice(0, 3)) {
        await page.setViewportSize({ width, height });
        await page.waitForTimeout(500);

        await expect(forms.first()).toHaveScreenshot(`${name}-form.png`);

        // Check input field sizes
        const inputs = forms.first().locator('input, textarea, select');
        const inputCount = await inputs.count();

        if (inputCount > 0) {
          for (let i = 0; i < Math.min(3, inputCount); i++) {
            const input = inputs.nth(i);
            if (await input.isVisible()) {
              const inputBox = await input.boundingBox();
              if (inputBox) {
                // Ensure inputs don't overflow on mobile
                if (width < 768) {
                  expect(inputBox.width).toBeLessThanOrEqual(width - 40); // Account for padding
                }
              }
            }
          }
        }
      }
    }
  });

  test('Scroll behavior validation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    for (const { name, width, height } of viewports) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(500);

      // Check for horizontal scroll (should be minimal)
      const horizontalScrollWidth = await page.evaluate(() => {
        return Math.max(
          document.body.scrollWidth,
          document.documentElement.scrollWidth
        );
      });

      expect(horizontalScrollWidth).toBeLessThanOrEqual(width + 20); // Allow small tolerance

      // Test vertical scrolling
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot(`${name}-bottom-scroll.png`);

      // Scroll back to top
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(500);
    }
  });
});