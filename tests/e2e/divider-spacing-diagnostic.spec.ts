import { test, expect } from '@playwright/test';

const APP_URL = 'http://localhost:5173';

test('Diagnostic: Investigate margin-bottom issue', async ({ page }) => {
  await page.goto(APP_URL, { waitUntil: 'networkidle' });

  // Wait for feed to load
  await page.waitForSelector('article, .bg-white', { state: 'visible', timeout: 10000 });
  await page.waitForTimeout(2000);

  const diagnostics = await page.evaluate(() => {
    // Find all elements with the class combination
    const elements = document.querySelectorAll('.pl-14.flex.items-center.space-x-6');

    const results = [];

    for (let i = 0; i < Math.min(elements.length, 3); i++) {
      const el = elements[i] as HTMLElement;
      const computed = window.getComputedStyle(el);

      // Get all applied CSS rules
      const appliedStyles: any = {};
      for (let j = 0; j < computed.length; j++) {
        const prop = computed[j];
        if (prop.includes('margin') || prop.includes('padding')) {
          appliedStyles[prop] = computed.getPropertyValue(prop);
        }
      }

      results.push({
        index: i,
        className: el.className,
        classList: Array.from(el.classList),
        computedMarginTop: computed.marginTop,
        computedMarginBottom: computed.marginBottom,
        computedMarginLeft: computed.marginLeft,
        computedMarginRight: computed.marginRight,
        allMarginPaddingStyles: appliedStyles,
        hasInlineStyle: el.hasAttribute('style'),
        inlineStyle: el.getAttribute('style'),
        parentClasses: el.parentElement?.className,
        tagName: el.tagName
      });
    }

    // Also check if Tailwind CSS is loaded
    const stylesheets = Array.from(document.styleSheets);
    const tailwindLoaded = stylesheets.some(sheet => {
      try {
        return sheet.href?.includes('tailwind') ||
               (sheet.cssRules && Array.from(sheet.cssRules).some((rule: any) =>
                 rule.selectorText?.includes('mb-4') || rule.selectorText?.includes('mt-4')
               ));
      } catch (e) {
        return false;
      }
    });

    return {
      elementsFound: elements.length,
      elements: results,
      tailwindLoaded,
      stylesheetCount: stylesheets.length
    };
  });

  console.log('=== DIAGNOSTIC RESULTS ===');
  console.log(JSON.stringify(diagnostics, null, 2));

  // Save diagnostics to file
  const fs = require('fs');
  const path = require('path');
  const reportPath = path.join(__dirname, 'screenshots', 'divider-spacing', 'diagnostics.json');
  fs.writeFileSync(reportPath, JSON.stringify(diagnostics, null, 2));

  console.log(`Diagnostics saved to: ${reportPath}`);
});
