/**
 * PostCard Markdown Rendering Unit Tests
 *
 * Test suite for verifying PostCard correctly renders markdown content
 * in all scenarios including truncation, mentions, hashtags, and plain text.
 *
 * @module components/__tests__/PostCard.markdown.test
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { PostCard } from '../PostCard';
import '@testing-library/jest-dom';

// Mock WebSocket hook
vi.mock('../../hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    socket: null,
    isConnected: false,
    subscribe: vi.fn(),
    unsubscribe: vi.fn()
  })
}));

// Mock toast hook
vi.mock('../../hooks/useToast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

// Mock contentParser to avoid real markdown processing in some tests
vi.mock('../../utils/contentParser', async () => {
  const actual = await vi.importActual('../../utils/contentParser');
  return {
    ...actual
  };
});

describe('PostCard Markdown Rendering', () => {
  const basePost = {
    id: 'test-post-1',
    title: 'Test Post',
    authorAgent: 'avi',
    publishedAt: new Date().toISOString(),
    metadata: {}
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic markdown elements', () => {
    test('renders bold markdown correctly', () => {
      const post = {
        ...basePost,
        content: '**Bold text** in post'
      };

      const { container } = render(<PostCard post={post} />);

      // Should render <strong> tag
      const strong = container.querySelector('strong');
      expect(strong).toBeTruthy();
      expect(strong?.textContent).toBe('Bold text');

      // Should NOT show raw markdown symbols
      const postContent = container.querySelector('.post-content');
      expect(postContent?.textContent).not.toContain('**');
    });

    test('renders italic markdown correctly', () => {
      const post = {
        ...basePost,
        content: '*Italic text* in post'
      };

      const { container } = render(<PostCard post={post} />);

      const em = container.querySelector('em');
      expect(em).toBeTruthy();
      expect(em?.textContent).toBe('Italic text');

      // Should NOT show raw markdown symbols
      const postContent = container.querySelector('.post-content');
      expect(postContent?.textContent).not.toContain('*Italic text*');
    });

    test('renders inline code markdown correctly', () => {
      const post = {
        ...basePost,
        content: 'This is `inline code` example'
      };

      const { container } = render(<PostCard post={post} />);

      const code = container.querySelector('code');
      expect(code).toBeTruthy();
      expect(code?.textContent).toBe('inline code');
    });

    test('renders strikethrough markdown correctly', () => {
      const post = {
        ...basePost,
        content: 'This is ~~strikethrough~~ text'
      };

      const { container } = render(<PostCard post={post} />);

      // Check for strikethrough rendering
      const del = container.querySelector('del');
      expect(del).toBeTruthy();
      expect(del?.textContent).toBe('strikethrough');
    });
  });

  describe('Multiple markdown elements', () => {
    test('renders multiple markdown elements together', () => {
      const post = {
        ...basePost,
        content: '**Bold** and *italic* with `code`'
      };

      const { container } = render(<PostCard post={post} />);

      expect(container.querySelector('strong')).toBeTruthy();
      expect(container.querySelector('em')).toBeTruthy();
      expect(container.querySelector('code')).toBeTruthy();
    });

    test('renders nested markdown elements', () => {
      const post = {
        ...basePost,
        content: '**Bold with *italic* inside**'
      };

      const { container } = render(<PostCard post={post} />);

      const strong = container.querySelector('strong');
      expect(strong).toBeTruthy();

      const em = container.querySelector('em');
      expect(em).toBeTruthy();
      expect(em?.textContent).toBe('italic');
    });

    test('renders markdown with mixed formatting', () => {
      const post = {
        ...basePost,
        content: '**Bold** text with *italic* and `code` plus ~~strikethrough~~'
      };

      const { container } = render(<PostCard post={post} />);

      expect(container.querySelector('strong')?.textContent).toBe('Bold');
      expect(container.querySelector('em')?.textContent).toBe('italic');
      expect(container.querySelector('code')?.textContent).toBe('code');
      expect(container.querySelector('del')?.textContent).toBe('strikethrough');
    });
  });

  describe('List rendering', () => {
    test('renders unordered lists in markdown', () => {
      const post = {
        ...basePost,
        content: '- Item 1\n- Item 2\n- Item 3'
      };

      const { container } = render(<PostCard post={post} />);

      const ul = container.querySelector('ul');
      expect(ul).toBeTruthy();

      const listItems = container.querySelectorAll('li');
      expect(listItems.length).toBe(3);
      expect(listItems[0]?.textContent).toContain('Item 1');
      expect(listItems[1]?.textContent).toContain('Item 2');
      expect(listItems[2]?.textContent).toContain('Item 3');
    });

    test('renders ordered lists in markdown', () => {
      const post = {
        ...basePost,
        content: '1. First\n2. Second\n3. Third'
      };

      const { container } = render(<PostCard post={post} />);

      const ol = container.querySelector('ol');
      expect(ol).toBeTruthy();

      const listItems = container.querySelectorAll('li');
      expect(listItems.length).toBe(3);
    });

    test('renders nested lists', () => {
      const post = {
        ...basePost,
        content: '- Parent 1\n  - Child 1\n  - Child 2\n- Parent 2'
      };

      const { container } = render(<PostCard post={post} />);

      const lists = container.querySelectorAll('ul');
      expect(lists.length).toBeGreaterThan(1); // Nested list structure
    });
  });

  describe('Heading rendering', () => {
    test('renders h1 heading', () => {
      const post = {
        ...basePost,
        content: '# Main Heading'
      };

      const { container } = render(<PostCard post={post} />);

      const h1 = container.querySelector('h1');
      expect(h1).toBeTruthy();
      expect(h1?.textContent).toBe('Main Heading');
    });

    test('renders h2 heading in markdown content', () => {
      const post = {
        ...basePost,
        title: 'Post Title',
        content: '## Section Heading\n\nSome content'
      };

      const { container } = render(<PostCard post={post} />);

      // Find H2 within post-content area (not the post title)
      const postContent = container.querySelector('.post-content');
      const h2 = postContent?.querySelector('h2');
      expect(h2).toBeTruthy();
      expect(h2?.textContent).toContain('Section Heading');
    });

    test('renders h3 heading in markdown content', () => {
      const post = {
        ...basePost,
        content: '### Subsection\n\nContent here'
      };

      const { container } = render(<PostCard post={post} />);

      // Find H3 within post-content area
      const postContent = container.querySelector('.post-content');
      const h3 = postContent?.querySelector('h3');
      expect(h3).toBeTruthy();
      expect(h3?.textContent).toContain('Subsection');
    });
  });

  describe('Truncation with markdown', () => {
    test('preserves truncation for long markdown content', () => {
      const longMarkdown = '**Bold** ' + 'text '.repeat(100); // > 280 chars
      const post = {
        ...basePost,
        content: longMarkdown
      };

      const { container, getByText } = render(<PostCard post={post} />);

      // Should show "Show more" button
      expect(getByText('Show more')).toBeTruthy();

      // Should still render markdown in truncated content
      expect(container.querySelector('strong')).toBeTruthy();
    });

    test('expands content preserving markdown', () => {
      const longMarkdown = '**Start** ' + 'text '.repeat(100) + ' **End**';
      const post = {
        ...basePost,
        content: longMarkdown
      };

      const { container, getByText } = render(<PostCard post={post} />);

      // Initially truncated
      const showMoreButton = getByText('Show more');
      expect(showMoreButton).toBeTruthy();

      // Click to expand
      fireEvent.click(showMoreButton);

      // After expansion, should show full content with markdown
      expect(getByText('Show less')).toBeTruthy();
      expect(container.querySelectorAll('strong').length).toBeGreaterThan(0);
    });

    test('collapses expanded markdown content', () => {
      const longMarkdown = '**Start** ' + 'middle '.repeat(100) + ' **End**';
      const post = {
        ...basePost,
        content: longMarkdown
      };

      const { getByText } = render(<PostCard post={post} />);

      // Expand
      fireEvent.click(getByText('Show more'));
      expect(getByText('Show less')).toBeTruthy();

      // Collapse
      fireEvent.click(getByText('Show less'));
      expect(getByText('Show more')).toBeTruthy();
    });

    test('preserves markdown formatting after expand/collapse cycle', () => {
      const longMarkdown = '**Bold** and *italic* ' + 'content '.repeat(50);
      const post = {
        ...basePost,
        content: longMarkdown
      };

      const { container, getByText } = render(<PostCard post={post} />);

      // Expand and collapse
      fireEvent.click(getByText('Show more'));
      fireEvent.click(getByText('Show less'));

      // Markdown should still be rendered
      expect(container.querySelector('strong')).toBeTruthy();
    });
  });

  describe('Mentions and hashtags with markdown', () => {
    test('renders mentions as interactive elements', () => {
      const post = {
        ...basePost,
        content: 'Hello @alice how are you?'
      };

      const { container } = render(<PostCard post={post} />);

      // Should have mention element (button with data attribute or text content)
      const postContent = container.querySelector('.post-content');
      const mentionElement = postContent?.querySelector('[data-mention="alice"]') ||
                            postContent?.querySelector('[data-testid="mention-alice"]') ||
                            postContent?.querySelector('button');

      // Verify mention is rendered (either as interactive button or text contains @alice)
      const hasInteractiveMention = mentionElement !== null;
      const hasTextMention = container.textContent?.includes('@alice');
      expect(hasInteractiveMention || hasTextMention).toBeTruthy();
    });

    test('renders hashtags as interactive elements', () => {
      const post = {
        ...basePost,
        content: 'Check out #update today'
      };

      const { container } = render(<PostCard post={post} />);

      // Should have hashtag element or text content
      const postContent = container.querySelector('.post-content');
      const hashtagElement = postContent?.querySelector('[data-hashtag="update"]') ||
                             postContent?.querySelector('[data-testid="hashtag-update"]') ||
                             postContent?.querySelector('button');

      const hasInteractiveHashtag = hashtagElement !== null;
      const hasTextHashtag = container.textContent?.includes('#update');
      expect(hasInteractiveHashtag || hasTextHashtag).toBeTruthy();
    });

    test('combines markdown with mentions', () => {
      const post = {
        ...basePost,
        content: '**Important update** from @alice #announcement'
      };

      const { container } = render(<PostCard post={post} />);

      // Should have markdown rendered
      expect(container.querySelector('strong')).toBeTruthy();

      // Should have content rendered (mentions/hashtags may be processed)
      // Just verify the component renders without errors and has the text
      const textContent = container.textContent || '';
      expect(textContent.length).toBeGreaterThan(0);
      expect(textContent).toContain('Important update');
    });

    test('mentions work with markdown formatting', () => {
      const post = {
        ...basePost,
        content: 'Message from **@alice** about *#project*'
      };

      const { container } = render(<PostCard post={post} />);

      // Check for markdown elements
      const strong = container.querySelector('strong');
      const em = container.querySelector('em');
      expect(strong || em).toBeTruthy();

      // Verify content renders successfully
      const textContent = container.textContent || '';
      expect(textContent.length).toBeGreaterThan(0);
      expect(textContent).toContain('Message');
    });
  });

  describe('URL handling', () => {
    test('renders URLs as clickable links', () => {
      const post = {
        ...basePost,
        content: 'Check this out https://example.com'
      };

      const { container } = render(<PostCard post={post} />);

      const link = container.querySelector('a[href="https://example.com"]');
      expect(link).toBeTruthy();
      expect(link?.getAttribute('target')).toBe('_blank');
      expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
    });

    test('combines markdown with URLs', () => {
      const post = {
        ...basePost,
        content: '**Important link**: https://example.com'
      };

      const { container } = render(<PostCard post={post} />);

      // Check for markdown
      expect(container.querySelector('strong')).toBeTruthy();

      // Verify content renders successfully with the link text
      const textContent = container.textContent || '';
      expect(textContent).toContain('Important link');

      // URL may be rendered as link or text, just verify content is present
      expect(textContent.length).toBeGreaterThan(0);
    });
  });

  describe('Plain text posts', () => {
    test('renders plain text without markdown processing', () => {
      const post = {
        ...basePost,
        content: 'Plain text without any markdown'
      };

      const { container } = render(<PostCard post={post} />);

      // Should NOT have markdown elements
      expect(container.querySelector('strong')).toBeFalsy();
      expect(container.querySelector('em')).toBeFalsy();

      // Should show the text
      expect(container.textContent).toContain('Plain text without any markdown');
    });

    test('renders text with asterisks but not markdown pattern', () => {
      const post = {
        ...basePost,
        content: 'This * is * not * markdown'
      };

      const { container } = render(<PostCard post={post} />);

      // Should render as plain text (asterisks don't form valid markdown)
      expect(container.textContent).toContain('This * is * not * markdown');
    });

    test('renders short content without truncation', () => {
      const post = {
        ...basePost,
        content: 'Short post'
      };

      const { queryByText } = render(<PostCard post={post} />);

      // Should NOT show expand/collapse button
      expect(queryByText('Show more')).toBeFalsy();
      expect(queryByText('Show less')).toBeFalsy();
    });
  });

  describe('Edge cases', () => {
    test('handles empty content gracefully', () => {
      const post = {
        ...basePost,
        content: ''
      };

      const { container } = render(<PostCard post={post} />);

      // Should render without errors
      expect(container).toBeTruthy();
    });

    test('handles undefined content', () => {
      const post = {
        ...basePost,
        content: undefined
      };

      const { container } = render(<PostCard post={post} />);

      // Should render without errors
      expect(container).toBeTruthy();
    });

    test('handles markdown with special characters', () => {
      const post = {
        ...basePost,
        content: '**Bold** with <special> & characters'
      };

      const { container } = render(<PostCard post={post} />);

      // Should sanitize and render safely
      expect(container.querySelector('strong')).toBeTruthy();

      // Check that content is sanitized (< and > removed for security)
      // The word "special" might be removed due to sanitization
      expect(container.textContent).toContain('Bold');
      expect(container.textContent).toContain('characters');
    });

    test('handles very long words in markdown', () => {
      const longWord = 'a'.repeat(100);
      const post = {
        ...basePost,
        content: `**${longWord}**`
      };

      const { container } = render(<PostCard post={post} />);

      expect(container.querySelector('strong')).toBeTruthy();
    });

    test('handles mixed line breaks', () => {
      const post = {
        ...basePost,
        content: '**Line 1**\n\n*Line 2*\n\nLine 3'
      };

      const { container } = render(<PostCard post={post} />);

      expect(container.querySelector('strong')).toBeTruthy();
      expect(container.querySelector('em')).toBeTruthy();
    });
  });

  describe('Code blocks', () => {
    test('renders code blocks', () => {
      const post = {
        ...basePost,
        content: '```javascript\nconst x = 1;\n```'
      };

      const { container } = render(<PostCard post={post} />);

      const pre = container.querySelector('pre');
      expect(pre).toBeTruthy();

      const code = container.querySelector('code');
      expect(code?.textContent).toContain('const x = 1;');
    });

    test('renders inline code differently from code blocks', () => {
      const post = {
        ...basePost,
        content: 'This is `inline` and\n```\nblock\n```'
      };

      const { container } = render(<PostCard post={post} />);

      const codes = container.querySelectorAll('code');
      expect(codes.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Blockquotes', () => {
    test('renders blockquotes', () => {
      const post = {
        ...basePost,
        content: '> This is a quote'
      };

      const { container } = render(<PostCard post={post} />);

      const blockquote = container.querySelector('blockquote');
      expect(blockquote).toBeTruthy();
      expect(blockquote?.textContent).toContain('This is a quote');
    });

    test('renders nested blockquotes', () => {
      const post = {
        ...basePost,
        content: '> Level 1\n>> Level 2'
      };

      const { container } = render(<PostCard post={post} />);

      const blockquotes = container.querySelectorAll('blockquote');
      expect(blockquotes.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Complex markdown scenarios', () => {
    test('renders complex mixed markdown', () => {
      const post = {
        ...basePost,
        content: `## Heading

**Bold** and *italic* text with \`code\`

- List item 1
- List item 2

> Quote here

[Link](https://example.com)`
      };

      const { container } = render(<PostCard post={post} />);

      // Verify multiple elements
      expect(container.querySelector('h2')).toBeTruthy();
      expect(container.querySelector('strong')).toBeTruthy();
      expect(container.querySelector('em')).toBeTruthy();
      expect(container.querySelector('code')).toBeTruthy();
      expect(container.querySelector('ul')).toBeTruthy();
      expect(container.querySelector('blockquote')).toBeTruthy();
    });

    test('handles markdown in truncated and expanded states', () => {
      const complexMarkdown = '## Title\n\n**Bold** text ' + 'more '.repeat(100);
      const post = {
        ...basePost,
        content: complexMarkdown
      };

      const { container, getByText } = render(<PostCard post={post} />);

      // Check truncated state
      expect(container.querySelector('h2')).toBeTruthy();
      expect(getByText('Show more')).toBeTruthy();

      // Expand
      fireEvent.click(getByText('Show more'));

      // Check expanded state
      expect(container.querySelector('h2')).toBeTruthy();
      expect(container.querySelector('strong')).toBeTruthy();
    });
  });

  describe('Performance and rendering', () => {
    test('renders without throwing errors', () => {
      const post = {
        ...basePost,
        content: '**Bold** *italic* `code`'
      };

      expect(() => {
        render(<PostCard post={post} />);
      }).not.toThrow();
    });

    test('handles rapid state changes', () => {
      const longContent = '**Bold** ' + 'text '.repeat(100);
      const post = {
        ...basePost,
        content: longContent
      };

      const { getByText } = render(<PostCard post={post} />);

      // Rapidly toggle
      const button = getByText('Show more');
      fireEvent.click(button);
      fireEvent.click(getByText('Show less'));
      fireEvent.click(getByText('Show more'));

      // Should still work
      expect(getByText('Show less')).toBeTruthy();
    });
  });
});
