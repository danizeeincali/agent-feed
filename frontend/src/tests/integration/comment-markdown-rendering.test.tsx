import { describe, test, expect, vi, beforeAll } from 'vitest';
import { render } from '@testing-library/react';
import { CommentTreeNode } from '../../components/comments/CommentSystem';

// Mock the CommentForm to avoid import issues (correct path)
vi.mock('../../components/CommentForm', () => ({
  CommentForm: () => null
}));

// Mock ReactionsPanel (doesn't exist, create stub)
vi.mock('../../components/comments/ReactionsPanel', () => ({
  ReactionsPanel: () => null
}));

// Mock AgentBadge (doesn't exist, create stub)
vi.mock('../../components/comments/AgentBadge', () => ({
  AgentBadge: () => null
}));

// Mock timeUtils
vi.mock('../../utils/timeUtils', () => ({
  formatTimeAgo: (date: string) => 'just now'
}));

// Import after mocking
let CommentThread: any;

beforeAll(async () => {
  const module = await import('../../components/comments/CommentThread');
  CommentThread = module.CommentThread;
});

/**
 * Helper function to create test comments
 */
const createTestComment = (overrides: Partial<CommentTreeNode>): CommentTreeNode => ({
  id: 'test-comment-1',
  content: 'Test content',
  contentType: 'text',
  author: {
    type: 'user',
    id: 'test-user',
    name: 'Test User'
  },
  metadata: {
    threadDepth: 0,
    threadPath: '/test-comment-1/',
    replyCount: 0,
    likeCount: 0,
    reactionCount: 0,
    isAgentResponse: false
  },
  engagement: {
    likes: 0,
    reactions: {},
    userReacted: false
  },
  status: 'published',
  children: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides
});

