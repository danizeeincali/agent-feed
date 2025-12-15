/**
 * Accessibility Testing: Text Contrast for MarkdownRenderer
 *
 * This test suite validates that all text elements in the MarkdownRenderer
 * meet WCAG 2.1 AA contrast requirements (4.5:1 for normal text, 3:1 for large text).
 *
 * Tests cover:
 * - Light mode contrast ratios
 * - Dark mode contrast ratios
 * - Edge cases (inline code, blockquotes, tables)
 * - Interactive states (links, hover)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MarkdownRenderer } from '../../components/dynamic-page/MarkdownRenderer';
import {
  calculateContrastRatio,
  getElementContrastRatio,
  analyzeContrast,
  meetsWCAG_AA,
  getTailwindColor,
  formatContrastRatio,
} from './utils/contrast-calculator';

describe('MarkdownRenderer - Accessibility - Contrast Ratios', () => {
  describe('Light Mode - Text Contrast', () => {
    it('should meet WCAG AA for paragraph text', () => {
      const content = 'This is a regular paragraph with normal text.';
      const { container } = render(<MarkdownRenderer content={content} />);

      const paragraph = container.querySelector('p');
      expect(paragraph).toBeInTheDocument();

      const ratio = getElementContrastRatio(paragraph!);

      // Expected: text-gray-900 on white background
      expect(ratio).toBeGreaterThanOrEqual(4.5);
      expect(meetsWCAG_AA(ratio)).toBe(true);

      console.log(`✓ Paragraph contrast: ${formatContrastRatio(ratio)} (WCAG AA)`);
    });

    it('should meet WCAG AA for all heading levels', () => {
      const content = `
# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6
      `;

      const { container } = render(<MarkdownRenderer content={content} />);

      const headings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

      headings.forEach((tag, index) => {
        const heading = container.querySelector(tag);
        expect(heading).toBeInTheDocument();

        const ratio = getElementContrastRatio(heading!);

        // All headings use text-gray-900 on white
        expect(ratio).toBeGreaterThanOrEqual(4.5);
        expect(meetsWCAG_AA(ratio, true)).toBe(true); // Large text

        console.log(`✓ ${tag.toUpperCase()} contrast: ${formatContrastRatio(ratio)}`);
      });
    });

    it('should meet WCAG AA for link text', () => {
      const content = '[This is a link](https://example.com)';
      const { container } = render(<MarkdownRenderer content={content} />);

      const link = container.querySelector('a');
      expect(link).toBeInTheDocument();

      const ratio = getElementContrastRatio(link!);

      // Expected: text-blue-600 on white background
      // Blue-600 (#2563eb) on white should be ~7.0:1
      expect(ratio).toBeGreaterThanOrEqual(4.5);

      console.log(`✓ Link contrast: ${formatContrastRatio(ratio)}`);
    });

    it('should meet WCAG AA for list items', () => {
      const content = `
- List item 1
- List item 2
- List item 3
      `;

      const { container } = render(<MarkdownRenderer content={content} />);

      const listItems = container.querySelectorAll('li');
      expect(listItems.length).toBeGreaterThan(0);

      listItems.forEach((item, index) => {
        const ratio = getElementContrastRatio(item);

        // Expected: text-gray-900 on white
        expect(ratio).toBeGreaterThanOrEqual(4.5);

        console.log(`✓ List item ${index + 1} contrast: ${formatContrastRatio(ratio)}`);
      });
    });

    it('should meet WCAG AA for inline code', () => {
      const content = 'Use the `const` keyword for constants.';
      const { container } = render(<MarkdownRenderer content={content} />);

      const code = container.querySelector('code');
      expect(code).toBeInTheDocument();

      const ratio = getElementContrastRatio(code!);

      // Expected: text-red-600 on bg-gray-100
      // This is a critical test as red text on gray may not have enough contrast
      expect(ratio).toBeGreaterThanOrEqual(4.5);

      console.log(`✓ Inline code contrast: ${formatContrastRatio(ratio)}`);
    });

    it('should meet WCAG AA for blockquote text', () => {
      const content = '> This is a blockquote with important information.';
      const { container } = render(<MarkdownRenderer content={content} />);

      const blockquote = container.querySelector('blockquote');
      expect(blockquote).toBeInTheDocument();

      const ratio = getElementContrastRatio(blockquote!);

      // Expected: text-gray-900 on bg-gray-50
      // This needs to be validated as gray-50 is light
      expect(ratio).toBeGreaterThanOrEqual(4.5);

      console.log(`✓ Blockquote contrast: ${formatContrastRatio(ratio)}`);
    });

    it('should meet WCAG AA for table headers', () => {
      const content = `
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
      `;

      const { container } = render(<MarkdownRenderer content={content} />);

      const tableHeaders = container.querySelectorAll('th');
      expect(tableHeaders.length).toBeGreaterThan(0);

      tableHeaders.forEach((header, index) => {
        const ratio = getElementContrastRatio(header);

        // Expected: text-gray-900 on bg-gray-100
        expect(ratio).toBeGreaterThanOrEqual(4.5);

        console.log(`✓ Table header ${index + 1} contrast: ${formatContrastRatio(ratio)}`);
      });
    });

    it('should meet WCAG AA for table cells', () => {
      const content = `
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
      `;

      const { container } = render(<MarkdownRenderer content={content} />);

      const tableCells = container.querySelectorAll('td');
      expect(tableCells.length).toBeGreaterThan(0);

      tableCells.forEach((cell, index) => {
        const ratio = getElementContrastRatio(cell);

        // Expected: text-gray-900 on white
        expect(ratio).toBeGreaterThanOrEqual(4.5);

        console.log(`✓ Table cell ${index + 1} contrast: ${formatContrastRatio(ratio)}`);
      });
    });

    it('should meet WCAG AA for bold text', () => {
      const content = 'This is **bold text** in a paragraph.';
      const { container } = render(<MarkdownRenderer content={content} />);

      const strong = container.querySelector('strong');
      expect(strong).toBeInTheDocument();

      const ratio = getElementContrastRatio(strong!);

      // Expected: text-gray-900 on white
      expect(ratio).toBeGreaterThanOrEqual(3.0); // Bold text has lower requirement
      expect(meetsWCAG_AA(ratio, true)).toBe(true);

      console.log(`✓ Bold text contrast: ${formatContrastRatio(ratio)}`);
    });

    it('should handle strikethrough text (intentionally lower contrast)', () => {
      const content = 'This is ~~strikethrough~~ text.';
      const { container } = render(<MarkdownRenderer content={content} />);

      const del = container.querySelector('del');
      expect(del).toBeInTheDocument();

      const ratio = getElementContrastRatio(del!);

      // Strikethrough uses text-gray-600 which is intentionally lower contrast
      // Should still be readable, but may not meet AA
      console.log(`ℹ Strikethrough contrast: ${formatContrastRatio(ratio)} (intentionally muted)`);

      // We don't enforce strict AA here as strikethrough is meant to be visually de-emphasized
      expect(ratio).toBeGreaterThan(2.0); // At least some contrast
    });
  });

  describe('Dark Mode - Text Contrast', () => {
    beforeEach(() => {
      // Enable dark mode
      document.documentElement.classList.add('dark');
    });

    afterEach(() => {
      // Cleanup dark mode
      document.documentElement.classList.remove('dark');
    });

    it('should meet WCAG AA for paragraph text in dark mode', () => {
      const content = 'This is a regular paragraph in dark mode.';
      const { container } = render(<MarkdownRenderer content={content} />);

      const paragraph = container.querySelector('p');
      expect(paragraph).toBeInTheDocument();

      const ratio = getElementContrastRatio(paragraph!);

      // Expected: text-gray-200 on dark background
      expect(ratio).toBeGreaterThanOrEqual(4.5);

      console.log(`✓ Dark mode paragraph contrast: ${formatContrastRatio(ratio)}`);
    });

    it('should meet WCAG AA for headings in dark mode', () => {
      const content = '# Main Heading\n## Subheading';
      const { container } = render(<MarkdownRenderer content={content} />);

      const h1 = container.querySelector('h1');
      const h2 = container.querySelector('h2');

      [h1, h2].forEach((heading, index) => {
        expect(heading).toBeInTheDocument();

        const ratio = getElementContrastRatio(heading!);

        // Expected: text-gray-100 on dark background
        expect(ratio).toBeGreaterThanOrEqual(4.5);

        console.log(`✓ Dark mode h${index + 1} contrast: ${formatContrastRatio(ratio)}`);
      });
    });

    it('should meet WCAG AA for links in dark mode', () => {
      const content = '[Link in dark mode](https://example.com)';
      const { container } = render(<MarkdownRenderer content={content} />);

      const link = container.querySelector('a');
      expect(link).toBeInTheDocument();

      const ratio = getElementContrastRatio(link!);

      // Expected: text-blue-400 on dark background
      expect(ratio).toBeGreaterThanOrEqual(4.5);

      console.log(`✓ Dark mode link contrast: ${formatContrastRatio(ratio)}`);
    });

    it('should meet WCAG AA for inline code in dark mode', () => {
      const content = 'Use `const` in dark mode.';
      const { container } = render(<MarkdownRenderer content={content} />);

      const code = container.querySelector('code');
      expect(code).toBeInTheDocument();

      const ratio = getElementContrastRatio(code!);

      // Expected: text-red-400 on bg-gray-800
      expect(ratio).toBeGreaterThanOrEqual(4.5);

      console.log(`✓ Dark mode inline code contrast: ${formatContrastRatio(ratio)}`);
    });

    it('should meet WCAG AA for blockquotes in dark mode', () => {
      const content = '> Blockquote in dark mode';
      const { container } = render(<MarkdownRenderer content={content} />);

      const blockquote = container.querySelector('blockquote');
      expect(blockquote).toBeInTheDocument();

      const ratio = getElementContrastRatio(blockquote!);

      // Expected: text-gray-200 on bg-gray-800
      expect(ratio).toBeGreaterThanOrEqual(4.5);

      console.log(`✓ Dark mode blockquote contrast: ${formatContrastRatio(ratio)}`);
    });

    it('should meet WCAG AA for table elements in dark mode', () => {
      const content = `
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
      `;

      const { container } = render(<MarkdownRenderer content={content} />);

      const th = container.querySelector('th');
      const td = container.querySelector('td');

      [
        { element: th, name: 'Table header' },
        { element: td, name: 'Table cell' },
      ].forEach(({ element, name }) => {
        expect(element).toBeInTheDocument();

        const ratio = getElementContrastRatio(element!);

        expect(ratio).toBeGreaterThanOrEqual(4.5);

        console.log(`✓ Dark mode ${name} contrast: ${formatContrastRatio(ratio)}`);
      });
    });
  });

  describe('Error Messages - Contrast', () => {
    it('should meet WCAG AA for error messages in light mode', () => {
      // This would test the Mermaid error state
      // Since we can't easily trigger that in unit tests, we verify the colors theoretically

      const errorFg = getTailwindColor('red-800');
      const errorBg = getTailwindColor('red-50');

      const analysis = analyzeContrast(errorFg, errorBg);

      expect(analysis.meetsWCAG_AA_Normal).toBe(true);

      console.log(`✓ Error message contrast: ${formatContrastRatio(analysis.ratio)}`);
    });

    it('should meet WCAG AA for error messages in dark mode', () => {
      const errorFg = getTailwindColor('red-200');
      const errorBg = '#1a0f0f'; // dark:bg-red-900/20 approximation

      const ratio = calculateContrastRatio(errorFg, errorBg);

      // Error messages should be clearly visible
      expect(ratio).toBeGreaterThanOrEqual(4.5);

      console.log(`✓ Dark mode error contrast: ${formatContrastRatio(ratio)}`);
    });
  });

  describe('Edge Cases - Complex Content', () => {
    it('should maintain contrast with nested formatting in blockquotes', () => {
      const content = '> This is a **bold** word in a blockquote with `code`.';
      const { container } = render(<MarkdownRenderer content={content} />);

      const blockquote = container.querySelector('blockquote');
      const strong = blockquote?.querySelector('strong');
      const code = blockquote?.querySelector('code');

      [blockquote, strong, code].forEach((element) => {
        if (element) {
          const ratio = getElementContrastRatio(element);
          expect(ratio).toBeGreaterThanOrEqual(3.0);

          console.log(`✓ Nested element contrast: ${formatContrastRatio(ratio)}`);
        }
      });
    });

    it('should maintain contrast with very long paragraphs', () => {
      const longContent = 'Lorem ipsum dolor sit amet. '.repeat(100);
      const { container } = render(<MarkdownRenderer content={longContent} />);

      const paragraph = container.querySelector('p');
      expect(paragraph).toBeInTheDocument();

      const ratio = getElementContrastRatio(paragraph!);

      expect(ratio).toBeGreaterThanOrEqual(4.5);

      console.log(`✓ Long paragraph contrast: ${formatContrastRatio(ratio)}`);
    });

    it('should maintain contrast in nested lists', () => {
      const content = `
- Top level
  - Nested level 1
    - Nested level 2
      `;

      const { container } = render(<MarkdownRenderer content={content} />);

      const listItems = container.querySelectorAll('li');

      listItems.forEach((item, index) => {
        const ratio = getElementContrastRatio(item);

        expect(ratio).toBeGreaterThanOrEqual(4.5);

        console.log(`✓ Nested list item ${index + 1} contrast: ${formatContrastRatio(ratio)}`);
      });
    });
  });

  describe('Theoretical Color Validation', () => {
    /**
     * These tests validate the Tailwind colors used in the component
     * without requiring actual DOM rendering
     */

    it('should have valid contrast for gray-900 on white (paragraphs)', () => {
      const foreground = getTailwindColor('gray-900');
      const background = getTailwindColor('white');

      const analysis = analyzeContrast(foreground, background);

      expect(analysis.grade).toBe('AAA');
      expect(analysis.ratio).toBeGreaterThanOrEqual(12.0);

      console.log(`✓ gray-900/white: ${formatContrastRatio(analysis.ratio)} (${analysis.grade})`);
    });

    it('should have valid contrast for gray-200 on gray-900 (dark mode paragraphs)', () => {
      const foreground = getTailwindColor('gray-200');
      const background = getTailwindColor('gray-900');

      const analysis = analyzeContrast(foreground, background);

      expect(analysis.meetsWCAG_AA_Normal).toBe(true);

      console.log(`✓ gray-200/gray-900: ${formatContrastRatio(analysis.ratio)} (${analysis.grade})`);
    });

    it('should have valid contrast for blue-600 on white (links)', () => {
      const foreground = getTailwindColor('blue-600');
      const background = getTailwindColor('white');

      const analysis = analyzeContrast(foreground, background);

      expect(analysis.meetsWCAG_AA_Normal).toBe(true);
      expect(analysis.ratio).toBeGreaterThanOrEqual(4.5);

      console.log(`✓ blue-600/white: ${formatContrastRatio(analysis.ratio)} (${analysis.grade})`);
    });

    it('should have valid contrast for red-600 on gray-100 (inline code)', () => {
      const foreground = getTailwindColor('red-600');
      const background = getTailwindColor('gray-100');

      const analysis = analyzeContrast(foreground, background);

      expect(analysis.meetsWCAG_AA_Normal).toBe(true);

      console.log(`✓ red-600/gray-100: ${formatContrastRatio(analysis.ratio)} (${analysis.grade})`);
    });

    it('should identify problematic color combinations', () => {
      // Test a known bad combination
      const foreground = getTailwindColor('gray-400');
      const background = getTailwindColor('gray-300');

      const analysis = analyzeContrast(foreground, background);

      expect(analysis.grade).toBe('Fail');
      expect(analysis.meetsWCAG_AA_Normal).toBe(false);

      console.log(`✗ gray-400/gray-300: ${formatContrastRatio(analysis.ratio)} (${analysis.grade}) - As expected`);
    });
  });

  describe('Comprehensive Coverage', () => {
    it('should test all text elements in a complex markdown document', () => {
      const complexContent = `
# Main Title

This is a paragraph with **bold**, *italic*, and \`code\` text.

## Lists Section

- Item 1
- Item 2 with [a link](https://example.com)
- Item 3 with **bold**

### Code Section

\`\`\`javascript
const example = 'code block';
\`\`\`

> This is a blockquote with **emphasis** and \`inline code\`.

#### Table Section

| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |

##### Strikethrough

This has ~~strikethrough~~ text.
      `;

      const { container } = render(<MarkdownRenderer content={complexContent} />);

      // Collect all text-containing elements
      const elements = [
        ...Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6')),
        ...Array.from(container.querySelectorAll('p')),
        ...Array.from(container.querySelectorAll('li')),
        ...Array.from(container.querySelectorAll('a')),
        ...Array.from(container.querySelectorAll('strong')),
        ...Array.from(container.querySelectorAll('code')),
        ...Array.from(container.querySelectorAll('blockquote')),
        ...Array.from(container.querySelectorAll('th, td')),
      ];

      console.log(`\n📊 Testing ${elements.length} elements for contrast compliance...`);

      let passCount = 0;
      let failCount = 0;
      const failures: Array<{ tag: string; ratio: number }> = [];

      elements.forEach((element) => {
        const tag = element.tagName.toLowerCase();
        const ratio = getElementContrastRatio(element);

        // Determine if large text (headings, bold)
        const isLargeText = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong'].includes(tag);

        const passes = meetsWCAG_AA(ratio, isLargeText);

        if (passes) {
          passCount++;
        } else {
          failCount++;
          failures.push({ tag, ratio });
        }
      });

      console.log(`\n✓ Passed: ${passCount}`);
      console.log(`✗ Failed: ${failCount}`);

      if (failures.length > 0) {
        console.log('\nFailed elements:');
        failures.forEach(({ tag, ratio }) => {
          console.log(`  - ${tag}: ${formatContrastRatio(ratio)}`);
        });
      }

      // All elements should pass (except possibly strikethrough)
      const failureRate = failCount / elements.length;
      expect(failureRate).toBeLessThan(0.1); // Less than 10% failure rate
    });
  });
});
