import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CommentThread from '../CommentThread';

// Mock API
const mockSendComment = vi.fn();
vi.mock('../../api/comments', () => ({
  sendComment: (content: string, parentId: number | null) => mockSendComment(content, parentId),
}));

describe('CommentThread - Reply Processing Pills (RED PHASE)', () => {
  const mockPost = {
    id: 1,
    content: 'Test post',
    author: 'TestUser',
    timestamp: '2025-01-01T00:00:00Z',
    agentId: 1,
    isAvi: false,
  };

  const mockComment = {
    id: 100,
    content: 'Parent comment',
    author: 'User1',
    timestamp: '2025-01-01T00:01:00Z',
    parentId: null,
  };

  const mockComments = [mockComment];

  let mockOnProcessingChange: ReturnType<typeof vi.fn>;
  let mockProcessingComments: Set<string>;

  beforeEach(() => {
    mockOnProcessingChange = vi.fn();
    mockProcessingComments = new Set<string>();
    mockSendComment.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Processing Callback Invocation', () => {
    it('should call onProcessingChange(true) when reply submission starts', async () => {
      render(
        <CommentThread
          post={mockPost}
          comments={mockComments}
          onProcessingChange={mockOnProcessingChange}
          processingComments={mockProcessingComments}
        />
      );

      // Find and click reply button
      const replyButtons = screen.getAllByText(/reply/i);
      fireEvent.click(replyButtons[0]);

      // Type reply content
      const replyTextarea = screen.getByPlaceholderText(/write a reply/i);
      fireEvent.change(replyTextarea, { target: { value: 'Test reply' } });

      // Submit reply
      const submitButton = screen.getByText(/post reply/i);
      fireEvent.click(submitButton);

      // Verify onProcessingChange was called with true
      await waitFor(() => {
        expect(mockOnProcessingChange).toHaveBeenCalledWith(true, expect.any(String));
      });
    });

    it('should call onProcessingChange(false) when reply completes successfully', async () => {
      mockSendComment.mockResolvedValueOnce({ success: true });

      render(
        <CommentThread
          post={mockPost}
          comments={mockComments}
          onProcessingChange={mockOnProcessingChange}
          processingComments={mockProcessingComments}
        />
      );

      const replyButtons = screen.getAllByText(/reply/i);
      fireEvent.click(replyButtons[0]);

      const replyTextarea = screen.getByPlaceholderText(/write a reply/i);
      fireEvent.change(replyTextarea, { target: { value: 'Test reply' } });

      const submitButton = screen.getByText(/post reply/i);
      fireEvent.click(submitButton);

      // Verify onProcessingChange was called with false after completion
      await waitFor(() => {
        expect(mockOnProcessingChange).toHaveBeenCalledWith(false, expect.any(String));
      });
    });

    it('should call onProcessingChange(false) when reply fails', async () => {
      mockSendComment.mockRejectedValueOnce(new Error('Network error'));

      render(
        <CommentThread
          post={mockPost}
          comments={mockComments}
          onProcessingChange={mockOnProcessingChange}
          processingComments={mockProcessingComments}
        />
      );

      const replyButtons = screen.getAllByText(/reply/i);
      fireEvent.click(replyButtons[0]);

      const replyTextarea = screen.getByPlaceholderText(/write a reply/i);
      fireEvent.change(replyTextarea, { target: { value: 'Test reply' } });

      const submitButton = screen.getByText(/post reply/i);
      fireEvent.click(submitButton);

      // Verify onProcessingChange was called with false on error
      await waitFor(() => {
        expect(mockOnProcessingChange).toHaveBeenCalledWith(false, expect.any(String));
      });
    });

    it('should pass unique temp ID to onProcessingChange', async () => {
      render(
        <CommentThread
          post={mockPost}
          comments={mockComments}
          onProcessingChange={mockOnProcessingChange}
          processingComments={mockProcessingComments}
        />
      );

      const replyButtons = screen.getAllByText(/reply/i);
      fireEvent.click(replyButtons[0]);

      const replyTextarea = screen.getByPlaceholderText(/write a reply/i);
      fireEvent.change(replyTextarea, { target: { value: 'Test reply' } });

      const submitButton = screen.getByText(/post reply/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnProcessingChange).toHaveBeenCalled();
      });

      // Verify the temp ID matches the pattern 'temp-reply-{commentId}-{timestamp}'
      const callArgs = mockOnProcessingChange.mock.calls[0];
      expect(callArgs[1]).toMatch(/^temp-reply-\d+-\d+$/);
    });
  });

  describe('UI State with processingComments Prop', () => {
    it('should show spinner on submit button when reply is in processingComments', () => {
      const tempId = 'temp-reply-100-1234567890';
      mockProcessingComments.add(tempId);

      render(
        <CommentThread
          post={mockPost}
          comments={mockComments}
          onProcessingChange={mockOnProcessingChange}
          processingComments={mockProcessingComments}
        />
      );

      const replyButtons = screen.getAllByText(/reply/i);
      fireEvent.click(replyButtons[0]);

      // Should show spinner/loading indicator on submit button
      const submitButton = screen.getByText(/post reply/i);
      expect(submitButton).toHaveAttribute('disabled');
      expect(submitButton.querySelector('.spinner, [data-testid="spinner"]')).toBeInTheDocument();
    });

    it('should disable textarea when reply is in processingComments', () => {
      const tempId = 'temp-reply-100-1234567890';
      mockProcessingComments.add(tempId);

      render(
        <CommentThread
          post={mockPost}
          comments={mockComments}
          onProcessingChange={mockOnProcessingChange}
          processingComments={mockProcessingComments}
        />
      );

      const replyButtons = screen.getAllByText(/reply/i);
      fireEvent.click(replyButtons[0]);

      const replyTextarea = screen.getByPlaceholderText(/write a reply/i);
      expect(replyTextarea).toBeDisabled();
    });

    it('should remove spinner when temp ID is removed from processingComments', async () => {
      const tempId = 'temp-reply-100-1234567890';
      mockProcessingComments.add(tempId);

      const { rerender } = render(
        <CommentThread
          post={mockPost}
          comments={mockComments}
          onProcessingChange={mockOnProcessingChange}
          processingComments={mockProcessingComments}
        />
      );

      const replyButtons = screen.getAllByText(/reply/i);
      fireEvent.click(replyButtons[0]);

      // Verify spinner exists
      let submitButton = screen.getByText(/post reply/i);
      expect(submitButton).toHaveAttribute('disabled');

      // Remove from processing
      mockProcessingComments.delete(tempId);

      rerender(
        <CommentThread
          post={mockPost}
          comments={mockComments}
          onProcessingChange={mockOnProcessingChange}
          processingComments={mockProcessingComments}
        />
      );

      // Verify spinner is gone and button is enabled
      submitButton = screen.getByText(/post reply/i);
      expect(submitButton).not.toHaveAttribute('disabled');
      expect(submitButton.querySelector('.spinner, [data-testid="spinner"]')).not.toBeInTheDocument();
    });

    it('should re-enable textarea when temp ID is removed from processingComments', async () => {
      const tempId = 'temp-reply-100-1234567890';
      mockProcessingComments.add(tempId);

      const { rerender } = render(
        <CommentThread
          post={mockPost}
          comments={mockComments}
          onProcessingChange={mockOnProcessingChange}
          processingComments={mockProcessingComments}
        />
      );

      const replyButtons = screen.getAllByText(/reply/i);
      fireEvent.click(replyButtons[0]);

      // Verify disabled
      let replyTextarea = screen.getByPlaceholderText(/write a reply/i);
      expect(replyTextarea).toBeDisabled();

      // Remove from processing
      mockProcessingComments.delete(tempId);

      rerender(
        <CommentThread
          post={mockPost}
          comments={mockComments}
          onProcessingChange={mockOnProcessingChange}
          processingComments={mockProcessingComments}
        />
      );

      // Verify enabled
      replyTextarea = screen.getByPlaceholderText(/write a reply/i);
      expect(replyTextarea).not.toBeDisabled();
    });
  });

  describe('Temp Reply ID Generation', () => {
    it('should generate temp ID with correct format: temp-reply-{commentId}-{timestamp}', async () => {
      render(
        <CommentThread
          post={mockPost}
          comments={mockComments}
          onProcessingChange={mockOnProcessingChange}
          processingComments={mockProcessingComments}
        />
      );

      const replyButtons = screen.getAllByText(/reply/i);
      fireEvent.click(replyButtons[0]);

      const replyTextarea = screen.getByPlaceholderText(/write a reply/i);
      fireEvent.change(replyTextarea, { target: { value: 'Test reply' } });

      const submitButton = screen.getByText(/post reply/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnProcessingChange).toHaveBeenCalled();
      });

      const tempId = mockOnProcessingChange.mock.calls[0][1];
      expect(tempId).toMatch(/^temp-reply-100-\d+$/);
    });

    it('should generate unique temp IDs for sequential replies', async () => {
      render(
        <CommentThread
          post={mockPost}
          comments={mockComments}
          onProcessingChange={mockOnProcessingChange}
          processingComments={mockProcessingComments}
        />
      );

      // First reply
      const replyButtons = screen.getAllByText(/reply/i);
      fireEvent.click(replyButtons[0]);

      let replyTextarea = screen.getByPlaceholderText(/write a reply/i);
      fireEvent.change(replyTextarea, { target: { value: 'First reply' } });

      let submitButton = screen.getByText(/post reply/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnProcessingChange).toHaveBeenCalledTimes(1);
      });

      const firstTempId = mockOnProcessingChange.mock.calls[0][1];

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      // Second reply
      fireEvent.click(replyButtons[0]);
      replyTextarea = screen.getByPlaceholderText(/write a reply/i);
      fireEvent.change(replyTextarea, { target: { value: 'Second reply' } });

      submitButton = screen.getByText(/post reply/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnProcessingChange).toHaveBeenCalledTimes(3); // 2 starts + 1 complete from first
      });

      const secondTempId = mockOnProcessingChange.mock.calls[2][1];

      // Verify IDs are unique
      expect(firstTempId).not.toBe(secondTempId);
    });

    it('should include parent comment ID in temp ID', async () => {
      const nestedComment = {
        id: 200,
        content: 'Nested comment',
        author: 'User2',
        timestamp: '2025-01-01T00:02:00Z',
        parentId: 100,
      };

      render(
        <CommentThread
          post={mockPost}
          comments={[mockComment, nestedComment]}
          onProcessingChange={mockOnProcessingChange}
          processingComments={mockProcessingComments}
        />
      );

      // Find reply button for nested comment (ID 200)
      const replyButtons = screen.getAllByText(/reply/i);
      fireEvent.click(replyButtons[1]); // Second reply button

      const replyTextarea = screen.getByPlaceholderText(/write a reply/i);
      fireEvent.change(replyTextarea, { target: { value: 'Nested reply' } });

      const submitButton = screen.getByText(/post reply/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnProcessingChange).toHaveBeenCalled();
      });

      const tempId = mockOnProcessingChange.mock.calls[0][1];
      expect(tempId).toMatch(/^temp-reply-200-\d+$/);
    });
  });

  describe('Duplicate Prevention', () => {
    it('should prevent duplicate submissions via rapid clicking', async () => {
      mockSendComment.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100)));

      render(
        <CommentThread
          post={mockPost}
          comments={mockComments}
          onProcessingChange={mockOnProcessingChange}
          processingComments={mockProcessingComments}
        />
      );

      const replyButtons = screen.getAllByText(/reply/i);
      fireEvent.click(replyButtons[0]);

      const replyTextarea = screen.getByPlaceholderText(/write a reply/i);
      fireEvent.change(replyTextarea, { target: { value: 'Test reply' } });

      const submitButton = screen.getByText(/post reply/i);

      // Rapid fire clicks
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSendComment).toHaveBeenCalledTimes(1);
      });

      // Should only call onProcessingChange once for start
      expect(mockOnProcessingChange).toHaveBeenCalledWith(true, expect.any(String));
      expect(mockOnProcessingChange).toHaveBeenCalledTimes(1);
    });

    it('should disable submit button immediately after first click', async () => {
      mockSendComment.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100)));

      render(
        <CommentThread
          post={mockPost}
          comments={mockComments}
          onProcessingChange={mockOnProcessingChange}
          processingComments={mockProcessingComments}
        />
      );

      const replyButtons = screen.getAllByText(/reply/i);
      fireEvent.click(replyButtons[0]);

      const replyTextarea = screen.getByPlaceholderText(/write a reply/i);
      fireEvent.change(replyTextarea, { target: { value: 'Test reply' } });

      const submitButton = screen.getByText(/post reply/i);
      fireEvent.click(submitButton);

      // Button should be disabled immediately
      expect(submitButton).toHaveAttribute('disabled');
    });

    it('should not allow new submission while processing', async () => {
      const tempId = 'temp-reply-100-1234567890';
      mockProcessingComments.add(tempId);

      render(
        <CommentThread
          post={mockPost}
          comments={mockComments}
          onProcessingChange={mockOnProcessingChange}
          processingComments={mockProcessingComments}
        />
      );

      const replyButtons = screen.getAllByText(/reply/i);
      fireEvent.click(replyButtons[0]);

      const replyTextarea = screen.getByPlaceholderText(/write a reply/i);
      fireEvent.change(replyTextarea, { target: { value: 'Test reply' } });

      const submitButton = screen.getByText(/post reply/i);

      // Try to submit while already processing
      fireEvent.click(submitButton);

      // Should not make API call
      expect(mockSendComment).not.toHaveBeenCalled();

      // Should not call onProcessingChange
      expect(mockOnProcessingChange).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should call onProcessingChange(false) on network error', async () => {
      mockSendComment.mockRejectedValueOnce(new Error('Network error'));

      render(
        <CommentThread
          post={mockPost}
          comments={mockComments}
          onProcessingChange={mockOnProcessingChange}
          processingComments={mockProcessingComments}
        />
      );

      const replyButtons = screen.getAllByText(/reply/i);
      fireEvent.click(replyButtons[0]);

      const replyTextarea = screen.getByPlaceholderText(/write a reply/i);
      fireEvent.change(replyTextarea, { target: { value: 'Test reply' } });

      const submitButton = screen.getByText(/post reply/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnProcessingChange).toHaveBeenCalledWith(false, expect.any(String));
      });
    });

    it('should call onProcessingChange(false) on API error response', async () => {
      mockSendComment.mockResolvedValueOnce({ success: false, error: 'Server error' });

      render(
        <CommentThread
          post={mockPost}
          comments={mockComments}
          onProcessingChange={mockOnProcessingChange}
          processingComments={mockProcessingComments}
        />
      );

      const replyButtons = screen.getAllByText(/reply/i);
      fireEvent.click(replyButtons[0]);

      const replyTextarea = screen.getByPlaceholderText(/write a reply/i);
      fireEvent.change(replyTextarea, { target: { value: 'Test reply' } });

      const submitButton = screen.getByText(/post reply/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnProcessingChange).toHaveBeenCalledWith(false, expect.any(String));
      });
    });

    it('should pass same temp ID to onProcessingChange for both true and false calls', async () => {
      mockSendComment.mockResolvedValueOnce({ success: true });

      render(
        <CommentThread
          post={mockPost}
          comments={mockComments}
          onProcessingChange={mockOnProcessingChange}
          processingComments={mockProcessingComments}
        />
      );

      const replyButtons = screen.getAllByText(/reply/i);
      fireEvent.click(replyButtons[0]);

      const replyTextarea = screen.getByPlaceholderText(/write a reply/i);
      fireEvent.change(replyTextarea, { target: { value: 'Test reply' } });

      const submitButton = screen.getByText(/post reply/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnProcessingChange).toHaveBeenCalledTimes(2);
      });

      const startTempId = mockOnProcessingChange.mock.calls[0][1];
      const endTempId = mockOnProcessingChange.mock.calls[1][1];

      expect(startTempId).toBe(endTempId);
    });

    it('should re-enable submit button after error', async () => {
      mockSendComment.mockRejectedValueOnce(new Error('Network error'));

      const { rerender } = render(
        <CommentThread
          post={mockPost}
          comments={mockComments}
          onProcessingChange={mockOnProcessingChange}
          processingComments={mockProcessingComments}
        />
      );

      const replyButtons = screen.getAllByText(/reply/i);
      fireEvent.click(replyButtons[0]);

      const replyTextarea = screen.getByPlaceholderText(/write a reply/i);
      fireEvent.change(replyTextarea, { target: { value: 'Test reply' } });

      const submitButton = screen.getByText(/post reply/i);
      fireEvent.click(submitButton);

      // Wait for error handling
      await waitFor(() => {
        expect(mockOnProcessingChange).toHaveBeenCalledWith(false, expect.any(String));
      });

      // Parent should remove from processingComments
      rerender(
        <CommentThread
          post={mockPost}
          comments={mockComments}
          onProcessingChange={mockOnProcessingChange}
          processingComments={mockProcessingComments}
        />
      );

      // Button should be enabled again
      expect(submitButton).not.toHaveAttribute('disabled');
    });
  });

  describe('Successful Submission Flow', () => {
    it('should call onProcessingChange(false) with same temp ID after successful submission', async () => {
      mockSendComment.mockResolvedValueOnce({ success: true });

      render(
        <CommentThread
          post={mockPost}
          comments={mockComments}
          onProcessingChange={mockOnProcessingChange}
          processingComments={mockProcessingComments}
        />
      );

      const replyButtons = screen.getAllByText(/reply/i);
      fireEvent.click(replyButtons[0]);

      const replyTextarea = screen.getByPlaceholderText(/write a reply/i);
      fireEvent.change(replyTextarea, { target: { value: 'Test reply' } });

      const submitButton = screen.getByText(/post reply/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnProcessingChange).toHaveBeenCalledTimes(2);
      });

      // Verify both calls used same temp ID
      const [startCall, endCall] = mockOnProcessingChange.mock.calls;
      expect(startCall[0]).toBe(true);
      expect(endCall[0]).toBe(false);
      expect(startCall[1]).toBe(endCall[1]);
    });

    it('should clear reply textarea after successful submission', async () => {
      mockSendComment.mockResolvedValueOnce({ success: true });

      render(
        <CommentThread
          post={mockPost}
          comments={mockComments}
          onProcessingChange={mockOnProcessingChange}
          processingComments={mockProcessingComments}
        />
      );

      const replyButtons = screen.getAllByText(/reply/i);
      fireEvent.click(replyButtons[0]);

      const replyTextarea = screen.getByPlaceholderText(/write a reply/i) as HTMLTextAreaElement;
      fireEvent.change(replyTextarea, { target: { value: 'Test reply' } });

      const submitButton = screen.getByText(/post reply/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnProcessingChange).toHaveBeenCalledWith(false, expect.any(String));
      });

      // Textarea should be cleared
      expect(replyTextarea.value).toBe('');
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined onProcessingChange callback gracefully', async () => {
      mockSendComment.mockResolvedValueOnce({ success: true });

      // Should not throw when onProcessingChange is undefined
      expect(() => {
        render(
          <CommentThread
            post={mockPost}
            comments={mockComments}
            processingComments={mockProcessingComments}
          />
        );
      }).not.toThrow();

      const replyButtons = screen.getAllByText(/reply/i);
      fireEvent.click(replyButtons[0]);

      const replyTextarea = screen.getByPlaceholderText(/write a reply/i);
      fireEvent.change(replyTextarea, { target: { value: 'Test reply' } });

      const submitButton = screen.getByText(/post reply/i);

      // Should not throw during submission
      expect(() => {
        fireEvent.click(submitButton);
      }).not.toThrow();

      await waitFor(() => {
        expect(mockSendComment).toHaveBeenCalled();
      });
    });

    it('should handle undefined processingComments set gracefully', async () => {
      mockSendComment.mockResolvedValueOnce({ success: true });

      render(
        <CommentThread
          post={mockPost}
          comments={mockComments}
          onProcessingChange={mockOnProcessingChange}
        />
      );

      const replyButtons = screen.getAllByText(/reply/i);
      fireEvent.click(replyButtons[0]);

      const replyTextarea = screen.getByPlaceholderText(/write a reply/i);
      fireEvent.change(replyTextarea, { target: { value: 'Test reply' } });

      const submitButton = screen.getByText(/post reply/i);
      fireEvent.click(submitButton);

      // Should still call onProcessingChange
      await waitFor(() => {
        expect(mockOnProcessingChange).toHaveBeenCalled();
      });

      // Button should not show spinner if processingComments is undefined
      expect(submitButton.querySelector('.spinner, [data-testid="spinner"]')).not.toBeInTheDocument();
    });

    it('should handle empty reply content', async () => {
      render(
        <CommentThread
          post={mockPost}
          comments={mockComments}
          onProcessingChange={mockOnProcessingChange}
          processingComments={mockProcessingComments}
        />
      );

      const replyButtons = screen.getAllByText(/reply/i);
      fireEvent.click(replyButtons[0]);

      // Don't type anything
      const submitButton = screen.getByText(/post reply/i);
      fireEvent.click(submitButton);

      // Should not call API or onProcessingChange for empty content
      expect(mockSendComment).not.toHaveBeenCalled();
      expect(mockOnProcessingChange).not.toHaveBeenCalled();
    });
  });
});
