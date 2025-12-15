import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import CommentThread from '../CommentThread';

/**
 * TDD Test Suite for Issue 4: Comment Processing Indicator
 *
 * PROBLEM: No visual feedback while waiting for agent reply
 * EXPECTED: Processing indicator shows after comment submission until reply
 *
 * Test Coverage:
 * - Processing indicator shows after comment submission
 * - Indicator hides when agent reply arrives
 * - Multiple comments can process simultaneously
 * - Timeout clears stale processing states
 * - Visual consistency with post processing pill
 * - Indicator only shows for user's own comments
 */

// Mock WebSocket
const mockSocketOn = vi.fn();
const mockSocketOff = vi.fn();

vi.mock('../hooks/useSocket', () => ({
  default: () => ({
    on: mockSocketOn,
    off: mockSocketOff,
  }),
}));

describe('Issue 4: Comment Processing Indicator', () => {
  let socketEventHandlers: Record<string, Function> = {};

  const mockPost = {
    id: 1,
    content: 'Test post',
    author: 'User',
    created_at: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    socketEventHandlers = {};

    mockSocketOn.mockImplementation((event: string, handler: Function) => {
      socketEventHandlers[event] = handler;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Processing Indicator Display', () => {
    it('should show processing indicator after comment submission', async () => {
      // This test will FAIL until implementation
      const user = userEvent.setup({ delay: null });
      const mockOnCommentSubmit = vi.fn().mockResolvedValue(undefined);

      render(
        <CommentThread
          post={mockPost}
          comments={[]}
          onCommentSubmit={mockOnCommentSubmit}
        />
      );

      const textarea = screen.getByPlaceholderText(/write a comment/i);
      const submitButton = screen.getByRole('button', { name: /post comment/i });

      await user.type(textarea, 'Test comment');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/processing/i)).toBeInTheDocument();
      });
    });

    it('should show processing pill similar to post processing indicator', async () => {
      // This test will FAIL until implementation
      const user = userEvent.setup({ delay: null });
      const mockOnCommentSubmit = vi.fn().mockResolvedValue(undefined);

      render(
        <CommentThread
          post={mockPost}
          comments={[]}
          onCommentSubmit={mockOnCommentSubmit}
        />
      );

      const textarea = screen.getByPlaceholderText(/write a comment/i);
      await user.type(textarea, 'Test comment');
      await user.click(screen.getByRole('button', { name: /post comment/i }));

      await waitFor(() => {
        const processingPill = screen.getByText(/processing/i);
        expect(processingPill).toHaveClass('processing-pill'); // Should have consistent styling
      });
    });

    it('should include loading animation in processing indicator', async () => {
      // This test will FAIL until implementation
      const user = userEvent.setup({ delay: null });
      const mockOnCommentSubmit = vi.fn().mockResolvedValue(undefined);

      render(
        <CommentThread
          post={mockPost}
          comments={[]}
          onCommentSubmit={mockOnCommentSubmit}
        />
      );

      const textarea = screen.getByPlaceholderText(/write a comment/i);
      await user.type(textarea, 'Test comment');
      await user.click(screen.getByRole('button', { name: /post comment/i }));

      await waitFor(() => {
        // Should have loading spinner or animation
        expect(screen.getByRole('status')).toBeInTheDocument();
      });
    });
  });

  describe('Processing Indicator Removal', () => {
    it('should hide indicator when agent reply arrives via WebSocket', async () => {
      // This test will FAIL until implementation
      const user = userEvent.setup({ delay: null });
      const mockOnCommentSubmit = vi.fn().mockResolvedValue({
        id: 1,
        post_id: 1,
        content: 'Test comment',
        created_at: new Date().toISOString(),
      });

      render(
        <CommentThread
          post={mockPost}
          comments={[]}
          onCommentSubmit={mockOnCommentSubmit}
        />
      );

      const textarea = screen.getByPlaceholderText(/write a comment/i);
      await user.type(textarea, 'Test comment');
      await user.click(screen.getByRole('button', { name: /post comment/i }));

      await waitFor(() => {
        expect(screen.getByText(/processing/i)).toBeInTheDocument();
      });

      // Simulate agent reply via WebSocket
      const commentCreatedHandler = socketEventHandlers['comment:created'];
      commentCreatedHandler({
        postId: 1,
        comment: {
          id: 2,
          post_id: 1,
          content: 'Agent reply',
          created_at: new Date().toISOString(),
          author_agent: 10,
        },
      });

      await waitFor(() => {
        expect(screen.queryByText(/processing/i)).not.toBeInTheDocument();
      });
    });

    it('should hide indicator on timeout (30 seconds)', async () => {
      // This test will FAIL until implementation
      const user = userEvent.setup({ delay: null });
      const mockOnCommentSubmit = vi.fn().mockResolvedValue({
        id: 1,
        post_id: 1,
        content: 'Test comment',
        created_at: new Date().toISOString(),
      });

      render(
        <CommentThread
          post={mockPost}
          comments={[]}
          onCommentSubmit={mockOnCommentSubmit}
        />
      );

      const textarea = screen.getByPlaceholderText(/write a comment/i);
      await user.type(textarea, 'Test comment');
      await user.click(screen.getByRole('button', { name: /post comment/i }));

      await waitFor(() => {
        expect(screen.getByText(/processing/i)).toBeInTheDocument();
      });

      // Fast-forward 30 seconds
      vi.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(screen.queryByText(/processing/i)).not.toBeInTheDocument();
      });
    });

    it('should clear timeout when agent reply arrives before timeout', async () => {
      // This test will FAIL until implementation
      const user = userEvent.setup({ delay: null });
      const mockOnCommentSubmit = vi.fn().mockResolvedValue({
        id: 1,
        post_id: 1,
        content: 'Test comment',
        created_at: new Date().toISOString(),
      });

      render(
        <CommentThread
          post={mockPost}
          comments={[]}
          onCommentSubmit={mockOnCommentSubmit}
        />
      );

      const textarea = screen.getByPlaceholderText(/write a comment/i);
      await user.type(textarea, 'Test comment');
      await user.click(screen.getByRole('button', { name: /post comment/i }));

      // Fast-forward 10 seconds
      vi.advanceTimersByTime(10000);

      // Agent replies
      const commentCreatedHandler = socketEventHandlers['comment:created'];
      commentCreatedHandler({
        postId: 1,
        comment: {
          id: 2,
          post_id: 1,
          content: 'Agent reply',
          author_agent: 10,
        },
      });

      await waitFor(() => {
        expect(screen.queryByText(/processing/i)).not.toBeInTheDocument();
      });

      // Fast-forward remaining time - should not re-show indicator
      vi.advanceTimersByTime(20000);

      expect(screen.queryByText(/processing/i)).not.toBeInTheDocument();
    });
  });

  describe('Multiple Comments Processing', () => {
    it('should handle multiple processing comments simultaneously', async () => {
      // This test will FAIL until implementation
      const user = userEvent.setup({ delay: null });
      const mockOnCommentSubmit = vi.fn()
        .mockResolvedValueOnce({ id: 1, content: 'Comment 1' })
        .mockResolvedValueOnce({ id: 2, content: 'Comment 2' });

      render(
        <CommentThread
          post={mockPost}
          comments={[]}
          onCommentSubmit={mockOnCommentSubmit}
        />
      );

      const textarea = screen.getByPlaceholderText(/write a comment/i);

      // Submit first comment
      await user.type(textarea, 'Comment 1');
      await user.click(screen.getByRole('button', { name: /post comment/i }));

      // Submit second comment
      await user.clear(textarea);
      await user.type(textarea, 'Comment 2');
      await user.click(screen.getByRole('button', { name: /post comment/i }));

      await waitFor(() => {
        const processingIndicators = screen.getAllByText(/processing/i);
        expect(processingIndicators.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should remove only the specific processing indicator when reply arrives', async () => {
      // This test will FAIL until implementation
      const user = userEvent.setup({ delay: null });
      const mockOnCommentSubmit = vi.fn()
        .mockResolvedValueOnce({ id: 1, post_id: 1, content: 'Comment 1' })
        .mockResolvedValueOnce({ id: 2, post_id: 1, content: 'Comment 2' });

      render(
        <CommentThread
          post={mockPost}
          comments={[]}
          onCommentSubmit={mockOnCommentSubmit}
        />
      );

      const textarea = screen.getByPlaceholderText(/write a comment/i);

      // Submit two comments
      await user.type(textarea, 'Comment 1');
      await user.click(screen.getByRole('button', { name: /post comment/i }));
      await user.clear(textarea);
      await user.type(textarea, 'Comment 2');
      await user.click(screen.getByRole('button', { name: /post comment/i }));

      // Reply to first comment
      const commentCreatedHandler = socketEventHandlers['comment:created'];
      commentCreatedHandler({
        postId: 1,
        comment: {
          id: 3,
          post_id: 1,
          parent_comment_id: 1,
          content: 'Reply to comment 1',
          author_agent: 10,
        },
      });

      await waitFor(() => {
        // Should still have one processing indicator for comment 2
        expect(screen.getByText(/processing/i)).toBeInTheDocument();
      });
    });
  });

  describe('Visual Consistency', () => {
    it('should match post processing pill styling', async () => {
      // This test will FAIL until implementation
      const user = userEvent.setup({ delay: null });
      const mockOnCommentSubmit = vi.fn().mockResolvedValue({
        id: 1,
        content: 'Test comment',
      });

      render(
        <CommentThread
          post={mockPost}
          comments={[]}
          onCommentSubmit={mockOnCommentSubmit}
        />
      );

      const textarea = screen.getByPlaceholderText(/write a comment/i);
      await user.type(textarea, 'Test comment');
      await user.click(screen.getByRole('button', { name: /post comment/i }));

      await waitFor(() => {
        const processingPill = screen.getByText(/processing/i);
        // Should have similar classes to post processing pill
        expect(processingPill).toHaveClass('processing-pill');
        expect(processingPill.parentElement).toHaveClass('pill-container');
      });
    });

    it('should display in same location as post processing indicator', async () => {
      // This test will FAIL until implementation
      const user = userEvent.setup({ delay: null });
      const mockOnCommentSubmit = vi.fn().mockResolvedValue({
        id: 1,
        content: 'Test comment',
      });

      render(
        <CommentThread
          post={mockPost}
          comments={[]}
          onCommentSubmit={mockOnCommentSubmit}
        />
      );

      const textarea = screen.getByPlaceholderText(/write a comment/i);
      await user.type(textarea, 'Test comment');
      await user.click(screen.getByRole('button', { name: /post comment/i }));

      await waitFor(() => {
        const processingIndicator = screen.getByText(/processing/i);
        // Should be in comment thread area, similar positioning to posts
        expect(processingIndicator.closest('.comment-thread')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should not show indicator for comments that already have replies', async () => {
      // This test will FAIL until implementation
      const existingComments = [
        {
          id: 1,
          post_id: 1,
          content: 'User comment',
          created_at: new Date().toISOString(),
          author_user_id: 1,
        },
        {
          id: 2,
          post_id: 1,
          parent_comment_id: 1,
          content: 'Agent reply',
          created_at: new Date().toISOString(),
          author_agent: 10,
        },
      ];

      render(
        <CommentThread
          post={mockPost}
          comments={existingComments}
          onCommentSubmit={vi.fn()}
        />
      );

      expect(screen.queryByText(/processing/i)).not.toBeInTheDocument();
    });

    it('should handle component unmount with active processing state', async () => {
      // This test will FAIL until implementation
      const user = userEvent.setup({ delay: null });
      const mockOnCommentSubmit = vi.fn().mockResolvedValue({
        id: 1,
        content: 'Test comment',
      });

      const { unmount } = render(
        <CommentThread
          post={mockPost}
          comments={[]}
          onCommentSubmit={mockOnCommentSubmit}
        />
      );

      const textarea = screen.getByPlaceholderText(/write a comment/i);
      await user.type(textarea, 'Test comment');
      await user.click(screen.getByRole('button', { name: /post comment/i }));

      await waitFor(() => {
        expect(screen.getByText(/processing/i)).toBeInTheDocument();
      });

      // Should not throw on unmount
      expect(() => unmount()).not.toThrow();
    });

    it('should only show indicator for user\'s own comments', async () => {
      // This test will FAIL until implementation
      const user = userEvent.setup({ delay: null });
      const mockOnCommentSubmit = vi.fn().mockResolvedValue({
        id: 1,
        post_id: 1,
        content: 'My comment',
        author_user_id: 1,
      });

      render(
        <CommentThread
          post={mockPost}
          comments={[]}
          onCommentSubmit={mockOnCommentSubmit}
        />
      );

      const textarea = screen.getByPlaceholderText(/write a comment/i);
      await user.type(textarea, 'My comment');
      await user.click(screen.getByRole('button', { name: /post comment/i }));

      await waitFor(() => {
        expect(screen.getByText(/processing/i)).toBeInTheDocument();
      });

      // Other user's comment arrives - should not affect indicator
      const commentCreatedHandler = socketEventHandlers['comment:created'];
      commentCreatedHandler({
        postId: 1,
        comment: {
          id: 2,
          post_id: 1,
          content: 'Other user comment',
          author_user_id: 2,
        },
      });

      // Processing indicator should still be visible
      expect(screen.getByText(/processing/i)).toBeInTheDocument();
    });
  });
});
