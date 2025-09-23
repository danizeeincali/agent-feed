import { test, expect, Page } from '@playwright/test';

// Tailwind CSS validation test suite
test.describe('Tailwind CSS Style Validation', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test('Primary color scheme validation', async ({ page }) => {
    // Check if primary colors are properly applied
    const primaryElements = page.locator('.bg-primary-500, .text-primary-500, .border-primary-500');

    if (await primaryElements.count() > 0) {
      const element = primaryElements.first();
      const styles = await element.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          backgroundColor: computed.backgroundColor,
          color: computed.color,
          borderColor: computed.borderColor
        };
      });

      // Verify primary blue color (#3b82f6)
      expect(styles.backgroundColor || styles.color || styles.borderColor).toMatch(/rgb\(59, 130, 246\)|#3b82f6/);
    }

    await expect(page).toHaveScreenshot('primary-colors.png');
  });

  test('Secondary color scheme validation', async ({ page }) => {
    const secondaryElements = page.locator('.bg-secondary-500, .text-secondary-500, .border-secondary-500');

    if (await secondaryElements.count() > 0) {
      const element = secondaryElements.first();
      const styles = await element.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          backgroundColor: computed.backgroundColor,
          color: computed.color,
          borderColor: computed.borderColor
        };
      });

      // Verify secondary gray color (#64748b)
      expect(styles.backgroundColor || styles.color || styles.borderColor).toMatch(/rgb\(100, 116, 139\)|#64748b/);
    }

    await expect(page).toHaveScreenshot('secondary-colors.png');
  });

  test('Typography scale validation', async ({ page }) => {
    // Test different text sizes
    const textElements = page.locator('.text-sm, .text-base, .text-lg, .text-xl, .text-2xl');

    if (await textElements.count() > 0) {
      const fontSizes = await textElements.evaluateAll((elements) => {
        return elements.map(el => {
          const computed = window.getComputedStyle(el);
          return {
            fontSize: computed.fontSize,
            className: el.className
          };
        });
      });

      // Verify font sizes are properly applied
      fontSizes.forEach(({ fontSize, className }) => {
        expect(fontSize).toBeTruthy();
        if (className.includes('text-sm')) {
          expect(fontSize).toBe('14px');
        } else if (className.includes('text-lg')) {
          expect(fontSize).toBe('18px');
        }
      });
    }

    await expect(page).toHaveScreenshot('typography-scale.png');
  });

  test('Spacing consistency validation', async ({ page }) => {
    // Test padding and margin classes
    const spacingElements = page.locator('.p-4, .m-4, .px-6, .py-2, .mt-8');

    if (await spacingElements.count() > 0) {
      const spacingValues = await spacingElements.evaluateAll((elements) => {
        return elements.map(el => {
          const computed = window.getComputedStyle(el);
          return {
            padding: computed.padding,
            margin: computed.margin,
            paddingTop: computed.paddingTop,
            paddingBottom: computed.paddingBottom,
            paddingLeft: computed.paddingLeft,
            paddingRight: computed.paddingRight,
            marginTop: computed.marginTop,
            className: el.className
          };
        });
      });

      // Verify spacing values follow Tailwind scale
      spacingValues.forEach(({ paddingTop, marginTop, className }) => {
        if (className.includes('p-4')) {
          expect(paddingTop).toBe('16px'); // 1rem = 16px
        }
        if (className.includes('mt-8')) {
          expect(marginTop).toBe('32px'); // 2rem = 32px
        }
      });
    }

    await expect(page).toHaveScreenshot('spacing-consistency.png');
  });

  test('Border radius validation', async ({ page }) => {
    const roundedElements = page.locator('.rounded, .rounded-md, .rounded-lg, .rounded-full');

    if (await roundedElements.count() > 0) {
      const borderRadiusValues = await roundedElements.evaluateAll((elements) => {
        return elements.map(el => {
          const computed = window.getComputedStyle(el);
          return {
            borderRadius: computed.borderRadius,
            className: el.className
          };
        });
      });

      // Verify border radius values
      borderRadiusValues.forEach(({ borderRadius, className }) => {
        expect(borderRadius).toBeTruthy();
        if (className.includes('rounded-full')) {
          expect(borderRadius).toBe('9999px');
        }
      });
    }

    await expect(page).toHaveScreenshot('border-radius.png');
  });

  test('Shadow validation', async ({ page }) => {
    const shadowElements = page.locator('.shadow, .shadow-md, .shadow-lg, .shadow-xl');

    if (await shadowElements.count() > 0) {
      const shadowValues = await shadowElements.evaluateAll((elements) => {
        return elements.map(el => {
          const computed = window.getComputedStyle(el);
          return {
            boxShadow: computed.boxShadow,
            className: el.className
          };
        });
      });

      // Verify shadows are applied
      shadowValues.forEach(({ boxShadow }) => {
        expect(boxShadow).not.toBe('none');
        expect(boxShadow).toBeTruthy();
      });
    }

    await expect(page).toHaveScreenshot('shadows.png');
  });

  test('Animation validation', async ({ page }) => {
    const animatedElements = page.locator('.animate-pulse, .animate-bounce, .animate-pulse-slow');

    if (await animatedElements.count() > 0) {
      const animationValues = await animatedElements.evaluateAll((elements) => {
        return elements.map(el => {
          const computed = window.getComputedStyle(el);
          return {
            animation: computed.animation,
            animationName: computed.animationName,
            className: el.className
          };
        });
      });

      // Verify animations are applied
      animationValues.forEach(({ animation, animationName }) => {
        expect(animation).not.toBe('none');
        expect(animationName).toBeTruthy();
      });
    }

    await expect(page).toHaveScreenshot('animations.png');
  });

  test('Flexbox layout validation', async ({ page }) => {
    const flexElements = page.locator('.flex, .flex-col, .flex-row, .justify-center, .items-center');

    if (await flexElements.count() > 0) {
      const flexValues = await flexElements.evaluateAll((elements) => {
        return elements.map(el => {
          const computed = window.getComputedStyle(el);
          return {
            display: computed.display,
            flexDirection: computed.flexDirection,
            justifyContent: computed.justifyContent,
            alignItems: computed.alignItems,
            className: el.className
          };
        });
      });

      // Verify flex properties
      flexValues.forEach(({ display, flexDirection, justifyContent, alignItems, className }) => {
        if (className.includes('flex')) {
          expect(display).toBe('flex');
        }
        if (className.includes('flex-col')) {
          expect(flexDirection).toBe('column');
        }
        if (className.includes('justify-center')) {
          expect(justifyContent).toBe('center');
        }
        if (className.includes('items-center')) {
          expect(alignItems).toBe('center');
        }
      });
    }

    await expect(page).toHaveScreenshot('flexbox-layout.png');
  });

  test('Grid layout validation', async ({ page }) => {
    const gridElements = page.locator('.grid, .grid-cols-1, .grid-cols-2, .grid-cols-3, .gap-4');

    if (await gridElements.count() > 0) {
      const gridValues = await gridElements.evaluateAll((elements) => {
        return elements.map(el => {
          const computed = window.getComputedStyle(el);
          return {
            display: computed.display,
            gridTemplateColumns: computed.gridTemplateColumns,
            gap: computed.gap,
            className: el.className
          };
        });
      });

      // Verify grid properties
      gridValues.forEach(({ display, gridTemplateColumns, gap, className }) => {
        if (className.includes('grid')) {
          expect(display).toBe('grid');
        }
        if (className.includes('gap-4')) {
          expect(gap).toBe('16px');
        }
      });
    }

    await expect(page).toHaveScreenshot('grid-layout.png');
  });

  test('Hover and focus states validation', async ({ page }) => {
    const interactiveElements = page.locator('button, a, [tabindex]');

    if (await interactiveElements.count() > 0) {
      const firstElement = interactiveElements.first();

      // Test hover state
      await firstElement.hover();
      await page.waitForTimeout(200);
      await expect(page).toHaveScreenshot('hover-state.png');

      // Test focus state
      await firstElement.focus();
      await page.waitForTimeout(200);
      await expect(page).toHaveScreenshot('focus-state.png');
    }
  });

  test('Dark mode compatibility', async ({ page }) => {
    // Check if dark mode classes exist
    const darkModeElements = page.locator('.dark\\:bg-gray-800, .dark\\:text-white, [class*="dark:"]');

    if (await darkModeElements.count() > 0) {
      // Toggle dark mode if possible
      const darkModeToggle = page.locator('[data-testid="dark-mode"], .dark-mode-toggle');
      if (await darkModeToggle.count() > 0) {
        await darkModeToggle.click();
        await page.waitForTimeout(500);
        await expect(page).toHaveScreenshot('dark-mode.png');
      }
    }
  });
});