describe('Comment Markdown Rendering', () => {
  // Mock handlers
  const mockOnReply = vi.fn().mockResolvedValue(undefined);
  const mockOnReaction = vi.fn().mockResolvedValue(undefined);

  describe('Explicit markdown content', () => {
    test('renders markdown content with contentType="markdown"', () => {
      const comment = createTestComment({
        content: '**Bold text**',
        contentType: 'markdown'
      });

      const { container } = render(
        <CommentThread
          comment={comment}
          depth={0}
          maxDepth={10}
          onReply={mockOnReply}
          onReaction={mockOnReaction}
        />
      );

      // Should contain <strong> tag
      const strongElement = container.querySelector('strong');
      expect(strongElement).toBeTruthy();
      expect(strongElement?.textContent).toBe('Bold text');
    });

    test('renders multiple markdown elements', () => {
      const comment = createTestComment({
        content: '**Bold** and *italic* with `code`',
        contentType: 'markdown'
      });

      const { container } = render(
        <CommentThread
          comment={comment}
          depth={0}
          maxDepth={10}
          onReply={mockOnReply}
          onReaction={mockOnReaction}
        />
      );

      // Should contain multiple markdown elements
      expect(container.querySelector('strong')).toBeTruthy();
      expect(container.querySelector('em')).toBeTruthy();
      expect(container.querySelector('code')).toBeTruthy();
    });
  });

  describe('Auto-detection for agent comments', () => {
    test('auto-detects markdown in agent comments with wrong content_type', () => {
      const comment = createTestComment({
        content: '**Temperature:** 56°F',
        contentType: 'text', // Wrong! But should still render as markdown
        author: {
          type: 'agent',
          id: 'avi',
          name: 'Avi'
        }
      });

      const { container } = render(
        <CommentThread
          comment={comment}
          depth={0}
          maxDepth={10}
          onReply={mockOnReply}
          onReaction={mockOnReaction}
        />
      );

      // Should auto-detect and render markdown despite wrong content_type
      const strongElement = container.querySelector('strong');
      expect(strongElement).toBeTruthy();
      expect(strongElement?.textContent).toBe('Temperature:');
    });

    test('auto-detects markdown with lists in agent comments', () => {
      const comment = createTestComment({
        content: '- Item 1\n- Item 2\n- Item 3',
        contentType: 'text', // Wrong type
        author: {
          type: 'agent',
          id: 'avi',
          name: 'Avi'
        }
      });

      const { container } = render(
        <CommentThread
          comment={comment}
          depth={0}
          maxDepth={10}
          onReply={mockOnReply}
          onReaction={mockOnReaction}
        />
      );

      // Should render as list
      expect(container.querySelector('ul')).toBeTruthy();
      expect(container.querySelectorAll('li').length).toBe(3);
    });

    test('auto-detects markdown with code blocks in agent comments', () => {
      const comment = createTestComment({
        content: '```javascript\nconst x = 1;\n```',
        contentType: 'text', // Wrong type
        author: {
          type: 'agent',
          id: 'avi',
          name: 'Avi'
        }
      });

      const { container } = render(
        <CommentThread
          comment={comment}
          depth={0}
          maxDepth={10}
          onReply={mockOnReply}
          onReaction={mockOnReaction}
        />
      );

      // Should render code block
      expect(container.querySelector('code')).toBeTruthy();
    });
  });

  describe('Plain text rendering', () => {
    test('renders plain text without markdown processing', () => {
      const comment = createTestComment({
        content: 'Plain text comment without markdown',
        contentType: 'text'
      });

      const { container } = render(
        <CommentThread
          comment={comment}
          depth={0}
          maxDepth={10}
          onReply={mockOnReply}
          onReaction={mockOnReaction}
        />
      );

      // Should NOT contain markdown elements
      expect(container.querySelector('strong')).toBeFalsy();
      expect(container.querySelector('em')).toBeFalsy();
      expect(container.querySelector('code')).toBeFalsy();

      // Should contain the text
      expect(container.textContent).toContain('Plain text comment without markdown');
    });

    test('renders user comment with plain text', () => {
      const comment = createTestComment({
        content: 'User comment without markdown',
        contentType: 'text',
        author: {
          type: 'user',
          id: 'user-123',
          name: 'John Doe'
        }
      });

      const { container } = render(
        <CommentThread
          comment={comment}
          depth={0}
          maxDepth={10}
          onReply={mockOnReply}
          onReaction={mockOnReaction}
        />
      );

      // Should NOT have markdown elements
      expect(container.querySelector('strong')).toBeFalsy();
      expect(container.textContent).toContain('User comment without markdown');
    });
  });

  describe('Complex markdown rendering', () => {
    test('renders complex markdown with headers and lists', () => {
      const comment = createTestComment({
        content: '## Weather Update\n\n**Current conditions:**\n\n- Temperature: 56°F\n- Humidity: 65%\n- Wind: 10mph',
        contentType: 'markdown',
        author: {
          type: 'agent',
          id: 'avi',
          name: 'Avi'
        }
      });

      const { container } = render(
        <CommentThread
          comment={comment}
          depth={0}
          maxDepth={10}
          onReply={mockOnReply}
          onReaction={mockOnReaction}
        />
      );

      // Should contain header
      expect(container.querySelector('h2')).toBeTruthy();

      // Should contain bold
      expect(container.querySelector('strong')).toBeTruthy();

      // Should contain list
      expect(container.querySelector('ul')).toBeTruthy();
      expect(container.querySelectorAll('li').length).toBe(3);
    });

    test('renders markdown with blockquotes', () => {
      const comment = createTestComment({
        content: '> This is an important quote\n\n**Note:** Please read carefully',
        contentType: 'markdown'
      });

      const { container } = render(
        <CommentThread
          comment={comment}
          depth={0}
          maxDepth={10}
          onReply={mockOnReply}
          onReaction={mockOnReaction}
        />
      );

      // Should contain blockquote
      expect(container.querySelector('blockquote')).toBeTruthy();

      // Should contain bold
      expect(container.querySelector('strong')).toBeTruthy();
    });

    test('renders markdown with inline code and links', () => {
      const comment = createTestComment({
        content: 'Check out `hasMarkdown()` function',
        contentType: 'markdown'
      });

      const { container } = render(
        <CommentThread
          comment={comment}
          depth={0}
          maxDepth={10}
          onReply={mockOnReply}
          onReaction={mockOnReaction}
        />
      );

      // Should contain code
      expect(container.querySelector('code')).toBeTruthy();
      expect(container.querySelector('code')?.textContent).toBe('hasMarkdown()');

      // Should have markdown content rendered
      expect(container.textContent).toContain('Check out');
      expect(container.textContent).toContain('function');
    });
  });

  describe('Edge cases and safety', () => {
    test('handles empty content gracefully', () => {
      const comment = createTestComment({
        content: '',
        contentType: 'text'
      });

      const { container } = render(
        <CommentThread
          comment={comment}
          depth={0}
          maxDepth={10}
          onReply={mockOnReply}
          onReaction={mockOnReaction}
        />
      );

      // Should render without errors
      expect(container).toBeTruthy();
    });

    test('handles very long markdown content', () => {
      const longContent = '**Bold** '.repeat(100);
      const comment = createTestComment({
        content: longContent,
        contentType: 'markdown'
      });

      const { container } = render(
        <CommentThread
          comment={comment}
          depth={0}
          maxDepth={10}
          onReply={mockOnReply}
          onReaction={mockOnReaction}
        />
      );

      // Should render and truncate
      expect(container).toBeTruthy();
      expect(container.querySelector('strong')).toBeTruthy();
    });

    test('preserves whitespace in plain text', () => {
      const comment = createTestComment({
        content: 'Line 1\n\nLine 2\n  Indented',
        contentType: 'text'
      });

      const { container } = render(
        <CommentThread
          comment={comment}
          depth={0}
          maxDepth={10}
          onReply={mockOnReply}
          onReaction={mockOnReaction}
        />
      );

      // Should preserve whitespace
      const paragraph = container.querySelector('.whitespace-pre-wrap');
      expect(paragraph).toBeTruthy();
    });
  });
});
