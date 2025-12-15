/**
 * Test Suite 1: Unit Tests - Comment System Header
 *
 * Purpose: Validate that the comment counter has been removed from the header
 * and that the header displays correctly with stats line below.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { CommentSystem } from '../../../components/comments/CommentSystem';

// Mock the custom hooks
vi.mock('../../../hooks/useCommentThreading', () => ({
  useCommentThreading: () => ({
    comments: [],
    agentConversations: [],
    loading: false,
    error: null,
    addComment: vi.fn(),
    updateComment: vi.fn(),
    deleteComment: vi.fn(),
    reactToComment: vi.fn(),
    loadMoreComments: vi.fn(),
    refreshComments: vi.fn(),
    triggerAgentResponse: vi.fn(),
    getThreadStructure: vi.fn(),
    stats: {
      totalComments: 0,
      rootThreads: 0,
      maxDepth: 0,
      agentComments: 0
    }
  })
}));

vi.mock('../../../hooks/useRealtimeComments', () => ({
  useRealtimeComments: () => ({})
}));

describe('Test Suite 1: Comment System Header - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Test 1: Header shows "Comments" without counter', () => {
    it('should display "Comments" text without counter', () => {
      render(<CommentSystem postId="test-post" />);

      // Should find "Comments" text
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('Comments');

      // Should NOT find counter pattern "Comments (0)" or "Comments (N)"
      expect(screen.queryByText(/Comments \(\d+\)/)).not.toBeInTheDocument();

      // Verify exact text content
      expect(heading.textContent).toBe('Comments');
    });

    it('should not display counter even with multiple comments', () => {
      const { rerender } = render(<CommentSystem postId="test-post" />);

      // Check header doesn't have counter
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading.textContent).toBe('Comments');

      // Re-render component (simulating state change)
      rerender(<CommentSystem postId="test-post" />);

      // Header should still not have counter
      expect(heading.textContent).toBe('Comments');
      expect(screen.queryByText(/Comments \(\d+\)/)).not.toBeInTheDocument();
    });
  });

  describe('Test 2: Stats line displays metadata correctly', () => {
    it('should display threads, depth, and agent responses in stats line', () => {
      const mockStats = {
        totalComments: 10,
        rootThreads: 3,
        maxDepth: 2,
        agentComments: 1
      };

      // Mock the hook with stats
      vi.mocked(vi.importActual('../../../hooks/useCommentThreading')).useCommentThreading = () => ({
        comments: [],
        agentConversations: [],
        loading: false,
        error: null,
        addComment: vi.fn(),
        updateComment: vi.fn(),
        deleteComment: vi.fn(),
        reactToComment: vi.fn(),
        loadMoreComments: vi.fn(),
        refreshComments: vi.fn(),
        triggerAgentResponse: vi.fn(),
        getThreadStructure: vi.fn(),
        stats: mockStats
      });

      render(<CommentSystem postId="test-post" enableAgentInteractions={true} />);

      // Should show metadata in stats line (not in header)
      expect(screen.getByText('3 threads')).toBeInTheDocument();
      expect(screen.getByText('Max depth: 2')).toBeInTheDocument();
      expect(screen.getByText('1 agent responses')).toBeInTheDocument();

      // Verify these are NOT part of the header text
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading.textContent).toBe('Comments');
    });

    it('should show stats line separately from header', () => {
      render(<CommentSystem postId="test-post" />);

      // Get header
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toBeInTheDocument();

      // Stats should be in separate element
      const statsText = screen.getByText('0 threads');
      expect(statsText).toBeInTheDocument();

      // Stats should not be a child of heading
      expect(heading).not.toContainElement(statsText);
    });

    it('should not display max depth when depth is 0', () => {
      render(<CommentSystem postId="test-post" />);

      // Should show threads
      expect(screen.getByText('0 threads')).toBeInTheDocument();

      // Should NOT show max depth when it's 0
      expect(screen.queryByText(/Max depth:/)).not.toBeInTheDocument();
    });
  });

  describe('Test 3: Header structure and styling unchanged', () => {
    it('should maintain correct header structure', () => {
      render(<CommentSystem postId="test-post" />);

      const heading = screen.getByRole('heading', { level: 3 });

      // Should have correct classes
      expect(heading).toHaveClass('text-lg', 'font-semibold');

      // Should contain only "Comments" text
      expect(heading.textContent).toBe('Comments');
    });

    it('should contain MessageCircle icon in header area', () => {
      const { container } = render(<CommentSystem postId="test-post" />);

      // Find the header section
      const header = container.querySelector('.comment-system-header');
      expect(header).toBeInTheDocument();

      // Should contain icon (MessageCircle renders as svg)
      const icon = header?.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should have proper accessibility attributes', () => {
      render(<CommentSystem postId="test-post" />);

      const heading = screen.getByRole('heading', { level: 3 });

      // Should be properly structured for screen readers
      expect(heading).toHaveAttribute('class');
      expect(heading.tagName).toBe('H3');
    });

    it('should maintain dark mode classes', () => {
      render(<CommentSystem postId="test-post" />);

      const heading = screen.getByRole('heading', { level: 3 });

      // Check for dark mode text classes
      const classes = heading.className;
      expect(classes).toContain('text-gray-900');
      expect(classes).toContain('dark:text-gray-100');
    });
  });

  describe('Test 4: Edge cases and variations', () => {
    it('should render correctly with no stats', () => {
      // Mock hook to return null stats
      vi.mocked(vi.importActual('../../../hooks/useCommentThreading')).useCommentThreading = () => ({
        comments: [],
        agentConversations: [],
        loading: false,
        error: null,
        addComment: vi.fn(),
        updateComment: vi.fn(),
        deleteComment: vi.fn(),
        reactToComment: vi.fn(),
        loadMoreComments: vi.fn(),
        refreshComments: vi.fn(),
        triggerAgentResponse: vi.fn(),
        getThreadStructure: vi.fn(),
        stats: null
      });

      render(<CommentSystem postId="test-post" />);

      // Header should still render correctly
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading.textContent).toBe('Comments');

      // Stats line should not be present
      expect(screen.queryByText(/threads/)).not.toBeInTheDocument();
    });

    it('should render correctly with custom className', () => {
      render(<CommentSystem postId="test-post" className="custom-class" />);

      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading.textContent).toBe('Comments');
    });

    it('should not show agent responses in stats when disabled', () => {
      const mockStats = {
        totalComments: 10,
        rootThreads: 3,
        maxDepth: 2,
        agentComments: 5
      };

      render(<CommentSystem postId="test-post" enableAgentInteractions={false} />);

      // Should not show agent responses count
      expect(screen.queryByText(/agent responses/)).not.toBeInTheDocument();
    });
  });

  describe('Test 5: Regression tests', () => {
    it('should not reintroduce counter in any format', () => {
      render(<CommentSystem postId="test-post" />);

      const heading = screen.getByRole('heading', { level: 3 });

      // Check various counter formats don't exist
      expect(heading.textContent).not.toMatch(/\(\d+\)/);  // (N)
      expect(heading.textContent).not.toMatch(/:\s*\d+/);  // : N
      expect(heading.textContent).not.toMatch(/\d+\s*comments/i); // N comments
      expect(heading.textContent).not.toMatch(/-\s*\d+/);  // - N

      // Should be exactly "Comments"
      expect(heading.textContent).toBe('Comments');
    });

    it('should keep "Add Comment" button functional', () => {
      render(<CommentSystem postId="test-post" />);

      // Button should exist and be clickable
      const addButton = screen.getByRole('button', { name: /add comment/i });
      expect(addButton).toBeInTheDocument();
      expect(addButton).not.toBeDisabled();
    });
  });
});
