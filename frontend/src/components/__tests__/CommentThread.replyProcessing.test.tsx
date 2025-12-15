import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CommentThread } from '../CommentThread';

/**
 * TDD Test Suite: CommentThread Reply Processing
 *
 * Purpose: Ensure reply submission shows proper processing states,
 * prevents duplicates, and provides consistent UX with main comment form.
 *
 * RED Phase: All tests should FAIL initially
 * GREEN Phase: Tests pass after implementing processing state management
 * REFACTOR Phase: Clean up implementation while maintaining test coverage
 */

describe('CommentThread - Reply Processing', () => {
  const user = userEvent.setup();

  // Mock data
  const mockComment = {
    id: 'comment-1',
    content: 'Original comment',
    author: 'user-1',
    author_agent: null,
    created_at: Date.now(),
    parent_comment_id: null
  };

  const mockPost = {
    id: 'post-1',
    content: 'Test post',
    created_at: Date.now()
  };

  const mockOnCommentsUpdate = vi.fn();

  // Store original fetch
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();

    // Default successful API response
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          id: 'reply-1',
          content: 'Test reply',
          author: 'test-user',
          created_at: Date.now()
        })
      } as Response)
    );
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  /**
   * Test 1: Reply Button Shows Processing State
   *
   * Validates that clicking "Post Reply" triggers visual feedback:
   * - Button text changes to "Posting..."
   * - Loader2 spinner appears
   * - Button becomes disabled
   */
  it('should show spinner when reply is submitted', async () => {
    render(
      <CommentThread
        postId={mockPost.id}
        comments={[mockComment]}
        onCommentsUpdate={mockOnCommentsUpdate}
      />
    );

    // Open reply form
    const replyButton = screen.getByRole('button', { name: /reply/i });
    await user.click(replyButton);

    // Type reply content
    const textarea = screen.getByPlaceholderText(/write a reply/i);
    await user.type(textarea, 'This is a test reply');

    // Submit reply
    const postButton = screen.getByRole('button', { name: /post reply/i });
    await user.click(postButton);

    // Assert: Button shows "Posting..." immediately
    expect(screen.getByText(/posting\.\.\./i)).toBeInTheDocument();

    // Assert: Button is disabled
    expect(postButton).toBeDisabled();

    // Assert: Spinner icon is present (Loader2 component)
    // Note: Check for spinner via className or test-id
    const spinner = postButton.querySelector('.lucide-loader-2');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('animate-spin');
  });

  /**
   * Test 2: Reply Textarea Disabled During Processing
   *
   * Ensures users cannot edit the reply while it's being submitted,
   * preventing confusion and potential data loss.
   */
  it('should disable reply textarea while processing', async () => {
    // Delay API response to keep processing state active
    global.fetch = vi.fn(() =>
      new Promise(resolve =>
        setTimeout(() => resolve({
          ok: true,
          json: async () => ({ id: 'reply-1', content: 'Test' })
        } as Response), 1000)
      )
    );

    render(
      <CommentThread
        postId={mockPost.id}
        comments={[mockComment]}
        onCommentsUpdate={mockOnCommentsUpdate}
      />
    );

    // Open reply form and type content
    const replyButton = screen.getByRole('button', { name: /reply/i });
    await user.click(replyButton);

    const textarea = screen.getByPlaceholderText(/write a reply/i) as HTMLTextAreaElement;
    await user.type(textarea, 'Test reply');

    // Submit reply
    const postButton = screen.getByRole('button', { name: /post reply/i });
    await user.click(postButton);

    // Assert: Textarea is disabled during processing
    await waitFor(() => {
      expect(textarea).toBeDisabled();
      expect(textarea.hasAttribute('disabled')).toBe(true);
    });

    // Try to type more content (should not work)
    const initialValue = textarea.value;
    await user.type(textarea, 'More text');
    expect(textarea.value).toBe(initialValue); // Value unchanged
  });

  /**
   * Test 3: Reply Form Stays Open During Processing
   *
   * Form should remain visible during submission to show processing state.
   * Only closes after successful API response.
   */
  it('should keep reply form open while posting', async () => {
    let resolveApiCall: ((value: any) => void) | null = null;

    global.fetch = vi.fn(() =>
      new Promise(resolve => {
        resolveApiCall = resolve;
      })
    );

    render(
      <CommentThread
        postId={mockPost.id}
        comments={[mockComment]}
        onCommentsUpdate={mockOnCommentsUpdate}
      />
    );

    // Open reply form
    const replyButton = screen.getByRole('button', { name: /reply/i });
    await user.click(replyButton);

    const textarea = screen.getByPlaceholderText(/write a reply/i);
    await user.type(textarea, 'Test reply');

    // Submit reply
    const postButton = screen.getByRole('button', { name: /post reply/i });
    await user.click(postButton);

    // Assert: Form still visible after submission
    expect(textarea).toBeInTheDocument();
    expect(postButton).toBeInTheDocument();
    expect(screen.getByText(/posting\.\.\./i)).toBeInTheDocument();

    // Resolve API call
    resolveApiCall?.({
      ok: true,
      json: async () => ({ id: 'reply-1', content: 'Test' })
    } as Response);

    // Assert: Form closes after API response
    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/write a reply/i)).not.toBeInTheDocument();
    });
  });

  /**
   * Test 4: Prevents Duplicate Replies
   *
   * Critical: Rapid clicking should NOT create multiple API calls.
   * Button must be disabled after first click.
   */
  it('should prevent multiple submissions while processing', async () => {
    let apiCallCount = 0;

    global.fetch = vi.fn(() => {
      apiCallCount++;
      return new Promise(resolve =>
        setTimeout(() => resolve({
          ok: true,
          json: async () => ({ id: 'reply-1', content: 'Test' })
        } as Response), 500)
      );
    });

    render(
      <CommentThread
        postId={mockPost.id}
        comments={[mockComment]}
        onCommentsUpdate={mockOnCommentsUpdate}
      />
    );

    // Open reply form
    const replyButton = screen.getByRole('button', { name: /reply/i });
    await user.click(replyButton);

    const textarea = screen.getByPlaceholderText(/write a reply/i);
    await user.type(textarea, 'Test reply');

    const postButton = screen.getByRole('button', { name: /post reply/i });

    // Rapidly click submit button 5 times
    await user.click(postButton);
    await user.click(postButton);
    await user.click(postButton);
    await user.click(postButton);
    await user.click(postButton);

    // Assert: Only ONE API call was made
    await waitFor(() => {
      expect(apiCallCount).toBe(1);
    });

    // Assert: Button disabled after first click
    expect(postButton).toBeDisabled();
  });

  /**
   * Test 5: Processing State Clears on Success
   *
   * After successful submission, all processing UI should reset:
   * - Button re-enabled
   * - Processing text removed
   * - Form closes
   */
  it('should clear processing state after successful reply', async () => {
    render(
      <CommentThread
        postId={mockPost.id}
        comments={[mockComment]}
        onCommentsUpdate={mockOnCommentsUpdate}
      />
    );

    // Open reply form and submit
    const replyButton = screen.getByRole('button', { name: /reply/i });
    await user.click(replyButton);

    const textarea = screen.getByPlaceholderText(/write a reply/i);
    await user.type(textarea, 'Test reply');

    const postButton = screen.getByRole('button', { name: /post reply/i });
    await user.click(postButton);

    // Verify processing state is active
    expect(screen.getByText(/posting\.\.\./i)).toBeInTheDocument();
    expect(postButton).toBeDisabled();

    // Wait for successful completion
    await waitFor(() => {
      expect(mockOnCommentsUpdate).toHaveBeenCalled();
    });

    // Assert: Processing state cleared
    await waitFor(() => {
      expect(screen.queryByText(/posting\.\.\./i)).not.toBeInTheDocument();
    });

    // Assert: Form closed
    expect(screen.queryByPlaceholderText(/write a reply/i)).not.toBeInTheDocument();

    // Assert: Can open new reply form (button re-enabled)
    await user.click(replyButton);
    expect(screen.getByPlaceholderText(/write a reply/i)).toBeInTheDocument();
  });

  /**
   * Test 6: Processing State Clears on Error
   *
   * If API fails, processing state should clear but form stays open
   * for retry opportunity.
   */
  it('should clear processing state if reply fails', async () => {
    // Mock API error
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        statusText: 'Server Error'
      } as Response)
    );

    // Spy on console.error to suppress error logs
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <CommentThread
        postId={mockPost.id}
        comments={[mockComment]}
        onCommentsUpdate={mockOnCommentsUpdate}
      />
    );

    // Open reply form and submit
    const replyButton = screen.getByRole('button', { name: /reply/i });
    await user.click(replyButton);

    const textarea = screen.getByPlaceholderText(/write a reply/i);
    await user.type(textarea, 'Test reply');

    const postButton = screen.getByRole('button', { name: /post reply/i });
    await user.click(postButton);

    // Verify processing state started
    expect(screen.getByText(/posting\.\.\./i)).toBeInTheDocument();

    // Wait for error handling
    await waitFor(() => {
      expect(screen.queryByText(/posting\.\.\./i)).not.toBeInTheDocument();
    }, { timeout: 3000 });

    // Assert: Processing state cleared
    expect(screen.queryByText(/posting\.\.\./i)).not.toBeInTheDocument();

    // Assert: Button re-enabled for retry
    expect(postButton).not.toBeDisabled();

    // Assert: Form still open for retry
    expect(textarea).toBeInTheDocument();
    expect(textarea.value).toBe('Test reply'); // Content preserved

    consoleErrorSpy.mockRestore();
  });

  /**
   * Test 7: Visual Feedback Matches RealSocialMediaFeed
   *
   * Ensures consistent UX between main comment form and reply forms.
   * Both should use same spinner icon and styling.
   */
  it('should have consistent styling with main comment form', async () => {
    render(
      <CommentThread
        postId={mockPost.id}
        comments={[mockComment]}
        onCommentsUpdate={mockOnCommentsUpdate}
      />
    );

    // Open reply form
    const replyButton = screen.getByRole('button', { name: /reply/i });
    await user.click(replyButton);

    const textarea = screen.getByPlaceholderText(/write a reply/i);
    await user.type(textarea, 'Test reply');

    const postButton = screen.getByRole('button', { name: /post reply/i });
    await user.click(postButton);

    // Assert: Uses Loader2 icon (same as RealSocialMediaFeed)
    const spinner = postButton.querySelector('.lucide-loader-2');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('animate-spin');

    // Assert: Button has disabled styling
    expect(postButton).toHaveClass('opacity-50'); // Or similar disabled class
    expect(postButton).toBeDisabled();

    // Assert: Spinner size is consistent (h-4 w-4)
    expect(spinner).toHaveClass('h-4', 'w-4');
  });

  /**
   * Test 8: Nested Replies Work Independently
   *
   * Multiple reply forms should maintain separate processing states.
   * Submitting one reply should not affect other forms.
   */
  it('should handle multiple reply forms independently', async () => {
    const mockComments = [
      { ...mockComment, id: 'comment-1' },
      { ...mockComment, id: 'comment-2', content: 'Second comment' }
    ];

    // Delay first API call, resolve second immediately
    let firstCallResolve: ((value: any) => void) | null = null;
    let callCount = 0;

    global.fetch = vi.fn(() => {
      callCount++;
      if (callCount === 1) {
        return new Promise(resolve => {
          firstCallResolve = resolve;
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ id: 'reply-2', content: 'Test' })
      } as Response);
    });

    render(
      <CommentThread
        postId={mockPost.id}
        comments={mockComments}
        onCommentsUpdate={mockOnCommentsUpdate}
      />
    );

    // Open both reply forms
    const replyButtons = screen.getAllByRole('button', { name: /reply/i });
    await user.click(replyButtons[0]); // Comment 1
    await user.click(replyButtons[1]); // Comment 2

    // Type in both forms
    const textareas = screen.getAllByPlaceholderText(/write a reply/i);
    await user.type(textareas[0], 'Reply to comment 1');
    await user.type(textareas[1], 'Reply to comment 2');

    // Submit first form
    const postButtons = screen.getAllByRole('button', { name: /post reply/i });
    await user.click(postButtons[0]);

    // Assert: First form shows processing
    expect(postButtons[0]).toBeDisabled();
    expect(postButtons[0]).toHaveTextContent(/posting\.\.\./i);

    // Assert: Second form NOT processing
    expect(postButtons[1]).not.toBeDisabled();
    expect(postButtons[1]).toHaveTextContent(/post reply/i);
    expect(postButtons[1]).not.toHaveTextContent(/posting\.\.\./i);

    // Submit second form
    await user.click(postButtons[1]);

    // Assert: Second form processes and completes
    await waitFor(() => {
      expect(screen.queryByText('Reply to comment 2')).not.toBeInTheDocument();
    });

    // Assert: First form still processing
    expect(postButtons[0]).toBeDisabled();

    // Resolve first call
    firstCallResolve?.({
      ok: true,
      json: async () => ({ id: 'reply-1', content: 'Test' })
    } as Response);

    // Assert: First form completes
    await waitFor(() => {
      expect(screen.queryByText('Reply to comment 1')).not.toBeInTheDocument();
    });
  });

  /**
   * Test 9: Real-Time Update After Reply
   *
   * Successful reply submission should trigger parent component update
   * to fetch and display new replies.
   */
  it('should trigger parent reload after successful reply', async () => {
    render(
      <CommentThread
        postId={mockPost.id}
        comments={[mockComment]}
        onCommentsUpdate={mockOnCommentsUpdate}
      />
    );

    // Open reply form and submit
    const replyButton = screen.getByRole('button', { name: /reply/i });
    await user.click(replyButton);

    const textarea = screen.getByPlaceholderText(/write a reply/i);
    await user.type(textarea, 'Test reply');

    const postButton = screen.getByRole('button', { name: /post reply/i });
    await user.click(postButton);

    // Assert: onCommentsUpdate called after success
    await waitFor(() => {
      expect(mockOnCommentsUpdate).toHaveBeenCalledTimes(1);
    });

    // Verify API was called with correct data
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/comments'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        }),
        body: expect.stringContaining('Test reply')
      })
    );
  });

  /**
   * Test 10: Keyboard Interaction During Processing
   *
   * Ctrl+Enter should not trigger duplicate submissions if already processing.
   * Keyboard shortcuts must respect processing state.
   */
  it('should prevent Ctrl+Enter submission while processing', async () => {
    let apiCallCount = 0;

    global.fetch = vi.fn(() => {
      apiCallCount++;
      return new Promise(resolve =>
        setTimeout(() => resolve({
          ok: true,
          json: async () => ({ id: 'reply-1', content: 'Test' })
        } as Response), 500)
      );
    });

    render(
      <CommentThread
        postId={mockPost.id}
        comments={[mockComment]}
        onCommentsUpdate={mockOnCommentsUpdate}
      />
    );

    // Open reply form
    const replyButton = screen.getByRole('button', { name: /reply/i });
    await user.click(replyButton);

    const textarea = screen.getByPlaceholderText(/write a reply/i);
    await user.type(textarea, 'Test reply');

    // Submit with Ctrl+Enter
    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });

    // Immediately try Ctrl+Enter again
    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });
    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });

    // Assert: Only ONE API call made
    await waitFor(() => {
      expect(apiCallCount).toBe(1);
    });

    // Assert: Processing state active
    const postButton = screen.getByRole('button', { name: /posting\.\.\./i });
    expect(postButton).toBeDisabled();
  });

  /**
   * Test 11: Cancel Button During Processing
   *
   * If a cancel/close button exists, it should be disabled during processing
   * to prevent data inconsistencies.
   */
  it('should disable cancel button during processing', async () => {
    global.fetch = vi.fn(() =>
      new Promise(resolve =>
        setTimeout(() => resolve({
          ok: true,
          json: async () => ({ id: 'reply-1', content: 'Test' })
        } as Response), 1000)
      )
    );

    render(
      <CommentThread
        postId={mockPost.id}
        comments={[mockComment]}
        onCommentsUpdate={mockOnCommentsUpdate}
      />
    );

    // Open reply form
    const replyButton = screen.getByRole('button', { name: /reply/i });
    await user.click(replyButton);

    const textarea = screen.getByPlaceholderText(/write a reply/i);
    await user.type(textarea, 'Test reply');

    // Submit reply
    const postButton = screen.getByRole('button', { name: /post reply/i });
    await user.click(postButton);

    // Check if cancel button exists and is disabled
    const cancelButton = screen.queryByRole('button', { name: /cancel/i });
    if (cancelButton) {
      expect(cancelButton).toBeDisabled();
    }

    // Wait for completion
    await waitFor(() => {
      expect(mockOnCommentsUpdate).toHaveBeenCalled();
    });
  });

  /**
   * Test 12: Processing State Persists Across Re-renders
   *
   * If parent component re-renders during processing, the processing state
   * should be maintained (not reset).
   */
  it('should maintain processing state across re-renders', async () => {
    let resolveApiCall: ((value: any) => void) | null = null;

    global.fetch = vi.fn(() =>
      new Promise(resolve => {
        resolveApiCall = resolve;
      })
    );

    const { rerender } = render(
      <CommentThread
        postId={mockPost.id}
        comments={[mockComment]}
        onCommentsUpdate={mockOnCommentsUpdate}
      />
    );

    // Open reply form and submit
    const replyButton = screen.getByRole('button', { name: /reply/i });
    await user.click(replyButton);

    const textarea = screen.getByPlaceholderText(/write a reply/i);
    await user.type(textarea, 'Test reply');

    const postButton = screen.getByRole('button', { name: /post reply/i });
    await user.click(postButton);

    // Verify processing started
    expect(screen.getByText(/posting\.\.\./i)).toBeInTheDocument();

    // Force re-render with updated props
    rerender(
      <CommentThread
        postId={mockPost.id}
        comments={[mockComment]}
        onCommentsUpdate={mockOnCommentsUpdate}
      />
    );

    // Assert: Processing state still active after re-render
    expect(screen.getByText(/posting\.\.\./i)).toBeInTheDocument();
    expect(postButton).toBeDisabled();

    // Resolve API call
    resolveApiCall?.({
      ok: true,
      json: async () => ({ id: 'reply-1', content: 'Test' })
    } as Response);

    // Assert: Form closes after completion
    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/write a reply/i)).not.toBeInTheDocument();
    });
  });
});
