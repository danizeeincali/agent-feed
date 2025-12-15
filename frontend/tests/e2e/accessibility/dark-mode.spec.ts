import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Comprehensive Dark Mode Tests
 *
 * Tests automatic dark mode detection and rendering across all components
 * Validates WCAG 2.1 Level AA compliance in both light and dark modes
 */

test.describe('Dark Mode - System Integration', () => {
  const TEST_URL = '/agents/page-builder-agent/pages/component-showcase-complete-v3';

  test('should automatically detect system dark mode preference', async ({ page }) => {
    // Set system to dark mode
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto(TEST_URL);
    await page.waitForLoadState('networkidle');

    // Check that .dark class is added to html element
    const htmlHasDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark')
    );

    expect(htmlHasDark).toBe(true);
  });

  test('should automatically detect system light mode preference', async ({ page }) => {
    // Set system to light mode
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto(TEST_URL);
    await page.waitForLoadState('networkidle');

    // Check that .dark class is NOT on html element
    const htmlHasDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark')
    );

    expect(htmlHasDark).toBe(false);
  });

  test('should switch modes when system preference changes', async ({ page }) => {
    await page.goto(TEST_URL);
    await page.waitForLoadState('networkidle');

    // Start in light mode
    await page.emulateMedia({ colorScheme: 'light' });
    await page.waitForTimeout(500);

    let htmlHasDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark')
    );
    expect(htmlHasDark).toBe(false);

    // Switch to dark mode
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForTimeout(500);

    htmlHasDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark')
    );
    expect(htmlHasDark).toBe(true);
  });
});

test.describe('Dark Mode - Visual Rendering', () => {
  const TEST_URL = '/agents/page-builder-agent/pages/component-showcase-complete-v3';

  test('should render with dark backgrounds in dark mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto(TEST_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Check body background is dark
    const bodyBg = await page.evaluate(() =>
      window.getComputedStyle(document.body).backgroundColor
    );

    console.log('Body background in dark mode:', bodyBg);
    // Should be dark (not white)
    expect(bodyBg).not.toContain('255, 255, 255');
  });

  test('should render with light backgrounds in light mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto(TEST_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Check body background is light
    const bodyBg = await page.evaluate(() =>
      window.getComputedStyle(document.body).backgroundColor
    );

    console.log('Body background in light mode:', bodyBg);
    // Should be white or very light gray
    expect(bodyBg).toMatch(/255, 255, 255|249, 250, 251/);
  });

  test('should take screenshots in both modes for comparison', async ({ page }) => {
    await page.goto(TEST_URL);
    await page.waitForLoadState('networkidle');

    // Light mode screenshot
    await page.emulateMedia({ colorScheme: 'light' });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: 'test-results/dark-mode-light-full.png',
      fullPage: true
    });

    // Dark mode screenshot
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: 'test-results/dark-mode-dark-full.png',
      fullPage: true
    });
  });
});

