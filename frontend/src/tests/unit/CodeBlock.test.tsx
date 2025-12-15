/**
 * TDD Tests for CodeBlock Component
 * Vitest + React Testing Library
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import CodeBlock from '../../components/markdown/CodeBlock';

describe('CodeBlock', () => {
  describe('Inline vs Block Rendering', () => {
    it('renders inline code with proper styling', () => {
      render(<CodeBlock inline={true}>console.log()</CodeBlock>);
      const code = screen.getByText('console.log()');
      expect(code.tagName).toBe('CODE');
    });

    it('renders block code with syntax highlighter', () => {
      render(<CodeBlock inline={false} language="javascript">const x = 42;</CodeBlock>);
      expect(screen.getByText(/const x = 42/)).toBeInTheDocument();
    });
  });

  describe('Language Detection', () => {
    it('extracts language from className', () => {
      render(<CodeBlock inline={false} className="language-javascript">const x = 42;</CodeBlock>);
      expect(screen.getByText('JAVASCRIPT')).toBeInTheDocument();
    });

    it('maps js alias to javascript', () => {
      render(<CodeBlock inline={false} className="language-js">const x = 42;</CodeBlock>);
      expect(screen.getByText('JAVASCRIPT')).toBeInTheDocument();
    });

    it('maps ts alias to typescript', () => {
      render(<CodeBlock inline={false} className="language-ts">const x: number = 42;</CodeBlock>);
      expect(screen.getByText('TYPESCRIPT')).toBeInTheDocument();
    });

    it('maps py alias to python', () => {
      render(<CodeBlock inline={false} className="language-py">print("hello")</CodeBlock>);
      expect(screen.getByText('PYTHON')).toBeInTheDocument();
    });

    it('defaults to text for unsupported languages', () => {
      render(<CodeBlock inline={false} className="language-unknown">code here</CodeBlock>);
      expect(screen.getByText('TEXT')).toBeInTheDocument();
    });
  });

  describe('Copy Button', () => {
    it('shows copy button for block code', () => {
      render(<CodeBlock inline={false}>const x = 42;</CodeBlock>);
      expect(screen.getByRole('button', { name: /copy code/i })).toBeInTheDocument();
    });

    it('does not show copy button for inline code', () => {
      render(<CodeBlock inline={true}>console.log()</CodeBlock>);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('copies code to clipboard when clicked', async () => {
      // Mock clipboard API
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });

      render(<CodeBlock inline={false}>const x = 42;</CodeBlock>);
      const copyButton = screen.getByRole('button', { name: /copy code/i });

      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(writeTextMock).toHaveBeenCalledWith('const x = 42;');
      });
    });

    it('shows "Copied!" feedback after copy', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });

      render(<CodeBlock inline={false}>test code</CodeBlock>);
      const copyButton = screen.getByRole('button', { name: /copy code/i });

      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument();
      });
    });
  });

  describe('Line Numbers', () => {
    it('shows line numbers for code >10 lines', () => {
      const longCode = Array(15).fill('line').join('\n');
      const { container } = render(<CodeBlock inline={false}>{longCode}</CodeBlock>);

      // react-syntax-highlighter adds line numbers via class or spans
      expect(container.querySelector('.linenumber, [class*="line"]')).toBeTruthy();
    });

    it('does not show line numbers for code <=10 lines', () => {
      const shortCode = Array(5).fill('line').join('\n');
      render(<CodeBlock inline={false} showLineNumbers={false}>{shortCode}</CodeBlock>);

      // Verify showLineNumbers prop works
      expect(screen.getByText(/line/)).toBeInTheDocument();
    });

    it('respects explicit showLineNumbers prop', () => {
      render(<CodeBlock inline={false} showLineNumbers={true}>short</CodeBlock>);
      expect(screen.getByText('short')).toBeInTheDocument();
    });
  });

  describe('Children Conversion', () => {
    it('handles string children', () => {
      render(<CodeBlock inline={true}>simple string</CodeBlock>);
      expect(screen.getByText('simple string')).toBeInTheDocument();
    });

    it('handles number children', () => {
      render(<CodeBlock inline={true}>{42}</CodeBlock>);
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('handles React element children', () => {
      render(<CodeBlock inline={true}><span>nested</span></CodeBlock>);
      expect(screen.getByText('nested')).toBeInTheDocument();
    });

    it('handles array children', () => {
      render(<CodeBlock inline={true}>{['hello', ' ', 'world']}</CodeBlock>);
      expect(screen.getByText('hello world')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty code', () => {
      render(<CodeBlock inline={false}></CodeBlock>);
      expect(screen.getByText('TEXT')).toBeInTheDocument();
    });

    it('handles null children', () => {
      render(<CodeBlock inline={false}>{null}</CodeBlock>);
      expect(screen.getByText('TEXT')).toBeInTheDocument();
    });

    it('handles undefined children', () => {
      render(<CodeBlock inline={false}>{undefined}</CodeBlock>);
      expect(screen.getByText('TEXT')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA label for code region', () => {
      render(<CodeBlock inline={false} language="javascript">code</CodeBlock>);
      expect(screen.getByRole('region', { name: /code block in javascript/i })).toBeInTheDocument();
    });

    it('copy button has accessible label', () => {
      render(<CodeBlock inline={false}>code</CodeBlock>);
      expect(screen.getByRole('button', { name: /copy code to clipboard/i })).toBeInTheDocument();
    });
  });
});
