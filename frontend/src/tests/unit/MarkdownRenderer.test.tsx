/**
 * TDD Tests for MarkdownRenderer Component
 * Vitest + React Testing Library
 *
 * Focus: Real component integration testing (no mocks for markdown libraries)
 * Tests verify actual markdown rendering behavior
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import MarkdownRenderer from '../../components/markdown/MarkdownRenderer';

describe('MarkdownRenderer', () => {
  describe('Basic Rendering', () => {
    it('renders plain text', () => {
      render(<MarkdownRenderer content="Hello world" />);
      expect(screen.getByText('Hello world')).toBeInTheDocument();
    });

    it('renders bold text', () => {
      render(<MarkdownRenderer content="**bold text**" />);
      const boldElement = screen.getByText('bold text');
      expect(boldElement.tagName).toBe('STRONG');
    });

    it('renders italic text', () => {
      render(<MarkdownRenderer content="*italic text*" />);
      const italicElement = screen.getByText('italic text');
      expect(italicElement.tagName).toBe('EM');
    });

    it('renders strikethrough text', () => {
      render(<MarkdownRenderer content="~~strikethrough~~" />);
      const delElement = screen.getByText('strikethrough');
      expect(delElement.tagName).toBe('DEL');
    });

    it('renders headings', () => {
      render(<MarkdownRenderer content="# Heading 1" />);
      expect(screen.getByRole('heading', { level: 1, name: 'Heading 1' })).toBeInTheDocument();
    });

    it('renders paragraphs', () => {
      render(<MarkdownRenderer content="First paragraph\n\nSecond paragraph" />);
      expect(screen.getByText(/First paragraph/)).toBeInTheDocument();
      expect(screen.getByText(/Second paragraph/)).toBeInTheDocument();
    });
  });

  describe('Lists', () => {
    it('renders unordered lists', () => {
      const { container } = render(<MarkdownRenderer content="- Item 1\n- Item 2\n- Item 3" />);
      const ul = container.querySelector('ul');
      expect(ul).toBeInTheDocument();
      expect(container.textContent).toContain('Item 1');
    });

    it('renders ordered lists', () => {
      const { container } = render(<MarkdownRenderer content="1. First\n2. Second\n3. Third" />);
      const ol = container.querySelector('ol');
      expect(ol).toBeInTheDocument();
      expect(container.textContent).toContain('First');
    });
  });

  describe('Code Rendering', () => {
    it('renders inline code', () => {
      render(<MarkdownRenderer content="Use `console.log()` for debugging" />);
      const codeElement = screen.getByText('console.log()');
      expect(codeElement.tagName).toBe('CODE');
    });

    it('renders code blocks', () => {
      const codeContent = '```javascript\nconst x = 42;\n```';
      render(<MarkdownRenderer content={codeContent} />);
      expect(screen.getByText(/const x = 42/)).toBeInTheDocument();
    });

    it('renders code blocks with language label', () => {
      const codeContent = '```python\nprint("hello")\n```';
      render(<MarkdownRenderer content={codeContent} />);
      expect(screen.getByText('PYTHON')).toBeInTheDocument();
    });
  });

  describe('Links', () => {
    it('renders links', () => {
      render(<MarkdownRenderer content="[Click here](https://example.com)" />);
      const link = screen.getByText('Click here');
      expect(link.tagName).toBe('A');
      expect(link).toHaveAttribute('href', 'https://example.com');
    });

    it('renders external links with security attributes', () => {
      render(<MarkdownRenderer content="[External](https://example.com)" />);
      const link = screen.getByText('External');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('blocks javascript: protocol', () => {
      render(<MarkdownRenderer content='[Bad](javascript:alert("xss"))' />);
      const element = screen.getByText('Bad');
      expect(element.tagName).toBe('SPAN'); // Rendered as span, not link
    });
  });

  describe('Tables (GitHub Flavored Markdown)', () => {
    it('renders tables', () => {
      const table = '| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |';
      render(<MarkdownRenderer content={table} />);
      expect(screen.getByText('Header 1')).toBeInTheDocument();
      expect(screen.getByText('Header 2')).toBeInTheDocument();
      expect(screen.getByText('Cell 1')).toBeInTheDocument();
      expect(screen.getByText('Cell 2')).toBeInTheDocument();
    });
  });

  describe('Blockquotes', () => {
    it('renders blockquotes', () => {
      render(<MarkdownRenderer content="> This is a quote" />);
      expect(screen.getByText('This is a quote')).toBeInTheDocument();
    });
  });

  describe('Security', () => {
    it('blocks script tags', () => {
      render(<MarkdownRenderer content='<script>alert("xss")</script>' />);
      expect(document.querySelector('script')).not.toBeInTheDocument();
    });

    it('blocks data: protocol', () => {
      render(<MarkdownRenderer content='[Bad](data:text/html,<script>alert("xss")</script>)' />);
      const element = screen.getByText('Bad');
      expect(element.tagName).toBe('SPAN');
    });

    it('sanitizes null bytes', () => {
      const contentWithNull = 'Hello\0World';
      render(<MarkdownRenderer content={contentWithNull} />);
      expect(screen.getByText('HelloWorld')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('renders empty content as null', () => {
      const { container } = render(<MarkdownRenderer content="" />);
      expect(container.firstChild).toBeNull();
    });

    it('handles non-string content gracefully', () => {
      const { container } = render(<MarkdownRenderer content={null as any} />);
      expect(container.firstChild).toBeNull();
    });

    it('handles undefined content', () => {
      const { container } = render(<MarkdownRenderer content={undefined as any} />);
      expect(container.firstChild).toBeNull();
    });

    it('trims whitespace', () => {
      render(<MarkdownRenderer content="  Hello  " />);
      expect(screen.getByText('Hello')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA role', () => {
      const { container } = render(<MarkdownRenderer content="Test content" />);
      const article = container.querySelector('[role="article"]');
      expect(article).toBeInTheDocument();
    });

    it('has proper ARIA label', () => {
      const { container } = render(<MarkdownRenderer content="Test content" />);
      const article = container.querySelector('[role="article"]');
      expect(article).toHaveAttribute('aria-label', 'Markdown content');
    });
  });
});
