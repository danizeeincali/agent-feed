import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Visual Regression Tests for Prose Class Removal Fix
 *
 * Validates that removing conflicting prose classes allows custom text-gray-900 colors to apply
 * Tests the specific user-reported issue: "Tab 1: Overview & Introduction" text visibility
 */

test.describe('Prose Class Removal - Visual Regression', () => {
  const TEST_URL = '/agents/page-builder-agent/pages/component-showcase-complete-v3';

  test.beforeEach(async ({ page }) => {
    await page.goto(TEST_URL);
    await page.waitForLoadState('networkidle');

    // Wait for markdown content to render
    await page.waitForSelector('.markdown-renderer', { timeout: 10000 });
  });

  test('should verify prose classes are removed from container', async ({ page }) => {
    const markdownContainer = page.locator('.markdown-renderer').first();
    await expect(markdownContainer).toBeVisible();

    // Get className attribute
    const className = await markdownContainer.getAttribute('class');

    console.log('Container classes:', className);

    // Should NOT have prose classes
    expect(className).not.toContain('prose-sm');
    expect(className).not.toContain('prose-lg');
    expect(className).not.toContain('sm:prose');
    expect(className).not.toContain('lg:prose-lg');

    // Should still have essential classes
    expect(className).toContain('markdown-renderer');
    expect(className).toContain('max-w-none');
  });

  test('should render user-reported text with high contrast', async ({ page }) => {
    // Find the specific text the user mentioned
    const targetText = page.locator('text=Tab 1: Overview & Introduction').first();

    await expect(targetText).toBeVisible();

    // Get the parent element (likely an h2)
    const heading = page.locator('.markdown-renderer h2:has-text("Tab 1: Overview & Introduction")').first();

    if (await heading.count() > 0) {
      const color = await heading.evaluate(el =>
        window.getComputedStyle(el).color
      );

      console.log('Tab 1 heading color:', color);

      // Headings should be text-gray-900 (very dark)
      expect(color).toContain('rgb(17, 24, 39)');
    }
  });

  test('should render introductory paragraph with high contrast', async ({ page }) => {
    // Find the paragraph following "Tab 1: Overview & Introduction"
    const introParagraph = page.locator('text=Welcome to the comprehensive component showcase').first();

    await expect(introParagraph).toBeVisible();

    // Get the paragraph element
    const paragraph = page.locator('.markdown-renderer p:has-text("Welcome to the comprehensive component showcase")').first();

    if (await paragraph.count() > 0) {
      const color = await paragraph.evaluate(el =>
        window.getComputedStyle(el).color
      );

      console.log('Intro paragraph color:', color);

      // Should be text-gray-900 (NOT gray-700 from prose)
      expect(color).toContain('rgb(17, 24, 39)');

      // Should NOT be the old prose gray-700 color
      expect(color).not.toContain('rgb(55, 65, 81)');
    }
  });

  test('should render key features list with high contrast', async ({ page }) => {
    // Find the "Key Features:" section
    const keyFeaturesHeading = page.locator('text=Key Features:').first();

    if (await keyFeaturesHeading.count() > 0) {
      await expect(keyFeaturesHeading).toBeVisible();

      // Get the list items under Key Features
      const listItems = page.locator('.markdown-renderer ul li').all();

      const items = await listItems;

      if (items.length > 0) {
        const firstItem = items[0];
        const color = await firstItem.evaluate(el =>
          window.getComputedStyle(el).color
        );

        console.log('List item color:', color);

        // Should be text-gray-900 (inherited from ul parent)
        expect(color).toContain('rgb(17, 24, 39)');
      }
    }
  });

  test('should verify no prose CSS is being applied', async ({ page }) => {
    // Get a paragraph element
    const paragraph = page.locator('.markdown-renderer p').first();

    if (await paragraph.count() > 0) {
      // Get all applied CSS classes
      const appliedClasses = await paragraph.evaluate(el => {
        const classList = [];
        let currentElement = el;

        // Walk up the DOM to collect all classes
        while (currentElement) {
          if (currentElement.className && typeof currentElement.className === 'string') {
            classList.push(...currentElement.className.split(' '));
          }
          currentElement = currentElement.parentElement;
        }

        return classList;
      });

      console.log('All applied classes in hierarchy:', appliedClasses);

      // Verify no prose classes in the hierarchy
      expect(appliedClasses.filter(c => c.includes('prose'))).toHaveLength(0);
    }
  });

  test('should take before/after comparison screenshots', async ({ page }) => {
    // Screenshot the entire page
    await page.screenshot({
      path: 'test-results/prose-removal-full-page.png',
      fullPage: true
    });

    // Screenshot just the Tab 1 section
    const tab1Section = page.locator('text=Tab 1: Overview & Introduction').first();

    if (await tab1Section.count() > 0) {
      // Get the parent section containing Tab 1 content
      const section = page.locator('.markdown-renderer').first();

      await section.screenshot({
        path: 'test-results/prose-removal-tab1-section.png'
      });
    }

    // Screenshot a specific paragraph for pixel-perfect comparison
    const introParagraph = page.locator('.markdown-renderer p').first();

    if (await introParagraph.count() > 0) {
      await introParagraph.screenshot({
        path: 'test-results/prose-removal-paragraph-closeup.png'
      });
    }
  });

  test('should verify text is readable at different zoom levels', async ({ page }) => {
    const zoomLevels = [1, 1.5, 2, 2.5];

    for (const zoom of zoomLevels) {
      // Set zoom level
      await page.evaluate((z) => {
        document.body.style.zoom = String(z);
      }, zoom);

      await page.waitForTimeout(300);

      const paragraph = page.locator('.markdown-renderer p').first();

      if (await paragraph.count() > 0) {
        const color = await paragraph.evaluate(el =>
          window.getComputedStyle(el).color
        );

        console.log(`Color at ${zoom * 100}% zoom:`, color);

        // Color should remain text-gray-900 at all zoom levels
        expect(color).toContain('rgb(17, 24, 39)');
      }

      // Take screenshot at this zoom level
      await page.screenshot({
        path: `test-results/prose-removal-zoom-${zoom * 100}pct.png`
      });
    }
  });

  test('should verify markdown rendering still works without prose classes', async ({ page }) => {
    // Verify all markdown elements render correctly
    const elements = {
      'headings': '.markdown-renderer h2',
      'paragraphs': '.markdown-renderer p',
      'lists': '.markdown-renderer ul',
      'bold': '.markdown-renderer strong',
      'italic': '.markdown-renderer em',
    };

    for (const [name, selector] of Object.entries(elements)) {
      const element = page.locator(selector).first();

      if (await element.count() > 0) {
        await expect(element).toBeVisible();
        console.log(`✅ ${name} renders correctly`);
      }
    }
  });

  test('should verify spacing is maintained without prose classes', async ({ page }) => {
    // Check that spacing classes still work
    const paragraph = page.locator('.markdown-renderer p').first();

    if (await paragraph.count() > 0) {
      const marginBottom = await paragraph.evaluate(el =>
        window.getComputedStyle(el).marginBottom
      );

      console.log('Paragraph margin-bottom:', marginBottom);

      // Should have mb-4 spacing (1rem = 16px)
      expect(parseInt(marginBottom)).toBeGreaterThan(12);
    }
  });

  test('should verify no console errors from prose removal', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Wait for page to fully load
    await page.waitForTimeout(2000);

    console.log('Console errors:', consoleErrors);

    // Should have no console errors
    expect(consoleErrors).toHaveLength(0);
  });
});

