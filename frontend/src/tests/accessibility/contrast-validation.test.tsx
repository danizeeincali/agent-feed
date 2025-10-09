/**
 * WCAG 2.1 Level AA Contrast Ratio Validation for MarkdownRenderer
 *
 * This test validates that all text color changes meet WCAG 2.1 Level AA requirements:
 * - Normal text (< 18pt): minimum 4.5:1 contrast ratio
 * - Large text (>= 18pt or >= 14pt bold): minimum 3:1 contrast ratio
 *
 * Tailwind CSS Default Colors (v3.4.17):
 * - gray-900: #111827 (RGB: 17, 24, 39)
 * - gray-700: #374151 (RGB: 55, 65, 81)
 * - gray-600: #4b5563 (RGB: 75, 85, 99)
 * - gray-500: #6b7280 (RGB: 107, 114, 128)
 * - gray-400: #9ca3af (RGB: 156, 163, 175)
 * - gray-300: #d1d5db (RGB: 209, 213, 219)
 * - gray-200: #e5e7eb (RGB: 229, 231, 235)
 * - white: #ffffff (RGB: 255, 255, 255)
 *
 * Dark mode backgrounds:
 * - gray-900: #111827 (RGB: 17, 24, 39)
 * - gray-800: #1f2937 (RGB: 31, 41, 55)
 */

import { describe, it, expect } from 'vitest';

/**
 * Calculate relative luminance according to WCAG 2.1
 * @see https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 * @see https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 */
