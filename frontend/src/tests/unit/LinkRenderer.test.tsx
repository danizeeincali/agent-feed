/**
 * TDD Tests for LinkRenderer Component
 * Vitest + React Testing Library
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import LinkRenderer, { isUrlSafe, isExternalUrl } from '../../components/markdown/LinkRenderer';

describe('LinkRenderer', () => {
  describe('Basic Rendering', () => {
    it('renders valid http links', () => {
      render(<LinkRenderer href="http://example.com">Click</LinkRenderer>);
      const link = screen.getByText('Click');
      expect(link.tagName).toBe('A');
      expect(link).toHaveAttribute('href', 'http://example.com');
    });

    it('renders valid https links', () => {
      render(<LinkRenderer href="https://example.com">Click</LinkRenderer>);
      const link = screen.getByText('Click');
      expect(link.tagName).toBe('A');
      expect(link).toHaveAttribute('href', 'https://example.com');
    });

    it('renders relative links', () => {
      render(<LinkRenderer href="/path/to/page">Click</LinkRenderer>);
      const link = screen.getByText('Click');
      expect(link.tagName).toBe('A');
      expect(link).toHaveAttribute('href', '/path/to/page');
    });

    it('renders anchor links', () => {
      render(<LinkRenderer href="#section">Click</LinkRenderer>);
      const link = screen.getByText('Click');
      expect(link.tagName).toBe('A');
      expect(link).toHaveAttribute('href', '#section');
    });
  });

  describe('External Links', () => {
    it('adds target="_blank" to external links', () => {
      render(<LinkRenderer href="https://example.com">External</LinkRenderer>);
      const link = screen.getByText('External');
      expect(link).toHaveAttribute('target', '_blank');
    });

    it('adds rel="noopener noreferrer" to external links', () => {
      render(<LinkRenderer href="https://example.com">External</LinkRenderer>);
      const link = screen.getByText('External');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('shows external link icon', () => {
      const { container } = render(<LinkRenderer href="https://example.com">External</LinkRenderer>);
      // lucide-react ExternalLink component renders SVG
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('does not add external attributes to relative links', () => {
      render(<LinkRenderer href="/internal">Internal</LinkRenderer>);
      const link = screen.getByText('Internal');
      expect(link).not.toHaveAttribute('target');
      expect(link).not.toHaveAttribute('rel');
    });
  });

  describe('Security - Dangerous Protocols', () => {
    it('blocks javascript: protocol', () => {
      render(<LinkRenderer href="javascript:alert('xss')">Bad Link</LinkRenderer>);
      const element = screen.getByText('Bad Link');
      expect(element.tagName).toBe('SPAN');
    });

    it('blocks vbscript: protocol', () => {
      render(<LinkRenderer href="vbscript:alert('xss')">Bad Link</LinkRenderer>);
      const element = screen.getByText('Bad Link');
      expect(element.tagName).toBe('SPAN');
    });

    it('blocks data: protocol', () => {
      render(<LinkRenderer href="data:text/html,<script>alert('xss')</script>">Bad Link</LinkRenderer>);
      const element = screen.getByText('Bad Link');
      expect(element.tagName).toBe('SPAN');
    });

    it('blocks file: protocol', () => {
      render(<LinkRenderer href="file:///etc/passwd">Bad Link</LinkRenderer>);
      const element = screen.getByText('Bad Link');
      expect(element.tagName).toBe('SPAN');
    });
  });

  describe('Security - Safe Protocols', () => {
    it('allows mailto: protocol', () => {
      render(<LinkRenderer href="mailto:test@example.com">Email</LinkRenderer>);
      const link = screen.getByText('Email');
      expect(link.tagName).toBe('A');
      expect(link).toHaveAttribute('href', 'mailto:test@example.com');
    });

    it('allows tel: protocol', () => {
      render(<LinkRenderer href="tel:+1234567890">Call</LinkRenderer>);
      const link = screen.getByText('Call');
      expect(link.tagName).toBe('A');
      expect(link).toHaveAttribute('href', 'tel:+1234567890');
    });

    it('does not show external indicator for mailto', () => {
      const { container } = render(<LinkRenderer href="mailto:test@example.com">Email</LinkRenderer>);
      expect(container.querySelector('svg')).not.toBeInTheDocument();
    });

    it('does not show external indicator for tel', () => {
      const { container } = render(<LinkRenderer href="tel:+1234567890">Call</LinkRenderer>);
      expect(container.querySelector('svg')).not.toBeInTheDocument();
    });
  });

  describe('URL Validation', () => {
    it('handles empty href gracefully', () => {
      render(<LinkRenderer href="">Empty</LinkRenderer>);
      const element = screen.getByText('Empty');
      expect(element.tagName).toBe('SPAN');
    });

    it('handles null href gracefully', () => {
      render(<LinkRenderer href={undefined}>Null</LinkRenderer>);
      const element = screen.getByText('Null');
      expect(element.tagName).toBe('SPAN');
    });

    it('handles malformed URLs gracefully', () => {
      render(<LinkRenderer href="ht!tp://bad-url">Bad</LinkRenderer>);
      const element = screen.getByText('Bad');
      expect(element.tagName).toBe('SPAN');
    });
  });

  describe('Accessibility', () => {
    it('adds descriptive aria-label for external links', () => {
      render(<LinkRenderer href="https://example.com">External</LinkRenderer>);
      const link = screen.getByText('External');
      expect(link).toHaveAttribute('aria-label', 'External (opens in new tab)');
    });

    it('does not add aria-label for internal links', () => {
      render(<LinkRenderer href="/internal">Internal</LinkRenderer>);
      const link = screen.getByText('Internal');
      expect(link).not.toHaveAttribute('aria-label');
    });

    it('respects title prop', () => {
      render(<LinkRenderer href="https://example.com" title="Example Site">Link</LinkRenderer>);
      const link = screen.getByText('Link');
      expect(link).toHaveAttribute('title', 'Example Site');
    });
  });

  describe('Helper Functions', () => {
    describe('isUrlSafe', () => {
      it('returns true for http URLs', () => {
        expect(isUrlSafe('http://example.com')).toBe(true);
      });

      it('returns true for https URLs', () => {
        expect(isUrlSafe('https://example.com')).toBe(true);
      });

      it('returns true for relative URLs', () => {
        expect(isUrlSafe('/path')).toBe(true);
        expect(isUrlSafe('#anchor')).toBe(true);
        expect(isUrlSafe('./relative')).toBe(true);
      });

      it('returns true for mailto URLs', () => {
        expect(isUrlSafe('mailto:test@example.com')).toBe(true);
      });

      it('returns true for tel URLs', () => {
        expect(isUrlSafe('tel:+1234567890')).toBe(true);
      });

      it('returns false for javascript: URLs', () => {
        expect(isUrlSafe('javascript:alert(1)')).toBe(false);
      });

      it('returns false for data: URLs', () => {
        expect(isUrlSafe('data:text/html,<script>')).toBe(false);
      });

      it('returns false for file: URLs', () => {
        expect(isUrlSafe('file:///etc/passwd')).toBe(false);
      });

      it('returns false for empty string', () => {
        expect(isUrlSafe('')).toBe(false);
      });

      it('returns false for null', () => {
        expect(isUrlSafe(null as any)).toBe(false);
      });
    });

    describe('isExternalUrl', () => {
      it('returns true for http URLs', () => {
        expect(isExternalUrl('http://example.com')).toBe(true);
      });

      it('returns true for https URLs', () => {
        expect(isExternalUrl('https://example.com')).toBe(true);
      });

      it('returns false for relative URLs', () => {
        expect(isExternalUrl('/path')).toBe(false);
        expect(isExternalUrl('#anchor')).toBe(false);
        expect(isExternalUrl('./relative')).toBe(false);
      });

      it('returns false for mailto URLs', () => {
        expect(isExternalUrl('mailto:test@example.com')).toBe(false);
      });

      it('returns false for tel URLs', () => {
        expect(isExternalUrl('tel:+1234567890')).toBe(false);
      });

      it('returns false for empty string', () => {
        expect(isExternalUrl('')).toBe(false);
      });
    });
  });
});