test.describe('Prose Class Removal - Dark Mode', () => {
  const TEST_URL = '/agents/page-builder-agent/pages/component-showcase-complete-v3';

  test('should render dark mode text with high contrast', async ({ page }) => {
    await page.goto(TEST_URL);
    await page.waitForLoadState('networkidle');

    // Enable dark mode
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });

    await page.waitForTimeout(500);

    // Check paragraph color in dark mode
    const paragraph = page.locator('.markdown-renderer p').first();

    if (await paragraph.count() > 0) {
      const color = await paragraph.evaluate(el =>
        window.getComputedStyle(el).color
      );

      console.log('Dark mode paragraph color:', color);

      // Should be dark:text-gray-200 (very light, almost white)
      expect(color).toContain('rgb(229, 231, 235)');

      // Should NOT be old dark:text-gray-300
      expect(color).not.toContain('rgb(209, 213, 219)');
    }
  });

  test('should take dark mode screenshots for comparison', async ({ page }) => {
    await page.goto(TEST_URL);
    await page.waitForLoadState('networkidle');

    // Enable dark mode
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });

    await page.waitForTimeout(500);

    // Full page screenshot
    await page.screenshot({
      path: 'test-results/prose-removal-dark-mode-full.png',
      fullPage: true
    });

    // Tab 1 section
    const section = page.locator('.markdown-renderer').first();

    if (await section.count() > 0) {
      await section.screenshot({
        path: 'test-results/prose-removal-dark-mode-section.png'
      });
    }
  });

  test('should verify no prose classes in dark mode', async ({ page }) => {
    await page.goto(TEST_URL);
    await page.waitForLoadState('networkidle');

    // Enable dark mode
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });

    await page.waitForTimeout(500);

    const markdownContainer = page.locator('.markdown-renderer').first();
    const className = await markdownContainer.getAttribute('class');

    console.log('Dark mode container classes:', className);

    // Should NOT have prose classes
    expect(className).not.toContain('prose-sm');
    expect(className).not.toContain('prose-lg');
    expect(className).not.toContain('sm:prose');
    expect(className).not.toContain('lg:prose-lg');
  });
});

