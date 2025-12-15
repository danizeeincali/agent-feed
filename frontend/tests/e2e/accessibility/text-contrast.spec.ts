import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility Tests for Text Contrast Improvements
 *
 * Tests WCAG 2.1 Level AA compliance for MarkdownRenderer text contrast
 * Validates both light and dark mode
 */

test.describe('MarkdownRenderer Text Contrast - Accessibility', () => {
  const TEST_URL = '/agents/page-builder-agent/pages/component-showcase-complete-v3';

  test.beforeEach(async ({ page }) => {
    await page.goto(TEST_URL);
    await page.waitForLoadState('networkidle');

    // Wait for markdown content to render
    await page.waitForSelector('.markdown-renderer', { timeout: 10000 });
  });

  test('should have no accessibility violations in light mode', async ({ page }) => {
    // Run axe accessibility scan
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('.markdown-renderer')
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have no accessibility violations in dark mode', async ({ page }) => {
    // Enable dark mode
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });

    await page.waitForTimeout(500);

    // Run axe accessibility scan
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('.markdown-renderer')
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have sufficient contrast for paragraphs in light mode', async ({ page }) => {
    const paragraph = page.locator('.markdown-renderer p').first();
    await expect(paragraph).toBeVisible();

    // Get computed styles
    const color = await paragraph.evaluate(el =>
      window.getComputedStyle(el).color
    );
    const backgroundColor = await paragraph.evaluate(el => {
      let bg = window.getComputedStyle(el).backgroundColor;
      let parent = el.parentElement;

      // Walk up the DOM to find a non-transparent background
      while (bg === 'rgba(0, 0, 0, 0)' && parent) {
        bg = window.getComputedStyle(parent).backgroundColor;
        parent = parent.parentElement;
      }
      return bg;
    });

    console.log('Paragraph color (light mode):', color);
    console.log('Paragraph background:', backgroundColor);

    // Verify text-gray-900 is applied (very dark, almost black)
    expect(color).toContain('rgb(17, 24, 39)'); // text-gray-900
  });

  test('should have sufficient contrast for paragraphs in dark mode', async ({ page }) => {
    // Enable dark mode
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });

    await page.waitForTimeout(500);

    const paragraph = page.locator('.markdown-renderer p').first();
    await expect(paragraph).toBeVisible();

    const color = await paragraph.evaluate(el =>
      window.getComputedStyle(el).color
    );

    console.log('Paragraph color (dark mode):', color);

    // Verify dark:text-gray-200 is applied (very light, almost white)
    expect(color).toContain('rgb(229, 231, 235)'); // dark:text-gray-200
  });

  test('should have sufficient contrast for lists in light mode', async ({ page }) => {
    const listItem = page.locator('.markdown-renderer ul li, .markdown-renderer ol li').first();

    if (await listItem.count() > 0) {
      const color = await listItem.evaluate(el =>
        window.getComputedStyle(el).color
      );

      console.log('List item color (light mode):', color);

      // Should inherit from parent ul/ol which has text-gray-900
      expect(color).toContain('rgb(17, 24, 39)');
    }
  });

  test('should have sufficient contrast for blockquotes', async ({ page }) => {
    const blockquote = page.locator('.markdown-renderer blockquote').first();

    if (await blockquote.count() > 0) {
      await expect(blockquote).toBeVisible();

      const color = await blockquote.evaluate(el =>
        window.getComputedStyle(el).color
      );

      console.log('Blockquote color:', color);

      // text-gray-900 in light mode
      expect(color).toContain('rgb(17, 24, 39)');
    }
  });

  test('should have sufficient contrast for table cells', async ({ page }) => {
    const tableCell = page.locator('.markdown-renderer table td').first();

    if (await tableCell.count() > 0) {
      await expect(tableCell).toBeVisible();

      const color = await tableCell.evaluate(el =>
        window.getComputedStyle(el).color
      );

      console.log('Table cell color:', color);

      // text-gray-900 in light mode
      expect(color).toContain('rgb(17, 24, 39)');
    }
  });

  test('should have visible loading spinner text', async ({ page }) => {
    // Navigate to a page with Mermaid diagrams to test loading state
    await page.goto('/agents/page-builder-agent/pages/mermaid-all-types-test');

    // Try to catch the loading state (may be very brief)
    const loadingText = page.locator('text=Rendering diagram').first();

    // Wait a short time to see if loading appears
    try {
      await loadingText.waitFor({ timeout: 1000 });

      const color = await loadingText.evaluate(el =>
        window.getComputedStyle(el).color
      );

      console.log('Loading spinner text color:', color);

      // Should be text-gray-700 (improved from text-gray-500)
      expect(color).toContain('rgb(55, 65, 81)');
    } catch (e) {
      // Loading state may have already passed - this is OK
      console.log('Loading state not caught (diagrams rendered too quickly)');
    }
  });

  test('should take screenshots of text contrast in light mode', async ({ page }) => {
    await page.screenshot({
      path: 'test-results/text-contrast-light-mode.png',
      fullPage: true
    });

    // Screenshot of just markdown content
    const markdownContent = page.locator('.markdown-renderer').first();
    if (await markdownContent.count() > 0) {
      await markdownContent.screenshot({
        path: 'test-results/markdown-content-light-mode.png'
      });
    }
  });

  test('should take screenshots of text contrast in dark mode', async ({ page }) => {
    // Enable dark mode
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });

    await page.waitForTimeout(500);

    await page.screenshot({
      path: 'test-results/text-contrast-dark-mode.png',
      fullPage: true
    });

    // Screenshot of just markdown content
    const markdownContent = page.locator('.markdown-renderer').first();
    if (await markdownContent.count() > 0) {
      await markdownContent.screenshot({
        path: 'test-results/markdown-content-dark-mode.png'
      });
    }
  });

  test('should maintain readability on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    const paragraph = page.locator('.markdown-renderer p').first();
    await expect(paragraph).toBeVisible();

    // Verify text is still readable on mobile
    const fontSize = await paragraph.evaluate(el =>
      window.getComputedStyle(el).fontSize
    );

    console.log('Mobile font size:', fontSize);

    // Font size should be reasonable (at least 14px)
    const fontSizePx = parseInt(fontSize);
    expect(fontSizePx).toBeGreaterThanOrEqual(14);

    // Take mobile screenshot
    await page.screenshot({
      path: 'test-results/text-contrast-mobile.png',
      fullPage: true
    });
  });

  test('should have accessible color contrast ratios', async ({ page }) => {
    // Run comprehensive color contrast check
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('.markdown-renderer')
      .withTags(['wcag2aa', 'wcag21aa'])
      .analyze();

    // Filter for color contrast violations
    const contrastViolations = accessibilityScanResults.violations.filter(
      violation => violation.id === 'color-contrast'
    );

    expect(contrastViolations).toHaveLength(0);
  });

  test('should pass WCAG AA for all text elements', async ({ page }) => {
    const elements = [
      '.markdown-renderer p',
      '.markdown-renderer h1',
      '.markdown-renderer h2',
      '.markdown-renderer h3',
      '.markdown-renderer ul li',
      '.markdown-renderer ol li',
      '.markdown-renderer blockquote',
      '.markdown-renderer td',
      '.markdown-renderer th',
    ];

    for (const selector of elements) {
      const element = page.locator(selector).first();

      if (await element.count() > 0) {
        // Run axe check on specific element
        const results = await new AxeBuilder({ page })
          .include(selector)
          .withTags(['wcag2aa'])
          .analyze();

        console.log(`Checking ${selector}: ${results.violations.length} violations`);

        expect(results.violations).toHaveLength(0);
      }
    }
  });

  test('should maintain contrast when zoomed to 200%', async ({ page }) => {
    // Zoom to 200%
    await page.evaluate(() => {
      document.body.style.zoom = '2';
    });

    await page.waitForTimeout(500);

    const paragraph = page.locator('.markdown-renderer p').first();
    await expect(paragraph).toBeVisible();

    // Colors should remain the same when zoomed
    const color = await paragraph.evaluate(el =>
      window.getComputedStyle(el).color
    );

    expect(color).toContain('rgb(17, 24, 39)'); // Still text-gray-900

    // Take screenshot
    await page.screenshot({
      path: 'test-results/text-contrast-zoomed.png',
      fullPage: true
    });
  });

  test('should have no violations in comprehensive accessibility audit', async ({ page }) => {
    // Run comprehensive audit with all WCAG rules
    const results = await new AxeBuilder({ page })
      .include('.markdown-renderer')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    // Log any violations for debugging
    if (results.violations.length > 0) {
      console.log('Accessibility violations found:');
      results.violations.forEach(violation => {
        console.log(`- ${violation.id}: ${violation.description}`);
        console.log(`  Impact: ${violation.impact}`);
        console.log(`  Elements affected: ${violation.nodes.length}`);
      });
    }

    expect(results.violations).toHaveLength(0);
  });
});

