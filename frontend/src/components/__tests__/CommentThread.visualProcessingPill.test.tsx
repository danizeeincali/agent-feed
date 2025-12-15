import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import CommentThread from '../CommentThread';

describe('CommentThread - Visual Processing Indicator', () => {
  const mockComment = {
    id: 'comment-123',
    author: 'Jane Smith',
    content: 'Test comment content',
    timestamp: '2 hours ago',
    avatar: '/avatars/jane.jpg',
    likes: 5,
  };

  const mockPost = {
    id: 'post-1',
    author: 'Test Author',
    content: 'Test post content',
    timestamp: '1 hour ago',
    avatar: '/avatars/author.jpg',
    likes: 10,
    comments: [mockComment],
  };

  const mockOnReply = jest.fn();
  const mockOnLike = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Visual Pill Rendering', () => {
    it('renders visual pill when comment is processing', () => {
      const processingComments = new Set(['comment-123']);

      render(
        <CommentThread
          post={mockPost}
          onReply={mockOnReply}
          onLike={mockOnLike}
          processingComments={processingComments}
        />
      );

      // Expect visual indicator to be visible
      const processingPill = screen.getByTestId('processing-pill-comment-123');
      expect(processingPill).toBeInTheDocument();
      expect(processingPill).toBeVisible();

      // Expect "Posting reply..." text
      expect(screen.getByText(/posting reply/i)).toBeInTheDocument();
    });

    it('hides visual pill when comment is not processing', () => {
      const processingComments = new Set<string>();

      render(
        <CommentThread
          post={mockPost}
          onReply={mockOnReply}
          onLike={mockOnLike}
          processingComments={processingComments}
        />
      );

      // Expect visual indicator NOT to be visible
      const processingPill = screen.queryByTestId('processing-pill-comment-123');
      expect(processingPill).not.toBeInTheDocument();

      // Expect no "Posting reply..." text
      expect(screen.queryByText(/posting reply/i)).not.toBeInTheDocument();
    });

    it('renders visual pill ONLY when processingComments is undefined', () => {
      render(
        <CommentThread
          post={mockPost}
          onReply={mockOnReply}
          onLike={mockOnLike}
          // processingComments not passed (undefined)
        />
      );

      // Should not crash and should not show pill
      const processingPill = screen.queryByTestId('processing-pill-comment-123');
      expect(processingPill).not.toBeInTheDocument();
    });
  });

  describe('Specific Comment Targeting', () => {
    it('appears ONLY on specific comment when multiple comments exist', () => {
      const commentA = {
        id: 'comment-A',
        author: 'User A',
        content: 'Comment A content',
        timestamp: '1 hour ago',
        avatar: '/avatars/a.jpg',
        likes: 2,
      };

      const commentB = {
        id: 'comment-B',
        author: 'User B',
        content: 'Comment B content',
        timestamp: '2 hours ago',
        avatar: '/avatars/b.jpg',
        likes: 3,
      };

      const postWithMultipleComments = {
        ...mockPost,
        comments: [commentA, commentB],
      };

      const processingComments = new Set(['comment-A']);

      render(
        <CommentThread
          post={postWithMultipleComments}
          onReply={mockOnReply}
          onLike={mockOnLike}
          processingComments={processingComments}
        />
      );

      // Expect pill on comment-A only
      const pillA = screen.queryByTestId('processing-pill-comment-A');
      expect(pillA).toBeInTheDocument();
      expect(pillA).toBeVisible();

      // Expect NO pill on comment-B
      const pillB = screen.queryByTestId('processing-pill-comment-B');
      expect(pillB).not.toBeInTheDocument();
    });

    it('shows pills on multiple comments simultaneously when all are processing', () => {
      const commentA = {
        id: 'comment-A',
        author: 'User A',
        content: 'Comment A content',
        timestamp: '1 hour ago',
        avatar: '/avatars/a.jpg',
        likes: 2,
      };

      const commentB = {
        id: 'comment-B',
        author: 'User B',
        content: 'Comment B content',
        timestamp: '2 hours ago',
        avatar: '/avatars/b.jpg',
        likes: 3,
      };

      const commentC = {
        id: 'comment-C',
        author: 'User C',
        content: 'Comment C content',
        timestamp: '3 hours ago',
        avatar: '/avatars/c.jpg',
        likes: 1,
      };

      const postWithMultipleComments = {
        ...mockPost,
        comments: [commentA, commentB, commentC],
      };

      const processingComments = new Set(['comment-A', 'comment-B']);

      render(
        <CommentThread
          post={postWithMultipleComments}
          onReply={mockOnReply}
          onLike={mockOnLike}
          processingComments={processingComments}
        />
      );

      // Expect pills on comment-A and comment-B
      expect(screen.getByTestId('processing-pill-comment-A')).toBeInTheDocument();
      expect(screen.getByTestId('processing-pill-comment-B')).toBeInTheDocument();

      // Expect NO pill on comment-C
      expect(screen.queryByTestId('processing-pill-comment-C')).not.toBeInTheDocument();

      // Expect multiple "Posting reply..." texts
      const postingTexts = screen.getAllByText(/posting reply/i);
      expect(postingTexts).toHaveLength(2);
    });
  });

  describe('Visual Pill Styling', () => {
    it('has correct styling with Loader2 spinner and blue color classes', () => {
      const processingComments = new Set(['comment-123']);

      render(
        <CommentThread
          post={mockPost}
          onReply={mockOnReply}
          onLike={mockOnLike}
          processingComments={processingComments}
        />
      );

      const processingPill = screen.getByTestId('processing-pill-comment-123');

      // Check for blue color classes
      expect(processingPill).toHaveClass('bg-blue-50', 'text-blue-600', 'border-blue-200');

      // Check for absolute positioning
      expect(processingPill).toHaveClass('absolute');

      // Check for z-index (should be elevated)
      expect(processingPill).toHaveClass('z-10');

      // Check for Loader2 spinner icon
      const spinner = processingPill.querySelector('svg');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('animate-spin');
    });

    it('has correct positioning on comment card (top-right)', () => {
      const processingComments = new Set(['comment-123']);

      const { container } = render(
        <CommentThread
          post={mockPost}
          onReply={mockOnReply}
          onLike={mockOnLike}
          processingComments={processingComments}
        />
      );

      const processingPill = screen.getByTestId('processing-pill-comment-123');

      // Check top-right positioning (top-2 right-2)
      expect(processingPill).toHaveClass('top-2', 'right-2');

      // Verify pill is inside comment container
      const commentContainer = container.querySelector('[data-testid="comment-container-comment-123"]');
      expect(commentContainer).toContainElement(processingPill);
    });

    it('has rounded corners and padding', () => {
      const processingComments = new Set(['comment-123']);

      render(
        <CommentThread
          post={mockPost}
          onReply={mockOnReply}
          onLike={mockOnLike}
          processingComments={processingComments}
        />
      );

      const processingPill = screen.getByTestId('processing-pill-comment-123');

      // Check for rounded corners
      expect(processingPill).toHaveClass('rounded-full');

      // Check for padding
      expect(processingPill).toHaveClass('px-2', 'py-1');
    });
  });

  describe('Dynamic State Changes', () => {
    it('disappears when processing completes (comment removed from Set)', () => {
      const processingComments = new Set(['comment-123']);

      const { rerender } = render(
        <CommentThread
          post={mockPost}
          onReply={mockOnReply}
          onLike={mockOnLike}
          processingComments={processingComments}
        />
      );

      // Initially, pill should be visible
      expect(screen.getByTestId('processing-pill-comment-123')).toBeInTheDocument();

      // Update processingComments to remove comment-123
      const updatedProcessingComments = new Set<string>();

      rerender(
        <CommentThread
          post={mockPost}
          onReply={mockOnReply}
          onLike={mockOnLike}
          processingComments={updatedProcessingComments}
        />
      );

      // Pill should disappear
      expect(screen.queryByTestId('processing-pill-comment-123')).not.toBeInTheDocument();
      expect(screen.queryByText(/posting reply/i)).not.toBeInTheDocument();
    });

    it('appears when comment starts processing (comment added to Set)', () => {
      const processingComments = new Set<string>();

      const { rerender } = render(
        <CommentThread
          post={mockPost}
          onReply={mockOnReply}
          onLike={mockOnLike}
          processingComments={processingComments}
        />
      );

      // Initially, no pill should be visible
      expect(screen.queryByTestId('processing-pill-comment-123')).not.toBeInTheDocument();

      // Update processingComments to add comment-123
      const updatedProcessingComments = new Set(['comment-123']);

      rerender(
        <CommentThread
          post={mockPost}
          onReply={mockOnReply}
          onLike={mockOnLike}
          processingComments={updatedProcessingComments}
        />
      );

      // Pill should appear
      expect(screen.getByTestId('processing-pill-comment-123')).toBeInTheDocument();
      expect(screen.getByText(/posting reply/i)).toBeInTheDocument();
    });

    it('updates correctly when different comments start/stop processing', () => {
      const commentA = {
        id: 'comment-A',
        author: 'User A',
        content: 'Comment A',
        timestamp: '1 hour ago',
        avatar: '/avatars/a.jpg',
        likes: 2,
      };

      const commentB = {
        id: 'comment-B',
        author: 'User B',
        content: 'Comment B',
        timestamp: '2 hours ago',
        avatar: '/avatars/b.jpg',
        likes: 3,
      };

      const postWithMultipleComments = {
        ...mockPost,
        comments: [commentA, commentB],
      };

      // Start with comment-A processing
      const processingComments1 = new Set(['comment-A']);

      const { rerender } = render(
        <CommentThread
          post={postWithMultipleComments}
          onReply={mockOnReply}
          onLike={mockOnLike}
          processingComments={processingComments1}
        />
      );

      expect(screen.getByTestId('processing-pill-comment-A')).toBeInTheDocument();
      expect(screen.queryByTestId('processing-pill-comment-B')).not.toBeInTheDocument();

      // Switch to comment-B processing
      const processingComments2 = new Set(['comment-B']);

      rerender(
        <CommentThread
          post={postWithMultipleComments}
          onReply={mockOnReply}
          onLike={mockOnLike}
          processingComments={processingComments2}
        />
      );

      expect(screen.queryByTestId('processing-pill-comment-A')).not.toBeInTheDocument();
      expect(screen.getByTestId('processing-pill-comment-B')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has appropriate ARIA attributes for screen readers', () => {
      const processingComments = new Set(['comment-123']);

      render(
        <CommentThread
          post={mockPost}
          onReply={mockOnReply}
          onLike={mockOnLike}
          processingComments={processingComments}
        />
      );

      const processingPill = screen.getByTestId('processing-pill-comment-123');

      // Check for aria-label or role
      expect(
        processingPill.hasAttribute('aria-label') ||
        processingPill.hasAttribute('role')
      ).toBeTruthy();
    });

    it('provides meaningful text for screen readers', () => {
      const processingComments = new Set(['comment-123']);

      render(
        <CommentThread
          post={mockPost}
          onReply={mockOnReply}
          onLike={mockOnLike}
          processingComments={processingComments}
        />
      );

      // Text should indicate what is happening
      const processingText = screen.getByText(/posting reply/i);
      expect(processingText).toBeInTheDocument();
      expect(processingText.textContent?.toLowerCase()).toContain('posting');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty comments array gracefully', () => {
      const postWithNoComments = {
        ...mockPost,
        comments: [],
      };

      const processingComments = new Set(['comment-123']);

      render(
        <CommentThread
          post={postWithNoComments}
          onReply={mockOnReply}
          onLike={mockOnLike}
          processingComments={processingComments}
        />
      );

      // Should not crash, and no pills should appear
      expect(screen.queryByTestId('processing-pill-comment-123')).not.toBeInTheDocument();
    });

    it('handles comment ID that does not exist in processingComments Set', () => {
      const processingComments = new Set(['different-comment-id']);

      render(
        <CommentThread
          post={mockPost}
          onReply={mockOnReply}
          onLike={mockOnLike}
          processingComments={processingComments}
        />
      );

      // No pill should appear for comment-123
      expect(screen.queryByTestId('processing-pill-comment-123')).not.toBeInTheDocument();
    });

    it('handles very long comment IDs', () => {
      const longIdComment = {
        ...mockComment,
        id: 'comment-' + 'x'.repeat(100),
      };

      const postWithLongId = {
        ...mockPost,
        comments: [longIdComment],
      };

      const processingComments = new Set([longIdComment.id]);

      render(
        <CommentThread
          post={postWithLongId}
          onReply={mockOnReply}
          onLike={mockOnLike}
          processingComments={processingComments}
        />
      );

      // Should handle long IDs correctly
      const processingPill = screen.getByTestId(`processing-pill-${longIdComment.id}`);
      expect(processingPill).toBeInTheDocument();
    });
  });
});
