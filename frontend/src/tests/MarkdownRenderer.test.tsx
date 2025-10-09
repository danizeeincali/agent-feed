import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MarkdownRenderer } from '../components/dynamic-page/MarkdownRenderer';

describe('MarkdownRenderer Component', () => {
  describe('Rendering', () => {
    it('renders basic markdown content', () => {
      const content = '# Hello World';
      render(<MarkdownRenderer content={content} />);

      expect(screen.getByText('Hello World')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });

    it('renders paragraph text', () => {
      const content = 'This is a paragraph.';
      render(<MarkdownRenderer content={content} />);

      expect(screen.getByText('This is a paragraph.')).toBeInTheDocument();
    });

    it('renders multiple headings', () => {
      const content = `
# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6
      `;

      render(<MarkdownRenderer content={content} />);

      expect(screen.getByRole('heading', { level: 1, name: 'Heading 1' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: 'Heading 2' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3, name: 'Heading 3' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 4, name: 'Heading 4' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 5, name: 'Heading 5' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 6, name: 'Heading 6' })).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <MarkdownRenderer content="# Test" className="custom-markdown" />
      );

      expect(container.firstChild).toHaveClass('custom-markdown');
    });
  });

  describe('Text Formatting', () => {
    it('renders bold text', () => {
      const content = 'This is **bold** text';
      render(<MarkdownRenderer content={content} />);

      const boldElement = screen.getByText('bold');
      expect(boldElement.tagName).toBe('STRONG');
    });

    it('renders italic text', () => {
      const content = 'This is *italic* text';
      render(<MarkdownRenderer content={content} />);

      const italicElement = screen.getByText('italic');
      expect(italicElement.tagName).toBe('EM');
    });

    it('renders strikethrough text (GFM)', () => {
      const content = 'This is ~~strikethrough~~ text';
      render(<MarkdownRenderer content={content} />);

      const strikeElement = screen.getByText('strikethrough');
      expect(strikeElement.tagName).toBe('DEL');
    });

    it('renders inline code', () => {
      const content = 'Use `const` for constants';
      render(<MarkdownRenderer content={content} />);

      const codeElement = screen.getByText('const');
      expect(codeElement.tagName).toBe('CODE');
    });
  });

  describe('Links', () => {
    it('renders internal links', () => {
      const content = '[Internal Link](/about)';
      render(<MarkdownRenderer content={content} />);

      const link = screen.getByRole('link', { name: 'Internal Link' });
      expect(link).toHaveAttribute('href', '/about');
      expect(link).not.toHaveAttribute('target');
    });

    it('renders external links with security attributes', () => {
      const content = '[External Link](https://example.com)';
      render(<MarkdownRenderer content={content} />);

      const link = screen.getByRole('link', { name: 'External Link' });
      expect(link).toHaveAttribute('href', 'https://example.com');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('handles HTTP links as external', () => {
      const content = '[HTTP Link](http://example.com)';
      render(<MarkdownRenderer content={content} />);

      const link = screen.getByRole('link', { name: 'HTTP Link' });
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('Lists', () => {
    it('renders unordered lists', () => {
      const content = `
- Item 1
- Item 2
- Item 3
      `;

      render(<MarkdownRenderer content={content} />);

      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByText('Item 3')).toBeInTheDocument();

      const list = screen.getByText('Item 1').closest('ul');
      expect(list).toBeInTheDocument();
    });

    it('renders ordered lists', () => {
      const content = `
1. First
2. Second
3. Third
      `;

      render(<MarkdownRenderer content={content} />);

      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
      expect(screen.getByText('Third')).toBeInTheDocument();

      const list = screen.getByText('First').closest('ol');
      expect(list).toBeInTheDocument();
    });

    it('renders task lists (GFM)', () => {
      const content = `
- [x] Completed task
- [ ] Pending task
      `;

      render(<MarkdownRenderer content={content} />);

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(2);
      expect(checkboxes[0]).toBeChecked();
      expect(checkboxes[1]).not.toBeChecked();
      expect(checkboxes[0]).toBeDisabled();
      expect(checkboxes[1]).toBeDisabled();
    });
  });

  describe('Code Blocks', () => {
    it('renders code blocks', () => {
      const content = '```\nconst foo = "bar";\n```';
      render(<MarkdownRenderer content={content} />);

      expect(screen.getByText('const foo = "bar";')).toBeInTheDocument();
    });

    it('renders code blocks with language syntax', () => {
      const content = '```javascript\nconst foo = "bar";\n```';
      render(<MarkdownRenderer content={content} />);

      expect(screen.getByText('const foo = "bar";')).toBeInTheDocument();
    });

    it('wraps code blocks in pre tag', () => {
      const content = '```\ncode here\n```';
      const { container } = render(<MarkdownRenderer content={content} />);

      const preElement = container.querySelector('pre');
      expect(preElement).toBeInTheDocument();
    });
  });

  describe('Images', () => {
    it('renders images with alt text', () => {
      const content = '![Alt Text](https://example.com/image.jpg)';
      render(<MarkdownRenderer content={content} />);

      const img = screen.getByAltText('Alt Text');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
    });

    it('uses lazy loading for images', () => {
      const content = '![Test](https://example.com/image.jpg)';
      render(<MarkdownRenderer content={content} />);

      const img = screen.getByAltText('Test');
      expect(img).toHaveAttribute('loading', 'lazy');
    });

    it('provides fallback alt when missing', () => {
      const content = '![](https://example.com/image.jpg)';
      render(<MarkdownRenderer content={content} />);

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('alt', 'Image');
    });
  });

  describe('Blockquotes', () => {
    it('renders blockquotes', () => {
      const content = '> This is a quote';
      render(<MarkdownRenderer content={content} />);

      expect(screen.getByText('This is a quote')).toBeInTheDocument();

      const blockquote = screen.getByText('This is a quote').closest('blockquote');
      expect(blockquote).toBeInTheDocument();
    });

    it('renders multi-line blockquotes', () => {
      const content = `
> Line 1
> Line 2
      `;

      render(<MarkdownRenderer content={content} />);

      expect(screen.getByText(/Line 1/)).toBeInTheDocument();
      expect(screen.getByText(/Line 2/)).toBeInTheDocument();
    });
  });

  describe('Horizontal Rules', () => {
    it('renders horizontal rules', () => {
      const content = 'Before\n\n---\n\nAfter';
      const { container } = render(<MarkdownRenderer content={content} />);

      const hr = container.querySelector('hr');
      expect(hr).toBeInTheDocument();
    });
  });

  describe('Tables (GFM)', () => {
    it('renders tables', () => {
      const content = `
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |
      `;

      render(<MarkdownRenderer content={content} />);

      expect(screen.getByText('Header 1')).toBeInTheDocument();
      expect(screen.getByText('Header 2')).toBeInTheDocument();
      expect(screen.getByText('Cell 1')).toBeInTheDocument();
      expect(screen.getByText('Cell 2')).toBeInTheDocument();
      expect(screen.getByText('Cell 3')).toBeInTheDocument();
      expect(screen.getByText('Cell 4')).toBeInTheDocument();
    });

    it('renders table in scrollable container', () => {
      const content = `
| A | B |
|---|---|
| 1 | 2 |
      `;

      const { container } = render(<MarkdownRenderer content={content} />);

      const scrollContainer = container.querySelector('.overflow-x-auto');
      expect(scrollContainer).toBeInTheDocument();
    });
  });

  describe('Sanitization', () => {
    it('sanitizes dangerous HTML by default', () => {
      const content = '<script>alert("xss")</script>\n\nSafe content';
      render(<MarkdownRenderer content={content} />);

      expect(screen.getByText('Safe content')).toBeInTheDocument();
      const script = document.querySelector('script');
      expect(script).not.toBeInTheDocument();
    });

    it('allows sanitization to be disabled', () => {
      const content = 'Safe **markdown**';
      render(<MarkdownRenderer content={content} sanitize={false} />);

      expect(screen.getByText('markdown')).toBeInTheDocument();
    });

    it('prevents XSS in links', () => {
      const content = '[Click](javascript:alert("xss"))';
      render(<MarkdownRenderer content={content} />);

      // Sanitizer should remove or neutralize javascript: URLs
      const link = screen.queryByRole('link', { name: 'Click' });
      if (link) {
        const href = link.getAttribute('href');
        expect(href).not.toContain('javascript:');
      }
    });
  });

  describe('Edge Cases', () => {
    it('handles empty content', () => {
      const { container } = render(<MarkdownRenderer content="" />);

      expect(container.firstChild).toBeInTheDocument();
    });

    it('handles whitespace-only content', () => {
      const { container } = render(<MarkdownRenderer content="   \n\n   " />);

      expect(container.firstChild).toBeInTheDocument();
    });

    it('handles very long content', () => {
      const longContent = 'Lorem ipsum '.repeat(1000);
      render(<MarkdownRenderer content={longContent} />);

      expect(screen.getByText(/Lorem ipsum/)).toBeInTheDocument();
    });

    it('handles special characters', () => {
      const content = '# Title with <>&"\'';
      render(<MarkdownRenderer content={content} />);

      expect(screen.getByRole('heading')).toHaveTextContent('Title with <>&"\'');
    });

    it('handles nested formatting', () => {
      const content = '**Bold with *italic* inside**';
      render(<MarkdownRenderer content={content} />);

      expect(screen.getByText('italic')).toBeInTheDocument();
    });

    it('handles malformed markdown gracefully', () => {
      const content = '# Heading without closing\n**bold without closing';
      render(<MarkdownRenderer content={content} />);

      expect(screen.getByRole('heading')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('uses semantic HTML elements', () => {
      const content = `
# Main Title
## Subtitle
- List item
      `;

      render(<MarkdownRenderer content={content} />);

      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
      expect(screen.getByRole('list')).toBeInTheDocument();
    });

    it('provides alt text for images', () => {
      const content = '![Accessible Image](test.jpg)';
      render(<MarkdownRenderer content={content} />);

      expect(screen.getByAltText('Accessible Image')).toBeInTheDocument();
    });

    it('maintains link accessibility', () => {
      const content = '[Accessible Link](https://example.com)';
      render(<MarkdownRenderer content={content} />);

      const link = screen.getByRole('link', { name: 'Accessible Link' });
      expect(link).toBeInTheDocument();
    });

    it('properly structures lists for screen readers', () => {
      const content = `
- Item 1
- Item 2
      `;

      render(<MarkdownRenderer content={content} />);

      const list = screen.getByRole('list');
      const items = screen.getAllByRole('listitem');

      expect(list).toBeInTheDocument();
      expect(items).toHaveLength(2);
    });
  });

  describe('Styling', () => {
    it('applies markdown-renderer wrapper class', () => {
      const { container } = render(<MarkdownRenderer content="# Test" />);

      expect(container.firstChild).toHaveClass('markdown-renderer');
      expect(container.firstChild).toHaveClass('max-w-none');
      // Should NOT have prose classes (removed in favor of explicit colors)
      expect(container.firstChild).not.toHaveClass('prose');
    });

    it('applies custom classes alongside default ones', () => {
      const { container } = render(
        <MarkdownRenderer content="# Test" className="my-custom-class" />
      );

      const element = container.firstChild as HTMLElement;
      expect(element).toHaveClass('markdown-renderer');
      expect(element).toHaveClass('my-custom-class');
      expect(element).toHaveClass('max-w-none');
      // Should NOT have prose classes
      expect(element).not.toHaveClass('prose');
    });

    it('applies explicit text color classes to elements', () => {
      const content = `
# Heading
Paragraph text
- List item
      `;

      const { container } = render(<MarkdownRenderer content={content} />);

      // Verify explicit color classes are applied
      const h1 = container.querySelector('h1');
      expect(h1).toHaveClass('text-gray-900');
      expect(h1).toHaveClass('dark:text-gray-100');

      const p = container.querySelector('p');
      expect(p).toHaveClass('text-gray-900');
      expect(p).toHaveClass('dark:text-gray-200');

      const ul = container.querySelector('ul');
      expect(ul).toHaveClass('text-gray-900');
      expect(ul).toHaveClass('dark:text-gray-200');
    });
  });
});
