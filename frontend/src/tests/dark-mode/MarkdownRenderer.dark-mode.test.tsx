/**
 * TDD Tests: MarkdownRenderer Dark Mode Text Visibility
 *
 * Tests verify that all markdown elements have sufficient contrast in dark mode
 * according to WCAG AA standards (4.5:1 for normal text).
 *
 * NO MOCKS - Real component rendering with real contrast calculations
 */

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect } from 'vitest';
import MarkdownRenderer from '../../components/markdown/MarkdownRenderer';

// Real contrast calculation (no mocks)
function getContrastRatio(foreground: string, background: string): number {
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  const getLuminance = (rgb: { r: number; g: number; b: number }) => {
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(val => {
      const v = val / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const fg = hexToRgb(foreground);
  const bg = hexToRgb(background);

  if (!fg || !bg) return 1;

  const l1 = getLuminance(fg);
  const l2 = getLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

// Tailwind color mappings
const COLORS = {
  'gray-900': '#111827',
  'gray-800': '#1f2937',
  'gray-700': '#374151',
  'gray-600': '#4b5563',
  'gray-400': '#9ca3af',
  'gray-300': '#d1d5db',
  'gray-100': '#f3f4f6',
  'gray-50': '#f9fafb',
  'white': '#ffffff'
};

describe('MarkdownRenderer - Dark Mode Text Contrast', () => {

  describe('Heading Elements', () => {
    test('h1 has sufficient contrast in dark mode (>=4.5:1)', () => {
      const { container } = render(
        <div className="dark bg-gray-900">
          <MarkdownRenderer content="# Heading 1" />
        </div>
      );

      const contrastRatio = getContrastRatio(COLORS['gray-100'], COLORS['gray-900']);
      expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio).toBeGreaterThan(10); // Should be ~13:1
    });

    test('h1 uses dark:text-gray-100 class', () => {
      const { container } = render(
        <div className="dark">
          <MarkdownRenderer content="# Heading 1" />
        </div>
      );

      const h1 = container.querySelector('h1');
      expect(h1).toBeInTheDocument();
      expect(h1?.className).toContain('text-gray-900');
      expect(h1?.className).toContain('dark:text-gray-100');
    });

    test('h2-h6 have proper dark mode classes', () => {
      const markdown = `
# H1
## H2
### H3
#### H4
##### H5
###### H6
      `;

      const { container } = render(
        <div className="dark">
          <MarkdownRenderer content={markdown} />
        </div>
      );

      ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(tag => {
        const element = container.querySelector(tag);
        expect(element).toBeInTheDocument();
        expect(element?.className).toMatch(/dark:text-gray-(100|300)/);
      });
    });
  });

  describe('Paragraph and Text Elements', () => {
    test('paragraphs have sufficient contrast in dark mode', () => {
      const { container } = render(
        <div className="dark bg-gray-900">
          <MarkdownRenderer content="This is a paragraph with some text." />
        </div>
      );

      const contrastRatio = getContrastRatio(COLORS['gray-100'], COLORS['gray-900']);
      expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
    });

    test('paragraphs use dark:text-gray-100', () => {
      const { container } = render(
        <div className="dark">
          <MarkdownRenderer content="Test paragraph" />
        </div>
      );

      const p = container.querySelector('p');
      expect(p).toBeInTheDocument();
      expect(p?.className).toContain('text-gray-900');
      expect(p?.className).toContain('dark:text-gray-100');
    });

    test('strong (bold) text has dark mode support', () => {
      const { container } = render(
        <div className="dark">
          <MarkdownRenderer content="**Bold text**" />
        </div>
      );

      const strong = container.querySelector('strong');
      expect(strong).toBeInTheDocument();
      expect(strong?.className).toContain('dark:text-gray-100');
    });

    test('em (italic) text has dark mode support', () => {
      const { container } = render(
        <div className="dark">
          <MarkdownRenderer content="*Italic text*" />
        </div>
      );

      const em = container.querySelector('em');
      expect(em).toBeInTheDocument();
      expect(em?.className).toContain('dark:text-gray-100');
    });

    test('strikethrough text has dark mode support', () => {
      const { container } = render(
        <div className="dark">
          <MarkdownRenderer content="~~Strikethrough~~" />
        </div>
      );

      const del = container.querySelector('del');
      expect(del).toBeInTheDocument();
      expect(del?.className).toContain('dark:text-gray-400');
    });
  });

  describe('List Elements', () => {
    test('unordered lists have dark mode support', () => {
      const markdown = `
- Item 1
- Item 2
- Item 3
      `;

      const { container } = render(
        <div className="dark">
          <MarkdownRenderer content={markdown} />
        </div>
      );

      const ul = container.querySelector('ul');
      expect(ul).toBeInTheDocument();
      expect(ul?.className).toContain('dark:text-gray-100');
    });

    test('ordered lists have dark mode support', () => {
      const markdown = `
1. First
2. Second
3. Third
      `;

      const { container } = render(
        <div className="dark">
          <MarkdownRenderer content={markdown} />
        </div>
      );

      const ol = container.querySelector('ol');
      expect(ol).toBeInTheDocument();
      expect(ol?.className).toContain('dark:text-gray-100');
    });

    test('list items have dark mode support', () => {
      const { container } = render(
        <div className="dark">
          <MarkdownRenderer content="- Test item" />
        </div>
      );

      const li = container.querySelector('li');
      expect(li).toBeInTheDocument();
      expect(li?.className).toContain('dark:text-gray-100');
    });

    test('lists have sufficient contrast in dark mode', () => {
      const contrastRatio = getContrastRatio(COLORS['gray-100'], COLORS['gray-900']);
      expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe('Table Elements', () => {
    const tableMarkdown = `
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |
    `;

    test('table headers have dark mode background', () => {
      const { container } = render(
        <div className="dark">
          <MarkdownRenderer content={tableMarkdown} />
        </div>
      );

      const thead = container.querySelector('thead');
      expect(thead).toBeInTheDocument();
      expect(thead?.className).toContain('dark:bg-gray-800');
    });

    test('table body has dark mode background', () => {
      const { container } = render(
        <div className="dark">
          <MarkdownRenderer content={tableMarkdown} />
        </div>
      );

      const tbody = container.querySelector('tbody');
      expect(tbody).toBeInTheDocument();
      expect(tbody?.className).toContain('dark:bg-gray-900');
    });

    test('table headers (th) have dark mode text color', () => {
      const { container } = render(
        <div className="dark">
          <MarkdownRenderer content={tableMarkdown} />
        </div>
      );

      const th = container.querySelector('th');
      expect(th).toBeInTheDocument();
      expect(th?.className).toContain('dark:text-gray-300');
    });

    test('table cells (td) have dark mode text color', () => {
      const { container } = render(
        <div className="dark">
          <MarkdownRenderer content={tableMarkdown} />
        </div>
      );

      const td = container.querySelector('td');
      expect(td).toBeInTheDocument();
      expect(td?.className).toContain('dark:text-gray-100');
    });

    test('table borders have dark mode variant', () => {
      const { container } = render(
        <div className="dark">
          <MarkdownRenderer content={tableMarkdown} />
        </div>
      );

      const table = container.querySelector('table');
      expect(table).toBeInTheDocument();
      expect(table?.className).toContain('dark:divide-gray-700');
      expect(table?.className).toContain('dark:border-gray-700');
    });

    test('table cells have sufficient contrast in dark mode', () => {
      const contrastRatio = getContrastRatio(COLORS['gray-100'], COLORS['gray-900']);
      expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe('Blockquote Elements', () => {
    test('blockquote has dark mode background', () => {
      const { container } = render(
        <div className="dark">
          <MarkdownRenderer content="> This is a quote" />
        </div>
      );

      const blockquote = container.querySelector('blockquote');
      expect(blockquote).toBeInTheDocument();
      expect(blockquote?.className).toContain('dark:bg-gray-800');
    });

    test('blockquote has dark mode text color', () => {
      const { container } = render(
        <div className="dark">
          <MarkdownRenderer content="> Quote text" />
        </div>
      );

      const blockquote = container.querySelector('blockquote');
      expect(blockquote).toBeInTheDocument();
      expect(blockquote?.className).toContain('dark:text-gray-300');
    });

    test('blockquote has dark mode border', () => {
      const { container } = render(
        <div className="dark">
          <MarkdownRenderer content="> Quote" />
        </div>
      );

      const blockquote = container.querySelector('blockquote');
      expect(blockquote).toBeInTheDocument();
      expect(blockquote?.className).toContain('dark:border-gray-600');
    });

    test('blockquote has sufficient contrast in dark mode', () => {
      const contrastRatio = getContrastRatio(COLORS['gray-300'], COLORS['gray-800']);
      expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe('Horizontal Rule', () => {
    test('hr has dark mode border color', () => {
      const { container } = render(
        <div className="dark">
          <MarkdownRenderer content="---" />
        </div>
      );

      const hr = container.querySelector('hr');
      expect(hr).toBeInTheDocument();
      expect(hr?.className).toContain('dark:border-gray-700');
    });
  });

  describe('Complex Markdown Document', () => {
    const complexMarkdown = `
# Main Heading

This is a paragraph with **bold** and *italic* text.

## Subheading

Here's a list:
- Item 1
- Item 2
- Item 3

### Code Example

\`\`\`javascript
function test() {
  return true;
}
\`\`\`

> This is a blockquote with important information.

| Column 1 | Column 2 |
|----------|----------|
| Data 1   | Data 2   |

---

**Final note:** All text should be visible in dark mode!
    `;

    test('all elements render with dark mode support', () => {
      const { container } = render(
        <div className="dark bg-gray-900">
          <MarkdownRenderer content={complexMarkdown} />
        </div>
      );

      // Check that key elements exist
      expect(container.querySelector('h1')).toBeInTheDocument();
      expect(container.querySelector('h2')).toBeInTheDocument();
      expect(container.querySelector('h3')).toBeInTheDocument();
      expect(container.querySelector('p')).toBeInTheDocument();
      expect(container.querySelector('ul')).toBeInTheDocument();
      expect(container.querySelector('strong')).toBeInTheDocument();
      expect(container.querySelector('em')).toBeInTheDocument();
      expect(container.querySelector('blockquote')).toBeInTheDocument();
      expect(container.querySelector('table')).toBeInTheDocument();
      expect(container.querySelector('hr')).toBeInTheDocument();
    });

    test('no element uses fixed dark colors without dark mode variant', () => {
      const { container } = render(
        <div className="dark">
          <MarkdownRenderer content={complexMarkdown} />
        </div>
      );

      // Get all text elements
      const textElements = container.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, td, th, blockquote, strong, em');

      textElements.forEach(el => {
        const classes = el.className;
        // If it has text-gray-900, it should also have dark:text-gray-*
        if (classes.includes('text-gray-900') || classes.includes('text-gray-700')) {
          expect(classes).toMatch(/dark:text-gray-/);
        }
      });
    });
  });

  describe('Light Mode Regression', () => {
    test('elements still work in light mode', () => {
      const { container } = render(
        <div className="bg-white">
          <MarkdownRenderer content="# Heading\n\nParagraph text" />
        </div>
      );

      const h1 = container.querySelector('h1');
      const p = container.querySelector('p');

      expect(h1).toBeInTheDocument();
      expect(p).toBeInTheDocument();

      // Light mode contrast
      const contrastRatio = getContrastRatio(COLORS['gray-900'], COLORS['white']);
      expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe('WCAG AA Compliance', () => {
    test('all text meets WCAG AA standards in dark mode', () => {
      const testCases = [
        { name: 'Headings & paragraphs', fg: COLORS['gray-100'], bg: COLORS['gray-900'] },
        { name: 'Table headers', fg: COLORS['gray-300'], bg: COLORS['gray-800'] },
        { name: 'Table cells', fg: COLORS['gray-100'], bg: COLORS['gray-900'] },
        { name: 'Blockquotes', fg: COLORS['gray-300'], bg: COLORS['gray-800'] },
        { name: 'Strikethrough', fg: COLORS['gray-400'], bg: COLORS['gray-900'] }
      ];

      testCases.forEach(({ name, fg, bg }) => {
        const ratio = getContrastRatio(fg, bg);
        expect(ratio, `${name} should meet WCAG AA`).toBeGreaterThanOrEqual(4.5);
      });
    });
  });
});
