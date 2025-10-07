import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Markdown } from './Markdown';

describe('Markdown Component', () => {
  describe('Basic Rendering', () => {
    it('should render plain text content', () => {
      render(<Markdown content="Hello World" />);
      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      render(<Markdown content="Test" className="custom-class" />);
      const container = screen.getByTestId('markdown-container');
      expect(container).toHaveClass('custom-class');
    });

    it('should always include prose classes', () => {
      render(<Markdown content="Test" />);
      const container = screen.getByTestId('markdown-container');
      expect(container).toHaveClass('prose');
      expect(container).toHaveClass('prose-slate');
    });
  });

  describe('Headings', () => {
    it('should render h1 headings', () => {
      render(<Markdown content="# Heading 1" />);
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Heading 1');
      expect(heading).toHaveClass('text-4xl', 'font-bold');
    });

    it('should render h2 headings', () => {
      render(<Markdown content="## Heading 2" />);
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent('Heading 2');
      expect(heading).toHaveClass('text-3xl', 'font-bold');
    });

    it('should render h3 headings', () => {
      render(<Markdown content="### Heading 3" />);
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('Heading 3');
      expect(heading).toHaveClass('text-2xl', 'font-semibold');
    });

    it('should render multiple heading levels', () => {
      const content = `
# H1
## H2
### H3
#### H4
##### H5
###### H6
      `;
      render(<Markdown content={content} />);
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 4 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 5 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 6 })).toBeInTheDocument();
    });
  });

  describe('Text Formatting', () => {
    it('should render bold text', () => {
      render(<Markdown content="This is **bold** text" />);
      const bold = screen.getByText('bold');
      expect(bold.tagName).toBe('STRONG');
      expect(bold).toHaveClass('font-bold');
    });

    it('should render italic text', () => {
      render(<Markdown content="This is *italic* text" />);
      const italic = screen.getByText('italic');
      expect(italic.tagName).toBe('EM');
      expect(italic).toHaveClass('italic');
    });

    it('should render strikethrough text (GFM)', () => {
      render(<Markdown content="This is ~~deleted~~ text" />);
      const del = screen.getByText('deleted');
      expect(del.tagName).toBe('DEL');
      expect(del).toHaveClass('line-through');
    });

    it('should render inline code', () => {
      render(<Markdown content="Use `const` for constants" />);
      const code = screen.getByText('const');
      expect(code.tagName).toBe('CODE');
      expect(code).toHaveClass('bg-gray-100', 'text-pink-600');
    });
  });

  describe('Links', () => {
    it('should render internal links without target blank', () => {
      render(<Markdown content="[Internal](/about)" />);
      const link = screen.getByRole('link', { name: 'Internal' });
      expect(link).toHaveAttribute('href', '/about');
      expect(link).not.toHaveAttribute('target');
      expect(link).not.toHaveAttribute('rel');
    });

    it('should render external links with security attributes', () => {
      render(<Markdown content="[External](https://example.com)" />);
      const link = screen.getByRole('link', { name: 'External' });
      expect(link).toHaveAttribute('href', 'https://example.com');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should style links appropriately', () => {
      render(<Markdown content="[Link](https://example.com)" />);
      const link = screen.getByRole('link');
      expect(link).toHaveClass('text-blue-600', 'hover:text-blue-800', 'underline');
    });
  });

  describe('Lists', () => {
    it('should render unordered lists', () => {
      const content = `
- Item 1
- Item 2
- Item 3
      `;
      render(<Markdown content={content} />);
      const list = screen.getByRole('list');
      expect(list.tagName).toBe('UL');
      expect(list).toHaveClass('list-disc');
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByText('Item 3')).toBeInTheDocument();
    });

    it('should render ordered lists', () => {
      const content = `
1. First
2. Second
3. Third
      `;
      render(<Markdown content={content} />);
      const list = screen.getByRole('list');
      expect(list.tagName).toBe('OL');
      expect(list).toHaveClass('list-decimal');
      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
      expect(screen.getByText('Third')).toBeInTheDocument();
    });

    it('should render task lists (GFM)', () => {
      const content = `
- [x] Completed task
- [ ] Incomplete task
      `;
      render(<Markdown content={content} />);
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(2);
      expect(checkboxes[0]).toBeChecked();
      expect(checkboxes[0]).toBeDisabled();
      expect(checkboxes[1]).not.toBeChecked();
      expect(checkboxes[1]).toBeDisabled();
    });
  });

  describe('Code Blocks', () => {
    it('should render code blocks', () => {
      const content = `
\`\`\`javascript
const hello = "world";
\`\`\`
      `;
      render(<Markdown content={content} />);
      expect(screen.getByText(/const hello/)).toBeInTheDocument();
    });

    it('should apply syntax highlighting classes', () => {
      const content = `
\`\`\`javascript
const x = 42;
\`\`\`
      `;
      const { container } = render(<Markdown content={content} />);
      const codeBlock = container.querySelector('code');
      expect(codeBlock).toHaveClass('bg-gray-900', 'text-gray-100');
    });
  });

  describe('Blockquotes', () => {
    it('should render blockquotes', () => {
      render(<Markdown content="> This is a quote" />);
      const blockquote = screen.getByText('This is a quote').closest('blockquote');
      expect(blockquote).toBeInTheDocument();
      expect(blockquote).toHaveClass('border-l-4', 'italic');
    });
  });

  describe('Tables (GFM)', () => {
    it('should render tables', () => {
      const content = `
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |
      `;
      render(<Markdown content={content} />);
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
      expect(screen.getByText('Header 1')).toBeInTheDocument();
      expect(screen.getByText('Header 2')).toBeInTheDocument();
      expect(screen.getByText('Cell 1')).toBeInTheDocument();
      expect(screen.getByText('Cell 2')).toBeInTheDocument();
      expect(screen.getByText('Cell 3')).toBeInTheDocument();
      expect(screen.getByText('Cell 4')).toBeInTheDocument();
    });

    it('should style table elements', () => {
      const content = `
| Name | Age |
|------|-----|
| John | 30  |
      `;
      const { container } = render(<Markdown content={content} />);
      const thead = container.querySelector('thead');
      const tbody = container.querySelector('tbody');

      expect(thead).toHaveClass('bg-gray-100');
      expect(tbody).toHaveClass('bg-white');
    });
  });

  describe('Images', () => {
    it('should render images with alt text', () => {
      render(<Markdown content="![Alt text](https://example.com/image.jpg)" />);
      const img = screen.getByAltText('Alt text');
      expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
      expect(img).toHaveClass('max-w-full', 'rounded-lg');
    });

    it('should use lazy loading', () => {
      render(<Markdown content="![Image](https://example.com/image.jpg)" />);
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('loading', 'lazy');
    });

    it('should provide default alt text if missing', () => {
      render(<Markdown content="![](https://example.com/image.jpg)" />);
      const img = screen.getByAltText('Image');
      expect(img).toBeInTheDocument();
    });
  });

  describe('Horizontal Rules', () => {
    it('should render horizontal rules', () => {
      const content = `
Text above

---

Text below
      `;
      const { container } = render(<Markdown content={content} />);
      const hr = container.querySelector('hr');
      expect(hr).toBeInTheDocument();
      expect(hr).toHaveClass('my-8');
    });
  });

  describe('XSS Protection', () => {
    it('should sanitize HTML by default', () => {
      const maliciousContent = '<script>alert("XSS")</script>';
      const { container } = render(<Markdown content={maliciousContent} />);
      const script = container.querySelector('script');
      expect(script).not.toBeInTheDocument();
    });

    it('should sanitize when sanitize prop is true', () => {
      const maliciousContent = '<img src=x onerror="alert(1)">';
      const { container } = render(
        <Markdown content={maliciousContent} sanitize={true} />
      );
      const img = container.querySelector('img[onerror]');
      expect(img).not.toBeInTheDocument();
    });

    it('should allow sanitization to be disabled', () => {
      // Note: In production, you should rarely disable sanitization
      // This test is just to verify the prop works
      const content = 'Normal content';
      render(<Markdown content={content} sanitize={false} />);
      expect(screen.getByText('Normal content')).toBeInTheDocument();
    });
  });

  describe('Paragraphs', () => {
    it('should render paragraphs with proper spacing', () => {
      const content = `
First paragraph.

Second paragraph.
      `;
      render(<Markdown content={content} />);
      expect(screen.getByText('First paragraph.')).toBeInTheDocument();
      expect(screen.getByText('Second paragraph.')).toBeInTheDocument();
    });
  });

  describe('Complex Content', () => {
    it('should render complex mixed content', () => {
      const content = `
# Main Title

This is a paragraph with **bold** and *italic* text.

## Features

- Item 1
- Item 2
- [x] Completed
- [ ] Todo

\`\`\`javascript
const code = true;
\`\`\`

> A wise quote

| Col 1 | Col 2 |
|-------|-------|
| A     | B     |
      `;
      render(<Markdown content={content} />);

      expect(screen.getByRole('heading', { level: 1, name: 'Main Title' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: 'Features' })).toBeInTheDocument();
      expect(screen.getByText('bold')).toBeInTheDocument();
      expect(screen.getByText('italic')).toBeInTheDocument();
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText(/const code/)).toBeInTheDocument();
      expect(screen.getByText('A wise quote')).toBeInTheDocument();
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content', () => {
      render(<Markdown content="" />);
      const container = screen.getByTestId('markdown-container');
      expect(container).toBeInTheDocument();
    });

    it('should handle whitespace-only content', () => {
      render(<Markdown content="   \n\n   " />);
      const container = screen.getByTestId('markdown-container');
      expect(container).toBeInTheDocument();
    });

    it('should handle special characters', () => {
      render(<Markdown content="&lt; &gt; &amp;" />);
      expect(screen.getByText(/&lt;/)).toBeInTheDocument();
    });
  });
});
