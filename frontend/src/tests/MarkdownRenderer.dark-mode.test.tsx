/**
 * MarkdownRenderer Dark Mode Tests
 *
 * Critical tests for verifying dark mode color switching after prose class removal.
 * These tests ensure that explicit color classes (text-gray-900, dark:text-gray-200, etc.)
 * work correctly when toggling between light and dark modes.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MarkdownRenderer } from '../components/dynamic-page/MarkdownRenderer';

/**
 * Helper function to extract RGB values from computed style
 */
function getRGBValues(element: Element): string {
  const computedColor = window.getComputedStyle(element).color;
  return computedColor;
}

/**
 * Helper to enable dark mode
 */
function enableDarkMode() {
  document.documentElement.classList.add('dark');
}

/**
 * Helper to disable dark mode
 */
function disableDarkMode() {
  document.documentElement.classList.remove('dark');
}

describe('MarkdownRenderer - Dark Mode Color Switching', () => {
  afterEach(() => {
    cleanup();
    disableDarkMode();
  });

  describe('Paragraph Text Colors', () => {
    it('should render paragraphs with gray-900 in light mode', () => {
      const content = 'This is a test paragraph.';
      const { container } = render(<MarkdownRenderer content={content} />);

      const paragraph = container.querySelector('p');
      expect(paragraph).toBeInTheDocument();
      expect(paragraph).toHaveClass('text-gray-900');
    });

    it('should switch paragraphs to gray-200 in dark mode', () => {
      enableDarkMode();

      const content = 'This is a test paragraph in dark mode.';
      const { container } = render(<MarkdownRenderer content={content} />);

      const paragraph = container.querySelector('p');
      expect(paragraph).toBeInTheDocument();
      expect(paragraph).toHaveClass('dark:text-gray-200');
    });

    it('should toggle paragraph colors when switching modes', () => {
      const content = 'Toggle test paragraph.';

      // Light mode
      const { container, rerender } = render(<MarkdownRenderer content={content} />);
      const paragraph = container.querySelector('p');

      expect(paragraph).toHaveClass('text-gray-900');

      // Switch to dark mode
      enableDarkMode();
      rerender(<MarkdownRenderer content={content} />);

      expect(paragraph).toHaveClass('dark:text-gray-200');

      // Switch back to light mode
      disableDarkMode();
      rerender(<MarkdownRenderer content={content} />);

      expect(paragraph).toHaveClass('text-gray-900');
    });
  });

  describe('Heading Text Colors', () => {
    it('should render all headings with gray-900 in light mode', () => {
      const content = `
# H1
## H2
### H3
#### H4
##### H5
###### H6
      `;

      const { container } = render(<MarkdownRenderer content={content} />);

      ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(tag => {
        const heading = container.querySelector(tag);
        expect(heading).toBeInTheDocument();
        expect(heading).toHaveClass('text-gray-900');
      });
    });

    it('should render all headings with gray-100 in dark mode', () => {
      enableDarkMode();

      const content = `
# H1
## H2
### H3
#### H4
##### H5
###### H6
      `;

      const { container } = render(<MarkdownRenderer content={content} />);

      ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(tag => {
        const heading = container.querySelector(tag);
        expect(heading).toBeInTheDocument();
        expect(heading).toHaveClass('dark:text-gray-100');
      });
    });
  });

  describe('List Text Colors', () => {
    it('should render unordered lists with gray-900 in light mode', () => {
      const content = `
- Item 1
- Item 2
- Item 3
      `;

      const { container } = render(<MarkdownRenderer content={content} />);

      const ul = container.querySelector('ul');
      expect(ul).toHaveClass('text-gray-900');
    });

    it('should render ordered lists with gray-900 in light mode', () => {
      const content = `
1. First
2. Second
3. Third
      `;

      const { container } = render(<MarkdownRenderer content={content} />);

      const ol = container.querySelector('ol');
      expect(ol).toHaveClass('text-gray-900');
    });

    it('should switch lists to gray-200 in dark mode', () => {
      enableDarkMode();

      const content = `
- Item 1
- Item 2
      `;

      const { container } = render(<MarkdownRenderer content={content} />);

      const ul = container.querySelector('ul');
      expect(ul).toHaveClass('dark:text-gray-200');
    });
  });

  describe('Blockquote Text Colors', () => {
    it('should render blockquotes with gray-900 in light mode', () => {
      const content = '> This is a blockquote';
      const { container } = render(<MarkdownRenderer content={content} />);

      const blockquote = container.querySelector('blockquote');
      expect(blockquote).toHaveClass('text-gray-900');
    });

    it('should switch blockquotes to gray-200 in dark mode', () => {
      enableDarkMode();

      const content = '> This is a blockquote in dark mode';
      const { container } = render(<MarkdownRenderer content={content} />);

      const blockquote = container.querySelector('blockquote');
      expect(blockquote).toHaveClass('dark:text-gray-200');
    });

    it('should have proper background colors in both modes', () => {
      const content = '> Blockquote';

      // Light mode
      const { container, rerender } = render(<MarkdownRenderer content={content} />);
      const blockquote = container.querySelector('blockquote')!;

      expect(blockquote).toHaveClass('bg-gray-50');

      // Dark mode
      enableDarkMode();
      rerender(<MarkdownRenderer content={content} />);

      expect(blockquote).toHaveClass('dark:bg-gray-800');
    });
  });

  describe('Table Text Colors', () => {
    const tableContent = `
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
    `;

    it('should render table headers with gray-900 in light mode', () => {
      const { container } = render(<MarkdownRenderer content={tableContent} />);

      const th = container.querySelector('th');
      expect(th).toHaveClass('text-gray-900');
    });

    it('should render table cells with gray-900 in light mode', () => {
      const { container } = render(<MarkdownRenderer content={tableContent} />);

      const td = container.querySelector('td');
      expect(td).toHaveClass('text-gray-900');
    });

    it('should switch table headers to gray-100 in dark mode', () => {
      enableDarkMode();

      const { container } = render(<MarkdownRenderer content={tableContent} />);

      const th = container.querySelector('th');
      expect(th).toHaveClass('dark:text-gray-100');
    });

    it('should switch table cells to gray-200 in dark mode', () => {
      enableDarkMode();

      const { container } = render(<MarkdownRenderer content={tableContent} />);

      const td = container.querySelector('td');
      expect(td).toHaveClass('dark:text-gray-200');
    });
  });

  describe('Link Text Colors', () => {
    it('should render links with blue-600 in light mode', () => {
      const content = '[Link Text](https://example.com)';
      const { container } = render(<MarkdownRenderer content={content} />);

      const link = container.querySelector('a');
      expect(link).toHaveClass('text-blue-600');
    });

    it('should switch links to blue-400 in dark mode', () => {
      enableDarkMode();

      const content = '[Link Text](https://example.com)';
      const { container } = render(<MarkdownRenderer content={content} />);

      const link = container.querySelector('a');
      expect(link).toHaveClass('dark:text-blue-400');
    });
  });

  describe('Inline Code Text Colors', () => {
    it('should render inline code with red-600 in light mode', () => {
      const content = 'Use the `const` keyword';
      const { container } = render(<MarkdownRenderer content={content} />);

      const code = container.querySelector('code');
      expect(code).toHaveClass('text-red-600');
    });

    it('should switch inline code to red-400 in dark mode', () => {
      enableDarkMode();

      const content = 'Use the `const` keyword';
      const { container } = render(<MarkdownRenderer content={content} />);

      const code = container.querySelector('code');
      expect(code).toHaveClass('dark:text-red-400');
    });
  });

  describe('Bold Text Colors', () => {
    it('should render bold text with gray-900 in light mode', () => {
      const content = 'This is **bold** text';
      const { container } = render(<MarkdownRenderer content={content} />);

      const strong = container.querySelector('strong');
      expect(strong).toHaveClass('text-gray-900');
    });

    it('should switch bold text to gray-100 in dark mode', () => {
      enableDarkMode();

      const content = 'This is **bold** text';
      const { container } = render(<MarkdownRenderer content={content} />);

      const strong = container.querySelector('strong');
      expect(strong).toHaveClass('dark:text-gray-100');
    });
  });

  describe('Strikethrough Text Colors', () => {
    it('should render strikethrough with gray-600 in light mode', () => {
      const content = 'This is ~~strikethrough~~ text';
      const { container } = render(<MarkdownRenderer content={content} />);

      const del = container.querySelector('del');
      expect(del).toHaveClass('text-gray-600');
    });

    it('should switch strikethrough to gray-400 in dark mode', () => {
      enableDarkMode();

      const content = 'This is ~~strikethrough~~ text';
      const { container } = render(<MarkdownRenderer content={content} />);

      const del = container.querySelector('del');
      expect(del).toHaveClass('dark:text-gray-400');
    });
  });

  describe('Complex Markdown - Dark Mode Integration', () => {
    const complexContent = `
# Main Heading

This is a paragraph with **bold**, *italic*, and \`code\` text.

## Subheading

- List item 1
- List item 2

> This is a blockquote

[Link](https://example.com)

| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |

This has ~~strikethrough~~ text.
    `;

    it('should apply all color classes correctly in light mode', () => {
      const { container } = render(<MarkdownRenderer content={complexContent} />);

      expect(container.querySelector('h1')).toHaveClass('text-gray-900');
      expect(container.querySelector('p')).toHaveClass('text-gray-900');
      expect(container.querySelector('strong')).toHaveClass('text-gray-900');
      expect(container.querySelector('code')).toHaveClass('text-red-600');
      expect(container.querySelector('h2')).toHaveClass('text-gray-900');
      expect(container.querySelector('ul')).toHaveClass('text-gray-900');
      expect(container.querySelector('blockquote')).toHaveClass('text-gray-900');
      expect(container.querySelector('a')).toHaveClass('text-blue-600');
      expect(container.querySelector('th')).toHaveClass('text-gray-900');
      expect(container.querySelector('td')).toHaveClass('text-gray-900');
      expect(container.querySelector('del')).toHaveClass('text-gray-600');
    });

    it('should apply all dark mode color classes correctly', () => {
      enableDarkMode();

      const { container } = render(<MarkdownRenderer content={complexContent} />);

      expect(container.querySelector('h1')).toHaveClass('dark:text-gray-100');
      expect(container.querySelector('p')).toHaveClass('dark:text-gray-200');
      expect(container.querySelector('strong')).toHaveClass('dark:text-gray-100');
      expect(container.querySelector('code')).toHaveClass('dark:text-red-400');
      expect(container.querySelector('h2')).toHaveClass('dark:text-gray-100');
      expect(container.querySelector('ul')).toHaveClass('dark:text-gray-200');
      expect(container.querySelector('blockquote')).toHaveClass('dark:text-gray-200');
      expect(container.querySelector('a')).toHaveClass('dark:text-blue-400');
      expect(container.querySelector('th')).toHaveClass('dark:text-gray-100');
      expect(container.querySelector('td')).toHaveClass('dark:text-gray-200');
      expect(container.querySelector('del')).toHaveClass('dark:text-gray-400');
    });

    it('should toggle all elements between light and dark mode', () => {
      const { container, rerender } = render(<MarkdownRenderer content={complexContent} />);

      // Verify light mode
      expect(container.querySelector('h1')).toHaveClass('text-gray-900');
      expect(container.querySelector('p')).toHaveClass('text-gray-900');

      // Enable dark mode
      enableDarkMode();
      rerender(<MarkdownRenderer content={complexContent} />);

      // Verify dark mode
      expect(container.querySelector('h1')).toHaveClass('dark:text-gray-100');
      expect(container.querySelector('p')).toHaveClass('dark:text-gray-200');

      // Back to light mode
      disableDarkMode();
      rerender(<MarkdownRenderer content={complexContent} />);

      // Verify light mode again
      expect(container.querySelector('h1')).toHaveClass('text-gray-900');
      expect(container.querySelector('p')).toHaveClass('text-gray-900');
    });
  });

  describe('Edge Cases - Dark Mode', () => {
    it('should handle nested elements in dark mode', () => {
      enableDarkMode();

      const content = '> This is a **bold** word in a blockquote with `code`.';
      const { container } = render(<MarkdownRenderer content={content} />);

      const blockquote = container.querySelector('blockquote');
      const strong = blockquote?.querySelector('strong');
      const code = blockquote?.querySelector('code');

      expect(blockquote).toHaveClass('dark:text-gray-200');
      expect(strong).toHaveClass('dark:text-gray-100');
      expect(code).toHaveClass('dark:text-red-400');
    });

    it('should handle multiple paragraphs in dark mode', () => {
      enableDarkMode();

      const content = `
Paragraph 1

Paragraph 2

Paragraph 3
      `;

      const { container } = render(<MarkdownRenderer content={content} />);

      const paragraphs = container.querySelectorAll('p');

      paragraphs.forEach(p => {
        expect(p).toHaveClass('dark:text-gray-200');
      });
    });

    it('should not interfere with code block colors in dark mode', () => {
      enableDarkMode();

      const content = '```\nconst x = 1;\n```';
      const { container } = render(<MarkdownRenderer content={content} />);

      const pre = container.querySelector('pre');

      // Code blocks have their own color scheme
      expect(pre).toHaveClass('bg-gray-900');
      expect(pre).toHaveClass('dark:bg-gray-950');
    });
  });

  describe('Accessibility - Dark Mode Contrast', () => {
    it('should maintain readable text in dark mode', () => {
      enableDarkMode();

      const content = `
# Heading
Regular text
**Bold text**
*Italic text*
\`code\`
[Link](https://example.com)
      `;

      const { container } = render(<MarkdownRenderer content={content} />);

      // All text elements should have dark mode classes
      const h1 = container.querySelector('h1');
      const p = container.querySelector('p');
      const strong = container.querySelector('strong');
      const code = container.querySelector('code');
      const link = container.querySelector('a');

      expect(h1).toHaveClass('dark:text-gray-100');
      expect(p).toHaveClass('dark:text-gray-200');
      expect(strong).toHaveClass('dark:text-gray-100');
      expect(code).toHaveClass('dark:text-red-400');
      expect(link).toHaveClass('dark:text-blue-400');
    });
  });
});

describe('MarkdownRenderer - Prose Class Removal Verification', () => {
  it('should not have prose classes', () => {
    const content = '# Test';
    const { container } = render(<MarkdownRenderer content={content} />);

    const wrapper = container.firstChild as HTMLElement;

    // Should NOT have prose classes
    expect(wrapper).not.toHaveClass('prose');
    expect(wrapper).not.toHaveClass('prose-sm');
    expect(wrapper).not.toHaveClass('prose-lg');
  });

  it('should have explicit color classes instead of prose', () => {
    const content = 'Test paragraph';
    const { container } = render(<MarkdownRenderer content={content} />);

    const paragraph = container.querySelector('p');

    // Should have explicit color classes
    expect(paragraph).toHaveClass('text-gray-900');
    expect(paragraph).toHaveClass('dark:text-gray-200');
  });
});
