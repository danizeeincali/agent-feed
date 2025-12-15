import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CommentThread from '../CommentThread';

/**
 * TDD RED PHASE: CommentThread Reply Button Processing Pills
 *
 * ROOT CAUSE: Line 412 uses `processingComments.size > 0` (global check)
 * instead of `processingComments.has(comment.id)` (per-comment check)
 *
 * FAILING LINE: disabled={processingComments.size > 0 || isSubmitting}
 * SHOULD BE: disabled={processingComments.has(comment.id) || isSubmitting}
 *
 * These tests WILL FAIL with current implementation because:
 * - Reply buttons check global processing state (.size > 0)
 * - They should check per-comment processing state (.has(commentId))
 */

describe('CommentThread - Reply Button Processing Pills (RED PHASE)', () => {
  const mockPost = {
    id: 'post-1',
    content: 'Test post',
    agent: { id: 'agent-1', name: 'TestAgent', avatar: '👤', personality: 'helpful' },
    timestamp: new Date().toISOString(),
    likes: 0,
    comments: []
  };

  const mockComment1 = {
    id: 'comment-1',
    content: 'First comment',
    author: 'user',
    timestamp: new Date().toISOString(),
    isAviQuestion: false,
    replies: []
  };

  const mockComment2 = {
    id: 'comment-2',
    content: 'Second comment',
    author: 'user',
    timestamp: new Date().toISOString(),
    isAviQuestion: false,
    replies: []
  };

  const mockComment3 = {
    id: 'comment-3',
    content: 'Third comment',
    author: 'user',
    timestamp: new Date().toISOString(),
    isAviQuestion: false,
    replies: []
  };

  const defaultProps = {
    post: mockPost,
    comments: [mockComment1, mockComment2, mockComment3],
    onReply: jest.fn(),
    processingComments: new Set<string>(),
    onLike: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Per-Comment Processing State (Core Bug)', () => {
    it('RED: checks per-comment processing state, not global size', async () => {
      // SETUP: Comment 2 is processing, but we're testing comment 1's button
      const processingSet = new Set<string>(['comment-2']);

      const { container } = render(
        <CommentThread {...defaultProps} processingComments={processingSet} />
      );

      // Find comment 1's reply button
      const comment1Element = container.querySelector('[data-comment-id="comment-1"]');
      expect(comment1Element).toBeInTheDocument();

      const replyButton = comment1Element?.querySelector('button[aria-label*="Reply"]');
      expect(replyButton).toBeInTheDocument();

      // EXPECTED: Comment 1's reply button should be ENABLED
      // (processingComments does NOT have 'comment-1')
      expect(replyButton).not.toBeDisabled();

      // ACTUAL BUG: Button is DISABLED because processingComments.size > 0
      // This test will FAIL with current implementation on line 412
    });

    it('RED: disables button only when THIS comment is processing', async () => {
      // SETUP: Comment 1 IS processing
      const processingSet = new Set<string>(['comment-1']);

      const { container } = render(
        <CommentThread {...defaultProps} processingComments={processingSet} />
      );

      // Find comment 1's reply button
      const comment1Element = container.querySelector('[data-comment-id="comment-1"]');
      const replyButton = comment1Element?.querySelector('button[aria-label*="Reply"]');

      // EXPECTED: Comment 1's reply button SHOULD be disabled
      expect(replyButton).toBeDisabled();

      // This might pass by accident due to global check, but for wrong reason
    });

    it('RED: enables button when OTHER comments are processing', async () => {
      // SETUP: Comments 2 and 3 are processing, but NOT comment 1
      const processingSet = new Set<string>(['comment-2', 'comment-3']);

      const { container } = render(
        <CommentThread {...defaultProps} processingComments={processingSet} />
      );

      // Check comment 1's button
      const comment1Element = container.querySelector('[data-comment-id="comment-1"]');
      const replyButton = comment1Element?.querySelector('button[aria-label*="Reply"]');

      // EXPECTED: Comment 1's button should be ENABLED
      expect(replyButton).not.toBeDisabled();

      // ACTUAL BUG: Disabled because processingComments.size > 0
      // This test WILL FAIL with current line 412
    });
  });

  describe('Spinner Visibility Per-Comment', () => {
    it('RED: shows spinner only for THIS comment\'s reply', async () => {
      // SETUP: Comment 1 is processing
      const processingSet = new Set<string>(['comment-1']);

      const { container } = render(
        <CommentThread {...defaultProps} processingComments={processingSet} />
      );

      const comment1Element = container.querySelector('[data-comment-id="comment-1"]');
      const comment2Element = container.querySelector('[data-comment-id="comment-2"]');

      // EXPECTED: Spinner visible only in comment 1
      const spinner1 = comment1Element?.querySelector('[data-testid="reply-spinner"]');
      const spinner2 = comment2Element?.querySelector('[data-testid="reply-spinner"]');

      expect(spinner1).toBeInTheDocument();
      expect(spinner2).not.toBeInTheDocument();

      // May fail if spinner logic also uses global check
    });

    it('RED: hides spinner when other comments are processing', async () => {
      // SETUP: Comment 2 is processing, not comment 1
      const processingSet = new Set<string>(['comment-2']);

      const { container } = render(
        <CommentThread {...defaultProps} processingComments={processingSet} />
      );

      const comment1Element = container.querySelector('[data-comment-id="comment-1"]');
      const spinner1 = comment1Element?.querySelector('[data-testid="reply-spinner"]');

      // EXPECTED: No spinner in comment 1
      expect(spinner1).not.toBeInTheDocument();
    });
  });

  describe('Multiple Simultaneous Reply Submissions', () => {
    it('RED: allows multiple comments to have replies submitted simultaneously', async () => {
      // SETUP: No comments processing initially
      const { container } = render(
        <CommentThread {...defaultProps} />
      );

      const comment1Element = container.querySelector('[data-comment-id="comment-1"]');
      const comment2Element = container.querySelector('[data-comment-id="comment-2"]');
      const comment3Element = container.querySelector('[data-comment-id="comment-3"]');

      const replyButton1 = comment1Element?.querySelector('button[aria-label*="Reply"]');
      const replyButton2 = comment2Element?.querySelector('button[aria-label*="Reply"]');
      const replyButton3 = comment3Element?.querySelector('button[aria-label*="Reply"]');

      // All buttons should be enabled
      expect(replyButton1).not.toBeDisabled();
      expect(replyButton2).not.toBeDisabled();
      expect(replyButton3).not.toBeDisabled();

      // Simulate clicking reply on comment 1
      fireEvent.click(replyButton1!);

      // Type and submit reply for comment 1
      const textarea1 = comment1Element?.querySelector('textarea[placeholder*="reply"]');
      if (textarea1) {
        fireEvent.change(textarea1, { target: { value: 'Reply to comment 1' } });
        const submitButton1 = comment1Element?.querySelector('button[type="submit"]');
        fireEvent.click(submitButton1!);
      }

      // Now comment 1 is processing, but buttons 2 and 3 should still be enabled
      const processingSet = new Set<string>(['comment-1']);
      const { container: updatedContainer } = render(
        <CommentThread {...defaultProps} processingComments={processingSet} />
      );

      const updatedComment2 = updatedContainer.querySelector('[data-comment-id="comment-2"]');
      const updatedComment3 = updatedContainer.querySelector('[data-comment-id="comment-3"]');

      const updatedButton2 = updatedComment2?.querySelector('button[aria-label*="Reply"]');
      const updatedButton3 = updatedComment3?.querySelector('button[aria-label*="Reply"]');

      // EXPECTED: Buttons 2 and 3 should be ENABLED
      expect(updatedButton2).not.toBeDisabled();
      expect(updatedButton3).not.toBeDisabled();

      // ACTUAL BUG: All buttons disabled because processingComments.size > 0
      // This test WILL FAIL
    });

    it('RED: allows replies to different comments in parallel', async () => {
      // SETUP: Comments 1 and 3 are both processing
      const processingSet = new Set<string>(['comment-1', 'comment-3']);

      const { container } = render(
        <CommentThread {...defaultProps} processingComments={processingSet} />
      );

      const comment1Element = container.querySelector('[data-comment-id="comment-1"]');
      const comment2Element = container.querySelector('[data-comment-id="comment-2"]');
      const comment3Element = container.querySelector('[data-comment-id="comment-3"]');

      const replyButton1 = comment1Element?.querySelector('button[aria-label*="Reply"]');
      const replyButton2 = comment2Element?.querySelector('button[aria-label*="Reply"]');
      const replyButton3 = comment3Element?.querySelector('button[aria-label*="Reply"]');

      // EXPECTED: Buttons 1 and 3 disabled, button 2 enabled
      expect(replyButton1).toBeDisabled();
      expect(replyButton2).not.toBeDisabled(); // This comment NOT processing
      expect(replyButton3).toBeDisabled();

      // ACTUAL BUG: All buttons disabled due to global check
      // Test WILL FAIL for button 2
    });
  });

  describe('Processing State Management', () => {
    it('RED: clears processing state after reply submission completes', async () => {
      // SETUP: Comment 1 starts processing
      const processingSet = new Set<string>(['comment-1']);

      const { container, rerender } = render(
        <CommentThread {...defaultProps} processingComments={processingSet} />
      );

      const comment1Element = container.querySelector('[data-comment-id="comment-1"]');
      const replyButton = comment1Element?.querySelector('button[aria-label*="Reply"]');

      // Initially disabled (processing)
      expect(replyButton).toBeDisabled();

      // Simulate processing complete - comment removed from set
      const emptySet = new Set<string>();
      rerender(<CommentThread {...defaultProps} processingComments={emptySet} />);

      const updatedComment1 = container.querySelector('[data-comment-id="comment-1"]');
      const updatedButton = updatedComment1?.querySelector('button[aria-label*="Reply"]');

      // EXPECTED: Button should be enabled again
      expect(updatedButton).not.toBeDisabled();
    });

    it('RED: uses comment.id as processing key, not index or other identifier', async () => {
      // SETUP: Specific comment ID in processing set
      const processingSet = new Set<string>(['comment-2']);

      const { container } = render(
        <CommentThread {...defaultProps} processingComments={processingSet} />
      );

      // Verify we're using the correct key format
      const comment2Element = container.querySelector('[data-comment-id="comment-2"]');
      expect(comment2Element).toBeInTheDocument();

      const replyButton = comment2Element?.querySelector('button[aria-label*="Reply"]');

      // EXPECTED: Button disabled because 'comment-2' is in the Set
      expect(replyButton).toBeDisabled();

      // Verify comment-1 and comment-3 buttons are enabled
      const comment1Element = container.querySelector('[data-comment-id="comment-1"]');
      const comment3Element = container.querySelector('[data-comment-id="comment-3"]');

      const button1 = comment1Element?.querySelector('button[aria-label*="Reply"]');
      const button3 = comment3Element?.querySelector('button[aria-label*="Reply"]');

      // These should be ENABLED
      expect(button1).not.toBeDisabled();
      expect(button3).not.toBeDisabled();

      // ACTUAL BUG: All disabled due to global size check
      // Tests WILL FAIL
    });
  });

  describe('Integration with isSubmitting State', () => {
    it('RED: combines per-comment processing with isSubmitting correctly', async () => {
      // SETUP: No global processing, but testing local isSubmitting
      const { container } = render(
        <CommentThread {...defaultProps} />
      );

      const comment1Element = container.querySelector('[data-comment-id="comment-1"]');
      const replyButton = comment1Element?.querySelector('button[aria-label*="Reply"]');

      // Click to open reply form
      fireEvent.click(replyButton!);

      const textarea = comment1Element?.querySelector('textarea[placeholder*="reply"]');
      expect(textarea).toBeInTheDocument();

      // Type a reply
      fireEvent.change(textarea!, { target: { value: 'Test reply' } });

      // Submit the reply
      const submitButton = comment1Element?.querySelector('button[type="submit"]');
      fireEvent.click(submitButton!);

      // During submission, isSubmitting should be true
      // Combined with per-comment check: disabled={processingComments.has(comment.id) || isSubmitting}

      await waitFor(() => {
        const updatedButton = comment1Element?.querySelector('button[aria-label*="Reply"]');
        // Should be disabled during submission
        expect(updatedButton).toBeDisabled();
      });
    });

    it('RED: keeps other comment buttons enabled during one comment submission', async () => {
      // SETUP: Start replying to comment 1
      const { container } = render(
        <CommentThread {...defaultProps} />
      );

      const comment1Element = container.querySelector('[data-comment-id="comment-1"]');
      const comment2Element = container.querySelector('[data-comment-id="comment-2"]');

      const replyButton1 = comment1Element?.querySelector('button[aria-label*="Reply"]');
      const replyButton2 = comment2Element?.querySelector('button[aria-label*="Reply"]');

      // Click reply on comment 1
      fireEvent.click(replyButton1!);

      const textarea1 = comment1Element?.querySelector('textarea[placeholder*="reply"]');
      fireEvent.change(textarea1!, { target: { value: 'Reply to comment 1' } });

      const submitButton1 = comment1Element?.querySelector('button[type="submit"]');
      fireEvent.click(submitButton1!);

      // Comment 1's button should be disabled (isSubmitting=true for that comment)
      // But comment 2's button should remain ENABLED

      await waitFor(() => {
        const updatedButton2 = comment2Element?.querySelector('button[aria-label*="Reply"]');

        // EXPECTED: Comment 2's button should be ENABLED
        expect(updatedButton2).not.toBeDisabled();

        // ACTUAL BUG: Might be disabled if isSubmitting is global
        // Test WILL FAIL if isSubmitting affects all comments
      });
    });
  });

  describe('Edge Cases', () => {
    it('RED: handles empty processing set correctly', async () => {
      const emptySet = new Set<string>();

      const { container } = render(
        <CommentThread {...defaultProps} processingComments={emptySet} />
      );

      const comment1Element = container.querySelector('[data-comment-id="comment-1"]');
      const replyButton = comment1Element?.querySelector('button[aria-label*="Reply"]');

      // EXPECTED: All buttons enabled when no comments processing
      expect(replyButton).not.toBeDisabled();
    });

    it('RED: handles processing set with non-existent comment IDs', async () => {
      // SETUP: Processing set contains IDs that don't exist in current comments
      const processingSet = new Set<string>(['comment-999', 'comment-888']);

      const { container } = render(
        <CommentThread {...defaultProps} processingComments={processingSet} />
      );

      const comment1Element = container.querySelector('[data-comment-id="comment-1"]');
      const replyButton = comment1Element?.querySelector('button[aria-label*="Reply"]');

      // EXPECTED: Button should be ENABLED (comment-1 not in processing set)
      expect(replyButton).not.toBeDisabled();

      // ACTUAL BUG: Disabled because processingComments.size > 0
      // Test WILL FAIL
    });

    it('RED: handles rapid state changes in processing set', async () => {
      const { container, rerender } = render(
        <CommentThread {...defaultProps} processingComments={new Set(['comment-1'])} />
      );

      // Initially comment-1 is processing
      let comment1Element = container.querySelector('[data-comment-id="comment-1"]');
      let replyButton1 = comment1Element?.querySelector('button[aria-label*="Reply"]');
      expect(replyButton1).toBeDisabled();

      // Change to comment-2 processing
      rerender(<CommentThread {...defaultProps} processingComments={new Set(['comment-2'])} />);

      comment1Element = container.querySelector('[data-comment-id="comment-1"]');
      replyButton1 = comment1Element?.querySelector('button[aria-label*="Reply"]');

      // EXPECTED: Comment-1 button now ENABLED
      expect(replyButton1).not.toBeDisabled();

      // ACTUAL BUG: Still disabled if using global check
      // Test WILL FAIL
    });
  });
});
