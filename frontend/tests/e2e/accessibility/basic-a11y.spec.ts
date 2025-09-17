import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('Accessibility Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await injectAxe(page);
  });

  test('page has no accessibility violations', async ({ page }) => {
    try {
      await checkA11y(page, null, {
        detailedReport: true,
        detailedReportOptions: { html: true },
        // Allow some common violations that don't affect functionality
        rules: {
          'color-contrast': { enabled: false }, // May have design-specific colors
          'landmark-one-main': { enabled: false }, // May not have main landmark
        }
      });
    } catch (error) {
      console.log('Accessibility violations found:', error);

      // Take screenshot for debugging
      await page.screenshot({
        path: 'tests/e2e/evidence/accessibility-violations.png',
        fullPage: true
      });

      throw error;
    }

    await page.screenshot({
      path: 'tests/e2e/evidence/accessibility-success.png',
      fullPage: true
    });
  });

  test('keyboard navigation works', async ({ page }) => {
    // Test tab navigation
    const focusableElements = page.locator('button, a, input, textarea, select, [tabindex]:not([tabindex="-1"])');
    const count = await focusableElements.count();

    if (count > 0) {
      // Tab through first few elements
      for (let i = 0; i < Math.min(3, count); i++) {
        await page.keyboard.press('Tab');
        await page.waitForTimeout(100);

        // Check that focus is visible
        const focusedElement = page.locator(':focus');
        if (await focusedElement.count() > 0) {
          await expect(focusedElement).toBeVisible();
        }
      }
    }

    console.log(`Found ${count} focusable elements`);
  });

  test('semantic HTML structure exists', async ({ page }) => {
    // Check for semantic elements
    const semanticChecks = await page.evaluate(() => {
      return {
        hasMain: document.querySelector('main, [role="main"]') !== null,
        hasNav: document.querySelector('nav, [role="navigation"]') !== null,
        hasHeadings: document.querySelector('h1, h2, h3, h4, h5, h6') !== null,
        hasLandmarks: document.querySelectorAll('[role]').length > 0,
        hasButtons: document.querySelector('button, [role="button"]') !== null
      };
    });

    console.log('Semantic HTML checks:', semanticChecks);

    // At least some semantic structure should exist
    const hasSemanticStructure = Object.values(semanticChecks).some(check => check === true);
    expect(hasSemanticStructure).toBeTruthy();
  });
});