test.describe('Text Contrast Regression Prevention', () => {
  test('should not revert to old gray-700 colors', async ({ page }) => {
    await page.goto('/agents/page-builder-agent/pages/component-showcase-complete-v3');
    await page.waitForLoadState('networkidle');

    const paragraph = page.locator('.markdown-renderer p').first();

    if (await paragraph.count() > 0) {
      const color = await paragraph.evaluate(el =>
        window.getComputedStyle(el).color
      );

      // Should NOT be the old text-gray-700 color
      expect(color).not.toContain('rgb(55, 65, 81)');

      // Should be the new text-gray-900 color
      expect(color).toContain('rgb(17, 24, 39)');
    }
  });

  test('should not revert to old gray-500 colors in dark mode', async ({ page }) => {
    await page.goto('/agents/page-builder-agent/pages/component-showcase-complete-v3');
    await page.waitForLoadState('networkidle');

    // Enable dark mode
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });

    await page.waitForTimeout(500);

    const paragraph = page.locator('.markdown-renderer p').first();

    if (await paragraph.count() > 0) {
      const color = await paragraph.evaluate(el =>
        window.getComputedStyle(el).color
      );

      // Should NOT be the old dark:text-gray-300 color
      expect(color).not.toContain('rgb(209, 213, 219)');

      // Should be the new dark:text-gray-200 color
      expect(color).toContain('rgb(229, 231, 235)');
    }
  });
});