test.describe('Dark Mode - Text Contrast (WCAG)', () => {
  const TEST_URL = '/agents/page-builder-agent/pages/component-showcase-complete-v3';

  test('should have readable text in dark mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto(TEST_URL);
    await page.waitForLoadState('networkidle');

    // Find the user-reported problematic text
    const heading = page.locator('text=Tab 1: Overview & Introduction').first();

    if (await heading.count() > 0) {
      const color = await heading.evaluate(el =>
        window.getComputedStyle(el).color
      );

      console.log('Dark mode heading color:', color);

      // In dark mode, text should be LIGHT (gray-100, not gray-900)
      // gray-100 is rgb(243, 244, 246)
      expect(color).toMatch(/243, 244, 246|229, 231, 235/); // gray-100 or gray-200
    }
  });

  test('should have readable text in light mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto(TEST_URL);
    await page.waitForLoadState('networkidle');

    const heading = page.locator('text=Tab 1: Overview & Introduction').first();

    if (await heading.count() > 0) {
      const color = await heading.evaluate(el =>
        window.getComputedStyle(el).color
      );

      console.log('Light mode heading color:', color);

      // In light mode, text should be DARK (gray-900)
      // gray-900 is rgb(17, 24, 39)
      expect(color).toContain('rgb(17, 24, 39)');
    }
  });

  test('should pass axe accessibility tests in dark mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto(TEST_URL);
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa', 'wcag21aa'])
      .analyze();

    // Check for color contrast violations
    const contrastViolations = accessibilityScanResults.violations.filter(
      v => v.id === 'color-contrast'
    );

    console.log('Dark mode contrast violations:', contrastViolations.length);

    expect(contrastViolations).toHaveLength(0);
  });

  test('should pass axe accessibility tests in light mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto(TEST_URL);
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa', 'wcag21aa'])
      .analyze();

    const contrastViolations = accessibilityScanResults.violations.filter(
      v => v.id === 'color-contrast'
    );

    console.log('Light mode contrast violations:', contrastViolations.length);

    expect(contrastViolations).toHaveLength(0);
  });
});

test.describe('Dark Mode - Component Backgrounds', () => {
  const TEST_URL = '/agents/page-builder-agent/pages/component-showcase-complete-v3';

  test('should have dark backgrounds for cards in dark mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto(TEST_URL);
    await page.waitForLoadState('networkidle');

    // Check markdown renderer container
    const markdownContainer = page.locator('.markdown-renderer').first();

    if (await markdownContainer.count() > 0) {
      const bgColor = await markdownContainer.evaluate(el => {
        // Walk up to find actual background
        let element: HTMLElement | null = el;
        while (element) {
          const bg = window.getComputedStyle(element).backgroundColor;
          if (bg && bg !== 'rgba(0, 0, 0, 0)') {
            return bg;
          }
          element = element.parentElement;
        }
        return 'transparent';
      });

      console.log('Markdown container background (dark):', bgColor);

      // Should NOT be white
      expect(bgColor).not.toContain('255, 255, 255');
    }
  });

  test('should have light backgrounds for cards in light mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto(TEST_URL);
    await page.waitForLoadState('networkidle');

    const markdownContainer = page.locator('.markdown-renderer').first();

    if (await markdownContainer.count() > 0) {
      const bgColor = await markdownContainer.evaluate(el => {
        let element: HTMLElement | null = el;
        while (element) {
          const bg = window.getComputedStyle(element).backgroundColor;
          if (bg && bg !== 'rgba(0, 0, 0, 0)') {
            return bg;
          }
          element = element.parentElement;
        }
        return 'transparent';
      });

      console.log('Markdown container background (light):', bgColor);

      // Should be white or light gray
      expect(bgColor).toMatch(/255, 255, 255|249, 250, 251/);
    }
  });
});

test.describe('Dark Mode - Specific Components', () => {
  const TEST_URL = '/agents/page-builder-agent/pages/component-showcase-complete-v3';

  test('should render markdown content correctly in dark mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto(TEST_URL);
    await page.waitForLoadState('networkidle');

    const paragraph = page.locator('.markdown-renderer p').first();

    if (await paragraph.count() > 0) {
      const styles = await paragraph.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          color: computed.color,
          backgroundColor: computed.backgroundColor
        };
      });

      console.log('Markdown paragraph (dark):', styles);

      // Text should be light
      expect(styles.color).toMatch(/229, 231, 235|243, 244, 246/); // gray-200 or gray-100
    }
  });

  test('should render borders correctly in dark mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto(TEST_URL);
    await page.waitForLoadState('networkidle');

    // Check for elements with borders
    const borders = await page.evaluate(() => {
      const elements = document.querySelectorAll('[class*="border"]');
      const results = [];

      for (let i = 0; i < Math.min(elements.length, 5); i++) {
        const el = elements[i] as HTMLElement;
        const computed = window.getComputedStyle(el);
        results.push({
          tag: el.tagName,
          borderColor: computed.borderColor
        });
      }

      return results;
    });

    console.log('Border colors in dark mode:', borders);

    // Borders should NOT be light gray (should be darker)
    borders.forEach(border => {
      // Should not be border-gray-200 (rgb(229, 231, 235))
      if (border.borderColor !== 'rgba(0, 0, 0, 0)') {
        expect(border.borderColor).not.toContain('229, 231, 235');
      }
    });
  });
});