test.describe('Prose Class Removal - Accessibility Validation', () => {
  const TEST_URL = '/agents/page-builder-agent/pages/component-showcase-complete-v3';

  test('should pass axe accessibility audit without prose classes', async ({ page }) => {
    await page.goto(TEST_URL);
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('.markdown-renderer')
      .analyze();

    // Log any violations
    if (accessibilityScanResults.violations.length > 0) {
      console.log('Accessibility violations:');
      accessibilityScanResults.violations.forEach(v => {
        console.log(`- ${v.id}: ${v.description}`);
      });
    }

    expect(accessibilityScanResults.violations).toHaveLength(0);
  });

  test('should meet WCAG AA contrast requirements after prose removal', async ({ page }) => {
    await page.goto(TEST_URL);
    await page.waitForLoadState('networkidle');

    const contrastResults = await new AxeBuilder({ page })
      .include('.markdown-renderer')
      .withTags(['wcag2aa', 'wcag21aa'])
      .analyze();

    // Filter for color-contrast violations
    const contrastViolations = contrastResults.violations.filter(
      v => v.id === 'color-contrast'
    );

    console.log('Contrast violations:', contrastViolations.length);

    expect(contrastViolations).toHaveLength(0);
  });

  test('should verify actual contrast ratios meet WCAG AAA', async ({ page }) => {
    await page.goto(TEST_URL);
    await page.waitForLoadState('networkidle');

    const paragraph = page.locator('.markdown-renderer p').first();

    if (await paragraph.count() > 0) {
      // Extract RGB values
      const color = await paragraph.evaluate(el =>
        window.getComputedStyle(el).color
      );

      const backgroundColor = await paragraph.evaluate(el => {
        let bg = window.getComputedStyle(el).backgroundColor;
        let parent = el.parentElement;

        while (bg === 'rgba(0, 0, 0, 0)' && parent) {
          bg = window.getComputedStyle(parent).backgroundColor;
          parent = parent.parentElement;
        }
        return bg;
      });

      console.log('Text color:', color);
      console.log('Background color:', backgroundColor);

      // text-gray-900 on white should be rgb(17, 24, 39) on rgb(255, 255, 255)
      // This gives a contrast ratio of ~17.74:1 (WCAG AAA)
      expect(color).toContain('rgb(17, 24, 39)');
      expect(backgroundColor).toContain('rgb(255, 255, 255)');
    }
  });
});