function getContrastRatio(color1: [number, number, number], color2: [number, number, number]): number {
  const lum1 = getLuminance(...color1);
  const lum2 = getLuminance(...color2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast ratio meets WCAG Level AA
 * @param ratio Contrast ratio
 * @param isLargeText Whether the text is large (>= 18pt or >= 14pt bold)
 */
function meetsWCAGAA(ratio: number, isLargeText: boolean = false): boolean {
  return isLargeText ? ratio >= 3.0 : ratio >= 4.5;
}

/**
 * Check if contrast ratio meets WCAG Level AAA
 * @param ratio Contrast ratio
 * @param isLargeText Whether the text is large (>= 18pt or >= 14pt bold)
 */
function meetsWCAGAAA(ratio: number, isLargeText: boolean = false): boolean {
  return isLargeText ? ratio >= 4.5 : ratio >= 7.0;
}

describe('MarkdownRenderer - WCAG 2.1 Contrast Validation', () => {
  // Color definitions (Tailwind CSS v3.4.17 defaults)
  const colors = {
    white: [255, 255, 255] as [number, number, number],
    gray900: [17, 24, 39] as [number, number, number],
    gray800: [31, 41, 55] as [number, number, number],
    gray700: [55, 65, 81] as [number, number, number],
    gray600: [75, 85, 99] as [number, number, number],
    gray500: [107, 114, 128] as [number, number, number],
    gray400: [156, 163, 175] as [number, number, number],
    gray300: [209, 213, 219] as [number, number, number],
    gray200: [229, 231, 235] as [number, number, number],
  };

  describe('Light Mode Contrast Ratios', () => {
    it('text-gray-900 on white background (paragraphs, lists, blockquotes, tables)', () => {
      const ratio = getContrastRatio(colors.gray900, colors.white);

      expect(ratio).toBeGreaterThanOrEqual(4.5);
      expect(meetsWCAGAA(ratio, false)).toBe(true);

      console.log(`✓ text-gray-900 on white: ${ratio.toFixed(2)}:1 (WCAG AA: ${meetsWCAGAA(ratio) ? 'PASS' : 'FAIL'}, AAA: ${meetsWCAGAAA(ratio) ? 'PASS' : 'FAIL'})`);
    });

    it('text-gray-700 on white background (loading spinner)', () => {
      const ratio = getContrastRatio(colors.gray700, colors.white);

      expect(ratio).toBeGreaterThanOrEqual(4.5);
      expect(meetsWCAGAA(ratio, false)).toBe(true);

      console.log(`✓ text-gray-700 on white: ${ratio.toFixed(2)}:1 (WCAG AA: ${meetsWCAGAA(ratio) ? 'PASS' : 'FAIL'}, AAA: ${meetsWCAGAAA(ratio) ? 'PASS' : 'FAIL'})`);
    });

    it('text-gray-600 on white background (strikethrough)', () => {
      const ratio = getContrastRatio(colors.gray600, colors.white);

      expect(ratio).toBeGreaterThanOrEqual(4.5);
      expect(meetsWCAGAA(ratio, false)).toBe(true);

      console.log(`✓ text-gray-600 on white: ${ratio.toFixed(2)}:1 (WCAG AA: ${meetsWCAGAA(ratio) ? 'PASS' : 'FAIL'}, AAA: ${meetsWCAGAAA(ratio) ? 'PASS' : 'FAIL'})`);
    });

    it('[DEPRECATED] text-gray-500 on white background - NO LONGER USED', () => {
      const ratio = getContrastRatio(colors.gray500, colors.white);

      // gray-500 barely passes WCAG AA (4.83:1) but is too close to threshold
      // This is why we upgraded to gray-600 (7.56:1) and gray-700 (10.31:1)
      expect(ratio).toBeGreaterThanOrEqual(4.5);
      expect(ratio).toBeLessThan(5.0); // Too close to threshold for comfort
      expect(meetsWCAGAA(ratio, false)).toBe(true);

      console.log(`⚠ text-gray-500 on white: ${ratio.toFixed(2)}:1 (WCAG AA: ${meetsWCAGAA(ratio) ? 'PASS' : 'FAIL'}) - BARELY passes, replaced with gray-700/gray-600 for safety margin`);
    });
  });

  describe('Dark Mode Contrast Ratios', () => {
    it('dark:text-gray-200 on gray-900 background (paragraphs, lists, blockquotes, tables)', () => {
      const ratio = getContrastRatio(colors.gray200, colors.gray900);

      expect(ratio).toBeGreaterThanOrEqual(4.5);
      expect(meetsWCAGAA(ratio, false)).toBe(true);

      console.log(`✓ dark:text-gray-200 on gray-900: ${ratio.toFixed(2)}:1 (WCAG AA: ${meetsWCAGAA(ratio) ? 'PASS' : 'FAIL'}, AAA: ${meetsWCAGAAA(ratio) ? 'PASS' : 'FAIL'})`);
    });

    it('dark:text-gray-300 on gray-900 background (loading spinner)', () => {
      const ratio = getContrastRatio(colors.gray300, colors.gray900);

      expect(ratio).toBeGreaterThanOrEqual(4.5);
      expect(meetsWCAGAA(ratio, false)).toBe(true);

      console.log(`✓ dark:text-gray-300 on gray-900: ${ratio.toFixed(2)}:1 (WCAG AA: ${meetsWCAGAA(ratio) ? 'PASS' : 'FAIL'}, AAA: ${meetsWCAGAAA(ratio) ? 'PASS' : 'FAIL'})`);
    });

    it('dark:text-gray-400 on gray-900 background (strikethrough)', () => {
      const ratio = getContrastRatio(colors.gray400, colors.gray900);

      expect(ratio).toBeGreaterThanOrEqual(4.5);
      expect(meetsWCAGAA(ratio, false)).toBe(true);

      console.log(`✓ dark:text-gray-400 on gray-900: ${ratio.toFixed(2)}:1 (WCAG AA: ${meetsWCAGAA(ratio) ? 'PASS' : 'FAIL'}, AAA: ${meetsWCAGAAA(ratio) ? 'PASS' : 'FAIL'})`);
    });
  });

  describe('Specific Component Changes Validation', () => {
    it('Line 190: Loading spinner (text-gray-500 → text-gray-700)', () => {
      const oldRatio = getContrastRatio(colors.gray500, colors.white);
      const newRatio = getContrastRatio(colors.gray700, colors.white);

      expect(oldRatio).toBeGreaterThanOrEqual(4.5); // Old color barely passed
      expect(oldRatio).toBeLessThan(5.0); // But too close to threshold
      expect(newRatio).toBeGreaterThanOrEqual(7.0); // New color much better
      expect(meetsWCAGAA(newRatio, false)).toBe(true);

      console.log(`✓ Loading spinner improvement: ${oldRatio.toFixed(2)}:1 → ${newRatio.toFixed(2)}:1 (+${(newRatio - oldRatio).toFixed(2)}) - 113% improvement!`);
    });

    it('Line 289: Paragraph text (text-gray-700 → text-gray-900)', () => {
      const oldRatio = getContrastRatio(colors.gray700, colors.white);
      const newRatio = getContrastRatio(colors.gray900, colors.white);

      expect(oldRatio).toBeGreaterThanOrEqual(4.5); // Old color passed
      expect(newRatio).toBeGreaterThan(oldRatio); // New color is even better
      expect(meetsWCAGAAA(newRatio, false)).toBe(true); // Now meets AAA

      console.log(`✓ Paragraph text improvement: ${oldRatio.toFixed(2)}:1 → ${newRatio.toFixed(2)}:1 (+${(newRatio - oldRatio).toFixed(2)}) - Now WCAG AAA!`);
    });

    it('Lines 325, 330: List text (text-gray-700 → text-gray-900)', () => {
      const oldRatio = getContrastRatio(colors.gray700, colors.white);
      const newRatio = getContrastRatio(colors.gray900, colors.white);

      expect(oldRatio).toBeGreaterThanOrEqual(4.5); // Old color passed
      expect(newRatio).toBeGreaterThan(oldRatio); // New color is even better
      expect(meetsWCAGAAA(newRatio, false)).toBe(true); // Now meets AAA

      console.log(`✓ List text improvement: ${oldRatio.toFixed(2)}:1 → ${newRatio.toFixed(2)}:1 (+${(newRatio - oldRatio).toFixed(2)}) - Now WCAG AAA!`);
    });

    it('Line 343: Blockquote text (text-gray-700 → text-gray-900)', () => {
      const oldRatio = getContrastRatio(colors.gray700, colors.white);
      const newRatio = getContrastRatio(colors.gray900, colors.white);

      expect(oldRatio).toBeGreaterThanOrEqual(4.5); // Old color passed
      expect(newRatio).toBeGreaterThan(oldRatio); // New color is even better
      expect(meetsWCAGAAA(newRatio, false)).toBe(true); // Now meets AAA

      console.log(`✓ Blockquote text improvement: ${oldRatio.toFixed(2)}:1 → ${newRatio.toFixed(2)}:1 (+${(newRatio - oldRatio).toFixed(2)}) - Now WCAG AAA!`);
    });

    it('Line 445: Table cell text (text-gray-700 → text-gray-900)', () => {
      const oldRatio = getContrastRatio(colors.gray700, colors.white);
      const newRatio = getContrastRatio(colors.gray900, colors.white);

      expect(oldRatio).toBeGreaterThanOrEqual(4.5); // Old color passed
      expect(newRatio).toBeGreaterThan(oldRatio); // New color is even better
      expect(meetsWCAGAAA(newRatio, false)).toBe(true); // Now meets AAA

      console.log(`✓ Table cell text improvement: ${oldRatio.toFixed(2)}:1 → ${newRatio.toFixed(2)}:1 (+${(newRatio - oldRatio).toFixed(2)}) - Now WCAG AAA!`);
    });

    it('Line 466: Strikethrough text (text-gray-500 → text-gray-600)', () => {
      const oldRatio = getContrastRatio(colors.gray500, colors.white);
      const newRatio = getContrastRatio(colors.gray600, colors.white);

      expect(oldRatio).toBeGreaterThanOrEqual(4.5); // Old color barely passed
      expect(oldRatio).toBeLessThan(5.0); // But too close to threshold
      expect(newRatio).toBeGreaterThanOrEqual(7.0); // New color much better
      expect(meetsWCAGAA(newRatio, false)).toBe(true);

      console.log(`✓ Strikethrough text improvement: ${oldRatio.toFixed(2)}:1 → ${newRatio.toFixed(2)}:1 (+${(newRatio - oldRatio).toFixed(2)}) - 56% improvement!`);
    });
  });

  describe('Overall Compliance Summary', () => {
    it('all current text colors meet WCAG 2.1 Level AA', () => {
      const lightModeColors = [
        { name: 'Paragraph/List/Table text', ratio: getContrastRatio(colors.gray900, colors.white) },
        { name: 'Loading spinner', ratio: getContrastRatio(colors.gray700, colors.white) },
        { name: 'Strikethrough', ratio: getContrastRatio(colors.gray600, colors.white) },
      ];

      const darkModeColors = [
        { name: 'Paragraph/List/Table text (dark)', ratio: getContrastRatio(colors.gray200, colors.gray900) },
        { name: 'Loading spinner (dark)', ratio: getContrastRatio(colors.gray300, colors.gray900) },
        { name: 'Strikethrough (dark)', ratio: getContrastRatio(colors.gray400, colors.gray900) },
      ];

      // Check all light mode colors
      lightModeColors.forEach(({ name, ratio }) => {
        expect(meetsWCAGAA(ratio, false)).toBe(true);
        console.log(`  ✓ ${name}: ${ratio.toFixed(2)}:1 - WCAG AA PASS`);
      });

      // Check all dark mode colors
      darkModeColors.forEach(({ name, ratio }) => {
        expect(meetsWCAGAA(ratio, false)).toBe(true);
        console.log(`  ✓ ${name}: ${ratio.toFixed(2)}:1 - WCAG AA PASS`);
      });

      console.log('\n🎉 All text colors meet WCAG 2.1 Level AA requirements!');
    });

    it('provides detailed improvement metrics', () => {
      const improvements = [
        {
          component: 'Loading spinner',
          before: getContrastRatio(colors.gray500, colors.white),
          after: getContrastRatio(colors.gray700, colors.white),
        },
        {
          component: 'Paragraph text',
          before: getContrastRatio(colors.gray700, colors.white),
          after: getContrastRatio(colors.gray900, colors.white),
        },
        {
          component: 'Strikethrough',
          before: getContrastRatio(colors.gray500, colors.white),
          after: getContrastRatio(colors.gray600, colors.white),
        },
      ];

      console.log('\n📊 Improvement Metrics:');
      improvements.forEach(({ component, before, after }) => {
        const improvement = ((after - before) / before * 100).toFixed(1);
        const beforePass = meetsWCAGAA(before, false) ? '✓' : '✗';
        const afterPass = meetsWCAGAA(after, false) ? '✓' : '✗';

        console.log(`  ${component}:`);
        console.log(`    Before: ${before.toFixed(2)}:1 ${beforePass}`);
        console.log(`    After:  ${after.toFixed(2)}:1 ${afterPass}`);
        console.log(`    Improvement: +${improvement}%`);
      });

      // All improvements should be positive
      improvements.forEach(({ after, before }) => {
        expect(after).toBeGreaterThan(before);
      });
    });
  });
});
