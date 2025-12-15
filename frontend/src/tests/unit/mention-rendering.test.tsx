/**
 * Unit Tests: Agent Display Names & Mention Rendering
 *
 * Tests for SPARC-UI-UX-FIXES-SYSTEM-INITIALIZATION.md
 * Agent 3 deliverables:
 * - Agent names display correctly (not "User")
 * - @mentions render as clickable buttons
 * - No ___MENTION___ placeholders visible
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MarkdownContent } from '../../components/MarkdownContent';

describe('Agent Display Names & Mention Rendering', () => {
  describe('Mention Rendering', () => {
    it('should render @mentions as clickable buttons', () => {
      const content = 'Check out @personal-todos-agent for task management';
      const onMentionClick = jest.fn();

      render(<MarkdownContent content={content} onMentionClick={onMentionClick} />);

      const mention = screen.getByTestId('mention-personal-todos-agent');
      expect(mention).toBeInTheDocument();
      expect(mention.tagName).toBe('BUTTON');
      expect(mention).toHaveTextContent('@personal-todos-agent');
    });

    it('should not show ___MENTION___ placeholders', () => {
      const content = 'Contact @lambda-vi for coordination';

      const { container } = render(<MarkdownContent content={content} />);

      // Check that no placeholder text is visible
      expect(container.textContent).not.toContain('___MENTION');
      expect(container.textContent).not.toContain('___MENTION_0___');
      expect(container.textContent).not.toContain('___MENTION_1___');
    });

    it('should handle multiple @mentions in content', () => {
      const content = 'Talk to @lambda-vi and @get-to-know-you-agent';

      render(<MarkdownContent content={content} />);

      const mention1 = screen.getByTestId('mention-lambda-vi');
      const mention2 = screen.getByTestId('mention-get-to-know-you-agent');

      expect(mention1).toBeInTheDocument();
      expect(mention2).toBeInTheDocument();
      expect(mention1.tagName).toBe('BUTTON');
      expect(mention2.tagName).toBe('BUTTON');
    });

    it('should trigger onMentionClick when mention button is clicked', () => {
      const content = 'Ask @lambda-vi about agents';
      const onMentionClick = jest.fn();

      render(<MarkdownContent content={content} onMentionClick={onMentionClick} />);

      const mention = screen.getByTestId('mention-lambda-vi');
      fireEvent.click(mention);

      expect(onMentionClick).toHaveBeenCalledWith('lambda-vi');
    });

    it('should render @mentions in list items', () => {
      const content = `# Features
- Contact @lambda-vi for coordination
- Use @personal-todos-agent for tasks`;

      render(<MarkdownContent content={content} enableMarkdown={true} />);

      const mention1 = screen.getByTestId('mention-lambda-vi');
      const mention2 = screen.getByTestId('mention-personal-todos-agent');

      expect(mention1).toBeInTheDocument();
      expect(mention2).toBeInTheDocument();
    });

    it('should render @mentions in table cells', () => {
      const content = `| Agent | Description |
|-------|-------------|
| @lambda-vi | Coordinator |
| @get-to-know-you-agent | Onboarding |`;

      render(<MarkdownContent content={content} enableMarkdown={true} />);

      const mention1 = screen.getByTestId('mention-lambda-vi');
      const mention2 = screen.getByTestId('mention-get-to-know-you-agent');

      expect(mention1).toBeInTheDocument();
      expect(mention2).toBeInTheDocument();
    });

    it('should render @mentions with proper styling', () => {
      const content = '@lambda-vi is ready to help';

      render(<MarkdownContent content={content} />);

      const mention = screen.getByTestId('mention-lambda-vi');

      // Check for blue color classes
      expect(mention.className).toContain('text-blue-600');
      expect(mention.className).toContain('bg-blue-50');
    });

    it('should handle @mentions in paragraphs with markdown', () => {
      const content = `This is **important**: contact @lambda-vi for *urgent* matters.`;

      render(<MarkdownContent content={content} enableMarkdown={true} />);

      const mention = screen.getByTestId('mention-lambda-vi');
      expect(mention).toBeInTheDocument();

      // Verify markdown is also rendered
      const container = screen.getByRole('article');
      expect(container.textContent).toContain('important');
      expect(container.textContent).toContain('urgent');
    });
  });

  describe('Hashtag Rendering', () => {
    it('should render #hashtags as clickable buttons', () => {
      const content = 'Check #updates for latest news';
      const onHashtagClick = jest.fn();

      render(<MarkdownContent content={content} onHashtagClick={onHashtagClick} />);

      const hashtag = screen.getByTestId('hashtag-updates');
      expect(hashtag).toBeInTheDocument();
      expect(hashtag.tagName).toBe('BUTTON');
      expect(hashtag).toHaveTextContent('#updates');
    });

    it('should not show ___HASHTAG___ placeholders', () => {
      const content = 'See #productivity tips';

      const { container } = render(<MarkdownContent content={content} />);

      expect(container.textContent).not.toContain('___HASHTAG');
    });

    it('should trigger onHashtagClick when hashtag button is clicked', () => {
      const content = 'Follow #productivity for tips';
      const onHashtagClick = jest.fn();

      render(<MarkdownContent content={content} onHashtagClick={onHashtagClick} />);

      const hashtag = screen.getByTestId('hashtag-productivity');
      fireEvent.click(hashtag);

      expect(onHashtagClick).toHaveBeenCalledWith('productivity');
    });
  });

  describe('URL Rendering', () => {
    it('should render URLs as clickable links', () => {
      const content = 'Visit https://example.com for info';

      render(<MarkdownContent content={content} enableLinkPreviews={true} />);

      const link = screen.getByTestId('url-0');
      expect(link).toBeInTheDocument();
      expect(link.tagName).toBe('A');
      expect(link).toHaveAttribute('href', 'https://example.com');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should not show ___URL___ placeholders', () => {
      const content = 'Go to https://example.com';

      const { container } = render(<MarkdownContent content={content} enableLinkPreviews={true} />);

      expect(container.textContent).not.toContain('___URL');
    });
  });

  describe('Combined Special Tokens', () => {
    it('should handle mentions, hashtags, and URLs together', () => {
      const content = 'Ask @lambda-vi about #productivity at https://example.com';

      render(<MarkdownContent content={content} enableLinkPreviews={true} />);

      const mention = screen.getByTestId('mention-lambda-vi');
      const hashtag = screen.getByTestId('hashtag-productivity');
      const url = screen.getByTestId('url-0');

      expect(mention).toBeInTheDocument();
      expect(hashtag).toBeInTheDocument();
      expect(url).toBeInTheDocument();

      // No placeholders
      const container = screen.getByRole('article');
      expect(container.textContent).not.toContain('___MENTION');
      expect(container.textContent).not.toContain('___HASHTAG');
      expect(container.textContent).not.toContain('___URL');
    });

    it('should preserve order of mixed content', () => {
      const content = 'First @lambda-vi then #update finally https://example.com';

      const { container } = render(
        <MarkdownContent content={content} enableLinkPreviews={true} />
      );

      const text = container.textContent || '';

      // Check order is preserved
      const mentionIndex = text.indexOf('@lambda-vi');
      const hashtagIndex = text.indexOf('#update');
      const urlIndex = text.indexOf('https://example.com');

      expect(mentionIndex).toBeLessThan(hashtagIndex);
      expect(hashtagIndex).toBeLessThan(urlIndex);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content', () => {
      const { container } = render(<MarkdownContent content="" />);

      const article = screen.getByRole('article');
      expect(article).toBeInTheDocument();
    });

    it('should handle content with no special tokens', () => {
      const content = 'Just regular text without any special tokens';

      const { container } = render(<MarkdownContent content={content} />);

      expect(container.textContent).toContain('Just regular text');
    });

    it('should handle malformed mentions gracefully', () => {
      const content = '@ space-after or @-dash-first';

      const { container } = render(<MarkdownContent content={content} />);

      // Should not crash, content should be displayed
      expect(container).toBeInTheDocument();
    });
  });
});
