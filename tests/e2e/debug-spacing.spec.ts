/**
 * Debug Spacing Test - Investigate mt-4 rendering
 */

import { test } from '@playwright/test';

test('Debug metadata line spacing', async ({ page }) => {
  await page.goto('http://localhost:5173');

  // Wait for posts to load
  await page.waitForSelector('article, .bg-white.dark\\:bg-gray-800', {
    state: 'visible',
    timeout: 10000
  });

  await page.waitForTimeout(1000);

  // Find metadata line
  const posts = page.locator('article, .bg-white.dark\\:bg-gray-800').filter({
    has: page.locator('.text-xs.text-gray-500')
  });

  const firstPost = posts.first();
  const metadataLine = firstPost.locator('.pl-14.mt-4').first();

  // Get all computed styles
  const styles = await metadataLine.evaluate((el) => {
    const computed = window.getComputedStyle(el);
    return {
      marginTop: computed.marginTop,
      marginBottom: computed.marginBottom,
      paddingTop: computed.paddingTop,
      paddingBottom: computed.paddingBottom,
      display: computed.display,
      position: computed.position,
      boxSizing: computed.boxSizing,
      classes: el.className,
      fontSize: computed.fontSize,
      lineHeight: computed.lineHeight,
      // Check parent
      parentMarginBottom: window.getComputedStyle(el.parentElement!).marginBottom,
      parentPaddingBottom: window.getComputedStyle(el.parentElement!).paddingBottom,
    };
  });

  console.log('=== Metadata Line Styles ===');
  console.log(JSON.stringify(styles, null, 2));

  // Get previous sibling
  const prevSibling = await metadataLine.evaluate((el) => {
    const prev = el.previousElementSibling;
    if (prev) {
      const computed = window.getComputedStyle(prev);
      return {
        tagName: prev.tagName,
        className: prev.className,
        marginBottom: computed.marginBottom,
        paddingBottom: computed.paddingBottom,
      };
    }
    return null;
  });

  console.log('=== Previous Sibling ===');
  console.log(JSON.stringify(prevSibling, null, 2));

  // Get bounding boxes
  const boxes = await metadataLine.evaluate((el) => {
    const prev = el.previousElementSibling;
    const rect = el.getBoundingClientRect();
    const prevRect = prev?.getBoundingClientRect();

    return {
      metadataTop: rect.top,
      metadataHeight: rect.height,
      prevBottom: prevRect?.bottom,
      actualGap: prevRect ? rect.top - prevRect.bottom : null,
    };
  });

  console.log('=== Bounding Boxes ===');
  console.log(JSON.stringify(boxes, null, 2));

  // Check CSS in head
  const tailwindConfig = await page.evaluate(() => {
    const styles = Array.from(document.styleSheets)
      .map(sheet => {
        try {
          return Array.from(sheet.cssRules || [])
            .map(rule => rule.cssText)
            .filter(text => text.includes('mt-4') || text.includes('margin-top'))
            .join('\n');
        } catch (e) {
          return '';
        }
      })
      .filter(Boolean);
    return styles;
  });

  console.log('=== CSS Rules for mt-4 ===');
  console.log(tailwindConfig);
});