test.describe('Dark Mode - User Experience', () => {
  const TEST_URL = '/agents/page-builder-agent/pages/component-showcase-complete-v3';

  test('should not have console errors when switching modes', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto(TEST_URL);
    await page.waitForLoadState('networkidle');

    // Switch between modes
    await page.emulateMedia({ colorScheme: 'light' });
    await page.waitForTimeout(500);

    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForTimeout(500);

    await page.emulateMedia({ colorScheme: 'light' });
    await page.waitForTimeout(500);

    console.log('Console errors during mode switching:', consoleErrors.length);

    expect(consoleErrors).toHaveLength(0);
  });

  test('should maintain layout when switching modes', async ({ page }) => {
    await page.goto(TEST_URL);
    await page.waitForLoadState('networkidle');

    // Get layout in light mode
    await page.emulateMedia({ colorScheme: 'light' });
    await page.waitForTimeout(500);

    const lightLayout = await page.evaluate(() => {
      const container = document.querySelector('.markdown-renderer');
      if (!container) return null;

      const rect = container.getBoundingClientRect();
      return {
        width: rect.width,
        height: rect.height
      };
    });

    // Switch to dark mode
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForTimeout(500);

    const darkLayout = await page.evaluate(() => {
      const container = document.querySelector('.markdown-renderer');
      if (!container) return null;

      const rect = container.getBoundingClientRect();
      return {
        width: rect.width,
        height: rect.height
      };
    });

    // Layout should be the same (or very close)
    if (lightLayout && darkLayout) {
      expect(Math.abs(lightLayout.width - darkLayout.width)).toBeLessThan(5);
      expect(Math.abs(lightLayout.height - darkLayout.height)).toBeLessThan(5);
    }
  });
});

test.describe('Dark Mode - Regression Prevention', () => {
  const TEST_URL = '/agents/page-builder-agent/pages/component-showcase-complete-v3';

  test('should not revert to white backgrounds in dark mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto(TEST_URL);
    await page.waitForLoadState('networkidle');

    // Check that no major containers have pure white backgrounds
    const whiteBackgrounds = await page.evaluate(() => {
      const elements = document.querySelectorAll('div, section, article');
      const white = [];

      for (const el of elements) {
        const bg = window.getComputedStyle(el as Element).backgroundColor;
        if (bg === 'rgb(255, 255, 255)') {
          white.push((el as HTMLElement).className);
        }
      }

      return white.slice(0, 10); // Limit to first 10
    });

    console.log('Elements with white backgrounds in dark mode:', whiteBackgrounds.length);

    // Should have very few or no pure white backgrounds in dark mode
    expect(whiteBackgrounds.length).toBeLessThan(5);
  });

  test('should not have light text on light backgrounds', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto(TEST_URL);
    await page.waitForLoadState('networkidle');

    // Run accessibility check
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .analyze();

    const contrastIssues = results.violations.filter(v =>
      v.id === 'color-contrast'
    );

    expect(contrastIssues).toHaveLength(0);
  });

  test('should not have dark text on dark backgrounds', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto(TEST_URL);
    await page.waitForLoadState('networkidle');

    // Run accessibility check
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .analyze();

    const contrastIssues = results.violations.filter(v =>
      v.id === 'color-contrast'
    );

    expect(contrastIssues).toHaveLength(0);
  });
});
